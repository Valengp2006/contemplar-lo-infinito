/**
 * Contemplar lo infinito — Fase 0
 *
 * Escena mínima de verificación: fondo casi negro (#05060d),
 * un solo punto blanco cálido en el centro.
 *
 * THREE.WebGLRenderer se usa aquí SOLO como verificación provisional.
 * La decisión de arquitectura de renderizado (CPU/GPU, WebGL/WebGPU)
 * sigue pendiente (ver AGENTS.md §23).
 */

import * as THREE from 'three';

// ── Renderer ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05060d);
document.body.appendChild(renderer.domElement);

// ── Escena y cámara ─────────────────────────────────────────
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(
  -window.innerWidth / 2,   // left
   window.innerWidth / 2,   // right
   window.innerHeight / 2,  // top
  -window.innerHeight / 2,  // bottom
  0.1,
  10,
);
camera.position.z = 1;

// ── Punto blanco cálido ─────────────────────────────────────
// Tamaño fijo en píxeles, sin atenuación por distancia.
const pointGeometry = new THREE.BufferGeometry();
pointGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([0, 0, 0], 3),
);

const pointMaterial = new THREE.PointsMaterial({
  color: 0xfff5e6,        // blanco cálido
  size: 3,                // tamaño fijo en píxeles
  sizeAttenuation: false, // sin atenuación por distancia
});

const point = new THREE.Points(pointGeometry, pointMaterial);
scene.add(point);

// ── Resize ──────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.left   = -w / 2;
  camera.right  =  w / 2;
  camera.top    =  h / 2;
  camera.bottom = -h / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
});

// ── Loop ────────────────────────────────────────────────────
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
