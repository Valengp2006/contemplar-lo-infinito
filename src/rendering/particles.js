/**
 * Contemplar lo infinito — Render y Setup de Partículas
 *
 * Utiliza Sprite con SpriteNodeMaterial para permitir partículas
 * de tamaño configurable, dado que WebGPU Points solo soporta 1px.
 */

import * as THREE from 'three';
import { SpriteNodeMaterial } from 'three/webgpu';
import { positionNode } from '../simulation/agents.js';
import { vec2, float, instanceIndex, hash } from 'three/tsl';
import config from '../config.js';
import { positionBuffer, velocityBuffer } from '../simulation/agents.js';

function hashCPU(n) {
  n = (n << 13) ^ n;
  n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
  return n / 2147483648.0;
}

function noise2DCPU(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const h00 = hashCPU(ix + iy * 57);
  const h10 = hashCPU(ix + 1 + iy * 57);
  const h01 = hashCPU(ix + (iy + 1) * 57);
  const h11 = hashCPU(ix + 1 + (iy + 1) * 57);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return h00 * (1 - ux) * (1 - uy) +
         h10 * ux * (1 - uy) +
         h01 * (1 - ux) * uy +
         h11 * ux * uy;
}

/**
 * Inicializa los buffers de agentes con una distribución dispersa.
 */
export function initAgents(worldWidth) {
  const posArray = positionBuffer.array;
  const velArray = velocityBuffer.array;

  let count = 0;
  let attempts = 0;
  
  // Rellenar hasta MAX_AGENTS con muestreo por rechazo
  while (count < config.MAX_AGENTS && attempts < config.MAX_AGENTS * 10) {
    attempts++;
    
    const px = Math.random() * worldWidth;
    const py = Math.random();
    
    // Ruido de baja frecuencia (escala pequeña)
    const n = noise2DCPU(px * 4, py * 4);
    
    // Probabilidad de aceptación
    const prob = Math.pow(n, 2.0); // Zonas concentradas y vacías
    
    if (Math.random() < prob) {
      posArray[count * 2 + 0] = px;
      posArray[count * 2 + 1] = py;
      
      const angle = Math.random() * Math.PI * 2;
      velArray[count * 2 + 0] = Math.cos(angle) * config.MAX_SPEED * 0.5;
      velArray[count * 2 + 1] = Math.sin(angle) * config.MAX_SPEED * 0.5;
      
      count++;
    }
  }

  positionBuffer.needsUpdate = true;
  velocityBuffer.needsUpdate = true;
}

/**
 * Genera la textura de glow radial.
 */
function createGlowTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
  gradient.addColorStop(config.PARTICLE_CORE_RADIUS, `rgba(255, 255, 255, 1)`);
  gradient.addColorStop(0.6, `rgba(255, 255, 255, 0.3)`);
  gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Crea el InstancedMesh de sprites para las partículas.
 */
export function createParticles() {
  // SpriteGeometry para cada quad
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new SpriteNodeMaterial({
    color: new THREE.Color(config.PARTICLE_COLOR_R, config.PARTICLE_COLOR_G, config.PARTICLE_COLOR_B),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: createGlowTexture(64),
  });

  // Sobrescribir posición del vértice
  // positionNode tiene coordenadas del mundo normalizadas [0..worldW, 0..1].
  // Para la cámara ortográfica que mapea [0..worldW, 0..1], 
  // modelViewMatrix lo colocará correctamente si el mesh está en el origen.
  material.positionNode = positionNode;

  // Variación sutil de tamaño por agente (usando hash de index)
  // hash CPU es de TSL Math (hash11 equivalent)
  const idxHash = hash(instanceIndex.toFloat());
  
  // Tamaño base en píxeles (configurado), luego variado
  const baseSize = float(config.PARTICLE_SIZE_MIN).add(
    idxHash.mul(config.PARTICLE_SIZE_MAX - config.PARTICLE_SIZE_MIN)
  );

  // Escalar el tamaño de píxeles a unidades del mundo normalizadas
  // 1 unidad del mundo = window.innerHeight píxeles
  // Como TSL no tiene acceso directo a window.innerHeight al crear el shader,
  // usaremos un uniform o el scale node que hace el sprite interno.
  // Pero SpriteNodeMaterial maneja sizeNode.
  material.sizeNode = vec2(baseSize, baseSize);

  // IMPORTANTE: sizeAttenuation=false (para que sizeNode se trate en "píxeles")
  // En SpriteNodeMaterial sizeAttenuation controla si se escala por perspectiva
  material.sizeAttenuation = false;

  const mesh = new THREE.InstancedMesh(geometry, material, config.MAX_AGENTS);
  mesh.count = config.AGENT_COUNT;
  
  // Desactivar frustum culling porque la posición real está en GPU
  mesh.frustumCulled = false;

  return mesh;
}
