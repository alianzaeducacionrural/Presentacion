(function () {
  var indicadores = INDICADORES_LOCAL;
  var list = document.getElementById('indicadoresList');
  var form = document.getElementById('formVisita');
  var alertBox = document.getElementById('alertBox');
  var btnSubmit = document.getElementById('btnSubmit');

  function renderIndicadores() {
    list.innerHTML = '';
    var lastSeccion = null;
    indicadores.forEach(function (ind) {
      if (ind.seccion !== lastSeccion) {
        var label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = ind.seccion;
        list.appendChild(label);
        lastSeccion = ind.seccion;
      }
      var row = document.createElement('div');
      row.className = 'indicator-row';
      row.innerHTML =
        '<div class="indicator-name">' + ind.id + ' — ' + ind.nombre + '</div>' +
        '<div class="indicator-controls">' +
          '<div class="toggle-group" data-indicator="' + ind.id + '">' +
            '<button type="button" class="toggle-btn tone-green" data-value="AA">AA</button>' +
            '<button type="button" class="toggle-btn tone-amber" data-value="AM">AM</button>' +
            '<button type="button" class="toggle-btn tone-red" data-value="NA">NA</button>' +
          '</div>' +
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

  function showAlert(type, msg) {
    alertBox.innerHTML = '<div class="alert alert-' + type + '">' + msg + '</div>';
  }

  function compromisoField(n, campo) {
    return document.getElementById('c' + n + campo).value.trim();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var faltantes = indicadores.filter(function (ind) { return !getIndicadorValue(ind.id); });
    if (faltantes.length) {
      showAlert('error', 'Por favor responde todos los indicadores (' + faltantes.length + ' pendiente' + (faltantes.length > 1 ? 's' : '') + ').');
      return;
    }

    if (!compromisoField(1, 'desc') || !compromisoField(1, 'resp') || !compromisoField(1, 'fecha')) {
      showAlert('error', 'El compromiso 1 es obligatorio: completa descripción, responsable y fecha de verificación.');
      return;
    }

    var indicadoresPayload = {};
    indicadores.forEach(function (ind) { indicadoresPayload[ind.id] = getIndicadorValue(ind.id); });

    var compromisos = [];
    for (var n = 1; n <= 3; n++) {
      var desc = compromisoField(n, 'desc');
      if (desc) {
        compromisos.push({
          descripcion: desc,
          responsable: compromisoField(n, 'resp'),
          fecha_verificacion: compromisoField(n, 'fecha')
        });
      }
    }

    var payload = {
      action: 'registrarVisita',
      asesor: document.getElementById('asesor').value.trim(),
      fecha_visita: document.getElementById('fechaVisita').value,
      provincia: document.getElementById('provincia').value.trim(),
      institucion: document.getElementById('institucion').value.trim(),
      sede: document.getElementById('sede').value.trim(),
      indicadores: indicadoresPayload,
      recomendaciones: document.getElementById('recomendaciones').value.trim(),
      compromisos: compromisos
    };

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
        if (!json.ok) throw new Error(json.error || 'Error al guardar la visita.');
        showAlert('success', '¡Visita registrada! Consulta el resultado en <a href="semaforo.html">Semáforo</a> o el seguimiento en <a href="compromisos.html">Compromisos</a>.');
        form.reset();
        renderIndicadores();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function (err) {
        showAlert('error', 'No se pudo enviar: ' + err.message + '. Intenta de nuevo.');
      })
      .finally(function () {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Registrar visita';
      });
  });

  renderIndicadores();
})();
