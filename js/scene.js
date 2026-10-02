// 3D 棋盘：一座飘在云里的玩具小岛。只管画面，不管规则；规则那边告诉它谁在哪、谁买了什么
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import {SQ, GROUPS, N, CHARS} from './data.js?v=1bf53f6e';
import {mat, glowMat, setGlow, mesh, rbox, add, box, cyl, sph, cone, torus, capsule, lathe, bake, bakeLocal} from './mats.js?v=1bf53f6e';
import {makeLandmark} from './landmarks.js?v=1bf53f6e';
import {buildPark} from './park.js?v=1bf53f6e';
import {createFx} from './fx.js?v=1bf53f6e';
import {ToyShader} from './post.js?v=1bf53f6e';

const INK = '#3b2d45';
const CREAM = '#fff6e8';
const TILE_TOP = 0.18;
const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const PLINTH = {station: '#d9dfee', chance: '#ffd9a8', fate: '#dcccff', tax: '#ffe3a8', shop: '#ffd3e0', bank: '#dfe8ff', stock: '#d6f5e6', go: '#ffd6e2', jail: '#d8d6e0', park: '#ffd6e2', gojail: '#d8d6e0'};

// 第 i 格在桌面上的位置：四条边各 9 格，四个角大一点。起点在右下角，往左走
export function tileFrame(i){
  const side = Math.floor(i / 10), k = i % 10;
  if (k === 0){
    const [x, z] = [[5.25, 5.25], [-5.25, 5.25], [-5.25, -5.25], [5.25, -5.25]][side];
    return {x, z, rot: [0, -Math.PI / 2, Math.PI, Math.PI / 2][side], corner: true, side, w: 1.5, d: 1.5};
  }
  const off = 4 - (k - 1);
  const f = [{x: off, z: 5.25}, {x: -5.25, z: off}, {x: -off, z: -5.25}, {x: 5.25, z: -off}][side];
  return {...f, rot: [0, -Math.PI / 2, Math.PI, Math.PI / 2][side], corner: false, side, w: 1, d: 1.5};
}
// 格子局部坐标（x 沿边，z 朝外为正）换成世界坐标
function local(i, lx, lz, y = 0){
  const f = tileFrame(i), c = Math.cos(f.rot), s = Math.sin(f.rot);
  return new THREE.Vector3(f.x + lx * c + lz * s, y, f.z - lx * s + lz * c);
}
// 世界坐标落在哪一格
function tileAt(x, z){
  for (let i = 0; i < N; i++){
    const f = tileFrame(i), c = Math.cos(f.rot), s = Math.sin(f.rot), dx = x - f.x, dz = z - f.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) <= f.w / 2 && Math.abs(lz) <= f.d / 2) return i;
  }
  return -1;
}

