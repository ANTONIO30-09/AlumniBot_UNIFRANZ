const express = require('express');
const router = express.Router();
const multer = require('multer');
const Groq = require('groq-sdk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('audio');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 25000, maxRetries: 1 });

const extFor = (mime = '') => (mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm');

// POST /api/transcribe
router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      const big = err.code === 'LIMIT_FILE_SIZE';
      return res.status(big ? 413 : 400).json({ error: big ? 'El audio es demasiado largo.' : 'Audio inválido.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo de audio.' });
    }

    // Nombre único: con Date.now() dos subidas simultáneas podían pisarse el archivo
    const tempFilePath = path.join(os.tmpdir(), `audio-${crypto.randomUUID()}.${extFor(req.file.mimetype)}`);
    try {
      await fs.promises.writeFile(tempFilePath, req.file.buffer);
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-large-v3-turbo',
        language: 'es',
        response_format: 'json',
      });
      res.json({ text: transcription.text });
    } catch (error) {
      console.error('❌ Error detallado en transcripción:', error.status || error.name, error.message);
      if (error.status === 429) return res.status(503).json({ error: 'Muchas solicitudes de voz. Intenta de nuevo en unos segundos.' });
      res.status(500).json({ error: 'Error al transcribir el audio.' });
    } finally {
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  });
});

module.exports = router;
