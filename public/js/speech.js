const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES'; 
    recognition.continuous = true; // No se detiene al hacer pausas
    recognition.interimResults = true; // Muestra el texto en tiempo real
}

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

window.speechAPI = { recognition, speak };
