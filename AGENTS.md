# AGENTS.md — Contemplar lo infinito

## Instrucciones para el agente de código

- Este archivo es la ÚNICA fuente de verdad del proyecto.
- El repo se creó desde una plantilla de otro trabajo del curso. De esa
  plantilla solo se usa la infraestructura (package.json, vite.config.js
  con base './', index.html, .github/workflows/deploy.yml y la dependencia
  de three). Su código de simulación, UI, README y guías NO tienen relación
  con este proyecto: no usarlos como referencia ni como arquitectura.
- No tomar decisiones técnicas grandes sin aprobación de la autora
  (por ejemplo: CPU vs GPU, WebGL vs WebGPU, cambiar de librería).
- No borrar archivos sin mostrar antes la lista y recibir aprobación.
- Después de cada avance o cambio importante, actualizar solo "Estado del
  proyecto", "Registro de cambios" y, si cambió la estructura de src/,
  la sección 23. No modificar las secciones conceptuales sin que la
  autora lo pida.
- Restricciones permanentes: usar solo Steering, Flocking, Flow Field y
  Physarum; prohibido analizar el audio (BPM, amplitud, espectro, FFT);
  el usuario nunca controla agentes individuales.
- Control de versiones: al terminar cada avance o cambio importante,
  una vez que `npm run build` pase sin errores y AGENTS.md esté
  actualizado, hacer `git add`, `git commit` con un mensaje claro en
  español y `git push` a la rama main. Nunca usar `--force`, nunca
  reescribir el historial, y si el push falla, informar a la autora en
  vez de intentar soluciones alternativas.
- Documentos complementarios: `docs/prototipo-1-especificacion.md` manda
  sobre la CALIDAD del comportamiento del núcleo (agentes, flow field,
  flocking, steering, mouse, vacío, velocidad lenta).
  `docs/funcionalidad-completa.md` define el ALCANCE funcional completo
  (controles, revelación, Physarum, pulso, atracción, final, HUD, audio,
  rendimiento y orden de hitos). Si hay contradicción entre documentos,
  no decidir: listar las contradicciones y esperar respuesta de la autora.

---

## Estado del proyecto

- Fase actual: Hito A — Núcleo
- Base: infraestructura de Vite y Three.js.
- Funciona: 
  - Renderizado en WebGPU con `SpriteNodeMaterial` (instancing).
  - Compute shaders para Flow Field y Agentes.
  - El Flow field evoluciona en el tiempo e incluye influencia temporal del mouse (mapa de memoria).
  - Flocking O(N) optimizado mediante *binning* atómico en celdas espaciales de punto fijo (toroidal).
  - Steering limitado y wander orgánico, todo con ±15% de variación por agente usando TSL hashes.
  - Distribución dispersa inicial orgánica (rechazo sobre pseudo-noise 2D).
- Pendiente: Hito B (Memoria e interacción)
- Decisiones tomadas: WebGPU (100% compute), instancing (ya que WebGPU no escala `Points`), cuadrícula toroidal punto fijo para flocking.
- Nota: `src/main.js` usa `THREE.WebGLRenderer`, `PointsMaterial` con
  textura canvas y blending aditivo de forma provisional para
  verificación; esto NO constituye una decisión de arquitectura.

## Registro de cambios

- 2026-09-30: repo creado desde la plantilla y desplegado en Pages
- 2026-10-01: dirección visual definida (referentes y paleta con violeta
  y magenta desde el inicio)
- 2026-10-01: reinicio del proyecto; se descarta el prototipo anterior
  (CPU, 800 agentes) y todo el código derivado de la plantilla
- 2026-10-01: limpieza de Fase 0 ejecutada — eliminados README.md,
  GUIA_ESTUDIANTE.md, PRUEBAS_Y_DEPURACION.md, dist/, src/simulation/,
  src/ui/, src/styles.css. Reescritos index.html y src/main.js (escena
  mínima). Creado .agents/rules/. Build verificado.
- 2026-10-01: punto central reemplazado por partícula luminosa suave
  (textura radial canvas, blending aditivo, tamaño fijo retina).
  Añadida regla de control de versiones a AGENTS.md. Renombrado
  package.json a "contemplar-lo-infinito".
- 2026-10-01: Hito A implementado — núcleo 100% WebGPU. Flocking por cuadrícula 
  toroidal con sumas atómicas (punto fijo). Flow field regenerado con value noise
  y tiempo, y mapa de influencia de mouse. Render con `SpriteNodeMaterial` instanciado.
