import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BASE = process.env.EVAL_BASE_URL || 'http://localhost:3001';

const envVars = {};
for (const line of fs.readFileSync(ROOT + '.env', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z_]+)="?([^"#]*)"?\s*$/.exec(line);
  if (m) envVars[m[1]] = m[2];
}

const TOKEN_CACHE = path.join(os.tmpdir(), 'hhee-eval-token.json');
const TOKEN_TTL_MS = 60 * 60 * 1000;

async function getToken() {
  try {
    const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE, 'utf8'));
    if (cached.token && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token;
  } catch {}
  const loginRes = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: envVars.ADMIN_USER, password: envVars.ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error('LOGIN_FAILED', loginRes.status);
    process.exit(1);
  }
  const { token } = await loginRes.json();
  try { fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token, at: Date.now() })); } catch {}
  return token;
}

const question = (process.argv[2] || '').trim();

async function main() {
  if (!question) {
    console.error('EMPTY_QUESTION');
    process.exit(1);
  }

  const token = await getToken();

  const chatRes = await fetch(`${BASE}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: question }),
  });

  if (!chatRes.ok) {
    console.error('CHAT_FAILED', chatRes.status);
    process.exit(1);
  }

  const text = await chatRes.text();
  process.stdout.write(text);
  process.exit(0);
}

main().catch((e) => {
  console.error('EVAL_HELPER_ERROR', e.message);
  process.exit(1);
});
