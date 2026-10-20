/* Simulation: a red ball bounces inside a regular polygon. Every bounce adds a side,
   so the polygon slowly turns into a circle. */
Sims.register({
  id: 'adding-sides',
  title: 'Добавляем сторону',
  desc: 'Шарик отскакивает внутри многоугольника, и после каждого удара у фигуры становится на сторону больше — пока она не превратится в круг.',
  light: true,                               // white background: the shell adapts its buttons

  defaults: {
    sides0: 3, maxSides: 99, perBounce: 1, gravity: 4, speed: 1.5, ballR: 0.1, bounce: 1,
    simSpeed: 1, name: true, trail: true, plus: true, sound: true, notes: false, auto: true
  },
  schema: [
    { k: 'sides0', l: 'Начальное число сторон', min: 3, max: 12, step: 1 },
    { k: 'maxSides', l: 'Максимум сторон', min: 6, max: 300, step: 1, live: 1 },
    { k: 'perBounce', l: 'Сторон за один отскок', min: 1, max: 5, step: 1, live: 1 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 12, step: 0.25, live: 1 },
    { k: 'speed', l: 'Начальная скорость', min: 0.2, max: 5, step: 0.1 },
    { k: 'ballR', l: 'Размер шарика', min: 0.03, max: 0.25, step: 0.005 },
    { k: 'bounce', l: 'Упругость', min: 0.5, max: 1.1, step: 0.01, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 6, step: 0.25, live: 1 },
    { k: 'name', l: 'Название фигуры в центре', type: 'check', live: 1 },
    { k: 'plus', l: 'Всплывающее «+1»', type: 'check', live: 1 },
    { k: 'trail', l: 'Размытый след', type: 'check', live: 1 },
    { k: 'notes', l: 'Ноты вместо звука удара: до, ре, ми, фа, соль, ля, си, до… (нужен включённый звук)', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 },
    { k: 'auto', l: 'Начинать заново, когда сторон станет максимум', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42, n = 7;
    ctx.lineWidth = 3; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, b = a + 2 * Math.PI / n;
      ctx.strokeStyle = i % 2 ? '#1a1ae6' : '#222';
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(b) * R, cy + Math.sin(b) * R); ctx.stroke();
    }
    ctx.fillStyle = '#f00'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx - R * 0.15, cy + R * 0.3, R * 0.14, 0, 7); ctx.fill(); ctx.stroke();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2, FADE = 9;       // seconds a side stays blue after a hit

    const NAMES = { 3: 'Triangle', 4: 'Square', 5: 'Pentagon', 6: 'Hexagon', 7: 'Heptagon', 8: 'Octagon', 9: 'Nonagon', 10: 'Decagon',
      11: 'Hendecagon', 12: 'Dodecagon', 13: 'Triskaidecagon', 14: 'Tetradecagon', 15: 'Pentadecagon', 16: 'Hexadecagon',
      17: 'Heptadecagon', 18: 'Octadecagon', 19: 'Enneadecagon', 20: 'Icosagon', 100: 'Hectogon' };
    const TENS = { 2: 'Icosi', 3: 'Triaconta', 4: 'Tetraconta', 5: 'Pentaconta', 6: 'Hexaconta', 7: 'Heptaconta', 8: 'Octaconta', 9: 'Enneaconta' };
    const UNITS = ['', 'hena', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'ennea'];
    function polyName(n) {
      if (NAMES[n]) return NAMES[n];
      if (n > 20 && n < 100) { const t = Math.floor(n / 10), u = n % 10; return TENS[t] + UNITS[u] + 'gon'; }
      return n + '-gon';
    }

    let n, ball, hitAt, popups, trail, events, hitCount, doneAt, simT;
    let paused = false, acc = 0, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, S = 1;

    function restart() { noteN = 0;
      n = cfg.sides0 | 0; hitAt = new Float64Array(360).fill(-1e9);
      popups = []; trail = []; events = []; hitCount = 0; doneAt = null; simT = 0; acc = 0;
      const va = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.5);
      ball = { x: 0, y: -0.15, vx: Math.sin(va) * cfg.speed, vy: Math.cos(va) * cfg.speed * 0.3 };
    }

    function step(dt) {
      simT += dt;
      const b = ball, br = cfg.ballR;
      b.vy += cfg.gravity * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      let bounced = false, bestEdge = -1;
      const apothem = Math.cos(Math.PI / n);
      for (let i = 0; i < n; i++) {
        const mid = -Math.PI / 2 + (i + 0.5) * TAU / n, nx = Math.cos(mid), ny = Math.sin(mid);
        const dist = b.x * nx + b.y * ny;
        if (dist + br > apothem) {
          b.x -= nx * (dist + br - apothem); b.y -= ny * (dist + br - apothem);
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) {
            const j = (1 + cfg.bounce) * vn; b.vx -= j * nx; b.vy -= j * ny;
            if (!bounced) { bounced = true; bestEdge = i; }
          }
        }
      }
      if (bounced) {
        const mid = -Math.PI / 2 + (bestEdge + 0.5) * TAU / n, half = Math.PI / n;
        for (let a = mid - half; a <= mid + half; a += TAU / 360) hitAt[((Math.round(a / TAU * 360) % 360) + 360) % 360] = simT;
        popups.push({ x: b.x, y: b.y, t: simT });
        hitCount++; events.push(n);
        if (n < cfg.maxSides) n = Math.min(cfg.maxSides, n + (cfg.perBounce | 0));
        if (n >= cfg.maxSides && doneAt === null) doneAt = performance.now();
      }
    }

    let noteN = 0;
    function noteHit(power) { Sims.note(ctl.audio(), noteN++, power); }
    // ----- sound -----
    const PENT = [0, 2, 4, 7, 9];
    let lastBlip = 0;
    function blip(semi) {
      const actx = ctl.audio();
      if (!actx || actx.state !== 'running') return;
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = 220 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o.connect(g); g.connect(actx.destination);
      o.start(now); o.stop(now + 0.2);
    }
    function playEvents() {
      const ev = events; events = [];
      if (!cfg.sound || !ev.length) return;
      const now = performance.now();
      if (now - lastBlip < 40) return; lastBlip = now;
      const k = ev[ev.length - 1];
      if (cfg.notes) noteHit(0.5); else blip(PENT[k % 5] + 12 * Math.min(3, Math.floor(k / 25)));
    }

    // ----- render -----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H * 0.85) / 2 * 0.9;
    }
    function edgeColor(a) {                    // black -> blue right after a hit, fading back over FADE s
      const bin = ((Math.round(a / TAU * 360) % 360) + 360) % 360;
      const f = Math.max(0, 1 - (simT - hitAt[bin]) / FADE);
      const r = Math.round(30 * (1 - f)), g = Math.round(30 * (1 - f)), bl = Math.round(40 + 190 * f);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    function draw() {
      const cx = W / 2, cy = H / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      if (cfg.name) {
        ctx.fillStyle = '#00d6e6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 ' + Math.max(14, Math.min(26, S * 0.085)) + 'px Inter, "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(polyName(n), cx, cy);
      }
      ctx.lineWidth = Math.max(2.5, S * 0.011); ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * TAU / n, b = a + TAU / n;
        ctx.strokeStyle = edgeColor(a + TAU / n / 2);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S);
        ctx.lineTo(cx + Math.cos(b) * S, cy + Math.sin(b) * S);
        ctx.stroke();
      }
      const br = cfg.ballR * S;
      if (cfg.trail) for (let i = 0; i < trail.length; i++) {      // blurred blue trail
        const a = (i + 1) / trail.length;
        ctx.fillStyle = 'rgba(70,70,255,' + (0.2 * a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx + trail[i][0] * S, cy + trail[i][1] * S, br * (0.55 + 0.4 * a), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#f00'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx + ball.x * S, cy + ball.y * S, br, 0, TAU); ctx.fill(); ctx.stroke();
      if (cfg.plus) {
        ctx.fillStyle = '#000'; ctx.font = '700 ' + Math.max(11, S * 0.04) + 'px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const p of popups) {
          const age = simT - p.t; if (age > 0.7) continue;
          ctx.globalAlpha = 1 - age / 0.7;
          ctx.fillText('+' + (cfg.perBounce | 0), cx + p.x * S, cy + p.y * S - age * S * 0.12);
        }
        ctx.globalAlpha = 1;
      }
    }

    const DT = 1 / 480;
    function frame(ts) {
      if (!on) return;
      const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) {
        acc += real * cfg.simSpeed;
        let k = 0;
        while (acc >= DT && k < 6000) { step(DT); acc -= DT; k++; }
        trail.push([ball.x, ball.y]); if (trail.length > 12) trail.shift();
        while (popups.length && simT - popups[0].t > 0.7) popups.shift();
        playEvents();
        if (doneAt !== null && cfg.auto && performance.now() - doneAt > 6000) restart();
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); },
      debug: { step, get n() { return n; }, get hits() { return hitCount; }, get t() { return simT; }, get ball() { return ball; } }
    };
  }
});
