const { getContext } = require('../server/services/retriever');
const Q = ['¿Qué es Unifranz?', '¿Qué carreras hay?', '¿Hay becas?', '¿Qué es la Red Alumni?',
  '¿Cómo consigo una pasantía?', 'que practicas hay', 'como encuentro vacantes', '¿Qué es Career Coaching?',
  '¿Hay descuentos o convenios?', '¿Cuándo es la feria?', 'emprendimientos alumni', '¿Puedo encontrar trabajo?'];
for (const q of Q) {
  const ctx = getContext(q);
  const titles = [...ctx.matchAll(/^\[[^\]]+\] ([^:]+):/gm)].map((m) => m[1].slice(0, 42));
  console.log(q.padEnd(34), '→', titles.length ? titles.join(' | ') : '(sin resultados)');
}
