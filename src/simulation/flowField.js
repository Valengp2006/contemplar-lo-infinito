/**
 * Contemplar lo infinito — Flow Field
 *
 * Dos texturas de almacenamiento:
 *   1. flowTex  — dirección del campo (RG = vec2 normalizado).
 *   2. mouseTex — mapa de influencia del mouse (R = rotación acumulada).
 *
 * Compute shaders:
 *   • updateMouseMap  — deposita influencia del mouse y decae.
 *   • updateFlowField — genera el campo con noise + tiempo + mouseTex.
 */

import {
  StorageTexture,
} from 'three/webgpu';

import {
  Fn, uniform, float, vec2, ivec2, vec4, uint,
  instanceIndex, textureStore, textureLoad,
  sin, cos, floor, fract, mix, abs, clamp,
  length, normalize, smoothstep, atan,
  hash,
  compute,
} from 'three/tsl';

import config from '../config.js';

/* ─── Uniforms ──────────────────────────────────────────────── */

export const uTime       = uniform(0.0);
export const uDt         = uniform(0.016);
export const uWorldWidth = uniform(1.0);

// Mouse: posición actual (unidades del mundo), velocidad, activo
export const uMousePos   = uniform(vec2(0, 0));
export const uMouseVel   = uniform(vec2(0, 0));
export const uMouseActive = uniform(0.0);        // 0 o 1

/* ─── Texturas ──────────────────────────────────────────────── */

const RES  = config.FLOW_FIELD_RESOLUTION;
const MRES = config.MOUSE_MAP_RESOLUTION;

export const flowTex  = new StorageTexture(RES, RES);
export const mouseTex = new StorageTexture(MRES, MRES);

/* ─── Noise helpers (value noise 2-D con derivada temporal) ── */
// hash de TSL opera sobre un escalar uint.
// Construimos un hash 2-D → [0,1) a partir de él.

const hash21 = Fn(([p_immutable]) => {
  const p = vec2(p_immutable);
  const n = p.x.mul(127.1).add(p.y.mul(311.7));
  return hash(n);
});

const hash22 = Fn(([p_immutable]) => {
  const p = vec2(p_immutable);
  return vec2(
    hash(p.x.mul(127.1).add(p.y.mul(311.7))),
    hash(p.x.mul(269.5).add(p.y.mul(183.3)))
  );
});

// Value noise 2-D suave
const valueNoise2D = Fn(([p_immutable]) => {
  const p = vec2(p_immutable);
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0))); // smoothstep hermite

  const a = hash21(i);
  const b = hash21(i.add(vec2(1, 0)));
  const c = hash21(i.add(vec2(0, 1)));
  const d = hash21(i.add(vec2(1, 1)));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

// FBM con octavas configurables (compiladas para hasta 5)
const fbm = Fn(([p_immutable, octaves_immutable]) => {
  const p = vec2(p_immutable).toVar();
  const octaves = float(octaves_immutable);
  const value = float(0).toVar();
  const amp   = float(0.5).toVar();
  const totalAmp = float(0).toVar();

  // Desenrollar hasta 5 octavas — TSL no soporta Loop con un
  // tope dinámico fácilmente, así que usamos 5 iteraciones con
  // peso nulo donde i >= octaves.
  const rot = vec2(1.6, 1.2); // pseudo-rotación por octava
  // Octave 0
  value.addAssign(valueNoise2D(p).mul(amp));
  totalAmp.addAssign(amp);
  amp.mulAssign(0.5);
  p.assign(vec2(p.x.mul(rot.x).sub(p.y.mul(rot.y)),
                p.x.mul(rot.y).add(p.y.mul(rot.x))));
  // Octave 1
  const w1 = smoothstep(float(1), float(1.5), octaves);
  value.addAssign(valueNoise2D(p).mul(amp).mul(w1));
  totalAmp.addAssign(amp.mul(w1));
  amp.mulAssign(0.5);
  p.assign(vec2(p.x.mul(rot.x).sub(p.y.mul(rot.y)),
                p.x.mul(rot.y).add(p.y.mul(rot.x))));
  // Octave 2
  const w2 = smoothstep(float(2), float(2.5), octaves);
  value.addAssign(valueNoise2D(p).mul(amp).mul(w2));
  totalAmp.addAssign(amp.mul(w2));
  amp.mulAssign(0.5);
  p.assign(vec2(p.x.mul(rot.x).sub(p.y.mul(rot.y)),
                p.x.mul(rot.y).add(p.y.mul(rot.x))));
  // Octave 3
  const w3 = smoothstep(float(3), float(3.5), octaves);
  value.addAssign(valueNoise2D(p).mul(amp).mul(w3));
  totalAmp.addAssign(amp.mul(w3));
  amp.mulAssign(0.5);
  p.assign(vec2(p.x.mul(rot.x).sub(p.y.mul(rot.y)),
                p.x.mul(rot.y).add(p.y.mul(rot.x))));
  // Octave 4
  const w4 = smoothstep(float(4), float(4.5), octaves);
  value.addAssign(valueNoise2D(p).mul(amp).mul(w4));
  totalAmp.addAssign(amp.mul(w4));

  return value.div(totalAmp);
});

