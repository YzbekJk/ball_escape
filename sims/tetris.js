/* Игра «Тетрис»: классические 7 фигур, следующая фигура, тень, уровни, очки.
   Управление: кнопки на экране (с удержанием) или клавиши ← → ↓, ↑ — поворот, Enter — мгновенно вниз. */
Sims.register({
  id: 'tetris',
  kind: 'game', ownSpace: true,
  title: 'Тетрис',
  desc: 'Классический тетрис: складывайте фигуры в линии. Кнопки на экране или клавиши: A/D — влево/вправо, S — вниз, E — повернуть, Пробел — сбросить фигуру вниз (также стрелки, Enter).',

  defaults: { startLevel: 1, speed: 1, ghost: true, sound: true, music: true, musicStart: 3, volume: 0.7 },
  schema: [
    { k: 'startLevel', l: 'Начальный уровень', min: 1, max: 15, step: 1 },
    { k: 'speed', l: 'Скорость падения ×', min: 0.3, max: 3, step: 0.1, live: 1 },
    { k: 'ghost', l: 'Тень (куда упадёт фигура)', type: 'check', live: 1 },
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'musicStart', l: 'С какой секунды трека начинать', min: 0, max: 60, step: 0.5, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#0b0e1a'; ctx.fillRect(0, 0, w, h);
    const c = Math.floor(h / 11), bw = c * 10, bx = (w - bw) / 2, by = h - c * 10 - 2;
    ctx.fillStyle = '#10152a'; ctx.fillRect(bx, by, bw, c * 10);
    const cols = { I: '#2fd4ff', O: '#ffd23a', T: '#b45cff', S: '#4fe05a', Z: '#ff5a5a', J: '#4a7bff', L: '#ff9a2e' };
    const cells = [['I', 0, 9], ['I', 1, 9], ['I', 2, 9], ['I', 3, 9], ['O', 4, 9], ['O', 5, 9], ['O', 4, 8], ['O', 5, 8], ['L', 6, 9], ['L', 7, 9], ['L', 8, 9], ['L', 8, 8], ['T', 1, 8], ['T', 2, 8], ['T', 3, 8], ['T', 2, 7], ['S', 6, 8], ['S', 7, 8], ['S', 7, 7], ['S', 8, 7],
      ['Z', 4, 3], ['Z', 5, 3], ['Z', 5, 4], ['Z', 6, 4]];
    cells.forEach(q => { ctx.fillStyle = cols[q[0]]; ctx.fillRect(bx + q[1] * c + 1, by + q[2] * c + 1, c - 2, c - 2); });
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const COLS = 10, ROWS = 20;
    const SHAPES = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
    };
    const COLOR = { I: '#2fd4ff', O: '#ffd23a', T: '#b45cff', S: '#4fe05a', Z: '#ff5a5a', J: '#4a7bff', L: '#ff9a2e' };
    const MS = [800, 720, 630, 550, 470, 380, 300, 220, 130, 100, 80, 80, 80, 70, 70, 70, 50, 50, 50, 30];

    let grid, cur, next, bag, score, lines, level, over, dropT, lockT, lockMoves, flash, flashT, t, shake;
    let paused = false, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, events = [];
    let L = null, btns = [], held = {};      // layout, on-screen buttons, pointers currently pressed

    const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
    function refill() { bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5); }
    function take() { if (!bag || !bag.length) refill(); return bag.pop(); }
    function mk(type) { const m = SHAPES[type].map(r => r.slice()); return { t: type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 }; }
    function fits(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) {
        const gx = x + c, gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return false;
        if (gy >= 0 && grid[gy][gx]) return false;
      }
      return true;
    }
    function restart() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      bag = null; score = 0; lines = 0; level = cfg.startLevel; over = false; dropT = 0; lockT = 0; lockMoves = 0; flash = null; flashT = 0; t = 0; shake = 0; events = []; held = {};
      next = take(); spawn();
    }
    function spawn() {
      cur = mk(next); next = take(); dropT = 0; lockT = 0; lockMoves = 0;
      if (!fits(cur.m, cur.x, cur.y)) { over = true; events.push('over'); }
    }
    const grounded = () => !fits(cur.m, cur.x, cur.y + 1);
    function move(dx) {
      if (over || flash || paused) return false;
      if (fits(cur.m, cur.x + dx, cur.y)) { cur.x += dx; if (grounded() && lockMoves < 15) { lockT = 0; lockMoves++; } events.push('move'); return true; }
      return false;
    }
    function rotate() {
      if (over || flash || paused || cur.t === 'O') return;
      const m = rot(cur.m);
      for (const k of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]]) {
        if (fits(m, cur.x + k[0], cur.y + k[1])) { cur.m = m; cur.x += k[0]; cur.y += k[1]; if (grounded() && lockMoves < 15) { lockT = 0; lockMoves++; } events.push('rot'); return; }
      }
    }
    function soft() {
      if (over || flash || paused) return;
      if (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 1; dropT = 0; } else if (lockT === 0) lockT = 0.0001;
    }
    function hard() {
      if (over || flash || paused) return;
      let n = 0; while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; n++; }
      score += 2 * n; shake = 0.12; lock();
    }
    function lock() {
      for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) if (cur.m[r][c]) {
        const gy = cur.y + r, gx = cur.x + c; if (gy < 0) { over = true; events.push('over'); return; } grid[gy][gx] = cur.t;
      }
      events.push('lock');
      const full = []; for (let r = 0; r < ROWS; r++) if (grid[r].every(Boolean)) full.push(r);
      if (full.length) { flash = full; flashT = 0.22; events.push('clear' + full.length); }
      else spawn();
    }
    function finishClear() {
      const n = flash.length; grid = grid.filter((_, r) => !flash.includes(r)); while (grid.length < ROWS) grid.unshift(Array(COLS).fill(null));
      lines += n; score += [0, 100, 300, 500, 800][n] * level; level = cfg.startLevel + Math.floor(lines / 10); flash = null; spawn();
    }
    const interval = () => Math.max(0.02, MS[Math.min(MS.length - 1, level - 1)] / 1000 / cfg.speed);

    function update(dt) {
      t += dt; if (shake > 0) shake -= dt;
      if (over) return;
      if (flash) { flashT -= dt; if (flashT <= 0) finishClear(); return; }
      if (grounded()) { lockT += dt; if (lockT >= 0.5) { lock(); } }
      else { lockT = 0; dropT += dt; while (dropT >= interval() && !grounded()) { dropT -= interval(); cur.y++; } }
    }

    // ---- sound ----
    function blip(f, dur, type, vol, delay) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.04, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function playEvents() {
      const ev = events; events = []; if (!cfg.sound) return;
      let moved = 0;
      for (const e of ev) {
        if (e === 'move') { if (!moved++) blip(300, 0.03, 'square', 0.025); }
        else if (e === 'rot') blip(520, 0.05, 'square', 0.03);
        else if (e === 'lock') blip(120, 0.08, 'triangle', 0.08);
        else if (e.startsWith('clear')) { const n = +e.slice(5); [523, 659, 784, 1047].slice(0, n + 1).forEach((f, k) => blip(f, 0.12, 'square', 0.05, k * 0.07)); }
        else if (e === 'over') [392, 330, 262, 196].forEach((f, k) => blip(f, 0.25, 'sawtooth', 0.05, k * 0.18));
      }
    }

    // ---- soundtrack ----
    const song = new Audio('assets/tetris-track.m4a'); song.preload = 'auto';
    let songOn = false;
    function seekPlay() {
      const go = () => { try { song.currentTime = cfg.musicStart; } catch (e) {} const pr = song.play(); if (pr && pr.catch) pr.catch(() => { songOn = false; }); };
      if (song.readyState >= 1) go(); else { song.addEventListener('loadedmetadata', go, { once: true }); song.load(); }
    }
    function musicTick() {
      if (!cfg.music || paused) { if (songOn) { song.pause(); songOn = false; } return; }
      song.volume = Math.max(0, Math.min(1, cfg.volume));
      if (!songOn) { songOn = true; seekPlay(); return; }
      if (!song.paused && song.currentTime < cfg.musicStart - 0.25) { try { song.currentTime = cfg.musicStart; } catch (e) {} }
      if (song.ended || (song.duration && song.currentTime > song.duration - 0.2)) seekPlay();
    }

    // ---- layout & buttons ----
    function layout() {
      const ctrlH = Math.min(150, Math.max(96, H * 0.17)), top = 62, hud = 72;
      const cell = Math.max(10, Math.floor(Math.min((W - 16) / COLS, (H - top - hud - ctrlH - 10) / ROWS)));
      const bx = Math.round((W - cell * COLS) / 2), by = top + hud;
      L = { cell, bx, by, ctrlY: H - ctrlH, ctrlH, top, hud };
      const gap = 8, bs = Math.min(ctrlH - 18, (W - 6 * gap) / 5), y = H - ctrlH + (ctrlH - bs) / 2, x0 = (W - (bs * 5 + gap * 4)) / 2;
      btns = ['left:◀:1', 'down:▼:1', 'right:▶:1', 'hard:⤓:0', 'rot:↻:0'].map((q, i) => { const p = q.split(':'); return { id: p[0], label: p[1], rep: p[2] === '1', x: x0 + i * (bs + gap), y, w: bs, h: bs }; });
    }
    function act(id) { if (id === 'left') move(-1); else if (id === 'right') move(1); else if (id === 'down') soft(); else if (id === 'hard') hard(); else if (id === 'rot') rotate(); }
    function onDown(e) {
      musicTick();
      if (over) { restart(); return; }
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const b = btns.find(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
      if (b) { act(b.id); if (b.rep) held[e.pointerId] = { id: b.id, t: 0, n: 0 }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); return; }
      // tap on the board: left third / right third move, middle rotates
      if (y < L.ctrlY && y > L.by) { if (x < W * 0.33) move(-1); else if (x > W * 0.67) move(1); else rotate(); }
    }
    const onUp = e => { delete held[e.pointerId]; };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    function repeat(dt) {
      for (const k in held) {
        const h = held[k]; h.t += dt;
        const need = h.n === 0 ? 0.17 : (h.id === 'down' ? 0.04 : 0.055);
        if (h.t >= need) { h.t = 0; h.n++; act(h.id); }
      }
    }
    function onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      const c = e.code, k = c === 'KeyA' ? 'ArrowLeft' : c === 'KeyD' ? 'ArrowRight' : c === 'KeyS' ? 'ArrowDown' : c === 'KeyE' ? 'ArrowUp' : c === 'Space' ? 'Enter' : e.key; let used = true;
      if (over && (k === 'Enter')) { if (!e.repeat) restart(); e.preventDefault(); return; }
      if (k === 'ArrowLeft') move(-1); else if (k === 'ArrowRight') move(1); else if (k === 'ArrowDown') soft();
      else if (k === 'ArrowUp' || k === 'x' || k === 'X') rotate(); else if (k === 'Enter') hard(); else used = false;
      if (used) { e.preventDefault(); musicTick(); }
    }
    addEventListener('keydown', onKey);

    // ---- drawing ----
    function block(x, y, s, col, a) {
      ctx.globalAlpha = a == null ? 1 : a;
      ctx.fillStyle = col; ctx.fillRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, s, Math.max(1, s * 0.14)); ctx.fillRect(x, y, Math.max(1, s * 0.14), s);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y + s - Math.max(1, s * 0.14), s, Math.max(1, s * 0.14)); ctx.fillRect(x + s - Math.max(1, s * 0.14), y, Math.max(1, s * 0.14), s);
      ctx.globalAlpha = 1;
    }
    function mini(type, cx, cy, s) {
      const m = SHAPES[type], w = m[0].length * s, h = m.length * s;
      // trim empty rows for centring
      const rows = m.map((r, i) => r.some(Boolean) ? i : -1).filter(i => i >= 0), r0 = rows[0], r1 = rows[rows.length - 1];
      const hh = (r1 - r0 + 1) * s;
      for (let r = r0; r <= r1; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) block(cx - w / 2 + c * s, cy - hh / 2 + (r - r0) * s, s, COLOR[type]);
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0b0e1a'; ctx.fillRect(0, 0, W, H);
      const { cell, bx, by } = L, sx = shake > 0 ? Math.round(Math.sin(t * 80) * 2) : 0, sy = shake > 0 ? Math.round(Math.cos(t * 70) * 2) : 0;
      // HUD
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const fsS = Math.max(11, Math.min(15, W * 0.034)), fsB = Math.max(18, Math.min(26, W * 0.06));
      ctx.font = '600 ' + fsS + 'px "Courier New", monospace'; ctx.fillStyle = '#7a86a8'; ctx.fillText('ОЧКИ', bx, L.top + 8);
      ctx.fillText('УРОВЕНЬ ' + level + ' · ЛИНИИ ' + lines, bx, L.top + 56);
      ctx.font = '700 ' + fsB + 'px "Courier New", monospace'; ctx.fillStyle = '#fff'; ctx.fillText(String(score), bx, L.top + 32);
      const nx = bx + cell * COLS - cell * 3.2;
      ctx.strokeStyle = '#2a3358'; ctx.lineWidth = 2; ctx.strokeRect(nx - cell * 0.4, L.top + 2, cell * 3.6, 60);
      ctx.textAlign = 'center'; ctx.font = '600 ' + (fsS - 2) + 'px "Courier New", monospace'; ctx.fillStyle = '#7a86a8'; ctx.fillText('ДАЛЕЕ', nx + cell * 1.4, L.top + 11);
      mini(next, nx + cell * 1.4, L.top + 38, Math.max(8, cell * 0.5));
      // board
      ctx.save(); ctx.translate(sx, sy);
      ctx.fillStyle = '#10152a'; ctx.fillRect(bx, by, cell * COLS, cell * ROWS);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let c = 1; c < COLS; c++) { ctx.moveTo(bx + c * cell + 0.5, by); ctx.lineTo(bx + c * cell + 0.5, by + ROWS * cell); }
      for (let r = 1; r < ROWS; r++) { ctx.moveTo(bx, by + r * cell + 0.5); ctx.lineTo(bx + COLS * cell, by + r * cell + 0.5); } ctx.stroke();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) block(bx + c * cell, by + r * cell, cell, COLOR[grid[r][c]]);
      if (flash) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, flashT / 0.22 + 0.3) + ')'; flash.forEach(r => ctx.fillRect(bx, by + r * cell, COLS * cell, cell)); }
      if (!over && !flash && cur) {
        if (cfg.ghost) { let gy = cur.y; while (fits(cur.m, cur.x, gy + 1)) gy++; for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) if (cur.m[r][c] && gy + r >= 0) block(bx + (cur.x + c) * cell, by + (gy + r) * cell, cell, COLOR[cur.t], 0.22); }
        for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) if (cur.m[r][c] && cur.y + r >= 0) block(bx + (cur.x + c) * cell, by + (cur.y + r) * cell, cell, COLOR[cur.t]);
      }
      ctx.strokeStyle = '#3a4678'; ctx.lineWidth = 2; ctx.strokeRect(bx - 1, by - 1, cell * COLS + 2, cell * ROWS + 2);
      ctx.restore();
      // buttons
      for (const b of btns) {
        const pressed = Object.values(held).some(h => h.id === b.id);
        ctx.fillStyle = pressed ? '#3d4a82' : '#1b2240'; ctx.strokeStyle = '#4a5898'; ctx.lineWidth = 2;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 14); else ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e6ebff'; ctx.font = '700 ' + b.h * 0.42 + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 2);
      }
      if (over) {
        ctx.fillStyle = 'rgba(5,7,15,.78)'; ctx.fillRect(bx, by, cell * COLS, cell * ROWS);
        ctx.textAlign = 'center'; ctx.fillStyle = '#ff5a5a'; ctx.font = '800 ' + Math.max(22, cell * 1.3) + 'px "Courier New", monospace'; ctx.fillText('КОНЕЦ ИГРЫ', W / 2, by + cell * 7);
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.max(14, cell * 0.8) + 'px "Courier New", monospace'; ctx.fillText('очки: ' + score, W / 2, by + cell * 9.2); ctx.fillText('линии: ' + lines, W / 2, by + cell * 10.6);
        ctx.fillStyle = '#ffd23a'; ctx.fillText('нажмите, чтобы заново', W / 2, by + cell * 13);
      }
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); layout();
    }
    function frame(ts) {
      if (!on) return;
      const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) { update(dt); repeat(dt); playEvents(); }
      musicTick(); draw(); raf = requestAnimationFrame(frame);
    }
    resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); song.pause(); song.removeAttribute('src'); song.load(); },
      debug: { update, move, rotate, hard, soft, get score() { return score; }, get lines() { return lines; }, get over() { return over; }, get grid() { return grid; }, get cur() { return cur; } }
    };
  }
});
