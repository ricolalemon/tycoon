// 棋盘中间的小世界：草地、湖和小船、摩天轮、旋转木马、热气球、喷泉、小火车、树、花、路灯，还有天上的鸟和云
import * as THREE from 'three';
import {mat, glowMat, WATER, add, box, cyl, cone, sph, torus, capsule, tag, rbox} from './mats.js?v=9c5962e2';

const GRASS = '#9fdd86', GRASS2 = '#8ed47a', G_TOP = 0.19;
const rnd = (() => { let a = 11; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
const LAMP = () => glowMat('#ffc266', '#fff0c8');

export function buildPark(fx){
  const park = new THREE.Group();           // 不动的东西（会被合并）
  const live = new THREE.Group();           // 会动的东西
  const grass = add(park, rbox(8.7, 0.26, 8.7, 0.13, 3), GRASS, {y: 0.06, rough: 0.8});
  grass.receiveShadow = true;
  // 草地上深一点的斑块
  for (let k = 0; k < 14; k++){
    const r = 0.5 + rnd() * 0.9;
    sph(park, r, GRASS2, {x: (rnd() - 0.5) * 7.6, y: G_TOP - r + 0.015, z: (rnd() - 0.5) * 7.6, sy: 1, rough: 0.85, seg: 16, cast: false});
  }

  /* ----- 湖、小岛、小船 ----- */
  const LAKE = new THREE.Vector3(-2.55, 0, 1.95);
  const lakeBed = cyl(park, 1, 1.05, 0.08, '#e8d8b0', {x: LAKE.x, y: G_TOP - 0.02, z: LAKE.z, sx: 1.42, sz: 1.08, seg: 48, rough: 0.9});
  const lake = add(park, new THREE.CylinderGeometry(1, 1, 0.04, 48), null, {x: LAKE.x, y: G_TOP + 0.012, z: LAKE.z, sx: 1.35, sz: 1.0, m: WATER, cast: false});
  torus(park, 1, 0.05, '#fff3dc', {x: LAKE.x, y: G_TOP + 0.01, z: LAKE.z, rx: Math.PI / 2, sx: 1.37, sy: 1.02, seg: 48, tseg: 8, rough: 0.8});
  sph(park, 0.28, '#b7e59a', {x: LAKE.x - 0.4, y: G_TOP - 0.06, z: LAKE.z + 0.15, sy: 0.5, seg: 16, rough: 0.8});
  tree(park, LAKE.x - 0.4, LAKE.z + 0.15, '#ffb3d1', 0.2, 0.2, 0.9);
  const boats = [];
  for (let k = 0; k < 2; k++){
    const b = new THREE.Group();
    box(b, 0.3, 0.08, 0.14, k ? '#ff6f78' : '#7fd0ef', {y: 0.05, r: 0.03});
    box(b, 0.26, 0.02, 0.1, '#fff3dc', {y: 0.09});
    cyl(b, 0.008, 0.008, 0.26, '#fff3dc', {y: 0.22, seg: 6});
    cone(b, 0.1, 0.2, k ? '#ffd54f' : '#ffffff', {x: 0.03, y: 0.24, rz: -Math.PI / 2, seg: 3, sz: 0.1});
    b.userData = {a: k * Math.PI, r: 0.72, speed: 0.22 + k * 0.05};
    live.add(b);
    boats.push(b);
  }

  /* ----- 摩天轮 ----- */
  const WHEEL = new THREE.Vector3(2.55, 0, -2.35);
  {
    cyl(park, 0.9, 0.95, 0.06, '#e9e3ef', {x: WHEEL.x, y: G_TOP + 0.03, z: WHEEL.z, seg: 32});
    for (const z of [-0.22, 0.22]) for (const sx of [-1, 1]){
      const leg = cyl(park, 0.035, 0.045, 1.5, '#fff3dc', {x: WHEEL.x + sx * 0.42, y: G_TOP + 0.75, z: WHEEL.z + z, rz: sx * 0.3, seg: 10});
    }
    const w = tag(new THREE.Group(), {dyn: 1, spin: 'z', speed: 0.18});
    torus(w, 1.0, 0.04, '#b9a5ff', {seg: 64, tseg: 10});
    torus(w, 0.35, 0.03, '#b9a5ff', {seg: 32, tseg: 8});
    for (let k = 0; k < 12; k++) box(w, 0.025, 2.0, 0.025, '#ffffff', {rz: k / 12 * Math.PI, r: 0.006});
    const cols = ['#ff6f78', '#ffd54f', '#7fd0ef', '#6fd6a0', '#ff92c2', '#ffad5f'];
    for (let k = 0; k < 12; k++){
      const a = k / 12 * Math.PI * 2;
      const gondola = tag(new THREE.Group(), {dyn: 1, keepUp: 1});
      box(gondola, 0.17, 0.15, 0.14, cols[k % 6], {y: -0.1, r: 0.04, rough: 0.3});
      box(gondola, 0.19, 0.03, 0.16, '#ffffff', {y: -0.02});
      add(gondola, rbox(0.12, 0.06, 0.145, 0.01), null, {y: -0.1, m: glowMat('#ffd27a', '#fff3dc'), cast: false});
      gondola.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0);
      w.add(gondola);
    }
    cyl(w, 0.08, 0.08, 0.5, '#4a3b52', {rx: Math.PI / 2, seg: 12});
    for (let k = 0; k < 24; k++){ const a = k / 24 * Math.PI * 2; sph(w, 0.03, null, {x: Math.cos(a) * 1.0, y: Math.sin(a) * 1.0, z: 0.06, m: k % 2 ? glowMat('#ff6f9a', '#ffd1e8') : glowMat('#7fd0ef', '#d8f4ff'), seg: 6, cast: false}); }
    w.position.set(WHEEL.x, G_TOP + 1.5, WHEEL.z);
    live.add(w);
  }

  /* ----- 旋转木马 ----- */
  const CAR = new THREE.Vector3(2.65, 0, 2.0);
  {
    cyl(park, 0.62, 0.66, 0.08, '#ff92c2', {x: CAR.x, y: G_TOP + 0.04, z: CAR.z, seg: 40, rough: 0.35});
    cyl(park, 0.58, 0.58, 0.02, '#fff3dc', {x: CAR.x, y: G_TOP + 0.09, z: CAR.z, seg: 40});
    cyl(park, 0.04, 0.04, 0.9, '#ffffff', {x: CAR.x, y: G_TOP + 0.5, z: CAR.z, seg: 12});
    const roofG = new THREE.Group();
    for (let k = 0; k < 10; k++){
      const seg = add(roofG, new THREE.ConeGeometry(0.72, 0.34, 10, 1, false, k / 10 * Math.PI * 2, Math.PI * 2 / 10), k % 2 ? '#ff6f9a' : '#fff3dc', {rough: 0.35});
    }
    roofG.position.set(CAR.x, G_TOP + 1.07, CAR.z);
    park.add(roofG);
    torus(park, 0.7, 0.03, '#ffd54f', {x: CAR.x, y: G_TOP + 0.9, z: CAR.z, rx: Math.PI / 2, seg: 40, tseg: 8, rough: 0.3});
    sph(park, 0.08, '#ffd54f', {x: CAR.x, y: G_TOP + 1.28, z: CAR.z, seg: 12, rough: 0.3});
    for (let k = 0; k < 10; k++){ const a = k / 10 * Math.PI * 2; sph(park, 0.03, null, {x: CAR.x + Math.cos(a) * 0.7, y: G_TOP + 0.9, z: CAR.z + Math.sin(a) * 0.7, m: LAMP(), seg: 6, cast: false}); }
    const spin = tag(new THREE.Group(), {dyn: 1, spin: 'y', speed: 0.5});
    const cols = ['#7fd0ef', '#ffd54f', '#6fd6a0', '#b9a5ff', '#ff6f78', '#ffad5f'];
    for (let k = 0; k < 6; k++){
      const a = k / 6 * Math.PI * 2, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
      cyl(spin, 0.012, 0.012, 0.8, '#ffd54f', {x, y: 0.4, z, seg: 6, rough: 0.3});
      const horse = tag(new THREE.Group(), {dyn: 1, bob: 0.07, phase: k * 1.1});
      capsule(horse, 0.07, 0.14, cols[k], {rz: Math.PI / 2});
      sph(horse, 0.06, cols[k], {x: 0.12, y: 0.07, seg: 12});
      cone(horse, 0.025, 0.07, '#ffffff', {x: 0.15, y: 0.14, seg: 6});
      for (const dx of [-0.07, 0.07]) for (const dz of [-0.03, 0.03]) cyl(horse, 0.015, 0.015, 0.1, cols[k], {x: dx, y: -0.1, z: dz, seg: 6});
      horse.position.set(x, 0.3, z);
      horse.rotation.y = -a - Math.PI / 2;
      spin.add(horse);
    }
    spin.position.set(CAR.x, G_TOP + 0.1, CAR.z);
    live.add(spin);
  }

  /* ----- 喷泉和招牌（火车轨道圈里面） ----- */
  const FOUNT = new THREE.Vector3(0.0, 0, 0.75);
  cyl(park, 0.52, 0.56, 0.1, '#fff3dc', {x: FOUNT.x, y: G_TOP + 0.05, z: FOUNT.z, seg: 40});
  add(park, new THREE.CylinderGeometry(0.46, 0.46, 0.04, 40), null, {x: FOUNT.x, y: G_TOP + 0.09, z: FOUNT.z, m: WATER, cast: false});
  cyl(park, 0.08, 0.12, 0.3, '#fff3dc', {x: FOUNT.x, y: G_TOP + 0.2, z: FOUNT.z, seg: 16});
  cyl(park, 0.2, 0.22, 0.04, '#fff3dc', {x: FOUNT.x, y: G_TOP + 0.36, z: FOUNT.z, seg: 24});
  const signCv = document.createElement('canvas');
  signCv.width = 1024;
  signCv.height = 300;
  {
    const x = signCv.getContext('2d');
    x.fillStyle = '#ff6f8f';
    x.font = '190px "ZCOOL KuaiLe", "PingFang SC", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.shadowColor = 'rgba(226,80,126,.35)';
    x.shadowOffsetY = 10;
    x.fillText('环游大亨', 512, 150);
  }
  const signTex = new THREE.CanvasTexture(signCv);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 4;
  const sign = new THREE.Group();
  box(sign, 2.9, 0.9, 0.1, '#fff8ee', {r: 0.16, rough: 0.4});
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.72, 0.8), new THREE.MeshStandardMaterial({map: signTex, roughness: 0.6, transparent: true}));
  face.position.z = 0.052;
  face.userData.keep = 1;
  sign.add(face);
  const face2 = face.clone();
  face2.position.z = -0.052;
  face2.rotation.y = Math.PI;
  sign.add(face2);
  for (const x of [-1.1, 1.1]) cyl(sign, 0.05, 0.05, 0.8, '#ffb3d1', {x, y: -0.7, seg: 10});
  for (let k = 0; k < 12; k++) sph(sign, 0.035, null, {x: -1.32 + k * 0.24, y: 0.49, z: 0, m: k % 2 ? glowMat('#ffd54f', '#fff3dc') : glowMat('#ff6f9a', '#ffd1e8'), seg: 6, cast: false});
  sign.position.set(0, G_TOP + 1.05, -0.95);
  park.add(sign);

  /* ----- 火车轨道 ----- */
  const RX = 1.95, RZ = 1.6;
  const trackCurve = new THREE.CatmullRomCurve3(Array.from({length: 48}, (_, k) => { const a = k / 48 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * RX, G_TOP + 0.02, Math.sin(a) * RZ); }), true);
  const ringShape = (rx, rz) => { const sh = new THREE.Shape(); sh.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0); return sh; };
  const bedShape = ringShape(RX + 0.18, RZ + 0.18);
  bedShape.holes.push(ringShape(RX - 0.18, RZ - 0.18));
  const bed = add(park, new THREE.ExtrudeGeometry(bedShape, {depth: 0.03, bevelEnabled: false, curveSegments: 64}), '#f3dccb', {y: G_TOP + 0.035, rx: Math.PI / 2, rough: 0.9, cast: false});
  for (const d of [-0.08, 0.08]) torus(park, 1, 0.012, '#b7a6c9', {y: G_TOP + 0.05, rx: Math.PI / 2, sx: RX + d, sy: RZ + d, seg: 96, tseg: 5, cast: false});
  for (let k = 0; k < 40; k++){ const a = k / 40 * Math.PI * 2; box(park, 0.22, 0.012, 0.05, '#c9a98a', {x: Math.cos(a) * RX, y: G_TOP + 0.04, z: Math.sin(a) * RZ, ry: -Math.atan2(Math.sin(a) * RX, Math.cos(a) * RZ) + Math.PI / 2, cast: false}); }
  const train = [];
  const carColors = ['#ff6f78', '#ffd54f', '#7fd0ef', '#b9a5ff'];
  for (let k = 0; k < 4; k++){
    const car = new THREE.Group();
    box(car, 0.36, 0.2, 0.22, carColors[k], {y: 0.16, r: 0.05, rough: 0.35});
    if (k === 0){
      cyl(car, 0.035, 0.045, 0.14, '#4a3b52', {x: 0.1, y: 0.31, seg: 12});
      box(car, 0.16, 0.14, 0.22, '#ffffff', {x: -0.1, y: 0.32, r: 0.04});
      sph(car, 0.03, null, {x: 0.185, y: 0.16, m: LAMP(), seg: 8, cast: false});
    } else {
      box(car, 0.38, 0.04, 0.24, '#ffffff', {y: 0.28});
      add(car, rbox(0.3, 0.08, 0.225, 0.01), null, {y: 0.17, m: glowMat('#ffd27a', '#fff3dc'), cast: false});
    }
    for (const wx of [-0.11, 0.11]) for (const wz of [-0.115, 0.115]) cyl(car, 0.045, 0.045, 0.03, '#4a3b52', {x: wx, y: 0.06, z: wz, rx: Math.PI / 2, seg: 14, cast: false});
    live.add(car);
    train.push(car);
  }

  /* ----- 热气球 ----- */
  const balloon = new THREE.Group();
  {
    const stripes = ['#ff6f9a', '#fff3dc', '#ffd54f', '#fff3dc', '#7fd0ef', '#fff3dc', '#6fd6a0', '#fff3dc'];
    for (let k = 0; k < 8; k++) add(balloon, new THREE.SphereGeometry(0.5, 24, 16, k / 8 * Math.PI * 2, Math.PI / 4), stripes[k], {y: 0.8, sy: 1.15, rough: 0.35});
    cone(balloon, 0.2, 0.3, '#ff6f9a', {y: 0.22, seg: 16, rough: 0.35});
    box(balloon, 0.26, 0.2, 0.26, '#c08a63', {y: 0.0, r: 0.04});
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(balloon, 0.008, 0.008, 0.3, '#c08a63', {x: sx * 0.11, y: 0.2, z: sz * 0.11, seg: 4});
    balloon.userData = {a: 0.6, r: 2.0, cx: -2.0, cz: -2.2, y: 2.9};
    live.add(balloon);
  }

  /* ----- 小山、树、花、灯 ----- */
  for (const [x, z, r, c] of [[-2.9, -2.7, 0.9, '#a7e491'], [-1.2, -3.4, 0.55, '#b4eb9c'], [3.5, 0.0, 0.6, '#a7e491'], [-3.6, -0.3, 0.5, '#b4eb9c'], [0.8, -3.4, 0.5, '#a7e491']]){
    sph(park, r, c, {x, y: G_TOP - 0.02, z, sy: 0.62, seg: 24, rough: 0.8});
  }
  const spots = [[-3.7, -1.6], [-3.6, 0.6], [-0.6, -3.5], [0.2, -3.7], [1.6, -3.7], [3.8, -1.2], [3.9, 0.8], [3.7, -3.2], [-3.8, 3.6], [-1.0, 3.6], [0.4, 3.6], [1.3, 3.4], [3.8, 3.5], [-3.9, -3.5], [-0.3, 2.3], [1.2, 2.2], [-1.0, -2.3], [2.3, -0.4], [-2.4, -1.2], [0.9, -2.3], [-3.2, 3.1], [3.1, 3.2], [-2.0, 3.6]];
  const canopies = ['#ffb3d1', '#ff9ec4', '#8ee0a8', '#79d39a', '#ffe17a', '#b8e986', '#ffc98a'];
  for (const [x, z] of spots){
    const kind = rnd();
    if (kind < 0.25) pine(park, x, z, 0.9 + rnd() * 0.5);
    else tree(park, x, z, canopies[Math.floor(rnd() * canopies.length)], 0.2 + rnd() * 0.1, 0.22 + rnd() * 0.15, 0.9 + rnd() * 0.35);
  }
  for (let k = 0; k < 90; k++){
    const x = (rnd() - 0.5) * 8.2, z = (rnd() - 0.5) * 8.2;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < 1.6 || Math.hypot(x - WHEEL.x, z - WHEEL.z) < 1.1 || Math.hypot(x - CAR.x, z - CAR.z) < 0.8) continue;
    if ((x / (RX + 0.25)) ** 2 + (z / (RZ + 0.25)) ** 2 < 1 && (x / (RX - 0.25)) ** 2 + (z / (RZ - 0.25)) ** 2 > 1) continue;
    sph(park, 0.035 + rnd() * 0.025, ['#ff6f9a', '#ffd54f', '#ffffff', '#b9a5ff', '#ff92c2'][Math.floor(rnd() * 5)], {x, y: G_TOP + 0.04, z, seg: 6, cast: false});
  }
  const lamps = [];
  for (const [x, z] of [[-1.3, 1.1], [1.3, 1.1], [-1.3, -1.0], [1.3, -1.0], [-4.0, 4.0], [4.0, 4.0], [-4.0, -4.0], [4.0, -4.0]]){
    cyl(park, 0.025, 0.035, 0.7, '#4a3b52', {x, y: G_TOP + 0.35, z, seg: 8});
    sph(park, 0.07, null, {x, y: G_TOP + 0.75, z, m: LAMP(), seg: 12, cast: false});
    lamps.push(new THREE.Vector3(x, G_TOP + 0.75, z));
  }
  for (const [x, z, ry] of [[-0.7, 1.5, 0.3], [0.8, 1.4, -0.3]]){
    box(park, 0.4, 0.03, 0.14, '#c08a63', {x, y: G_TOP + 0.14, z, ry});
    box(park, 0.4, 0.14, 0.03, '#c08a63', {x: x - Math.sin(ry) * 0.07, y: G_TOP + 0.22, z: z - Math.cos(ry) * 0.07, ry});
    for (const dx of [-0.15, 0.15]) box(park, 0.03, 0.14, 0.12, '#4a3b52', {x: x + dx * Math.cos(ry), y: G_TOP + 0.07, z: z - dx * Math.sin(ry), ry});
  }

  /* ----- 鸟 ----- */
  const birds = [];
  for (let k = 0; k < 4; k++){
    const b = new THREE.Group();
    const wingL = box(b, 0.22, 0.012, 0.07, '#fff8ee', {x: -0.11, r: 0.004, cast: false}), wingR = box(b, 0.22, 0.012, 0.07, '#fff8ee', {x: 0.11, r: 0.004, cast: false});
    wingL.userData.keep = wingR.userData.keep = 1;
    sph(b, 0.035, '#fff8ee', {seg: 8, cast: false});
    b.userData = {wl: wingL, wr: wingR, a: k * 1.6, r: 5.5 + k * 0.7, y: 4.2 + k * 0.4, speed: 0.22 + k * 0.03};
    live.add(b);
    birds.push(b);
  }

  /* ----- 云：天上几团，岛下面几团 ----- */
  const clouds = [];
  const cloud = (scale, flat) => {
    const c = new THREE.Group();
    for (const [x, y, z, r] of [[0, 0, 0, 0.5], [0.5, -0.08, 0.1, 0.38], [-0.48, -0.1, 0, 0.36], [0.18, 0.22, -0.08, 0.34], [-0.2, 0.15, 0.2, 0.28]]) sph(c, r, '#ffffff', {x, y: y * (flat ? 0.5 : 1), z, seg: 14, rough: 0.95, cast: !flat, recv: false});
    c.scale.set(scale, flat ? scale * 0.55 : scale, scale);
    return c;
  };
  for (let k = 0; k < 5; k++){
    const c = cloud(0.9 + (k % 3) * 0.25, false);
    c.userData = {a: k * 1.25 + 0.4, r: 6.5 + (k % 2) * 1.5, y: 4.6 + (k % 3) * 0.8, s: 0.025 + k * 0.006};
    live.add(c);
    clouds.push(c);
  }
  for (let k = 0; k < 7; k++){
    const c = cloud(1.6 + (k % 3) * 0.5, true);
    c.userData = {a: k * 0.9, r: 5.5 + (k % 3) * 1.6, y: -3.2 - (k % 2) * 1.4, s: 0.012 + k * 0.004};
    live.add(c);
    clouds.push(c);
  }

  /* ----- 每帧动一动 ----- */
  let smokeAt = 0, flyAt = 0, trainU = 0;
  const tmp = new THREE.Vector3();
  function update(dt, tt, night, trainOn = true){
    trainU = (trainU + dt * 0.055) % 1;
    train.forEach((car, k) => {
      const u = (trainU - k * 0.058 + 1) % 1;
      const p = trackCurve.getPointAt(u), q = trackCurve.getTangentAt(u);
      car.position.copy(p);
      car.rotation.y = Math.atan2(-q.z, q.x);
    });
    if (tt > smokeAt){
      smokeAt = tt + 0.16;
      const head = train[0];
      tmp.set(0.1, 0.4, 0).applyMatrix4(head.matrixWorld);
      fx.smoke(tmp, 0.1);
    }
    for (const b of boats){
      b.userData.a += dt * b.userData.speed;
      const a = b.userData.a;
      b.position.set(LAKE.x + Math.cos(a) * b.userData.r * 1.2, G_TOP + 0.04 + Math.sin(tt * 2 + a) * 0.012, LAKE.z + Math.sin(a) * b.userData.r * 0.75);
      b.rotation.y = -a + Math.PI / 2 + Math.PI;
      b.rotation.z = Math.sin(tt * 1.7 + a) * 0.04;
    }
    const u = balloon.userData;
    u.a += dt * 0.08;
    balloon.position.set(u.cx + Math.cos(u.a) * u.r, u.y + Math.sin(tt * 0.5) * 0.25, u.cz + Math.sin(u.a) * u.r * 0.6);
    balloon.rotation.y = tt * 0.1;
    for (const b of birds){
      const d = b.userData;
      d.a += dt * d.speed;
      b.position.set(Math.cos(d.a) * d.r, d.y + Math.sin(tt * 0.9 + d.a) * 0.3, Math.sin(d.a) * d.r * 0.8);
      b.rotation.y = -d.a - Math.PI / 2;
      const flap = Math.sin(tt * 9 + d.a * 3) * 0.6;
      d.wl.rotation.z = flap;
      d.wr.rotation.z = -flap;
    }
    for (const c of clouds){
      c.userData.a += c.userData.s * dt;
      c.position.set(Math.cos(c.userData.a) * c.userData.r, c.userData.y + Math.sin(tt * 0.5 + c.userData.r) * 0.08, Math.sin(c.userData.a) * c.userData.r * 0.85);
    }
    fx.fountain(tmp.set(FOUNT.x, G_TOP + 0.4, FOUNT.z));
    if (night > 0.3 && tt > flyAt){
      flyAt = tt + 0.12 / night;
      fx.firefly(tmp.set((Math.random() - 0.5) * 8, G_TOP + 0.2 + Math.random() * 0.8, (Math.random() - 0.5) * 8));
    }
  }
  return {park, live, update, trackCurve, lamps, LAKE, WHEEL};
}

