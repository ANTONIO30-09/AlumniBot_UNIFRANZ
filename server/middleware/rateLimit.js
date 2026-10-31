const rateLimit = require('express-rate-limit');

// Límite de 30 peticiones por minuto por IP
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 30, 
  message: { error: 'Demasiadas peticiones. Por favor, espera un minuto e intenta de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;
