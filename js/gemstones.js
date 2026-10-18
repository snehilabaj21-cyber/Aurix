/* Aurix — faceted gemstone geometry generators (10 cuts).
   Coordinates: girdle plane at y=0, table faces +Y, culet points -Y.
   Length runs along X, width along Z. 1 unit = 1 mm. */
const GemstoneLibrary = (() => {
  const SHAPES = {
    round:    { label: 'Round',    ratio: 1.0,  k: 0.0061, dr: 0.615, style: 'brilliant' },
    oval:     { label: 'Oval',     ratio: 1.35, k: 0.0062, dr: 0.58,  style: 'brilliant' },
    emerald:  { label: 'Emerald',  ratio: 1.45, k: 0.0092, dr: 0.60,  style: 'step' },
    princess: { label: 'Princess', ratio: 1.0,  k: 0.0083, dr: 0.70,  style: 'brilliant' },
    cushion:  { label: 'Cushion',  ratio: 1.1,  k: 0.0081, dr: 0.62,  style: 'brilliant' },
    pear:     { label: 'Pear',     ratio: 1.55, k: 0.0060, dr: 0.58,  style: 'brilliant' },
    radiant:  { label: 'Radiant',  ratio: 1.3,  k: 0.0083, dr: 0.64,  style: 'brilliant' },
    marquise: { label: 'Marquise', ratio: 2.0,  k: 0.0056, dr: 0.58,  style: 'brilliant' },
    heart:    { label: 'Heart',    ratio: 1.0,  k: 0.0059, dr: 0.58,  style: 'brilliant' },
    asscher:  { label: 'Asscher',  ratio: 1.0,  k: 0.0092, dr: 0.68,  style: 'step' }
  };
  // Stone species. sg = specific gravity (carat weight scales with it), tint = body color,
  // price = indicative $ for a 1 ct stone of good quality, exp = price-vs-carat exponent.
  const TYPES = {
    diamond:   { label: 'Diamond',          tint: 0xffffff, sg: 3.52, ior: 2.42, price: 3400,  exp: 1.35, graded: true },
    'diamond-yellow': { label: 'Yellow diamond', tint: 0xf6d44a, sg: 3.52, ior: 2.42, price: 5200, exp: 1.35 },
    'diamond-pink':   { label: 'Pink diamond',   tint: 0xf49ac2, sg: 3.52, ior: 2.42, price: 16000, exp: 1.4 },
    sapphire:  { label: 'Blue sapphire',    tint: 0x1b3fb0, sg: 4.00, ior: 1.77, price: 2200,  exp: 1.3 },
    ruby:      { label: 'Ruby',             tint: 0xc8102e, sg: 4.00, ior: 1.77, price: 3500,  exp: 1.35 },
    emerald:   { label: 'Emerald',          tint: 0x0f9a4f, sg: 2.72, ior: 1.58, price: 2800,  exp: 1.3 },
    aquamarine:{ label: 'Aquamarine',       tint: 0x7fd0e6, sg: 2.72, ior: 1.58, price: 650,   exp: 1.15 },
    amethyst:  { label: 'Amethyst',         tint: 0x8d4fd0, sg: 2.65, ior: 1.55, price: 90,    exp: 1.1 },
    morganite: { label: 'Morganite',        tint: 0xf4b5b0, sg: 2.80, ior: 1.59, price: 380,   exp: 1.15 },
    citrine:   { label: 'Citrine',          tint: 0xf5a623, sg: 2.65, ior: 1.55, price: 70,    exp: 1.1 }
  };
  const DIAMOND_SG = 3.52;
  const N = 32;
  const sgn = (v) => (v < 0 ? -1 : 1);

  function superellipse(n, count) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      pts.push([sgn(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 2 / n),
                sgn(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 2 / n)]);
    }
    return pts;
  }
  // subdivide each edge of a polygon so the original corners are kept
  function polySub(verts, count) {
    const per = count / verts.length, pts = [];
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i], b = verts[(i + 1) % verts.length];
      for (let j = 0; j < per; j++) pts.push([a[0] + (b[0] - a[0]) * j / per, a[1] + (b[1] - a[1]) * j / per]);
    }
    return pts;
  }
  function octagon(clip) {
    const c = clip;
    return polySub([[1, -1 + c], [1, 1 - c], [1 - c, 1], [-1 + c, 1], [-1, 1 - c], [-1, -1 + c], [-1 + c, -1], [1 - c, -1]]
      .map(([x, z]) => [x, z]), N);
  }
  function rawOutline(shape) {
    switch (shape) {
      case 'round': case 'oval': return superellipse(2, N);
      case 'cushion': return superellipse(3.2, N);
      case 'radiant': return octagon(0.16);
      case 'emerald': return octagon(0.2);
      case 'asscher': return octagon(0.24);
      case 'princess': return polySub([[1, -1], [1, 1], [-1, 1], [-1, -1]], N);
      case 'marquise': {
        const pts = [];
        for (let i = 0; i < N; i++) {
          const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
          pts.push([c, sgn(s) * (1 - Math.pow(Math.abs(c), 1.4))]);
        }
        return pts;
      }
      case 'pear': {
        const pts = [];
        for (let i = 0; i < N; i++) {
          const t = (i / N) * Math.PI * 2, c = Math.cos(t);
          pts.push([c, Math.sin(t) * (1 - 0.5 * c)]);
        }
        return pts;
      }
      case 'heart': {
        const pts = [];
        for (let i = 0; i < N; i++) {
          const t = (i / N) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          pts.push([-y, x]); // tip points toward +X
        }
        return pts;
      }
    }
    return superellipse(2, N);
  }

  // Outline fitted to an L x W bounding box, centred, wound consistently.
  function getOutline(shape, L, W) {
    const pts = rawOutline(shape);
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    pts.forEach(([x, z]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); });
    let out = pts.map(([x, z]) => [((x - (minx + maxx) / 2) / (maxx - minx)) * L, ((z - (minz + maxz) / 2) / (maxz - minz)) * W]);
    let area = 0;
    for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) out = out.reverse();
    return out;
  }

  // Carat formulas are for diamond (SG 3.52); denser stones are smaller per carat, lighter ones larger.
  function getDimensionsForCarat(shape, carat, stone = 'diamond') {
    const s = SHAPES[shape] || SHAPES.round;
    const sgRatio = (TYPES[stone] || TYPES.diamond).sg / DIAMOND_SG;
    const width = Math.cbrt(carat / (s.k * sgRatio * s.dr * s.ratio));
    return { length: width * s.ratio, width, depth: width * s.dr };
  }
  function estimateCarat(shape, L, W, D) { return L * W * D * (SHAPES[shape] || SHAPES.round).k; }

  function createGemstoneGeometry(shape, L, W, D) {
    const def = SHAPES[shape] || SHAPES.round;
    const base = getOutline(shape, L, W);
    const g = 0.02 * D, hc = 0.2 * D, hp = 0.76 * D;
    const step = def.style === 'step';
    const culet = shape === 'emerald' ? { sx: 0.85, sz: 0.04 } : { sx: 0.04, sz: 0.04 };
    const crown = step
      ? [{ s: 1, y: g }, { s: 0.9, y: g + 0.4 * hc }, { s: 0.79, y: g + 0.72 * hc }, { s: 0.68, y: g + hc }]
      : [{ s: 1, y: g }, { s: 0.86, y: g + 0.45 * hc, zig: true }, { s: 0.58, y: g + hc }];
    const pav = step
      ? [{ s: 1, y: -g }, { s: 0.82, y: -g - 0.3 * hp }, { s: 0.58, y: -g - 0.62 * hp }, { s: 1, y: -g - hp, c: true }]
      : [{ s: 1, y: -g }, { s: 0.52, y: -g - 0.55 * hp, zig: true }, { s: 1, y: -g - hp, c: true }];
    const ring = (r) => base.map(([x, z], i) => {
      const f = r.zig && i % 2 ? 0.93 : 1;
      const sx = r.c ? culet.sx : r.s * f, sz = r.c ? culet.sz : r.s * f;
      return [x * sx, r.y, z * sz];
    });
    const pos = [];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    // quad strip: lower ring -> upper ring, wound outward
    const band = (lo, up) => {
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        if (i % 2) { tri(lo[i], up[j], lo[j]); tri(lo[i], up[i], up[j]); }
        else { tri(lo[i], up[i], lo[j]); tri(lo[j], up[i], up[j]); }
      }
    };
    const lowerG = ring({ s: 1, y: -g }), upperG = ring({ s: 1, y: g });
    band(lowerG, upperG);
    let prev = upperG;
    crown.slice(1).forEach((r) => { const cur = ring(r); band(prev, cur); prev = cur; });
    for (let i = 0; i < N; i++) tri([0, prev[0][1], 0], prev[(i + 1) % N], prev[i]); // table fan, faces +Y
    let below = lowerG;
    pav.slice(1).forEach((r) => { const cur = ring(r); band(cur, below); below = cur; });
    for (let i = 0; i < N; i++) tri([0, below[0][1], 0], below[i], below[(i + 1) % N]); // culet fan, faces -Y

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    geo.userData = { crownHeight: g + hc, pavilionHeight: g + hp };
    return geo;
  }

  return { SHAPES, TYPES, getOutline, getDimensionsForCarat, estimateCarat, createGemstoneGeometry };
})();
