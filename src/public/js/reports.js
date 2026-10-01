const reportsList = document.querySelector('#reports-list');
const reportsStatus = document.querySelector('#reports-status');
const reportFormSection = document.querySelector('#report-form-section');
const reportForm = document.querySelector('#report-form');
const reportFormStatus = document.querySelector('#report-form-status');
const channelId = new URLSearchParams(location.search).get('channelId');

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  document.querySelector('#welcome').textContent = `Welcome, ${user.email}`;
  return true;
}

function formatReason(reason) {
  return reason.toLowerCase().split('_').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(' ');
}

function createReportItem(report) {
  const item = document.createElement('article');
  item.className = 'report-item';
  const channel = document.createElement('h3');
  channel.textContent = report.channelId?.name || 'Channel unavailable';
  const reason = document.createElement('p');
  reason.textContent = `Reason: ${formatReason(report.reason)}`;
  const description = document.createElement('p');
  description.textContent = report.description;
  const status = document.createElement('p');
  status.className = 'report-status';
  status.textContent = report.status;
  const created = document.createElement('p');
  created.className = 'report-date';
  created.textContent = new Date(report.createdAt).toLocaleString();
  item.append(channel, reason, description, status, created);

  if (report.evidenceUrls && report.evidenceUrls.length > 0) {
    // Como ahora es un arreglo, recorremos cada URL para crear un enlace por cada imagen
    report.evidenceUrls.forEach((url, index) => {
      const evidence = document.createElement('a');
      evidence.href = url;
      evidence.target = '_blank';
      evidence.rel = 'noopener';
      evidence.textContent = `View evidence image ${index + 1}`;
      evidence.style.display = 'block'; // Para que cada enlace quede en un renglón nuevo
      item.append(evidence);
    });
  }

  // --- INICIO DE BOTONES EXTRA ---
  
  // Botón para Editar (Usaremos un prompt sencillo para cambiar la descripción)
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.style.marginRight = '10px';
  editBtn.onclick = () => {
    // Le pedimos al usuario el nuevo texto
    const newDescription = prompt('Ingresa la nueva descripción:', report.description);
    if (newDescription && newDescription !== report.description) {
      // Llamamos a la función que creaste en el TODO 13
      editReport(report._id, report.reason, newDescription, report.status);
    }
  };

  // Botón para Eliminar
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => {
    // Llamamos a la función que creaste en el TODO 16
    deleteReportAction(report._id);
  };

  // Agregamos los botones a la tarjeta del reporte
  item.append(editBtn, deleteBtn);

  // --- FIN DE BOTONES EXTRA ---
  
  return item;
}

async function loadReports() {
  const response = await fetch('/api/reports');
  if (!response.ok) { reportsStatus.textContent = 'Could not load reports.'; return; }
  const { reports } = await response.json();
  reportsStatus.textContent = `${reports.length} report${reports.length === 1 ? '' : 's'}`;
  if (reports.length === 0) {
    reportsList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'You have not reported a channel yet.' }));
    return;
  }
  reportsList.replaceChildren(...reports.map(createReportItem));
}

async function submitReport(event) {
  event.preventDefault();
  const formData = new FormData();
  formData.append('channelId', channelId);
  formData.append('reason', document.querySelector('#report-reason').value);
  formData.append('description', document.querySelector('#report-description').value);
  /*
  const evidence =
    document.querySelector('#report-evidence').files[0]; */
  
  // TODO v4.5 10:
  const evidenceFiles = document.querySelector('#report-evidence').files;
  // TODO v4.5 4:
  // Completa el nombre del campo utilizado para enviar la imagen.
  // Objetivo: relacionar el archivo del formulario con upload.single().
  // Resultado esperado: Multer reconocerá la evidencia enviada por el navegador.
  /*
  if (evidence) {
    formData.append('evidence', evidence);
  }*/
  // TODO v4.5 10:
  for (const file of evidenceFiles) {
    formData.append('evidence', file);
  }

  reportFormStatus.textContent = 'Submitting report…';
  // TODO v4.5 5:
  // Completa el body de la petición utilizando el FormData construido.
  // Objetivo: enviar los campos de texto y la evidencia en una misma solicitud.
  // Resultado esperado: POST /api/reports recibirá correctamente multipart/form-data.
  const response = await fetch('/api/reports', {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    reportFormStatus.textContent = payload.error?.message || 'Could not submit the report.';
    return;
  }

  reportForm.reset();
  reportFormStatus.textContent = 'Report saved.';
  await loadReports();
}

function configureReportForm() {
  if (!channelId) return;
  reportFormSection.hidden = false;
  document.querySelector('#report-channel-id').value = channelId;
  document.querySelector('#report-channel').textContent = 'Report the selected channel.';
  reportForm.addEventListener('submit', submitReport);
}

// TODO 13: Enviar la actualización desde la View
async function editReport(reportId, reason, description, status) {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      reason,
      description,
      status
    })
  });

  if (response.ok) {
    // Recargamos la lista para ver los cambios reflejados en la pantalla
    await loadReports();
  } else {
    console.error('No se pudo actualizar el reporte');
  }
}

// TODO 16: Función para llamar al endpoint de borrado
async function deleteReportAction(reportId) {
  // Pedimos confirmación al usuario antes de borrar
  if (!confirm('Are you sure you want to delete this report?')) return;

  const response = await fetch(`/api/reports/${reportId}`, {
    method: 'DELETE'
  });

  if (response.ok) {
    // Si se borró correctamente, recargamos la lista para que desaparezca de la pantalla
    await loadReports();
  } else {
    console.error('No se pudo borrar el reporte');
  }
}

document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() { if (await loadUser()) { configureReportForm(); await loadReports(); } }
start();
