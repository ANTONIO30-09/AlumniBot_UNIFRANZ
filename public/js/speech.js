const synth = window.speechSynthesis;
let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyser;
let dataArray;
let animationFrameId;

function speak(text) {
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.onstart = () => window.avatarAnimation.startMouthAnimation();
    utterance.onend = () => window.avatarAnimation.stopMouthAnimation();
    utterance.onerror = () => window.avatarAnimation.stopMouthAnimation();
    synth.speak(utterance);
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.start();
        startVisualizer(stream);
        return true;
    } catch (err) {
        console.error("Error al acceder al micrófono:", err);
        return false;
    }
}

function stopRecording() {
    return new Promise(resolve => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                resolve(audioBlob);
            };
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            stopVisualizer();
        } else {
            resolve(null);
        }
    });
}

// --- Lógica del Waveform (Líneas delgadas) ---
function startVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    // FFT más grande para tener más barras (líneas)
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform');
    const canvasCtx = canvas.getContext('2d');
    
    // Ajustar resolución del canvas para que no se vea borroso
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvasCtx.scale(2, 2);

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Limpiar canvas (transparente)
        canvasCtx.clearRect(0, 0, rect.width, rect.height);

        const barWidth = 2; // Grosor de la línea
        const gap = 3;      // Espacio entre líneas
        const totalBars = Math.floor(rect.width / (barWidth + gap));
        
        // Calcular desde dónde empezar a dibujar para que quede centrado
        const startX = (rect.width - (totalBars * (barWidth + gap))) / 2;
        let x = startX;

        for (let i = 0; i < totalBars; i++) {
            // Mapear el índice del array al ancho del canvas
            const dataIndex = Math.floor((i / totalBars) * bufferLength);
            const value = dataArray[dataIndex];
            
            // Altura proporcional
            let barHeight = (value / 255) * rect.height;
            
            // Altura mínima para que parezca una línea punteada cuando hay silencio
            const minHeight = 3;
            barHeight = Math.max(barHeight, minHeight);

            // Color gris claro
            canvasCtx.fillStyle = '#e4e4e7'; 
            
            // Dibujar rectángulo redondeado (píldora)
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, (rect.height - barHeight) / 2, barWidth, barHeight, 1);
            canvasCtx.fill();

            x += barWidth + gap;
        }
    }
    draw();
}

function stopVisualizer() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioContext) audioContext.close();
}

window.speechAPI = { speak, startRecording, stopRecording };