- 2026-10-01: Corrección de error en pipeline WebGPU por sintaxis de iteradores en TSL.
  Se corrigió el uso de `Loop` en `agents.js` añadiendo nombres explícitos y se
  implementó un guardián visual de errores (`renderer.onError`) en `main.js`.
- 2026-10-01: Corrección de error de parseo WGSL para texturas de almacenamiento.
  Se reemplazó el uso de `vec2` por `ivec2` para las coordenadas enteras pasadas a
  `textureStore` y `textureLoad` en `flowField.js` y `agents.js`.

---

# 1. Información general

### Actividad
**Actividad 03 — Reto de diseño: interpretar música con agentes autónomos**

### Tecnología
**Three.js**

### Obra musical
**Tema principal de _Interstellar_ — versión Original Score de Imperial Orquesta**

### Formato
Instrumento visual interactivo para la Web, ejecutado en tiempo real y en pantalla completa.

### Algoritmos permitidos
- Steering Behaviors
- Flocking
- Flow Fields
- Physarum

---

# 2. Reto de diseño

Diseñar y desarrollar un **instrumento visual para la Web** capaz de interpretar en tiempo real una pieza musical mediante agentes autónomos.

La interpretación debe ser principalmente humana:

> La música no debe ser analizada automáticamente para decidir qué ocurre visualmente. La persona que interpreta escucha la pieza y toma decisiones en tiempo real mediante controles expresivos.

Los agentes deben calcular sus propias acciones a partir de las reglas implementadas. La persona modifica las condiciones del sistema, pero no dirige individualmente cada agente.

---

# 3. Concepto artístico

## Título provisional

# Contemplar lo infinito

### Idea central

El proyecto no busca representar literalmente el espacio ni recrear visualmente _Interstellar_.

Busca representar **la sensación de contemplar algo inmenso que no podemos comprender completamente**.

La experiencia parte de un espacio aparentemente vacío. Pequeñas presencias aparecen poco a poco y comienzan a relacionarse. Sus interacciones producen estructuras cada vez mayores y más complejas.

El espectador nunca recibe una explicación completa de aquello que está viendo.

Solo puede observar cómo algo desconocido emerge, crece, transforma el espacio y finalmente desaparece.

### Idea conceptual principal

> **Ser insignificante ante el espacio puede ser una forma de contemplación también.**

### Frase guía

> **Un universo que emerge, se transforma y desaparece ante nosotros.**

### Principio artístico

No representar el universo.

**Representar lo que se siente al contemplarlo.**

---

# 4. Experiencia emocional

La pieza musical se interpreta como un recorrido emocional:

**Calma → Curiosidad → Descubrimiento → Asombro → Nostalgia → Desesperación → Sobrecogimiento → Contemplación → Calma**

La progresión visual debe acompañar esta experiencia sin convertirla en una visualización automática del audio.

---

# 5. Lectura emocional de la música

## 5.1 Inicio — calma y expectativa

La música comienza lentamente.

Sensaciones:
- calma;
- silencio;
- expectativa;
- curiosidad;
- sensación de que algo está a punto de aparecer.

### Traducción visual

El espacio está casi vacío.

Hay pocos agentes, muy pequeños y poco luminosos.

El movimiento es lento.

Existe mucho espacio negativo.

El sistema no revela todavía una estructura clara.

---

## 5.2 Primer crecimiento — curiosidad

La música comienza a aumentar gradualmente de intensidad.

Sensaciones:
- curiosidad;
- anticipación;
- descubrimiento.

### Traducción visual

Empiezan a aparecer pequeños puntos y pequeñas nubes de agentes.

Los agentes comienzan a encontrarse.

El flocking produce agrupaciones.

Todavía no existe una estructura dominante.

La sensación debe ser:

> "Algo está apareciendo, pero todavía no sé qué es."

---

## 5.3 Emergencia — asombro

La música continúa creciendo.

Sensación:

> Algo oculto comienza a emerger.

### Traducción visual

El flow field adquiere mayor presencia.

Las agrupaciones comienzan a desplazarse como corrientes.

El Physarum empieza a dejar huellas muy sutiles.

Los agentes producen estructuras que no fueron dibujadas manualmente.

La belleza debe surgir del comportamiento emergente.

