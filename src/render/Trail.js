/**
 * Huella Physarum en pantalla completa, mezclada de forma aditiva BAJO las partículas.
 * Lee el mapa de memoria directamente del buffer de la GPU (solo lectura).
 *
 * Rampa de intensidad (sección 5 de docs/funcionalidad-completa.md):
 *   casi invisible con poca huella → azul profundo con más → blanco cálido en las
 *   intersecciones fuertes. Con MEMORIA alta y color, el azul se inclina al violeta
 *   ("violeta donde la huella persiste").
 * La huella se mide RELATIVA a su valor medio, así se ve igual con 3.000 o 200.000 agentes.
 */
import * as THREE from 'three/webgpu';
import {
  uniform, storage, uv, vec3, vec4, float, floor, fract, mix, smoothstep, max, int,
} from 'three/tsl';

export function createTrail(sim, config, aspect) {
  const C = config.PALETTE;
  const { width: TW, height: TH, count: TN } = sim.trail;
  const trail = storage(sim.trailA.value, 'float', TN).toReadOnly();

  const uMean = uniform(1);           // valor medio esperado de la huella
  const uVisible = uniform(0);        // visibilidad (nivel × panel)
  const uViolet = uniform(0);         // inclinación al violeta (memoria × color)
  const visibility = { value: config.TRAIL_VISIBILITY };

  // Lectura bilineal con envoltura toroidal
  const at = (x, y) => {
    const xi = x.sub(floor(x.div(TW)).mul(TW));
    const yi = y.sub(floor(y.div(TH)).mul(TH));
    return trail.element(int(yi).mul(TW).add(int(xi)));
  };
  const u = uv().x.mul(TW).sub(0.5);
  const v = uv().y.mul(TH).sub(0.5);
  const x0 = floor(u);
  const y0 = floor(v);
  const fx = fract(u);
  const fy = fract(v);
  const value = mix(
    mix(at(x0, y0), at(x0.add(1), y0), fx),
    mix(at(x0, y0.add(1)), at(x0.add(1), y0.add(1)), fx),
    fy,
  );

  const r = value.div(max(uMean, 1e-6));
  const blueAmt = smoothstep(2.5, 12.0, r);
  const whiteAmt = smoothstep(12.0, 45.0, r);
  const blue = mix(vec3(...C.trailBlue), vec3(...C.violet), uViolet);
  const color = mix(blue.mul(blueAmt.mul(0.2)), vec3(...C.warm).mul(0.4), whiteAmt);
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  material.colorNode = vec4(color.mul(uVisible), float(1));

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  const place = (a) => { mesh.position.set(a / 2, 0.5, 0); mesh.scale.set(a, 1, 1); };
  place(aspect);

  return {
    object: mesh,
    uniforms: { visibility },
    setAspect: place,
    // Cada cuadro: valor medio esperado (para medir la huella en relativo) y visibilidad
    update(instrument) {
      const U = sim.U;
      const tau = instrument.memorySeconds() / Math.LN2;
      const deposit = U.deposit.value;
      uMean.value = Math.max((sim.alive * deposit * tau) / TN, 1e-6);
      uVisible.value = visibility.value * clamp01(deposit / (config.DEPOSIT_RATE * 0.2));
      const memory = instrument.state.memory;
      uViolet.value = clamp01((memory - 0.4) / 0.5) * clamp01(instrument.visuals.color * 2);
    },
  };
}

function clamp01(x) { return Math.min(1, Math.max(0, x)); }
