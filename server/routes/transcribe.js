const express = require('express');
const router = express.Router();
const multer = require('multer');
const Groq = require('groq-sdk');

const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/transcribe
router.post('/', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo de audio.' });
    }

    try {
        const transcription = await groq.audio.transcriptions.create({
            file: req.file.buffer,
            model: 'whisper-large-v3-turbo',
            language: 'es',
            response_format: 'json',
        });

        res.json({ text: transcription.text });
    } catch (error) {
        console.error('Error en transcripción:', error);
        res.status(500).json({ error: 'Error al transcribir el audio.' });
    }
});

module.exports = router;
