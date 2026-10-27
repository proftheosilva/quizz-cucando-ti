import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreQuiz, createRoom, addParticipant, publicRoom, rooms } from '../server/engine.js';

test('pontuação respeita acerto, tempo e penalidade', () => {
  const question = { options: [{ id:'a',correct:true },{ id:'b',correct:false }], points:1000, penalty:200, timeLimit:20 };
  assert.deepEqual(scoreQuiz(question,['a'],0), { correct:true,points:1000 });
  assert.deepEqual(scoreQuiz(question,['a'],20000), { correct:true,points:500 });
  assert.deepEqual(scoreQuiz(question,['b'],500), { correct:false,points:-200 });
});

test('sala rejeita apelido duplicado e oculta gabarito antes da revelação', () => {
  const room = createRoom({ title:'Teste',type:'quiz',questions:[{ id:'q',text:'Pergunta?',options:[{id:'a',text:'Sim',correct:true},{id:'b',text:'Não',correct:false}] }] });
  const first = addParticipant(room,'Ana','🦊');
  assert.equal(first.avatar,'🦊');
  assert.throws(() => addParticipant(room,'Bia','🦊'),/avatar já foi escolhido/);
  assert.throws(() => addParticipant(room,'ana'),/já está em uso/);
  room.current = 0;
  const visible = publicRoom(room,room.participants[0].id);
  assert.equal(visible.question.text,undefined,'o enunciado nunca é enviado à tela do aluno');
  assert.deepEqual(visible.question.options,[{id:'a',colorIndex:0},{id:'b',colorIndex:1}]);
  assert.equal(visible.question.options[0].correct,undefined);
  assert.equal(visible.correctOptions,undefined);
  assert.equal(visible.answerStats,undefined);
  assert.equal(publicRoom(room,null,true).question.text,'Pergunta?','o professor recebe o enunciado');
  room.submissions[0] = { [room.participants[0].id]: { options:['a'], correct:true, points:900 } };
  room.revealed = true;
  const revealed = publicRoom(room,room.participants[0].id);
  assert.equal(revealed.question.text,undefined,'o enunciado permanece oculto após a revelação');
  assert.equal(revealed.answerStats.totalAnswers,1);
  assert.equal(revealed.answerStats.correctAnswers,1);
  assert.deepEqual(revealed.answerStats.options.map(option => option.count),[1,0]);
  rooms.delete(room.pin);
});

test('matching não envia a associação entre termo e conceito', () => {
  const room = createRoom({ title:'Pares',type:'matching',pairs:[{id:'one',left:'API',right:'Interface'},{id:'two',left:'JSON',right:'Formato'}] });
  const visible = publicRoom(room);
  assert.notEqual(visible.pairs.right[0].id,'one');
  assert.equal(visible.pairs.left.length,2);
  rooms.delete(room.pin);
});
