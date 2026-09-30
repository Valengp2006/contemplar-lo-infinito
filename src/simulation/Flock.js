import * as THREE from 'three';
import { Agent } from './Agent.js';
import { CONFIG } from './config.js';

/**
 * Flock — manages all agents, applies flocking rules + flow field,
 * and owns the THREE.Points object for rendering.
 *
 * Flocking rules (Reynolds 1987):
 *   Separation — steer away from nearby neighbours
 *   Alignment  — match average heading of nearby neighbours
 *   Cohesion   — steer toward average position of nearby neighbours
 */
export class Flock {
  /**
   * @param {THREE.Scene} scene — the scene to add the Points to
   */
  constructor(scene) {
    this.scene = scene;
    this.agents = [];
    this.points = null;
    this.positionAttr = null;

    this._init();
  }

  // ---------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------

  _init() {
    const count = CONFIG.agentCount;
    const bounds = CONFIG.bounds;

    // Create agents scattered across the world
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * bounds * 1.6;
      const y = (Math.random() - 0.5) * bounds * 1.6;
      this.agents.push(new Agent(x, y));
    }

    // Build the Points geometry
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = this.agents[i].px;
      positions[i * 3 + 1] = this.agents[i].py;
      positions[i * 3 + 2] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', this.positionAttr);

    const material = new THREE.PointsMaterial({
      color: 0xccddff,
      size: CONFIG.particleSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: CONFIG.particleOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  // ---------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------

  reset() {
    const bounds = CONFIG.bounds;
    for (const agent of this.agents) {
      agent.px = (Math.random() - 0.5) * bounds * 1.6;
      agent.py = (Math.random() - 0.5) * bounds * 1.6;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5;
      agent.vx = Math.cos(angle) * speed;
      agent.vy = Math.sin(angle) * speed;
      agent.ax = 0;
      agent.ay = 0;
    }
  }

  // ---------------------------------------------------------------
  // Simulation step
  // ---------------------------------------------------------------

  /**
   * Advance the simulation by one frame.
   *
   * @param {import('./FlowField.js').FlowField} flowField
   * @param {number} time — elapsed time in seconds
   */
  update(flowField, time) {
    const agents = this.agents;
    const n = agents.length;
    const maxForce = CONFIG.maxForce;
    const perceptionR = CONFIG.perceptionRadius;
    const perceptionR2 = perceptionR * perceptionR;

    for (let i = 0; i < n; i++) {
      const a = agents[i];

      // --- Flow Field force ---
      const flow = flowField.lookup(a.px, a.py, time);
      a.applyForce(
        flow.x * maxForce * CONFIG.flowWeight,
        flow.y * maxForce * CONFIG.flowWeight
      );

      // --- Flocking: accumulate separation, alignment, cohesion ---
      let sepX = 0, sepY = 0, sepCount = 0;
      let aliX = 0, aliY = 0, aliCount = 0;
      let cohX = 0, cohY = 0, cohCount = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = agents[j];
        const dx = a.px - b.px;
        const dy = a.py - b.py;
        const d2 = dx * dx + dy * dy;

        if (d2 < perceptionR2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);

          // Separation — weighted by inverse distance
          sepX += (dx / d) / d;
          sepY += (dy / d) / d;
          sepCount++;

          // Alignment — accumulate neighbour velocities
          aliX += b.vx;
          aliY += b.vy;
          aliCount++;

          // Cohesion — accumulate neighbour positions
          cohX += b.px;
          cohY += b.py;
          cohCount++;
        }
      }

      // --- Separation steering ---
      if (sepCount > 0) {
        sepX /= sepCount;
        sepY /= sepCount;
        // Normalize and scale to maxForce
        const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
        if (sepLen > 0) {
          sepX = (sepX / sepLen) * maxForce * CONFIG.separationWeight;
          sepY = (sepY / sepLen) * maxForce * CONFIG.separationWeight;
        }
        a.applyForce(sepX, sepY);
      }

      // --- Alignment steering ---
      if (aliCount > 0) {
        aliX /= aliCount;
        aliY /= aliCount;
        // Desired velocity = average neighbour velocity, normalized × maxSpeed
        const aliLen = Math.sqrt(aliX * aliX + aliY * aliY);
        if (aliLen > 0) {
          const desiredX = (aliX / aliLen) * CONFIG.maxSpeed;
          const desiredY = (aliY / aliLen) * CONFIG.maxSpeed;
          // Steering = desired - current velocity
          let steerX = desiredX - a.vx;
          let steerY = desiredY - a.vy;
          // Limit steering force
          const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);
          if (steerLen > maxForce) {
            steerX = (steerX / steerLen) * maxForce;
            steerY = (steerY / steerLen) * maxForce;
          }
          a.applyForce(
            steerX * CONFIG.alignmentWeight,
            steerY * CONFIG.alignmentWeight
          );
        }
      }

      // --- Cohesion steering ---
      if (cohCount > 0) {
        cohX /= cohCount;
        cohY /= cohCount;
        // Steer toward average position of neighbours
        let towardX = cohX - a.px;
        let towardY = cohY - a.py;
        const towardLen = Math.sqrt(towardX * towardX + towardY * towardY);
        if (towardLen > 0) {
          // Desired velocity = toward centre × maxSpeed
          const desiredX = (towardX / towardLen) * CONFIG.maxSpeed;
          const desiredY = (towardY / towardLen) * CONFIG.maxSpeed;
          let steerX = desiredX - a.vx;
          let steerY = desiredY - a.vy;
          const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);
          if (steerLen > maxForce) {
            steerX = (steerX / steerLen) * maxForce;
            steerY = (steerY / steerLen) * maxForce;
          }
          a.applyForce(
            steerX * CONFIG.cohesionWeight,
            steerY * CONFIG.cohesionWeight
          );
        }
      }

      // --- Boundary steering ---
      a.edges(CONFIG.bounds);

      // --- Integrate ---
      a.update();
    }

    // --- Copy positions to GPU buffer ---
    this._syncGeometry();
  }

  // ---------------------------------------------------------------
  // Sync agent positions → BufferGeometry
  // ---------------------------------------------------------------

  _syncGeometry() {
    const arr = this.positionAttr.array;
    const agents = this.agents;
    for (let i = 0, n = agents.length; i < n; i++) {
      arr[i * 3] = agents[i].px;
      arr[i * 3 + 1] = agents[i].py;
      // Z stays at 0
    }
    this.positionAttr.needsUpdate = true;

    // Update material live properties
    this.points.material.size = CONFIG.particleSize;
    this.points.material.opacity = CONFIG.particleOpacity;
  }

  // ---------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.scene.remove(this.points);
  }
}
