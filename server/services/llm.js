const Groq = require('groq-sdk');
const { getContext } = require('./retriever');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `
Eres "AlumniBot", el asistente virtual oficial de la Red Alumni de UNIFRANZ Cochabamba.
Tu objetivo es ayudar a estudiantes, graduados y empresas durante la Feria de Empleabilidad.

REGLAS ESTRICTAS:
1. Responde SIEMPRE en español, de forma amable, breve y profesional.
2. Usa ÚNICAMENTE la información proporcionada en el CONTEXTO para responder. No inventes información.
3. Si la respuesta no está en el contexto, di: "Lo siento, no tengo esa información en este momento. Te sugiero contactar directamente con la Coordinación de Empleabilidad o acercarte a uno de los stands de la feria."
4. NUNCA garantices un empleo o contrato. Aclara que la selección depende de las empresas.
5. Si te preguntan por trámites específicos, deriva a la Coordinación de Empleabilidad.
`;

async function generateResponse(userMessage) {
  try {
    const context = getContext(userMessage);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `CONTEXTO OFICIAL:\n${context}` },
        { role: 'user', content: userMessage }
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      max_tokens: 250,
    });

    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error detallado en Groq:', error.message);
    
    // Manejo específico de errores comunes
    if (error.status === 429) {
      return 'El asistente está recibiendo muchas preguntas en este momento. Por favor, intenta de nuevo en unos segundos.';
    }
    if (error.status === 401) {
      return 'Error de configuración: La clave de API no es válida. Contacta al administrador.';
    }
    return 'Lo siento, estoy teniendo problemas técnicos. Por favor, intenta de nuevo en un momento.';
  }
}

module.exports = { generateResponse };
