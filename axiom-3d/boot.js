// Lightweight entry point. The complete studio is imported only on request.
const button = document.getElementById('activate-3d');
const status = document.getElementById('activation-status');
const panel = document.getElementById('activation-panel');
for (const option of document.querySelectorAll('.character-option')) option.disabled = true;
let loading = false;
button.addEventListener('click', async () => {
  if (loading) return;
  loading = true; button.disabled = true;
  document.getElementById('loading-indicator').hidden = false;
  button.textContent = 'Cargando el estudio…';
  status.textContent = 'Descargando el motor y el personaje elegido.';
  try {
    await import('./main.js?v=performance-3');
    panel.hidden = true;
    if (document.getElementById('scene-state').textContent !== 'VISTA ORIGINAL') {
      for (const option of document.querySelectorAll('.character-option')) option.disabled = false;
    }
  } catch {
    loading = false; button.disabled = false; button.textContent = 'Volver a intentar';
    status.textContent = 'La imagen sigue disponible. No pudimos abrir el estudio 3D.';
  }
});