---

## 5.4 Cambio de dirección — misterio y nostalgia

La música toma otro rumbo.

Aparece una sensación de nostalgia difícil de explicar.

Idea emocional:

> Como si el interior entendiera algo que la mente todavía no comprende.

### Traducción visual

Los agentes pueden comenzar a:
- repetir trayectorias;
- regresar hacia zonas anteriores;
- formar y deshacer agrupaciones;
- dejar huellas persistentes;
- buscar zonas de atracción.

El sistema debe parecer que está intentando encontrar algo.

La nostalgia debe surgir del comportamiento, no simplemente de usar colores "tristes".

---

## 5.5 Aumento de intensidad — emoción

La música vuelve a crecer.

Sensación:
- emoción;
- tensión;
- anticipación;
- sensación de que algo enorme está a punto de ocurrir.

### Traducción visual

Aumentan:
- cantidad de agentes;
- velocidad;
- interacción;
- densidad;
- complejidad del flow field;
- persistencia de las huellas.

La composición comienza a adquirir una escala mayor.

---

# 6. El pulso

Existe una sección especialmente importante de la obra en la que aparece un pulso aproximadamente periódico.

En la película, este pulso está asociado al paso del tiempo y a los años que el protagonista ha perdido con su hija.

La interpretación visual debe evitar una representación literal de "un segundo = un año".

## Propuesta

Crear una interacción llamada:

### PULSO

Cada activación genera una perturbación que atraviesa el sistema.

### Efectos posibles

1. Se genera una onda desde un punto.
2. La onda afecta temporalmente a los agentes.
3. Los agentes modifican su dirección.
4. Se produce una ligera expansión o separación.
5. Después, el sistema intenta reorganizarse.

Conceptualmente:

**Pulso → perturbación → reorganización → espera → nuevo pulso**

El intérprete decide cuándo activar cada pulso.

No debe estar sincronizado automáticamente con el audio mediante análisis de BPM.

---

# 7. Clímax — sobrecogimiento

La música alcanza su sección más emotiva e intensa.

Sensación:

> La inmensidad es abrumadora y al mismo tiempo hermosa.

> No se comprende lo que existe alrededor, solo se contempla con asombro.

### Traducción visual

El sistema alcanza su máxima complejidad.

Los agentes individuales dejan de ser el foco.

Empiezan a percibirse estructuras mayores:

- nubes;
- corrientes;
- filamentos;
- concentraciones;
- redes;
- estructuras abstractas semejantes a nebulosas.

No se busca representar literalmente una galaxia.

La forma debe encontrarse entre:

**galaxia ↔ organismo ↔ nube ↔ red ↔ materia cósmica**

El espectador debe sentir que está observando algo más grande que los agentes que lo construyeron.

---

# 8. Final — contemplación

La música comienza a terminar.

La intensidad disminuye.

### Traducción visual

Los controles dejan de intervenir.

Los agentes disminuyen progresivamente su actividad.

Las huellas se desvanecen.

Las grandes estructuras desaparecen.

Finalmente quedan pocos puntos en un espacio oscuro.

La pantalla vuelve a parecerse al inicio.

Pero existe una diferencia conceptual:

### Al inicio

> "¿Qué habrá aquí?"

### Al final

> "Sé que aquí puede existir algo inmenso."

El final debe sentirse como despertar de un sueño.

La experiencia termina en calma, pero el espectador queda procesando lo que acaba de presenciar.

---

# 9. Lenguaje visual

## Dirección artística

### Cosmic Organic

Un universo abstracto que se comporta como un organismo vivo.

No utilizar una estética espacial literal.

Evitar depender de:
- planetas;
- estrellas reconocibles;
- naves;
- galaxias de stock;
- nebulosas fotográficas;
- elementos directamente asociados con _Interstellar_.

La referencia debe ser emocional, no ilustrativa.

---

# 10. Agentes

Los agentes serán pequeñas entidades luminosas.

No deben tener necesariamente una forma literal.

Pueden representarse mediante:
- puntos;
- pequeñas partículas;
- sprites;
- pequeñas geometrías;
- instancias de geometría simple.

### Características

Cada agente tiene:

- posición;
- velocidad;
- aceleración;
- percepción local;
- límites de percepción;
- fuerzas de steering;
- relación con vecinos;
- influencia del flow field;
- interacción con el entorno.

### Principio

