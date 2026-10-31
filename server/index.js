require('dotenv').config();
const express = require('express');
const path = require('path');
const chatRoute = require('./routes/chat');
const rateLimiter = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json()); 

// Aplicar Rate Limit solo a las rutas de la API
app.use('/api/', rateLimiter);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api/chat', chatRoute);
app.use('/api/transcribe', require('./routes/transcribe'));

// Ruta comodín para el frontend
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor AlumniBot (blindado) corriendo en http://localhost:${PORT}`);
});
