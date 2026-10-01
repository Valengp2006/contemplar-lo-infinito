# CONTEMPLAR LO INFINITO

## Especificación visual y funcional del primer prototipo

---

# 1. QUÉ ESTOY CONSTRUYENDO

Estoy construyendo un instrumento visual interactivo en Three.js llamado:

**CONTEMPLAR LO INFINITO**

El proyecto interpreta visualmente el tema principal de *Interstellar*, versión Original Score de Imperial Orquesta.

No quiero representar literalmente el espacio.

No quiero hacer una galaxia, planetas, estrellas realistas ni una recreación de escenas de la película.

Quiero representar **la sensación de contemplar algo inmenso, desconocido y difícil de comprender**.

La experiencia visual debe sentirse como si el usuario estuviera observando un universo que:

* empieza casi vacío;
* lentamente revela pequeñas presencias;
* desarrolla corrientes;
* forma agrupaciones;
* genera estructuras;
* se vuelve cada vez más complejo;
* alcanza una escala abrumadora;
* y finalmente vuelve a desaparecer.

La frase conceptual principal es:

> **Ser insignificante ante el espacio puede ser una forma de contemplación también.**

---

# 2. SENSACIÓN VISUAL GENERAL

La estética debe estar entre:

**universo + organismo + nube + materia + red**

No debe parecer una simulación científica.

Tampoco debe parecer una visualización de audio.

Debe sentirse **abstracta, viva y contemplativa**.

La primera impresión debe ser:

> "Hay algo moviéndose ahí."

Después:

> "Esas partículas parecen estar relacionadas."

Después:

> "Está apareciendo una estructura."

Y finalmente:

> "Estoy viendo algo mucho más grande que las partículas individuales."

---

# 3. LA PANTALLA

El proyecto debe ocupar toda la ventana.

La pantalla debe ser predominantemente oscura.

No quiero paneles ni UI grande durante el primer prototipo.

La composición visual debe tener muchísimo espacio negativo.

Por ejemplo:

```text
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    ·                                     │
│                                                          │
│             ·        ·                                   │
│                                                          │
│                         ·                                │
│                                                          │
│      ·                                                     │
│                                                          │
│                           ·                              │
│                                                          │
│                ·                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

No quiero llenar toda la pantalla con partículas.

El vacío es una parte importante de la composición.

---

# 4. PARTÍCULAS

Las partículas representan agentes autónomos.

Visualmente deben ser:

* pequeñas;
* luminosas;
* discretas;
* suaves;
* no demasiado brillantes.

No deben parecer estrellas realistas.

Son más parecidas a **pequeñas unidades de materia o puntos de luz flotando en un medio invisible**.

La forma más sencilla para el primer prototipo es:

```text
•
```

o pequeños puntos difuminados.

No utilizar grandes círculos.

No utilizar sprites complejos todavía.

---

# 5. COLOR

El fondo debe ser:

* negro;
* azul extremadamente oscuro;
* o un tono casi negro.

Las partículas inicialmente pueden ser:

* blanco cálido;
* blanco ligeramente azulado.

La iluminación debe ser muy sutil.

NO quiero:

* arcoíris;
* colores saturados;
* partículas de muchos colores;
* gradientes exagerados.

Más adelante podremos introducir pequeños cambios de color.

Por ahora:

> **oscuridad + luz escasa.**

---

# 6. IMPORTANCIA DEL VACÍO

El vacío no significa que no esté ocurriendo nada.

El vacío representa:

* inmensidad;
* incertidumbre;
* silencio;
* posibilidad;
* desconocimiento.

Por eso, una gran parte de la pantalla debe permanecer vacía.

La composición debe permitir que una pequeña agrupación de partículas tenga importancia visual.

---

# 7. DISTRIBUCIÓN INICIAL

Al comenzar, los agentes deben aparecer dispersos.

No deben formar una figura reconocible.

No deben formar un círculo.

No deben formar una galaxia.

No deben estar distribuidos en una cuadrícula.

La distribución debe ser ligeramente orgánica.

Ejemplo conceptual:

```text
                   ·


       ·


                         ·


                ·


  ·


                         ·


              ·


       ·
