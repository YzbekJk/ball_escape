const { Sim } = require('./sim.js');
const dt = 1/240, res = [];
const over = JSON.parse(process.argv[2] || '{}');
for (let seed = 1; seed <= 150; seed++) {
  const s = new Sim(Object.assign({ seed }, over));
  while (!s.escaped && s.t < 200) s.step(dt);
  res.push([seed, s.escaped ? +s.escapeT.toFixed(1) : null]);
}
const ts = res.map(r => r[1]).filter(x => x != null).sort((a, b) => a - b);
console.log('escaped', ts.length, '/150  min', ts[0], 'median', ts[ts.length >> 1], 'p90', ts[Math.floor(ts.length * .9)], 'max', ts[ts.length - 1]);
console.log('seeds with 74..79.5s:', res.filter(r => r[1] >= 74 && r[1] <= 79.5).map(r => r.join(':')).join(' '));
