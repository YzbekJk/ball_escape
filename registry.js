/* Registry of simulations. Each file in sims/ calls Sims.register({...}) — see README. */
window.Sims = (function () {
  const list = [];
  return {
    list,
    register(sim) { list.push(sim); },
    get(id) { return list.find(s => s.id === id); },
    // Нота по номеру удара: до ре ми фа соль ля си до ре ми … (две октавы вверх от до первой октавы, потом снова с «до»)
    note(actx, n, power) {
      if (!actx || actx.state !== 'running') return;
      const M = Sims.midi && Sims.midi.cur, now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), o2 = actx.createOscillator();
      let f, dur = 0.34;
      if (M) { const i = n % M.n.length; f = 440 * Math.pow(2, (M.n[i] - 69) / 12); dur = Math.min(0.9, Math.max(0.25, M.d[i] / 100 * 1.4)); }   // мелодия из MIDI-файла
      else { const SC = [0, 2, 4, 5, 7, 9, 11], i = n % 15, semi = SC[i % 7] + 12 * Math.floor(i / 7); f = 261.63 * Math.pow(2, semi / 12); }   // до ре ми фа соль ля си до ре ми …
      o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2;
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.06 + 0.1 * (power || 0.5), now + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g); o2.connect(g); g.connect(actx.destination); o.start(now); o2.start(now); o.stop(now + dur + 0.02); o2.stop(now + dur + 0.02);
    }
  };
})();
