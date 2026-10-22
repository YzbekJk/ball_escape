/* «Филлипинец» — секретная игра в духе Doodle Jump. Филиппинец прыгает по островкам вверх и должен добраться до Франции
   (43 000 очков) и захватить Париж. Мешают торнадо, грозовые тучи, ветер, метеоритный дождь и босс Марсик (два раза).
   Управление: A/D или стрелки, на телефоне — держать левую или правую половину экрана. Прыгает сам.
   Открывается маленькой кнопкой в главном меню по паролю. */
Sims.register({
  id: 'filipinets',
  kind: 'game',
  secret: true,
  hub: 'ph',
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
    const GOAL = 43000, SC = 6, LW = 120, GRAV = 520, JUMP = -Math.sqrt(2 * GRAV * 56), SPRING = -Math.sqrt(2 * GRAV * 118);
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
      const y = cam + LH * 0.62; plats.push({ x: clamp(pl.x - 12, 2, LW - 26), y, w: 24, t: 'g', safe: true }); pl.y = y; pl.vy = JUMP; pl.inv = 2.2; pl.hat = 0; pl.suck = null; blip(220, 0.25, 'triangle', 0.05, 440);
    }

    /* ---------- босс: бой как в Undertale, а после трёх пощад — партия в шахматы ---------- */
    const DW = 360, DH = 640, BOX0 = { x: 20, y: 372, w: 320, h: 132 }, EB = { x: 90, y: 380, w: 180, h: 120 };
    const CE = window.ChessEngine, hk = { u: 0, d: 0, l: 0, r: 0 };
    let F = null, C = null;
    const FONT = '"Courier New", ui-monospace, monospace';
    function uiT() { const s = Math.min(canvas.width / DW, canvas.height / DH); return { s, ox: (canvas.width - DW * s) / 2, oy: (canvas.height - DH * s) / 2 }; }
    function uiXY(e) { const r = canvas.getBoundingClientRect(), T = uiT(), px = (e.clientX - r.left) * canvas.width / r.width, py = (e.clientY - r.top) * canvas.height / r.height; return { x: (px - T.ox) / T.s, y: (py - T.oy) / T.s }; }
    const hit = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

    function say2(lines, then) { F.q = (Array.isArray(lines) ? lines : [lines]).slice(); F.cur = F.q.shift(); F.tx = 0; F.then = then || null; F.st = 'text'; }
    function advanceText() { if (F.tx < F.cur.length) { F.tx = F.cur.length; return; } if (F.q.length) { F.cur = F.q.shift(); F.tx = 0; return; } const fn = F.then; F.then = null; if (fn) fn(); }
    function toMenu() { F.st = 'menu'; F.cur = F.spare ? '* Марсик больше не хочет драться.' : '* Ваш ход.'; F.tx = 99; F.sel = 0; }

    function startFight(i) {
      mode = 'fight'; pl.suck = null; keys.l = keys.r = 0; touchDir = 0; const keep = F && F.i === i ? F.spareCount : 0;
      const eh = i ? 90 : 60;
      F = { i, hp: 20, maxhp: 20, eHp: eh, eMax: eh, mood: 0, spare: false, spareCount: keep, fish: 3, food: 2, st: 'text', q: [], cur: '', tx: 0, then: null, sel: 0, sub: 0, list: [], bullets: [], bt: 0, dur: 0, sp: 0, inv: 0, hx: EB.x + EB.w / 2, hy: EB.y + EB.h / 2, shake: 0, flash: 0, pop: null, popT: 0, bar: null, hpShow: 0, turn: 0, bubble: '', bubT: 0, dying: 0, pat: 0, drag: null };
      say2(['* ' + BOSSES[i].n + ' преграждает путь!'], toMenu); blip(120, 0.6, 'sawtooth', 0.06, 70);
    }
    function fightChoose(k) {
      if (k === 0) { F.st = 'bar'; F.bar = { p: 0, d: 1 }; F.cur = ''; }
      else if (k === 1) { F.st = 'act'; F.list = ['Осмотреть', 'Погладить', 'Поговорить', 'Мяукнуть']; }
      else if (k === 2) { F.st = 'item'; F.list = ['Рыбка ×' + F.fish, 'Корм ×' + F.food]; }
      else { F.st = 'mercy'; F.list = ['Пощадить']; }
    }
    function moodUp(extra) {
      F.mood = Math.min(3, F.mood + 1); if (F.mood >= 2 && !F.spare) { F.spare = true; extra.push('* Марсик больше не хочет драться.'); }
    }
    function doAct(k) {
      if (k === 0) { say2(['* МАРСИК — АТК 7 ЗАЩ 3', '* Белый с пятнами, взгляд безумный. Любит рыбку и пощёчины судьбы.'], startEnemy); return; }
      const t = ['', '* Вы погладили Марсика. Он урчит и тут же делает вид, что нет.', '* Вы поговорили с Марсиком про рыбку. Он заинтересовался.', '* Вы мяукнули. Марсик в шоке: вы говорите на его языке.'][k], ex = []; moodUp(ex); say2([t].concat(ex), startEnemy);
    }
    function doItem(k) {
      if (k === 0) { if (F.fish <= 0) { say2(['* Рыбки закончились.'], toMenu); return; } F.fish--; F.hp = Math.min(F.maxhp, F.hp + 15); blip(520, 0.2, 'triangle', 0.05, 900); say2(['* Вы съели рыбку. +15 HP'], startEnemy); }
      else { if (F.food <= 0) { say2(['* Корма больше нет.'], toMenu); return; } F.food--; F.hp = Math.min(F.maxhp, F.hp + 5); const ex = []; moodUp(ex); say2(['* Вы поделились кормом. Марсик с завистью смотрит на пустую миску. +5 HP'].concat(ex), startEnemy); }
    }
    function doSpare() {
      if (!F.spare) { say2(['* Вы пытаетесь пощадить Марсика...', '* Но он ещё не готов сдаваться.'], startEnemy); return; }
      F.spareCount++; F.mood = 0; F.spare = false; blip(660, 0.3, 'sine', 0.05, 990);
      if (F.spareCount >= 3) say2(['* Вы пощадили Марсика в третий раз.', 'Марсик: «Мяу... Хватит драться.»', 'Марсик: «Сыграем в шахматы? Выиграешь — проходи.»'], startChess);
      else if (F.spareCount === 1) say2(['* Вы пощадили Марсика.', 'Марсик: «Мяу? Думаешь, я так легко сдамся?»', '* Он снова нападает!'], startEnemy);
      else say2(['* Вы пощадили Марсика во второй раз.', 'Марсик: «Опять?! Ладно... ещё один раунд.»', '* Он нападает ещё яростнее!'], startEnemy);
    }
    function barStop() {
      const p = F.bar.p, dmg = Math.round(6 + 24 * (1 - Math.abs(p - 0.5) * 2)); F.bar = null; F.eHp = Math.max(0, F.eHp - dmg); F.shake = 0.5; F.hpShow = 2.2; F.pop = dmg; F.popT = 1; F.mood = Math.max(0, F.mood - 1); if (F.mood < 2) F.spare = false;
      blip(240, 0.25, 'sawtooth', 0.06, 80);
      if (F.eHp <= 0) { F.st = 'dying'; F.dying = 0; blip(160, 1.2, 'sawtooth', 0.05, 40); return; }
      say2(['* Вы нанесли ' + dmg + ' урона.'], startEnemy);
    }
    const PAT_NAMES = ['Клубки', 'Рыбьи кости', 'Когти', 'Указка'];
    function startEnemy() {
      const L = [['Мяу!', 'Лови клубок!'], ['Рыбьи кости!', 'Кошка не промахнётся.'], ['Осторожно, когти!', 'Мяу-у-у!'], ['Следи за указкой.', 'Хе-хе-мяу.']];
      F.pat = (F.turn++ + F.spareCount) % 4; F.st = 'bubble'; F.bubble = L[F.pat][Math.floor(Math.random() * 2)]; F.bubT = 1.3;
    }
    function beginBullets() { F.st = 'enemy'; F.bt = 0; F.sp = 0; F.bullets = []; F.dur = 5.5 + F.spareCount * 0.6 + F.i; F.hx = EB.x + EB.w / 2; F.hy = EB.y + EB.h / 2; F.drag = null; }
    function hurtHeart(d) {
      if (F.inv > 0) return; F.hp -= d; F.inv = 1; blip(140, 0.25, 'sawtooth', 0.06, 60); if (F.hp <= 0) { F.hp = 0; F.st = 'text'; F.bullets = []; blip(100, 0.8, 'sawtooth', 0.06, 30); say2(['* Вы пали...', '* Но решимость не даёт сдаться!'], () => startFight(F.i)); }
    }
    function spawnBullets(dt) {
      const L = F.spareCount + F.i * 1.2, B = EB; F.sp -= dt;
      if (F.pat === 0) { if (F.sp <= 0) { F.sp = Math.max(0.2, 0.42 - L * 0.04); F.bullets.push({ k: 'c', x: B.x + 8 + Math.random() * (B.w - 16), y: B.y - 8, vx: rnd(-15, 15), vy: 85 + L * 14, r: 8 }); } }
      else if (F.pat === 1) { if (F.sp <= 0) { F.sp = Math.max(0.75, 1.15 - L * 0.1); const gx = B.x + 20 + Math.random() * (B.w - 70), gw = 46 - L * 3, vy = 62 + L * 8; F.bullets.push({ k: 'r', x: B.x, y: B.y - 10, w: gx - B.x, h: 8, vx: 0, vy }); F.bullets.push({ k: 'r', x: gx + gw, y: B.y - 10, w: B.x + B.w - gx - gw, h: 8, vx: 0, vy }); } }
      else if (F.pat === 2) { if (F.sp <= 0) { F.sp = Math.max(0.65, 1 - L * 0.08); const a = Math.random() * Math.PI, cx = B.x + B.w / 2 + rnd(-40, 40), cy = B.y + B.h / 2 + rnd(-25, 25); F.bullets.push({ k: 'l', x: cx, y: cy, a, tm: 0, warn: 0.6, dur: 0.18 }); } }
      else { if (!F.bullets.some(b => b.k === 'p')) F.bullets.push({ k: 'p', x: B.x + B.w / 2, y: B.y + B.h / 2, tm: 0, r: 6 }); if (F.sp <= 0) { F.sp = Math.max(0.55, 0.9 - L * 0.07); F.bullets.push({ k: 'c', x: B.x + 8 + Math.random() * (B.w - 16), y: B.y - 8, vx: 0, vy: 60 + L * 10, r: 7 }); } }
    }
    function fightUpdate(dt) {
      t += dt; F.shake = Math.max(0, F.shake - dt); F.hpShow = Math.max(0, F.hpShow - dt); F.popT = Math.max(0, F.popT - dt); F.inv = Math.max(0, F.inv - dt);
      if (F.st === 'text' && F.tx < F.cur.length) F.tx = Math.min(F.cur.length, F.tx + dt * 38);
      if (F.st === 'bar') { F.bar.p += F.bar.d * dt * 1.25; if (F.bar.p >= 1) { F.bar.p = 1; F.bar.d = -1; } if (F.bar.p <= 0) { F.bar.p = 0; F.bar.d = 1; } }
      else if (F.st === 'bubble') { F.bubT -= dt; if (F.bubT <= 0) beginBullets(); }
      else if (F.st === 'dying') { F.dying += dt; if (F.dying > 2) { fightWon('* Марсик побеждён... но мог бы быть другом.'); } }
      else if (F.st === 'enemy') {
        F.bt += dt; const sp = 105; F.hx += (hk.r - hk.l) * sp * dt; F.hy += (hk.d - hk.u) * sp * dt; F.hx = clamp(F.hx, EB.x + 5, EB.x + EB.w - 5); F.hy = clamp(F.hy, EB.y + 5, EB.y + EB.h - 5);
        spawnBullets(dt);
        const dmg = F.i ? 6 : 5;
        F.bullets.forEach(b => {
          if (b.k === 'c') { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(F.hx - b.x, F.hy - b.y) < b.r + 3.5) hurtHeart(dmg); }
          else if (b.k === 'r') { b.y += b.vy * dt; if (F.hx + 3.5 > b.x && F.hx - 3.5 < b.x + b.w && F.hy + 3.5 > b.y && F.hy - 3.5 < b.y + b.h) hurtHeart(dmg); }
          else if (b.k === 'l') { b.tm += dt; if (b.tm > b.warn && b.tm < b.warn + b.dur) { const nx = -Math.sin(b.a), ny = Math.cos(b.a), d = Math.abs((F.hx - b.x) * nx + (F.hy - b.y) * ny); if (d < 7) hurtHeart(dmg); } }
          else if (b.k === 'p') { b.tm += dt; b.x = EB.x + EB.w / 2 + Math.sin(b.tm * 2.3) * (EB.w / 2 - 12); b.y = EB.y + EB.h / 2 + Math.sin(b.tm * 3.1 + 1) * (EB.h / 2 - 12); if (Math.hypot(F.hx - b.x, F.hy - b.y) < b.r + 3) hurtHeart(dmg); }
        });
        F.bullets = F.bullets.filter(b => (b.k === 'c' || b.k === 'r') ? b.y < EB.y + EB.h + 20 : b.k === 'l' ? b.tm < b.warn + b.dur + 0.1 : true);
        if (F.st === 'enemy' && F.bt >= F.dur) { F.bullets = []; toMenu(); }
      }
    }
    function fightWon(line) {
      const i = F.i; bossDone[i] = true; boss = null; lives = Math.min(9, lives + 1); mode = 'play';
      pl.y = cam + LH * 0.62; plats.push({ x: clamp(pl.x - 12, 2, LW - 26), y: pl.y, w: 24, t: 'g', safe: true }); pl.vy = JUMP; pl.inv = 2; pl.kx = 0;
      say(line || 'Марсик побеждён! +1 жизнь'); blip(660, 0.5, 'triangle', 0.07, 1320);
    }

    /* ---------- шахматы ---------- */
    const QUIPS = ['Мяу.', 'Хм...', 'Ага!', 'Думаю...', 'Мур.', 'Не мешай.', 'Как тебе такой ход?'];
    function startChess() {
      mode = 'chess'; C = { pos: CE.start(), sel: -1, targets: [], last: null, think: 0, over: null, ot: 0, msg: 'Ваш ход (белые)', talk: 'Мяу. Я чёрными.' };
    }
    function chessMove(m) {
      C.pos = CE.make(C.pos, m); C.last = m; C.sel = -1; C.targets = []; blip(m.cap ? 200 : 330, 0.08, 'square', 0.04, m.cap ? 120 : 440);
      const s = CE.status(C.pos);
      if (s === 'mate') { C.over = C.pos.turn === 'b' ? 'win' : 'lose'; C.msg = C.over === 'win' ? 'Мат! Вы победили!' : 'Мат. Марсик победил.'; C.talk = C.over === 'win' ? 'Мяу... Проходи.' : 'Мяу-ха-ха! Реванш?'; }
      else if (s === 'stalemate' || s === 'draw') { C.over = 'draw'; C.msg = 'Ничья.'; C.talk = 'Ничья... Уважаю. Проходи.'; }
      else { C.msg = CE.inCheck(C.pos) ? (C.pos.turn === 'w' ? 'Вам шах!' : 'Шах Марсику!') : (C.pos.turn === 'w' ? 'Ваш ход (белые)' : 'Марсик думает...'); if (C.pos.turn === 'b') { C.think = 0.6 + Math.random() * 0.6; if (Math.random() < 0.35) C.talk = QUIPS[Math.floor(Math.random() * QUIPS.length)]; } }
      if (C.over === 'win' || C.over === 'draw') { blip(660, 0.4, 'triangle', 0.06, 1320); }
    }
    function chessUpdate(dt) {
      t += dt;
      if (C.over === 'win' || C.over === 'draw') { C.ot += dt; if (C.ot > 2.2) fightWon(C.over === 'win' ? '* Вы обыграли Марсика в шахматы!' : '* Ничья с Марсиком. Он вас уважает.'); return; }
      if (C.over) return;
      if (C.pos.turn === 'b') { C.think -= dt; if (C.think <= 0) { const m = CE.ai(C.pos); if (m) chessMove(m); } }
    }
    const BD = { x: 10, y: 150, s: 340 };
    function chessDown(p) {
      if (C.over === 'lose') { if (hit(p, 100, 540, 160, 44)) startChess(); return; }
      if (C.over || C.pos.turn !== 'w') return;
      const cs = BD.s / 8, c = Math.floor((p.x - BD.x) / cs), r = Math.floor((p.y - BD.y) / cs); if (c < 0 || c > 7 || r < 0 || r > 7) { C.sel = -1; C.targets = []; return; }
      const s = r * 8 + c, pc = C.pos.b[s], all = CE.moves(C.pos);
      if (C.sel >= 0) { const m = all.find(q => q.from === C.sel && q.to === s); if (m) { chessMove(m); return; } }
      if (pc && CE.colorOf(pc) === 'w') { C.sel = s; C.targets = all.filter(q => q.from === s).map(q => q.to); } else { C.sel = -1; C.targets = []; }
    }

    /* ---------- ввод боя ---------- */
    function uiDown(e) {
      const p = uiXY(e);
      if (mode === 'chess') { chessDown(p); return; }
      if (!F) return;
      if (F.st === 'text') { advanceText(); return; }
      if (F.st === 'menu') { for (let i = 0; i < 4; i++) if (hit(p, 12 + i * 86, 565, 78, 48)) { F.sel = i; fightChoose(i); return; } return; }
      if (F.st === 'act' || F.st === 'item' || F.st === 'mercy') {
        if (hit(p, 262, 474, 78, 28)) { toMenu(); return; }
        for (let i = 0; i < F.list.length; i++) if (hit(p, BOX0.x + 10, BOX0.y + 14 + i * 30, 240, 28)) { const st = F.st; if (st === 'act') doAct(i); else if (st === 'item') doItem(i); else doSpare(); return; }
        return;
      }
      if (F.st === 'bar') { barStop(); return; }
      if (F.st === 'enemy') F.drag = { x: p.x, y: p.y };
    }
    function uiMove(e) {
      if (mode !== 'fight' || !F || F.st !== 'enemy' || !F.drag || e.buttons === 0) return; const p = uiXY(e);
      F.hx = clamp(F.hx + (p.x - F.drag.x), EB.x + 5, EB.x + EB.w - 5); F.hy = clamp(F.hy + (p.y - F.drag.y), EB.y + 5, EB.y + EB.h - 5); F.drag = { x: p.x, y: p.y };
    }
    function uiUp() { if (F) F.drag = null; }
    function uiKey(e) {
      const d = e.type === 'keydown' ? 1 : 0, c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') hk.l = d; else if (c === 'ArrowRight' || c === 'KeyD') hk.r = d; else if (c === 'ArrowUp' || c === 'KeyW') hk.u = d; else if (c === 'ArrowDown' || c === 'KeyS') hk.d = d;
      if (!d || mode !== 'fight' || !F || e.repeat) return;
      const act = c === 'Enter' || c === 'Space' || c === 'KeyZ';
      if (F.st === 'text' && act) advanceText();
      else if (F.st === 'menu') { if (c === 'ArrowLeft' || c === 'KeyA') F.sel = (F.sel + 3) % 4; else if (c === 'ArrowRight' || c === 'KeyD') F.sel = (F.sel + 1) % 4; else if (act) fightChoose(F.sel); }
      else if (F.st === 'act' || F.st === 'item' || F.st === 'mercy') { if (c === 'ArrowDown' || c === 'KeyS') F.sub = (F.sub + 1) % F.list.length; else if (c === 'ArrowUp' || c === 'KeyW') F.sub = (F.sub + F.list.length - 1) % F.list.length; else if (c === 'Escape' || c === 'KeyX') toMenu(); else if (act) { const st = F.st, i = F.sub; F.sub = 0; if (st === 'act') doAct(i); else if (st === 'item') doItem(i); else doSpare(); } }
      else if (F.st === 'bar' && act) barStop();
    }

    /* ---------- отрисовка боя и шахмат ---------- */
    function heart(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + r * 0.95); ctx.bezierCurveTo(x - r * 1.7, y - r * 0.15, x - r * 0.95, y - r * 1.35, x, y - r * 0.45); ctx.bezierCurveTo(x + r * 0.95, y - r * 1.35, x + r * 1.7, y - r * 0.15, x, y + r * 0.95); ctx.fill(); }
    function wrap(str, maxW) { const ws = String(str).split(' '), out = []; let line = ''; ws.forEach(w => { const t2 = line ? line + ' ' + w : w; if (ctx.measureText(t2).width > maxW && line) { out.push(line); line = w; } else line = t2; }); if (line) out.push(line); return out; }
    function portrait(cx, cy, r, ring, crown) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
      if (marsik.complete && marsik.naturalWidth) ctx.drawImage(marsik, cx - r, cy - r, r * 2, r * 2); else { ctx.fillStyle = '#c8a070'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); } ctx.restore();
      ctx.strokeStyle = ring; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      if (crown) { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.92); ctx.lineTo(cx - r * 0.55, cy - r * 1.38); ctx.lineTo(cx - r * 0.2, cy - r * 1.15); ctx.lineTo(cx, cy - r * 1.5); ctx.lineTo(cx + r * 0.2, cy - r * 1.15); ctx.lineTo(cx + r * 0.55, cy - r * 1.38); ctx.lineTo(cx + r * 0.5, cy - r * 0.92); ctx.closePath(); ctx.fill(); }
    }
    function drawFight() {
      const T = uiT(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
      ctx.textBaseline = 'middle';
      const sx = F.shake > 0 ? Math.sin(t * 70) * 7 : 0, bob = Math.sin(t * 2) * 4, dying = F.st === 'dying';
      if (!dying || Math.floor(t * 14) % 2) portrait(180 + sx, 130 + bob + (dying ? F.dying * 20 : 0), 72, F.spare ? '#ffd24a' : '#fff', F.i === 1);
      ctx.textAlign = 'center'; ctx.font = '700 15px ' + FONT; ctx.fillStyle = F.spare ? '#ffd24a' : '#fff'; ctx.fillText('* ' + BOSSES[F.i].n.toUpperCase(), 180, 232);
      for (let k = 0; k < 3; k++) heart(150 + k * 30, 256, 7, k < F.spareCount ? '#ffd24a' : '#333');
      ctx.font = '700 11px ' + FONT; ctx.fillStyle = '#9aa'; ctx.fillText('пощада ' + F.spareCount + '/3', 180, 276);
      if (F.hpShow > 0) { ctx.fillStyle = '#444'; ctx.fillRect(110, 290, 140, 10); ctx.fillStyle = '#3f3'; ctx.fillRect(110, 290, 140 * F.eHp / F.eMax, 10); }
      if (F.popT > 0 && F.pop != null) { ctx.fillStyle = '#ff3a3a'; ctx.font = '900 30px ' + FONT; ctx.fillText('-' + F.pop, 180, 100 - (1 - F.popT) * 30); }
      if (F.st === 'bubble') {
        ctx.font = '700 15px ' + FONT; const lines = wrap(F.bubble, 120), bw = 150, bh = 20 + lines.length * 20, bx = 195, by = 20;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 10) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx + 8, by + bh - 6); ctx.lineTo(bx - 14, by + bh + 14); ctx.lineTo(bx + 30, by + bh - 1); ctx.fill();
        ctx.fillStyle = '#000'; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 20 + i * 20));
      }
      const inBox = F.st === 'enemy', B = inBox ? EB : BOX0;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(B.x, B.y, B.w, B.h);
      ctx.textAlign = 'left'; ctx.font = '700 17px ' + FONT; ctx.fillStyle = '#fff';
      if (F.st === 'text' || F.st === 'menu') { const lines = wrap(F.cur.slice(0, Math.floor(F.tx)), BOX0.w - 28); lines.forEach((l, i) => ctx.fillText(l, BOX0.x + 14, BOX0.y + 24 + i * 24)); }
      if (F.st === 'act' || F.st === 'item' || F.st === 'mercy') {
        F.list.forEach((l, i) => { ctx.fillStyle = F.st === 'mercy' && F.spare ? '#ffd24a' : '#fff'; ctx.fillText('* ' + l, BOX0.x + 38, BOX0.y + 28 + i * 30); if (i === F.sub) heart(BOX0.x + 20, BOX0.y + 28 + i * 30, 6, '#f22'); });
        ctx.fillStyle = '#9aa'; ctx.font = '700 14px ' + FONT; ctx.fillText('← назад', 266, 488);
      }
      if (F.st === 'bar') {
        const bx = BOX0.x + 16, bw = BOX0.w - 32; ctx.fillStyle = '#222'; ctx.fillRect(bx, BOX0.y + 46, bw, 40); ctx.fillStyle = '#3a3'; ctx.fillRect(bx + bw * 0.4, BOX0.y + 46, bw * 0.2, 40); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx, BOX0.y + 46, bw, 40);
        ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * F.bar.p - 3, BOX0.y + 40, 6, 52); ctx.font = '700 13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('Нажмите, чтобы ударить в зелёную зону', 180, BOX0.y + 112);
      }
      if (inBox) {
        F.bullets.forEach(b => {
          if (b.k === 'c') { ctx.fillStyle = '#e03a3a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff9a9a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.6, 0.3, 4); ctx.stroke(); }
          else if (b.k === 'r') { ctx.save(); ctx.beginPath(); ctx.rect(EB.x, EB.y, EB.w, EB.h); ctx.clip(); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.restore(); }
          else if (b.k === 'l') { const dx = Math.cos(b.a) * 200, dy = Math.sin(b.a) * 200; ctx.save(); ctx.beginPath(); ctx.rect(EB.x, EB.y, EB.w, EB.h); ctx.clip(); if (b.tm < b.warn) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; } else { ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 9; } ctx.beginPath(); ctx.moveTo(b.x - dx, b.y - dy); ctx.lineTo(b.x + dx, b.y + dy); ctx.stroke(); ctx.restore(); ctx.setLineDash([]); }
          else if (b.k === 'p') { ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 2, 0, 7); ctx.fill(); }
        });
        if (!(F.inv > 0 && Math.floor(t * 16) % 2)) heart(F.hx, F.hy, 5.5, '#f22');
        ctx.font = '700 12px ' + FONT; ctx.fillStyle = '#9aa'; ctx.textAlign = 'center'; ctx.fillText(PAT_NAMES[F.pat], 180, EB.y + EB.h + 18);
      }
      ctx.textAlign = 'left'; ctx.font = '700 14px ' + FONT; ctx.fillStyle = '#fff'; ctx.fillText('ФИЛИППИНЕЦ  LV 1', 14, 536);
      ctx.fillStyle = '#c33'; ctx.fillRect(200, 527, F.maxhp * 3, 18); ctx.fillStyle = '#ff0'; ctx.fillRect(200, 527, F.hp * 3, 18); ctx.fillStyle = '#fff'; ctx.fillText('HP', 172, 536); ctx.fillText(F.hp + ' / ' + F.maxhp, 200 + F.maxhp * 3 + 8, 536);
      const names = ['БИТЬ', 'ДЕЙСТВ.', 'ПРЕДМЕТ', 'МИЛОСТЬ']; ctx.textAlign = 'center';
      names.forEach((n, i) => {
        const sel = F.st === 'menu' && F.sel === i || (F.st === 'act' && i === 1) || (F.st === 'item' && i === 2) || (F.st === 'mercy' && i === 3) || (F.st === 'bar' && i === 0);
        ctx.strokeStyle = sel ? '#ffd24a' : '#ff7a1a'; ctx.lineWidth = 3; ctx.strokeRect(12 + i * 86, 565, 78, 48); ctx.fillStyle = sel ? '#ffd24a' : '#ff7a1a'; ctx.font = '700 12px ' + FONT; ctx.fillText(n, 12 + i * 86 + 40, 589);
        if (F.st === 'menu' && F.sel === i) heart(12 + i * 86 + 10, 589, 4.5, '#f22');
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function drawPiece(p, cx, cy, s) {
      const white = p === p.toUpperCase(), t2 = p.toLowerCase(), u2 = s / 40;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(u2, u2); ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.fillStyle = white ? '#fbfbfb' : '#2b2b2b'; ctx.strokeStyle = white ? '#222' : '#e8e8e8';
      const poly = pts => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); };
      const circ = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); };
      poly([[-13, 17], [-11, 12], [11, 12], [13, 17]]);
      if (t2 === 'p') { poly([[-7, 12], [-4, -1], [4, -1], [7, 12]]); circ(0, -7, 6.5); }
      else if (t2 === 'r') { poly([[-8, 12], [-8, -5], [8, -5], [8, 12]]); poly([[-11, -5], [-11, -15], [-6, -15], [-6, -11], [-2.5, -11], [-2.5, -15], [2.5, -15], [2.5, -11], [6, -11], [6, -15], [11, -15], [11, -5]]); }
      else if (t2 === 'n') { poly([[-9, 12], [-6, -2], [-11, -3], [-5, -14], [2, -17], [9, -10], [10, -2], [3, 0], [7, 12]]); ctx.fillStyle = white ? '#222' : '#eee'; circ(1, -10, 1.6); }
      else if (t2 === 'b') { poly([[-7, 12], [-4, 0], [4, 0], [7, 12]]); ctx.beginPath(); ctx.ellipse(0, -7, 6, 9, 0, 0, 7); ctx.fill(); ctx.stroke(); circ(0, -18, 2.8); ctx.beginPath(); ctx.moveTo(-2.5, -9); ctx.lineTo(2.5, -5); ctx.stroke(); }
      else if (t2 === 'q') { poly([[-8, 12], [-12, -8], [-8, -3], [-9, -16], [-4, -5], [0, -18], [4, -5], [9, -16], [8, -3], [12, -8], [8, 12]]); }
      else { poly([[-9, 12], [-11, -2], [-5, -8], [5, -8], [11, -2], [9, 12]]); ctx.fillRect(-1.5, -20, 3, 12); ctx.strokeRect(-1.5, -20, 3, 12); ctx.fillRect(-5, -17, 10, 3); ctx.strokeRect(-5, -17, 10, 3); }
      ctx.restore();
    }
    function drawChess() {
      const T = uiT(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#14101e'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
      portrait(60, 98, 34, '#fff', F && F.i === 1); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 15px ' + FONT;
      ctx.fillText('Марсик (чёрные) · ~1000 Эло', 108, 72); ctx.fillStyle = '#ffd24a'; wrap('«' + C.talk + '»', 240).forEach((l, i) => ctx.fillText(l, 108, 96 + i * 20));
      const cs = BD.s / 8, pos = C.pos, ms = C.sel >= 0 ? C.targets : [];
      const kS = CE.inCheck(pos) ? pos.b.indexOf(pos.turn === 'w' ? 'K' : 'k') : -1;
      for (let s = 0; s < 64; s++) {
        const r = s >> 3, c = s & 7, x = BD.x + c * cs, y = BD.y + r * cs; ctx.fillStyle = (r + c) % 2 ? '#8a5a30' : '#eed9b0'; ctx.fillRect(x, y, cs, cs);
        if (C.last && (C.last.from === s || C.last.to === s)) { ctx.fillStyle = 'rgba(255,230,60,.45)'; ctx.fillRect(x, y, cs, cs); }
        if (s === C.sel) { ctx.fillStyle = 'rgba(60,220,90,.5)'; ctx.fillRect(x, y, cs, cs); }
        if (s === kS) { ctx.fillStyle = 'rgba(255,40,40,.55)'; ctx.fillRect(x, y, cs, cs); }
        const pc = pos.b[s]; if (pc) drawPiece(pc, x + cs / 2, y + cs / 2, cs * 0.92);
        if (ms.includes(s)) { ctx.fillStyle = 'rgba(40,160,60,.75)'; ctx.beginPath(); ctx.arc(x + cs / 2, y + cs / 2, pc ? cs * 0.42 : cs * 0.14, 0, 7); if (pc) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,160,60,.85)'; ctx.stroke(); } else ctx.fill(); }
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(BD.x, BD.y, BD.s, BD.s);
      ctx.textAlign = 'center'; ctx.fillStyle = C.over === 'lose' ? '#ff8a7a' : C.over ? '#7aff9a' : '#fff'; ctx.font = '700 18px ' + FONT; ctx.fillText(C.msg, 180, 512);
      ctx.font = '600 12px ' + FONT; ctx.fillStyle = '#9aa'; ctx.fillText('Вы играете белыми: нажмите фигуру, затем клетку', 180, 538);
      if (C.over === 'lose') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.strokeRect(100, 560, 160, 44); ctx.fillStyle = '#ffd24a'; ctx.font = '700 16px ' + FONT; ctx.fillText('Реванш', 180, 582); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /* ---------- обновление ---------- */
    function update(dt) {
      t += dt; if (toastT > 0) toastT -= dt;
      parts.forEach(p => { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }); parts = parts.filter(p => p.l > 0);
      if (mode === 'fight') { fightUpdate(dt); return; } if (mode === 'chess') { chessUpdate(dt); return; }
      if (mode !== 'play') return;
      const sc = score(), dir = (keys.r - keys.l) || touchDir;
      // ветер
      if (!arena && sc >= 12000 && sc < 41000) { windT -= dt; if (windT <= 0) { if (wind) { wind = 0; windT = rnd(9, 14); } else { windDir = Math.random() < 0.5 ? -1 : 1; wind = windDir; windT = 4.2; say(windDir > 0 ? 'Ветер →' : '← Ветер'); } } } else wind = 0;
      // метеоры
      if (!arena && sc >= 16000 && sc < 41000) { meteorT -= dt; if (meteorT <= 0) { if (meteorOn > 0) { meteorOn = 0; meteorT = rnd(12, 18); } else { meteorOn = 1; meteorT = 5; say('Метеоритный дождь!'); } } }
      else meteorOn = 0;
      if (meteorOn) { nextMeteor -= dt; if (nextMeteor <= 0) { nextMeteor = rnd(0.25, 0.45); haz.push({ k: 'meteor', x: rnd(-10, LW), y: cam - 6, vx: rnd(14, 30), vy: rnd(90, 125) }); } }
      // игрок
      if (pl.suck) {
        const k = pl.suck, h = k.h; k.t -= dt; k.a += dt * 10; const rr = 2 + 6 * Math.max(0, k.t) / 3;
        pl.x = h.x + Math.cos(k.a) * rr; pl.y = h.y - h.h * 0.55 + Math.sin(k.a * 0.6) * h.h * 0.3; pl.vy = 0; pl.face = Math.cos(k.a) > 0 ? 1 : -1; pl.inv = Math.max(pl.inv, 0.2);
        if (Math.random() < 0.5) parts.push({ x: pl.x + rnd(-6, 6), y: pl.y + rnd(-10, 4), vx: rnd(-20, 20), vy: rnd(-20, 10), l: 0.4, c: '#d8e0ea' });
        if (k.t <= 0) { pl.suck = null; pl.kx = (Math.random() < 0.5 ? -1 : 1) * rnd(85, 120); pl.vy = -330; pl.inv = 1.2; h.cool = 4; blip(200, 0.5, 'sawtooth', 0.05, 900); say('Торнадо выбросило!'); for (let i = 0; i < 14; i++) parts.push({ x: pl.x, y: pl.y - 6, vx: rnd(-60, 60), vy: rnd(-90, 20), l: rnd(0.4, 0.8), c: '#d8e0ea' }); }
      } else {
      pl.vx = dir * SPEED; if (dir) pl.face = dir; pl.x += (pl.vx + wind * 30 + (pl.kx || 0)) * dt; pl.kx = (pl.kx || 0) * Math.max(0, 1 - 1.8 * dt); if (pl.x < -3) pl.x += LW + 6; if (pl.x > LW + 3) pl.x -= LW + 6;
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
      }
      // максимум высоты
      if (-pl.y > maxH - startY * 0 && !arena) maxH = Math.max(maxH, startY - pl.y);
      else if (arena) maxH = Math.max(maxH, startY - pl.y);
      // камера
      if (!arena) cam = Math.min(cam, pl.y - LH * 0.42);
      // босс
      const s2 = score();
      if (!arena) BOSSES.forEach((b, i) => { if (!bossDone[i] && s2 >= b.s && mode === 'play') startFight(i); });
      // явления
      haz.forEach(h => {
        if (h.k === 'tornado') {
          h.x += h.vx * dt; if (h.x < 8 || h.x > LW - 8) h.vx = -h.vx;
          if (h.cool > 0) h.cool -= dt;
          else if (!pl.suck && mode === 'play' && Math.abs(pl.x - h.x) < 22 && pl.y > h.y - h.h && pl.y < h.y + 6) { pl.x += (h.x - pl.x) * Math.min(1, dt * 1.4); if (Math.abs(pl.x - h.x) < 9) { pl.suck = { h, t: 3, a: 0 }; pl.kx = 0; blip(140, 0.6, 'sawtooth', 0.04, 420); say('Торнадо затягивает!'); } }
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
    function draw() {
      if (mode === 'fight') { drawFight(); return; } if (mode === 'chess') { drawChess(); return; }
      g.imageSmoothingEnabled = false; drawSky();
      if (summitPlaced && summit) { const sx = LW / 2, sy = summit.y - cam; if (sy > -70 && sy < LH + 10) { const c = '#5a4a3a'; for (let i = 0; i < 40; i++) { const w = 3 + (i * 0.28); R(c, sx - w / 2, sy - 40 + i, w, 1); } R('#8a7a5a', sx - 9, sy - 18, 18, 1); R('#8a7a5a', sx - 6, sy - 28, 12, 1); R('#8a7a5a', sx - 2, sy - 36, 4, 1); R('#5a4a3a', sx - 1, sy - 46, 2, 8); R('#0055a4', sx + 1, sy - 48, 3, 4); R('#fff', sx + 4, sy - 48, 3, 4); R('#ef4135', sx + 7, sy - 48, 3, 4); } }
      plats.forEach(drawPlat); items.forEach(drawItem);
      haz.forEach(h => { if (h.k === 'tornado') drawTornado(h); else if (h.k === 'storm') drawStorm(h); else { const x = h.x, y = h.y - cam; R('#ff8a2a', x - 2, y - 2, 4, 4); R('#ffe28a', x - 1, y - 1, 2, 2); R('rgba(255,140,40,.6)', x - 6, y - 8, 3, 3); R('rgba(255,140,40,.4)', x - 10, y - 14, 2, 2); } });
      shots.forEach(s => { const x = s.x, y = s.y - cam; R('#e03a3a', x - 3, y - 3, 6, 6); R('#ff7a7a', x - 2, y - 2, 2, 2); R('#e8e8e8', x - 4, y + 2, 3, 1); });
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
      if (mode === 'fight' || mode === 'chess') { uiKey(e); e.preventDefault && /Arrow|Space/.test(e.code) && e.preventDefault(); return; }
      const d = e.type === 'keydown' ? 1 : 0, c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') keys.l = d; else if (c === 'ArrowRight' || c === 'KeyD') keys.r = d;
      if (d && mode !== 'play' && (c === 'Space' || c === 'Enter')) restart();
    }
    function ptr(e) { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) < r.width / 2 ? -1 : 1; }
    const onDown = e => { if (mode === 'fight' || mode === 'chess') { uiDown(e); return; } if (mode !== 'play') { restart(); return; } touchDir = ptr(e); };
    const onMove = e => { if (mode === 'fight') { uiMove(e); return; } if (touchDir && e.buttons !== 0) touchDir = ptr(e); };
    const onUp = () => { touchDir = 0; uiUp(); };
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
        update, restart, startFight, startChess, get F() { return F; }, get C() { return C; }, uiDown, uiKey, fightUpdate, chessUpdate, drawFight, drawChess, score, GOAL, get mode() { return mode; }, get lives() { return lives; }, get boss() { return boss; }, get pl() { return pl; }, get plats() { return plats; }, get haz() { return haz; }, get cam() { return cam; }, get arena() { return arena; },
        teleport(s) { const y = startY - s / SC; pl.y = y - 2; pl.vy = 0; maxH = s / SC; cam = y - LH * 0.42; plats = []; items = []; haz = []; topY = cam + LH * 0.5; plats.push({ x: 20, y: y + 10, w: 30, t: 'g' }); hazY = cam - 150; gen(); },
        set dir(v) { keys.l = v < 0 ? 1 : 0; keys.r = v > 0 ? 1 : 0; }, get bossDone() { return bossDone; }, set lives(v) { lives = v; }, hurt
      }
    };
  }
});
