/**
 * Distribución inicial de los agentes: dispersa y ligeramente orgánica.
 * Muestreo por rechazo sobre ruido de varias octavas: hay zonas más y menos
 * pobladas, sin formar ninguna figura reconocible (ni cuadrícula, ni círculo).
 */

function hash2(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function valueNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fade(x - ix), fy = fade(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}

function density(x, y) {
  // 3 octavas, con rotación entre ellas para evitar bandas alineadas a los ejes
  let v = 0, amp = 0.55, f = 2.1, sum = 0;
  let px = x, py = y;
  for (let o = 0; o < 3; o++) {
    v += amp * valueNoise(px * f, py * f, 11 + o * 7);
    sum += amp;
    amp *= 0.5;
    f *= 2.03;
    const rx = px * 0.8 - py * 0.6, ry = px * 0.6 + py * 0.8;
    px = rx + 3.7; py = ry - 1.9;
  }
  v /= sum;
  // Contraste: favorece zonas densas y deja vacíos reales
  const t = Math.min(1, Math.max(0, (v - 0.32) / 0.4));
  return 0.04 + 0.96 * t * t;
}

export function makeInitialState(count, aspect, config, rand = Math.random) {
  const pos = new Float32Array(count * 2);
  const vel = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 40; tries++) {
      x = rand() * aspect;
      y = rand();
      if (rand() < density(x / aspect * 1.6, y * 1.6)) break;
    }
    pos[i * 2] = x;
    pos[i * 2 + 1] = y;
    const a = rand() * Math.PI * 2;
    const s = config.MAX_SPEED * 0.3 * rand();
    vel[i * 2] = Math.cos(a) * s;
    vel[i * 2 + 1] = Math.sin(a) * s;
  }
  return { pos, vel };
}
