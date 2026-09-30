import { noise2D } from './noise.js';
import { CONFIG } from './config.js';

const TWO_PI = Math.PI * 2;

/**
 * FlowField — a 2D vector field driven by simplex noise.
 *
 * Instead of storing a grid of vectors, the field is evaluated on-the-fly
 * for any (x, y) position. This avoids memory overhead and provides
 * infinite resolution.
 *
 * The noise evolves slowly over time, so the currents drift and transform.
 */
export class FlowField {
  /**
   * Look up the flow direction at a given position.
   *
   * @param {number} x - world X coordinate
   * @param {number} y - world Y coordinate
   * @param {number} time - elapsed time (seconds)
   * @returns {{ x: number, y: number }} normalized direction vector
   */
  lookup(x, y, time) {
    const scale = CONFIG.flowScale;
    const speed = CONFIG.flowSpeed;

    // Sample noise to get an angle in [0, 2π]
    const angle = noise2D(x * scale, y * scale + time * speed) * TWO_PI;

    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }
}
