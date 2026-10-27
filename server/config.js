import fs from 'node:fs';
import path from 'node:path';

export const envFilePath = path.resolve(process.env.ENV_FILE || '.env');

try {
  const content = fs.readFileSync(envFilePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); }
      catch { value = value.slice(1, -1).replace(/\\([\\"])/g, '$1'); }
    } else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

export const config = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '127.0.0.1',
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  admin: process.env.LOGIN_ADMIN || '',
  password: process.env.PASSWORD_ADMIN || '',
  sessionSecret: process.env.SESSION_SECRET || process.env.PASSWORD_ADMIN || '',
  openRouterKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || ''
};
