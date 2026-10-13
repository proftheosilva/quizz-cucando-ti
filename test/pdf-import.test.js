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

test('importa numeração progressiva, alternativas com ponto e marcador antes da resposta', () => {
  const text = `DESAFIO MCP | 2 QUESTÕES
FÁCIL   01/02
O que o protocolo padroniza?
A.   Uma forma de treinamento
B.   [CORRETA] A comunicação entre sistemas
C.   Um banco de dados
D.   O tokenizador
INTERMEDIÁRIA   02/02
O que uma Tool oferece?
A.   Um documento estático
B.   [CORRETA] Uma função que pode ser chamada
C.   Um índice pronto
D.   Uma LLM
Alternativa correta marcada para o professor [CORRETA]`;
  const questions = parseQuestions(text);
  assert.equal(questions.length, 2);
  assert.deepEqual(questions.map(q => q.options.length), [4, 4]);
  assert.deepEqual(questions.map(q => q.options.find(o => o.correct)?.text), ['A comunicação entre sistemas', 'Uma função que pode ser chamada']);
  assert.equal(questions[1].options[3].text, 'Uma LLM');
});

test('importa número com dificuldade entre colchetes sem misturar rodapé', () => {
  const text = `KAHOOT · 2 QUESTÕES
01 [Fácil] Qual elemento inicia um fluxo?
A) Gatilho [CORRETA]
B) Vetor
02 [Interm.] O nó IF serve para quê?
A) Escolher um ramo [CORRETA]
B) Criar embeddings
Professor · Material da turma`;
  const questions = parseQuestions(text);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].text, 'Qual elemento inicia um fluxo?');
  assert.deepEqual(questions.map(q => q.options.find(o => o.correct)?.text), ['Gatilho', 'Escolher um ramo']);
  assert.equal(questions[1].options[1].text, 'Criar embeddings');
});
