/* Aurix — printable jeweler's specification blueprint (job traveler). */
const SpecSheet = (() => {
  function jobNumber(cfg) {
    const s = JSON.stringify(cfg); let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'AX-' + h.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
  }
  function barcode(job) {
    let bits = '';
    for (const ch of job) bits += ch.charCodeAt(0).toString(2).padStart(8, '0');
    return '<div class="barcode">' + [...bits].map((b) => '<i class="' + (b === '1' ? 'b1' : 'b0') + '"></i>').join('') + '</div>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function render(studio, host) {
    const cfg = studio.config, m = studio.metrics, a = PricingEngine.ALLOYS[cfg.metalType];
    const job = jobNumber(cfg), views = studio.snapshotViews();
    const feas = PricingEngine.checkManufacturingFeasibility(cfg);
    const cost = PricingEngine.calculateCostBreakdown(cfg, m);
    const shape = GemstoneLibrary.SHAPES[cfg.gemShape].label;
    const row = (k, v) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
    host.innerHTML =
      '<div class="spec-page">' +
      '<header><div><h2>AURIX — Jeweler\'s Specification</h2><p>Job traveler · ' + new Date().toLocaleDateString() + '</p></div>' +
      '<div class="job"><b>' + job + '</b>' + barcode(job) + '</div></header>' +
      '<div class="spec-views">' + views.map((v) => '<figure><img alt="' + v.name + '" src="' + v.url + '"><figcaption>' + v.name + '</figcaption></figure>').join('') + '</div>' +
      '<div class="spec-tables"><table>' +
      row('Alloy', a.label) +
      row('Net metal weight', m.weightG.toFixed(2) + ' g · ' + m.weightDwt.toFixed(2) + ' dwt') +
      row('Casting shrinkage comp.', '+' + (a.shrink * 100).toFixed(1) + '%') +
      row('Finger size', 'US ' + cfg.ringSize + ' · inner Ø ' + m.innerDiameter.toFixed(2) + ' mm') +
      row('Band', cfg.profile + ' · ' + cfg.bandWidth.toFixed(1) + ' mm wide × ' + cfg.bandThickness.toFixed(1) + ' mm') +
      row('Engraving', cfg.engraving ? esc(cfg.engraving) : '—') +
      '</table><table>' +
      row('Center stone', cfg.carat.toFixed(2) + ' ct ' + GemstoneLibrary.TYPES[cfg.stoneType].label + ' ' + shape + (GemstoneLibrary.TYPES[cfg.stoneType].graded ? ' · ' + cfg.color : '') + ' / ' + cfg.clarity) +
      row('Stone dimensions', m.dims.length.toFixed(2) + ' × ' + m.dims.width.toFixed(2) + ' × ' + m.dims.depth.toFixed(2) + ' mm') +
      row('Head', cfg.headStyle + ' · prong Ø ' + cfg.prongThickness.toFixed(2) + ' mm') +
      row('Halo / pavé', cfg.halo + ' / ' + cfg.accents + ' (' + m.beadCount + ' small stones)') +
      row('Casting check', (feas.castReady ? 'CAST READY' : 'REVIEW NEEDED') + ' · ' + feas.score + '%') +
      row('Est. wholesale', PricingEngine.fmt(cost.wholesale)) +
      '</table></div>' +
      (feas.issues.length ? '<ul class="spec-issues">' + feas.issues.map((i) => '<li>' + esc(i.text) + '</li>').join('') + '</ul>' : '') +
      '<footer><div class="sig">Goldsmith QA approval<span></span></div><div class="sig">Date<span></span></div><div class="sig">Stone setter<span></span></div></footer>' +
      '<p class="note">Weight is estimated from the digital model (overlapping solids counted once per part). Verify against the printed wax before casting.</p>' +
      '</div>';
  }
  return { render, jobNumber };
})();
