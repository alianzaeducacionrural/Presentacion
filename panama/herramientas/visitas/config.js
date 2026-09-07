// URL de la Web App de Apps Script (Panamá – Visitas de Asesoría).
var GAS_URL = "https://script.google.com/macros/s/AKfycbxt3zXII_DKxjYj7Xy-QWv8XCfqi-ngbcwzBXPc1HwFURJ7BOrIrmQlO0mgfmc5RqVl6A/exec";
var REFRESH_INTERVAL_MS = 30000; // auto-actualización de los paneles

// Mismos indicadores definidos en Code.gs — respaldo local.
var INDICADORES_LOCAL = [
  { id: 'GP1', seccion: 'Gestión pedagógica', nombre: 'Planeación de clase' },
  { id: 'GP2', seccion: 'Gestión pedagógica', nombre: 'Uso de guías y material didáctico' },
  { id: 'GP3', seccion: 'Gestión pedagógica', nombre: 'Articulación con el Proyecto Educativo Institucional' },
  { id: 'GP4', seccion: 'Gestión pedagógica', nombre: 'Seguimiento a compromisos de la visita anterior' },
  { id: 'AP5', seccion: 'Ambiente y participación', nombre: 'Ambiente de aula' },
  { id: 'AP6', seccion: 'Ambiente y participación', nombre: 'Participación estudiantil' },
  { id: 'AP7', seccion: 'Ambiente y participación', nombre: 'Uso de evidencia en la práctica docente' }
];
