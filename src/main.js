/**
 * Contemplar lo infinito — arranque.
 * Teclas: clic = comenzar · F pantalla completa · P pausa · D fps · T panel de ajuste ·
 *         1..5 cantidad de agentes (300 / 3.000 / 20.000 / 80.000 / 200.000).
 */
import * as THREE from 'three/webgpu';

import config from './config.js';
import { createSimulation } from './sim/Simulation.js';
import { createParticles } from './render/Particles.js';
import { createDebugPanel } from './ui/debugPanel.js';
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
  const panel = createDebugPanel(sim, particles, config);

  // Calentamiento: compila los pipelines ahora, para que cualquier error aparezca de inmediato
  sim.step(1 / 60, 0);
  renderer.render(scene, camera);

  // ── Mouse: solo modifica el entorno ────────────────────────
  const mouse = { x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0, inside: false };
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * aspect;
    mouse.y = 1 - e.clientY / window.innerHeight;
    if (!mouse.inside) { mouse.lastX = mouse.x; mouse.lastY = mouse.y; }
    mouse.inside = true;
    document.body.style.cursor = 'default';
    clearTimeout(window.__cursorTimer);
    if (document.fullscreenElement) {
      window.__cursorTimer = setTimeout(() => { document.body.style.cursor = 'none'; }, 3000);
    }
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
  let fpsAcc = 0, fpsFrames = 0;

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

    fpsAcc += rawDt; fpsFrames++;
    if (fpsAcc >= 0.5) {
      hudEl.textContent = `FPS ${Math.round(fpsFrames / fpsAcc)} · agentes ${sim.active.toLocaleString('es')}`;
      fpsAcc = 0; fpsFrames = 0;
    }
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

  const setAgents = (n) => {
    const count = Math.min(n, config.MAX_AGENTS);
    sim.setActive(count);
    particles.setCount(count);
  };

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    } else if (k === 'p') paused = !paused;
    else if (k === 'd') hudEl.style.display = hudEl.style.display === 'block' ? 'none' : 'block';
    else if (k === 't') panel.toggle();
    else if (config.AGENT_PRESETS[k]) setAgents(config.AGENT_PRESETS[k]);
  });

  // ── Inicio ─────────────────────────────────────────────────
  startEl.textContent = 'CONTEMPLAR LO INFINITO — clic para comenzar';
  startEl.style.cursor = 'pointer';
  startEl.addEventListener('click', () => {
    startEl.style.opacity = '0';
    startEl.style.pointerEvents = 'none';
    setTimeout(() => { startEl.style.display = 'none'; }, 2000);
    last = performance.now();
    renderer.setAnimationLoop(frame);
  }, { once: true });
}

main().catch((err) => {
  showError('No se pudo iniciar WebGPU', (err && (err.stack || err.message)) || String(err));
  startEl.textContent = 'Error al iniciar — mira el mensaje de abajo';
});
