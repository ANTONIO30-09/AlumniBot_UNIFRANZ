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
        
        // Iniciar visualizador
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

// --- Lógica del Waveform ---
function startVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform');
    const canvasCtx = canvas.getContext('2d');

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = '#1a1a1a'; // Fondo
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            
            // Color gris claro para las ondas
            canvasCtx.fillStyle = '#e2e8f0'; 
            canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    draw();
}

function stopVisualizer() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioContext) audioContext.close();
}

window.speechAPI = { speak, startRecording, stopRecording };
