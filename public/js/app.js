const chatBox = document.getElementById('chat-box');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const statusDiv = document.getElementById('status');
const recIndicator = document.getElementById('recording-indicator');

let isRecording = false;

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(message) {
    if (!message.trim()) return;
    addMessage(message, 'user');
    textInput.value = '';
    statusDiv.textContent = "Pensando...";

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        if (data.response) {
            addMessage(data.response, 'bot');
            window.speechAPI.speak(data.response);
            statusDiv.textContent = "Presiona el micrófono para hablar";
        } else {
            addMessage(data.error || "Error al procesar.", 'bot');
            statusDiv.textContent = "Error";
        }
    } catch (error) {
        addMessage("Error de conexión.", 'bot');
        statusDiv.textContent = "Error de red";
    }
}

sendBtn.addEventListener('click', () => {
    if (isRecording) stopRecordingAndTranscribe();
    sendMessage(textInput.value);
});

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (isRecording) stopRecordingAndTranscribe();
        sendMessage(textInput.value);
    }
});

async function stopRecordingAndTranscribe() {
    isRecording = false;
    micBtn.classList.remove('listening');
    recIndicator.classList.add('hidden');
    statusDiv.textContent = "Procesando audio...";

    const audioBlob = await window.speechAPI.stopRecording();
    if (!audioBlob) {
        statusDiv.textContent = "No se grabó audio.";
        return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');

    try {
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.text) {
            textInput.value = data.text;
            statusDiv.textContent = "Texto transcrito. Puedes editarlo o enviarlo.";
        } else {
            statusDiv.textContent = "Error al transcribir.";
        }
    } catch (error) {
        console.error("Error de transcripción:", error);
        statusDiv.textContent = "Error de red al transcribir.";
    }
}

micBtn.addEventListener('click', async () => {
    if (isRecording) {
        await stopRecordingAndTranscribe();
    } else {
        const success = await window.speechAPI.startRecording();
        if (success) {
            isRecording = true;
            micBtn.classList.add('listening');
            recIndicator.classList.remove('hidden');
            statusDiv.textContent = "Grabando... Habla ahora.";
        } else {
            statusDiv.textContent = "No se pudo acceder al micrófono.";
        }
    }
});

// Inicializar estado
statusDiv.textContent = "Presiona el micrófono para hablar";
