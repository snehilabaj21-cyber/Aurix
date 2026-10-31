/* Aurix — parametric 3D ring engine (Three.js).
   Ring lies in the XY plane, finger hole along Z, head on +Y, 1 unit = 1 mm. */
class CADStudio {
  static DEFAULTS = {
    gemShape: 'round', stoneType: 'diamond', carat: 1.5, color: 'G', clarity: 'VS1', metalType: '18k-yellow',
    headStyle: '4-prong', halo: 'none', accents: 'none', profile: 'd-shape',
    bandThickness: 1.8, bandWidth: 2.4, prongThickness: 0.8, ringSize: 6.5, engraving: '', stoneRotation: 0,
    // product: 'ring' | 'pendant' | 'nameplate'. Pendants and name plates lie in the XY plane facing +Z (z = thickness).
    product: 'ring',
    pendantShape: 'round', pendantSize: 22, pendantThickness: 1.6, pendantStone: true, bail: 'loop',
    plateText: 'Aarya', plateFont: 'block', plateStyle: 'rounded', plateHeight: 9, plateThickness: 1.4, plateLoops: 'both',
    textSize: 5, textRaise: 0.8
  };

  // Typeface JSON files shipped with three.js (loaded on demand, then cached for the session).
  static FONTS = {
    block: { label: 'Block', file: 'helvetiker_bold' },
    classic: { label: 'Classic', file: 'optimer_bold' },
    serif: { label: 'Serif', file: 'gentilis_bold' }
  };
  static _fonts = {};

  constructor(container) {
    this.container = container;
    this.config = { ...CADStudio.DEFAULTS };
    this.autoRotate = true;
    this.onBuild = null;
    this.metrics = null;
    this._pending = false;
    this.initScene();
    this.rebuild();
    this.loop();
  }

