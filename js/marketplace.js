/* Aurix — marketplace: browse, publish and sell jewelry designs.
   Listings live in Supabase (see supabase/migrations/*_marketplace.sql). Until that table exists the page falls
   back to a browser-local demo so the tab still works. Featured designs are rendered from the CAD engine itself. */
const AurixMarketplace = (() => {
  const LOCAL_KEY = 'aurix.market.local', LIKES_KEY = 'aurix.market.likes';
  const PRODUCTS = { ring: 'Ring', pendant: 'Pendant', nameplate: 'Name plate' };

  const FEATURED = [
    { id: 'f1', title: 'Emerald Halo Solitaire', seller_name: 'Aurix Studio', price: 38, description: '2.5 ct emerald-cut centre stone with a hidden halo, cast-ready in platinum. A clean, architectural classic.',
      config: { product: 'ring', gemShape: 'emerald', carat: 2.5, metalType: 'platinum-950', halo: 'hidden', headStyle: '4-prong' } },
    { id: 'f2', title: 'Rose Gold Pavé Oval', seller_name: 'Marlowe & Co', price: 24, description: 'Delicate 1 ct oval with a half-way pavé shank in rose gold.',
      config: { product: 'ring', gemShape: 'oval', carat: 1, metalType: 'rose', accents: 'half', bandWidth: 2 } },
    { id: 'f3', title: 'Heart Locket Pendant', seller_name: 'Aurix Studio', price: 18, description: 'Heart pendant with a 1 ct round diamond and hidden halo in 14K rose gold.',
      config: { product: 'pendant', pendantShape: 'heart', carat: 1, metalType: 'rose', halo: 'hidden', pendantStone: true } },
    { id: 'f4', title: '“Maya” Pill Name Plate', seller_name: 'Noor Atelier', price: 12, description: 'Serif lettering on a pill-shaped plate with a jump ring at each end. Change the name in the studio.',
      config: { product: 'nameplate', plateText: 'Maya', plateFont: 'serif', plateStyle: 'pill', metalType: '14k-yellow' } },
    { id: 'f5', title: 'Bezel Cushion Sapphire', seller_name: 'Halden Jewels', price: 42, description: '3 ct cushion sapphire in a bezel, flat band, 18K white gold. Built for everyday wear.',
      config: { product: 'ring', gemShape: 'cushion', stoneType: 'sapphire', carat: 3, metalType: '18k-white', headStyle: 'bezel', profile: 'flat' } },
    { id: 'f6', title: 'Marquise Ruby Drop', seller_name: 'Marlowe & Co', price: 20, description: 'Marquise ruby pendant framed by a classic pavé halo.',
      config: { product: 'pendant', pendantShape: 'marquise', stoneType: 'ruby', carat: 1.2, metalType: '18k-yellow', halo: 'classic', pendantStone: true } },
    { id: 'f7', title: 'Block Initials Bracelet Plate', seller_name: 'Noor Atelier', price: 0, description: 'A free starter: bold block initials on a square sterling-silver plate.',
      config: { product: 'nameplate', plateText: 'AX', plateFont: 'block', plateStyle: 'square', metalType: 'silver-925' } },
    { id: 'f8', title: 'Pear Double-Claw', seller_name: 'Halden Jewels', price: 30, description: '1.8 ct pear centre stone held by double claws in 18K yellow gold.',
      config: { product: 'ring', gemShape: 'pear', carat: 1.8, metalType: '18k-yellow', headStyle: 'double-claw', profile: 'comfort' } }
  ].map((f) => ({ ...f, user_id: 'aurix', featured: true, likes: 0, created_at: '2026-10-01T00:00:00Z', thumbnail: null }));

  let ctx, mode = 'cloud', items = [], liked = new Set(), thumbs = {}, view = { q: '', cat: 'all', sort: 'new', mine: false }, current = null, publishThumb = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Number(n) === 0 ? 'Free' : '$' + (Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2));
  // thumbnails from other sellers are untrusted strings: only ever use our own JPEG data-URL shape
  const safeImg = (s) => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';
  const readLocal = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const writeLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const me = () => ctx.getUser();
  const isMine = (it) => !it.featured && ((me() && it.user_id === me().id) || it.user_id === 'local');
  const imgOf = (it) => safeImg(it.thumbnail) || thumbs[it.id] || '';

  /* ----- data ----- */
  async function load() {
    const notice = ctx.$('market-notice');
    try {
      const rows = await AurixCloud.listListings();
      mode = 'cloud';
      liked = new Set((me() ? await AurixCloud.myLikes().catch(() => []) : []).concat(readLocal(LIKES_KEY, [])));
      items = rows.concat(FEATURED);
      notice.hidden = true;
    } catch (e) {
      mode = 'local';
      liked = new Set(readLocal(LIKES_KEY, []));
      items = readLocal(LOCAL_KEY, []).concat(FEATURED);
      notice.hidden = false;
      notice.textContent = 'Demo mode: the marketplace database isn’t set up yet, so listings are saved in this browser only. Run supabase/migrations/20261031000000_marketplace.sql to make them public.';
    }
    render();
    renderFeaturedThumbs();
  }

  // Render featured designs with the real CAD engine, then put the user's design back exactly as it was.
  let rendering = false;
  async function renderFeaturedThumbs() {
    const studio = ctx.studio, todo = items.filter((i) => i.featured && !thumbs[i.id]);
    if (rendering || !todo.length) return;
    rendering = true;
    const prev = { ...studio.config }, prevOrbit = { ...studio.orbit }, prevBuild = studio.onBuild, prevAuto = studio.autoRotate;
    try {
      const fonts = [...new Set(todo.filter((i) => i.config.plateFont).map((i) => i.config.plateFont))];
      fonts.forEach((f) => studio.getFont(f));
      for (let t = 0; t < 40 && fonts.some((f) => !(CADStudio._fonts[f] && (CADStudio._fonts[f].font || CADStudio._fonts[f].failed))); t++) await new Promise((r) => setTimeout(r, 100));
      studio.onBuild = null;
      for (const it of todo) {
        studio.config = { ...CADStudio.DEFAULTS, ...it.config }; studio._reframe = true; studio._pending = false;
        studio.rebuild();
        thumbs[it.id] = studio.captureThumbnail();
        const img = document.querySelector('[data-thumb="' + it.id + '"]');
        if (img) { img.src = thumbs[it.id]; img.closest('.m-img').classList.remove('loading'); }
        await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      studio.config = prev; studio._reframe = true; studio._pending = false; studio.rebuild();
      studio.orbit = prevOrbit; studio.autoRotate = prevAuto; studio.onBuild = prevBuild; studio.onBuild && studio.onBuild(studio.metrics);
      rendering = false;
    }
  }

  /* ----- browse ----- */
  function visible() {
    const q = view.q.trim().toLowerCase();
    let list = items.filter((it) => (view.cat === 'all' || it.product === view.cat || it.config.product === view.cat) &&
      (!view.mine || isMine(it)) && (!q || (it.title + ' ' + it.seller_name + ' ' + (it.description || '')).toLowerCase().includes(q)));
    const by = { new: (a, b) => (b.created_at > a.created_at ? 1 : -1), popular: (a, b) => b.likes - a.likes, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price };
    return list.sort(by[view.sort]);
  }
  const likeCount = (it) => it.likes + ((it.featured || mode === 'local') && liked.has(it.id) ? 1 : 0);

  function render() {
    const { $ } = ctx, list = visible(), grid = $('market-grid');
    $('market-count').textContent = items.length.toLocaleString() + ' jewelry designs from independent makers';
    document.querySelectorAll('#market-cats .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === view.cat));
    $('market-mine').setAttribute('aria-pressed', view.mine);
    grid.innerHTML = list.length ? '' : '<p class="m-empty">' + (view.mine ? 'You haven’t published anything yet. Design something in the studio, then choose “Publish a design”.' : 'No designs match your search.') + '</p>';
    list.forEach((it) => {
      const src = imgOf(it), c = document.createElement('article');
      c.className = 'm-card';
      c.innerHTML = '<button class="m-img' + (src || !it.featured ? '' : ' loading') + '" type="button" aria-label="Open ' + esc(it.title) + '"><img data-thumb="' + esc(it.id) + '" alt="' + esc(it.title) + '"' + (src ? ' src="' + src + '"' : '') + '>' +
        '<span class="m-over"><b>' + esc(it.title) + '</b><i>' + esc(PRODUCTS[it.config.product] || '') + '</i></span></button>' +
        '<div class="m-foot"><span class="m-av" aria-hidden="true">' + esc((it.seller_name || '?').charAt(0).toUpperCase()) + '</span>' +
        '<span class="m-who">' + esc(it.seller_name) + (it.featured ? '<em>Featured</em>' : '') + '</span>' +
        '<span class="m-price">' + money(it.price) + '</span>' +
        '<button class="m-like" type="button" aria-pressed="' + liked.has(it.id) + '" aria-label="Like"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.4 5c2 0 3.6 1.1 5.6 3.2C14 6.1 15.6 5 17.6 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z"/></svg><span>' + likeCount(it) + '</span></button></div>';
      c.querySelector('.m-img').addEventListener('click', () => openListing(it));
      c.querySelector('.m-like').addEventListener('click', (e) => toggleLike(it, e.currentTarget));
      grid.appendChild(c);
    });
  }

  async function toggleLike(it, btn) {
    const on = !liked.has(it.id);
    if (it.featured || mode === 'local') {
      on ? liked.add(it.id) : liked.delete(it.id); writeLocal(LIKES_KEY, [...liked]);
    } else {
      if (!me()) { ctx.toast('Sign in to like designs'); ctx.openAuth(); return; }
      try { await AurixCloud.setLike(it.id, on); } catch (err) { ctx.toast('Couldn’t update like: ' + err.message); return; }
      on ? liked.add(it.id) : liked.delete(it.id); it.likes += on ? 1 : -1;
    }
    btn.setAttribute('aria-pressed', on); btn.querySelector('span').textContent = it.featured || mode === 'local' ? (it.likes + (on ? 1 : 0)) : it.likes;
    if (current === it) ctx.$('l-like').setAttribute('aria-pressed', on);
  }

  /* ----- listing detail ----- */
  function describe(cfg) {
    const c = { ...CADStudio.DEFAULTS, ...cfg }, rows = [['Type', PRODUCTS[c.product]], ['Metal', PricingEngine.ALLOYS[c.metalType].label]];
    const stone = c.product === 'nameplate' || (c.product === 'pendant' && !c.pendantStone) ? null : c.carat.toFixed(2) + ' ct ' + GemstoneLibrary.TYPES[c.stoneType].label + ' · ' + GemstoneLibrary.SHAPES[c.gemShape].label;
    if (stone) rows.push(['Centre stone', stone]);
    if (c.product === 'nameplate') rows.push(['Lettering', '“' + c.plateText + '”']);
    if (c.product === 'ring') rows.push(['Setting', c.headStyle + (c.halo !== 'none' ? ' · ' + c.halo + ' halo' : '')]);
    return rows;
  }
  function openListing(it) {
    const { $ } = ctx; current = it;
    $('l-img').src = imgOf(it); $('l-img').alt = it.title;
    $('l-title').textContent = it.title; $('l-seller').textContent = 'by ' + it.seller_name;
    $('l-desc').textContent = it.description || 'No description.';
    $('l-specs').innerHTML = describe(it.config).map(([k, v]) => '<tr><td>' + esc(k) + '</td><td>' + esc(v) + '</td></tr>').join('');
    $('l-price').textContent = money(it.price);
    $('l-buy').textContent = it.price === 0 ? 'Get it free' : 'Buy design';
    $('l-open').hidden = !(it.price === 0 || isMine(it));
    $('l-del').hidden = !isMine(it);
    $('l-like').setAttribute('aria-pressed', liked.has(it.id));
    $('listing-modal').classList.add('open');
  }
  const closeListing = () => { ctx.$('listing-modal').classList.remove('open'); current = null; };

  /* ----- publish ----- */
  function openPublish() {
    const { $, studio } = ctx;
    if (mode === 'cloud' && !me()) { ctx.toast('Sign in to publish a design'); ctx.openAuth(); return; }
    if (studio._pending) { studio._pending = false; studio.rebuild(); }
    const c = studio.config;
    publishThumb = studio.captureThumbnail();
    $('p-thumb').src = publishThumb;
    const base = c.product === 'nameplate' ? ((c.plateText || 'Name') + ' name plate') : c.product === 'pendant' ? (GemstoneLibrary.SHAPES[c.pendantShape].label + ' pendant') : (GemstoneLibrary.SHAPES[c.gemShape].label + ' ' + c.carat + ' ct ring');
    $('pub-title').value = base; $('pub-desc').value = ''; $('pub-price').value = Math.round(PricingEngine.calculateCostBreakdown(c, studio.metrics).retail * 0.02) || 15;
    $('pub-err').textContent = '';
    $('pub-seller').value = me() ? me().email.split('@')[0].slice(0, 40) : 'You';
    $('publish-modal').classList.add('open'); $('pub-title').focus();
  }
  async function submitPublish(e) {
    e.preventDefault();
    const { $, studio } = ctx, err = $('pub-err');
    const title = $('pub-title').value.trim(), seller = $('pub-seller').value.trim(), price = parseFloat($('pub-price').value);
    if (!title || !seller) { err.textContent = 'Add a title and a seller name.'; return; }
    if (!(price >= 0 && price <= 100000)) { err.textContent = 'Price must be between $0 and $100,000.'; return; }
    const row = { seller_name: seller, title, description: $('pub-desc').value.trim().slice(0, 600), product: studio.config.product, price: Math.round(price * 100) / 100, config: { ...studio.config }, thumbnail: publishThumb };
    const btn = $('pub-submit'); btn.disabled = true;
    try {
      if (mode === 'cloud') await AurixCloud.publishListing(row);
      else {
        const mine = readLocal(LOCAL_KEY, []);
        mine.unshift({ ...row, id: 'l' + Date.now(), user_id: 'local', likes: 0, created_at: new Date().toISOString() });
        if (!writeLocal(LOCAL_KEY, mine)) throw new Error('browser storage is full');
      }
      $('publish-modal').classList.remove('open'); ctx.toast('Published to the marketplace');
      view.mine = false; view.cat = 'all'; view.sort = 'new'; ctx.$('market-sort').value = 'new';
      show('market'); await load();
    } catch (ex) { err.textContent = 'Couldn’t publish: ' + ex.message; }
    btn.disabled = false;
  }
  async function removeListing(it) {
    if (!confirm('Remove “' + it.title + '” from the marketplace?')) return;
    try {
      if (mode === 'cloud') await AurixCloud.deleteListing(it.id);
      else writeLocal(LOCAL_KEY, readLocal(LOCAL_KEY, []).filter((x) => x.id !== it.id));
      closeListing(); ctx.toast('Listing removed'); await load();
    } catch (ex) { ctx.toast('Couldn’t remove: ' + ex.message); }
  }

  /* ----- tabs ----- */
  // push = add a browser-history entry, so the Back button returns to the marketplace
  function show(v, push = true) {
    document.body.dataset.view = v;
    if (v === 'market') document.body.classList.remove('from-market');
    ctx.$('tab-studio').setAttribute('aria-selected', v === 'studio'); ctx.$('tab-market').setAttribute('aria-selected', v === 'market');
    if (v === 'market') { if (!items.length) load(); else render(); }
    else setTimeout(() => ctx.studio.resize(), 50);
    const url = v === 'market' ? '#marketplace' : location.pathname + location.search;
    if (push && (location.hash === '#marketplace') !== (v === 'market')) history.pushState(null, '', url);
  }

  function init(c) {
    ctx = c; const { $ } = ctx;
    [['market-cats', [['all', 'All'], ['ring', 'Rings'], ['pendant', 'Pendants'], ['nameplate', 'Name plates']]]].forEach(([id, defs]) => defs.forEach(([val, label]) => {
      const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.dataset.val = val; b.textContent = label;
      b.addEventListener('click', () => { view.cat = val; render(); }); $(id).appendChild(b);
    }));
    $('tab-studio').addEventListener('click', () => show('studio'));
    $('tab-market').addEventListener('click', () => show('market'));
    $('market-q').addEventListener('input', (e) => { view.q = e.target.value; render(); });
    $('market-sort').addEventListener('change', (e) => { view.sort = e.target.value; render(); });
    $('market-mine').addEventListener('click', () => { view.mine = !view.mine; render(); });
    $('market-publish').addEventListener('click', openPublish);
    $('btn-sell').addEventListener('click', openPublish);
    $('publish-form').addEventListener('submit', submitPublish);
    $('pub-cancel').addEventListener('click', () => $('publish-modal').classList.remove('open'));
    $('btn-back-market').addEventListener('click', () => show('market'));
    window.addEventListener('popstate', () => show(location.hash === '#marketplace' ? 'market' : 'studio', false));
    $('listing-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeListing(); });
    $('publish-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });
    $('l-x').addEventListener('click', closeListing);
    $('pub-x').addEventListener('click', () => $('publish-modal').classList.remove('open'));
    $('l-close').addEventListener('click', closeListing);
    $('l-like').addEventListener('click', () => { const card = [...document.querySelectorAll('.m-card')].find((el) => el.querySelector('[data-thumb="' + current.id + '"]')); if (card) toggleLike(current, card.querySelector('.m-like')); });
    $('l-buy').addEventListener('click', () => ctx.toast(current.price === 0 ? 'Free designs open straight in the studio' : 'Checkout isn’t connected yet — payments are coming soon'));
    $('l-open').addEventListener('click', () => { const cfg = { ...CADStudio.DEFAULTS, ...current.config }; closeListing(); show('studio'); document.body.classList.add('from-market'); ctx.applyConfig(cfg); ctx.toast('Opened in the studio'); });
    $('l-del').addEventListener('click', () => removeListing(current));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeListing(); $('publish-modal').classList.remove('open'); } });
    AurixCloud.onAuth(() => { if (items.length && document.body.dataset.view === 'market') load(); });
    show(location.hash === '#marketplace' ? 'market' : 'studio', false);
  }

  return { init };
})();