```

La sensación es:

> "No sé qué estoy viendo todavía."

---

# 8. MOVIMIENTO INICIAL

Los agentes deben moverse lentamente.

No deben parecer estáticos.

Pero tampoco deben moverse rápidamente.

El movimiento inicial debe transmitir:

* calma;
* curiosidad;
* suspensión;
* exploración.

No quiero trayectorias rectas perfectas.

No quiero movimientos aleatorios sin relación.

Cada agente debe estar influenciado por el Flow Field y por sus vecinos.

---

# 9. EL FLOW FIELD COMO ESPACIO INVISIBLE

El Flow Field no debe ser visible directamente en el resultado final.

Es una especie de:

> **corriente invisible del universo.**

Los agentes se desplazan siguiendo esas corrientes.

Visualmente esto debería generar:

```text
        ·
          ·
            ·
              ·

           ·
         ·
       ·

                    ·
                      ·
                        ·
```

Pero las curvas no deben ser líneas predefinidas.

Deben emerger del campo.

Dos agentes cercanos deberían experimentar direcciones parecidas.

A medida que el espacio cambia, las corrientes también cambian.

---

# 10. FLOCKING

Los agentes también deben percibir a otros agentes cercanos.

Esto produce tres comportamientos:

## SEPARATION

Si están demasiado cerca:

> se separan.

Visualmente evita que las partículas formen una masa compacta.

---

## ALIGNMENT

Si están cerca:

> tienden a compartir dirección.

Esto hace que pequeños grupos parezcan moverse juntos.

---

## COHESION

Los agentes tienden ligeramente hacia la región donde están sus vecinos.

Esto permite que aparezcan pequeñas agrupaciones.

---

# 11. RESULTADO DEL FLOCKING

No quiero una única gran agrupación.

Quiero múltiples agrupaciones pequeñas y medianas.

Algo parecido a:

```text
             · ·
          ·       ·
           ·  · ·


     · · ·
   ·       ·
    · ·


                         · ·
                      ·       ·
                       · · ·
```

Estas agrupaciones deben:

* aparecer;
* crecer;
* desplazarse;
* separarse;
* fusionarse;
* desaparecer.

No deben permanecer estáticas.

---

# 12. COMPORTAMIENTO EMERGENTE

Este es uno de los puntos más importantes.

No quiero dibujar manualmente:

* nubes;
* filamentos;
* galaxias;
* formas.

Quiero que las formas aparezcan como consecuencia de:

```text
agentes
+
percepción local
+
flocking
+
flow field
+
steering
```

El resultado debe ser impredecible a nivel global, pero coherente a nivel local.

Es decir:

> Cada agente toma decisiones simples, pero juntos producen una estructura que no fue diseñada directamente.

---

# 13. ESCALA VISUAL

La experiencia debe poder pasar de:

### Partícula

```text
•
```

a:

### Grupo

```text
· · ·
 · ·
· · ·
```

a:

### Corriente

```text
··
  ··
    ··
      ··
        ··
```

a:

### Estructura

```text
       ···
    ···   ···
  ···       ···
    ···   ···
       ···
