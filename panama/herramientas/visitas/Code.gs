// ============================================================
// Panamá — Visitas de Asesoría y Acompañamiento — Apps Script
// ============================================================
// Backend de la hoja "Panamá – Visitas de Asesoría".
// Dos hojas: "Visitas" y "Compromisos".
// Desplegar como Web App (Cualquier usuario, incluso anónimo).
// ============================================================

var SHEET_VISITAS = 'Visitas';
var SHEET_COMPROMISOS = 'Compromisos';

// ── Indicadores de la visita ─────────────────────────────────
var INDICADORES = [
  { id: 'GP1', seccion: 'Gestión pedagógica', nombre: 'Planeación de clase' },
  { id: 'GP2', seccion: 'Gestión pedagógica', nombre: 'Uso de guías y material didáctico' },
  { id: 'GP3', seccion: 'Gestión pedagógica', nombre: 'Articulación con el Proyecto Educativo Institucional' },
  { id: 'GP4', seccion: 'Gestión pedagógica', nombre: 'Seguimiento a compromisos de la visita anterior' },
  { id: 'AP5', seccion: 'Ambiente y participación', nombre: 'Ambiente de aula' },
  { id: 'AP6', seccion: 'Ambiente y participación', nombre: 'Participación estudiantil' },
  { id: 'AP7', seccion: 'Ambiente y participación', nombre: 'Uso de evidencia en la práctica docente' }
];

// AA = Aplicación adecuada (2) · AM = Con oportunidad de mejora (1) · NA = No se aplica (0)
var PUNTOS_INDICADOR = { AA: 2, AM: 1, NA: 0 };

// ── Autorización inicial ─────────────────────────────────────
// Ejecutar UNA vez desde el editor (▶ Ejecutar) para conceder los
// permisos que la Web App necesita. Sin este paso, doGet/doPost
// devuelven "Authorization needed" a cualquier usuario.
function setup() {
  getVisitasSheet_();
  getCompromisosSheet_();
  return 'Listo: hojas "' + SHEET_VISITAS + '" y "' + SHEET_COMPROMISOS + '" inicializadas y permisos concedidos.';
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

// ── Encabezados y hojas ──────────────────────────────────────
function headersVisitas_() {
  var h = ['ID', 'Timestamp', 'Asesor', 'Fecha de visita', 'Provincia', 'Institución', 'Sede'];
  INDICADORES.forEach(function (ind) { h.push(ind.id); });
  h.push('Recomendaciones');
  for (var n = 1; n <= 3; n++) {
    h.push('Compromiso ' + n + ' - Descripción');
    h.push('Compromiso ' + n + ' - Responsable');
    h.push('Compromiso ' + n + ' - Fecha verificación');
  }
  return h;
}

function headersCompromisos_() {
  return [
    'ID Compromiso', 'ID Visita', 'Asesor', 'Provincia', 'Institución', 'Sede',
    'Número', 'Descripción', 'Responsable', 'Fecha verificación',
    'Estado', 'Observaciones', 'Fecha creación', 'Fecha actualización'
  ];
}

function getSheet_(name, headerFn) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    var h = headerFn();
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function getVisitasSheet_() { return getSheet_(SHEET_VISITAS, headersVisitas_); }
function getCompromisosSheet_() { return getSheet_(SHEET_COMPROMISOS, headersCompromisos_); }

// ── Semáforo ────────────────────────────────────────────────
// Promedio de los 7 indicadores (cada uno 0, 1 o 2 puntos).
function calificacionDesdePuntaje_(puntaje) {
  if (puntaje >= 1.5) return 'VERDE';
  if (puntaje >= 0.8) return 'AMARILLO';
  return 'ROJO';
}

function nuevoId_() {
  return Utilities.getUuid().slice(0, 8) + '-' + new Date().getTime();
}

// ── Rutas ───────────────────────────────────────────────────
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'getConfig') return jsonResponse({ indicadores: INDICADORES });
    if (action === 'semaforo') return handleSemaforo_();
    if (action === 'compromisos') return handleCompromisos_();
    return errorResponse('Acción no reconocida: ' + action);
  } catch (err) {
    return errorResponse(err.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'registrarVisita') return registrarVisita_(body);
    if (body.action === 'actualizarCompromiso') return actualizarCompromiso_(body);
    return errorResponse('Acción no reconocida: ' + body.action);
  } catch (err) {
    return errorResponse(err.message);
  }
}

