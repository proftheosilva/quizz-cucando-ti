import fs from 'node:fs/promises';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import './config.js';

const baseUrl = (process.env.INSFORGE_BASE_URL || process.env.PROJECT_URL || '').replace(/\/$/, '');
const adminKey = process.env.INSFORGE_ADMIN_API_KEY || '';
const localFile = path.resolve(process.env.DATA_FILE || '.data/records.json');
let queue = Promise.resolve();
const ownerScope = new AsyncLocalStorage();
const tenantKinds = new Set(['game', 'session', 'import', 'room', 'catalog', 'student', 'review']);
const legacyOwner = 'legacy-admin';

export function withOwner(ownerId, callback) { return ownerScope.run(ownerId || null, callback); }
function visibleToOwner(kind, item, ownerId = ownerScope.getStore()) {
  if (!tenantKinds.has(kind) || !ownerId) return true;
  return (item.ownerId || legacyOwner) === ownerId;
}

export let usingInsforge = false;

export async function initializeStore() {
  if (!baseUrl || !adminKey) return 'URL ou chave administrativa do Insforge ausente';
  try {
    const response = await fetch(`${baseUrl}/api/database/advance/rawsql`, { method: 'POST', headers: { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: "SELECT id FROM public.cucando_records WHERE kind IN ('game','session','import','room','catalog','student','review','teacher') LIMIT 1" }) });
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
    return rows.map(row => ({ id: row.id, ...row.payload })).filter(item => visibleToOwner(kind, item));
  }
  return (await readLocal()).filter(row => row.kind === kind).map(row => ({ id: row.id, ...row.payload })).filter(item => visibleToOwner(kind, item));
}

export async function get(kind, id) {
  if (usingInsforge) {
    const rows = await sql('SELECT id, payload FROM public.cucando_records WHERE kind = $1 AND id = $2 LIMIT 1', [kind, id]);
    const item = rows[0] ? { id: rows[0].id, ...rows[0].payload } : null;
    return item && visibleToOwner(kind, item) ? item : null;
  }
  const row = (await readLocal()).find(item => item.kind === kind && item.id === id);
  const item = row ? { id: row.id, ...row.payload } : null;
  return item && visibleToOwner(kind, item) ? item : null;
}

export async function save(kind, item) {
  const scopedOwner = ownerScope.getStore();
  const savedItem = tenantKinds.has(kind) && scopedOwner ? { ...item, ownerId: scopedOwner } : item;
  const { id, ...payload } = savedItem;
  if (usingInsforge) {
    await sql('INSERT INTO public.cucando_records (id, kind, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload', [id, kind, JSON.stringify(payload)]);
    return savedItem;
  }
  queue = queue.catch(() => {}).then(async () => {
    const records = await readLocal();
    const index = records.findIndex(row => row.id === id && row.kind === kind);
    const row = { id, kind, payload, created_at: new Date().toISOString() };
    if (index < 0) records.push(row); else records[index] = { ...records[index], payload };
    await writeLocal(records);
  });
  await queue;
  return savedItem;
}

export async function remove(kind, id) {
  const ownerId = ownerScope.getStore();
  if (usingInsforge) {
    if (tenantKinds.has(kind) && ownerId) await sql("DELETE FROM public.cucando_records WHERE kind = $1 AND id = $2 AND COALESCE(payload->>'ownerId', 'legacy-admin') = $3", [kind, id, ownerId]);
    else await sql('DELETE FROM public.cucando_records WHERE kind = $1 AND id = $2', [kind, id]);
    return;
  }
  queue = queue.catch(() => {}).then(async () => writeLocal((await readLocal()).filter(row => {
    if (row.kind !== kind || row.id !== id) return true;
    return !tenantKinds.has(kind) || !ownerId || (row.payload?.ownerId || legacyOwner) !== ownerId;
  })));
  await queue;
}

export async function clearRanking(ownerId = ownerScope.getStore()) {
  if (usingInsforge) {
    const rows = ownerId
      ? await sql("DELETE FROM public.cucando_records WHERE kind IN ('session', 'import') AND COALESCE(payload->>'ownerId', 'legacy-admin') = $1 RETURNING id", [ownerId])
      : await sql("DELETE FROM public.cucando_records WHERE kind IN ('session', 'import') RETURNING id");
    return rows.length;
  }
  let removed = 0;
  queue = queue.catch(() => {}).then(async () => {
    const records = await readLocal();
    const kept = records.filter(row => !(['session', 'import'].includes(row.kind) && (!ownerId || (row.payload?.ownerId || legacyOwner) === ownerId)));
    removed = records.length - kept.length;
    await writeLocal(kept);
  });
  await queue;
  return removed;
}
