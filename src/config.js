/**
 * Contemplar lo infinito — configuración central.
 *
 * Unidades del mundo: ALTO de la pantalla = 1; ANCHO = relación de aspecto.
 * Velocidades en unidades/segundo, fuerzas en unidades/segundo².
 * Todos estos valores son iniciales: se calibran mirando la pantalla
 * (tecla T abre el panel de ajuste).
 */
const config = {
  // ── Agentes ──────────────────────────────────────────────────
  MAX_AGENTS: 200_000,        // reserva en GPU (N_max)
  DEFAULT_AGENTS: 5_000,      // cantidad al arrancar
  AGENT_PRESETS: { 1: 300, 2: 3_000, 3: 20_000, 4: 80_000, 5: 200_000 },

  // ── Movimiento ───────────────────────────────────────────────
  MAX_SPEED: 0.035,           // corriente lenta
  MAX_FORCE: 0.030,           // fuerza máxima de steering (u/s²)
  VARIATION: 0.15,            // ±15 % por agente (velocidad y percepción)
  FORCE_CAP: 1.5,             // tope de la fuerza total (× MAX_FORCE)

  // ── Percepción y flocking ────────────────────────────────────
  PERCEPTION_RADIUS: 0.06,
  CROWD_LIMIT: 30,            // agentes por celda a partir de los cuales hay presión de separación
  PRESENCE_N: 3,              // vecinos necesarios para que cohesión/alineación actúen a pleno
  W_SEPARATION: 1.2,
  W_ALIGNMENT: 1.0,
  W_COHESION: 0.6,
  W_WANDER: 0.25,

  // ── Flow field (ruido tipo "curl": corrientes sin sumideros) ──
  W_FLOW: 0.9,
  FLOW_SCALE: 2.2,            // frecuencia espacial del ruido
  FLOW_SPEED: 0.03,           // evolución temporal (nunca se repite)
  FLOW_GAIN: 0.35,            // intensidad del campo
  FLOW_OCTAVES: [1.0, 0.45, 0.2, 0.09],

  // ── Mouse: perturba el entorno, nunca mueve partículas ───────
  MOUSE_MAP_RES: 128,
  MOUSE_RADIUS: 0.14,
  MOUSE_STRENGTH: 3.5,
  MOUSE_SWIRL: 0.5,
  MOUSE_DECAY: 1.5,           // 1/s → relajación en ~2 s
  MOUSE_WEIGHT: 1.0,
  MOUSE_SMOOTH_MS: 120,       // suavizado de la velocidad del mouse
  MOUSE_MAX: 1.4,             // magnitud máxima acumulada en el mapa

  // ── Rejilla de flocking ──────────────────────────────────────
  MAX_CELLS: 4096,
  FIXED_POINT_SCALE: 4096,    // atómicos enteros (i32) en punto fijo

  // ── Render ───────────────────────────────────────────────────
  BACKGROUND: 0x05060d,
  PARTICLE_COLOR: [1.0, 0.95, 0.88],   // blanco cálido
  POINT_PX: 3.0,              // tamaño en píxeles CSS
  BRIGHTNESS: 0.55,
  MAX_DPR: 2,

  // ── Tiempo ───────────────────────────────────────────────────
  MAX_DT: 1 / 30,

  // ── Interfaz y música ────────────────────────────────────────
  START_MODE: 'performance',  // 'performance' (pantalla limpia) o 'dev'; ?modo=dev en la URL lo fuerza
  CURSOR_HIDE_MS: 3000,       // en performance el cursor se oculta tras este tiempo quieto
  METRICS_GRAPH_SECONDS: 5,   // segundos visibles en la gráfica de tiempo por cuadro
  MUSIC_VOLUME: 1.0,
};

export default config;