> **Cada agente conoce solamente una pequeña parte del universo.**

El comportamiento global surge de la suma de decisiones locales.

---

# 11. Papel de cada algoritmo

## 11.1 Flow Field — el universo / el rumbo

El Flow Field representa las corrientes invisibles del espacio.

Los agentes consultan el campo localmente y orientan su movimiento según la dirección encontrada.

### Conceptualmente representa

- viaje;
- rumbo;
- corrientes;
- fuerzas ambientales;
- movimiento del universo.

### Interacción

El intérprete modifica la estructura o intensidad del campo mediante el control **RUMBO / FLOW**.

---

## 11.2 Flocking — las constelaciones / conexión

Flocking permite que los agentes formen comportamientos colectivos.

Tres reglas principales:

### Separación
Evita que los agentes se amontonen.

### Alineación
Hace que los agentes vecinos tiendan a compartir dirección.

### Cohesión
Hace que los agentes permanezcan relacionados con el grupo.

### Conceptualmente representa

- conexión;
- pertenencia;
- agrupación;
- comportamiento colectivo;
- estructuras emergentes.

Las agrupaciones deben aparecer naturalmente.

---

## 11.3 Steering Behaviors — decisiones y fuerzas

Steering representa fuerzas que modifican el movimiento individual de los agentes.

Posibles comportamientos:

- seek;
- flee;
- arrive;
- wander;
- attraction;
- repulsion.

No todos tienen que implementarse.

### Conceptualmente representa

- decisiones;
- búsqueda;
- atracción;
- rechazo;
- incertidumbre;
- dirección individual.

El agente no recibe una posición final.

Calcula una fuerza y modifica su movimiento.

---

## 11.4 Physarum — memoria / huella

Physarum representa la memoria del recorrido.

Los agentes o su comportamiento dejan una huella en el espacio.

Con el tiempo las huellas pueden:

- acumularse;
- desaparecer;
- generar estructuras;
- crear caminos;
- producir redes.

### Conceptualmente representa

- memoria;
- nostalgia;
- recorrido;
- pasado;
- huella de lo que estuvo allí.

La memoria visual debe ser especialmente importante durante la sección nostálgica.

---

# 12. Relación entre algoritmos

Los algoritmos no deben sentirse como cuatro efectos independientes.

La intención es construir una cadena de comportamiento:

**Flow Field**
→ establece las corrientes del entorno

**Flocking**
→ organiza colectivamente a los agentes

**Steering**
→ introduce fuerzas y decisiones individuales

**Physarum**
→ conserva una huella de los recorridos

El resultado debe ser:

> **Agentes individuales → comportamiento colectivo → estructuras emergentes → memoria visual**

---

# 13. Interacción humana

La interacción debe ser limitada y expresiva.

No utilizar una interfaz llena de parámetros técnicos.

La persona debe sentir que está **interpretando un instrumento**, no configurando una simulación.

## Controles principales

### 1. RUMBO / FLOW

**Tipo:** control continuo.

Modifica:
- dirección del flow field;
- intensidad del campo;
- eventualmente curvatura o turbulencia.

### Resultado

Las corrientes del universo cambian.

Los agentes reaccionan de forma autónoma.

### Sensación

**Viaje / rumbo / transformación del entorno.**

---

### 2. ATRACCIÓN / GRAVEDAD

**Tipo:** punto móvil o control continuo.

Representa una fuerza de atracción.

Los agentes perciben una zona de influencia.

### Resultado

Los agentes:
- se acercan;
- forman concentraciones;
- reorganizan el flocking;
- modifican sus trayectorias.

La fuerza disminuye con la distancia.

### Sensación

**Búsqueda / deseo de llegar / aquello que nos atrae.**

---

### 3. MEMORIA

**Tipo:** dial o slider expresivo.

Controla la persistencia de las huellas de Physarum.

### Bajo

Las huellas desaparecen rápidamente.

### Alto

Las trayectorias permanecen y se acumulan.

### Sensación

**Recuerdo / nostalgia / pasado.**

---

### 4. PULSO

**Tipo:** botón.

Cada activación genera una perturbación.

### Resultado

Una onda o fuerza temporal:
- atraviesa el sistema;
- altera las velocidades;
- cambia las direcciones;
- separa o reorganiza temporalmente a los agentes.

### Sensación

**Tiempo / urgencia / pérdida / espera.**

---

