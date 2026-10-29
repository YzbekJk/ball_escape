/* «Симулятор курьера» — вид сверху: на скутере с термосумкой забирайте заказы в кафе и развозите по домам, пока идёт смена.
   Следите за машинами на перекрёстках, успевайте вовремя, копите деньги и прокачивайте скутер в магазине. Свой саундтрек. */
Sims.register({
  id: 'courier',
  kind: 'game',
  title: 'Симулятор курьера',
  desc: 'Развозите заказы по городу на скутере: заберите в кафе, довезите до дома, не попадите под машину и успейте вовремя.',
  defaults: { sound: true, music: true, volume: 0.6, shift: 120 },
  schema: [
    { k: 'sound', l: 'Звуки', type: 'check', live: 1 },
    { k: 'music', l: 'Саундтрек', type: 'check', live: 1 },
    { k: 'volume', l: 'Громкость саундтрека', min: 0, max: 1, step: 0.05, live: 1 },
    { k: 'shift', l: 'Длина смены, секунд', min: 30, max: 300, step: 10 }
  ],

  preview(ctx, w, h) {
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a2e36'; ctx.fillRect(0, h * 0.42, w, h * 0.16); ctx.fillRect(w * 0.45, 0, w * 0.14, h);
    ctx.fillStyle = '#e8e0c0'; for (let i = 0; i < 10; i++) ctx.fillRect(i * w * 0.1 + 4, h * 0.495, w * 0.05, 3);
    [[0.04, 0.06, '#c8604a'], [0.22, 0.08, '#d8a04a'], [0.04, 0.68, '#4a8ac8'], [0.64, 0.1, '#7ac060'], [0.7, 0.66, '#c060a0']].forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.fillRect(w * x, h * y, w * 0.17, h * 0.26); });
    ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.arc(w * 0.52, h * 0.5, h * 0.06, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(w * 0.5, h * 0.47, w * 0.04, h * 0.06);
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * 0.83, h * 0.44, h * 0.11, 0, 7); ctx.stroke();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const FONT = 'system-ui, sans-serif', DW = 360, DH = 640, SKEY = 'courier_v1';
    const C = 216, RD = 56, N = 9, WS = N * C + RD, BS = C - RD;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
    const PAL = ['#c8604a', '#d8a04a', '#4a8ac8', '#7ac060', '#c060a0', '#8a7ac8', '#58a8a0', '#d87a5a'];
    const FOODS = ['Шаурма', 'Пицца', 'Суши', 'Бургеры', 'Кофейня', 'Пельмени', 'Блины', 'Вок'];
    const UPS = [
      { id: 'motor', n: 'Мотор', d: 'Выше скорость скутера', max: 5, base: 70 },
      { id: 'bag', n: 'Термосумка', d: 'Больше времени за доставку', max: 5, base: 55 },
      { id: 'armor', n: 'Шлем и броня', d: 'Аварии наказывают слабее', max: 5, base: 45 },
      { id: 'tip', n: 'Вежливость', d: 'Больше чаевых', max: 5, base: 60 }
    ];
    let W = 0, H = 0, dpr = 1, on = true, paused = false, raf = 0, last = 0, t = 0;
    let save, mode = 'menu', bld = [], cafes = [], cars = [], me, cam = { x: 0, y: 0 }, Z = 1, order = null, shiftT = 0, earned = 0, orders = 0, late = 0, crashes = 0, toast = '', toastT = 0, floats = [], keys = { l: 0, r: 0, u: 0, d: 0 }, stick = null, shake = 0, best = 0, parts = [];

    function loadSave() { try { const o = JSON.parse(localStorage.getItem(SKEY)); if (o) return Object.assign({ money: 0, lv: {}, best: 0, total: 0 }, o); } catch (e) { } return { money: 0, lv: {}, best: 0, total: 0 }; }
    function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } }
    const lv = id => save.lv[id] || 0, cost = u => Math.round(u.base * Math.pow(lv(u.id) + 1, 1.5));
    function blip(f, dur, type, vol, slide) {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), now + dur);
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(vol || 0.05, now + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, now + dur); o.connect(gn); gn.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }
    const say = s => { toast = s; toastT = 2.2; };
    const fl = (s, x, y, c) => floats.push({ s, x, y, c: c || '#fff', t: 1.3 });

    /* ---------- город ---------- */
    function build() {
      bld = []; cafes = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const bx = i * C + RD, by = j * C + RD, cafeAt = Math.random() < 0.3 ? Math.floor(Math.random() * 4) : -1;
        for (let k = 0; k < 4; k++) {
          const b = { x: bx + 6 + (k % 2) * 78, y: by + 6 + Math.floor(k / 2) * 78, w: 70, h: 70, col: PAL[(i * 3 + j * 5 + k) % PAL.length], cafe: k === cafeAt, no: 1 + ((i * N + j) * 4 + k) };
          if (b.cafe) { b.name = FOODS[Math.floor(Math.random() * FOODS.length)]; b.col = '#ff8a1c'; cafes.push(b); }
          bld.push(b);
        }
      }
      if (cafes.length < 8) { for (const b of bld) { if (cafes.length >= 8) break; if (!b.cafe && Math.random() < 0.05) { b.cafe = true; b.name = FOODS[Math.floor(Math.random() * FOODS.length)]; b.col = '#ff8a1c'; cafes.push(b); } } }
      cars = []; const CC = ['#e04a4a', '#4a8ae0', '#f0d040', '#e8e8e8', '#5ac070', '#a060d8'];
      for (let n = 0; n < 26; n++) { const h = n % 2 === 0, k = Math.floor(Math.random() * (N + 1)), dir = Math.random() < 0.5 ? 1 : -1; cars.push({ h, k, dir, pos: Math.random() * WS, sp: rnd(55, 95), col: CC[n % CC.length] }); }
    }
    const carRect = c => { const p = c.pos, lane = c.k * C + RD / 2 + c.dir * 11; return c.h ? { x: p - 15, y: lane - 8, w: 30, h: 16 } : { x: lane - 8, y: p - 15, w: 16, h: 30 }; };
    const cen = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const rDist = (b, x, y) => Math.hypot(clamp(x, b.x, b.x + b.w) - x, clamp(y, b.y, b.y + b.h) - y);

    function newOrder() {
      const near = cafes.filter(c => Math.hypot(cen(c).x - me.x, cen(c).y - me.y) > 220); const cf = (near.length ? near : cafes)[Math.floor(Math.random() * (near.length || cafes.length))], cc = cen(cf);
      let home = null; for (let i = 0; i < 80 && !home; i++) { const b = bld[Math.floor(Math.random() * bld.length)], d = Math.hypot(cen(b).x - cc.x, cen(b).y - cc.y); if (!b.cafe && d > 450 && d < 1000) home = b; } if (!home) home = bld.find(b => !b.cafe);
      order = { cafe: cf, home, got: false, tMax: 0, t: 0 }; order.tMax = Math.hypot(cen(home).x - cc.x, cen(home).y - cc.y) / 105 + 16; order.t = order.tMax;
    }
    function startShift() {
      mode = 'play'; me = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2, stun: 0, inv: 0 }; me.x = Math.floor(N / 2) * C + RD / 2; me.y = Math.floor(N / 2) * C + RD / 2;
      shiftT = cfg.shift; earned = 0; orders = 0; late = 0; crashes = 0; floats = []; parts = []; order = null; newOrder(); cam.x = me.x; cam.y = me.y; say('Смена началась! Заберите первый заказ');
    }
    function endShift() { mode = 'over'; save.money += earned; save.total += orders; if (earned > save.best) save.best = earned; best = save.best; persist(); blip(330, 0.5, 'triangle', 0.06, 220); }

    /* ---------- обновление ---------- */
    const maxSp = () => 170 + lv('motor') * 16;
    function update(dt) {
      t += dt; toastT = Math.max(0, toastT - dt); shake = Math.max(0, shake - dt); floats.forEach(f => { f.t -= dt; f.y -= 22 * dt; }); floats = floats.filter(f => f.t > 0); parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }); parts = parts.filter(p => p.t > 0);
      cars.forEach(c => { c.pos += c.dir * c.sp * dt; if (c.pos > WS + 30) c.pos = -30; if (c.pos < -30) c.pos = WS + 30; });
      if (mode !== 'play') { if (me) { cam.x += (me.x - cam.x) * 0.1; cam.y += (me.y - cam.y) * 0.1; } return; }
      shiftT -= dt; if (shiftT <= 0) { shiftT = 0; endShift(); return; }
      me.stun = Math.max(0, me.stun - dt); me.inv = Math.max(0, me.inv - dt);
      let dx = keys.r - keys.l, dy = keys.d - keys.u; if (stick) { const sx = stick.x - stick.ox, sy = stick.y - stick.oy, l = Math.hypot(sx, sy); if (l > 8) { dx = sx / Math.max(l, 1) * Math.min(1, l / 40); dy = sy / Math.max(l, 1) * Math.min(1, l / 40); } }
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      const ms = maxSp() * (me.stun > 0 ? 0.25 : 1), ac = 620;
      me.vx += (dx * ms - me.vx) * Math.min(1, ac / ms * dt * 0.9); me.vy += (dy * ms - me.vy) * Math.min(1, ac / ms * dt * 0.9);
      me.x += me.vx * dt; me.y += me.vy * dt; if (Math.hypot(me.vx, me.vy) > 12) { const ta = Math.atan2(me.vy, me.vx); let d = ta - me.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; me.a += d * Math.min(1, dt * 9); }
      me.x = clamp(me.x, 10, WS - 10); me.y = clamp(me.y, 10, WS - 10);
      const rr = 9; for (const b of bld) { if (Math.abs(b.x + 35 - me.x) > 60 || Math.abs(b.y + 35 - me.y) > 60) continue; const cx = clamp(me.x, b.x, b.x + b.w), cy = clamp(me.y, b.y, b.y + b.h); let ex = me.x - cx, ey = me.y - cy, d = Math.hypot(ex, ey); if (d < rr) { if (d < 1e-6) { ex = 0; ey = -1; d = 1; } me.x = cx + ex / d * rr; me.y = cy + ey / d * rr; const vn = me.vx * ex / d + me.vy * ey / d; if (vn < 0) { me.vx -= vn * ex / d * 1.2; me.vy -= vn * ey / d * 1.2; } } }
      if (me.inv <= 0) for (const c of cars) { const b = carRect(c); if (Math.abs(b.x + b.w / 2 - me.x) > 40 || Math.abs(b.y + b.h / 2 - me.y) > 40) continue; if (rDist(b, me.x, me.y) < rr) { crash(c, b); break; } }
      if (order) {
        order.t -= dt; const tg = order.got ? order.home : order.cafe, cc = cen(tg);
        if (Math.hypot(cc.x - me.x, cc.y - me.y) < 56) {
          if (!order.got) { order.got = true; blip(520, 0.15, 'triangle', 0.05, 780); say('Заказ у вас! Везите на ' + order.home.no + '-й дом'); fl('Заказ взят', me.x, me.y - 20, '#ffd24a'); }
          else deliver();
        }
      }
    }
    function crash(c, b) {
      crashes++; me.inv = 1.6; me.stun = 0.7; shake = 0.35; const pen = Math.max(1, 5 - lv('armor')), money = Math.min(earned, 8 - lv('armor')); shiftT = Math.max(1, shiftT - pen); if (order) order.t -= pen; earned -= money;
      const kx = me.x - (b.x + b.w / 2), ky = me.y - (b.y + b.h / 2), l = Math.hypot(kx, ky) || 1; me.vx = kx / l * 260; me.vy = ky / l * 260; fl('Авария! −' + pen + ' с', me.x, me.y - 20, '#ff7a7a'); blip(120, 0.35, 'sawtooth', 0.07, 50);
      for (let i = 0; i < 12; i++) parts.push({ x: me.x, y: me.y, vx: rnd(-90, 90), vy: rnd(-90, 90), t: 0.5, c: '#ffd24a' });
    }
    function deliver() {
      const on = order.t >= 0, bonus = on ? Math.floor(order.t * 1.4) : 0, tip = Math.floor(Math.random() * (6 + lv('tip') * 5)), pay = (on ? 40 : 22) + bonus + tip;
      earned += pay; orders++; if (on) { const add = 6 + lv('bag') * 1.5; shiftT += add; fl('+' + pay + ' ₽  +' + add.toFixed(1) + ' с', me.x, me.y - 24, '#7aff9a'); } else { late++; fl('Опоздали +' + pay + ' ₽', me.x, me.y - 24, '#ffb04a'); }
      blip(660, 0.18, 'triangle', 0.06, 990); blip(990, 0.22, 'triangle', 0.05, 1320); for (let i = 0; i < 16; i++) parts.push({ x: me.x, y: me.y, vx: rnd(-110, 110), vy: rnd(-110, 110), t: 0.7, c: '#ffe06a' });
      newOrder();
    }

    /* ---------- ввод ---------- */
    function uiT() { const s = Math.min(canvas.width / DW, canvas.height / DH); return { s, ox: (canvas.width - DW * s) / 2, oy: (canvas.height - DH * s) / 2 }; }
    function uiXY(e) { const r = canvas.getBoundingClientRect(), T = uiT(), px = (e.clientX - r.left) * canvas.width / r.width, py = (e.clientY - r.top) * canvas.height / r.height; return { x: (px - T.ox) / T.s, y: (py - T.oy) / T.s }; }
    const hit = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    function onDown(e) {
      const p = uiXY(e);
      if (mode === 'menu') { if (hit(p, 40, 330, 280, 56)) startShift(); else if (hit(p, 40, 400, 280, 50)) mode = 'shop'; return; }
      if (mode === 'over') { if (hit(p, 40, 400, 280, 56)) startShift(); else if (hit(p, 40, 470, 280, 50)) mode = 'shop'; return; }
      if (mode === 'shop') { if (hit(p, 100, 570, 160, 44)) { mode = 'menu'; return; } UPS.forEach((u, i) => { if (hit(p, 20, 150 + i * 96, 320, 86)) { const c = cost(u); if (lv(u.id) < u.max && save.money >= c) { save.money -= c; save.lv[u.id] = lv(u.id) + 1; persist(); blip(700, 0.2, 'triangle', 0.05, 1100); } else blip(160, 0.15, 'square', 0.04, 100); } }); return; }
      if (mode === 'play') { const r = canvas.getBoundingClientRect(); stick = { ox: (e.clientX - r.left) * canvas.width / r.width, oy: (e.clientY - r.top) * canvas.height / r.height, x: 0, y: 0 }; stick.x = stick.ox; stick.y = stick.oy; try { canvas.setPointerCapture(e.pointerId); } catch (er) { } }
    }
    function onMove(e) { if (!stick) return; const r = canvas.getBoundingClientRect(); stick.x = (e.clientX - r.left) * canvas.width / r.width; stick.y = (e.clientY - r.top) * canvas.height / r.height; const k = dpr, dx = stick.x - stick.ox, dy = stick.y - stick.oy, l = Math.hypot(dx, dy), m = 60 * k; if (l > m) { stick.ox = stick.x - dx / l * m; stick.oy = stick.y - dy / l * m; } }
    function onUp() { stick = null; }
    function onKey(e) {
      const d = e.type === 'keydown' ? 1 : 0, c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') keys.l = d; else if (c === 'ArrowRight' || c === 'KeyD') keys.r = d; else if (c === 'ArrowUp' || c === 'KeyW') keys.u = d; else if (c === 'ArrowDown' || c === 'KeyS') keys.d = d;
      if (d && (c === 'Enter' || c === 'Space') && !e.repeat) { if (mode === 'menu' || mode === 'over') startShift(); }
      if (/Arrow|Space/.test(c) && e.preventDefault && mode === 'play') e.preventDefault();
    }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);

    /* ---------- рисование ---------- */
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function txt(s, x, y, size, col, al) { ctx.font = '800 ' + size + 'px ' + FONT; ctx.textAlign = al || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
    function drawWorld() {
      ctx.fillStyle = '#4a7a4a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const sx = shake > 0 ? Math.sin(t * 90) * 4 * dpr : 0; ctx.save(); ctx.translate(canvas.width / 2 + sx, canvas.height / 2); ctx.scale(Z, Z); ctx.translate(-cam.x, -cam.y);
      const vw = canvas.width / Z / 2 + 60, vh = canvas.height / Z / 2 + 60, x0 = cam.x - vw, x1 = cam.x + vw, y0 = cam.y - vh, y1 = cam.y + vh;
      ctx.fillStyle = '#3a3e48'; ctx.fillRect(0, 0, WS, WS);
      ctx.fillStyle = '#5a9a58'; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const bx = i * C + RD, by = j * C + RD; if (bx > x1 || bx + BS < x0 || by > y1 || by + BS < y0) continue; ctx.fillRect(bx, by, BS, BS); }
      ctx.fillStyle = '#e8e0b0'; for (let k = 0; k <= N; k++) { const c = k * C + RD / 2; for (let p = 0; p < WS; p += 40) { if (p + 20 < x0 || p > x1) { } if (c > y0 - 4 && c < y1 + 4 && p + 20 > x0 && p < x1) ctx.fillRect(p, c - 1, 20, 2); if (c > x0 - 4 && c < x1 + 4 && p + 20 > y0 && p < y1) ctx.fillRect(c - 1, p, 2, 20); } }
      bld.forEach(b => {
        if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) return;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h); ctx.fillStyle = b.col; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(b.x, b.y, b.w, 8); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(b.x + b.w / 2 - 1, b.y, 2, b.h);
        if (b.cafe) { ctx.fillStyle = '#fff'; ctx.font = '800 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.name, b.x + 35, b.y + 28); ctx.fillText('КАФЕ', b.x + 35, b.y + 44); } else { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '800 14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.no), b.x + 35, b.y + 38); }
      });
      cars.forEach(c => { const b = carRect(c); if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) return; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(b.x + 2, b.y + 2, b.w, b.h); ctx.fillStyle = c.col; rr(b.x, b.y, b.w, b.h, 4); ctx.fill(); ctx.fillStyle = 'rgba(180,220,255,.8)'; if (c.h) ctx.fillRect(b.x + (c.dir > 0 ? 17 : 4), b.y + 2, 9, b.h - 4); else ctx.fillRect(b.x + 2, b.y + (c.dir > 0 ? 17 : 4), b.w - 4, 9); });
      if (order && mode === 'play') { const tg = order.got ? order.home : order.cafe, cc = cen(tg), pu = 1 + Math.sin(t * 5) * 0.08; ctx.strokeStyle = order.got ? '#3dff8a' : '#ffd24a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cc.x, cc.y, 54 * pu, 0, 7); ctx.stroke(); ctx.fillStyle = order.got ? 'rgba(61,255,138,.25)' : 'rgba(255,210,74,.25)'; ctx.fill(); }
      if (me) {
        ctx.save(); ctx.translate(me.x, me.y); ctx.rotate(me.a); if (!(me.inv > 0 && Math.floor(t * 16) % 2)) {
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2, 3, 15, 7, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#222'; rr(-12, -4, 26, 8, 4); ctx.fill(); ctx.fillStyle = '#ff8a1c'; rr(-16, -8, 12, 16, 3); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#3a7ad8'; ctx.beginPath(); ctx.arc(2, 0, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(4, 0, 4.5, 0, 7); ctx.fill(); if (order && order.got) { ctx.fillStyle = '#fff'; ctx.fillRect(-14, -3, 5, 6); }
        } ctx.restore();
      }
      parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; });
      floats.forEach(f => { ctx.globalAlpha = Math.min(1, f.t); ctx.font = '800 14px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = f.c; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText(f.s, f.x, f.y); ctx.fillText(f.s, f.x, f.y); ctx.globalAlpha = 1; });
      ctx.restore();
    }
    function hud() {
      const k = dpr, w = canvas.width, h = canvas.height; ctx.textBaseline = 'middle';
      const P = (s, x, y, size, col, al) => { ctx.font = '800 ' + size * k + 'px ' + FONT; ctx.textAlign = al || 'left'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(s, x + k, y + k); ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); };
      P(earned + ' ₽', 14 * k, 86 * k, 24, '#ffe06a'); P('Смена: ' + Math.ceil(shiftT) + ' с', w - 14 * k, 86 * k, 18, shiftT < 15 ? '#ff7a7a' : '#fff', 'right');
      if (order) {
        const tg = order.got ? order.home : order.cafe, msg = order.got ? 'Доставьте на ' + order.home.no + '-й дом' : 'Заберите заказ: ' + order.cafe.name; P(msg, w / 2, 118 * k, 16, order.got ? '#7aff9a' : '#ffd24a', 'center');
        const f = clamp(order.t / order.tMax, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(w / 2 - 80 * k, 132 * k, 160 * k, 8 * k); ctx.fillStyle = order.t < 0 ? '#ff5a5a' : f < 0.3 ? '#ffb04a' : '#5aff9a'; ctx.fillRect(w / 2 - 80 * k, 132 * k, 160 * k * f, 8 * k); P(order.t < 0 ? 'Опоздание!' : Math.ceil(order.t) + ' с', w / 2, 152 * k, 12, order.t < 0 ? '#ff7a7a' : '#fff', 'center');
        const cc = cen(tg), sxp = w / 2 + (cc.x - cam.x) * Z, syp = h / 2 + (cc.y - cam.y) * Z, marg = 40 * k;
        if (sxp < marg || sxp > w - marg || syp < 170 * k || syp > h - marg) { const ang = Math.atan2(cc.y - cam.y, cc.x - cam.x), ex = clamp(w / 2 + Math.cos(ang) * w, marg, w - marg), ey = clamp(h / 2 + Math.sin(ang) * h, 170 * k, h - marg); ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.fillStyle = order.got ? '#3dff8a' : '#ffd24a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(14 * k, 0); ctx.lineTo(-10 * k, -11 * k); ctx.lineTo(-4 * k, 0); ctx.lineTo(-10 * k, 11 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); P(Math.round(Math.hypot(cc.x - me.x, cc.y - me.y) / 10) + ' м', ex, ey + 22 * k, 11, '#fff', 'center'); }
      }
      // мини-карта
      const ms = 96 * k, mx = 10 * k, my = h - ms - 10 * k, s = ms / WS; ctx.fillStyle = 'rgba(10,14,22,.75)'; ctx.fillRect(mx, my, ms, ms); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = k; ctx.strokeRect(mx, my, ms, ms);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i <= N; i++) { ctx.fillRect(mx + i * C * s, my, RD * s, ms); ctx.fillRect(mx, my + i * C * s, ms, RD * s); }
      ctx.fillStyle = '#ff8a1c'; cafes.forEach(c => { ctx.fillRect(mx + cen(c).x * s - 1.5 * k, my + cen(c).y * s - 1.5 * k, 3 * k, 3 * k); });
      if (order) { const cc = cen(order.got ? order.home : order.cafe); ctx.fillStyle = order.got ? '#3dff8a' : '#ffd24a'; ctx.beginPath(); ctx.arc(mx + cc.x * s, my + cc.y * s, 4 * k, 0, 7); ctx.fill(); } ctx.fillStyle = '#4aa8ff'; ctx.beginPath(); ctx.arc(mx + me.x * s, my + me.y * s, 3.2 * k, 0, 7); ctx.fill();
      if (stick) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 40 * k, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(clamp(stick.x, stick.ox - 40 * k, stick.ox + 40 * k), clamp(stick.y, stick.oy - 40 * k, stick.oy + 40 * k), 16 * k, 0, 7); ctx.fill(); }
      if (toastT > 0) { ctx.globalAlpha = Math.min(1, toastT); P(toast, w / 2, h * 0.3, 17, '#fff', 'center'); ctx.globalAlpha = 1; }
    }
    function button(label, x, y, w, h, col) { ctx.fillStyle = col || '#ff8a1c'; rr(x, y, w, h, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.stroke(); txt(label, x + w / 2, y + h / 2, 20, '#fff', 'center'); }
    function menus() {
      const T = uiT(); ctx.setTransform(T.s, 0, 0, T.s, T.ox, T.oy);
      ctx.fillStyle = 'rgba(8,12,24,.78)'; ctx.fillRect(-1000, -1000, 3000, 3000);
      if (mode === 'menu') {
        txt('СИМУЛЯТОР', 180, 160, 22, '#ffd24a', 'center'); txt('КУРЬЕРА', 180, 205, 44, '#fff', 'center'); txt('Забирайте заказы в кафе и развозите по домам', 180, 250, 13, 'rgba(255,255,255,.7)', 'center'); txt('Не попадите под машины и успевайте вовремя', 180, 272, 13, 'rgba(255,255,255,.7)', 'center');
        txt('Деньги: ' + save.money + ' ₽ · рекорд смены: ' + save.best + ' ₽', 180, 306, 14, '#ffe06a', 'center'); button('НАЧАТЬ СМЕНУ', 40, 330, 280, 56); button('МАГАЗИН', 40, 400, 280, 50, 'rgba(255,255,255,.15)');
        txt('Управление: палец (тяните) или WASD / стрелки', 180, 500, 12, 'rgba(255,255,255,.55)', 'center');
      } else if (mode === 'over') {
        txt('Смена окончена', 180, 150, 32, '#fff', 'center'); txt('Заработано: ' + earned + ' ₽', 180, 215, 24, '#ffe06a', 'center'); txt('Доставлено: ' + orders + ' (с опозданием: ' + late + ')', 180, 255, 15, '#fff', 'center'); txt('Аварий: ' + crashes, 180, 280, 15, '#fff', 'center');
        txt(earned >= save.best && earned > 0 ? 'Новый рекорд!' : 'Рекорд: ' + save.best + ' ₽', 180, 318, 16, '#7aff9a', 'center'); txt('Всего денег: ' + save.money + ' ₽', 180, 350, 14, 'rgba(255,255,255,.75)', 'center'); button('ЕЩЁ СМЕНУ', 40, 400, 280, 56); button('МАГАЗИН', 40, 470, 280, 50, 'rgba(255,255,255,.15)');
      } else if (mode === 'shop') {
        txt('Магазин', 180, 60, 30, '#fff', 'center'); txt('Деньги: ' + save.money + ' ₽', 180, 104, 20, '#ffe06a', 'center');
        UPS.forEach((u, i) => { const y = 150 + i * 96, c = cost(u), maxed = lv(u.id) >= u.max, can = !maxed && save.money >= c; ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(20, y, 320, 86, 14); ctx.fill(); ctx.strokeStyle = can ? '#ffd24a' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke(); txt(u.n, 34, y + 24, 18, '#fff'); txt(u.d, 34, y + 48, 12, 'rgba(255,255,255,.65)'); for (let k = 0; k < u.max; k++) { ctx.fillStyle = k < lv(u.id) ? '#ffd24a' : 'rgba(255,255,255,.2)'; ctx.fillRect(34 + k * 22, y + 62, 18, 8); } txt(maxed ? 'МАКС' : c + ' ₽', 326, y + 43, 18, maxed ? '#7aff9a' : can ? '#ffd24a' : 'rgba(255,255,255,.45)', 'right'); });
        button('НАЗАД', 100, 570, 160, 44, 'rgba(255,255,255,.15)');
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0); Z = Math.min(canvas.width, canvas.height) / 400; if (Z < 0.3) Z = 0.3; if (me) { if (mode === 'play') { cam.x += (me.x - cam.x) * 0.15; cam.y += (me.y - cam.y) * 0.15; } } else { cam.x = WS / 2; cam.y = WS / 2; }
      drawWorld(); if (mode === 'play') hud(); else menus();
    }

    /* ---------- саундтрек ---------- */
    const song = new Audio('assets/courier-track.m4a'); song.preload = 'auto'; song.loop = true;
    let songOn = false;
    function musicTick() {
      if (!cfg.music || paused) { if (songOn) { song.pause(); songOn = false; } return; }
      song.volume = clamp(cfg.volume, 0, 1);
      if (!songOn || song.paused) { songOn = true; const pr = song.play(); if (pr && pr.catch) pr.catch(() => { songOn = false; }); }
    }
    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    function frame(ts) { if (!on) return; const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; if (!paused) update(dt); musicTick(); draw(); raf = requestAnimationFrame(frame); }
    function restart() { startShift(); }
    save = loadSave(); best = save.best; build(); me = null; resize(); raf = requestAnimationFrame(frame);
    return {
      restart, resize, setPaused(p) { paused = p; },
      destroy() { on = false; try { song.pause(); } catch (e) { } cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); },
      debug: { update, startShift, endShift, deliver, onDown, get mode() { return mode; }, get me() { return me; }, get order() { return order; }, get earned() { return earned; }, get save() { return save; }, get cars() { return cars; }, get cafes() { return cafes; }, get bld() { return bld; }, get shiftT() { return shiftT; }, set shiftT(v) { shiftT = v; }, set mode(v) { mode = v; }, cen, set dir(v) { keys.l = v[0] < 0 ? 1 : 0; keys.r = v[0] > 0 ? 1 : 0; keys.u = v[1] < 0 ? 1 : 0; keys.d = v[1] > 0 ? 1 : 0; } }
    };
  }
});
