import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions } from '../server/pdf-import.js';

test('importa cabeçalhos separados e gabarito no fim do PDF', () => {
  const text = `DESAFIO · 2 QUESTÕES
FÁCIL   QUESTÃO 01
Qual alternativa está correta?
A) Primeira
B) Segunda   CORRETA
C) Terceira
INTERMEDIÁRIA   QUESTÃO 02
Quanto é dois mais dois?
A) Três
B) Quatro   CORRETA
GABARITO   1B   2B
Rodapé da página`;
  const questions = parseQuestions(text);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].text, 'Qual alternativa está correta?');
  assert.deepEqual(questions.map(question => question.options.filter(option => option.correct).map(option => option.text)), [['Segunda'], ['Quatro']]);
  assert.equal(questions[1].options[1].text, 'Quatro');
});