function tree(g, x, z, c, r, h, s = 1){
  const t = new THREE.Group();
  cyl(t, 0.045, 0.06, h, '#b78a6a', {y: h / 2, seg: 10, rough: 0.8});
  sph(t, r, c, {y: h + r * 0.8, seg: 20, rough: 0.6});
  sph(t, r * 0.72, c, {x: r * 0.55, y: h + r * 0.55, z: 0.05, seg: 16, rough: 0.6});
  sph(t, r * 0.6, c, {x: -r * 0.5, y: h + r * 0.95, z: -0.1, seg: 16, rough: 0.6});
  t.position.set(x, G_TOP, z);
  t.scale.setScalar(s);
  g.add(t);
}
function pine(g, x, z, s = 1){
  const t = new THREE.Group();
  cyl(t, 0.04, 0.05, 0.2, '#b78a6a', {y: 0.1, seg: 8, rough: 0.8});
  cone(t, 0.26, 0.35, '#5fbf85', {y: 0.3, seg: 14, rough: 0.6});
  cone(t, 0.2, 0.3, '#6fcf97', {y: 0.5, seg: 14, rough: 0.6});
  cone(t, 0.13, 0.25, '#7fd9a4', {y: 0.68, seg: 14, rough: 0.6});
  t.position.set(x, G_TOP, z);
  t.scale.setScalar(s);
  g.add(t);
}
