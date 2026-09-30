// ---- Helpers ------------------------------------------------------------

function rangeRow(parent, label, object, key, min, max, step) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const lab = document.createElement('label');
  const name = document.createElement('span');
  const value = document.createElement('span');
  value.className = 'value';
  name.textContent = label;
  lab.append(name, value);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(object[key]);
  const refresh = () => {
    object[key] = Number(input.value);
    value.textContent = Number(input.value).toFixed(step < 0.01 ? 3 : 2);
  };
  input.addEventListener('input', refresh);
  refresh();
  wrap.append(lab, input);
  parent.append(wrap);
  return {
    refresh() {
      input.value = String(object[key]);
      value.textContent = Number(object[key]).toFixed(step < 0.01 ? 3 : 2);
    }
  };
}

function button(parent, label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.append(b);
  return b;
}

// ---- Panel --------------------------------------------------------------

export function createLabPanel({ config, onReset, onModeChange, onPauseChange }) {
  const refreshers = [];
  const panel = document.createElement('aside');
  panel.className = 'panel';
  panel.innerHTML = `
    <h1>Contemplar lo infinito</h1>
    <p>LAB: ajusta pesos y observa. <strong>P</strong> cambia a PERFORMANCE.</p>
  `;

  // -- Flocking weights --
  const flock = document.createElement('div');
  flock.className = 'group';
  flock.innerHTML = '<h2>Flocking</h2>';
  panel.append(flock);

  refreshers.push(rangeRow(flock, 'Separation', config, 'separationWeight', 0, 5, 0.1));
  refreshers.push(rangeRow(flock, 'Alignment', config, 'alignmentWeight', 0, 5, 0.1));
  refreshers.push(rangeRow(flock, 'Cohesion', config, 'cohesionWeight', 0, 5, 0.1));
  refreshers.push(rangeRow(flock, 'Perception radius', config, 'perceptionRadius', 0.5, 8, 0.1));

  // -- Flow field --
  const flow = document.createElement('div');
  flow.className = 'group';
  flow.innerHTML = '<h2>Flow Field</h2>';
  panel.append(flow);

  refreshers.push(rangeRow(flow, 'Flow weight', config, 'flowWeight', 0, 5, 0.1));
  refreshers.push(rangeRow(flow, 'Flow scale', config, 'flowScale', 0.05, 1, 0.01));
  refreshers.push(rangeRow(flow, 'Flow speed', config, 'flowSpeed', 0, 0.3, 0.005));

  // -- Agent limits --
  const agent = document.createElement('div');
  agent.className = 'group';
  agent.innerHTML = '<h2>Agentes</h2>';
  panel.append(agent);

  refreshers.push(rangeRow(agent, 'Max speed', config, 'maxSpeed', 0.2, 6, 0.1));
  refreshers.push(rangeRow(agent, 'Max force', config, 'maxForce', 0.005, 0.2, 0.005));

  // -- Render --
  const render = document.createElement('div');
  render.className = 'group';
  render.innerHTML = '<h2>Render</h2>';
  panel.append(render);

  refreshers.push(rangeRow(render, 'Particle size', config, 'particleSize', 0.5, 10, 0.1));
  refreshers.push(rangeRow(render, 'Opacity', config, 'particleOpacity', 0.1, 1, 0.05));

  // -- Actions --
  const actions = document.createElement('div');
  actions.className = 'group';
  actions.innerHTML = '<h2>Acciones</h2>';
  panel.append(actions);
  button(actions, 'Reset', onReset);
  button(actions, 'Pausar / continuar', () => onPauseChange());
  button(actions, 'LAB / PERFORMANCE', () => onModeChange());

  document.body.append(panel);

  return {
    element: panel,
    setVisible(visible) { panel.classList.toggle('hidden', !visible); },
    refresh() { for (const item of refreshers) item.refresh(); },
  };
}
