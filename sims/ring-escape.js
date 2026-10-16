/* Simulation: the ball escapes from rotating rings. A ring vanishes once the ball
   has passed through it; all remaining rings then reverse their rotation. */
Sims.register({
  id: 'ring-escape',
  title: 'Побег из колец',
  desc: 'Шарик пробирается через вращающиеся кольца. Вылетел через кольцо — оно исчезает, а остальные крутятся в другую сторону.',

  defaults: {
    layers: 28, innerR: 0.43, gap0: 0.8, gap1: 6.3, help: 80, erode: 3,
    twist: 0.08, spin: 0.6, spinVar: 0.5, reverse: true,
    ballR: 0.022, ballSpeed: 0.6, gravity: 0.7, bounce: 1,
    simSpeed: 1, trail: true, sound: true, auto: true
  },
  schema: [
    { k: 'layers', l: 'Количество колец', min: 6, max: 80, step: 1 },
    { k: 'innerR', l: 'Радиус центральной камеры', min: 0.15, max: 0.8, step: 0.01 },
    { k: 'gap0', l: 'Ширина щели, рад', min: 0.1, max: 3, step: 0.05 },
    { k: 'help', l: 'Щели расширяются за, сек (помощь шарику)', min: 10, max: 600, step: 5 },
    { k: 'gap1', l: 'Щель в конце, рад', min: 0.1, max: 6.3, step: 0.1 },
    { k: 'erode', l: 'Как поздно расширяются щели', min: 0.5, max: 5, step: 0.1 },
    { k: 'twist', l: 'Закрутка спирали', min: -0.5, max: 0.5, step: 0.01 },
    { k: 'spin', l: 'Скорость вращения колец', min: 0, max: 4, step: 0.05 },
    { k: 'spinVar', l: 'Разброс вращения', min: 0, max: 4, step: 0.1 },
    { k: 'reverse', l: 'Кольца меняют направление после вылета', type: 'check', live: 1 },
    { k: 'ballR', l: 'Размер шарика', min: 0.004, max: 0.05, step: 0.001 },
    { k: 'ballSpeed', l: 'Скорость шарика', min: 0.1, max: 2.5, step: 0.05 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 2, step: 0.05, live: 1 },
    { k: 'bounce', l: 'Упругость', min: 0.3, max: 1.2, step: 0.01, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 8, step: 0.25, live: 1 },
    { k: 'trail', l: 'Шлейф', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 },
    { k: 'auto', l: 'Начинать заново после побега', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44;
    ctx.lineCap = 'butt';
    for (let k = 0; k < 14; k++) {
      const f = k / 13, r = R * (0.45 + 0.55 * f), e = Math.pow(1 - f, 1.35);
      ctx.strokeStyle = 'rgb(' + Math.round(6 + e * 222) + ',' + Math.round(30 + e * 206) + ',' + Math.round(92 + e * 156) + ')';
      ctx.lineWidth = R * 0.55 / 14 + 1;
      const th = -Math.PI / 2 + k * 0.1, hg = 0.4;
      ctx.beginPath(); ctx.arc(cx, cy, r, th + hg, th + Math.PI * 2 - hg); ctx.stroke();
    }
    ctx.fillStyle = '#ff2bf0'; ctx.shadowColor = '#ff2bf0'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx + R * 0.1, cy + R * 0.12, R * 0.05, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2;
    const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

    let N, dr, innerR, t, th, omega, dead, dir, ball, escaped, escapedAt, events, bounds;
    let paused = false, acc = 0, last = 0, trail = [], raf = 0, alive = true, W = 0, H = 0, dpr = 1, S = 1;

    function restart() {
      N = cfg.layers | 0; innerR = cfg.innerR; dr = (1 - innerR) / N;
      t = 0; dir = 1; escaped = false; escapedAt = 0; events = []; trail = []; acc = 0;
      th = new Float64Array(N); omega = new Float64Array(N); dead = new Uint8Array(N);
      for (let k = 0; k < N; k++) {
        th[k] = -Math.PI / 2 + k * cfg.twist;
        omega[k] = cfg.spin * (1 + cfg.spinVar * k / Math.max(1, N - 1));
      }
      const a = Math.random() * TAU, r = Math.random() * 0.12, va = Math.random() * TAU;
      ball = { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(va) * cfg.ballSpeed, vy: Math.sin(va) * cfg.ballSpeed, px: 0, py: 0 };
    }
    const halfGap = () => (cfg.gap0 + (cfg.gap1 - cfg.gap0) * Math.pow(Math.min(1, t / cfg.help), cfg.erode)) / 2;

    function step(dt) {
      const b = ball, br = cfg.ballR, hg = halfGap();
      t += dt;
      for (let k = 0; k < N; k++) if (!dead[k]) th[k] += dir * omega[k] * dt;
      b.vy += cfg.gravity * dt;
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const pd = Math.hypot(b.px, b.py);
      let d = Math.hypot(b.x, b.y);
      if (!escaped && d - br > 1) { escaped = true; escapedAt = performance.now(); events.push({ win: true }); }

      if (d - br < 1) {
        for (let pass = 0; pass < 2; pass++) {
          d = Math.hypot(b.x, b.y);
          if (d < 1e-9) break;
          let k0 = Math.floor((d - br - innerR) / dr), k1 = Math.floor((d + br - innerR) / dr);
          if (k0 < 0) k0 = 0; if (k1 > N - 1) k1 = N - 1;
          let hit = false;
          for (let k = k0; k <= k1; k++) {
            if (dead[k]) continue;
            if (Math.abs(angDiff(Math.atan2(b.y, b.x), th[k])) < hg - br / d) continue;   // in the gap
            const rIn = innerR + k * dr, rOut = rIn + dr;
            const inside = pd < (rIn + rOut) / 2;
            const nd = inside ? rIn - br : rOut + br, nx = b.x / d, ny = b.y / d, vr = b.vx * nx + b.vy * ny;
            b.x = nx * nd; b.y = ny * nd;
            if ((inside && vr > 0) || (!inside && vr < 0)) {
              const j = (1 + cfg.bounce) * vr;
              b.vx -= j * nx; b.vy -= j * ny;
              events.push({ k, power: Math.min(1, Math.abs(vr) / 0.8) });
            }
            hit = true; break;
          }
          if (!hit) break;
        }
        if (cfg.gravity === 0) {
          const s = Math.hypot(b.vx, b.vy);
          if (s > 1e-9) { b.vx *= cfg.ballSpeed / s; b.vy *= cfg.ballSpeed / s; }
        }
      }
      // a ring disappears as soon as the ball pokes even slightly past its outer edge; the rest flip direction
      d = Math.hypot(b.x, b.y);
      let removed = 0;
      for (let k = 0; k < N; k++) if (!dead[k] && d + cfg.ballR > innerR + (k + 1) * dr + 1e-4) { dead[k] = 1; removed++; }
      if (removed) { if (cfg.reverse) dir = -dir; events.push({ pop: true }); }

      if (escaped && bounds) {            // after the escape the ball bounces around the screen
        const bx = bounds.x - br, by = bounds.y - br;
        if (b.x > bx) { b.x = bx; b.vx = -Math.abs(b.vx); }
        if (b.x < -bx) { b.x = -bx; b.vx = Math.abs(b.vx); }
        if (b.y > by) { b.y = by; b.vy = -Math.abs(b.vy); }
        if (b.y < -by) { b.y = -by; b.vy = Math.abs(b.vy); }
      }
    }

    // ----- sound -----
    const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    let lastBlip = 0, noteIdx = 0;
    function blip(semi, power, dur, type) {
      const actx = ctl.audio();
      if (!actx || actx.state !== 'running') return;
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'triangle';
      o.frequency.value = 261.63 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05 + 0.1 * power, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.18));
      o.connect(g); g.connect(actx.destination);
      o.start(now); o.stop(now + (dur || 0.18) + 0.02);
    }
    function playEvents() {
      const ev = events; events = [];
      if (!cfg.sound || !ev.length) return;
      if (ev.some(e => e.win)) { [0, 4, 7, 12, 16].forEach((s, i) => setTimeout(() => blip(s, 0.8, 0.5, 'sine'), i * 110)); return; }
      const now = performance.now();
      if (now - lastBlip < 45) return; lastBlip = now;
      const e = ev[ev.length - 1];
      if (e.pop) { blip(19, 0.6, 0.25, 'sine'); return; }
      noteIdx = (noteIdx + 1 + (Math.random() * 2 | 0)) % SCALE.length;
      blip(SCALE[noteIdx] - 12 + Math.round(e.k / N * 5), e.power);
    }

    // ----- render -----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H) / 2 * 0.92;
      bounds = { x: W / 2 / S, y: H / 2 / S };
    }
    function layerColor(k) {
      const f = k / Math.max(1, N - 1), e = Math.pow(1 - f, 1.35);
      return 'rgb(' + Math.round(6 + e * 222) + ',' + Math.round(30 + e * 206) + ',' + Math.round(92 + e * 156) + ')';
    }
    function draw() {
      const cx = W / 2, cy = H / 2, hg = halfGap();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'butt'; ctx.lineWidth = dr * S + 0.8;
      for (let k = 0; k < N; k++) {
        if (dead[k]) continue;
        ctx.strokeStyle = layerColor(k);
        ctx.beginPath();
        ctx.arc(cx, cy, (innerR + (k + 0.5) * dr) * S, th[k] + hg, th[k] + TAU - hg);
        ctx.stroke();
      }
      const br = cfg.ballR * S;
      if (cfg.trail && trail.length > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < trail.length; i++) {
          const a = i / trail.length;
          ctx.strokeStyle = 'rgba(255,43,240,' + (a * 0.35).toFixed(3) + ')';
          ctx.lineWidth = br * 2 * a;
          ctx.beginPath();
          ctx.moveTo(cx + trail[i - 1][0] * S, cy + trail[i - 1][1] * S);
          ctx.lineTo(cx + trail[i][0] * S, cy + trail[i][1] * S);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#ff2bf0'; ctx.shadowColor = 'rgba(255,43,240,.9)'; ctx.shadowBlur = br * 1.8;
      ctx.beginPath(); ctx.arc(cx + ball.x * S, cy + ball.y * S, br, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }

    const DT = 1 / 240;
    function frame(ts) {
      if (!alive) return;
      const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) {
        acc += real * cfg.simSpeed;
        let n = 0;
        while (acc >= DT && n < 4000) { step(DT); acc -= DT; n++; }
        trail.push([ball.x, ball.y]); if (trail.length > 26) trail.shift();
        playEvents();
        if (escaped && cfg.auto && performance.now() - escapedAt > 3500) restart();
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { alive = false; cancelAnimationFrame(raf); },
      debug: { step, get escaped() { return escaped; }, get t() { return t; }, get passed() { return dead.reduce((a, b) => a + b, 0); } }
    };
  }
});