```

a:

### Inmensidad

Una estructura tan grande que las partículas individuales dejan de ser importantes.

---

# 14. NO QUIERO QUE LA FORMA FINAL SEA OBVIA

No quiero que el sistema forme conscientemente:

* una galaxia;
* un ojo;
* una espiral perfecta;
* un planeta;
* una nebulosa reconocible;
* una figura geométrica.

La estructura debe permanecer ambigua.

El espectador debería poder preguntarse:

> "¿Estoy viendo materia, una nube, un organismo o algo cósmico?"

Esa ambigüedad es deseada.

---

# 15. PROFUNDIDAD VISUAL

Aunque el primer prototipo sea esencialmente 2D, quiero que visualmente exista sensación de profundidad.

Esto puede lograrse mediante:

* tamaño ligeramente variable;
* densidad;
* luminosidad;
* escala;
* movimiento;
* diferentes concentraciones.

NO necesitamos todavía un sistema 3D complejo.

La prioridad es el comportamiento.

---

# 16. EVOLUCIÓN TEMPORAL

El sistema no debe permanecer visualmente igual.

Incluso sin interacción, los agentes deben continuar:

* moviéndose;
* agrupándose;
* separándose;
* siguiendo corrientes;
* creando nuevas configuraciones.

No quiero un patrón que después de 10 segundos sea esencialmente igual al inicial.

Debe sentirse como un sistema vivo.

---

# 17. INTERACCIÓN HUMANA

La persona NO debe controlar directamente a las partículas.

Esto es fundamental.

No quiero:

```text
mouse
 ↓
partícula sigue mouse
```

Quiero:

```text
mouse
 ↓
modifica el entorno
 ↓
agentes perciben el cambio
 ↓
agentes recalculan sus fuerzas
 ↓
aparece un nuevo comportamiento
```

El usuario modifica las condiciones.

Los agentes responden autónomamente.

---

# 18. INTERACCIÓN CON EL MOUSE

En el primer prototipo, el mouse puede modificar ligeramente el Flow Field.

Por ejemplo:

* cerca del mouse, las direcciones del campo pueden curvarse;
* mover el mouse puede cambiar la dirección general de una corriente;
* el efecto debe ser suave;
* no debe atraer directamente las partículas.

El resultado debería ser:

```text
                 ·
                   ·
                     ·

           ↗
        ↗
     ↗
  🖱

        ·
          ·
            ·
```

Pero el mouse no controla la posición de ninguna partícula.

---

# 19. RESPUESTA DEL SISTEMA AL MOUSE

Si el usuario mueve el mouse:

1. cambia el entorno;
2. las partículas cercanas perciben una variación;
3. sus fuerzas cambian;
4. algunas modifican su dirección;
5. los vecinos reaccionan;
6. el cambio se propaga indirectamente;
7. aparece una nueva configuración colectiva.

Esto es importante.

Quiero que se pueda observar una especie de:

> **onda de comportamiento.**

No una onda gráfica dibujada.

Una onda causada por las decisiones de los agentes.

---

# 20. AUSENCIA DE INTERACCIÓN

Si el usuario deja el mouse quieto:

El sistema NO debe detenerse.

Debe continuar funcionando.

Los agentes continúan:

* explorando;
* agrupándose;
* siguiendo corrientes;
* reorganizándose.

La autonomía debe ser evidente.

---

# 21. VELOCIDAD

La velocidad debe ser relativamente lenta.

Quiero poder observar las decisiones de los agentes.

Si los agentes se mueven demasiado rápido:

* se pierde la contemplación;
* las estructuras no se perciben;
* parece un efecto de partículas.

Si son demasiado lentos:

* parece que el sistema está congelado.

La velocidad ideal debe sentirse como:

> **una corriente lenta en un espacio enorme.**

---

# 22. CAMBIOS DE DIRECCIÓN

Las partículas no deberían cambiar de dirección instantáneamente.

Las fuerzas deben producir aceleración.

Por eso:

```text
dirección actual
      ↓
steering
      ↓
aceleración
      ↓
nueva dirección
```

No:

```text
dirección actual
      ↓
