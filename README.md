# Contemplar lo infinito

Instrumento visual en tiempo real para interpretar el tema principal de *Interstellar*
(Hans Zimmer, versión Original Score de Imperial Orquesta).

Una intérprete escucha la música y, con pocos controles, modifica las condiciones de un
universo de agentes autónomos. Los agentes nunca se mueven por orden directa: perciben su
entorno inmediato y deciden su movimiento. Las formas que aparecen (grupos, corrientes,
filamentos, nubes, cuerpos) emergen de esas decisiones locales.

La pieza no representa el espacio. Busca transmitir **la sensación de contemplar algo inmenso
que no se puede comprender del todo**.

- **Sitio en vivo:** https://valengp2006.github.io/contemplar-lo-infinito/ (Chrome o Edge
  actualizado; necesita WebGPU).
- **Bitácora del proceso:** [`docs/bitacora.md`](docs/bitacora.md)
- **Evidencias (imágenes):** [`docs/evidencias/`](docs/evidencias/)
- **Especificación:** [`AGENTS.md`](AGENTS.md),
  [`docs/prototipo-1-especificacion.md`](docs/prototipo-1-especificacion.md),
  [`docs/funcionalidad-completa.md`](docs/funcionalidad-completa.md)

[![Clímax del ensayo grabado: filamentos violetas y un sistema de cuerpos](docs/evidencias/13-ensayo-climax.jpg)](docs/evidencias/ensayo-2026-10-01.mp4)

**▶ [Video de un ensayo completo](docs/evidencias/ensayo-2026-10-01.mp4)** (6:39, con la
música; 1 de octubre de 2026). Entre 5:00 y 5:05 aparece por accidente el menú de emojis de
macOS: es un error de la grabación, no de la obra.

---

## Cómo ejecutarlo

```bash
npm install
npm run dev          # abre http://localhost:5173 en Chrome
npm run build        # versión para publicar (dist/)
npm run gpu-check    # banco de pruebas: ejecuta los shaders reales y genera una imagen
```

Variantes del banco de pruebas: `N=20000 npm run gpu-check` (cantidad fija de agentes) y
`LEVEL=4 npm run gpu-check` (un nivel de REVELACIÓN). La imagen queda en
`tools/out/gpu-check.png`.

## Controles

**Interpretación.** Ningún control mueve una partícula: todos modifican el **entorno**, y los
agentes lo perciben.

| Control | Entrada | Qué cambia del entorno | Significado |
|---|---|---|---|
| RUMBO local | Mover el mouse | Curva y gira la corriente cerca del recorrido; se relaja en ~2 s | Viaje |
| RUMBO global | Rueda o dos dedos | Gira la deriva lenta de todo el campo | Transformación |
| ATRACCIÓN | Mantener clic | Crea un pozo suave que crece mientras se mantiene | Búsqueda, deseo |
| MEMORIA | ↑ / ↓ | Persistencia de la huella Physarum (0,4–25 s) | Recuerdo, nostalgia |
| PULSO | Barra espaciadora | Una onda anular que cruza la pantalla en ~6 s | Tiempo, pérdida |
| REVELACIÓN | R / Shift+R | Nivel de complejidad 0–4, con transición de ~15 s | Descubrimiento |
| CUERPO | 4 | Un centro de gravedad invisible en el cursor; los agentes forman un núcleo | Materia que se reúne |
| SISTEMA | 5 | Los cuerpos sueltos se reúnen y se orbitan | Relación, órbita |
| DISOLVER | 6 (también 1–3) | Los cuerpos estallan: un empujón hacia afuera y su materia vuelve al polvo | Desaparición |
| FINAL | E | Descenso de ~40 s hasta un único punto de luz | Despertar |

**Sesión:**
- clic en la pantalla de inicio: comienza la pieza y la música;
- F: pantalla completa;
- P: pausa la música y la simulación.

**Desarrollo** (no se usan al presentar):
- M: modo desarrollo, con métricas y panel de ajuste;
- T: muestra u oculta el panel;
- D: muestra los fps;
- 1–3: fijan la cantidad de agentes.

En modo performance el cursor no se ve y solo aparece, tenue, el nombre del control usado.

## Score de interpretación

Es una guía de ensayo, no una sincronización: **el sistema nunca analiza la música**.

