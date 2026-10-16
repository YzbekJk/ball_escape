/* Simulation: thin rings, a white ball with gravity. Every hit chips a piece out of the ring
   it struck; sooner or later the holes line up and the ball falls out. */
Sims.register({
  id: 'will-it-escape',
  title: 'Сбежит ли шарик?',
  desc: 'Шарик скачет внутри тонких колец и с каждым ударом выбивает из них кусочки. Совпадут ли дыры так, чтобы он выбрался?',

  defaults: {
    rings: 7, chip: 0.25, gravity: 1.2, speed: 0.7, ballR: 0.022, bounce: 1,
    simSpeed: 1, label: false, debris: true, sound: true, auto: true
  },
  schema: [
    { k: 'rings', l: 'Количество колец', min: 2, max: 14, step: 1 },
    { k: 'chip', l: 'Размер выбоины от удара, рад', min: 0.02, max: 0.5, step: 0.01 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 4, step: 0.1, live: 1 },
    { k: 'speed', l: 'Начальная скорость', min: 0.1, max: 3, step: 0.05 },
    { k: 'ballR', l: 'Размер шарика', min: 0.008, max: 0.06, step: 0.001 },
    { k: 'bounce', l: 'Упругость', min: 0.5, max: 1.1, step: 0.01, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 8, step: 0.25, live: 1 },
    { k: 'label', l: 'Надпись «Will the ball escape?»', type: 'check', live: 1 },
    { k: 'debris', l: 'Осколки', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 },
    { k: 'auto', l: 'Начинать заново после побега', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44;
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const f = k / 5;
      ctx.strokeStyle = 'hsl(' + (48 - f * 70) + ',95%,55%)';
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.28 + 0.72 * f), 0.5 + k * 0.3, 0.5 + k * 0.3 + (k < 3 ? 5.2 : 6.1));
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + R * 0.05, cy + R * 0.14, R * 0.05, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2, B = 720, BIN = TAU / B, WALL = 0.005, R0 = 0.255;

    let N, radius, alive, runs, dirty, ball, escaped, escapedAt, parts, events, hits;
    let paused = false, acc = 0, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, S = 1;

    const ringColor = k => 'hsl(' + (48 - 72 * k / Math.max(1, N - 1)) + ',95%,' + (56 - 4 * k / Math.max(1, N - 1)) + '%)';

    function restart() {
      N = cfg.rings | 0;
      radius = []; alive = []; runs = [];
      for (let k = 0; k < N; k++) { radius.push(R0 + (1 - R0) * k / Math.max(1, N - 1)); alive.push(new Uint8Array(B).fill(1)); }
      dirty = true; escaped = false; escapedAt = 0; parts = []; events = []; hits = 0; acc = 0;
      const a = Math.random() * TAU, va = Math.random() * TAU, r = Math.random() * R0 * 0.5;
      ball = { x: Math.cos(a) * r, y: Math.sin(a) * r - 0.05, vx: Math.cos(va) * cfg.speed, vy: Math.sin(va) * cfg.speed, px: 0, py: 0 };
    }

    const binOf = a => ((Math.floor((((a % TAU) + TAU) % TAU) / BIN)) % B + B) % B;
    function solidAt(k, ang, half) {            // is there ring material within the ball's angular width?
      const arr = alive[k], c = binOf(ang), n = Math.min(40, Math.ceil(half / BIN));
      for (let i = -n; i <= n; i++) if (arr[(c + i + B) % B]) return true;
      return false;
    }
    function chipRing(k, ang) {
      const arr = alive[k], c = binOf(ang), n = Math.max(1, Math.round(cfg.chip / BIN / 2));
      for (let i = -n; i <= n; i++) arr[(c + i + B) % B] = 0;
      dirty = true;
      if (cfg.debris) {
        const R = radius[k];
        for (let i = 0; i < 7; i++) {
          const a = ang + (Math.random() - 0.5) * cfg.chip * 2;
          parts.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 - 0.1, life: 0.5 + Math.random() * 0.5, c: ringColor(k) });
        }
      }
    }

    function step(dt) {
      const b = ball, br = cfg.ballR;
      b.vy += cfg.gravity * dt;
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const pd = Math.hypot(b.px, b.py);
      let d = Math.hypot(b.x, b.y);
      if (!escaped && d - br > 1 + WALL) { escaped = true; escapedAt = performance.now(); events.push({ win: true }); }
      if (d > 1e-9 && d - br < 1 + WALL) {
        for (let k = 0; k < N; k++) {
          const R = radius[k];
          if (Math.abs(d - R) >= br + WALL) continue;
          const ang = Math.atan2(b.y, b.x);
          if (!solidAt(k, ang, br / d)) continue;
          const inside = pd < R, nd = inside ? R - WALL - br : R + WALL + br, nx = b.x / d, ny = b.y / d, vr = b.vx * nx + b.vy * ny;
          b.x = nx * nd; b.y = ny * nd;
          if ((inside && vr > 0) || (!inside && vr < 0)) {
            const j = (1 + cfg.bounce) * vr;
            b.vx -= j * nx; b.vy -= j * ny;
            hits++; chipRing(k, ang);
            events.push({ k, power: Math.min(1, Math.abs(vr) / 2) });
          }
          break;
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.vy += 0.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) parts.splice(i, 1);
      }
    }

    // ----- sound -----
    let lastBlip = 0;
    function blip(semi, power, dur, type) {
      const actx = ctl.audio();
      if (!actx || actx.state !== 'running') return;
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.value = 200 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.04 + 0.1 * power, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.15));
      o.connect(g); g.connect(actx.destination);
      o.start(now); o.stop(now + (dur || 0.15) + 0.02);
    }
    function playEvents() {
      const ev = events; events = [];
      if (!cfg.sound || !ev.length) return;
      if (ev.some(e => e.win)) { [0, 4, 7, 12, 16].forEach((s, i) => setTimeout(() => blip(s + 12, 0.8, 0.5), i * 110)); return; }
      const now = performance.now();
      if (now - lastBlip < 35) return; lastBlip = now;
      const e = ev[ev.length - 1];
      blip([0, 2, 4, 7, 9, 12, 14][e.k % 7] + 12 * (e.k > 6 ? 1 : 0), e.power);
    }

    // ----- render -----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H * 0.8) / 2 * 0.9;
    }
    function rebuildRuns() {
      runs = [];
      for (let k = 0; k < N; k++) {
        const arr = alive[k], list = [];
        let start = -1;
        for (let i = 0; i <= B; i++) {
          const a = i < B ? arr[i] : 0;
          if (a && start < 0) start = i;
          if (!a && start >= 0) { list.push([start, i]); start = -1; }
        }
        if (list.length > 1 && arr[0] && arr[B - 1]) { const f = list.shift(); list[list.length - 1][1] += f[1]; }   // merge across the seam
        runs.push(list);
      }
      dirty = false;
    }
    function draw() {
      const cx = W / 2, cy = H * 0.52;
      if (dirty) rebuildRuns();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = Math.max(1.5, WALL * 2 * S); ctx.lineCap = 'butt';
      for (let k = 0; k < N; k++) {
        ctx.strokeStyle = ringColor(k);
        const rr = radius[k] * S;
        for (const [s, e] of runs[k]) {
          ctx.beginPath(); ctx.arc(cx, cy, rr, s * BIN, e * BIN); ctx.stroke();
        }
      }
      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = p.c;
        ctx.fillRect(cx + p.x * S - 1, cy + p.y * S - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      // the ball, stretched along its motion
      const b = ball, br = cfg.ballR * S, sp = Math.hypot(b.vx, b.vy) || 1, L = Math.min(0.05, sp * 0.018) * S;
      ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineWidth = br * 2;
      ctx.beginPath();
      ctx.moveTo(cx + b.x * S - b.vx / sp * L / 2, cy + b.y * S - b.vy / sp * L / 2);
      ctx.lineTo(cx + b.x * S + b.vx / sp * L / 2, cy + b.y * S + b.vy / sp * L / 2);
      ctx.stroke();
      if (cfg.label) {                              // caption in a white box, like in the video
        const fs = Math.max(15, Math.min(28, W * 0.06)), txt = 'Will the ball escape?';
        ctx.font = '600 ' + fs + 'px Inter, "Helvetica Neue", Arial, sans-serif';
        const tw = ctx.measureText(txt).width, pw = fs * 0.7, ph = fs * 0.5, y = Math.max(fs * 2.2, cy - S - fs * 1.8);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - tw / 2 - pw, y - fs / 2 - ph, tw + pw * 2, fs + ph * 2, 6); else ctx.rect(cx - tw / 2 - pw, y - fs / 2 - ph, tw + pw * 2, fs + ph * 2);
        ctx.fill();
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, cx, y + 1);
      }
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
        if (escaped && cfg.auto && performance.now() - escapedAt > 3000) restart();
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
      debug: { step, get escaped() { return escaped; }, get hits() { return hits; } }
    };
  }
});
