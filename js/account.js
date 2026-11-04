/* Aurix — my profile page: your email plus a private phone number and mailing address.
   Stored in public.account_details, which only its owner can read (see supabase/migrations/*_account_details.sql). */
const AurixAccount = (() => {
  let ctx, me = null, data = null;

  const FIELDS = [
    ['full_name', 'Full name', 'name', 80, 'text'], ['phone', 'Phone number', 'tel', 25, 'tel'],
    ['address_line1', 'Address line 1', 'address-line1', 100, 'text'], ['address_line2', 'Address line 2', 'address-line2', 100, 'text'],
    ['city', 'City', 'address-level2', 60, 'text'], ['region', 'State / region', 'address-level1', 60, 'text'],
    ['postal_code', 'Postal code', 'postal-code', 12, 'text'], ['country', 'Country', 'country-name', 60, 'text']
  ];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const inView = () => document.body.dataset.view === 'account';
  const body = () => ctx.$('account-body');
  const within = (p, ms = 15000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timed out')), ms))]);
  const heading = '<div class="m-hero"><h2>My profile</h2><p class="m-sub">Your account details. Your phone number and address are private: only you can see them.</p></div>';

  function draw() {
    if (!inView()) return;
    if (!me) {
      body().innerHTML = heading + '<div class="sell-cta"><button class="btn primary" data-act="signin">Sign in</button></div>';
      return;
    }
    const d = data || {}, filled = FIELDS.filter(([k]) => (d[k] || '').trim()).length;
    body().innerHTML = heading +
      '<div class="acct-card"><h3 class="sell-h" style="margin-top:0">Account</h3>' +
      '<dl class="acct-dl"><dt>Email</dt><dd>' + esc(me.email || '') + '</dd><dt>Member since</dt><dd>' + (me.created_at ? esc(day(me.created_at)) : '') + '</dd>' +
      '<dt>Public profile</dt><dd>Your public name and bio are edited on the <button class="linklike" type="button" data-act="public">Sell tab</button>.</dd></dl></div>' +
      '<form class="acct-card" id="acct-form" novalidate><h3 class="sell-h" style="margin-top:0">Contact details</h3>' +
      FIELDS.map(([k, label, auto, max, type]) => '<div class="row"><label for="acct-' + k + '">' + label + '</label><input id="acct-' + k + '" name="' + k + '" type="' + type + '" autocomplete="' + auto + '" maxlength="' + max + '" value="' + esc(d[k] || '') + '"' + (k === 'phone' ? ' inputmode="tel" placeholder="+1 555 123 4567"' : '') + '></div>').join('') +
      '<div class="auth-err" id="acct-err" role="alert"></div>' +
      '<p class="shop-muted">' + (filled ? filled + ' of ' + FIELDS.length + ' fields filled in.' : 'Nothing saved yet.') + ' Everything here is optional.</p>' +
      '<div class="row"><button class="btn primary" type="submit" id="acct-save">Save details</button></div></form>';
  }
  function render() {
    try { draw(); } catch (e) {
      console.error('profile page failed to draw', e);
      body().innerHTML = heading + '<div class="m-notice" role="alert">Couldn’t show your profile: ' + esc(e.message) + '</div><div class="sell-cta"><button class="btn primary" data-act="retry">Try again</button></div>';
    }
  }

  async function open() {
    if (!me) return render();
    body().innerHTML = heading + '<p class="m-empty">Loading…</p>';
    try { data = await within(AurixCloud.getAccount(me.id)); }
    catch (e) {
      console.error('profile load failed', e);
      if (inView()) body().innerHTML = heading + '<div class="m-notice" role="alert">Couldn’t load your details: ' + esc(e.message === 'timed out' ? 'the server didn’t answer in time' : e.message) + '</div><div class="sell-cta"><button class="btn primary" data-act="retry">Try again</button></div>';
      return;
    }
    render();
  }

  async function save(e) {
    e.preventDefault();
    const err = ctx.$('acct-err'), btn = ctx.$('acct-save'), d = {};
    FIELDS.forEach(([k]) => { d[k] = ctx.$('acct-' + k).value.trim(); });
    err.textContent = '';
    if (d.phone && (!/^[0-9+()./ -]+$/.test(d.phone) || d.phone.replace(/\D/g, '').length < 7)) { err.textContent = 'Enter a valid phone number: at least 7 digits, using only digits, spaces and + - ( ) . /'; ctx.$('acct-phone').focus(); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try { await within(AurixCloud.saveAccount(me.id, d), 20000); data = d; ctx.toast('Contact details saved'); render(); }
    catch (ex) { err.textContent = ex.message === 'timed out' ? 'Saving is taking too long. Check your connection and try again.' : 'Couldn’t save: ' + ex.message; btn.disabled = false; btn.textContent = 'Save details'; }
  }

  function init(c) {
    ctx = c;
    document.addEventListener('aurix:view', (e) => { if (e.detail === 'account') open(); });
    body().addEventListener('submit', (e) => { if (e.target.id === 'acct-form') save(e); });
    body().addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'signin') ctx.openAuth();
      else if (b.dataset.act === 'retry') open();
      else if (b.dataset.act === 'public') AurixMarketplace.show('sell');
    });
    AurixCloud.onAuth((u) => { me = u; if (!u) data = null; if (inView()) open(); });
    if (inView()) render();
  }

  return { init };
})();
