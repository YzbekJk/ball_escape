/* MIDI-мелодии для симуляций с шариком: каждый удар играет следующую ноту мелодии (как в «залипательных» шортсах).
   Файл разбирается прямо в браузере (стандартный MIDI-файл, форматы 0 и 1); на сервер уходит только компактная мелодия, если вы сами решите ею поделиться. */
(function () {
  const KEY = 'midi_cur';
  const MAX_NOTES = 3000;
  function readVLQ(dv, o) { let v = 0, b; do { b = dv.getUint8(o.p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; }
  function str(dv, p, n) { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(dv.getUint8(p + i)); return s; }

  /** Разбирает MIDI → { name, n:[нота,...], d:[длительность до следующей ноты, в сотых долях секунды] } */
  function parse(buf, fallbackName) {
    const dv = new DataView(buf); if (dv.byteLength < 14 || str(dv, 0, 4) !== 'MThd') throw new Error('Это не MIDI-файл');
    const hl = dv.getUint32(4), ntrks = dv.getUint16(10), div = dv.getUint16(12);
    if (div & 0x8000) throw new Error('Такой формат времени (SMPTE) не поддерживается');
    let p = 8 + hl; const tempos = [[0, 500000]], tracks = [];
    for (let t = 0; t < ntrks && p + 8 <= dv.byteLength; t++) {
      if (str(dv, p, 4) !== 'MTrk') break;
      const len = dv.getUint32(p + 4), end = Math.min(dv.byteLength, p + 8 + len), o = { p: p + 8 };
      let tick = 0, run = 0, name = ''; const notes = [];
      while (o.p < end) {
        tick += readVLQ(dv, o); let st = dv.getUint8(o.p);
        if (st & 0x80) { o.p++; if (st < 0xf0) run = st; } else st = run;
        if (st === 0xff) { const type = dv.getUint8(o.p++), l = readVLQ(dv, o); if (type === 0x51 && l === 3) tempos.push([tick, (dv.getUint8(o.p) << 16) | (dv.getUint8(o.p + 1) << 8) | dv.getUint8(o.p + 2)]); else if (type === 3 && !name) name = str(dv, o.p, Math.min(l, 40)); o.p += l; }
        else if (st === 0xf0 || st === 0xf7) { const l = readVLQ(dv, o); o.p += l; }
        else { const hi = st & 0xf0, ch = st & 0x0f;
          if (hi === 0xc0 || hi === 0xd0) o.p += 1;
          else { const a = dv.getUint8(o.p++), b2 = dv.getUint8(o.p++); if (hi === 0x90 && b2 > 0 && ch !== 9) notes.push({ tick, note: a }); } }
      }
      tracks.push({ name, notes }); p = end;
    }
    tempos.sort((a, b) => a[0] - b[0]);
    const toSec = tk => { let s = 0, last = 0, us = 500000; for (const [tt, u] of tempos) { if (tt > tk) break; s += (tt - last) * us / div / 1e6; last = tt; us = u; } return s + (tk - last) * us / div / 1e6; };
    const cand = tracks.filter(x => x.notes.length >= 2); if (!cand.length) throw new Error('В файле нет нот');
    let best = null, bs = -1; cand.forEach(x => { const avg = x.notes.reduce((a, q) => a + q.note, 0) / x.notes.length, sc = x.notes.length * (0.5 + avg / 127); if (sc > bs) { bs = sc; best = x; } });
    const ev = best.notes.map(q => ({ t: toSec(q.tick), note: q.note })).sort((a, b) => a.t - b.t || b.note - a.note);
    const groups = []; ev.forEach(q => { const g = groups[groups.length - 1]; if (g && q.t - g.t < 0.035) { return; } groups.push({ t: q.t, note: q.note }); });   // аккорд → самая высокая нота
    const cut = groups.slice(0, MAX_NOTES), n = [], d = [];
    cut.forEach((g, i) => { n.push(g.note); const nx = cut[i + 1]; d.push(Math.round(Math.min(1.2, Math.max(0.08, nx ? nx.t - g.t : 0.5)) * 100)); });
    return { name: (best.name || fallbackName || 'Мелодия').replace(/\.(mid|midi)$/i, '').slice(0, 40), n, d };
  }

  const api = { cur: null, parse, listeners: [],
    set(m) { api.cur = m && m.n && m.n.length ? m : null; try { if (api.cur) localStorage.setItem(KEY, JSON.stringify(api.cur)); else localStorage.removeItem(KEY); } catch (e) { } api.listeners.forEach(f => f()); },
    clear() { api.set(null); } };
  try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && Array.isArray(j.n) && j.n.length && Array.isArray(j.d)) api.cur = j; } catch (e) { }
  window.Sims = window.Sims || {}; window.Sims.midi = api;
})();
