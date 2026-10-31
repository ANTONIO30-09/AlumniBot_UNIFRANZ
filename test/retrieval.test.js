const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const QUERY = process.env.TEST_QUERY || 'Red Alumni';

async function load() {
  const mod = await import(pathToFileURL(path.resolve('server/services/retriever.js')).href);
  const api = { ...(mod.default || {}), ...mod };
  const fn = api.getContext || api.search || api.retrieve;
  assert.equal(typeof fn, 'function', 'retriever.js debe exportar getContext (o search/retrieve)');
  return fn;
}
const asText = (r) => (typeof r === 'string' ? r : JSON.stringify(r));

test('getContext devuelve contexto no vacío para una consulta válida', async () => {
  const getContext = await load();
  const out = await getContext(QUERY);
  assert.ok(out && asText(out).length > 10, 'resultado vacío');
});

test('getContext no lanza error con entradas raras', async () => {
  const getContext = await load();
  for (const q of ['', '   ', 'zzzzxqxq123', 'ñandú ¿qué? <script>', 'a'.repeat(5000)]) {
    await assert.doesNotReject(async () => getContext(q), `falló con: ${q.slice(0, 20)}`);
  }
});

test('getContext es rápido (100 búsquedas < 1.5 s)', async () => {
  const getContext = await load();
  await getContext(QUERY); // calentamiento
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) await getContext(QUERY);
  const ms = performance.now() - t0;
  console.log(`  100 búsquedas: ${ms.toFixed(0)} ms (${(ms / 100).toFixed(2)} ms c/u)`);
  assert.ok(ms < 1500, `muy lento: ${ms.toFixed(0)} ms`);
});