### 5. REVELACIÓN

**Tipo:** botón de activación puntual.

Es un control de momentos importantes de la interpretación.

### Resultado

Incrementa temporalmente o progresivamente la complejidad del sistema:

- más agentes;
- mayor interacción;
- mayor complejidad del flow field;
- mayor actividad colectiva;
- mayor acumulación de Physarum.

No debe producir simplemente una explosión.

Debe generar una **revelación gradual de estructuras**.

### Sensación

**Descubrimiento / asombro / emergencia.**

---

# 14. Tabla de controles

| Control | Entrada | Modifica | Algoritmos relacionados | Significado |
|---|---|---|---|---|
| RUMBO | Movimiento continuo | Flow field | Flow Field | Viaje / dirección |
| ATRACCIÓN | Punto o movimiento | Fuerza de atracción | Steering + Flocking | Búsqueda / deseo |
| MEMORIA | Dial | Persistencia de trail | Physarum | Nostalgia / huella |
| PULSO | Clic | Perturbación temporal | Steering + entorno | Tiempo / urgencia |
| REVELACIÓN | Clic | Complejidad global | Flocking + Flow Field + Physarum | Descubrimiento |

---

# 15. Principio de interacción

El intérprete **no controla directamente a los agentes**.

No debe existir una relación:

> mouse → posición exacta del agente.

Debe existir:

> interacción humana → modificación del entorno/reglas → percepción del agente → cálculo autónomo → comportamiento emergente.

Esto es fundamental para mantener el carácter de agente autónomo.

---

# 16. Interfaz

La interfaz debe ser mínima.

Durante la presentación no se debe cubrir la pantalla con controles.

Posible enfoque:

- controles pequeños en los bordes;
- indicadores discretos;
- elementos que desaparecen después de unos segundos sin interacción;
- nombres poéticos para el público;
- explicación técnica disponible en una vista previa o documento.

### Nombres visibles

- RUMBO
- ATRACCIÓN
- MEMORIA
- PULSO
- REVELACIÓN

### Nombres técnicos para documentación

- Flow Field
- Steering
- Physarum
- Pulse Force
- Flocking / emergent complexity

---

# 16b. Referentes visuales

Fuente: tablero de referentes de la autora (partículas luminosas sobre fondo negro).

Se toma el MATERIAL, no los objetos:
- Puntos de luz muy pequeños, bordes suaves, mezcla aditiva.
- Estelas que dejan rastro y se desvanecen.
- Redes de filamentos azules (resultado de Physarum).
- Concentraciones esféricas y corrientes en espiral emergentes.
- Profundidad suave, bloom contenido.

Se evita: planetas, anillos, galaxias reconocibles, colores saturados constantes.

Mapa de referentes por sección musical:
- Inicio: un solo punto brillante en el vacío.
- Curiosidad / asombro: pequeñas concentraciones y primeras corrientes.
- Nostalgia: redes de filamentos (huella Physarum).
- Clímax: espirales y estructuras orgánicas con acentos de color.
- Final: regreso al punto de luz.

Nota técnica: las redes de filamentos nítidas de los referentes suelen
requerir una gran cantidad de agentes (del orden de cientos de miles).
Esto debe pesar en la decisión de arquitectura de la sección 23.

---

# 17. Paleta visual

## Decisión

El violeta y el magenta están presentes desde las primeras secciones.
La paleta no cambia de colores a lo largo de la pieza: cambia la
CANTIDAD de color y su INTENSIDAD, siguiendo el arco emocional.

## Colores base

- Fondo: negro espacial, con azul casi negro (sin gris).
- Partículas base: azul frío y blanco cálido.
- Color expresivo: violeta y magenta.
- Acento puntual: dorado muy sutil, solo en los momentos de mayor carga.

## Principio

La luz es escasa. El color aparece en pocas partículas y zonas, nunca
cubriendo toda la pantalla. La saturación y el brillo se reservan para
los momentos emotivos.

## Evolución del color por sección

