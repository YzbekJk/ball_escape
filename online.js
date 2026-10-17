/* «Сейчас играет»: счётчик людей онлайн без своего сервера.
   Каждая вкладка раз в 15 с шлёт «я тут» в общий публичный канал ntfy.sh и слушает его же;
   онлайн = сколько разных id объявились за последние 40 секунд. Если сеть недоступна — плашка скрыта. */
(function () {
  const TOPIC = 'yzbekjk-ball-escape-online-v1', BASE = 'https://ntfy.sh/' + TOPIC;
  const pill = document.getElementById('online'); if (!pill) return;
  let connected = false;
  const id = Math.random().toString(36).slice(2, 10), seen = {};
  const val = pill.querySelector('b');
  function render() {
    if (!connected) return;
    const now = Date.now(); let n = 0;
    for (const k in seen) { if (now - seen[k] > 40000) delete seen[k]; else n++; }
    n = Math.max(1, n); val.textContent = n; pill.hidden = false;
  }
  function beat(bye) {
    const body = (bye ? 'bye:' : 'hi:') + id;
    try {
      if (bye && navigator.sendBeacon) navigator.sendBeacon(BASE, body);
      else fetch(BASE, { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  function listen() {
    let es; try { es = new EventSource(BASE + '/sse'); } catch (e) { return; }
    es.onmessage = ev => {
      try {
        const m = JSON.parse(ev.data); if (m.event && m.event !== 'message') return;
        connected = true; const s = String(m.message || ''), i = s.slice(s.indexOf(':') + 1);
        if (s.startsWith('hi:')) seen[i] = Date.now(); else if (s.startsWith('bye:')) delete seen[i];
        render();
      } catch (e) {}
    };
    es.onerror = () => {};
  }
  seen[id] = Date.now();
  listen(); beat();
  setInterval(() => { seen[id] = Date.now(); beat(); render(); }, 15000);
  addEventListener('pagehide', () => beat(true));
})();
