// URL de la Web App de Apps Script (Panamá – Diagnóstico Institucional).
var GAS_URL = "https://script.google.com/macros/s/AKfycbzEVShPjeWebe3W3hZXkKlzKLvJF6qr4o0Pyx9tnWN4pkjRU_NbakjiLNxvXEEzcXhIvw/exec";

// Los mismos 8 indicadores definidos en Code.gs — se usan como
// respaldo local si el GAS aún no responde (recién desplegado).
var INDICADORES_LOCAL = [
  { id: 'sistema_info',           nombre: 'Sistema de información institucional actualizado (matrícula, asistencia, desempeño)' },
  { id: 'uso_pruebas',            nombre: 'Uso de resultados de pruebas internas y externas para ajustar la enseñanza' },
  { id: 'decision_conjunta',      nombre: 'Espacios de decisión conjunta entre directivos y docentes basados en evidencia' },
  { id: 'emprendimiento',         nombre: 'Formación en emprendimiento y cultura empresarial' },
  { id: 'seguimiento_egresados',  nombre: 'Seguimiento a la trayectoria de los egresados' },
  { id: 'participacion_familias', nombre: 'Participación de familias y comunidad en la vida escolar' },
  { id: 'plan_mejoramiento',      nombre: 'Plan de mejoramiento institucional actualizado con datos' },
  { id: 'asesoria',               nombre: 'Recepción y seguimiento a visitas de asesoría pedagógica' }
];