// ── POST registrarVisita ────────────────────────────────────
function registrarVisita_(body) {
  var institucion = String(body.institucion || '').trim();
  var sede = String(body.sede || '').trim();
  if (!institucion || !sede) return errorResponse('Falta institución o sede');

  var asesor = String(body.asesor || '').trim();
  var provincia = String(body.provincia || '').trim();
  var fechaVisita = String(body.fecha_visita || '').trim();
  var indicadores = body.indicadores || {};
  var recomendaciones = String(body.recomendaciones || '').trim();
  var compromisos = body.compromisos || [];

  var id = nuevoId_();
  var timestamp = new Date();

  var row = [id, timestamp, asesor, fechaVisita, provincia, institucion, sede];
  INDICADORES.forEach(function (ind) {
    row.push(String(indicadores[ind.id] || '').trim());
  });
  row.push(recomendaciones);

  for (var n = 0; n < 3; n++) {
    var c = compromisos[n];
    if (c) {
      row.push(String(c.descripcion || '').trim());
      row.push(String(c.responsable || '').trim());
      row.push(String(c.fecha_verificacion || '').trim());
    } else {
      row.push('', '', '');
    }
  }

  getVisitasSheet_().appendRow(row);

  // Expandir compromisos a la hoja "Compromisos" (una fila por compromiso)
  var compSheet = getCompromisosSheet_();
  compromisos.forEach(function (c, idx) {
    if (!c || !String(c.descripcion || '').trim()) return;
    compSheet.appendRow([
      id + '#' + (idx + 1),
      id,
      asesor,
      provincia,
      institucion,
      sede,
      idx + 1,
      String(c.descripcion || '').trim(),
      String(c.responsable || '').trim(),
      String(c.fecha_verificacion || '').trim(),
      'Pendiente',
      '',
      timestamp,
      timestamp
    ]);
  });

  return jsonResponse({ id: id });
}

// ── POST actualizarCompromiso ───────────────────────────────
function actualizarCompromiso_(body) {
  var id = String(body.id || '').trim();
  if (!id) return errorResponse('Falta el id del compromiso');

  var sheet = getCompromisosSheet_();
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      var rowNum = i + 1;
      if (body.estado_inicial !== undefined) {
        sheet.getRange(rowNum, 11).setValue(String(body.estado_inicial || '').trim());
      }
      if (body.observaciones !== undefined) {
        sheet.getRange(rowNum, 12).setValue(String(body.observaciones || '').trim());
      }
      sheet.getRange(rowNum, 14).setValue(new Date());
      return jsonResponse({ id: id, actualizado: true });
    }
  }
  return errorResponse('Compromiso no encontrado: ' + id);
}

// ── GET semaforo ─────────────────────────────────────────────
// Una fila por sede, usando la visita más reciente si hay varias.
function handleSemaforo_() {
  var values = getVisitasSheet_().getDataRange().getValues();
  var porSede = {};

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var provincia = r[4], institucion = r[5], sede = r[6];
    var key = provincia + '||' + institucion + '||' + sede;
    var timestamp = r[1];

    if (!porSede[key] || new Date(timestamp) > new Date(porSede[key].timestamp)) {
      var indicadoresRow = {};
      var puntos = 0;
      for (var s = 0; s < INDICADORES.length; s++) {
        var val = String(r[7 + s] || '').trim().toUpperCase();
        indicadoresRow[INDICADORES[s].id] = val;
        puntos += PUNTOS_INDICADOR[val] !== undefined ? PUNTOS_INDICADOR[val] : 0;
      }
      var puntaje = puntos / INDICADORES.length;
      porSede[key] = {
        provincia: provincia,
        institucion: institucion,
        sede: sede,
        asesor: r[2],
        fecha_visita: r[3],
        timestamp: timestamp,
        puntaje: Math.round(puntaje * 100) / 100,
        calificacion: calificacionDesdePuntaje_(puntaje),
        indicadores: indicadoresRow,
        recomendaciones: r[7 + INDICADORES.length]
      };
    }
  }

  var out = [];
  for (var k in porSede) out.push(porSede[k]);
  return jsonResponse({ rows: out, indicadores: INDICADORES });
}

// ── GET compromisos ──────────────────────────────────────────
function handleCompromisos_() {
  var values = getCompromisosSheet_().getDataRange().getValues();
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var estadoInicial = String(r[10] || 'Pendiente').trim();
    var fechaVerif = r[9] ? new Date(r[9]) : null;
    var estadoCalculado;
    if (estadoInicial === 'Cumplido') {
      estadoCalculado = 'cumplido';
    } else if (fechaVerif && hoy > fechaVerif) {
      estadoCalculado = 'vencido';
    } else {
      estadoCalculado = 'pendiente';
    }
    rows.push({
      id: r[0],
      visita_id: r[1],
      asesor: r[2],
      provincia: r[3],
      institucion: r[4],
      sede: r[5],
      numero: r[6],
      descripcion: r[7],
      responsable: r[8],
      fecha_verificacion: r[9],
      estado_inicial: estadoInicial,
      estado_calculado: estadoCalculado,
      observaciones: r[11]
    });
  }
  return jsonResponse({ rows: rows });
}
