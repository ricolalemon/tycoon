// 每一格上的小地标：用积木搭出来的玩具版名胜。原点在格子顶面，+z 朝棋盘外（镜头那边），
// 普通格子的地标占 x ±0.35、z ±0.22 这么大一块，高度最多 1.2 左右
import * as THREE from 'three';
import {mat, glowMat, WATER, GLASS, add, box, cyl, cone, sph, torus, capsule, roof, lathe, tag, rbox} from './mats.js?v=caed7d2d';

const C = {
  white: '#fffaf3', cream: '#fff1dc', red: '#ff6b6b', vermil: '#e8573f', gold: '#ffd166', jade: '#6fd6a0', green: '#5fbf85', leaf: '#7ccf8a',
  dark: '#4a3b52', grey: '#cfc6d6', iron: '#8a8ea3', stone: '#e9dfd0', wood: '#c08a63', brown: '#9c6b4e', rock: '#8c6b5b', blue: '#5b8def', glaze: '#4e9a73',
  sky: '#7fd0ef', pink: '#ff92c2', lav: '#b9a5ff', orange: '#ffad5f', tan: '#e5c39a', sand: '#ffe9b8', black: '#2f2a33', brick: '#c9a985', ice: '#dfe9ff'
};
const WIN = () => glowMat('#ffb347', '#ffe6a8');       // 暖黄的窗户
const LANTERN = () => glowMat('#ff4f4f', '#ff8080');   // 红灯笼
const NEON = () => glowMat('#ff7ad9', '#ffd1f0');      // 粉色霓虹
const COOL = () => glowMat('#4fc3ff', '#bfe9ff');      // 蓝白的灯
// 一扇窗：贴在墙面上的发光小方块
const win = (g, x, y, z, w = 0.045, h = 0.05, o = {}) => add(g, rbox(w, h, 0.012, 0.004), null, {x, y, z, m: o.m || WIN(), cast: false, ...o});
const rowWin = (g, n, x0, x1, y, z, w, h, m) => { for (let k = 0; k < n; k++) win(g, n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * k / (n - 1), y, z, w, h, {m}); };
const water = (g, w, d, z = 0, y = 0.015) => add(g, rbox(w, 0.03, d, 0.01), null, {y, z, m: WATER, cast: false});
const mound = (g, r, x = 0, z = 0, c = C.leaf, sy = 0.38) => sph(g, r, c, {x, z, sy, rough: 0.7, seg: 24});
const palm = (g, x, z, h = 0.38, lean = 0.08) => {
  const t = new THREE.Group();
  for (let k = 0; k < 4; k++) cyl(t, 0.02, 0.026, h / 4 + 0.01, C.wood, {x: lean * k * k * 0.18, y: h / 8 + k * h / 4, rz: -lean * 0.6, seg: 10});
  const top = new THREE.Vector3(lean * 9 * 0.18, h, 0);
  for (let k = 0; k < 6; k++){
    const a = k / 6 * Math.PI * 2;
    const leaf = sph(t, 0.1, '#5fbf85', {x: top.x + Math.cos(a) * 0.07, y: top.y + 0.01, z: Math.sin(a) * 0.07, sx: 1, sy: 0.22, sz: 0.42, ry: -a, rough: 0.6, seg: 10});
    leaf.rotation.z = -0.45;
  }
  sph(t, 0.022, C.brown, {x: top.x + 0.03, y: top.y - 0.03, z: 0.02, seg: 8});
  sph(t, 0.022, C.brown, {x: top.x - 0.02, y: top.y - 0.03, z: -0.03, seg: 8});
  t.position.set(x, 0, z);
  g.add(t);
  return t;
};
const tree = (g, x, z, c = C.leaf, r = 0.08, h = 0.08) => { cyl(g, 0.014, 0.018, h, C.wood, {x, y: h / 2, z, seg: 8}); sph(g, r, c, {x, y: h + r * 0.75, z, rough: 0.65, seg: 16}); };
// 中式小塔的一层：身子加飞檐
const tier = (g, y, w, h, wall, roofC, seg = 4) => {
  if (seg === 4){ box(g, w, h, w * 0.7, wall, {y: y + h / 2}); roof(g, w + 0.06, 0.07, roofC, {y: y + h, sz: 0.72}); }
  else { cyl(g, w / 2, w / 2, h, wall, {y: y + h / 2, seg}); cone(g, w / 2 + 0.035, 0.04, roofC, {y: y + h + 0.02, seg}); }
};
const spire = (g, y, c = C.gold) => { cone(g, 0.02, 0.07, c, {y: y + 0.035, seg: 10}); sph(g, 0.014, c, {y: y + 0.08, seg: 8}); };

