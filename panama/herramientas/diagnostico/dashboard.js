(function () {
  var loader = document.getElementById('loader');
  var content = document.getElementById('content');
  var kpiGrid = document.getElementById('kpiGrid');
  var entityTableBody = document.getElementById('entityTableBody');
  var segBar = document.getElementById('segBar');
  var segLegend = document.getElementById('segLegend');
  var highlightGood = document.getElementById('highlightGood');
  var highlightBad = document.getElementById('highlightBad');
  var indicatorBars = document.getElementById('indicatorBars');
  var provinceList = document.getElementById('provinceList');
  var liveTag = document.getElementById('liveTag');
  var filterProvincia = document.getElementById('filterProvincia');
  var filterSemaforo = document.getElementById('filterSemaforo');
  var filterBusqueda = document.getElementById('filterBusqueda');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');

  var allRows = [];
  var lastUpdated = null;

  modalClose.addEventListener('click', function () { modalOverlay.classList.remove('is-open'); });
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  function badgeClass(semaforo) { return 'badge-' + String(semaforo || '').toLowerCase(); }

  // Mismos umbrales que semaforoDesdePct_() en Code.gs: <50 Rojo · 50-74 Amarillo · >=75 Verde
  function toneForPct(pct) {
    if (pct < 50) return 'rojo';
    if (pct < 75) return 'amarillo';
    return 'verde';
  }

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

  function calcularIndicadores(rows, indicadores) {
    return indicadores.map(function (ind) {
      var respondidas = 0, aplica = 0;
      rows.forEach(function (row) {
        var found = row.estrategias.find(function (e) { return e.id === ind.id; });
        if (found && found.estado) {
          respondidas++;
          if (found.estado === 'Aplica') aplica++;
        }
      });
      var pct = respondidas ? Math.round(aplica / respondidas * 100) : 0;
      return { id: ind.id, nombre: ind.nombre, pct: pct, respondidas: respondidas };
    });
  }

  function renderSegBar(rows) {
    var total = rows.length;
    var verdes = rows.filter(function (r) { return r.semaforo === 'Verde'; }).length;
    var amarillos = rows.filter(function (r) { return r.semaforo === 'Amarillo'; }).length;
    var rojos = rows.filter(function (r) { return r.semaforo === 'Rojo'; }).length;
    function pct(n) { return total ? (n / total * 100) : 0; }

    if (!total) {
      segBar.innerHTML = '<div class="segbar-seg" style="width:100%;background:var(--line);"></div>';
      segLegend.innerHTML = '<span class="segbar-legend-item">Aún no hay respuestas registradas.</span>';
      return;
    }

    segBar.innerHTML =
      '<div class="segbar-seg tone-verde" style="width:' + pct(verdes) + '%;"></div>' +
      '<div class="segbar-seg tone-amarillo" style="width:' + pct(amarillos) + '%;"></div>' +
      '<div class="segbar-seg tone-rojo" style="width:' + pct(rojos) + '%;"></div>';

    segLegend.innerHTML =
      '<span class="segbar-legend-item"><span class="segbar-legend-dot tone-verde"></span>Verde — <strong>' + verdes + '</strong> (' + Math.round(pct(verdes)) + '%)</span>' +
      '<span class="segbar-legend-item"><span class="segbar-legend-dot tone-amarillo"></span>Amarillo — <strong>' + amarillos + '</strong> (' + Math.round(pct(amarillos)) + '%)</span>' +
      '<span class="segbar-legend-item"><span class="segbar-legend-dot tone-rojo"></span>Rojo — <strong>' + rojos + '</strong> (' + Math.round(pct(rojos)) + '%)</span>';
  }

  function renderHighlights(calculados) {
    var respondidos = calculados.filter(function (i) { return i.respondidas > 0; });
    var buenos = respondidos.slice().sort(function (a, b) { return b.pct - a.pct; }).slice(0, 3);
    var malos = respondidos.slice().sort(function (a, b) { return a.pct - b.pct; }).slice(0, 3);

    function itemHtml(i) {
      var tone = toneForPct(i.pct);
      return '<div class="highlight-item"><div class="name">' + i.nombre + '</div><div class="pct bar-row-pct tone-' + tone + '">' + i.pct + '%</div></div>';
    }

    highlightGood.innerHTML = buenos.length
      ? buenos.map(itemHtml).join('')
      : '<p class="page-lede" style="font-size:12.5px;">Sin datos suficientes todavía.</p>';
    highlightBad.innerHTML = malos.length
      ? malos.map(itemHtml).join('')
      : '<p class="page-lede" style="font-size:12.5px;">Sin datos suficientes todavía.</p>';
  }

  function renderIndicatorBars(calculados) {
    indicatorBars.innerHTML = calculados.map(function (i) {
      var tone = toneForPct(i.pct);
      return '<div class="bar-row">' +
        '<div class="bar-row-head"><div class="bar-row-name">' + i.nombre + '</div><div class="bar-row-pct tone-' + tone + '">' + i.pct + '%</div></div>' +
        '<div class="bar-track"><div class="bar-fill tone-' + tone + '" style="width:' + i.pct + '%;"></div></div>' +
        '<div class="bar-row-meta">' + i.respondidas + ' respuesta' + (i.respondidas === 1 ? '' : 's') + '</div>' +
        '</div>';
    }).join('');
  }

  function renderProvinceList(rows) {
    var counts = {};
    rows.forEach(function (r) {
      var p = r.provincia || 'Sin provincia';
      counts[p] = (counts[p] || 0) + 1;
    });
    var entries = Object.keys(counts).map(function (p) { return { provincia: p, count: counts[p] }; })
      .sort(function (a, b) { return b.count - a.count; });

    if (!entries.length) {
      provinceList.innerHTML = '<p class="page-lede" style="font-size:12.5px;">Aún no hay respuestas registradas.</p>';
      return;
    }
    var max = entries[0].count;
    provinceList.innerHTML = entries.map(function (e) {
      var width = max ? Math.round(e.count / max * 100) : 0;
      return '<div class="province-row">' +
        '<div class="province-name">' + e.provincia + '</div>' +
        '<div class="province-track"><div class="province-fill" style="width:' + width + '%;"></div></div>' +
        '<div class="province-count">' + e.count + '</div>' +
        '</div>';
    }).join('');
  }

  function updateLiveTag() {
    if (!lastUpdated || !liveTag) return;
    var secs = Math.round((Date.now() - lastUpdated) / 1000);
    var text = secs < 5 ? 'Actualizado justo ahora'
      : secs < 60 ? 'Actualizado hace ' + secs + ' s'
      : 'Actualizado hace ' + Math.round(secs / 60) + ' min';
    liveTag.innerHTML = '<span class="live-dot"></span>' + text;
  }

  function cargar() {
    fetch(GAS_URL + '?action=getRespuestas')
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error);
        allRows = json.data.rows || [];
        var indicadores = json.data.indicadores && json.data.indicadores.length ? json.data.indicadores : INDICADORES_LOCAL;
        var calculados = calcularIndicadores(allRows, indicadores);

        renderKpis(allRows);
        renderSegBar(allRows);
        renderHighlights(calculados);
        renderIndicatorBars(calculados);
        renderProvinceList(allRows);
        populateFiltros(allRows);
        renderEntities();

        lastUpdated = Date.now();
        updateLiveTag();

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
  setInterval(cargar, REFRESH_INTERVAL_MS);
  setInterval(updateLiveTag, 1000);
})();
