/**
 * Contemplar lo infinito — Main Loop (Hito A)
 */

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

import config from './config.js';
import { 
  initAgents, createParticles 
} from './rendering/particles.js';

import { 
  uGridCellsX, uGridCellsY, uWorldWidth, uActiveAgents, uDt, uTime,
  clearCellsCompute, binAgentsCompute, updateAgentsCompute 
} from './simulation/agents.js';

import {
  uTime as uFlowTime, uDt as uFlowDt, uWorldWidth as uFlowWW,
  uMousePos, uMouseVel, uMouseActive,
  updateMouseMapCompute, updateFlowFieldCompute 
} from './simulation/flowField.js';

let renderer, scene, camera;
let particlesMesh;
let isPlaying = true;
let isStarted = false;
let mouseActiveTimeout;

let frameCount = 0;
let lastTime = 0;
let fpsText = '';

// Referencia de aspect ratio actual
let currentWorldWidth = 1.0;

function setupWebGPU() {
  renderer = new WebGPURenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.MAX_DPR));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(config.BACKGROUND_COLOR);
  document.body.appendChild(renderer.domElement);
}

function createScene() {
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  currentWorldWidth = aspect;

  // Cámara ortográfica que mapea [0, aspect] x [0, 1]
  camera = new THREE.OrthographicCamera(0, aspect, 1, 0, 0.1, 10);
  camera.position.z = 1;

  // Actualizar uniforms globales
  uWorldWidth.value = aspect;
  uFlowWW.value = aspect;
  
  uGridCellsX.value = Math.ceil(aspect / config.PERCEPTION_RADIUS);
  uGridCellsY.value = Math.ceil(1.0 / config.PERCEPTION_RADIUS);

  // Inicializar simulación CPU
  initAgents(aspect);

  // InstancedMesh de partículas
  particlesMesh = createParticles();
  scene.add(particlesMesh);
}

function handleResize() {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setSize(w, h);
  const aspect = w / h;
  currentWorldWidth = aspect;

  camera.left = 0;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = 0;
  camera.updateProjectionMatrix();

  uWorldWidth.value = aspect;
  uFlowWW.value = aspect;
  uGridCellsX.value = Math.ceil(aspect / config.PERCEPTION_RADIUS);
  uGridCellsY.value = Math.ceil(1.0 / config.PERCEPTION_RADIUS);
}

function updateMouse(e) {
  if (!isStarted) return;
  
  // Convertir px a coord del mundo [0, aspect] x [0, 1]
  const nx = (e.clientX / window.innerWidth) * currentWorldWidth;
  const ny = 1.0 - (e.clientY / window.innerHeight); // Y invertida en coord

  // Velocidad aprox
  const dx = nx - uMousePos.value.x;
  const dy = ny - uMousePos.value.y;
  
  uMousePos.value.set(nx, ny);
  uMouseVel.value.set(dx, dy);
  uMouseActive.value = 1.0;

  clearTimeout(mouseActiveTimeout);
  mouseActiveTimeout = setTimeout(() => {
    uMouseActive.value = 0.0;
    uMouseVel.value.set(0, 0);
  }, 100);

  // Mostrar cursor y ocultar si inactivo
  document.body.style.cursor = 'default';
  if (document.fullscreenElement) {
    clearTimeout(window.cursorHideTimeout);
    window.cursorHideTimeout = setTimeout(() => {
      document.body.style.cursor = 'none';
    }, 3000);
  }
}

function handleKeydown(e) {
  if (!isStarted) return;

  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  } else if (e.key === 'p' || e.key === 'P') {
    isPlaying = !isPlaying;
  } else if (e.key === 'd' || e.key === 'D') {
    const el = document.getElementById('fps-counter');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  // Teclas ocultas para conteo de agentes
  const counts = {
    '1': 300,
    '2': 3000,
    '3': 20000,
    '4': 80000,
    '5': 200000
  };
  if (counts[e.key]) {
    const n = Math.min(counts[e.key], config.MAX_AGENTS);
    uActiveAgents.value = n;
    particlesMesh.count = n;
  }
}

async function loop() {
  if (!isPlaying) {
    renderer.render(scene, camera);
    renderer.setAnimationLoop(loop);
    return;
  }

  const now = performance.now();
  const dtRaw = (now - lastTime) / 1000;
  lastTime = now;
  
  // Limitar dt para estabilidad
  const dt = Math.min(dtRaw, config.MAX_DT);

  uDt.value = dt;
  uFlowDt.value = dt;
  uTime.value += dt;
  uFlowTime.value += dt;

  // 1. Flow Field (Compute)
  await renderer.computeAsync(updateMouseMapCompute);
  await renderer.computeAsync(updateFlowFieldCompute);

  // 2. Agents (Compute)
  await renderer.computeAsync(clearCellsCompute);
  await renderer.computeAsync(binAgentsCompute);
  await renderer.computeAsync(updateAgentsCompute);

  // 3. Render
  renderer.render(scene, camera);

  // Medición FPS
  frameCount++;
  if (frameCount >= 30) {
    const fps = Math.round(1 / dtRaw);
    document.getElementById('fps-counter').innerText = `FPS: ${fps} | Agentes: ${particlesMesh.count}`;
    frameCount = 0;
  }

  renderer.setAnimationLoop(loop);
}

function start() {
  document.getElementById('start-screen').style.display = 'none';
  isStarted = true;
  lastTime = performance.now();
  renderer.setAnimationLoop(loop);
}

async function init() {
  // Try initialize WebGPU
  try {
    setupWebGPU();
    await renderer.init();
  } catch (err) {
    document.getElementById('start-screen').innerHTML = 
      "Tu navegador o dispositivo no soporta WebGPU.<br>No se puede ejecutar la simulación.";
    return;
  }

  createScene();

  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', updateMouse);
  window.addEventListener('keydown', handleKeydown);

  document.getElementById('start-screen').addEventListener('click', start);
}

init();
