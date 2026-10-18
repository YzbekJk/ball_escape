/* Игра «Батуты»: шарик и точка стоят на заданных местах — уровни одинаковые у всех игроков.
   Уровень нельзя пройти без батутов (шарик в свободном падении не попадает в точку).
   Рисуйте батуты пальцем и жмите «Пуск» — шарик должен попасть в точку. Таблица: кто прошёл больше уровней. */
Sims.register({
  id: 'trampolines',
  kind: 'game',
  hit: true,
  title: 'Батуты',
  desc: 'Шарик и точка появляются в случайных местах. Нарисуйте пальцем несколько батутов так, чтобы шарик отскочил прямо в точку, и нажмите «Пуск».',

  lb: { label: 'Пройдено уровней за одну игру', better: 'high', fair: ['tramps', 'maxLen', 'trampBounce', 'gravity', 'ballR', 'targetR', 'wallDeath', 'wallBounce', 'floor'], fmt: v => v + ' ур.' },
  defaults: {
    tramps: 3, maxLen: 0.35, trampBounce: 1.1, gravity: 1.6, ballR: 0.035, targetR: 0.05,
    wallBounce: 0.8, wallDeath: true, floor: false, trail: true, sound: true, music: true, vocalStart: 8, volume: 0.7
  },
  schema: [
    { k: 'tramps', l: 'Сколько батутов дано', min: 1, max: 10, step: 1, live: 1 },
    { k: 'maxLen', l: 'Максимальная длина батута', min: 0.1, max: 0.8, step: 0.01, live: 1 },
    { k: 'trampBounce', l: 'Упругость батута', min: 0.6, max: 1.5, step: 0.01, live: 1 },
    { k: 'gravity', l: 'Гравитация', min: 0.3, max: 5, step: 0.1, live: 1 },
    { k: 'ballR', l: 'Размер шарика', min: 0.02, max: 0.08, step: 0.005 },
    { k: 'targetR', l: 'Размер точки', min: 0.02, max: 0.12, step: 0.005 },
    { k: 'wallDeath', l: 'Коснулся стены — проигрыш', type: 'check', live: 1 },
    { k: 'wallBounce', l: 'Упругость стен', min: 0.3, max: 1.1, step: 0.01, live: 1 },
    { k: 'floor', l: 'Пол снизу (шарик не пропадает)', type: 'check', live: 1 },
    { k: 'trail', l: 'След шарика', type: 'check', live: 1 },
    { k: 'sound', l: 'Звуки отскоков', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'vocalStart', l: 'С какой секунды трека начинается вокал', min: 0, max: 60, step: 0.1, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#0d1020'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2fd4ff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.22, h * 0.78); ctx.lineTo(w * 0.42, h * 0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.55, h * 0.45); ctx.lineTo(w * 0.72, h * 0.58); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.15); ctx.lineTo(w * 0.3, h * 0.7); ctx.quadraticCurveTo(w * 0.45, h * 0.3, w * 0.6, h * 0.4); ctx.lineTo(w * 0.7, h * 0.52); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.arc(w * 0.2, h * 0.15, h * 0.06, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3dff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.75, h * 0.09, 0, 7); ctx.stroke();
    ctx.fillStyle = '#3dff8a'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.75, h * 0.035, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const TAU = Math.PI * 2;
    let W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0;
    const ww = 1, hh = 1.7, TOP = 118, BOT = 92;   /* fixed play field, the same for everyone */
    let ball, start, target, tr, state, stateT, level, attempts, parts, trail, events, drag, simT;
    let paused = false, acc = 0, last = 0, raf = 0, on = true;
    let btnRun = null, btnClear = null;

    function rng(seed) { let a = (seed * 2654435761 + 12345) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function newLevel(keep) {
      if (!keep) level++;
      const R = rng(level * 7919 + 17), r = 0.035, tr0 = 0.05, minD = 0.55 + Math.min(0.25, level * 0.012);
      let tries = 0, bx, by, tx, ty;
      do {
        bx = r + 0.08 + R() * (ww - 2 * r - 0.16); by = 0.18 + R() * 0.55;
        tx = tr0 + 0.04 + R() * (ww - 2 * tr0 - 0.08); ty = hh * (0.38 + R() * 0.5);
        tries++;
      } while ((Math.hypot(bx - tx, by - ty) < minD || (Math.abs(bx - tx) < r + tr0 + 0.14 && ty > by - 0.1)) && tries < 2000);   /* straight fall must not reach the target */
      start = { x: bx, y: by }; target = { x: tx, y: ty };
      tr = []; reset();
    }
    function reset() {
      ball = { x: start.x, y: start.y, vx: 0, vy: 0 }; trail = []; state = 'plan'; stateT = 0; drag = null; simT = 0;
    }
    function restart() { level = 0; attempts = 0; parts = []; events = []; layout(); newLevel(false); }

    function segHit(b, s, r) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((b.x - s.x1) * dx + (b.y - s.y1) * dy) / L2));
      const px = s.x1 + dx * t, py = s.y1 + dy * t, ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
      if (d >= r || d < 1e-9) return false;
      const nx = ex / d, ny = ey / d, vn = b.vx * nx + b.vy * ny;
      b.x = px + nx * r; b.y = py + ny * r;
      if (vn < 0) { const j = (1 + cfg.trampBounce) * vn; b.vx -= j * nx; b.vy -= j * ny; events.push({ hit: Math.min(1, -vn / 2) }); }
      return true;
    }
    function burst(x, y, n, hue) {
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 0.1 + Math.random() * 0.7; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.2, life: 1, hue: hue + Math.random() * 40 }); }
    }

    function step(dt) {
      simT += dt;
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.8 * dt; p.life -= dt * 0.9; }
      parts = parts.filter(p => p.life > 0);
      if (state === 'won') { stateT += dt; if (stateT > 1.4) newLevel(false); return; }
      if (state === 'fail') { stateT += dt; if (stateT > 0.6) reset(); return; }
      if (state !== 'run') return;
      const b = ball, r = cfg.ballR;
      b.vy += cfg.gravity * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (cfg.wallDeath && (b.x <= r || b.x >= ww - r || b.y <= r)) {
        state = 'fail'; stateT = 0; attempts++; events.push({ fail: true }); burst(b.x, b.y, 25, 20); return;
      }
      if (b.x < r) { b.x = r; if (b.vx < 0) { b.vx = -b.vx * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      if (b.x > ww - r) { b.x = ww - r; if (b.vx > 0) { b.vx = -b.vx * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      if (b.y < r) { b.y = r; if (b.vy < 0) { b.vy = -b.vy * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      if (cfg.floor && b.y > hh - r) { b.y = hh - r; if (b.vy > 0) { b.vy = -b.vy * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      for (const s of tr) segHit(b, s, r + 0.008);
      if (Math.hypot(b.x - target.x, b.y - target.y) < r + cfg.targetR) {
        state = 'won'; stateT = 0; events.push({ win: true }); burst(target.x, target.y, 70, 90); if (ctl.submitScore) ctl.submitScore(level);
        return;
      }
      if (b.y > hh + 0.3 || simT > 25) { state = 'fail'; stateT = 0; attempts++; events.push({ fail: true }); }
      if (cfg.trail && ((simT * 240) | 0) % 2 === 0) { trail.push({ x: b.x, y: b.y }); if (trail.length > 40) trail.shift(); }
    }

    // ----- soundtrack: starts at the moment the vocals come in, then loops from there -----
    const song = new Audio('assets/soundtrack.m4a'); song.preload = 'auto'; song.loop = false;
    let songOn = false;
    function seekPlay() {
      const go = () => { try { song.currentTime = cfg.vocalStart; } catch (e) {} const pr = song.play(); if (pr && pr.catch) pr.catch(() => { songOn = false; }); };
      if (song.readyState >= 1) go(); else { song.addEventListener('loadedmetadata', go, { once: true }); song.load(); }
    }
    function musicTick() {
      if (!cfg.music || paused) { if (songOn) { song.pause(); songOn = false; } return; }
      song.volume = Math.max(0, Math.min(1, cfg.volume));
      if (!songOn) { songOn = true; seekPlay(); return; }
      // never play anything before the first words; loop back to them at the end
      if (!song.paused && song.currentTime < cfg.vocalStart - 0.25) { try { song.currentTime = cfg.vocalStart; } catch (e) {} }
      if (song.ended || (song.duration && song.currentTime > song.duration - 0.2)) seekPlay();
    }

    // ----- input -----
    const pt = e => { const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; return { px, py, x: Math.max(0, Math.min(ww, (px - OX) / S)), y: Math.max(0, Math.min(hh, (py - OY) / S)) }; };
    const inRect = (p, b) => b && p.px >= b.x && p.px <= b.x + b.w && p.py >= b.y && p.py <= b.y + b.h;
    function nearSeg(p) {
      let best = -1, bd = 0.05;
      tr.forEach((s, i) => {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1, t = Math.max(0, Math.min(1, ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / (dx * dx + dy * dy)));
        const d = Math.hypot(p.x - s.x1 - dx * t, p.y - s.y1 - dy * t); if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function down(e) {
      const p = pt(e); musicTick();
      if (inRect(p, btnRun)) { if (state === 'plan') { state = 'run'; simT = 0; attempts += 0; } else if (state === 'run') { reset(); } return; }
      if (inRect(p, btnClear)) { if (state === 'plan') tr = []; return; }
      if (state !== 'plan') return;
      const i = nearSeg(p);
      if (i >= 0) { tr.splice(i, 1); return; }                       // tap a trampoline to remove it
      drag = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!drag) return;
      const p = pt(e); let dx = p.x - drag.x1, dy = p.y - drag.y1; const L = Math.hypot(dx, dy);
      if (L > cfg.maxLen) { dx *= cfg.maxLen / L; dy *= cfg.maxLen / L; }
      drag.x2 = drag.x1 + dx; drag.y2 = drag.y1 + dy;
    }
    function up() {
      if (!drag) return;
      if (Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) > 0.04) { tr.push(drag); while (tr.length > cfg.tramps) tr.shift(); }
      drag = null;
    }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

    // ----- sound -----
    let lastBlip = 0;
    function blip(semi, power, dur, type) {
      const actx = ctl.audio(); if (!actx || actx.state !== 'running') return;
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = 220 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.04 + 0.1 * power, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.15));
      o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + (dur || 0.15) + 0.02);
    }
    function playEvents() {
      const ev = events; events = [];
      if (!cfg.sound || !ev.length) return;
      if (ev.some(e => e.win)) { [0, 4, 7, 12].forEach((s, k) => setTimeout(() => blip(s + 12, 0.8, 0.4), k * 90)); return; }
      if (ev.some(e => e.fail)) { blip(-12, 0.5, 0.3, 'triangle'); return; }
      const now = performance.now(); if (now - lastBlip < 60) return; lastBlip = now;
      blip(7 + ev[ev.length - 1].hit * 12, ev[ev.length - 1].hit, 0.16, 'triangle');
    }

    // ----- render -----
    function layout() { const availH = Math.max(100, H - TOP - BOT); S = Math.max(50, Math.min(W / ww, availH / hh)); OX = (W - S * ww) / 2; OY = TOP + (availH - S * hh) / 2; }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      layout();
    }
    function button(label, x, y, w, h, on) {
      ctx.fillStyle = on ? 'rgba(47,212,255,.9)' : 'rgba(255,255,255,.1)'; ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 14) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#04202b' : '#cfd6e6'; ctx.font = '700 ' + Math.max(15, Math.min(20, W * 0.045)) + 'px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + 1);
      return { x, y, w, h };
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0d1020'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 30; i++) ctx.fillRect(((i * 97) % 100) / 100 * W, ((i * 53) % 100) / 100 * H, 2, 2);
      ctx.save(); ctx.translate(OX, OY);
      ctx.strokeStyle = cfg.wallDeath ? 'rgba(255,90,90,.45)' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(1, 1, S * ww - 2, S * hh - 2); ctx.setLineDash([]);
      // target
      const tx = target.x * S, ty = target.y * S, pulse = 1 + Math.sin(simT * 0 + performance.now() / 300) * 0.06;
      ctx.strokeStyle = '#3dff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, cfg.targetR * S * pulse * 1.5, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#3dff8a'; ctx.beginPath(); ctx.arc(tx, ty, cfg.targetR * S, 0, TAU); ctx.fill();
      // trampolines
      const all = drag ? tr.concat([drag]) : tr;
      ctx.lineCap = 'round';
      all.forEach(s => {
        ctx.strokeStyle = '#2fd4ff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(s.x1 * S, s.y1 * S); ctx.lineTo(s.x2 * S, s.y2 * S); ctx.stroke();
        ctx.strokeStyle = '#d8f6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x1 * S, s.y1 * S); ctx.lineTo(s.x2 * S, s.y2 * S); ctx.stroke();
      });
      // trail
      if (cfg.trail) trail.forEach((p, i) => { ctx.fillStyle = 'rgba(255,138,28,' + (i / trail.length) * 0.35 + ')'; ctx.beginPath(); ctx.arc(p.x * S, p.y * S, cfg.ballR * S * (0.4 + 0.5 * i / trail.length), 0, TAU); ctx.fill(); });
      // ball
      if (state !== 'won') {
        ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.arc(ball.x * S, ball.y * S, cfg.ballR * S, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(ball.x * S - cfg.ballR * S * 0.3, ball.y * S - cfg.ballR * S * 0.3, cfg.ballR * S * 0.3, 0, TAU); ctx.fill();
      }
      for (const p of parts) { ctx.fillStyle = 'hsla(' + p.hue + ',100%,60%,' + Math.max(0, p.life) + ')'; ctx.fillRect(p.x * S, p.y * S, 3, 3); }
      ctx.restore();
      // HUD
      ctx.fillStyle = '#cfd6e6'; ctx.font = '700 ' + Math.max(15, Math.min(22, W * 0.05)) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Уровень ' + (level + 0) + ' · попыток: ' + attempts, W / 2, 80);
      if (state === 'plan') {
        ctx.fillStyle = 'rgba(207,214,230,.6)'; ctx.font = '500 ' + Math.max(12, Math.min(16, W * 0.036)) + 'px Inter, system-ui, sans-serif';
        ctx.fillText('Рисуйте батуты пальцем · осталось: ' + Math.max(0, cfg.tramps - tr.length), W / 2, 106);
      }
      if (state === 'won') { ctx.fillStyle = '#3dff8a'; ctx.font = '800 ' + Math.min(48, W * 0.11) + 'px Inter, system-ui, sans-serif'; ctx.fillText('Попал!', W / 2, OY + S * hh * 0.4); }
      const bh = 52, by = H - bh - 18, bw = Math.min(160, W * 0.4);
      btnRun = button(state === 'run' ? '↺ Заново' : '▶ Пуск', W / 2 + 8, by, bw, bh, state === 'plan');
      btnClear = button('Очистить', W / 2 - bw - 8, by, bw, bh, false);
    }

    const DT = 1 / 480;
    function frame(ts) {
      if (!on) return;
      const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) { acc += real; let n = 0; while (acc >= DT && n < 4000) { step(DT); acc -= DT; n++; } playEvents(); }
      musicTick();
      draw(); raf = requestAnimationFrame(frame);
    }

    resize(); level = 0; attempts = 0; parts = []; events = []; newLevel(false); level = 1;
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; song.pause(); song.removeAttribute('src'); song.load(); cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); },
      debug: { step, next() { newLevel(false); }, get state() { return state; }, get level() { return level; }, get start() { return start; }, get target() { return target; }, get hh() { return hh; }, get ww() { return ww; }, get tr() { return tr; }, run() { state = 'run'; simT = 0; } }
    };
  }
});
