/**
 * Métricas del modo desarrollo: fps, tiempo por cuadro (promedio y peor), agentes,
 * resolución real del lienzo, tiempo simulado y de la pieza, más una gráfica de los
 * últimos segundos. Las líneas guía marcan 60 fps y 45 fps (umbral del guardián de
 * rendimiento previsto en docs/funcionalidad-completa.md §10).
 * No lee nada de la GPU: no frena la simulación.
 */
import { formatTime } from '../audio/music.js';

export function createMetrics(config) {
  const SAMPLES = Math.round(config.METRICS_GRAPH_SECONDS * 60);
  const GRAPH_MAX_MS = 50;

  const box = document.createElement('div');
  box.className = 'dev-ui';
  Object.assign(box.style, {
    position: 'fixed', top: '10px', left: '10px', width: '230px',
    background: 'rgba(8,10,18,0.88)', color: 'rgba(255,245,230,0.85)',
    font: '11px/1.45 ui-monospace, Menlo, monospace', padding: '10px 12px',
    borderRadius: '6px', border: '1px solid rgba(255,245,230,0.12)',
    zIndex: '9000', display: 'none', pointerEvents: 'none', whiteSpace: 'pre',
  });
  const text = document.createElement('div');
  const graph = document.createElement('canvas');
  graph.width = 230 * 2; graph.height = 60 * 2;
  Object.assign(graph.style, { width: '100%', height: '60px', marginTop: '6px', display: 'block' });
  box.appendChild(text);
  box.appendChild(graph);
  document.body.appendChild(box);
  const g = graph.getContext('2d');

  const history = new Float32Array(SAMPLES);
  let head = 0;
  let acc = 0, frames = 0, worst = 0;
  let shown = { fps: 0, avg: 0, worst: 0 };

  function drawGraph() {
    const w = graph.width, h = graph.height;
    g.clearRect(0, 0, w, h);
    const y = (ms) => h - Math.min(ms / GRAPH_MAX_MS, 1) * h;
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(120,200,140,0.5)';
    g.beginPath(); g.moveTo(0, y(1000 / 60)); g.lineTo(w, y(1000 / 60)); g.stroke();
    g.strokeStyle = 'rgba(230,170,90,0.5)';
    g.beginPath(); g.moveTo(0, y(1000 / 45)); g.lineTo(w, y(1000 / 45)); g.stroke();
    g.strokeStyle = 'rgba(255,245,230,0.85)';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < SAMPLES; i++) {
      const ms = history[(head + i) % SAMPLES];
      const px = (i / (SAMPLES - 1)) * w;
      if (i === 0) g.moveTo(px, y(ms)); else g.lineTo(px, y(ms));
    }
    g.stroke();
  }

  return {
    get visible() { return box.style.display !== 'none'; },
    setVisible(v) { box.style.display = v ? 'block' : 'none'; },

    // Se llama en cada cuadro. Solo escribe en pantalla cada ~0,5 s.
    frame(rawDt, info) {
      const ms = rawDt * 1000;
      history[head] = ms;
      head = (head + 1) % SAMPLES;
      acc += rawDt; frames++;
      worst = Math.max(worst, ms);
      if (acc < 0.5) return;
      shown = { fps: frames / acc, avg: (acc / frames) * 1000, worst };
      acc = 0; frames = 0; worst = 0;
      if (!this.visible) return;

      const m = info.music;
      const music = !m.available ? 'no disponible'
        : `${formatTime(m.time)} / ${formatTime(m.duration)}${m.playing ? '' : ' (pausa)'}`;
      text.textContent = [
        'MODO DESARROLLO  (M: performance)',
        '',
        `FPS            ${shown.fps.toFixed(0)}`,
        `ms por cuadro  ${shown.avg.toFixed(1)}  (peor ${shown.worst.toFixed(1)})`,
        `agentes        ${info.active.toLocaleString('es')} / ${info.max.toLocaleString('es')}`,
        `lienzo         ${info.canvasW}×${info.canvasH} px (×${info.dpr})`,
        `tiempo sim.    ${formatTime(info.simTime)}${info.paused ? '  EN PAUSA' : ''}`,
        `música         ${music}`,
      ].join('\n');
      drawGraph();
    },

    // Resumen corto para la tecla D (fps discreto, válido en ambos modos)
    get summary() { return `FPS ${shown.fps.toFixed(0)}`; },
  };
}
