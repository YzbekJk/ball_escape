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
      const SC = [0, 2, 4, 5, 7, 9, 11], i = n % 15, semi = SC[i % 7] + 12 * Math.floor(i / 7);
      const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), o2 = actx.createOscillator();
      o.type = 'triangle'; o2.type = 'sine'; const f = 261.63 * Math.pow(2, semi / 12); o.frequency.value = f; o2.frequency.value = f * 2;
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.06 + 0.1 * (power || 0.5), now + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      o.connect(g); o2.connect(g); g.connect(actx.destination); o.start(now); o2.start(now); o.stop(now + 0.36); o2.stop(now + 0.36);
    }
  };
})();
