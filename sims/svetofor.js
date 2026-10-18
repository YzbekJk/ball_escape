/* Игра «Светофор» (пиксель-арт файтинг): кровавый магазин, в котором ты отбиваешься битой от монстров.
   Десять волн: зомби-кассиры, колбасные ползуны, тележки-тараны, консервные голем и боссы «Мясник» (5-я и 10-я волны).
   После каждой второй волны выпадает зелёный плюс — он лечит.
   Компьютер: A/D — ходить, Пробел — прыжок, ЛКМ — удар битой, ПКМ — удар ногой (только им убиваются розовые ползуны), Q — перекат (неуязвимость). */
Sims.register({
  id: 'svetofor',
  kind: 'game',
  hit: true, ownSpace: true,
  title: 'Светофор',
  desc: 'Пиксельный файтинг. Магазин «Светофор» кишит монстрами — зомби-кассиры, колбасные ползуны, тележки-тараны, консервный голем. Отбивайтесь битой, прыгайте, перекатывайтесь и дойдите до босса. Компьютер: A/D — ходить, Пробел — прыжок, ЛКМ — удар битой, ПКМ — удар ногой, Q — перекат. Розовых ползунов бита не берёт — их можно убить только ногой.',

  lb: { label: 'Очки (убийства монстров + бонус за победу)', better: 'high', fair: ['playerHp', 'enemyPower', 'maxAlive'], fmt: v => v + ' оч.' },
  defaults: { playerHp: 100, enemyPower: 1, maxAlive: 4, blood: true, sound: true, music: true, musicStart: 9, volume: 0.7 },
  schema: [
    { k: 'playerHp', l: 'Ваше здоровье', min: 40, max: 300, step: 10 },
    { k: 'enemyPower', l: 'Сила монстров ×', min: 0.3, max: 3, step: 0.1, live: 1 },
    { k: 'maxAlive', l: 'Сколько монстров одновременно', min: 1, max: 8, step: 1, live: 1 },
    { k: 'blood', l: 'Кровь', type: 'check', live: 1 },
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'musicStart', l: 'С какой секунды трека начинать', min: 0, max: 90, step: 0.5, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#2a1418'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3d1c22'; ctx.fillRect(0, h * 0.25, w, h * 0.4);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = ['#e63a2e', '#f2c21a', '#3ab04a', '#e8e0d0'][i % 4]; ctx.fillRect(w * 0.04 + i * w * 0.08, h * 0.32 + (i % 3) * h * 0.08, w * 0.05, h * 0.07); }
    ctx.fillStyle = '#1c1014'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = '#b3121a'; ctx.fillRect(w * 0.1, h * 0.8, w * 0.18, h * 0.05); ctx.fillRect(w * 0.55, h * 0.86, w * 0.14, h * 0.04);
    const cs = ['#e63a2e', '#f2c21a', '#3ab04a'];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = cs[i]; ctx.beginPath(); ctx.arc(w * 0.38 + i * w * 0.12, h * 0.15, h * 0.06, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#f0c9a0'; ctx.fillRect(w * 0.22, h * 0.4, h * 0.1, h * 0.1); ctx.fillStyle = '#3a6fd8'; ctx.fillRect(w * 0.21, h * 0.5, h * 0.12, h * 0.16); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(w * 0.33, h * 0.38, w * 0.02, h * 0.2);
    ctx.fillStyle = '#6fae4a'; ctx.fillRect(w * 0.64, h * 0.42, h * 0.1, h * 0.1); ctx.fillStyle = '#7a3030'; ctx.fillRect(w * 0.63, h * 0.52, h * 0.12, h * 0.14); ctx.fillStyle = '#d33'; ctx.fillRect(w * 0.665, h * 0.45, h * 0.02, h * 0.02);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const F = 2;
    const rnd = (a, b) => a + Math.random() * (b - a);

    /* ================= монстры ================= */
    const DEFS = {
      zombie:  { name: 'Зомби-кассир', pts: 10, hp: 32, spd: 19, reach: 15, wind: 0.6, act: 0.14, dmg: 8, rec: 0.7 },
      crawler: { name: 'Колбасный ползун', pts: 12, kickOnly: true, hp: 14, spd: 40, reach: 11, wind: 0.4, act: 0.3, dmg: 6, rec: 0.9, leap: true },
      cart:    { name: 'Тележка-таран', pts: 20, hp: 46, spd: 22, reach: 0, wind: 0.85, act: 0.7, dmg: 14, rec: 1.0, charge: true },
      golem:   { name: 'Консервный голем', pts: 50, hp: 150, spd: 13, reach: 24, wind: 0.9, act: 0.22, dmg: 20, rec: 1.0, armor: true },
      butcher: { name: 'МЯСНИК', pts: 300, hp: 440, spd: 21, reach: 28, wind: 0.6, act: 0.2, dmg: 18, rec: 0.8, armor: true, boss: true }
    };
    DEFS.butcher2 = Object.assign({}, DEFS.butcher, { name: 'МЯСНИК-МУТАНТ', hp: 700, pts: 500, dmg: 22, spd: 25 });
    const WAVES = [
      ['zombie', 'zombie', 'zombie', 'zombie'],
      ['zombie', 'crawler', 'zombie', 'crawler', 'crawler', 'zombie'],
      ['cart', 'zombie', 'crawler', 'cart', 'zombie', 'crawler', 'zombie'],
      ['golem', 'zombie', 'cart', 'crawler', 'zombie', 'crawler', 'cart'],
      ['butcher', 'zombie', 'crawler', 'zombie', 'crawler'],
      ['zombie', 'crawler', 'crawler', 'cart', 'zombie', 'crawler', 'zombie', 'cart'],
      ['golem', 'crawler', 'crawler', 'zombie', 'zombie', 'cart', 'crawler', 'zombie'],
      ['cart', 'cart', 'golem', 'crawler', 'crawler', 'zombie', 'zombie', 'crawler', 'zombie'],
      ['golem', 'golem', 'cart', 'crawler', 'crawler', 'crawler', 'zombie', 'zombie', 'cart', 'zombie'],
      ['butcher2', 'golem', 'cart', 'crawler', 'zombie', 'crawler', 'cart', 'zombie']
    ];

    /* ================= состояние ================= */
    let score, mode, wave, spawnQ, spawnT, pl, es, parts, floats, projs, pickups, shake, t, events, held, keys, banner, bannerT, kills, runT, hitStop, waveWait, flashR;
    let paused = false, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, u = 3, LW = 130, LH = 200, ctrlH = 200, off, g, dec, dg, btns = [];
    const ground = () => Math.round(LH * 0.8);

    function newPlayer() { return { x: Math.round(LW * 0.5), h: 0, vy: 0, vx: 0, hp: cfg.playerHp, max: cfg.playerHp, face: 1, st: 'idle', stT: 0, cd: 0, inv: 0, flash: 0, dashCd: 0, hitDone: false, atk: null }; }
    function restart() {
      mode = 'title'; wave = -1; spawnQ = []; spawnT = 0; pl = newPlayer(); es = []; parts = []; floats = []; projs = []; pickups = [];
      shake = 0; t = 0; events = []; held = {}; keys = {}; banner = ''; bannerT = 0; kills = 0; score = 0; runT = 0; hitStop = 0; waveWait = 0; flashR = 0;
      if (dec) { dg.clearRect(0, 0, dec.width, dec.height); }
    }
    function submit() { if (ctl.submitScore && score > 0) ctl.submitScore(score); }
    function startGame() { mode = 'play'; pl = newPlayer(); es = []; parts = []; floats = []; projs = []; pickups = []; kills = 0; score = 0; runT = 0; startWave(0); }
    function startWave(i) {
      wave = i; spawnQ = WAVES[i].slice(); spawnT = 1.2; waveWait = 0;
      banner = WAVES[i][0].startsWith('butcher') ? (WAVES[i][0] === 'butcher2' ? 'ФИНАЛ: МЯСНИК-МУТАНТ!' : 'БОСС: МЯСНИК!') : 'ВОЛНА ' + (i + 1) + ' / ' + WAVES.length; bannerT = 1.8; events.push('bell');
    }
    function spawn(type) {
      const D = DEFS[type], side = Math.random() < 0.5 ? -1 : 1;
      es.push({ type, D, x: side < 0 ? -8 : LW + 8, h: 0, vy: 0, vx: 0, hp: Math.round(D.hp * (D.boss ? 1 : 1 + wave * 0.05)), max: Math.round(D.hp * (D.boss ? 1 : 1 + wave * 0.05)), face: -side, st: 'walk', t: 0, cd: rnd(0.4, 1.2), flash: 0, hitDone: false, ph: Math.random() * 6, stun: 0, dir: side });
    }

    /* ================= эффекты ================= */
    function floatText(x, y, s, col) { floats.push({ x, y, s, col, life: 0.8 }); }
    function splat(x, y, n, big) {
      if (!cfg.blood) { for (let i = 0; i < Math.min(n, 4); i++) parts.push({ x, y, vx: rnd(-40, 40), vy: rnd(-60, -10), life: 0.35, col: '#d9d9d9', chunk: 0 }); return; }
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-70, 70) * (big ? 1.4 : 1), vy: rnd(-110, -15), life: rnd(0.6, 1.2), col: Math.random() < 0.3 ? '#7a0c12' : '#c0141c', blood: true, chunk: 0 });
      if (big) for (let i = 0; i < 6; i++) parts.push({ x, y, vx: rnd(-60, 60), vy: rnd(-120, -30), life: 1.4, col: ['#8a1a20', '#d9a08a', '#f0e8d8'][i % 3], blood: true, chunk: 1 });
    }
    function stain(x, y, w, col) { if (cfg.blood && dg) { dg.fillStyle = col || 'rgba(120,8,16,.75)'; dg.fillRect(Math.round(x * F), Math.round(y * F), Math.max(2, Math.round(w * F)), Math.max(1, Math.round(rnd(1, 2.4) * F))); } }

    /* ================= логика боя ================= */
    function playerAttack(kind) {
      if (mode !== 'play' || pl.cd > 0 || pl.st === 'hurt' || pl.st === 'dead' || pl.st === 'dash') return;
      const heavy = kind === 'heavy';
      pl.atk = heavy ? { dur: 0.5, reach: 34, dmg: 26, kb: 150, stun: true, hitAt: 0.55 } : { dur: 0.28, reach: 25, dmg: 11, kb: 70, stun: false, hitAt: 0.45 };
      pl.st = kind; pl.stT = 0; pl.hitDone = false; pl.cd = heavy ? 0.7 : 0.3; pl.vx = pl.face * (heavy ? 70 : 40); events.push(heavy ? 'swingH' : 'swing');
    }
    function playerJump() { if (mode === 'play' && pl.h <= 0 && pl.st !== 'hurt' && pl.st !== 'dead') { pl.vy = 160; events.push('jump'); } }
    function playerDash() {
      if (mode !== 'play' || pl.dashCd > 0 || pl.st === 'hurt' || pl.st === 'dead') return;
      const d = (held.left || keys.left) ? -1 : (held.right || keys.right) ? 1 : pl.face;
      pl.st = 'dash'; pl.stT = 0; pl.inv = 0.32; pl.dashCd = 0.8; pl.vx = d * 175; pl.atk = null; events.push('dash');
    }
    function hurtEnemy(e, dmg, kb, stun, kick) {
      if (e.st === 'dead') return;
      if (e.D.kickOnly && !kick) { floatText(e.x, ground() - e.h - 22, 'только ногой!', '#ff9ad0'); events.push('clink'); splat(e.x, ground() - e.h - 8, 0, false); e.vx = pl.face * 25; return; }
      e.hp -= dmg; e.flash = 0.12; hitStop = Math.max(hitStop, stun ? 0.07 : 0.035); shake = Math.max(shake, stun ? 0.14 : 0.07);
      floatText(e.x, ground() - e.h - 40 - (e.D.boss ? 14 : e.type === 'golem' ? 8 : 0), '-' + Math.round(dmg), '#ffe14d');
      splat(e.x, ground() - e.h - 20, e.D.armor ? 5 : 8, false); events.push(e.hp <= 0 ? 'splat' : 'hit');
      if (e.hp <= 0) {
        e.st = 'dead'; e.t = 0; kills++; score += e.D.pts; splat(e.x, ground() - e.h - 18, e.D.boss ? 60 : 24, true); stain(e.x - 8, ground() + 5 + Math.random() * 14, 14 + Math.random() * 10);
        if (!e.D.boss && Math.random() < 0.2) pickups.push({ x: e.x, h: 30, vy: 0, kind: 'can' });
        return;
      }
      const armored = e.D.armor && !stun;
      if (!armored || e.st === 'walk' || e.st === 'rec') { e.vx = kb * pl.face * (e.D.armor ? 0.25 : 1); }
      if (!armored && e.st !== 'hurt') { e.st = 'hurt'; e.t = 0; e.hitDone = false; }
    }
    function hurtPlayer(dmg, kbDir) {
      if (pl.inv > 0 || pl.st === 'dead') return false;
      dmg *= cfg.enemyPower; pl.hp = Math.max(0, pl.hp - dmg); pl.flash = 0.25; pl.inv = 0.45; pl.st = 'hurt'; pl.stT = 0; pl.atk = null; pl.vx = kbDir * 90;
      splat(pl.x, ground() - pl.h - 22, 9, false); stain(pl.x - 4, ground() + 6 + Math.random() * 12, 8 + Math.random() * 8); floatText(pl.x, ground() - pl.h - 44, '-' + Math.round(dmg), '#ff6a6a'); events.push('ouch'); shake = Math.max(shake, 0.22);
      if (pl.hp <= 0) { pl.st = 'dead'; mode = 'over'; events.push('over'); submit(); splat(pl.x, ground() - 20, 40, true); }
      return true;
    }

    function updatePlayer(dt) {
      if (pl.cd > 0) pl.cd -= dt; if (pl.flash > 0) pl.flash -= dt; if (pl.inv > 0) pl.inv -= dt; if (pl.dashCd > 0) pl.dashCd -= dt;
      pl.stT += dt;
      const dirx = (held.left || keys.left ? -1 : 0) + (held.right || keys.right ? 1 : 0);
      pl.x += pl.vx * dt; pl.vx *= Math.max(0, 1 - 8 * dt);
      if (pl.st === 'hurt') { if (pl.stT > 0.28) pl.st = 'idle'; }
      else if (pl.st === 'dash') { pl.vx = (pl.vx || 0) * 1; if (pl.stT > 0.28) pl.st = 'idle'; }
      else if (pl.st === 'hit' || pl.st === 'heavy') {
        if (!pl.hitDone && pl.stT >= pl.atk.dur * pl.atk.hitAt) {
          pl.hitDone = true; let any = false;
          for (const e of es) {
            if (e.st === 'dead') continue; const dx = (e.x - pl.x) * pl.face;
            if (dx > -6 && dx < pl.atk.reach + (e.D.boss ? 6 : 0) && Math.abs(e.h - pl.h) < 22) { hurtEnemy(e, pl.atk.dmg, pl.atk.kb, pl.atk.stun, pl.st === 'heavy'); any = true; }
          }
          if (!any) events.push('whiff');
        }
        if (pl.stT > pl.atk.dur) pl.st = 'idle';
      } else if (pl.st !== 'dead') {
        if (dirx) pl.face = dirx; pl.st = dirx ? 'walk' : 'idle'; pl.x += dirx * 54 * dt;
      }
      pl.x = Math.max(8, Math.min(LW - 8, pl.x));
      if (pl.h > 0 || pl.vy > 0) { pl.vy -= 540 * dt; pl.h += pl.vy * dt; if (pl.h <= 0) { pl.h = 0; pl.vy = 0; } }
    }

    function enemyAttackHit(e) {
      const D = e.D, dx = (pl.x - e.x) * e.face;
      if (D.charge) { if (Math.abs(pl.x - e.x) < 13 && pl.h < 12 && hurtPlayer(D.dmg, Math.sign(pl.x - e.x) || 1)) e.hitDone = true; return; }
      if (D.leap) { if (Math.abs(pl.x - e.x) < 11 && Math.abs(pl.h - e.h) < 16 && hurtPlayer(D.dmg, Math.sign(pl.x - e.x) || 1)) e.hitDone = true; return; }
      if (dx > -6 && dx < D.reach && pl.h < 18 && hurtPlayer(D.dmg, e.face)) e.hitDone = true;
    }
    function updateEnemy(e, dt) {
      const D = e.D; e.t += dt; if (e.flash > 0) e.flash -= dt;
      e.x += e.vx * dt; e.vx *= Math.max(0, 1 - 6 * dt);
      if (e.h > 0 || e.vy > 0) { e.vy -= 540 * dt; e.h += e.vy * dt; if (e.h <= 0) { e.h = 0; e.vy = 0; if (e.slam) { e.slam = false; shake = 0.3; events.push('slam'); stain(e.x - 8, ground() + 4, 20); if (Math.abs(pl.x - e.x) < 26 && pl.h < 14) hurtPlayer(D.dmg, Math.sign(pl.x - e.x) || 1); } } }
      if (e.st === 'dead') return;
      if (e.x > 8 && e.x < LW - 8) e.inside = true; else if (e.inside && !(D.charge && e.st === 'act')) e.x = Math.max(8, Math.min(LW - 8, e.x));
      const dist = Math.abs(pl.x - e.x), enr = e.hp < e.max * 0.5;
      if (e.st === 'hurt') { if (e.t > 0.3) { e.st = 'walk'; e.cd = rnd(0.5, 1); } return; }
      if (e.st === 'walk') {
        e.face = pl.x < e.x ? -1 : 1; e.cd -= dt;
        if (!e.inside) { e.x += (e.x < LW / 2 ? 1 : -1) * Math.max(D.spd, 30) * dt; e.face = e.x < LW / 2 ? 1 : -1; return; }
        const want = D.charge ? 70 : D.reach - 4;
        if (dist > want + 2 && !(D.boss && e.cd <= 0 && dist > 50)) e.x += e.face * D.spd * (enr ? 1.25 : 1) * dt;
        else if (e.cd <= 0 && pl.st !== 'dead') {
          e.act = D.boss ? (dist < 34 ? 'cleaver' : ['throw', 'slam'][Math.floor(Math.random() * 2)]) : 'melee';
          e.st = 'wind'; e.t = 0; e.hitDone = false; events.push('warn');
        }
      } else if (e.st === 'wind') {
        const wd = (e.act === 'throw' ? 0.55 : e.act === 'slam' ? 0.85 : D.wind) / (enr ? 1.15 : 1);
        if (e.t >= wd) {
          e.st = 'act'; e.t = 0; e.hitDone = false;
          if (D.charge) { e.cdir = pl.x < e.x ? -1 : 1; e.face = e.cdir; }
          if (D.leap) { e.vx = e.face * 120; e.vy = 105; }
          if (e.act === 'throw') projs.push({ x: e.x + e.face * 10, h: 6, vx: e.face * 85, vy: 0, life: 3 });
          if (e.act === 'slam') { e.vy = 190; e.vx = Math.max(-150, Math.min(150, (pl.x - e.x) * 1.5)); e.slam = true; }
        }
      } else if (e.st === 'act') {
        if (D.charge) { e.x += e.cdir * 150 * dt; if (!e.hitDone) enemyAttackHit(e); if (e.x < -12 || e.x > LW + 12) e.t = D.act; }
        else if (D.leap) { if (!e.hitDone) enemyAttackHit(e); }
        else if (e.act === 'melee' || e.act === 'cleaver') { if (!e.hitDone) enemyAttackHit(e); }
        if (e.t >= (e.act === 'slam' ? 0.9 : D.act)) { e.st = 'rec'; e.t = 0; }
      } else if (e.st === 'rec') {
        if (D.charge && (e.x < 6 || e.x > LW - 6)) e.x = Math.max(6, Math.min(LW - 6, e.x));
        if (e.t > D.rec * (enr ? 0.8 : 1)) { e.st = 'walk'; e.cd = rnd(0.6, 1.4) * (D.boss ? 0.8 : 1); }
      }
    }

    function update(dt) {
      t += dt; if (shake > 0) shake -= dt; if (bannerT > 0) bannerT -= dt;
      if (hitStop > 0) { hitStop -= dt; dt *= 0.05; }
      if (mode === 'play' || mode === 'over') {
        if (mode === 'play') runT += dt;
        updatePlayer(dt);
        for (const e of es) updateEnemy(e, dt);
        es = es.filter(e => e.st !== 'dead' || e.t < 1.2);
        const alive = es.filter(e => e.st !== 'dead');
        // separation: monsters do not stack
        for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) { const a = alive[i], b = alive[j], d = a.x - b.x; if (Math.abs(d) < 9 && a.st !== 'act' && b.st !== 'act') { const s = (d >= 0 ? 1 : -1) * 18 * dt; a.x += s; b.x -= s; } }
        if (mode === 'play') {
          if (spawnQ.length) { spawnT -= dt; if (spawnT <= 0 && alive.length < cfg.maxAlive) { spawn(spawnQ.shift()); spawnT = rnd(0.9, 1.7); } }
          else if (!alive.length) {
            if (waveWait === 0) { waveWait = 1; if (wave < WAVES.length - 1) { banner = 'ВОЛНА ОЧИЩЕНА'; bannerT = 1.4; if ((wave + 1) % 2 === 0) { pickups.push({ x: Math.round(rnd(LW * 0.25, LW * 0.75)), h: 70, vy: 0, kind: 'plus' }); banner = 'ВОЛНА ОЧИЩЕНА · ЗЕЛЁНЫЙ ПЛЮС!'; events.push('heal'); } } }
            waveWait += dt;
            if (waveWait > 2.6) { if (wave < WAVES.length - 1) startWave(wave + 1); else { mode = 'win'; score += 200; events.push('win'); submit(); } }
          }
        }
        for (const p of projs) { p.x += p.vx * dt; p.life -= dt; if (!p.dead && Math.abs(p.x - pl.x) < 7 && pl.h < 12 && hurtPlayer(10, Math.sign(p.vx))) p.dead = true; }
        projs = projs.filter(p => !p.dead && p.life > 0 && p.x > -10 && p.x < LW + 10);
        for (const k of pickups) { if (k.kind === 'plus') { k.h = Math.max(14, k.h - 90 * dt); } else { k.vy -= 400 * dt; k.h += k.vy * dt; if (k.h <= 0) { k.h = 0; k.vy = 0; } } if (!k.got && Math.abs(k.x - pl.x) < 9 && pl.h < 12 && pl.st !== 'dead') { k.got = true; const hv = k.kind === 'plus' ? Math.round(pl.max * 0.4) : 22; pl.hp = Math.min(pl.max, pl.hp + hv); floatText(pl.x, ground() - 56, '+' + hv + (k.kind === 'plus' ? ' лечение' : ' тушёнка'), '#6fe07a'); events.push('heal'); } }
        pickups = pickups.filter(k => !k.got);
      }
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt;
        if (p.blood && p.y > ground() + 4 && !p.landed) { p.landed = true; stain(p.x, p.y, p.chunk ? 3 : 2 + Math.random() * 3); p.life = 0; }
      }
      parts = parts.filter(p => p.life > 0);
      for (const f of floats) { f.y -= 18 * dt; f.life -= dt; } floats = floats.filter(f => f.life > 0);
    }

    /* ================= ввод ================= */
    function layoutBtns() {
      const top = H - ctrlH, pad = 8, halfW = (W - pad * 3) / 2, rowH = (ctrlH - pad * 3) / 2, bw = (halfW - pad) / 2;
      btns = [
        { id: 'jump', label: '⤒ ПРЫЖОК', x: pad, y: top + pad, w: halfW, h: rowH, tap: true },
        { id: 'left', label: '◀', x: pad, y: top + pad * 2 + rowH, w: bw, h: rowH },
        { id: 'right', label: '▶', x: pad * 2 + bw, y: top + pad * 2 + rowH, w: bw, h: rowH },
        { id: 'dash', label: '💨 ПЕРЕКАТ', x: pad * 2 + halfW, y: top + pad, w: halfW, h: rowH, tap: true },
        { id: 'hit', label: '🏏', x: pad * 2 + halfW, y: top + pad * 2 + rowH, w: bw, h: rowH, tap: true },
        { id: 'heavy', label: '🦵', x: pad * 3 + halfW + bw, y: top + pad * 2 + rowH, w: bw, h: rowH, tap: true }
      ];
    }
    const hitRect = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    function act(id) { if (id === 'jump') playerJump(); else if (id === 'dash') playerDash(); else if (id === 'hit') playerAttack('hit'); else if (id === 'heavy') playerAttack('heavy'); }
    function onDown(e) {
      musicTick();
      if (mode === 'title') { startGame(); return; }
      if (mode === 'over') { startGame(); return; }
      if (mode === 'win') { restart(); return; }
      if (mode !== 'play') return;
      if (e.pointerType === 'mouse') { playerAttack(e.button === 2 ? 'heavy' : 'hit'); e.preventDefault(); return; }
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, b = btns.find(q => hitRect(x, y, q)); if (!b) return;
      if (b.tap) act(b.id); else { held[b.id] = (held[b.id] || 0) + 1; held['p' + e.pointerId] = b.id; }
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function onUp(e) { const id = held['p' + e.pointerId]; if (id) { held[id] = Math.max(0, (held[id] || 1) - 1); delete held['p' + e.pointerId]; } }
    canvas.addEventListener('contextmenu', ev => ev.preventDefault());
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    function onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return; const down = e.type === 'keydown';
      const map = { KeyA: 'left', KeyD: 'right', ArrowLeft: 'left', ArrowRight: 'right' }, m = map[e.code];
      if (m) { keys[m] = down; e.preventDefault(); return; }
      if (!down || e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (mode === 'play') playerJump(); else if (mode !== 'play') { musicTick(); if (mode === 'win') restart(); else startGame(); } }
      else if (e.code === 'KeyQ' || e.code === 'ShiftLeft') playerDash();
      else if (e.code === 'KeyZ') playerAttack('hit'); else if (e.code === 'KeyX') playerAttack('heavy');
      else if (e.code === 'Enter' && mode !== 'play') { if (mode === 'win') restart(); else startGame(); }
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
        else if (e === 'clink') { blip(900, 0.05, 'square', 0.05); blip(600, 0.08, 'triangle', 0.04, 0.04); }
        else if (e === 'hit') { blip(160, 0.09, 'square', 0.08, 0, 60); noise(0.08, 0.1, 1400); }
        else if (e === 'splat') { noise(0.28, 0.2, 700); blip(110, 0.2, 'sawtooth', 0.07, 0, 40); }
        else if (e === 'ouch') { blip(150, 0.2, 'sawtooth', 0.09, 0, 55); noise(0.12, 0.1, 1000); }
        else if (e === 'warn') blip(700, 0.06, 'square', 0.04);
        else if (e === 'jump') blip(260, 0.12, 'square', 0.03, 0, 520);
        else if (e === 'dash') noise(0.16, 0.07, 2600);
        else if (e === 'slam') { blip(70, 0.3, 'triangle', 0.16, 0, 35); noise(0.25, 0.18, 500); }
        else if (e === 'heal') [660, 880, 1100].forEach((f, k) => blip(f, 0.09, 'square', 0.04, k * 0.06));
        else if (e === 'bell') [520, 780].forEach((f, k) => blip(f, 0.14, 'square', 0.05, k * 0.12));
        else if (e === 'over') [262, 220, 175, 131].forEach((f, k) => blip(f, 0.25, 'sawtooth', 0.06, k * 0.2));
        else if (e === 'win') [523, 659, 784, 1047, 1319].forEach((f, k) => blip(f, 0.16, 'square', 0.06, k * 0.1));
      }
    }
    const song = new Audio('assets/svetofor-track.mp3'); song.preload = 'auto';
    let songOn = false;
    function seekPlay() {
      const go = () => { try { song.currentTime = cfg.musicStart; } catch (er) {} const pr = song.play(); if (pr && pr.catch) pr.catch(() => { songOn = false; }); };
      if (song.readyState >= 1) go(); else { song.addEventListener('loadedmetadata', go, { once: true }); song.load(); }
    }
    function musicTick() {
      if (!cfg.music || paused) { if (songOn) { song.pause(); songOn = false; } return; }
      song.volume = Math.max(0, Math.min(1, cfg.volume));
      if (!songOn) { songOn = true; seekPlay(); return; }
      if (!song.paused && song.currentTime < cfg.musicStart - 0.25) { try { song.currentTime = cfg.musicStart; } catch (er) {} }
      if (song.ended || (song.duration && song.currentTime > song.duration - 0.2)) seekPlay();
    }

    /* ================= рисование ================= */
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * F), Math.round(y * F), Math.max(1, Math.round(w * F)), Math.max(1, Math.round(h * F))); };
    const fl = (e, c) => (e.flash > 0 && Math.floor(t * 40) % 2 === 0) ? '#fff' : c;

    function hero() {
      const cx = Math.round(pl.x), fy = ground() - pl.h, f = pl.face, st = pl.st, ph = Math.sin(t * 10);
      if (st === 'dead') { R(cx - 14, fy - 7, 12, 7, '#3a6fd8'); R(cx - 2, fy - 7, 8, 6, '#2a3350'); R(cx - 20, fy - 8, 8, 8, '#f0c9a0'); R(cx - 20, fy - 9, 8, 3, '#432a1a'); return; }
      const fh = pl.flash > 0 && Math.floor(t * 30) % 2 === 0, sk = fh ? '#fff' : '#f0c9a0', top = fh ? '#fff' : '#3a6fd8', pants = fh ? '#fff' : '#2a3350';
      if (st === 'dash') { R(cx - f * 12, fy - 22, 22, 3, 'rgba(255,255,255,.35)'); R(cx - f * 18, fy - 14, 18, 2, 'rgba(255,255,255,.25)'); }
      const roll = st === 'dash', hy = fy - (roll ? 26 : 38), l1 = st === 'walk' ? Math.round(ph * 2) : 0;
      R(cx - 5 + l1, fy - 14, 4, 14, pants); R(cx + 1 - l1, fy - 14, 4, 14, pants); R(cx - 6 + l1, fy - 2, 5, 2, '#1a1a22'); R(cx + 1 - l1, fy - 2, 5, 2, '#1a1a22');
      const lean = st === 'hurt' ? -f * 2 : roll ? f * 3 : 0;
      R(cx - 6 + lean, hy + 10, 12, 16, top); R(cx - 6 + lean, hy + 22, 12, 2, '#222');
      R(cx - 5 + lean, hy, 10, 10, sk); R(cx - 5 + lean, hy - 1, 10, 3, '#432a1a');
      R(cx + lean - 4, hy + 4, 3, 3, '#fff'); R(cx + lean + 1, hy + 4, 3, 3, '#fff'); R(cx + lean - 4 + (f > 0 ? 1.5 : 0), hy + 5, 1.5, 2, '#111'); R(cx + lean + 1 + (f > 0 ? 1.5 : 0), hy + 5, 1.5, 2, '#111');
      if (st === 'hurt') R(cx - 2 + lean, hy + 8, 4, 2, '#7a1a1a'); else R(cx - 1 + lean + f, hy + 8, 3, 1, '#8a4a3a');
      // bat
      const p = (st === 'hit' || st === 'heavy') ? Math.min(1, pl.stT / pl.atk.dur) : -1, bat = '#9a6a3a', tip = '#c8a070';
      if (st === 'heavy') {
        R(cx + f * 5 - (f > 0 ? 0 : 3), hy + 12, 3, 8, top); R(cx + f * 7 - 1, hy - 4, 3, 18, bat); R(cx + f * 7 - 1, hy - 5, 3, 3, tip);
        if (p < pl.atk.hitAt) { R(cx + f * 1 - (f > 0 ? 0 : 7), fy - 22, 8, 5, pants); R(cx + f * 6 - (f > 0 ? 0 : 5), fy - 18, 5, 6, '#1a1a22'); }
        else { R(cx + (f > 0 ? 2 : -2 - 20), fy - 17, 20, 5, pants); R(cx + (f > 0 ? 20 : -26), fy - 19, 6, 8, '#1a1a22'); if (p < pl.atk.hitAt + 0.3) R(cx + (f > 0 ? 8 : -34), fy - 24, 26, 14, 'rgba(255,200,230,.3)'); }
      }
      else if (p < 0) { R(cx + f * 5 - (f > 0 ? 0 : 3), hy + 12, 3, 8, top); R(cx + f * 7 - 1, hy - 4, 3, 18, bat); R(cx + f * 7 - 1, hy - 5, 3, 3, tip); }
      else if (p < pl.atk.hitAt) { R(cx - f * 6 - 1, hy - 8, 3, 20, bat); R(cx - f * 4 - 2, hy + 8, 4, 8, top); }
      else {
        const len = st === 'heavy' ? 30 : 22; R(cx + (f > 0 ? 4 : -4 - len), hy + 13, len, 3, bat); R(cx + (f > 0 ? 4 + len - 4 : -4 - len), hy + 12, 4, 5, tip); R(cx + (f > 0 ? 3 : -9), hy + 12, 6, 5, sk);
        if (p < pl.atk.hitAt + 0.25) R(cx + (f > 0 ? 6 : -6 - len - 4), hy + 8, len + 4, 12, st === 'heavy' ? 'rgba(255,230,120,.28)' : 'rgba(255,255,255,.2)');
      }
    }

    function monster(e) {
      const cx = Math.round(e.x), fy = ground() - e.h, f = e.face, D = e.D, st = e.st, bob = Math.round(Math.sin(t * 6 + e.ph)), wind = st === 'wind', act = st === 'act', hurt = st === 'hurt';
      if (st === 'dead') {
        const k = Math.min(1, e.t / 0.25), w = D.boss ? 40 : e.type === 'golem' ? 30 : 18;
        R(cx - w / 2, fy - 5 * k, w, 5 * k, fl(e, '#6a1016')); R(cx - w / 3, fy - 8 * k, w * 0.6, 3 * k, '#8a1a20'); R(cx - w / 2 - 3, fy - 3, w + 6, 2, '#5a0a10');
        if (e.t < 0.9 && e.t > 0.2) R(cx - 2, fy - 12, 4, 4, '#d9a08a');
        return;
      }
      if (e.type === 'zombie') {
        const l1 = Math.round(Math.sin(t * 7 + e.ph) * 2);
        R(cx - 5 + l1, fy - 14, 4, 14, fl(e, '#3a3a52')); R(cx + 1 - l1, fy - 14, 4, 14, fl(e, '#3a3a52')); R(cx - 6 + l1, fy - 2, 5, 2, '#1a1a22'); R(cx + 1 - l1, fy - 2, 5, 2, '#1a1a22');
        const hy = fy - 37 + bob * 0.5 + (hurt ? 2 : 0), ln = wind ? -f * 3 : act ? f * 2 : 0;
        R(cx - 6 + ln, hy + 10, 12, 16, fl(e, '#c8c0a0')); R(cx - 6 + ln, hy + 10, 4, 16, fl(e, '#b3262e')); R(cx + 1 + ln, hy + 14, 4, 5, '#7a0c12'); R(cx - 2 + ln, hy + 20, 5, 1, '#e8e0c8'); R(cx - 2 + ln, hy + 22, 5, 1, '#e8e0c8');
        R(cx - 5 + ln, hy, 10, 10, fl(e, '#7fae5a')); R(cx - 5 + ln, hy - 1, 10, 3, '#2a3a2a'); R(cx + ln - 4, hy + 4, 3, 3, '#ffe9a0'); R(cx + ln + 1, hy + 4, 3, 3, '#ffe9a0'); R(cx + ln - 3 + (f > 0 ? 1 : 0), hy + 5, 1.5, 2, '#d00'); R(cx + ln + 2 + (f > 0 ? 1 : 0), hy + 5, 1.5, 2, '#d00'); R(cx - 2 + ln, hy + 8, 4, 2, '#5a0a10');
        const ax = act ? 20 : wind ? 6 : 14, ay = hy + 12 + (wind ? -6 : 0); R(cx + (f > 0 ? 4 : -4 - ax), ay, ax, 3, fl(e, '#7fae5a')); R(cx + (f > 0 ? 4 + ax - 2 : -4 - ax), ay - 1, 3, 5, '#6a9a4a');
      } else if (e.type === 'crawler') {
        const air = e.h > 1, w = air ? 18 : 16, sq = Math.round(Math.sin(t * 12 + e.ph) * 1);
        R(cx - w / 2, fy - 9 + sq, w, 9 - sq, fl(e, '#e08a8a')); R(cx - w / 2 + 2, fy - 11 + sq, w - 4, 3, fl(e, '#f0a8a0')); for (let i = 0; i < 3; i++) R(cx - w / 2 + 2 + i * 5, fy - 8, 2, 2, '#b34a4a');
        R(cx + f * (w / 2 - 5) - 1, fy - 8 + sq, 6, 5, '#ffe9a0'); R(cx + f * (w / 2 - 3), fy - 7 + sq, 2, 3, '#c00');
        if (wind || act) { R(cx + f * (w / 2) - (f > 0 ? 0 : 5), fy - 4, 5, 3, '#8a0c12'); R(cx + f * (w / 2) - (f > 0 ? 0 : 5), fy - 5, 1, 2, '#fff'); R(cx + f * (w / 2) + (f > 0 ? 3 : -3), fy - 5, 1, 2, '#fff'); }
        R(cx - 5, fy - 1, 3, 1, '#7a2a2a'); R(cx + 3, fy - 1, 3, 1, '#7a2a2a');
      } else if (e.type === 'cart') {
        const ch = act, sh = ch ? Math.round(Math.sin(t * 50)) : 0;
        R(cx - 10 + sh, fy - 6, 3, 6, '#222'); R(cx + 7 + sh, fy - 6, 3, 6, '#222'); R(cx - 12 + sh, fy - 20, 24, 14, fl(e, '#9aa3ad'));
        for (let i = 0; i < 6; i++) R(cx - 11 + i * 4 + sh, fy - 19, 1, 12, '#6a737d'); R(cx - 12 + sh, fy - 14, 24, 1, '#6a737d'); R(cx - f * 12 - 1 + sh, fy - 30, 2, 12, '#6a737d'); R(cx - f * 13 - 3 + sh, fy - 31, 6, 2, '#c33');
        R(cx + f * 2 - 4 + sh, fy - 30, 9, 9, fl(e, '#a8c878')); R(cx + f * 3 - 2 + sh, fy - 27, 2, 2, '#d00'); R(cx + f * 3 + 2 + sh, fy - 27, 2, 2, '#d00'); R(cx + f * 2 - 2 + sh, fy - 23, 6, 2, '#5a0a10');
        R(cx + f * 6 - (f > 0 ? 0 : 6) + sh, fy - 17, 6, 3, '#7a0c12');
      } else if (e.type === 'golem') {
        const hy = fy - 50 + bob * 0.4, ln = wind ? -f * 3 : act ? f * 3 : 0;
        R(cx - 9, fy - 14, 7, 14, fl(e, '#8a8f98')); R(cx + 2, fy - 14, 7, 14, fl(e, '#8a8f98'));
        R(cx - 12 + ln, hy + 14, 24, 24, fl(e, '#b8c0c8'));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { R(cx - 11 + ln + c * 6, hy + 15 + r * 8, 5, 7, ((r + c) % 2 ? '#d84a2a' : '#e8b020')); R(cx - 11 + ln + c * 6, hy + 17 + r * 8, 5, 1, '#fff'); }
        R(cx - 7 + ln, hy + 2, 14, 12, fl(e, '#6a737d')); R(cx - 4 + ln, hy + 6, 3, 3, '#ff3030'); R(cx + 2 + ln, hy + 6, 3, 3, '#ff3030'); R(cx - 4 + ln, hy + 11, 8, 1, '#222');
        const ax = act ? 26 : wind ? 6 : 14, ay = hy + 14 + (wind ? -12 : act ? 6 : 0); R(cx + (f > 0 ? 10 : -10 - ax), ay, ax, 6, fl(e, '#8a8f98')); R(cx + (f > 0 ? 10 + ax - 4 : -10 - ax), ay - 1, 6, 8, '#6a737d'); R(cx + (f > 0 ? 8 : -12), hy + 14, 4, 4, '#7a0c12');
      } else {
        const l1 = Math.round(Math.sin(t * 6) * 2), hy = fy - 52 + bob * 0.5, ln = wind ? -f * 4 : act ? f * 3 : 0;
        R(cx - 8 + l1, fy - 16, 6, 16, fl(e, '#2a2630')); R(cx + 2 - l1, fy - 16, 6, 16, fl(e, '#2a2630')); R(cx - 9 + l1, fy - 3, 7, 3, '#111'); R(cx + 2 - l1, fy - 3, 7, 3, '#111');
        R(cx - 12 + ln, hy + 14, 24, 26, fl(e, '#eae4dc')); R(cx - 10 + ln, hy + 18, 6, 8, '#a0121a'); R(cx + 1 + ln, hy + 26, 8, 6, '#a0121a'); R(cx - 4 + ln, hy + 32, 5, 5, '#c0141c'); R(cx - 12 + ln, hy + 24, 24, 3, '#6a5a4a');
        R(cx - 7 + ln, hy, 14, 14, fl(e, '#d8a888')); R(cx - 8 + ln, hy - 2, 16, 5, '#eae4dc'); R(cx - 7 + ln, hy + 8, 14, 6, '#3a3a40'); R(cx - 4 + ln, hy + 5, 3, 2, '#d00'); R(cx + 2 + ln, hy + 5, 3, 2, '#d00');
        const ay = hy + 16 + (wind ? -14 : 0); R(cx + (f > 0 ? 8 : -14), ay, 6, 4, '#d8a888');
        const cl = act ? 28 : 12, cyy = wind ? hy - 8 : act ? hy + 18 : hy + 4;
        if (wind) { R(cx + f * 8 - 1, cyy, 3, 14, '#9aa3ad'); R(cx + f * 8 - 3, cyy - 6, 9, 8, '#c8d0d8'); }
        else { R(cx + (f > 0 ? 10 : -10 - cl), cyy + 10, cl, 3, '#6a5a4a'); R(cx + (f > 0 ? 10 + cl - 8 : -10 - cl), cyy + 6, 8, 9, '#c8d0d8'); R(cx + (f > 0 ? 10 + cl - 3 : -10 - cl + 1), cyy + 10, 2, 3, '#c0141c'); }
      }
      if (wind) { const hh = e.type === 'golem' ? 70 : D.boss ? 74 : e.type === 'cart' ? 48 : e.type === 'crawler' ? 28 : 56, col = (D.charge || e.act === 'slam' || e.act === 'throw') ? '#ffc21a' : '#ff3b3b'; R(cx - 1, fy - hh, 3, 9, col); R(cx - 1, fy - hh + 11, 3, 3, col); }
    }

    function scene() {
      const gy = ground(), tt = t;
      R(0, 0, LW, LH, '#3b1c24'); R(0, 0, LW, 14, '#241014');
      // ceiling lights (one flickers)
      for (let i = 0; i < 4; i++) { const lx = 10 + i * ((LW - 20) / 3) - 8, on_ = !(i === 2 && Math.sin(tt * 17) > 0.6) && !(i === 0 && Math.sin(tt * 9.3) > 0.85); R(lx, 10, 18, 3, on_ ? '#f4efe0' : '#4a4040'); if (on_) R(lx - 2, 13, 22, 2, 'rgba(255,240,200,.18)'); }
      // sign
      const sx = Math.round(LW / 2 - 48); R(sx, 16, 96, 14, '#14080b'); R(sx + 1, 17, 94, 12, '#2a0f14');
      g.fillStyle = '#e8e0d0'; g.font = '800 ' + (8 * F) + 'px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('СВЕТОФОР', (sx + 4) * F, 23.5 * F);
      const lc = ['#e63a2e', '#f2c21a', '#3ab04a'], blink = Math.floor(tt * 2) % 3;
      for (let i = 0; i < 3; i++) { g.fillStyle = i === blink ? lc[i] : '#4a2a2a'; g.beginPath(); g.arc((sx + 78 + i * 5.2) * F, 23 * F, 2.1 * F, 0, 7); g.fill(); }
      // shelves with goods
      const sh1 = gy - 66, sh2 = gy - 46, sh3 = gy - 26;
      R(0, sh1 - 2, LW, LH, '#4a2430');
      for (const sy of [sh1, sh2, sh3]) {
        R(0, sy + 14, LW, 3, '#8a7a6a'); R(0, sy + 17, LW, 1, '#3a2a20');
        for (let x = 2; x < LW - 4; x += 6) { const k = Math.floor(Math.abs(Math.sin(x * 12.9898 + sy * 78.233) * 43758.5453)), c = ['#e63a2e', '#f2c21a', '#3ab04a', '#e8e0d0', '#4a7ad8', '#c06a2a'][k % 6], hh = 8 + (k % 3) * 2; R(x, sy + 14 - hh, 5, hh, c); R(x, sy + 14 - hh + 2, 5, 1, 'rgba(255,255,255,.35)'); }
      }
      R(0, sh1 - 2, 3, gy - sh1 + 2, '#2a1418'); R(LW - 3, sh1 - 2, 3, gy - sh1 + 2, '#2a1418');
      for (let i = 0; i < 6; i++) { const bx = (i * 53 + 11) % (LW - 12) + 3, by = sh1 + ((i * 29) % 56); R(bx, by, 2, 5 + (i % 3) * 3, 'rgba(150,10,20,.7)'); R(bx - 1, by + 5 + (i % 3) * 3, 4, 2, 'rgba(150,10,20,.7)'); }
      // floor
      R(0, gy, LW, LH - gy, '#2a1c20');
      for (let y = gy, r = 0; y < LH; y += 8, r++) for (let x = (r % 2) * 8; x < LW; x += 16) R(x, y, 8, 8, '#34242a');
      R(0, gy, LW, 2, '#4a343a');
      // blood decals (persistent layer)
      g.drawImage(dec, 0, 0);
      for (const k of pickups) { const cy = gy - k.h; if (k.kind === 'plus') { const px = Math.round(k.x), pb = Math.round(Math.sin(tt * 4) * 1.5), gl = 0.25 + 0.15 * Math.sin(tt * 6); R(px - 11, cy - 20 + pb, 22, 22, 'rgba(80,255,120,' + gl + ')'); R(px - 7, cy - 11 + pb, 14, 4, '#0a3a14'); R(px - 2, cy - 16 + pb, 4, 14, '#0a3a14'); R(px - 6, cy - 10 + pb, 12, 3, '#3ddc5a'); R(px - 1, cy - 15 + pb, 3, 12, '#3ddc5a'); R(px - 5, cy - 10 + pb, 10, 1, '#b8ffc4'); continue; } R(Math.round(k.x) - 4, cy - 8, 8, 8, '#d84a2a'); R(Math.round(k.x) - 4, cy - 6, 8, 2, '#f2c21a'); R(Math.round(k.x) - 4, cy - 9, 8, 1, '#c8d0d8'); }
      for (const e of es) if (e.st === 'dead') monster(e);
      const alive = es.filter(e => e.st !== 'dead').sort((a, b) => a.h - b.h);
      for (const e of alive) monster(e);
      hero();
      for (const p of projs) { R(Math.round(p.x) - 5, gy - p.h - 4, 10, 4, '#d9786a'); R(Math.round(p.x) - 5, gy - p.h - 4, 10, 1, '#f0a090'); R(Math.round(p.x) - 6, gy - p.h - 3, 2, 2, '#8a3a30'); }
      for (const p of parts) { const s = p.chunk ? 3 : 2; R(p.x, p.y, s, s, p.col); }
      // HUD bars
      const bw = Math.floor(LW - 12), by = 34;
      R(5, by, bw + 2, 7, '#000'); R(6, by + 1, bw, 5, '#3a3a46'); R(6, by + 1, Math.round(bw * pl.hp / pl.max), 5, pl.hp / pl.max < 0.3 ? '#ff5a5a' : '#4fe05a');
      const boss = es.find(e => e.D.boss && e.st !== 'dead');
      if (boss) { R(5, by + 9, bw + 2, 6, '#000'); R(6, by + 10, bw, 4, '#3a3a46'); R(6, by + 10, Math.round(bw * Math.max(0, boss.hp) / boss.max), 4, '#c0141c'); }
    }
    function mono(px) { return Math.round(px) + 'px system-ui, sans-serif'; }
    function overlay() {
      const fs = Math.max(11, Math.min(15, Math.round(W / 28))), kbd = matchMedia('(pointer:fine)').matches;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      for (const f of floats) { ctx.font = '800 ' + mono(Math.max(11, u * 3.6)); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = f.col; ctx.globalAlpha = Math.min(1, f.life * 2); ctx.strokeText(f.s, f.x * u, f.y * u); ctx.fillText(f.s, f.x * u, f.y * u); ctx.globalAlpha = 1; }
      const top = H - ctrlH; ctx.fillStyle = '#140a0e'; ctx.fillRect(0, top, W, ctrlH); ctx.fillStyle = '#3a1a22'; ctx.fillRect(0, top, W, 3);
      const KEY = { jump: 'Пробел', dash: 'Q', left: 'A', right: 'D', hit: 'ЛКМ', heavy: 'ПКМ' };
      if (mode === 'play' || mode === 'over' || mode === 'win') {
        for (const b of btns) {
          const pressed = held[b.id] > 0 || keys[b.id]; ctx.fillStyle = pressed ? '#a0303a' : '#3a1820'; ctx.strokeStyle = '#a04050'; ctx.lineWidth = 2;
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 12); else ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fee'; ctx.font = b.w > W * 0.3 ? '700 ' + mono(fs) : '700 ' + mono(Math.round(b.h * 0.42)); ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + (kbd ? -5 : 7));
          if (kbd) { ctx.font = '700 ' + mono(Math.max(10, Math.min(13, Math.round(b.h * 0.2)))); ctx.fillStyle = '#ffd98a'; ctx.fillText('(' + KEY[b.id] + ')', b.x + b.w / 2, b.y + b.h - 11); }
        }
      }
      if (mode === 'play') {
        ctx.font = '800 ' + mono(Math.max(11, u * 3.4)); ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.textAlign = 'left';
        const s = 'Очки: ' + score; ctx.strokeText(s, 8, (by0()) * u); ctx.fillText(s, 8, (by0()) * u); ctx.textAlign = 'right'; const w = 'Волна ' + (wave + 1) + '/' + WAVES.length; ctx.strokeText(w, W - 8, by0() * u); ctx.fillText(w, W - 8, by0() * u); ctx.textAlign = 'center';
        if (bannerT > 0) { ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = '800 ' + mono(Math.min(34, u * 8)); ctx.fillStyle = '#ffd23a'; ctx.lineWidth = 5; ctx.strokeText(banner, W / 2, (ground() - 80) * u); ctx.fillText(banner, W / 2, (ground() - 80) * u); ctx.globalAlpha = 1; }
      }
      const shade = a => { ctx.fillStyle = 'rgba(10,0,4,' + a + ')'; ctx.fillRect(0, 0, W, H); };
      if (mode === 'title') {
        shade(0.62); ctx.fillStyle = '#ff4a3a'; ctx.font = '900 ' + mono(Math.min(46, u * 11)); ctx.fillText('СВЕТОФОР', W / 2, H * 0.28);
        ctx.fillStyle = '#f2c21a'; ctx.font = '800 ' + mono(fs + 3); ctx.fillText('кровавый магазин', W / 2, H * 0.28 + fs * 2.2);
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs); const L = kbd ? ['A / D — ходить · Пробел — прыжок', 'ЛКМ — удар битой · ПКМ — удар ногой', 'Q — перекат · розовых ползунов бьёт только нога'] : ['◀ ▶ — ходить · ⤒ — прыжок', '🏏 — удар битой · 🦵 — удар ногой', '💨 — перекат · розовых ползунов бьёт только нога'];
        L.forEach((s, i) => ctx.fillText(s, W / 2, H * 0.28 + fs * 5 + i * fs * 1.7));
        ctx.fillStyle = '#9fd8ff'; ctx.font = '800 ' + mono(fs + 2); ctx.fillText('нажмите, чтобы начать', W / 2, H * 0.28 + fs * 11);
      }
      if (mode === 'over') { shade(0.6); ctx.fillStyle = '#ff5a5a'; ctx.font = '800 ' + mono(Math.min(34, u * 8)); ctx.fillText('ВАС РАЗОРВАЛИ', W / 2, H * 0.34); ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 2); ctx.fillText('очки: ' + score + ' · убито: ' + kills + ' · волна ' + (wave + 1), W / 2, H * 0.44); ctx.fillText('нажмите, чтобы попробовать снова', W / 2, H * 0.52); }
      if (mode === 'win') { shade(0.6); ctx.fillStyle = '#ffd23a'; ctx.font = '800 ' + mono(Math.min(34, u * 8)); ctx.fillText('МАГАЗИН ЗАЧИЩЕН!', W / 2, H * 0.34); ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 2); ctx.fillText('очки: ' + score + ' · убито: ' + kills + ' · время ' + Math.floor(runT / 60) + ':' + ('0' + Math.floor(runT % 60)).slice(-2), W / 2, H * 0.44); ctx.fillStyle = '#9fd8ff'; ctx.fillText('нажмите, чтобы сыграть ещё раз', W / 2, H * 0.52); }
    }
    function by0() { return 56; }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0d0509'; ctx.fillRect(0, 0, W, H);
      scene();
      ctx.imageSmoothingEnabled = false;
      const sx = shake > 0 ? Math.round(Math.sin(t * 90) * u * 0.8) : 0;
      ctx.drawImage(off, 0, 0, LW * F, LH * F, sx, 0, LW * u, LH * u);
      overlay();
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctrlH = Math.round(Math.max(190, Math.min(260, H * 0.3)));
      u = Math.max(2, Math.floor(Math.min(W / 125, (H - ctrlH) / 150)));
      LW = Math.ceil(W / u); LH = Math.ceil((H - ctrlH) / u);
      off = document.createElement('canvas'); off.width = LW * F; off.height = LH * F; g = off.getContext('2d');
      const old = dec; dec = document.createElement('canvas'); dec.width = LW * F; dec.height = LH * F; dg = dec.getContext('2d'); if (old) dg.drawImage(old, 0, 0);
      layoutBtns();
      if (pl) pl.x = Math.min(pl.x, LW - 8);
    }
    function frame(ts) {
      if (!on) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
      if (!paused) { update(dt); playEvents(); }
      musicTick(); draw(); raf = requestAnimationFrame(frame);
    }
    resize(); restart();
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); song.pause(); song.removeAttribute('src'); song.load(); },
      debug: { update, startGame, attack: playerAttack, jump: playerJump, dash: playerDash, spawn, get mode() { return mode; }, get wave() { return wave; }, get pl() { return pl; }, get es() { return es; }, get kills() { return kills; }, get score() { return score; }, set left(v) { keys.left = !!v; }, set right(v) { keys.right = !!v; } }
    };
  }
});
