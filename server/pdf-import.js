import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

const require = createRequire(import.meta.url);
const portuguese = require('@tesseract.js-data/por');

const difficulty = 'F[ÁA]CIL|INTERMEDI[ÁA]RIA|DIF[ÍI]CIL';
const questionHeading = line => {
  let match = line.match(new RegExp(`^(?:(${difficulty})\\s+)?QUEST[ÃA]O\\s*#?\\s*0?(\\d{1,2})(?:\\s*[.):-]\\s*(.*))?$`, 'i'));
  if (match) return { number: Number(match[2]), text: match[3] || '' };
  match = line.match(new RegExp(`^(${difficulty})\\s+0?(\\d{1,2})\\s*\\/\\s*\\d{1,2}$`, 'i'));
  if (match) return { number: Number(match[2]), text: '' };
  match = line.match(new RegExp(`^0?(\\d{1,2})\\s*\\[\\s*(${difficulty})\\s*\\]\\s*(.*)$`, 'i'));
  if (match) return { number: Number(match[1]), text: match[3] || '' };
  match = line.match(/^(\d{1,2})\s*\/\s*\d{1,2}$/);
  if (match) return { number: Number(match[1]), text: '' };
  match = line.match(/^(\d{1,2})\s*[.):-]\s*(.+)$/);
  if (match) return { number: Number(match[1]), text: match[2] };
  return null;
};

const numberedAnswers = line => [...line.matchAll(/(?:^|[^\p{L}\d])(\d{1,2})\s*[-.:)]?\s*([A-F])(?=$|[^\p{L}])/giu)];
const pageFurniture = line => /^(?:p[aá]gina|p[aá]g\.?|page)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?\s*$/i.test(line)
  || /^\d{1,3}\s*(?:de|of|\/)\s*\d{1,3}$/.test(line)
  || /^\d{1,3}$/.test(line)
  || /^(?:fonte|cr[eé]ditos?|refer[eê]ncias?|observa[cç][õo]es?|instru[cç][õo]es?|institui[cç][ãa]o|disciplina|curso|turma|professor(?:a)?|data|autor|produzido por|todos os direitos reservados)\s*:/i.test(line)
  || /^(?:www\.|https?:\/\/|©|copyright\b)/i.test(line)
  || /^[A-ZÀ-Ü0-9][A-ZÀ-Ü0-9\s|:;,.()\-–—]{2,}$/.test(line) && /[A-ZÀ-Ü]{5}/.test(line);

function cleanOption(value) {
  let marked = false;
  let text = value.replace(/\[(?:correta|certa|x)\]|\((?:correta|certa)\)|[✓✔]/gi, () => { marked = true; return ' '; });
  text = text.replace(/(?:^|\s)\bCORRETA\b\s*$/i, match => { marked = true; return match.startsWith(' ') ? ' ' : ''; });
  return { text: text.replace(/\s+/g, ' ').trim(), marked };
}

