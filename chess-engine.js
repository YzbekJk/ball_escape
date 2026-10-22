/* Мини-шахматы: правила (рокировка, взятие на проходе, превращение) и слабый ИИ (~1000 Эло по ощущениям, без измерения). */
(function () {
  const W = 'w', B = 'b';
  const colorOf = p => p ? (p === p.toUpperCase() ? W : B) : null;
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ST = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const sq = (r, c) => r * 8 + c;
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  function fromFEN(fen) {
    const f = fen.split(' '), b = Array(64).fill(null); let i = 0;
    for (const ch of f[0]) { if (ch === '/') continue; if (/\d/.test(ch)) i += +ch; else b[i++] = ch; }
    const ep = f[3] && f[3] !== '-' ? sq(8 - +f[3][1], f[3].charCodeAt(0) - 97) : -1;
    return { b, turn: f[1] === 'b' ? B : W, cast: { K: f[2].includes('K'), Q: f[2].includes('Q'), k: f[2].includes('k'), q: f[2].includes('q') }, ep, half: +(f[4] || 0), full: +(f[5] || 1) };
  }
  const start = () => fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  function attacked(b, s, by) {
    const r = s >> 3, c = s & 7, pawn = by === W ? 'P' : 'p', kn = by === W ? 'N' : 'n', kg = by === W ? 'K' : 'k', bi = by === W ? 'B' : 'b', ro = by === W ? 'R' : 'r', qu = by === W ? 'Q' : 'q';
    const pr = by === W ? r + 1 : r - 1;
    for (const dc of [-1, 1]) if (on(pr, c + dc) && b[sq(pr, c + dc)] === pawn) return true;
    for (const [dr, dc] of KN) if (on(r + dr, c + dc) && b[sq(r + dr, c + dc)] === kn) return true;
    for (const [dr, dc] of KG) if (on(r + dr, c + dc) && b[sq(r + dr, c + dc)] === kg) return true;
    for (const [dr, dc] of DG) { let rr = r + dr, cc = c + dc; while (on(rr, cc)) { const p = b[sq(rr, cc)]; if (p) { if (p === bi || p === qu) return true; break; } rr += dr; cc += dc; } }
    for (const [dr, dc] of ST) { let rr = r + dr, cc = c + dc; while (on(rr, cc)) { const p = b[sq(rr, cc)]; if (p) { if (p === ro || p === qu) return true; break; } rr += dr; cc += dc; } }
    return false;
  }
  const kingSq = (b, col) => b.indexOf(col === W ? 'K' : 'k');
  const inCheck = (pos, col) => { col = col || pos.turn; const k = kingSq(pos.b, col); return k >= 0 && attacked(pos.b, k, col === W ? B : W); };

  function pseudo(pos) {
    const b = pos.b, me = pos.turn, ms = [], opp = me === W ? B : W;
    const add = (f, t, x) => ms.push(Object.assign({ from: f, to: t }, x || {}));
    for (let s = 0; s < 64; s++) {
      const p = b[s]; if (!p || colorOf(p) !== me) continue; const r = s >> 3, c = s & 7, t = p.toLowerCase();
      if (t === 'p') {
        const dir = me === W ? -1 : 1, sr = me === W ? 6 : 1, pr = me === W ? 0 : 7, r1 = r + dir;
        if (on(r1, c) && !b[sq(r1, c)]) {
          if (r1 === pr) add(s, sq(r1, c), { promo: 'q' }); else { add(s, sq(r1, c)); if (r === sr && !b[sq(r + 2 * dir, c)]) add(s, sq(r + 2 * dir, c), { dbl: true }); }
        }
        for (const dc of [-1, 1]) {
          if (!on(r1, c + dc)) continue; const to = sq(r1, c + dc), q = b[to];
          if (q && colorOf(q) === opp) add(s, to, r1 === pr ? { promo: 'q', cap: true } : { cap: true });
          else if (to === pos.ep) add(s, to, { ep: true, cap: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of (t === 'n' ? KN : KG)) { const rr = r + dr, cc = c + dc; if (!on(rr, cc)) continue; const q = b[sq(rr, cc)]; if (!q || colorOf(q) === opp) add(s, sq(rr, cc), q ? { cap: true } : null); }
        if (t === 'k') {
          const hr = me === W ? 7 : 0;
          if (r === hr && c === 4 && !attacked(b, s, opp)) {
            if (pos.cast[me === W ? 'K' : 'k'] && !b[sq(hr, 5)] && !b[sq(hr, 6)] && b[sq(hr, 7)] === (me === W ? 'R' : 'r') && !attacked(b, sq(hr, 5), opp) && !attacked(b, sq(hr, 6), opp)) add(s, sq(hr, 6), { castle: 'k' });
            if (pos.cast[me === W ? 'Q' : 'q'] && !b[sq(hr, 3)] && !b[sq(hr, 2)] && !b[sq(hr, 1)] && b[sq(hr, 0)] === (me === W ? 'R' : 'r') && !attacked(b, sq(hr, 3), opp) && !attacked(b, sq(hr, 2), opp)) add(s, sq(hr, 2), { castle: 'q' });
          }
        }
      } else {
        const dirs = t === 'b' ? DG : t === 'r' ? ST : DG.concat(ST);
        for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (on(rr, cc)) { const q = b[sq(rr, cc)]; if (!q) add(s, sq(rr, cc)); else { if (colorOf(q) === opp) add(s, sq(rr, cc), { cap: true }); break; } rr += dr; cc += dc; } }
      }
    }
    return ms;
  }

  function make(pos, m) {
    const b = pos.b.slice(), me = pos.turn, p = b[m.from], cast = Object.assign({}, pos.cast); let ep = -1;
    const captured = b[m.to] || (m.ep ? b[sq(m.from >> 3, m.to & 7)] : null);
    b[m.from] = null; b[m.to] = m.promo ? (me === W ? m.promo.toUpperCase() : m.promo) : p;
    if (m.ep) b[sq(m.from >> 3, m.to & 7)] = null;
    if (m.dbl) ep = sq(((m.from >> 3) + (m.to >> 3)) / 2, m.from & 7);
    if (m.castle) { const hr = m.from >> 3; if (m.castle === 'k') { b[sq(hr, 5)] = b[sq(hr, 7)]; b[sq(hr, 7)] = null; } else { b[sq(hr, 3)] = b[sq(hr, 0)]; b[sq(hr, 0)] = null; } }
    if (p === 'K') { cast.K = cast.Q = false; } if (p === 'k') { cast.k = cast.q = false; }
    for (const s of [m.from, m.to]) { if (s === 63) cast.K = false; if (s === 56) cast.Q = false; if (s === 7) cast.k = false; if (s === 0) cast.q = false; }
    return { b, turn: me === W ? B : W, cast, ep, half: (p.toLowerCase() === 'p' || captured) ? 0 : pos.half + 1, full: pos.full + (me === B ? 1 : 0) };
  }
  function moves(pos) { const me = pos.turn; return pseudo(pos).filter(m => !inCheck(make(pos, m), me)); }
  function insufficient(b) { const l = b.filter(x => x && x.toLowerCase() !== 'k'); return l.length === 0 || (l.length === 1 && 'nb'.includes(l[0].toLowerCase())); }
  function status(pos) {
    const ms = moves(pos); if (!ms.length) return inCheck(pos) ? 'mate' : 'stalemate';
    if (pos.half >= 100 || insufficient(pos.b)) return 'draw'; return 'play';
  }

  /* оценка: материал + небольшая позиционная часть, с точки зрения белых */
  function evalW(b) {
    let v = 0;
    for (let s = 0; s < 64; s++) {
      const p = b[s]; if (!p) continue; const t = p.toLowerCase(), w = p === p.toUpperCase(), r = s >> 3, c = s & 7;
      let x = VAL[t]; const cen = 3.5 - Math.max(Math.abs(c - 3.5), Math.abs(r - 3.5)) * 0 - (Math.abs(c - 3.5) + Math.abs(r - 3.5)) / 2;
      if (t === 'n' || t === 'b') x += cen * 6; if (t === 'p') x += (w ? 6 - r : r - 1) * 4 + (c > 1 && c < 6 ? 2 : 0);
      v += w ? x : -x;
    }
    return v;
  }
  /* ИИ: всегда ставит мат в 1; в 18% ходов играет случайно; иначе смотрит на 2 полухода по материалу с шумом */
  function ai(pos, opts) {
    const o = Object.assign({ blunder: 0.18, noise: 22 }, opts || {}), ms = moves(pos); if (!ms.length) return null;
    const me = pos.turn, sign = me === W ? 1 : -1;
    for (const m of ms) { const n = make(pos, m); if (status(n) === 'mate') return m; }
    if (Math.random() < o.blunder) return ms[Math.floor(Math.random() * ms.length)];
    let best = null, bv = -1e9;
    for (const m of ms) {
      const n = make(pos, m), rep = moves(n); let v;
      if (!rep.length) v = inCheck(n) ? 1e6 : 0;
      else { v = 1e9; for (const r of rep) { const e = sign * evalW(make(n, r).b); if (e < v) v = e; } }
      v += (Math.random() - 0.5) * 2 * o.noise;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  function perft(pos, d) { if (d === 0) return 1; let n = 0; for (const m of moves(pos)) n += perft(make(pos, m), d - 1); return n; }
  window.ChessEngine = { start, fromFEN, moves, make, inCheck, status, ai, perft, colorOf };
})();
