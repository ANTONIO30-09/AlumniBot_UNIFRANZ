# PROGRESS - AlumniBot_UNIFRANZ

## Estado Actual
- **Fase:** Día 3 - Finalización y Despliegue.
- **Completado:**
  - Repositorio y configuración Git.
  - Backend (Express, Groq, MiniSearch RAG, Rate Limiting).
  - Frontend (Diseño responsivo, Avatar animado, UI de grabación).
  - Integración de transcripción de voz con Groq Whisper.
  - Archivo de configuración `render.yaml` para despliegue.
- **Pendiente:**
  - Desplegar en Render y configurar la API Key en el panel web.
  - Actualizar README con el enlace final.

## Decisiones Técnicas
- **Node.js + Express:** Backend ligero.
- **Groq:** LLM (openai/gpt-oss-120b) y STT (whisper-large-v3-turbo).
- **MiniSearch:** Búsqueda local en JSON.
- **Web Audio API:** Grabación y visualización de ondas.
- **Diseño Mobile-First:** Interfaz adaptada para la feria.
