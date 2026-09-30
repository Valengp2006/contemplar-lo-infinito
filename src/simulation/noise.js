/**
 * Simplex Noise 2D — compact implementation for flow field generation.
 *
 * Based on the public-domain reference by Stefan Gustavson.
 * Produces smooth, continuous noise values in the range [-1, 1].
 */

// Gradients for 2D simplex noise
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Permutation table (doubled to avoid wrapping)
const PERM = new Uint8Array(512);
const PERM_MOD8 = new Uint8Array(512);

// Seed the permutation table
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with a fixed seed for reproducibility
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
    PERM_MOD8[i] = PERM[i] % 8;
  }
})();

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function dot2(g, x, y) {
  return g[0] * x + g[1] * y;
}

/**
 * Evaluate 2D simplex noise at (x, y).
 * @param {number} x
 * @param {number} y
 * @returns {number} value in [-1, 1]
 */
export function noise2D(x, y) {
  // Skew input space to determine simplex cell
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);

  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;

  // Determine which simplex we are in
  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; }
  else { i1 = 0; j1 = 1; }

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  const ii = i & 255;
  const jj = j & 255;

  // Contribution from the three corners
  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    const gi0 = PERM_MOD8[ii + PERM[jj]];
    n0 = t0 * t0 * dot2(GRAD2[gi0], x0, y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    const gi1 = PERM_MOD8[ii + i1 + PERM[jj + j1]];
    n1 = t1 * t1 * dot2(GRAD2[gi1], x1, y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    const gi2 = PERM_MOD8[ii + 1 + PERM[jj + 1]];
    n2 = t2 * t2 * dot2(GRAD2[gi2], x2, y2);
  }

  // Scale to [-1, 1]
  return 70 * (n0 + n1 + n2);
}
