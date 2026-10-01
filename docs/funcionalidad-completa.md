# FUNCIONALIDAD COMPLETA — Contemplar lo infinito

## 0. Alcance de este documento

- Complementa `docs/prototipo-1-especificacion.md`, que sigue mandando sobre
  la CALIDAD del comportamiento del núcleo (agentes, flow field, flocking,
  steering, respuesta al mouse, velocidad lenta, vacío, emergencia).
- Este documento define el alcance funcional completo del prototipo casi
  final: arranque, controles, niveles de revelación, memoria (Physarum),
  pulso, atracción, final, HUD, audio y rendimiento.
- El color, el bloom y el HUD entran en el Hito C. El núcleo se construye
  primero en blanco cálido (ver sección 12).
- Los valores numéricos son INICIALES y se calibran viendo la pantalla.
  Todos viven en `config`. Si algo no está definido aquí ni en AGENTS.md,
  preguntar a la autora antes de decidir.

## 1. Principios que no se rompen

1. Ningún control mueve una partícula directamente. Cada control modifica
   el ENTORNO (campo de flujo, campo de atracción, onda, persistencia de la
   huella, nivel de complejidad) y los agentes lo perciben localmente.
2. La música no se analiza. El audio solo se reproduce con `<audio>`.
3. Todo cambio es suave (interpolación exponencial). Sin saltos bruscos.

## 2. Sesión y arranque

| Elemento | Definición |
|---|---|
| Pantalla de inicio | Fondo `#05060d`, texto discreto "CONTEMPLAR LO INFINITO — clic para comenzar". |
| Clic de inicio | Inicia el audio (`public/audio/interstellar.mp3`) y el sistema. Si el audio no existe, funciona en silencio con un aviso en consola. |
| Tecla F | Pantalla completa (alternar). |
| Tecla P | Pausa/reanuda audio y simulación. |
| Tecla D | Muestra/oculta contador de fps (oculto por defecto). |
| Cursor | Se oculta tras 3 s sin moverse en pantalla completa. |
| Sin WebGPU | Aviso discreto con texto simple. No intentar otro renderer. |

## 3. Controles

| Control | Entrada | Qué modifica del entorno | Cómo responden los agentes |
|---|---|---|---|
| RUMBO | Mover el mouse (local) y rueda / dos dedos (global) | Mouse: curva y gira el flow field cerca del cursor según su velocidad (radio ~15 % del alto), el efecto se relaja en ~2 s al detenerse. Rueda: rota suavemente la dirección global del campo. | Perciben la nueva dirección donde están y cambian su steering; el cambio se propaga por los vecinos (flocking). |
| ATRACCIÓN | Mantener clic izquierdo | Crea un pozo suave de atracción en el cursor. Radio ~18 % del alto, caída con la distancia, fuerza crece durante ~1.2 s de mantener y se libera en ~2 s. | Solo los agentes dentro del radio lo perciben; aplican seek limitado por su fuerza máxima y refuerzan cohesión local. No se mueven directamente al cursor. |
| MEMORIA | Flechas ↑ / ↓ (continuo mientras se mantienen) | Persistencia de la huella Physarum: vida media entre ~0.4 s y ~25 s (escala logarítmica, por defecto ~3 s). | Los sensores leen huellas más o menos persistentes. |
| PULSO | Barra espaciadora | Onda anular que nace en el cursor (o en el centro si el cursor no está en pantalla). | Ver sección 6. |
| REVELACIÓN | Tecla R (sube nivel) / Shift+R (baja nivel) | Nivel global de complejidad 0 a 4. | Ver sección 4. |
| FINAL | Tecla E | Desvanecimiento gradual hasta el vacío. | Ver sección 8. |

Los controles se pueden combinar. Mientras no se tocan, el sistema sigue
vivo y los valores de RUMBO local y ATRACCIÓN vuelven solos a neutro;
MEMORIA y el nivel de REVELACIÓN se mantienen donde se dejaron.

## 4. REVELACIÓN por niveles

R sube un nivel; Shift+R baja uno. La transición entre niveles dura ~15 s
con suavizado exponencial (configurable). La revelación debe sentirse
gradual, nunca como una explosión.

| Nivel | Estado visual | Agentes activos | Octavas del flow | Pesos flocking (sep / ali / coh) | Peso de sensores Physarum | Depósito | Brillo | Color | Bloom |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Vacío, pequeñas presencias | ~300 | 1 | 1.0 / 0.2 / 0.1 | 0 | 0 | 0.35 | 0 | 0 |
| 1 | Curiosidad, primeros grupos | ~3.000 | 2 | 1.2 / 0.6 / 0.4 | 0.10 | 0.2 | 0.50 | 0.10 | 0 |
| 2 | Corrientes, asombro | ~20.000 | 3 | 1.2 / 1.0 / 0.6 | 0.35 | 0.5 | 0.60 | 0.25 | 0.20 |
| 3 | Estructuras, emoción | ~80.000 | 4 | 1.2 / 1.0 / 0.7 | 0.70 | 0.8 | 0.75 | 0.50 | 0.35 |
| 4 | Inmensidad, clímax | hasta N_max (200.000) | 5 | 1.2 / 1.0 / 0.7 | 1.00 | 1.0 | 1.00 | 1.00 | 0.60 |

- N_max se define en `config`. Los agentes inactivos no se calculan ni se
  dibujan; se activan de forma escalonada, no todos a la vez.
- "Color" y "Bloom" son multiplicadores 0 a 1 que se aplican a la
  dirección visual de la sección 17 de AGENTS.md (Hito C).