CAMBIO INSTANTÁNEO
```

Esto hará que el movimiento se sienta orgánico.

---

# 23. VELOCIDAD Y ACELERACIÓN

Cada agente debe tener:

* velocidad máxima;
* fuerza máxima;
* aceleración.

La fuerza de steering debe estar limitada.

Esto evita movimientos bruscos.

Visualmente:

> Los agentes deben "curvarse" hacia nuevas direcciones.

No girar como flechas.

---

# 24. PERCEPCIÓN LOCAL

Un agente solamente debe percibir agentes dentro de un radio.

Visualmente esto significa que un agente no "sabe" que existe otro agente muy lejano.

Por ejemplo:

```text
· · · · · · · · · · · · ·

          ○
       ·  ·  ·

· · · · · · · · · · · · ·
```

El círculo representa su percepción.

Solo los agentes dentro de esa región participan directamente en sus cálculos.

---

# 25. EL UNIVERSO COMO SISTEMA LOCAL

Este concepto debe mantenerse:

> **Ningún agente conoce el universo completo.**

Cada agente solamente sabe:

* dónde está;
* hacia dónde se mueve;
* qué vecinos tiene cerca;
* qué dirección tiene el Flow Field donde se encuentra;
* qué fuerzas locales lo afectan.

A partir de eso decide qué hacer.

El universo completo aparece como resultado colectivo.

---

# 26. RELACIÓN ENTRE LOS ALGORITMOS

La jerarquía conceptual es:

```text
FLOW FIELD
"¿Hacia dónde fluye el espacio?"
        ↓
FLOCKING
"¿Cómo se comportan mis vecinos?"
        ↓
STEERING
"¿Cómo debo ajustar mi movimiento?"
        ↓
AGENTE
"Me muevo."
        ↓
SISTEMA
"Surge una estructura."
```

En el primer prototipo:

```text
FLOW FIELD
      +
FLOCKING
      +
STEERING BÁSICO
      ↓
MOVIMIENTO EMERGENTE
```

---

# 27. PRIMERA ETAPA VISUAL

La primera versión debe ser extremadamente sencilla.

### Fondo

Negro.

### Partículas

Pequeños puntos blancos/cálidos.

### Movimiento

Suave.

### Interacción

Mouse modifica ligeramente el Flow Field.

### UI

Ninguna.

### Efectos

Mínimos.

Quiero ver claramente el comportamiento.

---

# 28. SEGUNDA ETAPA VISUAL

Una vez que el comportamiento funcione, podremos añadir:

* glow;
* bloom muy sutil;
* variación de tamaño;
* variación de luminosidad;
* pequeñas diferencias de color;
* trails;
* profundidad visual.

Pero estos efectos NO deben ocultar el comportamiento.

---

# 29. LO QUE DEBE SENTIRSE

El resultado visual debería sentirse como:

> pequeñas partículas suspendidas en una inmensidad oscura.

Después:

> comienzan a descubrirse unas a otras.

Después:

> empiezan a moverse juntas.

Después:

> aparecen corrientes invisibles.

Después:

> esas corrientes producen estructuras.

Después:

> las estructuras parecen tener vida propia.

Ese es el efecto que busco.

---

# 30. REFERENCIA CONCEPTUAL DE LA PRIMERA MINUTA

Aunque el sistema no debe estar sincronizado automáticamente con la música, imagina que visualmente estamos preparando este recorrido:

```text
VACÍO
│
│     ·
│
│          ·
│
├── pequeñas presencias
│
│       · ·
│      ·   ·
│
├── agrupaciones
│
│         ···
│       ·     ·
│         ···
│
├── corrientes
│
│     ···
│       ···
│          ···
│
├── estructuras
│
│       ·····
│    ···     ···
│  ···         ···
│
├── complejidad
│
│  ···············
│ ·················
│  ···············
│
└── inmensidad
```

Esto no significa que debas programar estos estados como una animación.

Significa que esta es la **dirección visual que debe permitir el comportamiento emergente**.

---

# 31. LO QUE NO QUIERO

Evitar específicamente:

### Partículas aleatorias sin relación

```text
·   · ·       ·
    ·      ·
