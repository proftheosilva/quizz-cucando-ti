import crypto from 'node:crypto';

export const rooms = new Map();
export const avatarPalette = ['🦊','🐙','🤖','🦄','🐼','🐸','🦁','🐨','🐧','🐝','🦖','🐯','🐻','🐵','🐰','🐹','🐮','🐷','🐔','🦉','🦋','🐢','🐬','🦈','🐳','🦩','🦜','🐲','🐺','🦔','🦦','🐿️','🦥','🦚','🐴','🐪','🦕','🐟','🐞','🦀','🐌','🐈','🐕','🐾','🐊','🦓','🦒'];
export const id = () => crypto.randomUUID();
export const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

export function createRoom(game, saved = null) {
  let pin = saved?.pin;
  if (!pin) do { pin = String(crypto.randomInt(100000, 1000000)); } while (rooms.has(pin));
  const matchKeys = Object.fromEntries((game.pairs || []).map(pair => [pair.id, id()]));
  const room = saved ? { ...saved, game, clients: new Set() } : { id: id(), pin, game, matchKeys, phase: 'lobby', current: -1, openedAt: null, revealed: false, participants: [], submissions: {}, events: [], createdAt: new Date().toISOString(), sessionId: id(), clients: new Set() };
  rooms.set(pin, room);
  return room;
}

export function addParticipant(room, nickname, requestedAvatar = '') {
  const name = clean(nickname, 24);
  if (name.length < 2) throw new Error('Use um apelido com pelo menos 2 caracteres.');
  if (room.phase !== 'lobby') throw new Error('A sala já começou.');
  if (room.participants.some(p => p.nickname.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) throw new Error('Este apelido já está em uso nesta sala.');
  const used = new Set(room.participants.map(p => p.avatar));
  const available = avatarPalette.filter(avatar => !used.has(avatar));
  if (!available.length) throw new Error('Todos os avatares desta sala já foram escolhidos.');
  if (requestedAvatar && (!available.includes(requestedAvatar) || !avatarPalette.includes(requestedAvatar))) throw new Error('Esse avatar já foi escolhido por outra pessoa. Selecione outro.');
  const avatar = requestedAvatar || available[crypto.randomInt(available.length)];
  const participant = { id: id(), nickname: name, avatar, score: 0, joinedAt: new Date().toISOString() };
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
  const visibleQuestion = question && admin ? question : question && {
    timeLimit: question.timeLimit,
    multiple: Boolean(question.multiple),
    options: question.options?.map(({ id }, index) => ({ id, colorIndex: index }))
  };
  const submissions = room.submissions[room.current] || {};
  const answerStats = room.revealed && question ? {
    totalAnswers: Object.keys(submissions).length,
    correctAnswers: Object.values(submissions).filter(answer => answer.correct).length,
    options: question.options.map(option => ({ id: option.id, count: Object.values(submissions).filter(answer => answer.options?.includes(option.id)).length, correct: option.correct }))
  } : undefined;
  return {
    pin: room.pin, title: room.game.title, type: room.game.type, phase: room.phase,
    current: room.current, total: room.game.questions?.length || room.game.pairs?.length || 0,
    question: visibleQuestion, pairs: room.game.type === 'matching' ? { left: room.game.pairs.map(p => ({ id: p.id, text: p.left })), right: room.game.pairs.map(p => ({ id: room.matchKeys[p.id], text: p.right })).sort((a,b) => a.text.localeCompare(b.text, 'pt-BR')) } : undefined,
    openedAt: room.openedAt, revealed: room.revealed,
    participants: room.participants.map(p => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, score: p.score, answered: Boolean(submissions[p.id]) })),
    mySubmission: participantId ? submissions[participantId] || null : null,
    myResolved: participantId && room.game.type === 'matching' ? room.events.filter(e => e.participantId === participantId && e.correct).map(e => e.pairId) : undefined,
    submissionsCount: Object.keys(submissions).length,
    answerStats,
    correctOptions: room.revealed || admin ? question?.options?.filter(o => o.correct).map(o => o.id) : undefined
  };
}

export function broadcast(room) {
  for (const client of room.clients) {
    if (client.readyState === 1) client.send(JSON.stringify({ type: 'room', room: publicRoom(room, client.participantId, client.admin) }));
  }
}
