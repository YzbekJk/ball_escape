const { Sim } = require('./sim.js');
const dt=1/120;
function stat(over){const ts=[];let n=40;
 for(let seed=1;seed<=n;seed++){const s=new Sim(Object.assign({seed},over));while(!s.escaped&&s.t<160)s.step(dt);if(s.escaped)ts.push(s.escapeT)}
 ts.sort((a,b)=>a-b);return `${ts.length}/${n} med ${ts.length?ts[ts.length>>1].toFixed(0):'-'} min ${ts.length?ts[0].toFixed(0):'-'} max ${ts.length?ts[ts.length-1].toFixed(0):'-'}`}
for(const layers of [10,16,24])for(const ballR of [0.012,0.018])for(const gap0 of [0.7,1.1])
 console.log('layers',layers,'ballR',ballR,'gap',gap0,stat({layers,ballR,gap0}));
