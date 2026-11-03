const preguntas = [
    "Hola Catalina, ¿cómo estás?",
    "¿Qué es el Career Coaching?",
    "¿Cuándo es la feria?",
    "Estoy muy nervioso por mi primera entrevista, ¿me das un consejo?",
    "¿Quién es el presidente de Bolivia?" // Pregunta trampa para probar el fallback
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function testBot() {
    console.log("🤖 Iniciando pruebas de Catalina...\n");
    
    for (let i = 0; i < preguntas.length; i++) {
        const pregunta = preguntas[i];
        console.log(`\n👤 Usuario: ${pregunta}`);
        
        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: pregunta })
            });
            
            const data = await response.json();
            
            if (data.response) {
                console.log(`\x1b[36m🤖 Catalina:\x1b[0m ${data.response}`);
            } else {
                console.log(`❌ Error API: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            console.log(`❌ Error de conexión: Asegúrate de que el servidor esté corriendo (npm start).`);
            break;
        }
        
        // Pausa de 2 segundos entre preguntas
        await delay(2000);
    }
    console.log("\n✅ Pruebas finalizadas.\n");
}

testBot();
