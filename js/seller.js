/* Aurix — seller dashboard: stats, a 14-day sales/likes chart, your public profile, your listings (draft, edit, remove)
   and sales with delivery status. Revenue is demo revenue: checkout takes no payment. */
const AurixSeller = (() => {
  let ctx, me = null, listings = [], sales = [], likes = [], profile = null, error = '', editing = null, seenAt = 0, chartKind = 'sales';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$' + Number(n).toFixed(2);
  const safeImg = (s) => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';
  const day = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const short = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const key = () => 'aurix.sales.seen.' + me.id;
  const getSeen = () => { try { return Number(localStorage.getItem(key())) || 0; } catch (e) { return 0; } };
  const setSeen = (t) => { try { localStorage.setItem(key(), String(t)); } catch (e) { /* storage unavailable */ } };
  const inView = () => document.body.dataset.view === 'sell';
  const body = () => ctx.$('seller-body');
  const defaultName = () => (profile && profile.display_name) || (me && me.email ? me.email.split('@')[0].slice(0, 40) : '');

  function badge() {
    const n = me && !inView() ? sales.filter((s) => new Date(s.created_at).getTime() > getSeen()).length : 0;
    const el = ctx.$('sell-n'); el.textContent = n; el.hidden = !n;
  }

  async function refresh() {
    if (!me) { listings = []; sales = []; likes = []; profile = null; return; }
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    try {
      [listings, sales, profile] = await Promise.all([AurixCloud.listMyListings(me.id), AurixCloud.listSales(me.id), AurixCloud.getProfile(me.id)]);
      likes = await AurixCloud.likesSince(listings.map((l) => l.id), since).catch(() => []);
      error = '';
    } catch (e) { error = e.message; }
  }

  /* last 14 days of sales or likes as a small bar chart */
  function chart() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, i) => new Date(today.getTime() - (13 - i) * 864e5));
    const dk = (d) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    const counts = {}; (chartKind === 'sales' ? sales : likes).forEach((r) => { const k = dk(new Date(r.created_at)); counts[k] = (counts[k] || 0) + 1; });
    const n = days.map((d) => counts[dk(d)] || 0), max = Math.max(1, ...n), total = n.reduce((a, b) => a + b, 0);
    const bars = n.map((v, i) => { const h = Math.round(v / max * 70), x = i * 30 + 3;
      return '<rect class="sell-bar" x="' + x + '" y="' + (86 - h) + '" width="24" height="' + h + '" rx="3"><title>' + short(days[i]) + ': ' + v + '</title></rect>' + (v ? '<text x="' + (x + 12) + '" y="' + (82 - h) + '" text-anchor="middle">' + v + '</text>' : ''); }).join('');
    const label = chartKind === 'sales' ? 'sales' : 'likes';
    return '<div class="sell-chart"><div class="sell-chart-h"><div class="shop-tabs" role="tablist" aria-label="Chart"><button class="tab" role="tab" data-act="chart" data-kind="sales" aria-selected="' + (chartKind === 'sales') + '">Sales</button>' +
      '<button class="tab" role="tab" data-act="chart" data-kind="likes" aria-selected="' + (chartKind === 'likes') + '">Likes</button></div><span class="shop-muted">' + total + ' ' + label + ' in the last 14 days</span></div>' +
      '<svg viewBox="0 0 420 108" role="img" aria-label="' + total + ' ' + label + ' in the last 14 days, per day">' + bars +
      '<text class="sell-axis" x="0" y="104">' + short(days[0]) + '</text><text class="sell-axis" x="420" y="104" text-anchor="end">' + short(days[13]) + '</text></svg></div>';
  }

  function profileCard() {
    return '<div class="sell-profile"><h3 class="sell-h" style="margin-top:0">Your public profile</h3>' +
      '<div class="row"><label for="prof-name">Display name</label><input type="text" id="prof-name" maxlength="40" value="' + esc(defaultName()) + '"></div>' +
      '<div class="row"><label for="prof-bio">About you</label><textarea id="prof-bio" maxlength="300" placeholder="A line or two about your work">' + esc(profile ? profile.bio : '') + '</textarea></div>' +
      '<div class="auth-err" id="prof-err" role="alert"></div>' +
      '<div class="row"><button class="btn primary" data-act="save-profile">Save profile</button><a class="btn" href="#seller/' + esc(me.id) + '">View public page</a></div></div>';
  }

  function render() {
    if (!inView()) return;
    if (!me) {
      body().innerHTML = '<div class="m-hero"><h2>Seller dashboard</h2><p class="m-sub">Sign in to see your listings and sales.</p></div><div class="sell-cta"><button class="btn primary" data-act="signin">Sign in</button></div>';
      return;
    }
    const live = listings.filter((l) => l.status !== 'draft'), soldBy = {}; sales.forEach((s) => { soldBy[s.listing_ref] = (soldBy[s.listing_ref] || 0) + 1; });
    const likeTotal = live.reduce((n, l) => n + l.likes, 0), revenue = sales.reduce((n, s) => n + Number(s.price), 0), toDeliver = sales.filter((s) => s.status !== 'delivered').length;
    const stat = (label, value) => '<div class="sell-stat"><span>' + label + '</span><b>' + value + '</b></div>';
    body().innerHTML = '<div class="m-hero"><h2>Seller dashboard</h2><p class="m-sub">Manage your listings and see who’s buying. Revenue is demo revenue: no payment is taken.</p></div>' +
      (error ? '<div class="m-notice" role="alert">Couldn’t load everything: ' + esc(error) + '</div>' : '') +
      '<div class="sell-stats">' + stat('Active listings', live.length) + stat('Total likes', likeTotal) + stat('Sales', sales.length) + stat('To deliver', toDeliver) + stat('Demo revenue', money(revenue)) + '</div>' +
      chart() + profileCard() +
      '<h3 class="sell-h">Your listings</h3>' + (listings.length ? listings.map((l) => '<div class="shop-row sell-row">' +
        '<img class="shop-img" alt="' + esc(l.title) + '"' + (safeImg(l.thumbnail) ? ' src="' + safeImg(l.thumbnail) + '"' : '') + '>' +
        '<div class="meta"><b>' + esc(l.title) + (l.status === 'draft' ? ' <em class="sell-new sell-draft">Draft</em>' : '') + '</b><span>' + (l.status === 'draft' ? 'Only you can see this · created ' : 'Listed ') + day(l.created_at) +
          (l.status === 'draft' ? '' : ' · ' + l.likes + (l.likes === 1 ? ' like' : ' likes') + ' · ' + (soldBy[l.id] || 0) + ' sold') + '</span></div>' +
        '<div class="shop-price">' + money(l.price) + '</div>' +
        (l.status === 'draft' ? '<button class="btn primary" data-act="publish" data-id="' + esc(l.id) + '">Publish</button>' : '') +
        '<button class="btn" data-act="edit" data-id="' + esc(l.id) + '">Edit</button><button class="btn" data-act="remove" data-id="' + esc(l.id) + '">Remove</button></div>').join('')
        : '<p class="m-empty">You haven’t published anything yet. Design something in the studio, then choose “Sell this design”.</p><div class="sell-cta"><button class="btn primary" data-act="studio">Open the studio</button></div>') +
      '<h3 class="sell-h">Recent sales</h3>' + (sales.length ? sales.slice(0, 20).map((s) => '<div class="shop-row"><div class="meta"><b>' + esc(s.title) +
        (new Date(s.created_at).getTime() > seenAt ? ' <em class="sell-new">New</em>' : '') + '</b><span>' + day(s.created_at) + ' · ' + (s.status === 'delivered' ? 'Delivered' : 'Waiting for delivery') + '</span></div><div class="shop-price">' + money(s.price) + '</div>' +
        (s.status === 'delivered' ? '' : '<button class="btn" data-act="deliver" data-id="' + esc(s.id) + '">Mark delivered</button>') + '</div>').join('')
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
  const reload = async () => { await refresh(); render(); };

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
      closeEdit(); ctx.toast('Listing updated'); changed(); await reload();
    } catch (ex) { err.textContent = 'Couldn’t save: ' + ex.message; }
    btn.disabled = false;
  }

  async function remove(l) {
    if (!confirm('Remove “' + l.title + '”' + (l.status === 'draft' ? '?' : ' from the marketplace?'))) return;
    try { await AurixCloud.deleteListing(l.id); ctx.toast('Listing removed'); changed(); await reload(); }
    catch (ex) { ctx.toast('Couldn’t remove: ' + ex.message); }
  }

  async function saveProfile(btn) {
    const err = ctx.$('prof-err'), name = ctx.$('prof-name').value.trim(), bio = ctx.$('prof-bio').value.trim().slice(0, 300);
    if (!name) { err.textContent = 'Add a display name.'; return; }
    btn.disabled = true; err.textContent = '';
    try { await AurixCloud.saveProfile(me.id, name, bio); profile = { user_id: me.id, display_name: name, bio }; ctx.toast('Profile saved'); }
    catch (ex) { err.textContent = 'Couldn’t save: ' + ex.message; }
    btn.disabled = false;
  }

  function init(c) {
    ctx = c;
    document.addEventListener('aurix:view', (e) => { if (e.detail === 'sell') open(); else badge(); });
    body().addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act, l = listings.find((x) => x.id === b.dataset.id);
      if (act === 'edit' && l) openEdit(l);
      else if (act === 'remove' && l) remove(l);
      else if (act === 'publish' && l) { try { await AurixCloud.updateListing(l.id, { status: 'published' }); ctx.toast('Published to the marketplace'); changed(); await reload(); } catch (ex) { ctx.toast('Couldn’t publish: ' + ex.message); } }
      else if (act === 'deliver') { b.disabled = true; try { await AurixCloud.setItemStatus(b.dataset.id, 'delivered'); ctx.toast('Marked as delivered'); await reload(); } catch (ex) { ctx.toast('Couldn’t update: ' + ex.message); b.disabled = false; } }
      else if (act === 'chart') { chartKind = b.dataset.kind; render(); }
      else if (act === 'save-profile') saveProfile(b);
      else if (act === 'signin') ctx.openAuth();
      else if (act === 'studio') AurixMarketplace.show('studio');
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
