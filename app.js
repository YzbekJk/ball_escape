(function () {
  'use strict';
  const { Sim, DEFAULTS } = window.BallSim;

  // ---------- settings ----------
  const APP_DEFAULTS = Object.assign({}, DEFAULTS, {
    seed: 37, speed: 1, trail: true, sound: true,
    title: 'The ball has {n} seconds to escape'
  });
  // live = can change while running without restarting the simulation
  const SCHEMA = [
    { h: 'Игра' },
    { k: 'duration', l: 'Время на побег, сек', min: 10, max: 300, step: 1 },
    { k: 'speed', l: 'Скорость времени ×', min: 0.25, max: 8, step: 0.25, live: 1 },
    { k: 'title', l: 'Заголовок ({n} — число секунд)', type: 'text', live: 1 },
    { k: 'seed', l: 'Номер шарика (seed)', type: 'number' },
    { h: 'Кольца' },
    { k: 'layers', l: 'Количество слоёв', min: 6, max: 80, step: 1 },
    { k: 'reverse', l: 'Кольца меняют направление, когда шарик вылетел', type: 'check', live: 1 },
    { k: 'innerR', l: 'Радиус центральной камеры', min: 0.15, max: 0.8, step: 0.01 },
    { k: 'gap0', l: 'Щель в начале, рад', min: 0.1, max: 3, step: 0.05 },
    { k: 'gap1', l: 'Щель к концу таймера, рад (помощь шарику)', min: 0.1, max: 6.3, step: 0.1 },
    { k: 'erode', l: 'Как поздно расширяются щели', min: 0.5, max: 5, step: 0.1 },
    { k: 'twist', l: 'Закрутка спирали', min: -0.5, max: 0.5, step: 0.01 },
    { k: 'spin', l: 'Скорость вращения колец', min: 0, max: 4, step: 0.05 },
    { k: 'spinVar', l: 'Разброс вращения', min: 0, max: 4, step: 0.1 },
    { h: 'Шарик' },
    { k: 'ballR', l: 'Размер шарика', min: 0.004, max: 0.05, step: 0.001 },
    { k: 'ballSpeed', l: 'Скорость шарика', min: 0.1, max: 2.5, step: 0.05 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 2, step: 0.05, live: 1 },
    { k: 'bounce', l: 'Упругость', min: 0.3, max: 1.2, step: 0.01, live: 1 },
    { k: 'keepSpeed', l: 'Постоянная скорость (без гравитации)', type: 'check', live: 1 },
    { k: 'trail', l: 'Шлейф за шариком', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук ударов', type: 'check', live: 1 }
  ];

  const cfg = Object.assign({}, APP_DEFAULTS);
  (function readURL() {
    const q = new URLSearchParams(location.search);
    for (const k in APP_DEFAULTS) {
      if (!q.has(k)) continue;
      const d = APP_DEFAULTS[k], v = q.get(k);
      if (typeof d === 'number') { const n = parseFloat(v); if (isFinite(n)) cfg[k] = n; }
      else if (typeof d === 'boolean') cfg[k] = v === '1' || v === 'true';
      else cfg[k] = v;
    }
  })();
  function writeURL() {
    const q = new URLSearchParams();
    for (const k in APP_DEFAULTS) {
      if (cfg[k] !== APP_DEFAULTS[k]) q.set(k, typeof cfg[k] === 'boolean' ? (cfg[k] ? 1 : 0) : cfg[k]);
    }
    const s = q.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) {}
  }

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const canvas = $('c'), ctx = canvas.getContext('2d');
  const titleEl = $('title'), timerEl = $('timer'), panel = $('panel');
  let W = 0, H = 0, dpr = 1, scale = 1;

  let sim, paused = false, acc = 0, last = 0, trail = [];

  function simParams() { const p = {}; for (const k in DEFAULTS) p[k] = cfg[k]; return p; }
  function restart() {
    sim = new Sim(simParams());
    sim.bounds = { x: W / 2 / scale, y: H / 2 / scale };
    acc = 0; trail = [];
    setTitle();
  }
  function setTitle() { titleEl.textContent = cfg.title.replace('{n}', Math.round(cfg.duration)); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    scale = Math.min(W, H) / 2 * 0.97;
    if (sim) sim.bounds = { x: W / 2 / scale, y: H / 2 / scale };
  }

  // ---------- colours ----------
  function layerColor(k, N) {
    const f = k / Math.max(1, N - 1);                    // 0 inner → 1 outer
    const e = Math.pow(1 - f, 1.35);
    const r = Math.round(6 + e * 222), g = Math.round(30 + e * 206), b = Math.round(92 + e * 156);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ---------- render ----------
  function draw() {
    const cx = W / 2, cy = H / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const N = sim.N, dr = sim.dr, t = sim.t;
    ctx.lineCap = 'butt';
    ctx.lineWidth = dr * scale + 0.8;
    for (let k = 0; k < N; k++) {
      if (sim.dead[k]) continue;
      const h = sim.halfGap(), th = sim.theta(k);
      const rm = (sim.p.innerR + (k + 0.5) * dr) * scale;
      ctx.strokeStyle = layerColor(k, N);
      ctx.beginPath();
      ctx.arc(cx, cy, rm, th + h, th + Math.PI * 2 - h);
      ctx.stroke();
    }
    // ball + trail
    const b = sim.b, br = sim.p.ballR * scale;
    if (cfg.trail && trail.length > 1) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = 'rgba(255,43,240,' + (a * 0.35).toFixed(3) + ')';
        ctx.lineWidth = br * 2 * a;
        ctx.beginPath();
        ctx.moveTo(cx + trail[i - 1][0] * scale, cy + trail[i - 1][1] * scale);
        ctx.lineTo(cx + trail[i][0] * scale, cy + trail[i][1] * scale);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#ff2bf0';
    ctx.shadowColor = 'rgba(255,43,240,.9)'; ctx.shadowBlur = br * 1.8;
    ctx.beginPath(); ctx.arc(cx + b.x * scale, cy + b.y * scale, br, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  function updateTimer() {
    const T = sim.p.duration;
    const shown = sim.escaped ? sim.escapeT : sim.t;
    const rem = Math.max(0, T - shown);
    const s = Math.floor(rem), cs = Math.floor((rem - s) * 100);
    timerEl.textContent = String(s).padStart(2, '0') + ':' + String(cs).padStart(2, '0');
    const f = rem / T;
    timerEl.className = sim.escaped ? 'g' : f > 0.5 ? '' : f > 0.25 ? 'y' : f > 0.1 ? 'o' : 'r';
  }

  // ---------- sound ----------
  let actx = null, lastBlip = 0, noteIdx = 0;
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  function initAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
  }
  function blip(semi, power, dur, type) {
    if (!actx || actx.state !== 'running') return;
    const now = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'triangle';
    o.frequency.value = 261.63 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05 + 0.1 * power, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.18));
    o.connect(g); g.connect(actx.destination);
    o.start(now); o.stop(now + (dur || 0.18) + 0.02);
  }
  function playEvents() {
    const ev = sim.events; sim.events = [];
    if (!cfg.sound || !ev.length) return;
    const nowMs = performance.now();
    if (nowMs - lastBlip < 45) return;
    lastBlip = nowMs;
    const e = ev[ev.length - 1];
    noteIdx = (noteIdx + 1 + (Math.random() * 2 | 0)) % SCALE.length;
    blip(SCALE[noteIdx] - 12 + Math.round(e.k / sim.N * 5), e.power);
  }
  let wasEscaped = false;
  function victory() {
    if (!cfg.sound) return;
    [0, 4, 7, 12, 16].forEach((s, i) => setTimeout(() => blip(s, 0.8, 0.5, 'sine'), i * 110));
  }

  // ---------- loop ----------
  const DT = 1 / 240;
  function frame(ts) {
    const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (!paused) {
      acc += real * cfg.speed;
      let n = 0;
      while (acc >= DT && n < 4000) { sim.step(DT); acc -= DT; n++; }
      playEvents();
      if (sim.escaped && !wasEscaped) victory();
      wasEscaped = sim.escaped;
      trail.push([sim.b.x, sim.b.y]);
      if (trail.length > 26) trail.shift();
    }
    draw(); updateTimer();
    requestAnimationFrame(frame);
  }

  // ---------- panel ----------
  const fields = $('fields'), inputs = {};
  function fmt(v) { return Math.abs(v) >= 100 ? String(Math.round(v)) : String(+(+v).toFixed(3)); }
  SCHEMA.forEach(f => {
    if (f.h) { const h = document.createElement('h2'); h.textContent = f.h; fields.appendChild(h); return; }
    const box = document.createElement('div'); box.className = 'f' + (f.type === 'check' ? ' chk' : '');
    const lab = document.createElement('label');
    let inp, out;
    if (f.type === 'check') {
      inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!cfg[f.k];
      lab.appendChild(inp); lab.appendChild(document.createTextNode(f.l));
    } else if (f.type === 'text' || f.type === 'number') {
      lab.textContent = f.l; inp = document.createElement('input'); inp.type = f.type; inp.value = cfg[f.k];
    } else {
      lab.textContent = f.l; out = document.createElement('output'); out.textContent = fmt(cfg[f.k]); lab.appendChild(out);
      inp = document.createElement('input'); inp.type = 'range';
      inp.min = f.min; inp.max = f.max; inp.step = f.step; inp.value = cfg[f.k];
    }
    box.appendChild(lab); if (f.type !== 'check') box.appendChild(inp);
    fields.appendChild(box); inputs[f.k] = { inp, out, f };
    inp.addEventListener('input', () => {
      let v;
      if (f.type === 'check') v = inp.checked;
      else if (f.type === 'text') v = inp.value;
      else { v = parseFloat(inp.value); if (!isFinite(v)) return; }
      cfg[f.k] = v;
      if (out) out.textContent = fmt(v);
      if (f.k === 'sound' && v) initAudio();
      syncSoundBtn(); writeURL();
      if (f.live) { if (f.k in sim.p) sim.p[f.k] = v; if (f.k === 'title') setTitle(); }
      else restart();
    });
  });
  function refreshInputs() {
    for (const k in inputs) {
      const { inp, out, f } = inputs[k];
      if (f.type === 'check') inp.checked = !!cfg[k]; else inp.value = cfg[k];
      if (out) out.textContent = fmt(cfg[k]);
    }
    syncSoundBtn();
  }
  function syncSoundBtn() { $('btnSound').textContent = cfg.sound ? '🔊' : '🔇'; }

  $('btnGear').onclick = () => { panel.hidden = !panel.hidden; initAudio(); };
  $('btnClose').onclick = () => { panel.hidden = true; };
  $('btnSound').onclick = () => { cfg.sound = !cfg.sound; if (cfg.sound) initAudio(); refreshInputs(); writeURL(); };
  $('btnRestart').onclick = () => { restart(); wasEscaped = false; };
  $('btnPause').onclick = e => { paused = !paused; e.target.textContent = paused ? '▶ Дальше' : '⏸ Пауза'; };
  $('btnRandom').onclick = () => { cfg.seed = 1 + Math.floor(Math.random() * 99999); refreshInputs(); writeURL(); restart(); wasEscaped = false; };
  $('btnDefaults').onclick = () => { Object.assign(cfg, APP_DEFAULTS); refreshInputs(); writeURL(); restart(); wasEscaped = false; };
  $('btnCopy').onclick = e => {
    const done = () => { e.target.textContent = '✓ Скопировано'; setTimeout(() => e.target.textContent = '🔗 Скопировать ссылку с настройками', 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, () => prompt('Ссылка:', location.href));
    else prompt('Ссылка:', location.href);
  };
  // browsers allow sound only after a gesture — unlock on first touch/click/key
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (cfg.sound) initAudio(); }, { once: false, passive: true }));
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); $('btnPause').click(); }
    if (e.key === 'r' || e.key === 'R') $('btnRestart').click();
  });

  addEventListener('resize', resize);
  resize(); refreshInputs(); restart();
  requestAnimationFrame(frame);
  window.__game = { get sim() { return sim; }, cfg };
})();
