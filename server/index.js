require('dotenv').config();
const express = require('express');
const path = require('path');
const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json()); 

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api/chat', chatRoute);

// Ruta comodín CORREGIDA para Express 5
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor AlumniBot corriendo en http://localhost:${PORT}`);
});
