import * as THREE from 'three';
import { Agent } from './Agent.js';
import { CONFIG } from './config.js';

/**
 * Flock (AgentSystem) — Gestiona la actualización de todos los agentes
 * y su representación visual (THREE.Points). También maneja el modo Debug.
 */
export class Flock {
  constructor(scene) {
    this.scene = scene;
    this.agents = [];
    this.points = null;
    this.positionAttr = null;
    
    // Debug mode
    this.isDebug = false;
    this.debugLines = null;
    this.debugGeometry = null;

    this._init();
  }

  _init() {
    const count = CONFIG.agentCount;
    const bounds = CONFIG.bounds;

    // Distribuir orgánicamente
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * bounds * 1.5;
      const y = (Math.random() - 0.5) * bounds * 1.5;
      this.agents.push(new Agent(x, y));
    }

    // Geometría eficiente para los agentes
    const positions = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', this.positionAttr);

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: CONFIG.particleSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: CONFIG.particleOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    // Preparar Geometría de Debug (líneas)
    this.debugGeometry = new THREE.BufferGeometry();
    const debugMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 });
    this.debugLines = new THREE.LineSegments(this.debugGeometry, debugMat);
    this.debugLines.visible = false;
    this.scene.add(this.debugLines);
  }

  reset() {
    const bounds = CONFIG.bounds;
    for (const agent of this.agents) {
      agent.position.set(
        (Math.random() - 0.5) * bounds * 1.5,
        (Math.random() - 0.5) * bounds * 1.5,
        0
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.2 + 0.1;
      agent.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
      agent.acceleration.set(0, 0, 0);
    }
  }

  toggleDebug() {
    this.isDebug = !this.isDebug;
    this.debugLines.visible = this.isDebug;
  }

  /**
   * Actualizar todos los agentes y la geometría.
   */
  update(dt, flowField, time) {
    // 1. Cada agente percibe y calcula sus fuerzas
    for (const agent of this.agents) {
      agent.update(dt, this.agents, flowField, time);
    }

    // 2. Copiar posiciones a la GPU
    this._syncGeometry();

    // 3. Dibujar vectores de debug si está activo
    if (this.isDebug) {
      this._syncDebug();
    }
  }

  _syncGeometry() {
    const arr = this.positionAttr.array;
    const agents = this.agents;
    
    for (let i = 0, n = agents.length; i < n; i++) {
      const pos = agents[i].position;
      arr[i * 3] = pos.x;
      arr[i * 3 + 1] = pos.y;
      arr[i * 3 + 2] = pos.z;
    }
    
    this.positionAttr.needsUpdate = true;
    
    // Live update de panel LAB
    this.points.material.size = CONFIG.particleSize;
    this.points.material.opacity = CONFIG.particleOpacity;
  }

  _syncDebug() {
    const positions = [];
    const colors = [];

    const addLine = (p1, p2, r, g, b) => {
      positions.push(p1.x, p1.y, p1.z);
      positions.push(p2.x, p2.y, p2.z);
      colors.push(r, g, b, r, g, b);
    };

    for (const agent of this.agents) {
      const pos = agent.position;

      // Vecinos detectados (líneas grises/blancas)
      for (const neighbor of agent.debugData.neighbors) {
        addLine(pos, neighbor.position, 0.2, 0.2, 0.2);
      }

      // Velocidad (verde)
      const velEnd = pos.clone().add(agent.velocity.clone().multiplyScalar(2.0));
      addLine(pos, velEnd, 0, 1, 0);

      // Dirección del Flow Field (azul)
      const flowEnd = pos.clone().add(agent.debugData.flowForce.clone().multiplyScalar(20.0));
      addLine(pos, flowEnd, 0, 0, 1);

      // Steering combinado total (rojo)
      const steerEnd = pos.clone().add(agent.debugData.steeringForce.clone().multiplyScalar(20.0));
      addLine(pos, steerEnd, 1, 0, 0);
    }

    this.debugGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.debugGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.scene.remove(this.points);
    this.debugGeometry.dispose();
    this.debugLines.material.dispose();
    this.scene.remove(this.debugLines);
  }
}
