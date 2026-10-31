const chatBox = document.getElementById('chat-box');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const statusDiv = document.getElementById('status');

// Elementos de la barra de grabación
const normalInputArea = document.getElementById('normal-input-area');
const recordingBar = document.getElementById('recording-bar');
const stopRecBtn = document.getElementById('stop-rec-btn');
const sendRecBtn = document.getElementById('send-rec-btn');

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

// --- Modo Texto ---
sendBtn.addEventListener('click', () => sendMessage(textInput.value));
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(textInput.value);
});

// --- Modo Grabación ---
async function startRecordingUI() {
    const success = await window.speechAPI.startRecording();
    if (success) {
        isRecording = true;
        normalInputArea.classList.add('hidden');
        recordingBar.classList.remove('hidden');
        statusDiv.textContent = "Grabando audio...";
    } else {
        statusDiv.textContent = "No se pudo acceder al micrófono.";
    }
}

async function stopRecordingUI(action) { // action = 'stop' | 'send'
    isRecording = false;
    statusDiv.textContent = "Procesando audio...";
    
    const audioBlob = await window.speechAPI.stopRecording();
    recordingBar.classList.add('hidden');
    normalInputArea.classList.remove('hidden');

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
            if (action === 'send') {
                // Si presionó enviar directamente, mandamos el mensaje sin mostrar el texto en el input
                sendMessage(data.text);
            } else {
                // Si presionó detener, mostramos el texto para que lo edite
                textInput.value = data.text;
                statusDiv.textContent = "Texto listo. Puedes editarlo o enviarlo.";
            }
        } else {
            statusDiv.textContent = "Error al transcribir.";
        }
    } catch (error) {
        console.error("Error:", error);
        statusDiv.textContent = "Error de red al transcribir.";
    }
}

micBtn.addEventListener('click', startRecordingUI);
stopRecBtn.addEventListener('click', () => stopRecordingUI('stop'));
sendRecBtn.addEventListener('click', () => stopRecordingUI('send'));

// Inicializar estado
statusDiv.textContent = "Presiona el micrófono para hablar";
