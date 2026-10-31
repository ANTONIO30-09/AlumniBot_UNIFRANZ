const appContainer = document.getElementById('app-container');
const chatBox = document.getElementById('chat-box');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const normalInputArea = document.getElementById('normal-input-area');
const recordingBar = document.getElementById('recording-bar');
const stopRecBtn = document.getElementById('stop-rec-btn');
const sendRecBtn = document.getElementById('send-rec-btn');

let chatStarted = false;
let isRecording = false;

function startChatExperience() {
    if (!chatStarted) {
        appContainer.classList.add('chat-mode');
        chatStarted = true;
        
        setTimeout(() => {
            addMessage("¡Hola! Soy AlumniBot. Puedes preguntarme sobre <b>vacantes, prácticas, Career Coaching, ferias de empleabilidad, networking y beneficios Alumni</b>. ¿En qué te ayudo?", 'bot');
            window.speechAPI.speak("¡Hola! Soy AlumniBot. Puedes preguntarme sobre vacantes, prácticas, Career Coaching, ferias de empleabilidad, networking y beneficios Alumni. ¿En qué te ayudo?");
        }, 400); 
    }
}

textInput.addEventListener('focus', startChatExperience);
micBtn.addEventListener('click', startChatExperience);

function addMessage(text, sender) {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('message-row', sender === 'user' ? 'user-row' : 'bot-row');

    if (sender === 'bot') {
        const avatarImg = document.createElement('img');
        avatarImg.src = '/assets/avatar.png';
        avatarImg.classList.add('chat-avatar');
        rowDiv.appendChild(avatarImg);
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    msgDiv.innerHTML = text;
    rowDiv.appendChild(msgDiv);
    chatBox.appendChild(rowDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(message) {
    if (!message.trim()) return;
    startChatExperience(); 
    addMessage(message, 'user');
    textInput.value = '';

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

sendBtn.addEventListener('click', () => sendMessage(textInput.value));
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(textInput.value);
});

async function startRecordingUI() {
    startChatExperience();
    const success = await window.speechAPI.startRecording();
    if (success) {
        isRecording = true;
        normalInputArea.classList.add('hidden');
        recordingBar.classList.remove('hidden');
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
        const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.text) {
            if (action === 'send') {
                sendMessage(data.text);
            } else {
                textInput.value = data.text;
                textInput.focus();
            }
        }
    } catch (error) { console.error("Error:", error); }
}

micBtn.addEventListener('click', startRecordingUI);
stopRecBtn.addEventListener('click', () => stopRecordingUI('stop'));
sendRecBtn.addEventListener('click', () => stopRecordingUI('send'));
