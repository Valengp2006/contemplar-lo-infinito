/**
 * Panel técnico de desarrollo. Oculto por defecto; se alterna con la tecla T.
 * Sirve para calibrar mirando la pantalla; "copiar valores" deja en el portapapeles
 * los números para pegarlos en config.js. Nunca aparece solo.
 */
export function createDebugPanel(sim, particles, config) {
  const U = sim.U;
  const P = particles.uniforms;

  const items = [
    ['Tamaño de punto (px)', P.pointPx, 1, 8, 0.1, 'POINT_PX'],
    ['Brillo', P.brightness, 0.1, 2, 0.05, 'BRIGHTNESS'],
    ['Velocidad máxima', U.maxSpeed, 0.005, 0.12, 0.001, 'MAX_SPEED'],
    ['Fuerza máxima', U.maxForce, 0.005, 0.12, 0.001, 'MAX_FORCE'],
    ['Separación', U.wSep, 0, 3, 0.05, 'W_SEPARATION'],
    ['Alineación', U.wAli, 0, 3, 0.05, 'W_ALIGNMENT'],
    ['Cohesión', U.wCoh, 0, 3, 0.05, 'W_COHESION'],
    ['Límite de apiñamiento', U.crowd, 5, 150, 1, 'CROWD_LIMIT'],
    ['Vecinos para actuar', U.presenceN, 0.5, 12, 0.1, 'PRESENCE_N'],
    ['Wander', U.wWander, 0, 1.5, 0.05, 'W_WANDER'],
    ['Peso del flow', U.wFlow, 0, 3, 0.05, 'W_FLOW'],
    ['Escala del flow', U.flowScale, 0.5, 8, 0.1, 'FLOW_SCALE'],
    ['Evolución del flow', U.flowSpeed, 0, 0.3, 0.005, 'FLOW_SPEED'],
    ['Intensidad del flow', U.flowGain, 0.05, 1.5, 0.01, 'FLOW_GAIN'],
    ['Mouse: intensidad', U.mouseStrength, 0, 4, 0.05, 'MOUSE_STRENGTH'],
    ['Mouse: giro', U.mouseSwirl, 0, 3, 0.05, 'MOUSE_SWIRL'],
    ['Mouse: radio', U.mouseRadius, 0.03, 0.4, 0.005, 'MOUSE_RADIUS'],
    ['Mouse: decaimiento (1/s)', U.mouseDecay, 0.2, 6, 0.1, 'MOUSE_DECAY'],
    ['Mouse: peso en el flow', U.mouseWeight, 0, 4, 0.05, 'MOUSE_WEIGHT'],
  ];

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', top: '10px', right: '10px', width: '260px', maxHeight: '92vh',
    overflow: 'auto', background: 'rgba(8,10,18,0.88)', color: 'rgba(255,245,230,0.85)',
    font: '11px/1.3 ui-monospace, Menlo, monospace', padding: '10px 12px', borderRadius: '6px',
    zIndex: '9000', display: 'none', border: '1px solid rgba(255,245,230,0.12)',
  });

  const title = document.createElement('div');
  title.textContent = 'AJUSTE (T para ocultar)';
  title.style.marginBottom = '8px';
  title.style.opacity = '0.6';
  panel.appendChild(title);

  const refreshers = [];

  const addRow = (label, node, min, max, step, key) => {
    const row = document.createElement('label');
    row.style.display = 'block';
    row.style.margin = '6px 0';
    const text = document.createElement('div');
    const val = document.createElement('span');
    val.style.float = 'right';
    text.textContent = label;
    text.appendChild(val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    input.style.width = '100%';
    const read = () => node.value;
    const sync = () => { input.value = read(); val.textContent = Number(read()).toFixed(3); };
    input.addEventListener('input', () => { node.value = parseFloat(input.value); sync(); });
    row.appendChild(text);
    row.appendChild(input);
    panel.appendChild(row);
    refreshers.push(sync);
    sync();
    return { key, node };
  };

  const bound = items.map((it) => addRow(...it));

  // Percepción: cambia el tamaño de la rejilla, por eso usa su propio setter
  {
    const row = document.createElement('label');
    row.style.display = 'block';
    row.style.margin = '6px 0';
    const text = document.createElement('div');
    const val = document.createElement('span');
    val.style.float = 'right';
    text.textContent = 'Radio de percepción';
    text.appendChild(val);
    const input = document.createElement('input');
    input.type = 'range'; input.min = 0.02; input.max = 0.15; input.step = 0.002;
    input.style.width = '100%';
    const sync = () => { input.value = U.percep.value; val.textContent = Number(U.percep.value).toFixed(3); };
    input.addEventListener('input', () => { sim.setPerception(parseFloat(input.value)); sync(); });
    row.appendChild(text); row.appendChild(input); panel.appendChild(row);
    sync();
  }

  const copy = document.createElement('button');
  copy.textContent = 'copiar valores';
  Object.assign(copy.style, {
    marginTop: '8px', width: '100%', padding: '6px', background: 'rgba(255,245,230,0.1)',
    color: 'inherit', border: '1px solid rgba(255,245,230,0.2)', borderRadius: '4px', cursor: 'pointer',
  });
  copy.addEventListener('click', async () => {
    const out = { ...config };
    for (const b of bound) out[b.key] = Number(Number(b.node.value).toFixed(4));
    out.PERCEPTION_RADIUS = Number(U.percep.value.toFixed(4));
    const text = JSON.stringify(out, null, 2);
    try { await navigator.clipboard.writeText(text); copy.textContent = 'copiado ✓'; }
    catch (_) { console.log(text); copy.textContent = 'ver consola'; }
    setTimeout(() => { copy.textContent = 'copiar valores'; }, 1500);
  });
  panel.appendChild(copy);

  document.body.appendChild(panel);

  return {
    toggle() { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; },
    refresh() { refreshers.forEach((f) => f()); },
  };
}
