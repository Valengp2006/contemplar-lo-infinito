/**
 * Banco de pruebas de GPU (fuera del navegador).
 * Ejecuta los shaders REALES de la simulación con WebGPU (Dawn) y reporta:
 * errores de validación, valores inválidos (NaN), estadísticas y una imagen.
 *
 * Uso:   npm run gpu-check            (5.000 agentes, 30 s simulados)
 *        N=20000 T=45 npm run gpu-check
 *        LEVEL=3 npm run gpu-check     (nivel de REVELACIÓN; sin LEVEL se fija la cantidad N)
 * Durante la prueba se lanzan PULSOS y se mantiene una ATRACCIÓN para validar sus shaders.
 * Salida: tools/out/gpu-check.png
 *
 * Nota: mide estabilidad y comportamiento, no los fps del navegador.
 */
import { create, globals } from 'webgpu';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
Object.assign(globalThis, globals);
const gpu = create([]);
if (!globalThis.navigator) globalThis.navigator = {};
Object.defineProperty(globalThis.navigator, 'gpu', { value: gpu, configurable: true });

const adapter = await gpu.requestAdapter();
if (!adapter) { console.error('No hay adaptador WebGPU disponible.'); process.exit(1); }
console.log('adaptador:', adapter.info.vendor, adapter.info.architecture, adapter.info.description || '');
const device = await adapter.requestDevice({ requiredFeatures: [...adapter.features] });
const errors = [];
device.addEventListener('uncapturederror', (e) => errors.push(e.error.message));

const W = 960, H = 540;
const canvas = { width: W, height: H, style: {}, getContext: () => context, addEventListener() {}, removeEventListener() {}, setAttribute() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }) };
const context = { canvas, configure() {}, getCurrentTexture: () => device.createTexture({ size: [W, H], format: 'bgra8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC }) };
const raf = (f) => setTimeout(() => f(performance.now()), 16);
globalThis.requestAnimationFrame = raf;
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.self = globalThis;
globalThis.window = { devicePixelRatio: 1, addEventListener() {}, innerWidth: W, innerHeight: H, requestAnimationFrame: raf, cancelAnimationFrame: (id) => clearTimeout(id) };

const THREE = await import('three/webgpu');
const { default: baseConfig } = await import('../src/config.js');
const { createSimulation } = await import('../src/sim/Simulation.js');
const { createParticles } = await import('../src/render/Particles.js');
const { createTrail } = await import('../src/render/Trail.js');
const { createPost } = await import('../src/render/Post.js');
const { createInstrument } = await import('../src/sim/Instrument.js');

const renderer = new THREE.WebGPURenderer({ canvas, context, device, antialias: false });
renderer.onError = (info) => errors.push(`[three] ${info.message}`);
await renderer.init();

const Nenv = parseInt(process.env.N || '5000', 10);
const T = parseFloat(process.env.T || '30');
const LEVEL = process.env.LEVEL !== undefined ? parseFloat(process.env.LEVEL) : null;
const config = { ...baseConfig, MAX_AGENTS: LEVEL === null ? Nenv : baseConfig.MAX_AGENTS };
const aspect = W / H;

const sim = createSimulation(renderer, config, aspect);
const instrument = createInstrument(sim, config);
if (LEVEL === null) { instrument.setLevelNow(4); instrument.setCount(Nenv); instrument.state.alive = Nenv; instrument.state.drawn = Nenv; }
else instrument.setLevelNow(LEVEL);
const particles = createParticles(sim, config, H);
const trail = createTrail(sim, config, aspect);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, aspect, 1, 0, 0.1, 10);
camera.position.z = 1;
scene.add(trail.object);
scene.add(particles.object);

const read = async (node) => new Float32Array(await renderer.getArrayBufferAsync(node.value));
const fail = () => { console.log('\nERRORES DE GPU:\n' + errors.slice(0, 5).join('\n---\n')); process.exit(2); };

const dt = 1 / 30;
let time = 0;
const t0 = performance.now();
const tick = () => { instrument.update(dt); sim.step(dt, time); };
tick();
await device.queue.onSubmittedWorkDone();
if (errors.length) fail();
// Pulsos y atracción a mitad de la prueba (validan sus shaders; no se ven en la foto final)
while (time < T) {
  time += dt;
  if (Math.abs(time - T * 0.3) < dt / 2) instrument.pulse(aspect * 0.5, 0.5);
  if (Math.abs(time - T * 0.35) < dt / 2) instrument.pulse(aspect * 0.3, 0.6);
  instrument.setAttract(time > T * 0.5 && time < T * 0.6, aspect * 0.7, 0.4);
  tick();
}
await device.queue.onSubmittedWorkDone();
const ms = performance.now() - t0;
if (errors.length) fail();

const N = sim.active;
const pos = await read(sim.posBuf);
const trailVals = await read(sim.trailA);
const vel = await read(sim.velBuf);
let nan = 0, speed = 0, edges = 0;
for (let i = 0; i < N; i++) {
  const x = pos[i * 2], y = pos[i * 2 + 1], vx = vel[i * 2], vy = vel[i * 2 + 1];
  if (![x, y, vx, vy].every(Number.isFinite)) { nan++; continue; }
  speed += Math.hypot(vx, vy);
  const u = x / aspect;
  if (u < 0.01 || u > 0.99 || y < 0.01 || y > 0.99) edges++;
}
const steps = Math.round(T / dt);
console.log({
  agentes: N,
  nivel: LEVEL ?? '(cantidad fija)',
  huellaMax: trailVals.reduce((m, v) => Math.max(m, v), 0).toFixed(3),
  segundosSimulados: T,
  pasos: steps,
  msPorPasoAprox: (ms / steps).toFixed(2),
  valoresInvalidos: nan,
  velocidadMedia: (speed / N).toFixed(4),
  velocidadMaximaConfig: config.MAX_SPEED,
  enBordesPct: ((100 * edges) / N).toFixed(2) + ' (≈ 4 % si es uniforme)',
});

particles.update(60, sim.active, sim.alive, instrument.visuals); // compensación de luz ya asentada
trail.update(instrument);
const rt = new THREE.RenderTarget(W, H, { type: THREE.UnsignedByteType });
renderer.setRenderTarget(rt);
renderer.setClearColor(config.BACKGROUND, 1);
renderer.render(scene, camera);
const px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, W, H);
renderer.setRenderTarget(null);
await device.queue.onSubmittedWorkDone();
if (errors.length) fail();

// El resplandor (bloom) se ejecuta una vez para validar su pipeline (no sale en la foto)
const post = createPost(renderer, scene, camera, config);
post.update({ bloom: 0.6 });
post.render();
await device.queue.onSubmittedWorkDone();
if (errors.length) fail();

const png = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const s = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 4;
    png.data[d] = px[s]; png.data[d + 1] = px[s + 1]; png.data[d + 2] = px[s + 2]; png.data[d + 3] = 255;
  }
}
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'gpu-check.png');
fs.writeFileSync(file, PNG.sync.write(png));
console.log('imagen:', path.relative(process.cwd(), file));
console.log('OK: sin errores de GPU');
process.exit(0);
