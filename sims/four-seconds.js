/* Simulation: a new ball every few seconds; each one has a limited time to find the gap in the ring.
   Escaped balls stay outside as coloured dots, failed ones fade away. */
Sims.register({
  id: 'four-seconds',
  title: 'Только 4 секунды',
  desc: 'Шарики по очереди пытаются вылететь через щель в кольце. У каждого всего 4 секунды: не успел — застыл на месте, и теперь от него отскакивают остальные.',

  defaults: {
    limit: 4, gap: 0.9, randomGap: true, gapAngle: 211, maxFrozen: 30, restartOnEscape: true, gravity: 1.2, speed: 1.6, ballR: 0.06, bounce: 1,
    simSpeed: 1, caption: true, digit: true, stars: true, sound: true, notes: false
  },
  schema: [
    { k: 'limit', l: 'Секунд на побег у каждого шарика', min: 1, max: 20, step: 1, live: 1 },
    { k: 'gap', l: 'Ширина щели, рад', min: 0.2, max: 3, step: 0.05, live: 1 },
    { k: 'randomGap', l: 'Случайное место щели (выбирается один раз)', type: 'check', live: 1 },
    { k: 'gapAngle', l: 'Где щель, если не случайная, градусы', min: 0, max: 359, step: 1, live: 1 },
    { k: 'maxFrozen', l: 'Сколько застывших шариков держать (старые пропадают)', min: 3, max: 120, step: 1, live: 1 },
    { k: 'restartOnEscape', l: 'Если шарик вышел за круг — игра начинается заново', type: 'check', live: 1 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 6, step: 0.1, live: 1 },
    { k: 'speed', l: 'Скорость шарика', min: 0.3, max: 4, step: 0.1 },
    { k: 'ballR', l: 'Размер шарика', min: 0.02, max: 0.15, step: 0.005 },
    { k: 'bounce', l: 'Упругость', min: 0.5, max: 1.1, step: 0.01, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 6, step: 0.25, live: 1 },
    { k: 'caption', l: 'Надпись сверху', type: 'check', live: 1 },
    { k: 'digit', l: 'Цифра обратного отсчёта', type: 'check', live: 1 },
    { k: 'stars', l: 'Мелкие светящиеся точки на фоне', type: 'check', live: 1 },
    { k: 'notes', l: 'Ноты вместо звука удара: до, ре, ми, фа, соль, ля, си, до… (нужен включённый звук)', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
    const g = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.5, cy + R);
    g.addColorStop(0, '#26ff1c'); g.addColorStop(1, '#00e5ff');
    ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(cx, cy, R, 4.14, 3.25 + 6.283); ctx.stroke();
    ctx.fillStyle = '#5f5f66'; ctx.font = '700 ' + R * 0.9 + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('4', cx, cy + 4);
    [['#00e5ff', -0.2, -0.9], ['#2a5bff', 0.55, 0.15], ['#d11cff', -0.1, 0.55], ['#ffd400', -0.55, -0.15]].forEach(d => {
      ctx.fillStyle = d[0]; ctx.beginPath(); ctx.arc(cx + d[1] * R, cy + d[2] * R, R * 0.07, 0, 7); ctx.fill();
    });
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2, WALL = 0.02;
    const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
    const hueOf = i => i === 0 ? null : (i * 47 + 20) % 360;           // first ball is white, the rest walk round the colour wheel
    const colorOf = (i, a) => i === 0 ? 'rgba(255,255,255,' + a + ')' : 'hsla(' + hueOf(i) + ',100%,55%,' + a + ')';

    let ball, idx, cycleStart, simT, dots, frozen, gapAng = Math.random() * TAU, stars, events, tries, wins;   /* the gap stays in the same place for all balls */
    let paused = false, acc = 0, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, S = 1;

    function spawn() {
      const a = Math.random() * TAU;
      let x = 0, y = 0;
      for (let t = 0; t < 60; t++) {            // start from a free spot (not inside a frozen ball)
        const r = t === 0 ? 0 : Math.random() * 0.6, ang = Math.random() * TAU, px = Math.cos(ang) * r, py = Math.sin(ang) * r;
        if (frozen.every(f => Math.hypot(f.x - px, f.y - py) > cfg.ballR * 2.6)) { x = px; y = py; break; }
      }
      ball = { x, y, vx: Math.cos(a) * cfg.speed, vy: Math.sin(a) * cfg.speed, i: idx, out: false };
      cycleStart = simT;
    }
    function restart() { noteN = 0;
      simT = 0; idx = 0; dots = []; frozen = []; events = []; acc = 0; tries = 0; wins = 0;
      stars = [];
      for (let i = 0; i < 45; i++) stars.push({ x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3.4, vx: (Math.random() - 0.5) * 0.04, vy: (Math.random() - 0.5) * 0.04, a: 0.25 + Math.random() * 0.5 });
      spawn();
    }
    const gapCenter = () => cfg.randomGap ? gapAng : cfg.gapAngle * Math.PI / 180;

    function step(dt) {
      simT += dt;
      const b = ball, br = cfg.ballR;
      if (!b.out) {
        b.vy += cfg.gravity * dt;
        const px = b.x, py = b.y, pd = Math.hypot(px, py);
        b.x += b.vx * dt; b.y += b.vy * dt;
        for (const f of frozen) {               // frozen balls are solid obstacles
          const dx = b.x - f.x, dy = b.y - f.y, dist = Math.hypot(dx, dy), min = br * 2;
          if (dist < min && dist > 1e-9) {
            const nx = dx / dist, ny = dy / dist, vr = b.vx * nx + b.vy * ny;
            b.x = f.x + nx * min; b.y = f.y + ny * min;
            if (vr < 0) { const j = (1 + cfg.bounce) * vr; b.vx -= j * nx; b.vy -= j * ny; events.push({ hit: Math.min(1, Math.abs(vr) / 2) }); }
          }
        }
        const d = Math.hypot(b.x, b.y);
        if (d + br > 1 - WALL && d - br < 1 + WALL && d > 1e-9) {
          const ang = Math.atan2(b.y, b.x);
          const inGap = Math.abs(angDiff(ang, gapCenter())) < cfg.gap / 2 - br / d;
          if (!inGap) {
            const inside = pd < 1, nd = inside ? 1 - WALL - br : 1 + WALL + br, nx = b.x / d, ny = b.y / d, vr = b.vx * nx + b.vy * ny;
            b.x = nx * nd; b.y = ny * nd;
            if ((inside && vr > 0) || (!inside && vr < 0)) {
              const j = (1 + cfg.bounce) * vr; b.vx -= j * nx; b.vy -= j * ny;
              events.push({ hit: Math.min(1, Math.abs(vr) / 2) });
            }
          }
        }
        if (d - br > 1 + WALL) {              // made it: the ball stays where it got out
          b.out = true; wins++;
          dots.push({ x: b.x, y: b.y, vx: b.vx * 0.8 + (Math.random() - 0.5) * 0.4, vy: b.vy * 0.8 + (Math.random() - 0.5) * 0.4, i: b.i }); if (dots.length > 30) dots.shift();
          events.push({ win: b.i });
          if (cfg.restartOnEscape) { restart(); wins = 1; return; }
        }
      }
      for (const d of dots) {                 // escaped balls drift away from the gap and slow down
        d.x += d.vx * dt; d.y += d.vy * dt;
        const k = Math.max(0, 1 - 4 * dt); d.vx *= k; d.vy *= k;
        const dd = Math.hypot(d.x, d.y), min = 1 + WALL + cfg.ballR;
        if (dd < min && dd > 1e-9) { d.x *= min / dd; d.y *= min / dd; }
      }
      for (const s of stars) { s.x += s.vx * dt; s.y += s.vy * dt; if (Math.abs(s.x) > 1.5) s.vx *= -1; if (Math.abs(s.y) > 1.7) s.vy *= -1; }
      if (simT - cycleStart >= cfg.limit) {   // time is up: next ball
        tries++;
        if (!b.out) {                           // out of time: the ball freezes right where it is
          frozen.push({ x: b.x, y: b.y, i: b.i }); events.push({ fail: true });
          while (frozen.length > cfg.maxFrozen) frozen.shift();
        }
        idx++; spawn();
      }
    }

    let noteN = 0;
    function noteHit(power) { Sims.note(ctl.audio(), noteN++, power); }
    // ----- sound -----
    let lastBlip = 0;
    function blip(semi, power, dur, type) {
      const actx = ctl.audio();
      if (!actx || actx.state !== 'running') return;
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = 220 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.03 + 0.09 * power, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.15));
      o.connect(g); g.connect(actx.destination);
      o.start(now); o.stop(now + (dur || 0.15) + 0.02);
    }
    function playEvents() {
      const ev = events; events = [];
      if (!cfg.sound || !ev.length) return;
      const win = ev.find(e => e.win !== undefined);
      if (win) { [0, 4, 7, 12].forEach((s, k) => setTimeout(() => blip(s + 12, 0.7, 0.35), k * 90)); return; }
      if (ev.some(e => e.fail)) { blip(-12, 0.5, 0.3, 'triangle'); return; }
      const now = performance.now(); if (now - lastBlip < 40) return; lastBlip = now;
      if (cfg.notes) noteHit(ev[ev.length - 1].hit); else blip([0, 3, 5, 7, 10][Math.floor(Math.random() * 5)] + 5, ev[ev.length - 1].hit, 0.12, 'triangle');
    }

    // ----- render -----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H * 0.8) / 2 * 0.9;
    }
    function draw() {
      const cx = W / 2, cy = H * 0.53;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
      if (cfg.stars) for (const s of stars) { ctx.fillStyle = 'rgba(0,255,130,' + s.a * 0.6 + ')'; ctx.fillRect(cx + s.x * S, cy + s.y * S, 1.6, 1.6); }
      if (cfg.caption) {
        const fs = Math.max(15, Math.min(30, W * 0.06));
        ctx.fillStyle = '#6a6a70'; ctx.font = '700 ' + fs + 'px Inter, "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const y = Math.max(fs * 2, cy - S - fs * 2.4);
        ctx.fillText('Each ball has only', cx, y); ctx.fillText(cfg.limit + ' second' + (cfg.limit === 1 ? '' : 's') + ' to escape', cx, y + fs * 1.25);
      }
      if (cfg.digit) {
        const left = Math.max(0, Math.ceil(cfg.limit - (simT - cycleStart)));
        ctx.fillStyle = '#5f5f66'; ctx.font = '700 ' + S * 0.75 + 'px "Poppins", "Nunito", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(Math.max(1, left)), cx, cy + S * 0.04);
      }
      // the ring: gradient from green to cyan, with the gap
      const gc = gapCenter(), hg = cfg.gap / 2;
      let stroke = '#1aff7a';
      if (ctx.createConicGradient) {
        const g = ctx.createConicGradient(gc + hg, cx, cy);
        g.addColorStop(0, '#26ff1c'); g.addColorStop(0.5, '#00ff95'); g.addColorStop(1, '#00e5ff'); stroke = g;
      }
      ctx.strokeStyle = stroke; ctx.lineWidth = WALL * 2 * S; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(cx, cy, S, gc + hg, gc - hg + TAU); ctx.stroke();
      // balls
      const br = cfg.ballR * S;
      for (const d of dots) { ctx.fillStyle = colorOf(d.i, 1); ctx.beginPath(); ctx.arc(cx + d.x * S, cy + d.y * S, br, 0, TAU); ctx.fill(); }
      for (const f of frozen) { ctx.fillStyle = colorOf(f.i, 1); ctx.beginPath(); ctx.arc(cx + f.x * S, cy + f.y * S, br, 0, TAU); ctx.fill(); }
      if (!ball.out) { ctx.fillStyle = colorOf(ball.i, 1); ctx.beginPath(); ctx.arc(cx + ball.x * S, cy + ball.y * S, br, 0, TAU); ctx.fill(); }
    }

    const DT = 1 / 240;
    function frame(ts) {
      if (!on) return;
      const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) {
        acc += real * cfg.simSpeed;
        let n = 0;
        while (acc >= DT && n < 4000) { step(DT); acc -= DT; n++; }
        playEvents();
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
      debug: { get gap() { return gapCenter(); }, step, get tries() { return tries; }, get wins() { return wins; }, get t() { return simT; } }
    };
  }
});
