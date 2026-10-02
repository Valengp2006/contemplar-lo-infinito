# Bitácora de diseño e implementación — Contemplar lo infinito

Registro cronológico del proceso: qué se hizo, qué se decidió y por qué, qué falló y cómo se
verificó. Las imágenes están en [`docs/evidencias/`](evidencias/). Los códigos entre paréntesis
(por ejemplo `867469e`) son commits del repositorio y se pueden consultar en el historial de git.

---

## 2026-09-30 — Arranque

- Se crea el repositorio a partir de una plantilla del curso. De ella solo se conserva la
  infraestructura: Vite, `index.html`, el despliegue automático a GitHub Pages y la dependencia
  de Three.js.
- Primer intento de agentes con flocking y flow field (`8d217e3`, `787e1eb`).

## 2026-10-01 (mañana) — Dirección visual y reinicio

- **Dirección visual.** Se arma un tablero de referentes: partículas luminosas sobre fondo
  negro, estelas, redes de filamentos azules y concentraciones. Se toma el *material*, no los
  objetos: nada de planetas ni galaxias reconocibles (`AGENTS.md` §16b).
- **Paleta.** Se decide que el violeta y el magenta estén presentes desde el inicio. La paleta
  no cambia de colores a lo largo de la pieza: cambian la **cantidad** y la **intensidad** del
  color, siguiendo el arco emocional (`bcf2d6e`, `AGENTS.md` §17).
- **Reinicio.** Se descarta el prototipo anterior y se deja solo la infraestructura
  (`ea5e2b0`). Fase 0: una única partícula luminosa suave sobre fondo oscuro (`ca7039e`).

## 2026-10-01 (tarde) — Especificación y arquitectura

- Se escriben los dos documentos que guían el resto del trabajo:
  - [`prototipo-1-especificacion.md`](prototipo-1-especificacion.md): manda sobre la
    **calidad** del núcleo (vacío, lentitud, percepción local, "onda de comportamiento").
  - [`funcionalidad-completa.md`](funcionalidad-completa.md): define el **alcance**
    (controles, niveles de REVELACIÓN, Physarum, pulso, final, HUD, rendimiento y orden de
    hitos A → B → C).
- **Decisión de arquitectura: WebGPU + Three.js 0.185.1, con toda la simulación en la GPU.**
  Motivo: las redes de filamentos de los referentes necesitan del orden de cientos de miles
  de agentes, algo inalcanzable calculando en la CPU.
- **Hito A, primer intento** (`e2cdbcd`). El navegador lanzaba errores de validación de la
  GPU. Tres correcciones sucesivas (`c3cc323`, `be25e52`, `45f61eb`) no los resolvieron.
- **Hito A reescrito desde cero** (`867469e`). Hubo dos sospechosos en el código anterior:
  atómicos sobre buffers no marcados como atómicos y más de 8 buffers por shader, que es el
  límite de WebGPU. La reescritura usa como máximo 5 buffers por shader y atómicos declarados
  correctamente.
- Se crea un **banco de pruebas** (`tools/gpu-check.mjs`) que ejecuta los shaders reales
  fuera del navegador y reporta errores de GPU, valores inválidos (NaN), estadísticas y una
  imagen. Desde entonces, cada cambio se verifica con él.

## 2026-10-01 (noche) — Verificación, interfaz, calibración e Hitos B y C

### 1. Verificación del Hito A en la GPU de la Mac

- El build y el banco de pruebas pasan sin errores con 5.000 y 20.000 agentes, en la GPU real
  (Apple Metal). Evidencia: [`00-hito-a-5000.png`](evidencias/00-hito-a-5000.png).
- **Análisis de riesgos** comparando el código con la especificación. Cada sospecha se
  comprobó con un experimento:

| Sospecha | Experimento | Resultado |
|---|---|---|
| La cohesión funciona como freno: los grupos tienden a detenerse | Apagar la cohesión | La velocidad media sube de 0,0089 a 0,0125 (+40 %). Confirmado. |
| Las corrientes no empalman donde el espacio se "envuelve" | Dejar solo el flow field | 18,5 % de los agentes en los bordes, cuando lo esperado es ~4 % ([`11`](evidencias/11-prueba-bordes-solo-flow.png)). Confirmado; sigue pendiente. |
| El flocking cambia según la cantidad de agentes, porque el límite de apiñamiento es fijo | Imágenes con 5.000 y 20.000 | Hilos finos con 5.000 y textura pareja con 20.000. Confirmado. |

### 2. Música e interfaz en dos modos

- La autora agrega la música (`a50c9ca`). Se reproduce con un `<audio>` y **nunca se
  analiza**.
- Se crean dos interfaces (`55c3e0e`):
  - **Performance:** pantalla limpia.
  - **Desarrollo:** métricas, gráfica del tiempo por cuadro y todos los controles.
