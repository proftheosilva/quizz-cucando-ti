import fs from 'node:fs';
import path from 'node:path';

try {
  const content = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

export const config = {
  port: Number(process.env.PORT || 3001),
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  admin: process.env.LOGIN_ADMIN || '',
  password: process.env.PASSWORD_ADMIN || '',
  sessionSecret: process.env.SESSION_SECRET || process.env.PASSWORD_ADMIN || '',
  openRouterKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || ''
};