export const LM = {
  /* ----- 可可 ----- */
  taersi(g){
    box(g, 0.52, 0.16, 0.3, C.white, {y: 0.08});
    box(g, 0.42, 0.14, 0.24, C.vermil, {y: 0.23});
    roof(g, 0.42, 0.14, C.gold, {y: 0.3, sz: 0.65, rough: 0.3});
    rowWin(g, 4, -0.18, 0.18, 0.09, 0.151, 0.045, 0.05);
    rowWin(g, 2, -0.08, 0.08, 0.24, 0.121, 0.045, 0.05);
    // 旁边一座白塔
    cyl(g, 0.055, 0.065, 0.06, C.white, {x: 0.32, y: 0.03, seg: 16});
    sph(g, 0.05, C.white, {x: 0.32, y: 0.1, seg: 16});
    cone(g, 0.03, 0.1, C.gold, {x: 0.32, y: 0.19, seg: 12, rough: 0.3});
    for (let k = 0; k < 5; k++) box(g, 0.03, 0.025, 0.006, [C.red, C.gold, C.sky, C.white, C.jade][k], {x: -0.34 + k * 0.03, y: 0.42, z: 0.14, rx: 0.3});
    cyl(g, 0.005, 0.005, 0.2, C.wood, {x: -0.34, y: 0.33, z: 0.14, seg: 6});
  },
  xixia(g){
    box(g, 0.7, 0.03, 0.42, C.sand, {y: 0.015, rough: 0.8});
    const hill = (x, z, h, r) => {
      cyl(g, r * 0.2, r, h, C.tan, {x, y: h / 2, z, seg: 24, rough: 0.8});
      cyl(g, r * 0.68, r * 0.72, 0.02, '#d9b98f', {x, y: h * 0.4, z, seg: 24, rough: 0.8});
      cyl(g, r * 0.42, r * 0.46, 0.02, '#d9b98f', {x, y: h * 0.7, z, seg: 24, rough: 0.8});
    };
    hill(-0.14, -0.02, 0.36, 0.15);
    hill(0.19, 0.04, 0.26, 0.11);
    for (const [x, z] of [[-0.3, 0.12], [0.02, 0.14], [0.3, -0.1]]) box(g, 0.06, 0.04, 0.05, '#d9c4a3', {x, y: 0.02, z, rough: 0.8});
    // 一只小骆驼
    capsule(g, 0.025, 0.05, C.tan, {x: 0.04, y: 0.07, z: 0.16, rz: Math.PI / 2});
    sph(g, 0.02, C.tan, {x: 0.04, y: 0.11, z: 0.16, seg: 8});
    sph(g, 0.018, C.tan, {x: 0.08, y: 0.1, z: 0.16, seg: 8});
    for (const dx of [-0.02, 0.02]) cyl(g, 0.006, 0.006, 0.04, C.tan, {x: 0.04 + dx, y: 0.02, z: 0.16, seg: 6});
  },
  /* ----- 天蓝 ----- */
  potala(g){
    box(g, 0.72, 0.1, 0.38, C.rock, {y: 0.05, rough: 0.85});
    box(g, 0.68, 0.22, 0.3, C.white, {y: 0.21});
    box(g, 0.56, 0.12, 0.26, C.white, {y: 0.37});
    box(g, 0.3, 0.24, 0.24, C.vermil, {y: 0.53});
    box(g, 0.32, 0.03, 0.26, '#b94a37', {y: 0.655});
    for (const x of [-0.09, 0, 0.09]){ box(g, 0.07, 0.025, 0.09, C.gold, {x, y: 0.68, rough: 0.3}); cone(g, 0.045, 0.04, C.gold, {x, y: 0.71, seg: 4, ry: Math.PI / 4, rough: 0.3}); }
    rowWin(g, 8, -0.3, 0.3, 0.16, 0.151, 0.035, 0.04);
    rowWin(g, 8, -0.3, 0.3, 0.25, 0.151, 0.035, 0.04);
    rowWin(g, 6, -0.22, 0.22, 0.38, 0.131, 0.035, 0.04);
    rowWin(g, 3, -0.08, 0.08, 0.49, 0.121, 0.04, 0.05);
    rowWin(g, 3, -0.08, 0.08, 0.58, 0.121, 0.04, 0.05);
    // 之字形的台阶
    for (let k = 0; k < 3; k++) box(g, 0.1, 0.02, 0.09, C.stone, {x: (k % 2 ? -0.1 : 0.1), y: 0.12 + k * 0.08, z: 0.19 - k * 0.02, rough: 0.7});
  },
  waterwheel(g){
    box(g, 0.7, 0.03, 0.42, '#e3bd6c', {y: 0.015, rough: 0.6});
    box(g, 0.7, 0.03, 0.08, C.leaf, {y: 0.018, z: -0.19, rough: 0.7});
    const w = tag(new THREE.Group(), {dyn: 1, spin: 'z', speed: 0.55});
    torus(w, 0.2, 0.016, C.wood, {seg: 40, tseg: 8});
    torus(w, 0.13, 0.012, C.wood, {seg: 32, tseg: 8});
    for (let k = 0; k < 8; k++){
      const a = k / 8 * Math.PI;
      box(w, 0.012, 0.4, 0.012, C.wood, {rz: a, r: 0.003});
    }
    for (let k = 0; k < 12; k++){
      const a = k / 12 * Math.PI * 2;
      box(w, 0.03, 0.06, 0.05, '#a9775a', {x: Math.cos(a) * 0.2, y: Math.sin(a) * 0.2, rz: a - Math.PI / 2, r: 0.005});
    }
    cyl(w, 0.025, 0.025, 0.08, C.dark, {rx: Math.PI / 2, seg: 10});
    w.position.set(-0.12, 0.26, 0);
    g.add(w);
    for (const z of [-0.05, 0.05]) for (const sx of [-1, 1]) cyl(g, 0.012, 0.014, 0.3, C.brown, {x: -0.12 + sx * 0.07, y: 0.13, z, rz: sx * 0.28, seg: 8});
    // 黄河铁桥
    torus(g, 0.13, 0.014, C.iron, {x: 0.25, y: 0.03, arc: Math.PI, seg: 24, tseg: 6});
    torus(g, 0.13, 0.014, C.iron, {x: 0.25, y: 0.03, z: 0.08, arc: Math.PI, seg: 24, tseg: 6});
    box(g, 0.34, 0.02, 0.12, C.grey, {x: 0.25, y: 0.045, z: 0.04});
  },
  longxiang(g){
    mound(g, 0.34, 0, 0, C.leaf);
    for (let k = 0; k < 9; k++){
      const y = 0.11 + k * 0.08;
      cyl(g, 0.1 - k * 0.0075, 0.105 - k * 0.0075, 0.05, C.cream, {y: y + 0.025, seg: 8});
      cone(g, 0.14 - k * 0.009, 0.03, C.iron, {y: y + 0.065, seg: 8});
    }
    spire(g, 0.84);
    rowWin(g, 1, 0, 0, 0.135, 0.1, 0.03, 0.03);
    for (const [x, z] of [[-0.28, 0.1], [0.27, -0.08], [0.25, 0.14]]) tree(g, x, z, '#4faa72', 0.06, 0.05);
  },
  /* ----- 樱粉 ----- */
  jiaxiu(g){
    water(g, 0.7, 0.42);
    box(g, 0.56, 0.04, 0.12, C.stone, {y: 0.05, rough: 0.7});
    for (const x of [-0.18, 0, 0.18]) torus(g, 0.045, 0.012, C.stone, {x, y: 0.035, arc: Math.PI, seg: 16, tseg: 6, rough: 0.7});
    box(g, 0.3, 0.06, 0.3, C.stone, {y: 0.08, rough: 0.7});
    const ws = [0.26, 0.2, 0.14], ys = [0.11, 0.27, 0.43];
    ws.forEach((w, k) => {
      const y = ys[k];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.011, 0.011, 0.1, C.vermil, {x: sx * w * 0.4, y: y + 0.05, z: sz * w * 0.33, seg: 8});
      box(g, w, 0.025, w * 0.75, C.wood, {y: y + 0.1});
      roof(g, w + 0.08, 0.07, C.glaze, {y: y + 0.11, sz: 0.75});
    });
    spire(g, 0.63);
    for (const x of [-0.08, 0.08]) sph(g, 0.016, null, {x, y: 0.2, z: 0.11, m: LANTERN(), seg: 8});
  },
  jinma(g){
    box(g, 0.7, 0.03, 0.3, C.stone, {y: 0.015, rough: 0.7});
    for (const cx of [-0.18, 0.18]){
      for (const dx of [-0.1, 0.1]){ cyl(g, 0.018, 0.02, 0.32, C.vermil, {x: cx + dx, y: 0.16, seg: 10}); box(g, 0.05, 0.03, 0.05, C.stone, {x: cx + dx, y: 0.015}); }
      box(g, 0.3, 0.04, 0.06, C.gold, {x: cx, y: 0.3, rough: 0.3});
      box(g, 0.26, 0.035, 0.06, C.glaze, {x: cx, y: 0.345});
      roof(g, 0.28, 0.07, C.glaze, {y: 0.36, x: cx, sz: 0.35});
      sph(g, 0.018, null, {x: cx, y: 0.22, z: 0.04, m: LANTERN(), seg: 8});
    }
    // 中间的金马和碧鸡
    capsule(g, 0.02, 0.04, C.gold, {x: -0.18, y: 0.48, rz: Math.PI / 2, rough: 0.3});
    sph(g, 0.016, C.gold, {x: -0.14, y: 0.5, seg: 8, rough: 0.3});
    sph(g, 0.022, C.jade, {x: 0.18, y: 0.48, seg: 10});
    cone(g, 0.012, 0.03, C.orange, {x: 0.21, y: 0.49, rz: -Math.PI / 2, seg: 6});
  },
  coconut(g){
    box(g, 0.7, 0.04, 0.42, C.sand, {y: 0.02, rough: 0.9});
    water(g, 0.7, 0.14, 0.15, 0.03);
    palm(g, -0.24, -0.06, 0.4, 0.07);
    palm(g, 0.02, -0.12, 0.34, -0.06);
    palm(g, 0.26, 0.0, 0.44, 0.05);
    box(g, 0.2, 0.2, 0.12, C.cream, {x: -0.22, y: 0.14, z: -0.14});
    box(g, 0.22, 0.03, 0.14, C.orange, {x: -0.22, y: 0.25, z: -0.14});
    for (const x of [-0.27, -0.17]) box(g, 0.05, 0.08, 0.01, C.dark, {x, y: 0.08, z: -0.078});
    rowWin(g, 2, -0.27, -0.17, 0.19, -0.078, 0.04, 0.04);
    cone(g, 0.07, 0.04, C.pink, {x: 0.2, y: 0.17, z: 0.08, seg: 10});
    cyl(g, 0.005, 0.005, 0.16, C.white, {x: 0.2, y: 0.08, z: 0.08, seg: 6});
  },
  /* ----- 橘子 ----- */
  aiwan(g){
    mound(g, 0.36, 0, 0, '#86cf7e');
    cyl(g, 0.14, 0.15, 0.04, C.stone, {y: 0.14, seg: 16, rough: 0.7});
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.012, 0.012, 0.15, C.vermil, {x: sx * 0.085, y: 0.235, z: sz * 0.085, seg: 8});
    roof(g, 0.3, 0.1, '#5e7f6b', {y: 0.31});
    roof(g, 0.17, 0.09, '#5e7f6b', {y: 0.43});
    spire(g, 0.54);
    for (const [x, z, r, c] of [[-0.26, 0.06, 0.09, C.red], [0.25, -0.04, 0.085, '#ff8c42'], [0.1, 0.15, 0.07, C.red], [-0.12, -0.14, 0.07, '#ff8c42']]) tree(g, x, z, c, r, 0.09);
  },
  tengwang(g){
    box(g, 0.52, 0.08, 0.36, C.stone, {y: 0.04, rough: 0.7});
    box(g, 0.2, 0.04, 0.1, C.stone, {y: 0.02, z: 0.22, rough: 0.7});
    const T = [[0.4, 0.17, 0.26], [0.32, 0.15, 0.2], [0.22, 0.13, 0.16]];
    let y = 0.08;
    T.forEach(([w, h, d], k) => {
      box(g, w, h, d, C.vermil, {y: y + h / 2});
      box(g, w + 0.04, 0.02, d + 0.04, C.wood, {y: y + h + 0.01});
      roof(g, w + 0.08, k === 2 ? 0.12 : 0.08, C.glaze, {y: y + h + 0.02, sz: d / w});
      rowWin(g, k === 2 ? 2 : 3, -w * 0.3, w * 0.3, y + h / 2, d / 2 + 0.001, 0.045, 0.05);
      y += h + 0.1;
    });
    spire(g, y + 0.02);
  },
  tokamak(g){
    cyl(g, 0.24, 0.26, 0.06, '#b9b3c9', {y: 0.03, seg: 28});
    cyl(g, 0.17, 0.18, 0.12, C.dark, {y: 0.12, seg: 28});
    torus(g, 0.14, 0.05, null, {y: 0.22, rx: Math.PI / 2, seg: 40, tseg: 14, m: glowMat('#ff9a2e', '#ffd27a')});
    for (let k = 0; k < 8; k++){ const a = k / 8 * Math.PI * 2; box(g, 0.05, 0.14, 0.04, C.grey, {x: Math.cos(a) * 0.14, y: 0.22, z: Math.sin(a) * 0.14, ry: -a}); }
    box(g, 0.18, 0.2, 0.14, C.white, {x: -0.28, y: 0.1, z: -0.1});
    sph(g, 0.075, C.sky, {x: -0.28, y: 0.2, z: -0.1, seg: 16, rough: 0.3});
    rowWin(g, 2, -0.33, -0.23, 0.1, -0.029, 0.04, 0.05);
    cyl(g, 0.015, 0.015, 0.2, C.grey, {x: -0.16, y: 0.1, z: -0.06, rz: Math.PI / 2, seg: 8});
    for (const [x, z] of [[0.3, 0.12], [0.28, -0.12]]) tree(g, x, z, C.leaf, 0.05, 0.05);
  },
  /* ----- 西瓜 ----- */
  erqi(g){
    box(g, 0.4, 0.06, 0.26, C.stone, {y: 0.03, rough: 0.7});
    for (const cx of [-0.075, 0.075]){
      for (let k = 0; k < 7; k++){
        const w = 0.12 - k * 0.006, y = 0.06 + k * 0.09;
        box(g, w, 0.075, w, C.cream, {x: cx, y: y + 0.0375});
        box(g, w + 0.035, 0.014, w + 0.035, C.glaze, {x: cx, y: y + 0.08});
        win(g, cx, y + 0.035, w / 2 + 0.001, 0.03, 0.035);
      }
      roof(g, 0.15, 0.1, C.glaze, {y: 0.69, x: cx});
      spire(g, 0.8 + 0.0, C.red);
    }
    box(g, 0.14, 0.07, 0.1, C.cream, {y: 0.5});
    cyl(g, 0.03, 0.03, 0.012, C.white, {y: 0.5, z: 0.055, rx: Math.PI / 2, seg: 16});
    box(g, 0.004, 0.02, 0.004, C.dark, {y: 0.508, z: 0.062});
    box(g, 0.014, 0.004, 0.004, C.dark, {x: 0.006, y: 0.5, z: 0.062});
  },
  dayan(g){
    box(g, 0.46, 0.06, 0.36, C.stone, {y: 0.03, rough: 0.7});
    for (let k = 0; k < 7; k++){
      const w = 0.3 - k * 0.028, y = 0.06 + k * 0.105;
      box(g, w, 0.09, w, C.brick, {y: y + 0.045, rough: 0.75});
      box(g, w + 0.05, 0.016, w + 0.05, '#8a6a56', {y: y + 0.095});
      win(g, 0, y + 0.04, w / 2 + 0.001, k ? 0.03 : 0.05, k ? 0.035 : 0.06);
    }
    spire(g, 0.8);
    for (const [x, z] of [[-0.3, 0.1], [0.3, 0.12]]) tree(g, x, z, '#4faa72', 0.06, 0.06);
    // 门口的小灯笼
    for (const x of [-0.1, 0.1]) sph(g, 0.016, null, {x, y: 0.1, z: 0.19, m: LANTERN(), seg: 8});
  },
  huanghe(g){
    box(g, 0.52, 0.08, 0.36, C.stone, {y: 0.04, rough: 0.7});
    let y = 0.08;
    for (let k = 0; k < 5; k++){
      const w = 0.4 - k * 0.06, h = 0.09;
      box(g, w, h, w * 0.66, C.vermil, {y: y + h / 2});
      roof(g, w + 0.1, 0.07, '#ffc53d', {y: y + h, sz: 0.7, rough: 0.3});
      rowWin(g, k < 3 ? 3 : 2, -w * 0.3, w * 0.3, y + h / 2, w * 0.33 + 0.001, 0.04, 0.045);
      y += h + 0.075;
    }
    spire(g, y + 0.01);
  },
  /* ----- 柠檬 ----- */
  tianjineye(g){
    water(g, 0.7, 0.42);
    box(g, 0.7, 0.06, 0.16, C.stone, {y: 0.06, rough: 0.7});
    for (const z of [-0.075, 0.075]) box(g, 0.7, 0.03, 0.01, C.white, {y: 0.1, z});
    const w = tag(new THREE.Group(), {dyn: 1, spin: 'z', speed: 0.25});
    torus(w, 0.3, 0.014, C.lav, {seg: 48, tseg: 8});
    torus(w, 0.1, 0.01, C.lav, {seg: 24, tseg: 6});
    for (let k = 0; k < 8; k++) box(w, 0.008, 0.6, 0.008, C.white, {rz: k / 8 * Math.PI, r: 0.002});
    const cols = [C.red, C.gold, C.sky, C.jade, C.pink, C.orange];
    for (let k = 0; k < 12; k++){
      const a = k / 12 * Math.PI * 2;
      const gondola = tag(new THREE.Group(), {dyn: 1, keepUp: 1});
      box(gondola, 0.045, 0.04, 0.035, cols[k % 6], {y: -0.03});
      gondola.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
      w.add(gondola);
    }
    cyl(w, 0.02, 0.02, 0.06, C.dark, {rx: Math.PI / 2, seg: 10});
    w.position.set(0, 0.4, 0);
    g.add(w);
    for (const z of [-0.035, 0.035]) for (const sx of [-1, 1]) cyl(g, 0.01, 0.012, 0.36, C.white, {x: sx * 0.1, y: 0.24, z, rz: sx * 0.3, seg: 8});
    for (let k = 0; k < 4; k++) sph(g, 0.012, null, {x: -0.3 + k * 0.2, y: 0.13, z: 0.07, m: WIN(), seg: 6});
  },
  hongya(g){
    box(g, 0.72, 0.18, 0.3, C.rock, {y: 0.09, z: -0.1, rough: 0.85});
    water(g, 0.72, 0.14, 0.17);
    for (let k = 0; k < 5; k++){
      const w = 0.62 - k * 0.07, y = 0.18 + k * 0.11, z = -0.04 - k * 0.025;
      box(g, w, 0.1, 0.18, k % 2 ? '#c07d60' : '#a8674e', {y: y + 0.05, z});
      box(g, w + 0.04, 0.02, 0.21, '#5a4a52', {y: y + 0.11, z});
      rowWin(g, Math.max(2, Math.round(w / 0.085)), -w / 2 + 0.05, w / 2 - 0.05, y + 0.05, z + 0.091, 0.035, 0.04);
      for (const sx of [-1, 1]) sph(g, 0.014, null, {x: sx * (w / 2 - 0.02), y: y + 0.03, z: z + 0.11, m: LANTERN(), seg: 8});
    }
    for (let k = 0; k < 5; k++) cyl(g, 0.008, 0.008, 0.18, C.brown, {x: -0.26 + k * 0.13, y: 0.09, z: 0.03, seg: 6});
    spire(g, 0.74, C.red);
  },
  panda(g){
    mound(g, 0.36, 0, 0, '#8ed38a');
    for (let k = 0; k < 4; k++){
      const x = -0.3 + k * 0.06, z = -0.12 + (k % 2) * 0.08, h = 0.42 + (k % 3) * 0.06;
      cyl(g, 0.011, 0.012, h, C.leaf, {x, y: 0.1 + h / 2, z, seg: 8});
      for (let j = 1; j < 4; j++) torus(g, 0.013, 0.004, '#4faa72', {x, y: 0.1 + h * j / 4, z, rx: Math.PI / 2, seg: 10, tseg: 5});
      for (let j = 0; j < 3; j++) sph(g, 0.04, '#5fbf85', {x: x + (j % 2 ? 0.03 : -0.03), y: 0.1 + h * (0.5 + j * 0.18), z: z + 0.01, sx: 1, sy: 0.25, sz: 0.5, rz: j % 2 ? -0.6 : 0.6, seg: 8});
    }
    const px = 0.1, pz = 0.04;
    sph(g, 0.11, C.white, {x: px, y: 0.21, z: pz, sy: 1.05, seg: 24});
    sph(g, 0.09, C.white, {x: px, y: 0.37, z: pz, seg: 24});
    for (const sx of [-1, 1]){
      sph(g, 0.032, C.black, {x: px + sx * 0.065, y: 0.44, z: pz, seg: 12});
      sph(g, 0.027, C.black, {x: px + sx * 0.035, y: 0.385, z: pz + 0.072, sy: 1.3, sz: 0.5, seg: 12});
      sph(g, 0.01, C.white, {x: px + sx * 0.035, y: 0.39, z: pz + 0.088, seg: 8});
      sph(g, 0.045, C.black, {x: px + sx * 0.085, y: 0.11, z: pz + 0.05, seg: 12});
      capsule(g, 0.03, 0.05, C.black, {x: px + sx * 0.1, y: 0.24, z: pz + 0.05, rz: sx * 0.9, rx: 0.3});
    }
    sph(g, 0.013, C.black, {x: px, y: 0.35, z: pz + 0.088, seg: 8});
    sph(g, 0.02, C.pink, {x: px + 0.055, y: 0.355, z: pz + 0.07, sz: 0.4, seg: 8});
    sph(g, 0.02, C.pink, {x: px - 0.055, y: 0.355, z: pz + 0.07, sz: 0.4, seg: 8});
    cyl(g, 0.01, 0.011, 0.2, C.leaf, {x: px + 0.02, y: 0.27, z: pz + 0.11, rz: 0.5, seg: 8});
    sph(g, 0.035, '#5fbf85', {x: px + 0.08, y: 0.35, z: pz + 0.11, sy: 0.3, seg: 8, rz: 0.5});
  },
  /* ----- 薄荷 ----- */
  leifeng(g){
    mound(g, 0.32, -0.08, -0.06, '#86cf7e');
    water(g, 0.7, 0.12, 0.17);
    torus(g, 0.06, 0.014, C.stone, {x: 0.22, y: 0.025, z: 0.17, arc: Math.PI, seg: 16, tseg: 6, rough: 0.7});
    box(g, 0.2, 0.016, 0.05, C.stone, {x: 0.22, y: 0.085, z: 0.17, rough: 0.7});
    for (let k = 0; k < 5; k++){
      const y = 0.1 + k * 0.1, r = 0.12 - k * 0.013;
      cyl(g, r, r + 0.005, 0.065, '#b47b55', {x: -0.08, y: y + 0.0325, z: -0.06, seg: 8});
      cone(g, r + 0.045, 0.04, '#6b4a3a', {x: -0.08, y: y + 0.085, z: -0.06, seg: 8});
      win(g, -0.08, y + 0.03, -0.06 + r + 0.001, 0.03, 0.03);
    }
    spire(g, 0.61);
    for (const [x, z] of [[0.26, -0.1], [-0.3, 0.1]]) tree(g, x, z, C.pink, 0.07, 0.07);
  },
  canton(g){
    cyl(g, 0.15, 0.17, 0.03, C.grey, {y: 0.015, seg: 24});
    const pts = [[0.1, 0], [0.085, 0.2], [0.06, 0.45], [0.045, 0.62], [0.058, 0.82], [0.075, 0.97], [0.075, 1.0]];
    lathe(g, pts, '#f4f1ff', {seg: 24, rough: 0.25});
    const wire = lathe(g, pts.map(([r, y]) => [r + 0.006, y]), null, {seg: 16, m: new THREE.MeshBasicMaterial({color: '#c9b8ff', wireframe: true}), cast: false, recv: false});
    wire.userData.keep = 1;
    for (const y of [0.3, 0.62, 0.9]) torus(g, pts.reduce((r, [pr, py]) => (Math.abs(py - y) < Math.abs(r[1] - y) ? [pr, py] : r), [1, 9])[0] + 0.012, 0.008, null, {y, rx: Math.PI / 2, m: NEON(), seg: 32, tseg: 6, cast: false});
    cyl(g, 0.01, 0.014, 0.28, C.white, {y: 1.14, seg: 8});
    sph(g, 0.012, null, {y: 1.29, m: NEON(), seg: 8, cast: false});
    water(g, 0.7, 0.1, 0.18);
  },
  shenzhen(g){
    box(g, 0.7, 0.03, 0.42, '#d7d3e6', {y: 0.015});
    const tower = (x, z, w, h, c, top) => {
      box(g, w, h, w, c, {x, y: h / 2, z, rough: 0.2});
      for (const sx of [-1, 1]) add(g, rbox(0.014, h - 0.08, 0.008, 0.002), null, {x: x + sx * w * 0.28, y: h / 2, z: z + w / 2 + 0.001, m: WIN(), cast: false});
      if (top === 'pin'){ cone(g, w * 0.5, 0.1, c, {x, y: h + 0.05, z, seg: 4, ry: Math.PI / 4, rough: 0.2}); cyl(g, 0.005, 0.005, 0.12, C.white, {x, y: h + 0.14, z, seg: 6}); }
      else box(g, w + 0.02, 0.015, w + 0.02, C.white, {x, y: h, z});
    };
    tower(0.05, -0.06, 0.12, 0.95, C.ice, 'pin');
    tower(-0.2, -0.02, 0.13, 0.55, C.white);
    tower(0.26, 0.06, 0.1, 0.44, '#cfe7ff');
    tower(-0.06, 0.13, 0.15, 0.28, C.white);
    palm(g, -0.3, 0.14, 0.26, 0.05);
  },
  /* ----- 蓝莓 ----- */
  pearl(g){
    cyl(g, 0.2, 0.22, 0.03, C.grey, {y: 0.015, seg: 24});
    for (let k = 0; k < 3; k++){
      const a = k / 3 * Math.PI * 2 + Math.PI / 2, x = Math.cos(a) * 0.1, z = Math.sin(a) * 0.1;
      const leg = cyl(g, 0.016, 0.02, 0.36, '#d8d4e6', {x: x / 2, y: 0.17, z: z / 2, seg: 10});
      leg.lookAt(new THREE.Vector3(0, 0.36, 0));
      leg.rotateX(Math.PI / 2);
    }
    cyl(g, 0.032, 0.036, 1.0, '#d8d4e6', {y: 0.55, seg: 14});
    sph(g, 0.115, '#ff5c8a', {y: 0.4, seg: 24, rough: 0.2});
    sph(g, 0.075, '#ff5c8a', {y: 0.76, seg: 20, rough: 0.2});
    sph(g, 0.04, '#ff5c8a', {y: 1.0, seg: 14, rough: 0.2});
    for (const y of [0.4, 0.76]) torus(g, y === 0.4 ? 0.118 : 0.078, 0.006, null, {y, rx: Math.PI / 2, m: NEON(), seg: 32, tseg: 6, cast: false});
    cyl(g, 0.006, 0.008, 0.26, C.white, {y: 1.15, seg: 6});
    box(g, 0.1, 0.62, 0.1, '#cfe3ff', {x: -0.26, y: 0.31, z: -0.06, rough: 0.2});
    cone(g, 0.06, 0.08, '#cfe3ff', {x: -0.26, y: 0.66, z: -0.06, seg: 4, ry: Math.PI / 4, rough: 0.2});
    add(g, rbox(0.12, 0.8, 0.12, 0.05), '#e6f0ff', {x: 0.26, y: 0.4, z: -0.08, rough: 0.2});
    for (const x of [-0.26, 0.26]) add(g, rbox(0.014, 0.5, 0.008, 0.002), null, {x, y: 0.3, z: x < 0 ? -0.009 : -0.019, m: WIN(), cast: false});
    water(g, 0.7, 0.1, 0.18);
  },
  tiantan(g){
    cyl(g, 0.33, 0.34, 0.03, C.white, {y: 0.015, seg: 32});
    cyl(g, 0.28, 0.29, 0.03, C.white, {y: 0.045, seg: 32});
    cyl(g, 0.23, 0.24, 0.03, C.white, {y: 0.075, seg: 32});
    const level = (r, y, hWall, hRoof) => {
      cyl(g, r, r, hWall, C.vermil, {y: y + hWall / 2, seg: 32});
      torus(g, r + 0.03, 0.012, C.gold, {y: y + hWall + 0.005, rx: Math.PI / 2, seg: 36, tseg: 6, rough: 0.3});
      cone(g, r + 0.06, hRoof, '#3f7fd8', {y: y + hWall + hRoof / 2 + 0.01, seg: 32, rough: 0.3});
      for (let k = 0; k < 6; k++){ const a = k / 6 * Math.PI * 2; win(g, Math.sin(a) * (r + 0.001), y + hWall / 2, Math.cos(a) * (r + 0.001), 0.03, 0.04, {ry: a}); }
    };
    level(0.16, 0.09, 0.1, 0.08);
    level(0.115, 0.26, 0.07, 0.07);
    level(0.08, 0.39, 0.06, 0.1);
    sph(g, 0.022, C.gold, {y: 0.57, seg: 10, rough: 0.3});
    for (const [x, z] of [[-0.32, 0.1], [0.32, 0.12]]) tree(g, x, z, '#4faa72', 0.05, 0.05);
  },
  /* ----- 车站 ----- */
  train(g){
    box(g, 0.72, 0.05, 0.42, '#e9e3ef', {y: 0.025});
    for (const z of [0.06, 0.14]) box(g, 0.72, 0.01, 0.012, C.iron, {y: 0.055, z});
    box(g, 0.5, 0.11, 0.12, C.white, {y: 0.12, z: 0.1, r: 0.045, rough: 0.3});
    sph(g, 0.058, C.white, {x: 0.27, y: 0.12, z: 0.1, sx: 1.7, seg: 16, rough: 0.3});
    box(g, 0.5, 0.025, 0.125, C.blue, {y: 0.1, z: 0.1, r: 0.005});
    box(g, 0.46, 0.02, 0.1, C.grey, {y: 0.175, z: 0.1});
    rowWin(g, 5, -0.2, 0.16, 0.135, 0.161, 0.045, 0.035);
    win(g, 0.3, 0.135, 0.13, 0.04, 0.03, {ry: 0.8});
    for (const x of [-0.25, 0.1]) cyl(g, 0.012, 0.012, 0.3, C.lav, {x, y: 0.15, z: -0.1, seg: 8});
    box(g, 0.5, 0.02, 0.2, C.lav, {y: 0.31, z: -0.1});
    cyl(g, 0.035, 0.035, 0.012, C.white, {x: -0.28, y: 0.22, z: -0.1, rx: Math.PI / 2, seg: 16});
  },
  plane(g){
    box(g, 0.72, 0.04, 0.42, '#cfd3e0', {y: 0.02});
    for (let k = 0; k < 5; k++) box(g, 0.07, 0.006, 0.02, C.white, {x: -0.28 + k * 0.14, y: 0.043, z: 0.12});
    capsule(g, 0.05, 0.3, C.white, {y: 0.15, z: 0.02, rz: Math.PI / 2, rough: 0.3});
    box(g, 0.09, 0.014, 0.4, C.white, {y: 0.14, z: 0.02, rough: 0.3});
    box(g, 0.04, 0.012, 0.16, C.white, {x: -0.16, y: 0.16, z: 0.02});
    box(g, 0.025, 0.09, 0.07, C.pink, {x: -0.17, y: 0.21, z: 0.02});
    for (const z of [-0.07, 0.11]) cyl(g, 0.02, 0.02, 0.06, C.grey, {x: 0.02, y: 0.11, z, rz: Math.PI / 2, seg: 12});
    for (let k = 0; k < 5; k++) sph(g, 0.009, null, {x: -0.1 + k * 0.05, y: 0.165, z: 0.071, m: WIN(), seg: 6, cast: false});
    for (const [x, z] of [[0.08, -0.02], [-0.06, -0.02], [-0.06, 0.06]]) cyl(g, 0.012, 0.012, 0.02, C.dark, {x, y: 0.09, z, rx: Math.PI / 2, seg: 8});
    cyl(g, 0.03, 0.035, 0.2, C.grey, {x: -0.3, y: 0.1, z: -0.15, seg: 10});
    add(g, rbox(0.11, 0.06, 0.11, 0.02), null, {x: -0.3, y: 0.23, z: -0.15, m: GLASS});
    box(g, 0.13, 0.015, 0.13, C.white, {x: -0.3, y: 0.265, z: -0.15});
  },
  ship(g){
    water(g, 0.72, 0.42);
    box(g, 0.5, 0.1, 0.18, C.red, {y: 0.07, r: 0.03});
    cone(g, 0.09, 0.14, C.red, {x: 0.3, y: 0.07, rz: -Math.PI / 2, seg: 4, ry: 0, sy: 1, sz: 1});
    box(g, 0.5, 0.02, 0.18, C.cream, {y: 0.125});
    box(g, 0.18, 0.1, 0.12, C.white, {x: -0.1, y: 0.19});
    rowWin(g, 3, -0.16, -0.04, 0.2, 0.061, 0.03, 0.03);
    cyl(g, 0.03, 0.032, 0.1, C.gold, {x: -0.16, y: 0.28, seg: 12});
    cyl(g, 0.032, 0.032, 0.02, C.red, {x: -0.16, y: 0.33, seg: 12});
    for (const [x, c] of [[0.08, C.sky], [0.16, C.jade], [0.08, C.orange]]) box(g, 0.07, 0.05, 0.08, c, {x, y: 0.135 + (x === 0.08 && c === C.orange ? 0.05 : 0) + 0.025, z: x === 0.16 ? 0.03 : -0.03});
    box(g, 0.035, 0.42, 0.035, C.gold, {x: 0.3, y: 0.21, z: -0.16});
    box(g, 0.3, 0.03, 0.03, C.gold, {x: 0.16, y: 0.42, z: -0.16});
    cyl(g, 0.003, 0.003, 0.18, C.dark, {x: 0.04, y: 0.33, z: -0.16, seg: 4});
    box(g, 0.05, 0.04, 0.05, C.red, {x: 0.04, y: 0.22, z: -0.16});
  },
  bus(g){
    box(g, 0.72, 0.03, 0.42, '#9aa0b4', {y: 0.015, rough: 0.9});
    for (let k = 0; k < 6; k++) box(g, 0.04, 0.004, 0.3, C.white, {x: -0.28 + k * 0.08, y: 0.032, z: 0.02});
    box(g, 0.44, 0.17, 0.16, C.gold, {y: 0.14, r: 0.035, rough: 0.3});
    add(g, rbox(0.36, 0.06, 0.168, 0.01), null, {y: 0.17, m: WIN(), cast: false});
    box(g, 0.44, 0.015, 0.16, C.white, {y: 0.23});
    for (const x of [-0.14, 0.14]) for (const z of [-0.075, 0.075]) cyl(g, 0.035, 0.035, 0.025, C.black, {x, y: 0.04, z, rx: Math.PI / 2, seg: 14});
    for (const z of [-0.055, 0.055]) sph(g, 0.012, null, {x: 0.22, y: 0.12, z, m: WIN(), seg: 6, cast: false});
    cyl(g, 0.008, 0.008, 0.3, C.grey, {x: -0.3, y: 0.15, z: -0.15, seg: 6});
    box(g, 0.1, 0.07, 0.015, C.sky, {x: -0.3, y: 0.3, z: -0.15});
    box(g, 0.14, 0.015, 0.05, C.wood, {x: 0.28, y: 0.08, z: -0.15});
    for (const x of [0.23, 0.33]) box(g, 0.01, 0.07, 0.04, C.wood, {x, y: 0.035, z: -0.15});
  },
  /* ----- 角上和功能格 ----- */
  gate(g){
    box(g, 0.9, 0.012, 0.08, C.white, {y: 0.006, z: 0.2});
    for (let k = 0; k < 9; k++) box(g, 0.1, 0.014, 0.08, k % 2 ? C.white : C.dark, {x: -0.4 + k * 0.1, y: 0.006, z: 0.2});
    [[0.4, C.red], [0.35, C.gold], [0.3, C.sky]].forEach(([r, c]) => torus(g, r, 0.028, c, {arc: Math.PI, seg: 40, tseg: 10, rough: 0.35}));
    for (const sx of [-1, 1]){
      box(g, 0.16, 0.08, 0.16, C.white, {x: sx * 0.35, y: 0.04});
      cyl(g, 0.006, 0.006, 0.3, C.wood, {x: sx * 0.42, y: 0.23, z: 0.06, seg: 6});
      box(g, 0.1, 0.06, 0.008, sx < 0 ? C.pink : C.jade, {x: sx * 0.42 + (sx < 0 ? 0.05 : -0.05), y: 0.35, z: 0.06});
    }
    for (const [x, c] of [[-0.12, C.pink], [0.1, C.sky], [0.0, C.gold]]){
      cyl(g, 0.003, 0.003, 0.2, C.grey, {x, y: 0.5, z: -0.1, seg: 4});
      sph(g, 0.05, c, {x, y: 0.64, z: -0.1, sy: 1.15, seg: 14, rough: 0.3});
    }
  },
  jail(g){
    box(g, 0.36, 0.3, 0.28, '#b9b3c9', {y: 0.15, rough: 0.8});
    box(g, 0.42, 0.05, 0.34, C.dark, {y: 0.32});
    box(g, 0.16, 0.11, 0.012, C.black, {y: 0.2, z: 0.141});
    for (let k = 0; k < 3; k++) cyl(g, 0.007, 0.007, 0.11, C.grey, {x: -0.04 + k * 0.04, y: 0.2, z: 0.146, seg: 6});
    box(g, 0.1, 0.13, 0.012, C.brown, {x: 0, y: 0.065, z: 0.141});
    sph(g, 0.012, C.gold, {x: 0.03, y: 0.065, z: 0.15, seg: 8});
    cyl(g, 0.02, 0.02, 0.1, '#b9b3c9', {x: -0.12, y: 0.37, z: -0.08, seg: 10});
    for (const sx of [-1, 1]) box(g, 0.06, 0.1, 0.06, '#9d97ad', {x: sx * 0.26, y: 0.05, z: 0.1});
  },
  rides(g){
    cyl(g, 0.24, 0.25, 0.03, C.pink, {y: 0.015, seg: 32});
    cyl(g, 0.012, 0.012, 0.36, C.white, {y: 0.2, seg: 10});
    cone(g, 0.27, 0.13, C.pink, {y: 0.44, seg: 12, rough: 0.35});
    torus(g, 0.26, 0.012, C.gold, {y: 0.38, rx: Math.PI / 2, seg: 32, tseg: 6, rough: 0.3});
    sph(g, 0.03, C.gold, {y: 0.52, seg: 10, rough: 0.3});
    const spin = tag(new THREE.Group(), {dyn: 1, spin: 'y', speed: 0.7});
    const cols = [C.sky, C.gold, C.jade, C.lav];
    for (let k = 0; k < 4; k++){
      const a = k / 4 * Math.PI * 2, x = Math.cos(a) * 0.16, z = Math.sin(a) * 0.16;
      cyl(spin, 0.005, 0.005, 0.3, C.gold, {x, y: 0.2, z, seg: 6});
      const horse = tag(new THREE.Group(), {dyn: 1, bob: 0.035, phase: k * 1.6});
      capsule(horse, 0.028, 0.06, cols[k], {rz: Math.PI / 2});
      sph(horse, 0.025, cols[k], {x: 0.045, y: 0.03, seg: 10});
      cone(horse, 0.01, 0.03, C.white, {x: 0.055, y: 0.06, seg: 6});
      horse.position.set(x, 0.14, z);
      horse.rotation.y = -a;
      spin.add(horse);
    }
    g.add(spin);
    for (const [x, c, y] of [[0.36, C.red, 0.3], [0.4, C.gold, 0.36], [0.33, C.sky, 0.38]]){
      cyl(g, 0.003, 0.003, 0.2, C.grey, {x: 0.36, y: 0.1, z: 0.12, seg: 4});
      sph(g, 0.04, c, {x, y, z: 0.12, sy: 1.15, seg: 12, rough: 0.3});
    }
  },
  police(g){
    box(g, 0.72, 0.03, 0.42, '#9aa0b4', {y: 0.015, rough: 0.9});
    box(g, 0.34, 0.09, 0.16, C.white, {y: 0.085, r: 0.03, rough: 0.3});
    box(g, 0.2, 0.08, 0.14, C.blue, {x: -0.02, y: 0.17, r: 0.03, rough: 0.3});
    add(g, rbox(0.16, 0.05, 0.142, 0.01), null, {x: -0.02, y: 0.17, m: WIN(), cast: false});
    box(g, 0.06, 0.02, 0.05, null, {x: -0.055, y: 0.22, m: glowMat('#ff3b3b', '#ff7a7a')});
    box(g, 0.06, 0.02, 0.05, null, {x: 0.015, y: 0.22, m: glowMat('#3b7bff', '#8fb3ff')});
    for (const x of [-0.11, 0.11]) for (const z of [-0.075, 0.075]) cyl(g, 0.03, 0.03, 0.025, C.black, {x, y: 0.035, z, rx: Math.PI / 2, seg: 14});
    cone(g, 0.03, 0.08, C.orange, {x: 0.3, y: 0.04, z: 0.12, seg: 10});
    cyl(g, 0.008, 0.008, 0.3, C.grey, {x: -0.3, y: 0.15, z: -0.14, seg: 6});
    cyl(g, 0.06, 0.06, 0.012, C.red, {x: -0.3, y: 0.32, z: -0.14, rx: Math.PI / 2, seg: 8});
  },
  qmark(g){
    box(g, 0.24, 0.1, 0.24, C.pink, {y: 0.05, r: 0.03, rough: 0.35});
    const q = tag(new THREE.Group(), {dyn: 1, spin: 'y', speed: 0.9, bob: 0.03});
    torus(q, 0.075, 0.026, C.gold, {y: 0.13, arc: Math.PI * 1.45, rz: -0.25, seg: 28, tseg: 10, rough: 0.3});
    cyl(q, 0.026, 0.026, 0.07, C.gold, {y: 0.03, seg: 12, rough: 0.3});
    sph(q, 0.03, C.gold, {y: -0.06, seg: 12, rough: 0.3});
    q.position.y = 0.26;
    g.add(q);
  },
  orb(g){
    cyl(g, 0.07, 0.09, 0.05, C.gold, {y: 0.025, seg: 16, rough: 0.3});
    for (let k = 0; k < 3; k++){ const a = k / 3 * Math.PI * 2; cyl(g, 0.008, 0.01, 0.1, C.gold, {x: Math.cos(a) * 0.06, y: 0.09, z: Math.sin(a) * 0.06, seg: 6, rough: 0.3}); }
    sph(g, 0.095, null, {y: 0.19, m: glowMat('#b56bff', '#e2c6ff'), seg: 24});
    const stars = tag(new THREE.Group(), {dyn: 1, spin: 'y', speed: 1.4});
    for (let k = 0; k < 3; k++){ const a = k / 3 * Math.PI * 2; sph(stars, 0.014, C.gold, {x: Math.cos(a) * 0.14, y: Math.sin(a * 2) * 0.03, z: Math.sin(a) * 0.14, seg: 8, rough: 0.3}); }
    stars.position.y = 0.22;
    g.add(stars);
  },
  coins(g){
    const stack = (x, z, n) => { for (let k = 0; k < n; k++) cyl(g, 0.06, 0.06, 0.018, C.gold, {x: x + (k % 2) * 0.006, y: 0.009 + k * 0.019, z, seg: 20, rough: 0.3}); };
    stack(-0.2, 0.04, 6);
    stack(-0.06, -0.08, 9);
    stack(0.06, 0.1, 4);
    sph(g, 0.1, '#d9a066', {x: 0.22, y: 0.1, z: -0.04, sy: 1.15, seg: 20, rough: 0.7});
    cyl(g, 0.035, 0.045, 0.05, '#d9a066', {x: 0.22, y: 0.22, z: -0.04, seg: 12, rough: 0.7});
    torus(g, 0.04, 0.01, C.red, {x: 0.22, y: 0.2, z: -0.04, rx: Math.PI / 2, seg: 16, tseg: 6});
  },
  stall(g){
    box(g, 0.5, 0.14, 0.22, '#ffd9b3', {y: 0.07, r: 0.02});
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.012, 0.012, 0.36, C.wood, {x: sx * 0.23, y: 0.18, z: sz * 0.1, seg: 8});
    for (let k = 0; k < 5; k++) box(g, 0.104, 0.02, 0.3, k % 2 ? C.white : C.pink, {x: -0.208 + k * 0.104, y: 0.37, rx: 0.22, r: 0.004});
    for (const [x, c, rc] of [[-0.15, C.sky, C.pink], [0.0, C.jade, C.gold], [0.15, C.lav, C.white]]){
      box(g, 0.09, 0.08, 0.09, c, {x, y: 0.18, r: 0.01});
      box(g, 0.095, 0.082, 0.02, rc, {x, y: 0.18});
      box(g, 0.02, 0.082, 0.095, rc, {x, y: 0.18});
    }
  },
  bank(g){
    box(g, 0.56, 0.04, 0.38, C.stone, {y: 0.02, rough: 0.7});
    box(g, 0.5, 0.04, 0.32, C.white, {y: 0.06});
    for (const x of [-0.18, -0.06, 0.06, 0.18]) cyl(g, 0.024, 0.026, 0.24, C.white, {x, y: 0.2, z: 0.1, seg: 14});
    box(g, 0.44, 0.24, 0.2, C.cream, {y: 0.2, z: -0.04});
    rowWin(g, 3, -0.14, 0.14, 0.2, 0.061, 0.05, 0.08);
    box(g, 0.52, 0.04, 0.34, C.white, {y: 0.34});
    cone(g, 0.3, 0.12, C.white, {y: 0.42, seg: 4, ry: Math.PI / 4, sz: 0.55});
    cyl(g, 0.08, 0.08, 0.03, C.gold, {y: 0.56, rx: Math.PI / 2, seg: 24, rough: 0.3});
    cyl(g, 0.05, 0.05, 0.034, '#e6b800', {y: 0.56, rx: Math.PI / 2, seg: 24, rough: 0.3});
  },
  chart(g){
    box(g, 0.56, 0.04, 0.32, '#e9e3ef', {y: 0.02});
    [[-0.19, 0.12, C.red], [-0.065, 0.2, C.jade], [0.065, 0.16, C.red], [0.19, 0.32, C.jade]].forEach(([x, h, c]) => box(g, 0.08, h, 0.08, c, {x, y: 0.04 + h / 2, r: 0.012}));
    const arrow = tag(new THREE.Group(), {dyn: 1, bob: 0.02});
    box(arrow, 0.03, 0.3, 0.03, C.lav, {rz: -0.75, r: 0.005});
    cone(arrow, 0.045, 0.08, C.lav, {x: 0.12, y: 0.13, rz: -0.75, seg: 10});
    arrow.position.set(-0.02, 0.3, 0.1);
    g.add(arrow);
  }
};

export function makeLandmark(id){
  const g = new THREE.Group();
  if (LM[id]) LM[id](g);
  return g;
}
export const LM_NAMES = Object.keys(LM);
