/**
 * Contemplar lo infinito — Configuración central
 *
 * TODOS los parámetros numéricos del sistema viven aquí.
 * Unidades: alto de pantalla = 1; ancho = relación de aspecto.
 * Velocidades en unidades / segundo.
 */

const config = {
  // ── Mundo ────────────────────────────────────────────────────
  // El alto siempre es 1. El ancho se calcula al arrancar.
  WORLD_HEIGHT: 1,

  // ── Agentes ──────────────────────────────────────────────────
  AGENT_COUNT: 5_000,           // por defecto al arrancar
  MAX_AGENTS: 200_000,          // tope absoluto (N_max)

  // ── Movimiento (unidades / segundo) ──────────────────────────
  MAX_SPEED: 0.035,             // corriente lenta
  MAX_FORCE: 0.012,             // fuerza de steering limitada
  AGENT_VARIATION: 0.15,        // ±15 % en velocidad máx y radio

  // ── Flocking ─────────────────────────────────────────────────
  PERCEPTION_RADIUS: 0.045,     // radio de percepción (= tamaño de celda)
  SEPARATION_WEIGHT: 1.0,
  ALIGNMENT_WEIGHT: 0.2,
  COHESION_WEIGHT: 0.1,

  // ── Wander ───────────────────────────────────────────────────
  WANDER_STRENGTH: 0.004,
  WANDER_RATE: 0.6,             // velocidad de cambio del ángulo wander

  // ── Flow field ───────────────────────────────────────────────
  FLOW_FIELD_RESOLUTION: 128,   // texels por eje
  FLOW_FIELD_SCALE: 3.0,        // escala del noise
  FLOW_FIELD_SPEED: 0.015,      // velocidad de evolución temporal
  FLOW_FIELD_OCTAVES: 1,        // octavas de noise (nivel 0)
  FLOW_FIELD_WEIGHT: 0.5,       // peso en el steering

  // ── Mouse ────────────────────────────────────────────────────
  MOUSE_INFLUENCE_RADIUS: 0.15, // ~15 % del alto
  MOUSE_INFLUENCE_STRENGTH: 0.8,
  MOUSE_DECAY_RATE: 2.0,        // 1/s — decaimiento exponencial (~2 s)
  MOUSE_MAP_RESOLUTION: 128,    // resolución del mapa de influencia

  // ── Renderizado ──────────────────────────────────────────────
  BACKGROUND_COLOR: 0x05060d,
  PARTICLE_COLOR_R: 1.0,
  PARTICLE_COLOR_G: 0.96,
  PARTICLE_COLOR_B: 0.90,       // ≈ #fff5e6 blanco cálido
  PARTICLE_SIZE_MIN: 2.0,       // CSS-px
  PARTICLE_SIZE_MAX: 4.0,       // CSS-px
  PARTICLE_CORE_RADIUS: 0.3,    // fracción del radio con brillo pleno
  MAX_DPR: 2,

  // ── Tiempo ───────────────────────────────────────────────────
  MAX_DT: 1 / 30,               // dt máximo para estabilidad

  // ── Punto fijo para atómicos en flocking ─────────────────────
  // Escala i32. Con 200 k agentes en una celda de tamaño 0.045,
  // contribución máx por agente ≈ 0.0225 * 4096 ≈ 92.
  // Suma máx = 200 000 × 92 = 18.4 M  ≪  2^31 (2.15 × 10^9).
  // Margen: ×116.
  FIXED_POINT_SCALE: 4096,

  // ── Separación ───────────────────────────────────────────────
  SEPARATION_RADIUS_FACTOR: 0.35, // fracción del perception_radius
};

export default config;
