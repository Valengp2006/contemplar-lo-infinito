/**
 * Contemplar lo infinito — Fase 0
 *
 * Escena mínima de verificación: fondo casi negro (#05060d),
 * un solo punto blanco cálido en el centro.
 *
 * THREE.WebGLRenderer se usa aquí SOLO como verificación provisional.
 * La decisión de arquitectura de renderizado (CPU/GPU, WebGL/WebGPU)
 * sigue pendiente (ver AGENTS.md §23).
 *
 * La textura de partícula generada con canvas y el PointsMaterial
 * aditivo son también provisionales: se usan para verificar el aspecto
 * visual de un punto de luz suave. No constituyen una decisión de
 * arquitectura de renderizado.
 */

import * as THREE from 'three';

// ── Utilidades provisionales ────────────────────────────────

/**
 * Genera una textura de degradado radial usando un canvas 2D.
 * Centro: color sólido. Bordes: completamente transparentes.
 * Reutilizable para cualquier punto de luz suave.
 *
 * @param {number} size  Resolución del canvas en px (potencia de 2).
 * @param {object} [opts]
 * @param {number} [opts.coreRadius=0.3] Fracción del radio con brillo pleno.
 * @returns {THREE.CanvasTexture}
 */
function createGlowTexture(size = 64, { coreRadius = 0.3 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const half = size / 2;

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255, 245, 230, 1)');
  gradient.addColorStop(coreRadius, 'rgba(255, 245, 230, 1)');
  gradient.addColorStop(0.6, 'rgba(255, 245, 230, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 245, 230, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// ── Renderer ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
const dpr = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(dpr);
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
// Textura radial y blending aditivo provisionales.
const pointGeometry = new THREE.BufferGeometry();
pointGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([0, 0, 0], 3),
);

const pointMaterial = new THREE.PointsMaterial({
  color: 0xfff5e6,              // blanco cálido
  size: 10 * dpr,               // ~10 CSS-px en cualquier pantalla
  sizeAttenuation: false,       // tamaño fijo, sin perspectiva
  map: createGlowTexture(64),
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
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