/* ---------- 格子上的字：名字和价钱写在靠外的那头，里头留给地标 ---------- */
function labelTexture(i){
  const s = SQ[i], f = tileFrame(i), k = 2;
  const W = (f.corner ? 300 : 200) * k, H = 300 * k;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const x = cv.getContext('2d');
  x.scale(k, k);
  const w = W / k;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const title = (size, y, text, color = INK) => {
    x.font = `${size}px "ZCOOL KuaiLe", "PingFang SC", "Microsoft YaHei", sans-serif`;
    x.lineWidth = 6;
    x.strokeStyle = 'rgba(255,255,255,.7)';
    x.lineJoin = 'round';
    x.strokeText(text, w / 2, y);
    x.fillStyle = color;
    x.fillText(text, w / 2, y);
  };
  const num = (size, y, text, color = '#8a7a94') => {
    x.font = `800 ${size}px "Baloo 2", "Noto Sans SC", sans-serif`;
    x.fillStyle = color;
    x.fillText(text, w / 2, y);
  };
  if (s.t === 'prop'){ title(s.n.length > 2 ? 34 : 40, 246, s.n); num(23, 281, '¥' + s.p); }
  else if (s.t === 'station'){ title(s.n.length > 2 ? 30 : 36, 246, s.n); num(22, 281, '¥' + s.p); }
  else if (f.corner){ title(42, 258, s.n); if (s.t === 'go') num(22, 290, '每圈领 200', '#e2557a'); }
  else { title(s.n.length > 2 ? 32 : 38, 248, s.n); if (s.t === 'tax') num(22, 282, '交 ' + s.amt, '#e2557a'); }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- 玩具小动物 ---------- */
function eye(r = 0.022){ return mesh(new THREE.SphereGeometry(r, 12, 10), mat('#2b2230', 0.25), false); }
export function makeAnimal(id, color){
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.07, 32), mat(color, 0.3));
  base.position.y = 0.035;
  g.add(base);
  const ring = mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 40), mat('#ffffff', 0.3), false);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.07;
  g.add(ring);
  const fig = new THREE.Group();
  fig.position.y = 0.07;
  g.add(fig);
  const addP = (geo, c, x, y, z, rough = 0.45) => { const m = mesh(geo, mat(c, rough)); m.position.set(x, y, z); fig.add(m); return m; };
  const sp = r => new THREE.SphereGeometry(r, 24, 18);
  const body = {sheep: '#fbf7f2', panda: '#fbfbf8', tiger: '#ffa94d', rabbit: '#fff1f5', fox: '#ff8a5c', pig: '#ffb3c7'}[id];
  const headY = 0.33;
  addP(new THREE.CapsuleGeometry(0.1, 0.1, 8, 20), body, 0, 0.15, 0);
  const head = addP(sp(0.12), id === 'sheep' ? '#5c4f63' : body, 0, headY, 0);
  head.scale.set(1, 0.95, 0.95);
  for (const [ex, ey, ez] of [[-0.045, headY + 0.015, 0.105], [0.045, headY + 0.015, 0.105]]){ const e = eye(); e.position.set(ex, ey, ez); fig.add(e); }
  for (const [ex, ey, ez] of [[-0.038, headY + 0.025, 0.122], [0.052, headY + 0.025, 0.122]]){ const e = mesh(sp(0.007), mat('#ffffff', 0.2), false); e.position.set(ex, ey, ez); fig.add(e); }
  const cheek = c => { for (const sx of [-1, 1]){ const m = addP(sp(0.022), c, sx * 0.075, headY - 0.025, 0.09); m.scale.z = 0.4; } };
  if (id === 'sheep'){
    for (const [x, y, z, r] of [[0, 0.2, 0.06, 0.08], [-0.07, 0.16, 0, 0.075], [0.07, 0.16, 0, 0.075], [0, 0.16, -0.07, 0.075], [0, 0.26, -0.02, 0.07], [0, headY + 0.1, -0.01, 0.065], [-0.05, headY + 0.08, 0.02, 0.05], [0.05, headY + 0.08, 0.02, 0.05]]) addP(sp(r), '#fff9ef', x, y, z, 0.6);
    for (const [lx, lz] of [[-0.05, 0.04], [0.05, 0.04], [-0.05, -0.05], [0.05, -0.05]]) addP(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), '#5c4f63', lx, 0.05, lz);
    for (const sx of [-1, 1]){ const ear = addP(new THREE.CapsuleGeometry(0.025, 0.06, 4, 8), '#5c4f63', sx * 0.13, headY + 0.02, 0); ear.rotation.z = sx * 1.3; }
    cheek('#ff9bb5');
  } else if (id === 'panda'){
    for (const sx of [-1, 1]){
      addP(sp(0.045), '#2f2a33', sx * 0.08, headY + 0.1, -0.01);
      const patch = addP(sp(0.035), '#2f2a33', sx * 0.045, headY + 0.015, 0.088);
      patch.scale.set(1, 1.25, 0.5);
      const arm = addP(new THREE.CapsuleGeometry(0.035, 0.07, 4, 10), '#2f2a33', sx * 0.105, 0.17, 0.02);
      arm.rotation.z = sx * 0.5;
    }
    fig.children.filter(m => m.geometry.type === 'SphereGeometry' && m.position.z > 0.1 && m.geometry.parameters.radius > 0.01).forEach(m => { m.position.z = 0.112; m.scale.setScalar(0.8); m.material = mat('#ffffff', 0.3); });
    addP(sp(0.018), '#2f2a33', 0, headY - 0.03, 0.115);
  } else if (id === 'tiger'){
    for (const sx of [-1, 1]){ addP(sp(0.04), '#ffa94d', sx * 0.09, headY + 0.09, 0); addP(sp(0.022), '#5a3b2e', sx * 0.09, headY + 0.095, 0.02); }
    const muzzle = addP(sp(0.05), '#fff6ea', 0, headY - 0.04, 0.08);
    muzzle.scale.set(1.2, 0.8, 0.7);
    addP(sp(0.016), '#5a3b2e', 0, headY - 0.02, 0.12);
    for (const y of [0.11, 0.17, 0.23]){ const st = addP(new THREE.TorusGeometry(0.098, 0.012, 6, 24, Math.PI * 0.6), '#5a3b2e', 0, y, 0); st.rotation.set(Math.PI / 2, 0, Math.PI * 1.2); }
    cheek('#ff8b7b');
  } else if (id === 'rabbit'){
    for (const sx of [-1, 1]){
      const ear = addP(new THREE.CapsuleGeometry(0.032, 0.17, 6, 12), '#fff1f5', sx * 0.05, headY + 0.19, -0.01);
      ear.rotation.z = -sx * 0.18;
      const inner = addP(new THREE.CapsuleGeometry(0.016, 0.13, 4, 8), '#ffb3cc', sx * 0.05, headY + 0.19, 0.02);
      inner.rotation.z = -sx * 0.18;
    }
    addP(sp(0.016), '#ff7ea8', 0, headY - 0.02, 0.118);
    addP(sp(0.04), '#ffffff', 0, 0.1, -0.11);
    cheek('#ff9bb5');
  } else if (id === 'fox'){
    for (const sx of [-1, 1]){ const ear = addP(new THREE.ConeGeometry(0.045, 0.11, 12), '#ff8a5c', sx * 0.075, headY + 0.13, 0); ear.rotation.z = -sx * 0.25; }
    const snout = addP(new THREE.ConeGeometry(0.05, 0.1, 16), '#fff6ea', 0, headY - 0.035, 0.11);
    snout.rotation.x = Math.PI / 2;
    addP(sp(0.016), '#2b2230', 0, headY - 0.035, 0.165);
    const tail = addP(new THREE.ConeGeometry(0.06, 0.22, 16), '#ff8a5c', 0, 0.17, -0.13);
    tail.rotation.x = -2.2;
    const tip = addP(sp(0.035), '#fff6ea', 0, 0.26, -0.2);
    tip.scale.y = 1.2;
  } else if (id === 'pig'){
    for (const sx of [-1, 1]){ const ear = addP(new THREE.ConeGeometry(0.04, 0.07, 3), '#ff9db6', sx * 0.08, headY + 0.1, 0.01); ear.rotation.z = -sx * 0.4; }
    const snout = addP(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 20), '#ff9db6', 0, headY - 0.03, 0.115);
    snout.rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) addP(sp(0.01), '#c75a7c', sx * 0.014, headY - 0.03, 0.134);
    cheek('#ff7ea8');
  }
  g.userData.fig = fig;
  return g;
}

