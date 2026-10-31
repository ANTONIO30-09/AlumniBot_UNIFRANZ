const rateLimit = require('express-rate-limit');

// En una feria muchos visitantes comparten IP (mismo WiFi): 30/min era muy poco.
// El tope real de Groq lo gestiona llm.js (caché + cola + fallback).
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MIN) || 120,
  message: { error: 'Demasiadas peticiones. Por favor, espera un minuto e intenta de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;
