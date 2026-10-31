const express = require('express');
const router = express.Router();
const multer = require('multer');
const Groq = require('groq-sdk');
const fs = require('fs');
const os = require('os');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/transcribe
router.post('/', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo de audio.' });
    }

    // 1. Guardar el buffer en un archivo temporal
    const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
        // 2. Enviar el archivo a Groq
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3-turbo',
            language: 'es',
            response_format: 'json',
        });

        res.json({ text: transcription.text });
    } catch (error) {
        // Imprimimos el error real en la terminal para debug
        console.error('❌ Error detallado en transcripción:', error.message);
        res.status(500).json({ error: 'Error al transcribir el audio.' });
    } finally {
        // 3. Limpiar el archivo temporal
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
});

module.exports = router;
