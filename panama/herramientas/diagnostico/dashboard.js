(function () {
  var loader = document.getElementById('loader');
  var content = document.getElementById('content');
  var kpiGrid = document.getElementById('kpiGrid');
  var entityGrid = document.getElementById('entityGrid');
  var indicatorSummaryBody = document.getElementById('indicatorSummaryBody');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');

  modalClose.addEventListener('click', function () { modalOverlay.classList.remove('is-open'); });
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  function badgeClass(semaforo) { return 'badge-' + String(semaforo || '').toLowerCase(); }

  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  function renderKpis(rows) {
    var total = rows.length;
    var verdes = rows.filter(function (r) { return r.semaforo === 'Verde'; }).length;
    var amarillos = rows.filter(function (r) { return r.semaforo === 'Amarillo'; }).length;
    var rojos = rows.filter(function (r) { return r.semaforo === 'Rojo'; }).length;
    function pct(n) { return total ? Math.round(n / total * 100) : 0; }

    kpiGrid.innerHTML =
      '<div class="kpi-card"><div class="num">' + total + '</div><div class="label">Respuestas registradas</div></div>' +
      '<div class="kpi-card"><div class="num">' + pct(verdes) + '%</div><div class="label">' + verdes + ' instituciones en Verde</div></div>' +
      '<div class="kpi-card"><div class="num">' + pct(amarillos) + '%</div><div class="label">' + amarillos + ' instituciones en Amarillo</div></div>' +
      '<div class="kpi-card"><div class="num">' + pct(rojos) + '%</div><div class="label">' + rojos + ' instituciones en Rojo</div></div>';
  }

  function renderEntities(rows) {
    entityGrid.innerHTML = '';
    if (!rows.length) {
      entityGrid.innerHTML = '<p class="page-lede">Aún no hay respuestas registradas. ¡Sé el primero en diligenciar el formulario!</p>';
      return;
    }
    rows.slice().reverse().forEach(function (row, idx) {
      var card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML =
        '<div class="path">' + (row.provincia || 'Sin provincia') + '</div>' +
        '<div class="sede">' + row.institucion + '</div>' +
        '<div class="meta"><span class="badge ' + badgeClass(row.semaforo) + '">' + row.semaforo + '</span> · ' + fmtDate(row.timestamp) + '</div>';
      card.addEventListener('click', function () { openDetail(row); });
      entityGrid.appendChild(card);
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
        var rows = json.data.rows || [];
        var indicadores = json.data.indicadores && json.data.indicadores.length ? json.data.indicadores : INDICADORES_LOCAL;

        renderKpis(rows);
        renderEntities(rows);
        renderIndicatorSummary(rows, indicadores);

        loader.style.display = 'none';
        content.style.display = 'block';
      })
      .catch(function (err) {
        loader.textContent = 'No se pudo cargar el panel: ' + err.message;
      });
  }

  cargar();
})();
