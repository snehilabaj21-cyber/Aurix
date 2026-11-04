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
    { id: 'f6', title: 'Marquise Ruby Drop', seller_name: 'Marlowe & Co', price: 20, description: 'Marquise ruby pendant framed by a classic pavé halo.',
      config: { product: 'pendant', pendantShape: 'marquise', stoneType: 'ruby', carat: 1.2, metalType: '18k-yellow', halo: 'classic', pendantStone: true } },
    { id: 'f7', title: 'Block Initials Bracelet Plate', seller_name: 'Noor Atelier', price: 8, description: 'A starter piece: bold block initials on a square sterling-silver plate.',
      config: { product: 'nameplate', plateText: 'AX', plateFont: 'block', plateStyle: 'square', metalType: 'silver-925' } },
    { id: 'f8', title: 'Pear Double-Claw', seller_name: 'Halden Jewels', price: 30, description: '1.8 ct pear centre stone held by double claws in 18K yellow gold.',
      config: { product: 'ring', gemShape: 'pear', carat: 1.8, metalType: '18k-yellow', headStyle: 'double-claw', profile: 'comfort' } }
  ].map((f) => ({ ...f, user_id: 'aurix', featured: true, likes: 0, created_at: '2026-10-01T00:00:00Z', thumbnail: null }));

  let ctx, mode = 'cloud', items = [], liked = new Set(), thumbs = {}, view = { q: '', cat: 'all', sort: 'new', mine: false, seller: null }, current = null, publishThumb = null, reviews = [], sellerProfile = null;

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
  // The featured designs show at once; real listings replace them when they arrive. A request that never answers
  // is given up on after 15s, so the page can't sit empty.
  let loaded = false, loading = null;
  const within = (p, ms = 15000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timed out')), ms))]);
  function load() {
    if (loading) return loading;
    loading = (async () => {
      const notice = ctx.$('market-notice');
      reviews = [];
      if (!items.length) { items = FEATURED.slice(); render(); renderFeaturedThumbs(); }
      try {
        const rows = await within(AurixCloud.listListings());
        mode = 'cloud';
        liked = new Set((me() ? await within(AurixCloud.myLikes()).catch(() => []) : []).concat(readLocal(LIKES_KEY, [])));
        items = rows.concat(FEATURED);
        reviews = await within(AurixCloud.listReviews()).catch(() => []);
        notice.hidden = true; loaded = true;
      } catch (e) {
        console.error('marketplace load failed', e);
        // 42P01 / PGRST205 = the listings table doesn't exist; anything else (network, outage) must not switch to the browser-only demo
        if (e && (e.code === '42P01' || e.code === 'PGRST205')) {
          mode = 'local'; loaded = true;
          liked = new Set(readLocal(LIKES_KEY, []));
          items = readLocal(LOCAL_KEY, []).concat(FEATURED);
          notice.textContent = 'Demo mode: the marketplace database isn’t set up yet, so listings are saved in this browser only. Run supabase/migrations/20261031000000_marketplace.sql to make them public.';
        } else {
          mode = 'cloud'; loaded = false; // not loaded: opening the tab again retries
          liked = new Set(readLocal(LIKES_KEY, []));
          items = FEATURED.slice();
          notice.textContent = 'Couldn’t reach the marketplace right now, so only featured designs are shown. Check your connection and reopen this tab.';
        }
        notice.hidden = false;
      }
      render();
      renderFeaturedThumbs();
    })().finally(() => { loading = null; });
    return loading;
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
      (!view.mine || isMine(it)) && (!view.seller || it.user_id === view.seller) && (!q || (it.title + ' ' + it.seller_name + ' ' + (it.description || '')).toLowerCase().includes(q)));
    const by = { new: (a, b) => (b.created_at > a.created_at ? 1 : -1), popular: (a, b) => b.likes - a.likes, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price };
    return list.sort(by[view.sort]);
  }
  const likeCount = (it) => it.likes + ((it.featured || mode === 'local') && liked.has(it.id) ? 1 : 0);

  function render() {
    const { $ } = ctx, list = visible(), grid = $('market-grid');
    renderProfile();
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
        rateHtml(it.id) + '<span class="m-price">' + money(it.price) + '</span>' +
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

  /* ----- ratings and reviews (only buyers can post: enforced by the database) ----- */
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const reviewsOf = (ref) => reviews.filter((r) => r.listing_ref === ref);
  const ratingOf = (ref) => { const l = reviewsOf(ref); return { n: l.length, avg: l.length ? l.reduce((a, r) => a + r.rating, 0) / l.length : 0 }; };
  const rateHtml = (ref) => { const r = ratingOf(ref); return r.n ? '<span class="m-rate" title="' + r.avg.toFixed(1) + ' out of 5">★ ' + r.avg.toFixed(1) + ' <i>(' + r.n + ')</i></span>' : ''; };

  function renderReviews(it) {
    const box = ctx.$('l-reviews');
    if (mode !== 'cloud') { box.innerHTML = ''; return; }
    const list = reviewsOf(it.id), r = ratingOf(it.id), user = me(), mine = user && list.find((x) => x.user_id === user.id);
    let html = '<h4>Reviews</h4>' + (r.n ? '<div class="rv-sum"><b class="rv-stars">' + stars(Math.round(r.avg)) + '</b> ' + r.avg.toFixed(1) + ' · ' + r.n + (r.n === 1 ? ' review' : ' reviews') + '</div>' : '<p class="shop-muted">No reviews yet.</p>');
    html += list.slice(0, 5).map((x) => '<div class="rv"><div><b class="rv-stars">' + stars(x.rating) + '</b> <span class="shop-muted">' + esc(x.author) + ' · ' + new Date(x.created_at).toLocaleDateString() + '</span>' +
      (user && x.user_id === user.id ? ' <button class="linklike" type="button" data-act="rv-del" data-id="' + esc(x.id) + '">Delete</button>' : '') + '</div>' + (x.comment ? '<p>' + esc(x.comment) + '</p>' : '') + '</div>').join('');
    if (!isMine(it) && !mine) {
      html += user && AurixShop.owns(it.id)
        ? '<div class="rv-form"><label for="rv-rating">Your rating</label><select id="rv-rating"><option value="5">★★★★★ Excellent</option><option value="4">★★★★ Good</option><option value="3">★★★ Okay</option><option value="2">★★ Poor</option><option value="1">★ Bad</option></select>' +
          '<textarea id="rv-text" maxlength="500" placeholder="How was the design?"></textarea><div class="auth-err" id="rv-err" role="alert"></div><button class="btn primary" type="button" data-act="rv-add">Post review</button></div>'
        : '<p class="shop-muted">Order this design to leave a review.</p>';
    }
    box.innerHTML = html;
  }
  async function reloadReviews() { reviews = await AurixCloud.listReviews().catch(() => reviews); if (current) renderReviews(current); render(); }
  async function reviewClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !current) return;
    if (b.dataset.act === 'rv-add') {
      const err = ctx.$('rv-err'), user = me(); err.textContent = ''; b.disabled = true;
      try {
        await AurixCloud.addReview({ listing_ref: current.id, author: (user.email || 'buyer').split('@')[0].slice(0, 40), rating: +ctx.$('rv-rating').value, comment: ctx.$('rv-text').value.trim().slice(0, 500) });
        ctx.toast('Review posted'); await reloadReviews();
      } catch (ex) { err.textContent = ex.code === '42501' ? 'Only people who ordered this design can review it.' : 'Couldn’t post: ' + ex.message; b.disabled = false; }
    } else if (b.dataset.act === 'rv-del') {
      try { await AurixCloud.deleteReview(b.dataset.id); ctx.toast('Review deleted'); await reloadReviews(); } catch (ex) { ctx.toast('Couldn’t delete: ' + ex.message); }
    }
  }

  /* ----- public seller page: the marketplace filtered to one seller ----- */
  function loadSellerProfile() {
    sellerProfile = null; const id = view.seller;
    if (!ctx || !id) return;
    AurixCloud.getProfile(id).then((p) => { if (view.seller === id) { sellerProfile = p; render(); } }).catch(() => {});
  }
  function renderProfile() {
    const box = ctx.$('market-profile'), hero = ctx.$('market-hero');
    box.hidden = !view.seller; hero.hidden = !!view.seller;
    if (!view.seller) return;
    const theirs = items.filter((i) => i.user_id === view.seller), name = (sellerProfile && sellerProfile.display_name) || (theirs[0] && theirs[0].seller_name) || 'Seller';
    box.innerHTML = '<button class="btn" type="button" data-act="all">← All designs</button><div class="m-av m-av-lg" aria-hidden="true">' + esc(name.charAt(0).toUpperCase()) + '</div><h2>' + esc(name) + '</h2>' +
      (sellerProfile && sellerProfile.bio ? '<p>' + esc(sellerProfile.bio) + '</p>' : '') + '<p class="m-sub">' + theirs.length + (theirs.length === 1 ? ' design' : ' designs') + ' for sale</p>';
  }
  function openSeller(id) { view.seller = id; view.mine = false; loadSellerProfile(); show('market'); }

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
    $('l-title').textContent = it.title;
    $('l-seller').innerHTML = 'by ' + (it.featured || !it.user_id || it.user_id === 'local' ? esc(it.seller_name) : '<button class="linklike" type="button" data-seller="' + esc(it.user_id) + '">' + esc(it.seller_name) + '</button>');
    renderReviews(it);
    $('l-desc').textContent = it.description || 'No description.';
    $('l-specs').innerHTML = describe(it.config).map(([k, v]) => '<tr><td>' + esc(k) + '</td><td>' + esc(v) + '</td></tr>').join('');
    $('l-price').textContent = money(it.price);
    const owned = AurixShop.owns(it.id);
    $('l-buy').hidden = isMine(it) || owned;
    $('l-buy').textContent = 'Add to cart';
    $('l-open').hidden = !(isMine(it) || owned);
    $('l-del').hidden = !isMine(it);
    $('l-like').setAttribute('aria-pressed', liked.has(it.id));
    $('listing-modal').classList.add('open');
  }
  const closeListing = () => { ctx.$('listing-modal').classList.remove('open'); current = null; };
  function openConfig(config) {
    const cfg = { ...CADStudio.DEFAULTS, ...config };
    closeListing(); show('studio'); document.body.classList.add('from-market'); ctx.applyConfig(cfg); ctx.toast('Opened in the studio');
  }
  const getItem = (ref) => { const it = items.find((i) => i.id === ref); return it ? { ...it, thumbnail: imgOf(it) } : null; };
  const ensureLoaded = () => loaded ? Promise.resolve() : load();

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
    $('pub-draft').hidden = mode !== 'cloud';
    $('pub-seller').value = me() ? me().email.split('@')[0].slice(0, 40) : 'You';
    $('publish-modal').classList.add('open'); $('pub-title').focus();
  }
  async function submitPublish(e) {
    e.preventDefault();
    const { $, studio } = ctx, err = $('pub-err');
    const title = $('pub-title').value.trim(), seller = $('pub-seller').value.trim(), price = parseFloat($('pub-price').value);
    if (!title || !seller) { err.textContent = 'Add a title and a seller name.'; return; }
    if (!(price >= 1 && price <= 100000)) { err.textContent = 'Price must be between $1 and $100,000.'; return; }
    const draft = mode === 'cloud' && e.submitter && e.submitter.id === 'pub-draft';
    const row = { seller_name: seller, title, status: draft ? 'draft' : 'published', description: $('pub-desc').value.trim().slice(0, 600), product: studio.config.product, price: Math.round(price * 100) / 100, config: { ...studio.config }, thumbnail: publishThumb };
    const btns = [$('pub-submit'), $('pub-draft')]; btns.forEach((b) => { b.disabled = true; });
    try {
      if (mode === 'cloud') await within(AurixCloud.publishListing(row), 20000);
      else {
        delete row.status;
        const mine = readLocal(LOCAL_KEY, []);
        mine.unshift({ ...row, id: 'l' + Date.now(), user_id: 'local', likes: 0, created_at: new Date().toISOString() });
        if (!writeLocal(LOCAL_KEY, mine)) throw new Error('browser storage is full');
      }
      $('publish-modal').classList.remove('open');
      if (draft) { ctx.toast('Saved as a draft. Publish it from your Sell tab.'); document.dispatchEvent(new CustomEvent('aurix:listings-changed')); show('sell'); return; }
      ctx.toast('Published to the marketplace');
      view.mine = false; view.cat = 'all'; view.sort = 'new'; ctx.$('market-sort').value = 'new';
      show('market'); await load();
    } catch (ex) { err.textContent = ex.message === 'timed out' ? 'Publishing is taking too long. Check your connection, close other Aurix tabs, then try again.' : 'Couldn’t publish: ' + ex.message; }
    btns.forEach((b) => { b.disabled = false; });
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
  const HASH = { market: '#marketplace', sell: '#sell' };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const viewFromHash = () => {
    const m = /^#seller\/(.+)$/.exec(location.hash), id = m && UUID.test(m[1]) ? m[1] : null;
    if (id !== view.seller) { view.seller = id; loadSellerProfile(); }
    return id || location.hash === '#marketplace' ? 'market' : location.hash === '#sell' ? 'sell' : 'studio';
  };
  function show(v, push = true) {
    document.body.dataset.view = v;
    if (v === 'market') document.body.classList.remove('from-market');
    ['studio', 'market', 'sell'].forEach((t) => ctx.$('tab-' + t).setAttribute('aria-selected', v === t));
    if (v === 'market') { if (!loaded) load(); else render(); }
    else if (v === 'studio') setTimeout(() => ctx.studio.resize(), 50);
    document.dispatchEvent(new CustomEvent('aurix:view', { detail: v }));
    const expected = v === 'market' && view.seller ? '#seller/' + view.seller : HASH[v] || '';
    if (push && location.hash !== expected) history.pushState(null, '', expected || location.pathname + location.search);
  }

  function init(c) {
    ctx = c; const { $ } = ctx;
    [['market-cats', [['all', 'All'], ['ring', 'Rings'], ['pendant', 'Pendants'], ['nameplate', 'Name plates']]]].forEach(([id, defs]) => defs.forEach(([val, label]) => {
      const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.dataset.val = val; b.textContent = label;
      b.addEventListener('click', () => { view.cat = val; render(); }); $(id).appendChild(b);
    }));
    $('tab-studio').addEventListener('click', () => show('studio'));
    $('tab-market').addEventListener('click', () => { view.seller = null; sellerProfile = null; show('market'); });
    $('tab-sell').addEventListener('click', () => show('sell'));
    $('market-q').addEventListener('input', (e) => { view.q = e.target.value; render(); });
    $('market-sort').addEventListener('change', (e) => { view.sort = e.target.value; render(); });
    $('market-mine').addEventListener('click', () => { view.mine = !view.mine; render(); });
    $('market-publish').addEventListener('click', openPublish);
    $('btn-sell').addEventListener('click', openPublish);
    $('publish-form').addEventListener('submit', submitPublish);
    $('pub-cancel').addEventListener('click', () => $('publish-modal').classList.remove('open'));
    $('btn-back-market').addEventListener('click', () => show('market'));
    window.addEventListener('popstate', () => show(viewFromHash(), false));
    $('listing-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeListing(); });
    $('publish-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });
    $('l-x').addEventListener('click', closeListing);
    $('l-reviews').addEventListener('click', reviewClick);
    $('l-seller').addEventListener('click', (e) => { const s = e.target.closest('[data-seller]'); if (s) { closeListing(); openSeller(s.dataset.seller); } });
    $('market-profile').addEventListener('click', (e) => { if (e.target.closest('[data-act=all]')) { view.seller = null; sellerProfile = null; show('market'); } });
    $('pub-x').addEventListener('click', () => $('publish-modal').classList.remove('open'));
    $('l-close').addEventListener('click', closeListing);
    $('l-like').addEventListener('click', () => { const card = [...document.querySelectorAll('.m-card')].find((el) => el.querySelector('[data-thumb="' + current.id + '"]')); if (card) toggleLike(current, card.querySelector('.m-like')); });
    $('l-buy').addEventListener('click', () => { const it = current; closeListing(); AurixShop.add(it); });
    $('l-open').addEventListener('click', () => openConfig(current.config));
    $('l-del').addEventListener('click', () => removeListing(current));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeListing(); $('publish-modal').classList.remove('open'); } });
    AurixCloud.onAuth(() => { if (loaded && document.body.dataset.view === 'market') { loaded = false; load(); } });
    document.addEventListener('aurix:listings-changed', () => { items = []; loaded = false; });
    show(viewFromHash(), false);
  }

  return { init, getItem, ensureLoaded, openConfig, show, openListing, openSeller, isMine: (it) => isMine(it) };
})();
