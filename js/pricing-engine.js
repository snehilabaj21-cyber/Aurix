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
    const type = GemstoneLibrary.TYPES[cfg.stoneType] || GemstoneLibrary.TYPES.diamond;
    const graded = type.graded; // only white diamonds use the D–I color scale
    const diamond = type.price * Math.pow(cfg.carat, type.exp) * (graded ? (COLOR_F[cfg.color] || 1) : 1) * (CLARITY_F[cfg.clarity] || 1) * (SHAPE_F[cfg.gemShape] || 1);
    const beads = metrics.beadCount;
    const pave = beads * (BEAD_STONE + BEAD_LABOR);
    const setting = 65 + (cfg.halo !== 'none' ? 40 : 0) + (cfg.headStyle === 'bezel' ? 30 : 0);
    const wholesale = metal + casting + diamond + pave + setting;
    return {
      lines: [
        ['Metal (' + a.label + ', ' + metalG.toFixed(2) + ' g)', metal],
        ['Casting overhead & finishing', casting],
        ['Center ' + type.label.toLowerCase() + ' (' + cfg.carat.toFixed(2) + ' ct' + (graded ? ' ' + cfg.color : '') + '/' + cfg.clarity + ')', diamond],
        ['Pavé / halo stones (' + beads + ')', pave],
        ['Setting labor', setting]
      ],
      wholesale, retail: wholesale * KEYSTONE
    };
  }

  function checkManufacturingFeasibility(cfg) {
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
