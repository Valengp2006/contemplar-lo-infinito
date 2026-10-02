/**
 * HUD mínimo de la presentación (docs/funcionalidad-completa.md §9).
 * Nada visible por defecto. Al usar un control aparece, con opacidad baja y en el borde
 * inferior, su nombre (RUMBO, ATRACCIÓN, MEMORIA, PULSO, REVELACIÓN, FINAL) y desaparece
 * tras unos segundos. MEMORIA muestra una barra delgada; REVELACIÓN, cinco puntos.
 * Sin sliders ni números.
 */
export function createHud(config) {
  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed', left: '28px', bottom: '24px', zIndex: '50', pointerEvents: 'none',
    color: 'rgba(255,245,230,0.42)', font: '11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    letterSpacing: '0.22em', opacity: '0', transition: 'opacity 1.2s ease',
  });
  const name = document.createElement('div');
  const extra = document.createElement('div');
  extra.style.marginTop = '10px';
  extra.style.height = '6px';
  root.appendChild(name);
  root.appendChild(extra);
  document.body.appendChild(root);

  // Barra de MEMORIA
  const bar = document.createElement('div');
  Object.assign(bar.style, { width: '120px', height: '1px', background: 'rgba(255,245,230,0.15)', position: 'relative' });
  const fill = document.createElement('div');
  Object.assign(fill.style, { position: 'absolute', left: '0', top: '0', height: '1px', background: 'rgba(255,245,230,0.55)' });
  bar.appendChild(fill);

  // Cinco puntos de REVELACIÓN
  const dots = document.createElement('div');
  dots.style.display = 'flex';
  dots.style.gap = '9px';
  const dotEls = Array.from({ length: 5 }, () => {
    const d = document.createElement('div');
    Object.assign(d.style, { width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,245,230,0.15)' });
    dots.appendChild(d);
    return d;
  });

  let timer = 0;
  let current = null;

  function refresh(instrument) {
    if (current === 'MEMORIA') {
      fill.style.width = `${Math.round(instrument.state.memory * 100)}%`;
    } else if (current === 'REVELACIÓN') {
      const lv = Math.round(instrument.levelTarget);
      dotEls.forEach((d, k) => { d.style.background = k === lv ? 'rgba(255,245,230,0.7)' : 'rgba(255,245,230,0.15)'; });
    }
  }

  return {
    show(control, instrument) {
      if (current !== control) {
        current = control;
        name.textContent = control;
        extra.innerHTML = '';
        if (control === 'MEMORIA') extra.appendChild(bar);
        if (control === 'REVELACIÓN') extra.appendChild(dots);
      }
      refresh(instrument);
      root.style.opacity = '1';
      clearTimeout(timer);
      timer = setTimeout(() => { root.style.opacity = '0'; }, config.HUD_SHOW_S * 1000);
    },
    // Mantiene al día la barra y los puntos mientras se ven
    update(instrument) { if (root.style.opacity === '1') refresh(instrument); },
  };
}
