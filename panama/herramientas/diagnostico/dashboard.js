(function () {
  var loader = document.getElementById('loader');
  var content = document.getElementById('content');
  var kpiGrid = document.getElementById('kpiGrid');
  var entityTableBody = document.getElementById('entityTableBody');
  var indicatorSummaryBody = document.getElementById('indicatorSummaryBody');
  var filterProvincia = document.getElementById('filterProvincia');
  var filterSemaforo = document.getElementById('filterSemaforo');
  var filterBusqueda = document.getElementById('filterBusqueda');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');

  var allRows = [];

  modalClose.addEventListener('click', function () { modalOverlay.classList.remove('is-open'); });
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  function badgeClass(semaforo) { return 'badge-' + String(semaforo || '').toLowerCase(); }

  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  function pctAplicado(row) {
    var total = row.estrategias.length;
    var aplica = row.estrategias.filter(function (e) { return e.estado === 'Aplica'; }).length;
    return total ? Math.round(aplica / total * 100) : 0;
  }

  function renderKpis(rows) {
    var total = rows.length;
    var verdes = rows.filter(function (r) { return r.semaforo === 'Verde'; }).length;
    var amarillos = rows.filter(function (r) { return r.semaforo === 'Amarillo'; }).length;
    var rojos = rows.filter(function (r) { return r.semaforo === 'Rojo'; }).length;
    function pct(n) { return total ? Math.round(n / total * 100) : 0; }

    kpiGrid.innerHTML =
      '<div class="kpi-card"><div class="num">' + total + '</div><div class="label">Respuestas registradas</div></div>' +
      '<div class="kpi-card tone-verde"><div class="num">' + pct(verdes) + '%</div><div class="label">' + verdes + ' instituciones en Verde</div></div>' +
      '<div class="kpi-card tone-amarillo"><div class="num">' + pct(amarillos) + '%</div><div class="label">' + amarillos + ' instituciones en Amarillo</div></div>' +
      '<div class="kpi-card tone-rojo"><div class="num">' + pct(rojos) + '%</div><div class="label">' + rojos + ' instituciones en Rojo</div></div>';
  }

  function populateFiltros(rows) {
    var provincias = Array.from(new Set(rows.map(function (r) { return r.provincia; }).filter(Boolean))).sort();
    var current = filterProvincia.value;
    filterProvincia.innerHTML = '<option value="">Todas las provincias</option>' +
      provincias.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join('');
    filterProvincia.value = current;
  }

  function aplicarFiltros(rows) {
    var provincia = filterProvincia.value;
    var semaforo = filterSemaforo.value;
    var busqueda = filterBusqueda.value.trim().toLowerCase();
    return rows.filter(function (r) {
      if (provincia && r.provincia !== provincia) return false;
      if (semaforo && r.semaforo !== semaforo) return false;
      if (busqueda && r.institucion.toLowerCase().indexOf(busqueda) === -1) return false;
      return true;
    });
  }

  function ordenarPorUbicacion(rows) {
    return rows.slice().sort(function (a, b) {
      return (a.provincia || '').localeCompare(b.provincia || '') ||
        (a.institucion || '').localeCompare(b.institucion || '');
    });
  }

  function renderEntities() {
    var rows = ordenarPorUbicacion(aplicarFiltros(allRows));
    entityTableBody.innerHTML = '';
    if (!rows.length) {
      entityTableBody.innerHTML = '<tr><td class="is-empty" colspan="6">No hay instituciones que coincidan con el filtro, o aún no se ha registrado ninguna respuesta.</td></tr>';
      return;
    }
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.className = 'is-clickable';
      tr.innerHTML =
        '<td>' + (row.provincia || '—') + '</td>' +
        '<td>' + row.institucion + '</td>' +
        '<td>' + (row.nombre || '—') + '</td>' +
        '<td><span class="badge ' + badgeClass(row.semaforo) + '">' + row.semaforo + '</span></td>' +
        '<td>' + pctAplicado(row) + '%</td>' +
        '<td>' + fmtDate(row.timestamp) + '</td>';
      tr.addEventListener('click', function () { openDetail(row); });
      entityTableBody.appendChild(tr);
    });
  }

  function openDetail(row) {
    var rowsHtml = row.estrategias.map(function (e) {
      var tone = e.estado === 'Aplica' ? 'badge-verde' : 'badge-rojo';
      return '<tr><td>' + e.nombre + '</td><td><span class="badge ' + tone + '">' + (e.estado || 'Sin responder') + '</span></td><td>' + (e.observacion || '—') + '</td></tr>';
    }).join('');

    modalBody.innerHTML =
      '<div class="kicker">' + (row.provincia || 'Sin provincia') + '</div>' +
      '<h2 style="margin-bottom:6px;">' + row.institucion + '</h2>' +
      '<p class="page-lede">' + (row.nombre ? 'Respondido por ' + row.nombre + ' · ' : '') + fmtDate(row.timestamp) + '</p>' +
      '<p><span class="badge ' + badgeClass(row.semaforo) + '">' + row.semaforo + '</span></p>' +
      '<table class="data-table"><thead><tr><th>Indicador</th><th>Estado</th><th>Observación</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>';
    modalOverlay.classList.add('is-open');
  }

  function renderIndicatorSummary(rows, indicadores) {
    indicatorSummaryBody.innerHTML = '';
    indicadores.forEach(function (ind) {
      var respondidas = 0, aplica = 0;
      rows.forEach(function (row) {
        var found = row.estrategias.find(function (e) { return e.id === ind.id; });
        if (found && found.estado) {
          respondidas++;
          if (found.estado === 'Aplica') aplica++;
        }
      });
      var pct = respondidas ? Math.round(aplica / respondidas * 100) : 0;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + ind.nombre + '</td><td>' + pct + '%</td><td>' + respondidas + '</td>';
      indicatorSummaryBody.appendChild(tr);
    });
  }

  function cargar() {
    fetch(GAS_URL + '?action=getRespuestas')
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error);
        allRows = json.data.rows || [];
        var indicadores = json.data.indicadores && json.data.indicadores.length ? json.data.indicadores : INDICADORES_LOCAL;

        renderKpis(allRows);
        populateFiltros(allRows);
        renderEntities();
        renderIndicatorSummary(allRows, indicadores);

        loader.style.display = 'none';
        content.style.display = 'block';
      })
      .catch(function (err) {
        loader.textContent = 'No se pudo cargar el panel: ' + err.message;
      });
  }

  [filterProvincia, filterSemaforo].forEach(function (el) { el.addEventListener('change', renderEntities); });
  filterBusqueda.addEventListener('input', renderEntities);

  cargar();
})();
