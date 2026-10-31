require('dotenv').config();
const express = require('express');
const path = require('path');
const chatRoute = require('./routes/chat');
const rateLimiter = require('./middleware/rateLimit');
const { stats } = require('./services/llm');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));  // Render va detrás de un proxy
app.disable('x-powered-by');

// Health check (antes del rate limit): para Render y para mantener el servicio despierto
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()), ip: req.ip, ...stats() }));

app.use(express.json({ limit: '10kb' }));

app.use('/api/', rateLimiter);

app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

app.use('/api/chat', chatRoute);
app.use('/api/transcribe', require('./routes/transcribe'));

app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Errores: siempre JSON, y 400/413 para peticiones malformadas
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status === 400 ? 'Petición inválida.' : status === 413 ? 'Petición demasiado grande.' : 'Error interno del servidor.',
  });
});

process.on('unhandledRejection', (r) => console.error('⚠️ unhandledRejection:', r));

const server = app.listen(PORT, (err) => {
  if (err) return;                                  // Express 5 pasa el error aquí; lo maneja 'error'
  console.log(`🚀 Servidor AlumniBot corriendo en http://localhost:${PORT}`);
});
server.on('error', (err) => {
  console.error(`❌ No se pudo iniciar en el puerto ${PORT}:`, err.message);
  process.exit(1);
});
server.keepAliveTimeout = 65000;                    // más que el proxy de Render: evita 502 esporádicos
server.headersTimeout = 66000;

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
