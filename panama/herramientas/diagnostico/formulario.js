(function () {
  var indicadores = INDICADORES_LOCAL;
  var list = document.getElementById('indicadoresList');
  var form = document.getElementById('formDiagnostico');
  var alertBox = document.getElementById('alertBox');
  var btnSubmit = document.getElementById('btnSubmit');

  function renderIndicadores() {
    list.innerHTML = '';
    indicadores.forEach(function (ind) {
      var row = document.createElement('div');
      row.className = 'indicator-row';
      row.innerHTML =
        '<div class="indicator-name">' + ind.nombre + '</div>' +
        '<div class="indicator-controls">' +
          '<div class="toggle-group" data-indicator="' + ind.id + '">' +
            '<button type="button" class="toggle-btn tone-green" data-value="Aplica">Aplica</button>' +
            '<button type="button" class="toggle-btn tone-red" data-value="No aplica">No aplica</button>' +
          '</div>' +
          '<textarea class="indicator-obs" data-indicator-obs="' + ind.id + '" placeholder="Observación (opcional)" rows="2"></textarea>' +
        '</div>';
      list.appendChild(row);
    });

    list.querySelectorAll('.toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.closest('.toggle-group');
        group.querySelectorAll('.toggle-btn').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
      });
    });
  }

  function getIndicadorValue(id) {
    var group = list.querySelector('.toggle-group[data-indicator="' + id + '"]');
    var selected = group.querySelector('.toggle-btn.is-selected');
    return selected ? selected.dataset.value : '';
  }

  function getObservacion(id) {
    var el = list.querySelector('[data-indicator-obs="' + id + '"]');
    return el ? el.value.trim() : '';
  }

  function showAlert(type, msg) {
    alertBox.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
  }

  function badgeClass(semaforo) {
    return 'badge-' + String(semaforo || '').toLowerCase();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var institucion = document.getElementById('institucion').value.trim();
    if (!institucion) { showAlert('error', 'Por favor ingresa el nombre de la institución.'); return; }

    var faltantes = indicadores.filter(function (ind) { return !getIndicadorValue(ind.id); });
    if (faltantes.length) {
      showAlert('error', 'Por favor responde todos los indicadores (' + faltantes.length + ' pendiente' + (faltantes.length > 1 ? 's' : '') + ').');
      return;
    }

    var payload = {
      institucion: institucion,
      provincia: document.getElementById('provincia').value.trim(),
      nombre: document.getElementById('nombre').value.trim(),
      indicadores: {},
      observaciones: {}
    };
    indicadores.forEach(function (ind) {
      payload.indicadores[ind.id] = getIndicadorValue(ind.id);
      payload.observaciones[ind.id] = getObservacion(ind.id);
    });

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';
    alertBox.innerHTML = '';

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error || 'Error al guardar la respuesta.');
        var semaforo = json.data.semaforo;
        showAlert('success',
          '¡Gracias! Respuesta registrada. Resultado: ' +
          '<span class="badge ' + badgeClass(semaforo) + '">' + semaforo + '</span> ' +
          '(' + json.data.porcentaje + '% de prácticas aplicadas). ' +
          '<a href="dashboard.html">Ver panel de resultados →</a>'
        );
        form.reset();
        renderIndicadores();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function (err) {
        showAlert('error', 'No se pudo enviar: ' + err.message + '. Intenta de nuevo.');
      })
      .finally(function () {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar respuesta';
      });
  });

  renderIndicadores();
})();