·       ·      ·
```

si simplemente se mueven sin influirse.

### Explosiones

No quiero que parezca una explosión de partículas.

### Fuegos artificiales

No quiero trayectorias radiales.

### Galaxia automática

No quiero generar una espiral perfecta.

### Audio visualizer

No quiero que las partículas pulsen automáticamente con el volumen de la canción.

### Movimiento caótico

No quiero ruido aleatorio sin estructura.

### UI técnica

No quiero sliders y números visibles en esta primera versión.

---

# 32. PRUEBA VISUAL DEFINITIVA

Cuando ejecutes el prototipo, debería poder mirar la pantalla durante varios minutos y observar que:

* ninguna partícula tiene un comportamiento exactamente igual a otra;
* los grupos aparecen y desaparecen;
* existen corrientes;
* las partículas se influyen entre ellas;
* el Flow Field afecta al conjunto;
* el mouse puede alterar el comportamiento;
* las estructuras nunca son exactamente iguales;
* el sistema nunca parece completamente detenido;
* tampoco parece caótico;
* existe una sensación de organismo colectivo.

---

# 33. CRITERIO CONCEPTUAL MÁS IMPORTANTE

La pregunta no es:

> "¿Se ve como el espacio?"

La pregunta es:

> **"¿Se siente como estar contemplando algo inmenso que está vivo y que no puedo comprender completamente?"**

Si la respuesta visual es sí, estamos acercándonos al objetivo.

---

# 34. ARQUITECTURA FUNCIONAL ESPERADA

El flujo completo del primer prototipo debe ser aproximadamente:

```text
                  ┌───────────────┐
                  │   FLOW FIELD  │
                  └───────┬───────┘
                          │
                          ↓
                  dirección local
                          │
                          ↓
┌───────────┐       ┌───────────┐
│  VECINOS  │──────→│   AGENTE  │
└───────────┘       └─────┬─────┘
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
        Separation    Alignment    Cohesion
             │            │            │
             └────────────┼────────────┘
                          ↓
                    STEERING
                          ↓
                    ACELERACIÓN
                          ↓
                     VELOCIDAD
                          ↓
                     POSICIÓN
                          ↓
                    RENDERIZADO
                          ↓
                COMPORTAMIENTO
                   EMERGENTE
```

---

# 35. IMPLEMENTACIÓN FUTURA

Este primer prototipo es la base.

Después añadiremos:

```text
FASE 1
Agentes
+
Flow Field
+
Flocking
        ↓
FASE 2
Steering interactivo
        ↓
FASE 3
Physarum
        ↓
FASE 4
Memoria visual
        ↓
FASE 5
PULSO
        ↓
FASE 6
REVELACIÓN
        ↓
FASE 7
Dirección visual
        ↓
FASE 8
Performance musical
```

---

# 36. DEFINICIÓN FINAL

Visualmente quiero:

> **Un espacio negro casi vacío donde pequeñas partículas luminosas se mueven lentamente como materia suspendida. Las partículas no siguen trayectorias prediseñadas: perciben únicamente su entorno cercano, responden a corrientes invisibles y a sus vecinos, formando pequeñas agrupaciones y corrientes que aparecen, se transforman y desaparecen. Poco a poco, el comportamiento colectivo puede producir estructuras más grandes y ambiguas que parecen estar entre una nube, un organismo, una red y materia cósmica. El resultado debe ser contemplativo, orgánico, misterioso y ligeramente sobrecogedor.**

Funcionalmente quiero:

> **Agentes autónomos con percepción local que combinan Flow Field, Separation, Alignment, Cohesion y Steering para calcular su movimiento. El usuario no controla directamente las partículas; modifica el entorno y observa cómo el sistema responde. La forma final no debe estar dibujada ni animada previamente: debe emerger de las reglas locales de los agentes.**

La prioridad absoluta del primer prototipo es:

> **COMPORTAMIENTO EMERGENTE ANTES QUE ESTÉTICA.**
