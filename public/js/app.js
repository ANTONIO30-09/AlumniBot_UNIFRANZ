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
        
        const largeAvatar = document.getElementById('bot-avatar');
        const bubble = document.getElementById('modern-bubble');
        const avatarSection = document.getElementById('avatar-section');
        
        // 1. Ocultar el globo inmediatamente
        bubble.style.opacity = 0;
        
        // 2. Insertar el mensaje del bot, pero con el avatar pequeño invisible
        addMessage("¡Hola! Soy AlumniBot. Puedes preguntarme sobre <b>vacantes, prácticas, Career Coaching, ferias de empleabilidad, networking y beneficios Alumni</b>. ¿En qué te ayudo?", 'bot', true);
        
        // 3. Calcular posiciones exactas (FLIP)
        const firstRect = largeAvatar.getBoundingClientRect();
        const targetAvatar = document.querySelector('.chat-avatar');
        const lastRect = targetAvatar.getBoundingClientRect();
        
        // Calcular diferencias
        const deltaX = lastRect.left - firstRect.left;
        const deltaY = lastRect.top - firstRect.top;
        const scale = lastRect.width / firstRect.width;
        
        // 4. Preparar el avatar grande para volar
        largeAvatar.style.position = 'fixed';
        largeAvatar.style.top = `${firstRect.top}px`;
        largeAvatar.style.left = `${firstRect.left}px`;
        largeAvatar.style.width = `${firstRect.width}px`;
        largeAvatar.style.height = `${firstRect.height}px`;
        largeAvatar.style.margin = 0;
        largeAvatar.style.transformOrigin = 'top left';
        largeAvatar.style.zIndex = '9999';
        
        // Ocultar la sección original para liberar espacio
        avatarSection.style.display = 'none';
        
        // Forzar al navegador a reconocer el estado inicial
        void largeAvatar.offsetWidth;
        
        // 5. Aplicar la transición y el vuelo
        largeAvatar.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.2s ease-in 0.4s, border 0.1s ease-in 0.5s, background-color 0.2s ease-in 0.4s';
        largeAvatar.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
        largeAvatar.style.borderRadius = '50%';
        largeAvatar.style.border = '2px solid var(--accent-color)';
        largeAvatar.style.backgroundColor = 'var(--bg-black)';
        largeAvatar.style.objectFit = 'cover';
        largeAvatar.style.objectPosition = 'center 15%';
        
        // 6. Cuando termina el vuelo
        setTimeout(() => {
            largeAvatar.style.display = 'none'; // Ocultar el volador
            targetAvatar.style.opacity = 1;     // Mostrar el real
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
