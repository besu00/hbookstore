(() => {
  'use strict';
  const tg = window.Telegram?.WebApp;
  if (tg) { tg.ready(); tg.expand(); }

  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { tab: 'library', q: '', cat: 'all', page: 1, hasMore: false, books: [], cats: [], me: null };
  const app = $('#app');

  // ---------- API ----------
  async function api(path, opts = {}) {
    const headers = { Authorization: 'tma ' + (tg?.initData || ''), ...(opts.headers || {}) };
    if (opts.json) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
    const r = await fetch('/api' + path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || r.statusText);
    return data;
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2500);
  }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // ---------- theme ----------
  function setTheme(dark) { document.body.classList.toggle('dark', dark); localStorage.setItem('h_theme', dark ? 'dark' : 'light'); }
  const savedTheme = localStorage.getItem('h_theme');
  setTheme(savedTheme ? savedTheme === 'dark' : (tg?.colorScheme === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches));

  // ---------- views ----------
  const cardHTML = b => `
    <div class="card">
      <button class="fav ${b.is_fav ? 'on' : ''}" data-action="fav" data-id="${b.id}" aria-label="Favorite"><i class="fa-solid fa-heart"></i></button>
      <div>
        <img class="cover" src="${esc(b.cover_url || 'assets/books-hero.png')}" alt="${esc(b.title)}" loading="lazy">
        <span class="badge">${esc(b.category)}</span>
        <h3>${esc(b.title)}</h3><p>${esc(b.author)}</p>
      </div>
      <button class="btn" data-action="open" data-id="${b.id}">አንብብ / አውርድ</button>
    </div>`;

  function renderNav() {
    const items = [['library', 'fa-book-bookmark', 'Library'], ['favorites', 'fa-heart', 'Favorites'],
                   ['profile', 'fa-chart-simple', 'Profile'], ['support', 'fa-mug-hot', 'Support']];
    if (state.me?.isAdmin) items.push(['admin', 'fa-user-shield', 'Admin']);
    $('#nav').innerHTML = items.map(([id, ic, label]) =>
      `<button class="nav-item ${state.tab === id ? 'active' : ''}" data-tab="${id}"><i class="fa-solid ${ic}"></i><span>${label}</span></button>`).join('');
  }

  function showTab(tab) { state.tab = tab; renderNav(); window.scrollTo({ top: 0 }); ({ library: viewLibrary, favorites: viewFavorites, profile: viewProfile, support: viewSupport, admin: viewAdmin })[tab](); }

  // Library
  function viewLibrary() {
    app.innerHTML = `
      <section class="hero"><div class="hero-text"><h2>የመጻሕፍት ማህደር</h2>
        <p>ታሪክ፣ ልቦለድ፣ ቴክኖሎጂ እና ፍልስፍና — ሁሉም በአንድ ቦታ።</p><span class="hero-count" id="count"></span></div>
        <img class="hero-img" src="assets/books-hero.png" alt=""></section>
      <div class="search"><i class="fa-solid fa-search"></i><input id="q" type="search" placeholder="መጽሐፍ ወይም ደራሲ ፈልግ..." value="${esc(state.q)}"></div>
      <div class="tabs"><button class="tab ${state.cat === 'all' ? 'active' : ''}" data-cat="all">ሁሉም</button>
        ${state.cats.map(c => `<button class="tab ${String(state.cat) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</div>
      <div class="grid" id="grid"></div>
      <button class="btn alt" id="more" style="display:none">ተጨማሪ ጫን</button>`;
    $('#q').addEventListener('input', debounce(e => { state.q = e.target.value; loadBooks(true); }, 300));
    loadBooks(true);
  }

  async function loadBooks(reset) {
    if (reset) { state.page = 1; state.books = []; $('#grid').innerHTML = '<div class="msg">መጽሐፍት በመጫን ላይ...</div>'; }
    try {
      const p = new URLSearchParams({ q: state.q, category: state.cat, page: state.page });
      const d = await api('/books?' + p);
      state.books = state.books.concat(d.books); state.hasMore = d.hasMore;
      $('#grid').innerHTML = state.books.length ? state.books.map(cardHTML).join('') : '<div class="msg">ምንም መጻሕፍት አልተገኙም</div>';
      $('#more').style.display = d.hasMore ? 'block' : 'none';
      $('#count').textContent = state.books.length + (d.hasMore ? '+' : '') + ' መጻሕፍት';
    } catch (e) { $('#grid').innerHTML = `<div class="msg">${esc(e.message)}</div>`; }
  }

  // Favorites
  async function viewFavorites() {
    app.innerHTML = `<div class="title"><i class="fa-solid fa-heart" style="color:#ff4757"></i> የተወደዱ (Favorites)</div><div class="grid" id="fgrid"><div class="msg">...</div></div>`;
    try {
      const { books } = await api('/favorites');
      $('#fgrid').innerHTML = books.length ? books.map(cardHTML).join('') : '<div class="msg">ምንም የተወደዱ መጻሕፍት የሉም</div>';
    } catch (e) { $('#fgrid').innerHTML = `<div class="msg">${esc(e.message)}</div>`; }
  }

  // Profile
  async function viewProfile() {
    try { state.me = await api('/me'); } catch (e) { return toast(e.message); }
    const { stats, user } = state.me, dark = document.body.classList.contains('dark');
    app.innerHTML = `
      <div class="title"><i class="fa-solid fa-chart-pie"></i> ሁኔታ እና ማስተካከያ</div>
      <div class="stats">
        <div class="stat"><i class="fa-solid fa-book-open-reader"></i><b>${stats.opened}</b><small>የተከፈቱ መጻሕፍት</small></div>
        <div class="stat"><i class="fa-solid fa-heart"></i><b>${stats.favorites}</b><small>የተወደዱ መጻሕፍት</small></div></div>
      <div class="list">
        <div class="row"><span><i class="fa-solid fa-user"></i>ተጠቃሚ</span><strong>${esc(user.first_name)}${user.username ? ' (@' + esc(user.username) + ')' : ''}</strong></div>
        <div class="row"><span><i class="fa-solid fa-moon"></i>የጨለማ ጭብጥ</span>
          <label class="switch"><input type="checkbox" id="theme" ${dark ? 'checked' : ''}><span class="slider"></span></label></div>
        <div class="row"><span><i class="fa-solid fa-signal"></i>ሁኔታ</span>
          <b style="color:${navigator.onLine ? '#2ed573' : '#ff4757'}">${navigator.onLine ? 'Online' : 'Offline'}</b></div>
      </div>`;
    $('#theme').addEventListener('change', e => setTheme(e.target.checked));
  }

  // Support
  function viewSupport() {
    app.innerHTML = `<div class="title"><i class="fa-solid fa-hand-holding-heart"></i> ድጋፍ (Support)</div>
      <div class="list box"><h3>Support the Developer</h3>
        <p>ይህንን መድረክ ለማሳደግ እና ነፃ አገልግሎቶችን ለማስቀጠል ድጋፍዎ ጠቃሚ ነው። ለማንኛውም ጥያቄ ወይም አስተያየት ያግኙን።</p>
        <a class="btn" data-link="https://t.me/" href="https://t.me/" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> የቴሌግራም ቻናል ይቀላቀሉ</a>
        <a class="btn alt" data-link="#" href="#" target="_blank" rel="noopener"><i class="fa-solid fa-mug-hot"></i> Buy Me a Coffee</a></div>`;
  }

  // Admin
  async function viewAdmin() {
    app.innerHTML = `<div class="title"><i class="fa-solid fa-user-shield"></i> አድሚን ፓነል</div><div class="stats" id="astats"></div>
      <div class="list"><form class="admin" id="addForm">
        <label>ርዕስ</label><input name="title" required maxlength="255">
        <label>ደራሲ</label><input name="author" required maxlength="255">
        <label>ካቴጎሪ</label><select name="category_id" required>${state.cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <label>ማጠቃለያ</label><textarea name="description" rows="2"></textarea>
        <label>የሽፋን ምስል (JPG/PNG/WEBP)</label><input type="file" name="cover" accept="image/jpeg,image/png,image/webp">
        <label>PDF ፋይል (ወይም ከታች ሊንክ ይጠቀሙ)</label><input type="file" name="file" accept="application/pdf">
        <label>ወይም ውጫዊ ሊንክ</label><input type="url" name="external_url" placeholder="https://...">
        <button class="btn" type="submit">መጽሐፍ ጨምር</button></form></div>
      <div class="list" id="alist"></div>`;
    api('/admin/stats').then(s => $('#astats').innerHTML =
      `<div class="stat"><i class="fa-solid fa-users"></i><b>${s.users}</b><small>ተጠቃሚዎች</small></div><div class="stat"><i class="fa-solid fa-book"></i><b>${s.books}</b><small>መጻሕፍት · ${s.opens} ንባቦች</small></div>`).catch(() => {});
    refreshAdminList();
    $('#addForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('button'); btn.disabled = true;
      const fd = new FormData(f);
      for (const k of ['cover', 'file']) if (!fd.get(k)?.size) fd.delete(k);
      try { await api('/admin/books', { method: 'POST', body: fd }); toast('መጽሐፉ ተጨምሯል ✅'); f.reset(); refreshAdminList(); }
      catch (err) { toast(err.message); } finally { btn.disabled = false; }
    });
  }
  async function refreshAdminList() {
    const d = await api('/books?limit=50&q=&category=all');
    $('#alist').innerHTML = d.books.map(b => `<div class="admin-item"><span>${esc(b.title)}</span>
      <button class="btn danger" data-action="del" data-id="${b.id}">ሰርዝ</button></div>`).join('') || '<div class="msg">ባዶ</div>';
  }

  // ---------- events (CSP-safe delegation) ----------
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-tab],[data-cat],[data-action],#more,[data-link]'); if (!t) return;
    if (t.dataset.tab) return showTab(t.dataset.tab);
    if (t.dataset.link) { e.preventDefault(); if (t.dataset.link === '#') return; return tg ? tg.openTelegramLink?.(t.dataset.link) || tg.openLink(t.dataset.link) : window.open(t.dataset.link, '_blank'); }
    if (t.dataset.cat) { state.cat = t.dataset.cat; return viewLibrary(); }
    if (t.id === 'more') { state.page++; return loadBooks(false); }
    const id = t.dataset.id;
    try {
      if (t.dataset.action === 'fav') {
        const { is_fav } = await api('/favorites/' + id, { method: 'POST' });
        tg?.HapticFeedback?.impactOccurred('light');
        const b = state.books.find(x => String(x.id) === id); if (b) b.is_fav = is_fav;
        if (state.tab === 'favorites') viewFavorites(); else t.classList.toggle('on', is_fav);
      } else if (t.dataset.action === 'open') {
        const { url } = await api(`/books/${id}/open`, { method: 'POST' });
        tg ? tg.openLink(url) : window.open(url, '_blank');
      } else if (t.dataset.action === 'del') {
        if (!confirm('ይህን መጽሐፍ ይሰረዝ?')) return;
        await api('/admin/books/' + id, { method: 'DELETE' }); toast('ተሰርዟል'); refreshAdminList();
      }
    } catch (err) { toast(err.message); }
  });

  // ---------- boot ----------
  (async function init() {
    const u = tg?.initDataUnsafe?.user; if (u) $('#greeting').textContent = `እንኳን ደህና መጡ, ${u.first_name}! 📚`;
    try { [state.me, state.cats] = await Promise.all([api('/me'), api('/categories')]); showTab('library'); }
    catch (e) { app.innerHTML = `<div class="msg">መተግበሪያውን በቴሌግራም ውስጥ ይክፈቱ።<br><small>${esc(e.message)}</small></div>`; }
    setTimeout(() => { const s = $('#splash'); s.classList.add('hide'); setTimeout(() => s.remove(), 700); }, 1200);
  })();
})();
