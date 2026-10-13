import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

const require = createRequire(import.meta.url);
const portuguese = require('@tesseract.js-data/por');

export function parseQuestions(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean);
  const questions = [];
  const answerKey = new Map();
  const keyLine = lines.find(line => /^GABARITO\b/i.test(line) && /\b\d{1,2}\s*[A-F]\b/i.test(line));
  if (keyLine) for (const match of keyLine.matchAll(/\b(\d{1,2})\s*([A-F])\b/gi)) answerKey.set(Number(match[1]), match[2].toUpperCase());
  let current = null;
  let option = null;
  let awaitingQuestion = false;
  const push = () => {
    if (!current) return;
    if (current.options.length >= 2) questions.push(current);
    current = null;
    option = null;
    awaitingQuestion = false;
  };
  for (const line of lines) {
    if (line === keyLine) { push(); break; }
    if (current?.options.length >= 2 && /^(?:Professor\b|Alternativa correta marcada\b|©)/i.test(line)) { push(); break; }
    const heading = line.match(/^(?:(?:F[ÁA]CIL|INTERMEDI[ÁA]RIA|DIF[ÍI]CIL)\s+)?QUEST[ÃA]O\s*0?(\d{1,2})(?:\s*[.):-]\s*(.*))?$/i);
    const progress = line.match(/^(?:(?:F[ÁA]CIL|INTERMEDI[ÁA]RIA|DIF[ÍI]CIL)\s+)?0?(\d{1,2})\s*\/\s*\d{1,2}(?:\s+(.+))?$/i);
    const difficulty = line.match(/^0?(\d{1,2})\s*\[[^\]]+\]\s*(.+)$/i);
    const question = line.match(/^(\d{1,2})\s*[.):-]\s*(.+)/i);
    const alternative = line.match(/^([A-F])\s*[.):\-]\s*(.+)/i);
    const answer = line.match(/^(?:gabarito|resposta(?:\s+correta)?|alternativa\s+correta)\s*[:：-]?\s*([A-F])\b/i);
    const start = heading || progress || difficulty || question;
    if (start) { push(); current = { number: Number(start[1]), text: start[2] || '', options: [], correctLetter: null }; awaitingQuestion = !current.text; continue; }
    if (!current) continue;
    if (awaitingQuestion) { current.text = line; awaitingQuestion = false; continue; }
    if (alternative) {
      const marked = /(?:\[(?:correta|certa|x)\]|\((?:correta|certa)\)|\bCORRETA\b|✓|✔)/i.test(alternative[2]);
      option = { letter: alternative[1].toUpperCase(), text: alternative[2].replace(/\s*(?:\[(?:correta|certa|x)\]|\((?:correta|certa)\)|\bCORRETA\b|✓|✔)\s*/ig, ' ').trim(), correct: marked };
      current.options.push(option);
    } else if (answer) current.correctLetter = answer[1].toUpperCase();
    else if (option && !/^(?:página|page)\s+\d+/i.test(line)) option.text += ` ${line}`;
    else current.text += ` ${line}`;
  }
  push();
  return questions.slice(0, 60).map(q => ({
    text: q.text.slice(0, 400),
    options: q.options.slice(0, 6).map(o => ({ text: o.text.slice(0, 180), correct: q.correctLetter || answerKey.get(q.number) ? o.letter === (q.correctLetter || answerKey.get(q.number)) : o.correct }))
  }));
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
  if (questions.some(q => q.options.filter(o => o.correct).length !== 1)) warnings.push('Algumas perguntas não têm uma única resposta identificada. Marque a correta no editor antes de salvar.');
  return { pages: pages.map(({ number, method }) => ({ number, method })), questions, text: text.slice(0, 30000), warnings };
}
