const express = require('express');
const router = express.Router();
const { generateResponse } = require('../services/llm');

// POST /api/chat
router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'El mensaje es obligatorio.' });
  }

  try {
    const botResponse = await generateResponse(message);
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Error en la ruta /api/chat:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
