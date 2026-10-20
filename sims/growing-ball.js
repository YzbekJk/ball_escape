/* Simulation: a ball in a closed ring grows with every bounce. */
Sims.register({
  id: 'growing-ball',
  title: 'Растущий шарик',
  desc: 'Шарик отскакивает в закрытом кольце и растёт с каждым ударом, пока не заполнит всё.',

  // lengths are in units of the ring radius
  defaults: {
    grow: 0.008, startR: 0.03, speed: 0.9, gravity: 1.0, bounce: 1.0,
    simSpeed: 1, hue: 310, trail: true, sound: true, notes: false, auto: true
  },
  schema: [
    { k: 'grow', l: 'Рост за каждый отскок', min: 0.001, max: 0.04, step: 0.001 },
    { k: 'startR', l: 'Начальный размер шарика', min: 0.01, max: 0.3, step: 0.005 },
    { k: 'speed', l: 'Начальная скорость', min: 0.2, max: 3, step: 0.05 },
    { k: 'gravity', l: 'Гравитация', min: 0, max: 4, step: 0.1, live: 1 },
    { k: 'bounce', l: 'Упругость', min: 0.5, max: 1.1, step: 0.01, live: 1 },
    { k: 'simSpeed', l: 'Скорость времени ×', min: 0.25, max: 6, step: 0.25, live: 1 },
    { k: 'hue', l: 'Цвет шарика', min: 0, max: 360, step: 1, live: 1 },
    { k: 'trail', l: 'Шлейф', type: 'check', live: 1 },
    { k: 'notes', l: 'Ноты вместо звука удара: до, ре, ми, фа, соль, ля, си, до… (нужен включённый звук)', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 },
    { k: 'auto', l: 'Начинать заново, когда шарик заполнил кольцо', type: 'check', live: 1 }
  ],

  /** Small picture for the menu card. */
  preview(ctx, w, h) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4;
    ctx.strokeStyle = '#dfe8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ff2bf0'; ctx.shadowColor = '#ff2bf0'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cx - R * 0.25, cy + R * 0.25, R * 0.38, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  },

  /**
   * Start the simulation on `canvas`. `cfg` is a live object (shell updates it),
   * `ctl.sound` tells whether the user allowed audio. Must return
   * { restart(), setPaused(bool), resize(), destroy() }.
   */
  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const RING = 1, WALL = 0.012, INNER = RING - WALL;
    let ball, bounces, fullAt, paused = false, acc = 0, last = 0, trail = [], flash = 0, events = [];
    let raf = 0, W = 0, H = 0, dpr = 1, S = 1, alive = true;

    function restart() { noteN = 0;
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
          const d2 = Math.hypot(b.x, b.y), lim = INNER - b.r;
          if (d2 > lim) { b.x *= lim / d2; b.y *= lim / d2; }
          events.push(Math.min(1, vr / 2));
        }
      }
      if (fullAt === null && b.r >= INNER * 0.995) { fullAt = performance.now(); flash = 1; events.push(-1); }
    }

    let noteN = 0;
    function noteHit(power) { Sims.note(ctl.audio(), noteN++, power); }
    // ----- sound -----
    const PENT = [0, 2, 4, 7, 9];
    let lastBlip = 0;
    function blip(semi, power, dur, type) {
      const actx = ctl.audio();
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
      const n = Math.min(bounces, 100), semi = PENT[n % 5] + 6 * Math.floor(n / 5);
      if (cfg.notes) noteHit(ev[ev.length - 1]); else blip(semi, ev[ev.length - 1]);
    }

    // ----- render -----
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      S = Math.min(W, H) / 2 * 0.9;
    }
    function draw() {
      const cx = W / 2, cy = H / 2, hue = cfg.hue;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = WALL * 2 * S;
      ctx.strokeStyle = flash > 0 ? 'hsl(' + hue + ',100%,' + (70 + 25 * flash) + '%)' : '#dfe8ff';
      ctx.shadowColor = flash > 0 ? 'hsla(' + hue + ',100%,60%,.9)' : 'rgba(120,160,255,.55)';
      ctx.shadowBlur = flash > 0 ? 30 : 14;
      ctx.beginPath(); ctx.arc(cx, cy, RING * S, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
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
      ctx.fillStyle = 'hsl(' + hue + ',100%,58%)';
      ctx.shadowColor = 'hsla(' + hue + ',100%,60%,.9)';
      ctx.shadowBlur = Math.max(6, ball.r * S * 0.5);
      ctx.beginPath(); ctx.arc(cx + ball.x * S, cy + ball.y * S, ball.r * S, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    const DT = 1 / 240;
    function frame(ts) {
      if (!alive) return;
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
      raf = requestAnimationFrame(frame);
    }

    resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { alive = false; cancelAnimationFrame(raf); },
      debug: { step, get ball() { return ball; }, get bounces() { return bounces; } }
    };
  }
});
