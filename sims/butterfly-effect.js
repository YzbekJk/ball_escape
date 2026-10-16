/* Simulation: "The Butterfly Effect" - balls start almost identically from the same spot inside a ring with spikes.
   A ball that touches a spike dies and leaves a grey ball behind; one that finds the gap breaks the ring. */
Sims.register({
  id: 'butterfly-effect',
  title: 'Эффект бабочки',
  desc: 'Шарики стартуют из одной точки почти одинаково — разница в тысячных долях. Но касание шипа убивает шарик (остаётся серый), и только счастливчик находит щель в кольце.',

  defaults: {
    spikes: 24, spikeH: 0.085, gap: 0.75, gapAngle: 125, randomGap: true, randomStart: true, eps: 0.002, gravity: 1.0, speed: 1.1, ballR: 0.055,
    bounce: 1.06, maxDead: 40, deadly: true, simSpeed: 1, title: false, sound: true, auto: true
  },
  schema: [
    { k: 'spikes', l: 'Количество шипов', min: 6, max: 60, step: 1, live: 1 },
    { k: 'spikeH', l: 'Высота шипов', min: 0.03, max: 0.2, step: 0.005, live: 1 },
    { k: 'gap', l: 'Ширина щели, рад', min: 0.3, max: 2, step: 0.05, live: 1 },
    { k: 'randomGap', l: 'Случайная щель в каждой игре', type: 'check', live: 1 },
    { k: 'randomStart', l: 'Случайная траектория шара в каждой игре', type: 'check', live: 1 },
    { k: 'gapAngle', l: 'Где щель, если не случайная, градусы', min: 0, max: 359, step: 1, live: 1 },
    { k: 'eps', l: 'Разброс старта между шариками (эффект бабочки)', min: 0, max: 0.1, step: 0.0005 },
    { k: 'deadly', l: 'Шипы убивают шарик', type: 'check', live: 1 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 4, step: 0.1, live: 1 },
    { k: 'speed', l: 'Скорость шарика', min: 0.3, max: 3, step: 0.1 },
    { k: 'ballR', l: 'Размер шарика', min: 0.02, max: 0.1, step: 0.005 },
    { k: 'bounce', l: 'Упругость', min: 0.5, max: 1.3, step: 0.01, live: 1 },
    { k: 'maxDead', l: 'Сколько серых шариков держать', min: 3, max: 120, step: 1, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 6, step: 0.25, live: 1 },
    { k: 'title', l: 'Заголовок сверху', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 },
    { k: 'auto', l: 'Автоперезапуск после побега', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#12100a'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
    const g = ctx.createLinearGradient(cx - R, cy, cx + R, cy + R);
    g.addColorStop(0, '#a0643c'); g.addColorStop(1, '#4fc040');
    ctx.strokeStyle = g; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 2.7, 1.9 + 6.283); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * 6.283; if (a > 1.9 && a < 2.7) continue;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a - 0.1) * R, cy + Math.sin(a - 0.1) * R);
      ctx.lineTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); ctx.lineTo(cx + Math.cos(a + 0.1) * R, cy + Math.sin(a + 0.1) * R); ctx.stroke();
    }
    [[-0.5, 0.1], [0.3, 0.6], [-0.3, 0.7]].forEach(p => { ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(cx + p[0] * R, cy + p[1] * R, R * 0.07, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#19ff8a'; ctx.beginPath(); ctx.arc(cx + 0.1 * R, cy - 0.2 * R, R * 0.07, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2, WALL = 0.02;
    const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
    const hueOf = i => (i * 67 + 140) % 360;
    let gapA = 0, startX = -0.1, startY = -0.2, startA = -0.6;
    const gapC = () => cfg.randomGap ? gapA : cfg.gapAngle * Math.PI / 180;

    let ball, idx, dead, parts, events, simT, state, stateT, shards, wins;
    let paused = false, acc = 0, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, S = 1;

    function spawn() {
      // every ball starts from the same place and direction, up to a tiny random difference
      const e = cfg.eps, a = startA;
      ball = {
        x: startX + (Math.random() - 0.5) * e, y: startY + (Math.random() - 0.5) * e,
        vx: Math.cos(a) * cfg.speed + (Math.random() - 0.5) * e, vy: Math.sin(a) * cfg.speed + (Math.random() - 0.5) * e,
        i: idx, alive: true
      };
    }
    function restart() {
      gapA = Math.random() * TAU;
      if (cfg.randomStart) {
        const r = Math.random() * 0.5, q = Math.random() * TAU;
        startX = Math.cos(q) * r; startY = Math.sin(q) * r; startA = Math.random() * TAU;
      } else { startX = -0.1; startY = -0.2; startA = -0.6; }
      idx = 0; dead = []; parts = []; events = []; simT = 0; state = 'play'; stateT = 0; shards = []; acc = 0; wins = 0;
      spawn();
    }
    function burst(x, y, hue, n, sp) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * TAU, v = (0.05 + Math.random()) * sp;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, hue });
      }
      if (parts.length > 900) parts.splice(0, parts.length - 900);
    }
    // is the circle touching a spike (triangle)? closest point on the triangle to (x,y)
    function spikeAt(x, y, r) {
      const d = Math.hypot(x, y);
      if (d < 1 - cfg.spikeH - WALL - r || d > 1 + r) return false;
      const n = Math.round(cfg.spikes), ang = Math.atan2(y, x);
      const gc = gapC();
      const hw = Math.PI / n * 0.8;                      // half-angle of a spike base
      const k = Math.round(ang / (TAU / n)), cands = [k - 1, k, k + 1];
      for (const c of cands) {
        const sa = c * TAU / n;
        if (Math.abs(angDiff(sa, gc)) < cfg.gap / 2 + hw * 0.5) continue;   // no spikes in the gap
        const ax = Math.cos(sa - hw), ay = Math.sin(sa - hw), bx = Math.cos(sa + hw), by = Math.sin(sa + hw);
        const tx = Math.cos(sa) * (1 - WALL - cfg.spikeH), ty = Math.sin(sa) * (1 - WALL - cfg.spikeH);
        if (segDist(x, y, ax, ay, tx, ty) < r || segDist(x, y, bx, by, tx, ty) < r) return { x: tx, y: ty };
      }
      return false;
    }
    function segDist(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - ax - dx * t, py - ay - dy * t);
    }

    function step(dt) {
      simT += dt;
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 1.2 * dt; p.vy *= 1 - 1.2 * dt; p.life -= dt * 0.6; }
      parts = parts.filter(p => p.life > 0);
      if (state === 'broken') {
        for (const s of shards) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.35; }
        stateT += dt;
        if (stateT > 3.5 && cfg.auto) restart();
        return;
      }
      const b = ball, br = cfg.ballR;
      b.vy += cfg.gravity * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const f of dead) {                      // grey balls are solid
        const dx = b.x - f.x, dy = b.y - f.y, dist = Math.hypot(dx, dy), min = br * 2;
        if (dist < min && dist > 1e-9) {
          const nx = dx / dist, ny = dy / dist, vr = b.vx * nx + b.vy * ny;
          b.x = f.x + nx * min; b.y = f.y + ny * min;
          if (vr < 0) { const j = (1 + cfg.bounce) * vr; b.vx -= j * nx; b.vy -= j * ny; events.push({ hit: Math.min(1, -vr / 2) }); }
        }
      }
      const sp = cfg.deadly ? spikeAt(b.x, b.y, br) : false;
      if (sp) {                                    // touched a spike: the ball dies and turns grey
        burst(b.x, b.y, hueOf(b.i), 45, 0.9);
        dead.push({ x: b.x, y: b.y }); while (dead.length > cfg.maxDead) dead.shift();
        events.push({ die: true });
        idx++; spawn(); return;
      }
      const d = Math.hypot(b.x, b.y);
      if (d + br > 1 - WALL && d - br < 1 + WALL && d > 1e-9) {
        const ang = Math.atan2(b.y, b.x);
        const inGap = Math.abs(angDiff(ang, gapC())) < cfg.gap / 2 - br / d;
        if (!inGap) {
          const nx = b.x / d, ny = b.y / d, vr = b.vx * nx + b.vy * ny;
          b.x = nx * (1 - WALL - br); b.y = ny * (1 - WALL - br);
          if (vr > 0) { const j = (1 + cfg.bounce) * vr; b.vx -= j * nx; b.vy -= j * ny; events.push({ hit: Math.min(1, vr / 2) }); }
        }
      }
      if (d - br > 1 + WALL) {                     // escaped: the ring shatters into dust
        wins++; state = 'broken'; stateT = 0; events.push({ win: true });
        burst(b.x, b.y, hueOf(b.i), 60, 1.2);
        shards = [];
        for (let k = 0; k < 1400; k++) {
          const a = Math.random() * TAU, r = 1 + (Math.random() - 0.5) * WALL * 2.2;
          shards.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(a) * (0.1 + Math.random() * 0.5), vy: Math.sin(a) * (0.1 + Math.random() * 0.5), life: 1, a });
        }
      }
    }

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
      if (ev.some(e => e.win)) { [0, 4, 7, 12].forEach((s, k) => setTimeout(() => blip(s + 12, 0.7, 0.4), k * 100)); return; }
      if (ev.some(e => e.die)) { blip(-14, 0.5, 0.25, 'sawtooth'); return; }
      const now = performance.now(); if (now - lastBlip < 40) return; lastBlip = now;
      blip([0, 3, 5, 7, 10][Math.floor(Math.random() * 5)] + 5, ev[ev.length - 1].hit, 0.12, 'triangle');
    }

    // ----- render -----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H * 0.8) / 2 * 0.88;
    }
    function draw() {
      const cx = W / 2, cy = H * 0.54;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#12100a'; ctx.fillRect(0, 0, W, H);
      if (cfg.title) {
        const fs = Math.max(18, Math.min(38, W * 0.075));
        ctx.fillStyle = '#fff'; ctx.font = '800 ' + fs + 'px Inter, "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('The Butterfly Effect', cx, Math.max(fs * 1.4, cy - S - fs * 1.6));
      }
      const gc = gapC(), hg = cfg.gap / 2;
      if (state === 'play') {
        let stroke = '#7a9a4a';
        if (ctx.createConicGradient) {
          const g = ctx.createConicGradient(gc + hg, cx, cy);
          g.addColorStop(0, '#4fc040'); g.addColorStop(0.45, '#5aa04a'); g.addColorStop(0.75, '#a0643c'); g.addColorStop(1, '#7a4a30'); stroke = g;
        }
        ctx.strokeStyle = stroke; ctx.lineWidth = WALL * 2 * S; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.arc(cx, cy, S, gc + hg, gc - hg + TAU); ctx.stroke();
        // spikes
        const n = Math.round(cfg.spikes), hw = Math.PI / n * 0.8;
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(150,170,90,0.75)'; ctx.fillStyle = 'rgba(20,50,70,0.55)';
        for (let c = 0; c < n; c++) {
          const sa = c * TAU / n;
          if (Math.abs(angDiff(sa, gc)) < cfg.gap / 2 + hw * 0.5) continue;
          const rIn = 1 - WALL - cfg.spikeH;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(sa - hw) * S, cy + Math.sin(sa - hw) * S);
          ctx.lineTo(cx + Math.cos(sa) * rIn * S, cy + Math.sin(sa) * rIn * S);
          ctx.lineTo(cx + Math.cos(sa + hw) * S, cy + Math.sin(sa + hw) * S);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else {
        for (const s of shards) { if (s.life <= 0) continue; ctx.fillStyle = 'hsla(' + (90 + 40 * Math.sin(s.a)) + ',55%,50%,' + s.life * 0.8 + ')'; ctx.fillRect(cx + s.x * S, cy + s.y * S, 1.8, 1.8); }
      }
      const br = cfg.ballR * S;
      ctx.fillStyle = '#44444a';
      for (const f of dead) { ctx.beginPath(); ctx.arc(cx + f.x * S, cy + f.y * S, br, 0, TAU); ctx.fill(); }
      for (const p of parts) { ctx.fillStyle = 'hsla(' + p.hue + ',100%,55%,' + Math.max(0, p.life) + ')'; ctx.fillRect(cx + p.x * S, cy + p.y * S, 2, 2); }
      if (state === 'play') { ctx.fillStyle = 'hsl(' + hueOf(ball.i) + ',100%,55%)'; ctx.beginPath(); ctx.arc(cx + ball.x * S, cy + ball.y * S, br, 0, TAU); ctx.fill(); }
    }

    const DT = 1 / 480;
    function frame(ts) {
      if (!on) return;
      const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) {
        acc += real * cfg.simSpeed;
        let n = 0;
        while (acc >= DT && n < 8000) { step(DT); acc -= DT; n++; }
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
      debug: { step, get balls() { return idx; }, get wins() { return wins; }, get t() { return simT; }, get state() { return state; } }
    };
  }
});
