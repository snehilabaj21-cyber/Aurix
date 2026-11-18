/* Aurix — shop: cart, checkout, orders and seller sales. Payment is a Stripe card form; the order is only created on the
   server after Stripe confirms the payment (supabase/functions/stripe-checkout, migrations/*_payments.sql, *_stripe.sql). */
const AurixShop = (() => {
  const KEY = 'aurix.cart';
  let ctx, cart = [], owned = new Set(), me = null, orders = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Number(n) === 0 ? 'Free' : '$' + Number(n).toFixed(2);
  const safeImg = (s) => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)) ? s : '';
  const day = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const readCart = () => { try { const c = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(c) ? c.filter((r) => typeof r === 'string') : []; } catch (e) { return []; } };
  const saveCart = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable: cart lasts this visit */ } badge(); };
  const badge = () => { const n = ctx.$('cart-n'); n.textContent = cart.length; n.hidden = !cart.length; };
  const market = () => AurixMarketplace;
  const body = (html) => { ctx.$('shop-body').innerHTML = html; };
  const owns = (ref) => owned.has(ref);

  let statuses = null; // order item id -> status, to spot deliveries that happen while the site is open
  async function refreshOwned() {
    if (!me) { owned = new Set(); orders = []; statuses = null; return; }
    try {
      orders = await AurixCloud.listOrders(); owned = new Set(orders.flatMap((o) => o.order_items.map((i) => i.listing_ref)));
      const now = {}; orders.forEach((o) => o.order_items.forEach((i) => { now[i.id] = i.status; }));
      if (statuses) orders.forEach((o) => o.order_items.forEach((i) => { if (i.status === 'delivered' && statuses[i.id] && statuses[i.id] !== 'delivered') ctx.toast('Delivered: “' + i.title + '” is ready in your Orders.'); }));
      statuses = now;
    } catch (e) { /* orders table unavailable */ }
  }

  function add(it) {
    if (market().isMine(it)) return ctx.toast('That’s your own design');
    if (owned.has(it.id)) return ctx.toast('You already own this design');
    if (cart.includes(it.id)) { ctx.toast('Already in your cart'); return open('cart'); }
    cart.push(it.id); saveCart(); ctx.toast('Added to cart (' + cart.length + ')');
  }
  const remove = (ref) => { cart = cart.filter((r) => r !== ref); saveCart(); };

  const thumb = (src, alt) => '<img class="shop-img" alt="' + esc(alt) + '"' + (safeImg(src) ? ' src="' + safeImg(src) + '"' : '') + '>';
  const total = (rows) => rows.reduce((s, r) => s + Number(r.price), 0);
  const orderNo = (id) => '#' + id.slice(0, 8).toUpperCase();

  /* ----- views ----- */
  async function cartRows() {
    await market().ensureLoaded();
    const rows = cart.map((ref) => market().getItem(ref)), gone = rows.filter((r) => !r).length;
    if (gone) { cart = cart.filter((ref) => market().getItem(ref)); saveCart(); }
    return { rows: rows.filter(Boolean), gone };
  }

  async function cartView() {
    body('<h3>Your cart</h3><p class="shop-muted">Loading…</p>');
    const { rows, gone } = await cartRows();
    body('<h3>Your cart</h3>' + (gone ? '<p class="shop-muted">' + gone + (gone === 1 ? ' design is' : ' designs are') + ' no longer available and was removed.</p>' : '') +
      (rows.length ? rows.map((r) => '<div class="shop-row">' + thumb(r.thumbnail, r.title) + '<div class="meta"><b>' + esc(r.title) + '</b><span>by ' + esc(r.seller_name) + '</span></div>' +
        '<div class="shop-price">' + money(r.price) + '</div><button class="btn" data-act="remove" data-ref="' + esc(r.id) + '">Remove</button></div>').join('') +
        '<div class="shop-total"><span>Total (' + rows.length + (rows.length === 1 ? ' design' : ' designs') + ')</span><b>' + money(total(rows)) + '</b></div>' +
        '<div class="row shop-actions"><button class="btn" data-act="close">Keep browsing</button><button class="btn primary" data-act="checkout">Checkout</button></div>'
        : '<p class="m-empty">Your cart is empty. Browse the marketplace and add a design.</p><div class="row shop-actions"><button class="btn" data-act="close">Close</button></div>'));
  }

  async function checkoutView() {
    const { rows } = await cartRows();
    if (!rows.length) return cartView();
    // sellers only get contact details if the buyer chooses to share them
    const acct = me ? await AurixCloud.getAccount(me.id).catch(() => null) : null;
    const hasContact = !!acct && (acct.phone.trim() || acct.address_line1.trim());
    const preview = acct ? [acct.full_name, acct.phone, [acct.address_line1, acct.city, acct.country].filter(Boolean).join(', ')].filter((x) => x && x.trim()).join(' · ') : '';
    const contactSec = !rows.some((r) => !r.featured) ? ''
      : hasContact ? '<div class="shop-sec"><h4>Contact details</h4><label class="shop-share"><input type="checkbox" id="shop-share"><span>Share my contact details with the seller so they can reach me about this order.</span></label>' +
        '<p class="shop-muted">They would see: ' + esc(preview) + '. Only the seller of each design sees them, and only for this order.</p></div>'
      : '<div class="shop-sec"><h4>Contact details</h4><p class="shop-muted">Sellers only get your phone number or address if you choose to share them. Add them to <button class="linklike" type="button" data-act="profile">My profile</button> if you want that option.</p></div>';
    body('<h3>Checkout</h3>' +
      '<div class="shop-sec"><h4>Order summary</h4>' + rows.map((r) => '<div class="shop-row">' + thumb(r.thumbnail, r.title) + '<div class="meta"><b>' + esc(r.title) + '</b><span>by ' + esc(r.seller_name) + '</span></div><div class="shop-price">' + money(r.price) + '</div></div>').join('') + '</div>' +
      '<div class="shop-sec"><h4>Payment</h4><p class="shop-muted">Pay with a debit or credit card.</p>' +
      '<div id="shop-pay" class="shop-pay"><p class="shop-muted">Loading payment options…</p></div></div>' +
      '<div class="shop-sec"><h4>Delivery</h4><p class="shop-muted">Digital: designs open in your studio straight after you pay.</p></div>' + contactSec +
      '<div class="shop-total"><span>Order total</span><b>' + money(total(rows)) + '</b></div><div class="auth-err" id="shop-err" role="alert"></div>' +
      '<div class="row shop-actions"><button class="btn" data-act="cart">Back to cart</button></div>');
    mountPay(rows);
  }

  /* ----- payment: Stripe card form (Payment Element) on this page ----- */
  let stripeJs = null;
  function loadStripe() {
    if (window.Stripe) return Promise.resolve();
    if (!stripeJs) stripeJs = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/';
      s.onload = resolve; s.onerror = () => { stripeJs = null; reject(new Error('Couldn’t reach Stripe. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
    return stripeJs;
  }

  async function mountPay(rows) {
    const box = ctx.$('shop-pay'), err = ctx.$('shop-err');
    const items = rows.map((r) => ({ ref: r.id, config: r.featured ? r.config : null, thumbnail: r.featured && safeImg(r.thumbnail) && r.thumbnail.length < 190000 ? r.thumbnail : null }));
    try {
      const cfg = await AurixCloud.paymentConfig();
      if (!cfg.configured) { box.innerHTML = '<p class="shop-muted">Payments aren’t switched on for this site yet. Please check back soon.</p>'; return; }
      await loadStripe();
      if (!ctx.$('shop-pay')) return; // the buyer left checkout while Stripe was loading
      const stripe = Stripe(cfg.publishableKey), amount = Math.round(total(rows) * 100);
      const elements = stripe.elements({ mode: 'payment', amount, currency: cfg.currency, appearance: {
        theme: 'night', variables: { colorPrimary: '#c9a45c', colorBackground: '#1d1a17', colorText: '#ece6dc', colorTextSecondary: '#9a9185', colorDanger: '#e0675a', fontFamily: 'Inter, system-ui, sans-serif', borderRadius: '8px' } } });
      box.innerHTML = '<div id="shop-card"></div><button class="btn primary shop-paybtn" id="shop-paybtn" type="button">Pay ' + money(total(rows)) + '</button>' +
        '<p class="shop-muted shop-secure">Payments are processed securely by Stripe. Aurix never sees your card details.</p>';
      elements.create('payment', { layout: 'tabs' }).mount('#shop-card');
      const btn = ctx.$('shop-paybtn');
      btn.addEventListener('click', async () => {
        err.textContent = ''; btn.disabled = true; btn.textContent = 'Processing…';
        const reset = () => { btn.disabled = false; btn.textContent = 'Pay ' + money(total(rows)); };
        try {
          const v = await elements.submit();
          if (v.error) { err.textContent = v.error.message; return reset(); }
          const share = !!(ctx.$('shop-share') && ctx.$('shop-share').checked);
          const { client_secret, id } = await AurixCloud.payCreate(items, share);
          const res = await stripe.confirmPayment({ elements, clientSecret: client_secret, confirmParams: { return_url: location.href }, redirect: 'if_required' });
          if (res.error) { err.textContent = res.error.message; return reset(); }
          btn.textContent = 'Confirming…';
          const r = await AurixCloud.payComplete(id);
          await done(rows, r.order_id, share, r.method);
        } catch (e) { err.textContent = e.message; reset(); }
      });
    } catch (e) {
      box.innerHTML = '';
      err.textContent = /Edge Function/i.test(e.message) ? 'Payments aren’t available right now. Please try again later.' : 'Couldn’t load payment options: ' + e.message;
      console.error('payment options failed', e);
    }
  }

  async function done(rows, id, share, method) {
    cart = []; saveCart(); await refreshOwned();
    ctx.toast('Payment received! Order ' + orderNo(id) + ' is in your Orders.');
    const via = method === 'card' ? 'card' : '';
    body('<div class="shop-done"><div class="shop-check" aria-hidden="true">✓</div><h3>Thanks, your order is confirmed</h3><p class="shop-muted">Order ' + orderNo(id) + (via ? ' · paid with ' + via : '') + ' · a confirmation is on its way to your email.</p>' + (share ? '<p class="shop-muted">Your contact details were shared with the seller.</p>' : '') + '</div>' +
      rows.map((r, i) => '<div class="shop-row">' + thumb(r.thumbnail, r.title) + '<div class="meta"><b>' + esc(r.title) + '</b><span>by ' + esc(r.seller_name) + '</span></div>' +
        '<div class="shop-price">' + money(r.price) + '</div><button class="btn primary" data-act="open-cfg" data-i="' + i + '">Open in studio</button></div>').join('') +
      '<div class="row shop-actions"><button class="btn" data-act="close">Keep browsing</button><button class="btn" data-act="orders">View orders</button></div>');
    lastRows = rows;
  }
  let lastRows = [];

  async function ordersView(tab = 'orders') {
    const tabs = '<div class="shop-tabs" role="tablist"><button class="tab" role="tab" data-act="tab" data-tab="orders" aria-selected="' + (tab === 'orders') + '">My orders</button>' +
      '<button class="tab" role="tab" data-act="tab" data-tab="sales" aria-selected="' + (tab === 'sales') + '">Sales</button></div>';
    body('<h3>Orders</h3>' + tabs + '<p class="shop-muted">Loading…</p>');
    try {
      if (tab === 'orders') {
        await refreshOwned();
        body('<h3>Orders</h3>' + tabs + (orders.length ? orders.map((o, oi) => {
          const t = total(o.order_items);
          return '<div class="shop-order"><div class="shop-order-h"><span><b>Order ' + orderNo(o.id) + '</b> · ' + day(o.created_at) + '</span><b>' + money(t) + '</b></div>' +
            o.order_items.map((i, ii) => '<div class="shop-row">' + thumb(i.thumbnail, i.title) + '<div class="meta"><b>' + esc(i.title) + '</b><span>by ' + esc(i.seller_name) + ' · ' + (i.status === 'delivered' || /^f[0-9]{1,3}$/.test(i.listing_ref) ? 'Delivered' : 'Waiting for the seller') + (i.shared_contact ? ' · Contact shared' : '') + '</span></div>' +
              '<div class="shop-price">' + money(i.price) + '</div><button class="btn" data-act="review" data-ref="' + esc(i.listing_ref) + '">Review</button><button class="btn" data-act="open-order" data-o="' + oi + '" data-i="' + ii + '">Open in studio</button></div>').join('') + '</div>';
        }).join('') : '<p class="m-empty">You haven’t ordered anything yet.</p>') + '<div class="row shop-actions"><button class="btn" data-act="close">Close</button></div>');
      } else {
        const sales = await AurixCloud.listSales(me.id);
        body('<h3>Orders</h3>' + tabs + (sales.length ? '<div class="shop-total"><span>' + sales.length + (sales.length === 1 ? ' sale' : ' sales') + ' of your designs</span><b>' + money(total(sales)) + '</b></div>' +
          sales.map((s) => '<div class="shop-row"><div class="meta"><b>' + esc(s.title) + '</b><span>' + day(s.created_at) + '</span></div><div class="shop-price">' + money(s.price) + '</div></div>').join('') +
          '<p class="shop-muted">Buyers pay Aurix by card through Stripe. Payouts to sellers aren’t automated yet.</p>' : '<p class="m-empty">No one has ordered your designs yet.</p>') + '<div class="row shop-actions"><button class="btn" data-act="close">Close</button></div>');
      }
    } catch (e) { body('<h3>Orders</h3>' + tabs + '<p class="shop-muted">Couldn’t load: ' + esc(e.message) + '</p>'); }
  }

  /* ----- open / close ----- */
  function open(view) {
    if (view === 'orders' && !me) { ctx.toast('Sign in to see your orders'); return ctx.openAuth(); }
    ctx.$('shop-modal').classList.add('open');
    return view === 'orders' ? ordersView() : cartView();
  }
  const close = () => ctx.$('shop-modal').classList.remove('open');

  function init(c) {
    ctx = c; cart = readCart(); badge();
    ctx.$('btn-cart').addEventListener('click', () => open('cart'));
    ctx.$('btn-orders').addEventListener('click', () => open('orders'));
    ctx.$('shop-x').addEventListener('click', close);
    ctx.$('shop-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    ctx.$('shop-body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') close();
      else if (act === 'remove') { remove(b.dataset.ref); ctx.toast('Removed from cart'); cartView(); }
      else if (act === 'cart') cartView();
      else if (act === 'profile') { close(); market().show('account'); }
      else if (act === 'checkout') { if (!me) { ctx.toast('Sign in to check out'); close(); ctx.openAuth(); } else checkoutView(); }
      else if (act === 'orders') ordersView('orders');
      else if (act === 'tab') ordersView(b.dataset.tab);
      else if (act === 'open-cfg') { close(); market().openConfig(lastRows[+b.dataset.i].config); }
      else if (act === 'review') { const it = market().getItem(b.dataset.ref); if (it) { close(); market().show('market'); market().openListing(it); } else ctx.toast('That design is no longer in the marketplace'); }
      else if (act === 'open-order') { close(); market().openConfig(orders[+b.dataset.o].order_items[+b.dataset.i].config); }
    });
    AurixCloud.onAuth((u) => { me = u; ctx.$('btn-orders').hidden = !u; refreshOwned(); });
    AurixCloud.user().then((u) => { me = u; ctx.$('btn-orders').hidden = !u; refreshOwned(); });
    setInterval(() => { if (me) refreshOwned(); }, 60000); // picks up deliveries without a reload
  }

  return { init, add, owns };
})();
