/**
 * Contemplar lo infinito — arranque.
 *
 * Dos modos de interfaz (tecla M para alternar; ?modo=dev en la URL arranca en desarrollo):
 *   · performance: pantalla limpia, solo la obra y el HUD mínimo. El cursor se oculta solo.
 *   · desarrollo:  métricas (izquierda) + controles y música (derecha).
 *
 * Interpretación: mover el mouse = RUMBO local · rueda / dos dedos = RUMBO global ·
 *   mantener clic = ATRACCIÓN · ↑ / ↓ = MEMORIA · barra espaciadora = PULSO ·
 *   R / Shift+R = REVELACIÓN · E = FINAL · 4 = CUERPO nuevo · 5 = reunirlos en SISTEMA · 6 = disolver.
 * Sesión: clic = comenzar · F pantalla completa · P pausa (música y simulación).
 * Desarrollo: M modo · T panel · D fps · 1..3 cantidad fija (con transición suave; dispersa cuerpos).
 */
import * as THREE from 'three/webgpu';

import config from './config.js';
import { createSimulation } from './sim/Simulation.js';
import { createInstrument } from './sim/Instrument.js';
import { createParticles } from './render/Particles.js';
import { createTrail } from './render/Trail.js';
import { createPost } from './render/Post.js';
import { createMusic } from './audio/music.js';
import { createDebugPanel } from './ui/debugPanel.js';
import { createMetrics } from './ui/metrics.js';
import { createHud } from './ui/hud.js';
import { showError, installGlobalErrorHandlers, setOnFirstError } from './ui/errorOverlay.js';

installGlobalErrorHandlers();

const startEl = document.getElementById('start-screen');
const hudEl = document.getElementById('hud');

