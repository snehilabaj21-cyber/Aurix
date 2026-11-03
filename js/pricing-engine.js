/* Aurix — quoting & manufacturing-feasibility engine.
   All market rates below are INDICATIVE placeholders, not live feeds.
   Edit SPOT to match your supplier's current rates. */
const PricingEngine = (() => {
  // $/gram of fine metal (indicative)
  const SPOT = { gold: 130, platinum: 48, silver: 1.6 };

  const ALLOYS = {
    '18k-yellow': { label: '18K Yellow Gold', density: 15.58, shrink: 0.022, purity: 0.75, base: 'gold', color: 0xe6b85c },
    '14k-yellow': { label: '14K Yellow Gold', density: 13.07, shrink: 0.020, purity: 0.585, base: 'gold', color: 0xe3b455 },
    '18k-white':  { label: '18K White Gold',  density: 14.70, shrink: 0.023, purity: 0.75, base: 'gold', color: 0xe9e7e1 },
    '14k-white':  { label: '14K White Gold',  density: 12.90, shrink: 0.021, purity: 0.585, base: 'gold', color: 0xe4e2dc },
    'rose':       { label: '14K Rose Gold',   density: 14.90, shrink: 0.022, purity: 0.585, base: 'gold', color: 0xe8a98f },
    'platinum-950': { label: 'Platinum 950',  density: 21.45, shrink: 0.028, purity: 0.95, base: 'platinum', color: 0xdcdcdc },
    'silver-925': { label: 'Sterling Silver 925', density: 10.36, shrink: 0.018, purity: 0.925, base: 'silver', color: 0xd9d9dc }
  };
  const COLOR_F = { D: 1.25, E: 1.15, F: 1.08, G: 1.0, H: 0.9, I: 0.82 };
  const CLARITY_F = { FL: 1.45, IF: 1.3, VVS1: 1.18, VVS2: 1.1, VS1: 1.0, VS2: 0.93, SI1: 0.82 };
  const SHAPE_F = { round: 1.12, oval: 1.0, emerald: 0.95, princess: 0.92, cushion: 0.93, pear: 0.93, radiant: 0.9, marquise: 0.88, heart: 0.9, asscher: 0.93 };
  const BEAD_STONE = 14, BEAD_LABOR = 6.5;
  const KEYSTONE = 2.15;

  const WEIGHT_TO_DWT = 1 / 1.55517;

  function calculateCostBreakdown(cfg, metrics) {
    const a = ALLOYS[cfg.metalType];
    const metalG = metrics.weightG;
    const rate = SPOT[a.base] * a.purity * 1.06; // 6% alloying / refining margin
    const metal = metalG * rate;
    const casting = metal * 0.15 + 95; // spruing/casting loss + lost-wax casting & polish
    const product = cfg.product || 'ring';
    const hasStone = product === 'ring' || (product === 'pendant' && cfg.pendantStone);
    const type = GemstoneLibrary.TYPES[cfg.stoneType] || GemstoneLibrary.TYPES.diamond;
    const graded = type.graded; // only white diamonds use the D–I color scale
    const diamond = !hasStone ? 0 : type.price * Math.pow(cfg.carat, type.exp) * (graded ? (COLOR_F[cfg.color] || 1) : 1) * (CLARITY_F[cfg.clarity] || 1) * (SHAPE_F[cfg.gemShape] || 1);
    const beads = metrics.beadCount;
    const pave = beads * (BEAD_STONE + BEAD_LABOR);
    const letters = product === 'ring' ? 0 : ((cfg.plateText || '').replace(/\s/g, '').length);
    const lettered = product === 'nameplate' || (product === 'pendant' && !cfg.pendantStone);
    const setting = product === 'ring' ? 65 + (cfg.halo !== 'none' ? 40 : 0) + (cfg.headStyle === 'bezel' ? 30 : 0)
      : (hasStone ? 65 + (cfg.halo !== 'none' ? 40 : 0) + 30 : 30) + (lettered ? 4 * letters : 0) + (product === 'nameplate' && cfg.plateLoops === 'both' ? 12 : 0);
    const wholesale = metal + casting + diamond + pave + setting;
    const lines = [
      ['Metal (' + a.label + ', ' + metalG.toFixed(2) + ' g)', metal],
      ['Casting overhead & finishing', casting]
    ];
    if (hasStone) lines.push(['Center ' + type.label.toLowerCase() + ' (' + cfg.carat.toFixed(2) + ' ct' + (graded ? ' ' + cfg.color : '') + '/' + cfg.clarity + ')', diamond]);
    if (product === 'ring' || beads) lines.push(['Pavé / halo stones (' + beads + ')', pave]);
    lines.push([lettered ? 'Assembly & lettering finish' : product === 'pendant' ? 'Setting & bail labor' : 'Setting labor', setting]);
    return { lines, wholesale, retail: wholesale * KEYSTONE };
  }

  // Pendants and name plates: thin metal, lettering that is too fine to cast, stone that will not fit the pendant.
  function checkProductFeasibility(cfg, metrics) {
    const issues = [], plate = metrics && metrics.plate;
    let score = 100;
    const th = cfg.product === 'pendant' ? cfg.pendantThickness : cfg.plateThickness;
    if (th < 1.0) { issues.push({ level: 'error', text: 'Metal thinner than 1.0 mm risks porosity and bending.' }); score -= 40; }
    else if (th < 1.3) { issues.push({ level: 'warn', text: 'Thin metal — consider ≥1.3 mm for durability.' }); score -= 8; }
    const lettered = cfg.product === 'nameplate' || !cfg.pendantStone;
    if (lettered && (cfg.plateText || '').trim()) {
      if (cfg.textSize < 3) { issues.push({ level: 'warn', text: 'Letters under 3 mm tall may fill in when cast.' }); score -= 12; }
      if (cfg.textRaise < 0.5) { issues.push({ level: 'warn', text: 'Lettering raised less than 0.5 mm loses definition after polishing.' }); score -= 10; }
      if (metrics && metrics.textMissing) { issues.push({ level: 'warn', text: 'Typeface still loading (or unavailable offline) — lettering not shown yet.' }); score -= 10; }
    }
    if (cfg.product === 'nameplate') {
      if (cfg.textSize + 3 > cfg.plateHeight) { issues.push({ level: 'error', text: 'Plate is too short for this letter height — increase plate height or shrink the text.' }); score -= 30; }
      if (plate && plate.width > 50) { issues.push({ level: 'warn', text: 'Plate is ' + plate.width.toFixed(0) + ' mm long — over ~50 mm sits awkwardly on a wrist.' }); score -= 10; }
      if (!(cfg.plateText || '').trim()) { issues.push({ level: 'warn', text: 'No text yet.' }); score -= 10; }
    } else if (cfg.pendantStone) {
      if (metrics && metrics.fits === false) { issues.push({ level: 'error', text: 'Stone and setting do not fit inside the pendant — enlarge the pendant or reduce the carat.' }); score -= 30; }
      if (cfg.prongThickness < 0.5) { issues.push({ level: 'warn', text: 'Bezel wall is very thin.' }); score -= 8; }
    }
    score = Math.max(0, score);
    return { score, issues, castReady: !issues.some((i) => i.level === 'error') && score >= 80 };
  }

  function checkManufacturingFeasibility(cfg, metrics) {
    if (cfg.product === 'pendant' || cfg.product === 'nameplate') return checkProductFeasibility(cfg, metrics);
    const issues = [];
    let score = 100;
    if (cfg.bandThickness < 0.85) { issues.push({ level: 'error', text: 'Band thickness under 0.85 mm risks porosity and cracking.' }); score -= 40; }
    else if (cfg.bandThickness < 1.3) { issues.push({ level: 'warn', text: 'Thin band — consider ≥1.3 mm for durability.' }); score -= 8; }
    const need = Math.max(0.5, 0.65 + (cfg.carat - 1) * 0.12);
    if (cfg.headStyle !== 'bezel' && cfg.prongThickness < need) {
      issues.push({ level: 'error', text: 'Prongs under ' + need.toFixed(2) + ' mm are too slim to hold a ' + cfg.carat.toFixed(2) + ' ct stone securely.' });
      score -= 30;
    }
    if (cfg.accents !== 'none' && cfg.bandWidth < 2.0) { issues.push({ level: 'error', text: 'Band is too narrow (<2.0 mm) to set pavé stones.' }); score -= 30; }
    if (cfg.accents !== 'none' && cfg.profile === 'knife') { issues.push({ level: 'warn', text: 'Knife-edge band leaves little metal beneath pavé beads.' }); score -= 12; }
    if (cfg.carat > 3 && cfg.bandThickness < 1.8) { issues.push({ level: 'warn', text: 'Large stone: a heavier shank (≥1.8 mm) is recommended.' }); score -= 8; }
    score = Math.max(0, score);
    const castReady = !issues.some((i) => i.level === 'error') && score >= 80;
    return { score, issues, castReady };
  }

  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
  return { ALLOYS, SPOT, WEIGHT_TO_DWT, calculateCostBreakdown, checkManufacturingFeasibility, fmt };
})();