export function parseQuestions(text) {
  const lines = String(text || '').replace(/[\r\u200b]/g, '').replace(/\u00a0/g, ' ').split('\n').map(line => line.trim());
  const answerKey = new Map();
  const keyLines = new Set();
  const sequentialAnswerKey = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!/^GABARITO\b/i.test(line)) continue;
    const pairs = numberedAnswers(line);
    if (pairs.length) {
      for (const pair of pairs) answerKey.set(Number(pair[1]), pair[2].toUpperCase());
      keyLines.add(index);
      continue;
    }
    const body = line.replace(/^GABARITO(?:\s+GERAL)?\s*[:：-]?\s*/i, '').trim();
    const letters = body.match(/\b[A-F]\b/gi) || [];
    if ((/\bGERAL\b/i.test(line) || letters.length > 1) && letters.length) {
      sequentialAnswerKey.push(...letters.map(letter => letter.toUpperCase()));
      keyLines.add(index);
      continue;
    }
    if (!body) {
      const pairsOnFollowingLines = [];
      let next = index + 1;
      while (next < lines.length) {
        const answerLine = lines[next];
        const followingPairs = numberedAnswers(lines[next]);
        if (followingPairs.length && /^\d{1,2}\s*(?:[-.:)]\s*)?[A-F]$/i.test(answerLine)) {
          pairsOnFollowingLines.push(...followingPairs);
          next++;
          continue;
        }
        break;
      }
      if (pairsOnFollowingLines.length) {
        for (const pair of pairsOnFollowingLines) answerKey.set(Number(pair[1]), pair[2].toUpperCase());
        keyLines.add(index);
        for (let marked = index + 1; marked < next; marked++) keyLines.add(marked);
      }
    }
  }

  const questions = [];
  let current = null;
  let option = null;
  let awaitingQuestion = false;
  let awaitingAnswerLetter = false;
  let skipLegend = false;
  const push = () => {
    if (current && (current.text || current.options.length)) questions.push(current);
    current = null;
    option = null;
    awaitingQuestion = false;
    awaitingAnswerLetter = false;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;
    const heading = questionHeading(line);
    if (heading) {
      push();
      current = { number: heading.number, text: heading.text, options: [], correctLetter: null };
      awaitingQuestion = !heading.text;
      skipLegend = false;
      continue;
    }
    if (keyLines.has(index)) { push(); continue; }
    if (skipLegend) continue;
    if (/^legenda\b/i.test(line)) { option = null; awaitingQuestion = false; skipLegend = true; continue; }
    if (pageFurniture(line)) { option = null; continue; }
    if (!current) continue;

    const alternative = line.match(/^([A-F])\s*[).:-]\s*(.*)$/i);
    if (alternative) {
      const cleaned = cleanOption(alternative[2]);
      option = { letter: alternative[1].toUpperCase(), text: cleaned.text, correct: cleaned.marked };
      current.options.push(option);
      awaitingQuestion = false;
      awaitingAnswerLetter = false;
      continue;
    }
    if (/^(?:CORRETA|CERTA|✓|✔)$/i.test(line) && option) { option.correct = true; continue; }
    const answer = line.match(/^(?:gabarito|resposta(?:\s+correta)?|alternativa\s+correta)\s*[:：-]?\s*([A-F])\b/i);
    if (answer) { current.correctLetter = answer[1].toUpperCase(); awaitingAnswerLetter = false; option = null; continue; }
    if (/^gabarito\s*[:：-]?$/i.test(line)) { awaitingAnswerLetter = true; option = null; continue; }
    if (awaitingAnswerLetter && /^([A-F])\b[).:-]?$/i.test(line)) { current.correctLetter = line.match(/^([A-F])/i)[1].toUpperCase(); awaitingAnswerLetter = false; continue; }
    if (awaitingQuestion) { current.text = line; awaitingQuestion = false; continue; }

    // Treat only sentence-like lowercase/continuation lines as wrapped content.
    // This prevents page titles, legends, and footer text from leaking into the
    // final answer choice while retaining ordinary PDF line wraps.
    if (option && /^(?:[a-zà-öø-ÿ]|[,;:)]|[“”‘’"'([{])/u.test(line)) option.text = `${option.text} ${line}`.trim();
    else if (!option && current.text && /^[a-zà-öø-ÿ]/u.test(line)) current.text = `${current.text} ${line}`.trim();
  }
  push();

  if (sequentialAnswerKey.length) {
    questions.forEach((question, index) => { if (sequentialAnswerKey[index] && !question.correctLetter) question.correctLetter = sequentialAnswerKey[index]; });
  }

  return questions.slice(0, 60).map(question => {
    const correctLetter = question.correctLetter || answerKey.get(question.number);
    return {
      text: question.text.slice(0, 400),
      options: question.options.slice(0, 6).map(item => ({
        text: item.text.slice(0, 180),
        correct: correctLetter ? item.letter === correctLetter : item.correct
      }))
    };
  });
}

export async function importPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') throw Object.assign(new Error('Envie um PDF válido.'), { status: 400 });
  const loadingTask = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true });
  let document;
  try { document = await loadingTask.promise; }
  catch { await loadingTask.destroy(); throw Object.assign(new Error('Não foi possível abrir o PDF. Confira se o arquivo não está danificado ou protegido por senha.'), { status: 400 }); }
  let worker;
  const pages = [];
  try {
    if (document.numPages > 20) throw Object.assign(new Error('O PDF pode ter no máximo 20 páginas.'), { status: 413 });
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const native = (await page.getTextContent()).items.map(item => `${item.str || ''}${item.hasEOL ? '\n' : ' '}`).join('').trim();
      if (native.length >= 20) { pages.push({ number: index, method: 'texto', text: native }); continue; }
      worker ||= await createWorker('por', 1, { langPath: portuguese.langPath, gzip: true, cacheMethod: 'none' });
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas.toBuffer('image/png'));
      pages.push({ number: index, method: 'OCR', text: result.data.text.trim() });
    }
  } finally { await worker?.terminate(); await loadingTask.destroy(); }
  const text = pages.map(page => page.text).join('\n');
  const questions = parseQuestions(text);
  const warnings = [];
  if (!text.trim()) warnings.push('Nenhum texto foi reconhecido no PDF.');
  if (!questions.length) warnings.push('Nenhuma pergunta com pelo menos duas alternativas foi identificada. Confira a transcrição abaixo.');
  if (questions.some(q => q.options.length < 2)) warnings.push('Uma ou mais perguntas têm menos de duas alternativas. Revise a prévia antes de adicionar ao jogo.');
  if (questions.some(q => q.options.filter(o => o.correct).length !== 1)) warnings.push('Algumas perguntas não têm uma única resposta identificada. Marque a correta na prévia antes de adicionar ao jogo.');
  return { pages: pages.map(({ number, method }) => ({ number, method })), questions, text: text.slice(0, 30000), warnings };
}
