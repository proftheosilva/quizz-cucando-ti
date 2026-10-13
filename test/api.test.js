import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { createCanvas } from '@napi-rs/canvas';

async function samplePdf(scanned = false) {
  const doc = new PDFDocument({ size: [800, 550], margin: 40 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const done = new Promise(resolve => doc.on('end', resolve));
  const lines = ['1. Qual a capital do Brasil?', 'A) Brasilia', 'B) Lisboa', 'Gabarito: A'];
  if (scanned) {
    const canvas = createCanvas(1600, 1100), context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, 1600, 1100);
    context.fillStyle = '#000'; context.font = 'bold 44px Arial';
    lines.forEach((line, index) => context.fillText(line, 100, 150 + index * 115));
    doc.image(canvas.toBuffer('image/png'), 0, 0, { width: 800 });
  } else lines.forEach(line => doc.text(line));
  doc.end(); await done;
  return Buffer.concat(chunks);
}

test('fluxo de quiz: login, sala, resposta, pódio e ranking', { timeout: 20000 }, async () => {
  const port = 31000 + crypto.randomInt(3000);
  const dataFile = path.resolve(`.data/test-${crypto.randomUUID()}.json`);
  const base = `http://localhost:${port}`;
  const child = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT:String(port), LOGIN_ADMIN:'teste', PASSWORD_ADMIN:'senha-de-teste', SESSION_SECRET:'segredo-de-teste-longo', INSFORGE_BASE_URL:'', PROJECT_URL:'', INSFORGE_ANON_KEY:'', ISNFORGE_ANON_KEY:'', DATA_FILE:dataFile }, stdio:'ignore' });
  try {
    let ready = false;
    for (let i=0;i<80;i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) { ready=true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve,100));
    }
    assert.ok(ready,'servidor iniciou');
    const call = async (route, method='GET', body, cookie='', token='') => {
      const response = await fetch(base+route, { method, headers: { 'content-type':'application/json', ...(cookie ? { cookie } : {}), ...(token ? { authorization:`Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { response, data: await response.json() };
    };
    const login = await call('/api/auth/login','POST',{login:'teste',password:'senha-de-teste'});
    assert.equal(login.response.status,200);
    const cookie = login.response.headers.get('set-cookie').split(';')[0];
    const game = await call('/api/games','POST',{title:'Revisão de IA',type:'quiz',questions:[{id:'q1',text:'O que é API?',timeLimit:20,points:1000,penalty:100,multiple:false,options:[{id:'a',text:'Interface',correct:true},{id:'b',text:'Banco',correct:false}]}]},cookie);
    assert.equal(game.response.status,201);
    const copy = await call(`/api/games/${game.data.id}/duplicate`,'POST',{},cookie);
    assert.equal(copy.response.status,201);
    assert.notEqual(copy.data.id,game.data.id);
    const pdf = await fetch(`${base}/api/games/${game.data.id}/pdf`, { headers:{ cookie } });
    assert.equal(pdf.status,200);
    assert.equal((await pdf.arrayBuffer()).byteLength > 500,true);
    for (const scanned of [false, true]) {
      const imported = await fetch(`${base}/api/games/import-pdf`, { method:'POST', headers:{ cookie, 'content-type':'application/pdf' }, body:await samplePdf(scanned) });
      assert.equal(imported.status, 200);
      const preview = await imported.json();
      assert.equal(preview.pages[0].method, scanned ? 'OCR' : 'texto');
      assert.equal(preview.questions[0].options[0].correct, true);
    }
    const removable = await call('/api/rooms','POST',{gameId:game.data.id},cookie);
    assert.equal((await call(`/api/rooms/${removable.data.pin}`,'DELETE',undefined,cookie)).response.status,200);
    assert.equal((await call(`/api/rooms/${removable.data.pin}`)).response.status,404);
    const room = await call('/api/rooms','POST',{gameId:game.data.id},cookie);
    assert.equal(room.response.status,201);
    const pin = room.data.pin;
    assert.equal((await call('/api/rankings','DELETE')).response.status,401);
    assert.equal((await call('/api/rankings','DELETE',undefined,cookie)).response.status,409);
    assert.equal((await call(`/api/rooms/${pin}`,'DELETE')).response.status,401);
    const join = await call(`/api/rooms/${pin}/join`,'POST',{nickname:'Ana'});
    assert.equal(join.response.status,201);
    assert.equal(join.data.participant.score,0);
    assert.equal((await call(`/api/rooms/${pin}/join`,'POST',{nickname:'ana'})).response.status,400);
    assert.equal((await call(`/api/rooms/${pin}/start`,'POST',{},cookie)).response.status,200);
    assert.equal((await call(`/api/rooms/${pin}/next`,'POST',{},cookie)).response.status,409);
    const answer = await call(`/api/rooms/${pin}/answer`,'POST',{options:['a']},'',join.data.token);
    assert.equal(answer.response.status,200);
    assert.equal(answer.data.correct,true);
    assert.ok(answer.data.score >= 500);
    assert.equal((await call(`/api/rooms/${pin}/answer`,'POST',{options:['a']},'',join.data.token)).response.status,409);
    const end = await call(`/api/rooms/${pin}/next`,'POST',{},cookie);
    assert.equal(end.data.phase,'finished');
    const ranking = await call('/api/rankings','GET',undefined,cookie);
    assert.equal(ranking.data[0].nickname,'Ana');
    assert.equal(ranking.data[0].score,answer.data.score);
    assert.equal((await call('/api/rankings','DELETE',undefined,cookie)).response.status,200);
    assert.deepEqual((await call('/api/rankings','GET',undefined,cookie)).data,[]);
    assert.deepEqual((await call('/api/results','GET',undefined,cookie)).data,[]);
    assert.equal((await call('/api/games','GET',undefined,cookie)).data.length,2);
    assert.equal((await call(`/api/games/${copy.data.id}`,'DELETE',undefined,cookie)).response.status,200);
    assert.equal((await call('/api/games','GET',undefined,cookie)).data.length,1);
    const timedGame = await call('/api/games','POST',{title:'Tempo de resposta',type:'quiz',questions:[{text:'Pergunta?',timeLimit:5,options:[{text:'Sim',correct:true},{text:'Não',correct:false}]}]},cookie);
    const timedRoom = await call('/api/rooms','POST',{gameId:timedGame.data.id},cookie);
    await call(`/api/rooms/${timedRoom.data.pin}/join`,'POST',{nickname:'Bia'});
    await call(`/api/rooms/${timedRoom.data.pin}/start`,'POST',{},cookie);
    assert.equal((await call(`/api/rooms/${timedRoom.data.pin}/next`,'POST',{},cookie)).response.status,409);
    await new Promise(resolve => setTimeout(resolve,5200));
    assert.equal((await call(`/api/rooms/${timedRoom.data.pin}/next`,'POST',{},cookie)).response.status,200);
  } finally {
    child.kill();
    await fs.rm(dataFile,{force:true});
  }
});