- El nivel de velocidad máxima sube ~15 % entre nivel 2 y nivel 3 y se
  mantiene; sigue siendo "una corriente lenta en un espacio enorme".

## 5. Physarum (memoria visual)

Pipeline por frame, todo en GPU:
`agentes → depositan en el mapa → difusión (desenfoque 3×3) → decaimiento → los sensores leen el mapa`

- Mapa de huellas 2D con resolución ~ mitad del canvas (tope 1920×1080,
  configurable).
- Cada agente tiene tres sensores (izquierda, centro, derecha) con ángulo
  y distancia en `config`; el resultado se suma a su steering con el
  "peso de sensores" del nivel actual. En nivel 0 el efecto es nulo.
- Cadena de comportamiento: flow field → flocking → steering (incluye
  sensores) → huella. No son cuatro efectos independientes.
- Render del mapa: pantalla completa, rampa de intensidad (casi
  invisible con poca huella; azul con más; blanco cálido en las
  intersecciones fuertes), mezclado aditivo bajo las partículas.
- Los filamentos deben EMERGER; no dibujar ninguna forma.

## 6. PULSO

1. Nace una onda anular en el punto de origen.
2. Se expande hasta cubrir la pantalla en ~6 s; ancho del frente ~6 % del alto.
3. Los agentes que el frente atraviesa reciben una perturbación temporal:
   impulso radial hacia afuera + desvío de dirección, atenuado con la
   distancia al frente.
4. Durante ~1.5 s después de ser alcanzados baja su cohesión; luego se
   recupera en ~4 s: el sistema intenta reorganizarse.
5. Se permiten hasta 4 ondas simultáneas. La onda no se dibuja como un
   anillo: solo se ve por el efecto en los agentes (y un leve realce de
   brillo en el frente en el Hito C).

## 7. Calibración del núcleo (valores de partida)

- Velocidad máxima baja y fuerza máxima limitada; variación individual
  de ±15 % en velocidad máxima, radio de percepción y masa aparente.
- Radio de percepción local en `config`; si el flocking usa una cuadrícula
  de promedios, documentar en AGENTS.md en qué se diferencia de vecinos
  individuales.
- Bordes: el espacio se envuelve (toroidal) para no acumular agentes en
  los límites, salvo que se acuerde otra solución con la autora.

## 8. FINAL y "soltar controles"

- Soltar controles: ATRACCIÓN y RUMBO local vuelven solos a neutro; el
  sistema no se detiene.
- Tecla E (FINAL), dura ~40 s: baja el nivel gradualmente hasta 0, la
  vida media de la huella se reduce hasta apagar el mapa, el brillo y el
  color bajan, los agentes activos disminuyen escalonadamente. Termina
  con unos pocos puntos y luego un único punto blanco cálido sobre fondo
  oscuro, igual que el inicio.
- Tras el FINAL, R vuelve a empezar la pieza desde el nivel 0.

## 9. HUD mínimo (Hito C)

- Nada visible por defecto.
- Al interactuar aparece, con opacidad baja, el nombre del control usado
  (RUMBO, ATRACCIÓN, MEMORIA, PULSO, REVELACIÓN) en un borde de la
  pantalla y desaparece tras ~3 s.
- MEMORIA: pequeña barra delgada en el borde. REVELACIÓN: cinco puntos
  (nivel actual encendido).
- Sin sliders ni números técnicos. La explicación técnica queda en
  documentos.

## 10. Rendimiento

- Objetivo: 60 fps en pantalla completa en la Mac de la autora con N_max
  del nivel 4. Si no se logra, reportar el número real alcanzado y
  proponer N_max menor.
- Pixel ratio máximo 2.
- Se permite un guardián de calidad (no es análisis de audio): si el fps
  baja de 45 durante 5 s, reducir temporalmente el tope de agentes
  activos un 15 %; nunca superar el N_max configurado.

## 11. Mapa de interpretación (cómo se toca la pieza)

| Sección musical | Nivel | Acciones sugeridas |
|---|---|---|
| Inicio, calma | 0 | Sin tocar, o RUMBO mínimo |
| Primer crecimiento, curiosidad | 1 | R una vez; mover el mouse suavemente |
| Emergencia, asombro | 2 | R una vez más |
| Cambio de dirección, nostalgia | 2 a 3 | MEMORIA ↑ para dejar huellas persistentes |
| Aumento de intensidad, emoción | 3 | R; ATRACCIÓN y RUMBO |
| Pulso | 3 | PULSO con la barra espaciadora al ritmo que decida la intérprete |
| Clímax, sobrecogimiento | 4 | R; combinar RUMBO, ATRACCIÓN y MEMORIA |
| Descenso, contemplación | 4 a 0 | Shift+R escalonado y soltar controles |
| Final | 0 | E |

## 12. Orden de construcción

- Hito A — Núcleo: arranque, pantalla completa, agentes en GPU, flow field,
  flocking, steering, mouse sobre el flow field. Blanco cálido, sin color.
- Hito B — Memoria e interacción: Physarum, MEMORIA, ATRACCIÓN, PULSO y
  los niveles de REVELACIÓN.
- Hito C — Dirección visual y cierre: color (sección 17), bloom, HUD, audio,
  FINAL y guardián de rendimiento.

## 13. Fuera de alcance por ahora

Profundidad 3D real, análisis de audio de cualquier tipo, WebGL como
alternativa, grabación de video y múltiples pantallas.
