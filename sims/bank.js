/* Игра «Обнаглевший банк» (пиксель-арт): банк совсем обнаглел — отбираешь свои деньги в драке, а потом удираешь на машине.
   Часть 1 — бои: 5 волн (охранники, менеджеры, коллекторы) и босс «Директор банка». Три героя на выбор.
   Часть 2 — погоня: дорога в три полосы. Машины перекрывают две полосы из трёх — надо успеть уйти влево, вправо или остаться посередине, иначе врежутся.
   Бой: A/D — ходить, Пробел — прыжок, J / ЛКМ — удар, K / ПКМ — сильный удар ногой, Q — перекат.
   Погоня: ←/→ (A/D) — сменить полосу, S / Пробел — в центр, цифры 1·2·3 — сразу на нужную полосу. */
Sims.register({
  id: 'bank',
  kind: 'game',
  ownSpace: true,
  title: 'Обнаглевший банк',
  desc: 'Пиксельная игра. Банк обнаглел и не отдаёт ваши деньги — придётся забирать силой. Выберите героя (клиент, бабуля или курьер), пройдите пять волн охранников, менеджеров и коллекторов, победите Директора банка, схватите деньги и прыгайте в машину. В финале — погоня: на дороге три полосы, и каждый раз кто-то перекрывает две из них. Уходите влево, вправо или оставайтесь посередине — иначе машина врежется. Бой: A/D — ходить, Пробел — прыжок, J или ЛКМ — удар, K или ПКМ — удар ногой, Q — перекат. Погоня: ←/→ или A/D — полоса, S — центр, 1·2·3 — полоса напрямую.',

  lb: { label: 'Очки (бой + погоня + бонус за целую машину)', better: 'high', fair: ['playerHp', 'enemyPower', 'carLives', 'carSpeed'], fmt: v => v + ' оч.' },
  defaults: { playerHp: 100, enemyPower: 1, maxAlive: 4, carLives: 3, carSpeed: 1, sound: true },
  schema: [
    { k: 'playerHp', l: 'Ваше здоровье (бой)', min: 40, max: 300, step: 10 },
    { k: 'enemyPower', l: 'Сила врагов ×', min: 0.3, max: 3, step: 0.1, live: 1 },
    { k: 'maxAlive', l: 'Сколько врагов одновременно', min: 1, max: 7, step: 1, live: 1 },
    { k: 'carLives', l: 'Прочность машины (жизни в погоне)', min: 1, max: 8, step: 1 },
    { k: 'carSpeed', l: 'Скорость погони ×', min: 0.5, max: 2, step: 0.1 },
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#d9cfae'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7a5a2e'; ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = '#f2c21a'; ctx.fillRect(w * 0.3, h * 0.08, w * 0.4, h * 0.14);
    ctx.fillStyle = '#5a4020'; ctx.fillRect(w * 0.1, h * 0.35, w * 0.8, h * 0.08);
    ctx.fillStyle = '#f0c9a0'; ctx.fillRect(w * 0.2, h * 0.42, h * 0.1, h * 0.1); ctx.fillStyle = '#3a6fd8'; ctx.fillRect(w * 0.19, h * 0.52, h * 0.12, h * 0.17);
    ctx.fillStyle = '#22304f'; ctx.fillRect(w * 0.62, h * 0.4, h * 0.12, h * 0.12); ctx.fillRect(w * 0.61, h * 0.52, h * 0.14, h * 0.17);
    ctx.fillStyle = '#cc1c1c'; ctx.fillRect(w * 0.85, h * 0.78, w * 0.1, h * 0.12); ctx.fillStyle = '#f2c21a'; ctx.fillRect(w * 0.4, h * 0.8, w * 0.1, h * 0.09);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mono = px => Math.round(px) + 'px system-ui, sans-serif';

    /* ================= персонажи ================= */
    const HEROES = [
      { id: 'vasya', name: 'Клиент Вася', hp: 1, dmg: 1, spd: 1, cd: 1, skin: '#f0c9a0', cloth: '#3a6fd8', pants: '#2b3350', hair: '#3a2a1a', note: 'Обычный парень. Всего в меру.' },
      { id: 'tamara', name: 'Бабуля Тамара', hp: 1.3, dmg: 1.45, spd: 0.75, cd: 1.15, skin: '#f0c9a0', cloth: '#c8508a', pants: '#5a3a5a', hair: '#dcdcdc', bag: true, note: 'Медленная, зато сумкой бьёт больно.' },
      { id: 'zheka', name: 'Курьер Жека', hp: 0.8, dmg: 0.85, spd: 1.35, cd: 0.7, skin: '#e0b080', cloth: '#e8a81a', pants: '#2a4a2a', hair: '#1a1a1a', cap: '#e8a81a', note: 'Быстрый и частый, но хрупкий.' }
    ];
    const DEFS = {
      guard:     { name: 'Охранник', hp: 42, spd: 20, reach: 17, wind: 0.55, act: 0.15, dmg: 10, pts: 10, col: { skin: '#e0b494', cloth: '#22304f', pants: '#161d30', hair: '#222' }, cap: '#22304f', baton: true },
      manager:   { name: 'Менеджер', hp: 26, spd: 17, ranged: true, wind: 0.5, dmg: 7, pts: 12, col: { skin: '#f0c9a0', cloth: '#eeeeee', pants: '#444', hair: '#6a4a2a' }, tie: '#c01820', glasses: true },
      collector: { name: 'Коллектор', hp: 24, spd: 44, reach: 14, wind: 0.32, act: 0.14, dmg: 8, pts: 12, col: { skin: '#d8a880', cloth: '#151515', pants: '#222', hair: '#111' }, shades: true, lunge: true },
      director:  { name: 'ДИРЕКТОР БАНКА', hp: 430, spd: 18, reach: 24, wind: 0.6, act: 0.2, dmg: 17, pts: 400, boss: true, scale: 2, col: { skin: '#e8b898', cloth: '#1c1c28', pants: '#14141c', hair: '#b8b8b8' }, tie: '#d8b020', hat: true }
    };
    const WAVES = [
      ['guard', 'guard'],
      ['manager', 'collector', 'guard'],
      ['collector', 'collector', 'manager', 'collector', 'manager'],
      ['guard', 'guard', 'manager', 'collector', 'guard'],
      ['director']
    ];
    const GOAL = 16;   // сколько «стенок» из машин надо пережить в погоне

    /* ================= состояние ================= */
    let mode, wave, spawnQ, spawnT, pl, es, parts, floats, projs, pickups, shake, t, events, held, keys, banner, bannerT, kills, score, hitStop, waveWait, hero, sel, dv, cutT, lock, checkScore, fade;
    let paused = false, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, u = 3, LW = 120, LH = 200, ctrlH = 200, ox = 0, off, g, bg, btns = [], cards = [];
    try { sel = Math.max(0, HEROES.findIndex(h => h.id === localStorage.getItem('bank_hero'))); } catch (e) { sel = 0; }
    const ground = () => Math.round(LH * 0.78);
    const LANEW = 30;
    const laneX = l => Math.round(LW / 2) + (l - 1) * LANEW;
    const carY = () => LH - 40;

    function newPlayer() { const H_ = HEROES[hero]; const mx = Math.round(cfg.playerHp * H_.hp); return { x: Math.round(LW * 0.4), h: 0, vy: 0, vx: 0, hp: mx, max: mx, face: 1, st: 'idle', stT: 0, cd: 0, inv: 0, flash: 0, dashCd: 0, hitDone: false, atk: null, ph: 0 }; }
    function restart() {
      mode = 'title'; wave = -1; spawnQ = []; spawnT = 0; es = []; parts = []; floats = []; projs = []; pickups = []; hero = sel; pl = newPlayer();
      shake = 0; t = 0; events = []; held = {}; keys = {}; banner = ''; bannerT = 0; kills = 0; score = 0; hitStop = 0; waveWait = 0; dv = null; cutT = 0; lock = 0; checkScore = 0; fade = 0;
    }
    function submit() { if (ctl.submitScore && score > 0) ctl.submitScore(score); }
    function startGame(i) {
      if (i != null) sel = i; hero = sel; try { localStorage.setItem('bank_hero', HEROES[hero].id); } catch (e) { }
      mode = 'play'; pl = newPlayer(); es = []; parts = []; floats = []; projs = []; pickups = []; kills = 0; score = 0; fade = 0; startWave(0); events.push('bell');
    }
    function startWave(i) {
      wave = i; spawnQ = WAVES[i].slice(); spawnT = 1.1; waveWait = 0;
      banner = WAVES[i][0] === 'director' ? 'БОСС: ДИРЕКТОР БАНКА!' : 'ВОЛНА ' + (i + 1) + ' / ' + WAVES.length; bannerT = 1.8; events.push('bell');
    }
    function spawn(type, fromX) {
      const D = DEFS[type], side = Math.random() < 0.5 ? -1 : 1;
      const x = fromX != null ? fromX : (side < 0 ? -8 : LW + 8);
      const hp = Math.round(D.hp * (D.boss ? 1 : 1 + wave * 0.05));
      es.push({ type, D, x, h: 0, vy: 0, vx: 0, hp, max: hp, face: x < LW / 2 ? 1 : -1, st: 'walk', t: 0, cd: rnd(0.5, 1.3), flash: 0, hitDone: false, ph: Math.random() * 6, volley: rnd(2.5, 4), summoned: false });
    }

    /* ================= эффекты ================= */
    function floatText(x, y, s, col) { floats.push({ x, y, s, col, life: 0.8 }); }
    function sparks(x, y, n, cols, big) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-70, 70) * (big ? 1.4 : 1), vy: rnd(-110, -15), life: rnd(0.4, 0.9), col: cols[i % cols.length] }); }

    /* ================= бой ================= */
    function playerAttack(kind) {
      if (mode !== 'play' || pl.cd > 0 || pl.st === 'hurt' || pl.st === 'dead' || pl.st === 'dash') return;
      const H_ = HEROES[hero], heavy = kind === 'heavy';
      pl.atk = heavy ? { dur: 0.46, reach: 31, dmg: 22 * H_.dmg, kb: 150, stun: true, hitAt: 0.5 } : { dur: 0.26, reach: 22, dmg: 10 * H_.dmg, kb: 60, stun: false, hitAt: 0.45 };
      pl.st = kind; pl.stT = 0; pl.hitDone = false; pl.cd = (heavy ? 0.66 : 0.3) * H_.cd; pl.vx = pl.face * (heavy ? 60 : 35); events.push(heavy ? 'swingH' : 'swing');
    }
    function playerJump() { if (mode === 'play' && pl.h <= 0 && pl.st !== 'hurt' && pl.st !== 'dead') { pl.vy = 160; events.push('jump'); } }
    function playerDash() {
      if (mode !== 'play' || pl.dashCd > 0 || pl.st === 'hurt' || pl.st === 'dead') return;
      const d = (held.left || keys.left) ? -1 : (held.right || keys.right) ? 1 : pl.face;
      pl.st = 'dash'; pl.stT = 0; pl.inv = 0.32; pl.dashCd = 0.8; pl.vx = d * 170; pl.atk = null; events.push('dash');
    }
    function hurtEnemy(e, dmg, kb, stun) {
      if (e.st === 'dead') return;
      e.hp -= dmg; e.flash = 0.12; hitStop = Math.max(hitStop, stun ? 0.07 : 0.035); shake = Math.max(shake, stun ? 0.14 : 0.07);
      floatText(e.x, ground() - e.h - 38 * (e.D.scale || 1), '-' + Math.round(dmg), '#ffe14d');
      sparks(e.x, ground() - e.h - 18 * (e.D.scale || 1), e.D.boss ? 8 : 6, ['#ffe14d', '#fff', '#ff9a3a']); events.push(e.hp <= 0 ? 'ko' : 'hit');
      if (e.hp <= 0) {
        e.st = 'dead'; e.t = 0; kills++; score += e.D.pts; sparks(e.x, ground() - e.h - 16, e.D.boss ? 40 : 16, ['#ffe14d', '#fff', '#5ad06a', '#ff9a3a'], true);
        if (e.D.boss) { pickups.push({ x: Math.max(14, Math.min(LW - 14, e.x)), h: 40, vy: 0, kind: 'bag' }); }
        else if (Math.random() < 0.18) pickups.push({ x: Math.max(14, Math.min(LW - 14, e.x)), h: 30, vy: 0, kind: 'med' });
        return;
      }
      if (e.D.boss && !stun) { e.vx = kb * pl.face * 0.12; return; }
      e.vx = kb * pl.face * (e.D.boss ? 0.2 : 1);
      if (e.st !== 'hurt') { e.st = 'hurt'; e.t = 0; e.hitDone = false; }
    }
    function hurtPlayer(dmg, dirx) {
      if (pl.inv > 0 || pl.st === 'dead' || mode !== 'play') return false;
      dmg *= cfg.enemyPower; pl.hp = Math.max(0, pl.hp - dmg); pl.flash = 0.25; pl.inv = 0.45; pl.st = 'hurt'; pl.stT = 0; pl.atk = null; pl.vx = dirx * 90;
      floatText(pl.x, ground() - pl.h - 40, '-' + Math.round(dmg), '#ff6a6a'); sparks(pl.x, ground() - pl.h - 18, 6, ['#ff6a6a', '#fff']); events.push('ouch'); shake = Math.max(shake, 0.22);
      if (pl.hp <= 0) { pl.st = 'dead'; mode = 'over'; lock = 0.6; events.push('over'); submit(); }
      return true;
    }

    function updatePlayer(dt) {
      const H_ = HEROES[hero];
      if (pl.cd > 0) pl.cd -= dt; if (pl.flash > 0) pl.flash -= dt; if (pl.inv > 0) pl.inv -= dt; if (pl.dashCd > 0) pl.dashCd -= dt;
      pl.stT += dt;
      const dirx = (held.left || keys.left ? -1 : 0) + (held.right || keys.right ? 1 : 0);
      pl.x += pl.vx * dt; pl.vx *= Math.max(0, 1 - 8 * dt);
      if (pl.st === 'hurt') { if (pl.stT > 0.28) pl.st = 'idle'; }
      else if (pl.st === 'dash') { if (pl.stT > 0.28) pl.st = 'idle'; }
      else if (pl.st === 'hit' || pl.st === 'heavy') {
        if (!pl.hitDone && pl.stT >= pl.atk.dur * pl.atk.hitAt) {
          pl.hitDone = true; let any = false;
          es.forEach(e => {
            if (e.st === 'dead') return;
            const dx = (e.x - pl.x) * pl.face;
            if (dx > -4 && dx < pl.atk.reach + 4 * (e.D.scale || 1) && Math.abs(e.h - pl.h) < 16) { hurtEnemy(e, pl.atk.dmg, pl.atk.kb, pl.atk.stun); any = true; }
          });
          projs.forEach(p => { const dx = (p.x - pl.x) * pl.face; if (dx > -2 && dx < pl.atk.reach && p.h < pl.h + 22) { p.dead = true; floatText(p.x, ground() - p.h - 10, 'отбил!', '#9fe8ff'); events.push('clink'); any = true; } });
          if (!any) { /* промах */ }
        }
        if (pl.stT >= pl.atk.dur) { pl.st = 'idle'; pl.atk = null; }
      } else {
        if (dirx) { pl.face = dirx; pl.x += dirx * 56 * H_.spd * dt; pl.st = 'walk'; pl.ph += dt * 11 * H_.spd; } else pl.st = 'idle';
      }
      if (pl.h > 0 || pl.vy > 0) { pl.vy -= 520 * dt; pl.h += pl.vy * dt; if (pl.h <= 0) { pl.h = 0; pl.vy = 0; } }
      pl.x = clamp(pl.x, 6, LW - 6);
    }
    function updateEnemy(e, dt) {
      const D = e.D; e.t += dt; if (e.flash > 0) e.flash -= dt; e.ph += dt * 9;
      e.x += e.vx * dt; e.vx *= Math.max(0, 1 - 7 * dt);
      if (e.st === 'dead') return;
      const dx = pl.x - e.x, dist = Math.abs(dx), live = pl.st !== 'dead';
      if (e.cd > 0) e.cd -= dt;
      if (e.st === 'hurt') { if (e.t > 0.3) { e.st = 'walk'; e.t = 0; } return; }
      if (D.boss) {
        if (!e.summoned && e.hp < e.max * 0.5) { e.summoned = true; spawn('guard', -8); spawn('guard', LW + 8); banner = 'ДИРЕКТОР ЗОВЁТ ОХРАНУ!'; bannerT = 1.6; events.push('bell'); }
        e.volley -= dt;
      }
      if (e.st === 'walk') {
        e.face = dx >= 0 ? 1 : -1;
        if (D.ranged) {
          const want = dist < 38 ? -1 : dist > 70 ? 1 : 0;
          if (want) e.x += want * e.face * D.spd * dt;
          if (e.cd <= 0 && live && dist > 28 && dist < 90 && e.x > 4 && e.x < LW - 4) { e.st = 'wind'; e.t = 0; }
        } else {
          if (dist > D.reach * 0.85) e.x += e.face * D.spd * dt;
          if (D.boss && e.volley <= 0 && live) { e.st = 'throw'; e.t = 0; e.volley = rnd(3.2, 5); return; }
          if (e.cd <= 0 && live && dist <= D.reach * 1.05 + (D.boss ? 6 : 0)) { e.st = 'wind'; e.t = 0; e.hitDone = false; }
        }
      } else if (e.st === 'wind') {
        if (e.t >= D.wind) {
          if (D.ranged) { projs.push({ x: e.x + e.face * 6, h: 8, vx: e.face * 72, kind: 'doc', life: 3 }); events.push('throw'); e.cd = rnd(1.5, 2.4); e.st = 'rec'; e.t = 0; }
          else { e.st = 'act'; e.t = 0; e.hitDone = false; if (D.lunge) e.vx = e.face * 130; events.push('swing'); }
        }
      } else if (e.st === 'throw') {
        if (e.t > 0.55 && !e.hitDone) { e.hitDone = true; [6, 6, 6].forEach((h, k) => projs.push({ x: e.x + e.face * 12, h, vx: e.face * (62 + k * 18), kind: 'coin', life: 3 })); events.push('throw'); }
        if (e.t > 0.9) { e.st = 'rec'; e.t = 0; e.cd = 0.6; }
      } else if (e.st === 'act') {
        const ex = (pl.x - e.x) * e.face;
        if (!e.hitDone && ex > -4 && ex < D.reach * 1.3 && Math.abs(pl.h - e.h) < 14) { e.hitDone = true; if (hurtPlayer(D.dmg, e.face)) { events.push('smack'); } }
        if (e.t >= D.act) { e.st = 'rec'; e.t = 0; e.cd = D.boss ? rnd(0.7, 1.3) : rnd(0.5, 1.2); }
      } else if (e.st === 'rec') { if (e.t > (D.boss ? 0.55 : 0.6)) { e.st = 'walk'; e.t = 0; } }
      // не слипаться
      es.forEach(o => { if (o !== e && o.st !== 'dead' && Math.abs(o.x - e.x) < 9 && e.st === 'walk') e.x += (e.x < o.x ? -1 : 1) * 16 * dt; });
      if (!D.boss) e.x = clamp(e.x, -12, LW + 12);
    }
    function updateFight(dt) {
      if (bannerT > 0) bannerT -= dt;
      updatePlayer(dt);
      es.forEach(e => updateEnemy(e, dt));
      es = es.filter(e => !(e.st === 'dead' && e.t > 0.9));
      projs.forEach(p => {
        p.x += p.vx * dt; p.life -= dt;
        if (!p.dead && pl.st !== 'dead' && Math.abs(p.x - pl.x) < 5 && p.h > pl.h - 3 && p.h < pl.h + 22) { if (hurtPlayer(p.kind === 'coin' ? 9 : 7, Math.sign(p.vx) || 1)) p.dead = true; }
        if (p.x < -10 || p.x > LW + 10 || p.life <= 0) p.dead = true;
      });
      projs = projs.filter(p => !p.dead);
      pickups.forEach(p => {
        if (p.h > 0) { p.vy -= 400 * dt; p.h = Math.max(0, p.h + p.vy * dt); if (p.h === 0) p.vy = 0; }
        if (!p.got && Math.abs(p.x - pl.x) < 9 && pl.h < 12 && pl.st !== 'dead') {
          if (p.kind === 'med') { p.got = true; const hl = Math.round(pl.max * 0.3); pl.hp = Math.min(pl.max, pl.hp + hl); floatText(p.x, ground() - 30, '+' + hl, '#5ad06a'); events.push('heal'); }
          else if (p.kind === 'bag') { p.got = true; score += 150; floatText(p.x, ground() - 30, 'ДЕНЬГИ! +150', '#ffe14d'); events.push('coin'); mode = 'cut'; cutT = 0; banner = 'ДЕНЬГИ У НАС! БЕГОМ К МАШИНЕ!'; bannerT = 3; pl.st = 'walk'; }
        }
      });
      pickups = pickups.filter(p => !p.got);
      // волны
      if (mode === 'play') {
        if (spawnQ.length) { spawnT -= dt; if (spawnT <= 0 && es.filter(e => e.st !== 'dead').length < cfg.maxAlive) { spawn(spawnQ.shift()); spawnT = rnd(0.8, 1.6); } }
        else if (!es.some(e => e.st !== 'dead')) {
          if (wave < WAVES.length - 1) {
            if (!waveWait) { waveWait = 1.8; score += 20; if (wave === 1 || wave === 3) pickups.push({ x: LW / 2, h: 60, vy: 0, kind: 'med' }); floatText(LW / 2, ground() - 50, 'ВОЛНА ЗАЧИЩЕНА +20', '#9fe8ff'); }
            waveWait -= dt; if (waveWait <= 0) startWave(wave + 1);
          }
        }
      }
    }
    function updateCut(dt) {
      cutT += dt; if (bannerT > 0) bannerT -= dt;
      pl.face = 1; pl.st = 'walk'; pl.ph += dt * 13; pl.x += 70 * dt; pl.vx = 0;
      if (pl.x > LW + 14 || cutT > 4) { fade += dt * 2; if (fade >= 1) startDrive(); }
    }

    /* ================= погоня ================= */
    const CARCOL = ['#c8302a', '#2a6ac8', '#3a9a4a', '#e8e8e8', '#8a4ac0', '#e07a1a', '#2ab8b8'];
    function startDrive() {
      checkScore = score; fade = 0;
      dv = { lane: 1, x: laneX(1), hp: cfg.carLives, inv: 0, rows: [], coins: [], passed: 0, spawnT: 1.2, road: 0, over: false, endT: 0, free: [], last: -1, rep: 0, sirens: 0, goalShown: false, crashT: 0 };
      mode = 'drive'; banner = 'ПОГОНЯ! ВЛЕВО · ПОСЕРЕДИНЕ · ВПРАВО'; bannerT = 2.4; events.push('engine');
    }
    const dvSpeed = () => Math.min(125, 64 + dv.passed * 4.2) * cfg.carSpeed;
    function setLane(l) { if (mode === 'drive' && !dv.over) { const n = clamp(l, 0, 2); if (n !== dv.lane) { dv.lane = n; events.push('swish'); } } }
    function spawnRow() {
      // 1 — свободны две полосы (легко), иначе одна свободная. Чтобы нельзя было стоять на месте — свободная полоса меняется.
      let free; const easy = dv.passed < 2 || (dv.passed > 4 && Math.random() < 0.12);
      let f = Math.floor(Math.random() * 3); if (f === dv.last && dv.rep >= 1) f = (f + 1 + Math.floor(Math.random() * 2)) % 3;
      if (f === dv.last) dv.rep++; else dv.rep = 0; dv.last = f;
      free = [f]; if (easy) free.push((f + 1 + Math.floor(Math.random() * 2)) % 3);
      const row = { y: -30, free, cars: [], hit: false, counted: false };
      for (let l = 0; l < 3; l++) if (!free.includes(l)) row.cars.push({ lane: l, col: CARCOL[Math.floor(Math.random() * CARCOL.length)], truck: Math.random() < 0.25, vx: 0, ox: 0 });
      dv.rows.push(row);
      const cl = free[Math.floor(Math.random() * free.length)];
      for (let k = 0; k < 2; k++) dv.coins.push({ lane: cl, y: -30 - 14 - k * 16, got: false });
      dv.free = free;
    }
    function updateDrive(dt) {
      if (bannerT > 0) bannerT -= dt;
      const sp = dvSpeed(); dv.road += sp * dt; dv.sirens += dt;
      dv.x += (laneX(dv.lane) - dv.x) * Math.min(1, 15 * dt);
      if (dv.inv > 0) dv.inv -= dt; if (dv.crashT > 0) dv.crashT -= dt;
      if (!dv.over) {
        dv.spawnT -= dt;
        if (dv.passed + dv.rows.filter(r => !r.counted).length < GOAL && dv.spawnT <= 0) { spawnRow(); dv.spawnT = Math.max(0.82, 96 / sp); }
      }
      const cy = carY();
      dv.rows.forEach(r => {
        r.y += sp * dt;
        r.cars.forEach(c => { c.ox += c.vx * dt; c.vx *= 0.96; });
        if (!dv.over) r.cars.forEach(c => {
          const cx = laneX(c.lane) + c.ox, hh = c.truck ? 17 : 14;
          if (dv.inv <= 0 && Math.abs(cx - dv.x) < 15 && Math.abs(r.y - cy) < hh + 11) {
            dv.hp--; dv.inv = 1.4; dv.crashT = 0.5; r.hit = true; c.vx = (cx < dv.x ? -1 : 1) * 90; shake = 0.35; events.push('crash'); floatText(dv.x, cy - 18, 'ВРЕЗАЛИСЬ!', '#ff6a6a');
            sparks(dv.x, cy - 8, 14, ['#ffe14d', '#fff', '#ff9a3a', '#ff5a3a'], true);
            if (dv.hp <= 0) { dv.over = true; dv.endT = 0; mode = 'over'; lock = 0.7; events.push('over'); submit(); }
          }
        });
        if (!r.counted && r.y > cy + 34) { r.counted = true; dv.passed++; if (!r.hit) { score += 25; floatText(laneX(dv.lane), cy - 34, '+25', '#9fe8ff'); events.push('pass'); } }
      });
      dv.rows = dv.rows.filter(r => r.y < LH + 40);
      dv.coins.forEach(c => {
        c.y += sp * dt;
        if (!c.got && !dv.over && Math.abs(laneX(c.lane) - dv.x) < 12 && Math.abs(c.y - cy) < 14) { c.got = true; score += 5; events.push('coin'); floatText(laneX(c.lane), cy - 26, '+5', '#ffe14d'); }
      });
      dv.coins = dv.coins.filter(c => c.y < LH + 20 && !c.got);
      if (!dv.over && dv.passed >= GOAL && !dv.goalShown) { dv.goalShown = true; dv.endT = 0; banner = 'УШЛИ! ПОГОНЯ ОТСТАЛА'; bannerT = 2.5; events.push('win'); }
      if (dv.goalShown && !dv.over) { dv.endT += dt; if (dv.endT > 1.8) { score += dv.hp * 50; dv.over = true; mode = 'win'; lock = 0.7; submit(); } }
    }

    function update(dt) {
      t += dt; if (lock > 0) lock -= dt;
      if (shake > 0) shake -= dt;
      if (hitStop > 0) { hitStop -= dt; return; }
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; });
      parts = parts.filter(p => p.life > 0);
      floats.forEach(f => { f.y -= 22 * dt; f.life -= dt; }); floats = floats.filter(f => f.life > 0);
      if (mode === 'play') updateFight(dt);
      else if (mode === 'cut') { updateCut(dt); }
      else if (mode === 'drive') updateDrive(dt);
      else if (mode === 'over' || mode === 'win') {
        if (dv) { dv.road += dvSpeed() * 0.3 * dt; } else { es.forEach(e => { e.t += dt; }); }
      }
    }

    /* ================= ввод ================= */
    const hitRect = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    function layoutBtns() {
      const top = H - ctrlH, pad = 8;
      if (mode === 'drive' || (mode === 'over' && dv) || (mode === 'win' && dv)) {
        const bw = (W - pad * 4) / 3, bh = ctrlH - pad * 2;
        btns = [{ id: 'l0', label: '◀', sub: 'влево', x: pad, y: top + pad, w: bw, h: bh, tap: true }, { id: 'l1', label: '●', sub: 'центр', x: pad * 2 + bw, y: top + pad, w: bw, h: bh, tap: true }, { id: 'l2', label: '▶', sub: 'вправо', x: pad * 3 + bw * 2, y: top + pad, w: bw, h: bh, tap: true }];
        return;
      }
      const halfW = (W - pad * 3) / 2, rowH = (ctrlH - pad * 3) / 2, bw = (halfW - pad) / 2;
      btns = [
        { id: 'jump', label: '⤒ ПРЫЖОК', x: pad, y: top + pad, w: halfW, h: rowH, tap: true },
        { id: 'left', label: '◀', x: pad, y: top + pad * 2 + rowH, w: bw, h: rowH },
        { id: 'right', label: '▶', x: pad * 2 + bw, y: top + pad * 2 + rowH, w: bw, h: rowH },
        { id: 'dash', label: '💨 ПЕРЕКАТ', x: pad * 2 + halfW, y: top + pad, w: halfW, h: rowH, tap: true },
        { id: 'hit', label: '👊', x: pad * 2 + halfW, y: top + pad * 2 + rowH, w: bw, h: rowH, tap: true },
        { id: 'heavy', label: '🦵', x: pad * 3 + halfW + bw, y: top + pad * 2 + rowH, w: bw, h: rowH, tap: true }
      ];
    }
    const KEYLBL = { jump: 'Пробел', left: 'A', right: 'D', dash: 'Q', hit: 'J', heavy: 'K', l0: '←', l1: 'S', l2: '→' };
    function act(id) {
      if (id === 'jump') playerJump(); else if (id === 'dash') playerDash(); else if (id === 'hit') playerAttack('hit'); else if (id === 'heavy') playerAttack('heavy');
      else if (id[0] === 'l') setLane(+id[1]);
    }
    function onDown(e) {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mode === 'title') {
        const c = cards.findIndex(q => hitRect(x, y, q)); if (c >= 0) { startGame(c); } else startGame();
        return;
      }
      if ((mode === 'over' || mode === 'win') && lock <= 0) { if (mode === 'over' && dv) { score = checkScore; startDrive(); } else restart(); return; }
      if (mode === 'drive') {
        const b = btns.find(q => hitRect(x, y, q)); if (b) { act(b.id); return; }
        if (y < H - ctrlH) setLane(Math.floor(clamp((x - ox) / (LW * u), 0, 0.999) * 3));
        return;
      }
      if (mode !== 'play') return;
      const b = btns.find(q => hitRect(x, y, q));
      if (b) { if (b.tap) act(b.id); else { held[b.id] = (held[b.id] || 0) + 1; held['p' + e.pointerId] = b.id; } canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); return; }
      if (e.pointerType === 'mouse') { playerAttack(e.button === 2 ? 'heavy' : 'hit'); e.preventDefault(); }
    }
    function onUp(e) { const id = held['p' + e.pointerId]; if (id) { held[id] = Math.max(0, (held[id] || 1) - 1); delete held['p' + e.pointerId]; } }
    canvas.addEventListener('contextmenu', ev => ev.preventDefault());
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    function onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return; const down = e.type === 'keydown';
      const map = { KeyA: 'left', KeyD: 'right', ArrowLeft: 'left', ArrowRight: 'right' }, m = map[e.code];
      if (m) {
        e.preventDefault(); keys[m] = down;
        if (down && !e.repeat) {
          if (mode === 'drive') setLane(dv.lane + (m === 'left' ? -1 : 1));
          else if (mode === 'title') { sel = (sel + (m === 'left' ? 2 : 1)) % 3; }
        }
        return;
      }
      if (!down || e.repeat) return;
      if (mode === 'title') { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); startGame(); } else if (/^Digit[1-3]$/.test(e.code)) startGame(+e.code[5] - 1); return; }
      if ((mode === 'over' || mode === 'win')) { if ((e.code === 'Enter' || e.code === 'Space') && lock <= 0) { e.preventDefault(); if (mode === 'over' && dv) { score = checkScore; startDrive(); } else restart(); } return; }
      if (mode === 'drive') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') setLane(0); else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'KeyS' || e.code === 'ArrowDown' || e.code === 'Space') { e.preventDefault(); setLane(1); } else if (e.code === 'Digit3' || e.code === 'Numpad3') setLane(2);
        return;
      }
      if (mode !== 'play') return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); playerJump(); }
      else if (e.code === 'KeyQ' || e.code === 'ShiftLeft') playerDash();
      else if (e.code === 'KeyJ' || e.code === 'KeyZ') playerAttack('hit'); else if (e.code === 'KeyK' || e.code === 'KeyX') playerAttack('heavy');
    }
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);

    /* ================= звук ================= */
    let noiseBuf = null;
    function blip(f, dur, type, vol, delay, slide) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.05, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function noise(dur, vol, cut) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(), now = a.currentTime;
      s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = cut || 900; gn.gain.setValueAtTime(vol, now); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(now); s.stop(now + dur + 0.02);
    }
    function playEvents() {
      const ev = events; events = []; if (!cfg.sound) return;
      for (const e of ev) {
        if (e === 'swing') blip(320, 0.07, 'sawtooth', 0.025, 0, 130);
        else if (e === 'swingH') blip(220, 0.16, 'sawtooth', 0.04, 0, 70);
        else if (e === 'hit') { noise(0.08, 0.12, 1500); blip(150, 0.07, 'square', 0.05, 0, 70); }
        else if (e === 'ko') { noise(0.18, 0.2, 1200); blip(110, 0.25, 'sawtooth', 0.06, 0, 40); }
        else if (e === 'ouch') { blip(200, 0.2, 'square', 0.06, 0, 80); noise(0.1, 0.12, 700); }
        else if (e === 'smack') noise(0.06, 0.08, 2000);
        else if (e === 'clink') { blip(900, 0.05, 'square', 0.05); blip(600, 0.08, 'triangle', 0.04, 0.04); }
        else if (e === 'jump') blip(260, 0.12, 'square', 0.03, 0, 520);
        else if (e === 'dash') noise(0.12, 0.07, 3000);
        else if (e === 'throw') blip(500, 0.08, 'triangle', 0.04, 0, 250);
        else if (e === 'bell') { blip(1100, 0.3, 'sine', 0.05); blip(1650, 0.4, 'sine', 0.03, 0.04); }
        else if (e === 'heal') { blip(520, 0.1, 'triangle', 0.05); blip(780, 0.16, 'triangle', 0.05, 0.08); }
        else if (e === 'coin') { blip(988, 0.06, 'square', 0.04); blip(1319, 0.14, 'square', 0.04, 0.05); }
        else if (e === 'engine') { blip(70, 0.7, 'sawtooth', 0.05, 0, 160); }
        else if (e === 'swish') noise(0.08, 0.05, 2500);
        else if (e === 'pass') blip(700, 0.05, 'triangle', 0.025, 0, 900);
        else if (e === 'crash') { noise(0.4, 0.3, 900); blip(90, 0.3, 'sawtooth', 0.08, 0, 35); }
        else if (e === 'win') [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.2, 'square', 0.045, i * 0.12));
        else if (e === 'over') [330, 262, 196, 130].forEach((f, i) => blip(f, 0.25, 'sawtooth', 0.05, i * 0.16));
      }
    }

    /* ================= рисование (пиксели) ================= */
    function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }

    /* человек: (0,0) — центр ступней. o: skin, cloth, pants, hair, face, st, ph, atk{...}, flash, extras */
    function person(c, x, y, o) {
      c.save(); c.translate(Math.round(x), Math.round(y)); const s = o.scale || 1; if (s !== 1) c.scale(s, s);
      const f = o.face || 1, W_ = col => (o.flash > 0 ? '#ffffff' : col);
      const sk = W_(o.skin), cl = W_(o.cloth), pn = W_(o.pants), hr = W_(o.hair);
      if (o.st === 'dead') {
        const k = Math.min(1, (o.dt || 0) / 0.25);
        R(c, -11, -5 + 0, 22, 5, cl); R(c, -f * 11 - 3, -5, 6, 5, sk); R(c, f * 8, -4, 6, 3, pn); if (o.hair) R(c, -f * 11 - 3, -6, 3, 2, hr);
        c.restore(); return;
      }
      const walk = o.st === 'walk' ? Math.sin(o.ph) : 0, kick = o.st === 'heavy' || o.st === 'kick';
      const bob = o.st === 'walk' ? Math.abs(Math.sin(o.ph)) * 1 : 0;
      const rolling = o.st === 'dash';
      if (rolling) {   // перекат — клубок
        R(c, -6, -11, 12, 11, cl); R(c, -3 + f * 2, -13, 6, 6, sk); R(c, -4, -3, 8, 3, pn); c.restore(); return;
      }
      // ноги
      const l1 = Math.round(walk * 3), l2 = -l1;
      R(c, -3 + l1, -7 - bob, 3, 7, pn); R(c, 0 + l2, -7 - bob, 3, 7, pn);
      if (kick && o.atk) { const ext = Math.min(1, (o.stT || 0) / (o.atk.dur * 0.5)) * 10; R(c, f > 0 ? 2 : -2 - ext, -8, ext + 1, 3, pn); R(c, f > 0 ? 2 + ext : -2 - ext - 2, -9, 3, 5, '#222'); }
      // тело
      R(c, -4, -16 - bob, 8, 9, cl);
      if (o.tie) R(c, f > 0 ? 1 : -2, -15 - bob, 2, 6, W_(o.tie));
      if (o.cloth2) R(c, -4, -9 - bob, 8, 2, W_(o.cloth2));
      // голова
      R(c, -3, -23 - bob, 6, 7, sk); R(c, -3, -23 - bob, 6, 2, hr);
      R(c, f > 0 ? 1 : -2, -20 - bob, 1, 2, '#111');
      if (o.glasses) R(c, f > 0 ? 0 : -3, -21 - bob, 4, 1, '#111');
      if (o.shades) R(c, f > 0 ? 0 : -3, -21 - bob, 4, 2, '#000');
      if (o.cap) { R(c, -3, -25 - bob, 6, 3, W_(o.cap)); R(c, f > 0 ? 2 : -6, -23 - bob, 4, 1, W_(o.cap)); }
      if (o.hat) { R(c, -4, -24 - bob, 8, 1, '#111'); R(c, -3, -28 - bob, 6, 4, '#111'); R(c, -3, -25 - bob, 6, 1, '#d8b020'); }
      if (o.hair2) R(c, -4, -22 - bob, 1, 3, hr), R(c, 3, -22 - bob, 1, 3, hr);
      // руки/оружие
      let ext = 0;
      if (o.atk && (o.st === 'hit')) { const p = (o.stT || 0) / o.atk.dur; ext = p < 0.45 ? p / 0.45 * 4 : p < 0.7 ? 11 : 11 - (p - 0.7) / 0.3 * 8; }
      if (o.st === 'wind') ext = -3;
      if (o.st === 'act') ext = 11;
      const ay = -14 - bob;
      if (ext > 0 || o.st === 'wind') {
        R(c, f > 0 ? 3 + Math.min(0, ext) : -3 - Math.max(ext, 3) - (ext < 0 ? 0 : 0), ay, Math.max(3, Math.abs(ext)), 3, sk);
        if (o.baton) R(c, f > 0 ? 3 + Math.max(ext, 3) : -3 - Math.max(ext, 3) - 3, ay - 2, 3, 7, '#111');
        if (o.bag) R(c, f > 0 ? 3 + Math.max(ext, 3) : -3 - Math.max(ext, 3) - 7, ay - 1, 7, 6, '#7a4a2a');
      } else {
        R(c, f > 0 ? 2 : -4, ay, 2, 6, cl); R(c, f > 0 ? 2 : -4, ay + 5, 2, 2, sk);
        if (o.bag) R(c, f > 0 ? 2 : -5, ay + 6, 4, 5, '#7a4a2a');
        if (o.baton) R(c, f > 0 ? 3 : -5, ay + 4, 2, 8, '#111');
      }
      c.restore();
    }
    const personOf = (H_, extra) => Object.assign({ skin: H_.skin, cloth: H_.cloth, pants: H_.pants, hair: H_.hair, cap: H_.cap, bag: H_.bag, hair2: H_.id === 'tamara' }, extra || {});
    const enemyOf = (e) => { const D = e.D; return Object.assign({}, D.col, { face: e.face, st: e.st === 'hurt' ? 'idle' : e.st === 'throw' ? 'wind' : e.st, ph: e.ph, stT: e.t, flash: e.flash, scale: D.scale, tie: D.tie, glasses: D.glasses, shades: D.shades, cap: D.cap, hat: D.hat, baton: D.baton, atk: (e.st === 'act' ? { dur: D.act } : null), dt: e.t }); };

    function makeBg() {
      bg = document.createElement('canvas'); bg.width = LW; bg.height = LH; const c = bg.getContext('2d'), gy = ground();
      R(c, 0, 0, LW, LH, '#d8cfae');
      for (let y = 0; y < gy - 20; y += 6) R(c, 0, y, LW, 1, 'rgba(0,0,0,.05)');
      R(c, 0, gy - 24, LW, 24, '#8a6a3a'); R(c, 0, gy - 24, LW, 2, '#5a4020');   // панели стены
      for (let x = 4; x < LW; x += 14) R(c, x, gy - 21, 8, 16, '#7a5a2e');
      // вывеска
      const sw = Math.min(70, LW - 20), sx = Math.round(LW / 2 - sw / 2); R(c, sx - 2, 5, sw + 4, 22, '#4a3418'); R(c, sx, 7, sw, 18, '#f2c21a');
      c.fillStyle = '#4a3418'; c.font = '800 12px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('БАНК', LW / 2, 17);
      R(c, sx + 4, 24, 2, 3, '#c01820');
      // окна-кассы
      [0.18, 0.5, 0.82].forEach((k, i) => {
        const cx = Math.round(LW * k); R(c, cx - 14, gy - 58, 28, 30, '#5a4a38'); R(c, cx - 12, gy - 56, 24, 26, '#a8d0e0'); R(c, cx - 12, gy - 56, 24, 4, 'rgba(255,255,255,.4)');
        person(c, cx, gy - 30, { skin: '#f0c9a0', cloth: ['#c8508a', '#6aa0d0', '#8ac070'][i], pants: '#333', hair: ['#2a1a0a', '#a06a2a', '#222'][i], face: 1, st: 'idle', ph: 0, scale: 1 });
        R(c, cx - 15, gy - 32, 30, 6, '#6a4a22'); R(c, cx - 15, gy - 32, 30, 2, '#9a7a42');
      });
      // колонны
      [0.34, 0.66].forEach(k => { const cx = Math.round(LW * k); R(c, cx - 3, 0, 7, gy, '#efe8d0'); R(c, cx + 2, 0, 2, gy, '#b8ae90'); R(c, cx - 5, 0, 11, 3, '#c8bd9a'); R(c, cx - 5, gy - 3, 11, 3, '#c8bd9a'); });
      // хранилище справа
      const vx = LW - 22; R(c, vx - 4, gy - 52, 30, 52, '#555a62'); R(c, vx - 1, gy - 49, 24, 46, '#7a808a'); c.fillStyle = '#d8b020'; c.beginPath(); c.arc(vx + 11, gy - 26, 8, 0, 7); c.fill(); R(c, vx + 8, gy - 29, 6, 6, '#7a5a10'); R(c, vx + 3, gy - 28, 16, 1, '#7a5a10');
      // пол
      for (let y = gy, k = 0; y < LH; y += 8, k++) for (let x = (k % 2) * 8 - 8; x < LW; x += 16) R(c, x, y, 8, 8, '#cfc2a0'), R(c, x + 8, y, 8, 8, '#a8997a');
      R(c, 0, gy, LW, 1, 'rgba(0,0,0,.35)');
    }

    function drawFight() {
      const gy = ground();
      g.drawImage(bg, 0, 0);
      pickups.forEach(p => {
        const y = gy - p.h; if (p.kind === 'med') { R(g, p.x - 4, y - 7, 8, 7, '#f4f4f4'); R(g, p.x - 1, y - 6, 2, 5, '#d02020'); R(g, p.x - 3, y - 4, 6, 2, '#d02020'); }
        else { R(g, p.x - 6, y - 10, 12, 10, '#2e8a3a'); R(g, p.x - 4, y - 12, 8, 3, '#2e8a3a'); R(g, p.x - 1, y - 8, 2, 6, '#ffe14d'); R(g, p.x - 3, y - 6, 6, 2, '#ffe14d'); }
      });
      const all = es.map(e => ({ y: e.x, e })).concat([{ y: pl.x, p: 1 }]).sort((a, b) => a.y - b.y);
      all.forEach(o => {
        if (o.p) {
          if (mode === 'over' && !dv) { person(g, pl.x, gy, personOf(HEROES[hero], { st: 'dead', face: pl.face, dt: 1 })); return; }
          if (pl.inv > 0 && pl.st !== 'dash' && Math.floor(t * 20) % 2) return;
          g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(Math.round(pl.x - 5), gy + 1, 10, 2);
          person(g, pl.x, gy - pl.h, personOf(HEROES[hero], { face: pl.face, st: pl.st === 'heavy' ? 'heavy' : pl.st, ph: pl.ph, stT: pl.stT, atk: pl.atk, flash: pl.flash }));
        } else {
          const e = o.e; const sc = e.D.scale || 1;
          g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(Math.round(e.x - 5 * sc), gy + 1, 10 * sc, 2);
          person(g, e.x, gy - e.h, enemyOf(e));
          if (e.st !== 'dead' && !e.D.boss) { const bw = 12; R(g, e.x - bw / 2, gy - 30 - 2, bw, 2, '#300'); R(g, e.x - bw / 2, gy - 32, Math.max(0, Math.round(bw * e.hp / e.max)), 2, '#e63a2e'); }
          if (e.st === 'wind') { R(g, e.x - 1, gy - 28 * sc - 6, 2, 4, '#ff3a2a'); R(g, e.x - 1, gy - 28 * sc - 1, 2, 1, '#ff3a2a'); }
        }
      });
      projs.forEach(p => {
        if (p.kind === 'doc') { R(g, p.x - 3, gy - p.h - 4, 6, 7, '#fff'); R(g, p.x - 2, gy - p.h - 2, 4, 1, '#999'); R(g, p.x - 2, gy - p.h, 3, 1, '#999'); }
        else { R(g, p.x - 3, gy - p.h - 3, 6, 6, '#c8961a'); R(g, p.x - 2, gy - p.h - 2, 4, 4, '#ffe14d'); R(g, p.x - 1, gy - p.h - 1, 1, 2, '#9a6a08'); }
      });
      parts.forEach(p => R(g, p.x, p.y, 2, 2, p.col));
    }

    function drawDrive() {
      const sp = dv.road, rw = LANEW * 3 + 10, rx = Math.round(LW / 2 - rw / 2);
      R(g, 0, 0, LW, LH, '#3f9a48');
      for (let y = -16; y < LH + 16; y += 16) { const yy = Math.round(y + (sp * 0.6 % 16)); for (let x = (Math.floor((y + 16) / 16) % 2) * 8; x < LW; x += 16) R(g, x, yy, 2, 2, '#35893e'); }
      // деревья/вывески по обочинам
      for (let k = -1; k < 8; k++) {
        const yy = Math.round(((k * 56 + sp * 0.9) % (LH + 60))) - 30;
        [0, 1].forEach(sd => {
          const sx = sd ? rx + rw + 10 + ((k * 37) % 9) : rx - 18 - ((k * 29) % 9);
          if (sx < 2 || sx > LW - 14) return;
          if ((k + sd) % 3 === 0) { R(g, sx + 4, yy + 12, 3, 6, '#5a3a1a'); R(g, sx, yy, 11, 14, '#1f6a2a'); R(g, sx + 2, yy - 3, 7, 5, '#2a8a36'); }
          else if ((k + sd) % 3 === 1) { R(g, sx + 5, yy + 5, 2, 10, '#555'); R(g, sx, yy, 12, 7, '#f2c21a'); R(g, sx + 1, yy + 1, 10, 1, '#4a3418'); }
          else { R(g, sx + 2, yy + 6, 7, 6, '#7a7a7a'); R(g, sx + 3, yy + 3, 5, 4, '#9a9a9a'); }
        });
      }
      R(g, rx, 0, rw, LH, '#4a4d55'); R(g, rx, 0, 3, LH, '#d8d8d8'); R(g, rx + rw - 3, 0, 3, LH, '#d8d8d8'); R(g, rx + 3, 0, 1, LH, '#2a2c32'); R(g, rx + rw - 4, 0, 1, LH, '#2a2c32');
      const off0 = Math.round(sp % 24);
      for (let y = -24; y < LH + 24; y += 24) { [1, 2].forEach(l => R(g, Math.round(LW / 2) + (l - 1.5) * LANEW - 1, y + off0, 2, 12, '#e8e8e0')); }
      // монеты
      dv.coins.forEach(c => { const x = laneX(c.lane); R(g, x - 4, c.y - 4, 8, 8, '#c8961a'); R(g, x - 3, c.y - 3, 6, 6, '#ffe14d'); R(g, x - 1, c.y - 2, 2, 4, '#9a6a08'); });
      // подсказки: свободные полосы
      dv.rows.forEach(r => {
        if (r.y < 0 && !dv.over) { const a = Math.min(1, (-r.y) / 20); if (!r.counted) for (let l = 0; l < 3; l++) { if (r.free.includes(l)) { g.globalAlpha = 0.9; R(g, laneX(l) - 1, 4, 2, 5, '#5ad06a'); R(g, laneX(l) - 3, 6, 6, 1, '#5ad06a'); R(g, laneX(l) - 2, 7, 4, 1, '#5ad06a'); R(g, laneX(l) - 1, 8, 2, 1, '#5ad06a'); g.globalAlpha = 1; } else if (Math.floor(t * 8) % 2) R(g, laneX(l) - 1, 3, 2, 5, '#ff4a3a'), R(g, laneX(l) - 1, 9, 2, 2, '#ff4a3a'); } }
        r.cars.forEach(c => { drawCar(laneX(c.lane) + c.ox, r.y, c.col, c.truck, false, c.vx !== 0 && Math.abs(c.vx) > 20); });
      });
      // полиция сзади
      const gap = (cfg.carLives - dv.hp);
      const py = LH + 4 - Math.min(cfg.carLives, gap + 0.0) * (cfg.carLives > 1 ? 40 / (cfg.carLives) : 0) - (dv.passed >= GOAL ? -40 : 0);
      if (dv.hp < cfg.carLives || (dv.passed < 3)) { const flash = Math.floor(dv.sirens * 7) % 2; drawCar(Math.round(LW / 2) + (flash ? -6 : 6) * 0, py + (dv.passed < 3 ? 0 : 0), '#f4f4f4', false, true, false, flash); }
      // игрок
      if (!(dv.inv > 0 && Math.floor(t * 18) % 2)) drawCar(dv.x + (dv.crashT > 0 ? Math.sin(t * 60) * 1.5 : 0), carY(), '#f2c21a', false, false, false, 0, true, (laneX(dv.lane) - dv.x) / 14);
      parts.forEach(p => R(g, p.x, p.y, 2, 2, p.col));
    }
    function drawCar(x, y, col, truck, police, spin, flash, player, lean) {
      x = Math.round(x); y = Math.round(y);
      const hh = truck ? 17 : 13, w = truck ? 9 : 8;
      R(g, x - w - 1, y - hh + 2, 3, 6, '#111'); R(g, x + w - 2, y - hh + 2, 3, 6, '#111'); R(g, x - w - 1, y + hh - 8, 3, 6, '#111'); R(g, x + w - 2, y + hh - 8, 3, 6, '#111');
      R(g, x - w, y - hh, w * 2, hh * 2, col);
      R(g, x - w, y - hh, w * 2, 2, 'rgba(255,255,255,.35)');
      if (truck) { R(g, x - w + 1, y - hh + 8, w * 2 - 2, hh * 2 - 9, '#e8e0d0'); R(g, x - w + 1, y - hh + 2, w * 2 - 2, 5, '#9ad0e8'); R(g, x - w + 1, y - hh + 12, w * 2 - 2, 1, '#b8b0a0'); }
      else {
        R(g, x - w + 2, y - hh + 5, w * 2 - 4, 6, '#9ad0e8'); R(g, x - w + 2, y + 2, w * 2 - 4, 5, '#7ab0c8'); R(g, x - w + 1, y - 1, w * 2 - 2, 3, col);
        R(g, x - w + 1, y - hh + 1, 3, 2, '#fff7b0'); R(g, x + w - 4, y - hh + 1, 3, 2, '#fff7b0'); R(g, x - w + 1, y + hh - 2, 3, 2, '#ff4a3a'); R(g, x + w - 4, y + hh - 2, 3, 2, '#ff4a3a');
      }
      if (player) { R(g, x - 4, y + 4, 8, 5, '#2e8a3a'); R(g, x - 1, y + 5, 2, 3, '#ffe14d'); }
      if (police) { R(g, x - w, y - hh, w * 2, 3, '#111'); R(g, x - w, y - hh + 3, w, 2, '#2a5ad8'); R(g, x, y - hh + 3, w, 2, '#d82a2a'); R(g, x - 5, y - hh - 3, 4, 3, flash ? '#3a6aff' : '#222'); R(g, x + 1, y - hh - 3, 4, 3, flash ? '#222' : '#ff3a3a'); }
    }

    /* ================= overlay ================= */
    function scene() {
      g.fillStyle = '#000'; g.fillRect(0, 0, LW, LH);
      if (dv && (mode === 'drive' || ((mode === 'over' || mode === 'win')))) drawDrive();
      else drawFight();
      if (floats.length) floats.forEach(f => { /* текст рисуем в overlay */ });
    }
    function hpBar(x, y, w, h, v, max, col, lab) {
      ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#3a1218'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, w * v / max), h);
      if (lab) { ctx.fillStyle = '#fff'; ctx.font = '800 ' + mono(Math.max(10, h - 3)); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab, x + 4, y + h / 2 + 1); }
    }
    function drawCardPortrait(i, x, y, size) {
      const pv = document.createElement('canvas'); pv.width = 24; pv.height = 30; const c = pv.getContext('2d'); person(c, 12, 29, personOf(HEROES[i], { face: 1, st: 'idle', ph: 0 }));
      ctx.imageSmoothingEnabled = false; const k = Math.floor(size / 30); ctx.drawImage(pv, 0, 0, 24, 30, Math.round(x - 12 * k), Math.round(y), 24 * k, 30 * k);
    }
    function overlay() {
      const fs = clamp(Math.round(W / 30), 11, 15), kbd = !('ontouchstart' in window) && matchMedia('(pointer:fine)').matches;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // подписи над героями
      floats.forEach(f => { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = '800 ' + mono(Math.max(10, u * 3.4)); ctx.fillStyle = f.col; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; const px = ox + f.x * u, py = f.y * u; ctx.strokeText(f.s, px, py); ctx.fillText(f.s, px, py); ctx.globalAlpha = 1; });
      // кнопки
      if (mode === 'play' || mode === 'drive') {
        for (const b of btns) {
          const down = b.id === 'left' || b.id === 'right' ? (held[b.id] > 0 || keys[b.id]) : (dv && b.id === 'l' + dv.lane);
          ctx.fillStyle = down ? 'rgba(255,200,90,.55)' : 'rgba(255,255,255,.12)'; ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(Math.min(b.h * 0.42, b.w > W * 0.3 && b.id.length > 2 && b.id[0] !== 'l' ? fs + 2 : 34)); ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + (b.sub || kbd ? -6 : 0));
          if (b.sub) { ctx.font = '700 ' + mono(fs); ctx.fillStyle = '#ffd98a'; ctx.fillText(b.sub + (kbd ? ' (' + KEYLBL[b.id] + ')' : ''), b.x + b.w / 2, b.y + b.h / 2 + 22); }
          else if (kbd) { ctx.font = '700 ' + mono(Math.max(10, fs - 2)); ctx.fillStyle = '#ffd98a'; ctx.fillText('(' + KEYLBL[b.id] + ')', b.x + b.w / 2, b.y + b.h - 11); }
        }
      }
      const outlined = (s, x, y) => { ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(s, x, y); ctx.fillText(s, x, y); };
      if (mode === 'play' || mode === 'cut') {
        hpBar(10, 10, Math.min(150, W * 0.4), 14, pl.hp, pl.max, '#e63a2e', HEROES[hero].name);
        ctx.font = '800 ' + mono(fs + 2); ctx.fillStyle = '#ffd23a'; ctx.textAlign = 'right'; outlined('Очки: ' + score, W - 10, 18); ctx.textAlign = 'center';
        ctx.font = '700 ' + mono(fs - 1); ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; outlined('Волна ' + (wave + 1) + ' / ' + WAVES.length, W - 10, 38); ctx.textAlign = 'center';
        const boss = es.find(e => e.D.boss && e.st !== 'dead'); if (boss) { const bw = Math.min(W - 40, 320); hpBar((W - bw) / 2, 48, bw, 14, boss.hp, boss.max, '#d8b020', boss.D.name); }
      }
      if (mode === 'drive') {
        hpBar(10, 10, Math.min(120, W * 0.35), 14, dv.hp, cfg.carLives, '#5ad06a', 'Машина ' + dv.hp + '/' + cfg.carLives);
        ctx.font = '800 ' + mono(fs + 2); ctx.fillStyle = '#ffd23a'; ctx.textAlign = 'right'; outlined('Очки: ' + score, W - 10, 18); ctx.textAlign = 'center';
        ctx.font = '700 ' + mono(fs - 1); ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; outlined('Оторвались: ' + Math.min(dv.passed, GOAL) + ' / ' + GOAL, W - 10, 38); ctx.textAlign = 'center';
      }
      if (bannerT > 0 && (mode === 'play' || mode === 'cut' || mode === 'drive')) { ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = '800 ' + mono(Math.min(30, u * 6.5)); ctx.fillStyle = '#ffd23a'; outlined(banner, W / 2, H * 0.3); ctx.globalAlpha = 1; }
      const shade = a => { ctx.fillStyle = 'rgba(10,4,0,' + a + ')'; ctx.fillRect(0, 0, W, H); };
      if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')'; ctx.fillRect(0, 0, W, H); }
      if (mode === 'title') {
        shade(0.74); ctx.fillStyle = '#ffd23a'; ctx.font = '900 ' + mono(Math.min(44, W / 11)); outlined('ОБНАГЛЕВШИЙ БАНК', W / 2, H * 0.12);
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 1); ctx.fillText('Банк не отдаёт ваши деньги. Заберите их сами!', W / 2, H * 0.12 + fs * 2.6);
        ctx.fillStyle = '#9fd8ff'; ctx.fillText('Выберите героя — драка в банке, потом погоня на машине', W / 2, H * 0.12 + fs * 4.4);
        const n = 3, gap = 10, cw = Math.min(Math.floor((W - gap * 4) / n), 170), ch = Math.min(H * 0.42, 210), x0 = (W - (cw * n + gap * (n - 1))) / 2, y0 = H * 0.12 + fs * 6.4;
        cards = [];
        HEROES.forEach((h, i) => {
          const x = x0 + i * (cw + gap); cards.push({ x, y: y0, w: cw, h: ch });
          ctx.fillStyle = i === sel ? 'rgba(255,210,58,.28)' : 'rgba(255,255,255,.08)'; ctx.fillRect(x, y0, cw, ch); ctx.strokeStyle = i === sel ? '#ffd23a' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y0 + 1, cw - 2, ch - 2);
          drawCardPortrait(i, x + cw / 2, y0 + 8, Math.min(ch * 0.42, 90));
          const ty = y0 + 8 + Math.floor(Math.min(ch * 0.42, 90) / 30) * 30 + 12;
          ctx.fillStyle = '#fff'; ctx.font = '800 ' + mono(fs); ctx.fillText(h.name, x + cw / 2, ty);
          ctx.font = '700 ' + mono(fs - 2); ctx.fillStyle = '#ffd98a'; ctx.fillText('♥ ' + Math.round(h.hp * 100) + '%  ⚔ ' + Math.round(h.dmg * 100) + '%  ➜ ' + Math.round(h.spd * 100) + '%', x + cw / 2, ty + fs * 1.5);
          ctx.fillStyle = '#ddd'; ctx.font = '600 ' + mono(fs - 2); wrapText(h.note, x + cw / 2, ty + fs * 3.1, cw - 12, fs * 1.25);
          if (kbd) { ctx.fillStyle = '#9fd8ff'; ctx.fillText('нажмите ' + (i + 1), x + cw / 2, y0 + ch - 10); }
        });
        ctx.fillStyle = '#fff'; ctx.font = '600 ' + mono(fs - 1); const ly = y0 + ch + fs * 2;
        ctx.fillText(kbd ? 'Бой: A/D ходить · Пробел прыжок · J/ЛКМ удар · K/ПКМ нога · Q перекат' : 'Бой: ◀ ▶ ходить · ⤒ прыжок · 👊 🦵 удары · 💨 перекат', W / 2, ly);
        ctx.fillText(kbd ? 'Погоня: ← → или A/D меняют полосу · S — в центр · 1·2·3 — напрямую' : 'Погоня: жмите ◀ ● ▶ или тапайте по дороге — влево, центр, вправо', W / 2, ly + fs * 1.6);
        ctx.fillStyle = '#ffd23a'; ctx.font = '800 ' + mono(fs + 1); ctx.fillText('Тапните по герою, чтобы начать', W / 2, ly + fs * 3.4);
      }
      if (mode === 'over') {
        shade(0.62); ctx.fillStyle = '#ff5a5a'; ctx.font = '900 ' + mono(Math.min(34, u * 8)); outlined(dv ? 'ВАС ДОГНАЛИ' : 'БАНК ПОБЕДИЛ', W / 2, H * 0.3);
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 2); ctx.fillText('очки: ' + score + ' · побеждено: ' + kills, W / 2, H * 0.4);
        if (dv) ctx.fillText('оторвались от погони: ' + dv.passed + ' из ' + GOAL, W / 2, H * 0.4 + fs * 2);
        ctx.fillStyle = '#9fd8ff'; ctx.fillText(dv ? 'нажмите — повторить погоню' : 'нажмите — выбрать героя и снова в бой', W / 2, H * 0.4 + fs * 4.2);
      }
      if (mode === 'win') {
        shade(0.6); ctx.fillStyle = '#ffd23a'; ctx.font = '900 ' + mono(Math.min(34, u * 8)); outlined('ДЕНЬГИ ВЕРНУЛИСЬ!', W / 2, H * 0.3);
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 2); ctx.fillText('очки: ' + score + ' · целых жизней машины: ' + dv.hp, W / 2, H * 0.4);
        ctx.fillStyle = '#9fd8ff'; ctx.fillText('нажмите, чтобы сыграть ещё раз', W / 2, H * 0.4 + fs * 2.4);
      }
    }
    function wrapText(s, x, y, maxW, lh) {
      const words = s.split(' '); let line = '', yy = y;
      words.forEach(w => { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = test; });
      if (line) ctx.fillText(line, x, yy);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0d0a08'; ctx.fillRect(0, 0, W, H);
      scene();
      ctx.imageSmoothingEnabled = false;
      const sx = shake > 0 ? Math.round(Math.sin(t * 90) * u * 0.8) : 0;
      ctx.drawImage(off, 0, 0, LW, LH, ox + sx, 0, LW * u, LH * u);
      overlay();
    }
    let lastLay = '';
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctrlH = Math.round(Math.max(150, Math.min(240, H * 0.28)));
      u = Math.max(2, Math.floor(Math.min(W / 116, (H - ctrlH) / 150)));
      LW = Math.min(Math.ceil(W / u), 160); ox = Math.floor((W - LW * u) / 2); LH = Math.ceil((H - ctrlH) / u);
      off = document.createElement('canvas'); off.width = LW; off.height = LH; g = off.getContext('2d');
      makeBg(); layoutBtns();
      if (pl) pl.x = Math.min(pl.x, LW - 8);
      if (dv) dv.x = laneX(dv.lane);
    }
    function frame(ts) {
      if (!on) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
      if (!paused) { update(dt); playEvents(); }
      const key = mode + ((mode === 'drive' || (dv && (mode === 'over' || mode === 'win'))) ? 'D' : 'F'); if (key !== lastLay) { lastLay = key; layoutBtns(); }
      draw(); raf = requestAnimationFrame(frame);
    }
    resize(); restart(); layoutBtns();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); },
      debug: { update, startGame, startDrive, setLane, attack: playerAttack, jump: playerJump, dash: playerDash, spawn, hurtEnemy,
        get mode() { return mode; }, get wave() { return wave; }, get pl() { return pl; }, get es() { return es; }, get dv() { return dv; }, get score() { return score; }, get kills() { return kills; }, get projs() { return projs; }, get pickups() { return pickups; },
        set left(v) { keys.left = !!v; }, set right(v) { keys.right = !!v; } }
    };
  }
});
