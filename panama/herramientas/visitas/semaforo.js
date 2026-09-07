(function () {
  var kpiGrid = document.getElementById('kpiGrid');
  var entityGrid = document.getElementById('entityGrid');
  var loader = document.getElementById('loader');
  var filterProvincia = document.getElementById('filterProvincia');
  var filterCalificacion = document.getElementById('filterCalificacion');
  var filterBusqueda = document.getElementById('filterBusqueda');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');

  var allRows = [];
  var indicadores = INDICADORES_LOCAL;

  modalClose.addEventListener('click', function () { modalOverlay.classList.remove('is-open'); });
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  function badgeClass(cal) { return 'badge-' + String(cal || '').toLowerCase(); }
  function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return String(d); }
  }

  function renderKpis(rows) {
    var total = rows.length;
    var verde = rows.filter(function (r) { return r.calificacion === 'VERDE'; }).length;
    var amarillo = rows.filter(function (r) { return r.calificacion === 'AMARILLO'; }).length;
    var rojo = rows.filter(function (r) { return r.calificacion === 'ROJO'; }).length;
    kpiGrid.innerHTML =
      '<div class="kpi-card"><div class="num">' + total + '</div><div class="label">Sedes con visita registrada</div></div>' +
      '<div class="kpi-card"><div class="num">' + verde + '</div><div class="label">En Verde</div></div>' +
      '<div class="kpi-card"><div class="num">' + amarillo + '</div><div class="label">En Amarillo</div></div>' +
      '<div class="kpi-card"><div class="num">' + rojo + '</div><div class="label">En Rojo</div></div>';
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
    var calificacion = filterCalificacion.value;
    var busqueda = filterBusqueda.value.trim().toLowerCase();
    return rows.filter(function (r) {
      if (provincia && r.provincia !== provincia) return false;
      if (calificacion && r.calificacion !== calificacion) return false;
      if (busqueda) {
        var haystack = (r.institucion + ' ' + r.sede).toLowerCase();
        if (haystack.indexOf(busqueda) === -1) return false;
      }
      return true;
    });
  }

  function renderEntities() {
    var rows = aplicarFiltros(allRows);
    entityGrid.innerHTML = '';
    if (!rows.length) {
      entityGrid.innerHTML = '<p class="page-lede">No hay sedes que coincidan con el filtro, o aún no se ha registrado ninguna visita.</p>';
      return;
    }
    rows.forEach(function (row) {
      var card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML =
        '<div class="path">' + row.provincia + ' · ' + row.institucion + '</div>' +
        '<div class="sede">' + row.sede + '</div>' +
        '<div class="meta"><span class="badge ' + badgeClass(row.calificacion) + '">' + row.calificacion + '</span> · ' + row.asesor + ' · ' + fmtDate(row.fecha_visita) + '</div>';
      card.addEventListener('click', function () { openDetail(row); });
      entityGrid.appendChild(card);
    });
  }

  function openDetail(row) {
    var grupos = { AA: [], AM: [], NA: [] };
    indicadores.forEach(function (ind) {
      var val = row.indicadores[ind.id];
      if (grupos[val]) grupos[val].push(ind.nombre);
    });

    function col(titulo, tone, items) {
      return '<div><div class="kicker" style="margin-bottom:8px;">' + titulo + '</div>' +
        (items.length ? '<ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-soft);">' +
          items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'
          : '<p class="page-lede" style="font-size:12px;">Ninguno</p>') + '</div>';
    }

    modalBody.innerHTML =
      '<div class="kicker">' + row.provincia + ' · ' + row.institucion + '</div>' +
      '<h2 style="margin-bottom:6px;">' + row.sede + '</h2>' +
      '<p class="page-lede">' + row.asesor + ' · ' + fmtDate(row.fecha_visita) + '</p>' +
      '<p><span class="badge ' + badgeClass(row.calificacion) + '">' + row.calificacion + '</span> · puntaje ' + row.puntaje + ' / 2.0</p>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0;">' +
        col('Aplicación adecuada', 'green', grupos.AA) +
        col('Con oportunidad de mejora', 'amber', grupos.AM) +
        col('No se aplica', 'red', grupos.NA) +
      '</div>' +
      (row.recomendaciones ? '<div class="card" style="margin-bottom:0;"><h3 style="font-size:14px;">Recomendaciones</h3><p style="margin:0;">' + row.recomendaciones + '</p></div>' : '');
    modalOverlay.classList.add('is-open');
  }

  function cargar() {
    fetch(GAS_URL + '?action=semaforo')
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error);
        allRows = json.data.rows || [];
        if (json.data.indicadores && json.data.indicadores.length) indicadores = json.data.indicadores;
        renderKpis(allRows);
        populateFiltros(allRows);
        renderEntities();
        loader.style.display = 'none';
      })
      .catch(function (err) {
        loader.textContent = 'No se pudo cargar el semáforo: ' + err.message;
      });
  }

  [filterProvincia, filterCalificacion].forEach(function (el) { el.addEventListener('change', renderEntities); });
  filterBusqueda.addEventListener('input', renderEntities);

  cargar();
  setInterval(cargar, REFRESH_INTERVAL_MS);
})();
