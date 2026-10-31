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
        chatStarted = true;
        
        const originalAvatar = document.getElementById('bot-avatar');
        const originalRect = originalAvatar.getBoundingClientRect();
        const bubble = document.getElementById('modern-bubble');

        // 1. Ocultar el globo original
        bubble.style.opacity = 0;
        
        // 2. Crear el clon volador
        const clone = originalAvatar.cloneNode();
        clone.style.position = 'fixed';
        clone.style.top = `${originalRect.top}px`;
        clone.style.left = `${originalRect.left}px`;
        clone.style.width = `${originalRect.width}px`;
        clone.style.height = `${originalRect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = '9999';
        clone.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        clone.style.transformOrigin = 'top left';
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);

        // 3. Cambiar layout e insertar mensaje (con el icono pequeño oculto)
        appContainer.classList.add('chat-mode');
        addMessage("¡Hola! Soy AlumniBot. Puedes preguntarme sobre <b>vacantes, prácticas, Career Coaching, ferias de empleabilidad, networking y beneficios Alumni</b>. ¿En qué te ayudo?", 'bot', true);
        
        // 4. Obtener destino y animar
        const targetAvatar = document.querySelector('.chat-avatar');
        const targetRect = targetAvatar.getBoundingClientRect();

        // Forzar al navegador a calcular el layout antes de animar
        void clone.offsetWidth;

        requestAnimationFrame(() => {
            clone.style.top = `${targetRect.top}px`;
            clone.style.left = `${targetRect.left}px`;
            clone.style.width = `${targetRect.width}px`;
            clone.style.height = `${targetRect.height}px`;
            clone.style.borderRadius = '50%';
            clone.style.border = '2px solid var(--accent-color)';
            clone.style.objectFit = 'cover';
            clone.style.objectPosition = 'center 15%';
            clone.style.backgroundColor = 'var(--bg-black)';
        });

        // 5. Al terminar el vuelo
        setTimeout(() => {
            clone.remove();
            targetAvatar.style.opacity = '1';
            window.speechAPI.speak("¡Hola! Soy AlumniBot. Puedes preguntarme sobre vacantes, prácticas, Career Coaching, ferias de empleabilidad, networking y beneficios Alumni. ¿En qué te ayudo?");
        }, 600); 
    }
}

textInput.addEventListener('focus', startChatExperience);
micBtn.addEventListener('click', startChatExperience);

function addMessage(text, sender, hideAvatar = false) {
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('message-row', sender === 'user' ? 'user-row' : 'bot-row');

    if (sender === 'bot') {
        const avatarImg = document.createElement('img');
        avatarImg.src = '/assets/avatar.png';
        avatarImg.classList.add('chat-avatar');
        if (hideAvatar) avatarImg.style.opacity = 0;
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
