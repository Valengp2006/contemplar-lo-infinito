/**
 * Contemplar lo infinito — arranque.
 *
 * Dos modos de interfaz (tecla M para alternar; ?modo=dev en la URL arranca en desarrollo):
 *   · performance: pantalla limpia, solo la obra. El cursor se oculta solo.
 *   · desarrollo:  métricas (izquierda) + controles y música (derecha).
 *
 * Teclas: clic = comenzar · M modo · F pantalla completa · P pausa (música y simulación) ·
 *         D fps discreto · en desarrollo: T oculta el panel, 1..5 cantidad de agentes.
 */
import * as THREE from 'three/webgpu';

import config from './config.js';
import { createSimulation } from './sim/Simulation.js';
import { createParticles } from './render/Particles.js';
import { createMusic } from './audio/music.js';
import { createDebugPanel } from './ui/debugPanel.js';
import { createMetrics } from './ui/metrics.js';
import { showError, installGlobalErrorHandlers, setOnFirstError } from './ui/errorOverlay.js';

installGlobalErrorHandlers();

const startEl = document.getElementById('start-screen');
const hudEl = document.getElementById('hud');

async function main() {
  if (!('gpu' in navigator)) {
    startEl.innerHTML = 'Este navegador no tiene WebGPU.<br>Abre esta página en Chrome o Edge actualizado.';
    return;
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
  const particles = createParticles(sim, config, window.innerHeight);
  scene.add(particles.object);
  const music = createMusic(config);

  const setAgents = (n) => {
    const count = Math.min(n, config.MAX_AGENTS);
    sim.setActive(count);
    particles.setCount(count);
  };

  const panel = createDebugPanel({ sim, particles, config, music, setAgents });
  const metrics = createMetrics(config);

  // Calentamiento: compila los pipelines ahora, para que cualquier error aparezca de inmediato
  sim.step(1 / 60, 0);
  renderer.render(scene, camera);

  // ── Modo de interfaz ───────────────────────────────────────
  const urlMode = new URLSearchParams(location.search).get('modo');
  let mode = urlMode === 'dev' || urlMode === 'desarrollo' ? 'dev' : config.START_MODE;

  function setMode(next) {
    mode = next;
    const dev = mode === 'dev';
    panel.setVisible(dev);
    metrics.setVisible(dev);
    showCursor();
  }

  // ── Cursor: en performance se oculta tras unos segundos quieto ──
  let cursorTimer = 0;
  function showCursor() {
    document.body.style.cursor = 'default';
    clearTimeout(cursorTimer);
    if (mode !== 'dev') {
      cursorTimer = setTimeout(() => { document.body.style.cursor = 'none'; }, config.CURSOR_HIDE_MS);
    }
  }

  // ── Mouse: solo modifica el entorno ────────────────────────
  // Sobre los paneles de desarrollo el mouse no toca el flow field.
  const mouse = { x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0, inside: false };
  window.addEventListener('mousemove', (e) => {
    showCursor();
    const overUI = e.target instanceof Element && e.target.closest('.dev-ui');
    if (overUI) { mouse.inside = false; return; }
    mouse.x = (e.clientX / window.innerWidth) * aspect;
    mouse.y = 1 - e.clientY / window.innerHeight;
    if (!mouse.inside) { mouse.lastX = mouse.x; mouse.lastY = mouse.y; }
    mouse.inside = true;
  });
  document.addEventListener('mouseleave', () => { mouse.inside = false; });

  function updateMouse(rawDt) {
    if (rawDt <= 0) return;
    const rx = (mouse.x - mouse.lastX) / rawDt;
    const ry = (mouse.y - mouse.lastY) / rawDt;
    mouse.lastX = mouse.x; mouse.lastY = mouse.y;
    const alpha = 1 - Math.exp(-rawDt / (config.MOUSE_SMOOTH_MS / 1000));
    mouse.vx += (rx - mouse.vx) * alpha;
    mouse.vy += (ry - mouse.vy) * alpha;
    sim.setMouse(mouse.x, mouse.y, mouse.vx, mouse.vy, mouse.inside);
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
      sim.step(dt, time);
    }
    renderer.render(scene, camera);

    metrics.frame(rawDt, {
      active: sim.active,
      max: config.MAX_AGENTS,
      canvasW: renderer.domElement.width,
      canvasH: renderer.domElement.height,
      dpr: renderer.getPixelRatio(),
      simTime: time,
      paused,
      music,
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

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON')) {
      // Los controles del panel no deben quedarse con las teclas de la obra
      e.target.blur();
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'm') setMode(mode === 'dev' ? 'performance' : 'dev');
    else if (k === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    } else if (k === 'p') togglePause();
    else if (k === 'd') hudEl.style.display = hudEl.style.display === 'block' ? 'none' : 'block';
    else if (mode === 'dev') {
      // Herramientas solo de desarrollo: en performance no hay cambios bruscos
      if (k === 't') panel.toggle();
      else if (config.AGENT_PRESETS[k]) setAgents(config.AGENT_PRESETS[k]);
    }
  });

  // ── Inicio ─────────────────────────────────────────────────
  startEl.textContent = 'CONTEMPLAR LO INFINITO — clic para comenzar';
  startEl.style.cursor = 'pointer';
  startEl.addEventListener('click', () => {
    startEl.style.opacity = '0';
    startEl.style.pointerEvents = 'none';
    setTimeout(() => { startEl.style.display = 'none'; }, 2000);
    music.play(); // el clic es el gesto que el navegador exige para sonar
    setMode(mode);
    last = performance.now();
    renderer.setAnimationLoop(frame);
  }, { once: true });
}

main().catch((err) => {
  showError('No se pudo iniciar WebGPU', (err && (err.stack || err.message)) || String(err));
  startEl.textContent = 'Error al iniciar — mira el mensaje de abajo';
});
