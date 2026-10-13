import crypto from 'node:crypto';

export const rooms = new Map();
const palette = ['🦊','🐙','🤖','🦄','🐼','🐸','🦁','🐨','🐧','🐝','🦖','🐯'];
export const id = () => crypto.randomUUID();
export const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

export function createRoom(game) {
  let pin;
  do { pin = String(crypto.randomInt(100000, 1000000)); } while (rooms.has(pin));
  const matchKeys = Object.fromEntries((game.pairs || []).map(pair => [pair.id, id()]));
  const room = { pin, game, matchKeys, phase: 'lobby', current: -1, openedAt: null, revealed: false, participants: [], submissions: {}, events: [], createdAt: new Date().toISOString(), clients: new Set() };
  rooms.set(pin, room);
  return room;
}

export function addParticipant(room, nickname) {
  const name = clean(nickname, 24);
  if (name.length < 2) throw new Error('Use um apelido com pelo menos 2 caracteres.');
  if (room.phase !== 'lobby') throw new Error('A sala já começou.');
  if (room.participants.some(p => p.nickname.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) throw new Error('Este apelido já está em uso nesta sala.');
  const participant = { id: id(), nickname: name, avatar: palette[crypto.randomInt(palette.length)], score: 0, joinedAt: new Date().toISOString() };
  room.participants.push(participant);
  return participant;
}

export function scoreQuiz(question, answer, elapsedMs) {
  const correct = (question.options || []).filter(option => option.correct).map(option => option.id).sort();
  const chosen = Array.isArray(answer) ? [...new Set(answer.map(String))].sort() : [];
  const isCorrect = chosen.length === correct.length && chosen.every((value, index) => value === correct[index]);
  const base = Math.max(0, Number(question.points) || 1000);
  const limit = Math.max(5, Number(question.timeLimit) || 20) * 1000;
  const points = isCorrect ? Math.round(base * (0.5 + 0.5 * Math.max(0, 1 - elapsedMs / limit))) : -Math.max(0, Number(question.penalty) || 0);
  return { correct: isCorrect, points };
}

export function publicRoom(room, participantId = null, admin = false) {
  const question = room.game.questions?.[room.current];
  const visibleQuestion = question && (admin || room.revealed) ? question : question && { ...question, options: question.options?.map(({ id, text }) => ({ id, text })) };
  const submissions = room.submissions[room.current] || {};
  return {
    pin: room.pin, title: room.game.title, type: room.game.type, phase: room.phase,
    current: room.current, total: room.game.questions?.length || room.game.pairs?.length || 0,
    question: visibleQuestion, pairs: room.game.type === 'matching' ? { left: room.game.pairs.map(p => ({ id: p.id, text: p.left })), right: room.game.pairs.map(p => ({ id: room.matchKeys[p.id], text: p.right })).sort((a,b) => a.text.localeCompare(b.text, 'pt-BR')) } : undefined,
    openedAt: room.openedAt, revealed: room.revealed,
    participants: room.participants.map(p => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, score: p.score, answered: Boolean(submissions[p.id]) })),
    mySubmission: participantId ? submissions[participantId] || null : null,
    myResolved: participantId && room.game.type === 'matching' ? room.events.filter(e => e.participantId === participantId && e.correct).map(e => e.pairId) : undefined,
    submissionsCount: Object.keys(submissions).length,
    correctOptions: room.revealed || admin ? question?.options?.filter(o => o.correct).map(o => o.id) : undefined
  };
}

export function broadcast(room) {
  for (const client of room.clients) {
    if (client.readyState === 1) client.send(JSON.stringify({ type: 'room', room: publicRoom(room, client.participantId, client.admin) }));
  }
}
