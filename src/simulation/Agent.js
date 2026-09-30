import { CONFIG } from './config.js';

/**
 * Agent — an autonomous entity with position, velocity and acceleration.
 *
 * Forces are accumulated each frame via applyForce(), then integrated
 * in update(). Acceleration resets to zero after each update (forces
 * must be re-applied every frame).
 */
export class Agent {
  /**
   * @param {number} x - initial X position
   * @param {number} y - initial Y position
   */
  constructor(x, y) {
    // Position
    this.px = x;
    this.py = y;

    // Velocity — start with small random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Acceleration — reset each frame
    this.ax = 0;
    this.ay = 0;
  }

  /**
   * Accumulate a force onto the acceleration.
   * @param {number} fx
   * @param {number} fy
   */
  applyForce(fx, fy) {
    this.ax += fx;
    this.ay += fy;
  }

  /**
   * Integrate: velocity += acceleration, position += velocity.
   * Clamps velocity to maxSpeed and resets acceleration.
   */
  update() {
    const maxSpeed = CONFIG.maxSpeed;

    // Velocity update
    this.vx += this.ax;
    this.vy += this.ay;

    // Clamp speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Position update
    this.px += this.vx;
    this.py += this.vy;

    // Reset acceleration
    this.ax = 0;
    this.ay = 0;
  }

  /**
   * Soft boundary steering — applies a gentle force pushing the agent
   * back when it approaches the edge of the world.
   *
   * @param {number} bounds - half-extent of the world
   */
  edges(bounds) {
    const margin = bounds * 0.15;  // zone where steering kicks in
    const strength = CONFIG.maxForce * 2;
    let steerX = 0;
    let steerY = 0;

    if (this.px > bounds - margin) {
      steerX = -strength * ((this.px - (bounds - margin)) / margin);
    } else if (this.px < -bounds + margin) {
      steerX = strength * ((-bounds + margin - this.px) / margin);
    }

    if (this.py > bounds - margin) {
      steerY = -strength * ((this.py - (bounds - margin)) / margin);
    } else if (this.py < -bounds + margin) {
      steerY = strength * ((-bounds + margin - this.py) / margin);
    }

    this.applyForce(steerX, steerY);
  }
}
