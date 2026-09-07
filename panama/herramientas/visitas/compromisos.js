(function () {
  var kpiGrid = document.getElementById('kpiGrid');
  var alertsBox = document.getElementById('alertsBox');
  var loader = document.getElementById('loader');
  var filterAsesor = document.getElementById('filterAsesor');
  var filterProvincia = document.getElementById('filterProvincia');
  var filterBusqueda = document.getElementById('filterBusqueda');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');

  var allRows = [];

  modalClose.addEventListener('click', function () { modalOverlay.classList.remove('is-open'); });
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  function fmtDate(d) {
    if (!d) return 'sin fecha';
    try { return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return String(d); }
  }

  function diasHasta(fecha) {
    if (!fecha) return null;
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var f = new Date(fecha); f.setHours(0, 0, 0, 0);
    return Math.round((f - hoy) / 86400000);
  }

  function renderKpis(rows) {
    var total = rows.length;
    var pendientes = rows.filter(function (r) { return r.estado_calculado === 'pendiente'; }).length;
    var cumplidos = rows.filter(function (r) { return r.estado_calculado === 'cumplido'; }).length;
    var vencidos = rows.filter(function (r) { return r.estado_calculado === 'vencido'; }).length;
    var avance = total ? Math.round(cumplidos / total * 100) : 0;

    kpiGrid.innerHTML =
      '<div class="kpi-card"><div class="num">' + pendientes + '</div><div class="label">Pendientes</div></div>' +
      '<div class="kpi-card"><div class="num">' + cumplidos + '</div><div class="label">Cumplidos</div></div>' +
      '<div class="kpi-card"><div class="num">' + vencidos + '</div><div class="label">Vencidos</div></div>' +
      '<div class="kpi-card"><div class="num">' + avance + '%</div><div class="label">Avance general</div></div>';
  }

  function renderAlerts(rows) {
    var proximos = rows.filter(function (r) {
      if (r.estado_calculado !== 'pendiente') return false;
      var d = diasHasta(r.fecha_verificacion);
      return d !== null && d >= 0 && d <= 7;
    });
    var vencidosSinAtender = rows.filter(function (r) { return r.estado_calculado === 'vencido'; });

    var html = '';
    if (vencidosSinAtender.length) {
      html += '<div class="alert alert-error">⚠ ' + vencidosSinAtender.length + ' compromiso' + (vencidosSinAtender.length > 1 ? 's' : '') + ' vencido' + (vencidosSinAtender.length > 1 ? 's' : '') + ' sin atender.</div>';
    }
    if (proximos.length) {
      html += '<div class="alert" style="background:oklch(63% 0.13 70 / 0.15);color:oklch(38% 0.1 70);border:1px solid oklch(63% 0.13 70 / 0.35);">⏳ ' + proximos.length + ' compromiso' + (proximos.length > 1 ? 's' : '') + ' próximo' + (proximos.length > 1 ? 's' : '') + ' a vencer en los próximos 7 días.</div>';
    }
    alertsBox.innerHTML = html;
  }

  function populateFiltros(rows) {
    function fill(select, values, placeholder) {
      var current = select.value;
      select.innerHTML = '<option value="">' + placeholder + '</option>' +
        values.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
      select.value = current;
    }
    fill(filterAsesor, Array.from(new Set(rows.map(function (r) { return r.asesor; }).filter(Boolean))).sort(), 'Todos los asesores');
    fill(filterProvincia, Array.from(new Set(rows.map(function (r) { return r.provincia; }).filter(Boolean))).sort(), 'Todas las provincias');
  }

  function aplicarFiltros(rows) {
    var asesor = filterAsesor.value;
    var provincia = filterProvincia.value;
    var busqueda = filterBusqueda.value.trim().toLowerCase();
    return rows.filter(function (r) {
      if (asesor && r.asesor !== asesor) return false;
      if (provincia && r.provincia !== provincia) return false;
      if (busqueda) {
        var haystack = (r.descripcion + ' ' + r.institucion + ' ' + r.sede + ' ' + r.responsable).toLowerCase();
        if (haystack.indexOf(busqueda) === -1) return false;
      }
      return true;
    });
  }

  function cardHtml(row) {
    var dias = diasHasta(row.fecha_verificacion);
    var venceTxt = row.estado_calculado === 'pendiente' && dias !== null
      ? (dias >= 0 ? ' · vence en ' + dias + ' día' + (dias === 1 ? '' : 's') : ' · vencido hace ' + Math.abs(dias) + ' día' + (Math.abs(dias) === 1 ? '' : 's'))
      : '';
    return '<div class="desc">' + row.descripcion + '</div>' +
      '<div class="meta">' + row.institucion + ' · ' + row.sede + '<br>Responsable: ' + row.responsable + '<br>Verificación: ' + fmtDate(row.fecha_verificacion) + venceTxt + '</div>';
  }

  function renderKanban() {
    var rows = aplicarFiltros(allRows);
    var cols = { pendiente: document.getElementById('colPendiente'), cumplido: document.getElementById('colCumplido'), vencido: document.getElementById('colVencido') };
    Object.keys(cols).forEach(function (k) { cols[k].innerHTML = ''; });

    var counts = { pendiente: 0, cumplido: 0, vencido: 0 };
    rows.forEach(function (row) {
      var estado = row.estado_calculado;
      if (!cols[estado]) return;
      counts[estado]++;
      var card = document.createElement('div');
      card.className = 'kanban-card';
      card.innerHTML = cardHtml(row);
      card.addEventListener('click', function () { openDetail(row); });
      cols[estado].appendChild(card);
    });

    Object.keys(cols).forEach(function (k) {
      if (!counts[k]) cols[k].innerHTML = '<div class="kanban-empty">Sin compromisos</div>';
    });

    document.getElementById('countPendiente').textContent = counts.pendiente;
    document.getElementById('countCumplido').textContent = counts.cumplido;
    document.getElementById('countVencido').textContent = counts.vencido;
  }

  function openDetail(row) {
    modalBody.innerHTML =
      '<div class="kicker">' + row.provincia + ' · ' + row.institucion + ' · ' + row.sede + '</div>' +
      '<h2 style="margin-bottom:10px;">' + row.descripcion + '</h2>' +
      '<p class="page-lede">Responsable: ' + row.responsable + ' · Verificación: ' + fmtDate(row.fecha_verificacion) + ' · Asesor: ' + row.asesor + '</p>' +
      '<div class="field"><label>Estado</label>' +
        '<div class="toggle-group" id="modalEstadoGroup">' +
          '<button type="button" class="toggle-btn" data-value="Pendiente">Pendiente</button>' +
          '<button type="button" class="toggle-btn tone-green" data-value="Cumplido">Cumplido</button>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Observaciones</label><textarea id="modalObs" rows="3">' + (row.observaciones || '') + '</textarea></div>' +
      '<button class="btn btn-small" id="modalGuardar">Guardar cambios</button>';

    var group = document.getElementById('modalEstadoGroup');
    group.querySelectorAll('.toggle-btn').forEach(function (btn) {
      if (btn.dataset.value === row.estado_inicial) btn.classList.add('is-selected');
      btn.addEventListener('click', function () {
        group.querySelectorAll('.toggle-btn').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
      });
    });

    document.getElementById('modalGuardar').addEventListener('click', function () {
      var selected = group.querySelector('.toggle-btn.is-selected');
      var nuevoEstado = selected ? selected.dataset.value : row.estado_inicial;
      var obs = document.getElementById('modalObs').value.trim();
      guardarCompromiso(row.id, nuevoEstado, obs);
    });

    modalOverlay.classList.add('is-open');
  }

  function guardarCompromiso(id, estadoInicial, observaciones) {
    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'actualizarCompromiso', id: id, estado_inicial: estadoInicial, observaciones: observaciones })
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error);
        modalOverlay.classList.remove('is-open');
        cargar();
      })
      .catch(function (err) { alert('No se pudo guardar: ' + err.message); });
  }

  function cargar() {
    fetch(GAS_URL + '?action=compromisos')
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error);
        allRows = json.data.rows || [];
        renderKpis(allRows);
        renderAlerts(allRows);
        populateFiltros(allRows);
        renderKanban();
        loader.style.display = 'none';
      })
      .catch(function (err) {
        loader.textContent = 'No se pudo cargar los compromisos: ' + err.message;
      });
  }

  [filterAsesor, filterProvincia].forEach(function (el) { el.addEventListener('change', renderKanban); });
  filterBusqueda.addEventListener('input', renderKanban);

  cargar();
  setInterval(cargar, REFRESH_INTERVAL_MS);
})();
