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
    const feas = PricingEngine.checkManufacturingFeasibility(cfg, m);
    const cost = PricingEngine.calculateCostBreakdown(cfg, m);
    const shape = GemstoneLibrary.SHAPES[cfg.gemShape].label;
    const row = (k, v) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
    const product = cfg.product || 'ring';
    const stone = GemstoneLibrary.TYPES[cfg.stoneType];
    const stoneRows = () => row('Center stone', cfg.carat.toFixed(2) + ' ct ' + stone.label + ' ' + shape + (stone.graded ? ' · ' + cfg.color : '') + ' / ' + cfg.clarity) +
      row('Stone dimensions', m.dims.length.toFixed(2) + ' × ' + m.dims.width.toFixed(2) + ' × ' + m.dims.depth.toFixed(2) + ' mm');
    const metalRows = row('Alloy', a.label) +
      row('Net metal weight', m.weightG.toFixed(2) + ' g · ' + m.weightDwt.toFixed(2) + ' dwt') +
      row('Casting shrinkage comp.', '+' + (a.shrink * 100).toFixed(1) + '%');
    const footRows = row('Casting check', (feas.castReady ? 'CAST READY' : 'REVIEW NEEDED') + ' · ' + feas.score + '%') +
      row('Est. wholesale', PricingEngine.fmt(cost.wholesale));
    const plateDims = m.plate ? m.plate.width.toFixed(1) + ' × ' + m.plate.height.toFixed(1) + ' × ' + m.plate.thickness.toFixed(1) + ' mm' : '';
    const lettering = cfg.plateText ? esc(cfg.plateText) : '—';
    let tables;
    if (product === 'nameplate') {
      tables = [metalRows + row('Plate', cfg.plateStyle + ' · ' + plateDims) + row('Bracelet loops', cfg.plateLoops === 'both' ? 'Jump ring at each end' : 'None'),
        row('Lettering', lettering) + row('Typeface', CADStudio.FONTS[cfg.plateFont].label) +
        row('Letter height / relief', cfg.textSize.toFixed(1) + ' mm caps · raised ' + cfg.textRaise.toFixed(1) + ' mm') + footRows];
    } else if (product === 'pendant') {
      tables = [metalRows + row('Pendant', GemstoneLibrary.SHAPES[cfg.pendantShape].label + ' · ' + plateDims) + row('Bail', cfg.bail === 'loop' ? 'Fixed loop, inner Ø ~3.2 mm' : 'None'),
        (cfg.pendantStone ? stoneRows() + row('Setting', 'bezel · wall ' + Math.max(0.6, cfg.prongThickness * 0.7).toFixed(2) + ' mm') + row('Halo', cfg.halo + ' (' + m.beadCount + ' small stones)')
          : row('Center stone', 'None') + row('Lettering', lettering + ' · ' + CADStudio.FONTS[cfg.plateFont].label)) + footRows];
    } else {
      tables = [metalRows +
        row('Finger size', 'US ' + cfg.ringSize + ' · inner Ø ' + m.innerDiameter.toFixed(2) + ' mm') +
        row('Band', cfg.profile + ' · ' + cfg.bandWidth.toFixed(1) + ' mm wide × ' + cfg.bandThickness.toFixed(1) + ' mm') +
        row('Engraving', cfg.engraving ? esc(cfg.engraving) : '—'),
        stoneRows() +
        row('Head', cfg.headStyle + ' · prong Ø ' + cfg.prongThickness.toFixed(2) + ' mm') +
        row('Halo / pavé', cfg.halo + ' / ' + cfg.accents + ' (' + m.beadCount + ' small stones)') + footRows];
    }
    host.innerHTML =
      '<div class="spec-page">' +
      '<header><div><h2>AURIX — Jeweler\'s Specification</h2><p>Job traveler · ' + new Date().toLocaleDateString() + '</p></div>' +
      '<div class="job"><b>' + job + '</b>' + barcode(job) + '</div></header>' +
      '<div class="spec-views">' + views.map((v) => '<figure><img alt="' + v.name + '" src="' + v.url + '"><figcaption>' + v.name + '</figcaption></figure>').join('') + '</div>' +
      '<div class="spec-tables"><table>' + tables[0] + '</table><table>' + tables[1] + '</table></div>' +
      (feas.issues.length ? '<ul class="spec-issues">' + feas.issues.map((i) => '<li>' + esc(i.text) + '</li>').join('') + '</ul>' : '') +
      '<footer><div class="sig">Goldsmith QA approval<span></span></div><div class="sig">Date<span></span></div><div class="sig">' + (product === 'ring' || cfg.pendantStone ? 'Stone setter' : 'Polisher') + '<span></span></div></footer>' +
      '<p class="note">Weight is estimated from the digital model (overlapping solids counted once per part). Verify against the printed wax before casting.</p>' +
      '</div>';
  }
  return { render, jobNumber };
})();
