import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * Agent — entidad autónoma.
 * Su comportamiento surge de: Percepción -> Cálculo de fuerzas -> Steering -> Aceleración
 */
export class Agent {
  constructor(x, y) {
    this.position = new THREE.Vector3(x, y, 0);
    
    this.velocity = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      0
    );
    this.velocity.setLength(Math.random() * 0.2 + 0.1);
    
    this.acceleration = new THREE.Vector3();

    // Datos para el debug mode
    this.debugData = {
      neighbors: [],
      flowForce: new THREE.Vector3(),
      steeringForce: new THREE.Vector3()
    };
  }

  // --- PERCEPCIÓN ---
  
  getNeighbors(agents) {
    const neighbors = [];
    const radiusSq = CONFIG.perceptionRadius * CONFIG.perceptionRadius;
    
    for (const other of agents) {
      if (other === this) continue;
      
      const distanceSq = this.position.distanceToSquared(other.position);
      
      if (distanceSq < radiusSq) {
        neighbors.push({ agent: other, distanceSq });
      }
    }
    
    return neighbors;
  }

  // --- STEERING BÁSICO ---

  steerTowards(desired) {
    const steering = desired.clone().sub(this.velocity);
    steering.clampLength(0, CONFIG.maxForce);
    return steering;
  }

  seek(target) {
    const desired = target.clone().sub(this.position);
    if (desired.lengthSq() === 0) {
      return new THREE.Vector3();
    }
    desired.normalize();
    desired.multiplyScalar(CONFIG.maxSpeed);
    return this.steerTowards(desired);
  }

  // --- REGLAS DE FLOCKING ---

  separation(neighbors) {
    const force = new THREE.Vector3();
    let count = 0;
    const sepRadiusSq = CONFIG.separationRadius * CONFIG.separationRadius;

    for (const { agent: other, distanceSq } of neighbors) {
      if (distanceSq > 0 && distanceSq < sepRadiusSq) {
        const distance = Math.sqrt(distanceSq);
        const difference = this.position.clone().sub(other.position);
        
        // Ponderar por distancia (más cerca = más fuerza de separación)
        difference.normalize();
        difference.divideScalar(distance);
        
        force.add(difference);
        count++;
      }
    }

    if (count > 0) {
      force.divideScalar(count);
      if (force.lengthSq() > 0) {
        force.normalize().multiplyScalar(CONFIG.maxSpeed);
        return this.steerTowards(force);
      }
    }

    return force;
  }

  alignment(neighbors) {
    const desired = new THREE.Vector3();
    let count = 0;

    for (const { agent: other } of neighbors) {
      desired.add(other.velocity);
      count++;
    }

    if (count === 0) {
      return new THREE.Vector3();
    }

    desired.divideScalar(count);
    desired.normalize().multiplyScalar(CONFIG.maxSpeed);
    
    return this.steerTowards(desired);
  }

  cohesion(neighbors) {
    const center = new THREE.Vector3();
    let count = 0;

    for (const { agent: other } of neighbors) {
      center.add(other.position);
      count++;
    }

    if (count === 0) {
      return new THREE.Vector3();
    }

    center.divideScalar(count);
    return this.seek(center);
  }

  // --- FLOW FIELD ---

  followFlow(flowField, time) {
    const flowDirection = flowField.getDirection(this.position, time);
    const desiredVelocity = flowDirection.clone().multiplyScalar(CONFIG.maxSpeed);
    return this.steerTowards(desiredVelocity);
  }

  // --- BORDES (RETORNO SUAVE) ---

  boundaryForce() {
    const force = new THREE.Vector3();
    const margin = CONFIG.bounds;

    if (this.position.x < -margin) force.x += 1;
    if (this.position.x > margin) force.x -= 1;
    if (this.position.y < -margin) force.y += 1;
    if (this.position.y > margin) force.y -= 1;

    if (force.lengthSq() > 0) {
      force.normalize().multiplyScalar(CONFIG.maxSpeed);
      return this.steerTowards(force);
    }

    return force;
  }

  // --- COMBINACIÓN DE FUERZAS ---

  applyForce(force, weight = 1.0) {
    this.acceleration.add(force.clone().multiplyScalar(weight));
  }

  // --- ACTUALIZACIÓN PRINCIPAL ---

  update(dt, agents, flowField, time) {
    this.acceleration.set(0, 0, 0);

    // 1. Percepción
    const neighbors = this.getNeighbors(agents);

    // 2. Cálculo de fuerzas individuales
    const separation = this.separation(neighbors);
    const alignment = this.alignment(neighbors);
    const cohesion = this.cohesion(neighbors);
    const flow = this.followFlow(flowField, time);
    const boundary = this.boundaryForce();

    // Guardar información para Debug Mode
    this.debugData.neighbors = neighbors.map(n => n.agent);
    this.debugData.flowForce.copy(flow).multiplyScalar(CONFIG.flowWeight);

    // 3. Aplicar fuerzas ponderadas
    this.applyForce(separation, CONFIG.separationWeight);
    this.applyForce(alignment, CONFIG.alignmentWeight);
    this.applyForce(cohesion, CONFIG.cohesionWeight);
    this.applyForce(flow, CONFIG.flowWeight);
    this.applyForce(boundary, 1.5); // Bordes con peso fijo fuerte

    this.debugData.steeringForce.copy(this.acceleration);

    // Estandarizar delta time respecto a 60fps para mantener los valores de la configuración estables
    const timeScale = dt * 60.0; 

    // 4. Integración cinemática
    this.velocity.add(this.acceleration.clone().multiplyScalar(timeScale));
    this.velocity.clampLength(0, CONFIG.maxSpeed);
    this.position.add(this.velocity.clone().multiplyScalar(timeScale));
  }
}
