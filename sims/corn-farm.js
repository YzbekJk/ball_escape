/* Игра «Кукурузная ферма» (пиксель-арт): растёт кукуруза, собираете серпом (тап или проведите пальцем),
   на монеты прокачиваете размер поля или рост кукурузы. Начинаем с очень маленького поля и большой кукурузы. */
Sims.register({
  id: 'corn-farm',
  kind: 'game',
  title: 'Кукурузная ферма',
  desc: 'Пиксельная ферма: на крошечном поле растёт большая кукуруза. Собирайте урожай серпом (тап или проведите пальцем), копите монеты и прокачивайте размер поля или рост кукурузы.',

  defaults: { baseTime: 7, speed: 1, swipe: true, wind: true, sound: true },
  schema: [
    { k: 'baseTime', l: 'Сколько секунд растёт кукуруза (без прокачки)', min: 2, max: 40, step: 1, live: 1 },
    { k: 'speed', l: 'Скорость роста ×', min: 0.25, max: 10, step: 0.25, live: 1 },
    { k: 'swipe', l: 'Собирать, проводя пальцем', type: 'check', live: 1 },
    { k: 'wind', l: 'Ветер качает кукурузу', type: 'check', live: 1 },
    { k: 'sound', l: 'Звук', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#7ad0f5'; ctx.fillRect(0, 0, w, h * 0.55);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(w * 0.78, h * 0.1, h * 0.12, h * 0.12);
    ctx.fillStyle = '#5fb24a'; ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.fillStyle = '#7a4a26'; ctx.fillRect(w * 0.3, h * 0.7, w * 0.4, h * 0.25);
    [0.4, 0.58].forEach(fx => {
      const x = w * fx, b = h * 0.9, u = h * 0.02;
      ctx.fillStyle = '#3a9c2a'; ctx.fillRect(x, b - u * 14, u * 1.5, u * 14);
      ctx.fillRect(x - u * 3, b - u * 9, u * 3, u); ctx.fillRect(x + u * 1.5, b - u * 6, u * 3, u);
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(x + u * 1.5, b - u * 11, u * 2, u * 5);
      ctx.fillStyle = '#d8b04a'; ctx.fillRect(x - u * 0.5, b - u * 16, u * 2.5, u * 2);
    });
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const FIELDS = [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [5, 5]];   // [cols, rows]
    const FIELD_COST = [12, 35, 90, 220, 500, 1100, 2400, 5000];
    const MAX_GROW = 12, TW = 24, TH = 14;
    const growCost = l => Math.round(8 * Math.pow(1.75, l));
    const valueOf = l => 1 + l;                                        // coins per cob
    const KEY = 'corn-farm-save';

    let coins, fieldLvl, growLvl, plots, slashes, bits, pops, t, resetArm;
    let paused = false, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, u = 3, LW = 130, LH = 260, off, g;
    let btnField = null, btnGrow = null, btnReset = null, events = [], down = false;

    function save() { try { localStorage.setItem(KEY, JSON.stringify({ coins, fieldLvl, growLvl })); } catch (e) {} }
    function load() {
      try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { coins = s.coins | 0; fieldLvl = Math.min(FIELDS.length - 1, s.fieldLvl | 0); growLvl = Math.min(MAX_GROW, s.growLvl | 0); return; } } catch (e) {}
      coins = 0; fieldLvl = 0; growLvl = 0;
    }
    function replant() {
      plots = []; for (let r = 0; r < 5; r++) { plots.push([]); for (let c = 0; c < 5; c++) plots[r].push({ p: 0, shake: 0 }); }
      slashes = []; bits = []; pops = []; t = 0; resetArm = 0;
    }
    function restart() { load(); replant(); }

    const growTime = () => cfg.baseTime * Math.pow(0.85, growLvl) / cfg.speed;
    const dims = () => FIELDS[fieldLvl];

    // ---- layout (logical pixels) ----
    function layoutField() {
      const [cols, rows] = dims(), fw = cols * TW, fh = rows * TH;
      const cy = Math.round(LH * 0.46);
      return { x0: Math.round((LW - fw) / 2), y0: Math.round(cy - fh / 2), cols, rows };
    }
    function plotAt(lx, ly) {
      const L = layoutField();
      // corn grows up from the tile bottom: test the tile column and a tall box above the tile
      for (let r = L.rows - 1; r >= 0; r--) for (let c = 0; c < L.cols; c++) {
        const px = L.x0 + c * TW, py = L.y0 + r * TH;
        if (lx >= px && lx < px + TW && ly >= py - 34 && ly < py + TH) return { r, c, cx: px + TW / 2, cy: py + TH - 8 };
      }
      return null;
    }

    function harvest(r, c, cx, cy) {
      const pl = plots[r][c];
      if (pl.p < 1) { pl.shake = 0.25; return; }
      const v = valueOf(growLvl); coins += v; pl.p = 0; save();
      slashes.push({ x: cx, y: cy - 10, t: 0 });
      for (let i = 0; i < 8; i++) bits.push({ x: cx, y: cy - 12, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, life: 0.7, col: i % 2 ? '#ffd23a' : '#3a9c2a' });
      pops.push({ x: cx, y: cy - 24, v, life: 1 });
      events.push('chop');
    }
    function buy(kind) {
      if (kind === 'field') {
        if (fieldLvl >= FIELDS.length - 1) return; const c = FIELD_COST[fieldLvl];
        if (coins < c) { events.push('no'); return; } coins -= c; fieldLvl++;
      } else {
        if (growLvl >= MAX_GROW) return; const c = growCost(growLvl);
        if (coins < c) { events.push('no'); return; } coins -= c; growLvl++;
      }
      save(); events.push('buy');
    }

    // ---- input ----
    function lpt(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / u, y: (e.clientY - r.top) / u }; }
    const hit = (p, b) => b && p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
    function onDown(e) {
      const p = lpt(e); down = true;
      if (hit(p, btnField)) { buy('field'); return; }
      if (hit(p, btnGrow)) { buy('grow'); return; }
      if (hit(p, btnReset)) {
        if (resetArm > 0) { try { localStorage.removeItem(KEY); } catch (er) {} restart(); } else resetArm = 3;
        return;
      }
      const a = plotAt(p.x, p.y); if (a) harvest(a.r, a.c, a.cx, a.cy);
    }
    function onMove(e) {
      if (!down || !cfg.swipe) return; const p = lpt(e);
      if (hit(p, btnField) || hit(p, btnGrow) || hit(p, btnReset)) return;
      const a = plotAt(p.x, p.y); if (a && plots[a.r][a.c].p >= 1) harvest(a.r, a.c, a.cx, a.cy);
    }
    const onUp = () => { down = false; };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);

    // ---- sound ----
    function blip(f, dur, type, vol) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.06, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function playEvents() {
      const ev = events; events = []; if (!cfg.sound) return;
      for (const e of ev) {
        if (e === 'chop') { blip(520 + Math.random() * 80, 0.07, 'square'); setTimeout(() => blip(880, 0.07, 'square', 0.04), 55); }
        else if (e === 'buy') [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => blip(f, 0.12, 'square', 0.06), k * 70));
        else if (e === 'no') blip(120, 0.15, 'sawtooth', 0.05);
      }
    }

    // ---- update ----
    function update(dt) {
      t += dt;
      const [cols, rows] = dims(), gt = growTime();
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const pl = plots[r][c]; pl.p = Math.min(1, pl.p + dt / gt); if (pl.shake > 0) pl.shake -= dt; }
      for (const s of slashes) s.t += dt; slashes = slashes.filter(s => s.t < 0.25);
      for (const b of bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 120 * dt; b.life -= dt; } bits = bits.filter(b => b.life > 0);
      for (const p of pops) { p.y -= 18 * dt; p.life -= dt * 0.9; } pops = pops.filter(p => p.life > 0);
      if (resetArm > 0) resetArm -= dt;
    }

    // ---- drawing (everything on a small offscreen canvas, then scaled up without smoothing) ----
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    function drawCorn(cx, by, p, phase) {
      // cx: centre x, by: bottom y, p: 0..1 growth
      const h = Math.round(7 + p * 34), ripe = p >= 1;
      const sway = cfg.wind ? Math.sin(t * 1.8 + phase) : 0;
      for (let i = 0; i < h; i++) {
        const k = i / 40, dx = Math.round(sway * k * 3);       // upper rows lean with the wind
        R(cx - 1 + dx, by - i, 3, 1, i % 4 === 0 ? '#2f8a22' : '#3fae2e');
      }
      // leaves, alternating sides
      for (let i = 4, s = 0; i < h - 3; i += 5, s++) {
        const dx = Math.round(sway * (i / 40) * 3), side = s % 2 ? 1 : -1, len = Math.min(8, 3 + (i >> 2));
        for (let j = 1; j <= len; j++) R(cx + dx + (side > 0 ? 1 + j : -j - 1), by - i - (j >> 1) + 1, 1, 2, j > 2 ? '#56c93f' : '#3fae2e');
      }
      if (p > 0.55) {                                           // cob
        const ch = Math.round(h * 0.55), dx = Math.round(sway * (ch / 40) * 3), col = ripe ? '#ffd23a' : '#9ccf3a';
        R(cx + 2 + dx, by - ch - 8, 6, 12, '#2f8a22');          // husk
        R(cx + 3 + dx, by - ch - 8, 4, 10, col);
        if (ripe) { R(cx + 4 + dx, by - ch - 7, 1, 2, '#fff2a0'); R(cx + 3 + dx, by - ch - 4, 1, 1, '#e5a800'); R(cx + 5 + dx, by - ch - 2, 1, 1, '#e5a800'); R(cx + 6 + dx, by - ch - 6, 1, 1, '#e5a800'); }
        R(cx + 4 + dx, by - ch + 3, 3, 2, '#2f8a22');
      }
      if (p > 0.8) { const dx = Math.round(sway * 3 * (h / 40)); R(cx - 3 + dx, by - h - 1, 7, 1, '#d8b04a'); R(cx + dx, by - h - 4, 1, 4, '#d8b04a'); R(cx - 2 + dx, by - h - 3, 1, 2, '#d8b04a'); R(cx + 2 + dx, by - h - 3, 1, 2, '#d8b04a'); }
      if (ripe) { const tw = (Math.sin(t * 5 + phase * 3) + 1) / 2; if (tw > 0.85) R(cx + 5, by - h + 6, 1, 1, '#fff'); }
    }
    function sickle(s) {
      const k = s.t / 0.25, a0 = -2.4, a = a0 + k * 3.2, rad = 11;
      for (let i = 0; i <= 10; i++) {
        const aa = a0 + (a - a0) * (i / 10), x = s.x + Math.cos(aa) * rad, y = s.y + Math.sin(aa) * rad;
        R(x, y, i > 7 ? 2 : 1, i > 7 ? 2 : 1, i > 7 ? '#e8eef5' : 'rgba(255,255,255,.6)');
      }
      const hx = s.x + Math.cos(a) * rad, hy = s.y + Math.sin(a) * rad;
      R(hx - 1, hy - 1, 3, 3, '#cfd8e3'); R(hx + (Math.cos(a) > 0 ? 2 : -3), hy + 1, 2, 2, '#8a5a2b');
    }
    function pbtn(x, y, w, h, enabled, maxed) {
      R(x, y, w, h, '#2a1a0c'); R(x + 1, y + 1, w - 2, h - 2, maxed ? '#4a4a4a' : enabled ? '#4fb83a' : '#7a5a34');
      R(x + 1, y + 1, w - 2, 2, maxed ? '#6a6a6a' : enabled ? '#7be25f' : '#9a7a50'); R(x + 1, y + h - 3, w - 2, 2, 'rgba(0,0,0,.3)');
      return { x, y, w, h };
    }
    function scene() {
      // sky bands
      const bands = ['#5cb8ec', '#6cc2f0', '#7dcbf2', '#92d5f4', '#a9defa'], bh = Math.ceil(LH * 0.5 / bands.length);
      bands.forEach((c, i) => R(0, i * bh, LW, bh + 1, c));
      R(LW - 26, 18, 12, 12, '#ffe14d'); R(LW - 28, 20, 16, 8, '#ffe14d'); R(LW - 24, 16, 8, 16, '#ffe14d');
      for (let i = 0; i < 3; i++) {
        const cx = ((t * (3 + i * 1.5) + i * 70) % (LW + 40)) - 20, cy = 36 + i * 22;
        R(cx, cy, 20, 5, '#fff'); R(cx + 4, cy - 3, 12, 4, '#fff'); R(cx + 2, cy + 5, 14, 2, '#dff1fb');
      }
      // hills & ground
      R(0, LH * 0.38, LW, 6, '#4aa13a'); for (let x = 0; x < LW; x += 18) R(x, LH * 0.38 - 4, 12, 4, '#4aa13a');
      R(0, Math.round(LH * 0.38 + 6), LW, LH, '#5fb24a');
      for (let i = 0; i < 40; i++) { const x = (i * 53) % LW, y = LH * 0.4 + ((i * 37) % (LH * 0.6)); R(x, y, 1, 2, '#4ea23c'); R(x + 3, y + 1, 1, 1, '#76c95f'); }
      // field
      const L = layoutField();
      R(L.x0 - 3, L.y0 - 3 + 2, L.cols * TW + 6, L.rows * TH + 5, '#5a3818');
      for (let r = 0; r < L.rows; r++) {
        for (let c = 0; c < L.cols; c++) {
          const px = L.x0 + c * TW, py = L.y0 + r * TH;
          R(px, py + 2, TW, TH - 1, (r + c) % 2 ? '#7d4f28' : '#87552b');
          R(px + 2, py + 5, TW - 4, 1, '#6a4020'); R(px + 2, py + 9, TW - 4, 1, '#6a4020');
        }
        for (let c = 0; c < L.cols; c++) {                       // corn after the tiles of the same row (back to front)
          const pl = plots[r][c], px = L.x0 + c * TW, by = L.y0 + r * TH + TH - 2 + (pl.shake > 0 ? (Math.floor(t * 40) % 2) : 0);
          drawCorn(px + TW / 2 - 1 + (pl.shake > 0 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0), by, pl.p, r * 1.7 + c * 0.9);
        }
      }
      slashes.forEach(sickle);
      bits.forEach(b => R(b.x, b.y, 2, 2, b.col));
      // buttons
      const bw = Math.floor((LW - 12) / 2), bhh = 30, by = LH - bhh - 5;
      const fMax = fieldLvl >= FIELDS.length - 1, gMax = growLvl >= MAX_GROW;
      btnField = pbtn(4, by, bw, bhh, !fMax && coins >= FIELD_COST[fieldLvl], fMax);
      btnGrow = pbtn(LW - 4 - bw, by, bw, bhh, !gMax && coins >= growCost(growLvl), gMax);
      btnReset = { x: LW / 2 - 12, y: by - 14, w: 24, h: 10 };
      R(LW / 2 - 12, by - 14, 24, 10, resetArm > 0 ? '#c0392b' : 'rgba(0,0,0,.35)');
      R(LW / 2 - 22, 5, 44, 15, 'rgba(0,0,0,.35)'); R(LW / 2 - 19, 8, 6, 6, '#ffd23a'); R(LW / 2 - 18, 9, 4, 4, '#e5a800');
    }
    function overlay() {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.imageSmoothingEnabled = false;
      const fs = Math.max(10, u * 4.2), font = '700 ' + fs + 'px "Courier New", ui-monospace, monospace';
      ctx.font = font; ctx.fillStyle = '#fff';
      ctx.textAlign = 'left'; ctx.fillText(String(coins), (LW / 2 - 11) * u, 12.5 * u);
      ctx.textAlign = 'center'; ctx.font = '700 ' + Math.max(8, u * 3) + 'px "Courier New", monospace';
      ctx.fillText(resetArm > 0 ? 'точно?' : 'сброс', (LW / 2) * u, (LH - 35 - 14 + 5.2) * u);
      const L = btnField, G = btnGrow, fMax = fieldLvl >= FIELDS.length - 1, gMax = growLvl >= MAX_GROW, sm = Math.max(8, u * 3.3);
      const lines = (b, a1, a2, a3) => { ctx.fillStyle = '#fff'; ctx.font = '700 ' + sm + 'px "Courier New", monospace'; ctx.fillText(a1, (b.x + b.w / 2) * u, (b.y + 7) * u); ctx.font = '700 ' + sm * 0.9 + 'px "Courier New", monospace'; ctx.fillText(a2, (b.y > 0 ? (b.x + b.w / 2) : 0) * u, (b.y + 15) * u); ctx.fillText(a3, (b.x + b.w / 2) * u, (b.y + 23) * u); };
      const fd = dims(), nx = FIELDS[Math.min(fieldLvl + 1, FIELDS.length - 1)];
      lines(L, 'ПОЛЕ', fd[0] + '×' + fd[1] + (fMax ? '' : ' → ' + nx[0] + '×' + nx[1]), fMax ? 'МАКС' : '● ' + FIELD_COST[fieldLvl]);
      lines(G, 'РОСТ', 'ур. ' + growLvl + ' · +' + valueOf(growLvl) + '/шт', gMax ? 'МАКС' : '● ' + growCost(growLvl));
      ctx.font = '700 ' + fs + 'px "Courier New", monospace';
      for (const p of pops) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = '#fff6a0'; ctx.strokeStyle = '#6a4a00'; ctx.lineWidth = 3; ctx.strokeText('+' + p.v, p.x * u, p.y * u); ctx.fillText('+' + p.v, p.x * u, p.y * u); }
      ctx.globalAlpha = 1;
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      scene();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, LW, LH, 0, 0, LW * u, LH * u);
      overlay();
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      u = Math.max(2, Math.floor(Math.min(W / 125, H / 215)));      // size of one "pixel" in CSS pixels
      LW = Math.ceil(W / u); LH = Math.ceil(H / u);
      off = document.createElement('canvas'); off.width = LW; off.height = LH; g = off.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(ts) {
      if (!on) return;
      const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) { update(dt); playEvents(); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(); raf = requestAnimationFrame(frame);
    }
    resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); },
      debug: { update, get coins() { return coins; }, set coins(v) { coins = v; }, get fieldLvl() { return fieldLvl; }, get growLvl() { return growLvl; }, buy, harvest, plots: () => plots, layout: layoutField }
    };
  }
});