| Sección musical | Nivel | Acciones |
|---|---|---|
| Inicio, calma | 0 | No tocar, o RUMBO mínimo |
| Primer crecimiento, curiosidad | 1 | R; mover el mouse suavemente |
| Emergencia, asombro | 2 | R; primeros CUERPOS (4) |
| Cambio de dirección, nostalgia | 2 → 3 | MEMORIA ↑ (las huellas persisten); reunir los cuerpos en un SISTEMA (5) |
| Aumento de intensidad, emoción | 3 | R; ATRACCIÓN y RUMBO |
| El pulso | 3 | PULSO con la barra espaciadora, al ritmo que decido al escuchar |
| Clímax, sobrecogimiento | 4 | R; combinar RUMBO, ATRACCIÓN y MEMORIA |
| Descenso, contemplación | 4 → 0 | Shift+R escalonado, DISOLVER (6) y soltar controles |
| Final | 0 | E: queda un único punto de luz |

## Cómo funciona

**Cada agente** tiene posición, velocidad, velocidad máxima y fuerza máxima, con una
variación individual de ±15 %. Además tiene una "cercanía" fija que da profundidad sin 3D:
casi todos son polvo lejano, pequeño, tenue y más lento.

**Qué percibe un agente.** Solo su entorno inmediato; nunca conoce el universo completo:

1. la dirección del **flow field** en su posición: corrientes sin sumideros que evolucionan,
   más la deriva global y la perturbación del mouse;
2. la **densidad** y la **velocidad media** de sus vecinos, en un radio de ~6 % del alto de la
   pantalla;
3. la **huella Physarum**, con tres sensores (izquierda, centro, derecha);
4. si está dentro de un **pozo de atracción**, de un **cuerpo** o del frente de un **pulso**.

**Cómo calcula su acción.** Cada regla produce una fuerza de steering de Reynolds:
*velocidad deseada − velocidad actual*, limitada por la fuerza máxima.

| Regla | Velocidad deseada |
|---|---|
| Flow field | La dirección de la corriente |
| Alineación | La velocidad media de los vecinos |
| Cohesión | Hacia donde hay más vecinos (subir por el gradiente de densidad) |
| Separación | Alejarse si la zona supera 1,5 veces la densidad media |
| Physarum | Girar hacia el sensor con más huella |
| Atracción y cuerpos | Hacia el centro, curvándose; dentro del núcleo, asentarse |
| Wander | Una dirección propia que cambia lentamente (incertidumbre individual) |

Las fuerzas se suman, se limitan y se integran: **fuerza → aceleración → velocidad →
posición**. Por eso los agentes se curvan y nunca giran de golpe. Después, cada agente deja
una huella en el mapa de memoria, que se difunde y se desvanece según la MEMORIA.

**Cadena de comportamiento:** flow field (rumbo del universo) → flocking (conexión) →
steering (decisiones) → Physarum (memoria). Así, los cuatro algoritmos forman una sola
cadena y no cuatro efectos separados.

**Decisión técnica.** El flocking no compara cada agente con cada vecino. Los agentes
depositan su presencia y su velocidad en un mapa (una rejilla suave), y cada uno lee ese mapa
a su alrededor, descontando su propia contribución. Esto permite cientos de miles de agentes
en tiempo real. Todo corre en la GPU con WebGPU y Three.js 0.185.1, en 7 programas de
cómputo por cuadro. El código está en `src/` (estructura en `AGENTS.md`, sección 23).

## Limitaciones conocidas

- **Requiere WebGPU** (Chrome o Edge actualizados). No hay alternativa en WebGL, por decisión
  del proyecto.
- **Bordes:** las corrientes no empalman donde el espacio se envuelve, y entre 5 % y 7 % de
  los agentes quedan cerca de los bordes. En los ensayos fue un defecto pequeño que se integró
  en la interpretación.
- **Física simplificada a propósito:** los cuerpos celestes son centros de gravedad
  invisibles que mueve el instrumento, no una simulación física.

## Créditos

- **Concepto, diseño, dirección visual e interpretación:** Valentina Garzón Pérez.
- **Implementación:** asistida por agentes de código (Claude), con las decisiones de diseño
  tomadas por la autora. El proceso está documentado en la [bitácora](docs/bitacora.md).
- **Música:** tema principal de *Interstellar* (Hans Zimmer), versión Original Score de
  Imperial Orquesta. Uso académico.
- **Tecnología:** [Three.js](https://threejs.org/) 0.185.1 (WebGPU, TSL) y
  [Vite](https://vite.dev/).
