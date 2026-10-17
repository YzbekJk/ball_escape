/* Игра «Гнилая маршрутка» (пиксель-арт файтинг): диалоги и три боя — кондуктор, бабка и босс «Я же мать».
   Красный «!» — блок (нажмите блок в последний момент — удар отразится); синий «!» — удар по ногам, через него надо прыгнуть. */
Sims.register({
  id: 'rotten-bus',
  kind: 'game',
  title: 'Гнилая маршрутка',
  desc: 'Пиксельный файтинг. Сначала поболтайте с кондуктором о билете, затем бой. Потом бабка, которая требует уступить место, и босс — «Я же мать!», чей ребёнок пинает ваше кресло.',

  defaults: { playerHp: 100, enemyPower: 1.5, skipDialogs: false, sound: true, music: true, musicStart: 9, volume: 0.7 },
  schema: [
    { k: 'playerHp', l: 'Ваше здоровье', min: 40, max: 300, step: 10 },
    { k: 'enemyPower', l: 'Сила врагов ×', min: 0.3, max: 3, step: 0.1, live: 1 },
    { k: 'skipDialogs', l: 'Пропускать диалоги', type: 'check', live: 1 },
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'musicStart', l: 'С какой секунды трека начинать', min: 0, max: 120, step: 0.5, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#5d7468'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9fc3d6'; ctx.fillRect(w * 0.08, h * 0.12, w * 0.26, h * 0.3); ctx.fillRect(w * 0.37, h * 0.12, w * 0.26, h * 0.3); ctx.fillRect(w * 0.66, h * 0.12, w * 0.26, h * 0.3);
    ctx.fillStyle = '#3b2c22'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = '#e8c21a'; ctx.fillRect(0, h * 0.5, w, h * 0.025);
    const man = (x, c, hc, s) => { ctx.fillStyle = '#f0c9a0'; ctx.fillRect(x, h * 0.36, s, s); ctx.fillStyle = hc; ctx.fillRect(x - 1, h * 0.34, s + 2, s * 0.4); ctx.fillStyle = c; ctx.fillRect(x - 2, h * 0.36 + s, s + 4, s * 1.5); ctx.fillStyle = '#333'; ctx.fillRect(x, h * 0.36 + s * 2.5, s, s * 1.2); };
    man(w * 0.25, '#3a6fd8', '#432', h * 0.1); man(w * 0.68, '#e8832a', '#666', h * 0.1);
    ctx.fillStyle = '#ff4040'; ctx.fillRect(w * 0.7, h * 0.14, w * 0.04, h * 0.14);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const F = 2, TAU = Math.PI * 2;

    // ================= script =================
    const P = 'ТЫ', C = 'КОНДУКТОР', B = 'БАБКА', M = 'МАМАША', K = 'ВОДИТЕЛЬ';
    const DIALOGS = {
      conductor: {
        start: 'c1',
        n: {
          c1: { who: C, t: 'Молодой человек! Билет предъявляем. Или вы тут просто так, из любви к искусству?', ch: [['Я уже платил водителю', 'c2a'], ['Я студент!', 'c2b'], ['А можно просто проехать?', 'c2c']] },
          c2a: { who: C, t: 'Водителю? Он за рулём, он ничего не видит! Где чек? Покажи чек!', next: 'c3' },
          c2b: { who: C, t: 'Студент? А кто в прошлый раз так говорил? Давай студенческий, с печатью и подписью ректора!', next: 'c3' },
          c2c: { who: C, t: 'Просто? Просто только кошки родятся! А у меня тут план и ипотека.', next: 'c3' },
          c3: { who: P, t: 'Слушайте, билета нет, зато есть хорошее настроение.', next: 'c4' },
          c4: { who: C, t: 'Настроение — не валюта! Штраф пятьсот рублей. Или выходим на следующей. На ходу.', ch: [['Ладно, вот пятьсот', 'c5a'], ['Платить не буду', 'c5b']] },
          c5a: { who: C, t: 'Спасибо… Ой, а терминал сломан, наличные я не принимаю. Значит, выходим! На ходу!', next: null },
          c5b: { who: C, t: 'Тогда будем решать по-маршруточному! Сам напросился!', next: null }
        },
        after: [[C, 'Ладно-ладно… проезд свободный… только не бей…'], [P, 'Билет всё-таки был. В кармане. Шучу.']]
      },
      babka: {
        start: 'b1',
        n: {
          b1: { who: B, t: 'Ой, милок… ножки не держат, давление скачет… Уступи местечко старенькой!', ch: [['Конечно, садитесь', 'b2a'], ['Я тоже устал', 'b2b']] },
          b2a: { who: B, t: 'Вот спасибо… (садится) …А теперь подержи сумку. И окно закрой, дует! И…', next: 'b3' },
          b3: { who: B, t: 'Хотя знаешь что? Ты молодой, а я ДОЛЖНА сидеть на твоём месте? Нет, я хочу ВОН ТО место! Ну-ка встал!', next: null },
          b2b: { who: B, t: 'Он устал! Я в твои годы по две смены отпахала! Ах ты наглец! Палкой сейчас!', next: null }
        },
        after: [[B, 'Ой… сердце… ладно, постою… молодёжь пошла…'], [P, 'Место свободно. Наконец-то можно сесть.']]
      },
      mother: {
        start: 'm1',
        n: {
          m1: { who: P, t: 'Наконец-то можно спокойно посидеть…', next: 'm2' },
          m2: { who: '* БАМ! *', t: 'Сзади кто-то пинает твоё кресло. Раз. Другой. Третий.', next: 'm3' },
          m3: { who: P, t: 'Мальчик, пожалуйста, не пинай кресло.', next: 'm4' },
          m4: { who: M, t: 'Не смей разговаривать с моим ребёнком! Он у меня особенный, ему можно!', ch: [['Присмотрите за ребёнком, пожалуйста', 'm5a'], ['Ладно, пусть пинает…', 'm5b']] },
          m5a: { who: M, t: 'Ты мне ещё указывать будешь, как воспитывать?! Я же МАТЬ!', next: null },
          m5b: { who: M, t: 'Вот именно! Хотя нет — ты уже напугал ребёнка! Я же МАТЬ!!!', next: null }
        },
        after: [[M, 'Ну всё… ну… мы выходим! Пойдём, Артёмчик!'], [K, 'Конечная! Все на выход. Маршрутка дальше не идёт.'], [P, 'Гнилая маршрутка побеждена.']]
      }
    };
    const ENEMIES = [
      { id: 'conductor', name: 'КОНДУКТОР', hp: 130, speed: 42, cd: [0.35, 0.9], combo: 0.5, guard: 0.35,
        atks: [{ n: 'punch', wind: 0.4, act: 0.16, reach: 22, dmg: 10, low: false, say: 'Билет!' }, { n: 'lunge', wind: 0.55, act: 0.28, reach: 14, dmg: 15, low: false, dash: 50, say: 'Штраф!' }, { n: 'kickLow', wind: 0.5, act: 0.2, reach: 24, dmg: 11, low: true, say: 'Выходим!' }] },
      { id: 'babka', name: 'БАБКА', hp: 170, speed: 26, cd: [0.45, 1.1], heal: 1, combo: 0.4, guard: 0.3,
        atks: [{ n: 'poke', wind: 0.42, act: 0.2, reach: 36, dmg: 11, low: false, say: 'Уступи!' }, { n: 'sweep', wind: 0.6, act: 0.25, reach: 38, dmg: 14, low: true, say: 'Давление!' }, { n: 'bag', wind: 0.48, act: 0.2, reach: 30, dmg: 13, low: false, say: 'Сумкой!' }] },
      { id: 'mother', name: 'Я ЖЕ МАТЬ', hp: 260, speed: 34, cd: [0.3, 0.8], kid: true, combo: 0.6, guard: 0.3,
        atks: [{ n: 'bag', wind: 0.4, act: 0.2, reach: 30, dmg: 14, low: false, say: 'Я же мать!' }, { n: 'shout', wind: 0.65, act: 0.3, reach: 70, dmg: 12, low: true, say: 'Я МАТЬ!!!' }, { n: 'slap', wind: 0.35, act: 0.15, reach: 22, dmg: 11, low: false, say: 'Не трогай!' }] }
    ];

    // ================= state =================
    let mode, stage, node, nodeId, typed, afterQ, pl, en, parts, floats, waves, shake, t, events, banner, bannerT, held, keys, kidT, kidWarn, hint;
    let paused = false, last = 0, raf = 0, on = true, W = 0, H = 0, dpr = 1, u = 3, LW = 130, LH = 200, ctrlH = 200, off, g, btns = [], choiceRects = [];
    const rnd = (a, b) => a + Math.random() * (b - a);

    function newPlayer() { return { parryT: 0, wasBlock: false, x: 28, h: 0, vy: 0, hp: cfg.playerHp, max: cfg.playerHp, face: 1, st: 'idle', stT: 0, cd: 0, flash: 0, hurtT: 0 }; }
    function startStage(i) {
      stage = i; const E = ENEMIES[i];
      en = { def: E, x: 0, h: 0, hp: E.hp, max: E.hp, face: -1, st: 'idle', t: 0, atk: null, cd: 1, flash: 0, healsLeft: E.heal || 0, healT: 0, dashed: false, hit: false, dead: false };
      en.x = LW - 30; waves = []; kidT = rnd(3, 4.5); kidWarn = 0;
      if (!pl) pl = newPlayer(); else { pl.hp = Math.min(pl.max, pl.hp + 35); pl.x = 28; pl.h = 0; pl.vy = 0; pl.st = 'idle'; pl.cd = 0; }
      openDialog(DIALOGS[E.id].start);
      mode = 'dialog'; hint = i <= 1;
    }
    function restart() {
      pl = null; parts = []; floats = []; shake = 0; t = 0; events = []; held = {}; keys = {}; banner = ''; bannerT = 0; afterQ = null;
      startStage(0);
    }
    function openDialog(id) {
      const d = DIALOGS[ENEMIES[stage].id]; nodeId = id; node = d.n[id]; typed = 0;
      if (cfg.skipDialogs) beginFight();
    }
    function advance(choiceIdx) {
      if (mode === 'afterdlg') {
        afterQ.shift(); typed = 0;
        if (!afterQ.length) { if (stage + 1 < ENEMIES.length) startStage(stage + 1); else { mode = 'end'; events.push('win'); } }
        return;
      }
      if (typed < node.t.length) { typed = node.t.length; return; }
      let nx;
      if (node.ch) { if (choiceIdx == null) return; nx = node.ch[choiceIdx][1]; } else nx = node.next;
      if (nx) { openDialog(nx); } else beginFight();
    }
    function beginFight() {
      mode = 'fight'; en.st = 'idle'; en.cd = 1; en.t = 0; banner = ENEMIES[stage].id === 'mother' ? 'БОСС: Я ЖЕ МАТЬ!' : 'БОЙ!'; bannerT = 1.4; events.push('bell');
      pl.x = 28; en.x = LW - 30; en.hp = en.max;
    }
    function endFight() {
      mode = 'afterdlg'; afterQ = DIALOGS[ENEMIES[stage].id].after.map(a => ({ who: a[0], t: a[1] })); typed = 0;
    }

    // ================= fight logic =================
    const ground = () => Math.round(LH * 0.8);
    function floatText(x, y, s, col) { floats.push({ x, y, s, col, life: 0.9 }); }
    function sparks(x, y, col, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-50, 50), vy: rnd(-70, -10), life: 0.5, col }); }
    function hurtEnemy(dmg, noStun) {
      if (en.st === 'guard') { dmg = Math.max(1, Math.round(dmg * 0.2)); en.hp = Math.max(0, en.hp - dmg); sparks(en.x - 4, ground() - 22, '#9fd8ff', 5); floatText(en.x, ground() - 52, 'блок', '#9fd8ff'); events.push('block'); return; }
      en.hp = Math.max(0, en.hp - dmg); en.flash = 0.15; sparks(en.x - en.face * -6, ground() - 22, '#ffe14d', 6); floatText(en.x, ground() - 52, '-' + dmg, '#ffe14d'); events.push('hit'); shake = 0.1;
      if (en.hp <= 0) { en.dead = true; en.st = 'dead'; en.t = 0; events.push('ko'); mode = 'ko'; t0ko = 0; return; }
      const armor = (en.def.id === 'mother' && en.st === 'act') && !noStun;
      if (!armor && en.st !== 'hurt') { en.st = 'hurt'; en.t = 0; en.atk = null; en.vx = -en.face * -1 * 70; }
      else if (en.st === 'heal') { en.st = 'hurt'; en.t = 0; }
    }
    let t0ko = 0;
    function hurtPlayer(dmg, low, kb) {
      if (pl.st === 'dead') return;
      if (pl.parryT > 0 && !low && pl.h < 1 && en.atk && !pl.parried) {      // blocked at the last moment: reflect the attack
        pl.parried = true; floatText(pl.x, ground() - 60, 'ОТРАЖЕНО!', '#6ff7ff'); sparks(pl.x + 10, ground() - 24, '#6ff7ff', 14); events.push('parry'); shake = 0.2;
        const rd = Math.round(10 + en.max * 0.07); hurtEnemy(rd, true); if (!en.dead) { en.st = 'hurt'; en.t = -0.7; en.atk = null; en.x += en.face * -8; }
        banner = 'ОТРАЖЕНИЕ!'; bannerT = 0.6; return;
      }
      if (pl.blocking && !low && pl.h < 1) { dmg = Math.max(1, Math.round(dmg * 0.35)); sparks(pl.x + 8, ground() - 22, '#9fd8ff', 6); floatText(pl.x, ground() - 52, 'блок', '#9fd8ff'); events.push('block'); pl.vx = -40; }
      else { pl.flash = 0.2; pl.st = 'hurt'; pl.stT = 0; pl.vx = -(kb || 5) * 16; sparks(pl.x, ground() - 22, '#ff5a5a', 7); floatText(pl.x, ground() - 52, '-' + Math.round(dmg), '#ff6a6a'); events.push('ouch'); shake = 0.2; }
      pl.hp = Math.max(0, pl.hp - dmg);
      if (pl.hp <= 0) { pl.st = 'dead'; mode = 'over'; events.push('over'); }
    }
    function playerAttack(kind) {
      if (mode !== 'fight' || pl.cd > 0 || pl.st === 'hurt' || pl.st === 'dead' || pl.blocking) return;
      const k = kind === 'punch' ? { dur: 0.22, cd: 0.28, reach: 24, dmg: 8 } : { dur: 0.4, cd: 0.6, reach: 30, dmg: 15 };
      pl.vx = kind === 'punch' ? 55 : 80; pl.st = kind; pl.stT = 0; pl.atk = k; pl.hitDone = false; pl.cd = k.cd; events.push('swing');
    }
    function playerJump() { if (mode === 'fight' && pl.h <= 0 && pl.st !== 'hurt' && pl.st !== 'dead') { pl.vy = 150; events.push('jump'); } }

    function updateFight(dt) {
      // player
      pl.blocking = (held.block || keys.block) && pl.h <= 0 && (pl.st === 'idle' || pl.st === 'walk' || pl.st === 'block');
      if (pl.blocking && !pl.wasBlock) pl.parryT = 0.28; pl.wasBlock = pl.blocking; if (pl.parryT > 0) pl.parryT -= dt;
      if (pl.cd > 0) pl.cd -= dt; if (pl.flash > 0) pl.flash -= dt;
      pl.stT += dt;
      let dirx = 0; if (held.left || keys.left) dirx -= 1; if (held.right || keys.right) dirx += 1;
      if (pl.st === 'hurt') { if (pl.stT > 0.3) pl.st = 'idle'; }
      else if (pl.st === 'punch' || pl.st === 'kick') {
        if (!pl.hitDone && pl.stT > pl.atk.dur * 0.4) {
          pl.hitDone = true; const dx = en.x - pl.x;
          if (dx > -4 && dx < pl.atk.reach && !en.dead && en.h < 12) hurtEnemy(pl.atk.dmg);
        }
        if (pl.stT > pl.atk.dur) pl.st = 'idle';
      } else if (pl.st !== 'dead') {
        pl.st = pl.blocking ? 'block' : (dirx ? 'walk' : 'idle');
        if (!pl.blocking) pl.x += dirx * 48 * dt;
      }
      pl.x = Math.max(10, Math.min(LW - 14, pl.x));
      if (pl.h > 0 || pl.vy > 0) { pl.vy -= 520 * dt; pl.h += pl.vy * dt; if (pl.h <= 0) { pl.h = 0; pl.vy = 0; } }
      // enemy
      const E = en.def, pw = cfg.enemyPower, enraged = en.hp < en.max * 0.5;
      if (en.flash > 0) en.flash -= dt;
      en.t += dt; en.face = pl.x < en.x ? -1 : 1; en.moving = false;
      en.x += (en.vx || 0) * dt; en.vx = (en.vx || 0) * Math.max(0, 1 - 7 * dt); pl.x += (pl.vx || 0) * dt; pl.vx = (pl.vx || 0) * Math.max(0, 1 - 7 * dt);
      if (en.st === 'hurt') { if (en.t > 0.22) { en.st = 'idle'; en.cd = rnd(0.15, 0.5); } }
      else if (en.st === 'guard') { if (en.t > 0.55) { en.st = 'idle'; en.cd = 0.15; } }
      else if (en.st === 'idle') {
        en.cd -= dt;
        if (pl.st === 'punch' || pl.st === 'kick') { if (!en.guardRoll) { en.guardRoll = true; if (Math.random() < (E.guard || 0) && Math.abs(pl.x - en.x) < 34) { en.st = 'guard'; en.t = 0; } } } else en.guardRoll = false;
        if (en.st === 'guard') return;
        const dx = Math.abs(pl.x - en.x), want = en.next ? en.next.reach - 4 : 20;
        if (!en.next) en.next = E.atks[Math.floor(Math.random() * E.atks.length)];
        if (E.heal && en.healsLeft > 0 && en.hp < en.max * 0.6 && Math.random() < dt * 0.4 && dx > 40) { en.st = 'heal'; en.t = 0; en.healsLeft--; say('Ой, сердце…'); }
        else if (dx > want) { en.x += Math.sign(pl.x - en.x) * E.speed * (enraged ? 1.3 : 1) * dt; en.moving = true; }
        else if (en.cd > 0) {                                  // circling in front of the player: steps in and out
          en.sT = (en.sT || 0) - dt; if (en.sT <= 0) { en.sT = rnd(0.35, 0.9); en.sd = Math.random() < 0.5 ? -1 : 1; }
          const away = Math.sign(en.x - pl.x) || 1, dir = dx < want - 8 ? away : dx > want - 1 ? -away : en.sd * away;
          en.x += dir * E.speed * 0.55 * dt; en.moving = true;
        }
        else if (en.cd <= 0) { en.atk = en.next; en.next = null; en.st = 'wind'; en.t = 0; en.hit = false; en.combo = 0; en.hold = Math.random() < 0.3 ? rnd(0.12, 0.35) : 0; pl.parried = false; events.push('warn'); say(en.atk.say); }
      } else if (en.st === 'heal') { en.hp = Math.min(en.max, en.hp + 14 * dt); if (en.t > 2.2) { en.st = 'idle'; en.cd = 0.5; } }
      else if (en.st === 'wind') { if (en.t >= en.atk.wind * (en.combo ? 0.65 : 1) / (enraged ? 1.25 : 1) + en.hold) { en.st = 'act'; en.t = 0; en.hit = false; en.vx = en.face * (en.atk.dash ? 0 : 70); pl.parried = false; } }
      else if (en.st === 'act') {
        if (en.atk && en.atk.dash) en.x += en.face * (en.atk.dash / en.atk.act) * dt;
        if (en.atk && !en.hit) {
          const dx = (pl.x - en.x) * en.face;
          if (dx > -6 && dx < en.atk.reach && (en.atk.low ? pl.h < 7 : pl.h < 22)) { en.hit = true; hurtPlayer(en.atk.dmg * pw, en.atk.low, 6); }
        }
        if (en.st === 'act' && en.atk && en.t > en.atk.act) {
          if (!pl.st.startsWith('dead') && en.combo < 2 && Math.random() < (E.combo || 0) * (enraged ? 1.4 : 1) && Math.abs(pl.x - en.x) < 40) { en.atk = E.atks[Math.floor(Math.random() * E.atks.length)]; en.combo++; en.st = 'wind'; en.t = 0; en.hit = false; en.hold = 0; events.push('warn'); say(en.atk.say, 0.6); }
          else { en.st = 'rec'; en.t = 0; }
        }
      } else if (en.st === 'rec') { if (en.t > 0.25) { en.st = 'idle'; en.cd = rnd(E.cd[0], E.cd[1]) / (enraged ? 1.4 : 1); } }
      en.x = Math.max(14, Math.min(LW - 12, en.x));
      if (Math.abs(en.x - pl.x) < 10) { const s = Math.sign(en.x - pl.x) || 1; en.x += s * 40 * dt; pl.x -= s * 20 * dt; }
      // boss: the kid kicks the seat -> a shockwave runs along the floor
      if (E.kid) {
        if (kidWarn > 0) { kidWarn -= dt; if (kidWarn <= 0) { waves.push({ x: LW - 8, v: -78 }); events.push('kick'); shake = 0.25; } }
        else { kidT -= dt; if (kidT <= 0) { kidWarn = 1.0; kidT = enraged ? rnd(2.2, 3) : rnd(3.5, 5); if (enraged && Math.random() < 0.5) setTimeout(() => { if (mode === 'fight') waves.push({ x: LW - 8, v: -95 }); }, 450); say('Малыш пинает кресло!', 1.2); events.push('warn2'); } }
        for (const w of waves) { w.x += w.v * dt; if (!w.hit && Math.abs(w.x - pl.x) < 7 && pl.h < 7) { w.hit = true; hurtPlayer(9 * pw, true, 8); } }
        waves = waves.filter(w => w.x > -10);
      }
    }
    let sayTxt = '', sayT = 0;
    function say(s, d) { sayTxt = s; sayT = d || 0.9; }

    function update(dt) {
      t += dt; if (shake > 0) shake -= dt; if (sayT > 0) sayT -= dt; if (bannerT > 0) bannerT -= dt;
      if (mode === 'dialog' || mode === 'afterdlg') { const cur = mode === 'dialog' ? node : afterQ[0]; if (cur && typed < cur.t.length) typed = Math.min(cur.t.length, typed + dt * 45); }
      if (mode === 'fight') updateFight(dt);
      if (mode === 'ko') { t0ko += dt; en.t += dt; if (t0ko > 1.6) endFight(); }
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; } parts = parts.filter(p => p.life > 0);
      for (const f of floats) { f.y -= 22 * dt; f.life -= dt; } floats = floats.filter(f => f.life > 0);
    }

    // ================= input =================
    function layoutBtns() {
      const top = H - ctrlH, pad = 8, halfW = (W - pad * 3) / 2, rowH = (ctrlH - pad * 3) / 2;
      const bw = (halfW - pad) / 2;
      btns = [
        { id: 'jump', label: '⤒ ПРЫЖОК', x: pad, y: top + pad, w: halfW, h: rowH, tap: true },
        { id: 'left', label: '◀', x: pad, y: top + pad * 2 + rowH, w: bw, h: rowH },
        { id: 'right', label: '▶', x: pad * 2 + bw, y: top + pad * 2 + rowH, w: bw, h: rowH },
        { id: 'block', label: '🛡 БЛОК', x: pad * 2 + halfW, y: top + pad, w: halfW, h: rowH },
        { id: 'punch', label: '👊', x: pad * 2 + halfW, y: top + pad * 2 + rowH, w: bw, h: rowH, tap: true },
        { id: 'kick', label: '🦵', x: pad * 3 + halfW + bw, y: top + pad * 2 + rowH, w: bw, h: rowH, tap: true }
      ];
    }
    function hitRect(x, y, r) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
    function onDown(e) {
      musicTick();
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mode === 'dialog') { if (node.ch) { const i = choiceRects.findIndex(c => hitRect(x, y, c)); if (i >= 0) advance(i); else if (typed < node.t.length) typed = node.t.length; } else advance(); return; }
      if (mode === 'afterdlg') { advance(); return; }
      if (mode === 'over') { retry(); return; }
      if (mode === 'end') { restart(); return; }
      if (mode !== 'fight') return;
      const b = btns.find(q => hitRect(x, y, q)); if (!b) return;
      if (b.tap) { if (b.id === 'jump') playerJump(); else playerAttack(b.id); }
      else held[b.id] = (held[b.id] || 0) + 1, (held['p' + e.pointerId] = b.id);
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function onUp(e) { const id = held['p' + e.pointerId]; if (id) { held[id] = Math.max(0, (held[id] || 1) - 1); delete held['p' + e.pointerId]; } }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    function retry() { const s = stage; pl.hp = pl.max; pl.st = 'idle'; pl.h = 0; startStage(s); }
    function onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return; const k = e.key, down = e.type === 'keydown';
      const map = { ArrowLeft: 'left', ArrowRight: 'right', c: 'block', C: 'block' };
      if (map[k]) { keys[map[k]] = down; e.preventDefault(); return; }
      if (!down) return;
      if (k === 'ArrowUp') { playerJump(); e.preventDefault(); } else if (k === 'z' || k === 'Z') playerAttack('punch'); else if (k === 'x' || k === 'X') playerAttack('kick');
      else if (k === 'Enter') { if (mode === 'dialog' && !node.ch) advance(); else if (mode === 'afterdlg') advance(); else if (mode === 'over') retry(); else if (mode === 'end') restart(); }
    }
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);

    // ================= audio =================
    function blip(f, dur, type, vol, delay, slide) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.05, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function playEvents() {
      const ev = events; events = []; if (!cfg.sound) return;
      for (const e of ev) {
        if (e === 'swing') blip(300, 0.08, 'sawtooth', 0.03, 0, 120);
        else if (e === 'hit') blip(180, 0.1, 'square', 0.09, 0, 70);
        else if (e === 'ouch') blip(140, 0.18, 'sawtooth', 0.09, 0, 60);
        else if (e === 'block') blip(500, 0.05, 'square', 0.05);
        else if (e === 'parry') { blip(1200, 0.12, 'square', 0.07, 0, 2400); blip(1800, 0.2, 'triangle', 0.06, 0.05); }
        else if (e === 'warn') blip(880, 0.07, 'square', 0.05);
        else if (e === 'warn2') { blip(220, 0.1, 'square', 0.06); blip(220, 0.1, 'square', 0.06, 0.15); }
        else if (e === 'kick') blip(90, 0.25, 'triangle', 0.14, 0, 40);
        else if (e === 'jump') blip(260, 0.12, 'square', 0.03, 0, 520);
        else if (e === 'bell') [660, 880].forEach((f, k) => blip(f, 0.15, 'square', 0.05, k * 0.12));
        else if (e === 'ko') [392, 330, 262].forEach((f, k) => blip(f, 0.2, 'square', 0.06, k * 0.14));
        else if (e === 'over') [262, 220, 175, 131].forEach((f, k) => blip(f, 0.25, 'sawtooth', 0.06, k * 0.2));
        else if (e === 'win') [523, 659, 784, 1047, 1319].forEach((f, k) => blip(f, 0.16, 'square', 0.06, k * 0.1));
      }
    }
    const song = new Audio('assets/marshrutka-track.mp3'); song.preload = 'auto';
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

    // ================= drawing =================
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * F), Math.round(y * F), Math.max(1, Math.round(w * F)), Math.max(1, Math.round(h * F))); };
    function person(cx, fy, o) {
      // cx centre x, fy feet y (already minus jump height). o.face: 1 right, -1 left
      const f = o.face, st = o.st || 'idle', bob = st === 'walk' ? Math.round(Math.sin(t * 9 + (o.ph || 0))) : Math.round(Math.sin(t * 4 + (o.ph || 0)) * 0.8);
      const flash = o.flash > 0 && Math.floor(t * 30) % 2 === 0, sk = flash ? '#fff' : '#f0c9a0', top = flash ? '#fff' : o.top, pants = flash ? '#fff' : o.pants;
      if (st === 'dead') {                                         // lying on the floor
        R(cx - 14, fy - 7, 12, 7, top); R(cx - 2, fy - 7, 8, 6, pants); R(cx + 6, fy - 5, 6, 4, '#222'); R(cx - 20, fy - 8, 8, 8, sk); R(cx - 20, fy - 9, 8, 3, o.hair); return;
      }
      const lean = st === 'hurt' ? -f * 2 : st === 'wind' ? -f * 1 : 0, hy = fy - 38 + bob * 0.5;
      const w = o.wide ? 18 : 14;
      // legs
      const l1 = st === 'walk' ? Math.round(Math.sin(t * 9 + (o.ph || 0)) * 2) : 0;       // legs stand still unless the character really moves
      R(cx - 5 + l1, fy - 14, 4, 14, pants); R(cx + 1 - l1, fy - 14, 4, 14, pants); R(cx - 6 + l1, fy - 2, 5, 2, '#1a1a22'); R(cx + 1 - l1, fy - 2, 5, 2, '#1a1a22');
      if (st === 'kick') R(cx + f * 2, fy - 14, 4 * 1, 4, pants), R(cx + f * 4, fy - 14, 14 * f > 0 ? 14 : 14, 4, pants), R(cx + f * 16, fy - 15, 4, 6, '#1a1a22');
      // torso
      R(cx - w / 2 + lean, hy + 10, w, 16, top); if (o.vest) { R(cx - w / 2 + lean, hy + 10, w, 16, o.vest); R(cx - w / 2 + lean + (f > 0 ? 3 : 1), hy + 12, w - 4, 12, o.top); }
      if (o.coat) R(cx - w / 2 + lean - 1, hy + 24, w + 2, 12, top);
      // head
      R(cx - 5 + lean, hy, 10, 10, sk); R(cx - 5 + lean, hy - 1, 10, 3, o.hair);
      if (o.hairBig) { R(cx - 7 + lean, hy - 2, 14, 6, o.hair); R(cx - 7 + lean, hy + 3, 3, 8, o.hair); R(cx + 4 + lean, hy + 3, 3, 8, o.hair); }
      if (o.scarf) { R(cx - 6 + lean, hy - 2, 12, 5, o.scarf); R(cx - 6 + lean, hy + 3, 3, 4, o.scarf); R(cx + 3 + lean, hy + 3, 3, 4, o.scarf); R(cx - 3 + lean, hy - 1, 2, 1, '#fff'); }
      if (o.cap) { R(cx - 6 + lean, hy - 3, 12, 4, o.cap); R(cx + (f > 0 ? 2 : -9) + lean, hy, 7, 1.5, o.cap); }
      const ex = cx + lean - 2;
      R(cx + lean - 4, hy + 4, 3, 3, '#fff'); R(cx + lean + 1, hy + 4, 3, 3, '#fff');
      R(cx + lean - 4 + (f > 0 ? 1.5 : 0), hy + 5, 1.5, 2, '#111'); R(cx + lean + 1 + (f > 0 ? 1.5 : 0), hy + 5, 1.5, 2, '#111');
      if (st === 'hurt') { R(cx + lean - 5, hy + 3, 10, 1, '#111'); R(cx - 2 + lean, hy + 8, 4, 2, '#7a1a1a'); }
      else if (st === 'wind' || st === 'act') { R(cx + lean - 5, hy + 3, 4, 1.5, '#111'); R(cx + lean + 1, hy + 3, 4, 1.5, '#111'); R(cx - 2 + lean, hy + 8, 4, 1.5, '#7a1a1a'); }
      else R(cx - 1 + lean + f, hy + 8, 3, 1, '#8a4a3a');
      // arms & weapons
      if (st === 'block') { R(cx + f * 2 - 3, hy + 3, 8, 6, top); R(cx + f * 2 - 3, hy + 9, 8, 3, sk); R(cx + f * 4, hy + 2, 3, 12, '#9fd8ff'); }
      else if (st === 'punch' || (st === 'act' && o.arm === 'punch')) { const len = 14; R(cx + (f > 0 ? 4 : -4 - len), hy + 14, len, 4, top); R(cx + (f > 0 ? 4 + len : -4 - len - 4), hy + 13, 4, 6, sk); }
      else if (st === 'wind') { R(cx - f * 8 - 2, hy + 6, 4, 14, top); R(cx - f * 8 - 2, hy + 4, 4, 3, sk); }
      else {                                                       // fighting stance: back arm down, front fist up and bobbing
        const sw = Math.round(Math.sin(t * 8 + (o.ph || 0)) * 1.5);
        R(cx - f * 8 - 1.5, hy + 12 - bob, 3, 11, top); R(cx - f * 8 - 1.5, hy + 23 - bob, 3, 3, sk);
        R(cx + f * 5 - (f > 0 ? 0 : 5), hy + 13 + sw, 5, 4, top); R(cx + f * 10 - (f > 0 ? 0 : 4), hy + 11 + sw, 4, 5, sk);
      }
      if (o.prop) o.prop(cx, hy, f, st);
    }
    const CONDUCTOR = { hair: '#555', top: '#e8832a', vest: '#f2a03a', pants: '#2c2c3a', cap: '#3a3f4a' };
    const BABKA = { hair: '#cfcfd6', top: '#7a5a3a', pants: '#4a3a2a', scarf: '#c0392b', wide: true, coat: true };
    const MOTHER = { hair: '#7a2a1a', top: '#8a4aa8', pants: '#2c2840', hairBig: true, wide: true, coat: true };
    const PLAYER = { hair: '#432a1a', top: '#3a6fd8', pants: '#2a3350' };
    function scene() {
      const gy = ground(), sh = shake > 0 ? Math.sin(t * 90) : 0;
      // wall (moldy teal), windows
      R(0, 0, LW, LH, '#5f7468'); R(0, 0, LW, 16, '#47564e'); R(0, gy - 70, LW, 3, '#4a5a52');
      for (let i = 0; i < 3; i++) {
        const wx = 6 + i * Math.floor((LW - 12) / 3), ww = Math.floor((LW - 12) / 3) - 4, wy = 24, wh = gy - 98;
        R(wx - 2, wy - 2, ww + 4, wh + 4, '#3d4a43'); R(wx, wy, ww, wh, '#8fb9cf');
        for (let b = 0; b < 4; b++) { const bx = ((b * 29 + (t * 22 + i * 17)) % (ww + 20)) - 10; R(wx + ww - bx - 14, wy + wh - 10 - (b % 3) * 4, 14, 10 + (b % 3) * 4, '#5b6b78'); R(wx + ww - bx - 11, wy + wh - 7 - (b % 3) * 4, 2, 2, '#f2e08a'); }
        R(wx, wy, ww, 2, '#b8d8e8'); R(wx, wy + wh - 2, ww, 2, '#4a5a52');
      }
      // lower wall panel, ads, rust
      R(0, gy - 67, LW, 67, '#6b5a4a'); R(0, gy - 67, LW, 2, '#8a7660');
      R(10, gy - 60, 22, 16, '#d9c9a0'); R(12, gy - 58, 18, 3, '#c0392b'); R(12, gy - 53, 14, 1, '#555'); R(12, gy - 50, 12, 1, '#555');
      R(LW - 34, gy - 60, 24, 14, '#f2e08a'); R(LW - 32, gy - 57, 20, 2, '#222'); R(LW - 32, gy - 52, 12, 1, '#555');
      for (let i = 0; i < 14; i++) R((i * 47) % LW, gy - 66 + (i * 13) % 60, 4 + i % 3, 2, i % 2 ? '#7a4a2a' : '#4e5e3a');
      // handrail with straps
      R(0, gy - 82, LW, 2, '#e8c21a'); for (let i = 0; i < 5; i++) { const sx = 14 + i * (LW / 5), sw = Math.sin(t * 2 + i) * 1.5 + (shake > 0 ? sh * 2 : 0); R(sx, gy - 80, 1, 6, '#222'); R(sx - 2 + sw, gy - 74, 5, 5, '#222'); R(sx - 1 + sw, gy - 73, 3, 3, '#6b5a4a'); }
      // floor
      R(0, gy, LW, LH - gy, '#3b2c22'); for (let y = gy; y < LH; y += 8) R(0, y, LW, 1, '#2c2018'); R(0, gy, LW, 2, '#5a4636');
      for (let i = 0; i < 10; i++) R((i * 61) % LW, gy + 4 + (i * 7) % 18, 3, 2, i % 2 ? '#6a5a40' : '#2a4a2a');
      // seats at the back (left + right ends)
      R(0, gy - 36, 14, 22, '#3a4f78'); R(0, gy - 38, 4, 24, '#2c3c5e'); R(0, gy - 16, 14, 6, '#2c3c5e');
      if (stage === 2) R(LW - 14, gy - 36, 14, 22, '#7a3a5a'), R(LW - 4, gy - 38, 4, 24, '#5e2c46'), R(LW - 14, gy - 16, 14, 6, '#5e2c46');
      else R(LW - 14, gy - 36, 14, 22, '#3a4f78'), R(LW - 4, gy - 38, 4, 24, '#2c3c5e'), R(LW - 14, gy - 16, 14, 6, '#2c3c5e');
      // characters
      const pP = Object.assign({ face: 1, st: pl.st, flash: pl.flash, ph: 0, prop: (cx, hy, f, st) => { R(cx - f * 8 - 4, hy + 11, 4, 12, '#c0392b'); } }, PLAYER);
      const eoP = enemyStyle();
      // waves
      for (const w of waves) { for (let k = 0; k < 4; k++) R(w.x + k * 2, gy - 2 - k, 2, 2 + k, 'rgba(255,230,120,' + (0.9 - k * 0.15) + ')'); R(w.x - 2, gy - 6, 5, 6, '#ffd23a'); }
      // kid (boss stage)
      if (stage === 2) {
        const kx = LW - 6, kick = kidWarn > 0 ? Math.sin(t * 40) : 0;
        R(kx - 4, gy - 22, 8, 10, '#4fb86a'); R(kx - 3, gy - 30, 7, 7, '#f0c9a0'); R(kx - 3, gy - 31, 7, 3, '#2a1a10'); R(kx - 4, gy - 12, 3, 12, '#2c4a88'); R(kx + 1 - (kidWarn > 0 ? 6 + kick * 2 : 0), gy - 12, 3, 12, '#2c4a88');
        if (kidWarn > 0) { R(kx - 14 + kick * 2, gy - 4, 8, 3, '#d33'); }
      }
      if (mode !== 'ko' || en.hp > 0 || true) person(en.x, gy - en.h, eoP);
      person(pl.x, gy - pl.h, pP);
      // telegraph
      if (mode === 'fight' && en.st === 'wind') { const low = en.atk.low; R(en.x - 1, gy - 62, 3, 9, low ? '#3a8cff' : '#ff3b3b'); R(en.x - 1, gy - 51, 3, 3, low ? '#3a8cff' : '#ff3b3b'); }
      if (stage === 2 && kidWarn > 0) { R(LW - 8, gy - 62, 3, 9, '#3a8cff'); R(LW - 8, gy - 51, 3, 3, '#3a8cff'); }
      for (const p of parts) R(p.x, p.y, 2, 2, p.col);
      // HUD bars
      const bw = Math.floor((LW - 18) / 2), by = 20;
      R(5, by, bw + 2, 8, '#111'); R(6, by + 1, bw, 6, '#3a3a46'); R(6, by + 1, Math.round(bw * pl.hp / pl.max), 6, pl.hp / pl.max < 0.3 ? '#ff5a5a' : '#4fe05a');
      R(LW - 5 - bw - 2, by, bw + 2, 8, '#111'); R(LW - 5 - bw - 1, by + 1, bw, 6, '#3a3a46'); const ew = Math.round(bw * en.hp / en.max); R(LW - 5 - 1 - ew, by + 1, ew, 6, '#ffb02e');
    }
    function enemyStyle() {
      const base = en.def.id === 'conductor' ? CONDUCTOR : en.def.id === 'babka' ? BABKA : MOTHER, E = en.def.id;
      const o = Object.assign({}, base, { face: en.face, st: en.st === 'act' ? 'act' : en.st === 'wind' ? 'wind' : en.st === 'hurt' ? 'hurt' : en.st === 'dead' ? 'dead' : en.st === 'heal' ? 'idle' : (Math.abs(0) || en.st === 'idle' ? 'walk' : 'idle'), flash: en.flash, ph: 1.3 + (en.def.id === 'babka' ? 0.8 : 0) });
            o.arm = 'punch';
      o.prop = (cx, hy, f, st) => {
        const act = st === 'act', wind = st === 'wind';
        if (E === 'conductor') { R(cx - f * 8 - 1, hy + 14, 5, 4, '#c0c4cc'); if (act) R(cx + f * 18, hy + 12, 7, 5, '#c0c4cc'); R(cx - 5, hy + 12, 10, 3, '#8a5a2b'); }
        else if (E === 'babka') { const len = act ? en.atk.reach : wind ? 12 : 16; if (en.atk && en.atk.low && (act || wind)) R(cx + f * 4 - (f > 0 ? 0 : len), gy2() - 3, len, 2, '#6b4423'); else R(cx + f * 12 - 1, hy + (act ? 14 : 8), 2, act ? 1 : 22, '#6b4423'), act && R(cx + f * 6 - (f > 0 ? 0 : len - 6), hy + 14, len, 2, '#6b4423'); R(cx - f * 9 - 3, hy + 20, 7, 8, '#caa84a'); }
        else { R(cx - f * 9 - 3, hy + 22, 9, 8, '#b8396a'); if (act) R(cx + f * 6 - (f > 0 ? 0 : en.atk.reach), hy + 14, en.atk.reach, 8, '#b8396a'); }
      };
      return o;
    }
    const gy2 = () => ground();

    // ================= overlay (text in CSS pixels) =================
    function wrap(text, maxW) {
      const words = text.split(' '), lines = []; let cur = '';
      for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
      if (cur) lines.push(cur); return lines;
    }
    function pbox(x, y, w, h, fill, border) { ctx.fillStyle = border || '#111'; ctx.fillRect(x, y, w, h); ctx.fillStyle = fill; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); }
    function overlay() {
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const fs = Math.max(11, Math.min(17, W * 0.04)), mono = s => s + 'px "Courier New", monospace';
      // names in the HUD
      ctx.font = '700 ' + mono(Math.max(9, u * 3)); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.textAlign = 'left'; ctx.strokeText('ТЫ', 8 * u, 33 * u); ctx.fillText('ТЫ', 8 * u, 33 * u);
      ctx.textAlign = 'right'; ctx.strokeText(en.def.name, (LW - 8) * u, 33 * u); ctx.fillText(en.def.name, (LW - 8) * u, 33 * u);
      ctx.textAlign = 'center';
      if (sayT > 0 && mode === 'fight') { ctx.font = '800 ' + mono(Math.max(12, u * 4.5)); const tx = Math.max(60, Math.min(W - 60, (stage === 2 && sayTxt.startsWith('Малыш') ? W / 2 : en.x * u))); ctx.fillStyle = sayTxt.startsWith('Малыш') ? '#6fb4ff' : '#fff'; ctx.strokeText(sayTxt, tx, (ground() - 76) * u); ctx.fillText(sayTxt, tx, (ground() - 76) * u); }
      if (bannerT > 0) { ctx.font = '800 ' + mono(Math.min(40, u * 9)); ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#3a2600'; ctx.lineWidth = 5; ctx.strokeText(banner, W / 2, 70 * u); ctx.fillText(banner, W / 2, 70 * u); }
      if (hint && mode === 'fight' && bannerT <= 0) { ctx.font = '700 ' + mono(Math.max(10, u * 3)); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('красный ! — блок (в последний миг = ОТРАЖЕНИЕ) · синий ! — прыжок', W / 2, 58 * u); }
      // bottom panel
      const top = H - ctrlH; ctx.fillStyle = '#14141c'; ctx.fillRect(0, top, W, ctrlH); ctx.fillStyle = '#2a2a38'; ctx.fillRect(0, top, W, 3);
      if (mode === 'fight' || mode === 'ko') {
        for (const b of btns) {
          const pressed = held[b.id] > 0 || keys[b.id]; ctx.fillStyle = pressed ? '#4a5aa0' : '#22264a'; ctx.strokeStyle = '#5a68b0'; ctx.lineWidth = 2;
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 12); else ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#eef'; ctx.font = '700 ' + (b.w > W * 0.3 ? mono(fs) : (b.label.length < 3 ? '700 ' + b.h * 0.42 + 'px system-ui' : mono(fs))).replace(/^700 /, ''); ctx.font = (b.w > W * 0.3 ? '700 ' + mono(fs) : '700 ' + Math.round(b.h * 0.42) + 'px system-ui, sans-serif'); ctx.textAlign = 'center'; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
        }
      } else if (mode === 'dialog' || mode === 'afterdlg') {
        const cur = mode === 'dialog' ? node : afterQ[0]; if (!cur) return;
        const pad = 8, pw = W - pad * 2; pbox(pad, top + pad, pw, ctrlH - pad * 2, '#f2ecd8', '#111');
        ctx.textAlign = 'left'; ctx.font = '800 ' + mono(fs); ctx.fillStyle = cur.who === 'ТЫ' ? '#2a4fb8' : '#b8321a'; ctx.fillText(cur.who, pad + 14, top + pad + 18);
        ctx.font = '600 ' + mono(fs); ctx.fillStyle = '#222';
        const txt = cur.t.slice(0, Math.floor(typed)), lines = wrap(cur.t, pw - 28), shown = wrap(txt, pw - 28); lines.length;
        shown.forEach((l, i) => ctx.fillText(l, pad + 14, top + pad + 40 + i * (fs + 5)));
        choiceRects = [];
        if (mode === 'dialog' && node.ch && typed >= node.t.length) {
          const ch = node.ch, cw = pw - 20, chh = Math.min(38, (ctrlH - 2 * pad - 40 - lines.length * (fs + 5) - 8) / ch.length - 4);
          const startY = top + ctrlH - pad - 8 - ch.length * (chh + 4);
          ch.forEach((c, i) => { const r = { x: pad + 10, y: startY + i * (chh + 4), w: cw, h: chh }; choiceRects.push(r); pbox(r.x, r.y, r.w, r.h, '#cfe3ff', '#2a4fb8'); ctx.fillStyle = '#12306e'; ctx.font = '700 ' + mono(Math.max(10, fs - 1)); ctx.textAlign = 'center'; ctx.fillText(c[0], r.x + r.w / 2, r.y + r.h / 2); });
        } else { ctx.textAlign = 'right'; ctx.font = '700 ' + mono(fs - 2); ctx.fillStyle = '#777'; if (typed >= cur.t.length) ctx.fillText('нажмите ▶', W - pad - 14, top + ctrlH - pad - 12); }
      }
      if (mode === 'over') { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#ff5a5a'; ctx.font = '800 ' + mono(Math.min(34, u * 8)); ctx.fillText('ВЫКИНУЛИ НА ОСТАНОВКЕ', W / 2, H * 0.38); ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 2); ctx.fillText('нажмите, чтобы попробовать снова', W / 2, H * 0.48); }
      if (mode === 'end') { ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23a'; ctx.font = '800 ' + mono(Math.min(38, u * 9)); ctx.fillText('КОНЕЧНАЯ!', W / 2, H * 0.36); ctx.fillStyle = '#fff'; ctx.font = '700 ' + mono(fs + 2); ctx.fillText('вы победили гнилую маршрутку', W / 2, H * 0.45); ctx.fillStyle = '#9fd8ff'; ctx.fillText('нажмите, чтобы сыграть ещё раз', W / 2, H * 0.55); }
      for (const f of floats) { ctx.globalAlpha = Math.max(0, f.life / 0.9); ctx.font = '800 ' + mono(Math.max(11, u * 4)); ctx.fillStyle = f.col; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText(f.s, f.x * u, f.y * u); ctx.fillText(f.s, f.x * u, f.y * u); ctx.globalAlpha = 1; }
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0d0d14'; ctx.fillRect(0, 0, W, H);
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
      off = document.createElement('canvas'); off.width = LW * F; off.height = LH * F; g = off.getContext('2d'); layoutBtns();
      if (en && pl) { en.x = Math.min(en.x, LW - 12); }
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
      debug: { update, advance, attack: playerAttack, jump: playerJump, get mode() { return mode; }, get stage() { return stage; }, get pl() { return pl; }, get en() { return en; }, get nodeId() { return nodeId; }, set heldBlock(v) { held.block = v ? 1 : 0; } }
    };
  }
});
