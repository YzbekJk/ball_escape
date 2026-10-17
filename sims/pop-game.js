/* Игра «Лопай котозайцев»: котозайцы-шарики летят вверх, тапай по ним — лопаются с «поп», +1 очко. */
Sims.register({
  id: 'pop-cats',
  kind: 'game',
  title: 'Лопай котозайцев',
  desc: 'Котозайцы летят вверх — тапай, чтобы лопнуть. Каждый лопнутый даёт +1 очко. Можно включить лимит упущенных.',

  defaults: { rate: 1.2, speed: 1, size: 1, maxMissed: 0, sound: true },
  schema: [
    { k: 'rate', l: 'Сколько котозайцев в секунду', min: 0.3, max: 5, step: 0.1, live: 1 },
    { k: 'speed', l: 'Скорость полёта ×', min: 0.3, max: 3, step: 0.1, live: 1 },
    { k: 'size', l: 'Размер ×', min: 0.5, max: 2, step: 0.1, live: 1 },
    { k: 'maxMissed', l: 'Игра кончается после стольких упущенных (0 — без конца)', min: 0, max: 30, step: 1 },
    { k: 'sound', l: 'Звук «поп»', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#10163a'; ctx.fillRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.2;
    [[0.3, 0.6, 1], [0.65, 0.35, 0.8], [0.5, 0.8, 0.6]].forEach(q => {
      const x = w * q[0], y = h * q[1], rr = r * q[2];
      ctx.fillStyle = '#b9b3c9'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      ctx.fillStyle = '#1b1530'; ctx.beginPath(); ctx.arc(x - rr * 0.32, y - rr * 0.1, rr * 0.1, 0, 7); ctx.arc(x + rr * 0.32, y - rr * 0.1, rr * 0.1, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c9a874'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + rr); ctx.lineTo(x, y + rr * 1.5); ctx.stroke();
    });
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const img = new Image(); img.src = 'assets/balloon-cat.png?v=1';
    let W = 0, H = 0, dpr = 1, raf = 0, alive = true, paused = false, last = 0;
    let balls, parts, floats, score, missed, over, spawnAcc, best = 0, t;
    try { best = +localStorage.getItem('popBest') || 0; } catch (e) {}

    function restart() { balls = []; parts = []; floats = []; score = 0; missed = 0; over = false; spawnAcc = 0.5; t = 0; }

    function blip(f0, f1, dur, vol, type) {
      if (!cfg.sound) return;
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const n = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, n); o.frequency.exponentialRampToValueAtTime(f1, n + dur * 0.7);
      g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
      o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + dur + 0.02);
    }
    function popSound() { blip(900 + Math.random() * 200, 150, 0.1, 0.35); blip(1800, 300, 0.04, 0.12, 'square'); }

    function spawn() {
      const R = Math.min(W, H) * 0.09 * cfg.size * (0.8 + Math.random() * 0.5);
      balls.push({ x: R + Math.random() * (W - 2 * R), y: H + R * 1.6, r: R, vy: (60 + Math.random() * 60) * cfg.speed * (H / 700),
        ph: Math.random() * 6.28, sw: 10 + Math.random() * 22, fr: 0.8 + Math.random() * 1.2, bx: 0 });
      balls[balls.length - 1].bx = balls[balls.length - 1].x;
    }
    function burst(x, y, r) {
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * 6.283, s = r * (1 + Math.random() * 3);
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - r, life: 0.7 + Math.random() * 0.4, age: 0, s: 2 + Math.random() * 3 });
      }
    }
    function tap(px, py) {
      if (over) { if (performance.now() - overAt > 600) restart(); return; }
      for (let i = balls.length - 1; i >= 0; i--) {                // topmost (last drawn) first
        const b = balls[i], cx = b.x, cy = b.y - b.r * 0.05, rr = b.r * 1.08;
        if ((px - cx) * (px - cx) + (py - cy) * (py - cy) <= rr * rr) {
          balls.splice(i, 1); score++; popSound(); burst(cx, cy, b.r);
          floats.push({ x: cx, y: cy - b.r * 0.4, age: 0 });
          if (score > best) { best = score; try { localStorage.setItem('popBest', best); } catch (e) {} }
          return;
        }
      }
    }
    let overAt = 0;
    const onDown = e => { const r = canvas.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); e.preventDefault(); };
    canvas.addEventListener('pointerdown', onDown);

    function update(dt) {
      t += dt;
      if (!over) {
        spawnAcc += dt * cfg.rate;
        while (spawnAcc >= 1) { spawnAcc -= 1; spawn(); }
      }
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]; b.y -= b.vy * dt; b.x = b.bx + Math.sin(t * b.fr + b.ph) * b.sw;
        if (b.y < -b.r * 1.6) {
          balls.splice(i, 1);
          if (!over) { missed++; if (cfg.maxMissed > 0 && missed >= cfg.maxMissed) { over = true; overAt = performance.now(); } }
        }
      }
      parts.forEach(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; });
      parts = parts.filter(p => p.age < p.life);
      floats.forEach(f => { f.age += dt; f.y -= 40 * dt; });
      floats = floats.filter(f => f.age < 0.8);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1236'); g.addColorStop(1, '#2a1f55');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 40; i++) { const x = (i * 97.3) % W, y = (i * 53.7) % H; ctx.fillRect(x, y, 1.5, 1.5); }
      balls.forEach(b => {
        const w = b.r * 2.1, h = w * (img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1.14);
        const rot = Math.sin(t * b.fr + b.ph + 1) * 0.08;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(rot);
        if (img.complete && img.naturalWidth) ctx.drawImage(img, -w / 2, -h * 0.46, w, h);
        else { ctx.fillStyle = '#b9b3c9'; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill(); }
        ctx.restore();
      });
      ctx.fillStyle = '#fff';
      parts.forEach(p => { ctx.globalAlpha = 1 - p.age / p.life; ctx.fillStyle = '#d9d4e6'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.font = 'bold 22px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe36b';
      floats.forEach(f => { ctx.globalAlpha = 1 - f.age / 0.8; ctx.fillText('+1', f.x, f.y); });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui,sans-serif';
      ctx.fillText('Очки: ' + score, 16, 74);
      ctx.font = '14px system-ui,sans-serif'; ctx.fillStyle = '#b8b8d0';
      ctx.fillText('Рекорд: ' + best + (cfg.maxMissed > 0 ? '   Упущено: ' + missed + '/' + cfg.maxMissed : ''), 16, 96);
      if (over) {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 34px system-ui,sans-serif'; ctx.fillText('Игра окончена', W / 2, H / 2 - 20);
        ctx.font = '22px system-ui,sans-serif'; ctx.fillText('Очки: ' + score + ' · Рекорд: ' + best, W / 2, H / 2 + 16);
        ctx.font = '15px system-ui,sans-serif'; ctx.fillStyle = '#b8b8d0'; ctx.fillText('Тапни, чтобы начать заново', W / 2, H / 2 + 48);
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function frame(ts) {
      if (!alive) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
      if (!paused) update(dt);
      draw(); raf = requestAnimationFrame(frame);
    }
    resize(); restart(); raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { alive = false; cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', onDown); canvas.style.touchAction = ''; },
      debug: { tap, get balls() { return balls; }, get score() { return score; }, update }
    };
  }
});