  /* ---------- scene ---------- */
  initScene() {
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, w / h, 1, 500);
    this.target = new THREE.Vector3(0, 3, 0);
    this.orbit = { az: 0.55, pol: 1.2, r: 64 };
    this.setupEnvironment();

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(30, 60, 40); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 150 });
    key.shadow.radius = 6;
    this.scene.add(key);
    this.key = key;
    const rim = new THREE.DirectionalLight(0xfff0dc, 0.8);
    rim.position.set(-40, 20, -30); this.scene.add(rim);

    this.ring = new THREE.Group();
    this.scene.add(this.ring);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.28 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.bindControls();
    new ResizeObserver(() => this.resize()).observe(this.container);
  }

  setupEnvironment() {
    // Softbox studio reflection map painted on a canvas, prefiltered for PBR.
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#9a9a9f'); grad.addColorStop(0.5, '#2c2b2c'); grad.addColorStop(1, '#0d0d0e');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    const box = (x, y, w, h, a) => { g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.fillRect(x, y, w, h); };
    box(80, 40, 160, 110, 1); box(330, 20, 120, 150, 0.95); box(560, 50, 200, 90, 1); box(830, 30, 130, 130, 0.9);
    box(0, 200, 1024, 14, 0.5); box(180, 270, 90, 60, 0.7); box(700, 280, 120, 50, 0.6);
    // many small hot spots + dark gaps give facets contrasty flashes (sparkle)
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) box(rnd() * 1000, rnd() * 300, 6 + rnd() * 26, 4 + rnd() * 20, 0.6 + rnd() * 0.4);
    for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(rnd() * 1000, rnd() * 400, 30 + rnd() * 60, 20 + rnd() * 50); }
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pm.fromEquirectangular(tex).texture;
    tex.dispose();

    // Gem environment: mostly dark with crisp bright panels, so facets alternate between
    // deep body color and brilliant flashes (what makes cut stones look like stones).
    const gc = document.createElement('canvas'); gc.width = 1024; gc.height = 512;
    const q = gc.getContext('2d');
    q.fillStyle = '#050506'; q.fillRect(0, 0, 1024, 512);
    const gg = q.createLinearGradient(0, 0, 0, 200); gg.addColorStop(0, '#3a3a40'); gg.addColorStop(1, '#050506');
    q.fillStyle = gg; q.fillRect(0, 0, 1024, 200);
    seed = 11;
    for (let i = 0; i < 38; i++) {
      q.fillStyle = 'rgba(255,255,255,' + (0.55 + rnd() * 0.45) + ')';
      q.fillRect(rnd() * 1000, rnd() * 460, 14 + rnd() * 70, 10 + rnd() * 50);
    }
    for (let i = 0; i < 6; i++) { q.fillStyle = 'rgba(255,248,235,1)'; q.fillRect(rnd() * 900, 20 + rnd() * 140, 90 + rnd() * 80, 50 + rnd() * 50); }
    const gtex = new THREE.CanvasTexture(gc);
    gtex.mapping = THREE.EquirectangularReflectionMapping;
    this.gemEnv = pm.fromEquirectangular(gtex).texture;
    gtex.dispose(); pm.dispose();
    this.scene.environment = this.envMap;
  }

  bindControls() {
    const el = this.renderer.domElement;
    const pts = new Map();
    let lastDist = 0;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); this.autoRotate && this.onUserInteract && this.onUserInteract(); });
    el.addEventListener('pointerup', (e) => { pts.delete(e.pointerId); lastDist = 0; });
    el.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); lastDist = 0; });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      if (pts.size === 1) {
        this.orbit.az -= (e.clientX - prev[0]) * 0.008;
        this.orbit.pol = Math.min(Math.PI - 0.05, Math.max(0.05, this.orbit.pol - (e.clientY - prev[1]) * 0.008));
      }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastDist) this.orbit.r = Math.min(140, Math.max(22, this.orbit.r * (lastDist / d)));
        lastDist = d;
      }
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbit.r = Math.min(140, Math.max(22, this.orbit.r * (1 + Math.sign(e.deltaY) * 0.08)));
    }, { passive: false });
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  placeCamera(az = this.orbit.az, pol = this.orbit.pol, r = this.orbit.r) {
    this.camera.position.set(
      this.target.x + r * Math.sin(pol) * Math.sin(az),
      this.target.y + r * Math.cos(pol),
      this.target.z + r * Math.sin(pol) * Math.cos(az));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target);
  }

  loop() {
    const tick = () => {
      if (this.autoRotate) this.orbit.az += 0.004;
      this.placeCamera();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------- config ---------- */
  updateConfig(partial) {
    if (partial.product && partial.product !== this.config.product) this._reframe = true;
    Object.assign(this.config, partial);
    if (this._pending) return;
    this._pending = true;
    requestAnimationFrame(() => { this._pending = false; this.rebuild(); });
  }

  /* ---------- materials ---------- */
  metalMaterial() {
    const a = PricingEngine.ALLOYS[this.config.metalType];
    return new THREE.MeshStandardMaterial({ color: a.color, metalness: 1, roughness: 0.14, envMap: this.envMap, envMapIntensity: 1.35 });
  }
  // Two layers: a mirrored back-face shell (internal reflections, tinted by the stone's body color)
  // and a glassy front layer (surface reflections + color absorption).
  gemMaterials() {
    const type = GemstoneLibrary.TYPES[this.config.stoneType] || GemstoneLibrary.TYPES.diamond;
    const tint = new THREE.Color(type.tint), isDiamond = type.tint === 0xffffff;
    const body = tint.clone();
    // Body color is squared (darkened, more saturated) so the mirrored interior reads as deep gem color, not pastel.
    if (!isDiamond) { body.r *= body.r; body.g *= body.g; body.b *= body.b; body.multiplyScalar(2.2); }
    const light = type.tint >= 0xe0e0e0 || ['aquamarine', 'morganite', 'diamond-pink', 'diamond-yellow', 'citrine'].includes(this.config.stoneType);
    const inner = new THREE.MeshStandardMaterial({
      color: isDiamond ? 0xffffff : body, metalness: 1, roughness: 0.02, side: THREE.BackSide,
      envMap: this.gemEnv, envMapIntensity: isDiamond ? 3.3 : (light ? 2.6 : 2.2), flatShading: true
    });
    const outer = new THREE.MeshPhysicalMaterial({
      color: isDiamond ? 0xffffff : tint, metalness: 0, roughness: 0, transparent: true, opacity: isDiamond ? 0.12 : (light ? 0.28 : 0.4),
      ior: type.ior, specularIntensity: 1, envMap: this.gemEnv, envMapIntensity: isDiamond ? 1.6 : 1.2, flatShading: true, depthWrite: false,
      iridescence: isDiamond ? 0.5 : 0, iridescenceIOR: 1.8
    });
    return { inner, outer };
  }
  beadMaterial() {
    return new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.02, envMap: this.envMap, envMapIntensity: 3 });
  }

  /* ---------- geometry helpers ---------- */
  static ensureOutward(geo) {
    const p = geo.attributes.position, idx = geo.index;
    let v = 0;
    const get = (i) => [p.getX(i), p.getY(i), p.getZ(i)];
    for (let i = 0; i < idx.count; i += 3) {
      const a = get(idx.getX(i)), b = get(idx.getX(i + 1)), c = get(idx.getX(i + 2));
      v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    }
    if (v < 0) {
      for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
      idx.needsUpdate = true;
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Radial sweep of a cross-section around the finger circle (closed, watertight torus).
  buildShankGeometry(Rin, t, w, profile) {
    const SEG = 180, PROF = 40, verts = [], index = [];
    const sup = (x, n) => Math.sign(x) * Math.pow(Math.abs(x), 2 / n);
    const sect = [];
    for (let k = 0; k < PROF; k++) {
      const phi = (k / PROF) * Math.PI * 2, c = Math.cos(phi), s = Math.sin(phi);
      const outer = c > 0;
      let nU = 2.4, nV = 2.4;
      if (profile === 'flat') { nU = 8; nV = 8; }
      else if (profile === 'd-shape') { nU = outer ? 2.1 : 8; nV = outer ? 2.1 : 5; }
      else if (profile === 'comfort') { nU = outer ? 2.3 : 2.6; nV = outer ? 2.3 : 2.6; }
      let u = 0.5 + 0.5 * sup(c, nU), v = sup(s, nV);
      if (profile === 'knife') v *= 1 - 0.8 * u * u;
      sect.push([u, v]);
    }
    for (let i = 0; i < SEG; i++) {
      const th = (i / SEG) * Math.PI * 2, ct = Math.cos(th), st = Math.sin(th);
      for (let k = 0; k < PROF; k++) {
        const r = Rin + sect[k][0] * t;
        verts.push(ct * r, st * r, sect[k][1] * w / 2);
      }
    }
    for (let i = 0; i < SEG; i++) for (let k = 0; k < PROF; k++) {
      const a = i * PROF + k, b = i * PROF + (k + 1) % PROF, c = ((i + 1) % SEG) * PROF + (k + 1) % PROF, d = ((i + 1) % SEG) * PROF + k;
      index.push(a, b, c, a, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(index);
    return CADStudio.ensureOutward(geo);
  }

  static scaledOutline(outline, sx, sz) { return outline.map(([x, z]) => [x * sx, z * (sz === undefined ? sx : sz)]); }
  static perimeter(pts) { let p = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; p += Math.hypot(a[0] - b[0], a[1] - b[1]); } return p; }
  // Drop vertices that lie on the straight line between their neighbours; the polygon triangulator
  // turns them into zero-area triangles and open edges in extruded solids.
  static dropCollinear(outline) {
    const n = outline.length;
    return outline.filter((p, i) => {
      const a = outline[(i + n - 1) % n], b = outline[(i + 1) % n];
      const cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
      return Math.abs(cross) > 1e-4 * Math.hypot(p[0] - a[0], p[1] - a[1]) * Math.hypot(b[0] - p[0], b[1] - p[1]);
    });
  }
  static selfIntersects(p) {
    const n = p.length, side = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const a = p[i], b = p[(i + 1) % n], c = p[j], d = p[(j + 1) % n];
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) return true;
    }
    return false;
  }
  // Offset outline that is always a simple (non-crossing) polygon, as the extruder needs: true offset where it
  // behaves, otherwise a uniform scale about the centre (valid for the star-shaped gem outlines).
  static safeOffset(outline, dist) {
    const off = CADStudio.dropCollinear(CADStudio.offsetOutline(outline, dist));
    if (!CADStudio.selfIntersects(off)) return off;
    const minR = Math.min(...outline.map(([x, z]) => Math.hypot(x, z)));
    return CADStudio.dropCollinear(CADStudio.scaledOutline(outline, 1 + 2 * dist / minR));
  }
  // Outward unit normal at each outline vertex (outline is wound counter-clockwise in x/z).
  static vertexNormals(outline) {
    const n = outline.length;
    return outline.map((p, i) => {
      const a = outline[(i + n - 1) % n], b = outline[(i + 1) % n];
      const e = (u, v) => { const dx = v[0] - u[0], dz = v[1] - u[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };
      const n1 = e(a, p), n2 = e(p, b), sx = n1[0] + n2[0], sz = n1[1] + n2[1], l = Math.hypot(sx, sz) || 1;
      return [sx / l, sz / l];
    });
  }
  // Outline pushed outward by `dist` mm along its vertex normals (a true offset, unlike scaling).
  static signedDist(poly, x, z) { // distance to polygon edge; negative inside
    let inside = false, d = 1e9;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      d = Math.min(d, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
    }
    return inside ? -d : d;
  }
  // Outline pushed outward by `dist` mm. Vertices in a notch (heart cleft) are pushed on until they are truly `dist` clear.
  static offsetOutline(outline, dist) {
    const nrm = CADStudio.vertexNormals(outline);
    const clear = (px, pz) => CADStudio.signedDist(outline, px, pz) >= dist - 0.01;
    return outline.map(([x, z], i) => {
      if (clear(x + nrm[i][0] * dist, z + nrm[i][1] * dist)) return [x + nrm[i][0] * dist, z + nrm[i][1] * dist];
      // notch: the normal points into a neighbouring wall, so search every direction for the nearest clear point
      let best = [x + nrm[i][0] * dist, z + nrm[i][1] * dist], bestCost = 1e9;
      for (let a = 0; a < 48; a++) {
        const dx = Math.cos(a * Math.PI / 24), dz = Math.sin(a * Math.PI / 24);
        for (let k = dist; k <= dist * 8; k += dist * 0.05) {
          if (!clear(x + dx * k, z + dz * k)) continue;
          const cost = k * (1.4 - (dx * nrm[i][0] + dz * nrm[i][1]) * 0.4);
          if (cost < bestCost) { bestCost = cost; best = [x + dx * k, z + dz * k]; }
          break;
        }
      }
      return best;
    });
  }
  static farthest(outline, deg) {
    const dx = Math.cos(deg * Math.PI / 180), dz = Math.sin(deg * Math.PI / 180);
    let best = outline[0], bv = -1e9;
    outline.forEach((p) => { const v = p[0] * dx + p[1] * dz; if (v > bv) { bv = v; best = p; } });
    return best;
  }
  static between(p1, p2, r1, r2) {
    const dir = new THREE.Vector3().subVectors(p2, p1), len = dir.length();
    const geo = new THREE.CylinderGeometry(r2, r1, len, 14, 1);
    const m = new THREE.Mesh(geo);
    m.position.copy(p1).add(p2).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  }
  static pointsAlong(outline, y, sx, sz, radius) {
    const sc = CADStudio.scaledOutline(outline, sx, sz);
    const per = CADStudio.perimeter(sc), count = Math.max(8, Math.floor(per / (radius * 2.1)));
    const out = [];
    // walk the outline at equal arc-length spacing
    const lens = [0];
    for (let i = 0; i < sc.length; i++) { const a = sc[i], b = sc[(i + 1) % sc.length]; lens.push(lens[i] + Math.hypot(a[0] - b[0], a[1] - b[1])); }
    for (let k = 0; k < count; k++) {
      const d = (k / count) * per; let i = 0;
      while (i < sc.length - 1 && lens[i + 1] < d) i++;
      const a = sc[i], b = sc[(i + 1) % sc.length], f = (d - lens[i]) / ((lens[i + 1] - lens[i]) || 1);
      out.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * f, y, a[1] + (b[1] - a[1]) * f));
    }
    return out;
  }

  // Engraved text as a decal on the inside of the band, centred at the bottom of the ring.
  addEngraving(text, Rin, w, inset) {
    text = (text || '').trim();
    if (!text) return;
    const font = "italic 600 110px 'Cormorant Garamond', Georgia, serif";
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    g.font = font;
    const textPx = Math.ceil(g.measureText(text).width), padX = 30, padY = 30, fontPx = 110;
    cv.width = textPx + padX * 2; cv.height = Math.round(fontPx * 1.4) + padY;
    // size in mm: text cap-height limited by band width, run length limited to ~⅔ of the circumference
    let mmPerPx = Math.min((w - 0.5) / cv.height, (Math.min(w * 0.55, 1.8)) / (fontPx * 0.8));
    mmPerPx = Math.min(mmPerPx, (Rin * Math.PI * 1.3) / cv.width);
    const lenMm = cv.width * mmPerPx, hMm = cv.height * mmPerPx;
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = cv.width / 2, cy = cv.height / 2;
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText(text, cx + 1.5, cy + 2); // lit lower edge of the cut
    g.fillStyle = 'rgba(40,28,10,0.95)'; g.fillText(text, cx, cy);            // dark recess
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    const span = lenMm / Rin, N = 48, r = Rin - inset, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, phi = -Math.PI / 2 + (u - 0.5) * span;
      for (const v of [0, 1]) {
        pos.push(Math.cos(phi) * r, Math.sin(phi) * r, (0.5 - v) * hMm); // canvas top toward -Z
        uv.push(u, v);
      }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, metalness: 0.2, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.engraving = true;
    this.ring.add(mesh);
  }

  /* ---------- build ---------- */
  rebuild() {
    // clear
    this.ring.children.slice().forEach((m) => { m.geometry && m.geometry.dispose(); m.material && m.material.dispose && m.material.dispose(); this.ring.remove(m); });
    const cfg = this.config;
    const metalMat = this.metalMaterial(), gemMats = this.gemMaterials(), beadMat = this.beadMaterial();
    // Head parts (seat, prongs/bezel, halo, stone) spin together about the vertical axis.
    let inHead = false, frame = null; // frame: extra transform for parts built upright (pendant stone)
    const headRot = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(cfg.stoneRotation || 0));
    this.setShadowExtent(30);
    const add = (mesh, kind) => {
      if (inHead) mesh.applyMatrix4(headRot);
      if (frame) mesh.applyMatrix4(frame);
      mesh.userData.metal = kind === 'metal'; mesh.userData.stone = kind !== 'metal';
      mesh.castShadow = true; this.ring.add(mesh); return mesh;
    };
    const addMetal = (geo, pos, rot, quat) => { const m = new THREE.Mesh(geo, metalMat); if (pos) m.position.copy(pos); if (rot) m.rotation.set(...rot); if (quat) m.quaternion.copy(quat); return add(m, 'metal'); };
    const addBeads = (points, radius) => {
      const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 14, 10), beadMat, points.length);
      const mtx = new THREE.Matrix4();
      points.forEach((p, i) => { mtx.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, mtx); });
      inst.userData.beads = points.length; add(inst, 'stone');
    };

    if (cfg.product === 'pendant' || cfg.product === 'nameplate') {
      const ctx = { add, addMetal, addBeads, gemMats, setFrame: (m) => { frame = m; } };
      const info = cfg.product === 'pendant' ? this.buildPendant(ctx) : this.buildNameplate(ctx);
      this.computeMetrics(info);
      if (this._reframe) { this._reframe = false; this.frameProduct(); }
      return;
    }

    // dimensions
    const Rin = (11.63 + 0.8128 * cfg.ringSize) / 2, t = cfg.bandThickness, w = cfg.bandWidth, Rout = Rin + t;
    const dim = GemstoneLibrary.getDimensionsForCarat(cfg.gemShape, cfg.carat, cfg.stoneType);
    const { length: L, width: W, depth: D } = dim;
    const outline = GemstoneLibrary.getOutline(cfg.gemShape, L, W);
    const yG = Rout + 0.74 * D + 0.2; // girdle plane height
    const pr = Math.max(0.2, cfg.prongThickness / 2);

    // shank
    addMetal(this.buildShankGeometry(Rin, t, w, cfg.profile));

    // seat plate under the head
    inHead = true;
    {
      const sh = new THREE.Shape(); const so = CADStudio.dropCollinear(CADStudio.scaledOutline(outline, 0.62));
      so.forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: false });
      addMetal(geo, new THREE.Vector3(0, Rout - 0.5, 0), [-Math.PI / 2, 0, 0]);
    }

    // head
    if (cfg.headStyle === 'bezel') {
      const sh = new THREE.Shape(), wall = Math.max(0.5, cfg.prongThickness * 0.7);
      CADStudio.safeOffset(outline, wall + 0.03).forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
      const hole = new THREE.Path();
      CADStudio.safeOffset(outline, 0.03).reverse().forEach(([x, z], i) => (i ? hole.lineTo(x, z) : hole.moveTo(x, z)));
      sh.holes.push(hole);
      const yb = Rout - 0.3, top = yG + 0.35, geo = new THREE.ExtrudeGeometry(sh, { depth: top - yb, bevelEnabled: false });
      addMetal(geo, new THREE.Vector3(0, yb, 0), [-Math.PI / 2, 0, 0]);
    } else {
      const style = cfg.headStyle;
      const tips = ['marquise', 'pear', 'heart'].includes(cfg.gemShape);
      let angles;
      if (style === 'compass') angles = [0, 90, 180, 270];
      else if (style === '6-prong') angles = [30, 90, 150, 210, 270, 330];
      else if (style === 'double-claw') angles = [33, 57, 123, 147, 213, 237, 303, 327];
      else angles = tips ? [0, 90, 180, 270] : [45, 135, 225, 315];
      const yBot = Rout + 0.3;
      const r1 = pr * (style === 'compass' ? 1.25 : 1), r0 = r1 * 1.15;
      const step = ['emerald', 'asscher', 'radiant', 'princess'].includes(cfg.gemShape);
      const gap = 0.08, hp = 0.76 * D, g = 0.02 * D;
      // stone outline scale at a given depth below the girdle plane (mirrors the gem geometry)
      const pavProfile = step ? [[0, 1], [0.3, 0.82], [0.62, 0.58], [1, 0.04]] : [[0, 1], [0.55, 0.52], [1, 0.04]];
      const stoneScale = (dy) => {
        const f = Math.min(1, Math.max(0, (dy - g) / hp));
        for (let i = 1; i < pavProfile.length; i++) {
          const [f0, s0] = pavProfile[i - 1], [f1, s1] = pavProfile[i];
          if (f <= f1) return s0 + (s1 - s0) * (f - f0) / (f1 - f0);
        }
        return 0.04;
      };
      const depths = pavProfile.slice(0, -1).map(([f]) => g + f * hp).reverse(); // kinks, deepest first
      const dyBot = yG - yBot;
      // stone outline scale vs. height above the girdle (pavilion below, first crown facet above)
      const crownDy = g + (step ? 0.4 : 0.45) * 0.2 * D, crownS = step ? 0.9 : 0.86;
      const prof = pavProfile.map(([f, s]) => [-(g + f * hp), s]).reverse().concat([[g, 1], [crownDy, crownS]]); // pavProfile already ends at the girdle (-g, 1)
      // steepest surface slope (scale change per mm of height) touching this height
      const slopeAt = (h) => prof.reduce((m, [y1, s1], i) => {
        if (!i) return m;
        const [y0, s0] = prof[i - 1];
        return h >= y0 - 1e-6 && h <= y1 + 1e-6 ? Math.max(m, Math.abs((s1 - s0) / (y1 - y0))) : m;
      }, 0);
      const nrm = CADStudio.vertexNormals(outline);
      angles.forEach((deg) => {
        const p = CADStudio.farthest(outline, deg), n = nrm[outline.indexOf(p)];
        // the surface leans away from the vertical, so the horizontal gap must grow to keep the true gap
        const lean = Math.max(0, p[0] * n[0] + p[1] * n[1]);
        const at = (s, h, y, clear) => {
          const off = clear * Math.sqrt(1 + (slopeAt(h) * lean) ** 2);
          return new THREE.Vector3(p[0] * s + n[0] * off, y, p[1] * s + n[1] * off);
        };
        // claw: outside the pavilion, past the girdle, then curling over the crown edge
        const pts = [at(stoneScale(dyBot), -dyBot, yBot, r0 + gap)];
        depths.forEach((dy) => { if (dy < dyBot) pts.push(at(stoneScale(dy), -dy, yG - dy, r1 + gap)); });
        pts.push(at(1, 0, yG, r1 + gap));
        // tip rests on the crown's first facet edge
        pts.push(at(crownS, crownDy, yG + crownDy, r1 + 0.03));
        for (let i = 1; i < pts.length; i++) {
          const cyl = CADStudio.between(pts[i - 1], pts[i], i === 1 ? r0 : r1, r1);
          addMetal(cyl.geometry, cyl.position, null, cyl.quaternion);
          addMetal(new THREE.SphereGeometry(r1, 12, 8), pts[i]);
        }
      });
      // gallery rail tying the prongs together, just outside the pavilion
      {
        const dy = g + 0.3 * hp, s = stoneScale(dy), rr = Math.min(0.25, r1 * 0.7);
        const lean = Math.sqrt(1 + (slopeAt(-dy) * Math.max(...outline.map(([x, z]) => Math.hypot(x, z)))) ** 2);
        const pts = CADStudio.offsetOutline(CADStudio.scaledOutline(outline, s), (rr + gap) * lean).map(([x, z]) => new THREE.Vector3(x, yG - dy, z));
        addMetal(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, rr, 8, true));
      }
    }

    // halo
    // halo rings follow the girdle outline at a true offset (scaling would crowd or gap the tips of pear/heart/marquise)
    if (cfg.halo === 'hidden') {
      addBeads(CADStudio.pointsAlong(CADStudio.offsetOutline(outline, 0.6), yG - 1.0, 1, 1, 0.42), 0.42);
    } else if (cfg.halo === 'classic') {
      addBeads(CADStudio.pointsAlong(CADStudio.offsetOutline(outline, 0.55), yG + 0.15, 1, 1, 0.38), 0.38);
      const cp = CADStudio.offsetOutline(outline, 0.55).map(([x, z]) => new THREE.Vector3(x, yG - 0.15, z));
      addMetal(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp, true), 96, 0.45, 8, true));
    }

    // centre stone
    const gemGeo = GemstoneLibrary.createGemstoneGeometry(cfg.gemShape, L, W, D);
    const gemIn = new THREE.Mesh(gemGeo, gemMats.inner), gem = new THREE.Mesh(gemGeo, gemMats.outer);
    [gemIn, gem].forEach((m) => { m.position.y = yG; add(m, 'stone'); });
    gemIn.renderOrder = 1; gem.renderOrder = 2; gemIn.castShadow = false; gem.castShadow = false;

    inHead = false;
    this.addEngraving(cfg.engraving, Rin, w, 0.02);
    // pavé on the shank (beads sit on the outer face)
    if (cfg.accents !== 'none') {
      const br = Math.min(0.55, Math.max(0.3, w / 2 - 0.25));
      const arc = cfg.accents === 'full' ? Math.PI * 2 - 0.0 : Math.PI * 1.1;
      const start = cfg.accents === 'full' ? 0 : Math.PI / 2 - arc / 2;
      const clearance = Math.max(L, W) / 2 / Rout + 0.12;
      const n = Math.floor(arc * (Rout + br * 0.4) / (br * 2.15));
      const pts = [];
      for (let i = 0; i < n; i++) {
        const th = start + (i / (cfg.accents === 'full' ? n : n - 1)) * arc;
        if (Math.abs(th - Math.PI / 2) < clearance * 0.9) continue;
        const r = Rout + br * 0.15;
        pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
      }
      if (pts.length) addBeads(pts, br);
    }

    // ground & camera target
    this.ground.position.y = -Rout - 0.02;
    this.target.set(0, this.focusStone ? yG - 1 : (yG - Rout) * 0.35, 0);
    this.geom = { Rin, Rout, L, W, D, yG };

    this.computeMetrics({ dims: dim, innerDiameter: Rin * 2, bandRadius: Rout });
    if (this._reframe) { this._reframe = false; this.frameProduct(); }
  }

  // Weight / bead count from the built meshes, merged with product-specific fields, then handed to the UI.
  computeMetrics(extra) {
    const vol = STLExporter.volumeMm3(this.ring);
    const a = PricingEngine.ALLOYS[this.config.metalType];
    const weightG = vol * 1e-3 * a.density;
    let beadCount = 0; this.ring.children.forEach((m) => { if (m.userData.beads) beadCount += m.userData.beads; });
    this.metrics = { volumeMm3: vol, weightG, weightDwt: weightG * PricingEngine.WEIGHT_TO_DWT, beadCount, product: this.config.product, ...extra };
    if (this.onBuild) this.onBuild(this.metrics);
  }

  setShadowExtent(e) {
    Object.assign(this.key.shadow.camera, { left: -e, right: e, top: e, bottom: -e });
    this.key.shadow.camera.updateProjectionMatrix();
  }

  // Camera distance and angle that fit the current product.
  frameProduct() {
    this.focusStone = false;
    if (this.config.product === 'ring') { this.orbit.r = 64; this.orbit.pol = 1.2; return; }
    this.orbit.r = Math.min(140, Math.max(36, (this.geom.extent || 30) * 2.8));
    this.orbit.pol = 1.35;
  }

  /* ---------- pendants & name plates ---------- */
  // Typeface for the lettering; null while it is still downloading (the build re-runs once it arrives).
  getFont(key) {
    const cache = CADStudio._fonts;
    if (cache[key] && cache[key].font) return cache[key].font;
    if (!cache[key]) {
      cache[key] = { font: null };
      const url = 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/fonts/' + CADStudio.FONTS[key].file + '.typeface.json';
      fetch(url).then((r) => r.json()).then((json) => {
        const font = new THREE.FontLoader().parse(json);
        const h = new THREE.TextGeometry('H', { font, size: 1, height: 1, curveSegments: 4 });
        h.computeBoundingBox(); font.capRatio = h.boundingBox.max.y; h.dispose();
        cache[key].font = font; this.updateConfig({});
      }).catch(() => { cache[key].failed = true; this.updateConfig({}); });
    }
    return null;
  }

  // Raised lettering, centred on x = 0 with its cap-height centred on y = 0; extruded from z = 0 to z = depth.
  textGeometry(text, font, cap, depth) {
    // Glyph outlines carry duplicate and collinear points that become zero-area triangles in the solid, so
    // sample each contour, clean it, and extrude the cleaned shapes (what TextGeometry does, minus the defects).
    const tol = 0.03; // mm; points closer than this are one point as far as casting is concerned
    const cleanContour = (pts) => {
      const out = [];
      pts.forEach((p) => { const q = out[out.length - 1]; if (!q || Math.hypot(p.x - q[0], p.y - q[1]) > tol) out.push([p.x, p.y]); });
      while (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= tol) out.pop();
      return out.length > 2 ? CADStudio.dropCollinear(out) : null;
    };
    const area = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
    const vec = (p) => p.map(([x, y]) => new THREE.Vector2(x, y));
    const shapes = [];
    font.generateShapes(text, cap / font.capRatio).forEach((s) => {
      const { shape, holes } = s.extractPoints(6), outer = cleanContour(shape);
      if (!outer) return;
      const hs = holes.map(cleanContour).filter(Boolean);
      // a few glyphs have an outline that crosses itself; split it into simple loops and fill each one
      CADStudio.splitSelfIntersections(outer).forEach((loop) => {
        if (Math.abs(area(loop)) < 1e-4) return;
        const sh = new THREE.Shape(vec(loop));
        hs.filter((hp) => CADStudio.signedDist(loop, hp[0][0], hp[0][1]) < 0).forEach((hp) => sh.holes.push(new THREE.Path(vec(hp))));
        shapes.push(sh);
      });
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -cap / 2, 0);
    geo.userData.width = bb.max.x - bb.min.x;
    return geo;
  }

  // Splits a closed polygon that crosses itself into simple polygons (one per loop), cutting at each crossing point.
  static splitSelfIntersections(p, depth = 0) {
    const n = p.length, side = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (depth > 8) return [p];
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const a = p[i], b = p[(i + 1) % n], c = p[j], d = p[(j + 1) % n];
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) {
        const sa = side(c, d, a), t = sa / (sa - side(c, d, b)), x = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
        const loopA = [x, ...p.slice(i + 1, j + 1)], loopB = [x, ...p.slice(j + 1), ...p.slice(0, i + 1)];
        return [...CADStudio.splitSelfIntersections(loopA, depth + 1), ...CADStudio.splitSelfIntersections(loopB, depth + 1)];
      }
    }
    return [p];
  }

  // Closed outline through `pts`, smoothed so curved shapes do not show their 32 facets.
  static smoothOutline(pts, count = 144) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
    return curve.getPoints(count).slice(0, count).map((v) => [v.x, v.y]);
  }

  static shapeFrom(pts) {
    const sh = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    return sh;
  }

  // Pendant: a flat plate in the outline of the chosen shape, a bail on top, and either a bezel-set centre stone or raised text.
  buildPendant({ add, addMetal, addBeads, gemMats, setFrame }) {
    const cfg = this.config, th = cfg.pendantThickness, size = cfg.pendantSize;
    const shapeDef = GemstoneLibrary.SHAPES[cfg.pendantShape] || GemstoneLibrary.SHAPES.round;
    // gem outlines run along x with the tip at +x; stand them up with the tip at the bottom
    let plate = GemstoneLibrary.getOutline(cfg.pendantShape, size, size / shapeDef.ratio).map(([x, z]) => [z, -x]);
    plate = ['round', 'oval', 'cushion', 'pear', 'heart', 'marquise'].includes(cfg.pendantShape) ? CADStudio.smoothOutline(plate) : CADStudio.dropCollinear(plate);
    const ys = plate.map((p) => p[1]), xs = plate.map((p) => p[0]);
    const minY = Math.min(...ys), maxY = Math.max(...ys), width = Math.max(...xs) - Math.min(...xs), height = maxY - minY;
    addMetal(new THREE.ExtrudeGeometry(CADStudio.shapeFrom(plate), { depth: th, bevelEnabled: false, curveSegments: 1 }));

    // bail: a ring standing across the top edge, centred on the pendant
    let topY = maxY;
    if (cfg.bail === 'loop') {
      let top = -1e9; // highest edge crossing at x = 0 (a heart has a cleft there)
      for (let i = 0; i < plate.length; i++) {
        const a = plate[i], b = plate[(i + 1) % plate.length];
        if ((a[0] <= 0) !== (b[0] <= 0)) top = Math.max(top, a[1] + (b[1] - a[1]) * (0 - a[0]) / (b[0] - a[0]));
      }
      const R = 2.2, tube = Math.min(0.7, Math.max(0.5, th * 0.4));
      addMetal(new THREE.TorusGeometry(R, tube, 12, 36), new THREE.Vector3(0, top + R - tube * 0.8, th / 2), [0, Math.PI / 2, 0]);
      topY = top + 2 * R + tube * 1.2;
    }

    let dims = null, fits = true, textMissing = false;
    if (cfg.pendantStone) {
      dims = GemstoneLibrary.getDimensionsForCarat(cfg.gemShape, cfg.carat, cfg.stoneType);
      const { length: L, width: W, depth: D } = dims;
      const outline = GemstoneLibrary.getOutline(cfg.gemShape, L, W);
      const yG = th + 0.76 * D + 0.15; // girdle height above the back face; the culet floats just above the plate
      const wall = Math.max(0.6, cfg.prongThickness * 0.7);
      const outer = CADStudio.safeOffset(outline, wall + 0.03);
      // stone length runs down the pendant, tip toward the bottom
      fits = outer.every(([x, z]) => CADStudio.signedDist(plate, z, -x) <= -0.5);
      // build upright (table toward +y) then stand it on the pendant face: local x -> -y, local y -> +z
      setFrame(new THREE.Matrix4().makeRotationX(Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)));
      const sh = new THREE.Shape();
      outer.forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
      const hole = new THREE.Path();
      CADStudio.safeOffset(outline, 0.03).reverse().forEach(([x, z], i) => (i ? hole.lineTo(x, z) : hole.moveTo(x, z)));
      sh.holes.push(hole);
      const yb = th - 0.2, top = yG + 0.35;
      addMetal(new THREE.ExtrudeGeometry(sh, { depth: top - yb, bevelEnabled: false }), new THREE.Vector3(0, yb, 0), [-Math.PI / 2, 0, 0]);
      if (cfg.halo === 'hidden') addBeads(CADStudio.pointsAlong(CADStudio.offsetOutline(outline, wall + 0.5), yG - 1.0, 1, 1, 0.42), 0.42);
      else if (cfg.halo === 'classic') {
        const ring = CADStudio.offsetOutline(outline, wall + 0.55);
        addBeads(CADStudio.pointsAlong(ring, yG + 0.15, 1, 1, 0.38), 0.38);
        addMetal(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring.map(([x, z]) => new THREE.Vector3(x, yG - 0.15, z)), true), 96, 0.45, 8, true));
        fits = fits && ring.every(([x, z]) => CADStudio.signedDist(plate, z, -x) <= -1.0);
      }
      const gemGeo = GemstoneLibrary.createGemstoneGeometry(cfg.gemShape, L, W, D);
      const gemIn = new THREE.Mesh(gemGeo, gemMats.inner), gem = new THREE.Mesh(gemGeo, gemMats.outer);
      [gemIn, gem].forEach((m) => { m.position.y = yG; add(m, 'stone'); });
      gemIn.renderOrder = 1; gem.renderOrder = 2; gemIn.castShadow = false; gem.castShadow = false;
      setFrame(null);
    } else {
      const text = (cfg.plateText || '').trim();
      if (text) {
        const font = this.getFont(cfg.plateFont);
        if (font) {
          const geo = this.textGeometry(text, font, cfg.textSize, cfg.textRaise + 0.1);
          const s = Math.min(1, (width * 0.7) / geo.userData.width); // never wider than the pendant face
          geo.scale(s, s, 1);
          addMetal(geo, new THREE.Vector3(0, (minY + maxY) / 2, th - 0.1));
        } else textMissing = true;
      }
    }

    this.ground.position.y = minY - 0.05;
    this.target.set(0, (topY + minY) / 2, th / 2);
    this.geom = { extent: Math.max(width, topY - minY), yG: (topY + minY) / 2, Rout: 0 };
    this.setShadowExtent(Math.max(30, this.geom.extent));
    return { dims, innerDiameter: 0, bandRadius: 0, plate: { width, height, thickness: th }, fits, textMissing };
  }

  // Name plate: a bar (rounded, pill or square) with raised lettering and a jump ring at each end for the bracelet.
  buildNameplate({ addMetal }) {
    const cfg = this.config, th = cfg.plateThickness, H = cfg.plateHeight, cap = cfg.textSize;
    const text = (cfg.plateText || '').trim();
    const font = text ? this.getFont(cfg.plateFont) : null;
    const textGeo = text && font ? this.textGeometry(text, font, cap, cfg.textRaise + 0.1) : null;
    const textW = textGeo ? textGeo.userData.width : cap * 0.9 * Math.max(text.length, 4);
    const pad = Math.max(3, H * 0.35);
    const Wp = Math.max(textW + 2 * pad, H * 2.2, 18);
    const rr = cfg.plateStyle === 'pill' ? H / 2 : cfg.plateStyle === 'square' ? 0 : Math.min(2, H * 0.25);
    const x0 = -Wp / 2, x1 = Wp / 2, y0 = -H / 2, y1 = H / 2;
    // counter-clockwise polygon with exact corner points (arcs sampled, no repeated vertices)
    const pts = [];
    const push = (x, y) => { const q = pts[pts.length - 1]; if (!q || Math.hypot(x - q[0], y - q[1]) > 1e-4) pts.push([x, y]); };
    if (rr > 0) {
      [[x1 - rr, y0 + rr, -90], [x1 - rr, y1 - rr, 0], [x0 + rr, y1 - rr, 90], [x0 + rr, y0 + rr, 180]].forEach(([cx, cy, a0]) => {
        for (let k = 0; k <= 12; k++) { const a = (a0 + (k / 12) * 90) * Math.PI / 180; push(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      });
      if (Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-4) pts.pop();
    } else { push(x0, y0); push(x1, y0); push(x1, y1); push(x0, y1); }
    addMetal(new THREE.ExtrudeGeometry(CADStudio.shapeFrom(CADStudio.dropCollinear(pts)), { depth: th, bevelEnabled: false, curveSegments: 1 }));
    if (textGeo) addMetal(textGeo, new THREE.Vector3(0, 0, th - 0.1));

    let extent = Wp;
    if (cfg.plateLoops === 'both') {
      const R = 2.4, tube = Math.min(0.75, Math.max(0.5, th * 0.45));
      [-1, 1].forEach((sgn) => addMetal(new THREE.TorusGeometry(R, tube, 12, 36), new THREE.Vector3(sgn * (Wp / 2 + R - tube * 0.8), 0, th / 2)));
      extent = Wp + 2 * (2 * R);
    }
    this.ground.position.y = -H / 2 - 0.05;
    this.target.set(0, 0, th / 2);
    this.geom = { extent, yG: 0, Rout: 0 };
    this.setShadowExtent(Math.max(30, extent * 0.8));
    return { dims: null, innerDiameter: 0, bandRadius: 0, plate: { width: Wp, height: H, thickness: th }, textMissing: !!text && !textGeo };
  }

  /* ---------- output ---------- */
  exportSTL(filename = 'aurix-ring.stl', compensate = true) {
    if (this._pending) this.rebuild(); // flush a queued edit so the file matches what is on screen
    const check = STLExporter.validate(this.ring);
    if (!check.ok) return { check };
    const shrink = compensate ? PricingEngine.ALLOYS[this.config.metalType].shrink : 0;
    // rings print upright (Z-up); plates and pendants already lie flat with the face toward +Z
    return { check, triangles: STLExporter.download(this.ring, filename, 1 + shrink, this.config.product === 'ring') };
  }

  captureStudioPhoto(transparent = true, filename = 'aurix-render.png') {
    const r = this.renderer, size = r.getSize(new THREE.Vector2()), pr = r.getPixelRatio();
    const prevAuto = this.autoRotate; this.autoRotate = false;
    try {
      r.setPixelRatio(1); r.setSize(3840, 2160, false);
      this.camera.aspect = 3840 / 2160; this.camera.updateProjectionMatrix();
      if (!transparent) r.setClearColor(0xf3efe8, 1);
      this.placeCamera(); r.render(this.scene, this.camera);
      const url = r.domElement.toDataURL('image/png');
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    } finally {
      r.setClearColor(0x000000, 0); r.setPixelRatio(pr); r.setSize(size.x, size.y, true);
      this.resize(); this.autoRotate = prevAuto;
    }
  }

  // Three views on a light backdrop for the spec sheet.
  snapshotViews() {
    const r = this.renderer, size = r.getSize(new THREE.Vector2()), pr = r.getPixelRatio();
    const prevAuto = this.autoRotate, prevOrbit = { ...this.orbit }; this.autoRotate = false;
    const W = 720, H = 540, out = [];
    const views = [['Perspective', 0.6, 1.15, 62], ['Top / Table', 0.0, 0.001, 62], ['Profile Elevation', Math.PI / 2, Math.PI / 2, 62]];
    this.ground.visible = false;
    try {
      r.setPixelRatio(1); r.setSize(W, H, false); r.setClearColor(0xffffff, 1);
      this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
      views.forEach(([name, az, pol, rad]) => {
        this.placeCamera(az, pol, rad); r.render(this.scene, this.camera);
        out.push({ name, url: r.domElement.toDataURL('image/png') });
      });
    } finally {
      this.ground.visible = true; r.setClearColor(0x000000, 0); r.setPixelRatio(pr); r.setSize(size.x, size.y, true);
      this.resize(); this.autoRotate = prevAuto; this.orbit = prevOrbit;
    }
    return out;
  }
}
