import fs from 'node:fs/promises';
import path from 'node:path';
import './config.js';

const baseUrl = (process.env.INSFORGE_BASE_URL || process.env.PROJECT_URL || '').replace(/\/$/, '');
const adminKey = process.env.INSFORGE_ADMIN_API_KEY || '';
const localFile = path.resolve(process.env.DATA_FILE || '.data/records.json');
let queue = Promise.resolve();

export let usingInsforge = false;

export async function initializeStore() {
  if (!baseUrl || !adminKey) return 'URL ou chave administrativa do Insforge ausente';
  try {
    const response = await fetch(`${baseUrl}/api/database/advance/rawsql`, { method: 'POST', headers: { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'SELECT id FROM public.cucando_records LIMIT 1' }) });
    if (!response.ok) return `Insforge ${response.status}: ${(await response.text()).slice(0, 160)}`;
    usingInsforge = true;
    return null;
  } catch (error) { return `Insforge indisponível: ${error.message}`; }
}

async function sql(query, params = []) {
  const response = await fetch(`${baseUrl}/api/database/advance/rawsql`, { method: 'POST', headers: { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, params }) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Insforge ${response.status}: ${raw.slice(0, 250)}`);
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : parsed.rows || parsed.data || parsed;
}

async function readLocal() {
  try { return JSON.parse(await fs.readFile(localFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function writeLocal(records) {
  await fs.mkdir(path.dirname(localFile), { recursive: true });
  await fs.writeFile(localFile, JSON.stringify(records, null, 2));
}

export async function list(kind) {
  if (usingInsforge) {
    const rows = await sql('SELECT id, payload FROM public.cucando_records WHERE kind = $1 ORDER BY created_at DESC LIMIT 1000', [kind]);
    return rows.map(row => ({ id: row.id, ...row.payload }));
  }
  return (await readLocal()).filter(row => row.kind === kind).map(row => ({ id: row.id, ...row.payload }));
}

export async function get(kind, id) {
  if (usingInsforge) {
    const rows = await sql('SELECT id, payload FROM public.cucando_records WHERE kind = $1 AND id = $2 LIMIT 1', [kind, id]);
    return rows[0] ? { id: rows[0].id, ...rows[0].payload } : null;
  }
  const row = (await readLocal()).find(item => item.kind === kind && item.id === id);
  return row ? { id: row.id, ...row.payload } : null;
}

export async function save(kind, item) {
  const { id, ...payload } = item;
  if (usingInsforge) {
    await sql('INSERT INTO public.cucando_records (id, kind, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload', [id, kind, JSON.stringify(payload)]);
    return item;
  }
  queue = queue.catch(() => {}).then(async () => {
    const records = await readLocal();
    const index = records.findIndex(row => row.id === id && row.kind === kind);
    const row = { id, kind, payload, created_at: new Date().toISOString() };
    if (index < 0) records.push(row); else records[index] = { ...records[index], payload };
    await writeLocal(records);
  });
  await queue;
  return item;
}

export async function remove(kind, id) {
  if (usingInsforge) { await sql('DELETE FROM public.cucando_records WHERE kind = $1 AND id = $2', [kind, id]); return; }
  queue = queue.catch(() => {}).then(async () => writeLocal((await readLocal()).filter(row => !(row.kind === kind && row.id === id))));
  await queue;
}
