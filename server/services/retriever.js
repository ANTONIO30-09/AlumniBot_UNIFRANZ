const fs = require('fs');
const path = require('path');
const MiniSearch = require('minisearch');

// Cargar los datos desde el JSON
const dataPath = path.join(__dirname, '../../knowledge/chunks.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const documents = JSON.parse(rawData);

// Configurar MiniSearch
const miniSearch = new MiniSearch({
  fields: ['titulo', 'texto'], // Campos a indexar
  storeFields: ['titulo', 'texto', 'tema'] // Campos a devolver
});

// Indexar los documentos
miniSearch.addAll(documents);

/**
 * Busca los fragmentos más relevantes para una consulta dada.
 * @param {string} query - La pregunta del usuario.
 * @returns {string} - Los mejores fragmentos concatenados como contexto.
 */
function getContext(query) {
  const results = miniSearch.search(query, { prefix: true, fuzzy: 0.2 });
  
  // Tomar los 3 mejores resultados
  const topResults = results.slice(0, 3);
  
  if (topResults.length === 0) {
    return "No se encontró información específica en la base de conocimiento.";
  }

  return topResults.map(r => `[${r.tema}] ${r.titulo}: ${r.texto}`).join('\n\n');
}

module.exports = { getContext };
