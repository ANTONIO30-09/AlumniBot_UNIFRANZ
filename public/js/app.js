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

/* ==========================================================
   FLIP: el avatar grande se encoge y vuela hasta el primer
   .chat-avatar del chat. First -> Last -> Invert -> Play.
   ========================================================== */
(() => {
  const DURATION = 600;                              // ms (0.6s)
  const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';   // ease-in-out suave
  const SETTLE_MS = 0;       // sube este valor si tu layout tiene transition al entrar en chat-mode
  const WAIT_CHAT_MODE = 1000;
  const WAIT_TARGET = 1500;
  const HIDE = 'flip-hidden';
  const INPUT_SEL = [
    '#user-input', '#message-input', '#chat-input', '#input',
    '.chat-input input', '.chat-input textarea',
    'input[type="text"]', 'textarea'
  ].join(',');

  const frames = (n) => new Promise((res) => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const init = () => {
    const container = document.querySelector('.app-container');
    const avatar = document.getElementById('bot-avatar');
    if (!container || !avatar) return;
    if (container.classList.contains('chat-mode')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let busy = false;
    let finished = false;

    const findTarget = () => document.querySelector('.chat-avatar');

    // Devuelve el primer .chat-avatar (lo oculta en cuanto existe) o null si no aparece a tiempo
    const ensureTarget = () => new Promise((res) => {
      const grab = () => {
        const t = findTarget();
        if (t) t.classList.add(HIDE);
        return t;
      };
      const now = grab();
      if (now) return res(now);
      const mo = new MutationObserver(() => {
        const t = grab();
        if (t) { mo.disconnect(); clearTimeout(to); res(t); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      const to = setTimeout(() => { mo.disconnect(); res(null); }, WAIT_TARGET);
    });

    const whenChatMode = () => new Promise((res) => {
      if (container.classList.contains('chat-mode')) return res(true);
      const mo = new MutationObserver(() => {
        if (container.classList.contains('chat-mode')) {
          mo.disconnect(); clearTimeout(to); res(true);
        }
      });
      mo.observe(container, { attributes: true, attributeFilter: ['class'] });
      const to = setTimeout(() => { mo.disconnect(); res(false); }, WAIT_CHAT_MODE);
    });

    const radiusPx = (el, w, h) => {
      const v = getComputedStyle(el).borderTopLeftRadius || '0px';
      const n = parseFloat(v) || 0;
      return v.includes('%') ? (n / 100) * Math.min(w, h) : n;
    };

    const run = async () => {
      // ---------- FIRST ----------
      const first = avatar.getBoundingClientRect();
      if (!first.width || !first.height) { busy = false; return; }

      // Clon fijo exactamente encima del avatar grande
      const cs = getComputedStyle(avatar);
      const clone = avatar.cloneNode(true);
      clone.removeAttribute('id');
      Object.assign(clone.style, {
        position: 'fixed',
        top: first.top + 'px',
        left: first.left + 'px',
        width: first.width + 'px',
        height: first.height + 'px',
        margin: '0',
        maxWidth: 'none',
        maxHeight: 'none',
        transform: 'none',
        transformOrigin: '0 0',
        opacity: '1',
        objectFit: cs.objectFit,
        objectPosition: cs.objectPosition,
        zIndex: '9999',
        pointerEvents: 'none',
        willChange: 'transform, clip-path'
      });
      document.body.appendChild(clone);
      avatar.style.visibility = 'hidden';          // el clon ocupa su lugar

      const cleanup = () => {
        clone.remove();
        avatar.style.visibility = '';
        document.querySelectorAll('.chat-avatar.' + HIDE)
          .forEach((el) => el.classList.remove(HIDE));
      };

      // Si el icono ya existe, se oculta ya (antes de cualquier pintado)
      const early = findTarget();
      if (early) early.classList.add(HIDE);

      // El layout cambia (chat-mode) mientras el clon sigue en su sitio
      const ok = await whenChatMode();
      if (!ok) { cleanup(); busy = false; return; }   // no hubo chat-mode: se reintenta en el próximo clic

      const target = await ensureTarget();
      if (!target) {                                   // sin icono destino: fundido de salida
        await clone.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 250, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
        cleanup(); finished = true; return;
      }

      await frames(2);
      if (SETTLE_MS) await sleep(SETTLE_MS);

      // ---------- LAST ----------
      const last = target.getBoundingClientRect();
      if (!last.width || !last.height) { cleanup(); finished = true; return; }

      // ---------- INVERT ----------
      // Escala uniforme (sin deformar) + recorte desde arriba para llegar a la forma del icono
      const s = Math.max(last.width / first.width, last.height / first.height);
      const cropX = Math.max(0, (first.width - last.width / s) / 2);
      const cropBottom = Math.max(0, first.height - last.height / s);
      const r = radiusPx(target, last.width, last.height) / s;
      const dx = last.left - first.left - cropX * s;
      const dy = last.top - first.top;

      // ---------- PLAY ----------
      const anim = clone.animate([
        { transform: 'translate(0px, 0px) scale(1)',
          clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`,
          clipPath: `inset(0px ${cropX}px ${cropBottom}px ${cropX}px round ${r}px)` }
      ], { duration: DURATION, easing: EASING, fill: 'forwards' });

      await anim.finished.catch(() => {});

      // Aterrizaje: el icono pequeño aparece y el clon se destruye
      target.classList.remove(HIDE);
      requestAnimationFrame(() => {
        clone.remove();
        avatar.style.visibility = '';
      });
      finished = true;
    };

    const onFirstInteraction = (e) => {
      if (busy || finished) return;
      if (!(e.target instanceof Element) || !e.target.closest(INPUT_SEL)) return;
      if (container.classList.contains('chat-mode')) return;
      busy = true;
      run();
    };

    // Captura: se ejecuta ANTES de que tu código añada chat-mode
    document.addEventListener('pointerdown', onFirstInteraction, true);
    document.addEventListener('focusin', onFirstInteraction, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ==========================================================
   FLIP: el avatar grande se encoge y vuela hasta el primer
   .chat-avatar del chat. First -> Last -> Invert -> Play.
   ========================================================== */
(() => {
  const DURATION = 600;                              
  const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';   
  const SETTLE_MS = 0;       
  const WAIT_CHAT_MODE = 1000;
  const WAIT_TARGET = 1500;
  const HIDE = 'flip-hidden';
  const INPUT_SEL = [
    '#text-input', '#user-input', '#message-input', 
    'input[type="text"]', 'textarea'
  ].join(',');

  const frames = (n) => new Promise((res) => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const init = () => {
    const container = document.querySelector('.app-container');
    const avatar = document.getElementById('bot-avatar');
    if (!container || !avatar) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let busy = false;
    let finished = false;

    const findTarget = () => document.querySelector('.chat-avatar');

    const ensureTarget = () => new Promise((res) => {
      const grab = () => {
        const t = findTarget();
        if (t) t.classList.add(HIDE);
        return t;
      };
      const now = grab();
      if (now) return res(now);
      const mo = new MutationObserver(() => {
        const t = grab();
        if (t) { mo.disconnect(); clearTimeout(to); res(t); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      const to = setTimeout(() => { mo.disconnect(); res(null); }, WAIT_TARGET);
    });

    const whenChatMode = () => new Promise((res) => {
      if (container.classList.contains('chat-mode')) return res(true);
      const mo = new MutationObserver(() => {
        if (container.classList.contains('chat-mode')) {
          mo.disconnect(); clearTimeout(to); res(true);
        }
      });
      mo.observe(container, { attributes: true, attributeFilter: ['class'] });
      const to = setTimeout(() => { mo.disconnect(); res(false); }, WAIT_CHAT_MODE);
    });

    const radiusPx = (el, w, h) => {
      const v = getComputedStyle(el).borderTopLeftRadius || '0px';
      const n = parseFloat(v) || 0;
      return v.includes('%') ? (n / 100) * Math.min(w, h) : n;
    };

    const run = async () => {
      const first = avatar.getBoundingClientRect();
      if (!first.width || !first.height) { busy = false; return; }

      const cs = getComputedStyle(avatar);
      const clone = avatar.cloneNode(true);
      clone.removeAttribute('id');
      Object.assign(clone.style, {
        position: 'fixed',
        top: first.top + 'px',
        left: first.left + 'px',
        width: first.width + 'px',
        height: first.height + 'px',
        margin: '0',
        maxWidth: 'none',
        maxHeight: 'none',
        transform: 'none',
        transformOrigin: '0 0',
        opacity: '1',
        objectFit: cs.objectFit,
        objectPosition: cs.objectPosition,
        zIndex: '9999',
        pointerEvents: 'none',
        willChange: 'transform, clip-path'
      });
      document.body.appendChild(clone);
      avatar.style.visibility = 'hidden';          

      const cleanup = () => {
        clone.remove();
        avatar.style.visibility = '';
        document.querySelectorAll('.chat-avatar.' + HIDE)
          .forEach((el) => el.classList.remove(HIDE));
      };

      const early = findTarget();
      if (early) early.classList.add(HIDE);

      const ok = await whenChatMode();
      if (!ok) { cleanup(); busy = false; return; }   

      const target = await ensureTarget();
      if (!target) {                                   
        await clone.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 250, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
        cleanup(); finished = true; return;
      }

      await frames(2);
      if (SETTLE_MS) await sleep(SETTLE_MS);

      const last = target.getBoundingClientRect();
      if (!last.width || !last.height) { cleanup(); finished = true; return; }

      const s = Math.max(last.width / first.width, last.height / first.height);
      const cropX = Math.max(0, (first.width - last.width / s) / 2);
      const cropBottom = Math.max(0, first.height - last.height / s);
      const r = radiusPx(target, last.width, last.height) / s;
      const dx = last.left - first.left - cropX * s;
      const dy = last.top - first.top;

      const anim = clone.animate([
        { transform: 'translate(0px, 0px) scale(1)',
          clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`,
          clipPath: `inset(0px ${cropX}px ${cropBottom}px ${cropX}px round ${r}px)` }
      ], { duration: DURATION, easing: EASING, fill: 'forwards' });

      await anim.finished.catch(() => {});

      target.classList.remove(HIDE);
      requestAnimationFrame(() => {
        clone.remove();
        avatar.style.visibility = '';
      });
      finished = true;
    };

    const onFirstInteraction = (e) => {
      if (busy || finished) return;
      if (!(e.target instanceof Element) || !e.target.closest(INPUT_SEL)) return;
      if (container.classList.contains('chat-mode')) return;
      busy = true;
      run();
    };

    document.addEventListener('pointerdown', onFirstInteraction, true);
    document.addEventListener('focusin', onFirstInteraction, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
