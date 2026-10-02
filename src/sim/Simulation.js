/**
 * Simulación 100 % en GPU (WebGPU + TSL).
 *
 * Cadena de comportamiento por agente (nunca cuatro efectos independientes):
 *   flow field (corriente local + deriva global + mouse)
 *   → flocking (vecinos percibidos en campos de densidad y momento)
 *   → steering (incluye sensores de huella Physarum, atracción y onda de pulso)
 *   → huella (cada agente deposita en el mapa de memoria)
 *
 * Percepción local: cada agente solo percibe los campos de su alrededor inmediato
 * (≈ un radio de percepción), nunca el universo completo. Los vecinos se resumen en dos
 * campos suaves sobre una rejilla, con depósito bilineal ("cloud-in-cell") para que no
 * aparezca la retícula:
 *   · densidad  → cohesión (subir por el gradiente) y separación (presión: alejarse de
 *                 zonas mucho más densas que la media)
 *   · momento   → alineación (velocidad media de los vecinos)
 * Se resta la contribución del propio agente de los campos que percibe.
 *
 * Aparición gradual: los agentes con índice menor que `alive` están vivos; cada uno
 * aparece y desaparece con un fundido (estado.w), y su "masa" en los campos es ese fundido.
 *
 * Estado por agente (vec4): x densidad relativa a la media · y velocidad relativa ·
 *                           z perturbación del pulso (1 → 0) · w fundido de aparición.
 *
 * Buffers de almacenamiento por shader: máximo 7 (el límite por defecto de WebGPU es 8).
 */
import * as THREE from 'three/webgpu';
import {
  Fn, If, uniform, instancedArray, instanceIndex,
  float, int, vec2, vec3, vec4,
  floor, fract, clamp, mix, select, length, max, min, exp, sin, cos, pow, smoothstep,
  atomicAdd, atomicStore, atomicLoad, hash, mx_noise_float,
} from 'three/tsl';

import { makeInitialState } from './initialState.js';

