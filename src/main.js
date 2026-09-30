import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './styles.css';

import { CONFIG } from './simulation/config.js';
import { FlowField } from './simulation/FlowField.js';
import { Flock } from './simulation/Flock.js';
import { createLabPanel } from './ui/labPanel.js';

async function main() {
  const mount = document.querySelector('#app');

  // ---- Scene + Camera + Renderer ----------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050607');

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  mount.appendChild(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, 0, 0);

  // ---- Simulation -------------------------------------------------------
  const flowField = new FlowField();
  const flock = new Flock(scene);

  // ---- Mouse Interaction ------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let isPointerDown = false;

  const updatePointer = (event) => {
    const pointerNdc = new THREE.Vector2(
      (event.clientX / innerWidth) * 2 - 1,
      -(event.clientY / innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointerNdc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      flowField.setInfluence(hit.x, hit.y, true);
    }
  };

  addEventListener('pointerdown', (e) => {
    // Si hace clic sobre el panel LAB, ignoramos para que interactúe la UI
    if (e.target.closest('.panel')) return;
    isPointerDown = true;
    updatePointer(e);
  });
  
  addEventListener('pointerup', () => {
    isPointerDown = false;
    flowField.setInfluence(0, 0, false);
  });
  
  addEventListener('pointermove', (e) => {
    if (isPointerDown) updatePointer(e);
  });

  // ---- UI ---------------------------------------------------------------
  let paused = false;
  let mode = 'LAB';

  const panel = createLabPanel({
    config: CONFIG,
    onReset: () => flock.reset(),
    onModeChange: () => setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB'),
    onPauseChange: () => { paused = !paused; },
  });

  const hud = document.createElement('div');
  hud.className = 'hud';
  document.body.append(hud);

  const setMode = (next) => {
    mode = next;
    const lab = mode === 'LAB';
    panel.setVisible(lab);
    orbit.enabled = lab;
    hud.innerHTML = lab
      ? '<strong>LAB</strong> · P: performance · R: reset · D: debug mode'
      : '';
  };
  setMode('LAB');

  // ---- Keyboard ---------------------------------------------------------
  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'KeyP') setMode(mode === 'LAB' ? 'PERFORMANCE' : 'LAB');
    if (event.code === 'KeyR') flock.reset();
    if (event.code === 'KeyD') flock.toggleDebug();
  });

  // ---- Resize -----------------------------------------------------------
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---- Animation loop ---------------------------------------------------
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (!paused) {
      // Limitar dt para que si cambias de pestaña, la simulación no salte muy lejos
      const safeDt = Math.min(dt, 0.1); 
      flock.update(safeDt, flowField, elapsed);
    }

    orbit.update();
    renderer.render(scene, camera);
  });
}

main().catch((error) => {
  console.error(error);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:16px;white-space:pre-wrap;color:#fff;z-index:50';
  pre.textContent = String(error?.stack || error);
  document.body.append(pre);
});