async function main() {
  if (!('gpu' in navigator)) {
    startEl.innerHTML = 'Este navegador no tiene WebGPU.<br>Abre esta página en Chrome o Edge actualizado.';
    return;
  }

  // Si la página carga con la ventana en tamaño 0 (pestaña oculta o minimizada),
  // la GPU no puede crear sus texturas: se espera a que la ventana tenga tamaño.
  while (!(window.innerWidth > 0 && window.innerHeight > 0)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const renderer = new THREE.WebGPURenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.MAX_DPR));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(config.BACKGROUND, 1);
  document.body.appendChild(renderer.domElement);

  // Un error de la GPU detiene el bucle y se muestra el PRIMERO en pantalla
  renderer.onError = (info) => showError(`Error de WebGPU (${info.type})`, info.message);
  setOnFirstError(() => renderer.setAnimationLoop(null));

  await renderer.init();

  let aspect = window.innerWidth / window.innerHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, aspect, 1, 0, 0.1, 10);
  camera.position.z = 1;

  const sim = createSimulation(renderer, config, aspect);
  const instrument = createInstrument(sim, config);
  const particles = createParticles(sim, config, window.innerHeight);
  const trail = createTrail(sim, config, aspect);
  scene.add(trail.object);
  scene.add(particles.object);
  const post = createPost(renderer, scene, camera, config);
  const music = createMusic(config);
  const hud = createHud(config);
  instrument.onControl = (name) => hud.show(name, instrument);

  const panel = createDebugPanel({ sim, particles, trail, post, instrument, config, music });
  const metrics = createMetrics(config);

  // Calentamiento: compila los pipelines ahora, para que cualquier error aparezca de inmediato
  instrument.update(1 / 60);
  sim.step(1 / 60, 0);
  post.render();

  // ── Modo de interfaz ───────────────────────────────────────
  const urlMode = new URLSearchParams(location.search).get('modo');
  let mode = urlMode === 'dev' || urlMode === 'desarrollo' ? 'dev' : config.START_MODE;
  let started = false;

  function setMode(next) {
    mode = next;
    const dev = mode === 'dev';
    panel.setVisible(dev);
    metrics.setVisible(dev);
    showCursor();
  }

  // ── Cursor: en performance (ya iniciada la pieza) nunca se ve; en desarrollo siempre ──
  function showCursor() {
    document.body.style.cursor = mode !== 'dev' && started ? 'none' : 'default';
  }

  const overUI = (e) => e.target instanceof Element && e.target.closest('.dev-ui');

  // ── Mouse: solo modifica el entorno ────────────────────────
  // Sobre los paneles de desarrollo el mouse no toca la obra.
  const mouse = { x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0, inside: false };
  window.addEventListener('mousemove', (e) => {
    showCursor();
    if (overUI(e)) { mouse.inside = false; return; }
    mouse.x = (e.clientX / window.innerWidth) * aspect;
    mouse.y = 1 - e.clientY / window.innerHeight;
    if (!mouse.inside) { mouse.lastX = mouse.x; mouse.lastY = mouse.y; }
    mouse.inside = true;
    if (instrument.state.attractHeld) instrument.setAttract(true, mouse.x, mouse.y);
  });
  document.addEventListener('mouseleave', () => { mouse.inside = false; });

  // ATRACCIÓN: mantener el clic crea un pozo en el cursor
  window.addEventListener('mousedown', (e) => {
    if (!started || e.button !== 0 || overUI(e)) return;
    const x = (e.clientX / window.innerWidth) * aspect;
    const y = 1 - e.clientY / window.innerHeight;
    instrument.setAttract(true, x, y);
  });
  window.addEventListener('mouseup', () => instrument.setAttract(false));
  window.addEventListener('blur', () => instrument.setAttract(false));

  // RUMBO global: rueda o dos dedos rotan la deriva del campo
  window.addEventListener('wheel', (e) => {
    if (!started || overUI(e)) return;
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    instrument.wheel(px);
  }, { passive: true });

  let rumboShown = 0;
  function updateMouse(rawDt) {
    if (rawDt <= 0) return;
    const rx = (mouse.x - mouse.lastX) / rawDt;
    const ry = (mouse.y - mouse.lastY) / rawDt;
    mouse.lastX = mouse.x; mouse.lastY = mouse.y;
    const alpha = 1 - Math.exp(-rawDt / (config.MOUSE_SMOOTH_MS / 1000));
    mouse.vx += (rx - mouse.vx) * alpha;
    mouse.vy += (ry - mouse.vy) * alpha;
    sim.setMouse(mouse.x, mouse.y, mouse.vx, mouse.vy, mouse.inside);
    // El HUD nombra RUMBO cuando el mouse mueve de verdad la corriente
    rumboShown -= rawDt;
    if (mouse.inside && Math.hypot(mouse.vx, mouse.vy) > 0.3 && rumboShown <= 0 && !instrument.state.attractHeld) {
      hud.show('RUMBO', instrument);
      rumboShown = 1;
    }
  }

  // ── Bucle ──────────────────────────────────────────────────
  let last = performance.now();
  let time = 0;
  let paused = false;
  let hudAcc = 0;

  function frame() {
    const now = performance.now();
    const rawDt = Math.min((now - last) / 1000, 0.25);
    last = now;
    const dt = Math.min(rawDt, config.MAX_DT);

    if (!paused) {
      time += dt;
      updateMouse(rawDt);
      instrument.update(dt);
      sim.step(dt, time);
    }
    particles.update(rawDt, sim.active, sim.alive, instrument.visuals);
    trail.update(instrument);
    post.update(instrument.visuals);
    hud.update(instrument);
    post.render();

    const s = instrument.state;
    metrics.frame(rawDt, {
      active: Math.round(sim.alive),
      max: config.MAX_AGENTS,
      canvasW: renderer.domElement.width,
      canvasH: renderer.domElement.height,
      dpr: renderer.getPixelRatio(),
      simTime: time,
      paused,
      music,
      lines: [
        `revelación     ${instrument.level.toFixed(2)} → ${instrument.levelTarget}${s.countOverride ? '  (cantidad fija)' : ''}`,
        `memoria        ${instrument.memorySeconds().toFixed(1)} s`,
        `atracción      ${(s.attractOn * 100).toFixed(0)} %   pulsos ${s.pulses.length}`,
        `cuerpos        ${s.bodies.length}${s.system ? `  (en el sistema ${s.bodies.filter((b) => b.inSystem).length})` : ''}`,
        s.final ? `FINAL          ${Math.round((s.final.t / config.FINAL_S) * 100)} %` : s.ended ? 'FINAL          terminado (R reinicia)' : '',
      ].filter(Boolean),
    });
    hudAcc += rawDt;
    if (hudAcc >= 0.5) { hudAcc = 0; hudEl.textContent = metrics.summary; }
  }

  // ── Ventana y teclas ───────────────────────────────────────
  window.addEventListener('resize', () => {
    aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.right = aspect;
    camera.updateProjectionMatrix();
    sim.setAspect(aspect);
    trail.setAspect(aspect);
    particles.setViewHeight(window.innerHeight);
  });

  function togglePause() {
    paused = !paused;
    if (paused) music.pause(); else music.play();
  }

  // La música solo suena mientras la pestaña está a la vista. Al volver se reanuda,
  // salvo que la intérprete la hubiera pausado antes (P o el botón del panel).
  let resumeOnShow = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resumeOnShow = music.playing;
      music.pause();
    } else if (resumeOnShow && !paused) {
      music.play();
    }
  });
  window.addEventListener('pagehide', () => music.pause());

  const memoryKeys = { ArrowUp: 1, ArrowDown: -1 };
  const held = new Set();

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) {
      // Los controles del panel no deben quedarse con las teclas de la obra
      e.target.blur();
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // MEMORIA: continuo mientras se mantiene la flecha
    if (memoryKeys[e.key]) {
      e.preventDefault();
      held.add(e.key);
      if (started) instrument.setMemoryInput(memoryKeys[e.key]);
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (started && !e.repeat) {
        const x = mouse.inside ? mouse.x : aspect / 2;
        const y = mouse.inside ? mouse.y : 0.5;
        instrument.pulse(x, y);
      }
      return;
    }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'm') setMode(mode === 'dev' ? 'performance' : 'dev');
    else if (k === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    } else if (k === 'p') togglePause();
    else if (k === 'd') hudEl.style.display = hudEl.style.display === 'block' ? 'none' : 'block';
    else if (k === 't') {
      if (mode !== 'dev') setMode('dev'); else panel.toggle();
    } else if (!started) {
      // los controles de interpretación actúan solo después del clic de inicio
    } else if (k === 'r') {
      if (e.shiftKey) instrument.levelDown(); else instrument.levelUp();
    } else if (k === 'e') instrument.startFinal();
    else if (k === '4' || k === '5') {
      const x = mouse.inside ? mouse.x : aspect / 2;
      const y = mouse.inside ? mouse.y : 0.5;
      if (k === '4') instrument.body(x, y); else instrument.system();
    } else if (k === '6') instrument.dissolve();
    else if (config.AGENT_PRESETS[e.key]) {
      instrument.setCount(config.AGENT_PRESETS[e.key]);
      instrument.dissolve();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (!memoryKeys[e.key]) return;
    held.delete(e.key);
    const other = [...held].find((key) => memoryKeys[key]);
    instrument.setMemoryInput(other ? memoryKeys[other] : 0);
  });

  // ── Inicio ─────────────────────────────────────────────────
  startEl.textContent = 'CONTEMPLAR LO INFINITO — clic para comenzar';
  startEl.style.cursor = 'pointer';
  startEl.addEventListener('click', () => {
    startEl.style.opacity = '0';
    startEl.style.pointerEvents = 'none';
    setTimeout(() => { startEl.style.display = 'none'; }, 2000);
    music.play(); // el clic es el gesto que el navegador exige para sonar
    started = true;
    setMode(mode);
    last = performance.now();
    renderer.setAnimationLoop(frame);
  }, { once: true });
}

main().catch((err) => {
  showError('No se pudo iniciar WebGPU', (err && (err.stack || err.message)) || String(err));
  startEl.textContent = 'Error al iniciar — mira el mensaje de abajo';
});