| Sección | Color dominante | Presencia del violeta / magenta |
|---|---|---|
| Inicio (calma) | Un punto blanco cálido y azul tenue | Apenas un matiz violeta en el borde de la luz |
| Curiosidad | Azul frío y blanco | Algunas partículas violetas dispersas |
| Asombro / emergencia | Azul con vetas | Violeta en las corrientes del flow field |
| Nostalgia | Azul profundo en las huellas Physarum | Violeta en las zonas de huella persistente |
| Emoción | Azul + violeta | Magenta en las concentraciones más densas |
| Pulso | Blanco cálido en la onda | Magenta en el borde de la perturbación |
| Clímax | Todos los colores, máxima intensidad | Violeta y magenta amplios, acentos dorados |
| Descenso | Se retira el magenta, luego el violeta | Quedan azul y blanco |
| Final | Un punto blanco cálido y azul tenue | Vuelve el matiz casi imperceptible del inicio |

## Cómo se decide el color (sin dibujarlo a mano)

El color de una partícula depende de su comportamiento, no de una
asignación manual. Por ejemplo: velocidad, densidad de vecinos
(flocking) o intensidad de la huella (Physarum). Así el color también es
emergente y se puede explicar.

## Regla de contención

Nunca más del ~15 % de la pantalla con color saturado,
salvo en el clímax. (Cifra de partida, a ajustar viéndola en pantalla.)

---

# 18. Composición

La composición debe trabajar con:

- mucho espacio negativo;
- pequeños grupos;
- concentraciones;
- corrientes;
- filamentos;
- nubes;
- estructuras emergentes.

La escala debe evolucionar:

**pequeño → medio → grande → inmenso → vacío**

No revelar toda la complejidad desde el inicio.

---

# 19. Progresión visual general

```text
VACÍO
  ↓
PEQUEÑAS PRESENCIAS
  ↓
AGRUPACIONES
  ↓
CORRIENTES
  ↓
HUELLAS
  ↓
ESTRUCTURAS
  ↓
COMPLEJIDAD
  ↓
INMENSIDAD
  ↓
DESVANECIMIENTO
  ↓
VACÍO
```

Esta progresión debe ser uno de los pilares de la experiencia.

---

# 20. Score visual provisional

| Sección musical    | Sensación              | Estado visual                            | Interacción                    |
| ------------------ | ---------------------- | ---------------------------------------- | ------------------------------ |
| Inicio             | Calma                  | Muy pocos agentes, movimiento mínimo     | Sin intervención o FLOW mínimo |
| Primer crecimiento | Curiosidad             | Aparecen agentes y pequeñas agrupaciones | RUMBO                          |
| Emergencia         | Asombro                | Flocking + Flow Field                    | REVELACIÓN                     |
| Cambio de sección  | Misterio / nostalgia   | Trayectorias y huellas                   | MEMORIA                        |
| Nuevo crecimiento  | Emoción                | Mayor densidad y velocidad               | RUMBO + ATRACCIÓN              |
| Pulso              | Desesperación / tiempo | Perturbaciones periódicas                | PULSO                          |
| Gran clímax        | Sobrecogimiento        | Máxima complejidad y estructuras         | REVELACIÓN + RUMBO + ATRACCIÓN |
| Descenso           | Contemplación          | Reducción progresiva                     | Soltar controles               |
| Final              | Paz                    | Las estructuras desaparecen              | Sin intervención               |

---

# 21. Reglas de diseño

## Regla 1 — No literalidad

No representar directamente objetos de *Interstellar*.

La inspiración es emocional.

---

## Regla 2 — El vacío importa

El espacio vacío es parte de la composición.

No llenar la pantalla constantemente.

---

## Regla 3 — La complejidad debe emerger

No dibujar manualmente las formas principales.

Las estructuras deben surgir de las reglas de los agentes.

---

## Regla 4 — Los agentes tienen autonomía

El usuario modifica condiciones.

Los agentes calculan sus propias acciones.

---

## Regla 5 — La música no controla automáticamente el sistema

No realizar análisis automático de:

* BPM;
* amplitud;
* frecuencia;
* espectro;
* volumen;
* detección automática de crescendos.

La persona escucha y decide.

---

## Regla 6 — Pocos controles

Cada control debe tener una consecuencia visual clara y perceptible.

---

## Regla 7 — El comportamiento tiene significado

Cada cambio importante debe poder explicarse conceptualmente.

---

## Regla 8 — La revelación debe ser gradual

La complejidad debe construirse delante del espectador.

---

# 22. Arquitectura conceptual del sistema

