# CLAUDE.md — Contemplar lo infinito

Antes de trabajar, lee completos `AGENTS.md`, `docs/prototipo-1-especificacion.md`
y `docs/funcionalidad-completa.md`. Son la fuente de verdad del proyecto.
`AGENTS.md` dice en qué fase estamos y cómo está construido el código.

## Reglas de trabajo

- Responde en español y en lenguaje simple: la autora es diseñadora, no programadora gráfica.
- Arquitectura aprobada: WebGPU + Three.js 0.185.1 (`three/webgpu`, `three/tsl`),
  simulación 100 % en GPU. Confirma nombres de la API en `node_modules/three` antes de usarlos.
- Máximo 8 storage buffers por shader (límite por defecto de WebGPU). Atómicos solo enteros
  y siempre con `.toAtomic()`.
- Nunca analizar el audio. Ningún control mueve una partícula directamente.
  Todos los parámetros en `src/config.js`. Cambios siempre suaves.
- No tomes decisiones técnicas grandes ni borres archivos sin preguntar.

## Verificación obligatoria antes de dar algo por terminado

1. `npm run build` sin errores.
2. `npm run gpu-check` (y `N=20000 npm run gpu-check`) sin errores de GPU ni valores inválidos.
   Revisa la imagen `tools/out/gpu-check.png`.
3. Di con claridad qué verificaste y qué NO (los fps reales y la sensación visual solo los
   puede juzgar la autora en Chrome).

## Al terminar un avance

Actualiza en `AGENTS.md` el "Estado del proyecto", el "Registro de cambios" y la sección 23
si cambió la estructura. Haz commit con un mensaje claro en español y push a `main`
solo cuando la autora lo apruebe.
