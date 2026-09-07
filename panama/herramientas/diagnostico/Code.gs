// ============================================================
// Panamá — Autodiagnóstico Institucional — Google Apps Script
// ============================================================
// Backend de la hoja "Panamá – Diagnóstico Institucional".
// Desplegar como Web App (Cualquier usuario, incluso anónimo).
// ============================================================

var SHEET_NAME = 'Respuestas';

var INDICADORES = [
  { id: 'sistema_info',           nombre: 'Sistema de información institucional actualizado (matrícula, asistencia, desempeño)' },
  { id: 'uso_pruebas',            nombre: 'Uso de resultados de pruebas internas y externas para ajustar la enseñanza' },
  { id: 'decision_conjunta',      nombre: 'Espacios de decisión conjunta entre directivos y docentes basados en evidencia' },
  { id: 'emprendimiento',         nombre: 'Formación en emprendimiento y cultura empresarial' },
  { id: 'seguimiento_egresados',  nombre: 'Seguimiento a la trayectoria de los egresados' },
  { id: 'participacion_familias', nombre: 'Participación de familias y comunidad en la vida escolar' },
  { id: 'plan_mejoramiento',      nombre: 'Plan de mejoramiento institucional actualizado con datos' },
  { id: 'asesoria',               nombre: 'Recepción y seguimiento a visitas de asesoría pedagógica' }
];

// ── Autorización inicial ─────────────────────────────────────
// Ejecutar UNA vez desde el editor (▶ Ejecutar) para conceder los
// permisos que la Web App necesita. Sin este paso, doGet/doPost
// devuelven "Authorization needed" a cualquier usuario.
function setup() {
  getSheet_();
  return 'Listo: hoja "' + SHEET_NAME + '" inicializada y permisos concedidos.';
}

// ── Helpers de respuesta ───────────────────────────────────
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(msg) }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Encabezados y hoja ──────────────────────────────────────
function headers_() {
  var h = ['Timestamp', 'Institución', 'Provincia', 'Nombre'];
  INDICADORES.forEach(function (ind) {
    h.push(ind.nombre);
    h.push('Observación');
  });
  h.push('Semáforo');
  return h;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    var h = headers_();
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Semáforo ────────────────────────────────────────────────
// Solo cuentan las respuestas "Aplica" / "No aplica".
// <50% Aplica -> Rojo · 50-74% -> Amarillo · >=75% -> Verde
function semaforoDesdePct_(pct) {
  if (pct < 50) return 'Rojo';
  if (pct < 75) return 'Amarillo';
  return 'Verde';
}

// ── Rutas ───────────────────────────────────────────────────
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'getConfig') return jsonResponse({ indicadores: INDICADORES });
    if (action === 'getRespuestas') return handleGetRespuestas_();
    return errorResponse('Acción no reconocida: ' + action);
  } catch (err) {
    return errorResponse(err.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    return handleRegistrar_(body);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ── POST: registrar una respuesta ───────────────────────────
function handleRegistrar_(body) {
  var institucion = String(body.institucion || '').trim();
  if (!institucion) return errorResponse('Falta el nombre de la institución');

  var provincia = String(body.provincia || '').trim();
  var nombre = String(body.nombre || '').trim();
  var indicadores = body.indicadores || {};
  var observaciones = body.observaciones || {};

  var sheet = getSheet_();
  var row = [new Date(), institucion, provincia, nombre];
  var puntos = 0, cuenta = 0;

  INDICADORES.forEach(function (ind) {
    var estado = String(indicadores[ind.id] || '').trim();
    row.push(estado);
    row.push(String(observaciones[ind.id] || '').trim());
    if (estado === 'Aplica') { puntos++; cuenta++; }
    else if (estado === 'No aplica') { cuenta++; }
  });

  var pct = cuenta ? (puntos / cuenta) * 100 : 0;
  var semaforo = semaforoDesdePct_(pct);
  row.push(semaforo);

  sheet.appendRow(row);
  return jsonResponse({ semaforo: semaforo, porcentaje: Math.round(pct) });
}

// ── GET: todas las respuestas, para el panel ────────────────
function handleGetRespuestas_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonResponse({ rows: [], indicadores: INDICADORES });

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var estrategias = [];
    var col = 4;
    for (var s = 0; s < INDICADORES.length; s++) {
      estrategias.push({
        id: INDICADORES[s].id,
        nombre: INDICADORES[s].nombre,
        estado: r[col],
        observacion: r[col + 1]
      });
      col += 2;
    }
    rows.push({
      timestamp: r[0],
      institucion: r[1],
      provincia: r[2],
      nombre: r[3],
      estrategias: estrategias,
      semaforo: r[col]
    });
  }
  return jsonResponse({ rows: rows, indicadores: INDICADORES });
}
