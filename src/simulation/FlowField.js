import * as THREE from 'three';
import { noise2D } from './noise.js';
import { CONFIG } from './config.js';

/**
 * FlowField — representa las corrientes invisibles del universo.
 * Se evalúa posicionalmente y permite influencia del mouse.
 */
export class FlowField {
  constructor() {
    this.mouseInfluence = new THREE.Vector3();
    this.isMouseActive = false;
  }

  setInfluence(x, y, active) {
    this.mouseInfluence.set(x, y, 0);
    this.isMouseActive = active;
  }

  getDirection(position, time) {
    const scale = CONFIG.flowScale;
    const speed = CONFIG.flowSpeed;

    // Calcular la dirección basada en simplex noise continuo
    const angle = noise2D(position.x * scale, position.y * scale + time * speed) * Math.PI * 2;
    const direction = new THREE.Vector3(
      Math.cos(angle),
      Math.sin(angle),
      0
    ).normalize();

    // Modificar el entorno si el mouse está activo
    if (this.isMouseActive) {
      const toMouse = this.mouseInfluence.clone().sub(position);
      const distance = toMouse.length();
      const effectRadius = 5.0;

      if (distance < effectRadius && distance > 0) {
        const influence = 1.0 - (distance / effectRadius);
        // Genera un efecto de succión/remolino alrededor del mouse
        direction.lerp(toMouse.normalize(), influence * 0.8).normalize();
      }
    }

    return direction;
  }
}
