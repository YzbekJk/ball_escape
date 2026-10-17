/* Аккаунты (ник + пароль) и лидерборды поверх Supabase RPC (см. supabase/schema.sql). */
(function () {
  const CFG = window.SUPABASE_CFG || {}, enabled = !!(CFG.url && CFG.key);
  const LS = { token: 'lb_token', nick: 'lb_nick', pend: 'lb_pending' };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  let token = store.get(LS.token), nick = store.get(LS.nick);
  const listeners = [];

  async function rpc(fn, args) {
    if (!enabled) return { error: 'Лидерборд ещё не подключён к серверу' };
    try {
      const r = await fetch(CFG.url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', apikey: CFG.key }, CFG.key.startsWith('eyJ') ? { Authorization: 'Bearer ' + CFG.key } : {})   // new sb_publishable_ keys are not JWTs, body: JSON.stringify(args)
      });
      if (!r.ok) {
        let d = ''; try { const j = await r.json(); d = [j.code, j.message || j.hint].filter(Boolean).join(': '); } catch (e) {}
        return { error: 'Ошибка сервера (' + r.status + ')' + (d ? ' ' + d : '') };
      }
      return await r.json();
    } catch (e) { return { error: 'Нет связи с сервером' }; }
  }

  // ---------- DOM helpers ----------
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  let toastT = 0, toastEl = null;
  function toast(msg) {
    if (!toastEl) { toastEl = el('div', 'lbToast'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3800);
  }
  let modal = null;
  function closeModal() { if (modal) { modal.remove(); modal = null; } }
  function openModal(title) {
    closeModal();
    modal = el('div', 'lbModal'); const box = el('div', 'lbBox'), head = el('div', 'lbHead'), x = el('button', 'lbX', '✕');
    head.append(el('b', null, title), x); box.appendChild(head); modal.appendChild(box); document.body.appendChild(modal);
    x.onclick = closeModal; modal.addEventListener('pointerdown', e => { if (e.target === modal) closeModal(); });
    return box;
  }
  const notify = () => listeners.forEach(f => f());

  // ---------- account ----------
  function setSession(t, n) { token = t; nick = n; store.set(LS.token, t); store.set(LS.nick, n); notify(); flushPending(); }
  function logout() { token = nick = null; store.del(LS.token); store.del(LS.nick); notify(); }

  function openAccount() {
    if (!enabled) { const b = openModal('Аккаунт'); b.appendChild(el('p', 'lbMsg', 'Аккаунты и лидерборды ещё не подключены к серверу. Владельцу сайта нужно вписать ключи Supabase в supabase-config.js.')); return; }
    if (token) {
      const b = openModal('Аккаунт'); b.appendChild(el('p', 'lbMsg', 'Вы вошли как ' + nick));
      const out = el('button', 'lbBtn', 'Выйти'); out.onclick = () => { logout(); closeModal(); toast('Вы вышли из аккаунта'); }; b.appendChild(out); return;
    }
    const b = openModal('Вход в аккаунт'); let mode = 'login';
    const tabs = el('div', 'lbTabs'), tl = el('button', 'on', 'Вход'), tr = el('button', null, 'Регистрация'); tabs.append(tl, tr);
    const inN = el('input'); inN.placeholder = 'Ник'; inN.maxLength = 16; inN.autocomplete = 'username'; inN.autocapitalize = 'off';
    const inP = el('input'); inP.type = 'password'; inP.placeholder = 'Пароль'; inP.maxLength = 72; inP.autocomplete = 'current-password';
    const go = el('button', 'lbBtn', 'Войти'), err = el('p', 'lbErr');
    const setMode = m => { mode = m; tl.classList.toggle('on', m === 'login'); tr.classList.toggle('on', m === 'reg'); go.textContent = m === 'login' ? 'Войти' : 'Создать аккаунт'; inP.autocomplete = m === 'login' ? 'current-password' : 'new-password'; err.textContent = ''; };
    tl.onclick = () => setMode('login'); tr.onclick = () => setMode('reg');
    async function submit() {
      go.disabled = true; err.textContent = '';
      const res = await rpc(mode === 'login' ? 'lb_login' : 'lb_register', { p_nick: inN.value, p_pass: inP.value });
      go.disabled = false;
      if (res.error) { err.textContent = res.error; return; }
      setSession(res.token, res.nick); closeModal(); toast('Привет, ' + res.nick + '!');
    }
    go.onclick = submit; inP.onkeydown = inN.onkeydown = e => { if (e.key === 'Enter') submit(); e.stopPropagation(); }; inP.onkeyup = inN.onkeyup = e => e.stopPropagation();
    b.append(tabs, inN, inP, go, err, el('p', 'lbHint', 'Пароль хранится в зашифрованном виде. Не используйте пароль от важных аккаунтов.'));
    setTimeout(() => inN.focus(), 50);
  }

  // ---------- scores ----------
  async function sendScore(game, value) {
    const res = await rpc('lb_submit', { p_token: token, p_game: game, p_value: value });
    if (res.error) { toast('Результат не сохранён: ' + res.error); return res; }
    toast(res.improved ? '🏆 Новый личный рекорд сохранён!' : 'Результат отправлен (рекорд не побит)');
    return res;
  }
  function flushPending() {
    const p = store.get(LS.pend); if (!p || !token) return; store.del(LS.pend);
    try { const o = JSON.parse(p); sendScore(o.game, o.value); } catch (e) {}
  }
  async function submit(game, value, better) {
    if (!enabled) return;
    if (!token) {                                                    // keep the best unsent result until the player logs in
      let keep = { game, value };
      try { const o = JSON.parse(store.get(LS.pend) || 'null'); if (o && o.game === game && (better === 'low' ? o.value <= value : o.value >= value)) keep = o; } catch (e) {}
      store.set(LS.pend, JSON.stringify(keep)); toast('Войдите в аккаунт (кнопка 🏆 вверху), чтобы результат попал в таблицу'); return;
    }
    return sendScore(game, value);
  }

  async function openBoard(sim) {
    const lb = sim.lb || {}, b = openModal('🏆 ' + sim.title), fmt = lb.fmt || (v => String(v));
    b.appendChild(el('p', 'lbSub', lb.label || 'Лучшие результаты'));
    if (!enabled) { b.appendChild(el('p', 'lbMsg', 'Лидерборд ещё не подключён к серверу. Владельцу сайта нужно вписать ключи Supabase в supabase-config.js.')); return; }
    const list = el('div', 'lbList'); list.appendChild(el('p', 'lbMsg', 'Загрузка…')); b.appendChild(list);
    const res = await rpc('lb_top', { p_game: sim.id, p_limit: 20, p_token: token });
    if (!modal) return; list.textContent = '';
    if (res.error) { list.appendChild(el('p', 'lbErr', res.error)); return; }
    if (!res.rows.length) list.appendChild(el('p', 'lbMsg', 'Пока никого нет. Будьте первым!'));
    res.rows.forEach(r => {
      const row = el('div', 'lbRow' + (nick && r.nick.toLowerCase() === nick.toLowerCase() ? ' me' : ''));
      row.append(el('span', 'rk', r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank + '.'), el('span', 'nm', r.nick), el('span', 'sc', fmt(Number(r.best))));
      list.appendChild(row);
    });
    if (res.me && !res.rows.some(r => nick && r.nick.toLowerCase() === nick.toLowerCase())) b.appendChild(el('p', 'lbMe', 'Ваше место: ' + res.me.rank + ' — ' + fmt(Number(res.me.best))));
    if (!token) { const bt = el('button', 'lbBtn', 'Войти, чтобы попасть в таблицу'); bt.onclick = openAccount; b.appendChild(bt); }
  }

  window.LB = {
    enabled, openAccount, openBoard, submit, toast,
    get nick() { return nick; }, get loggedIn() { return !!token; },
    onChange(f) { listeners.push(f); }
  };
  if (token && enabled) rpc('lb_whoami', { p_token: token }).then(r => { if (r && r.error === 'bad token') logout(); });
})();
