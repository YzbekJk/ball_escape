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
    function jumpTo(n) { if (n < 1 || n > best) return; closeMenu(); level = n - 1; attempts = 0; newLevel(false); }
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
      ctx.save(); ctx.translate(OX, OY);
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
      debug: { step, next() { newLevel(false); }, get state() { return state; }, get level() { return level; }, get start() { return start; }, get target() { return target; }, get hh() { return hh; }, get ww() { return ww; }, get tr() { return tr; }, get greens() { return greens; }, reset, jumpTo, openMenu, closeMenu, get best() { return best; }, set best(v) { best = v; }, get loc() { return locOf(level).name; }, set tr(v) { tr = v; }, run() { state = 'run'; simT = 0; } }
    };
  }
});
