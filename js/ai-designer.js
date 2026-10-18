/* Aurix — natural-language design assistant.
   This is a deterministic, rule-based interpreter (no external model / network). */
const AurixAI = (() => {
  const SHAPE_WORDS = {
    round: ['round', 'brilliant'], oval: ['oval'], emerald: ['emerald cut', 'emerald-cut', 'emerald'], princess: ['princess'],
    cushion: ['cushion'], pear: ['pear', 'teardrop'], radiant: ['radiant'], marquise: ['marquise'], heart: ['heart'], asscher: ['asscher']
  };
  const METAL_WORDS = [
    ['platinum-950', /platinum|plat\b/], ['silver-925', /silver/], ['rose', /rose gold|rose\b|pink gold/],
    ['18k-white', /18\s?k\s*white|18\s?kt?\s*white/], ['14k-white', /14\s?k\s*white|white gold/],
    ['18k-yellow', /18\s?k|18\s?kt/], ['14k-yellow', /14\s?k|14\s?kt|yellow gold|gold/]
  ];
  const PRONG_WORDS = [['double-claw', /double[\s-]?claw|double prong/], ['6-prong', /6[\s-]?prong|six[\s-]?prong/], ['4-prong', /4[\s-]?prong|four[\s-]?prong/],
    ['compass', /compass/], ['bezel', /bezel/]];
  const PROFILE_WORDS = [['knife', /knife/], ['comfort', /comfort/], ['flat', /flat/], ['d-shape', /d[\s-]?shape|domed/]];

  const STONE_WORDS = [['diamond-yellow', /yellow diamond|canary/], ['diamond-pink', /pink diamond/], ['sapphire', /sapphire/], ['ruby', /ruby/],
    ['aquamarine', /aquamarine/], ['amethyst', /amethyst/], ['morganite', /morganite/], ['citrine', /citrine/], ['diamond', /diamond/]];

  function parsePrompt(text) {
    let t = ' ' + text.toLowerCase() + ' ';
    const cfg = {}, found = [];
    // "emerald" is both a cut and a gem: with "cut" it is the shape, on its own it is the stone
    const emeraldCut = /emerald[\s-]?cut/.test(t);
    if (!emeraldCut && /\bemerald\b/.test(t)) { cfg.stoneType = 'emerald'; found.push('Emerald'); t = t.replace(/\bemerald\b/g, ' '); }
    for (const [key, re] of STONE_WORDS) if (cfg.stoneType === undefined && re.test(t)) { cfg.stoneType = key; found.push(GemstoneLibrary.TYPES[key].label); break; }
    for (const [shape, words] of Object.entries(SHAPE_WORDS)) {
      if (words.some((w) => t.includes(w))) { cfg.gemShape = shape; found.push(GemstoneLibrary.SHAPES[shape].label + ' cut'); break; }
    }
    let m = t.match(/(\d+(?:\.\d+)?)\s*(?:-|\s)?\s*(?:ct|carat|cts|carats)\b/);
    if (!m) m = t.match(/(\d+(?:\.\d+)?)\s*(?:ct|carat)/);
    if (m) { cfg.carat = Math.min(5, Math.max(0.3, parseFloat(m[1]))); found.push(cfg.carat + ' ct'); }
    for (const [key, re] of METAL_WORDS) if (re.test(t)) { cfg.metalType = key; found.push(PricingEngine.ALLOYS[key].label); break; }
    for (const [key, re] of PRONG_WORDS) if (re.test(t)) { cfg.headStyle = key; found.push(key.replace('-', ' ')); break; }
    if (/hidden halo/.test(t)) { cfg.halo = 'hidden'; found.push('hidden halo'); }
    else if (/halo/.test(t)) { cfg.halo = 'classic'; found.push('halo'); }
    if (/(solitaire|no halo|plain)/.test(t) && !cfg.halo) cfg.halo = 'none';
    if (/(full|eternity)\s*(pav|band)|pav[eé]\s*all|all the way/.test(t)) { cfg.accents = 'full'; found.push('full pavé'); }
    else if (/pav[eé]|accent|diamond band|diamond-set/.test(t)) { cfg.accents = 'half'; found.push('half pavé'); }
    for (const [key, re] of PROFILE_WORDS) if (re.test(t)) { cfg.profile = key; found.push(key + ' band'); break; }
    if (/thin|delicate|dainty|slim/.test(t)) { cfg.bandThickness = 1.4; cfg.bandWidth = 1.8; found.push('slim band'); }
    if (/chunky|thick|bold/.test(t)) { cfg.bandThickness = 2.4; cfg.bandWidth = 4.5; found.push('bold band'); }
    if (/east[\s-]?west|sideways|horizontal/.test(t)) { cfg.stoneRotation = 90; found.push('east-west stone'); }
    const sz = t.match(/size\s*(\d+(?:\.5)?)/);
    if (sz) { cfg.ringSize = Math.min(13, Math.max(3, parseFloat(sz[1]))); found.push('size ' + cfg.ringSize); }
    const eng = text.match(/engrav\w*\s*(?:with|:)?\s*["“'‘]([^"”'’]+)["”'’]/i);
    if (eng) { cfg.engraving = eng[1].slice(0, 24); found.push('engraving'); }
    return { config: cfg, found };
  }

  function generateRationale(cfg, prompt) {
    const S = GemstoneLibrary.SHAPES[cfg.gemShape].label.toLowerCase();
    const d = GemstoneLibrary.getDimensionsForCarat(cfg.gemShape, cfg.carat);
    const lines = [];
    lines.push('A ' + cfg.carat.toFixed(2) + ' ct ' + S + ' measures about ' + d.length.toFixed(1) + ' × ' + d.width.toFixed(1) + ' mm');
    const light = { round: 'maximum brilliance and fire', princess: 'strong, chunky sparkle', emerald: 'a hall-of-mirrors, glassy flash', asscher: 'deep step-cut glow' }[cfg.gemShape] || 'elongated brilliance that flatters the finger';
    lines[0] += ', delivering ' + light + '.';
    const head = { '4-prong': 'Four prongs maximise visible stone and light entry.', '6-prong': 'Six prongs add security for the stone while keeping the profile classic.',
      'double-claw': 'Double claws add security and a refined, vintage look.', compass: 'Compass prongs on the four points guard the most vulnerable corners.',
      bezel: 'A full bezel gives maximum protection and a clean modern line.' }[cfg.headStyle];
    lines.push(head);
    if (cfg.halo === 'hidden') lines.push('The hidden halo adds a flash of light from the side without changing the front view.');
    if (cfg.halo === 'classic') lines.push('The halo visually enlarges the centre stone and frames it with micro-pavé.');
    if (cfg.accents !== 'none') lines.push('Pavé accents on the shank carry sparkle around the finger.');
    const prof = { 'd-shape': 'A D-shape shank is durable and a dependable default.', comfort: 'A comfort-fit interior makes the ring easy to slide over the knuckle.', flat: 'A flat shank reads as contemporary and architectural.', knife: 'A knife-edge shank sharpens the silhouette and makes the stone look larger.' }[cfg.profile];
    lines.push(prof);
    const feas = PricingEngine.checkManufacturingFeasibility(cfg);
    lines.push(feas.castReady ? 'Casting check: this design is cast-ready.' : 'Casting check: ' + (feas.issues[0] ? feas.issues[0].text : 'review recommended.'));
    return lines.join(' ');
  }

  function generateVariations(cfg) {
    return [
      { name: 'Minimalist Chic', config: { ...cfg, headStyle: '4-prong', halo: 'none', accents: 'none', profile: 'knife', bandThickness: 1.5, bandWidth: 1.9, prongThickness: Math.max(cfg.prongThickness, 0.7) } },
      { name: 'Vintage Romance', config: { ...cfg, headStyle: 'double-claw', halo: 'classic', accents: 'half', profile: 'comfort', bandWidth: Math.max(cfg.bandWidth, 2.4), metalType: cfg.metalType === '18k-white' ? '14k-yellow' : cfg.metalType } },
      { name: 'Modern Architectural', config: { ...cfg, headStyle: 'bezel', halo: 'none', accents: 'none', profile: 'flat', bandThickness: 2.2, bandWidth: 3.6 } },
      { name: 'High-Jewelry Pavé', config: { ...cfg, headStyle: '6-prong', halo: 'hidden', accents: 'full', profile: 'd-shape', bandWidth: Math.max(cfg.bandWidth, 2.6) } }
    ];
  }
  return { parsePrompt, generateRationale, generateVariations };
})();
