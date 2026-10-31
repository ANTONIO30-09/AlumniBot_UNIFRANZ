const Groq = require('groq-sdk');
const { getContext } = require('./retriever');

const PRIMARY_MODEL  = process.env.LLM_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_MODEL = process.env.LLM_FALLBACK_MODEL || 'openai/gpt-oss-20b';
const TIMEOUT_MS     = Number(process.env.LLM_TIMEOUT_MS) || 20000;
const MAX_CONCURRENT = Number(process.env.LLM_CONCURRENCY) || 4;
const MAX_QUEUE      = Number(process.env.LLM_MAX_QUEUE) || 40;
const CACHE_TTL_MS   = (Number(process.env.CACHE_TTL_MIN) || 20) * 60 * 1000;
const CACHE_MAX      = 500;

// maxRetries: 0 -> los reintentos los controlamos nosotros (fallback de modelo)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });

const SYSTEM_PROMPT = `
Eres "AlumniBot", el asistente virtual oficial de la Red Alumni de UNIFRANZ Cochabamba.
Tu objetivo es ayudar a estudiantes, graduados y empresas durante la Feria de Empleabilidad.

REGLAS ESTRICTAS:
1. Responde SIEMPRE en español, de forma amable, breve y profesional.
2. Usa ÚNICAMENTE la información proporcionada en el CONTEXTO para responder. No inventes información.
3. Si la respuesta no está en el contexto, di: "Lo siento, no tengo esa información en este momento. Te sugiero contactar directamente con la Coordinación de Empleabilidad o acercarte a uno de los stands de la feria."
4. NUNCA garantices un empleo o contrato. Aclara que la selección depende de las empresas.
5. Si te preguntan por trámites específicos, deriva a la Coordinación de Empleabilidad.
`;

const MSG_BUSY = 'El asistente está recibiendo muchas preguntas en este momento. Por favor, intenta de nuevo en unos segundos.';
const MSG_AUTH = 'Error de configuración: La clave de API no es válida. Contacta al administrador.';
const MSG_TECH = 'Lo siento, estoy teniendo problemas técnicos. Por favor, intenta de nuevo en un momento.';

// ---------- caché LRU con TTL + deduplicación de peticiones en curso ----------
const cache = new Map();
const inflight = new Map();
const normalize = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function cacheGet(k) {
  const e = cache.get(k);
  if (!e) return null;
  if (e.exp < Date.now()) { cache.delete(k); return null; }
  cache.delete(k); cache.set(k, e);               // LRU: lo reciente va al final
  return e.value;
}
function cacheSet(k, value) {
  cache.set(k, { value, exp: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

// ---------- cola con concurrencia limitada ----------
let active = 0;
const waiting = [];
function acquire() {
  if (active < MAX_CONCURRENT) { active++; return Promise.resolve(); }
  if (waiting.length >= MAX_QUEUE) {
    return Promise.reject(Object.assign(new Error('cola llena'), { code: 'QUEUE_FULL' }));
  }
  return new Promise((res) => waiting.push(res));
}
function release() {
  const next = waiting.shift();
  if (next) next(); else active--;
}

// ---------- llamada a Groq con fallback de modelo ----------
let primaryBlockedUntil = 0;
const parseRetryMs = (msg = '') => {
  const m = /try again in ([\d.]+)\s*(ms|s)/i.exec(msg);
  if (!m) return 3000;
  const v = parseFloat(m[1]) * (m[2].toLowerCase() === 'ms' ? 1 : 1000);
  return Math.min(Math.max(v, 500), 60000);
};

async function callModel(model, messages) {
  const params = { messages, model, temperature: 0.3, max_tokens: 250 };
  if (model.startsWith('openai/gpt-oss')) params.reasoning_effort = 'low';   // menos tokens y más rápido
  const r = await groq.chat.completions.create(params);
  const text = r.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Respuesta vacía del modelo');
  return text;
}

async function askLLM(messages) {
  const primaryOk = Date.now() >= primaryBlockedUntil;
  const models = primaryOk ? [PRIMARY_MODEL, FALLBACK_MODEL] : [FALLBACK_MODEL];
  let lastErr;
  for (const model of models) {
    try {
      return await callModel(model, messages);
    } catch (e) {
      lastErr = e;
      if (e.status === 401 || e.status === 403) throw e;
      if (e.status === 429 && model === PRIMARY_MODEL) primaryBlockedUntil = Date.now() + parseRetryMs(e.message);
      console.error(`⚠️ ${model} falló (${e.status || e.name}): ${String(e.message).slice(0, 160)}`);
    }
  }
  throw lastErr;
}

async function answer(userMessage, key) {
  try {
    const context = await getContext(userMessage);
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `CONTEXTO OFICIAL:\n${context}` },
      { role: 'user', content: userMessage },
    ];
    await acquire();
    let text;
    try { text = await askLLM(messages); } finally { release(); }
    if (key) cacheSet(key, text);                  // solo se cachean respuestas reales
    return text;
  } catch (error) {
    console.error('❌ Error en generateResponse:', error.code || error.status || error.name, String(error.message).slice(0, 200));
    if (error.code === 'QUEUE_FULL' || error.status === 429) return MSG_BUSY;
    if (error.status === 401) return MSG_AUTH;
    return MSG_TECH;
  }
}

async function generateResponse(userMessage) {
  const key = normalize(userMessage);
  if (key) {
    const hit = cacheGet(key);
    if (hit) return hit;
    if (inflight.has(key)) return inflight.get(key);
  }
  const p = answer(userMessage, key);               // nunca rechaza: devuelve texto
  if (key) { inflight.set(key, p); p.finally(() => inflight.delete(key)); }
  return p;
}

const stats = () => ({
  active, waiting: waiting.length, cache: cache.size,
  primaryBlockedMs: Math.max(0, primaryBlockedUntil - Date.now()),
});

module.exports = { generateResponse, stats };
