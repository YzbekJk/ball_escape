/* Игра «Батуты»: шарик и точка стоят на заданных местах — уровни одинаковые у всех игроков.
   Уровень нельзя пройти без батутов (шарик в свободном падении не попадает в точку).
   С 10 уровня появляются зелёные батуты: они фиксированы, шарик обязан отскочить от каждого, иначе точка не засчитывается.
   Рисуйте батуты пальцем и жмите «Пуск» — шарик должен попасть в точку. Таблица: кто прошёл больше уровней. */
Sims.register({
  id: 'trampolines',
  kind: 'game',
  hit: true,
  title: 'Батуты',
  desc: 'Шарик и точка появляются в случайных местах. Нарисуйте пальцем несколько батутов так, чтобы шарик отскочил прямо в точку, и нажмите «Пуск».',

  lb: { label: 'Пройдено уровней за одну игру', better: 'high', fair: ['tramps', 'maxLen', 'trampBounce', 'gravity', 'ballR', 'targetR', 'wallDeath', 'wallBounce', 'floor'], fmt: v => v + ' ур.' },
  defaults: {
    tramps: 3, maxLen: 0.35, trampBounce: 1.1, gravity: 1.6, ballR: 0.035, targetR: 0.05,
    wallBounce: 0.8, wallDeath: true, floor: false, trail: true, sound: true, notes: false, music: true, vocalStart: 8, volume: 0.7
  },
  schema: [
    { k: 'tramps', l: 'Сколько батутов дано', min: 1, max: 10, step: 1, live: 1 },
    { k: 'maxLen', l: 'Максимальная длина батута', min: 0.1, max: 0.8, step: 0.01, live: 1 },
    { k: 'trampBounce', l: 'Упругость батута', min: 0.6, max: 1.5, step: 0.01, live: 1 },
    { k: 'gravity', l: 'Гравитация', min: 0.3, max: 5, step: 0.1, live: 1 },
    { k: 'ballR', l: 'Размер шарика', min: 0.02, max: 0.08, step: 0.005 },
    { k: 'targetR', l: 'Размер точки', min: 0.02, max: 0.12, step: 0.005 },
    { k: 'wallDeath', l: 'Коснулся стены — проигрыш', type: 'check', live: 1 },
    { k: 'wallBounce', l: 'Упругость стен', min: 0.3, max: 1.1, step: 0.01, live: 1 },
    { k: 'floor', l: 'Пол снизу (шарик не пропадает)', type: 'check', live: 1 },
    { k: 'trail', l: 'След шарика', type: 'check', live: 1 },
    { k: 'sound', l: 'Звуки отскоков', type: 'check', live: 1 },
    { k: 'notes', l: 'Ноты вместо звука отскока: до, ре, ми, фа, соль, ля, си, до… (нужны включённые звуки отскоков)', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'vocalStart', l: 'С какой секунды трека начинается вокал', min: 0, max: 60, step: 0.1, live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#0d1020'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2fd4ff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.22, h * 0.78); ctx.lineTo(w * 0.42, h * 0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.55, h * 0.45); ctx.lineTo(w * 0.72, h * 0.58); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.15); ctx.lineTo(w * 0.3, h * 0.7); ctx.quadraticCurveTo(w * 0.45, h * 0.3, w * 0.6, h * 0.4); ctx.lineTo(w * 0.7, h * 0.52); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.arc(w * 0.2, h * 0.15, h * 0.06, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3dff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.75, h * 0.09, 0, 7); ctx.stroke();
    ctx.fillStyle = '#3dff8a'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.75, h * 0.035, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const TAU = Math.PI * 2;
    let W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0;
    const ww = 1, hh = 1.7, TOP = 118, BOT = 92;   /* fixed play field, the same for everyone */
    /* locations: every 25 levels a new world with its own trampolines and quirks (after the last one the list repeats) */
    const PER = 25;
    const LOCS = [
      { name: 'Лаборатория', joke: 'Шарик не виноват. Он просто оказался в эксперименте.', quirk: 'обычные батуты', bg: ['#0d1020', '#141a33'], tcol: ['#2fd4ff', '#d8f6ff'], grav: 1, bnc: 1, deco: 'bubble', dc: '#5fe0ff' },
      { name: 'Ледяная пещера', joke: 'Батуты замёрзли. Прыгайте аккуратно, лёд не любит повторов.', quirk: 'ледяные батуты трескаются после 4 ударов', bg: ['#0a1c2e', '#1d4466'], tcol: ['#9fe8ff', '#ffffff'], grav: 1, bnc: 0.96, frag: 4, deco: 'snow', dc: '#e8f8ff' },
      { name: 'Джунгли', joke: 'Здесь шарик встретил обезьяну. Она отказалась комментировать.', quirk: 'порывы ветра сносят шарик', bg: ['#0b2412', '#1d5a2a'], tcol: ['#a26a2a', '#e8c27a'], grav: 1, bnc: 1, wind: { a: 0.32, w: 2.2 }, deco: 'leaf', dc: '#7be05a' },
      { name: 'Пустыня', joke: 'Сухо, жарко, батуты — мираж. Шарик в восторге.', quirk: 'песок гасит отскок', bg: ['#2a1a06', '#8a5a1a'], tcol: ['#e8b84a', '#fff3c4'], grav: 1.05, bnc: 0.92, deco: 'sand', dc: '#ffd98a' },
      { name: 'Подводный мир', joke: 'Рыбы смотрят на шарик как на пришельца.', quirk: 'вода тормозит шарик', bg: ['#02142a', '#0a4a7a'], tcol: ['#4fd8ff', '#e0fbff'], grav: 0.8, bnc: 1, drag: 0.7, deco: 'bubble', dc: '#9fe8ff' },
      { name: 'Космос', joke: 'На Луне шарик весит меньше, а проблем столько же.', quirk: 'низкая гравитация', bg: ['#04030f', '#1a1040'], tcol: ['#b07cff', '#f0e4ff'], grav: 0.55, bnc: 1, deco: 'star', dc: '#ffffff' },
      { name: 'Вулкан', joke: 'Пол — это лава. Серьёзно, не падайте.', quirk: 'горячие батуты бьют сильнее, но тяжелее падать', bg: ['#1c0600', '#6a1a00'], tcol: ['#ff6a1a', '#ffe0a0'], grav: 1.2, bnc: 1.2, deco: 'ember', dc: '#ffa23a' },
      { name: 'Конфетная фабрика', joke: 'Всё липкое, всё сладкое, шарик теперь в карамели.', quirk: 'упругие леденцы-отбойники', bg: ['#2a0a22', '#8a2a6a'], tcol: ['#ff9ad8', '#fff0fa'], grav: 1, bnc: 1.1, pegs: 2, deco: 'spark', dc: '#ffe08a' },
      { name: 'Пинбол', joke: 'Это не баг, это пинбол.', quirk: 'на поле стоят отбойники', bg: ['#10002a', '#2a0a5a'], tcol: ['#ff3df0', '#ffd6fb'], grav: 1, bnc: 1, pegs: 3, deco: 'spark', dc: '#ff7af5' },
      { name: 'Желейная страна', joke: 'Батуты из желе. Вкусно, но прыгать тяжело.', quirk: 'желейные батуты гасят отскок', bg: ['#2a0a1e', '#6a1a4a'], tcol: ['#ff7ab8', '#ffd3e8'], grav: 0.9, bnc: 0.8, jelly: 1, deco: 'bubble', dc: '#ffb0d8' },
      { name: 'Замок призраков', joke: 'Призраки утверждают, что батуты им мерещатся.', quirk: 'батуты мигают: то есть, то нет', bg: ['#080814', '#2a2a4a'], tcol: ['#b8c8ff', '#ffffff'], grav: 1, bnc: 1, blink: 2.4, deco: 'star', dc: '#c8d0ff' },
      { name: 'Часовая башня', joke: 'Стрелки не успевают за шариком. Или наоборот.', quirk: 'гравитация пульсирует', bg: ['#1a1204', '#5a4210'], tcol: ['#e8c060', '#fff4d0'], grav: 1, bnc: 1, gosc: { a: 0.45, w: 1.6 }, deco: 'spark', dc: '#ffd060' },
      { name: 'Магнитная аномалия', joke: 'Компас сдался. Шарик тоже скоро сдастся.', quirk: 'шарик притягивает к центру', bg: ['#06121a', '#123a4a'], tcol: ['#4af0c8', '#e0fff6'], grav: 1, bnc: 1, mag: 0.9, deco: 'spark', dc: '#4af0c8' },
      { name: 'Кибер-город', joke: 'Здесь даже батуты на подписке.', quirk: 'тяжёлый шарик, мощные батуты', bg: ['#050818', '#1a0a3a'], tcol: ['#3dff8a', '#d8ffe8'], grav: 1.3, bnc: 1.25, pegs: 1, deco: 'spark', dc: '#3dff8a' },
      { name: 'Хаос', joke: 'Здесь всё сразу. Разработчик сам не уверен, что это проходимо.', quirk: 'ветер, отбойники и хрупкие батуты', bg: ['#0a0a0a', '#2a2a2a'], tcol: ['#e8e8e8', '#ffffff'], grav: 1.1, bnc: 1, wind: { a: 0.26, w: 3.1 }, pegs: 2, frag: 6, deco: 'spark', dc: '#ff5a5a' },
      { name: 'Радужный мир', joke: 'Финал. Дальше только повторение, зато красивое.', quirk: 'всего понемногу: ветер, отбойники, хрупкость', bg: ['#2a0a4a', '#0a5a6a'], tcol: ['#ff9a4a', '#fff0d0'], grav: 0.85, bnc: 1.05, wind: { a: 0.22, w: 2.6 }, pegs: 2, frag: 8, deco: 'spark', dc: '#ffe65a' }
    ];
    /* real objects of each location: blk = solid blocks, haz = deadly things (some move), fan = air/water currents, portal = teleporter pair */
    const FEAT = {
      'Лаборатория': { portal: 1, blk: 1, sk: { blk: 'table' } },
      'Ледяная пещера': { blk: 2, haz: 2, sk: { blk: 'ice', haz: 'icicle' } },
      'Джунгли': { blk: 2, haz: 1, sk: { blk: 'trunk', haz: 'plant' } },
      'Пустыня': { haz: 2, blk: 1, sk: { haz: 'cactus', blk: 'rock' } },
      'Подводный мир': { fan: 1, haz: 2, sk: { haz: 'urchin', fan: 'current' } },
      'Космос': { portal: 1, haz: 2, mv: 1, sk: { haz: 'asteroid' } },
      'Вулкан': { haz: 2, fan: 1, sk: { haz: 'lava', fan: 'geyser' } },
      'Конфетная фабрика': { blk: 2, sk: { blk: 'candy' } },
      'Пинбол': { blk: 2, e: 1.15, sk: { blk: 'bar' } },
      'Желейная страна': { blk: 2, e: 1.25, sk: { blk: 'jelly' } },
      'Замок призраков': { haz: 2, mv: 1, blk: 1, sk: { haz: 'ghost', blk: 'wall' } },
      'Часовая башня': { haz: 1, mv: 1, blk: 1, sk: { haz: 'pend', blk: 'gear' } },
      'Магнитная аномалия': { portal: 1, haz: 1, sk: { haz: 'mine' } },
      'Кибер-город': { haz: 2, mv: 1, blk: 2, sk: { haz: 'laser', blk: 'server' } },
      'Хаос': { blk: 1, haz: 2, mv: 1, fan: 1, portal: 1, sk: { blk: 'rock', haz: 'mine', fan: 'current' } },
      'Радужный мир': { fan: 1, portal: 1, blk: 1, e: 1.1, sk: { blk: 'cloud', fan: 'geyser' } }
    };
    let feats = { blk: [], haz: [], fan: [], portal: [] }, portCool = 0;
    const hzPos = (h, T) => h.mv ? { x: h.x + Math.sin(T * h.sp + h.ph) * h.amp, y: h.y } : { x: h.x, y: h.y };
    const locIdx = lv => Math.floor((Math.max(1, lv) - 1) / PER) % LOCS.length;
    const locOf = lv => LOCS[locIdx(lv)];
    const locName = lv => { const c = Math.floor((Math.max(1, lv) - 1) / (PER * LOCS.length)); return locOf(lv).name + (c ? ' ' + (c + 1) : ''); };
    let best = 1, banner = null, menuOpen = false, pegs = [], decor = [], btnLevels = null;
    let ball, start, target, tr, greens = [], state, stateT, level, attempts, parts, trail, events, drag, simT;
    let paused = false, acc = 0, last = 0, raf = 0, on = true;
    let btnRun = null, btnClear = null;
    /* progress: in the browser (per account nick, or as a guest) and, when logged in, on the server */
    const GAME = 'trampolines', LB = window.LB;
    let noPush = true;   /* do not overwrite the server value before it has been read */
    const keyFor = () => 'trampolines_level' + (LB && LB.loggedIn && LB.nick ? ':' + LB.nick : '');
    const readKey = k => { try { const v = parseInt(localStorage.getItem(k), 10); return v >= 1 ? v : 0; } catch (e) { return 0; } };
    const loadLevel = () => readKey(keyFor()) || 1;
    function saveLevel() {
      best = Math.max(best, level);
      try { localStorage.setItem(keyFor(), String(level)); localStorage.setItem(keyFor() + ':best', String(best)); } catch (e) {}
      if (!noPush && LB && LB.loggedIn && LB.enabled) LB.progressSet(GAME, best);
    }
    function syncProgress() {
      if (!LB || !LB.loggedIn || !LB.enabled) return;
      LB.progressGet(GAME).then(r => {
        if (!on) return;
        if (!r || r.error) { noPush = false; return; }
        const remote = Math.round(r.value) || 0, mine = Math.max(readKey(keyFor()), readKey(keyFor() + ':best'), readKey('trampolines_level'), 1), top = Math.max(remote, mine, level, best);
        noPush = false; best = top;
        if (remote > Math.max(level, readKey(keyFor()))) { level = remote - 1; newLevel(false); }
        else if (top > remote) LB.progressSet(GAME, top);
      });
    }
    if (LB) LB.onChange(() => { if (on) syncProgress(); });

    function rng(seed) { let a = (seed * 2654435761 + 12345) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function newLevel(keep) { noteN = 0;
      if (!keep) { level++; saveLevel(); }
      if (level % PER === 1 && !keep) banner = { t: 3.4, name: locName(level), joke: locOf(level).joke + ' Особенность: ' + locOf(level).quirk + '.' };
      const R = rng(level * 7919 + 17), r = 0.035, tr0 = 0.05, minD = 0.55 + Math.min(0.25, level * 0.012);
      let tries = 0, bx, by, tx, ty;
      do {
        bx = r + 0.08 + R() * (ww - 2 * r - 0.16); by = 0.18 + R() * 0.55;
        tx = tr0 + 0.04 + R() * (ww - 2 * tr0 - 0.08); ty = hh * (0.38 + R() * 0.5);
        tries++;
      } while ((Math.hypot(bx - tx, by - ty) < minD || (Math.abs(bx - tx) < r + tr0 + 0.14 && ty > by - 0.1)) && tries < 2000);   /* straight fall must not reach the target */
      start = { x: bx, y: by }; target = { x: tx, y: ty };
      greens = [];
      if (level >= 10) {   /* from level 10: fixed green trampolines; the ball must bounce off every one of them before the target counts */
        const seg = (cx, cy, a, len) => ({ x1: cx - Math.cos(a) * len / 2, y1: cy - Math.sin(a) * len / 2, x2: cx + Math.cos(a) * len / 2, y2: cy + Math.sin(a) * len / 2, g: true, hit: false });
        const gx = Math.max(0.2, Math.min(0.8, bx + (R() - 0.5) * 0.08)), gy = Math.min(hh - 0.5, by + 0.3 + R() * 0.3);
        const a1 = (gx < 0.5 ? 1 : -1) * (0.25 + R() * 0.3);
        greens.push(seg(gx, gy, a1, 0.24));
        if (level >= 30) {   /* second one lies on the flight path after the first bounce (default physics, so it is the same for everybody) */
          const b2 = { x: bx, y: by, vx: 0, vy: 0 }, path = []; let bounced = false;
          for (let k = 0; k < 1500; k++) {
            b2.vy += 1.6 / 240; b2.x += b2.vx / 240; b2.y += b2.vy / 240;
            if (segHit(b2, greens[0], 0.043, 1.1, true)) bounced = true;
            if (bounced) path.push({ x: b2.x, y: b2.y });
            if (b2.x < 0.1 || b2.x > ww - 0.1 || b2.y > hh - 0.3 || b2.y < 0.1) break;
          }
          const cand = path.slice(Math.floor(path.length * 0.35), Math.floor(path.length * 0.8)).filter(q => Math.hypot(q.x - tx, q.y - ty) > 0.2 && q.x > 0.15 && q.x < ww - 0.15);
          if (cand.length) { const q = cand[Math.floor(R() * cand.length)]; greens.push(seg(q.x, q.y + 0.01, (q.x < 0.5 ? 1 : -1) * (0.3 + R() * 0.35), 0.22)); }
        }
      }
      pegs = [];
      const LC = locOf(level);
      for (let k = 0, t3 = 0; k < (LC.pegs || 0) && t3 < 800; t3++) {
        const px = 0.15 + R() * 0.7, py = 0.3 + R() * (hh - 0.6);
        if (Math.hypot(px - bx, py - by) > 0.25 && Math.hypot(px - tx, py - ty) > 0.22 && pegs.every(q => Math.hypot(px - q.x, py - q.y) > 0.28) && greens.every(q => Math.hypot(px - (q.x1 + q.x2) / 2, py - (q.y1 + q.y2) / 2) > 0.22)) { pegs.push({ x: px, y: py, r: 0.045 }); k++; }
      }
      feats = { blk: [], haz: [], fan: [], portal: [] }; portCool = 0;
      const FD = FEAT[LC.name];
      if (FD) {
        const used = [], ok = (x, y, m) => Math.hypot(x - bx, y - by) > m + 0.12 && Math.hypot(x - tx, y - ty) > m + 0.1 && used.every(q => Math.hypot(x - q.x, y - q.y) > 0.3) && pegs.every(q => Math.hypot(x - q.x, y - q.y) > 0.2) && greens.every(q => Math.hypot(x - (q.x1 + q.x2) / 2, y - (q.y1 + q.y2) / 2) > 0.25);
        const place = (m, f) => { for (let t3 = 0; t3 < 400; t3++) { const x = 0.16 + R() * 0.68, y = 0.3 + R() * (hh - 0.65); if (ok(x, y, m) && !(m > 0.1 && Math.abs(x - bx) < 0.14 && y > by)) { used.push({ x, y }); return f(x, y); } } return null; };
        for (let k = 0; k < (FD.blk || 0); k++) { const o = place(0.14, (x, y) => { const vert = R() < 0.35, w = vert ? 0.05 + R() * 0.03 : 0.12 + R() * 0.1, h = vert ? 0.14 + R() * 0.1 : 0.05 + R() * 0.03; return { x: x - w / 2, y: y - h / 2, w, h, e: FD.e || 0.85 }; }); if (o) feats.blk.push(o); }
        for (let k = 0; k < (FD.haz || 0); k++) { const o = place(0.2, (x, y) => ({ x, y, r: 0.04 + R() * 0.015, mv: !!FD.mv, amp: 0.12, sp: 0.9 + R() * 0.8, ph: R() * 6.28 })); if (o) { if (o.mv) o.x = Math.max(0.22, Math.min(ww - 0.22, o.x)); feats.haz.push(o); } }
        for (let k = 0; k < (FD.fan || 0); k++) { const geys = FD.sk.fan === 'geyser', o = place(0.15, (x, y) => geys ? { x: x - 0.09, y: y - 0.18, w: 0.18, h: 0.36, ax: 0, ay: -2.6 } : { x: 0.05, y: y - 0.1, w: 0.9, h: 0.2, ax: (R() < 0.5 ? -1 : 1) * 1.3, ay: 0 }); if (o) feats.fan.push(o); }
        if (FD.portal) { const a = place(0.18, (x, y) => ({ x, y })), b2 = place(0.18, (x, y) => ({ x, y })); if (a && b2) feats.portal.push({ a, b: b2, r: 0.05 }); }
      }
      decor = []; for (let i = 0; i < 34; i++) decor.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.6, p: Math.random() * 6.28 });
      tr = []; reset();
    }
    function reset() {
      greens.forEach(g => { g.hit = false; }); tr.forEach(s => { s.n = 0; s.dead = false; }); ball = { x: start.x, y: start.y, vx: 0, vy: 0 }; trail = []; state = 'plan'; stateT = 0; drag = null; simT = 0;
    }
    function restart() { level = Math.max(1, level) - 1; attempts = 0; parts = []; events = []; layout(); newLevel(false); }

    function segHit(b, s, r, bounce, quiet) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((b.x - s.x1) * dx + (b.y - s.y1) * dy) / L2));
      const px = s.x1 + dx * t, py = s.y1 + dy * t, ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
      if (d >= r || d < 1e-9) return false;
      const nx = ex / d, ny = ey / d, vn = b.vx * nx + b.vy * ny;
      b.x = px + nx * r; b.y = py + ny * r;
      if (vn < 0) { if (!quiet) { s.hit = true; s.n = (s.n || 0) + 1; } const j = (1 + (bounce == null ? cfg.trampBounce : bounce)) * vn; b.vx -= j * nx; b.vy -= j * ny; if (!quiet) events.push({ hit: Math.min(1, -vn / 2) }); }
      return true;
    }
    function burst(x, y, n, hue) {
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 0.1 + Math.random() * 0.7; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.2, life: 1, hue: hue + Math.random() * 40 }); }
    }

    function step(dt) {
      simT += dt;
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.8 * dt; p.life -= dt * 0.9; }
      parts = parts.filter(p => p.life > 0);
      if (state === 'won') { stateT += dt; if (stateT > 1.4) newLevel(false); return; }
      if (state === 'fail') { stateT += dt; if (stateT > 0.6) reset(); return; }
      if (state !== 'run') return;
      const b = ball, r = cfg.ballR;
      const LC = locOf(level);
      b.vy += cfg.gravity * LC.grav * (LC.gosc ? 1 + LC.gosc.a * Math.sin(simT * LC.gosc.w) : 1) * dt; if (LC.wind) b.vx += LC.wind.a * Math.sin(simT * LC.wind.w) * dt;
      if (LC.mag) b.vx -= LC.mag * (b.x - 0.5) * dt; if (LC.drag) { const k = 1 - LC.drag * dt; b.vx *= k; b.vy *= k; } b.x += b.vx * dt; b.y += b.vy * dt;
      if (cfg.wallDeath && (b.x <= r || b.x >= ww - r || b.y <= r)) {
        state = 'fail'; stateT = 0; attempts++; events.push({ fail: true }); burst(b.x, b.y, 25, 20); return;
      }
      if (b.x < r) { b.x = r; if (b.vx < 0) { b.vx = -b.vx * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      if (b.x > ww - r) { b.x = ww - r; if (b.vx > 0) { b.vx = -b.vx * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      if (b.y < r) { b.y = r; if (b.vy < 0) { b.vy = -b.vy * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      if (cfg.floor && b.y > hh - r) { b.y = hh - r; if (b.vy > 0) { b.vy = -b.vy * cfg.wallBounce; events.push({ hit: 0.3 }); } }
      const solid = !LC.blink || (simT % LC.blink) < LC.blink * 0.7;
      for (const s of tr) { if (s.dead || !solid) continue; segHit(b, s, r + 0.008, cfg.trampBounce * LC.bnc); if (LC.frag && s.n >= LC.frag && !s.dead) { s.dead = true; burst((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 18, 190); events.push({ hit: 0.2 }); } }
      for (const s of greens) segHit(b, s, r + 0.008, cfg.trampBounce * LC.bnc);
      for (const q of feats.fan) if (b.x > q.x && b.x < q.x + q.w && b.y > q.y && b.y < q.y + q.h) { b.vx += q.ax * dt; b.vy += q.ay * dt; }
      for (const q of feats.blk) { const cx = Math.max(q.x, Math.min(q.x + q.w, b.x)), cy = Math.max(q.y, Math.min(q.y + q.h, b.y)); let dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy); if (d < r) { if (d < 1e-9) { dx = 0; dy = -1; d = 1; } const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = cx + nx * r; b.y = cy + ny * r; if (vn < 0) { b.vx -= (1 + q.e) * vn * nx; b.vy -= (1 + q.e) * vn * ny; events.push({ hit: Math.min(1, -vn / 2) }); } } }
      if (portCool > 0) portCool -= dt; else for (const q of feats.portal) for (const [u, v] of [[q.a, q.b], [q.b, q.a]]) if (Math.hypot(b.x - u.x, b.y - u.y) < q.r) { b.x = v.x; b.y = v.y; portCool = 0.5; events.push({ hit: 0.6 }); burst(u.x, u.y, 12, 200); burst(v.x, v.y, 12, 30); break; }
      for (const h of feats.haz) { const hp = hzPos(h, simT); if (Math.hypot(b.x - hp.x, b.y - hp.y) < h.r + r * 0.75) { state = 'fail'; stateT = 0; attempts++; events.push({ fail: true }); burst(b.x, b.y, 25, 20); return; } }
      for (const q of pegs) { const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy), rr = r + q.r; if (d < rr && d > 1e-9) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = q.x + nx * rr; b.y = q.y + ny * rr; if (vn < 0) { b.vx -= 1.92 * vn * nx; b.vy -= 1.92 * vn * ny; events.push({ hit: Math.min(1, -vn / 2) }); } } }
      if (Math.hypot(b.x - target.x, b.y - target.y) < r + cfg.targetR && greens.every(q => q.hit)) {
        state = 'won'; stateT = 0; events.push({ win: true }); burst(target.x, target.y, 70, 90); if (ctl.submitScore) ctl.submitScore(level);
        return;
      }
      if (b.y > hh + 0.3 || simT > 25) { state = 'fail'; stateT = 0; attempts++; events.push({ fail: true }); }
      if (cfg.trail && ((simT * 240) | 0) % 2 === 0) { trail.push({ x: b.x, y: b.y }); if (trail.length > 40) trail.shift(); }
    }

    // ----- soundtrack: starts at the moment the vocals come in, then loops from there -----
    const song = new Audio('assets/soundtrack.m4a'); song.preload = 'auto'; song.loop = false;
    let songOn = false;
    function seekPlay() {
      const go = () => { try { song.currentTime = cfg.vocalStart; } catch (e) {} const pr = song.play(); if (pr && pr.catch) pr.catch(() => { songOn = false; }); };
      if (song.readyState >= 1) go(); else { song.addEventListener('loadedmetadata', go, { once: true }); song.load(); }
    }
    function musicTick() {
      if (!cfg.music || paused) { if (songOn) { song.pause(); songOn = false; } return; }
      song.volume = Math.max(0, Math.min(1, cfg.volume));
      if (!songOn) { songOn = true; seekPlay(); return; }
      // never play anything before the first words; loop back to them at the end
      if (!song.paused && song.currentTime < cfg.vocalStart - 0.25) { try { song.currentTime = cfg.vocalStart; } catch (e) {} }
      if (song.ended || (song.duration && song.currentTime > song.duration - 0.2)) seekPlay();
    }

    // ----- input -----
    const pt = e => { const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; return { px, py, x: Math.max(0, Math.min(ww, (px - OX) / S)), y: Math.max(0, Math.min(hh, (py - OY) / S)) }; };
    const inRect = (p, b) => b && p.px >= b.x && p.px <= b.x + b.w && p.py >= b.y && p.py <= b.y + b.h;
    function nearSeg(p) {
      let best = -1, bd = 0.05;
      tr.forEach((s, i) => {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1, t = Math.max(0, Math.min(1, ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / (dx * dx + dy * dy)));
        const d = Math.hypot(p.x - s.x1 - dx * t, p.y - s.y1 - dy * t); if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function down(e) {
      const p = pt(e); musicTick();
      if (inRect(p, btnRun)) { if (state === 'plan') { state = 'run'; simT = 0; attempts += 0; } else if (state === 'run') { reset(); } return; }
      if (inRect(p, btnClear)) { if (state === 'plan') tr = []; return; }
      if (inRect(p, btnLevels)) { openMenu(); return; }
      if (state !== 'plan') return;
      const i = nearSeg(p);
      if (i >= 0) { tr.splice(i, 1); return; }                       // tap a trampoline to remove it
      drag = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!drag) return;
      const p = pt(e); let dx = p.x - drag.x1, dy = p.y - drag.y1; const L = Math.hypot(dx, dy);
      if (L > cfg.maxLen) { dx *= cfg.maxLen / L; dy *= cfg.maxLen / L; }
      drag.x2 = drag.x1 + dx; drag.y2 = drag.y1 + dy;
    }
    function up() {
      if (!drag) return;
      if (Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) > 0.04) { tr.push(drag); while (tr.length > cfg.tramps) tr.shift(); }
      drag = null;
    }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);


    // ----- level menu -----
    const host = canvas.parentElement, mstyle = document.createElement('style');
    mstyle.textContent = `
      .tm-menu{position:fixed;inset:0;z-index:5;overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(8,10,22,.97);color:#e6ecf8;font-family:Inter,system-ui,sans-serif;padding:66px 12px 30px}
      .tm-col{max-width:560px;margin:0 auto}
      .tm-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.tm-top h2{margin:0;font-size:22px}
      .tm-btn{font:700 13px system-ui;padding:8px 12px;border-radius:10px;border:1px solid #3a4468;background:#1a2140;color:#fff;cursor:pointer}
      .tm-btn.red{background:#4a1a24;border-color:#a04050}
      .tm-sec{margin:16px 0 6px;padding:10px 12px;border-radius:12px;border:1px solid #2a3358;background:#12182e}
      .tm-sec b{font-size:16px}.tm-sec small{display:block;color:#9aa6c8;margin-top:3px;font-size:12px;line-height:1.35}
      .tm-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:8px}
      .tm-lv{aspect-ratio:1;border-radius:7px;border:1px solid #2f3a64;background:#1b2347;color:#fff;font:700 11px system-ui;cursor:pointer;padding:0}
      .tm-lv:disabled{opacity:.28;cursor:default}.tm-lv.cur{background:#2fd4ff;color:#04202b;border-color:#fff}.tm-lv.top{border-color:#ffd24a}
      .tm-lock{opacity:.5}
    `;
    document.head.appendChild(mstyle);
    let menuEl = null, resetAsk = 0;
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } menuOpen = false; }
    function jumpTo(n) { if (n < 1 || n > best) return; closeMenu(); banner = null; level = n - 1; attempts = 0; newLevel(false); }
    function resetAll() { try { localStorage.setItem(keyFor(), '1'); localStorage.setItem(keyFor() + ':best', '1'); localStorage.setItem('trampolines_level', '1'); } catch (e) {} best = 1; level = 0; attempts = 0; closeMenu(); newLevel(false); }
    function openMenu() {
      if (menuEl) return; menuOpen = true; if (state === 'run') reset();
      menuEl = el('div', 'tm-menu'); const col = el('div', 'tm-col'); menuEl.appendChild(col);
      const top = el('div', 'tm-top'); top.append(el('h2', null, 'Уровни'), (() => { const b = el('button', 'tm-btn', 'Закрыть'); b.onclick = closeMenu; return b; })()); col.appendChild(top);
      col.appendChild(el('div', null, 'Открыто до уровня ' + best + ' · сейчас: ' + level + ' (' + locName(level) + ')'));
      const nLoc = Math.floor((best - 1) / PER) + 1;
      for (let li = 0; li <= nLoc; li++) {
        const first = li * PER + 1, last = first + PER - 1, L = LOCS[li % LOCS.length], locked = first > best, sec = el('div', 'tm-sec' + (locked ? ' tm-lock' : ''));
        sec.append(el('b', null, locked ? 'Закрыто · дойдите до уровня ' + first : locName(first) + ' · уровни ' + first + '–' + last)); if (!locked) { sec.appendChild(el('small', null, L.quirk + '. ' + L.joke)); }
        else sec.appendChild(el('small', null, 'Следующая локация: ' + locName(first)));
        if (!locked) { const grid = el('div', 'tm-grid'); for (let n = first; n <= last; n++) { const b = el('button', 'tm-lv' + (n === level ? ' cur' : '') + (n === best ? ' top' : ''), String(n)); b.disabled = n > best; b.onclick = () => jumpTo(n); grid.appendChild(b); } sec.appendChild(grid); }
        col.appendChild(sec);
      }
      const rb = el('button', 'tm-btn red', 'Начать с 1 уровня'); rb.style.marginTop = '18px'; rb.onclick = () => { if (performance.now() < resetAsk) resetAll(); else { resetAsk = performance.now() + 3000; rb.textContent = 'Точно? Нажмите ещё раз'; setTimeout(() => { if (rb.isConnected) rb.textContent = 'Начать с 1 уровня'; }, 3000); } };
      col.appendChild(rb); host.appendChild(menuEl);
    }

    let noteN = 0;
    function noteHit(power) { Sims.note(ctl.audio(), noteN++, power); }
    // ----- sound -----
    let lastBlip = 0;
    function blip(semi, power, dur, type) {
      const actx = ctl.audio(); if (!actx || actx.state !== 'running') return;
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = 220 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.04 + 0.1 * power, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.15));
      o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + (dur || 0.15) + 0.02);
    }
    function playEvents() {
      const ev = events; events = [];
      if (!cfg.sound || !ev.length) return;
      if (ev.some(e => e.win)) { [0, 4, 7, 12].forEach((s, k) => setTimeout(() => blip(s + 12, 0.8, 0.4), k * 90)); return; }
      if (ev.some(e => e.fail)) { blip(-12, 0.5, 0.3, 'triangle'); return; }
      const now = performance.now(); if (now - lastBlip < 60) return; lastBlip = now;
      if (cfg.notes) noteHit(ev[ev.length - 1].hit); else blip(7 + ev[ev.length - 1].hit * 12, ev[ev.length - 1].hit, 0.16, 'triangle');
    }

    // ----- render -----
    function layout() { const availH = Math.max(100, H - TOP - BOT); S = Math.max(50, Math.min(W / ww, availH / hh)); OX = (W - S * ww) / 2; OY = TOP + (availH - S * hh) / 2; }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      layout();
    }
    function button(label, x, y, w, h, on) {
      ctx.fillStyle = on ? 'rgba(47,212,255,.9)' : 'rgba(255,255,255,.1)'; ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 14) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#04202b' : '#cfd6e6'; ctx.font = '700 ' + Math.max(15, Math.min(20, W * 0.045)) + 'px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + 1);
      return { x, y, w, h };
    }
    const pr = i => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
    function hill(col, base, amp, fr, ph) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, base + Math.sin(x / W * fr * 6.28 + ph) * amp + Math.sin(x / W * fr * 15 + ph * 2) * amp * 0.3); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); }
    function tri(x, y, w, h, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); }
    function gear(x, y, r, n, rot, col) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r * 0.82 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    function glow(x, y, r, col) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    function scene(LC, now) {
      const n = LC.name; ctx.save();
      if (n === 'Лаборатория') {
        ctx.strokeStyle = 'rgba(95,224,255,.07)'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.fillStyle = '#1c2540'; ctx.fillRect(0, 0, W, 26); ctx.fillRect(W * 0.12, 0, 10, H * 0.28); ctx.fillRect(W * 0.78, 0, 10, H * 0.2);
        ctx.fillStyle = '#0b1226'; ctx.fillRect(0, H - 70, W, 70); for (let i = 0; i < 5; i++) { const x = 20 + i * W / 5 + 10, h = 30 + pr(i) * 26; ctx.fillStyle = 'rgba(160,230,255,.25)'; ctx.fillRect(x, H - 70 - h, 26, h); ctx.fillStyle = ['#3dff8a', '#ff5ad8', '#5fe0ff', '#ffd24a', '#a07cff'][i]; ctx.globalAlpha = 0.7; ctx.fillRect(x + 2, H - 70 - h * 0.6, 22, h * 0.6 - 2); ctx.globalAlpha = 1; ctx.fillRect(x + 8, H - 70 - h - 8, 10, 8); }
        glow(W * 0.5, H * 0.12, 90, 'rgba(95,224,255,.18)');
      } else if (n === 'Ледяная пещера') {
        for (let i = 0; i < 9; i++) tri(W * (i + 0.5) / 9 + (pr(i) - 0.5) * 20, 0, 30 + pr(i + 9) * 30, 60 + pr(i + 3) * 110, 'rgba(200,240,255,.22)');
        for (let i = 0; i < 8; i++) { const x = W * (i + 0.5) / 8; tri(x, H, -(34 + pr(i + 20) * 30), -(50 + pr(i + 7) * 100), 'rgba(220,248,255,.2)'); }
        glow(W * 0.3, H * 0.6, 130, 'rgba(120,220,255,.14)'); hill('rgba(230,250,255,.18)', H - 30, 8, 2, 0);
      } else if (n === 'Джунгли') {
        for (let i = 0; i < 5; i++) { const x = W * (i + 0.3) / 5 + pr(i) * 20; ctx.fillStyle = '#10301a'; ctx.fillRect(x, 0, 26 + pr(i + 4) * 14, H); ctx.fillStyle = '#17501f'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x + 14, 30 + pr(i) * 40, 60 + pr(i + 2) * 30, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.strokeStyle = '#2f8a3a'; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { const x = W * pr(i + 30); ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + Math.sin(now + i) * 14, 80, x + 6, 120 + pr(i) * 90); ctx.stroke(); }
        hill('#0b2a12', H - 40, 14, 3, 1); for (let i = 0; i < 6; i++) tri(W * (i + 0.5) / 6, H, 26, -50, '#1f6a2a');
      } else if (n === 'Пустыня') {
        glow(W * 0.78, H * 0.18, 150, 'rgba(255,220,120,.35)'); ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.18, 34, 0, TAU); ctx.fill();
        hill('#a46a22', H * 0.72, 22, 1.3, 0.5); tri(W * 0.25, H * 0.72, 90, -80, '#7a4a14'); tri(W * 0.42, H * 0.72, 60, -50, '#7a4a14'); hill('#c98a34', H * 0.82, 18, 1.8, 2); ctx.fillStyle = '#2f6a2a'; [[0.08, 0.84], [0.9, 0.8]].forEach(([a, b]) => { const x = W * a, y = H * b; ctx.fillRect(x - 5, y - 46, 10, 46); ctx.fillRect(x - 18, y - 32, 8, 5); ctx.fillRect(x - 18, y - 40, 5, 13); ctx.fillRect(x + 10, y - 28, 8, 5); ctx.fillRect(x + 13, y - 36, 5, 13); });
      } else if (n === 'Подводный мир') {
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(160,240,255,.07)'; ctx.beginPath(); ctx.moveTo(W * (i * 0.22 - 0.05), 0); ctx.lineTo(W * (i * 0.22 + 0.04), 0); ctx.lineTo(W * (i * 0.22 + 0.2), H); ctx.lineTo(W * (i * 0.22 + 0.02), H); ctx.fill(); }
        hill('#06304f', H - 50, 14, 2, 0.7); ctx.strokeStyle = '#2fd88a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = W * (i + 0.4) / 9, hgt = 50 + pr(i) * 70; ctx.beginPath(); ctx.moveTo(x, H - 30); ctx.quadraticCurveTo(x + Math.sin(now * 1.3 + i) * 16, H - 30 - hgt / 2, x + Math.sin(now * 1.3 + i + 1) * 22, H - 30 - hgt); ctx.stroke(); }
        ctx.fillStyle = '#ff6a8a'; for (let i = 0; i < 3; i++) { const x = W * (0.15 + i * 0.35); ctx.beginPath(); ctx.arc(x, H - 28, 20, Math.PI, 0); ctx.fill(); }
        for (let i = 0; i < 4; i++) { const x = ((now * (14 + i * 6) + i * 120) % (W + 80)) - 40, y = H * (0.25 + i * 0.14); ctx.fillStyle = ['#ffb04a', '#ff6a6a', '#ffe14a', '#8ad8ff'][i]; ctx.beginPath(); ctx.ellipse(x, y, 14, 7, 0, 0, TAU); ctx.fill(); tri(x - 12, y, 12, 0, '#fff'); ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 22, y - 7); ctx.lineTo(x - 22, y + 7); ctx.fill(); }
      } else if (n === 'Космос') {
        glow(W * 0.2, H * 0.3, 160, 'rgba(160,80,255,.22)'); glow(W * 0.8, H * 0.75, 170, 'rgba(60,140,255,.18)');
        const px = W * 0.78, py = H * 0.22; ctx.fillStyle = '#c88a4a'; ctx.beginPath(); ctx.arc(px, py, 42, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,230,180,.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(px, py, 72, 16, -0.4, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(px + 12, py + 8, 36, 0, TAU); ctx.fill();
        hill('#2a2440', H - 36, 10, 2, 0); ctx.fillStyle = '#1a1630'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(W * (i + 0.5) / 6, H - 30, 24, 7, 0, 0, TAU); ctx.fill(); }
      } else if (n === 'Вулкан') {
        glow(W * 0.5, H * 0.45, 190, 'rgba(255,100,20,.25)'); ctx.fillStyle = '#240a02'; ctx.beginPath(); ctx.moveTo(W * 0.05, H); ctx.lineTo(W * 0.38, H * 0.42); ctx.lineTo(W * 0.62, H * 0.42); ctx.lineTo(W * 0.95, H); ctx.fill();
        ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.42, W * 0.12, 10, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W * 0.46, H * 0.43); ctx.quadraticCurveTo(W * 0.4, H * 0.6, W * 0.34, H * 0.8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W * 0.54, H * 0.43); ctx.quadraticCurveTo(W * 0.6, H * 0.6, W * 0.66, H * 0.85); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(70,40,30,' + (0.35 - i * 0.07) + ')'; ctx.beginPath(); ctx.arc(W * 0.5 + Math.sin(now + i) * 20, H * 0.38 - i * 26 - (now * 12 % 20), 20 + i * 8, 0, TAU); ctx.fill(); }
      } else if (n === 'Конфетная фабрика') {
        hill('#c8509a', H * 0.8, 20, 1.6, 0.4); hill('#ff8ac8', H * 0.88, 14, 2.2, 1.7);
        [['#ff5a5a', 0.2], ['#5ad8ff', 0.55], ['#ffe14a', 0.82]].forEach(([c, a], i) => { const x = W * a, y = H * (0.5 + i * 0.07); ctx.fillStyle = '#f4f0e8'; ctx.fillRect(x - 3, y, 6, H); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14, 0, 9); ctx.stroke(); });
        for (let i = 0; i < 7; i++) { ctx.fillStyle = ['#ffd24a', '#7affb0', '#9a7aff', '#ff7a7a'][i % 4]; ctx.beginPath(); ctx.arc(W * (i + 0.5) / 7, H - 18, 12, Math.PI, 0); ctx.fill(); }
      } else if (n === 'Пинбол') {
        ctx.strokeStyle = 'rgba(255,61,240,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, H * 0.3); ctx.quadraticCurveTo(W * 0.35, H * 0.2, W * 0.5, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W, H * 0.4); ctx.quadraticCurveTo(W * 0.7, H * 0.25, W * 0.55, 0); ctx.stroke();
        [[0.2, 0.6, 40, '#ff3df0'], [0.75, 0.7, 52, '#3df0ff'], [0.5, 0.45, 30, '#ffe14a']].forEach(([a, b, r, c], i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now * 3 + i); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W * a, H * b, r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(W * a, H * b, r * 0.5, 0, TAU); ctx.stroke(); }); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,61,240,.35)'; ctx.beginPath(); ctx.moveTo(0, H - 90); ctx.lineTo(W * 0.3, H - 30); ctx.lineTo(0, H - 30); ctx.fill(); ctx.beginPath(); ctx.moveTo(W, H - 90); ctx.lineTo(W * 0.7, H - 30); ctx.lineTo(W, H - 30); ctx.fill(); ctx.fillStyle = 'rgba(61,240,255,.4)'; ctx.fillRect(W * 0.3, H - 36, W * 0.4, 6);
      } else if (n === 'Желейная страна') {
        [['#ff4a9a', 0.15, 0.78, 70], ['#ffb04a', 0.5, 0.86, 90], ['#7a5aff', 0.85, 0.8, 74]].forEach(([c, a, b, r], i) => { ctx.globalAlpha = 0.55; ctx.fillStyle = c; const wob = Math.sin(now * 2 + i) * 4; ctx.beginPath(); ctx.ellipse(W * a, H * b, r + wob, r * 0.8 - wob, 0, Math.PI, 0); ctx.lineTo(W * a + r, H); ctx.lineTo(W * a - r, H); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(W * a - r * 0.35, H * b - r * 0.3, r * 0.18, r * 0.1, -0.5, 0, TAU); ctx.fill(); });
        for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.18; ctx.fillStyle = ['#ff7ab8', '#7affd8', '#ffe07a', '#b07aff'][i]; ctx.beginPath(); ctx.arc(W * (0.15 + i * 0.25), H * (0.15 + 0.1 * Math.sin(i * 2)) + Math.sin(now + i) * 6, 28, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
      } else if (n === 'Замок призраков') {
        glow(W * 0.2, H * 0.14, 110, 'rgba(220,230,255,.25)'); ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(W * 0.2, H * 0.14, 28, 0, TAU); ctx.fill(); ctx.fillStyle = '#05050f';
        ctx.fillRect(W * 0.1, H * 0.5, W * 0.8, H * 0.5); [0.1, 0.4, 0.7].forEach((a, i) => { const x = W * a, w = W * 0.2; ctx.fillRect(x, H * 0.34 - i % 2 * 30, w, H * 0.3); for (let k = 0; k < 4; k++) ctx.fillRect(x + k * w / 4, H * 0.34 - i % 2 * 30 - 12, w / 7, 12); ctx.beginPath(); ctx.moveTo(x - 6, H * 0.34 - i % 2 * 30 - 12); ctx.lineTo(x + w / 2, H * 0.34 - i % 2 * 30 - 70); ctx.lineTo(x + w + 6, H * 0.34 - i % 2 * 30 - 12); ctx.fill(); ctx.fillStyle = (Math.sin(now * 2 + i) > -0.3) ? '#ffd86a' : '#7a6420'; ctx.fillRect(x + w * 0.4, H * 0.42 - i % 2 * 30, 14, 22); ctx.fillStyle = '#05050f'; });
        for (let i = 0; i < 3; i++) { const x = (now * 40 + i * 140) % (W + 40) - 20, y = H * 0.15 + i * 40 + Math.sin(now * 3 + i) * 10; ctx.beginPath(); ctx.ellipse(x, y, 10, 4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 22, y - 8 + Math.sin(now * 14) * 4); ctx.lineTo(x - 10, y + 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 22, y - 8 + Math.sin(now * 14) * 4); ctx.lineTo(x + 10, y + 2); ctx.fill(); }
      } else if (n === 'Часовая башня') {
        const cx = W * 0.5, cy = H * 0.4, R = Math.min(W * 0.42, 170); ctx.strokeStyle = 'rgba(232,192,96,.3)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * R * 0.85, cy - Math.cos(a) * R * 0.85); ctx.lineTo(cx + Math.sin(a) * R * 0.95, cy - Math.cos(a) * R * 0.95); ctx.stroke(); }
        ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(now * 0.3) * R * 0.5, cy - Math.cos(now * 0.3) * R * 0.5); ctx.stroke(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(now * 1.8) * R * 0.78, cy - Math.cos(now * 1.8) * R * 0.78); ctx.stroke();
        gear(W * 0.1, H * 0.82, 46, 12, now * 0.5, 'rgba(232,192,96,.22)'); gear(W * 0.9, H * 0.72, 62, 14, -now * 0.4, 'rgba(232,192,96,.2)'); gear(W * 0.78, H * 0.92, 34, 9, now * 0.8, 'rgba(232,192,96,.25)');
      } else if (n === 'Магнитная аномалия') {
        ctx.strokeStyle = 'rgba(74,240,200,.22)'; ctx.lineWidth = 2; for (let i = 1; i < 7; i++) { ctx.beginPath(); ctx.ellipse(W / 2, H * 0.52, i * W * 0.1, i * H * 0.07, 0, 0, TAU); ctx.stroke(); } for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 40, H * 0.52 + Math.sin(a) * 30); ctx.lineTo(W / 2 + Math.cos(a) * W * 0.7, H * 0.52 + Math.sin(a) * H * 0.5); ctx.stroke(); }
        ctx.fillStyle = '#d83a3a'; ctx.fillRect(W / 2 - 34, H * 0.52 - 18, 34, 36); ctx.fillStyle = '#dcdcdc'; ctx.fillRect(W / 2, H * 0.52 - 18, 34, 36); glow(W / 2, H * 0.52, 90 + Math.sin(now * 3) * 10, 'rgba(74,240,200,.25)');
      } else if (n === 'Кибер-город') {
        for (let i = 0; i < 9; i++) { const x = W * i / 9, h = H * (0.25 + pr(i) * 0.4); ctx.fillStyle = '#0c0f2a'; ctx.fillRect(x, H - 40 - h, W / 9 - 3, h + 40); for (let k = 0; k < 14; k++) { const wx = x + 4 + (k % 3) * 11, wy = H - 40 - h + 8 + Math.floor(k / 3) * 14; if (pr(i * 20 + k) > 0.45 && wy < H - 50) { ctx.fillStyle = ['#3dff8a', '#3df0ff', '#ff3df0'][(i + k) % 3]; ctx.globalAlpha = 0.6; ctx.fillRect(wx, wy, 7, 7); ctx.globalAlpha = 1; } } }
        ctx.strokeStyle = 'rgba(61,255,138,.35)'; ctx.lineWidth = 1; for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(W / 2, H - 40); ctx.lineTo(W * i / 10 + (i - 5) * 20, H); ctx.stroke(); } for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(0, H - 40 + k * k * 2.2); ctx.lineTo(W, H - 40 + k * k * 2.2); ctx.stroke(); }
      } else if (n === 'Хаос') {
        for (let i = 0; i < 12; i++) { const j = Math.floor(now * 3 + i) ; ctx.fillStyle = ['#ff2a2a', '#ffffff', '#2affea'][(i + j) % 3]; ctx.globalAlpha = 0.07 + pr(j * 3 + i) * 0.1; ctx.fillRect(pr(i * 7 + j) * W, pr(i * 3 + 2 * j) * H, 40 + pr(i) * 120, 6 + pr(i + 5) * 24); } ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(pr(i) * W, 0); for (let k = 1; k < 6; k++) ctx.lineTo(pr(i * 9 + k) * W, k * H / 5); ctx.stroke(); }
      } else if (n === 'Радужный мир') {
        const cols = ['#ff4a4a', '#ff9a4a', '#ffe14a', '#4aff7a', '#4ab8ff', '#9a4aff']; ctx.lineWidth = 12; cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(W / 2, H * 0.86, W * 0.55 - i * 12, Math.PI, 0); ctx.stroke(); }); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,.75)'; [[0.15, 0.2, 1], [0.75, 0.3, 1.3], [0.4, 0.86, 1.1], [0.88, 0.8, 0.9]].forEach(([a, b, k], i) => { const x = W * a + Math.sin(now * 0.4 + i) * 12, y = H * b; [[0, 0, 22], [24, 6, 18], [-24, 6, 17], [10, 12, 18], [-10, 12, 18]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * k, y + dy * k, r * k, 0, TAU); ctx.fill(); }); });
      }
      ctx.restore();
    }
    function drawFeats(LC, now) {
      const FD = FEAT[LC.name]; if (!FD) return; const sk = FD.sk || {}; ctx.save();
      feats.fan.forEach(q => {
        const x = q.x * S, y = q.y * S, w = q.w * S, h = q.h * S, up = q.ay < 0; ctx.fillStyle = up ? 'rgba(255,150,60,.16)' : 'rgba(120,220,255,.14)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = up ? 'rgba(255,200,120,.7)' : 'rgba(200,245,255,.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) { const ph = (now * 0.8 + i / 6) % 1; if (up) { const ax = x + w * (i + 0.5) / 6, ay = y + h * (1 - ph); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 4, ay + 9); ctx.moveTo(ax, ay); ctx.lineTo(ax + 4, ay + 9); ctx.stroke(); } else { const dir = q.ax > 0 ? 1 : -1, ay = y + h * (i % 3 + 0.5) / 3, ax = q.ax > 0 ? x + w * ph : x + w * (1 - ph); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - dir * 16, ay); ctx.moveTo(ax, ay); ctx.lineTo(ax - dir * 6, ay - 4); ctx.moveTo(ax, ay); ctx.lineTo(ax - dir * 6, ay + 4); ctx.stroke(); } }
      });
      feats.portal.forEach(q => [[q.a, '#3df0ff', 1], [q.b, '#ffa03d', -1]].forEach(([u, c, d]) => { const x = u.x * S, y = u.y * S, r = q.r * S; ctx.strokeStyle = c; ctx.lineWidth = 4; for (let k = 0; k < 3; k++) { ctx.globalAlpha = 0.9 - k * 0.25; ctx.beginPath(); ctx.ellipse(x, y, r * (1 - k * 0.22), r * (1 - k * 0.22) * 0.8, now * 3 * d + k, 0.5, 5.8); ctx.stroke(); } ctx.globalAlpha = 0.25; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }));
      feats.blk.forEach(q => {
        const x = q.x * S, y = q.y * S, w = q.w * S, h = q.h * S, k = sk.blk; let c1 = '#556', c2 = '#889';
        if (k === 'ice') { c1 = '#6ac8ee'; c2 = '#e8fbff'; } else if (k === 'trunk') { c1 = '#5a3a1a'; c2 = '#8a5a2a'; } else if (k === 'rock') { c1 = '#8a5a2a'; c2 = '#c8924a'; } else if (k === 'candy') { c1 = '#ff4a7a'; c2 = '#ffffff'; } else if (k === 'bar') { c1 = '#c020b8'; c2 = '#ff9af8'; } else if (k === 'jelly') { c1 = '#ff4a9a'; c2 = '#ffb8dc'; } else if (k === 'wall') { c1 = '#3a3a5a'; c2 = '#6a6a9a'; } else if (k === 'gear') { c1 = '#9a7a20'; c2 = '#e8c060'; } else if (k === 'server') { c1 = '#12183a'; c2 = '#3dff8a'; } else if (k === 'cloud') { c1 = '#ffffff'; c2 = '#c8e8ff'; } else if (k === 'table') { c1 = '#2a3a5a'; c2 = '#5fe0ff'; }
        const wob = k === 'jelly' ? Math.sin(now * 8 + q.x * 30) * 2 : 0;
        ctx.fillStyle = c1; ctx.strokeStyle = c2; ctx.lineWidth = 2.5; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - wob, y + wob, w + wob * 2, h - wob * 2, k === 'candy' || k === 'cloud' || k === 'jelly' ? Math.min(w, h) / 2 : 5); else ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
        if (k === 'candy') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; for (let i = -2; i < w / 12 + 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 12, y + h); ctx.lineTo(x + i * 12 + 10, y); ctx.stroke(); } }
        else if (k === 'trunk') { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + w * i / 4, y); ctx.lineTo(x + w * i / 4, y + h); ctx.stroke(); } }
        else if (k === 'wall') { ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); if (w > h) { for (let i = 1; i < w / 22; i++) { ctx.moveTo(x + i * 22, y); ctx.lineTo(x + i * 22, y + h); } ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); } else { for (let i = 1; i < h / 22; i++) { ctx.moveTo(x, y + i * 22); ctx.lineTo(x + w, y + i * 22); } } ctx.stroke(); }
        else if (k === 'server') { ctx.fillStyle = '#3dff8a'; for (let i = 0; i < (w > h ? w : h) / 14; i++) { const on = Math.sin(now * 4 + i * 2 + q.x * 9) > 0; ctx.globalAlpha = on ? 1 : 0.25; if (w > h) ctx.fillRect(x + 6 + i * 14, y + h / 2 - 2, 6, 4); else ctx.fillRect(x + w / 2 - 2, y + 6 + i * 14, 4, 6); } ctx.globalAlpha = 1; }
        else if (k === 'table') { ctx.fillStyle = 'rgba(95,224,255,.6)'; ctx.fillRect(x + 5, y + 3, w - 10, 3); }
        else if (k === 'ice') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, y + h - 6); ctx.lineTo(x + w * 0.4, y + 6); ctx.stroke(); }
      });
      feats.haz.forEach(h => {
        const hp = hzPos(h, simT), x = hp.x * S, y = hp.y * S, r = h.r * S, k = sk.haz, a = now * (k === 'asteroid' ? 1 : 0);
        const spikes = (n, c1, c2, ro, ri) => { ctx.fillStyle = c1; ctx.strokeStyle = c2; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const t = i * Math.PI / n + a, rr = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); };
        if (k === 'icicle') { ctx.fillStyle = '#bff0ff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r, y - r * 1.3); ctx.lineTo(x + r, y - r * 1.3); ctx.lineTo(x, y + r * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else if (k === 'plant') { spikes(8, '#2a9a2a', '#bfff7a', r * 1.3, r * 0.7); ctx.fillStyle = '#d83a3a'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill(); }
        else if (k === 'cactus') { ctx.fillStyle = '#2f8a2a'; ctx.strokeStyle = '#9aff7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#eaffd0'; ctx.lineWidth = 1.5; for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r); ctx.lineTo(x + Math.cos(t) * (r + 6), y + Math.sin(t) * (r + 6)); ctx.stroke(); } }
        else if (k === 'urchin') spikes(12, '#3a1a5a', '#c08aff', r * 1.4, r * 0.7);
        else if (k === 'asteroid') { spikes(7, '#6a6070', '#b8b0c0', r * 1.1, r * 0.8); }
        else if (k === 'lava') { ctx.fillStyle = '#ff5a1a'; ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * (1 + Math.sin(now * 6 + h.ph) * 0.1), 0, TAU); ctx.fill(); ctx.stroke(); glow(x, y, r * 2.4, 'rgba(255,120,20,.3)'); }
        else if (k === 'ghost') { ctx.fillStyle = 'rgba(235,240,255,.92)'; ctx.beginPath(); ctx.arc(x, y - r * 0.2, r, Math.PI, 0); ctx.lineTo(x + r, y + r); for (let i = 3; i >= 0; i--) ctx.lineTo(x + r * (i / 1.5 - 1) + (i % 2 ? 0 : 0), y + r * (i % 2 ? 0.6 : 1.1)); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.3, r * 0.15, 0, TAU); ctx.arc(x + r * 0.35, y - r * 0.3, r * 0.15, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * 0.15, r * 0.22, 0, 0, TAU); ctx.fill(); }
        else if (k === 'pend') { ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = '#c8962a'; ctx.strokeStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, TAU); ctx.fill(); ctx.stroke(); }
        else if (k === 'mine') { spikes(8, '#4a1a1a', '#ff5a5a', r * 1.35, r * 0.8); ctx.fillStyle = (Math.sin(now * 8) > 0) ? '#ff2a2a' : '#661111'; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, TAU); ctx.fill(); }
        else if (k === 'laser') { ctx.fillStyle = '#ff2a5a'; ctx.strokeStyle = '#ff9ab0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.1, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.1, y); ctx.closePath(); ctx.fill(); ctx.stroke(); glow(x, y, r * 2.2, 'rgba(255,40,90,.3)'); }
        else { spikes(8, '#444', '#f55', r * 1.3, r * 0.8); }
      });
      ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const LC = locOf(level), now = performance.now() / 1000;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, LC.bg[0]); bg.addColorStop(1, LC.bg[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      decor.forEach(d => {
        let x = d.x * W, y = d.y * H;
        if (LC.deco === 'snow') { y = ((d.y + now * 0.03 * d.s) % 1) * H; x = (d.x * W + Math.sin(now + d.p) * 14 + W) % W; }
        else if (LC.deco === 'leaf') { y = ((d.y + now * 0.04 * d.s) % 1) * H; x = (d.x * W + Math.sin(now * 0.8 + d.p) * 30 + now * 10 * d.s + W * 2) % W; }
        else if (LC.deco === 'ember') { y = (((d.y - now * 0.05 * d.s) % 1) + 1) % 1 * H; x = (d.x * W + Math.sin(now * 1.5 + d.p) * 10 + W) % W; }
        else if (LC.deco === 'sand') { x = ((d.x + now * 0.08 * d.s) % 1) * W; y = (d.y * H + Math.sin(now * 2 + d.p) * 6 + H) % H; }
        else if (LC.deco === 'bubble') { y = (((d.y - now * 0.03 * d.s) % 1) + 1) % 1 * H; x = (d.x * W + Math.sin(now + d.p) * 8 + W) % W; }
        const tw = LC.deco === 'star' || LC.deco === 'spark' ? 0.25 + 0.6 * Math.abs(Math.sin(now * d.s + d.p)) : 0.45;
        ctx.globalAlpha = tw; ctx.fillStyle = LC.dc; ctx.beginPath(); ctx.arc(x, y, d.s * (LC.deco === 'bubble' ? 3 : 1.6), 0, TAU); ctx.fill();
      }); ctx.globalAlpha = 1;
      if (LC.deco === 'star') { ctx.fillStyle = 'rgba(176,124,255,.35)'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.2, 38, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.19, 30, 0, TAU); ctx.fill(); }
      if (LC.name === 'Подводный мир') { ctx.fillStyle = 'rgba(80,200,255,.07)'; ctx.fillRect(0, 0, W, H); }
      if (LC.name === 'Вулкан') { const lg = ctx.createLinearGradient(0, H - 90, 0, H); lg.addColorStop(0, 'rgba(255,90,20,0)'); lg.addColorStop(1, 'rgba(255,120,20,.55)'); ctx.fillStyle = lg; ctx.fillRect(0, H - 90, W, 90); }
      scene(LC, now);
      ctx.save(); ctx.translate(OX, OY);
      drawFeats(LC, now);
      ctx.strokeStyle = cfg.wallDeath ? 'rgba(255,90,90,.45)' : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(1, 1, S * ww - 2, S * hh - 2); ctx.setLineDash([]);
      const locked = greens.some(q => !q.hit);
      // target
      const tx = target.x * S, ty = target.y * S, pulse = 1 + Math.sin(simT * 0 + performance.now() / 300) * 0.06;
      ctx.strokeStyle = locked ? 'rgba(61,255,138,.35)' : '#3dff8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, cfg.targetR * S * pulse * 1.5, 0, TAU); ctx.stroke();
      ctx.fillStyle = locked ? 'rgba(61,255,138,.25)' : '#3dff8a'; ctx.beginPath(); ctx.arc(tx, ty, cfg.targetR * S, 0, TAU); ctx.fill();
      greens.forEach(s => {
        ctx.lineCap = 'round'; ctx.strokeStyle = s.hit ? '#b6ff5a' : '#2bbf3a'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(s.x1 * S, s.y1 * S); ctx.lineTo(s.x2 * S, s.y2 * S); ctx.stroke();
        ctx.strokeStyle = s.hit ? '#f4ffd8' : '#a9f5b0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(s.x1 * S, s.y1 * S); ctx.lineTo(s.x2 * S, s.y2 * S); ctx.stroke();
        ctx.fillStyle = '#0d3a14'; [s.x1, s.x2].forEach((x, i) => { ctx.beginPath(); ctx.arc(x * S, (i ? s.y2 : s.y1) * S, 4, 0, TAU); ctx.fill(); });
      });
      // trampolines
      const all = drag ? tr.concat([drag]) : tr;
      ctx.lineCap = 'round';
      all.forEach(s => {
        if (s.dead) return;
        const faint = LC.blink && state === 'run' && (simT % LC.blink) >= LC.blink * 0.7;
        const wob = LC.jelly ? Math.sin(now * 9 + s.x1 * 20) * 2 : 0, cr = LC.frag && s.n ? s.n / LC.frag : 0;
        ctx.strokeStyle = LC.tcol[0]; ctx.lineWidth = 9 + wob; ctx.globalAlpha = (faint ? 0.25 : 1) - cr * 0.45; ctx.beginPath(); ctx.moveTo(s.x1 * S, s.y1 * S); ctx.lineTo(s.x2 * S, s.y2 * S); ctx.stroke();
        ctx.strokeStyle = LC.tcol[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x1 * S, s.y1 * S); ctx.lineTo(s.x2 * S, s.y2 * S); ctx.stroke(); ctx.globalAlpha = 1;
        if (cr) { ctx.strokeStyle = 'rgba(0,20,40,.8)'; ctx.lineWidth = 1.5; const mx = (s.x1 + s.x2) / 2 * S, my = (s.y1 + s.y2) / 2 * S; for (let k = 0; k < s.n * 2; k++) { const o = ((k * 37) % 11 - 5) * 3; ctx.beginPath(); ctx.moveTo(mx + o, my - 5); ctx.lineTo(mx + o + 3, my); ctx.lineTo(mx + o - 2, my + 5); ctx.stroke(); } }
      });
      pegs.forEach(q => { ctx.fillStyle = '#ff3df0'; ctx.beginPath(); ctx.arc(q.x * S, q.y * S, q.r * S, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffd6fb'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(q.x * S - q.r * S * 0.3, q.y * S - q.r * S * 0.3, q.r * S * 0.25, 0, TAU); ctx.fill(); });
      if (LC.wind && state === 'run') { const wv = LC.wind.a * Math.sin(simT * LC.wind.w); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 14px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(wv > 0.03 ? 'ветер →' : wv < -0.03 ? '← ветер' : 'штиль', S * ww / 2, 18); }
      // trail
      if (cfg.trail) trail.forEach((p, i) => { ctx.fillStyle = 'rgba(255,138,28,' + (i / trail.length) * 0.35 + ')'; ctx.beginPath(); ctx.arc(p.x * S, p.y * S, cfg.ballR * S * (0.4 + 0.5 * i / trail.length), 0, TAU); ctx.fill(); });
      // ball
      if (state !== 'won') {
        ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.arc(ball.x * S, ball.y * S, cfg.ballR * S, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(ball.x * S - cfg.ballR * S * 0.3, ball.y * S - cfg.ballR * S * 0.3, cfg.ballR * S * 0.3, 0, TAU); ctx.fill();
      }
      for (const p of parts) { ctx.fillStyle = 'hsla(' + p.hue + ',100%,60%,' + Math.max(0, p.life) + ')'; ctx.fillRect(p.x * S, p.y * S, 3, 3); }
      ctx.restore();
      // HUD
      ctx.fillStyle = '#cfd6e6'; ctx.font = '700 ' + Math.max(15, Math.min(20, W * 0.048)) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('Уровень ' + level + ' · попыток: ' + attempts, 14, 78);
      ctx.fillStyle = 'rgba(207,214,230,.55)'; ctx.font = '600 ' + Math.max(11, Math.min(13, W * 0.031)) + 'px Inter, system-ui, sans-serif';
      ctx.fillText(locName(level), 14, 96);
      if (state === 'plan') {
        ctx.fillStyle = 'rgba(207,214,230,.6)'; ctx.font = '500 ' + Math.max(12, Math.min(16, W * 0.036)) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Рисуйте батуты пальцем · осталось: ' + Math.max(0, cfg.tramps - tr.length) + (greens.length ? ' · зелёные: ' + greens.filter(q => q.hit).length + '/' + greens.length : ''), W / 2, 111);
      }
      ctx.textAlign = 'center';
      if (state === 'won') { ctx.fillStyle = '#3dff8a'; ctx.font = '800 ' + Math.min(48, W * 0.11) + 'px Inter, system-ui, sans-serif'; ctx.fillText('Попал!', W / 2, OY + S * hh * 0.4); }
      const lb2 = { x: W - 104, y: 62, w: 92, h: 30 }; ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lb2.x, lb2.y, lb2.w, lb2.h, 15) : ctx.rect(lb2.x, lb2.y, lb2.w, lb2.h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6ecf8'; ctx.font = '700 14px Inter, system-ui, sans-serif'; ctx.fillText('Уровни', lb2.x + lb2.w / 2, lb2.y + lb2.h / 2 + 1); btnLevels = lb2;
      if (banner && banner.t > 0) {
        const a = Math.min(1, banner.t * 1.2, (3.4 - banner.t) * 3 + 0.2); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = 'rgba(0,0,0,.62)'; const bw2 = Math.min(W - 24, 360), bx2 = (W - bw2) / 2, by2 = H * 0.3;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx2, by2, bw2, 116, 16) : ctx.rect(bx2, by2, bw2, 116); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 22px Inter, system-ui, sans-serif'; ctx.fillText('Новая локация: ' + banner.name, W / 2, by2 + 30);
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '500 13px Inter, system-ui, sans-serif';
        const words = banner.joke.split(' '); let line = '', ly = by2 + 58; words.forEach(w => { const t2 = line ? line + ' ' + w : w; if (ctx.measureText(t2).width > bw2 - 28 && line) { ctx.fillText(line, W / 2, ly); ly += 18; line = w; } else line = t2; }); ctx.fillText(line, W / 2, ly); ctx.globalAlpha = 1;
      }
      const bh = 52, by = H - bh - 18, bw = Math.min(160, W * 0.4);
      btnRun = button(state === 'run' ? '↺ Заново' : '▶ Пуск', W / 2 + 8, by, bw, bh, state === 'plan');
      btnClear = button('Очистить', W / 2 - bw - 8, by, bw, bh, false);
    }

    const DT = 1 / 480;
    function frame(ts) {
      if (!on) return;
      const real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused && !menuOpen) { acc += real; let n = 0; while (acc >= DT && n < 4000) { step(DT); acc -= DT; n++; } playEvents(); }
      if (banner && !menuOpen) banner.t -= real;
      musicTick();
      draw(); raf = requestAnimationFrame(frame);
    }

    resize(); best = Math.max(readKey(keyFor() + ':best'), loadLevel()); level = loadLevel() - 1; attempts = 0; parts = []; events = []; newLevel(false); syncProgress(); if (!LB || !LB.loggedIn) noPush = false;
    raf = requestAnimationFrame(frame);
    return {
      restart, resize,
      setPaused(p) { paused = p; },
      destroy() { on = false; closeMenu(); mstyle.remove(); song.pause(); song.removeAttribute('src'); song.load(); cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); },
      debug: { get feats() { return feats; }, step, next() { newLevel(false); }, get state() { return state; }, get level() { return level; }, get start() { return start; }, get target() { return target; }, get hh() { return hh; }, get ww() { return ww; }, get tr() { return tr; }, get greens() { return greens; }, reset, jumpTo, openMenu, closeMenu, get best() { return best; }, set best(v) { best = v; }, get loc() { return locOf(level).name; }, set tr(v) { tr = v; }, run() { state = 'run'; simT = 0; } }
    };
  }
});