```text
                 INTERPRETACIÓN HUMANA
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
      RUMBO          ATRACCIÓN          PULSO
        │                │                │
        ↓                ↓                ↓
   FLOW FIELD        STEERING        PERTURBACIÓN
        │                │                │
        └────────────┬───┴────────────────┘
                     ↓
                  AGENTES
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
       FLOCKING             STEERING
          │                     │
          └──────────┬──────────┘
                     ↓
              COMPORTAMIENTO
                EMERGENTE
                     │
                     ↓
                 PHYSARUM
                     │
                     ↓
              MEMORIA VISUAL
                     │
                     ↓
               UNIVERSO QUE
                  EMERGE
```

---

# 23. Arquitectura técnica

Estado: PENDIENTE DE DECISIÓN. No hay código del proyecto todavía.

La estructura de carpetas, y si la simulación corre en CPU o en GPU,
se decide después de comparar las opciones frente a la dirección visual
(sección 16b) y se documenta aquí cuando esté aprobada por la autora.

Archivos que sí existen (infraestructura heredada de la plantilla):
- package.json, vite.config.js (base './'), index.html
- .github/workflows/deploy.yml
- dependencia: three

Regla: no se asume ninguna arquitectura de la plantilla. Esta sección
se actualiza cada vez que se crea o cambia un archivo de src/.

---

# 24. Modelo conceptual de un agente

Cada agente debería tener como mínimo:

```text
position
velocity
acceleration
maxSpeed
maxForce
perceptionRadius
```

Y debería poder calcular fuerzas provenientes de:

```text
flowFieldForce
separationForce
alignmentForce
cohesionForce
attractionForce
repulsionForce
```

Las fuerzas se combinan para calcular la aceleración.

Conceptualmente:

```text
fuerzas
   ↓
aceleración
   ↓
velocidad
   ↓
posición
```

---

# 25. Percepción limitada

Los agentes no deben conocer todo el sistema.

Cada agente debe percibir solamente:

* vecinos dentro de un radio;
* dirección local del Flow Field;
* influencia de zonas de atracción;
* información local del entorno.

Esto permite que el comportamiento global emerja de reglas locales.

---

# 26. Comportamiento emergente esperado

El objetivo visual no es controlar una forma específica.

Se busca que aparezcan espontáneamente:

* agrupaciones;
* corrientes;
* remolinos;
* dispersión;
* concentraciones;
* filamentos;
* redes;
* nubes;
* estructuras cambiantes.

Estas formas pueden recordar a fenómenos cósmicos sin representar directamente ninguno.

---

# 27. Physarum como capa de memoria

La implementación de Physarum debe entenderse como una capa que registra el recorrido.

Conceptualmente:

```text
agentes
   ↓
movimiento
   ↓
depósito
   ↓
difusión
   ↓
decaimiento
   ↓
trail map
```

La acumulación debe poder producir estructuras visuales.

La persistencia debe poder modificarse durante la interpretación.

---

# 28. Revelación como estado del sistema

La interacción **REVELACIÓN** puede funcionar como un estado global temporal.

Ejemplo:

```text
normal
  ↓
revelación
  ↓
más agentes
más velocidad
más influencia colectiva
más actividad del flow field
más memoria
  ↓
máxima complejidad
  ↓
regreso gradual
```

La transición debe ser suave.

No utilizar cambios bruscos salvo que estén justificados por la música.

---

# 29. Objetivo de experiencia

Al terminar la presentación, el espectador debería poder sentir:

> "Vi algo que parecía estar vivo."

> "No entendía exactamente qué era."

> "Era enorme y hermoso."

> "Parecía que estaba descubriendo algo."

> "Después desapareció y quedó el vacío."

El proyecto debe privilegiar la **experiencia emocional** sobre la explicación literal.

---

# 30. Criterios para evaluar decisiones de diseño

Antes de implementar una característica, preguntar:

1. ¿Está relacionada con el concepto de contemplar lo infinito?
2. ¿Aporta al lenguaje cósmico-orgánico?
3. ¿Surge de alguno de los algoritmos permitidos?
4. ¿El comportamiento puede explicarse?
5. ¿El usuario tiene una razón clara para interactuar con ella?
6. ¿La consecuencia de la interacción es perceptible?
7. ¿Mantiene la autonomía de los agentes?
8. ¿Evita depender del análisis automático del audio?
9. ¿Contribuye a la progresión emocional?
10. ¿Ayuda a que la experiencia sea más contemplativa y menos decorativa?

---

# 31. Prioridades de desarrollo

## Fase 0 — Reinicio e infraestructura

