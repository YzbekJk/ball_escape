/* «Симулятор моржа» — секретная игра из меню с флагом. Морж живёт на льдине: ныряет за моллюсками, ест, греется, спит,
   точит бивни и отпугивает белых медведей. Чем больше ест — тем тяжелее (вес — главный счёт). Прогресс сохраняется. */
Sims.register({
  id: 'walrus',
  kind: 'game',
  secret: true,
  hub: 'ph',
  ownSpace: true,
  title: 'Симулятор моржа',
  desc: 'Живите как морж: ныряйте за моллюсками, ешьте, грейтесь, точите бивни и прогоняйте белых медведей. Набирайте вес!',
  defaults: { sound: true },
  schema: [{ k: 'sound', l: 'Звуки', type: 'check', live: 1 }],

  preview(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#16345a'); g.addColorStop(0.55, '#7fc4e8'); g.addColorStop(0.56, '#0e4a78'); g.addColorStop(1, '#06213d'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eef8ff'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.62, w * 0.36, h * 0.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.5, w * 0.17, h * 0.13, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.64, h * 0.47, h * 0.1, 0, 7); ctx.fill(); ctx.fillStyle = '#c89a70'; ctx.beginPath(); ctx.ellipse(w * 0.69, h * 0.52, h * 0.07, h * 0.055, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(w * 0.675, h * 0.55, w * 0.012, h * 0.1); ctx.fillRect(w * 0.7, h * 0.55, w * 0.012, h * 0.1);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w * 0.655, h * 0.44, h * 0.014, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const DW = 360, DH = 640, KEY = 'walrus_v1', BKEY = 'walrus_best';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
    const FONT = 'system-ui, sans-serif';
    let W = 0, H = 0, dpr = 1, on = true, paused = false, raf = 0, last = 0, t = 0;
    let S, mode = 'ice', toast = '', toastT = 0, best = 0;
    let dive = null, bear = null, sleepT = 0, bearT = 0, saveT = 0, roarFx = 0, stormT = 0, bubbles = [], tgt = null, hk = { l: 0, r: 0, u: 0, d: 0 }, floats = [];

    function fresh() { return { kg: 800, stock: 0, tusk: 0, hunger: 80, warm: 80, day: 1, dives: 0, bears: 0, clock: 0 }; }
    function load() { try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && o.kg) return Object.assign(fresh(), o); } catch (e) { } return fresh(); }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); if (S.kg > best) { best = Math.round(S.kg); localStorage.setItem(BKEY, best); } } catch (e) { } }
    try { best = +localStorage.getItem(BKEY) || 0; } catch (e) { }

    function blip(f, dur, type, vol, slide) {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.05, now + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur); o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    const say = s => { toast = s; toastT = 2.4; };
    const fl = (s, x, y, c) => floats.push({ s, x, y, c: c || '#fff', t: 1.2 });
    const tuskCost = () => 4 + S.tusk * 3;
    const needTaps = () => Math.max(6, 14 - S.tusk);

    function restart() { S = fresh(); mode = 'ice'; dive = null; bear = null; sleepT = 0; bearT = rnd(30, 50); floats = []; save(); say('Морж вылез на льдину. Вес 800 кг'); }

    /* ---------- действия ---------- */
    function startDive() {
      if (mode !== 'ice' || sleepT > 0 || bear) return;
      S.dives++; const o2 = 22 + Math.min(10, (S.kg - 800) / 150);
      dive = { x: DW / 2, y: 110, o2, o2max: o2, catch: 0, clams: [], fish: [], orcas: [], hurt: 0, t: 0 };
      for (let i = 0; i < 9; i++) dive.clams.push({ x: 24 + Math.random() * (DW - 48), y: rnd(520, 575), got: false });
      for (let i = 0; i < 6; i++) dive.fish.push({ x: Math.random() * DW, y: rnd(190, 470), vx: rnd(25, 55) * (Math.random() < 0.5 ? -1 : 1), got: false });
      const no = 1 + Math.floor(S.dives / 4) % 3; for (let i = 0; i < no; i++) dive.orcas.push({ x: Math.random() * DW, y: rnd(260, 480), vx: rnd(45, 75) * (i % 2 ? -1 : 1) });
      tgt = null; mode = 'dive'; blip(300, 0.3, 'sine', 0.06, 120);
    }
    function endDive(ok, why) {
      const c = dive.catch; let got = ok ? c : Math.floor(c / 2); S.stock += got; mode = 'ice'; dive = null; tgt = null;
      say(why + (got ? ' Принёс моллюсков: ' + got : ' Улов пуст.')); blip(520, 0.2, 'triangle', 0.05, 780); save();
    }
    function eat() {
      if (mode !== 'ice' || sleepT > 0) return; if (S.stock < 1) { say('Нет моллюсков — нырните!'); return; }
      S.stock--; S.hunger = Math.min(100, S.hunger + 30); const g = 5 + Math.floor(S.tusk / 2); S.kg += g; fl('+' + g + ' кг', DW / 2, 330, '#ffd24a'); blip(260, 0.12, 'square', 0.04, 180);
    }
    function sleep() { if (mode !== 'ice' || sleepT > 0 || bear) return; sleepT = 4; }
    function sharpen() {
      if (mode !== 'ice' || sleepT > 0) return; const c = tuskCost(); if (S.tusk >= 8) { say('Бивни уже огромные!'); return; } if (S.stock < c) { say('Нужно моллюсков: ' + c); return; }
      S.stock -= c; S.tusk++; say('Бивни острее! Уровень ' + S.tusk); blip(700, 0.25, 'triangle', 0.05, 1200); save();
    }
    function roar() {
      if (mode !== 'ice' || !bear) return; bear.taps++; roarFx = 0.35; blip(110 + Math.random() * 30, 0.3, 'sawtooth', 0.06, 70);
      if (bear.taps >= needTaps()) { bear.fled = true; S.kg += 10; S.bears++; say('Медведь убежал! +10 кг'); blip(660, 0.3, 'triangle', 0.06, 990); }
    }

    /* ---------- обновление ---------- */
    function update(dt) {
      t += dt; toastT = Math.max(0, toastT - dt); roarFx = Math.max(0, roarFx - dt); floats.forEach(f => { f.t -= dt; f.y -= 24 * dt; }); floats = floats.filter(f => f.t > 0);
      if (mode === 'over') return;
      if (mode === 'dive') { diveUpdate(dt); return; }
      S.clock += dt; if (S.clock >= 60) { S.clock = 0; S.day++; say('День ' + S.day); }
      S.hunger = Math.max(0, S.hunger - dt * 0.5); S.warm = Math.max(0, S.warm - dt * (stormT > 0 ? 0.9 : 0.3)); stormT = Math.max(0, stormT - dt);
      if (sleepT > 0) { sleepT -= dt; S.warm = Math.min(100, S.warm + dt * 9); S.hunger = Math.max(0, S.hunger - dt * 1); if (sleepT <= 0) { say('Морж выспался и согрелся'); save(); } }
      if (S.hunger <= 0) S.kg -= dt * 1.6; if (S.warm <= 0) S.kg -= dt * 1;
      if (S.kg < 400) { mode = 'over'; save(); return; }
      if (Math.random() < dt / 90 && stormT <= 0 && !bear) { stormT = 14; say('Метель! Мёрзнем быстрее'); }
      if (!bear) { bearT -= dt; if (bearT <= 0) { bear = { x: Math.random() < 0.5 ? -50 : DW + 50, taps: 0, fled: false, grab: 0 }; bear.dir = bear.x < 0 ? 1 : -1; sleepT = Math.min(sleepT, 0); say('Белый медведь! Рычите!'); blip(90, 0.5, 'sawtooth', 0.05, 60); } }
      else {
        if (bear.fled) { bear.x -= bear.dir * 140 * dt; if (bear.x < -80 || bear.x > DW + 80) { bear = null; bearT = rnd(35, 60); } }
        else { bear.x += bear.dir * (150 / 9) * dt * 1.0; if ((bear.dir > 0 && bear.x > DW * 0.32) || (bear.dir < 0 && bear.x < DW * 0.68)) { const lose = Math.floor(S.stock / 2); S.stock -= lose; S.kg -= 25; say('Медведь украл ' + lose + ' моллюсков и укусил (−25 кг)'); blip(120, 0.5, 'sawtooth', 0.07, 40); bear.fled = true; S.bears += 0; } }
      }
      saveT += dt; if (saveT > 5) { saveT = 0; save(); }
    }
    function diveUpdate(dt) {
      const d = dive; d.t += dt; d.o2 -= dt; d.hurt = Math.max(0, d.hurt - dt);
      let dx = hk.r - hk.l, dy = hk.d - hk.u; const sp = 150 + Math.min(40, S.tusk * 4);
      if (tgt) { const vx = tgt.x - d.x, vy = tgt.y - d.y, l = Math.hypot(vx, vy); if (l > 6) { dx = vx / l; dy = vy / l; } }
      d.x = clamp(d.x + dx * sp * dt, 18, DW - 18); d.y = clamp(d.y + dy * sp * dt, 100, 590); if (dx) d.face = dx > 0 ? 1 : -1;
      if (Math.random() < dt * 4) bubbles.push({ x: d.x + (d.face || 1) * 22, y: d.y - 6, r: rnd(2, 4), v: rnd(20, 40) });
      bubbles.forEach(b => { b.y -= b.v * dt; }); bubbles = bubbles.filter(b => b.y > 96);
      const cr = 14 + S.tusk * 2;
      d.clams.forEach(c => { if (!c.got && Math.hypot(c.x - d.x, c.y - d.y) < cr + 12) { c.got = true; d.catch++; fl('+1', c.x, c.y - 10, '#ffe08a'); blip(600 + d.catch * 40, 0.1, 'triangle', 0.05, 900); } });
      d.fish.forEach(f => { f.x += f.vx * dt; if (f.x < -20) f.x = DW + 20; if (f.x > DW + 20) f.x = -20; if (!f.got && Math.hypot(f.x - d.x, f.y - d.y) < 24) { f.got = true; d.catch += 2; fl('+2', f.x, f.y - 10, '#9ff'); blip(760, 0.1, 'triangle', 0.05, 1100); } });
      d.orcas.forEach(o => { o.x += o.vx * dt; if (o.x < -50 || o.x > DW + 50) o.vx = -o.vx; if (d.hurt <= 0 && Math.hypot((o.x - d.x) * 0.6, o.y - d.y) < 28) { d.hurt = 1.5; S.kg -= 12; d.catch = Math.floor(d.catch / 2); fl('−12 кг', d.x, d.y, '#ff7a7a'); blip(100, 0.4, 'sawtooth', 0.07, 40); } });
      if (d.y <= 104 && d.t > 1) { endDive(true, 'Морж вынырнул!'); return; }
      if (d.o2 <= 0) endDive(false, 'Воздух кончился!');
      if (S.kg < 400) { mode = 'over'; dive = null; save(); }
    }

    /* ---------- ввод ---------- */
    function uiT() { const s = Math.min(canvas.width / DW, canvas.height / DH); return { s, ox: (canvas.width - DW * s) / 2, oy: (canvas.height - DH * s) / 2 }; }
    function uiXY(e) { const r = canvas.getBoundingClientRect(), T = uiT(), px = (e.clientX - r.left) * canvas.width / r.width, py = (e.clientY - r.top) * canvas.height / r.height; return { x: (px - T.ox) / T.s, y: (py - T.oy) / T.s }; }
    const hit = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    const BTN = [{ n: 'НЫРНУТЬ', f: startDive }, { n: 'СЪЕСТЬ', f: eat }, { n: 'СПАТЬ', f: sleep }, { n: 'БИВНИ', f: sharpen }];
    function onDown(e) {
      const p = uiXY(e);
      if (mode === 'over') { restart(); return; }
      if (mode === 'dive') { tgt = { x: p.x, y: p.y }; return; }
      if (bear && !bear.fled && (hit(p, 40, 490, 280, 56) || hit(p, 80, 300, 200, 120))) { roar(); return; }
      for (let i = 0; i < 4; i++) if (hit(p, 12 + i * 86, 566, 78, 50)) { BTN[i].f(); return; }
    }
    function onMove(e) { if (mode === 'dive' && e.buttons !== 0) { const p = uiXY(e); tgt = { x: p.x, y: p.y }; } }
    function onUp() { if (mode === 'dive') tgt = null; }
    function onKey(e) {
      const d = e.type === 'keydown' ? 1 : 0, c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') hk.l = d; else if (c === 'ArrowRight' || c === 'KeyD') hk.r = d; else if (c === 'ArrowUp' || c === 'KeyW') hk.u = d; else if (c === 'ArrowDown' || c === 'KeyS') hk.d = d;
      if (/Arrow|Space/.test(c) && e.preventDefault) e.preventDefault();
      if (!d || e.repeat) return; if (mode === 'over') { restart(); return; }
      if (mode === 'ice') { if (c === 'Digit1') startDive(); else if (c === 'Digit2') eat(); else if (c === 'Digit3') sleep(); else if (c === 'Digit4') sharpen(); else if (c === 'Space' || c === 'Enter') roar(); }
    }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);

    /* ---------- рисование ---------- */
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function txt(s, x, y, size, col, al) { ctx.font = '800 ' + size + 'px ' + FONT; ctx.textAlign = al || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
    function walrus(x, y, sc, face, tusk, mood) {
      ctx.save(); ctx.translate(x, y); ctx.scale(sc * face, sc);
      ctx.fillStyle = '#7a4a2e'; ctx.beginPath(); ctx.moveTo(-42, 20); ctx.lineTo(-62, 8); ctx.lineTo(-56, 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.ellipse(0, 0, 48, 27, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#a87650'; ctx.beginPath(); ctx.ellipse(2, 8, 38, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a3e24'; ctx.beginPath(); ctx.ellipse(8, 18, 15, 7, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.arc(38, -4, 19, 0, 7); ctx.fill();
      ctx.fillStyle = '#c89a70'; ctx.beginPath(); ctx.ellipse(52, 5, 14, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5a3320'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(46 + (i % 3) * 5, 2 + Math.floor(i / 3) * 5, 1.2, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(60, 2); ctx.lineTo(74, -2); ctx.moveTo(60, 6); ctx.lineTo(74, 8); ctx.moveTo(58, 9); ctx.lineTo(70, 16); ctx.stroke();
      const tl = 9 + tusk * 3.2; ctx.fillStyle = '#fffbe8'; ctx.strokeStyle = '#d8d0b0'; ctx.lineWidth = 1; [47, 55].forEach(tx => { ctx.beginPath(); ctx.moveTo(tx - 2.5, 12); ctx.lineTo(tx + 2.5, 12); ctx.lineTo(tx + 0.5, 12 + tl); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = '#111'; ctx.beginPath(); if (mood === 'sleep') { ctx.fillRect(38, -10, 8, 2); } else ctx.arc(42, -10, 2.6, 0, 7); ctx.fill();
      ctx.restore();
    }
    function bearDraw(x, y, dir, fled) {
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.fillStyle = '#f4f4ee'; ctx.strokeStyle = '#cfcfc4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 18, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(34, -8, 13, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(46, -4, 8, 6, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(30, -20, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(52, -5, 2.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(36, -11, 1.8, 0, 7); ctx.fill();
      const l = Math.sin(t * 9) * 5; ctx.fillStyle = '#e4e4da'; ctx.fillRect(-24 + l, 10, 9, 16); ctx.fillRect(-4 - l, 10, 9, 16); ctx.fillRect(16 + l, 10, 9, 16); ctx.restore();
    }
    function drawIce() {
      const g = ctx.createLinearGradient(0, 0, 0, 380); g.addColorStop(0, S.hunger < 25 || stormT > 0 ? '#3a4a66' : '#0d2a52'); g.addColorStop(1, stormT > 0 ? '#9aa8bc' : '#9ad4f0'); ctx.fillStyle = g; ctx.fillRect(0, 0, DW, 400);
      ctx.globalAlpha = 0.2; for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#4aff9a', '#4ab8ff', '#b04aff'][i]; ctx.beginPath(); ctx.moveTo(0, 60 + i * 25); for (let x = 0; x <= DW; x += 20) ctx.lineTo(x, 60 + i * 25 + Math.sin(x / 50 + t * 0.7 + i) * 14); ctx.lineTo(DW, 40 + i * 25); ctx.lineTo(0, 40 + i * 25); ctx.fill(); } ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; for (let i = 0; i < 24; i++) { const x = (i * 97 + t * 8) % DW, y = (i * 53) % 150; ctx.globalAlpha = 0.5; ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
      const sea = ctx.createLinearGradient(0, 300, 0, 640); sea.addColorStop(0, '#1a6a9a'); sea.addColorStop(1, '#06213d'); ctx.fillStyle = sea; ctx.fillRect(0, 300, DW, 340);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); for (let x = 0; x <= DW; x += 12) ctx.lineTo(x, 316 + k * 14 + Math.sin(x / 30 + t * 1.5 + k) * 3); ctx.stroke(); }
      ctx.fillStyle = '#f4fbff'; ctx.beginPath(); ctx.moveTo(10, 358); ctx.quadraticCurveTo(40, 300, 120, 306); ctx.lineTo(250, 304); ctx.quadraticCurveTo(330, 296, 352, 356); ctx.quadraticCurveTo(300, 392, 180, 388); ctx.quadraticCurveTo(60, 392, 10, 358); ctx.fill();
      ctx.fillStyle = '#c8e4f4'; ctx.beginPath(); ctx.moveTo(10, 358); ctx.quadraticCurveTo(60, 392, 180, 388); ctx.quadraticCurveTo(300, 392, 352, 356); ctx.quadraticCurveTo(300, 372, 180, 370); ctx.quadraticCurveTo(60, 372, 10, 358); ctx.fill();
      const fr = Math.min(4, Math.floor((S.kg - 800) / 350)); for (let i = 0; i < fr; i++) walrus(60 + i * 62, 332 - (i % 2) * 10, 0.38, i % 2 ? -1 : 1, 2 + i, 'sleep');
      const sc = 0.9 + clamp((S.kg - 800) / 4000, 0, 0.45), br = 1 + Math.sin(t * 2) * 0.02;
      walrus(190, 330 + (sleepT > 0 ? 6 : 0), sc * br, 1, S.tusk, sleepT > 0 ? 'sleep' : '');
      if (sleepT > 0) for (let i = 0; i < 3; i++) txt('z', 262 + i * 14 + Math.sin(t * 2 + i) * 3, 284 - i * 16 - (t * 8 % 10), 16 + i * 4, 'rgba(255,255,255,.85)');
      if (roarFx > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + roarFx * 2 + ')'; ctx.lineWidth = 3; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(255, 335, i * 22 * (1.2 - roarFx), -0.7, 0.7); ctx.stroke(); } }
      if (stormT > 0) { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 70; i++) { const x = (i * 41 + t * 160) % (DW + 40) - 20, y = (i * 29 + t * 90) % 400; ctx.fillRect(x, y, 2, 2); } }
      if (bear) bearDraw(bear.x, 318, bear.dir, bear.fled);
      if (bear && !bear.fled) {
        const pr = bear.taps / needTaps(); ctx.fillStyle = '#d83a3a'; rr(40, 490, 280, 56, 14); ctx.fill(); txt('РЕВЕТЬ!  ' + bear.taps + ' / ' + needTaps(), 180, 518, 22, '#fff', 'center');
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(40, 550, 280, 6); ctx.fillStyle = '#ffd24a'; ctx.fillRect(40, 550, 280 * pr, 6);
        const dist = bear.dir > 0 ? (DW * 0.32 - bear.x) / (DW * 0.32 + 50) : (bear.x - DW * 0.68) / (DW * 0.32 + 50); ctx.fillStyle = '#fff'; txt('Медведь близко!', 180, 410, 16, dist < 0.35 ? '#ff7a7a' : '#fff', 'center');
      }
      const bar = (x, y, w, v, col, lab) => { ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(x, y, w, 12, 6); ctx.fill(); ctx.fillStyle = col; if (v > 0) { rr(x, y, w * v / 100, 12, 6); ctx.fill(); } txt(lab, x, y - 9, 11, 'rgba(255,255,255,.85)'); };
      bar(14, 424, 160, S.hunger, S.hunger < 25 ? '#ff5a5a' : '#ffb04a', 'СЫТОСТЬ'); bar(186, 424, 160, S.warm, S.warm < 25 ? '#ff5a5a' : '#5ad8ff', 'ТЕПЛО');
      txt('Вес: ' + Math.round(S.kg) + ' кг', 14, 468, 20, '#fff'); txt('рекорд ' + Math.max(best, Math.round(S.kg)), 346, 468, 12, 'rgba(255,255,255,.6)', 'right');
      txt('🐚 ' + S.stock, 14, 496, 18, '#ffe08a'); txt('Бивни ур. ' + S.tusk + '/8', 346, 496, 14, '#fffbe8', 'right'); txt('День ' + S.day, 180, 496, 14, 'rgba(255,255,255,.7)', 'center');
      BTN.forEach((b, i) => { const x = 12 + i * 86, dis = (i === 3 && S.tusk >= 8); ctx.fillStyle = i === 0 ? '#ff8a1c' : 'rgba(255,255,255,.12)'; rr(x, 566, 78, 50, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke(); txt(b.n, x + 39, 586, 12, dis ? '#888' : '#fff', 'center'); txt(i === 1 ? 'x' + S.stock : i === 3 ? (S.tusk >= 8 ? 'макс' : '🐚' + tuskCost()) : i === 0 ? 'за едой' : '4 сек', x + 39, 604, 11, 'rgba(255,255,255,.7)', 'center'); });
    }
    function drawDive() {
      const d = dive, g = ctx.createLinearGradient(0, 90, 0, DH); g.addColorStop(0, '#2a8ac0'); g.addColorStop(1, '#031428'); ctx.fillStyle = '#9ad4f0'; ctx.fillRect(0, 0, DW, 92); ctx.fillStyle = g; ctx.fillRect(0, 90, DW, DH);
      ctx.fillStyle = '#f4fbff'; ctx.fillRect(0, 84, DW, 12); ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(40 + i * 90, 96); ctx.lineTo(70 + i * 90, 96); ctx.lineTo(110 + i * 90, 600); ctx.lineTo(60 + i * 90, 600); ctx.fill(); }
      ctx.fillStyle = '#0c2a40'; ctx.beginPath(); ctx.moveTo(0, DH); for (let x = 0; x <= DW; x += 20) ctx.lineTo(x, 596 + Math.sin(x / 40) * 8); ctx.lineTo(DW, DH); ctx.fill();
      ctx.strokeStyle = '#2fb86a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const x = 20 + i * 48; ctx.beginPath(); ctx.moveTo(x, 600); ctx.quadraticCurveTo(x + Math.sin(t * 1.4 + i) * 10, 570, x + Math.sin(t * 1.4 + i + 1) * 14, 540); ctx.stroke(); }
      d.clams.forEach(c => { if (c.got) return; ctx.fillStyle = '#e8c8a0'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 11, 8, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#b88a60'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 11, 4, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x + 2, c.y - 1, 2, 0, 7); ctx.fill(); });
      d.fish.forEach(f => { if (f.got) return; const s = Math.sign(f.vx); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 11, 5.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(f.x - s * 10, f.y); ctx.lineTo(f.x - s * 18, f.y - 6); ctx.lineTo(f.x - s * 18, f.y + 6); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(f.x + s * 6, f.y - 1, 1.3, 0, 7); ctx.fill(); });
      d.orcas.forEach(o => { const s = Math.sign(o.vx); ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s, 1); ctx.fillStyle = '#0a0a12'; ctx.beginPath(); ctx.ellipse(0, 0, 36, 14, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(4, -26); ctx.lineTo(12, -10); ctx.fill(); ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-48, -12); ctx.lineTo(-46, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(18, -4, 7, 3.5, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(2, 9, 18, 4, 0, 0, 7); ctx.fill(); ctx.restore(); });
      bubbles.forEach(b => { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke(); });
      if (!(d.hurt > 0 && Math.floor(t * 14) % 2)) walrus(d.x, d.y, 0.5, d.face || 1, S.tusk);
      txt('Воздух', 14, 24, 12, '#06213d'); ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(14, 34, 200, 14, 7); ctx.fill(); const o = d.o2 / d.o2max; ctx.fillStyle = o < 0.3 ? '#ff5a5a' : '#5ad8ff'; rr(14, 34, Math.max(0, 200 * o), 14, 7); ctx.fill();
      txt('🐚 ' + d.catch, 346, 38, 20, '#06213d', 'right'); txt('Вынырните наверх, чтобы забрать улов!', 180, 70, 12, '#06213d', 'center');
      if (d.t < 5) { txt('Ведите пальцем или стрелками', 180, 130, 13, 'rgba(255,255,255,.9)', 'center'); txt('Моллюски +1, рыбы +2. Косатки опасны!', 180, 150, 13, 'rgba(255,255,255,.9)', 'center'); }
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#06101e'; ctx.fillRect(0, 0, canvas.width, canvas.height); const T = uiT(); ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, DW, DH); ctx.clip();
      if (mode === 'dive') drawDive(); else drawIce();
      floats.forEach(f => { ctx.globalAlpha = Math.min(1, f.t); txt(f.s, f.x, f.y, 18, f.c, 'center'); ctx.globalAlpha = 1; });
      if (toastT > 0) { ctx.globalAlpha = Math.min(1, toastT); ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(20, 118, 320, 34, 17); ctx.fill(); txt(toast, 180, 135, 13, '#fff', 'center'); ctx.globalAlpha = 1; }
      if (mode === 'over') { ctx.fillStyle = 'rgba(4,8,20,.75)'; ctx.fillRect(0, 0, DW, DH); txt('Морж истощён', 180, 250, 32, '#ff8a7a', 'center'); txt('Вес упал ниже 400 кг', 180, 292, 16, '#fff', 'center'); txt('Дней прожито: ' + S.day + ' · рекорд ' + best + ' кг', 180, 322, 14, '#d9c2ee', 'center'); txt('Нажмите, чтобы начать заново', 180, 370, 15, '#ffd24a', 'center'); }
      ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    function frame(ts) { if (!on) return; const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts; if (!paused) update(dt); draw(); raf = requestAnimationFrame(frame); }
    S = load(); bearT = rnd(30, 50); resize(); raf = requestAnimationFrame(frame);
    if (S.kg < 400) S = fresh();
    return {
      restart, resize, setPaused(p) { paused = p; },
      destroy() { save(); on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); },
      debug: { update, startDive, eat, sleep, sharpen, roar, onDown, get S() { return S; }, get mode() { return mode; }, get dive() { return dive; }, get bear() { return bear; }, set bearT(v) { bearT = v; }, set tgt(v) { tgt = v; } }
    };
  }
});