/* ---------- 玩具房子 ---------- */
function makeHouse(roofC){
  const g = new THREE.Group();
  box(g, 0.17, 0.13, 0.15, CREAM, {y: 0.065, r: 0.025, rough: 0.5});
  const r = cone(g, 0.135, 0.1, roofC, {y: 0.18, seg: 4, ry: Math.PI / 4, sz: 0.85, rough: 0.35});
  box(g, 0.045, 0.06, 0.01, '#8a6a5c', {y: 0.03, z: 0.078, r: 0.01, cast: false});
  add(g, rbox(0.035, 0.035, 0.01, 0.006), null, {x: -0.05, y: 0.08, z: 0.078, m: glowMat('#ffb347', '#ffe6a8'), cast: false});
  add(g, rbox(0.035, 0.035, 0.01, 0.006), null, {x: 0.05, y: 0.08, z: 0.078, m: glowMat('#ffb347', '#ffe6a8'), cast: false});
  return g;
}
function makeHotel(roofC){
  const g = new THREE.Group();
  box(g, 0.42, 0.5, 0.3, CREAM, {y: 0.25, r: 0.06, rough: 0.5});
  box(g, 0.46, 0.08, 0.34, roofC, {y: 0.53, r: 0.04, rough: 0.35});
  cone(g, 0.12, 0.12, roofC, {y: 0.62, seg: 4, ry: Math.PI / 4, rough: 0.35});
  sph(g, 0.025, '#ffd166', {y: 0.7, seg: 10, rough: 0.3});
  for (let row = 0; row < 3; row++) for (const cx of [-0.12, 0, 0.12]) add(g, rbox(0.07, 0.07, 0.01, 0.015), null, {x: cx, y: 0.13 + row * 0.13, z: 0.152, m: glowMat('#ffb347', '#ffe6a8'), cast: false});
  box(g, 0.1, 0.09, 0.01, '#8a6a5c', {y: 0.045, z: 0.152, r: 0.01, cast: false});
  return g;
}
function makeFlag(color){
  const g = new THREE.Group();
  cyl(g, 0.012, 0.012, 0.36, '#ffffff', {y: 0.18, seg: 8, rough: 0.35});
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.17, -0.055);
  shape.lineTo(0, -0.11);
  add(g, new THREE.ExtrudeGeometry(shape, {depth: 0.015, bevelEnabled: false}), color, {x: 0.012, y: 0.35, z: -0.007, rough: 0.4});
  sph(g, 0.022, '#ffd54f', {y: 0.365, seg: 10, rough: 0.3});
  return g;
}

/* ---------- 骰子 ---------- */
// 六个面依次是 +x、-x、+y、-y、+z、-z，对面加起来是 7
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
function dieFace(v){
  const k = 128, cv = document.createElement('canvas');
  cv.width = cv.height = k;
  const x = cv.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, k, k);
  const P = {1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.26, .26], [.5, .5], [.74, .74]], 4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]], 5: [[.26, .26], [.74, .26], [.5, .5], [.26, .74], [.74, .74]], 6: [[.28, .24], [.72, .24], [.28, .5], [.72, .5], [.28, .76], [.72, .76]]}[v];
  x.fillStyle = v === 1 ? '#ff5d7d' : '#4a3b52';
  for (const [px, py] of P){ x.beginPath(); x.arc(px * k, py * k, v === 1 ? 15 : 11, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({map: t, roughness: 0.25, clearcoat: 0.6});
}
function faceUpQuat(v, yaw){
  const e = {1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2]}[v];
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]));
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
}

/* ---------- 一天的光：从清晨到深夜 ---------- */
// t 从 0 到 1：0 清晨、0.27 正午、0.52 日落、0.6 入夜、0.8 深夜、0.92 黎明前
const DAY = [
  [0.00, {bot: '#ffe4d8', el: 5, az: 0.35, si: 1.4, sc: '#ffb088', top: '#8db6ff', hor: '#ffd2b8', hs: '#ffe4d2', hg: '#e8a9c6', hi: 0.7, fog: '#ffd7c4', glow: 0.35, stars: 0.15, exp: 0.9, bloom: 0.35, bth: 1.4, env: 0.3}],
  [0.10, {bot: '#e6f0ff', el: 32, az: 0.9, si: 2.2, sc: '#ffeedd', top: '#6aaeff', hor: '#d6ecff', hs: '#fff7ef', hg: '#e6c6d8', hi: 0.8, fog: '#dcecff', glow: 0, stars: 0, exp: 0.88, bloom: 0.22, bth: 1.7, env: 0.32}],
  [0.27, {bot: '#e2eeff', el: 66, az: 1.7, si: 2.4, sc: '#fffaf2', top: '#4f9dff', hor: '#c6e5ff', hs: '#ffffff', hg: '#d9c9e6', hi: 0.85, fog: '#d4e9ff', glow: 0, stars: 0, exp: 0.88, bloom: 0.2, bth: 1.8, env: 0.34}],
  [0.42, {bot: '#ffe6d2', el: 26, az: 2.6, si: 2.1, sc: '#ffd59a', top: '#7eafff', hor: '#ffd6a6', hs: '#ffe9cf', hg: '#d9a9c9', hi: 0.75, fog: '#ffd9b8', glow: 0.15, stars: 0, exp: 0.9, bloom: 0.3, bth: 1.6, env: 0.3}],
  [0.52, {bot: '#ffc4b0', el: 6, az: 3.1, si: 1.6, sc: '#ff9466', top: '#6878d6', hor: '#ff9c7e', hs: '#ffc0a3', hg: '#8e6fa8', hi: 0.6, fog: '#ffb09a', glow: 0.9, stars: 0.15, exp: 0.9, bloom: 0.42, bth: 1.25, env: 0.26}],
  [0.60, {bot: '#2a2f6a', el: 42, az: 4.0, si: 0.6, sc: '#8fa6ff', top: '#1c2552', hor: '#4c4c90', hs: '#4d5c9c', hg: '#2f2648', hi: 0.4, fog: '#30356b', glow: 2.0, stars: 1, exp: 0.95, bloom: 0.55, bth: 1.0, env: 0.14}],
  [0.80, {bot: '#1a1d48', el: 55, az: 5.0, si: 0.55, sc: '#8fa6ff', top: '#101733', hor: '#2b2e6a', hs: '#45549a', hg: '#2a2242', hi: 0.38, fog: '#262a5c', glow: 2.2, stars: 1, exp: 0.95, bloom: 0.55, bth: 1.0, env: 0.12}],
  [0.92, {bot: '#5a4f82', el: 25, az: 5.8, si: 0.7, sc: '#9fb0ff', top: '#3b4b90', hor: '#b58ca8', hs: '#5a6aa8', hg: '#4a3658', hi: 0.5, fog: '#5a4d7a', glow: 1.5, stars: 0.6, exp: 0.92, bloom: 0.48, bth: 1.1, env: 0.18}],
  [1.00, {bot: '#ffe4d8', el: 5, az: 6.63, si: 1.4, sc: '#ffb088', top: '#8db6ff', hor: '#ffd2b8', hs: '#ffe4d2', hg: '#e8a9c6', hi: 0.7, fog: '#ffd7c4', glow: 0.35, stars: 0.15, exp: 0.9, bloom: 0.35, bth: 1.4, env: 0.3}]
].map(([t, v]) => { const o = {t}; for (const k in v) o[k] = typeof v[k] === 'string' ? new THREE.Color(v[k]) : v[k]; return o; });
const dayTmp = {};
function dayAt(t){
  t = ((t % 1) + 1) % 1;
  let k = 0;
  while (DAY[k + 1].t < t) k++;
  const a = DAY[k], b = DAY[k + 1], u = (t - a.t) / (b.t - a.t);
  for (const key in a){
    if (key === 't') continue;
    if (a[key].isColor){ dayTmp[key] = dayTmp[key] || new THREE.Color(); dayTmp[key].lerpColors(a[key], b[key], u); }
    else dayTmp[key] = a[key] + (b[key] - a[key]) * u;
  }
  return dayTmp;
}

