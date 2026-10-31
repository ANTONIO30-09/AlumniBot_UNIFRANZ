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

// --- Lógica del Waveform Corregida ---
function startVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform');
    const canvasCtx = canvas.getContext('2d');
    
    // FIJAMOS EL TAMAÑO INTERNO (No dependemos del CSS que puede ser 0 si está oculto)
    canvas.width = 600;
    canvas.height = 100;

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = 4;   // Grosor de la línea
        const gap = 6;        // Espacio entre líneas
        const totalBars = Math.floor(canvas.width / (barWidth + gap));
        
        const startX = (canvas.width - (totalBars * (barWidth + gap))) / 2;
        let x = startX;

        for (let i = 0; i < totalBars; i++) {
            const dataIndex = Math.floor((i / totalBars) * bufferLength);
            const value = dataArray[dataIndex];
            
            let barHeight = (value / 255) * canvas.height;
            const minHeight = 6; // Altura mínima para que se vea como puntos
            barHeight = Math.max(barHeight, minHeight);

            canvasCtx.fillStyle = '#e4e4e7'; 
            
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight, 2);
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
