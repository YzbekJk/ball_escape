/* Игра «Списать у физика» (пиксель-арт): учитель пишет на доске, иногда оборачивается.
   Нажмите «Начать списывать» — шкала растёт, пока учитель не смотрит. Заметил — всё заново. */
Sims.register({
  id: 'physics-class',
  kind: 'game',
  title: 'Списать на физике',
  desc: 'Пара физики. Жмите «Начать списывать» и заполняйте шкалу до 100%, пока препод пишет на доске. Он может обернуться — вовремя перестаньте, иначе всё придётся начинать заново.',

  defaults: {
    fillTime: 25, boardMin: 2.5, boardMax: 6, lookMin: 1.2, lookMax: 2.8, warnTime: 0.7, fakeChance: 0.3,
    sound: true, music: true, musicStart: 12, volume: 0.7
  },
  schema: [
    { k: 'fillTime', l: 'Сколько секунд списывать до 100%', min: 5, max: 90, step: 1, live: 1 },
    { k: 'boardMin', l: 'Препод пишет на доске: минимум, сек', min: 0.5, max: 10, step: 0.5, live: 1 },
    { k: 'boardMax', l: 'Препод пишет на доске: максимум, сек', min: 1, max: 15, step: 0.5, live: 1 },
    { k: 'lookMin', l: 'Смотрит на класс: минимум, сек', min: 0.5, max: 6, step: 0.1, live: 1 },
    { k: 'lookMax', l: 'Смотрит на класс: максимум, сек', min: 0.5, max: 8, step: 0.1, live: 1 },
    { k: 'warnTime', l: 'Предупреждение перед поворотом, сек', min: 0.1, max: 2, step: 0.05, live: 1 },
    { k: 'fakeChance', l: 'Шанс ложной тревоги (не обернётся)', min: 0, max: 0.8, step: 0.05, live: 1 },
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'musicStart', l: 'С какой секунды трека начинать', min: 0, max: 60, step: 0.5, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#d9c9a0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f5d46'; ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.4);
    ctx.fillStyle = '#fff'; ctx.font = '700 ' + h * 0.09 + 'px monospace'; ctx.textAlign = 'center'; ctx.fillText('F = ma', w * 0.5, h * 0.3);
    ctx.fillStyle = '#9a9aa5'; ctx.fillRect(w * 0.44, h * 0.38, w * 0.12, h * 0.1);
    ctx.fillStyle = '#6b6f8a'; ctx.fillRect(w * 0.42, h * 0.48, w * 0.16, h * 0.28);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(w * 0.1, h * 0.82, w * 0.8, h * 0.12);
    ctx.fillStyle = '#222'; ctx.fillRect(w * 0.1, h * 0.04, w * 0.8, h * 0.035);
    ctx.fillStyle = '#4fe05a'; ctx.fillRect(w * 0.1, h * 0.04, w * 0.5, h * 0.035);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const F = 2;
    let W = 0, H = 0, dpr = 1, u = 3, LW = 130, LH = 260, off, g;
    let phase, phaseT, phaseDur, willTurn, copying, pct, t, shake, caughtN, tries, sec, say, sayT, doneTime, events, bubbles;
    let paused = false, last = 0, raf = 0, on = true, btn = null;

    const rnd = (a, b) => a + Math.random() * Math.max(0, b - a);
    function toBoard() { phase = 'board'; phaseT = 0; phaseDur = rnd(cfg.boardMin, Math.max(cfg.boardMin, cfg.boardMax)); }
    function restart() {
      pct = 0; copying = false; t = 0; shake = 0; caughtN = 0; tries = 1; sec = 0; say = ''; sayT = 0; events = []; doneTime = 0;
      toBoard(); phaseDur += 1;
    }
    const danger = () => phase === 'turn' || phase === 'look' || phase === 'back';

    function setPhase(p, dur) { phase = p; phaseT = 0; phaseDur = dur; }
    function update(dt) {
      t += dt; if (sayT > 0) sayT -= dt; if (shake > 0) shake -= dt;
      if (phase === 'won') { return; }
      phaseT += dt;
      if (phase === 'caught') { if (phaseT >= phaseDur) { toBoard(); phaseDur += 1; } return; }
      sec += dt;
      if (phaseT >= phaseDur) {
        if (phase === 'board') { willTurn = Math.random() >= cfg.fakeChance; setPhase('warn', cfg.warnTime); events.push('warn'); }
        else if (phase === 'warn') { if (willTurn) setPhase('turn', 0.25); else { say = 'Хм...'; sayT = 0.7; toBoard(); } }
        else if (phase === 'turn') { setPhase('look', rnd(cfg.lookMin, Math.max(cfg.lookMin, cfg.lookMax))); say = ['Так-так...', 'Тишина в классе!', 'Все пишем сами!'][Math.floor(Math.random() * 3)]; sayT = 1.6; }
        else if (phase === 'look') setPhase('back', 0.25);
        else if (phase === 'back') toBoard();
      }
      if (copying) {
        if (danger()) { caught(); return; }
        pct = Math.min(100, pct + 100 / cfg.fillTime * dt);
        if (pct >= 100) { phase = 'won'; copying = false; doneTime = sec; events.push('win'); for (let i = 0; i < 60; i++) bubbles.push({ x: LW / 2, y: LH * 0.4, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 60, life: 1.6, c: ['#ffd23a', '#4fe05a', '#ff5a5a', '#5ab0ff'][i % 4] }); }
      }
      for (const b of bubbles) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 90 * dt; b.life -= dt; }
      bubbles = bubbles.filter(b => b.life > 0);
    }
    function caught() {
      copying = false; pct = 0; caughtN++; tries++; setPhase('caught', 1.6); shake = 0.5; say = 'Списываешь?! Начинай заново!'; sayT = 1.6; events.push('caught');
    }
    function pressButton() {
      if (phase === 'won') { restart(); return; }
      if (phase === 'caught') return;
      copying = !copying;
      if (copying && danger()) { caught(); }
    }

    // ---- input ----
    function lpt(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / u, y: (e.clientY - r.top) / u }; }
    function onDown(e) { musicTick(); const p = lpt(e); if (btn && p.x >= btn.x && p.x < btn.x + btn.w && p.y >= btn.y && p.y < btn.y + btn.h) pressButton(); }
    canvas.addEventListener('pointerdown', onDown);

    // ---- soundtrack ----
    const song = new Audio('assets/physics-track.m4a'); song.preload = 'auto';
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

    // ---- sfx ----
    function blip(f, dur, type, vol) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.05, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function playEvents() {
      const ev = events; events = []; if (!cfg.sound) return;
      for (const e of ev) {
        if (e === 'warn') { blip(880, 0.1, 'square', 0.06); setTimeout(() => blip(660, 0.12, 'square', 0.06), 110); }
        else if (e === 'caught') { blip(160, 0.35, 'sawtooth', 0.08); setTimeout(() => blip(110, 0.4, 'sawtooth', 0.08), 180); }
        else if (e === 'win') [523, 659, 784, 1047, 1319].forEach((f, k) => setTimeout(() => blip(f, 0.14, 'square', 0.06), k * 90));
      }
    }

    // ---- drawing ----
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * F), Math.round(y * F), Math.max(1, Math.round(w * F)), Math.max(1, Math.round(h * F))); };
    const geo = () => {
      const floorY = Math.round(LH * 0.5), deskY = Math.round(LH * 0.71);
      return { floorY, deskY, bx: 6, by: 36, bw: LW - 12, bh: floorY - 36 - 10, cx: Math.round(LW / 2) };
    };
    function teacher(cx, fy) {
      const front = phase === 'look' || phase === 'caught' || phase === 'won', mid = phase === 'turn' || phase === 'back';
      const writing = phase === 'board', warn = phase === 'warn';
      const bob = writing ? Math.sin(t * 6) : 0;
      // legs & shoes
      R(cx - 7, fy - 16, 6, 14, '#33384f'); R(cx + 1, fy - 16, 6, 14, '#33384f'); R(cx - 8, fy - 3, 7, 3, '#15151c'); R(cx + 1, fy - 3, 7, 3, '#15151c');
      const bw = mid ? 14 : 20;
      R(cx - bw / 2, fy - 38, bw, 23, front ? '#e8e8ee' : '#6b6f8a');                   // jacket (back) / shirt (front)
      if (front) { R(cx - bw / 2, fy - 38, 5, 23, '#6b6f8a'); R(cx + bw / 2 - 5, fy - 38, 5, 23, '#6b6f8a'); R(cx - 1, fy - 37, 3, 14, '#c0392b'); R(cx - 1, fy - 24, 3, 2, '#8a2a20'); }
      else { R(cx - bw / 2, fy - 38, bw, 2, '#555a78'); R(cx, fy - 36, 0.5, 20, '#555a78'); }
      // head
      const hx = cx - 6 + (warn ? Math.round(Math.sin(t * 20)) : 0), hy = fy - 52;
      R(hx, hy, 12, 13, front || mid ? '#f0c9a0' : '#9a9aa5');
      if (!front && !mid) { R(hx - 1, hy - 1, 14, 6, '#8a8a95'); R(hx - 1, hy + 5, 2, 5, '#f0c9a0'); R(hx + 11, hy + 5, 2, 5, '#f0c9a0'); }
      if (front || mid) {
        R(hx - 1, hy - 1, 14, 4, '#9a9aa5'); R(hx - 1, hy + 2, 2, 4, '#9a9aa5'); R(hx + 11, hy + 2, 2, 4, '#9a9aa5');
        const ex = mid ? 1 : 0;
        R(hx + 2 + ex, hy + 5, 3, 3, '#fff'); R(hx + 7 + ex, hy + 5, 3, 3, '#fff'); R(hx + 3 + ex, hy + 6, 1.5, 2, '#222'); R(hx + 8 + ex, hy + 6, 1.5, 2, '#222');
        R(hx + 1 + ex, hy + 4, 5, 0.5, '#222'); R(hx + 6 + ex, hy + 4, 5, 0.5, '#222'); R(hx + 1 + ex, hy + 8, 5, 0.5, '#222'); R(hx + 6 + ex, hy + 8, 5, 0.5, '#222');
        R(hx + 1 + ex, hy + 4, 0.5, 4, '#222'); R(hx + 5.5 + ex, hy + 4, 1, 4, '#222'); R(hx + 10.5 + ex, hy + 4, 0.5, 4, '#222');
        if (phase === 'caught') { R(hx + 2, hy + 3, 4, 1, '#7a1a1a'); R(hx + 6, hy + 2, 4, 1, '#7a1a1a'); R(hx + 4, hy + 10, 5, 2, '#7a1a1a'); }
        else R(hx + 4, hy + 10, 4, 1, '#8a4a3a');
      }
      // arms
      if (writing) { const ay = Math.round(Math.sin(t * 7) * 2); R(cx + bw / 2, fy - 36 - 10 + ay, 4, 14, '#6b6f8a'); R(cx + bw / 2 + 1, fy - 48 + ay, 3, 3, '#f0c9a0'); R(cx + bw / 2, fy - 49 + ay, 2, 1, '#fff'); R(cx - bw / 2 - 4, fy - 36, 4, 16, '#6b6f8a'); }
      else if (phase === 'caught') { R(cx + bw / 2, fy - 50, 4, 16, '#6b6f8a'); R(cx + bw / 2, fy - 53, 4, 4, '#f0c9a0'); R(cx - bw / 2 - 4, fy - 36, 4, 16, '#6b6f8a'); }
      else { R(cx + bw / 2, fy - 36, 4, 16, '#6b6f8a'); R(cx - bw / 2 - 4, fy - 36, 4, 16, '#6b6f8a'); R(cx + bw / 2, fy - 21, 4, 3, '#f0c9a0'); R(cx - bw / 2 - 4, fy - 21, 4, 3, '#f0c9a0'); }
      if (warn) { R(cx - 1, fy - 70, 3, 8, '#ff3b3b'); R(cx - 1, fy - 60, 3, 3, '#ff3b3b'); }
    }
    function head(x, y, o) {                                        // a student at a desk (front view)
      R(x - 7, y + 12, 14, 12, o.shirt); R(x - 6, y, 12, 13, '#f0c9a0'); R(x - 7, y - 2, 14, 5, o.hair); R(x - 7, y + 1, 2, 5, o.hair); R(x + 5, y + 1, 2, 5, o.hair);
      const lx = o.look, ex = Math.round(lx);
      R(x - 4 + ex, y + 5, 3, 3, '#fff'); R(x + 1 + ex, y + 5, 3, 3, '#fff'); R(x - 3 + ex + (lx < 0 ? -1 : lx > 0 ? 1 : 0.5), y + 6, 1.5, 2, '#222'); R(x + 2 + ex + (lx < 0 ? -1 : lx > 0 ? 1 : 0.5), y + 6, 1.5, 2, '#222');
      if (o.worry) { R(x + 6, y + 2, 1, 3, '#7fd0ff'); R(x + 6, y + 6, 1, 1, '#7fd0ff'); R(x - 3, y + 10, 6, 1, '#8a4a3a'); }
      else R(x - 2, y + 10, 4, 1, '#8a4a3a');
    }
    function scene() {
      const G = geo();
      R(0, 0, LW, LH, '#e6d6aa'); R(0, 0, LW, 34, '#cdbb8a'); R(0, G.floorY, LW, LH, '#b88a55');               // wall, ceiling band, floor
      for (let y = G.floorY; y < LH; y += 9) R(0, y, LW, 1, '#a57844');
      // board
      R(G.bx - 2, G.by - 2, G.bw + 4, G.bh + 4, '#6b4423'); R(G.bx, G.by, G.bw, G.bh, '#2c5a44'); R(G.bx, G.by, G.bw, 1, '#3a7058');
      R(G.bx + 3, G.by + G.bh - 3, 12, 2, '#e8e8ee');
      // clock + poster
      
      teacher(G.cx, G.floorY + 14);
      // students' desks
      const nx = Math.round(LW * 0.25), yx = Math.round(LW * 0.72), dy = G.deskY;
      R(0, dy, LW, 22, '#8a5a30'); R(0, dy, LW, 2, '#a8743f'); R(0, dy + 20, LW, 2, '#5e3b1b');
      head(nx, dy - 26, { shirt: '#3a8f5a', hair: '#7a4a20', look: 0 });
      const copyingNow = copying && phase !== 'caught';
      head(yx, dy - 26 + (copyingNow ? 2 : 0), { shirt: '#c0392b', hair: '#1c1c22', look: copyingNow ? -2 : (danger() ? 0 : 0), worry: warn() });
      // paper of the neighbour, and your notebook
      R(nx - 12, dy + 3, 24, 14, '#fff'); R(nx - 12, dy + 3, 24, 1, '#ddd');
      for (let i = 0; i < 4; i++) R(nx - 10, dy + 6 + i * 3, 14 + (i % 2) * 5, 0.5, '#3a5fcf');
      R(nx + 6, dy + 13, 4, 2, '#ffd23a');
      R(yx - 12, dy + 3, 24, 14, '#f7f7ff'); R(yx - 12, dy + 3, 24, 1, '#ddd');
      const filled = Math.round(pct / 100 * 20);
      for (let i = 0; i < 4; i++) R(yx - 10, dy + 6 + i * 3, Math.max(0, Math.min(20, filled - i * 4)) * 1, 0.5, '#2a2a8a');
      if (copyingNow) {                                           // eyes dotted line to the neighbour's sheet + pencil jiggle
        for (let i = 0; i < 6; i++) R(yx - 5 - i * 5.5, dy - 12 + i * 2.6, 1, 1, 'rgba(255,255,255,.8)');
        R(yx + 6 + Math.round(Math.sin(t * 25) * 1.5), dy + 11, 4, 2, '#ffd23a');
      }
      // progress bar
      R(5, 20, LW - 10, 12, '#1b1b22'); R(6, 21, LW - 12, 10, '#3a3a46'); R(6, 21, Math.round((LW - 12) * pct / 100), 10, pct >= 100 ? '#ffd23a' : '#4fe05a'); R(6, 21, Math.round((LW - 12) * pct / 100), 2, 'rgba(255,255,255,.35)');
      // button
      const bh = 26, by = LH - bh - 6, bx = 6, bw = LW - 12, active = copying;
      R(bx, by, bw, bh, '#1b1b22'); R(bx + 1, by + 1, bw - 2, bh - 2, phase === 'won' ? '#ffb02e' : active ? '#d64545' : '#4fb83a'); R(bx + 1, by + 1, bw - 2, 2, 'rgba(255,255,255,.35)'); R(bx + 1, by + bh - 3, bw - 2, 2, 'rgba(0,0,0,.25)');
      btn = { x: bx, y: by, w: bw, h: bh };
      for (const b of bubbles) R(b.x, b.y, 2, 2, b.c);
    }
    const warn = () => phase === 'warn';
    function overlay() {
      const G = geo(), fs = Math.max(9, u * 3.4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // formulas on the board (chalk)
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '700 ' + u * 4 + 'px "Courier New", monospace';
      const bw = G.bw, bx = G.bx;
      ctx.fillText('F = ma', (bx + bw * 0.28) * u, (G.by + 9) * u);
      ctx.fillText('E = mc²', (bx + bw * 0.74) * u, (G.by + 14) * u);
      ctx.font = '700 ' + u * 3.2 + 'px "Courier New", monospace';
      ctx.fillText('v = v₀ + at', (bx + bw * 0.3) * u, (G.by + 24) * u);
      ctx.fillText('U = IR', (bx + bw * 0.78) * u, (G.by + 29) * u);
      ctx.fillText('p = mv', (bx + bw * 0.25) * u, (G.by + 38) * u);
      // progress text
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.font = '700 ' + fs + 'px "Courier New", monospace';
      const ptxt = Math.floor(pct) + '%'; ctx.strokeText(ptxt, LW / 2 * u, 26 * u); ctx.fillText(ptxt, LW / 2 * u, 26 * u);
      // button label
      const label = phase === 'won' ? 'ЕЩЁ РАЗ' : copying ? 'ПЕРЕСТАТЬ' : 'НАЧАТЬ СПИСЫВАТЬ';
      ctx.font = '700 ' + Math.max(11, u * 4.4) + 'px "Courier New", monospace'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
      ctx.strokeText(label, (btn.x + btn.w / 2) * u, (btn.y + btn.h / 2 + 0.5) * u); ctx.fillText(label, (btn.x + btn.w / 2) * u, (btn.y + btn.h / 2 + 0.5) * u);
      // speech
      if (sayT > 0 && say) {
        ctx.font = '700 ' + Math.max(10, u * 3.6) + 'px "Courier New", monospace';
        const tw = ctx.measureText(say).width + u * 6, bxx = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, G.cx * u)), byy = (G.floorY - 66) * u;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.fillRect(bxx - tw / 2, byy - u * 4, tw, u * 8); ctx.strokeRect(bxx - tw / 2, byy - u * 4, tw, u * 8);
        ctx.fillStyle = phase === 'caught' ? '#c0392b' : '#111'; ctx.fillText(say, bxx, byy + 1);
      }
      if (phase === 'caught') { ctx.fillStyle = '#ff4040'; ctx.strokeStyle = '#300'; ctx.lineWidth = 4; ctx.font = '800 ' + u * 9 + 'px "Courier New", monospace'; ctx.strokeText('ЗАМЕТИЛ!', W / 2, G.deskY * u - u * 40); ctx.fillText('ЗАМЕТИЛ!', W / 2, G.deskY * u - u * 40); }
      if (phase === 'won') { ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#4a3200'; ctx.lineWidth = 4; ctx.font = '800 ' + u * 8 + 'px "Courier New", monospace'; ctx.strokeText('СПИСАЛ!', W / 2, G.deskY * u - u * 44); ctx.fillText('СПИСАЛ!', W / 2, G.deskY * u - u * 44);
        ctx.font = '700 ' + u * 3.6 + 'px "Courier New", monospace'; ctx.fillStyle = '#fff'; ctx.strokeText('попыток: ' + (tries) + ' · время: ' + Math.round(doneTime) + ' с', W / 2, G.deskY * u - u * 33); ctx.fillText('попыток: ' + (tries) + ' · время: ' + Math.round(doneTime) + ' с', W / 2, G.deskY * u - u * 33); }
      else if (phase !== 'caught') { ctx.font = '700 ' + Math.max(9, u * 3) + 'px "Courier New", monospace'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText('попытка ' + tries + ' · замечен: ' + caughtN, W / 2, G.deskY * u - u * 36); }
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene();
      ctx.imageSmoothingEnabled = false;
      const sx = shake > 0 ? Math.round(Math.sin(t * 90) * u) : 0;
      ctx.drawImage(off, 0, 0, LW * F, LH * F, sx, 0, LW * u, LH * u);
      if (phase === 'caught') { ctx.fillStyle = 'rgba(255,0,0,.18)'; ctx.fillRect(0, 0, W, H); }
      overlay();
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      u = Math.max(2, Math.floor(Math.min(W / 125, H / 215)));
      LW = Math.ceil(W / u); LH = Math.ceil(H / u);
      off = document.createElement('canvas'); off.width = LW * F; off.height = LH * F; g = off.getContext('2d');
    }
    function frame(ts) {
      if (!on) return;
      const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) { update(dt); playEvents(); }
      musicTick(); draw(); raf = requestAnimationFrame(frame);
    }
    bubbles = []; resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart() { bubbles = []; restart(); }, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); song.pause(); song.removeAttribute('src'); song.load(); },
      debug: { update, press: pressButton, get phase() { return phase; }, get pct() { return pct; }, get copying() { return copying; }, get caughtN() { return caughtN; }, set phaseNow(v) { phase = v; phaseT = 0; phaseDur = 5; } }
    };
  }
});
