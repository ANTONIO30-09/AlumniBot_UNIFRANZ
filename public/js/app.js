const chatBox = document.getElementById('chat-box');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const statusDiv = document.getElementById('status');
const recIndicator = document.getElementById('recording-indicator');

let isRecording = false;
let finalTranscript = '';

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
    finalTranscript = '';
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

// ENVIAR (Si está grabando, detiene y envía)
sendBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    }
    sendMessage(textInput.value);
});

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (isRecording) stopRecording();
        sendMessage(textInput.value);
    }
});

// LÓGICA DEL MICRÓFONO
function stopRecording() {
    if (window.speechAPI.recognition) {
        window.speechAPI.recognition.stop();
    }
    isRecording = false;
    micBtn.classList.remove('listening');
    recIndicator.classList.add('hidden');
    statusDiv.textContent = "Dictado detenido. Puedes editar o enviar.";
}

if (window.speechAPI.recognition) {
    micBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            try {
                finalTranscript = textInput.value; // Mantiene lo que ya estaba escrito
                window.speechAPI.recognition.start();
                isRecording = true;
                micBtn.classList.add('listening');
                recIndicator.classList.remove('hidden');
                statusDiv.textContent = "Escuchando...";
            } catch (e) {
                console.error(e);
            }
        }
    });

    // Evento que se dispara mientras hablas (tiempo real)
    window.speechAPI.recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        // Muestra lo que estás hablando en el input
        textInput.value = finalTranscript + interimTranscript;
    };

    window.speechAPI.recognition.onend = () => {
        if (isRecording) {
            // Si el navegador lo detiene por inactividad, lo reiniciamos
            window.speechAPI.recognition.start();
        }
    };

    window.speechAPI.recognition.onerror = (event) => {
        console.error("Error de reconocimiento:", event.error);
        stopRecording();
        if (event.error === 'network') {
            statusDiv.textContent = "Error de red (Chrome en Linux no soporta voz nativa). Usa el teclado.";
        } else {
            statusDiv.textContent = `Error: ${event.error}.`;
        }
    };
} else {
    micBtn.style.display = 'none';
    statusDiv.textContent = "Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.";
}
