import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import { importPdf, parseQuestions } from '../server/pdf-import.js';

const quizQuestions = [
  ['O que o MCP padroniza?', 2],
  ['Na arquitetura MCP, o que é o host?', 0],
  ['Qual componente solicita ferramentas ao servidor?', 1],
  ['O que um servidor MCP pode disponibilizar?', 3],
  ['Qual é a função de um recurso no MCP?', 0],
  ['Como o cliente se conecta ao servidor?', 2],
  ['O que o protocolo padroniza?', 1],
  ['Qual aplicação pode atuar como host?', 3],
  ['Onde uma ferramenta MCP é executada?', 0],
  ['O que deve ser feito antes de confiar numa ferramenta?', 2]
];
const choices = [
  'A geração de tokens da LLM',
  'O treinamento de embeddings',
  'A forma de comunicação entre app e capacidades externas',
  'O conteúdo do banco vetorial'
];
function numberedFormat() {
  const lines = ['QUIZ DE TECNOLOGIA'];
  quizQuestions.forEach(([prompt, correct], index) => {
    lines.push(`FÁCIL   ${String(index + 1).padStart(2, '0')}/10`, prompt);
    choices.forEach((choice, option) => lines.push(`${String.fromCharCode(65 + option)}.   ${option === correct ? '[CORRETA] ' : ''}${choice}`));
  });
  lines.push('Página 1 de 1', 'Legenda: [CORRETA] indica a resposta correta.');
  return lines;
}
async function pdfWithText(lines) {
  const document = new PDFDocument({ size: 'A4', margin: 32 });
  document.font('Helvetica').fontSize(8);
  const chunks = [];
  document.on('data', chunk => chunks.push(chunk));
  const done = new Promise(resolve => document.on('end', resolve));
  lines.forEach(line => document.text(line));
  document.end();
  await done;
  return Buffer.concat(chunks);
}

test('reconhece 10 perguntas no formato dificuldade 01/10 e marcador [CORRETA]', () => {
  const questions = parseQuestions(numberedFormat().join('\n'));
  assert.equal(questions.length, 10);
  questions.forEach((question, index) => {
    assert.equal(question.options.length, 4);
    assert.equal(question.options.filter(option => option.correct).length, 1);
    assert.equal(question.options.find(option => option.correct).text, choices[quizQuestions[index][1]]);
    assert.ok(question.options.every(option => !/\[?CORRETA\]?/i.test(option.text)));
  });
  assert.equal(questions[9].options[3].text, choices[3], 'rodapé e legenda não entram na última alternativa');
});

test('o PDF selecionável de uma página chega à prévia com as 10 perguntas', async () => {
  const preview = await importPdf(await pdfWithText(numberedFormat()));
  assert.deepEqual(preview.pages.map(page => page.method), ['texto']);
  assert.equal(preview.questions.length, 10);
  assert.ok(preview.questions.every(question => question.options.length === 4 && question.options.filter(option => option.correct).length === 1));
  assert.deepEqual(preview.warnings, []);
});

test('mantém QUESTÃO 01, enunciado na linha seguinte e gabarito geral numerado', () => {
  const text = `DESAFIO · 2 QUESTÕES
FÁCIL   QUESTÃO 01
Qual alternativa está correta?
A) Primeira
B) Segunda   CORRETA
C) Terceira
INTERMEDIÁRIA   QUESTÃO 02
Quanto é dois mais dois?
A) Três
B) Quatro
GABARITO   1B   2B
Rodapé da página`;
  const questions = parseQuestions(text);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].text, 'Qual alternativa está correta?');
  assert.deepEqual(questions.map(question => question.options.filter(option => option.correct).map(option => option.text)), [['Segunda'], ['Quatro']]);
  assert.equal(questions[1].options[1].text, 'Quatro');
});

test('aceita questão inline, alternativas A a F, gabarito por questão e marcador após a opção', () => {
  const text = `QUESTÃO 01
Enunciado na linha seguinte?
A) Primeira
B) Segunda
Gabarito: A
2. Enunciado na mesma linha?
A. Alpha
B. Beta CORRETA
C) Charlie
3 [Fácil] Terceiro enunciado?
A) Um
B) Dois
C) Três
D) Quatro
E) Cinco
F) Seis
GABARITO GERAL: A, B, F`;
  const questions = parseQuestions(text);
  assert.equal(questions.length, 3);
  assert.equal(questions[0].text, 'Enunciado na linha seguinte?');
  assert.equal(questions[0].options.filter(option => option.correct)[0].text, 'Primeira');
  assert.equal(questions[1].text, 'Enunciado na mesma linha?');
  assert.equal(questions[1].options.filter(option => option.correct)[0].text, 'Beta');
  assert.equal(questions[2].options.length, 6);
  assert.equal(questions[2].options.filter(option => option.correct)[0].text, 'Seis');
});

test('não inventa gabarito e não anexa legenda ou paginação à alternativa final', () => {
  const text = `01 [Fácil] Qual conceito?
A) Primeiro conceito
B. Segundo conceito
Página 1 de 1
Legenda: marque a resposta correta`;
  const questions = parseQuestions(text);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].options.filter(option => option.correct).length, 0);
  assert.deepEqual(questions[0].options.map(option => option.text), ['Primeiro conceito', 'Segundo conceito']);
});

test('a prévia sinaliza gabarito ausente sem escolher uma resposta', async () => {
  const preview = await importPdf(await pdfWithText([
    '01 [Fácil] Qual conceito?',
    'A) Primeiro conceito',
    'B) Segundo conceito',
    'Legenda: [CORRETA] identifica a resposta certa'
  ]));
  assert.equal(preview.questions.length, 1);
  assert.equal(preview.questions[0].options.filter(option => option.correct).length, 0);
  assert.ok(preview.warnings.some(warning => /não têm uma única resposta identificada/i.test(warning)));
  assert.equal(preview.questions[0].options[1].text, 'Segundo conceito');
});