- **Problema:** la autora no podía apagar la música. **Causa:** sonaba desde la pestaña de
  pruebas del agente. **Decisión:** la música solo suena mientras la pestaña está visible.

### 3. Primera revisión de la autora en Chrome

- La pantalla corre a 120 fps con cualquier cantidad de agentes: es el tope de la pantalla, y
  el rendimiento no limita las decisiones visuales.
- **Problema:** con 80.000 y 200.000 agentes la pantalla se satura. *"Debe sentirse como un
  espacio exterior vivo que respira"* ([`01`](evidencias/01-saturacion-200k-antes.jpg)).
- **Causas:** cada agente suma la misma luz, y el límite de apiñamiento fijo hace que todas
  las zonas estén "llenas". Además, la rejilla interna se hacía visible como líneas
  verticales.
- **Cambios:**
  - apiñamiento **relativo a la densidad media**;
  - **compensación de luz y tamaño** según la cantidad;
  - cohesión de 0,6 a 0,3, elegida con un barrido de valores comparando imágenes.
- **Verificación:**
  - la velocidad media queda casi igual con 5.000, 20.000, 80.000 y 200.000 agentes;
  - las líneas de la rejilla desaparecen;
  - la progresión resultante: polvo → nubes → nebulosa con filamentos
    ([`02`](evidencias/02-saturacion-antes-despues.png),
    [`03`](evidencias/03-calibracion-progresion.png)).
- Se corrige también un error de arranque ("depthBuffer de tamaño 0") que ocurría cuando la
  ventana cargaba sin tamaño.

### 4. "Se ve biológico, no como el espacio" — Hito B y parte del Hito C (`f9372a1`)

- **Problema planteado por la autora:** el resultado parecía celular. Además pidió controlar
  las visuales, poder generar un pulso y hacer otros movimientos con el mouse.
- **Diagnóstico:** las membranas cerradas venían de cómo se empujaban los grupos entre sí.
  Para leer como espacio faltaban profundidad, escala y color.
- **Decisiones:**
  - **Profundidad sin 3D.** Casi todo es polvo lejano: diminuto, azulado y más lento
    (paralaje). Unos pocos agentes son cercanos, cálidos y más grandes.
  - **Escala.** Corrientes más grandes y una deriva global del campo (RUMBO con la rueda).
  - **Physarum (MEMORIA).** Mapa de huellas con depósito, difusión y decaimiento. Tres
    sensores por agente giran su steering hacia el camino más marcado.
  - **Color según el comportamiento, nunca asignado a mano:** violeta donde los agentes van
    rápido, magenta en las concentraciones, dorado solo en el clímax y blanco cálido en el
    frente del pulso.
  - **Controles completos de la especificación:**
    - ATRACCIÓN: pozo de gravedad al mantener el clic;
    - PULSO: onda anular con la barra espaciadora;
    - REVELACIÓN: niveles 0–4 con transiciones de ~15 s;
    - FINAL: ~40 s hasta un único punto de luz;
    - además, el HUD mínimo y el resplandor contenido.
- **Problemas durante la implementación:**
  - **Un buffer de tamaño cero rompía la simulación.** Se encontró por bisección: al
    reescribir `config.js` se habían borrado dos parámetros de la rejilla.
  - **La huella azul tapaba a las partículas.** Se bajó su intensidad y el peso de los
    sensores.
  - **En el FINAL, la población saltaba de golpe** al valor del nivel 0. Se corrigió para que
    acompañe el descenso del nivel.
- **Verificación:**
  - con 200.000 agentes: 1,7 ms por paso de simulación;
  - en el navegador: niveles, pulso y FINAL completo hasta un único punto
    ([`04`](evidencias/04-modo-desarrollo.jpg), [`05`](evidencias/05-nivel4-nebulosa.jpg),
    [`06`](evidencias/06-pulso-reorganizacion.jpg)).

### 5. Cuerpos celestes y estados más distinguibles (`193f2c2`)

- **Pedido de la autora:** que las teclas 4 y 5 generen cuerpos celestes en lugar de más
  estrellas. También notaba poca diferencia entre los estados de MEMORIA y REVELACIÓN, y
  quería ocultar el cursor en performance.
- **Decisiones de la autora** (se le consultó porque `AGENTS.md` prohíbe planetas y formas
  literales):
  - el cuerpo es un **núcleo emergente**: un centro de gravedad invisible que los agentes
    construyen;
  - nace en el cursor;
  - se disuelve solo tras ~30 s;
  - la tecla 6 disuelve todos los cuerpos.
- **Problema:** el primer cuerpo formaba un anillo hueco que parecía un "ojo", algo que está
  en la lista de lo que no debe verse. **Corrección:** dentro del núcleo la caída y el giro se
  apagan y la materia se asienta ([`09`](evidencias/09-cuerpos.png)).
