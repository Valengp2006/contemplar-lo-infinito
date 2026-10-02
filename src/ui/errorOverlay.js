/**
 * Muestra en pantalla el PRIMER error (los siguientes suelen ser consecuencia de él)
 * para poder diagnosticar sin abrir la consola. El texto se puede seleccionar y copiar.
 */
let shown = false;
let onFirstError = null;

export function setOnFirstError(fn) {
  onFirstError = fn;
}

export function showError(title, detail) {
  if (shown) return;
  shown = true;
  if (onFirstError) {
    try { onFirstError(); } catch (_) { /* nada */ }
  }
  const box = document.createElement('div');
  box.id = 'error-overlay';
  Object.assign(box.style, {
    position: 'fixed', left: '16px', right: '16px', bottom: '16px', maxHeight: '55vh',
    overflow: 'auto', background: 'rgba(24,4,8,0.94)', color: '#ffb4b4',
    padding: '14px 16px', font: '12px/1.45 ui-monospace, Menlo, monospace',
    border: '1px solid rgba(255,120,120,0.35)', borderRadius: '6px',
    zIndex: '99999', whiteSpace: 'pre-wrap', userSelect: 'text', pointerEvents: 'auto',
  });
  box.textContent = `${title}\n\n${detail}\n\n(Copia este texto completo y envíalo.)`;
  document.body.appendChild(box);
  console.error(title, detail);
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', (e) => {
    showError('Error de JavaScript', `${e.message}\n${e.filename || ''}:${e.lineno || ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    showError('Promesa rechazada', (r && (r.stack || r.message)) || String(r));
  });
}
