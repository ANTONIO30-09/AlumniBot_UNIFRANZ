# 🤖 AlumniBot_UNIFRANZ

> **🚀 Demo en vivo:** [https://alumnibot-unifranz.onrender.com/](https://alumnibot-unifranz.onrender.com/)

Asistente virtual interactivo con avatar y voz para la Red Alumni y la Feria de Empleabilidad de UNIFRANZ Cochabamba. Desarrollado como Challenge académico.

## 📖 Descripción

AlumniBot atiende por texto o voz a estudiantes, graduados y empresas durante la Feria de Empleabilidad. Responde sobre la Red Alumni, vacantes, prácticas y pasantías, Career Coaching, ferias, networking, beneficios y emprendimientos. Solo responde con información de su base de conocimiento: si el dato no está, lo dice y deriva a la Coordinación de Empleabilidad, sin inventar.

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express 5 |
| Frontend | HTML, CSS y JavaScript vanilla |
| Conocimiento (RAG) | `knowledge/chunks.json` + MiniSearch, indexado en memoria al arrancar |
| LLM | Groq API: `openai/gpt-oss-120b` (principal) y `openai/gpt-oss-20b` (respaldo) |
| Voz | Grabación de audio + transcripción con Groq Whisper (`whisper-large-v3-turbo`) |
| Avatar | Imagen con animación FLIP: el avatar vuela hasta el icono del primer mensaje del chat |
| Despliegue | Render (`render.yaml`) |

## 🚀 Ejecución local

    git clone https://github.com/ANTONIO30-09/AlumniBot_UNIFRANZ.git
    cd AlumniBot_UNIFRANZ
    npm install
    cp .env.example .env      # agrega tu GROQ_API_KEY
    npm start                 # http://localhost:3000

Se recomienda Chrome o Edge para la grabación de voz. Node.js 20 o superior (probado en Node 22).

## ⚙️ Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `GROQ_API_KEY` | (obligatoria) | Clave de la API de Groq |
| `NODE_ENV` | | `production` en Render |
| `LLM_MODEL` | `openai/gpt-oss-120b` | Modelo principal |
| `LLM_FALLBACK_MODEL` | `openai/gpt-oss-20b` | Modelo de respaldo si el principal está saturado |
| `LLM_TIMEOUT_MS` | `20000` | Timeout de cada llamada a Groq |
| `LLM_CONCURRENCY` | `4` | Llamadas simultáneas a Groq |
| `LLM_MAX_QUEUE` | `40` | Peticiones en espera antes de responder "ocupado" |
| `CACHE_TTL_MIN` | `20` | Minutos de vida de la caché de respuestas |
| `RATE_LIMIT_PER_MIN` | `120` | Peticiones por minuto y por IP en `/api/` |
| `TRUST_PROXY` | `1` | Saltos de proxy (Render). Usa `2` si `/health` muestra una IP de Render o Cloudflare |

## 🔌 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chat` | Body `{ "message": "..." }` (máx. 500 caracteres). Responde `{ "response": "..." }` |
| `POST` | `/api/transcribe` | Audio en `multipart/form-data` (campo `audio`, máx. 5 MB). Responde `{ "text": "..." }` |
| `GET` | `/health` | Estado del servicio: uptime, IP vista por el servidor, cola, caché y bloqueo del modelo principal |

## 🏗️ Arquitectura del backend

- **Caché LRU con TTL** (500 entradas, 20 min). La clave se normaliza: minúsculas, sin tildes ni signos. Solo se cachean respuestas reales del modelo, nunca mensajes de error.
- **Deduplicación**: si llegan varias preguntas idénticas a la vez, se hace una sola llamada a Groq.
- **Cola de concurrencia** (4 simultáneas, 40 en espera). Si se llena, responde un mensaje amable de "ocupado" y no se cuelga.
- **Fallback de modelo**: ante un 429 del modelo principal, se bloquea unos segundos y se usa el de respaldo.
- **Timeout de 20 s** en el chat y de 25 s en Whisper. En el chat, `maxRetries: 0` para controlar los reintentos.
- **Retriever** (`server/services/retriever.js`): sin tildes, sin palabras vacías, el título y el tema pesan el doble, prefijo solo en palabras de 4 o más letras y tolerancia a erratas solo en palabras de 5 o más.
- **Rate limit** de 120/min por IP. En una feria muchos visitantes comparten IP (mismo WiFi), por eso no es más bajo. `trust proxy` activado para Render.
- **Robustez**: errores siempre en JSON, `/health` antes del rate limit, cierre limpio con SIGTERM/SIGINT, y error explícito si el puerto está ocupado.

## 🧪 Pruebas y resultados

### Tests automáticos

    npm test      # node:test (runner nativo de Node)

9 tests, 9 aprobados. Cubren `getContext()` (resultados relevantes, entradas raras, velocidad: 100 búsquedas en menos de 1.5 s), `POST /api/chat` (200 con JSON válido; mensaje vacío, JSON roto, tipo no string y más de 500 caracteres devuelven 4xx) y `GET /health`. El test que llama al LLM real se omite si no hay `GROQ_API_KEY` ni `.env`.

### Prueba de estrés

    npm start &
    N=30 UNIQUE=1 npm run stress                                      # sin caché: peor caso hacia Groq
    URL=https://alumnibot-unifranz.onrender.com N=20 npm run stress   # contra producción

El script clasifica cada respuesta como `real`, `sin_info`, `degradada` (200 pero sin LLM), 4xx, `TIMEOUT` o `ERR`, porque un 200 no siempre significa que el LLM respondió.

| Escenario | Antes del refuerzo | Después |
|---|---|---|
| 1 petición sola | 1.5 s | 0.7 a 1.5 s |
| 10 simultáneas | 10 × 200 (una medición dio 6.2 s cada una) | 1.3 a 1.8 s en total, p95 1.6 s |
| 30 simultáneas, sin caché | Groq devolvía 429 en casi todas (mensaje "muchas preguntas" con HTTP 200) | 30 de 30 respondidas, ninguna degradada, 5.7 s en total, p50 3.4 s, p95 5.4 s |
| 30 simultáneas, preguntas cubiertas por la base | | 25 `real` y 5 `sin_info` (una sola pregunta sin dato: fecha de la feria) |
| 60 simultáneas desde una IP | 429 de Express (límite anterior de 30/min) | Límite subido a 120/min |

Hallazgos de las pruebas:

- **El cuello de botella es el límite de tokens de Groq**, no el servidor. En el plan on-demand: 8000 tokens por minuto para toda la organización, y cada pregunta consume unos 700. Se mitiga con caché, cola, `reasoning_effort: low` y modelo de respaldo, pero el límite sigue existiendo. Para el día de la feria conviene revisar los límites de la cuenta y valorar Dev Tier.
- **El servidor atiende en paralelo**: 10 peticiones simultáneas tardaron lo mismo que una sola.
- **Una versión anterior devolvía 200 con un mensaje de error** cuando Groq fallaba. El script de estrés ahora lo detecta como `degradada`.

### Calidad de la búsqueda (RAG)

`node scripts/probar-rag.js` muestra qué fragmentos recupera cada pregunta. Mejoras del retriever nuevo:

| Pregunta | Antes | Después |
|---|---|---|
| "como encuentro vacantes" | "Encuentros y bienvenida" primero (error por prefijo) | Vacantes primero |
| "¿Qué es Career Coaching?" | Coaching + 2 fragmentos de relleno | Solo Coaching |
| "¿Cuándo es la feria?" | Red Alumni primero | Ferias primero |
| "¿Cómo consigo una pasantía?" | Pasantía + 2 de ruido | Los 2 fragmentos correctos |

Menos ruido significa menos tokens por pregunta y menos riesgo de que el modelo se confunda.

## ⚠️ Limitaciones conocidas

- **Contenido pendiente**: no hay fragmentos sobre qué es UNIFRANZ, carreras, becas ni contacto. El bot responde "no tengo esa información" y deriva a la Coordinación de Empleabilidad.
- **Fecha y lugar de la feria**: aún no son oficiales. El fragmento `ferias_1` lo indica y deriva a las redes oficiales y al stand. Cuando se anuncien, hay que actualizarlo en `knowledge/chunks.json`.
- **Render gratuito**: el servicio se duerme tras unos 15 minutos sin tráfico y el primer acceso tarda de 30 a 60 s. Se puede evitar consultando `/health` cada 10 minutos con UptimeRobot.
- **Límite de tokens de Groq**: ver arriba.
- **Pendiente**: repetir la prueba de estrés contra el dominio de producción y verificar el campo `ip` de `/health` desde datos móviles.

## 📂 Estructura del proyecto

    server/       Backend: index.js, routes/ (chat, transcribe), services/ (llm, retriever), middleware/ (rateLimit)
    knowledge/    Base de conocimiento (chunks.json)
    public/       Frontend (HTML, CSS, JS)
    test/         Tests con node:test
    scripts/      stress-chat.js (estrés) y probar-rag.js (calidad del buscador)
    render.yaml   Configuración de despliegue en Render
    PROGRESS.md   Bitácora del proyecto

## 🌿 Flujo de ramas

Se trabaja en ramas `feat/*`, `fix/*`, `chore/*` o `docs/*` que se fusionan por Pull Request a `dev`, y de `dev` a `main`. Render despliega desde `main`.

## 👤 Autor

Antonio, estudiante de Ingeniería, UNIFRANZ.
