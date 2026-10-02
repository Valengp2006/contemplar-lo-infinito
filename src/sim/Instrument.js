/**
 * El instrumento: traduce los controles de la intérprete en cambios del ENTORNO.
 * Ningún control mueve una partícula: aquí solo se ajustan campos, ondas, pesos y niveles,
 * y los agentes los perciben localmente en la GPU. Todo cambio es suave (exponencial).
 *
 *   REVELACIÓN  nivel 0..4 (R / Shift+R), transición de ~15 s
 *   MEMORIA     vida media de la huella (flechas ↑ / ↓), escala logarítmica
 *   ATRACCIÓN   pozo en el cursor mientras se mantiene el clic
 *   PULSO       ondas anulares (barra espaciadora), hasta 4 a la vez
 *   RUMBO       deriva global del campo (rueda); el RUMBO local del mouse vive en la simulación
 *   FINAL       descenso de ~40 s hasta un único punto de luz (E)
 *
 * No usa el DOM: el banco de pruebas (tools/gpu-check.mjs) lo maneja igual que el navegador.
 */
const LN2 = Math.log(2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const approach = (cur, target, dt, tau) => cur + (target - cur) * (1 - Math.exp(-dt / Math.max(tau, 1e-4)));
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Valor de una fila de la tabla de niveles para un nivel fraccionario
function levelValue(row, level, geometric = false) {
  const i = Math.min(row.length - 2, Math.max(0, Math.floor(level)));
  const t = clamp01(level - i);
  if (geometric) return Math.exp(Math.log(row[i]) * (1 - t) + Math.log(row[i + 1]) * t);
  return row[i] * (1 - t) + row[i + 1] * t;
}

export function createInstrument(sim, config) {
  const U = sim.U;
  const L = config.LEVELS;
  const maxLevel = L.agents.length - 1;
  const logMin = Math.log(config.MEMORY_MIN_S);
  const logMax = Math.log(config.MEMORY_MAX_S);

  const s = {
    levelTarget: 0,
    level: 0,
    countOverride: null,     // teclas 1–5 (desarrollo); R / Shift+R / E lo liberan
    alive: 0,
    drawn: 0,
    memory: (Math.log(config.MEMORY_DEFAULT_S) - logMin) / (logMax - logMin),  // 0..1
    memoryInput: 0,
    attractHeld: false,
    attractOn: 0,
    attractX: -10, attractY: -10,
    driftAngle: 0,
    driftTarget: 0,
    pulses: [],
    final: null,             // { t, fromLevel, fromMemory } mientras dura el FINAL
    ended: false,
    visuals: { brightness: L.brightness[0], color: L.color[0], bloom: L.bloom[0] },
  };

  let onControl = () => {};
  const signal = (name) => onControl(name, api);

  const memorySeconds = () => Math.exp(logMin + (logMax - logMin) * s.memory);
  const worldDiag = () => Math.hypot(U.world.value.x, 1);

  function levelCount(level) {
    return levelValue(L.agents, level, true);
  }

  function update(dt) {
    // ── FINAL: el nivel baja, la memoria se apaga y quedan cada vez menos puntos ──
    let finalCount = null;
    if (s.final) {
      s.final.t += dt;
      const p = clamp01(s.final.t / config.FINAL_S);
      s.levelTarget = 0;
      s.level = s.final.fromLevel * (1 - smoothstep(0, 0.55, p));
      s.memory = s.final.fromMemory * (1 - smoothstep(0.2, 0.6, p));
      // La población acompaña al nivel; luego quedan unos pocos puntos y al final uno solo
      const withLevel = Math.min(s.final.fromCount, levelCount(s.level));
      finalCount = Math.max(1, Math.exp(Math.log(withLevel) * (1 - smoothstep(0.55, 0.95, p))));
      if (p >= 1) { s.final = null; s.ended = true; }
    } else {
      s.level = approach(s.level, s.levelTarget, dt, config.LEVEL_EASE_S);
    }

    // ── Población: aparece y desaparece de forma escalonada ──
    const target = s.ended ? 1 : finalCount ?? s.countOverride ?? levelCount(s.level);
    s.alive = approach(s.alive, target, dt, config.COUNT_EASE_S);
    // Los que dejan de estar vivos siguen dibujándose mientras se desvanecen
    s.drawn = Math.max(s.alive, approach(s.drawn, s.alive, dt, config.FADE_S * 0.6));
    sim.setPopulation(s.alive, s.drawn + 1);

    // ── Parámetros del nivel ──
    const lv = s.level;
    U.lvlSep.value = levelValue(L.separation, lv);
    U.lvlAli.value = levelValue(L.alignment, lv);
    U.lvlCoh.value = levelValue(L.cohesion, lv);
    U.lvlSensor.value = levelValue(L.sensor, lv);
    U.speedLevel.value = levelValue(L.speed, lv);
    U.deposit.value = config.DEPOSIT_RATE * levelValue(L.deposit, lv);
    const octaves = levelValue(L.octaves, lv);
    const w = config.FLOW_OCTAVES.map((a, k) => a * clamp01(octaves - k));
    U.octA.value.set(w[0], w[1], w[2], w[3]);
    U.octB.value = w[4];

    // ── MEMORIA: vida media de la huella ──
    if (!s.final && s.memoryInput) s.memory = clamp01(s.memory + s.memoryInput * config.MEMORY_RATE * dt);
    U.trailDecay.value = Math.exp(-dt * LN2 / memorySeconds());
    U.trailDiffuse.value = 1 - Math.exp(-dt * config.TRAIL_DIFFUSE);

    // ── ATRACCIÓN: crece mientras se mantiene, se libera al soltar ──
    s.attractOn = s.attractHeld
      ? Math.min(1, s.attractOn + dt / config.ATTRACT_RISE_S)
      : Math.max(0, s.attractOn - dt / config.ATTRACT_RELEASE_S);
    U.attract.value.set(s.attractX, s.attractY);
    U.attractOn.value = smoothstep(0, 1, s.attractOn);

    // ── RUMBO global: la deriva gira suavemente hacia la nueva dirección ──
    s.driftAngle = approach(s.driftAngle, s.driftTarget, dt, config.DRIFT_EASE_S);
    U.drift.value.set(Math.cos(s.driftAngle) * config.DRIFT, Math.sin(s.driftAngle) * config.DRIFT);

    // ── PULSO: cada onda se expande y se apaga al cruzar la pantalla ──
    const speed = worldDiag() / config.PULSE_CROSS_S;
    const life = config.PULSE_CROSS_S * 1.15;
    for (const p of s.pulses) p.age += dt;
    s.pulses = s.pulses.filter((p) => p.age < life);
    const slots = [U.pulse0, U.pulse1, U.pulse2, U.pulse3];
    slots.forEach((u, k) => {
      const p = s.pulses[k];
      if (!p) { u.value.set(0, 0, 0, 0); return; }
      const amp = smoothstep(0, 0.3, p.age) * (1 - smoothstep(life * 0.6, life, p.age));
      u.value.set(p.x, p.y, p.age * speed, amp);
    });

    // ── Visual (lo usan las partículas, la huella y el resplandor) ──
    const fading = s.final ? 1 - smoothstep(0.6, 1, s.final.t / config.FINAL_S) : 1;
    s.visuals.brightness = levelValue(L.brightness, lv);
    s.visuals.color = levelValue(L.color, lv) * (s.ended ? 0 : 1);
    s.visuals.bloom = levelValue(L.bloom, lv) * fading;
  }

  const api = {
    state: s,
    update,
    memorySeconds,
    get level() { return s.level; },
    get levelTarget() { return s.levelTarget; },
    get visuals() { return s.visuals; },
    set onControl(fn) { onControl = fn; },

    // REVELACIÓN
    levelUp() {
      if (s.ended || s.final) {               // tras el FINAL, R vuelve a empezar la pieza
        s.final = null; s.ended = false; s.level = 0; s.levelTarget = 0;
        s.memory = (Math.log(config.MEMORY_DEFAULT_S) - logMin) / (logMax - logMin);
      } else {
        s.levelTarget = Math.min(maxLevel, Math.round(s.levelTarget) + 1);
      }
      s.countOverride = null;
      signal('REVELACIÓN');
    },
    levelDown() {
      if (s.final || s.ended) return;
      s.levelTarget = Math.max(0, Math.round(s.levelTarget) - 1);
      s.countOverride = null;
      signal('REVELACIÓN');
    },
    // Ir a un nivel concreto, con la misma transición suave (panel de desarrollo)
    goToLevel(level) {
      if (s.final || s.ended) { s.final = null; s.ended = false; }
      s.levelTarget = Math.min(maxLevel, Math.max(0, Math.round(level)));
      s.countOverride = null;
      signal('REVELACIÓN');
    },
    // Salto inmediato (solo para pruebas y el banco de pruebas)
    setLevelNow(level) {
      s.level = s.levelTarget = Math.min(maxLevel, Math.max(0, level));
      s.alive = s.drawn = levelCount(s.level);
    },

    // Teclas 1–5: fija una cantidad (con transición suave)
    setCount(n) {
      if (s.final || s.ended) return;
      s.countOverride = Math.min(config.MAX_AGENTS, n);
    },

    // MEMORIA (−1, 0, +1 mientras se mantiene una flecha)
    setMemoryInput(dir) {
      s.memoryInput = dir;
      if (dir) signal('MEMORIA');
    },

    // ATRACCIÓN
    setAttract(held, x, y) {
      if (held && !s.attractHeld) signal('ATRACCIÓN');
      s.attractHeld = held;
      if (x !== undefined) { s.attractX = x; s.attractY = y; }
    },

    // PULSO
    pulse(x, y) {
      if (s.pulses.length >= config.PULSE_MAX) s.pulses.shift();
      s.pulses.push({ x, y, age: 0 });
      signal('PULSO');
    },

    // RUMBO global
    wheel(deltaPx) {
      s.driftTarget += deltaPx * config.DRIFT_WHEEL;
      signal('RUMBO');
    },

    // FINAL
    startFinal() {
      if (s.final || s.ended) return;
      s.countOverride = null;
      s.final = { t: 0, fromLevel: s.level, fromMemory: s.memory, fromCount: Math.max(1, s.alive) };
      signal('FINAL');
    },
  };
  return api;
}
