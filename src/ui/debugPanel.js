/**
 * Panel de controles del modo desarrollo (lado derecho). Solo existe en ese modo;
 * T lo oculta un momento para mirar la pantalla sin taparla.
 * Secciones: pieza (música), interpretación (niveles, cantidad, final), memoria, visual,
 * movimiento, flocking, flow field, rumbo, atracción, pulso, physarum.
 * Todo se ajusta en vivo; "copiar valores" deja en el portapapeles los números para
 * pegarlos en config.js.
 */
import { formatTime } from '../audio/music.js';

const C = {
  text: 'rgba(255,245,230,0.85)',
  dim: 'rgba(255,245,230,0.5)',
  line: 'rgba(255,245,230,0.12)',
  button: 'rgba(255,245,230,0.1)',
  buttonLine: 'rgba(255,245,230,0.2)',
};

export function createDebugPanel({ sim, particles, trail, post, instrument, config, music }) {
  const U = sim.U;
  const P = particles.uniforms;
  // Parámetros que viven en JS (config) y no en la GPU: se editan directamente
  const cfg = (key) => ({ get value() { return config[key]; }, set value(v) { config[key] = v; } });

  const groups = [
    ['Visual', [
      ['Brillo', P.brightness, 0.1, 2, 0.05, 'BRIGHTNESS'],
      ['Tamaño de punto (px)', P.pointPx, 1, 8, 0.1, 'POINT_PX'],
      ['Color (× nivel)', P.colorGain, 0, 3, 0.05, 'COLOR_GAIN'],
      ['Resplandor (× nivel)', post.uniforms.gain, 0, 3, 0.05, 'BLOOM_GAIN'],
      ['Resplandor: radio', post.uniforms.radius, 0, 1, 0.01, 'BLOOM_RADIUS'],
      ['Resplandor: umbral', post.uniforms.threshold, 0, 0.5, 0.005, 'BLOOM_THRESHOLD'],
      ['Huella: visibilidad', trail.uniforms.visibility, 0, 3, 0.05, 'TRAIL_VISIBILITY'],
      ['Polvo lejano: tamaño', P.depthSizeFar, 0.2, 1.5, 0.01, null],
      ['Polvo lejano: brillo', P.depthBrightFar, 0.05, 1, 0.01, null],
      ['Compensación de luz', P.lightExponent, 0, 1.2, 0.05, 'LIGHT_EXPONENT'],
      ['Compensación de tamaño', P.sizeExponent, 0, 0.5, 0.01, 'SIZE_EXPONENT'],
    ]],
    ['Movimiento', [
      ['Velocidad máxima', U.maxSpeed, 0.005, 0.12, 0.001, 'MAX_SPEED'],
      ['Fuerza máxima', U.maxForce, 0.005, 0.12, 0.001, 'MAX_FORCE'],
      ['Wander', U.wWander, 0, 1.5, 0.05, 'W_WANDER'],
    ]],
    ['Flocking (con nivel 4)', [
      ['Separación', U.wSep, 0, 3, 0.05, 'W_SEPARATION'],
      ['Alineación', U.wAli, 0, 3, 0.05, 'W_ALIGNMENT'],
      ['Cohesión', U.wCoh, 0, 3, 0.05, 'W_COHESION'],
      ['Apiñamiento (× densidad media)', U.crowdFactor, 1, 8, 0.1, 'CROWD_FACTOR'],
      ['Vecinos para actuar', U.presenceN, 0.5, 12, 0.1, 'PRESENCE_N'],
    ]],
    ['Flow field', [
      ['Peso del flow', U.wFlow, 0, 3, 0.05, 'W_FLOW'],
      ['Escala del flow', U.flowScale, 0.3, 8, 0.1, 'FLOW_SCALE'],
      ['Evolución del flow', U.flowSpeed, 0, 0.3, 0.005, 'FLOW_SPEED'],
      ['Intensidad del flow', U.flowGain, 0.05, 1.5, 0.01, 'FLOW_GAIN'],
    ]],
    ['RUMBO (mouse y rueda)', [
      ['Mouse: intensidad', U.mouseStrength, 0, 4, 0.05, 'MOUSE_STRENGTH'],
      ['Mouse: giro', U.mouseSwirl, 0, 3, 0.05, 'MOUSE_SWIRL'],
      ['Mouse: radio', U.mouseRadius, 0.03, 0.4, 0.005, 'MOUSE_RADIUS'],
      ['Mouse: decaimiento (1/s)', U.mouseDecay, 0.2, 6, 0.1, 'MOUSE_DECAY'],
      ['Mouse: peso en el flow', U.mouseWeight, 0, 4, 0.05, 'MOUSE_WEIGHT'],
      ['Rueda: deriva global', cfg('DRIFT'), 0, 1.5, 0.01, 'DRIFT'],
      ['Rueda: sensibilidad', cfg('DRIFT_WHEEL'), 0, 0.02, 0.0005, 'DRIFT_WHEEL'],
    ]],
    ['ATRACCIÓN (mantener clic)', [
      ['Radio', U.attractRadius, 0.05, 0.5, 0.005, 'ATTRACT_RADIUS'],
      ['Fuerza', U.wAttract, 0, 4, 0.05, 'W_ATTRACT'],
      ['Refuerzo de cohesión', U.attractCoh, 0, 5, 0.1, 'ATTRACT_COHESION'],
      ['Tiempo en crecer (s)', cfg('ATTRACT_RISE_S'), 0.1, 5, 0.1, 'ATTRACT_RISE_S'],
      ['Tiempo en soltar (s)', cfg('ATTRACT_RELEASE_S'), 0.1, 6, 0.1, 'ATTRACT_RELEASE_S'],
    ]],
    ['CUERPOS (4 cuerpo · 5 reunir en sistema · 6 disolver)', [
      ['Fuerza', U.wBody, 0, 4, 0.05, 'W_BODY'],
      ['Giro de la materia', U.bodySpin, 0, 2, 0.05, 'BODY_SPIN'],
      ['Refuerzo de cohesión', U.bodyCoh, 0, 5, 0.1, 'BODY_COHESION'],
      ['Radio de un cuerpo', cfg('BODY_RADIUS'), 0.05, 0.4, 0.005, 'BODY_RADIUS'],
      ['Tamaño del núcleo', U.bodyCore, 0.1, 0.9, 0.01, 'BODY_CORE'],
      ['Tiempo en formarse (s)', cfg('BODY_GROW_S'), 0.5, 8, 0.1, 'BODY_GROW_S'],
      ['Aceleración por gravedad', U.bodySpeedup, 0, 3, 0.05, 'BODY_SPEEDUP'],
      ['Disolver (6): fuerza del estallido', U.bodyBurst, 0, 12, 0.1, 'BODY_BURST'],
      ['Disolver (6): duración (s)', cfg('BODY_BURST_S'), 1, 10, 0.5, 'BODY_BURST_S'],
      ['Vida (s)', cfg('BODY_LIFE_S'), 5, 120, 1, 'BODY_LIFE_S'],
      ['Tiempo en disolverse (s)', cfg('BODY_RELEASE_S'), 1, 20, 0.5, 'BODY_RELEASE_S'],
      ['Sistema: separación', cfg('SYSTEM_RADIUS'), 0.02, 0.3, 0.005, 'SYSTEM_RADIUS'],
      ['Sistema: tiempo en reunirse (s)', cfg('SYSTEM_GATHER_S'), 1, 30, 0.5, 'SYSTEM_GATHER_S'],
      ['Sistema: radio de cada cuerpo', cfg('SYSTEM_BODY_RADIUS'), 0.04, 0.3, 0.005, 'SYSTEM_BODY_RADIUS'],
      ['Sistema: velocidad de órbita', cfg('SYSTEM_ORBIT'), 0, 0.5, 0.005, 'SYSTEM_ORBIT'],
      ['Velocidad máx. de un cuerpo', cfg('BODY_SPEED'), 0.002, 0.06, 0.001, 'BODY_SPEED'],
    ]],
    ['PULSO (barra espaciadora)', [
      ['Impulso', U.pulseForce, 0, 10, 0.1, 'PULSE_FORCE'],
      ['Desvío lateral', U.pulseDeflect, 0, 2, 0.05, 'PULSE_DEFLECT'],
      ['Ancho del frente', U.pulseWidth, 0.01, 0.2, 0.005, 'PULSE_WIDTH'],
      ['Tiempo en cruzar (s)', cfg('PULSE_CROSS_S'), 2, 15, 0.5, 'PULSE_CROSS_S'],
      ['Aceleración extra', U.pulseSpeedup, 0, 3, 0.05, 'PULSE_SPEEDUP'],
    ]],
    ['Physarum (huella)', [
      ['Peso de sensores (× nivel)', U.wSensor, 0, 3, 0.05, 'W_SENSOR'],
      ['Ángulo de sensores (rad)', U.sensorAngle, 0.1, 1.5, 0.02, 'SENSOR_ANGLE'],
      ['Distancia de sensores', U.sensorDist, 0.005, 0.1, 0.001, 'SENSOR_DIST'],
      ['Depósito (× nivel)', cfg('DEPOSIT_RATE'), 0, 4, 0.05, 'DEPOSIT_RATE'],
      ['Difusión (1/s)', cfg('TRAIL_DIFFUSE'), 0, 15, 0.1, 'TRAIL_DIFFUSE'],
    ]],
  ];

  const panel = document.createElement('div');
  panel.className = 'dev-ui';
  Object.assign(panel.style, {
    position: 'fixed', top: '10px', right: '10px', width: '280px', maxHeight: 'calc(100vh - 20px)',
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
  const row = (children, cols) => {
    const r = el('div', { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px', margin: '6px 0' });
    children.forEach((c) => r.appendChild(c));
    panel.appendChild(r);
  };
  const section = (label) => {
    panel.appendChild(el('div', {
      marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${C.line}`,
      color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase',
    }, label));
  };
  const refreshers = [];
  const slider = (label, min, max, step, read, write, format = (v) => Number(v).toFixed(3)) => {
    const r = el('label', { display: 'block', margin: '6px 0' });
    const text = el('div', {}, label);
    const val = el('span', { float: 'right' });
    text.appendChild(val);
    const input = el('input', { width: '100%' });
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    let dragging = false;
    input.addEventListener('pointerdown', () => { dragging = true; });
    input.addEventListener('pointerup', () => { dragging = false; });
    const sync = () => { if (!dragging) input.value = read(); val.textContent = format(read()); };
    input.addEventListener('input', () => { write(parseFloat(input.value)); sync(); });
    r.appendChild(text); r.appendChild(input); panel.appendChild(r);
    refreshers.push(sync);
    sync();
    return { input, sync };
  };

  panel.appendChild(el('div', { color: C.dim }, 'CONTROLES  (T oculta · M performance)'));

  // ── Pieza (música) ─────────────────────────────────────────
  section('Pieza');
  const playBtn = button('▶ música', () => { music.toggle(); }, {});
  row([playBtn, button('⟲ inicio', () => { music.seek(0); })], 2);
  slider('Posición', 0, 1, 0.001,
    () => (music.duration ? music.time / music.duration : 0),
    (v) => music.seek(v * music.duration),
    () => `${formatTime(music.time)} / ${formatTime(music.duration)}`);
  slider('Volumen', 0, 1, 0.01, () => music.audio.volume, (v) => music.setVolume(v),
    (v) => `${Math.round(v * 100)} %`);

  // ── Interpretación ─────────────────────────────────────────
  section('REVELACIÓN (R / Shift+R)');
  row([0, 1, 2, 3, 4].map((lv) => button(`nivel ${lv}`, () => instrument.goToLevel(lv), { padding: '5px 0' })), 5);
  const levelInfo = el('div', { color: C.dim, margin: '2px 0 6px' });
  panel.appendChild(levelInfo);
  slider('Transición de nivel (s)', 1, 15, 0.5, () => config.LEVEL_EASE_S * 3,
    (v) => { config.LEVEL_EASE_S = v / 3; }, (v) => `${Number(v).toFixed(1)} s`);

  section('Cantidad fija (teclas 1–3)');
  row(config.PANEL_COUNTS.map((n) =>
    button(n >= 1000 ? `${n / 1000}k` : String(n), () => instrument.setCount(n), { padding: '5px 0' })), 5);

  section('MEMORIA (↑ / ↓) y FINAL (E)');
  slider('Memoria', 0, 1, 0.005, () => instrument.state.memory,
    (v) => { instrument.state.memory = v; }, () => `${instrument.memorySeconds().toFixed(1)} s`);
  const cx = () => sim.U.world.value.x / 2;
  row([
    button('pulso', () => instrument.pulse(cx(), 0.5)),
    button('final', () => instrument.startFinal()),
  ], 2);
  row([
    button('cuerpo', () => instrument.body(cx() + (Math.random() - 0.5) * 0.6, 0.5 + (Math.random() - 0.5) * 0.5)),
    button('sistema', () => instrument.system()),
    button('disolver', () => instrument.dissolve()),
  ], 3);

  // ── Parámetros ─────────────────────────────────────────────
  const bound = [];
  for (const [title, items] of groups) {
    section(title);
    for (const [label, node, min, max, step, key] of items) {
      slider(label, min, max, step, () => node.value, (v) => { node.value = v; });
      if (key) bound.push({ key, node });
    }
  }
  section('Percepción');
  slider('Radio de percepción', 0.02, 0.15, 0.002, () => U.percep.value, (v) => sim.setPerception(v));

  // ── Copiar valores ─────────────────────────────────────────
  const copy = button('copiar valores', async () => {
    const out = { ...config };
    for (const b of bound) out[b.key] = Number(Number(b.node.value).toFixed(4));
    out.PERCEPTION_RADIUS = Number(U.percep.value.toFixed(4));
    out.DEPTH_SIZE = [Number(P.depthSizeFar.value.toFixed(3)), config.DEPTH_SIZE[1]];
    out.DEPTH_BRIGHT = [Number(P.depthBrightFar.value.toFixed(3)), config.DEPTH_BRIGHT[1]];
    const text = JSON.stringify(out, null, 2);
    try { await navigator.clipboard.writeText(text); copy.textContent = 'copiado ✓'; }
    catch (_) { console.log(text); copy.textContent = 'ver consola'; }
    setTimeout(() => { copy.textContent = 'copiar valores'; }, 1500);
  }, { width: '100%', marginTop: '12px' });
  panel.appendChild(copy);

  // ── Teclas ─────────────────────────────────────────────────
  section('Teclas');
  panel.appendChild(el('div', { color: C.dim, whiteSpace: 'pre', lineHeight: '1.5' }, [
    'mouse     RUMBO local',
    'rueda     RUMBO global',
    'clic      ATRACCIÓN (mantener)',
    '↑ / ↓     MEMORIA',
    'espacio   PULSO',
    'R / ⇧R    REVELACIÓN',
    'E         FINAL',
    '4 / 5 / 6 cuerpo / reunir en sistema / disolver',
    'F pantalla completa · P pausa',
    'M modo · T panel · D fps · 1–3 cantidad',
  ].join('\n')));

  document.body.appendChild(panel);

  // Refresco periódico de valores que cambian solos (música, nivel, memoria)
  setInterval(() => {
    if (panel.style.display === 'none') return;
    playBtn.textContent = !music.available ? 'sin música' : music.playing ? '❚❚ música' : '▶ música';
    const s = instrument.state;
    levelInfo.textContent = `nivel ${instrument.level.toFixed(2)} → ${instrument.levelTarget}`
      + `${s.countOverride ? ` · cantidad fija ${s.countOverride.toLocaleString('es')}` : ''}`;
    refreshers.forEach((f) => f());
  }, 250);

  return {
    get visible() { return panel.style.display !== 'none'; },
    setVisible(v) { panel.style.display = v ? 'block' : 'none'; },
    toggle() { this.setVisible(!this.visible); },
  };
}
