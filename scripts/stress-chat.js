// Uso: N=10 npm run stress
//      N=30 UNIQUE=1 npm run stress   (UNIQUE=1 evita la caché: mide el camino real hacia Groq)
//      URL=https://tu-dominio.onrender.com N=20 npm run stress
const URL_ = (process.env.URL || 'http://localhost:3000') + '/api/chat';
const N = +process.env.N || 10;
const FIELD = process.env.CHAT_FIELD || 'message';
const UNIQUE = process.env.UNIQUE === '1';
const PREGUNTAS = ['¿Qué es la Red Alumni?', '¿Qué es Unifranz?', '¿Cómo me inscribo?',
  '¿Qué carreras hay?', '¿Dónde queda la universidad?', '¿Hay becas?'];
const DEGRADED = /muchas preguntas|problemas t[eé]cnicos|clave de API/i;
const NOINFO = /no tengo esa informaci[oó]n/i;

const one = async (i) => {
  const q = PREGUNTAS[i % PREGUNTAS.length] + (UNIQUE ? ` (${i}-${Date.now() % 100000})` : '');
  const t0 = performance.now();
  try {
    const r = await fetch(URL_, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [FIELD]: q }), signal: AbortSignal.timeout(40000),
    });
    const txt = await r.text();
    let kind = String(r.status);
    if (r.status === 200) {
      let t = txt; try { t = JSON.parse(txt).response || txt; } catch {}
      kind = DEGRADED.test(t) ? 'degradada(200 pero sin LLM)' : NOINFO.test(t) ? 'sin_info' : 'real';
    }
    return { kind, ms: performance.now() - t0 };
  } catch (e) { return { kind: e.name === 'TimeoutError' ? 'TIMEOUT' : 'ERR', ms: performance.now() - t0 }; }
};

(async () => {
  console.log(`→ ${N} peticiones simultáneas a ${URL_}${UNIQUE ? ' (sin caché)' : ''}`);
  const t0 = performance.now();
  const res = await Promise.all(Array.from({ length: N }, (_, i) => one(i)));
  const total = performance.now() - t0;
  const by = res.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
  const lat = res.filter((r) => /^(real|sin_info|degradada)/.test(r.kind)).map((r) => r.ms).sort((a, b) => a - b);
  const q = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))].toFixed(0) : '-');
  console.log('Resultados:', by);
  console.log(`Tiempo total: ${total.toFixed(0)} ms`);
  console.log(`Latencia (respuestas 200) → mín ${q(0)} | p50 ${q(0.5)} | p95 ${q(0.95)} | máx ${q(1)} ms`);
  const bad = res.filter((r) => !/^(real|sin_info)$/.test(r.kind)).length;
  process.exit(bad === 0 ? 0 : 1);
})();
