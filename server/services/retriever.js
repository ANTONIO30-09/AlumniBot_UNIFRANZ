const fs = require('fs');
const path = require('path');
const MiniSearch = require('minisearch');

// Se carga e indexa UNA sola vez al arrancar el servidor (no por petición)
const dataPath = path.join(__dirname, '../../knowledge/chunks.json');
const documents = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Sin tildes y en minúsculas: "práctica" == "practica"
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Palabras vacías: no aportan a la búsqueda y metían ruido
const STOP = new Set(['el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','u',
  'que','es','son','ser','me','mi','mis','te','tu','se','lo','le','les','con','por','para','como','cual',
  'cuales','donde','cuando','hay','puedo','quiero','si','no','su','sus','muy','mas','este','esta','esto',
  'eso','ese','hola','buenas','gracias']);

const processTerm = (term) => {
  const t = norm(term);
  return STOP.has(t) ? null : t;        // null = se descarta el término
};

const miniSearch = new MiniSearch({
  fields: ['titulo', 'texto', 'tema'],
  storeFields: ['titulo', 'texto', 'tema'],
  processTerm,
  searchOptions: {
    boost: { titulo: 2, tema: 2 },
    prefix: (t) => t.length >= 4,                 // "practic" encuentra "practicas"
    fuzzy: (t) => (t.length >= 5 ? 0.2 : false),  // tolera 1-2 erratas solo en palabras largas
  },
});
miniSearch.addAll(documents);

/**
 * Devuelve los fragmentos más relevantes para la pregunta, como texto de contexto.
 * @param {string} query
 * @returns {string}
 */
function getContext(query) {
  const results = miniSearch.search(String(query || ''));
  const top = results.slice(0, 3);
  if (top.length === 0) {
    return 'No se encontró información específica en la base de conocimiento.';
  }
  return top.map((r) => `[${r.tema}] ${r.titulo}: ${r.texto}`).join('\n\n');
}

module.exports = { getContext };