- **Problema:** la MEMORIA casi no se notaba. **Causa:** la huella se medía respecto a su
  propio promedio, así que alargar la memoria no cambiaba el brillo. **Corrección:** se mide
  respecto a la memoria por defecto. Con memoria larga se acumula una bruma visible; con
  memoria corta casi no queda rastro ([`08`](evidencias/08-memoria-baja-media-alta.png)).
- **REVELACIÓN:** cada nivel agranda las corrientes y tiene más contraste de brillo, color y
  resplandor ([`07`](evidencias/07-revelacion-niveles.png)).

### 6. El sistema se arma con los cuerpos (`acfb116`)

- **Pedido de la autora:** cada pulsación de 4 crea un cuerpo nuevo, y con ellos se arma el
  sistema.
- **Decisiones de la autora:**
  - la tecla 5 reúne los cuerpos sueltos alrededor de su centro común y los pone a orbitar;
  - los cuerpos sueltos se disuelven a los ~30 s;
  - los del sistema permanecen hasta disolverlos.
- **Problema:** el sistema casi no se veía. **Causa:** los cuerpos se movían más rápido que
  los agentes (velocidad máxima 0,035) y la materia se quedaba atrás. **Corrección:** los
  cuerpos viajan como máximo a 0,015 y la órbita es más lenta. El sistema se ve como tres
  núcleos que se orbitan ([`10`](evidencias/10-sistema-de-cuerpos.jpg)).

### 7. Ensayos en vivo y ajuste de los cuerpos

- La autora hace **4 ensayos en vivo** de la pieza completa con todos los controles. Funcionan
  bien y la calibración de color funciona. Los pequeños defectos de los bordes se integran en
  la interpretación. No hay grabación.
- **Pedido de la autora:** que el cuerpo (tecla 4) se forme un poco más rápido y sea un poco
  más grande, y que la dispersión (tecla 6) sea más impactante.
- **Causa de la lentitud:** la materia viaja como mucho a la velocidad normal de los agentes.
  **Cambio:** la gravedad del cuerpo acelera la materia que atrae (hasta +150 %), y el cuerpo
  crece en 1,5 s en lugar de 4 s.
- **Tamaño:** radio de influencia de 0,16 a 0,22 y núcleo más amplio.
- **Dispersión:** la tecla 6 ahora estalla. Es un empujón fuerte hacia afuera, como un pulso,
  que acelera la materia y la ilumina en blanco cálido; deja un vacío donde estaba el núcleo.
  La disolución natural a los 30 s sigue siendo suave.
- **Verificación:** se comparó una línea de tiempo antes y después
  ([`12`](evidencias/12-cuerpo-formacion-y-estallido.png)). Antes no se veía nada a los 3 s;
  ahora ya hay un núcleo formándose a los 3 s y uno grande a los 6 s. El estallido es
  claramente visible.

---

## Pendientes

- **Bordes:** las corrientes no empalman donde el espacio se envuelve. Quedan entre 5 % y 7 %
  de los agentes cerca de los bordes, cuando lo esperado es 4 %.
- **Guardián de rendimiento:** bajar la cantidad de agentes si los fps caen
  (`funcionalidad-completa.md` §10).
- **Punto final:** revisar su brillo y tamaño.
- **Teclas 4 y 6:** ya se ajustaron según lo pedido. Falta confirmarlas en un ensayo.
- **Antes de presentar:** desactivar el atajo del menú de emojis (*Ajustes del Sistema →
  Teclado → "Presionar la tecla 🌐 para" → No hacer nada*). En el ensayo grabado se abrió por
  accidente.

## Registro de ensayos (lo completa la autora)

| Fecha | Qué se ensayó | Qué funcionó | Qué cambiar | Evidencia (video, captura, nota) |
|---|---|---|---|---|
| 2026-10-01 | 4 ensayos de tocar en vivo: la pieza completa con la música, usando todos los controles | El sistema funcionó bien en los cuatro ensayos y la calibración de color funciona bien. Los pequeños defectos de los bordes se logran integrar en la interpretación. | El resultado de la tecla 4 (cuerpos) funciona, pero no es exactamente el esperado. Corregir los bordes. | Testimonio de la autora. No hay grabación: se intentó grabar uno de los ensayos, pero la grabación no se inició. |
| 2026-10-01, 21:11 | Ensayo grabado de la pieza completa con la música (6:39), hecho después del ajuste de los cuerpos (commit de las 21:09) | Ver video | Entre 5:00 y 5:05 se abrió por accidente el menú de emojis de macOS: un error de la grabación, no de la obra. Desactivar ese atajo antes de presentar. | [Video del ensayo](evidencias/ensayo-2026-10-01.mp4) (comprimido a 1080p y 30 fps; 86 MB), [fotograma del clímax](evidencias/13-ensayo-climax.jpg) |
| | | | | |
