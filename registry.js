/* Registry of simulations. Each file in sims/ calls Sims.register({...}) — see README. */
window.Sims = (function () {
  const list = [];
  return {
    list,
    register(sim) { list.push(sim); },
    get(id) { return list.find(s => s.id === id); }
  };
})();
