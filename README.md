# 🤖 AlumniBot_UNIFRANZ

> Asistente virtual interactivo con avatar y audio para la Red Alumni y la Feria de Empleabilidad de UNIFRANZ.

## 📖 Descripción General
AlumniBot_UNIFRANZ es un chatbot conversacional por voz y texto para asistir a estudiantes, graduados y empresas durante la Feria de Empleabilidad de UNIFRANZ Cochabamba. Responde dudas sobre vacantes, prácticas, Career Coaching, ferias y beneficios.

## 🛠️ Stack Técnico
- **Backend:** Node.js 20 + Express
- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Conocimiento:** JSON + MiniSearch (RAG ligero)
- **LLM:** Groq API (Llama 3.3 70B)
- **Avatar:** SVG/CSS animado
- **Voz:** Web Speech API (STT/TTS)

## 🚀 Instalación y Ejecución Local
1. Clonar el repositorio:
   git clone https://github.com/ANTONIO30-09/AlumniBot_UNIFRANZ.git
   cd AlumniBot_UNIFRANZ
2. Instalar dependencias:
   npm install
3. Configurar variables de entorno:
   cp .env.example .env
   (Editar .env y agregar GROQ_API_KEY)
4. Iniciar el servidor:
   npm start
5. Abrir en el navegador: http://localhost:3000

> Recomendación: Usar Google Chrome o Microsoft Edge para el reconocimiento de voz.

## 📂 Estructura del Proyecto
- server/: Backend (Express)
- knowledge/: Base de conocimiento (chunks.json)
- public/: Frontend (HTML, CSS, JS)
- docs/: Documentación
- PROGRESS.md: Bitácora del proyecto

## 🗺️ Hoja de Ruta
- [x] Día 1: Configuración inicial y documentación.
- [ ] Día 2: Implementación del backend, RAG y Groq.
- [ ] Día 3: Frontend, voz, avatar y despliegue.

## 👤 Autor
Antonio - Estudiante de Ingeniería, UNIFRANZ.
