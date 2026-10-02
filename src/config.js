/**
 * Contemplar lo infinito — configuración central.
 *
 * Unidades del mundo: ALTO de la pantalla = 1; ANCHO = relación de aspecto.
 * Velocidades en unidades/segundo, fuerzas en unidades/segundo², tiempos en segundos.
 * Todos estos valores son iniciales: se calibran mirando la pantalla
 * (modo desarrollo: tecla M; "copiar valores" los deja listos para pegar aquí).
 */
const config = {
  // ── Agentes ──────────────────────────────────────────────────
  MAX_AGENTS: 200_000,        // reserva en GPU (N_max)
  AGENT_PRESETS: { 1: 300, 2: 3_000, 3: 20_000 },   // teclas 1–3: cantidad fija (y dispersan los cuerpos)
  PANEL_COUNTS: [300, 3_000, 20_000, 80_000, 200_000],  // botones de cantidad del panel
  COUNT_EASE_S: 1.5,          // la cantidad de agentes se acerca a su objetivo en este tiempo
  FADE_S: 2.0,                // cada agente aparece / desaparece con un fundido de este tiempo

  // ── Movimiento ───────────────────────────────────────────────
  MAX_SPEED: 0.035,           // corriente lenta
  MAX_FORCE: 0.030,           // fuerza máxima de steering (u/s²)
  VARIATION: 0.15,            // ±15 % por agente en velocidad máxima y fuerza máxima ("masa aparente")
  FORCE_CAP: 1.5,             // tope de la fuerza total (× MAX_FORCE)
  DEPTH_SPEED: [0.7, 1.1],    // los agentes lejanos se mueven más lento que los cercanos (paralaje)

  // ── Percepción y flocking (pesos con REVELACIÓN al máximo) ───
  PERCEPTION_RADIUS: 0.06,
  CROWD_FACTOR: 1.5,          // presión de separación cuando una zona supera N × la densidad media
  CROWD_MIN: 4,               // piso (agentes por celda) para cuando hay muy pocos agentes
  PRESENCE_N: 3,              // vecinos necesarios para que cohesión/alineación actúen a pleno
  W_SEPARATION: 1.2,
  W_ALIGNMENT: 1.0,
  W_COHESION: 0.3,
  W_WANDER: 0.25,

  // ── Rejilla de flocking ──────────────────────────────────────
  MAX_CELLS: 4096,
  FIXED_POINT_SCALE: 4096,    // atómicos enteros (i32) en punto fijo

  // ── Flow field (ruido tipo "curl": corrientes sin sumideros) ──
  W_FLOW: 0.9,
  FLOW_SCALE: 1.6,            // frecuencia espacial del ruido (menor = corrientes más grandes)
  FLOW_SPEED: 0.03,           // evolución temporal (nunca se repite)
  FLOW_GAIN: 0.35,            // intensidad del campo
  FLOW_OCTAVES: [1.0, 0.45, 0.2, 0.09, 0.04],  // la REVELACIÓN enciende de 1 a 5

  // ── RUMBO global (rueda / dos dedos): una deriva lenta de todo el campo ──
  DRIFT: 0.3,                 // fuerza de la deriva (en unidades del campo)
  DRIFT_WHEEL: 0.004,         // radianes por píxel de rueda
  DRIFT_EASE_S: 1.2,          // la dirección gira suavemente hacia la nueva

  // ── RUMBO local (mouse): perturba el entorno, nunca mueve partículas ──
  MOUSE_MAP_RES: 128,
  MOUSE_RADIUS: 0.15,
  MOUSE_STRENGTH: 3.5,
  MOUSE_SWIRL: 0.5,
  MOUSE_DECAY: 1.5,           // 1/s → relajación en ~2 s
  MOUSE_WEIGHT: 1.0,
  MOUSE_SMOOTH_MS: 120,       // suavizado de la velocidad del mouse
  MOUSE_MAX: 1.4,             // magnitud máxima acumulada en el mapa

  // ── ATRACCIÓN (mantener clic): un pozo suave en el cursor ────
  ATTRACT_RADIUS: 0.18,
  ATTRACT_RISE_S: 1.2,        // crece mientras se mantiene
  ATTRACT_RELEASE_S: 2.0,     // se libera al soltar
  W_ATTRACT: 1.2,
  ATTRACT_COHESION: 1.5,      // refuerzo de la cohesión local dentro del pozo

  // ── CUERPOS CELESTES (teclas 4, 5 y 6) ───────────────────────
  // Un cuerpo es un centro de gravedad invisible: los agentes lo perciben y lo construyen.
  // 4 = un cuerpo en el cursor · 5 = un sistema de cuerpos que se orbitan · 6 = disolver todos.
  BODY_MAX: 6,                // cuerpos simultáneos
  BODY_RADIUS: 0.16,          // radio de influencia de un cuerpo
  BODY_GROW_S: 4,             // tiempo en formarse
  BODY_LIFE_S: 30,            // a partir de aquí se disuelve solo
  BODY_RELEASE_S: 7,          // tiempo en disolverse (la materia vuelve al polvo)
  W_BODY: 1.6,
  BODY_SPIN: 0.6,             // giro de la materia alrededor del núcleo
  BODY_COHESION: 2.0,         // refuerzo de la cohesión dentro del cuerpo
  BODY_CORE: 0.35,            // tamaño del núcleo (fracción del radio): dentro, la materia deja de caer y gira
  BODY_RELAX: 0.5,            // cuánto se relaja la presión de separación dentro del cuerpo
  SYSTEM_BODIES: 3,           // cuerpos de un sistema
  SYSTEM_RADIUS: 0.09,        // distancia de cada cuerpo al centro del sistema
  SYSTEM_BODY_RADIUS: 0.11,
  SYSTEM_ORBIT: 0.25,         // radianes por segundo

  // ── PULSO (barra espaciadora): una onda anular ───────────────
  PULSE_CROSS_S: 6,           // tiempo en cruzar la pantalla
  PULSE_WIDTH: 0.06,          // ancho del frente
  PULSE_FORCE: 3.0,           // impulso radial (× MAX_FORCE)
  PULSE_DEFLECT: 0.6,         // desvío lateral (fracción del impulso)
  PULSE_SPEEDUP: 0.8,         // margen extra de velocidad mientras dura la perturbación
  PULSE_MAX: 4,               // ondas simultáneas
  PULSE_CALM_HOLD_S: 1.5,     // tras ser alcanzados, la cohesión baja este tiempo...
  PULSE_CALM_RECOVER_S: 4.0,  // ...y luego se recupera en este

  // ── Physarum (MEMORIA) ───────────────────────────────────────
  TRAIL_HEIGHT: 720,          // resolución vertical del mapa de huellas (el ancho sigue la pantalla)
  TRAIL_MAX_WIDTH: 1920,
  TRAIL_FIXED_SCALE: 65536,   // atómicos enteros para el depósito
  DEPOSIT_RATE: 1.0,          // huella por agente por segundo (× nivel)
  TRAIL_DIFFUSE: 3.0,         // velocidad de difusión (1/s)
  SENSOR_ANGLE: 0.5,          // radianes (~30°)
  SENSOR_DIST: 0.025,
  W_SENSOR: 0.6,
  MEMORY_MIN_S: 0.4,          // vida media de la huella (MEMORIA)
  MEMORY_MAX_S: 25,
  MEMORY_DEFAULT_S: 3,
  MEMORY_RATE: 0.35,          // velocidad de cambio con las flechas (fracción del rango por segundo)
  // La huella se ve con más o menos fuerza según la MEMORIA: se mide respecto a la vida media
  // por defecto, así una memoria larga acumula redes brillantes y una corta casi no deja rastro.
  TRAIL_VISIBILITY: 1.0,      // brillo del mapa de huellas

  // ── REVELACIÓN: niveles 0..4 (se interpola entre ellos) ──────
  // Los pesos de flocking son FACTORES sobre los valores de arriba (nivel 4 = 1).
  LEVEL_EASE_S: 5,            // ≈ 15 s para completar el cambio de nivel
  LEVELS: {
    agents:     [300, 3_000, 20_000, 80_000, 200_000],
    octaves:    [1, 2, 3, 4, 5],
    scale:      [1.35, 1.15, 1, 0.82, 0.65],   // × FLOW_SCALE: estructuras cada vez más grandes
    separation: [0.83, 1, 1, 1, 1],
    alignment:  [0.2, 0.6, 1, 1, 1],
    cohesion:   [0.15, 0.55, 0.85, 1, 1],
    sensor:     [0, 0.1, 0.35, 0.7, 1],
    deposit:    [0.12, 0.25, 0.5, 0.8, 1],      // en 0 apenas: estelas tenues si se sube la MEMORIA
    brightness: [0.45, 0.6, 0.75, 0.9, 1.15],
    color:      [0, 0.15, 0.35, 0.65, 1],
    bloom:      [0, 0.05, 0.2, 0.45, 0.85],
    speed:      [1, 1, 1, 1.15, 1.15],
  },

  // ── FINAL (tecla E) ──────────────────────────────────────────
  FINAL_S: 40,

  // ── Render ───────────────────────────────────────────────────
  BACKGROUND: 0x05060d,
  POINT_PX: 3.0,              // tamaño en píxeles CSS (con LIGHT_REF_AGENTS agentes)
  BRIGHTNESS: 0.7,            // brillo base (con LIGHT_REF_AGENTS agentes y nivel 4)
  DEPTH_SIZE: [0.55, 1.6],    // tamaño lejano / cercano (sensación de profundidad)
  DEPTH_BRIGHT: [0.5, 1.0],   // brillo lejano / cercano
  NEAR_EXPONENT: 2.5,         // mayor = menos agentes cercanos (casi todo es polvo lejano)
  // Compensación por cantidad: con más agentes cada punto es más tenue y fino, para que
  // más agentes se lean como materia más fina y no como más luz. Nunca supera la base.
  LIGHT_REF_AGENTS: 5_000,
  LIGHT_EXPONENT: 0.4,        // brillo × (N / ref)^-exp   (0 = sin compensar)
  SIZE_EXPONENT: 0.15,        // tamaño × (N / ref)^-exp
  MIN_POINT_PX: 1.4,
  LIGHT_EASE_S: 1.5,
  COLOR_GAIN: 1.0,            // multiplicador global del color (× nivel)
  BLOOM_GAIN: 1.0,            // multiplicador global del resplandor (× nivel)
  BLOOM_RADIUS: 0.4,
  BLOOM_THRESHOLD: 0.05,
  MAX_DPR: 2,

  // Paleta (sección 17 de AGENTS.md): cambia la CANTIDAD de color, no los colores
  PALETTE: {
    warm: [1.0, 0.95, 0.88],     // blanco cálido
    cold: [0.62, 0.74, 1.0],     // azul frío
    violet: [0.66, 0.45, 1.0],
    magenta: [1.0, 0.36, 0.78],
    gold: [1.0, 0.8, 0.45],
    trailBlue: [0.18, 0.32, 0.85],
  },

  // ── Tiempo ───────────────────────────────────────────────────
  MAX_DT: 1 / 30,

  // ── Interfaz y música ────────────────────────────────────────
  START_MODE: 'performance',  // 'performance' (pantalla limpia) o 'dev'; ?modo=dev en la URL lo fuerza
  HUD_SHOW_S: 3,              // el nombre del control se ve este tiempo
  METRICS_GRAPH_SECONDS: 5,   // segundos visibles en la gráfica de tiempo por cuadro
  MUSIC_VOLUME: 1.0,
};

export default config;
