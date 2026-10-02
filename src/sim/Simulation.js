/**
 * Simulación 100 % en GPU (WebGPU + TSL).
 *
 * Cadena de comportamiento por agente:
 *   flow field (corriente local) + vecinos (flocking) + mouse (mapa de entorno)
 *   → fuerzas de steering estilo Reynolds, limitadas → aceleración → velocidad → posición.
 *
 * Percepción local: cada agente solo percibe los campos de su alrededor inmediato
 * (≈ un radio de percepción), nunca el universo completo. Los vecinos se resumen en dos
 * campos suaves sobre una rejilla, con depósito bilineal ("cloud-in-cell") para que no
 * aparezca la retícula:
 *   · densidad  → cohesión (subir por el gradiente) y separación (presión: alejarse de
 *                 zonas demasiado densas)
 *   · momento   → alineación (velocidad media de los vecinos)
 * Se resta la contribución del propio agente de los campos que percibe.
 *
 * Buffers de almacenamiento por shader: máximo 5 (el límite por defecto de WebGPU es 8).
 */
import * as THREE from 'three/webgpu';
import {
  Fn, If, Loop, uniform, instancedArray, instanceIndex,
  float, int, vec2, vec3, vec4,
  floor, fract, clamp, mix, select, length, max, exp, sin, cos, pow, smoothstep,
  atomicAdd, atomicStore, atomicLoad, hash, mx_noise_float,
} from 'three/tsl';

import { makeInitialState } from './initialState.js';

