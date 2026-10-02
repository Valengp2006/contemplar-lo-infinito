/**
 * Resplandor contenido (bloom). Su intensidad la decide el nivel de REVELACIÓN
 * (0 en los niveles 0 y 1) multiplicada por BLOOM_GAIN del panel.
 * Nunca debe ocultar el comportamiento: es un halo leve sobre las concentraciones.
 */
import * as THREE from 'three/webgpu';
import { pass, uniform } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

export function createPost(renderer, scene, camera, config) {
  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const uStrength = uniform(0);
  const glow = bloom(scenePass, uStrength, config.BLOOM_RADIUS, config.BLOOM_THRESHOLD);
  pipeline.outputNode = scenePass.add(glow);

  const gain = { value: config.BLOOM_GAIN };

  return {
    uniforms: { gain, radius: glow.radius, threshold: glow.threshold },
    update(visuals) { uStrength.value = visuals.bloom * gain.value; },
    render() { pipeline.render(); },
  };
}
