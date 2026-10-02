// 材质和搭积木用的小工具：场景、地标、公园三个文件共用，颜色相同的东西共用一份材质，最后能合并成一个网格一次画完
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const cache = new Map();
// 夜里会发光的材质：窗户、灯笼、路灯。强度由场景按时间统一调
export const GLOWS = [];
export function glowMat(color = '#ffb347', base = '#ffe6a8'){
  const key = 'glow|' + color + '|' + base;
  if (!cache.has(key)){
    const m = new THREE.MeshStandardMaterial({color: base, emissive: color, emissiveIntensity: 0, roughness: 0.4, metalness: 0});
    m.userData.glow = 1;
    GLOWS.push(m);
    cache.set(key, m);
  }
  return cache.get(key);
}
export function setGlow(k){ for (const m of GLOWS) m.emissiveIntensity = k * (m.userData.glow || 1); }
// 玩具塑料：有点亮面，环境光里有高光
export function mat(color, rough = 0.42){
  if (color === 'glow') return glowMat();
  const key = color + '|' + rough;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({color, roughness: rough, metalness: 0}));
  return cache.get(key);
}
// 水：清澈、反光
export const WATER = new THREE.MeshPhysicalMaterial({color: '#6fd0ff', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92});
export const GLASS = new THREE.MeshPhysicalMaterial({color: '#bfe9ff', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.7, clearcoat: 0.8});

export function mesh(geo, material, cast = true, receive = true){
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
export const rbox = (w, h, d, r = 0.05, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));

// 往组里加一个零件：add(g, geo, color, {x,y,z, rx,ry,rz, sx,sy,sz, rough, m(材质), cast, recv})
export function add(g, geo, color, o = {}){
  const m = mesh(geo, o.m || mat(color, o.rough), o.cast !== false, o.recv !== false);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.rx || o.ry || o.rz) m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  if (o.sx != null || o.sy != null || o.sz != null) m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  if (o.s) m.scale.multiplyScalar(o.s);
  g.add(m);
  return m;
}
export const box = (g, w, h, d, c, o = {}) => add(g, rbox(w, h, d, o.r ?? Math.min(w, h, d) * 0.18), c, o);
export const cyl = (g, rt, rb, h, c, o = {}) => add(g, new THREE.CylinderGeometry(rt, rb, h, o.seg || 24), c, o);
export const cone = (g, r, h, c, o = {}) => add(g, new THREE.ConeGeometry(r, h, o.seg || 24), c, o);
export const sph = (g, r, c, o = {}) => add(g, new THREE.SphereGeometry(r, o.seg || 20, o.seg ? Math.max(6, o.seg * 0.7 | 0) : 14), c, o);
export const torus = (g, r, t, c, o = {}) => add(g, new THREE.TorusGeometry(r, t, o.tseg || 10, o.seg || 36, o.arc || Math.PI * 2), c, o);
export const capsule = (g, r, l, c, o = {}) => add(g, new THREE.CapsuleGeometry(r, l, 6, 14), c, o);
// 四角攒尖的小屋顶：o.y 是屋檐底的高度，w 是屋檐宽，h 是屋顶高
export function roof(g, w, h, c, o = {}){
  const y = o.y || 0, r = w * 0.72, ry = Math.PI / 4 + (o.ry || 0);
  cone(g, r, h, c, {...o, y: y + h / 2 + 0.02, seg: 4, ry});
  cone(g, r * 1.16, h * 0.3, c, {...o, y: y + h * 0.15, seg: 4, ry});
}
// 用旋转曲线做的东西：lathe(points: [[r,y],...])
export const lathe = (g, pts, c, o = {}) => add(g, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), o.seg || 32), c, o);
export const tag = (obj, data) => { Object.assign(obj.userData, data); return obj; };

// 把一个组里所有不会动的零件按材质合并，画起来只要几十次而不是几千次
export function bake(root, BGU){
  root.updateMatrixWorld(true);
  const byMat = new Map();
  const skip = new Set();
  root.traverse(o => {
    if (o.userData.dyn) o.traverse(c => skip.add(c));
  });
  root.traverse(o => {
    if (!o.isMesh || skip.has(o) || o.userData.keep) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of ['uv2', 'uv1', 'color', 'tangent']) if (geo.attributes[name]) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(o.matrixWorld);
    const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!byMat.has(key)) byMat.set(key, {material: o.material, cast: o.castShadow, recv: o.receiveShadow, list: []});
    byMat.get(key).list.push(geo);
    o.userData.baked = true;
  });
  const out = new THREE.Group();
  for (const {material, cast, recv, list} of byMat.values()){
    const merged = BGU.mergeGeometries(list, false);
    if (!merged) continue;
    list.forEach(g => g.dispose());
    const m = new THREE.Mesh(merged, material);
    m.castShadow = cast;
    m.receiveShadow = recv;
    m.frustumCulled = false;
    out.add(m);
  }
  // 原来的零件拿掉，只留会动的
  const dead = [];
  root.traverse(o => { if (o.userData.baked) dead.push(o); });
  for (const o of dead) o.removeFromParent();
  return out;
}

// 会动的组也合并一下：每个会动的组里，不再往下动的零件按材质合并成几个网格（翅膀这种自己会转的零件标 keep 就不合）
export function bakeLocal(root, BGU){
  root.updateMatrixWorld(true);
  const groups = [];
  root.traverse(o => { if (o !== root && (o.userData.dyn || o.parent === root) && !o.isMesh) groups.push(o); });
  for (const g of groups){
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const byMat = new Map(), dead = [];
    g.traverse(o => {
      if (o === g) return;
      // 碰到下一层会动的组就不往里走（它自己会合并）
      let p = o.parent, nested = false;
      while (p && p !== g){ if (p.userData.dyn){ nested = true; break; } p = p.parent; }
      if (nested || !o.isMesh || o.userData.keep) return;
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of ['uv2', 'uv1', 'color', 'tangent']) if (geo.attributes[name]) geo.deleteAttribute(name);
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
      if (!byMat.has(key)) byMat.set(key, {material: o.material, cast: o.castShadow, recv: o.receiveShadow, list: []});
      byMat.get(key).list.push(geo);
      dead.push(o);
    });
    if (dead.length < 2) continue;
    for (const o of dead) o.removeFromParent();
    for (const {material, cast, recv, list} of byMat.values()){
      const merged = BGU.mergeGeometries(list, false);
      if (!merged) continue;
      list.forEach(x => x.dispose());
      const m = new THREE.Mesh(merged, material);
      m.castShadow = cast;
      m.receiveShadow = recv;
      g.add(m);
    }
  }
}