export function createSimulation(renderer, config, aspect) {
  const N = config.MAX_AGENTS;
  const MM = config.MOUSE_MAP_RES;
  const MAX_CELLS = config.MAX_CELLS;
  const FP = config.FIXED_POINT_SCALE;
  const TAU = Math.PI * 2;

  // ── Buffers ────────────────────────────────────────────────
  const init = makeInitialState(N, aspect, config);
  const posBuf = instancedArray(init.pos, 'vec2');
  const velBuf = instancedArray(init.vel, 'vec2');
  const stateBuf = instancedArray(N, 'vec2');                       // x: presencia de vecinos, y: velocidad relativa
  const cellAtomic = instancedArray(MAX_CELLS * 3, 'int').toAtomic(); // por celda: Σw, Σw·vx, Σw·vy (punto fijo)
  const cellA = instancedArray(MAX_CELLS, 'vec4');                  // x: densidad (agentes/celda), y,z: momento
  const mouseMap = instancedArray(MM * MM, 'vec2');                 // perturbación acumulada del mouse

  // ── Uniforms (ajustables en vivo) ──────────────────────────
  const U = {
    dt: uniform(1 / 60),
    time: uniform(0),
    world: uniform(new THREE.Vector2(aspect, 1)),
    cells: uniform(new THREE.Vector2(3, 3)),
    cellSize: uniform(new THREE.Vector2(0.1, 0.1)),
    active: uniform(config.DEFAULT_AGENTS, 'uint'),
    remap: uniform(1),

    maxSpeed: uniform(config.MAX_SPEED),
    maxForce: uniform(config.MAX_FORCE),
    forceCap: uniform(config.FORCE_CAP),
    variation: uniform(config.VARIATION),
    percep: uniform(config.PERCEPTION_RADIUS),
    crowd: uniform(config.CROWD_LIMIT),
    presenceN: uniform(config.PRESENCE_N),
    wSep: uniform(config.W_SEPARATION),
    wAli: uniform(config.W_ALIGNMENT),
    wCoh: uniform(config.W_COHESION),
    wWander: uniform(config.W_WANDER),

    wFlow: uniform(config.W_FLOW),
    flowScale: uniform(config.FLOW_SCALE),
    flowSpeed: uniform(config.FLOW_SPEED),
    flowGain: uniform(config.FLOW_GAIN),
    octaves: uniform(new THREE.Vector4(...config.FLOW_OCTAVES)),

    mouse: uniform(new THREE.Vector2(-10, -10)),
    mouseVel: uniform(new THREE.Vector2(0, 0)),
    mouseOn: uniform(0),
    mouseRadius: uniform(config.MOUSE_RADIUS),
    mouseStrength: uniform(config.MOUSE_STRENGTH),
    mouseSwirl: uniform(config.MOUSE_SWIRL),
    mouseDecay: uniform(config.MOUSE_DECAY),
    mouseWeight: uniform(config.MOUSE_WEIGHT),
    mouseMax: uniform(config.MOUSE_MAX),
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

  // Potencial escalar con 4 octavas; su "curl" da corrientes sin sumideros.
  const flowPsi = Fn(([q, t]) => {
    const a = U.octaves;
    const n0 = mx_noise_float(vec3(q, t));
    const n1 = mx_noise_float(vec3(q.mul(2.07).add(vec2(17.3, 9.1)), t.mul(1.7).add(5.2)));
    const n2 = mx_noise_float(vec3(q.mul(4.31).add(vec2(-8.7, 23.4)), t.mul(2.9).add(11.7)));
    const n3 = mx_noise_float(vec3(q.mul(8.9).add(vec2(41.2, -3.3)), t.mul(4.6).add(2.2)));
    return n0.mul(a.x).add(n1.mul(a.y)).add(n2.mul(a.z)).add(n3.mul(a.w));
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

  // ── Kernels ────────────────────────────────────────────────

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

  // 1) limpiar la rejilla
  const kClear = Fn(() => {
    const base = instanceIndex.mul(3);
    atomicStore(cellAtomic.element(base), int(0));
    atomicStore(cellAtomic.element(base.add(1)), int(0));
    atomicStore(cellAtomic.element(base.add(2)), int(0));
  })().compute(MAX_CELLS);

  // 2) cada agente deposita su "masa" y su velocidad en las 4 celdas más cercanas (bilineal)
  const kBin = Fn(() => {
    If(instanceIndex.lessThan(U.active), () => {
      const p = posBuf.element(instanceIndex);
      const v = velBuf.element(instanceIndex);
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
        atomicAdd(cellAtomic.element(base), wt.mul(FP).toInt());
        atomicAdd(cellAtomic.element(base.add(1)), wt.mul(v.x).mul(FP).toInt());
        atomicAdd(cellAtomic.element(base.add(2)), wt.mul(v.y).mul(FP).toInt());
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

  // 5) agentes: percepción local, steering, integración
  const kUpdate = Fn(() => {
    If(instanceIndex.lessThan(U.active), () => {
      const i = instanceIndex;
      const pos = posBuf.element(i).toVar();
      const vel = velBuf.element(i).toVar();

      const h1 = hash(i.add(101));
      const h2 = hash(i.add(7919));
      const h3 = hash(i.add(104729));
      const maxSpeed = U.maxSpeed.mul(float(1).add(h1.mul(2).sub(1).mul(U.variation)));

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
        .add(gx.mul(gx).mul(fy).mul(fy)).add(fx.mul(fx).mul(fy).mul(fy));
      const nOthers = max(f0.x.sub(selfW), 0);
      const mOthers = vec2(f0.y, f0.z).sub(vel.mul(selfW));
      const presence = clamp(nOthers.div(U.presenceN), 0, 1);

      // Alineación: igualar la velocidad media de los vecinos
      const vAvg = mOthers.div(max(nOthers, 0.05));
      const aliSteer = limitLen(vAvg.sub(vel), U.maxForce).mul(presence).mul(U.wAli);

      // Gradiente de densidad (hacia dónde hay más vecinos)
      const hx = U.cellSize.x;
      const hy = U.cellSize.y;
      const gradX = fieldAt(pos.add(vec2(hx, 0))).x.sub(fieldAt(pos.sub(vec2(hx, 0))).x).div(hx.mul(2));
      const gradY = fieldAt(pos.add(vec2(0, hy))).x.sub(fieldAt(pos.sub(vec2(0, hy))).x).div(hy.mul(2));
      const grad = vec2(gradX, gradY);
      const gradDir = safeNorm(grad);
      const gradRel = clamp(length(grad).mul(hx).div(max(f0.x, 1)), 0, 1);

      // Cohesión: subir hacia donde hay más vecinos
      const cohSteer = limitLen(gradDir.mul(maxSpeed).mul(gradRel).sub(vel), U.maxForce).mul(presence).mul(U.wCoh);

      // Separación: presión. Si la zona está demasiado densa, alejarse de ella
      const over = clamp(f0.x.sub(U.crowd).div(U.crowd), 0, 1);
      const sepSteer = limitLen(gradDir.negate().mul(maxSpeed).sub(vel), U.maxForce).mul(over).mul(U.wSep);

      // ---- Corriente del universo + perturbación del mouse ----
      const flowVec = flowAt(pos).add(sampleMouse(pos).mul(U.mouseWeight));
      const flowDesired = limitLen(flowVec, float(1)).mul(maxSpeed);
      const flowSteer = limitLen(flowDesired.sub(vel), U.maxForce).mul(U.wFlow);

      // ---- Wander suave, distinto en cada agente ----
      const wa = h3.mul(TAU).add(U.time.mul(h1.mul(0.4).add(0.3))).add(sin(U.time.mul(0.17).add(h2.mul(TAU))).mul(1.5));
      const wanderDesired = vec2(cos(wa), sin(wa)).mul(maxSpeed).mul(0.5);
      const wanderSteer = limitLen(wanderDesired.sub(vel), U.maxForce).mul(U.wWander);

      const acc = limitLen(
        sepSteer.add(aliSteer).add(cohSteer).add(flowSteer).add(wanderSteer),
        U.maxForce.mul(U.forceCap),
      );

      // ---- Integración ----
      vel.addAssign(acc.mul(U.dt));
      vel.assign(limitLen(vel, maxSpeed));
      pos.addAssign(vel.mul(U.dt));
      pos.assign(vec2(wrapMod(pos.x, U.world.x), wrapMod(pos.y, float(1))));

      posBuf.element(i).assign(pos);
      velBuf.element(i).assign(vel);
      stateBuf.element(i).assign(vec2(f0.x, length(vel).div(maxSpeed)));
    });
  })().compute(N);

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
  }
  layoutGrid();

  const kernels = [kClear, kBin, kNorm, kMouse, kUpdate];

  return {
    U, posBuf, velBuf, stateBuf, cellA, mouseMap,
    kernels,

    step(dt, time) {
      U.dt.value = dt;
      U.time.value = time;
      renderer.compute(kernels);
    },

    setActive(n) {
      U.active.value = Math.max(0, Math.min(N, Math.floor(n)));
    },
    get active() { return U.active.value; },

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
