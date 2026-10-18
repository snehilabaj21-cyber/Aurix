/* Aurix — UI wiring, telemetry HUD, URL params. */
(() => {
  const $ = (id) => document.getElementById(id);
  const studio = new CADStudio($('viewport'));
  const cfg = () => studio.config;
  let toastTimer;
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ----- build controls ----- */
  const shapesEl = $('shapes');
  Object.entries(GemstoneLibrary.SHAPES).forEach(([key, def]) => {
    const o = GemstoneLibrary.getOutline(key, 24, 24 / def.ratio);
    const pts = o.map(([x, z]) => (15 + x * 0.5 * (key === 'round' ? 1 : 1)).toFixed(1) + ',' + (15 + z * 0.5).toFixed(1));
    const b = document.createElement('button');
    b.className = 'shape'; b.dataset.shape = key; b.type = 'button';
    b.innerHTML = '<svg viewBox="0 0 30 30" aria-hidden="true"><polygon points="' + pts.join(' ') + '"/></svg>' + def.label;
    b.addEventListener('click', () => studio.updateConfig({ gemShape: key }) || sync());
    shapesEl.appendChild(b);
  });
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
  chipGroup('profiles', [['d-shape', 'D-shape'], ['comfort', 'Comfort fit'], ['flat', 'Flat'], ['knife', 'Knife edge']], 'profile');

  Object.entries(PricingEngine.ALLOYS).forEach(([key, a]) => {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.dataset.val = key; b.title = a.label; b.setAttribute('aria-label', a.label);
    b.style.background = 'linear-gradient(135deg,#fff8 0%,#' + a.color.toString(16).padStart(6, '0') + ' 45%,#0003 100%), #' + a.color.toString(16).padStart(6, '0');
    b.addEventListener('click', () => { studio.updateConfig({ metalType: key }); sync(); });
    $('metals').appendChild(b);
  });

  const sliders = [['carat', 'carat', 2, ' ct'], ['prong', 'prongThickness', 2, ' mm'], ['thick', 'bandThickness', 1, ' mm'], ['width', 'bandWidth', 1, ' mm'], ['size', 'ringSize', 1, ''], ['rot', 'stoneRotation', 0, '°']];
  $('rot-ns').addEventListener('click', () => { studio.updateConfig({ stoneRotation: 0 }); sync(); });
  $('rot-ew').addEventListener('click', () => { studio.updateConfig({ stoneRotation: 90 }); sync(); });
  sliders.forEach(([id, key, dec, unit]) => {
    $(id).addEventListener('input', (e) => { studio.updateConfig({ [key]: parseFloat(e.target.value) }); $(id + '-o').textContent = parseFloat(e.target.value).toFixed(dec) + unit; });
  });
  ['color', 'clarity', 'halo', 'accents'].forEach((id) => $(id).addEventListener('change', (e) => studio.updateConfig({ [id]: e.target.value })));
  $('engrave').addEventListener('input', (e) => { studio.updateConfig({ engraving: e.target.value }); });

  /* reflect config into the controls */
  function sync() {
    const c = cfg();
    document.querySelectorAll('.shape').forEach((b) => b.setAttribute('aria-pressed', b.dataset.shape === c.gemShape));
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
    const c = cfg(), cost = PricingEngine.calculateCostBreakdown(c, m), feas = PricingEngine.checkManufacturingFeasibility(c);
    $('price').textContent = PricingEngine.fmt(cost.retail);
    $('m-weight').textContent = m.weightG.toFixed(2) + ' g · ' + m.weightDwt.toFixed(2) + ' dwt';
    $('m-stone').textContent = m.dims.length.toFixed(1) + ' × ' + m.dims.width.toFixed(1) + ' mm';
    $('m-size').textContent = 'US ' + c.ringSize + ' · Ø ' + m.innerDiameter.toFixed(1) + ' mm';
    $('breakdown').innerHTML = cost.lines.map(([k, v]) => '<tr><td>' + k + '</td><td>' + PricingEngine.fmt(v) + '</td></tr>').join('') +
      '<tr><td><b>Wholesale</b></td><td><b>' + PricingEngine.fmt(cost.wholesale) + '</b></td></tr>';
    $('feas').innerHTML = '<span class="badge ' + (feas.castReady ? 'ok' : 'bad') + '">' + (feas.castReady ? 'CAST READY' : 'NEEDS REVIEW') + '</span>' +
      ' <span style="color:var(--muted);font-size:11px;float:right">Feasibility ' + feas.score + '%</span>' +
      '<div class="bar"><i style="width:' + feas.score + '%;background:' + (feas.score >= 80 ? 'var(--ok)' : feas.score >= 55 ? 'var(--warn)' : 'var(--err)') + '"></i></div>' +
      (feas.issues.length ? '<ul class="issues">' + feas.issues.map((i) => '<li class="' + i.level + '">' + i.text + '</li>').join('') + '</ul>'
        : '<div style="color:var(--muted);font-size:11.5px">All manufacturing checks pass.</div>');
  };

  /* ----- AI assistant ----- */
  const examples = ['2.5ct emerald cut in platinum with a hidden halo', 'delicate 1ct oval, rose gold, pavé band', 'bold 3ct cushion, bezel, flat band, 18k white gold'];
  examples.forEach((ex, i) => {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = 'Example ' + (i + 1);
    b.addEventListener('click', () => { $('ai-prompt').value = ex; runAI(); }); $('ai-examples').appendChild(b);
  });
  function applyConfig(partial) { studio.updateConfig(partial); sync(); }
  function runAI() {
    const text = $('ai-prompt').value.trim(); if (!text) { toast('Describe the ring you want first'); return; }
    const { config, found } = AurixAI.parsePrompt(text);
    if (!found.length) { toast('Couldn’t find design terms — try a shape, carat or metal'); return; }
    applyConfig(config);
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
  $('btn-stl').addEventListener('click', () => {
    const n = studio.exportSTL('aurix-' + SpecSheet.jobNumber(cfg()) + '.stl', true);
    toast('Exported STL · ' + n.toLocaleString() + ' triangles (shrinkage-compensated)');
  });
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
    const c = cfg(), q = new URLSearchParams({ shape: c.gemShape, stone: c.stoneType, carat: c.carat, metal: c.metalType, prongs: c.headStyle, halo: c.halo, accents: c.accents, profile: c.profile, size: c.ringSize, rotation: c.stoneRotation });
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
  window.aurix = studio; // handy for debugging in the console
})();
