/* «Филлипинец» — секретная игра в духе Doodle Jump. Филиппинец прыгает по островкам вверх и должен добраться до Франции
   (43 000 очков) и захватить Париж. Мешают торнадо, грозовые тучи, ветер, метеоритный дождь и босс Марсик (два раза).
   Управление: A/D или стрелки, на телефоне — держать левую или правую половину экрана. Прыгает сам.
   Открывается маленькой кнопкой в главном меню по паролю. */
Sims.register({
  id: 'filipinets',
  kind: 'game',
  secret: true,
  ownSpace: true,
  title: 'Филлипинец',
  desc: 'Прыгайте по островкам вверх до Франции: 43 000 очков — и Париж ваш. Мешают торнадо, грозы, ветер, метеориты и босс Марсик.',
  defaults: { sound: true, lives: 3 },
  schema: [
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'lives', l: 'Жизни', min: 1, max: 9, step: 1 }
  ],

  preview(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4aa8ff'); g.addColorStop(1, '#bfe9ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3ec25a'; ctx.fillRect(w * 0.2, h * 0.75, w * 0.35, h * 0.06); ctx.fillRect(w * 0.55, h * 0.45, w * 0.3, h * 0.06); ctx.fillRect(w * 0.15, h * 0.25, w * 0.3, h * 0.06);
    ctx.fillStyle = '#c8a050'; ctx.fillRect(w * 0.35, h * 0.55, w * 0.1, h * 0.02); ctx.fillStyle = '#b87a4a'; ctx.fillRect(w * 0.64, h * 0.34, w * 0.05, h * 0.1); ctx.fillStyle = '#e0c070'; ctx.fillRect(w * 0.62, h * 0.31, w * 0.09, h * 0.03);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const GOAL = 43000, SC = 2, LW = 120, GRAV = 520, JUMP = -Math.sqrt(2 * GRAV * 56), SPRING = -Math.sqrt(2 * GRAV * 118);
    const SPEED = 92, PW = 7, PH = 11;
    const ZONES = [
      { s: 0, n: 'Филиппины', a: '#3aa6ff', b: '#bfeaff' },
      { s: 8000, n: 'Тихий океан', a: '#2a6ad0', b: '#8ac4f0' },
      { s: 16000, n: 'Гималаи', a: '#3a4a8a', b: '#a8b8e8' },
      { s: 24000, n: 'Сибирская ночь', a: '#0e1230', b: '#34407a' },
      { s: 32000, n: 'Европа', a: '#5a7ac8', b: '#f0c8a0' },
      { s: 40000, n: 'Франция', a: '#ff9ab8', b: '#ffe6c8' }
    ];
    const BOSSES = [{ s: 20000, hp: 5, n: 'Марсик, страж Гималаев' }, { s: 41000, hp: 9, n: 'Император Марсик' }];
    const marsik = new Image(); marsik.src = 'assets/marsik.png';

    let W = 0, H = 0, dpr = 1, LH = 200, u = 1, off = null, g = null;
    let pl, plats, items, haz, shots, parts, cam, startY, maxH, lives, mode, boss, bossDone, arena, topY, hazY, wind, windT, windDir, meteorT, meteorOn, nextMeteor, summitPlaced, summit, t, zoneShown, toastT, toastS, best, lastType, brittleRun, paused = false, on = true, raf = 0, last = 0, keys = { l: 0, r: 0 }, touchDir = 0;
    try { best = +localStorage.getItem('fil_best') || 0; } catch (e) { best = 0; }

    const score = () => Math.min(GOAL, Math.floor(maxH * SC));
    const zoneAt = s => { let z = 0; ZONES.forEach((q, i) => { if (s >= q.s) z = i; }); return z; };

    function blip(f, dur, type, vol, slide) {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), gn = a.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.04, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur); o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function thunder() {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return; const n = a.sampleRate * 0.5, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = a.createBufferSource(), gn = a.createGain(); gn.gain.value = 0.18; s.buffer = buf; s.connect(gn); gn.connect(a.destination); s.start();
    }

    function restart() {
      cam = -LH * 0.62; startY = 0; maxH = 0; lives = cfg.lives; mode = 'play'; boss = null; bossDone = [false, false]; arena = false; wind = 0; windT = 8; windDir = 1; meteorT = 12; meteorOn = 0; nextMeteor = 0; summitPlaced = false; summit = null; t = 0; zoneShown = -1; toastT = 0; lastType = 'g'; brittleRun = 0;
      plats = [{ x: 8, y: 0, w: LW - 16, t: 'g', start: true }]; items = []; haz = []; shots = []; parts = [];
      pl = { x: LW / 2, y: 0, vx: 0, vy: JUMP, face: 1, inv: 0, hat: 0, spin: 0 };
      topY = 0; hazY = -260; gen(); say('Филиппины');
    }
    function say(s) { toastS = s; toastT = 2.6; }

    /* ---------- генерация ---------- */
    function gen() {
      const sc = score(), summitY = startY - GOAL / SC;
      while (!arena && !summitPlaced && topY > cam - 24) {
        const s2 = Math.floor((startY - topY) * SC);
        if (topY < summitY + 70) { summit = { x: 5, y: summitY, w: LW - 10, t: 'g', summit: true }; plats.push(summit); summitPlaced = true; break; }
        const gap = rnd(16, 24 + Math.min(24, s2 / 1500)); topY -= gap;
        let type = 'g', r = Math.random();
        if (s2 > 2500 && r < Math.min(0.32, 0.05 + s2 / 90000)) type = 'm'; else if (s2 > 1200 && r < Math.min(0.5, 0.15 + s2 / 70000) && brittleRun < 1 && lastType !== 'b') type = 'b';
        brittleRun = type === 'b' ? brittleRun + 1 : 0; lastType = type;
        const p = { x: rnd(2, LW - 24), y: topY, w: type === 'm' ? 20 : 22, t: type, dir: Math.random() < 0.5 ? 1 : -1, sp: rnd(14, 26), id: Math.random() };
        plats.push(p);
        if (type === 'g') {
          const q = Math.random();
          if (q < 0.07) items.push({ k: 'spring', p, x: p.w / 2 - 3, w: 6 }); else if (q < 0.085 && s2 > 1000) items.push({ k: 'hat', p, x: p.w / 2 - 4, w: 8 }); else if (q < 0.092 && s2 > 4000) items.push({ k: 'heart', p, x: p.w / 2 - 3, w: 7 });
        }
      }
      // события-явления
      while (!arena && cam < hazY + 40 && hazY > summitY + 120) {
        const s3 = Math.floor((startY - hazY) * SC), pool = [];
        if (s3 > 2500) pool.push('tornado'); if (s3 > 8000) pool.push('storm', 'tornado'); if (s3 > 3500) pool.push('tornado');
        if (pool.length) { const k = pool[Math.floor(Math.random() * pool.length)], y = cam - 36; if (k === 'tornado') haz.push({ k, x: rnd(10, LW - 10), y, vx: (Math.random() < 0.5 ? -1 : 1) * rnd(16, 30), h: 40 }); else haz.push({ k, x: rnd(20, LW - 20), y, st: 0, tm: rnd(1, 2), bolt: 0 }); }
        hazY -= rnd(140, 240) - Math.min(70, sc / 800);
        if (hazY > cam - 20) hazY = cam - 20;
      }
    }

    function hurt(why) {
      if (pl.inv > 0 || pl.hat > 0 || mode !== 'play') return;
      lives--; pl.inv = 1.8; pl.vy = Math.min(pl.vy, -110); blip(160, 0.3, 'sawtooth', 0.06, 60);
      for (let i = 0; i < 12; i++) parts.push({ x: pl.x, y: pl.y - 6, vx: rnd(-50, 50), vy: rnd(-80, 20), l: rnd(0.4, 0.8), c: Math.random() < 0.5 ? '#ff5a4a' : '#ffd24a' });
      if (lives <= 0) finish('over');
    }
    function finish(m) { mode = m; if (score() > best) { best = score(); try { localStorage.setItem('fil_best', String(best)); } catch (e) { } } if (m === 'win') { for (let i = 0; i < 80; i++) parts.push({ x: rnd(0, LW), y: cam + rnd(-10, 40), vx: rnd(-20, 20), vy: rnd(20, 90), l: rnd(1.5, 3.5), c: ['#0055a4', '#fff', '#ef4135', '#ffd24a'][i % 4] }); blip(660, 0.8, 'triangle', 0.07, 1320); } }
    function respawn() {
      lives--; if (lives <= 0) { finish('over'); return; }
      const y = cam + LH * 0.62; plats.push({ x: clamp(pl.x - 12, 2, LW - 26), y, w: 24, t: 'g', safe: true }); pl.y = y; pl.vy = JUMP; pl.inv = 2.2; pl.hat = 0; blip(220, 0.25, 'triangle', 0.05, 440);
    }

    /* ---------- босс ---------- */
    function startArena(i) {
      arena = true; boss = { i, x: LW / 2, y: cam + 46, hp: BOSSES[i].hp, max: BOSSES[i].hp, t: 0, flash: 0, ph: 'idle', pt: 5, sh: 2.2, dead: 0, inv: 0, ty: 0, tx: 0 };
      plats = []; items = []; haz = []; shots = []; let k = 0;
      for (let y = cam + LH - 14; y > cam + 74; y -= 30) { plats.push({ x: k % 2 ? rnd(LW * 0.55, LW - 26) : rnd(4, LW * 0.45), y, w: 24, t: 'g' }); k++; }
      plats.push({ x: LW / 2 - 12, y: cam + LH - 14, w: 24, t: 'g' });
      say(BOSSES[i].n); blip(120, 0.6, 'sawtooth', 0.06, 70);
    }
    function bossUpdate(dt) {
      const b = boss; b.t += dt; b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt);
      if (b.dead) { b.dead += dt; b.y += 90 * dt; if (b.dead > 2.2) { boss = null; arena = false; bossDone[b.i] = true; topY = cam + 4; hazY = cam - 120; lives = Math.min(9, lives + 1); say('Марсик побеждён! +1 жизнь'); if (b.i === 1) say('Вперёд, к Парижу!'); gen(); } return; }
      const fast = b.hp <= b.max / 2 ? 1.4 : 1;
      if (b.ph === 'idle') { b.x = LW / 2 + Math.sin(b.t * 0.9 * fast) * 40; b.y = cam + 46 + Math.sin(b.t * 1.7) * 5; b.pt -= dt; if (b.pt <= 0) { b.ph = 'tele'; b.pt = 0.9; b.tx = pl.x; blip(300, 0.5, 'square', 0.04, 600); } }
      else if (b.ph === 'tele') { b.x += Math.sin(b.t * 60) * 0.6; b.pt -= dt; if (b.pt <= 0) { b.ph = 'dive'; b.ty = cam + LH * 0.62; } }
      else if (b.ph === 'dive') { b.x += clamp(b.tx - b.x, -140 * dt, 140 * dt); b.y += 170 * dt; if (b.y >= b.ty) b.ph = 'back'; }
      else { b.y -= 75 * dt; b.x += clamp(LW / 2 - b.x, -40 * dt, 40 * dt); if (b.y <= cam + 46) { b.ph = 'idle'; b.pt = rnd(5, 7) / fast; } }
      b.sh -= dt; if (b.sh <= 0 && b.ph === 'idle') { b.sh = rnd(1.5, 2.2) / fast; const dx = pl.x - b.x, dy = (pl.y - 6) - b.y, d = Math.hypot(dx, dy) || 1; shots.push({ x: b.x, y: b.y + 8, vx: dx / d * 52, vy: dy / d * 52, l: 6 }); blip(520, 0.12, 'square', 0.035, 260); }
      // столкновение с игроком
      if (Math.hypot(pl.x - b.x, (pl.y - 6) - b.y) < 15 && mode === 'play') {
        if (pl.vy > 20 && pl.y < b.y + 5) {
          if (b.inv <= 0) { b.hp--; b.flash = 0.4; b.inv = 0.7; blip(440, 0.2, 'square', 0.06, 110); for (let i = 0; i < 14; i++) parts.push({ x: b.x, y: b.y, vx: rnd(-70, 70), vy: rnd(-90, 30), l: rnd(0.4, 0.9), c: ['#ffd24a', '#fff', '#ff5a4a'][i % 3] }); if (b.hp <= 0) { b.dead = 0.01; blip(90, 1, 'sawtooth', 0.07, 40); } }
          pl.vy = JUMP * 1.12;
        } else hurt('boss');
      }
    }

    /* ---------- обновление ---------- */
    function update(dt) {
      t += dt; if (toastT > 0) toastT -= dt;
      parts.forEach(p => { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }); parts = parts.filter(p => p.l > 0);
      if (mode !== 'play') return;
      const sc = score(), dir = (keys.r - keys.l) || touchDir;
      // ветер
      if (!arena && sc >= 12000 && sc < 41000) { windT -= dt; if (windT <= 0) { if (wind) { wind = 0; windT = rnd(9, 14); } else { windDir = Math.random() < 0.5 ? -1 : 1; wind = windDir; windT = 4.2; say(windDir > 0 ? 'Ветер →' : '← Ветер'); } } } else wind = 0;
      // метеоры
      if (!arena && sc >= 16000 && sc < 41000) { meteorT -= dt; if (meteorT <= 0) { if (meteorOn > 0) { meteorOn = 0; meteorT = rnd(12, 18); } else { meteorOn = 1; meteorT = 5; say('Метеоритный дождь!'); } } }
      else meteorOn = 0;
      if (meteorOn) { nextMeteor -= dt; if (nextMeteor <= 0) { nextMeteor = rnd(0.25, 0.45); haz.push({ k: 'meteor', x: rnd(-10, LW), y: cam - 6, vx: rnd(14, 30), vy: rnd(90, 125) }); } }
      // игрок
      pl.vx = dir * SPEED; if (dir) pl.face = dir; pl.x += (pl.vx + wind * 30) * dt; if (pl.x < -3) pl.x += LW + 6; if (pl.x > LW + 3) pl.x -= LW + 6;
      pl.inv = Math.max(0, pl.inv - dt);
      const py0 = pl.y;
      if (pl.hat > 0) { pl.hat -= dt; pl.vy = -300; pl.spin += dt * 30; } else pl.vy += GRAV * dt;
      pl.y += pl.vy * dt;
      // платформы
      plats.forEach(p => {
        if (p.t === 'm') { p.x += p.dir * p.sp * dt; if (p.x < 2) { p.x = 2; p.dir = 1; } if (p.x + p.w > LW - 2) { p.x = LW - 2 - p.w; p.dir = -1; } }
        if (p.fall) { p.fall += dt; p.y += 160 * p.fall * dt; }
      });
      if (pl.vy > 0 && pl.hat <= 0) {
        for (const p of plats) {
          if (p.fall) continue;
          if (py0 <= p.y + 1.5 && pl.y >= p.y && pl.x + 3 > p.x && pl.x - 3 < p.x + p.w) {
            pl.y = p.y; pl.vy = JUMP; blip(380, 0.1, 'square', 0.04, 620);
            if (p.t === 'b') { p.fall = 0.001; for (let i = 0; i < 6; i++) parts.push({ x: p.x + rnd(0, p.w), y: p.y, vx: rnd(-30, 30), vy: rnd(-20, 30), l: 0.6, c: '#f0d8c8' }); }
            if (p.summit && !arena) { finish('win'); return; }
            break;
          }
        }
        for (const it of items) { if (it.dead || !it.p) continue; const ix = it.p.x + it.x; if (it.k === 'spring' && py0 <= it.p.y && pl.y >= it.p.y - 4 && pl.x + 3 > ix && pl.x - 3 < ix + it.w) { pl.vy = SPRING; blip(300, 0.25, 'triangle', 0.06, 900); } }
      }
      for (const it of items) { if (it.dead || !it.p) continue; const ix = it.p.x + it.x, iy = it.p.y - 7; if ((it.k === 'hat' || it.k === 'heart') && Math.abs(pl.x - ix - it.w / 2) < 7 && Math.abs((pl.y - 6) - iy) < 9) { it.dead = true; if (it.k === 'hat') { pl.hat = 2.3; blip(500, 0.4, 'triangle', 0.06, 1200); } else { lives = Math.min(9, lives + 1); blip(700, 0.3, 'triangle', 0.06, 1400); } } }
      // максимум высоты
      if (-pl.y > maxH - startY * 0 && !arena) maxH = Math.max(maxH, startY - pl.y);
      else if (arena) maxH = Math.max(maxH, startY - pl.y);
      // камера
      if (!arena) cam = Math.min(cam, pl.y - LH * 0.42);
      // босс
      const s2 = score();
      if (!arena) BOSSES.forEach((b, i) => { if (!bossDone[i] && s2 >= b.s && !boss) startArena(i); });
      if (boss) bossUpdate(dt);
      // явления
      haz.forEach(h => {
        if (h.k === 'tornado') {
          h.x += h.vx * dt; if (h.x < 8 || h.x > LW - 8) h.vx = -h.vx;
          if (Math.abs(pl.x - h.x) < 22 && pl.y > h.y - h.h && pl.y < h.y + 6) { pl.x += (h.x - pl.x) * Math.min(1, dt * 1.4); if (Math.abs(pl.x - h.x) < 9) hurt('tornado'); }
        } else if (h.k === 'storm') {
          h.tm -= dt; h.x += clamp(pl.x - h.x, -10 * dt, 10 * dt);
          if (h.st === 0 && h.tm <= 0) { h.st = 1; h.tm = 0.9; blip(260, 0.8, 'sine', 0.03, 120); }
          else if (h.st === 1 && h.tm <= 0) { h.st = 2; h.tm = 0.28; thunder(); }
          else if (h.st === 2) { if (Math.abs(pl.x - h.x) < 5 && pl.y > h.y) hurt('bolt'); if (h.tm <= 0) { h.st = 0; h.tm = rnd(1.4, 2.4); } }
        } else if (h.k === 'meteor') { h.x += h.vx * dt; h.y += h.vy * dt; if (Math.hypot(pl.x - h.x, (pl.y - 6) - h.y) < 6) { h.dead = true; hurt('meteor'); } }
      });
      shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.l -= dt; if (Math.hypot(pl.x - s.x, (pl.y - 6) - s.y) < 6) { s.l = 0; hurt('yarn'); } }); shots = shots.filter(s => s.l > 0);
      // уборка
      const cut = cam + LH + 40; plats = plats.filter(p => p.y < cut); items = items.filter(i => !i.dead && i.p && i.p.y < cut); haz = haz.filter(h => !h.dead && h.y < cut + 20 && !(h.k === 'meteor' && h.x > LW + 10));
      // зона
      const z = zoneAt(s2); if (z !== zoneShown) { zoneShown = z; if (z > 0) say(ZONES[z].n); }
      // падение
      if (pl.y > cam + LH + 8) respawn();
      if (!arena) gen();
    }

    /* ---------- отрисовка ---------- */
    const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const mix = (a, b, k) => { const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16)); return 'rgb(' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',') + ')'; };
    function drawSky() {
      const s = score(), z = zoneAt(s), nz = Math.min(ZONES.length - 1, z + 1), k = z === nz ? 0 : clamp((s - ZONES[nz].s + 1500) / 1500, 0, 1);
      const a = mix(ZONES[z].a, ZONES[nz].a, k), b = mix(ZONES[z].b, ZONES[nz].b, k), gr = g.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
      if (z >= 3 && z < 4 || (z === 3)) for (let i = 0; i < 40; i++) { const x = (i * 53) % LW, y = (i * 97 + Math.floor(cam * 0.05)) % LH; R('#fff', x, ((y % LH) + LH) % LH, 1, 1); }
      for (let i = 0; i < 7; i++) { const cx = ((i * 41 + t * (3 + i)) % (LW + 40)) - 20, cy = (((i * 67) - cam * 0.25) % (LH + 30) + (LH + 30)) % (LH + 30) - 15; R('rgba(255,255,255,.55)', cx, cy, 22, 4); R('rgba(255,255,255,.55)', cx + 4, cy - 3, 14, 4); }
      const sea = LH - (cam + LH - startY) * 1 + (LH - 0); const wy = startY + 22 - cam; if (wy < LH) { R('#1d7fd0', 0, wy, LW, LH - wy + 4); for (let x = 0; x < LW; x += 8) R('#5ab8f0', x + ((t * 10) % 8), wy + 1, 4, 1); }
      if (s > 38000 || z === 5) { const ty = clamp(LH - 30 + (s - 38000) * 0.0, 0, LH); }
    }
    function drawPlat(p) {
      const y = p.y - cam; if (y < -8 || y > LH + 8) return;
      if (p.summit) { R('#3ec25a', p.x, y, p.w, 3); R('#c8a050', p.x, y + 3, p.w, 6); R('#a07a30', p.x + 4, y + 9, p.w - 8, 3); return; }
      const w = p.w;
      if (p.t === 'g') { R('#3ec25a', p.x, y, w, 2); R('#2a9a44', p.x, y + 2, w, 1); R('#b88a4a', p.x + 1, y + 3, w - 2, 3); R('#8a6232', p.x + 3, y + 6, w - 6, 2); if (!p.start && p.id && p.id < 0.35) { R('#7a5230', p.x + 4, y - 6, 1, 6); R('#2e9a3a', p.x + 1, y - 8, 7, 2); R('#2e9a3a', p.x + 3, y - 9, 3, 1); } }
      else if (p.t === 'm') { R('#d8b060', p.x, y, w, 3); R('#a07a30', p.x, y + 3, w, 1); R('#8a6232', p.x + 2, y + 1, 1, 3); R('#8a6232', p.x + w - 3, y + 1, 1, 3); }
      else { R('#f4dcd0', p.x, y, w, 3); R('#e0a8a0', p.x + 1, y + 3, w - 2, 2); for (let i = 3; i < w - 3; i += 5) R('#fff', p.x + i, y, 1, 2); }
    }
    function drawItem(it) {
      if (!it.p) return; const x = it.p.x + it.x, y = it.p.y - cam;
      if (it.k === 'spring') { R('#d8d8d8', x, y - 2, 6, 1); R('#9a9a9a', x + 1, y - 4, 4, 1); R('#d8d8d8', x, y - 5, 6, 1); R('#e03a3a', x, y - 7, 6, 2); }
      else if (it.k === 'hat') { R('#e03a3a', x, y - 4, 8, 3); R('#ffd24a', x + 3, y - 6, 2, 2); R('#ddd', x - 1, y - 8, 10, 1); }
      else { R('#ff4a6a', x, y - 6, 3, 3); R('#ff4a6a', x + 4, y - 6, 3, 3); R('#ff4a6a', x, y - 4, 7, 2); R('#ff4a6a', x + 1, y - 2, 5, 1); }
    }
    function drawPlayer() {
      const x = Math.round(pl.x), y = Math.round(pl.y - cam); if (pl.inv > 0 && Math.floor(t * 18) % 2) return;
      const f = pl.face, up = pl.vy < 0;
      R('#b87a4a', x - 2, y - 10 + 2, 5, 4); R('#1a1208', x - 3, y - 10 + 2, 6, 1); R('#1a1208', x - 3 + (f > 0 ? 0 : 5), y - 10 + 3, 1, 2);
      R('#fff', x - 1 + (f > 0 ? 1 : -1), y - 8 + 1, 1, 1); R('#e8c070', x - 5, y - 10 + 1, 10, 1); R('#d8a850', x - 3, y - 12 + 1, 6, 2); R('#b88830', x - 3, y - 11 + 1, 6, 1);
      R('#f4f0e0', x - 3, y - 6 + 2, 7, 5); R('#d8d0b8', x - 3, y - 6 + 4, 7, 1); R('#2a4a9a', x - 3, y - 1 + 1, 7, 2);
      R('#b87a4a', up ? x - 3 : x - 3 + (Math.floor(t * 12) % 2), y + 1, 2, up ? 1 : 2); R('#b87a4a', up ? x + 2 : x + 2 - (Math.floor(t * 12) % 2), y + 1, 2, up ? 1 : 2);
      R('#b87a4a', x - 4, y - 5 + 2, 1, 3); R('#b87a4a', x + 4, y - 5 + 2, 1, 3);
      if (pl.hat > 0) { R('#e03a3a', x - 2, y - 14, 5, 2); const w = 6 + Math.round(Math.sin(pl.spin) * 5); R('#ddd', x - w / 2 + 0.5, y - 15, w, 1); }
    }
    function drawTornado(h) {
      const x = h.x, y = h.y - cam;
      for (let i = 0; i < h.h; i += 2) { const k = i / h.h, w = 5 + (1 - k) * 12, off = Math.sin(t * 6 + i * 0.4) * 2.2 * (1 - k); R(i % 4 ? '#8a98a8' : '#c8d2dc', x - w / 2 + off, y - h.h + i, w, 2); }
      for (let i = 0; i < 5; i++) { const a = t * 5 + i * 1.3; R('#6a5a3a', x + Math.cos(a) * 11, y - 8 - ((i * 7 + t * 14) % 30), 1, 1); }
    }
    function drawStorm(h) {
      const x = h.x, y = h.y - cam, dark = h.st > 0 ? '#2a2a3a' : '#4a4a5a';
      R(dark, x - 14, y - 4, 28, 7); R(dark, x - 9, y - 8, 18, 5); R('#6a6a7a', x - 12, y - 6, 8, 2);
      if (h.st === 1 && Math.floor(t * 14) % 2) R('#ffe85a', x - 1, y + 3, 2, 3);
      if (h.st === 2) { let bx = x; for (let by = y + 3; by < LH; by += 6) { const nx = x + (((by * 7) | 0) % 5) - 2; R('#fff6a0', Math.min(bx, nx) - 1, by, 3, 6); R('#fff', Math.min(bx, nx), by, 1, 6); bx = nx; } g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, LW, LH); }
    }
    function drawBoss() {
      const b = boss; if (!b) return; const x = b.x, y = b.y - cam;
      if (!(b.flash > 0 && Math.floor(t * 20) % 2)) { g.imageSmoothingEnabled = true; if (marsik.complete && marsik.naturalWidth) g.drawImage(marsik, x - 14, y - 14, 28, 28); else R('#c8a070', x - 12, y - 12, 24, 24); g.imageSmoothingEnabled = false; }
      R('#ffd24a', x - 7, y - 19, 14, 3); R('#ffd24a', x - 7, y - 23, 2, 4); R('#ffd24a', x - 1, y - 24, 2, 5); R('#ffd24a', x + 5, y - 23, 2, 4);
      if (b.ph === 'tele') R('#ff3a3a', x - 1, y - 32, 2, 6), R('#ff3a3a', x - 1, y - 24 - 0, 2, 1);
      if (b.i === 1) R('#ef4135', x - 14, y + 11, 28, 2);
    }
    function draw() {
      g.imageSmoothingEnabled = false; drawSky();
      if (summitPlaced && summit) { const sx = LW / 2, sy = summit.y - cam; if (sy > -70 && sy < LH + 10) { const c = '#5a4a3a'; for (let i = 0; i < 40; i++) { const w = 3 + (i * 0.28); R(c, sx - w / 2, sy - 40 + i, w, 1); } R('#8a7a5a', sx - 9, sy - 18, 18, 1); R('#8a7a5a', sx - 6, sy - 28, 12, 1); R('#8a7a5a', sx - 2, sy - 36, 4, 1); R('#5a4a3a', sx - 1, sy - 46, 2, 8); R('#0055a4', sx + 1, sy - 48, 3, 4); R('#fff', sx + 4, sy - 48, 3, 4); R('#ef4135', sx + 7, sy - 48, 3, 4); } }
      plats.forEach(drawPlat); items.forEach(drawItem);
      haz.forEach(h => { if (h.k === 'tornado') drawTornado(h); else if (h.k === 'storm') drawStorm(h); else { const x = h.x, y = h.y - cam; R('#ff8a2a', x - 2, y - 2, 4, 4); R('#ffe28a', x - 1, y - 1, 2, 2); R('rgba(255,140,40,.6)', x - 6, y - 8, 3, 3); R('rgba(255,140,40,.4)', x - 10, y - 14, 2, 2); } });
      shots.forEach(s => { const x = s.x, y = s.y - cam; R('#e03a3a', x - 3, y - 3, 6, 6); R('#ff7a7a', x - 2, y - 2, 2, 2); R('#e8e8e8', x - 4, y + 2, 3, 1); });
      drawBoss();
      if (mode !== 'over') drawPlayer();
      if (wind) for (let i = 0; i < 8; i++) { const y = (i * 29 + t * 40) % LH, x = ((t * 140 * wind + i * 47) % (LW + 30) + LW + 30) % (LW + 30) - 15; R('rgba(255,255,255,.7)', x, y, 10, 1); }
      parts.forEach(p => R(p.c, p.x, p.y - cam, 1, 1));
      ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(off, 0, 0, LW, LH, 0, 0, canvas.width, canvas.height);
      hud();
    }
    function txt(s, x, y, size, col, al, sh) { ctx.font = '800 ' + Math.round(size) + 'px system-ui,sans-serif'; ctx.textAlign = al || 'left'; if (sh !== false) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(s, x + size * 0.07, y + size * 0.07); } ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
    function hud() {
      const k = canvas.width / LW, fs = Math.max(11, 4.2 * k);
      txt(score() + ' / ' + GOAL, 8 * k * 0.6, 14 * k * 0.8 + 56 * dpr, fs, '#fff');
      for (let i = 0; i < lives; i++) { const x = (8 + i * 8) * k * 0.6, y = 22 * k * 0.8 + 56 * dpr; ctx.fillStyle = '#ff4a6a'; ctx.fillRect(x, y, 3.2 * k * 0.6, 3.2 * k * 0.6); ctx.fillRect(x + 4 * k * 0.6, y, 3.2 * k * 0.6, 3.2 * k * 0.6); ctx.fillRect(x - k * 0.1, y + 2.4 * k * 0.6, 8 * k * 0.6, 2.2 * k * 0.6); ctx.fillRect(x + 1 * k * 0.6, y + 4.4 * k * 0.6, 6 * k * 0.6, 1.4 * k * 0.6); }
      // полоса пути
      const bx = canvas.width - 5 * k * 0.5, bt = 70 * dpr, bh = canvas.height - bt - 20 * dpr; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx, bt, 3 * k * 0.5, bh); ctx.fillStyle = '#ffd24a'; const f = score() / GOAL; ctx.fillRect(bx, bt + bh * (1 - f), 3 * k * 0.5, bh * f); ctx.fillStyle = '#fff'; ctx.fillRect(bx - 1.5 * k * 0.5, bt + bh * (1 - f) - 2, 6 * k * 0.5, 4);
      if (boss && !boss.dead) { const w = canvas.width * 0.6, x = (canvas.width - w) / 2, y = Math.max(132 * dpr, canvas.height * 0.18); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, w, 8 * dpr); ctx.fillStyle = '#ff5a4a'; ctx.fillRect(x, y, w * boss.hp / boss.max, 8 * dpr); txt(BOSSES[boss.i].n, canvas.width / 2, y + 22 * dpr, fs * 0.9, '#fff', 'center'); }
      if (toastT > 0) { ctx.globalAlpha = Math.min(1, toastT); txt(toastS, canvas.width / 2, canvas.height * 0.3, fs * 1.6, '#fff', 'center'); ctx.globalAlpha = 1; }
      if (mode === 'over' || mode === 'win') {
        ctx.fillStyle = 'rgba(8,4,20,.62)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        txt(mode === 'win' ? 'ПАРИЖ ЗАХВАЧЕН!' : 'ИГРА ОКОНЧЕНА', canvas.width / 2, canvas.height * 0.4, fs * 2.2, mode === 'win' ? '#ffd24a' : '#ff8a7a', 'center');
        txt('Очки: ' + score() + ' · Рекорд: ' + best, canvas.width / 2, canvas.height * 0.48, fs * 1.3, '#fff', 'center');
        txt(mode === 'win' ? 'Филиппинец водрузил флаг над Эйфелевой башней' : 'Нажмите, чтобы начать заново', canvas.width / 2, canvas.height * 0.55, fs, '#d9c2ee', 'center');
      }
    }

    /* ---------- ввод ---------- */
    function onKey(e) {
      const d = e.type === 'keydown' ? 1 : 0, c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') keys.l = d; else if (c === 'ArrowRight' || c === 'KeyD') keys.r = d;
      if (d && mode !== 'play' && (c === 'Space' || c === 'Enter')) restart();
    }
    function ptr(e) { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) < r.width / 2 ? -1 : 1; }
    const onDown = e => { if (mode !== 'play') { restart(); return; } touchDir = ptr(e); };
    const onMove = e => { if (touchDir && e.buttons !== 0) touchDir = ptr(e); };
    const onUp = () => { touchDir = 0; };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      LH = Math.max(120, Math.round(LW * H / W)); off = document.createElement('canvas'); off.width = LW; off.height = LH; g = off.getContext('2d'); u = W / LW;
    }
    function frame(ts) { if (!on) return; const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts; if (!paused) update(dt); draw(); raf = requestAnimationFrame(frame); }
    resize(); restart(); raf = requestAnimationFrame(frame);
    return {
      restart, resize, setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); },
      debug: {
        update, restart, startArena, score, GOAL, get mode() { return mode; }, get lives() { return lives; }, get boss() { return boss; }, get pl() { return pl; }, get plats() { return plats; }, get haz() { return haz; }, get cam() { return cam; }, get arena() { return arena; },
        teleport(s) { const y = startY - s / SC; pl.y = y - 2; pl.vy = 0; maxH = s / SC; cam = y - LH * 0.42; plats = []; items = []; haz = []; topY = cam + LH * 0.5; plats.push({ x: 20, y: y + 10, w: 30, t: 'g' }); hazY = cam - 150; gen(); },
        set dir(v) { keys.l = v < 0 ? 1 : 0; keys.r = v > 0 ? 1 : 0; }, get bossDone() { return bossDone; }, set lives(v) { lives = v; }, hurt
      }
    };
  }
});
