/* «Угадай страну» — вращающиеся круги (ряд Фурье) рисуют границу страны: сначала 4 круга, потом 12, 30, 80, 200.
   Угадайте страну до того, как круги закончат: чем раньше ответ, тем больше очков. Каждый раунд — другая страна. */
Sims.register({
  id: 'country-guess',
  kind: 'game',
  title: 'Угадай страну',
  desc: 'Круги рисуют границу страны, а вы угадываете какую. Чем меньше кругов — тем больше очков. Каждый раз новая страна.',
  defaults: { sound: true, lives: 3 },
  schema: [
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'lives', l: 'Жизни', min: 1, max: 9, step: 1 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#10193a'; ctx.fillRect(0, 0, w, h); const cx = w * 0.5, cy = h * 0.5, R = h * 0.34;
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + R * 0.8, cy - R * 0.3, R * 0.35, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#ff9a1a'; ctx.lineWidth = 3; ctx.shadowColor = '#ff9a1a'; ctx.shadowBlur = 10; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const a = i / 80 * 5.4 - 1, r = R * (0.9 + 0.18 * Math.sin(a * 3) + 0.08 * Math.sin(a * 7)); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8); } ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd24a'; ctx.font = '800 ' + h * 0.12 + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('12 кругов', cx, h * 0.92);
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const DW = 360, DH = 640, FONT = 'system-ui, sans-serif', STAGES = [4, 12, 30, 80, 200], LOOP = 3.6, HOLD = 0.4, BKEY = 'cg_best';
    const DATA = window.COUNTRY_SHAPES || {}, IDS = Object.keys(DATA);
    let W = 0, H = 0, dpr = 1, on = true, paused = false, raf = 0, last = 0, t = 0;
    let deck = [], cur = null, st = 'play', stage = 0, maxStage = 0, st0 = 0, trace = [], terms = [], opts = [], pick = -1, typed = '', sugg = [], ui = null, inp = null, hint = '', score = 0, lives = 3, best = 0, round = 0, rev = 0, fb = '', cacheT = {};
    try { best = +localStorage.getItem(BKEY) || 0; } catch (e) { }

    function blip(f, dur, type, vol, slide) {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.04, now + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur); o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    /* ряд Фурье: коэффициенты, отсортированные по размеру круга */
    function coefs(id) {
      if (cacheT[id]) return cacheT[id]; const p = DATA[id].p, N = p.length / 2, out = [];
      for (let k = -N / 2; k < N / 2; k++) { let re = 0, im = 0; for (let j = 0; j < N; j++) { const a = -2 * Math.PI * k * j / N, c = Math.cos(a), s = Math.sin(a), x = p[2 * j], y = p[2 * j + 1]; re += x * c - y * s; im += x * s + y * c; } out.push({ k, re: re / N, im: im / N, r: Math.hypot(re, im) / N }); }
      out.sort((a, b) => b.r - a.r); return (cacheT[id] = out);
    }
    function pos(ts, th) { let x = 0, y = 0; for (const c of ts) { const a = c.k * th, cs = Math.cos(a), sn = Math.sin(a); x += c.re * cs - c.im * sn; y += c.re * sn + c.im * cs; } return [x, y]; }
    function startStage(i) { stage = i; maxStage = Math.max(maxStage, i); st0 = t; terms = coefs(cur).slice(0, STAGES[i]); trace = []; for (let s = 0; s <= 360; s++) trace.push(pos(terms, s / 360 * Math.PI * 2)); if (i) blip(300 + i * 70, 0.08, 'square', 0.025); }
    function nextRound() {
      if (!deck.length) { deck = IDS.slice(); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } if (deck[deck.length - 1] === cur) deck.unshift(deck.pop()); }
      cur = deck.pop(); round++; st = 'play'; pick = -1; fb = ''; maxStage = 0;
      typed = ''; if (inp) inp.value = ''; sugg = []; hint = ''; showUI(true); startStage(0);
    }
    function restart() { score = 0; lives = cfg.lives; round = 0; deck = []; cur = null; nextRound(); }
    const norm = x => String(x).toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/g, ' ').trim();
    const ALIAS = { COD: ['конго', 'демократическая республика конго'], PNG: ['папуа', 'папуа новая гвинея'], GBR: ['англия', 'соединенное королевство', 'британия'], USA: ['соединенные штаты', 'америка', 'соединенные штаты америки'], KOR: ['корея'], CIV: ['кот д ивуар', 'берег слоновой кости'], MMR: ['бирма'], SWZ: [], CZE: ['чешская республика'] };
    const names = IDS.map(id => ({ id, n: DATA[id].n, k: norm(DATA[id].n) })).sort((a, b) => a.n.localeCompare(b.n, 'ru'));
    function suggest(q) {
      q = norm(q); if (!q) return []; const a = names.filter(c => c.k.startsWith(q)), b = names.filter(c => !c.k.startsWith(q) && c.k.split(' ').some(w => w.startsWith(q)));
      return a.concat(b).slice(0, 6);
    }
    function matches(q, id) { q = norm(q); return q === norm(DATA[id].n) || (ALIAS[id] || []).includes(q); }
    function submit(txtv) {
      if (st !== 'play') return; const q = norm(txtv); if (!q) return;
      let id = names.find(c => matches(q, c.id)); id = id && id.id; if (!id) { const sg = suggest(q); if (sg.length === 1) id = sg[0].id; }
      if (!id) { hint = 'Выберите страну из списка'; return; }
      finish(id === cur ? 'ok' : 'bad', id);
    }
    function finish(res, id) {
      rev = 0; pick = id || null; showUI(false);
      if (res === 'ok') { const pts = STAGES.length - maxStage; score += pts; fb = '+' + pts; st = 'ok'; blip(660, 0.2, 'triangle', 0.06, 990); blip(990, 0.25, 'triangle', 0.05, 1320); }
      else if (res === 'giveup') { lives--; st = 'late'; fb = 'Сдались'; blip(160, 0.4, 'sawtooth', 0.06, 70); }
      else { lives--; st = 'bad'; fb = 'Не угадали: ' + DATA[id].n; blip(160, 0.4, 'sawtooth', 0.06, 70); }
      if (score > best) { best = score; try { localStorage.setItem(BKEY, best); } catch (e) { } }
    }
    /* строка ввода и подсказки — настоящие HTML-элементы поверх холста (чтобы работала клавиатура телефона) */
    function mkUI() {
      ui = document.createElement('div'); ui.style.cssText = 'position:fixed;z-index:30;left:0;top:0;width:0;height:0';
      inp = document.createElement('input'); inp.type = 'text'; inp.autocomplete = 'off'; inp.autocapitalize = 'off'; inp.spellcheck = false; inp.placeholder = 'Введите страну…'; inp.enterKeyHint = 'done';
      inp.style.cssText = 'position:absolute;box-sizing:border-box;border-radius:12px;border:2px solid rgba(255,255,255,.4);background:rgba(10,16,40,.95);color:#fff;font:700 17px system-ui;padding:0 12px;outline:none';
      const box = document.createElement('div'); box.style.cssText = 'position:absolute;display:grid;grid-template-columns:1fr 1fr;gap:6px'; ui.append(inp, box); ui.box = box; document.body.appendChild(ui);
      inp.oninput = () => { typed = inp.value; hint = ''; sugg = suggest(typed); renderSugg(); };
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(inp.value); } e.stopPropagation(); };
      inp.onkeyup = e => e.stopPropagation();
    }
    function renderSugg() {
      ui.box.innerHTML = ''; sugg.forEach(c => { const b = document.createElement('button'); b.textContent = c.n; b.style.cssText = 'height:30px;border-radius:9px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font:700 14px system-ui;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer'; b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); }; b.onclick = e => { e.stopPropagation(); inp.value = c.n; submit(c.n); }; ui.box.appendChild(b); });
    }
    function showUI(v) { if (!ui) return; ui.style.display = v ? '' : 'none'; if (v) renderSugg(); }
    function layoutUI() {
      if (!ui) return; const r = canvas.getBoundingClientRect(), T = uiT(), k = T.s * r.width / canvas.width, ox = r.left + T.ox * r.width / canvas.width, oy = r.top + T.oy * r.height / canvas.height;
      const pl = (el, x, y, w, h) => { el.style.left = ox + x * k + 'px'; el.style.top = oy + y * k + 'px'; el.style.width = w * k + 'px'; if (h) el.style.height = h * k + 'px'; };
      pl(inp, 14, 500, 262, 36); pl(ui.box, 14, 544, 332); ui.box.style.gap = 6 * k + 'px'; inp.style.fontSize = Math.max(14, 17 * k) + 'px';
      ui.box.querySelectorAll('button').forEach(b => { b.style.height = 30 * k + 'px'; b.style.fontSize = Math.max(12, 14 * k) + 'px'; });
    }
    function update(dt) {
      t += dt;
      if (st === 'play') {
      } else if (st === 'ok' || st === 'bad' || st === 'late') { rev += dt; if (rev > 2.2) { if (lives <= 0) st = 'over'; else nextRound(); } }
    }

    /* ---------- ввод ---------- */
    function uiT() { const s = Math.min(canvas.width / DW, canvas.height / DH); return { s, ox: (canvas.width - DW * s) / 2, oy: (canvas.height - DH * s) / 2 }; }
    function uiXY(e) { const r = canvas.getBoundingClientRect(), T = uiT(), px = (e.clientX - r.left) * canvas.width / r.width, py = (e.clientY - r.top) * canvas.height / r.height; return { x: (px - T.ox) / T.s, y: (py - T.oy) / T.s }; }
    const CH = i => 14 + i * 67;
    function onDown(e) {
      if (st === 'over') { restart(); return; }
      if (st === 'ok' || st === 'bad' || st === 'late') { if (rev > 0.6) { rev = 3; } return; }
      const p = uiXY(e);
      for (let i = 0; i < STAGES.length; i++) if (p.x >= CH(i) && p.x <= CH(i) + 62 && p.y >= 430 && p.y <= 458) { startStage(i); return; }
      if (p.y >= 464 && p.y <= 494) { if (p.x >= 14 && p.x <= 176) { startStage(stage); } else if (p.x >= 184 && p.x <= 346 && stage < STAGES.length - 1) startStage(stage + 1); }
      if (p.y >= 500 && p.y <= 536 && p.x >= 282 && p.x <= 346) finish('giveup', null);
    }
    function onKey(e) { if (e.type === 'keydown' && st === 'over' && (e.code === 'Space' || e.code === 'Enter')) restart(); }
    canvas.addEventListener('pointerdown', onDown); addEventListener('keydown', onKey); mkUI();

    /* ---------- рисование ---------- */
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function txt(s, x, y, size, col, al) { ctx.font = '800 ' + size + 'px ' + FONT; ctx.textAlign = al || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0f1a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height); const T = uiT(); ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, DW, DH); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; for (let x = 0; x < DW; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DH); ctx.stroke(); } for (let y = 0; y < DH; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DW, y); ctx.stroke(); }
      txt('УГАДАЙ СТРАНУ', 180, 84, 24, '#fff', 'center'); txt('до того, как круги закончат', 180, 108, 12, 'rgba(255,255,255,.65)', 'center');
      const cx = 180, cy = 262, S = 125 / 500;
      if (cur) {
        const el = Math.max(0, t - st0), th = st === 'play' ? Math.min(1, el / LOOP) : 1, n = Math.floor(th * 360);
        if (st === 'play' || st === 'late') {
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; let x = 0, y = 0; const a = th * Math.PI * 2;
          terms.forEach(c => { const ang = c.k * a, nx = x + c.re * Math.cos(ang) - c.im * Math.sin(ang), ny = y + c.re * Math.sin(ang) + c.im * Math.cos(ang), r = c.r * S; if (r > 0.8) { ctx.beginPath(); ctx.arc(cx + x * S, cy + y * S, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + x * S, cy + y * S); ctx.lineTo(cx + nx * S, cy + ny * S); ctx.stroke(); } x = nx; y = ny; });
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + x * S, cy + y * S, 3, 0, 7); ctx.fill();
        }
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = '#ff9a1a'; ctx.shadowBlur = 12; ctx.strokeStyle = '#ff9a1a'; ctx.lineWidth = 3; ctx.beginPath();
        if (st === 'play' || st === 'late') { for (let i = 0; i <= n; i++) { const q = trace[i]; if (!q) break; i ? ctx.lineTo(cx + q[0] * S, cy + q[1] * S) : ctx.moveTo(cx + q[0] * S, cy + q[1] * S); } if (th >= 1) ctx.closePath(); }
        else { const p = DATA[cur].p; for (let i = 0; i < p.length; i += 2) i ? ctx.lineTo(cx + p[i] * S, cy + p[i + 1] * S) : ctx.moveTo(cx + p[i] * S, cy + p[i + 1] * S); ctx.closePath(); }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      const nC = st === 'play' || st === 'late' ? STAGES[stage] : STAGES[stage];
      txt(String(nC), 150, 398, 34, '#ffd24a', 'right'); txt(nC === 1 ? 'круг' : nC < 5 ? 'круга' : 'кругов', 158, 400, 14, 'rgba(255,255,255,.8)', 'left');
      if (st === 'play') {
        STAGES.forEach((n, i) => { const x = CH(i), on2 = i === stage; ctx.fillStyle = on2 ? '#ffd24a' : 'rgba(255,255,255,.1)'; rr(x, 430, 62, 28, 8); ctx.fill(); ctx.strokeStyle = on2 ? '#ffd24a' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke(); txt(String(n), x + 31, 445, 13, on2 ? '#241800' : '#fff', 'center'); });
        ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(14, 464, 162, 30, 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke(); txt('↻ Повторить', 95, 479, 14, '#fff', 'center');
        const can = stage < STAGES.length - 1; ctx.fillStyle = can ? 'rgba(255,154,26,.28)' : 'rgba(255,255,255,.05)'; rr(184, 464, 162, 30, 10); ctx.fill(); ctx.strokeStyle = can ? '#ff9a1a' : 'rgba(255,255,255,.2)'; ctx.stroke(); txt('Дальше ▶', 265, 479, 14, can ? '#fff' : 'rgba(255,255,255,.35)', 'center');
        if (stage >= 3) txt('Узнали уже?', 180, 126, 14, '#ffd24a', 'center');
      }
      if (st === 'play') {
        ctx.fillStyle = 'rgba(255,90,90,.2)'; rr(282, 500, 64, 36, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,120,120,.6)'; ctx.lineWidth = 1.5; ctx.stroke(); txt('Сдаться', 314, 518, 12, '#ffb0b0', 'center');
        if (hint) txt(hint, 180, 556, 13, '#ffb04a', 'center'); else if (!sugg.length) txt('Начните вводить название — появятся подсказки', 180, 556, 12, 'rgba(255,255,255,.55)', 'center');
      }
      txt('Очки: ' + score, 14, 24, 16, '#fff'); txt('рекорд ' + best, 346, 24, 12, 'rgba(255,255,255,.55)', 'right'); for (let i = 0; i < cfg.lives; i++) txt('♥', 14 + i * 20, 50, 20, i < lives ? '#ff4a6a' : 'rgba(255,255,255,.2)');
      if (st === 'ok' || st === 'bad' || st === 'late') { ctx.globalAlpha = Math.min(1, rev * 4); txt(st === 'ok' ? fb + ' очк.' : fb, 180, 150, st === 'bad' ? 18 : 22, st === 'ok' ? '#7aff9a' : '#ff8a7a', 'center'); txt('Это ' + DATA[cur].n, 180, 480, 24, '#fff', 'center'); ctx.globalAlpha = 1; }
      if (st === 'over') { ctx.fillStyle = 'rgba(8,12,30,.82)'; ctx.fillRect(0, 0, DW, DH); txt('Игра окончена', 180, 250, 30, '#ff8a7a', 'center'); txt('Очки: ' + score + ' · рекорд ' + best, 180, 296, 16, '#fff', 'center'); txt('Раундов сыграно: ' + round, 180, 326, 14, 'rgba(255,255,255,.7)', 'center'); txt('Нажмите, чтобы сыграть ещё', 180, 380, 15, '#ffd24a', 'center'); }
      ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    function frame(ts) { if (!on) return; layoutUI(); const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts; if (!paused) update(dt); draw(); raf = requestAnimationFrame(frame); }
    resize(); restart(); raf = requestAnimationFrame(frame);
    return {
      restart, resize, setPaused(p) { paused = p; },
      destroy() { on = false; cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); removeEventListener('keydown', onKey); if (ui) ui.remove(); },
      debug: { update, submit, suggest, get typed() { return typed; }, set typed(v) { inp.value = v; inp.oninput(); }, get st() { return st; }, get cur() { return cur; }, get stage() { return stage; }, get score() { return score; }, get lives() { return lives; }, get IDS() { return IDS; } }
    };
  }
});
