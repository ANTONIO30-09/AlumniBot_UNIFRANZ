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
   FLIP v4: anticipación con elevación, vuelo en arco con estela,
   la escala se adelanta a la posición, fundido cruzado sin salto
   al aterrizar y onda naranja independiente.
   ========================================================== */
(() => {
  if (window.__alumniFlipV4) return;
  window.__alumniFlipV4 = true;

  const CFG = {
    duration: 950,                                  // ms totales
    face: { cx: 0.5, cy: 0.26, size: 0.42 },        // zona de la cara dentro de #bot-avatar
    arc: 0.22,                                      // curvatura del arco (0 = recta)
    tilt: 6,                                        // grados de inclinación en vuelo
    stretch: 0.035,                                 // squash & stretch (0 = ninguno)
    trail: 2,                                       // copias de estela (0 = sin estela)
    settle: 0,                                      // ms extra si chat-mode tiene transition
    waitChatMode: 1000,
    waitTarget: 1500,
    accent: '236, 94, 23'
  };
  const HIDE = 'flip-hidden';
  const INPUT_SEL = [
    '#user-input', '#message-input', '#chat-input', '#input',
    '.chat-input input', '.chat-input textarea',
    'input[type="text"]', 'textarea'
  ].join(',');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
  const easeInOutS = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = (n) => new Promise((res) => {
    const step = () => (--n <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });

  const init = () => {
    const container = document.querySelector('.app-container');
    const avatar = document.getElementById('bot-avatar');
    if (!container || !avatar) return;
    if (container.classList.contains('chat-mode')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let busy = false, finished = false;
    const findTarget = () => document.querySelector('.chat-avatar');

    const ensureTarget = () => new Promise((res) => {
      const grab = () => { const t = findTarget(); if (t) t.classList.add(HIDE); return t; };
      const now = grab();
      if (now) return res(now);
      const mo = new MutationObserver(() => {
        const t = grab();
        if (t) { mo.disconnect(); clearTimeout(to); res(t); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      const to = setTimeout(() => { mo.disconnect(); res(null); }, CFG.waitTarget);
    });

    const whenChatMode = () => new Promise((res) => {
      if (container.classList.contains('chat-mode')) return res(true);
      const mo = new MutationObserver(() => {
        if (container.classList.contains('chat-mode')) { mo.disconnect(); clearTimeout(to); res(true); }
      });
      mo.observe(container, { attributes: true, attributeFilter: ['class'] });
      const to = setTimeout(() => { mo.disconnect(); res(false); }, CFG.waitChatMode);
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
      const W = first.width, H = first.height;

      const S = Math.min(W, CFG.face.size * H);
      const x0 = clamp(CFG.face.cx * W - S / 2, 0, W - S);
      const y0 = clamp(CFG.face.cy * H - S / 2, 0, H - S);

      const cs = getComputedStyle(avatar);
      const makeWrap = () => {
        const w = document.createElement('div');
        Object.assign(w.style, {
          position: 'fixed', top: first.top + 'px', left: first.left + 'px',
          width: W + 'px', height: H + 'px', margin: '0', padding: '0',
          zIndex: '9999', pointerEvents: 'none', willChange: 'transform, filter, opacity'
        });
        const c = avatar.cloneNode(true);
        c.removeAttribute('id');
        Object.assign(c.style, {
          position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
          margin: '0', maxWidth: 'none', maxHeight: 'none', transform: 'none',
          opacity: '1', animation: 'none', transition: 'none', filter: 'none',
          objectFit: cs.objectFit, objectPosition: cs.objectPosition,
          clipPath: 'inset(0px 0px 0px 0px round 0px)', willChange: 'clip-path'
        });
        w.appendChild(c);
        return { w, c };
      };

      const main = makeWrap();
      const ghosts = [];
      for (let k = 1; k <= CFG.trail; k++) {
        const g = makeWrap();
        g.w.style.opacity = '0';
        g.w.style.zIndex = String(9998 - k);
        ghosts.push({ ...g, k });
        document.body.appendChild(g.w);
      }
      document.body.appendChild(main.w);
      avatar.style.visibility = 'hidden';

      const bubble = document.querySelector('.modern-bubble');
      let bubbleAnim = null;
      if (bubble) bubbleAnim = bubble.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 220, easing: 'ease-out', fill: 'forwards' });

      const cleanup = () => {
        main.w.remove();
        ghosts.forEach((g) => g.w.remove());
        avatar.style.visibility = '';
        if (bubbleAnim) bubbleAnim.cancel();
        document.querySelectorAll('.chat-avatar.' + HIDE).forEach((el) => el.classList.remove(HIDE));
      };

      const early = findTarget();
      if (early) early.classList.add(HIDE);

      const ok = await whenChatMode();
      if (!ok) { cleanup(); busy = false; return; }

      const target = await ensureTarget();
      if (!target) {
        await main.w.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 250, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
        cleanup(); finished = true; return;
      }

      await frames(2);
      if (CFG.settle) await sleep(CFG.settle);

      let lastRect = target.getBoundingClientRect();
      if (!lastRect.width || !lastRect.height) { cleanup(); finished = true; return; }

      // ---------- LAST + INVERT + PLAY ----------
      // Línea de tiempo: 0-12% anticipación | 12-88% vuelo | 88-100% fundido cruzado
      const place = (wrap, clone, t, withFx) => {
        const last = lastRect;
        const f = clamp((t - 0.12) / 0.76);
        const eP = easeInOut(f);                          // posición: arranque y frenado fuertes
        const eS = easeInOutS(clamp(f * 1.12)) + 0.05 * Math.sin(Math.PI * clamp((f - 0.6) / 0.4)); // encoge con rebote
        const eC = easeInOutS(clamp(f / 0.85));           // recorte y encogimiento van juntos

        const sFinal = last.width / S;
        const pulse = Math.sin(Math.PI * clamp(t / 0.24));
        const sc = Math.pow(sFinal, eS) * (1 + 0.05 * pulse);
        const v = Math.sin(Math.PI * f);
        const sx = sc * (1 + CFG.stretch * v), sy = sc * (1 - CFG.stretch * v);

        const L = x0 * eC, T = y0 * eC;
        const R = (W - x0 - S) * eC, B = (H - y0 - S) * eC;
        const rad = (radiusPx(target, last.width, last.height) / sFinal) * eC;
        clone.style.clipPath = `inset(${T}px ${R}px ${B}px ${L}px round ${rad}px)`;

        const cxl = L + (W - L - R) / 2, cyl = T + (H - T - B) / 2;
        wrap.style.transformOrigin = `${cxl}px ${cyl}px`;

        const p0x = first.left + W / 2, p0y = first.top + H / 2;
        const p1x = last.left + last.width / 2, p1y = last.top + last.height / 2;
        const dx = p1x - p0x, dy = p1y - p0y, len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len, ny = dx / len;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const qx = (p0x + p1x) / 2 + nx * len * CFG.arc;
        const qy = (p0y + p1y) / 2 + ny * len * CFG.arc;
        const u = 1 - eP;
        const px = u * u * p0x + 2 * u * eP * qx + eP * eP * p1x;
        const py = u * u * p0y + 2 * u * eP * qy + eP * eP * p1y - 8 * pulse;   // se eleva al tomar impulso

        const tilt = (dx < 0 ? -1 : 1) * CFG.tilt * v * (1 - f * 0.5);
        wrap.style.transform =
          `translate(${px - (first.left + cxl)}px, ${py - (first.top + cyl)}px) ` +
          `rotate(${tilt.toFixed(2)}deg) scale(${sx}, ${sy})`;

        if (withFx) {
          wrap.style.filter = v < 0.01 ? 'none' :
            `blur(${(1.2 * v).toFixed(2)}px) drop-shadow(0 ${(16 * v).toFixed(1)}px ${(28 * v).toFixed(1)}px rgba(0,0,0,${(0.5 * v).toFixed(2)})) ` +
            `drop-shadow(0 0 ${(18 * v).toFixed(1)}px rgba(${CFG.accent},${(0.4 * v).toFixed(2)}))`;
        }
      };

      let revealed = false;
      const frame = (t) => {
        const r = target.getBoundingClientRect();
        if (r.width && r.height) lastRect = r;

        place(main.w, main.c, t, true);

        // estela: copias que siguen la trayectoria con retraso
        ghosts.forEach((g) => {
          const tt = Math.max(0, t - g.k * 0.045);
          place(g.w, g.c, tt, false);
          const fade = clamp((t - 0.14) / 0.1) * (1 - clamp((t - 0.78) / 0.12));
          g.w.style.opacity = (fade * 0.2 / g.k).toFixed(3);
        });

        // fundido cruzado: el icono real aparece mientras el clon se desvanece
        if (t >= 0.9) {
          if (!revealed) {
            revealed = true;
            target.classList.remove(HIDE);
            target.animate([{ opacity: 0 }, { opacity: 1 }],
              { duration: Math.max(60, CFG.duration * 0.1), easing: 'linear' });
          }
          main.w.style.opacity = String(1 - clamp((t - 0.9) / 0.1));
        }
      };

      frame(0);
      await new Promise((res) => {
        const t0 = performance.now();
        const tick = (now) => {
          const t = clamp((now - t0) / CFG.duration);
          frame(t);
          t < 1 ? requestAnimationFrame(tick) : res();
        };
        requestAnimationFrame(tick);
      });

      // ---------- Aterrizaje: rebote del icono + onda naranja independiente ----------
      target.classList.remove(HIDE);
      target.animate(
        [{ transform: 'scale(0.9)' }, { transform: 'scale(1.12)', offset: 0.5 }, { transform: 'scale(1)' }],
        { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      );
      const lr = target.getBoundingClientRect();
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed', left: lr.left + 'px', top: lr.top + 'px',
        width: lr.width + 'px', height: lr.height + 'px',
        borderRadius: getComputedStyle(target).borderTopLeftRadius || '50%',
        border: `2px solid rgba(${CFG.accent}, 0.8)`, boxSizing: 'border-box',
        pointerEvents: 'none', zIndex: '9999'
      });
      document.body.appendChild(ring);
      ring.animate(
        [{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(2.2)', opacity: 0 }],
        { duration: 650, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
      ).finished.catch(() => {}).then(() => ring.remove());

      main.w.remove();
      ghosts.forEach((g) => g.w.remove());
      avatar.style.visibility = '';
      if (bubbleAnim) bubbleAnim.cancel();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
