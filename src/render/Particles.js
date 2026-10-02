/**
 * Partículas: un sprite instanciado por agente, leyendo su posición directamente
 * del buffer de la GPU. (Con WebGPU los `Points` solo pueden medir 1 px, por eso se
 * usan sprites.) El tamaño se define en píxeles CSS y se convierte a unidades del
 * mundo dividiendo por el alto en píxeles (el alto del mundo es 1).
 */
import * as THREE from 'three/webgpu';
import {
  uniform, vec2, vec3, vec4, float, mix, clamp, smoothstep, length, uv,
  instanceIndex, hash, varying,
} from 'three/tsl';

export function createParticles(sim, config, viewHeightPx) {
  const uPointPx = uniform(config.POINT_PX);
  const uViewH = uniform(viewHeightPx);
  const uBright = uniform(config.BRIGHTNESS);
  const uColor = uniform(new THREE.Vector3(...config.PARTICLE_COLOR));

  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  // Posición del agente (leída del buffer de cómputo)
  material.positionNode = vec3(sim.posBuf.toAttribute(), 0);

  // Variación individual: tamaño y luminosidad (da sensación de profundidad)
  const seedA = hash(instanceIndex.add(9001));
  const seedB = hash(instanceIndex.add(31337));
  const sizeVar = mix(0.7, 1.35, seedA);
  material.scaleNode = vec2(uPointPx.div(uViewH).mul(sizeVar));

  const presence = sim.stateBuf.toAttribute().x;                 // vecinos percibidos
  const bright = mix(0.4, 1.0, seedB).mul(mix(0.65, 1.0, clamp(presence.div(3), 0, 1)));
  const vBright = varying(bright, 'vBright');

  // Punto redondo con borde suave
  const d = length(uv().sub(0.5)).mul(2);
  const falloff = float(1).sub(smoothstep(0, 1, d));
  const alpha = falloff.mul(falloff).mul(vBright).mul(uBright);
  material.colorNode = vec4(uColor, alpha);

  const sprite = new THREE.Sprite(material);
  sprite.count = sim.active;
  sprite.frustumCulled = false;

  return {
    object: sprite,
    uniforms: { pointPx: uPointPx, viewH: uViewH, brightness: uBright },
    setCount(n) { sprite.count = n; },
    setViewHeight(px) { uViewH.value = px; },
  };
}