/* ─── Compute: actualizar mapa de mouse ─────────────────────── */

const mouseMapRes = float(MRES);

export const updateMouseMapCompute = Fn(() => {
  const idx  = instanceIndex.toVar();
  const texX = idx.mod(MRES).toInt();
  const texY = idx.div(MRES).toInt();
  const uv   = vec2(texX.toFloat().add(0.5), texY.toFloat().add(0.5)).div(mouseMapRes);

  // Coordenadas del mundo para este texel
  const worldPos = vec2(uv.x.mul(uWorldWidth), uv.y);

  // Leer valor anterior y decaer
  const prev = textureLoad(mouseTex, ivec2(texX, texY)).x.toVar();
  const decayed = prev.mul(float(1.0).sub(clamp(uDt.mul(config.MOUSE_DECAY_RATE), 0, 1)));

  // Depositar si el mouse está activo
  const dist = length(worldPos.sub(uMousePos));
  const mouseSpeed = length(uMouseVel);
  const influence = smoothstep(
    float(config.MOUSE_INFLUENCE_RADIUS), float(0.0), dist
  ).mul(mouseSpeed).mul(config.MOUSE_INFLUENCE_STRENGTH).mul(uMouseActive);

  // La rotación depositada se basa en la dirección del mouse
  const mouseAngle = atan(uMouseVel.y, uMouseVel.x);
  const deposit = influence.mul(mouseAngle);

  const result = decayed.add(deposit);
  textureStore(mouseTex, ivec2(texX, texY), vec4(result, 0, 0, 1));
})().compute(MRES * MRES);

/* ─── Compute: actualizar flow field ────────────────────────── */

const flowRes = float(RES);
const uFlowScale   = uniform(config.FLOW_FIELD_SCALE);
const uFlowSpeed   = uniform(config.FLOW_FIELD_SPEED);
const uFlowOctaves = uniform(config.FLOW_FIELD_OCTAVES);

export const updateFlowFieldCompute = Fn(() => {
  const idx  = instanceIndex.toVar();
  const texX = idx.mod(RES).toInt();
  const texY = idx.div(RES).toInt();
  const uv   = vec2(texX.toFloat().add(0.5), texY.toFloat().add(0.5)).div(flowRes);

  // Coordenadas de noise con evolución temporal
  const noiseCoord = vec2(
    uv.x.mul(uWorldWidth).mul(uFlowScale),
    uv.y.mul(uFlowScale)
  );
  const timeOffset = uTime.mul(uFlowSpeed);

  // Ángulo base del campo: noise con dimensión temporal
  const n1 = fbm(noiseCoord.add(vec2(timeOffset, 0.0)), uFlowOctaves);
  const n2 = fbm(noiseCoord.add(vec2(0.0, timeOffset.mul(0.7))), uFlowOctaves);
  const angle = n1.sub(0.5).mul(Math.PI * 4).add(n2.sub(0.5).mul(Math.PI * 2));

  // Leer mapa de mouse y sumar rotación
  // Convertir uv a coordenadas del mouse map
  const mouseCoordX = uv.x.mul(float(MRES)).toInt();
  const mouseCoordY = uv.y.mul(float(MRES)).toInt();
  const mouseRotation = textureLoad(mouseTex, ivec2(mouseCoordX, mouseCoordY)).x;

  const finalAngle = angle.add(mouseRotation);

  // Dirección del campo
  const dir = vec2(cos(finalAngle), sin(finalAngle));

  textureStore(flowTex, ivec2(texX, texY), vec4(dir.x, dir.y, 0, 1));
})().compute(RES * RES);