/* ---------- 场景 ---------- */
export async function createScene(container, {onTileClick} = {}){
  try {
    await Promise.all([
      document.fonts.load('40px "ZCOOL KuaiLe"', '环游大亨上海北京机会'),
      document.fonts.load('800 30px "Baloo 2"', '¥0123456789')
    ]);
  } catch (e) {}

  // 画质档位：手机上自动降一档，跑不动再降
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 520;
  let quality = isMobile ? 1 : 2;
  const renderer = new THREE.WebGLRenderer({antialias: false, alpha: false, powerPreference: 'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;
  scene.fog = new THREE.Fog('#dbeeff', 34, 120);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
  camera.position.set(0, 20, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.25;
  controls.target.set(0, 0, 0);

  /* ----- 天空、星星 ----- */
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {top: {value: new THREE.Color('#74b3ff')}, hor: {value: new THREE.Color('#dcf0ff')}, bot: {value: new THREE.Color('#e4eeff')}, sunDir: {value: new THREE.Vector3(0, 1, 0)}, sunCol: {value: new THREE.Color('#fff')}, sunGlow: {value: 1}},
    vertexShader: `varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 top, hor, bot, sunDir, sunCol; uniform float sunGlow; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); vec3 c = mix(hor, top, pow(clamp(d.y, 0.0, 1.0), 0.6)); c = mix(c, bot, smoothstep(0.0, -0.45, d.y)); c *= 1.25;
        float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 220.0) * 1.3 + pow(s, 8.0) * 0.16) * sunGlow; gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat);
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry();
  {
    const n = 650, p = new Float32Array(n * 3);
    for (let k = 0; k < n; k++){
      const a = Math.random() * Math.PI * 2, e = Math.asin(0.08 + Math.random() * 0.9), r = 90;
      p[k * 3] = Math.cos(a) * Math.cos(e) * r; p[k * 3 + 1] = Math.sin(e) * r; p[k * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  }
  const starMat = new THREE.PointsMaterial({color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false});
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ----- 光 ----- */
  const hemi = new THREE.HemisphereLight('#fff8f0', '#e6c6d8', 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.8);
  sun.position.set(7, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
  Object.assign(sun.shadow.camera, {left: -9.5, right: 9.5, top: 9.5, bottom: -9.5, near: 1, far: 60});
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight('#cfe3ff', 0.35);   // 冷色的补光，背光面不会死黑
  fill.position.set(-8, 6, -7);
  scene.add(fill);

  /* ----- 岛、棋盘、格子、地标 ----- */
  const fx = createFx(scene);
  const staticRoot = new THREE.Group();
  scene.add(staticRoot);
  lathe(staticRoot, [[6.0, -0.55], [6.25, -0.9], [6.1, -1.5], [5.5, -2.4], [4.4, -3.3], [2.8, -4.0], [0, -4.3]], '#e0b8a4', {seg: 48, rough: 0.85});
  for (let k = 0; k < 9; k++){ const a = k / 9 * Math.PI * 2 + 0.3, r = 5.2 + (k % 3) * 0.3; sph(staticRoot, 0.35 + (k % 3) * 0.15, k % 2 ? '#c99b8e' : '#f0cbb8', {x: Math.cos(a) * r, y: -1.9 - (k % 2) * 0.9, z: Math.sin(a) * r, seg: 10, rough: 0.9}); }
  add(staticRoot, rbox(12.7, 0.62, 12.7, 0.3, 4), '#6fd3b0', {y: -0.31, rough: 0.5});
  add(staticRoot, rbox(12.4, 0.04, 12.4, 0.02, 2), '#a9ead2', {y: 0.0, rough: 0.5, cast: false});
  const tiles = [], labelMats = [];
  for (let i = 0; i < N; i++){
    const f = tileFrame(i), s = SQ[i];
    const grp = new THREE.Group();
    grp.position.set(f.x, 0, f.z);
    grp.rotation.y = f.rot;
    add(grp, rbox(f.w - 0.06, TILE_TOP, f.d - 0.06, 0.06, 3), f.corner ? '#ffe9f1' : CREAM, {y: TILE_TOP / 2, rough: 0.32});
    const plinthC = s.t === 'prop' ? GROUPS[s.g].color : PLINTH[s.t] || '#e9e3ef';
    if (f.corner) add(grp, rbox(1.3, 0.07, 0.72, 0.03), plinthC, {y: TILE_TOP + 0.035, z: -0.34, rough: 0.3});
    else add(grp, rbox(f.w - 0.1, 0.08, 0.48, 0.03), plinthC, {y: TILE_TOP + 0.04, z: -0.5, rough: 0.3});
    const lm = makeLandmark(s.lm);
    lm.position.set(0, TILE_TOP + (f.corner ? 0.07 : 0.08), f.corner ? -0.3 : -0.5);
    lm.scale.setScalar(f.corner ? 1.05 : 0.9);
    grp.add(lm);
    const lmat = new THREE.MeshStandardMaterial({map: labelTexture(i), transparent: true, roughness: 0.8, emissive: '#ffffff', emissiveMap: null, emissiveIntensity: 0});
    lmat.emissiveMap = lmat.map;
    labelMats.push(lmat);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(f.w - 0.12, f.d - 0.12), lmat);
    label.rotation.x = -Math.PI / 2;
    label.position.y = TILE_TOP + 0.003;
    label.receiveShadow = true;
    label.userData.keep = 1;
    grp.add(label);
    staticRoot.add(grp);
    tiles.push({grp, f, owner: null, lvl: 0, deco: null});
  }
  // 棋盘四角的路灯
  const LAMP = glowMat('#ffc266', '#fff0c8');
  for (const [x, z] of [[-6.05, -6.05], [6.05, -6.05], [-6.05, 6.05], [6.05, 6.05]]){
    cyl(staticRoot, 0.035, 0.05, 0.9, '#4a3b52', {x, y: 0.45, z, seg: 10});
    sph(staticRoot, 0.1, null, {x, y: 0.95, z, m: LAMP, seg: 14, cast: false});
    torus(staticRoot, 0.1, 0.015, '#4a3b52', {x, y: 0.95, z, rx: Math.PI / 2, seg: 20, tseg: 6, cast: false});
  }
  const P = buildPark(fx);
  staticRoot.add(P.park);
  scene.add(P.live);
  // 合并所有不动的零件
  const baked = bake(staticRoot, BGU);
  scene.add(baked);
  bakeLocal(P.live, BGU);
  bakeLocal(staticRoot, BGU);
  // 会动的小零件（摩天轮、木马、问号……）
  const dyns = [];
  for (const root of [staticRoot, P.live]) root.traverse(o => { if (o.userData.dyn && (o.userData.spin || o.userData.bob || o.userData.keepUp)) dyns.push(o); });
  // 格子上的房子、旗子和主人色条：动态的，单独放
  const decoRoot = new THREE.Group();
  scene.add(decoRoot);
  tiles.forEach(t => { const d = new THREE.Group(); d.position.copy(t.grp.position); d.rotation.copy(t.grp.rotation); decoRoot.add(d); t.deco = d; });
  // 选中某格时的光圈
  const ringMat = new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.0, depthWrite: false});
  const hiRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 48), ringMat);
  hiRing.rotation.x = -Math.PI / 2;
  hiRing.position.y = TILE_TOP + 0.01;
  scene.add(hiRing);
  let hiAt = -1;

  /* ----- 棋子 ----- */
  const tokens = new Map();
  const slotOff = [[-0.2, 0.3], [0.2, 0.3], [-0.2, 0.06], [0.2, 0.06]];
  const cornerOff = [[-0.3, 0.5], [0.3, 0.5], [-0.3, 0.22], [0.3, 0.22]];
  function tokenSpot(i, slot){
    const f = tileFrame(i);
    const [lx, lz] = (f.corner ? cornerOff : slotOff)[slot % 4];
    return local(i, lx, lz, TILE_TOP);
  }
  function faceOut(g, i){ g.rotation.y = tileFrame(i).rot + Math.PI; }

  /* ----- 骰子 ----- */
  const dieGeo = rbox(0.42, 0.42, 0.42, 0.08, 4);
  const dieMats = FACE_VALUES.map(dieFace);
  const dice = [0, 1].map(k => {
    const d = new THREE.Mesh(dieGeo, dieMats);
    d.castShadow = true;
    d.position.set(-0.45 + k * 0.9, 0.42, -0.1);
    d.quaternion.copy(faceUpQuat(k ? 4 : 3, k * 0.6));
    scene.add(d);
    return d;
  });

  /* ----- 动画小工具 ----- */
  const tweens = [];
  function tween(dur, fn){
    return new Promise(res => {
      if (reduced) dur = Math.min(dur, 120);
      tweens.push({t0: performance.now(), dur, fn, res});
    });
  }
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* ----- 镜头 ----- */
  const view = {target: new THREE.Vector3(), dist: 30, polar: 0.6, azim: -0.5, userAt: 0, user: false, spin: false, speed: 2.6};
  const portrait = () => container.clientWidth / Math.max(1, container.clientHeight) < 0.85;
  const sideAzim = side => [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
  function aimAt(pos, side, dist){
    const alongX = side % 2 === 0;
    view.target.set(pos.x * (alongX ? 0.86 : 0.62), 0.1, pos.z * (alongX ? 0.62 : 0.86));
    view.azim = sideAzim(side);
    view.dist = dist;
    view.polar = portrait() ? 0.74 : 0.8;
  }
  function overview(){
    view.target.set(0, 0, 0);
    view.dist = portrait() ? 27 : 17.5;
    view.polar = portrait() ? 0.62 : 0.82;
  }
  const followDist = () => (portrait() ? 10.5 : 11);
  {
    const sph0 = new THREE.Spherical(view.dist, view.polar, view.azim);
    camera.position.setFromSpherical(sph0).add(view.target);
    controls.target.copy(view.target);
  }
  controls.addEventListener('start', () => { view.userAt = performance.now(); view.user = true; });
  controls.addEventListener('end', () => { view.userAt = performance.now(); view.user = false; });
  const tmpS = new THREE.Spherical();
  function stepCamera(dt){
    if (view.spin && !view.user) view.azim += dt * 0.07;
    if (view.user || (!view.spin && performance.now() - view.userAt < 4000)) return;
    const k = 1 - Math.exp(-dt * view.speed);
    controls.target.lerp(view.target, k);
    const off = camera.position.clone().sub(controls.target);
    tmpS.setFromVector3(off);
    let dAz = view.azim - tmpS.theta;
    while (dAz > Math.PI) dAz -= Math.PI * 2;
    while (dAz < -Math.PI) dAz += Math.PI * 2;
    tmpS.theta += dAz * k;
    tmpS.phi += (view.polar - tmpS.phi) * k;
    tmpS.radius += (view.dist - tmpS.radius) * k;
    camera.position.setFromSpherical(tmpS).add(controls.target);
  }

  /* ----- 后期 ----- */
  let composer = null, bloomPass = null, toyPass = null;
  function setupPost(){
    if (composer){ composer.dispose && composer.dispose(); composer = null; }
    const w = Math.max(1, renderer.domElement.width), h = Math.max(1, renderer.domElement.height);
    if (quality === 0){ bloomPass = toyPass = null; return; }
    const rt = new THREE.WebGLRenderTarget(w, h, {samples: quality === 2 ? 4 : 2, type: THREE.HalfFloatType});
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(w >> 1, h >> 1), 0.25, 0.6, 1.7);
    composer.addPass(bloomPass);
    toyPass = new ShaderPass(ToyShader);
    toyPass.uniforms.resolution.value.set(w, h);
    toyPass.uniforms.strength.value = quality === 2 ? 2.0 : 1.3;
    composer.addPass(toyPass);
    composer.addPass(new OutputPass());
  }
  function applyQuality(){
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 2 ? 2 : quality === 1 ? 1.5 : 1));
    sun.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
    if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
  }
  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.fov = camera.aspect < 0.8 ? 52 : 42;
    camera.updateProjectionMatrix();
    setupPost();
    if (composer) composer.setSize(w, h);
    fx.setScale(renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)));
  }
  new ResizeObserver(resize).observe(container);
  applyQuality();

  /* ----- 一天的光 ----- */
  let dayT = 0.14, dayTarget = null, dayDrift = 0, night = 0;
  const sunDir = new THREE.Vector3();
  function applyDay(){
    const d = dayAt(dayT);
    const el = d.el * Math.PI / 180, az = d.az;
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    sun.position.copy(sunDir).multiplyScalar(22);
    sun.color.copy(d.sc);
    sun.intensity = d.si;
    hemi.color.copy(d.hs);
    hemi.groundColor.copy(d.hg);
    hemi.intensity = d.hi;
    skyMat.uniforms.top.value.copy(d.top);
    skyMat.uniforms.hor.value.copy(d.hor);
    skyMat.uniforms.bot.value.copy(d.bot);
    skyMat.uniforms.sunDir.value.copy(sunDir);
    skyMat.uniforms.sunCol.value.copy(d.sc);
    skyMat.uniforms.sunGlow.value = d.el > 15 ? 1 : Math.max(0, d.el / 15);
    scene.fog.color.copy(d.fog);
    starMat.opacity = d.stars * 0.9;
    renderer.toneMappingExposure = d.exp;
    scene.environmentIntensity = d.env;
    setGlow(d.glow);
    for (const m of labelMats) m.emissiveIntensity = night * 0.4;
    if (bloomPass){ bloomPass.strength = d.bloom; bloomPass.threshold = d.bth; }
    night = Math.min(1, d.glow / 2.0);
    fill.intensity = 0.35 - night * 0.15;
  }
  applyDay();

  /* ----- 烟花 ----- */
  const rockets = [];
  function launchFireworks(at, count = 3){
    for (let k = 0; k < count; k++) rockets.push({p: at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6)), v: new THREE.Vector3((Math.random() - 0.5) * 1.2, 5.5 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2), t: -k * 0.45, color: ['#ff6f9a', '#ffd54f', '#7fd0ef', '#b9a5ff', '#6fd6a0'][Math.floor(Math.random() * 5)], fuse: 0.7 + Math.random() * 0.25});
  }
  let onBoom = null;

  /* ----- 每帧 ----- */
  let last = performance.now(), running = true, tt = 0, fpsAcc = 0, fpsN = 0, fpsCheckAt = 5;
  const tmpV = new THREE.Vector3();
  function frame(now){
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt, now);
    requestAnimationFrame(frame);
  }
  function tick(dt, now){
    tt += dt;
    for (let k = tweens.length - 1; k >= 0; k--){
      const tw = tweens[k], t = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(t);
      if (t >= 1){ tweens.splice(k, 1); tw.res(); }
    }
    for (const o of dyns){
      const u = o.userData;
      if (u.spin === 'y') o.rotation.y += dt * u.speed;
      else if (u.spin === 'z') o.rotation.z += dt * u.speed;
      else if (u.spin === 'x') o.rotation.x += dt * u.speed;
      if (u.keepUp) o.rotation.z = -o.parent.rotation.z;
      if (u.bob){ if (u.y0 == null) u.y0 = o.position.y; o.position.y = u.y0 + Math.sin(tt * 2.2 + (u.phase || 0)) * u.bob; }
    }
    if (dayDrift){ dayT = (dayT + dayDrift * dt) % 1; applyDay(); }
    else if (dayTarget != null && Math.abs(dayTarget - dayT) > 0.0005){ dayT += (dayTarget - dayT) * Math.min(1, dt * 0.6); applyDay(); }
    P.update(dt, tt, night);
    for (let k = rockets.length - 1; k >= 0; k--){
      const r = rockets[k];
      r.t += dt;
      if (r.t < 0) continue;
      r.v.y -= 2.5 * dt;
      r.p.addScaledVector(r.v, dt);
      fx.trail(r.p, r.color);
      if (r.t > r.fuse){ fx.firework(r.p, r.color); rockets.splice(k, 1); if (onBoom) onBoom(); }
    }
    fx.update(dt);
    for (const [, tk] of tokens) if (!tk.busy) tk.g.userData.fig.position.y = 0.07 + Math.max(0, Math.sin(tt * 2.4 + tk.phase)) * 0.015;
    if (hiAt >= 0) ringMat.opacity = 0.55 + Math.sin(tt * 5) * 0.25;
    stepCamera(dt);
    controls.update();
    if (toyPass){
      tmpV.copy(controls.target).project(camera);
      toyPass.uniforms.focus.value = THREE.MathUtils.clamp((tmpV.y + 1) / 2, 0.2, 0.8);
    }
    if (composer) composer.render(); else renderer.render(scene, camera);
    // 跑不动就降一档画质
    fpsAcc += dt; fpsN++;
    if (tt > fpsCheckAt){
      const fps = fpsN / fpsAcc;
      fpsAcc = 0; fpsN = 0; fpsCheckAt = tt + 4;
      if (fps < 34 && quality > 0){ quality--; applyQuality(); }
    }
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running){ running = true; last = performance.now(); requestAnimationFrame(frame); }
  });

  /* ----- 点格子 ----- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const pick = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 13.5), new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}));
  pick.rotation.x = -Math.PI / 2;
  pick.position.y = TILE_TOP;
  scene.add(pick);
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObject(pick, false)[0];
    if (!hit) return;
    const i = tileAt(hit.point.x, hit.point.z);
    if (i >= 0 && onTileClick) onTileClick(i);
  });

  /* ----- 小截图：给卡片上画地标、给头像画小动物 ----- */
  let snapR = null, snapScene = null, snapCam = null;
  const snapCache = new Map();
  function snap(key, build, o){
    if (snapCache.has(key)) return snapCache.get(key);
    if (!snapR){
      snapR = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true});
      snapR.setSize(384, 384);
      snapR.setPixelRatio(1);
      snapR.outputColorSpace = THREE.SRGBColorSpace;
      snapR.toneMapping = THREE.NeutralToneMapping;
      snapR.toneMappingExposure = 1.0;
      snapScene = new THREE.Scene();
      snapScene.environment = scene.environment;
      snapScene.environmentIntensity = 0.35;
      snapScene.add(new THREE.HemisphereLight('#fff8f0', '#e6c6d8', 1.0));
      const l = new THREE.DirectionalLight('#fff1dc', 2.4);
      l.position.set(3, 6, 5);
      snapScene.add(l);
      snapCam = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
    }
    const obj = build();
    snapScene.add(obj);
    const g = setGlowSnapshot(o.glow || 0);
    obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y * 1.1, size.z) * 0.5;
    const dist = r / Math.tan(snapCam.fov * Math.PI / 360) * (o.fit || 1.0);
    const dir = new THREE.Vector3(o.dx ?? 0.55, o.dy ?? 0.5, o.dz ?? 1.0).normalize();
    snapCam.position.copy(c).addScaledVector(dir, dist);
    snapCam.lookAt(c);
    snapR.render(snapScene, snapCam);
    const url = snapR.domElement.toDataURL('image/png');
    snapScene.remove(obj);
    g();
    snapCache.set(key, url);
    return url;
  }
  function setGlowSnapshot(k){ const was = night; setGlow(k); return () => setGlow(dayAt(dayT).glow); }

  /* ----- 给外面用的 ----- */
  const api = {
    THREE, scene, camera, renderer, fx, view,
    get quality(){ return quality; },
    get night(){ return night; },
    // 主人色条、旗子和房子
    setTile(i, ownerColor, lvl){
      const t = tiles[i];
      if (t.owner === ownerColor && t.lvl === lvl) return;
      const grew = ownerColor && t.owner === ownerColor && lvl > t.lvl;
      t.owner = ownerColor;
      t.lvl = lvl;
      t.deco.clear();
      if (!ownerColor) return;
      const f = t.f;
      add(t.deco, rbox(f.w - 0.16, 0.05, 0.07, 0.02), ownerColor, {y: TILE_TOP + 0.025, z: f.d / 2 - 0.08, rough: 0.3, cast: false});
      const flag = makeFlag(ownerColor);
      flag.scale.setScalar(0.8);
      flag.position.set(f.w / 2 - 0.12, TILE_TOP, f.d / 2 - 0.2);
      t.deco.add(flag);
      const items = [];
      const rowZ = f.corner ? 0.05 : -0.16;
      if (lvl === 5){
        const h = makeHotel(ownerColor);
        h.position.set(0, TILE_TOP, rowZ - 0.02);
        h.scale.setScalar(0.78);
        t.deco.add(h);
        items.push(h);
      } else for (let k = 0; k < lvl; k++){
        const h = makeHouse(ownerColor);
        h.position.set(-0.3 + k * 0.2, TILE_TOP, rowZ);
        h.scale.setScalar(0.95);
        t.deco.add(h);
        items.push(h);
      }
      if (grew && items.length){
        const it = items[lvl === 5 ? 0 : items.length - 1], s0 = it.scale.x;
        it.scale.setScalar(0.001);
        tween(560, u => it.scale.setScalar(s0 * (u < 0.7 ? ease(u / 0.7) * 1.2 : 1.2 - (u - 0.7) / 0.3 * 0.2)));
        it.getWorldPosition(tmpV);
        fx.sparkle(tmpV, lvl === 5 ? 40 : 18);
      }
    },
    // 摆好所有棋子（没动画）
    syncTokens(players){
      const seen = new Set(), bySq = {};
      players.forEach(p => {
        if (p.out) return;
        seen.add(p.pid);
        const slot = (bySq[p.pos] = (bySq[p.pos] || 0) + 1) - 1;
        let tk = tokens.get(p.pid);
        if (!tk){
          const ch = CHARS.find(c => c.id === p.ch) || CHARS[0];
          const g = makeAnimal(ch.id, ch.color);
          g.scale.setScalar(1.3);
          scene.add(g);
          tk = {g, phase: Math.random() * 6};
          tokens.set(p.pid, tk);
        }
        if (tk.busy) return;
        tk.g.position.copy(tokenSpot(p.pos, slot));
        faceOut(tk.g, p.pos);
      });
      for (const [pid, tk] of tokens) if (!seen.has(pid)){ scene.remove(tk.g); tokens.delete(pid); }
    },
    // 一格一格跳过去；每落一格叫一次 onStep
    async hop(pid, path, stepMs = 210, onStep){
      const tk = tokens.get(pid);
      if (!tk || !path.length) return;
      tk.busy = true;
      let k = 0;
      for (const i of path){
        const from = tk.g.position.clone(), to = tokenSpot(i, 0);
        aimAt(to, tileFrame(i).side, followDist());
        await tween(stepMs, t => {
          tk.g.position.lerpVectors(from, to, t);
          tk.g.position.y = TILE_TOP + Math.sin(t * Math.PI) * 0.36;
          tk.g.userData.fig.scale.y = 1 + Math.sin(t * Math.PI) * 0.1;
          tk.g.userData.fig.scale.x = tk.g.userData.fig.scale.z = 1 - Math.sin(t * Math.PI) * 0.05;
        });
        faceOut(tk.g, i);
        fx.dust(to, 7);
        if (onStep) onStep(k++, i);
      }
      tk.g.userData.fig.scale.set(1, 1, 1);
      tk.busy = false;
    },
    // 直接传送（进监狱这种）
    async teleport(pid, to){
      const tk = tokens.get(pid);
      if (!tk) return;
      tk.busy = true;
      const g = tk.g, from = g.position.clone(), dst = tokenSpot(to, 0);
      fx.sparkle(from, 16, ['#b9a5ff', '#ffffff']);
      await tween(280, t => { g.position.y = from.y + ease(t) * 2.5; g.scale.setScalar(1.3 * (1 - t * 0.6)); g.rotation.y += 0.25; });
      g.position.set(dst.x, dst.y + 2.5, dst.z);
      faceOut(g, to);
      aimAt(dst, tileFrame(to).side, followDist());
      await tween(380, t => { g.position.y = dst.y + (1 - ease(t)) * 2.5; g.scale.setScalar(1.3 * (0.4 + ease(t) * 0.6)); });
      fx.dust(dst, 12);
      tk.busy = false;
    },
    focusTile(i){
      const f = tileFrame(i);
      aimAt(new THREE.Vector3(f.x, 0, f.z), f.side, followDist());
    },
    overview,
    // 首页和大厅：镜头慢慢绕着岛转；开场先从远处推进来
    idle(on){
      view.spin = on;
      if (on){ overview(); view.dist = portrait() ? 24 : 18; view.polar = portrait() ? 0.78 : 0.92; }
    },
    intro(){
      view.spin = true;
      view.speed = 0.9;
      tmpS.set(portrait() ? 50 : 40, 0.35, -1.2);
      camera.position.setFromSpherical(tmpS);
      controls.target.set(0, 0, 0);
      overview();
      view.dist = portrait() ? 24 : 18;
      view.polar = portrait() ? 0.78 : 0.92;
      view.azim = -0.4;
      setTimeout(() => { view.speed = 2.6; }, 3500);
    },
    // 扔骰子：从镜头这边扔到草地上，翻几个跟头停在给定的点数上
    async rollDice(vals){
      dice[1].visible = !!vals[1];
      if (!vals[1]) vals = [vals[0], 1];
      const cam = camera.position.clone().setY(0).normalize();
      const land = [new THREE.Vector3(-0.4, 0, -0.1), new THREE.Vector3(0.42, 0, -0.3)].map(v => v.add(cam.clone().multiplyScalar(0.35)));
      const jobs = dice.map((d, k) => {
        const start = land[k].clone().add(cam.clone().multiplyScalar(2.6)).setY(1.8 + k * 0.3);
        const end = land[k].clone().setY(0.19 + 0.21);
        const qEnd = faceUpQuat(vals[k], Math.random() * Math.PI * 2);
        const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.3, Math.random() - 0.5).normalize();
        const spins = Math.PI * (5 + Math.random() * 2);
        let bounced = 0;
        return tween(1050 + k * 120, t => {
          const e = ease(t);
          d.position.lerpVectors(start, end, e);
          const bounce = Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t) * 0.9;
          d.position.y = end.y + (1 - e) * (start.y - end.y) * 0.5 + bounce;
          const q = new THREE.Quaternion().setFromAxisAngle(axis, spins * (1 - e));
          d.quaternion.copy(q.multiply(qEnd));
          if (t > 0.42 && bounced === 0){ bounced = 1; fx.dust(end, 6); }
        });
      });
      await Promise.all(jobs);
    },
    // 格子和棋子在屏幕上的位置：界面层用来冒数字
    screenPos(i){
      const f = tileFrame(i), v = new THREE.Vector3(f.x, 0.6, f.z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return {x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height};
    },
    tokenScreenPos(pid){
      const tk = tokens.get(pid);
      if (!tk) return null;
      const v = tk.g.position.clone().setY(tk.g.position.y + 0.75).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return {x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height};
    },
    tilePos(i){ const f = tileFrame(i); return new THREE.Vector3(f.x, TILE_TOP, f.z); },
    tokenPos(pid){ const tk = tokens.get(pid); return tk ? tk.g.position.clone() : null; },
    highlight(i){
      hiAt = i;
      if (i < 0){ ringMat.opacity = 0; return; }
      const f = tileFrame(i);
      hiRing.position.set(f.x, TILE_TOP + 0.012, f.z);
      hiRing.scale.setScalar(f.corner ? 1.2 : 1);
    },
    // 特效
    burst(kind, at){ const p = at.isVector3 ? at : api.tilePos(at); if (fx[kind]) fx[kind](p); },
    fireworks(i, count = 3){ launchFireworks(api.tilePos(i).setY(0.6), count); },
    set onBoom(fn){ onBoom = fn; },
    // 一天的时间：0 清晨 … 0.27 正午 … 0.52 日落 … 0.8 深夜
    setDay(t, smooth){ dayDrift = 0; if (smooth) dayTarget = t; else { dayTarget = null; dayT = t; applyDay(); } },
    // 让一天自己慢慢走（首页用）：speed 是每秒走多少天
    drift(speed){ dayDrift = speed; dayTarget = null; },
    get day(){ return dayT; },
    // 调试用：当场渲染一帧，缩小后返回 jpeg
    // 调试用：手动走几帧（页面在后台时 rAF 不跑）
    step(n = 1, dt = 1 / 60){ for (let k = 0; k < n; k++) tick(dt, performance.now()); },
    shot(scale = 0.5, q = 0.82){
      if (composer) composer.render(); else renderer.render(scene, camera);
      const src = renderer.domElement, cv = document.createElement('canvas');
      cv.width = Math.round(src.width * scale);
      cv.height = Math.round(src.height * scale);
      cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', q);
    },
    snapshot(i){ const s = SQ[i]; return snap('lm:' + s.lm, () => { const g = makeLandmark(s.lm); return g; }, {glow: 0.9, dx: 0.5, dy: 0.5, dz: 1, fit: 0.98}); },
    portrait(ch){ const c = CHARS.find(x => x.id === ch) || CHARS[0]; return snap('ch:' + ch, () => makeAnimal(c.id, c.color), {glow: 0, dx: 0.15, dy: 0.4, dz: 1, fit: 0.95}); }
  };
  return api;
}
