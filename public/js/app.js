const chatBox = document.getElementById('chat-box');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const statusDiv = document.getElementById('status');

// Función para agregar mensajes al chat
function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Función principal para enviar mensaje al backend
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
            window.speechAPI.speak(data.response); // Hacer que el bot hable
            statusDiv.textContent = "Presiona el micrófono para hablar";
        } else {
            addMessage(data.error || "Error al procesar la respuesta.", 'bot');
            statusDiv.textContent = "Error";
        }
    } catch (error) {
        addMessage("Error de conexión con el servidor.", 'bot');
        statusDiv.textContent = "Error de red";
    }
}

// Eventos de botones
sendBtn.addEventListener('click', () => sendMessage(textInput.value));
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(textInput.value);
});

// Evento del micrófono
if (window.speechAPI.recognition) {
    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('listening')) {
            window.speechAPI.recognition.stop();
            return;
        }

        try {
            window.speechAPI.recognition.start();
            micBtn.classList.add('listening');
            statusDiv.textContent = "Escuchando...";
        } catch (e) {
            console.error(e);
        }
    });

    window.speechAPI.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(transcript);
    };

    window.speechAPI.recognition.onend = () => {
        micBtn.classList.remove('listening');
        if (statusDiv.textContent === "Escuchando...") {
            statusDiv.textContent = "Presiona el micrófono para hablar";
        }
    };

    window.speechAPI.recognition.onerror = (event) => {
        console.error("Error de reconocimiento:", event.error);
        micBtn.classList.remove('listening');
        statusDiv.textContent = "Error al escuchar. Intenta de nuevo.";
    };
} else {
    micBtn.style.display = 'none';
    statusDiv.textContent = "Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.";
}
