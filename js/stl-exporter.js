/* Aurix — binary STL writer and Gauss-divergence volume calculation. */
const STLExporter = (() => {
  // Collect world-space triangles from metal meshes of a group (meshes are direct children).
  function collectTriangles(group, scale = 1) {
    const tris = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    group.children.forEach((mesh) => {
      if (!mesh.isMesh || !mesh.userData.metal) return;
      mesh.updateMatrix();
      const pos = mesh.geometry.attributes.position, idx = mesh.geometry.index;
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrix).multiplyScalar(scale);
        b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrix).multiplyScalar(scale);
        c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrix).multiplyScalar(scale);
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

  function toBinary(group, linearScale = 1) {
    const tris = collectTriangles(group, linearScale);
    const buf = new ArrayBuffer(84 + tris.length * 50);
    const dv = new DataView(buf);
    const head = 'Aurix Jewelry CAD - castable mesh (mm)';
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

  function download(group, filename, linearScale = 1) {
    const { buffer, triangles } = toBinary(group, linearScale);
    const url = URL.createObjectURL(new Blob([buffer], { type: 'model/stl' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return triangles;
  }
  return { volumeMm3, toBinary, download };
})();
