/**
 * Partículas: un sprite instanciado por agente, leyendo su posición directamente
 * del buffer de la GPU. (Con WebGPU los `Points` solo pueden medir 1 px, por eso se
 * usan sprites.) El tamaño se define en píxeles CSS y se convierte a unidades del
 * mundo dividiendo por el alto en píxeles (el alto del mundo es 1).
 *
 * Profundidad sin 3D: cada agente tiene una "cercanía" fija. Casi todos son polvo lejano
 * (diminuto, tenue, azulado); unos pocos son cercanos (más grandes, cálidos).
 *
 * El color depende del COMPORTAMIENTO, nunca de una asignación manual (sección 17):
 *   · violeta  donde el agente va rápido con la corriente
 *   · magenta  donde se concentran muchos agentes (densidad relativa alta)
 *   · dorado   solo en el clímax, en las concentraciones más densas
 *   · blanco cálido en el frente de un PULSO
 * La CANTIDAD de color la decide el nivel de REVELACIÓN; solo una fracción de los agentes
 * puede tomar color, para no superar ~15 % de pantalla saturada fuera del clímax.
 */
import * as THREE from 'three/webgpu';
import {
  uniform, vec2, vec3, vec4, float, mix, clamp, smoothstep, length, uv, max, step,
  instanceIndex, hash, varying,
} from 'three/tsl';

export function createParticles(sim, config, viewHeightPx) {
  const C = config.PALETTE;
  const uPointPx = uniform(config.POINT_PX);
  const uViewH = uniform(viewHeightPx);
  const uBright = uniform(config.BRIGHTNESS);
  const uLevelBright = uniform(1);   // brillo del nivel de REVELACIÓN
  const uColorLevel = uniform(0);    // cantidad de color del nivel × COLOR_GAIN
  const colorGain = { value: config.COLOR_GAIN };
  const uDepthSize = uniform(new THREE.Vector2(...config.DEPTH_SIZE));
  const uDepthBright = uniform(new THREE.Vector2(...config.DEPTH_BRIGHT));
  // Compensación por cantidad de agentes (se acerca suavemente a su objetivo cada cuadro)
  const uLightGain = uniform(1);
  const uSizeGain = uniform(1);
  const uMinPx = uniform(config.MIN_POINT_PX);
  const lightExponent = { value: config.LIGHT_EXPONENT };
  const sizeExponent = { value: config.SIZE_EXPONENT };
  let count = 1;
  const targetGain = (exp) => Math.min(1, Math.pow(Math.max(count, 1) / config.LIGHT_REF_AGENTS, -exp));

  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  // Posición del agente (leída del buffer de cómputo)
  material.positionNode = vec3(sim.posBuf.toAttribute(), 0);

  const state = sim.stateBuf.toAttribute();   // x densidad rel. · y velocidad rel. · z pulso · w fundido
  const near = sim.nearness(instanceIndex);
  const seedA = hash(instanceIndex.add(9001));
  const seedB = hash(instanceIndex.add(31337));
  const seedC = hash(instanceIndex.add(77777));

  // Tamaño: profundidad + pequeña variación individual
  const sizeVar = mix(uDepthSize.x, uDepthSize.y, near).mul(mix(0.85, 1.15, seedA));
  const px = max(uPointPx.mul(uSizeGain).mul(sizeVar), uMinPx);
  material.scaleNode = vec2(px.div(uViewH));

  // ---- Color según comportamiento ----
  const relDensity = state.x;
  const relSpeed = state.y;
  const pulseFront = smoothstep(0.75, 1.0, state.z);
  const lvl = uColorLevel;
  // Solo una fracción de los agentes puede tomar color; crece con el nivel
  const eligible = step(seedC, mix(0.05, 0.6, clamp(lvl, 0, 1)));
  const base = mix(vec3(...C.warm), vec3(...C.cold), float(1).sub(near).mul(0.75));
  const vAmt = eligible.mul(smoothstep(0.45, 0.95, relSpeed)).mul(mix(0.3, 0.9, clamp(lvl, 0, 1)))
    .add(float(0.12).mul(step(seedC, 0.02)));                     // un matiz violeta casi imperceptible
  const mAmt = eligible.mul(smoothstep(1.8, 4.5, relDensity)).mul(clamp(lvl.mul(1.4), 0, 1));
  const gAmt = smoothstep(0.8, 1.0, lvl).mul(smoothstep(4.0, 8.0, relDensity)).mul(step(seedC, 0.12));
  let color = mix(base, vec3(...C.violet), clamp(vAmt, 0, 1));
  color = mix(color, vec3(...C.magenta), clamp(mAmt, 0, 1));
  color = mix(color, vec3(...C.gold), clamp(gAmt, 0, 1));
  color = mix(color, vec3(...C.warm), pulseFront.mul(0.7));
  const vColor = varying(color, 'vColor');

  // ---- Brillo: profundidad, variación, vecinos, fundido de aparición y frente del pulso ----
  const presence = clamp(relDensity, 0, 1);
  const bright = mix(uDepthBright.x, uDepthBright.y, near)
    .mul(mix(0.6, 1.0, seedB))
    .mul(mix(0.7, 1.0, presence))
    .mul(state.w)
    .mul(float(1).add(pulseFront.mul(0.8)));
  const vBright = varying(bright, 'vBright');

  // Punto redondo con borde suave
  const d = length(uv().sub(0.5)).mul(2);
  const falloff = float(1).sub(smoothstep(0, 1, d));
  const alpha = falloff.mul(falloff).mul(vBright).mul(uBright).mul(uLevelBright).mul(uLightGain);
  material.colorNode = vec4(vColor, alpha);

  const sprite = new THREE.Sprite(material);
  sprite.count = 1;
  sprite.frustumCulled = false;
  sprite.renderOrder = 2;

  return {
    object: sprite,
    uniforms: {
      pointPx: uPointPx, viewH: uViewH, brightness: uBright, lightExponent, sizeExponent, colorGain,
      depthSizeFar: { get value() { return uDepthSize.value.x; }, set value(v) { uDepthSize.value.x = v; } },
      depthBrightFar: { get value() { return uDepthBright.value.x; }, set value(v) { uDepthBright.value.x = v; } },
    },
    setCount(n) { sprite.count = Math.max(1, n); count = n; },
    setViewHeight(px) { uViewH.value = px; },
    // Cada cuadro: cantidad dibujada, compensación suave y valores visuales del nivel
    update(dt, drawn, alive, visuals) {
      sprite.count = Math.max(1, drawn);
      count = Math.max(1, alive);
      const a = 1 - Math.exp(-dt / config.LIGHT_EASE_S);
      uLightGain.value += (targetGain(lightExponent.value) - uLightGain.value) * a;
      uSizeGain.value += (targetGain(sizeExponent.value) - uSizeGain.value) * a;
      if (visuals) {
        uLevelBright.value = visuals.brightness;
        uColorLevel.value = visuals.color * colorGain.value;
      }
    },
  };
}
