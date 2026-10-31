const synth = window.speechSynthesis;
let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyser;
let dataArray;
let animationFrameId;
let barHeights = [];

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
        mediaRecorder.ondataavailable = event => { audioChunks.push(event.data); };
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
        } else { resolve(null); }
    });
}

function startVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.smoothingTimeConstant = 0.85; 
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform');
    const canvasCtx = canvas.getContext('2d');
    canvas.width = 600; canvas.height = 100;

    const barWidth = 2; const gap = 4;
    const totalBars = Math.floor(canvas.width / (barWidth + gap));
    if (barHeights.length !== totalBars) barHeights = new Array(totalBars).fill(0);

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const startX = (canvas.width - (totalBars * (barWidth + gap))) / 2;
        let x = startX;
        for (let i = 0; i < totalBars; i++) {
            const dataIndex = Math.floor((i / totalBars) * bufferLength);
            const targetHeight = (dataArray[dataIndex] / 255) * canvas.height;
            barHeights[i] += (targetHeight - barHeights[i]) * 0.25; 
            let currentHeight = Math.max(barHeights[i], 4);
            canvasCtx.fillStyle = '#e4e4e7'; 
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, (canvas.height - currentHeight) / 2, barWidth, currentHeight, 1);
            canvasCtx.fill();
            x += barWidth + gap;
        }
    }
    draw();
}

function stopVisualizer() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioContext) audioContext.close();
    barHeights = [];
}

window.speechAPI = { speak, startRecording, stopRecording };
