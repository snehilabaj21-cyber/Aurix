/* Aurix — seller dashboard: your listings (edit / remove), sales, and a badge for sales you haven't seen yet.
   Revenue is demo revenue: checkout takes no payment. */
const AurixSeller = (() => {
  let ctx, me = null, listings = [], sales = [], error = '', editing = null, seenAt = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n).toFixed(2);
  const safeImg = (s) => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';
  const day = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const key = () => 'aurix.sales.seen.' + me.id;
  const getSeen = () => { try { return Number(localStorage.getItem(key())) || 0; } catch (e) { return 0; } };
  const setSeen = (t) => { try { localStorage.setItem(key(), String(t)); } catch (e) { /* storage unavailable */ } };
  const inView = () => document.body.dataset.view === 'sell';
  const body = () => ctx.$('seller-body');

  function badge() {
    const n = me && !inView() ? sales.filter((s) => new Date(s.created_at).getTime() > getSeen()).length : 0;
    const el = ctx.$('sell-n'); el.textContent = n; el.hidden = !n;
  }

  async function refresh() {
    if (!me) { listings = []; sales = []; return; }
    try { [listings, sales] = await Promise.all([AurixCloud.listMyListings(me.id), AurixCloud.listSales(me.id)]); error = ''; }
    catch (e) { error = e.message; }
  }

  function render() {
    if (!inView()) return;
    if (!me) {
      body().innerHTML = '<div class="m-hero"><h2>Seller dashboard</h2><p class="m-sub">Sign in to see your listings and sales.</p></div><div class="sell-cta"><button class="btn primary" data-act="signin">Sign in</button></div>';
      return;
    }
    const soldBy = {}; sales.forEach((s) => { soldBy[s.listing_ref] = (soldBy[s.listing_ref] || 0) + 1; });
    const likes = listings.reduce((n, l) => n + l.likes, 0), revenue = sales.reduce((n, s) => n + Number(s.price), 0);
    const stat = (label, value) => '<div class="sell-stat"><span>' + label + '</span><b>' + value + '</b></div>';
    body().innerHTML = '<div class="m-hero"><h2>Seller dashboard</h2><p class="m-sub">Manage your listings and see who’s buying. Revenue is demo revenue: no payment is taken.</p></div>' +
      (error ? '<div class="m-notice" role="alert">Couldn’t load everything: ' + esc(error) + '</div>' : '') +
      '<div class="sell-stats">' + stat('Active listings', listings.length) + stat('Total likes', likes) + stat('Sales', sales.length) + stat('Demo revenue', money(revenue)) + '</div>' +
      '<h3 class="sell-h">Your listings</h3>' + (listings.length ? listings.map((l) => '<div class="shop-row sell-row">' +
        '<img class="shop-img" alt="' + esc(l.title) + '"' + (safeImg(l.thumbnail) ? ' src="' + safeImg(l.thumbnail) + '"' : '') + '>' +
        '<div class="meta"><b>' + esc(l.title) + '</b><span>Listed ' + day(l.created_at) + ' · ' + l.likes + (l.likes === 1 ? ' like' : ' likes') + ' · ' + (soldBy[l.id] || 0) + ' sold</span></div>' +
        '<div class="shop-price">' + money(l.price) + '</div>' +
        '<button class="btn" data-act="edit" data-id="' + esc(l.id) + '">Edit</button><button class="btn" data-act="remove" data-id="' + esc(l.id) + '">Remove</button></div>').join('')
        : '<p class="m-empty">You haven’t published anything yet. Design something in the studio, then choose “Sell this design”.</p><div class="sell-cta"><button class="btn primary" data-act="studio">Open the studio</button></div>') +
      '<h3 class="sell-h">Recent sales</h3>' + (sales.length ? sales.slice(0, 20).map((s) => '<div class="shop-row"><div class="meta"><b>' + esc(s.title) +
        (new Date(s.created_at).getTime() > seenAt ? ' <em class="sell-new">New</em>' : '') + '</b><span>' + day(s.created_at) + '</span></div><div class="shop-price">' + money(s.price) + '</div></div>').join('')
        : '<p class="m-empty">No one has ordered your designs yet.</p>');
  }

  async function open() {
    if (!me) return render();
    seenAt = getSeen(); body().innerHTML = '<p class="m-empty">Loading…</p>';
    await refresh();
    if (!inView()) return;
    render(); setSeen(Date.now()); badge();
  }

  const changed = () => document.dispatchEvent(new CustomEvent('aurix:listings-changed'));

  function openEdit(l) {
    const { $ } = ctx; editing = l;
    $('edit-title').value = l.title; $('edit-price').value = l.price; $('edit-desc').value = l.description || ''; $('edit-err').textContent = '';
    $('edit-modal').classList.add('open'); $('edit-title').focus();
  }
  const closeEdit = () => { ctx.$('edit-modal').classList.remove('open'); editing = null; };

  async function saveEdit(e) {
    e.preventDefault();
    const { $ } = ctx, err = $('edit-err'), title = $('edit-title').value.trim(), price = parseFloat($('edit-price').value);
    if (!title) { err.textContent = 'Add a title.'; return; }
    if (!(price >= 1 && price <= 100000)) { err.textContent = 'Price must be between $1 and $100,000.'; return; }
    const btn = $('edit-save'); btn.disabled = true;
    try {
      await AurixCloud.updateListing(editing.id, { title, description: $('edit-desc').value.trim().slice(0, 600), price: Math.round(price * 100) / 100 });
      closeEdit(); ctx.toast('Listing updated'); changed(); await refresh(); render();
    } catch (ex) { err.textContent = 'Couldn’t save: ' + ex.message; }
    btn.disabled = false;
  }

  async function remove(l) {
    if (!confirm('Remove “' + l.title + '” from the marketplace?')) return;
    try { await AurixCloud.deleteListing(l.id); ctx.toast('Listing removed'); changed(); await refresh(); render(); }
    catch (ex) { ctx.toast('Couldn’t remove: ' + ex.message); }
  }

  function init(c) {
    ctx = c;
    document.addEventListener('aurix:view', (e) => { if (e.detail === 'sell') open(); else badge(); });
    body().addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const l = listings.find((x) => x.id === b.dataset.id);
      if (b.dataset.act === 'edit' && l) openEdit(l);
      else if (b.dataset.act === 'remove' && l) remove(l);
      else if (b.dataset.act === 'signin') ctx.openAuth();
      else if (b.dataset.act === 'studio') AurixMarketplace.show('studio');
    });
    ctx.$('edit-form').addEventListener('submit', saveEdit);
    ctx.$('edit-cancel').addEventListener('click', closeEdit);
    ctx.$('edit-x').addEventListener('click', closeEdit);
    ctx.$('edit-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeEdit(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEdit(); });
    const onUser = async (u) => {
      me = u; ctx.$('tab-sell').hidden = !u;
      await refresh(); badge(); if (inView()) { seenAt = me ? getSeen() : 0; render(); if (me) setSeen(Date.now()); }
    };
    AurixCloud.onAuth(onUser);
    if (inView()) render();
    // new sales show up on the badge without reloading the page
    setInterval(async () => { if (me && !inView()) { await refresh(); badge(); } }, 60000);
  }

  return { init };
})();
