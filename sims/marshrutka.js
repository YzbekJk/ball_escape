/* Файтинг «Гнилая маршрутка» (пиксель-арт). Сначала разговор с кондуктором о билете, потом бои:
   кондуктор → бабка, которая хочет сесть → босс: мамаша, за спиной у которой её ребёнок толкает кресло. */
Sims.register({
  id: 'marshrutka',
  kind: 'game',
  title: 'Гнилая маршрутка',
  desc: 'Пиксельный файтинг в маршрутке. Поговорите с кондуктором о билете, а потом драка: кондуктор, бабка, которая хочет ваше место, и босс — мамаша, чей ребёнок толкает ваше кресло.',

  defaults: { hp: 100, enemyPower: 1, speed: 1, sound: true, music: true, musicStart: 9, volume: 0.7 },
  schema: [
    { k: 'hp', l: 'Ваше здоровье', min: 40, max: 300, step: 10 },
    { k: 'enemyPower', l: 'Сила врагов ×', min: 0.3, max: 3, step: 0.1, live: 1 },
    { k: 'speed', l: 'Скорость игры ×', min: 0.5, max: 2, step: 0.1, live: 1 },
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'musicStart', l: 'С какой секунды трека начинать', min: 0, max: 60, step: 0.5, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#2b2a33'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#8fd3ff'; ctx.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.3);
    ctx.fillStyle = '#6b6f7a'; ctx.fillRect(w * 0.08, h * 0.42, w * 0.84, h * 0.06);
    ctx.fillStyle = '#4a3b30'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(w * 0.2, h * 0.38, w * 0.1, h * 0.34); ctx.fillStyle = '#2a6fdb'; ctx.fillRect(w * 0.19, h * 0.5, w * 0.12, h * 0.22);
    ctx.fillStyle = '#ffb3c6'; ctx.fillRect(w * 0.68, h * 0.4, w * 0.1, h * 0.32); ctx.fillStyle = '#c0392b'; ctx.fillRect(w * 0.67, h * 0.52, w * 0.12, h * 0.2);
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(w * 0.08, h * 0.06, w * 0.35, h * 0.04); ctx.fillStyle = '#4fe05a'; ctx.fillRect(w * 0.57, h * 0.06, w * 0.35, h * 0.04);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const F = 2;
    let W = 0, H = 0, dpr = 1, u = 3, LW = 130, LH = 260, off, g;
    let mode, stage, dlg, dlgChars, dlgSel, P, E, shots, sparks, pops, t, shake, floorY, events, banner, kidT, seatShake, kidSay, held, waves, stats, resultT;
    let paused = false, last = 0, raf = 0, on = true, btns = [], choiceBtns = [], dlgBox = null;

    // ---------- сценарий ----------
    const YOU = { n: 'Ты', k: 'you' }, KON = { n: 'Кондуктор', k: 'conductor' }, BAB = { n: 'Бабка', k: 'granny' }, MAM = { n: 'Мамаша', k: 'mother' }, KID = { n: 'Ребёнок', k: 'kid' };
    const L = (who, text) => ({ who, text });
    const CH = (opts) => ({ choice: opts });
    const STAGES = [
      { enemy: 'conductor', name: 'КОНДУКТОР', hp: 55,
        intro: [L(KON, 'Молодой человек! Оплачиваем проезд! Сорок рублей.'),
          CH([{ t: 'Картой можно?', reply: [L(KON, 'Картой?! Терминал сломан с две тысячи седьмого.')] },
              { t: 'А билет обязательно?', reply: [L(KON, 'Обязательно! Без билета — штраф и высадка на ходу.')] }]),
          L(YOU, 'Тогда давайте билет, я заплачу.'),
          L(KON, 'Билетов нет. Кончились. Рулон закончился ещё в среду.'),
          CH([{ t: 'Как это — нет билетов?', reply: [L(KON, 'А вот так! Значит, ты безбилетник!')] },
              { t: 'Тогда я еду бесплатно?', reply: [L(KON, 'Бесплатно?! Ах ты заяц! Держите его!')] }]),
          L(KON, 'Всё, сам напросился! Покажу, как у нас штрафуют!')],
        outro: [L(KON, 'Ладно, ладно... Проезжай. Бесплатно... Только не бей больше.')] },
      { enemy: 'granny', name: 'БАБКА', hp: 85,
        intro: [L(BAB, 'Молодой человек! А ну-ка уступи место!'),
          CH([{ t: 'Садитесь, пожалуйста.', reply: [L(BAB, 'Не надо мне твоё место! Ты вон кондуктора избил, хулиган!')] },
              { t: 'Я первый сел.', reply: [L(BAB, 'Ах ты нахал! В наше время молодёжь уважала старших!')] }]),
          L(BAB, 'Я тебя сейчас сумкой уважу! Там кабачки!')],
        outro: [L(BAB, 'Ох, спина... Ладно, постою. Но я всё запомнила!')] },
      { enemy: 'mother', name: 'МАМАША', hp: 140,
        intro: [L(MAM, 'Не оборачивайтесь на моего ребёнка! Он просто играет!'),
          L(KID, 'Тык-тык-тык!'),
          CH([{ t: 'Он толкает моё кресло!', reply: [L(MAM, 'Ребёнок развивается! А вы нервный!')] },
              { t: 'Вы можете его успокоить?', reply: [L(MAM, 'Успокоить?! Это вы его расстроили! Всё, готовьтесь!')] }]),
          L(KID, 'Мам, он смотрит! Давай ещё сильнее!'),
          L(MAM, 'Давай, сынок! Покажем ему, где тут проезд для людей!')],
        outro: [L(MAM, 'Ой... ну ладно... Сынок, перестань толкать кресло.'), L(KID, 'Ладно...'), L(YOU, 'Наконец-то. Моя остановка.')] }
    ];

    // ---------- портреты (12×12) ----------
    const PAL = { '.': null, s: '#f0c9a0', e: '#1c1c22', m: '#8a3a30', b: '#4a3020', w: '#fff', c: '#3b4a7a', C: '#e8c14a', h: '#2a2230', H: '#7a4a20', k: '#d65a8a', K: '#f2a6c4', g: '#aab0b8', u: '#3a2a22', r: '#c0392b', R: '#7a1a1a', o: '#ffb347', y: '#1a1a22', G: '#2fa84a' };
    const FACES = {
      you: ['..hhhhhhhh..', '.hhhhhhhhhh.', '.hhsssssshh.', '.ssssssssss.', '.sbbssssbbs.', '.sesssssses.', '.ssssssssss.', '..sssmmsss..', '...ssssss...', '..GGGGGGGG..', '.GGGGGGGGGG.', '.GGGGGGGGGG.'],
      conductor: ['..cccccccc..', '.cccCCCCccc.', '.cccccccccc.', '.ssssssssss.', '.sbbssssbbs.', '.sesssssses.', '.ssssssssss.', '..suuuuuus..', '..ssmmmmss..', '...ssssss...', '.gggwwwwggg.', '.gggggggggg.'],
      granny: ['..kkkkkkkk..', '.kkkkkkkkkk.', '.kkssssssKk.', '.kssssssssk.', '.ksyyssyyssk'.slice(0, 12), '.kseyssseyk.', '.kssssssssk.', '..sssmmsss..', '...ssssss...', '..KKKKKKKK..', '.KKkKKKKkKK.', '.KKKKKKKKKK.'],
      mother: ['.hhhhhhhhhh.', 'hhhhhhhhhhhh', 'hhhssssssshh', 'hhsssssssshh', 'hhsbbsssbbsh', 'hhsesssssesh', 'hhssssssssh.'.slice(0, 12), '.hsssmmmsssh', '..sssmmsss..', '...ssssss...', '.rrrrrrrrrr.', '.rrrrrrrrrr.'],
      kid: ['............', '..HHHHHHHH..', '.HHHHHHHHHH.', '.HsssssssHH.', '.ssssssssss.', '.sesssssses.', '.ssssssssss.', '..ssmmmmss..', '...ssssss...', '..oooooooo..', '.oooooooooo.', '.oooooooooo.']
    };
    function portrait(x, y, p, kind) {
      const f = FACES[kind]; if (!f) return;
      for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) { const col = PAL[f[r][c]]; if (col) { ctx.fillStyle = col; ctx.fillRect(x + c * p, y + r * p, p, p); } }
    }

    // ---------- сущности ----------
    const rnd = (a, b) => a + Math.random() * (b - a);
    function startStage(i) {
      stage = i; const S = STAGES[i];
      P = { x: 24, y: 0, vy: 0, hp: cfg.hp, max: cfg.hp, face: 1, st: 'idle', stT: 0, hitDone: false, block: false, inv: 0 };
      const ex = S.enemy === 'mother' ? LW - 24 : LW - 30;
      E = { kind: S.enemy, name: S.name, x: ex, hp: S.hp, max: S.hp, face: -1, st: 'idle', stT: 0, cd: 1.2, hitDone: false, dead: false, mv: 0, ko: 0 };
      shots = []; waves = []; sparks = []; pops = []; kidT = 5; seatShake = 0; kidSay = ''; held = {};
      mode = 'dialog'; dlg = S.intro.slice(); dlgChars = 0; dlgSel = null;
    }
    function restart() { t = 0; shake = 0; events = []; banner = null; stats = { time: 0, deaths: 0 }; resultT = 0; startStage(0); }
    function startFight() { mode = 'fight'; banner = { text: 'БОЙ!', t: 1.1 }; events.push('start'); }
    function nextLine() {
      const cur = dlg[0];
      if (!cur) return;
      if (cur.choice) return;                                  // waits for a choice
      dlg.shift(); dlgChars = 0;
      if (!dlg.length) { if (mode === 'dialog') startFight(); else if (mode === 'outro') { if (stage + 1 < STAGES.length) startStage(stage + 1); else { mode = 'end'; events.push('win'); } } }
    }
    function choose(i) {
      const c = dlg[0].choice[i]; dlg.shift(); dlg.unshift.apply(dlg, c.reply); dlgChars = 0;
    }

    // ---------- бой ----------
    const dmgMul = () => cfg.enemyPower;
    function hurtPlayer(d, kb, fromX) {
      if (P.inv > 0 || mode !== 'fight') return;
      if (P.block && Math.sign(fromX - P.x) === P.face) { d *= 0.15; kb *= 0.3; events.push('block'); spark(P.x + P.face * 8, -22, '#8ad'); }
      else { P.st = 'hurt'; P.stT = 0.3; shake = 0.2; events.push('hit'); spark(P.x, -24, '#ff5a5a'); }
      d = Math.round(d); P.hp -= d; P.x += Math.sign(P.x - fromX || -1) * kb; P.inv = 0.35; pops.push({ x: P.x, y: -48, t: 0.8, s: '-' + d, c: '#ff6a6a' });
      if (P.hp <= 0) { P.hp = 0; mode = 'lose'; stats.deaths++; events.push('lose'); }
    }
    function hurtEnemy(d, kb) {
      if (E.dead) return;
      E.hp -= d; events.push('punch'); spark(E.x, -24, '#ffd23a'); pops.push({ x: E.x, y: -50, t: 0.8, s: '-' + d, c: '#ffe06a' });
      if (E.kind !== 'mother') { E.x += Math.sign(E.x - P.x) * kb; if (E.st !== 'attack') { E.st = 'hurt'; E.stT = d > 9 ? 0.4 : 0.22; E.hitDone = true; } }
      if (E.hp <= 0) { E.hp = 0; E.dead = true; E.ko = 0; mode = 'ko'; events.push('ko'); banner = { text: 'ПОБЕДА!', t: 1.6 }; shots = []; waves = []; }
    }
    function spark(x, y, c) { for (let i = 0; i < 8; i++) sparks.push({ x, y, vx: rnd(-50, 50), vy: rnd(-60, 10), t: 0.4, c }); }
    function pAttack(type) {
      if (mode !== 'fight' || P.hp <= 0 || ['punch', 'kick', 'hurt'].includes(P.st)) return;
      P.st = type; P.stT = 0; P.hitDone = false; events.push('swing');
    }
    function updatePlayer(dt) {
      if (P.inv > 0) P.inv -= dt;
      P.block = !!held.block && P.y === 0 && ['idle', 'walk', 'block'].includes(P.st);
      if (P.block) P.st = 'block'; else if (P.st === 'block') P.st = 'idle';
      if (P.st === 'punch' || P.st === 'kick' || P.st === 'hurt') {
        P.stT += dt; const dur = P.st === 'punch' ? 0.28 : P.st === 'kick' ? 0.5 : 0.3;
        if (!P.hitDone && P.stT >= (P.st === 'punch' ? 0.1 : 0.22) && P.st !== 'hurt') {
          P.hitDone = true; const reach = P.st === 'punch' ? 26 : 32, d = P.st === 'punch' ? 7 : 13;
          if (!E.dead && Math.sign(E.x - P.x) === P.face && Math.abs(E.x - P.x) < reach + 6 && P.y < 14) hurtEnemy(d, P.st === 'kick' ? 12 : 5);
        }
        if (P.stT >= dur) { P.st = 'idle'; P.stT = 0; }
      } else if (!P.block) {
        let mv = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        if (mv) { P.face = mv; P.st = 'walk'; P.x += mv * 55 * dt * cfg.speed; } else P.st = P.y > 0 ? P.st : 'idle';
      }
      if (held.up && P.y === 0 && P.st !== 'hurt') { P.vy = 135; held.upConsumed = true; events.push('jump'); }
      if (P.y > 0 || P.vy > 0) { P.vy -= 270 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; } }
      const minX = 10, maxX = E.kind === 'mother' ? E.x - 12 : LW - 10;
      P.x = Math.max(minX, Math.min(maxX, P.x));
      if (E.kind !== 'mother' && !E.dead) { const mind = 12; if (Math.abs(P.x - E.x) < mind) P.x = E.x - Math.sign(E.x - P.x || 1) * mind; }
      if (!E.dead && (P.st === 'idle' || P.st === 'walk' || P.st === 'block') && Math.abs(E.x - P.x) > 3) P.face = Math.sign(E.x - P.x) || P.face;
    }
    function updateEnemy(dt) {
      if (E.dead) { E.ko += dt; return; }
      const dir = Math.sign(P.x - E.x) || -1; if (E.st !== 'attack') E.face = dir;
      E.stT += dt; E.cd -= dt;
      const pow = dmgMul();
      if (E.kind === 'mother') { bossAI(dt, pow); return; }
      const sp = (E.kind === 'conductor' ? 30 : 22) * cfg.speed, reach = E.kind === 'conductor' ? 24 : 30;
      if (E.st === 'hurt') { if (E.stT >= (E.hurtDur || 0.3)) { E.st = 'idle'; E.cd = Math.max(E.cd, 0.35); } return; }
      if (E.st === 'wind') { if (E.stT >= (E.kind === 'conductor' ? 0.5 : 0.6)) { E.st = 'attack'; E.stT = 0; E.hitDone = false; events.push('swing'); } return; }
      if (E.st === 'attack') {
        const act = E.kind === 'granny' && E.charge ? 0.55 : 0.2;
        if (E.kind === 'granny' && E.charge) E.x += E.face * 105 * dt * cfg.speed;
        if (!E.hitDone && ((E.kind === 'granny' && E.charge) || E.stT > 0.08)) {
          const near = Math.abs(P.x - E.x) < reach + (E.charge ? 8 : 6) && Math.sign(P.x - E.x) === E.face;
          if (near && P.y < (E.charge ? 8 : 40)) { E.hitDone = true; hurtPlayer((E.kind === 'conductor' ? 8 : E.charge ? 15 : 12) * pow, 10, E.x); }
        }
        if (E.stT > act) { E.st = 'idle'; E.charge = false; E.cd = E.kind === 'conductor' ? rnd(0.7, 1.3) : rnd(1.0, 1.6); }
        E.x = Math.max(12, Math.min(LW - 10, E.x)); return;
      }
      E.x = Math.max(12, Math.min(LW - 10, E.x));
      const dist = Math.abs(P.x - E.x);
      if (E.kind === 'conductor' && E.cd <= 0 && dist > 40 && !E.shotT) { E.shotT = 1; E.cd = rnd(1.4, 2.2); shots.push({ x: E.x + E.face * 10, h: 9, vx: E.face * 85, w: 5, d: 6, c: '#fff', k: 'ticket' }); events.push('swing'); }
      if (dist > reach - 4) { E.x += dir * sp * dt; E.st = 'walk'; E.shotT = 0; }
      else E.st = 'idle';
      if (dist <= reach + 2 && E.cd <= 0 && P.hp > 0) { E.st = 'wind'; E.stT = 0; E.charge = false; }
      if (E.kind === 'granny' && E.cd <= 0 && dist > 55 && E.st !== 'wind') { E.st = 'wind'; E.stT = 0; E.charge = true; E.cd = 0; }
    }
    function bossAI(dt, pow) {
      const rage = E.hp < E.max * 0.5, dist = Math.abs(P.x - E.x);
      if (E.st === 'wind') { if (E.stT >= (rage ? 0.45 : 0.6)) { E.st = 'attack'; E.stT = 0; E.hitDone = false; events.push('swing'); } }
      else if (E.st === 'attack') {
        if (!E.hitDone && E.stT > 0.1) { E.hitDone = true; if (dist < 44 && P.y < 40) hurtPlayer(11 * pow, 12, E.x); }
        if (E.stT > 0.3) { E.st = 'idle'; E.cd = rnd(0.9, 1.6) * (rage ? 0.7 : 1); }
      } else if (E.st === 'idle') {
        if (E.cd <= 0) {
          if (dist < 40) { E.st = 'wind'; E.stT = 0; }
          else { E.st = 'throw'; E.stT = 0; }
        }
      } else if (E.st === 'throw') {
        if (E.stT > 0.55) { shots.push({ x: E.x - 10, h: 16, vx: -70 * (rage ? 1.3 : 1), w: 8, d: 9, c: '#8a5a2b', k: 'bag' }); events.push('swing'); E.st = 'idle'; E.cd = rnd(1.4, 2.2) * (rage ? 0.7 : 1); }
      } else if (E.st === 'hurt') { E.st = 'idle'; }
      // ребёнок толкает кресло
      kidT -= dt;
      if (kidT <= 0 && seatShake === 0) { seatShake = 0.9; kidSay = 'ТЫК-ТЫК-ТЫК!'; events.push('warn'); }
      if (seatShake > 0) {
        seatShake -= dt;
        if (seatShake <= 0) { seatShake = 0; kidT = rage ? rnd(3.2, 4.4) : rnd(5, 6.5); kidSay = ''; waves.push({ x: E.x - 8, vx: -95, w: 8, d: 13 }); shake = 0.25; events.push('thump'); }
      }
    }
    function updateShots(dt) {
      for (const s of shots) {
        s.x += s.vx * dt;
        if (!s.dead && Math.abs(s.x - P.x) < 7 + s.w / 2) {
          const ph = P.y;                                     // player spans heights [ph, ph+36]
          if (s.h >= ph - 2 && s.h <= ph + 36 && !(ph > s.h + 2)) { s.dead = true; hurtPlayer(s.d * dmgMul(), 8, s.x + Math.sign(s.vx) * 2 * -1 * -1 + 0); }
        }
        if (s.x < -10 || s.x > LW + 10) s.dead = true;
      }
      shots = shots.filter(s => !s.dead);
      for (const w of waves) {
        w.x += w.vx * dt;
        if (!w.dead && Math.abs(w.x - P.x) < 8 && P.y < 9) { w.dead = true; hurtPlayer(w.d * dmgMul(), 16, w.x + 1); }
        if (w.x < -10) w.dead = true;
      }
      waves = waves.filter(w => !w.dead);
    }

    function update(dt) {
      t += dt; if (shake > 0) shake -= dt; if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.t -= dt; } sparks = sparks.filter(s => s.t > 0);
      for (const p of pops) { p.y -= 14 * dt; p.t -= dt; } pops = pops.filter(p => p.t > 0);
      if (mode === 'dialog' || mode === 'outro') { const cur = dlg[0]; if (cur && cur.text) dlgChars = Math.min(cur.text.length, dlgChars + dt * 55); }
      if (mode === 'fight') { stats.time += dt; dt *= cfg.speed; updatePlayer(dt); updateEnemy(dt); updateShots(dt); }
      else if (mode === 'ko') { updatePlayer(dt * 0); E.ko += dt; if (E.ko > 1.8) { mode = 'outro'; dlg = STAGES[stage].outro.slice(); dlgChars = 0; } }
      else if (mode === 'lose' || mode === 'end') resultT += dt;
    }

    // ---------- звук ----------
    function blip(f, dur, type, vol, delay, slide) {
      const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.04, now + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    function playEvents() {
      const ev = events; events = []; if (!cfg.sound) return; let n = 0;
      for (const e of ev) {
        if (n++ > 3) break;
        if (e === 'swing') blip(380, 0.08, 'triangle', 0.03, 0, 160);
        else if (e === 'punch') blip(180, 0.1, 'square', 0.07, 0, 70);
        else if (e === 'hit') blip(130, 0.18, 'sawtooth', 0.07, 0, 55);
        else if (e === 'block') blip(500, 0.05, 'square', 0.04);
        else if (e === 'jump') blip(300, 0.1, 'triangle', 0.03, 0, 600);
        else if (e === 'warn') [700, 520, 700, 520].forEach((f, k) => blip(f, 0.08, 'square', 0.04, k * 0.1));
        else if (e === 'thump') blip(90, 0.3, 'sawtooth', 0.09, 0, 40);
        else if (e === 'start') [392, 523, 659].forEach((f, k) => blip(f, 0.12, 'square', 0.05, k * 0.09));
        else if (e === 'ko') [660, 523, 392, 262].forEach((f, k) => blip(f, 0.14, 'square', 0.05, k * 0.1));
        else if (e === 'lose') [330, 262, 196, 130].forEach((f, k) => blip(f, 0.25, 'sawtooth', 0.05, k * 0.17));
        else if (e === 'win') [523, 659, 784, 1047, 1319].forEach((f, k) => blip(f, 0.16, 'square', 0.06, k * 0.1));
      }
    }

    // ---------- саундтрек ----------
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

    // ---------- ввод ----------
    function layout() {
      const ctrlH = Math.min(120, Math.max(86, H * 0.14)), gap = 6, bs = Math.min(ctrlH - 14, (W - 7 * gap) / 6), y = H - ctrlH + (ctrlH - bs) / 2, x0 = (W - (bs * 6 + gap * 5)) / 2;
      btns = ['left:◀', 'right:▶', 'up:▲', 'punch:УДАР', 'kick:ПИНОК', 'block:БЛОК'].map((q, i) => { const p = q.split(':'); return { id: p[0], label: p[1], x: x0 + i * (bs + gap), y, w: bs, h: bs }; });
    }
    const ptrs = {};
    function hitBtn(list, x, y) { return list.find(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); }
    function onDown(e) {
      musicTick();
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mode === 'dialog' || mode === 'outro') {
        const cb = hitBtn(choiceBtns, x, y);
        if (dlg[0] && dlg[0].choice) { if (cb) choose(cb.i); return; }
        const cur = dlg[0]; if (cur && cur.text && dlgChars < cur.text.length) { dlgChars = cur.text.length; return; }
        nextLine(); return;
      }
      if (mode === 'lose') { if (resultT > 0.6) startStage(stage); return; }
      if (mode === 'end') { if (resultT > 0.8) restart(); return; }
      const b = hitBtn(btns, x, y); if (!b) return;
      ptrs[e.pointerId] = b.id; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      press(b.id, true);
    }
    function press(id, down) {
      if (id === 'left' || id === 'right' || id === 'block' || id === 'up') held[id] = down;
      else if (down && id === 'punch') pAttack('punch'); else if (down && id === 'kick') pAttack('kick');
    }
    const onUp = e => { const id = ptrs[e.pointerId]; if (id) { press(id, false); delete ptrs[e.pointerId]; } };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', c: 'block', C: 'block', z: 'punch', Z: 'punch', x: 'kick', X: 'kick' };
    function onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return; const id = KEYS[e.key];
      if (!id) { if ((e.key === 'Enter') && (mode === 'dialog' || mode === 'outro')) { onDown({ clientX: -1, clientY: -1, pointerId: 0 }); } return; }
      e.preventDefault(); if (e.repeat) return; musicTick(); press(id, e.type === 'keydown');
    }
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);

    // ---------- рисование ----------
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * F), Math.round(y * F), Math.max(1, Math.round(w * F)), Math.max(1, Math.round(h * F))); };
    function bus() {
      floorY = Math.round(LH * 0.6);
      R(0, 0, LW, LH, '#2b2a33');
      R(0, 18, LW, 4, '#3a3944');
      // window with scrolling city
      const wy = 26, wh = floorY - 26 - 52;
      R(4, wy, LW - 8, wh, '#8fd3ff'); R(4, wy, LW - 8, wh * 0.4, '#a9e0ff');
      const sc = (t * 22) % 60;
      for (let i = -1; i < LW / 30 + 2; i++) {
        const bx = i * 30 - (sc % 30), h2 = 14 + ((i * 7 + Math.floor(t * 22 / 30)) % 4 + 4) % 4 * 6;
        R(bx, wy + wh - h2, 22, h2, i % 2 ? '#7d8ca3' : '#6b7a92'); for (let k = 0; k < 3; k++) R(bx + 3 + k * 6, wy + wh - h2 + 4, 3, 3, '#cfe6ff');
      }
      R(4, wy + wh - 4, LW - 8, 4, '#5f6b7a');
      for (let x = 4; x < LW - 8; x += 40) R(x + 38, wy, 2, wh, '#2b2a33');
      R(2, wy - 2, LW - 4, 2, '#4a4958'); R(2, wy + wh, LW - 4, 2, '#4a4958');
      // lamp + handrail + straps
      R(0, 20, LW, 1, '#d8d8e0'); for (let x = 12; x < LW; x += 26) { R(x, 21, 1, 8 + Math.round(Math.sin(t * 3 + x) * 1), '#c8c8d0'); R(x - 2, 29, 5, 3, '#e8c14a'); }
      // wall below window + seats along the wall
      R(0, wy + wh + 2, LW, floorY - (wy + wh + 2) - 4, '#3f3a4a');
      for (let x = 6; x < LW - 20; x += 36) { R(x, floorY - 44, 26, 26, '#8c3a2f'); R(x, floorY - 44, 26, 3, '#a64a3d'); R(x + 3, floorY - 18, 20, 4, '#5a2a22'); }
      // floor
      R(0, floorY, LW, LH - floorY, '#4a3b30'); R(0, floorY, LW, 2, '#625040');
      for (let y = floorY + 8; y < LH; y += 10) R(0, y, LW, 1, '#3d3128');
      for (let x = 0; x < LW; x += 12) R(x, floorY + 3, 6, 1, '#5a4838');
    }
    function person(px, py, face, kind, pose, s) {
      s = s || 1;
      const rr = (dx, dy, w, h, col) => R(face > 0 ? px + dx * s : px - dx * s - w * s, py + dy * s, w * s, h * s, col);
      const pal = {
        you: { sk: '#f0c9a0', hair: '#2a2230', top: '#2fa84a', legs: '#2a3a7a', shoe: '#1a1a22' },
        conductor: { sk: '#f0c9a0', hair: '#3a2a22', top: '#3b4a7a', legs: '#2a2f45', shoe: '#1a1a22' },
        granny: { sk: '#f0c9a0', hair: '#aab0b8', top: '#f2a6c4', legs: '#f2a6c4', shoe: '#5a3a2a' },
        mother: { sk: '#f0c9a0', hair: '#7a4a20', top: '#c0392b', legs: '#2a2230', shoe: '#1a1a22' }
      }[kind];
      const walk = pose.walk ? Math.sin(t * 14) * 3 : 0, jump = pose.jump || 0;
      // legs
      if (kind === 'granny') { rr(-8, -17, 16, 12, pal.top); rr(-5, -6, 3, 6, '#d8b0a0'); rr(2, -6, 3, 6, '#d8b0a0'); rr(-6, -2, 5, 2, pal.shoe); rr(1, -2, 5, 2, pal.shoe); }
      else {
        rr(-5 + walk * 0.3, -14, 4, 14, pal.legs); rr(1 - walk * 0.3, -14, 4, 14, pal.legs);
        rr(-6 + walk * 0.3, -2, 6, 2, pal.shoe); rr(1 - walk * 0.3, -2, 6, 2, pal.shoe);
        if (pose.kick) rr(1, -14, 4 + 16 * pose.kick, 4, pal.legs), rr(5 + 16 * pose.kick, -15, 5, 6, pal.shoe);
      }
      // torso
      const hurtX = pose.hurt ? -2 : 0, bx = hurtX;
      rr(-6 + bx, -29, 12, 15, pal.top);
      if (kind === 'conductor') { rr(-2 + bx, -29, 4, 14, '#e8e8ee'); rr(3 + bx, -26, 2, 2, '#e8c14a'); rr(-5 + bx, -17, 10, 2, '#2a2f45'); }
      if (kind === 'you') { rr(-6 + bx, -29, 12, 3, '#238a3a'); }
      if (kind === 'mother') { rr(-6 + bx, -29, 12, 3, '#a02f24'); rr(-1 + bx, -29, 2, 8, '#e8c14a'); }
      if (kind === 'granny') { rr(-6 + bx, -29, 12, 3, '#d65a8a'); for (let k = 0; k < 3; k++) rr(-4 + k * 4 + bx, -24 + k * 2, 2, 2, '#fff'); }
      // head
      const hx = bx + (pose.warn ? Math.round(Math.sin(t * 40)) : 0);
      rr(-5 + hx, -40, 10, 11, pal.sk);
      if (kind === 'conductor') { rr(-6 + hx, -44, 12, 5, '#3b4a7a'); rr(2 + hx, -40, 6, 2, '#2a3560'); rr(-1 + hx, -43, 3, 2, '#e8c14a'); rr(0 + hx, -33, 6, 2, '#3a2a22'); }
      else if (kind === 'granny') { rr(-6 + hx, -42, 12, 5, '#d65a8a'); rr(-6 + hx, -38, 3, 9, '#d65a8a'); rr(2 + hx, -38, 4, 6, '#d65a8a'); rr(0 + hx, -36, 7, 3, '#3a3a44'); rr(1 + hx, -35, 2, 1, '#9fd8ff'); rr(4 + hx, -35, 2, 1, '#9fd8ff'); }
      else if (kind === 'mother') { rr(-7 + hx, -43, 14, 6, pal.hair); rr(-7 + hx, -39, 3, 9, pal.hair); rr(3 + hx, -39, 4, 6, pal.hair); }
      else { rr(-5 + hx, -41, 10, 4, pal.hair); rr(-5 + hx, -38, 2, 4, pal.hair); }
      rr(2 + hx, -36, 2, 2, '#fff'); rr(3 + hx, -36, 1, 2, '#1c1c22');                   // eye
      if (pose.angry) { rr(1 + hx, -38, 4, 1, '#4a2020'); }
      if (pose.hurt || pose.ko) rr(2 + hx, -32, 3, 2, '#8a3a30'); else rr(2 + hx, -32, 3, 1, '#8a3a30');
      // arms
      const ext = pose.punch || 0;
      rr(-8 + bx, -28, 3, 12, pal.top);                                                    // rear arm
      if (pose.block) { rr(4 + bx, -37, 4, 12, pal.top); rr(4 + bx, -39, 4, 3, pal.sk); rr(-1 + bx, -37, 4, 9, pal.top); }
      else if (ext > 0) { rr(5 + bx, -28, 4 + 14 * ext, 4, pal.top); rr(9 + 14 * ext + bx, -28, 4, 4, pal.sk); }
      else { rr(5 + bx, -28, 3, 12, pal.top); rr(5 + bx, -17, 3, 3, pal.sk); }
      if (pose.prop === 'bag') { const sw = pose.swing || 0; rr(7 + bx + sw * 8, -22 - sw * 10, 9, 8, '#8a5a2b'); rr(8 + bx + sw * 8, -24 - sw * 10, 7, 2, '#5a3a1a'); rr(10 + bx + sw * 8, -19 - sw * 10, 2, 2, '#e8c14a'); }
      if (pose.prop === 'stamp') { const sw = pose.swing || 0; rr(7 + bx + sw * 10, -27, 7, 5, '#c0392b'); rr(8 + bx + sw * 10, -22, 5, 2, '#222'); }
      if (pose.prop === 'umbrella') { const sw = pose.swing || 0; rr(8 + bx, -30, 2 + 34 * sw, 2, '#6b4aa8'); rr(8 + 34 * sw + bx, -33, 5, 8, '#8a5ad8'); }
      if (pose.wind) { rr(-1 + hx, -50, 3, 7, '#ff3b3b'); rr(-1 + hx, -41 - 1, 3, 2, '#ff3b3b'); }
    }
    function drawFighters() {
      const bump = Math.round(Math.sin(t * 9) * 0.5);
      // player
      const pp = { walk: P.st === 'walk' && P.y === 0, hurt: P.st === 'hurt', block: P.st === 'block', punch: P.st === 'punch' ? Math.sin(Math.min(1, P.stT / 0.28) * Math.PI) : 0, kick: P.st === 'kick' ? Math.sin(Math.min(1, P.stT / 0.5) * Math.PI) : 0, angry: mode === 'fight' };
      if (!(P.inv > 0 && Math.floor(t * 30) % 2 && P.st === 'hurt')) person(P.x, floorY - P.y + bump, P.face, 'you', pp, 1);
      if (P.y > 0) R(P.x - 6, floorY + 1, 12, 2, 'rgba(0,0,0,.35)'); else R(P.x - 7, floorY + 1, 14, 2, 'rgba(0,0,0,.3)');
      // enemy
      const k = E.kind;
      if (k === 'mother') {
        const ex = E.x, shk = seatShake > 0 ? Math.round(Math.sin(t * 60) * 2) : 0;
        // kid behind-left of the seat, pushing it
        const kidPush = seatShake > 0 ? Math.sin(t * 40) * 2 : 0;
        R(ex - 12 + kidPush, floorY - 18, 6, 10, '#ffb347'); R(ex - 13 + kidPush, floorY - 26, 8, 8, '#f0c9a0'); R(ex - 13 + kidPush, floorY - 27, 8, 3, '#7a4a20'); R(ex - 10 + kidPush, floorY - 23, 1, 2, '#1c1c22'); R(ex - 8 + kidPush, floorY - 23, 1, 2, '#1c1c22');
        R(ex - 16 + kidPush, floorY - 14, 5, 3, '#f0c9a0'); R(ex - 15, floorY - 6, 5, 6, '#2a3a7a'); 
        // mother sitting (upper body) behind a seat-back
        const pose = { warn: E.st === 'wind', wind: E.st === 'wind', angry: true, prop: E.st === 'wind' || E.st === 'attack' ? 'umbrella' : null, swing: E.st === 'attack' ? Math.sin(Math.min(1, E.stT / 0.3) * Math.PI) : (E.st === 'wind' ? 0.1 : 0), hurt: E.hp < E.max * 0.3 };
        person(ex + 4, floorY - 4, -1, 'mother', pose, 1.15);
        R(ex - 6 + shk, floorY - 38, 20, 36, '#8c3a2f'); R(ex - 6 + shk, floorY - 38, 20, 4, '#a64a3d'); R(ex - 4 + shk, floorY - 2, 16, 2, '#5a2a22');
        R(ex - 6 + shk, floorY - 38, 2, 36, '#6a2a22');
        if (E.dead) { R(ex - 4, floorY - 56, 14, 6, '#ff5a5a'); }
        if (kidSay) { /* drawn in overlay */ }
        return;
      }
      const pose = { walk: E.st === 'walk', hurt: E.st === 'hurt', wind: E.st === 'wind', warn: E.st === 'wind', angry: true, ko: E.dead };
      if (k === 'conductor') { pose.prop = 'stamp'; pose.swing = E.st === 'attack' ? 1 : E.st === 'wind' ? -0.3 : 0; }
      if (k === 'granny') { pose.prop = 'bag'; pose.swing = E.st === 'attack' ? 1 : E.st === 'wind' ? -0.5 : 0; }
      if (E.dead) { const fall = Math.min(1, E.ko / 0.5); R(E.x - 12, floorY - 7 + 2, 24, 7, k === 'conductor' ? '#3b4a7a' : '#f2a6c4'); R(E.x + 8 * -1, floorY - 12 + 5, 7, 7, '#f0c9a0'); R(E.x - 16, floorY - 3, 4, 3, '#222'); return; }
      person(E.x, floorY + bump, E.face, k, pose, k === 'granny' ? 0.95 : 1);
      R(E.x - 7, floorY + 1, 14, 2, 'rgba(0,0,0,.3)');
    }
    function drawShots() {
      for (const s of shots) { R(s.x - s.w / 2, floorY - s.h - 3, s.w, 4, s.c); if (s.k === 'ticket') { R(s.x - 2, floorY - s.h - 3, 1, 4, '#c0392b'); } }
      for (const w of waves) { for (let i = 0; i < 3; i++) R(w.x + i * 3 - 1, floorY - 8 + i * 2, 3, 8 - i * 2, i === 0 ? '#ffd23a' : 'rgba(255,210,58,.5)'); R(w.x - 4, floorY - 2, 12, 2, '#ffd23a'); }
      for (const s of sparks) R(s.x, floorY + s.y, 2, 2, s.c);
    }
    function bars() {
      const bw = Math.floor(LW / 2) - 8, y = 22;
      R(4, y, bw, 7, '#111'); R(5, y + 1, bw - 2, 5, '#3a3a44'); R(5, y + 1, Math.round((bw - 2) * P.hp / P.max), 5, P.hp / P.max > 0.3 ? '#4fe05a' : '#ff5a5a');
      R(LW - 4 - bw, y, bw, 7, '#111'); R(LW - 3 - bw, y + 1, bw - 2, 5, '#3a3a44'); const ew = Math.round((bw - 2) * E.hp / E.max); R(LW - 3 - bw + (bw - 2 - ew), y + 1, ew, 5, '#ff9a2e');
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bus(); drawFighters(); drawShots(); if (mode === 'fight' || mode === 'ko' || mode === 'lose') bars();
      ctx.imageSmoothingEnabled = false;
      const sx = shake > 0 ? Math.round(Math.sin(t * 90) * u * 0.7) : 0, sy = shake > 0 ? Math.round(Math.cos(t * 80) * u * 0.5) : 0;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(off, 0, 0, LW * F, LH * F, sx, sy, LW * u, LH * u);
      overlay();
    }
    function box(x, y, w, h, fill) { ctx.fillStyle = '#0d0d14'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.fillStyle = fill || '#f2ecd8'; ctx.fillRect(x, y, w, h); }
    function wrap(text, maxW) {
      const words = text.split(' '), lines = []; let cur = '';
      for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (ctx.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; }
      if (cur) lines.push(cur); return lines;
    }
    function overlay() {
      ctx.textBaseline = 'middle'; const fs = Math.max(13, Math.min(17, W * 0.04));
      ctx.font = '700 ' + Math.max(9, u * 3) + 'px "Courier New", monospace'; ctx.textAlign = 'left';
      if (mode === 'fight' || mode === 'ko' || mode === 'lose') {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        const nm = 'ТЫ', en = E.name; ctx.strokeText(nm, 4 * u, 36 * u); ctx.fillText(nm, 4 * u, 36 * u); ctx.textAlign = 'right'; ctx.strokeText(en, (LW - 4) * u, 36 * u); ctx.fillText(en, (LW - 4) * u, 36 * u);
        ctx.textAlign = 'center';
        if (E.warnAt) { }
        for (const p of pops) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.font = '800 ' + u * 4 + 'px "Courier New", monospace'; ctx.strokeText(p.s, p.x * u, (floorY + p.y) * u); ctx.fillText(p.s, p.x * u, (floorY + p.y) * u); ctx.globalAlpha = 1; }
        if (kidSay && E.kind === 'mother') { ctx.font = '800 ' + u * 4 + 'px "Courier New", monospace'; ctx.fillStyle = '#ff5a5a'; ctx.strokeStyle = '#300'; ctx.lineWidth = 4; ctx.strokeText(kidSay, (E.x - 30) * u, (floorY - 60) * u); ctx.fillText(kidSay, (E.x - 30) * u, (floorY - 60) * u); }
        // controls
        for (const b of btns) {
          const down = (b.id === 'left' || b.id === 'right' || b.id === 'block' || b.id === 'up') ? held[b.id] : false;
          ctx.fillStyle = down ? '#5a3a2a' : '#2a2530'; ctx.strokeStyle = b.id === 'punch' ? '#ff9a2e' : b.id === 'kick' ? '#ff5a5a' : b.id === 'block' ? '#5ab0ff' : '#8a8aa0'; ctx.lineWidth = 2;
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 12); else ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 ' + (b.label.length > 2 ? Math.max(10, b.w * 0.19) : b.h * 0.4) + 'px "Courier New", system-ui, monospace'; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
        }
        if (banner) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 5; ctx.font = '800 ' + u * 11 + 'px "Courier New", monospace'; ctx.strokeText(banner.text, W / 2, H * 0.34); ctx.fillText(banner.text, W / 2, H * 0.34); }
        if (mode === 'lose') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#ff5a5a'; ctx.font = '800 ' + u * 7 + 'px "Courier New", monospace'; ctx.fillText('ВЫСАДИЛИ НА ХОДУ!', W / 2, H * 0.4); ctx.fillStyle = '#fff'; ctx.font = '700 ' + u * 4 + 'px "Courier New", monospace'; ctx.fillText('нажмите, чтобы ещё раз', W / 2, H * 0.48); }
        return;
      }
      if (mode === 'dialog' || mode === 'outro') {
        const cur = dlg[0]; if (!cur) return;
        const bh = Math.min(210, H * 0.27), bx = 10, bw = W - 20, by = H - bh - 10;
        choiceBtns = [];
        if (cur.choice) {
          const ch = 44, gapc = 8; let y0 = by - cur.choice.length * (ch + gapc) - 6;
          ctx.font = '700 ' + fs + 'px "Courier New", monospace';
          cur.choice.forEach((c, i) => { const yy = y0 + i * (ch + gapc); box(bx, yy, bw, ch, '#ffe9a8'); ctx.fillStyle = '#222'; ctx.textAlign = 'left'; const ls = wrap(c.t, bw - 24); ls.slice(0, 2).forEach((l, k) => ctx.fillText(l, bx + 12, yy + ch / 2 + (k - (Math.min(2, ls.length) - 1) / 2) * (fs + 2))); choiceBtns.push({ x: bx, y: yy, w: bw, h: ch, i }); });
          const prev = null;
        }
        box(bx, by, bw, bh);
        const who = cur.who || YOU, p = Math.max(4, Math.min(8, Math.floor(bh / 12 / 1.8)));
        if (cur.who) {
          ctx.fillStyle = '#1a1a22'; ctx.fillRect(bx + 10, by + 10, 12 * p + 6, 12 * p + 6); portrait(bx + 13, by + 13, p, who.k);
          ctx.fillStyle = '#c0392b'; ctx.font = '800 ' + fs + 'px "Courier New", monospace'; ctx.textAlign = 'left'; ctx.fillText(who.n.toUpperCase(), bx + 22 + 12 * p, by + 24);
          ctx.fillStyle = '#1a1a22'; ctx.font = '700 ' + fs + 'px "Courier New", monospace';
          const shown = cur.text.slice(0, Math.floor(dlgChars)), ls = wrap(shown, bw - 36 - 12 * p);
          ls.forEach((l, i) => ctx.fillText(l, bx + 22 + 12 * p, by + 24 + (i + 1) * (fs + 5)));
          if (dlgChars >= cur.text.length) { ctx.fillStyle = '#c0392b'; ctx.textAlign = 'right'; ctx.fillText('▼', bx + bw - 12, by + bh - 14); }
        } else { ctx.fillStyle = '#6a6a72'; ctx.textAlign = 'center'; ctx.font = '700 ' + fs + 'px "Courier New", monospace'; ctx.fillText('Выберите ответ', W / 2, by + bh / 2); }
        return;
      }
      if (mode === 'end') {
        ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23a'; ctx.font = '800 ' + u * 7 + 'px "Courier New", monospace'; ctx.fillText('ВЫ ДОЕХАЛИ!', W / 2, H * 0.34);
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + u * 4 + 'px "Courier New", monospace';
        ctx.fillText('Побеждены: кондуктор, бабка,', W / 2, H * 0.43); ctx.fillText('мамаша и её ребёнок.', W / 2, H * 0.47);
        ctx.fillText('Время боёв: ' + Math.round(stats.time) + ' с · поражений: ' + stats.deaths, W / 2, H * 0.55);
        ctx.fillStyle = '#ffb347'; ctx.fillText('нажмите, чтобы проехать заново', W / 2, H * 0.65);
      }
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      u = Math.max(2, Math.floor(Math.min(W / 125, H / 215)));
      LW = Math.ceil(W / u); LH = Math.ceil(H / u);
      off = document.createElement('canvas'); off.width = LW * F; off.height = LH * F; g = off.getContext('2d'); layout();
      if (P) { const S = STAGES[stage]; if (E) E.x = Math.min(E.x, LW - 10); }
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
      debug: { update, press, nextLine, choose, get mode() { return mode; }, get stage() { return stage; }, get P() { return P; }, get E() { return E; }, get dlg() { return dlg; }, startStage, pAttack, held: () => held, faces: FACES }
    };
  }
});
