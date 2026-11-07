require('dotenv').config();
const express = require('express');
const path = require('path');
const chatRoute = require('./routes/chat');
const transcribeRoute = require('./routes/transcribe');
const rateLimiter = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Confiar en el proxy de Render para obtener la IP real
app.set('trust proxy', 1);

// Middlewares
app.use(express.json()); 

// --- LOGGER PERSONALIZADO ---
app.use((req, res, next) => {
    // Solo logueamos las peticiones a la API, no los archivos estáticos (css, js, imágenes)
    if (req.path.startsWith('/api/')) {
        const fecha = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
        // Render envía la IP real en el header 'x-forwarded-for'
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Desconocida';
        
        let extra = '';
        if (req.path === '/api/chat' && req.body.message) {
            extra = ` | Mensaje: "${req.body.message.substring(0, 40)}..."`;
        } else if (req.path === '/api/transcribe') {
            extra = ` | [Audio enviado]`;
        }

        console.log(`[${fecha}] IP: ${ip} | Ruta: ${req.path}${extra}`);
    }
    next();
});

// Rutas de la API
app.use('/api/chat', chatRoute);
app.use('/api/transcribe', transcribeRoute);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Ruta comodín para el frontend
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor AlumniBot (con logs) corriendo en http://localhost:${PORT}`);
});
