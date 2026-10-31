const appContainer = document.getElementById('app-container');
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
let chatStarted = false;

// INICIALIZAR EXPERIENCIA
function startChatExperience() {
    if (!chatStarted) {
        appContainer.classList.add('chat-mode');
        chatStarted = true;
        
        // Saludo inicial del bot en el chat
        setTimeout(() => {
            addMessage("¡Hola! Soy AlumniBot. ¿En qué puedo ayudarte hoy sobre la Red Alumni o la Feria de Empleabilidad?", 'bot');
        }, 500); // Pequeño delay para que la animación fluya
    }
}

// Eventos para disparar la animación
textInput.addEventListener('focus', startChatExperience);
micBtn.addEventListener('click', startChatExperience);

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(message) {
    if (!message.trim()) return;
    startChatExperience(); // Asegurar que estamos en modo chat
    addMessage(message, 'user');
    textInput.value = '';
    statusDiv.style.opacity = "0"; // Ocultar status de bienvenida

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
        } else {
            addMessage(data.error || "Error al procesar.", 'bot');
        }
    } catch (error) {
        addMessage("Error de conexión.", 'bot');
    }
}

// Eventos de Texto
sendBtn.addEventListener('click', () => sendMessage(textInput.value));
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(textInput.value);
});

// Lógica de Grabación
async function startRecordingUI() {
    startChatExperience(); // Asegurar modo chat
    const success = await window.speechAPI.startRecording();
    if (success) {
        isRecording = true;
        normalInputArea.classList.add('hidden');
        recordingBar.classList.remove('hidden');
        statusDiv.style.opacity = "0";
    }
}

async function stopRecordingUI(action) {
    isRecording = false;
    const audioBlob = await window.speechAPI.stopRecording();
    recordingBar.classList.add('hidden');
    normalInputArea.classList.remove('hidden');

    if (!audioBlob) return;

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
                sendMessage(data.text);
            } else {
                textInput.value = data.text;
                textInput.focus();
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

micBtn.addEventListener('click', startRecordingUI);
stopRecBtn.addEventListener('click', () => stopRecordingUI('stop'));
sendRecBtn.addEventListener('click', () => stopRecordingUI('send'));
