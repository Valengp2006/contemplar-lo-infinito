/**
 * Panel de controles del modo desarrollo (lado derecho). Solo existe en ese modo;
 * T lo oculta un momento para mirar la pantalla sin taparla.
 * Secciones: pieza (música), agentes, movimiento, flocking, flow field, mouse.
 * "copiar valores" deja en el portapapeles los números para pegarlos en config.js.
 */
import { formatTime } from '../audio/music.js';

const C = {
  text: 'rgba(255,245,230,0.85)',
  dim: 'rgba(255,245,230,0.5)',
  line: 'rgba(255,245,230,0.12)',
  button: 'rgba(255,245,230,0.1)',
  buttonLine: 'rgba(255,245,230,0.2)',
};

export function createDebugPanel({ sim, particles, config, music, setAgents }) {
  const U = sim.U;
  const P = particles.uniforms;

  const groups = [
    ['Movimiento', [
      ['Velocidad máxima', U.maxSpeed, 0.005, 0.12, 0.001, 'MAX_SPEED'],
      ['Fuerza máxima', U.maxForce, 0.005, 0.12, 0.001, 'MAX_FORCE'],
      ['Wander', U.wWander, 0, 1.5, 0.05, 'W_WANDER'],
    ]],
    ['Flocking', [
      ['Separación', U.wSep, 0, 3, 0.05, 'W_SEPARATION'],
      ['Alineación', U.wAli, 0, 3, 0.05, 'W_ALIGNMENT'],
      ['Cohesión', U.wCoh, 0, 3, 0.05, 'W_COHESION'],
      ['Límite de apiñamiento', U.crowd, 5, 150, 1, 'CROWD_LIMIT'],
      ['Vecinos para actuar', U.presenceN, 0.5, 12, 0.1, 'PRESENCE_N'],
    ]],
    ['Flow field', [
      ['Peso del flow', U.wFlow, 0, 3, 0.05, 'W_FLOW'],
      ['Escala del flow', U.flowScale, 0.5, 8, 0.1, 'FLOW_SCALE'],
      ['Evolución del flow', U.flowSpeed, 0, 0.3, 0.005, 'FLOW_SPEED'],
      ['Intensidad del flow', U.flowGain, 0.05, 1.5, 0.01, 'FLOW_GAIN'],
    ]],
    ['Mouse (RUMBO local)', [
      ['Intensidad', U.mouseStrength, 0, 4, 0.05, 'MOUSE_STRENGTH'],
      ['Giro', U.mouseSwirl, 0, 3, 0.05, 'MOUSE_SWIRL'],
      ['Radio', U.mouseRadius, 0.03, 0.4, 0.005, 'MOUSE_RADIUS'],
      ['Decaimiento (1/s)', U.mouseDecay, 0.2, 6, 0.1, 'MOUSE_DECAY'],
      ['Peso en el flow', U.mouseWeight, 0, 4, 0.05, 'MOUSE_WEIGHT'],
    ]],
    ['Partículas', [
      ['Tamaño de punto (px)', P.pointPx, 1, 8, 0.1, 'POINT_PX'],
      ['Brillo', P.brightness, 0.1, 2, 0.05, 'BRIGHTNESS'],
    ]],
  ];

  const panel = document.createElement('div');
  panel.className = 'dev-ui';
  Object.assign(panel.style, {
    position: 'fixed', top: '10px', right: '10px', width: '270px', maxHeight: 'calc(100vh - 20px)',
    overflow: 'auto', background: 'rgba(8,10,18,0.88)', color: C.text,
    font: '11px/1.3 ui-monospace, Menlo, monospace', padding: '10px 12px', borderRadius: '6px',
    zIndex: '9000', display: 'none', border: `1px solid ${C.line}`,
  });

  const el = (tag, styles = {}, textContent = '') => {
    const e = document.createElement(tag);
    Object.assign(e.style, styles);
    if (textContent) e.textContent = textContent;
    return e;
  };
  const button = (label, onClick, extra = {}) => {
    const b = el('button', {
      padding: '5px 6px', background: C.button, color: 'inherit', font: 'inherit',
      border: `1px solid ${C.buttonLine}`, borderRadius: '4px', cursor: 'pointer', ...extra,
    }, label);
    b.addEventListener('click', onClick);
    return b;
  };
  const section = (label) => {
    panel.appendChild(el('div', {
      marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${C.line}`,
      color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase',
    }, label));
  };
  const slider = (label, min, max, step, read, write, format = (v) => Number(v).toFixed(3)) => {
    const row = el('label', { display: 'block', margin: '6px 0' });
    const text = el('div', {}, label);
    const val = el('span', { float: 'right' });
    text.appendChild(val);
    const input = el('input', { width: '100%' });
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    const sync = () => { input.value = read(); val.textContent = format(read()); };
    input.addEventListener('input', () => { write(parseFloat(input.value)); sync(); });
    row.appendChild(text); row.appendChild(input); panel.appendChild(row);
    sync();
    return { input, sync };
  };

  panel.appendChild(el('div', { color: C.dim }, 'CONTROLES  (T oculta · M performance)'));

  // ── Pieza (música) ─────────────────────────────────────────
  section('Pieza');
  const musicRow = el('div', { display: 'flex', gap: '6px', alignItems: 'center', margin: '6px 0' });
  const playBtn = button('▶ música', () => { music.toggle(); refreshMusic(); }, { flex: '1' });
  const restartBtn = button('⟲ inicio', () => { music.seek(0); refreshMusic(); }, { flex: '1' });
  musicRow.appendChild(playBtn); musicRow.appendChild(restartBtn);
  panel.appendChild(musicRow);
  let seeking = false;
  const seek = slider('Posición', 0, 1, 0.001,
    () => (music.duration ? music.time / music.duration : 0),
    (v) => music.seek(v * music.duration),
    () => `${formatTime(music.time)} / ${formatTime(music.duration)}`);
  seek.input.addEventListener('pointerdown', () => { seeking = true; });
  seek.input.addEventListener('pointerup', () => { seeking = false; });
  slider('Volumen', 0, 1, 0.01, () => music.audio.volume, (v) => music.setVolume(v),
    (v) => `${Math.round(v * 100)} %`);

  function refreshMusic() {
    if (!music.available) { playBtn.textContent = 'sin música'; playBtn.disabled = true; return; }
    playBtn.textContent = music.playing ? '❚❚ música' : '▶ música';
    if (!seeking) seek.sync();
  }
  setInterval(() => { if (panel.style.display !== 'none') refreshMusic(); }, 250);

  // ── Agentes ────────────────────────────────────────────────
  section('Agentes (teclas 1–5, cambio inmediato)');
  const presetRow = el('div', { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', margin: '6px 0' });
  for (const n of Object.values(config.AGENT_PRESETS)) {
    const label = n >= 1000 ? `${n / 1000}k` : String(n);
    presetRow.appendChild(button(label, () => setAgents(n), { padding: '5px 0' }));
  }
  panel.appendChild(presetRow);
  // La percepción cambia el tamaño de la rejilla, por eso usa su propio setter
  slider('Radio de percepción', 0.02, 0.15, 0.002, () => U.percep.value, (v) => sim.setPerception(v));

  // ── Parámetros de la simulación ────────────────────────────
  const bound = [];
  for (const [title, items] of groups) {
    section(title);
    for (const [label, node, min, max, step, key] of items) {
      slider(label, min, max, step, () => node.value, (v) => { node.value = v; });
      bound.push({ key, node });
    }
  }

  // ── Copiar valores ─────────────────────────────────────────
  const copy = button('copiar valores', async () => {
    const out = { ...config };
    for (const b of bound) out[b.key] = Number(Number(b.node.value).toFixed(4));
    out.PERCEPTION_RADIUS = Number(U.percep.value.toFixed(4));
    const text = JSON.stringify(out, null, 2);
    try { await navigator.clipboard.writeText(text); copy.textContent = 'copiado ✓'; }
    catch (_) { console.log(text); copy.textContent = 'ver consola'; }
    setTimeout(() => { copy.textContent = 'copiar valores'; }, 1500);
  }, { width: '100%', marginTop: '12px' });
  panel.appendChild(copy);

  // ── Teclas ─────────────────────────────────────────────────
  section('Teclas');
  panel.appendChild(el('div', { color: C.dim, whiteSpace: 'pre', lineHeight: '1.5' }, [
    'M  modo desarrollo / performance',
    'F  pantalla completa',
    'P  pausa (música y simulación)',
    'D  fps discreto',
    'T  ocultar este panel',
    '1–5  cantidad de agentes (solo aquí)',
  ].join('\n')));

  document.body.appendChild(panel);

  return {
    get visible() { return panel.style.display !== 'none'; },
    setVisible(v) {
      panel.style.display = v ? 'block' : 'none';
      if (v) refreshMusic();
    },
    toggle() { this.setVisible(!this.visible); },
  };
}
