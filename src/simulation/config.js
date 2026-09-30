/**
 * CONFIG — centralized parameters for the simulation.
 *
 * All weights and limits live here so they are easy to find and tweak.
 * The lab panel reads and writes these values in real time.
 */
export const CONFIG = {
  // --- Agents ---
  agentCount: 800,
  maxSpeed: 2.0,
  maxForce: 0.05,
  perceptionRadius: 2.5,

  // --- Force weights ---
  flowWeight: 1.0,
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,

  // --- Flow field ---
  flowScale: 0.3,      // noise sample scale (smaller = wider currents)
  flowSpeed: 0.05,     // temporal evolution speed

  // --- Render ---
  particleSize: 3.0,
  particleOpacity: 0.7,

  // --- World ---
  bounds: 12,          // half-extent of the world on each axis
};
