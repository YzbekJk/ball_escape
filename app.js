(function () {
  'use strict';

  // ---------- settings ----------
  // Lengths are in units of the ring's inner radius (ring radius = 1).
  const DEFAULTS = {
    grow: 0.008,      // how much the ball grows on every bounce
    startR: 0.03,     // starting ball radius
    speed: 0.9,       // starting speed, ring radii per second
    gravity: 1.0,
    bounce: 1.0,      // restitution (1 = no energy loss)
    simSpeed: 1,
    hue: 310,         // ball colour
    trail: true,
    sound: true,
    auto: true        // restart automatically once the ball fills the ring
  };
  const SCHEMA = [
    { k: 'grow', l: 'Рост за каждый отскок', min: 0.001, max: 0.04, step: 0.001 },
    { k: 'startR', l: 'Начальный размер шарика', min: 0.01, max: 0.3, step: 0.005 },
    { k: 'speed', l: 'Начальная скорость', min: 0.2, max: 3, step: 0.05 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 4, step: 0.1, live: 1 },
    { k: 'bounce', l: 'Упругость', min: 0.5, max: 1.1, step: 0.01, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 6, step: 0.25, live: 1 },
    { k: 'hue', l: 'Цвет шарика', min: 0, max: 360, step: 1, live: 1 },
    { k: 'trail', l: 'Шлейф', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 },
    { k: 'auto', l: 'Начинать заново, когда шарик заполнил кольцо', type: 'check', live: 1 }
  ];

  const cfg = Object.assign({}, DEFAULTS);
  (function readURL() {
    const q = new URLSearchParams(location.search);
    for (const k in DEFAULTS) {
      if (!q.has(k)) continue;
      const d = DEFAULTS[k], v = q.get(k);
      if (typeof d === 'number') { const n = parseFloat(v); if (isFinite(n)) cfg[k] = n; }
      else cfg[k] = v === '1' || v === 'true';
    }
  })();
  function writeURL() {
    const q = new URLSearchParams();
    for (const k in DEFAULTS) if (cfg[k] !== DEFAULTS[k]) q.set(k, typeof cfg[k] === 'boolean' ? (cfg[k] ? 1 : 0) : cfg[k]);
    const s = q.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) {}
  }

  // ---------- simulation ----------
  const RING = 1, WALL = 0.012;              // ring radius and half line thickness (in ring radii)
  const INNER = RING - WALL;                 // surface the ball bounces from
  let ball, bounces, fullAt, paused = false, acc = 0, last = 0, trail = [], flash = 0, events = [];

  function restart() {
    const a = Math.random() * Math.PI * 2, va = Math.random() * Math.PI * 2;
    ball = {
      x: Math.cos(a) * 0.3, y: Math.sin(a) * 0.3 - 0.2,
      vx: Math.cos(va) * cfg.speed, vy: Math.sin(va) * cfg.speed, r: cfg.startR
    };
    bounces = 0; fullAt = null; trail = []; flash = 0; acc = 0;
  }

  function step(dt) {
    const b = ball;
    b.vy += cfg.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const d = Math.hypot(b.x, b.y);
    if (d + b.r > INNER) {
      const nx = b.x / d, ny = b.y / d;
      b.x = nx * (INNER - b.r); b.y = ny * (INNER - b.r);
      const vr = b.vx * nx + b.vy * ny;
      if (vr > 0) {
        const j = (1 + cfg.bounce) * vr;
        b.vx -= j * nx; b.vy -= j * ny;
        bounces++;
        b.r = Math.min(b.r + cfg.grow, INNER * 0.999);
        // growing may push the ball into the wall again – keep it inside
        const d2 = Math.hypot(b.x, b.y), lim = INNER - b.r;
        if (d2 > lim) { b.x *= lim / d2; b.y *= lim / d2; }
        events.push(Math.min(1, vr / 2));
      }
    }
    if (fullAt === null && b.r >= INNER * 0.995) { fullAt = performance.now(); flash = 1; events.push(-1); }
  }

  // ---------- sound ----------
  let actx = null, lastBlip = 0;
  const PENT = [0, 2, 4, 7, 9];
  function initAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  function blip(semi, power, dur, type) {
    if (!actx || actx.state !== 'running') return;
    const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'triangle';
    o.frequency.value = 220 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.04 + 0.1 * power, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.2));
    o.connect(g); g.connect(actx.destination);
    o.start(now); o.stop(now + (dur || 0.2) + 0.02);
  }
  function playEvents() {
    const ev = events; events = [];
    if (!cfg.sound || !ev.length) return;
    if (ev.indexOf(-1) >= 0) { [0, 4, 7, 12, 16].forEach((s, i) => setTimeout(() => blip(s + 12, 0.8, 0.5, 'sine'), i * 110)); return; }
    const now = performance.now();
    if (now - lastBlip < 40) return; lastBlip = now;
    // pitch climbs with the number of bounces: the ball "builds up" a melody
    const n = Math.min(bounces, 100), semi = PENT[n % 5] + 12 * Math.floor(n / 5) * 0.5;
    blip(semi, ev[ev.length - 1]);
  }

  // ---------- render ----------
  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, S = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    S = Math.min(W, H) / 2 * 0.9;           // pixels per ring radius
  }
  function draw() {
    const cx = W / 2, cy = H / 2, hue = cfg.hue;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // ring
    ctx.lineWidth = WALL * 2 * S;
    ctx.strokeStyle = flash > 0 ? 'hsl(' + hue + ',100%,' + (70 + 25 * flash) + '%)' : '#dfe8ff';
    ctx.shadowColor = flash > 0 ? 'hsla(' + hue + ',100%,60%,.9)' : 'rgba(120,160,255,.55)';
    ctx.shadowBlur = (flash > 0 ? 30 : 14);
    ctx.beginPath(); ctx.arc(cx, cy, RING * S, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // trail
    const col = 'hsl(' + hue + ',100%,58%)';
    if (cfg.trail && trail.length > 1) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = 'hsla(' + hue + ',100%,58%,' + (a * 0.3).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, trail[i][2] * 2 * S * a);
        ctx.beginPath();
        ctx.moveTo(cx + trail[i - 1][0] * S, cy + trail[i - 1][1] * S);
        ctx.lineTo(cx + trail[i][0] * S, cy + trail[i][1] * S);
        ctx.stroke();
      }
    }
    // ball
    ctx.fillStyle = col; ctx.shadowColor = 'hsla(' + hue + ',100%,60%,.9)';
    ctx.shadowBlur = Math.max(6, ball.r * S * 0.5);
    ctx.beginPath(); ctx.arc(cx + ball.x * S, cy + ball.y * S, ball.r * S, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---------- loop ----------
  const DT = 1 / 240;
  function frame(ts) {
    const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (!paused) {
      if (fullAt === null) {
        acc += real * cfg.simSpeed;
        let n = 0;
        while (acc >= DT && n < 4000) { step(DT); acc -= DT; n++; }
        trail.push([ball.x, ball.y, ball.r]); if (trail.length > 24) trail.shift();
      } else if (cfg.auto && performance.now() - fullAt > 2500) restart();
      if (flash > 0) flash = Math.max(0, flash - real * 0.8);
      playEvents();
    }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- panel ----------
  const $ = id => document.getElementById(id), panel = $('panel'), fields = $('fields'), inputs = {};
  const fmt = v => String(+(+v).toFixed(3));
  SCHEMA.forEach(f => {
    const box = document.createElement('div'); box.className = 'f' + (f.type === 'check' ? ' chk' : '');
    const lab = document.createElement('label'); let inp, out;
    if (f.type === 'check') {
      inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!cfg[f.k];
      lab.appendChild(inp); lab.appendChild(document.createTextNode(f.l));
    } else {
      lab.textContent = f.l; out = document.createElement('output'); lab.appendChild(out);
      inp = document.createElement('input'); inp.type = 'range';
      inp.min = f.min; inp.max = f.max; inp.step = f.step; inp.value = cfg[f.k];
    }
    box.appendChild(lab); if (f.type !== 'check') box.appendChild(inp);
    fields.appendChild(box); inputs[f.k] = { inp, out, f };
    inp.addEventListener('input', () => {
      const v = f.type === 'check' ? inp.checked : parseFloat(inp.value);
      if (typeof v === 'number' && !isFinite(v)) return;
      cfg[f.k] = v; if (f.k === 'sound' && v) initAudio();
      refresh(); writeURL();
      if (!f.live) restart();
    });
  });
  function refresh() {
    for (const k in inputs) {
      const { inp, out, f } = inputs[k];
      if (f.type === 'check') inp.checked = !!cfg[k]; else inp.value = cfg[k];
      if (out) out.textContent = fmt(cfg[k]);
    }
    $('btnSound').textContent = cfg.sound ? '🔊' : '🔇';
  }
  $('btnGear').onclick = () => { panel.hidden = !panel.hidden; initAudio(); };
  $('btnClose').onclick = () => { panel.hidden = true; };
  $('btnSound').onclick = () => { cfg.sound = !cfg.sound; if (cfg.sound) initAudio(); refresh(); writeURL(); };
  $('btnRestart').onclick = restart;
  $('btnPause').onclick = e => { paused = !paused; e.target.textContent = paused ? '▶ Дальше' : '⏸ Пауза'; };
  $('btnDefaults').onclick = () => { Object.assign(cfg, DEFAULTS); refresh(); writeURL(); restart(); };
  $('btnCopy').onclick = e => {
    const done = () => { e.target.textContent = '✓ Скопировано'; setTimeout(() => e.target.textContent = '🔗 Копировать ссылку', 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, () => prompt('Ссылка:', location.href));
    else prompt('Ссылка:', location.href);
  };
  addEventListener('pointerdown', () => { if (cfg.sound) initAudio(); }, { passive: true });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); $('btnPause').click(); }
    if (e.key === 'r' || e.key === 'R') restart();
  });
  addEventListener('resize', resize);
  resize(); refresh(); restart();
  requestAnimationFrame(frame);
  window.__game = { get ball() { return ball; }, get bounces() { return bounces; }, step, cfg };
})();
