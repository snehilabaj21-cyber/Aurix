/* Aurix — UI wiring, telemetry HUD, URL params. */
(() => {
  const $ = (id) => document.getElementById(id);
  const studio = new CADStudio($('viewport'));
  const cfg = () => studio.config;
  let toastTimer;
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ----- build controls ----- */
  const shapeGrid = (el, cfgKey) => Object.entries(GemstoneLibrary.SHAPES).forEach(([key, def]) => {
    const o = GemstoneLibrary.getOutline(key, 24, 24 / def.ratio);
    const pts = o.map(([x, z]) => (15 + x * 0.5).toFixed(1) + ',' + (15 + z * 0.5).toFixed(1));
    const b = document.createElement('button');
    b.className = 'shape'; b.dataset.shape = key; b.type = 'button';
    b.innerHTML = '<svg viewBox="0 0 30 30" aria-hidden="true"><polygon points="' + pts.join(' ') + '"/></svg>' + def.label;
    b.addEventListener('click', () => { studio.updateConfig({ [cfgKey]: key }); sync(); });
    el.appendChild(b);
  });
  shapeGrid($('shapes'), 'gemShape');
  shapeGrid($('p-shapes'), 'pendantShape');
  Object.entries(GemstoneLibrary.TYPES).forEach(([key, t]) => {
    $('stone').add(new Option(t.label, key));
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.dataset.stone = key; b.title = t.label; b.setAttribute('aria-label', t.label);
    const hex = '#' + t.tint.toString(16).padStart(6, '0');
    b.style.background = 'radial-gradient(circle at 35% 30%, #fff 0%, ' + hex + ' 55%, #0006 130%)';
    b.addEventListener('click', () => { studio.updateConfig({ stoneType: key }); sync(); });
    $('stone-sw').appendChild(b);
  });
  $('stone').addEventListener('change', (e) => { studio.updateConfig({ stoneType: e.target.value }); sync(); });
  ['D', 'E', 'F', 'G', 'H', 'I'].forEach((c) => $('color').add(new Option(c + (c === 'D' ? ' — colorless' : ''), c)));
  ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1'].forEach((c) => $('clarity').add(new Option(c, c)));

  const chipGroup = (id, items, key) => {
    const el = $(id);
    items.forEach(([val, label]) => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.dataset.val = val; b.textContent = label;
      b.addEventListener('click', () => { studio.updateConfig({ [key]: val }); sync(); });
      el.appendChild(b);
    });
  };
  chipGroup('heads', [['4-prong', '4-prong'], ['6-prong', '6-prong'], ['double-claw', 'Double claw'], ['compass', 'Compass'], ['bezel', 'Bezel']], 'headStyle');
  chipGroup('products', [['ring', 'Ring'], ['pendant', 'Pendant'], ['nameplate', 'Name plate']], 'product');
  chipGroup('p-stone', [[true, 'With stone'], [false, 'Lettering only']], 'pendantStone');
  chipGroup('p-bail', [['loop', 'Loop'], ['none', 'None']], 'bail');
  chipGroup('fonts', Object.entries(CADStudio.FONTS).map(([k, f]) => [k, f.label]), 'plateFont');
  chipGroup('plate-styles', [['rounded', 'Rounded'], ['pill', 'Pill'], ['square', 'Square']], 'plateStyle');
  chipGroup('plate-loops', [['both', 'Both ends'], ['none', 'None']], 'plateLoops');
  chipGroup('profiles', [['d-shape', 'D-shape'], ['comfort', 'Comfort fit'], ['flat', 'Flat'], ['knife', 'Knife edge']], 'profile');

  Object.entries(PricingEngine.ALLOYS).forEach(([key, a]) => {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.dataset.val = key; b.title = a.label; b.setAttribute('aria-label', a.label);
    b.style.background = 'linear-gradient(135deg,#fff8 0%,#' + a.color.toString(16).padStart(6, '0') + ' 45%,#0003 100%), #' + a.color.toString(16).padStart(6, '0');
    b.addEventListener('click', () => { studio.updateConfig({ metalType: key }); sync(); });
    $('metals').appendChild(b);
  });

  const sliders = [['carat', 'carat', 2, ' ct'], ['prong', 'prongThickness', 2, ' mm'], ['thick', 'bandThickness', 1, ' mm'], ['width', 'bandWidth', 1, ' mm'], ['size', 'ringSize', 1, ''], ['rot', 'stoneRotation', 0, '°'],
    ['p-size', 'pendantSize', 0, ' mm'], ['p-thick', 'pendantThickness', 1, ' mm'], ['t-size', 'textSize', 1, ' mm'], ['t-raise', 'textRaise', 1, ' mm'], ['pl-h', 'plateHeight', 1, ' mm'], ['pl-th', 'plateThickness', 1, ' mm']];
  $('rot-ns').addEventListener('click', () => { studio.updateConfig({ stoneRotation: 0 }); sync(); });
  $('rot-ew').addEventListener('click', () => { studio.updateConfig({ stoneRotation: 90 }); sync(); });
  sliders.forEach(([id, key, dec, unit]) => {
    $(id).addEventListener('input', (e) => { studio.updateConfig({ [key]: parseFloat(e.target.value) }); $(id + '-o').textContent = parseFloat(e.target.value).toFixed(dec) + unit; });
  });
  ['color', 'clarity', 'halo', 'accents'].forEach((id) => $(id).addEventListener('change', (e) => { studio.updateConfig({ [id]: e.target.value }); sync(); }));
  $('p-halo').addEventListener('change', (e) => { studio.updateConfig({ halo: e.target.value }); sync(); });
  $('plate-text').addEventListener('input', (e) => { studio.updateConfig({ plateText: e.target.value }); });
  $('engrave').addEventListener('input', (e) => { studio.updateConfig({ engraving: e.target.value }); });

  /* reflect config into the controls */
  function sync() {
    const c = cfg();
    document.querySelectorAll('#shapes .shape').forEach((b) => b.setAttribute('aria-pressed', b.dataset.shape === c.gemShape));
    document.querySelectorAll('#p-shapes .shape').forEach((b) => b.setAttribute('aria-pressed', b.dataset.shape === c.pendantShape));
    [['products', 'product'], ['p-stone', 'pendantStone'], ['p-bail', 'bail'], ['fonts', 'plateFont'], ['plate-styles', 'plateStyle'], ['plate-loops', 'plateLoops']]
      .forEach(([id, key]) => document.querySelectorAll('#' + id + ' .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === String(c[key]))));
    document.body.dataset.product = c.product; document.body.dataset.pstone = c.pendantStone ? 'on' : 'off';
    $('p-halo').value = c.halo;
    if (document.activeElement !== $('plate-text')) $('plate-text').value = c.plateText || '';
    document.querySelectorAll('#heads .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === c.headStyle));
    document.querySelectorAll('#profiles .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === c.profile));
    document.querySelectorAll('#metals .sw').forEach((b) => b.setAttribute('aria-pressed', b.dataset.val === c.metalType));
    document.querySelectorAll('#stone-sw .sw').forEach((b) => b.setAttribute('aria-pressed', b.dataset.stone === c.stoneType));
    $('stone').value = c.stoneType;
    $('color-row').style.display = GemstoneLibrary.TYPES[c.stoneType].graded ? '' : 'none';
    $('metal-name').textContent = PricingEngine.ALLOYS[c.metalType].label;
    sliders.forEach(([id, key, dec, unit]) => { $(id).value = c[key]; $(id + '-o').textContent = c[key].toFixed(dec) + unit; });
    ['color', 'clarity', 'halo', 'accents'].forEach((id) => { $(id).value = c[id]; });
    $('engrave').value = c.engraving || '';
  }

  /* ----- telemetry ----- */
  studio.onBuild = (m) => {
    const c = cfg(), cost = PricingEngine.calculateCostBreakdown(c, m), feas = PricingEngine.checkManufacturingFeasibility(c, m);
    $('price').textContent = PricingEngine.fmt(cost.retail);
    $('m-weight').textContent = m.weightG.toFixed(2) + ' g · ' + m.weightDwt.toFixed(2) + ' dwt';
    const stoneDims = m.dims ? m.dims.length.toFixed(1) + ' × ' + m.dims.width.toFixed(1) + ' mm' : 'None';
    if (m.product === 'ring') {
      $('m-stone-l').textContent = 'Center stone'; $('m-stone').textContent = stoneDims;
      $('m-size-l').textContent = 'Ring size'; $('m-size').textContent = 'US ' + c.ringSize + ' · Ø ' + m.innerDiameter.toFixed(1) + ' mm';
    } else {
      const pd = m.plate.width.toFixed(1) + ' × ' + m.plate.height.toFixed(1) + ' × ' + m.plate.thickness.toFixed(1) + ' mm';
      const withStone = m.product === 'pendant' && c.pendantStone, text = (c.plateText || '').trim();
      $('m-stone-l').textContent = m.product === 'pendant' ? 'Pendant' : 'Plate'; $('m-stone').textContent = pd;
      $('m-size-l').textContent = withStone ? 'Center stone' : 'Lettering';
      $('m-size').textContent = withStone ? stoneDims : (text ? '\u201c' + text + '\u201d \u00b7 ' + c.textSize.toFixed(1) + ' mm' : '\u2014');
      const fit = $('p-fit'); fit.textContent = m.fits === false ? 'The stone and its setting do not fit inside this pendant \u2014 make it taller or reduce the carat.' : ''; fit.classList.toggle('warn', m.fits === false);
    }
    $('breakdown').innerHTML = cost.lines.map(([k, v]) => '<tr><td>' + k + '</td><td>' + PricingEngine.fmt(v) + '</td></tr>').join('') +
      '<tr><td><b>Wholesale</b></td><td><b>' + PricingEngine.fmt(cost.wholesale) + '</b></td></tr>';
    $('feas').innerHTML = '<span class="badge ' + (feas.castReady ? 'ok' : 'bad') + '">' + (feas.castReady ? 'CAST READY' : 'NEEDS REVIEW') + '</span>' +
      ' <span style="color:var(--muted);font-size:11px;float:right">Feasibility ' + feas.score + '%</span>' +
      '<div class="bar"><i style="width:' + feas.score + '%;background:' + (feas.score >= 80 ? 'var(--ok)' : feas.score >= 55 ? 'var(--warn)' : 'var(--err)') + '"></i></div>' +
      (feas.issues.length ? '<ul class="issues">' + feas.issues.map((i) => '<li class="' + i.level + '">' + i.text + '</li>').join('') + '</ul>'
        : '<div style="color:var(--muted);font-size:11.5px">All manufacturing checks pass.</div>');
  };

  /* ----- AI assistant ----- */
  const examples = [['Example 1', '2.5ct emerald cut in platinum with a hidden halo'], ['Example 2', 'delicate 1ct oval, rose gold, pavé band'], ['Example 3', 'bold 3ct cushion, bezel, flat band, 18k white gold'],
    ['Pendant', 'heart shaped pendant with a 1ct round diamond, hidden halo, 14k rose gold'], ['Name plate', 'gold name plate for a bracelet saying "Maya", pill shape, serif']];
  examples.forEach(([label, ex]) => {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => { $('ai-prompt').value = ex; runAI(); }); $('ai-examples').appendChild(b);
  });
  function applyConfig(partial) { studio.updateConfig(partial); sync(); }
  // switching product reframes the camera (done by the engine); put the focus button back to its default
  function resetFocus() { const f = $('btn-focus'); f.setAttribute('aria-pressed', 'false'); f.textContent = 'Focus stone'; }
  $('products').addEventListener('click', resetFocus);
  function runAI() {
    const text = $('ai-prompt').value.trim(); if (!text) { toast('Describe what you want to design first'); return; }
    const { config, found } = AurixAI.parsePrompt(text);
    if (!found.length) { toast('Couldn’t find design terms — try a shape, carat or metal'); return; }
    applyConfig(config);
    if (config.product) resetFocus();
    const note = $('ai-note');
    note.textContent = 'Applied: ' + found.join(', ') + '. ' + AurixAI.generateRationale(cfg(), text);
    note.classList.add('show');
    const vars = $('ai-vars'); vars.innerHTML = '';
    AurixAI.generateVariations(cfg()).forEach((v) => {
      const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = v.name;
      b.addEventListener('click', () => { applyConfig(v.config); toast(v.name); }); vars.appendChild(b);
    });
  }
  $('ai-go').addEventListener('click', runAI);
  $('ai-prompt').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAI(); });

  /* ----- header actions ----- */
  const exportStl = (compensate) => {
    const r = studio.exportSTL('aurix-' + SpecSheet.jobNumber(cfg()) + (compensate ? '' : '-true-size') + '.stl', compensate);
    if (!r.triangles) { toast('STL not exported — mesh check failed: ' + r.check.problems.join('; ')); return; }
    toast('Exported STL · ' + r.triangles.toLocaleString() + ' triangles · ' + r.check.shells + ' watertight solids (' + (compensate ? 'shrinkage-compensated' : 'true size') + ', Z-up)');
  };
  $('btn-stl').addEventListener('click', () => exportStl(true));
  $('btn-stl-true').addEventListener('click', () => exportStl(false));
  $('btn-photo').addEventListener('click', () => { studio.captureStudioPhoto(true); toast('Saved 4K transparent render'); });
  $('btn-spec').addEventListener('click', () => { SpecSheet.render(studio, $('spec-host')); $('spec-modal').classList.add('open'); });
  $('spec-close').addEventListener('click', () => $('spec-modal').classList.remove('open'));
  $('spec-print').addEventListener('click', () => window.print());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('spec-modal').classList.remove('open'); });
  $('btn-store').addEventListener('click', (e) => {
    const on = document.body.classList.toggle('store');
    e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = on ? 'Studio view' : 'Storefront view';
    setTimeout(() => studio.resize(), 50);
  });
  $('btn-bag').addEventListener('click', () => toast('Demo storefront — connect your cart to enable checkout'));
  $('btn-share').addEventListener('click', () => {
    const c = cfg(), q = new URLSearchParams({ product: c.product, pshape: c.pendantShape, psize: c.pendantSize, pstone: c.pendantStone ? 1 : 0, text: c.plateText || '', font: c.plateFont, plate: c.plateStyle, shape: c.gemShape, stone: c.stoneType, carat: c.carat, metal: c.metalType, prongs: c.headStyle, halo: c.halo, accents: c.accents, profile: c.profile, size: c.ringSize, rotation: c.stoneRotation });
    const url = location.origin === 'null' ? location.href.split('?')[0] + '?' + q : location.origin + location.pathname + '?' + q;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link copied'), () => toast(url));
  });
  $('btn-focus').addEventListener('click', (e) => {
    const on = !studio.focusStone; studio.focusStone = on;
    studio.orbit.r = on ? 26 : 64; studio.orbit.pol = on ? 1.0 : 1.2;
    studio.target.set(0, on ? studio.geom.yG - 1 : (studio.geom.yG - studio.geom.Rout) * 0.35, 0);
    e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = on ? 'Full ring' : 'Focus stone';
  });
  const rot = $('btn-rotate');
  rot.addEventListener('click', () => { studio.autoRotate = !studio.autoRotate; rot.setAttribute('aria-pressed', studio.autoRotate); rot.textContent = 'Auto-rotate: ' + (studio.autoRotate ? 'on' : 'off'); });
  studio.onUserInteract = () => { if (studio.autoRotate) rot.click(); };

  /* ----- URL parameters ----- */
  const p = new URLSearchParams(location.search), init = {};
  if (['ring', 'pendant', 'nameplate'].includes(p.get('product'))) init.product = p.get('product');
  if (GemstoneLibrary.SHAPES[p.get('pshape')]) init.pendantShape = p.get('pshape');
  if (p.has('psize')) init.pendantSize = Math.min(45, Math.max(14, parseFloat(p.get('psize')) || 22));
  if (p.has('pstone')) init.pendantStone = p.get('pstone') !== '0';
  if (p.has('text')) init.plateText = p.get('text').slice(0, 20);
  if (CADStudio.FONTS[p.get('font')]) init.plateFont = p.get('font');
  if (['rounded', 'pill', 'square'].includes(p.get('plate'))) init.plateStyle = p.get('plate');
  if (GemstoneLibrary.SHAPES[p.get('shape')]) init.gemShape = p.get('shape');
  if (GemstoneLibrary.TYPES[p.get('stone')]) init.stoneType = p.get('stone');
  if (p.has('carat')) init.carat = Math.min(5, Math.max(0.3, parseFloat(p.get('carat')) || 1.5));
  if (PricingEngine.ALLOYS[p.get('metal')]) init.metalType = p.get('metal');
  if (['4-prong', '6-prong', 'double-claw', 'compass', 'bezel'].includes(p.get('prongs'))) init.headStyle = p.get('prongs');
  if (['none', 'hidden', 'classic'].includes(p.get('halo'))) init.halo = p.get('halo');
  if (['none', 'half', 'full'].includes(p.get('accents'))) init.accents = p.get('accents');
  if (['d-shape', 'comfort', 'flat', 'knife'].includes(p.get('profile'))) init.profile = p.get('profile');
  if (p.has('size')) init.ringSize = Math.min(13, Math.max(3, parseFloat(p.get('size')) || 6.5));
  if (p.has('rotation')) init.stoneRotation = Math.min(90, Math.max(-90, parseFloat(p.get('rotation')) || 0));
  if (p.get('mode') === 'store') $('btn-store').click();
  applyConfig(init);
  /* ----- accounts + saved designs (Supabase) ----- */
  let me = null, currentDesignId = null, signingUp = false;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const openModal = (id) => $(id).classList.add('open'), closeModal = (id) => $(id).classList.remove('open');
  const setAuthMode = (up) => {
    signingUp = up;
    $('auth-title').textContent = up ? 'Create your account' : 'Welcome back!';
    $('auth-sub').textContent = up ? 'Join Aurix to save designs and sell them' : 'Sign in to your account to continue';
    $('auth-submit').textContent = up ? 'Create account' : 'Sign in';
    $('auth-alt-text').textContent = up ? 'Already have an account?' : 'Don’t have an account?';
    $('auth-switch').textContent = up ? 'Sign in' : 'Sign up';
    $('auth-pass').autocomplete = up ? 'new-password' : 'current-password';
    $('auth-err').textContent = '';
  };
  AurixCloud.onAuth((u) => {
    me = u; currentDesignId = null;
    $('who').textContent = u ? u.email : '';
    $('btn-account').textContent = u ? 'Sign out' : 'Sign in';
    $('btn-designs').hidden = !u;
  });
  AurixCloud.user().then((u) => { me = u; });
  $('btn-account').addEventListener('click', () => {
    if (me) { AurixCloud.signOut().then(() => toast('Signed out')); return; }
    setAuthMode(false); openModal('auth-modal'); $('auth-email').focus();
  });
  $('auth-switch').addEventListener('click', () => setAuthMode(!signingUp));
  $('auth-eye').addEventListener('click', (e) => {
    const show = $('auth-pass').type === 'password'; $('auth-pass').type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Hide' : 'Show'; e.currentTarget.setAttribute('aria-pressed', show); e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  $('auth-close').addEventListener('click', () => closeModal('auth-modal'));
  $('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('auth-email').value.trim(), pass = $('auth-pass').value;
    try {
      if (signingUp) {
        await AurixCloud.signUp(email, pass);
        toast('Account created');
      } else { await AurixCloud.signIn(email, pass); toast('Signed in'); }
      closeModal('auth-modal'); $('auth-pass').value = '';
    } catch (err) { $('auth-err').textContent = err.message; }
  });
  $('btn-save').addEventListener('click', async () => {
    if (!me) { toast('Sign in to save designs'); setAuthMode(false); openModal('auth-modal'); return; }
    const c = cfg(), price = PricingEngine.calculateCostBreakdown(c, studio.metrics).retail;
    const name = currentDesignId ? undefined : (prompt('Name this design', c.product === 'nameplate' ? ((c.plateText || 'Name') + ' name plate') : c.product === 'pendant' ? (GemstoneLibrary.SHAPES[c.pendantShape].label + ' pendant') : (GemstoneLibrary.SHAPES[c.gemShape].label + ' ' + c.carat + 'ct ring')) || '').trim();
    if (name === '') return;
    try {
      currentDesignId = await AurixCloud.saveDesign(name || 'Untitled design', c, price, currentDesignId);
      toast('Design saved');
    } catch (err) { toast('Couldn’t save: ' + err.message); }
  });
  async function showDesigns() {
    const list = $('designs-list'); list.textContent = 'Loading…'; openModal('designs-modal');
    try {
      const rows = await AurixCloud.listDesigns();
      list.innerHTML = rows.length ? '' : '<p class="hint">No saved designs yet.</p>';
      rows.forEach((r) => {
        const item = document.createElement('div'); item.className = 'design-item';
        item.innerHTML = '<div class="meta"><b>' + esc(r.name) + '</b><span>' + esc(PricingEngine.fmt(r.retail_price || 0)) + ' · ' + new Date(r.updated_at).toLocaleDateString() + '</span></div>' +
          '<button class="btn" data-act="open">Open</button><button class="btn" data-act="del">Delete</button>';
        item.querySelector('[data-act=open]').addEventListener('click', () => {
          applyConfig({ ...CADStudio.DEFAULTS, ...r.config }); currentDesignId = r.id; closeModal('designs-modal'); toast('Opened ' + r.name);
        });
        item.querySelector('[data-act=del]').addEventListener('click', async () => {
          try { await AurixCloud.deleteDesign(r.id); if (currentDesignId === r.id) currentDesignId = null; item.remove(); }
          catch (err) { toast('Couldn’t delete: ' + err.message); }
        });
        list.appendChild(item);
      });
    } catch (err) { list.textContent = 'Couldn’t load designs: ' + err.message; }
  }
  $('btn-designs').addEventListener('click', showDesigns);
  $('designs-close').addEventListener('click', () => closeModal('designs-modal'));

  AurixMarketplace.init({ studio, $, toast, applyConfig, getUser: () => me, openAuth: () => { setAuthMode(false); openModal('auth-modal'); } });

  AurixShop.init({ $, toast, openAuth: () => { setAuthMode(false); openModal('auth-modal'); } });

  window.aurix = studio; // handy for debugging in the console
})();
