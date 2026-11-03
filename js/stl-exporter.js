/* Aurix — binary STL writer, Gauss-divergence volume calculation and print-readiness check. */
const STLExporter = (() => {
  // Collect world-space triangles from metal meshes of a group (meshes are direct children).
  // zUp: the viewer is Y-up but slicers and CAM tools are Z-up, so rotate +90° about X (a proper rotation, winding is kept).
  function collectTriangles(group, scale = 1, zUp = false) {
    const tris = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const up = (v) => { if (zUp) { const y = v.y; v.y = -v.z; v.z = y; } return v; };
    group.children.forEach((mesh) => {
      if (!mesh.isMesh || !mesh.userData.metal) return;
      mesh.updateMatrix();
      const pos = mesh.geometry.attributes.position, idx = mesh.geometry.index;
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        up(a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrix).multiplyScalar(scale));
        up(b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrix).multiplyScalar(scale));
        up(c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrix).multiplyScalar(scale));
        tris.push([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, mesh.uuid]);
      }
    });
    return tris;
  }

  // V = Σ 1/6 · v1·(v2×v3), summed per mesh and taken as absolute value (closed shells).
  function volumeMm3(group) {
    const sums = {};
    collectTriangles(group).forEach((t) => {
      const [x1, y1, z1, x2, y2, z2, x3, y3, z3, id] = t;
      const v = (x1 * (y2 * z3 - z2 * y3) - y1 * (x2 * z3 - z2 * x3) + z1 * (x2 * y3 - y2 * x3)) / 6;
      sums[id] = (sums[id] || 0) + v;
    });
    return Object.values(sums).reduce((s, v) => s + Math.abs(v), 0);
  }

  // Print-readiness check, run per solid: finite coordinates, no zero-area triangles, every edge shared by exactly
  // two triangles running in opposite directions (watertight, consistently wound), and positive (outward) volume.
  function validate(group) {
    const q = 1e4; // weld tolerance 0.1 µm
    const key = (x, y, z) => Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q);
    const shells = {};
    collectTriangles(group).forEach((t) => { (shells[t[9]] = shells[t[9]] || []).push(t); });
    const r = { shells: 0, triangles: 0, nonFinite: 0, degenerate: 0, openEdges: 0, nonManifold: 0, inverted: 0 };
    Object.values(shells).forEach((tris) => {
      r.shells++; r.triangles += tris.length;
      const dir = new Map();
      let vol = 0;
      tris.forEach((t) => {
        if (t.slice(0, 9).some((v) => !Number.isFinite(v))) { r.nonFinite++; return; }
        const [x1, y1, z1, x2, y2, z2, x3, y3, z3] = t;
        const ux = x2 - x1, uy = y2 - y1, uz = z2 - z1, vx = x3 - x1, vy = y3 - y1, vz = z3 - z1;
        const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
        const k = [key(x1, y1, z1), key(x2, y2, z2), key(x3, y3, z3)];
        if (area < 1e-8 || k[0] === k[1] || k[1] === k[2] || k[0] === k[2]) { r.degenerate++; return; }
        vol += (x1 * (y2 * z3 - z2 * y3) - y1 * (x2 * z3 - z2 * x3) + z1 * (x2 * y3 - y2 * x3)) / 6;
        for (let e = 0; e < 3; e++) { const d = k[e] + '>' + k[(e + 1) % 3]; dir.set(d, (dir.get(d) || 0) + 1); }
      });
      dir.forEach((n, d) => {
        const [a, b] = d.split('>');
        if ((dir.get(b + '>' + a) || 0) !== n) r.openEdges++;
        if (n > 1) r.nonManifold++;
      });
      if (vol <= 0) r.inverted++;
    });
    const problems = [];
    if (!r.shells) problems.push('no printable metal found');
    if (r.nonFinite) problems.push(r.nonFinite + ' triangles with invalid coordinates');
    if (r.degenerate) problems.push(r.degenerate + ' zero-area triangles');
    if (r.openEdges) problems.push(r.openEdges + ' open or mismatched edges (not watertight)');
    if (r.nonManifold) problems.push(r.nonManifold + ' non-manifold edges');
    if (r.inverted) problems.push(r.inverted + ' inside-out solids');
    return { ...r, ok: !problems.length, problems };
  }

  function toBinary(group, linearScale = 1, zUp = true) {
    const tris = collectTriangles(group, linearScale, zUp);
    // sit the ring on the build plate (z = 0), centred in x/y
    let minZ = Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    tris.forEach((t) => { for (let i = 0; i < 9; i += 3) { minX = Math.min(minX, t[i]); maxX = Math.max(maxX, t[i]); minY = Math.min(minY, t[i + 1]); maxY = Math.max(maxY, t[i + 1]); minZ = Math.min(minZ, t[i + 2]); } });
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    tris.forEach((t) => { for (let i = 0; i < 9; i += 3) { t[i] -= cx; t[i + 1] -= cy; t[i + 2] -= minZ; } });
    const buf = new ArrayBuffer(84 + tris.length * 50);
    const dv = new DataView(buf);
    const head = 'Aurix Jewelry CAD - printable mesh (mm, Z-up)';
    for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i));
    dv.setUint32(80, tris.length, true);
    let o = 84;
    tris.forEach((t) => {
      const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2];
      const vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      [nx / l, ny / l, nz / l, ...t.slice(0, 9)].forEach((f) => { dv.setFloat32(o, f, true); o += 4; });
      dv.setUint16(o, 0, true); o += 2;
    });
    return { buffer: buf, triangles: tris.length };
  }

  function download(group, filename, linearScale = 1, zUp = true) {
    const { buffer, triangles } = toBinary(group, linearScale, zUp);
    const url = URL.createObjectURL(new Blob([buffer], { type: 'model/stl' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return triangles;
  }
  return { volumeMm3, validate, toBinary, download };
})();
