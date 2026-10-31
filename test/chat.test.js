const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const PORT = process.env.TEST_PORT || '3999';
const BASE = `http://127.0.0.1:${PORT}`;
const FIELD = process.env.CHAT_FIELD || 'message';   // cambia si tu endpoint espera otro nombre
let srv;

const post = (body, ms = 20000) => fetch(`${BASE}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(ms),
});

test.before(async () => {
  srv = spawn('node', ['server/index.js'], { env: { ...process.env, PORT }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE, { signal: AbortSignal.timeout(500) }); return; }
    catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new Error('El servidor no arrancó en 10 s');
});
test.after(() => srv && srv.kill());

test('POST /api/chat responde 200 con JSON válido', async (t) => {
  if (!process.env.GROQ_API_KEY && !require('node:fs').existsSync('.env')) {
    return t.skip('sin GROQ_API_KEY / .env: se omite (llama al LLM real)');
  }
  const res = await post({ [FIELD]: '¿Qué es Unifranz?' });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const data = await res.json();
  assert.ok(data && typeof data === 'object' && Object.keys(data).length > 0);
});

test('POST /api/chat con mensaje vacío devuelve 4xx (no 500)', async () => {
  const res = await post({ [FIELD]: '' });
  assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}`);
});

test('POST /api/chat con JSON roto devuelve 4xx (no 500)', async () => {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{roto',
  });
  assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}`);
});

test('GET /health responde ok', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('POST /api/chat con message no-string devuelve 400 (no 500)', async () => {
  const res = await post({ [FIELD]: 12345 });
  assert.equal(res.status, 400);
});

test('POST /api/chat con mensaje > 500 caracteres devuelve 400', async () => {
  const res = await post({ [FIELD]: 'a'.repeat(501) });
  assert.equal(res.status, 400);
});