export function createSimulation(renderer, config, aspect) {
  const N = config.MAX_AGENTS;
  const MM = config.MOUSE_MAP_RES;
  const MAX_CELLS = config.MAX_CELLS;
  const FP = config.FIXED_POINT_SCALE;
  const TFP = config.TRAIL_FIXED_SCALE;
  const TAU = Math.PI * 2;

  // Mapa de huellas: resolución fija desde el arranque (el ancho sigue la pantalla inicial)
  const TH = config.TRAIL_HEIGHT;
  const TW = Math.min(config.TRAIL_MAX_WIDTH, Math.round(TH * aspect));
  const TN = TW * TH;

  // ── Buffers ────────────────────────────────────────────────
  const init = makeInitialState(N, aspect, config);
  const posBuf = instancedArray(init.pos, 'vec2');
  const velBuf = instancedArray(init.vel, 'vec2');
  const stateBuf = instancedArray(N, 'vec4');
  const cellAtomic = instancedArray(MAX_CELLS * 3, 'int').toAtomic(); // por celda: Σw, Σw·vx, Σw·vy (punto fijo)
  const cellA = instancedArray(MAX_CELLS, 'vec4');                  // x: densidad, y,z: momento
  const mouseMap = instancedArray(MM * MM, 'vec2');                 // perturbación acumulada del mouse
  const trailA = instancedArray(TN, 'float');                       // huella (memoria) que leen los sensores
  const trailB = instancedArray(TN, 'float');                       // huella del siguiente paso
  const trailDep = instancedArray(TN, 'int').toAtomic();            // depósito del cuadro (punto fijo)

  // ── Uniforms (ajustables en vivo) ──────────────────────────
  const U = {
    dt: uniform(1 / 60),
    time: uniform(0),
    world: uniform(new THREE.Vector2(aspect, 1)),
    cells: uniform(new THREE.Vector2(3, 3)),
    cellSize: uniform(new THREE.Vector2(0.1, 0.1)),
    active: uniform(0, 'uint'),       // agentes calculados y dibujados (vivos + los que se desvanecen)
    alive: uniform(0),                // agentes vivos (índice < alive)
    fadeRate: uniform(1 / config.FADE_S),
    remap: uniform(1),

    maxSpeed: uniform(config.MAX_SPEED),
    maxForce: uniform(config.MAX_FORCE),
    forceCap: uniform(config.FORCE_CAP),
    variation: uniform(config.VARIATION),
    depthSpeedFar: uniform(config.DEPTH_SPEED[0]),
    depthSpeedNear: uniform(config.DEPTH_SPEED[1]),
    nearExp: uniform(config.NEAR_EXPONENT),
    speedLevel: uniform(1),

    percep: uniform(config.PERCEPTION_RADIUS),
    crowdFactor: uniform(config.CROWD_FACTOR),
    crowdMin: uniform(config.CROWD_MIN),
    meanDensity: uniform(1),
    presenceN: uniform(config.PRESENCE_N),
    wSep: uniform(config.W_SEPARATION),
    wAli: uniform(config.W_ALIGNMENT),
    wCoh: uniform(config.W_COHESION),
    wWander: uniform(config.W_WANDER),
    lvlSep: uniform(1),
    lvlAli: uniform(1),
    lvlCoh: uniform(1),

    wFlow: uniform(config.W_FLOW),
    flowScale: uniform(config.FLOW_SCALE),
    flowSpeed: uniform(config.FLOW_SPEED),
    flowGain: uniform(config.FLOW_GAIN),
    octA: uniform(new THREE.Vector4(1, 0, 0, 0)),   // pesos efectivos de las octavas 1–4
    octB: uniform(0),                                 // peso efectivo de la octava 5
    drift: uniform(new THREE.Vector2(0, 0)),          // RUMBO global (dirección × fuerza)

    mouse: uniform(new THREE.Vector2(-10, -10)),
    mouseVel: uniform(new THREE.Vector2(0, 0)),
    mouseOn: uniform(0),
    mouseRadius: uniform(config.MOUSE_RADIUS),
    mouseStrength: uniform(config.MOUSE_STRENGTH),
    mouseSwirl: uniform(config.MOUSE_SWIRL),
    mouseDecay: uniform(config.MOUSE_DECAY),
    mouseWeight: uniform(config.MOUSE_WEIGHT),
    mouseMax: uniform(config.MOUSE_MAX),

    attract: uniform(new THREE.Vector2(-10, -10)),
    attractOn: uniform(0),            // 0..1 (crece al mantener, se libera al soltar)
    attractRadius: uniform(config.ATTRACT_RADIUS),
    wAttract: uniform(config.W_ATTRACT),
    attractCoh: uniform(config.ATTRACT_COHESION),

    pulse0: uniform(new THREE.Vector4(0, 0, 0, 0)),   // x, y, radio del frente, amplitud
    pulse1: uniform(new THREE.Vector4(0, 0, 0, 0)),
    pulse2: uniform(new THREE.Vector4(0, 0, 0, 0)),
    pulse3: uniform(new THREE.Vector4(0, 0, 0, 0)),
    pulseWidth: uniform(config.PULSE_WIDTH),
    pulseForce: uniform(config.PULSE_FORCE),
    pulseDeflect: uniform(config.PULSE_DEFLECT),
    pulseSpeedup: uniform(config.PULSE_SPEEDUP),
    calmRate: uniform(1 / (config.PULSE_CALM_HOLD_S + config.PULSE_CALM_RECOVER_S)),
    calmHold: uniform(config.PULSE_CALM_HOLD_S),
    calmRecover: uniform(config.PULSE_CALM_RECOVER_S),

    deposit: uniform(0),              // DEPOSIT_RATE × nivel
    trailDecay: uniform(1),           // por paso, según la vida media (MEMORIA)
    trailDiffuse: uniform(0),         // por paso
    sensorAngle: uniform(config.SENSOR_ANGLE),
    sensorDist: uniform(config.SENSOR_DIST),
    wSensor: uniform(config.W_SENSOR),
    lvlSensor: uniform(0),
  };

  // ── Utilidades TSL ─────────────────────────────────────────
  const limitLen = Fn(([v, m]) => {
    const l = length(v);
    return select(l.greaterThan(m), v.mul(m.div(l)), v);
  });
  const safeNorm = Fn(([v]) => v.div(max(length(v), 1e-6)));
  const wrapDelta = Fn(([d]) => {
    const W = U.world.x;
    return vec2(d.x.sub(W.mul(floor(d.x.div(W).add(0.5)))), d.y.sub(floor(d.y.add(0.5))));
  });
  const wrapMod = Fn(([x, m]) => x.sub(m.mul(floor(x.div(m)))));
  const rotate = Fn(([v, a]) => {
    const c = cos(a);
    const s = sin(a);
    return vec2(v.x.mul(c).sub(v.y.mul(s)), v.x.mul(s).add(v.y.mul(c)));
  });

  // Cercanía del agente (0 = polvo lejano, 1 = cercano). Casi todos son lejanos.
  // El agente 0 siempre es el más cercano: es el punto de luz del inicio y del final.
  const nearness = Fn(([i]) => select(i.equal(0), float(1), pow(hash(i.add(424242)), U.nearExp)));

  // Potencial escalar con 5 octavas (la REVELACIÓN las enciende); su "curl" da corrientes sin sumideros.
  const flowPsi = Fn(([q, t]) => {
    const a = U.octA;
    const n0 = mx_noise_float(vec3(q, t));
    const n1 = mx_noise_float(vec3(q.mul(2.07).add(vec2(17.3, 9.1)), t.mul(1.7).add(5.2)));
    const n2 = mx_noise_float(vec3(q.mul(4.31).add(vec2(-8.7, 23.4)), t.mul(2.9).add(11.7)));
    const n3 = mx_noise_float(vec3(q.mul(8.9).add(vec2(41.2, -3.3)), t.mul(4.6).add(2.2)));
    const n4 = mx_noise_float(vec3(q.mul(17.6).add(vec2(-29.1, 61.7)), t.mul(7.1).add(8.4)));
    return n0.mul(a.x).add(n1.mul(a.y)).add(n2.mul(a.z)).add(n3.mul(a.w)).add(n4.mul(U.octB));
  });

  const flowAt = Fn(([p]) => {
    const q = p.mul(U.flowScale);
    const t = U.time.mul(U.flowSpeed);
    const e = float(0.02);
    const dx = flowPsi(q.add(vec2(e, 0)), t).sub(flowPsi(q.sub(vec2(e, 0)), t));
    const dy = flowPsi(q.add(vec2(0, e)), t).sub(flowPsi(q.sub(vec2(0, e)), t));
    return vec2(dy, dx.negate()).mul(U.flowGain.div(e.mul(2)));
  });

  const sampleMouse = Fn(([p]) => {
    const u = p.x.div(U.world.x).mul(MM).sub(0.5);
    const v = p.y.mul(MM).sub(0.5);
    const x0 = clamp(floor(u), 0, MM - 2);
    const y0 = clamp(floor(v), 0, MM - 2);
    const fx = clamp(u.sub(x0), 0, 1);
    const fy = clamp(v.sub(y0), 0, 1);
    const i00 = y0.mul(MM).add(x0).toUint();
    const a = mouseMap.element(i00);
    const b = mouseMap.element(i00.add(1));
    const c = mouseMap.element(i00.add(MM));
    const d = mouseMap.element(i00.add(MM + 1));
    return mix(mix(a, b, fx), mix(c, d, fx), fy);
  });

  // Índice de la celda del mapa de huellas que contiene el punto p (con envoltura)
  const trailIndex = Fn(([p]) => {
    const tx = clamp(floor(wrapMod(p.x.div(U.world.x), float(1)).mul(TW)), 0, TW - 1);
    const ty = clamp(floor(wrapMod(p.y, float(1)).mul(TH)), 0, TH - 1);
    return ty.mul(TW).add(tx).toUint();
  });

  // Campos sobre la rejilla, con interpolación bilineal y envoltura toroidal
  const fieldAt = Fn(([p]) => {
    const u = p.x.div(U.cellSize.x).sub(0.5);
    const v = p.y.div(U.cellSize.y).sub(0.5);
    const x0f = floor(u);
    const y0f = floor(v);
    const fx = u.sub(x0f);
    const fy = v.sub(y0f);
    const x0 = wrapMod(x0f, U.cells.x);
    const x1 = wrapMod(x0f.add(1), U.cells.x);
    const y0 = wrapMod(y0f, U.cells.y);
    const y1 = wrapMod(y0f.add(1), U.cells.y);
    const a = cellA.element(y0.mul(U.cells.x).add(x0).toUint()).xyz;
    const b = cellA.element(y0.mul(U.cells.x).add(x1).toUint()).xyz;
    const c = cellA.element(y1.mul(U.cells.x).add(x0).toUint()).xyz;
    const d = cellA.element(y1.mul(U.cells.x).add(x1).toUint()).xyz;
    return mix(mix(a, b, fx), mix(c, d, fx), fy);
  });

  // ── Kernels ────────────────────────────────────────────────

  // 1) limpiar la rejilla
  const kClear = Fn(() => {
    const base = instanceIndex.mul(3);
    atomicStore(cellAtomic.element(base), int(0));
    atomicStore(cellAtomic.element(base.add(1)), int(0));
    atomicStore(cellAtomic.element(base.add(2)), int(0));
  })().compute(MAX_CELLS);

  // 2) cada agente deposita su "masa" (su fundido) y su velocidad en las 4 celdas más cercanas
  const kBin = Fn(() => {
    If(instanceIndex.lessThan(U.active), () => {
      const p = posBuf.element(instanceIndex);
      const v = velBuf.element(instanceIndex);
      const m = stateBuf.element(instanceIndex).w;
      const u = p.x.div(U.cellSize.x).sub(0.5);
      const w = p.y.div(U.cellSize.y).sub(0.5);
      const x0f = floor(u);
      const y0f = floor(w);
      const fx = u.sub(x0f);
      const fy = w.sub(y0f);
      const x0 = wrapMod(x0f, U.cells.x);
      const x1 = wrapMod(x0f.add(1), U.cells.x);
      const y0 = wrapMod(y0f, U.cells.y);
      const y1 = wrapMod(y0f.add(1), U.cells.y);

      const deposit = (ix, iy, wt) => {
        const base = iy.mul(U.cells.x).add(ix).toUint().mul(3);
        const mw = wt.mul(m);
        atomicAdd(cellAtomic.element(base), mw.mul(FP).toInt());
        atomicAdd(cellAtomic.element(base.add(1)), mw.mul(v.x).mul(FP).toInt());
        atomicAdd(cellAtomic.element(base.add(2)), mw.mul(v.y).mul(FP).toInt());
      };
      const gx = float(1).sub(fx);
      const gy = float(1).sub(fy);
      deposit(x0, y0, gx.mul(gy));
      deposit(x1, y0, fx.mul(gy));
      deposit(x0, y1, gx.mul(fy));
      deposit(x1, y1, fx.mul(fy));
    });
  })().compute(N);

  // 3) convertir las sumas enteras (punto fijo) en campos de densidad y momento
  const kNorm = Fn(() => {
    const i = instanceIndex;
    const base = i.mul(3);
    const n = atomicLoad(cellAtomic.element(base)).toFloat().div(FP);
    const mx = atomicLoad(cellAtomic.element(base.add(1))).toFloat().div(FP);
    const my = atomicLoad(cellAtomic.element(base.add(2))).toFloat().div(FP);
    cellA.element(i).assign(vec4(n, mx, my, 0));
  })().compute(MAX_CELLS);

  // 4) mapa de perturbación del mouse: decae y se deposita a lo largo del recorrido
  const kMouse = Fn(() => {
    const i = instanceIndex;
    const iF = i.toFloat();
    const ty = floor(iF.div(MM));
    const tx = iF.sub(ty.mul(MM));
    const center = vec2(tx.add(0.5).div(MM).mul(U.world.x), ty.add(0.5).div(MM));
    const cur = mouseMap.element(i).toVar();
    cur.mulAssign(exp(U.dt.mul(U.mouseDecay).negate()));

    const d = center.sub(U.mouse);
    const r = length(d);
    const fall = float(1).sub(smoothstep(0, U.mouseRadius, r));
    const speed = length(U.mouseVel);
    const gain = smoothstep(0.03, 0.3, speed).mul(U.mouseOn).mul(fall);
    const dir = U.mouseVel.div(max(speed, 1e-5));
    const tangent = vec2(d.y.negate(), d.x).div(max(r, 1e-4));
    const push = dir.mul(max(speed, 0).min(1.5));
    const swirl = tangent.mul(speed.min(1.5)).mul(U.mouseSwirl);
    cur.addAssign(push.add(swirl).mul(gain).mul(U.mouseStrength).mul(U.dt));
    mouseMap.element(i).assign(limitLen(cur, U.mouseMax));
  })().compute(MM * MM);

  // 5) agentes: percepción local, steering, integración y huella
  const kUpdate = Fn(() => {
    If(instanceIndex.lessThan(U.active), () => {
      const i = instanceIndex;
      const pos = posBuf.element(i).toVar();
      const vel = velBuf.element(i).toVar();
      const st = stateBuf.element(i).toVar();

      const h1 = hash(i.add(101));
      const h2 = hash(i.add(7919));
      const h3 = hash(i.add(104729));
      const h4 = hash(i.add(1299709));
      const near = nearness(i);
      const maxSpeed = U.maxSpeed.mul(U.speedLevel)
        .mul(float(1).add(h1.mul(2).sub(1).mul(U.variation)))
        .mul(mix(U.depthSpeedFar, U.depthSpeedNear, near));
      const maxForce = U.maxForce.mul(float(1).add(h4.mul(2).sub(1).mul(U.variation)));

      // ---- Aparición gradual: vivo si su índice es menor que `alive` ----
      const isAlive = i.toFloat().lessThan(U.alive);
      const fadeTarget = select(isAlive, float(1), float(0));
      const fadeStep = U.fadeRate.mul(U.dt);
      const fade = st.w.add(clamp(fadeTarget.sub(st.w), fadeStep.negate(), fadeStep));

      // ---- Percepción local: campos de densidad y momento alrededor del agente ----
      const f0 = fieldAt(pos);
      const u = pos.x.div(U.cellSize.x).sub(0.5);
      const w = pos.y.div(U.cellSize.y).sub(0.5);
      const fx = fract(u);
      const fy = fract(w);
      const gx = float(1).sub(fx);
      const gy = float(1).sub(fy);
      // peso con el que el propio agente se ve a sí mismo en los campos (se resta)
      const selfW = gx.mul(gx).mul(gy).mul(gy).add(fx.mul(fx).mul(gy).mul(gy))
        .add(gx.mul(gx).mul(fy).mul(fy)).add(fx.mul(fx).mul(fy).mul(fy)).mul(st.w);
      const nOthers = max(f0.x.sub(selfW), 0);
      const mOthers = vec2(f0.y, f0.z).sub(vel.mul(selfW));
      const presence = clamp(nOthers.div(U.presenceN), 0, 1);

      // ---- ATRACCIÓN: un pozo suave que solo perciben los agentes dentro del radio ----
      const toAttr = wrapDelta(U.attract.sub(pos));
      const rAttr = length(toAttr);
      const attrFall = float(1).sub(smoothstep(0, U.attractRadius, rAttr)).mul(U.attractOn);

      // ---- PULSO: el frente de cada onda empuja hacia afuera y desvía ----
      const pulseVec = vec2(0, 0).toVar();
      const front = float(0).toVar();
      const side = select(h2.greaterThan(0.5), float(1), float(-1));
      for (const P of [U.pulse0, U.pulse1, U.pulse2, U.pulse3]) {
        const d = pos.sub(P.xy);
        const r = length(d);
        const k = r.sub(P.z).div(U.pulseWidth);
        const f = exp(k.mul(k).negate()).mul(P.w);
        const radial = d.div(max(r, 1e-4));
        pulseVec.addAssign(radial.add(vec2(radial.y.negate(), radial.x).mul(side).mul(U.pulseDeflect)).mul(f));
        front.assign(max(front, f));
      }
      // Perturbación: salta con el frente y luego vuelve a 0
      const calm = max(st.z.sub(U.dt.mul(U.calmRate)), front);
      // Cohesión baja durante "calmHold" s y se recupera en "calmRecover" s
      const sinceHit = float(1).sub(calm).div(U.calmRate);
      const cohAfterPulse = clamp(sinceHit.sub(U.calmHold).div(U.calmRecover), 0, 1);

      // Alineación: igualar la velocidad media de los vecinos
      const vAvg = mOthers.div(max(nOthers, 0.05));
      const aliSteer = limitLen(vAvg.sub(vel), maxForce).mul(presence).mul(U.wAli).mul(U.lvlAli);

      // Gradiente de densidad (hacia dónde hay más vecinos)
      const hx = U.cellSize.x;
      const hy = U.cellSize.y;
      const gradX = fieldAt(pos.add(vec2(hx, 0))).x.sub(fieldAt(pos.sub(vec2(hx, 0))).x).div(hx.mul(2));
      const gradY = fieldAt(pos.add(vec2(0, hy))).x.sub(fieldAt(pos.sub(vec2(0, hy))).x).div(hy.mul(2));
      const grad = vec2(gradX, gradY);
      const gradDir = safeNorm(grad);
      const gradRel = clamp(length(grad).mul(hx).div(max(f0.x, 1)), 0, 1);

      // Cohesión: subir hacia donde hay más vecinos (reforzada dentro del pozo de atracción)
      const cohGain = U.wCoh.mul(U.lvlCoh).mul(cohAfterPulse).mul(float(1).add(attrFall.mul(U.attractCoh)));
      const cohSteer = limitLen(gradDir.mul(maxSpeed).mul(gradRel).sub(vel), maxForce).mul(presence).mul(cohGain);

      // Separación: presión. Si la zona está demasiado densa RESPECTO A LA MEDIA, alejarse.
      const crowd = max(U.crowdFactor.mul(U.meanDensity), U.crowdMin);
      const over = clamp(f0.x.sub(crowd).div(crowd), 0, 1);
      const sepSteer = limitLen(gradDir.negate().mul(maxSpeed).sub(vel), maxForce).mul(over).mul(U.wSep).mul(U.lvlSep);

      // ---- Corriente del universo: curl + deriva global (RUMBO) + mouse (RUMBO local) ----
      const flowVec = flowAt(pos).add(U.drift).add(sampleMouse(pos).mul(U.mouseWeight));
      const flowDesired = limitLen(flowVec, float(1)).mul(maxSpeed);
      const flowSteer = limitLen(flowDesired.sub(vel), maxForce).mul(U.wFlow);

      // ---- Wander suave, distinto en cada agente ----
      const wa = h3.mul(TAU).add(U.time.mul(h1.mul(0.4).add(0.3))).add(sin(U.time.mul(0.17).add(h2.mul(TAU))).mul(1.5));
      const wanderDir = vec2(cos(wa), sin(wa));
      const wanderSteer = limitLen(wanderDir.mul(maxSpeed).mul(0.5).sub(vel), maxForce).mul(U.wWander);

      // ---- Physarum: tres sensores leen la huella y el agente gira hacia el camino más marcado ----
      const heading = select(length(vel).greaterThan(1e-5), safeNorm(vel), wanderDir);
      const sC = trailA.element(trailIndex(pos.add(heading.mul(U.sensorDist))));
      const sL = trailA.element(trailIndex(pos.add(rotate(heading, U.sensorAngle).mul(U.sensorDist))));
      const sR = trailA.element(trailIndex(pos.add(rotate(heading, U.sensorAngle.negate()).mul(U.sensorDist))));
      const turn = select(sC.greaterThanEqual(max(sL, sR)), float(0),
        select(sL.greaterThan(sR), U.sensorAngle, U.sensorAngle.negate()));
      const sensed = max(max(sL, sR), sC);
      const sensSteer = limitLen(rotate(heading, turn).mul(maxSpeed).sub(vel), maxForce)
        .mul(U.wSensor).mul(U.lvlSensor).mul(smoothstep(0, 0.05, sensed));

      // ---- ATRACCIÓN: seek limitado (los agentes se curvan, no corren al cursor) ----
      const attrDesired = safeNorm(toAttr).mul(maxSpeed).mul(clamp(rAttr.div(U.attractRadius.mul(0.25)), 0, 1));
      const attrSteer = limitLen(attrDesired.sub(vel), maxForce).mul(attrFall).mul(U.wAttract);

      const acc = limitLen(
        sepSteer.add(aliSteer).add(cohSteer).add(flowSteer).add(wanderSteer).add(sensSteer).add(attrSteer),
        maxForce.mul(U.forceCap),
      ).add(pulseVec.mul(maxForce).mul(U.pulseForce));

      // ---- Integración ----
      vel.addAssign(acc.mul(U.dt));
      vel.assign(limitLen(vel, maxSpeed.mul(float(1).add(calm.mul(U.pulseSpeedup)))));
      pos.addAssign(vel.mul(U.dt));
      pos.assign(vec2(wrapMod(pos.x, U.world.x), wrapMod(pos.y, float(1))));

      // ---- Huella: cada agente deposita en el mapa de memoria ----
      atomicAdd(trailDep.element(trailIndex(pos)), U.deposit.mul(U.dt).mul(fade).mul(TFP).toInt());

      posBuf.element(i).assign(pos);
      velBuf.element(i).assign(vel);
      stateBuf.element(i).assign(vec4(f0.x.div(max(U.meanDensity, 0.01)), length(vel).div(maxSpeed), calm, fade));
    });
  })().compute(N);

  // 6) huella: difusión (desenfoque 3×3) + decaimiento + depósito del cuadro
  const kTrail = Fn(() => {
    const i = instanceIndex;
    const iF = i.toFloat();
    const ty = floor(iF.div(TW));
    const tx = iF.sub(ty.mul(TW));
    const at = (dx, dy) => {
      const x = wrapMod(tx.add(dx), float(TW));
      const y = wrapMod(ty.add(dy), float(TH));
      return trailA.element(y.mul(TW).add(x).toUint());
    };
    const blur = at(-1, -1).add(at(0, -1)).add(at(1, -1))
      .add(at(-1, 0)).add(at(0, 0)).add(at(1, 0))
      .add(at(-1, 1)).add(at(0, 1)).add(at(1, 1)).div(9);
    const v = mix(trailA.element(i), blur, U.trailDiffuse).mul(U.trailDecay);
    const dep = atomicLoad(trailDep.element(i)).toFloat().div(TFP);
    atomicStore(trailDep.element(i), int(0));
    trailB.element(i).assign(min(v.add(dep), 1e6));
  })().compute(TN);

  // 7) la huella nueva pasa a ser la que leen los sensores
  const kTrailCopy = Fn(() => {
    trailA.element(instanceIndex).assign(trailB.element(instanceIndex));
  })().compute(TN);

  // Reescala x al cambiar la relación de aspecto de la ventana
  const kRemap = Fn(() => {
    If(instanceIndex.lessThan(N), () => {
      const p = posBuf.element(instanceIndex);
      p.assign(vec2(p.x.mul(U.remap), p.y));
    });
  })().compute(N);

  // ── Control desde JS ───────────────────────────────────────
  let worldAspect = aspect;

  function layoutGrid() {
    const target = U.percep.value;
    const cellsX = Math.min(128, Math.max(3, Math.floor(worldAspect / target)));
    const cellsY = Math.min(32, Math.max(3, Math.floor(1 / target)));
    U.cells.value.set(cellsX, cellsY);
    U.cellSize.value.set(worldAspect / cellsX, 1 / cellsY);
    updateMeanDensity();
  }

  function updateMeanDensity() {
    U.meanDensity.value = U.alive.value / (U.cells.value.x * U.cells.value.y);
  }
  layoutGrid();

  const kernels = [kClear, kBin, kNorm, kMouse, kUpdate, kTrail, kTrailCopy];

  return {
    U, posBuf, velBuf, stateBuf, cellA, mouseMap, trailA,
    trail: { width: TW, height: TH, count: TN },
    nearness,
    kernels,

    step(dt, time) {
      U.dt.value = dt;
      U.time.value = time;
      renderer.compute(kernels);
    },

    // alive: agentes vivos (puede ser fraccionario); drawn: los que aún se calculan y dibujan
    setPopulation(alive, drawn) {
      U.alive.value = Math.max(0, Math.min(N, alive));
      U.active.value = Math.max(0, Math.min(N, Math.ceil(drawn)));
      updateMeanDensity();
    },
    get active() { return U.active.value; },
    get alive() { return U.alive.value; },

    setAspect(newAspect) {
      if (Math.abs(newAspect - worldAspect) < 1e-6) return;
      U.remap.value = newAspect / worldAspect;
      worldAspect = newAspect;
      U.world.value.set(newAspect, 1);
      layoutGrid();
      renderer.compute(kRemap);
    },

    setPerception(r) {
      U.percep.value = r;
      layoutGrid();
    },

    // Entrada del mouse en coordenadas del mundo (el mouse solo modifica el entorno)
    setMouse(x, y, vx, vy, on) {
      U.mouse.value.set(x, y);
      U.mouseVel.value.set(vx, vy);
      U.mouseOn.value = on ? 1 : 0;
    },
  };
}