* Limpiar el código heredado de la plantilla.
* Dejar una escena Three.js mínima (fondo casi negro, un punto blanco cálido).
* Verificar compilación y despliegue en GitHub Pages.
* Decidir arquitectura de renderizado y cómputo (CPU/GPU, WebGL/WebGPU).

## Fase 1 — Prototipo de agentes

* Crear agentes.
* Movimiento básico.
* Percepción local.
* Steering.

## Fase 2 — Flocking

* Separación.
* Alineación.
* Cohesión.
* Ajustar pesos.

## Fase 3 — Flow Field

* Crear campo.
* Hacer que los agentes lo consulten.
* Probar variaciones.
* Añadir control humano.

## Fase 4 — Physarum

* Crear trail map.
* Depósito.
* Difusión.
* Decaimiento.
* Integrarlo con agentes.

## Fase 5 — Interacción

* RUMBO.
* ATRACCIÓN.
* MEMORIA.
* PULSO.
* REVELACIÓN.

## Fase 6 — Dirección visual

* Partículas (puntos aditivos, estelas).
* Iluminación y bloom contenido.
* Paleta según sección 17.
* Fondo.
* Densidad.
* Escala.
* Espacio negativo.

## Fase 7 — Interpretación

* Escuchar la pieza varias veces.
* Marcar secciones.
* Definir cuándo intervenir.
* Crear score visual.
* Ensayar.

## Fase 8 — Optimización

* Rendimiento en pantalla completa.
* Número de agentes.
* GPU/CPU según implementación.
* Resolución del trail map.
* Suavidad de controles.

---

# 32. Restricciones importantes

* Three.js es la tecnología principal.
* Solo utilizar los comportamientos permitidos por el encargo para construir el instrumento.
* No delegar la interpretación a análisis automático del audio.
* La interacción humana debe ser necesaria para conducir la evolución visual.
* Los controles deben ser pocos.
* Los cambios deben ser perceptibles.
* El sistema debe funcionar en tiempo real.
* La presentación debe funcionar en pantalla completa.
* El comportamiento emergente debe poder explicarse.
* Evitar convertir el proyecto en una simple animación pregrabada.

---

# 33. Definición resumida del proyecto

> **Contemplar lo infinito** es un instrumento visual interactivo desarrollado en Three.js que interpreta el tema principal de *Interstellar* mediante agentes autónomos.
>
> Pequeñas entidades emergen desde un espacio aparentemente vacío y, mediante steering behaviors, flocking, flow fields y Physarum, construyen comportamientos y estructuras cada vez más complejas.
>
> El intérprete no controla directamente a los agentes: modifica las condiciones del universo mediante pocos controles expresivos. Los agentes perciben su entorno local y calculan autónomamente sus movimientos.
>
> La experiencia comienza con calma y curiosidad, pasa por descubrimiento, asombro, nostalgia y desesperación, alcanza una sensación de inmensidad y sobrecogimiento, y finalmente regresa al vacío.
>
> El objetivo no es representar literalmente el espacio, sino transmitir la sensación de contemplar algo inmenso que no podemos comprender completamente.
>
> **El universo emerge. El intérprete lo observa, lo perturba y lo guía. Los agentes construyen algo que ninguno de ellos puede comprender. Al final, todo desaparece y solo queda la contemplación.**

# 23. Arquitectura del código

Estructura actual (`src/`):

- `main.js`: entrada principal. Configura WebGPU, maneja inputs (F, P, D, 1-5), redimensionado (con unidades normalizadas `[0, aspect] x [0, 1]`) y el loop de render/compute.
- `config.js`: fuente de la verdad para parámetros. Variables de simulación en unidades de mundo / s.
- `simulation/`
  - `agents.js`: shaders de cómputo para los agentes (binning, flocking O(N) con atómicos en punto fijo, exclusión del propio agente, limits de fuerzas y steering, wander, integración y espacio toroidal).
  - `flowField.js`: shaders de cómputo para el Flow Field (textura `flowTex` usando value noise 2D + tiempo) y el mapa del mouse (`mouseTex` acumulado con decaimiento temporal).
- `rendering/`
  - `particles.js`: InstancedMesh de sprites (para soportar tamaño de partículas en WebGPU) y `SpriteNodeMaterial` en aditivo. Distribución inicial aleatoria basada en un ruido CPU de baja frecuencia.
