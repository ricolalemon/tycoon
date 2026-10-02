// 粒子：彩纸、金币、星星、尘土、烟花、烟、萤火虫、喷泉。一个 Points 画完，CPU 每帧挪一下位置
import * as THREE from 'three';

const MAX = 5000;
const PALETTE = ['#ff6f9a', '#ffd54f', '#5fd4b0', '#7fd0ef', '#b9a5ff', '#ffad5f', '#ffffff'];
const tmpC = new THREE.Color();

export function createFx(scene){
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX), alpha = new Float32Array(MAX), shape = new Float32Array(MAX);
  const vel = new Float32Array(MAX * 3), life = new Float32Array(MAX), maxLife = new Float32Array(MAX), grav = new Float32Array(MAX), drag = new Float32Array(MAX);
  const size0 = new Float32Array(MAX), grow = new Float32Array(MAX), fade = new Uint8Array(MAX), alpha0 = new Float32Array(MAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aShape', new THREE.BufferAttribute(shape, 1));
  geo.setDrawRange(0, 0);
  const mtl = new THREE.ShaderMaterial({
    uniforms: {uScale: {value: 600}},
    vertexShader: `
      attribute vec3 aColor; attribute float aSize, aAlpha, aShape;
      varying vec3 vC; varying float vA, vS; uniform float uScale;
      void main(){
        vC = aColor; vA = aAlpha; vS = aShape;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, aSize * uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA, vS;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = length(p);
        float a = 1.0;
        if (vS < 0.5) a = 1.0 - smoothstep(0.75, 1.0, d);
        else if (vS < 1.5) a = step(max(abs(p.x * 1.3), abs(p.y)), 0.85);
        else if (vS < 2.5){ float s = abs(p.x * p.y); a = max(smoothstep(0.09, 0.0, s) * (1.0 - smoothstep(0.6, 1.0, d)), 1.0 - smoothstep(0.0, 0.3, d)); }
        else { a = 1.0 - smoothstep(0.85, 1.0, d); a *= mix(1.0, 0.6, smoothstep(0.5, 0.62, d)); }
        if (a < 0.02) discard;
        gl_FragColor = vec4(vC, a * vA);
      }`,
    transparent: true, depthWrite: false, depthTest: true
  });
  const points = new THREE.Points(geo, mtl);
  points.frustumCulled = false;
  points.renderOrder = 5;
  scene.add(points);
  let n = 0;

  function spawn(x, y, z, vx, vy, vz, c, s, l, o){
    if (n >= MAX) return;
    const i = n++;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    tmpC.set(c);
    const b = o.bright || 1;
    col[i * 3] = tmpC.r * b; col[i * 3 + 1] = tmpC.g * b; col[i * 3 + 2] = tmpC.b * b;
    size0[i] = s; size[i] = s;
    life[i] = maxLife[i] = l;
    grav[i] = o.grav || 0;
    drag[i] = o.drag || 0;
    grow[i] = o.grow || 0;
    fade[i] = o.fade || 0;
    alpha0[i] = o.alpha ?? 1;
    alpha[i] = alpha0[i];
    shape[i] = o.shape || 0;
  }
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function sphereDir(){
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    return [r * Math.cos(t), u, r * Math.sin(t)];
  }

  const fx = {
    points,
    setScale(v){ mtl.uniforms.uScale.value = v; },
    confetti(p, count = 70){
      for (let k = 0; k < count; k++) spawn(p.x + R(-0.15, 0.15), p.y + 0.1, p.z + R(-0.15, 0.15), R(-1.4, 1.4), R(1.8, 3.6), R(-1.4, 1.4), pick(PALETTE), R(0.05, 0.09), R(1.3, 2.0), {grav: 4.5, drag: 1.6, shape: 1, fade: 2});
    },
    coins(p, count = 10){
      for (let k = 0; k < count; k++) spawn(p.x + R(-0.1, 0.1), p.y + 0.15, p.z + R(-0.1, 0.1), R(-0.9, 0.9), R(1.6, 2.8), R(-0.9, 0.9), '#ffd54f', R(0.08, 0.11), R(0.8, 1.1), {grav: 5, shape: 3, bright: 1.5, fade: 2});
    },
    sparkle(p, count = 20, colors = ['#ffffff', '#fff4b0', '#ffd1e8']){
      for (let k = 0; k < count; k++){ const d = sphereDir(); spawn(p.x + d[0] * 0.15, p.y + 0.2 + d[1] * 0.1, p.z + d[2] * 0.15, d[0] * 0.5, 0.4 + Math.random() * 0.6, d[2] * 0.5, pick(colors), R(0.08, 0.14), R(0.5, 0.9), {grav: -0.4, shape: 2, bright: 2.0, grow: -0.9}); }
    },
    dust(p, count = 9){
      for (let k = 0; k < count; k++){ const a = Math.random() * Math.PI * 2; spawn(p.x, p.y + 0.03, p.z, Math.cos(a) * R(0.4, 0.9), R(0.1, 0.35), Math.sin(a) * R(0.4, 0.9), '#fff3dc', R(0.06, 0.1), R(0.35, 0.6), {grav: 0.4, drag: 2.5, grow: 1.2, alpha: 0.75}); }
    },
    splash(p, count = 14){
      for (let k = 0; k < count; k++){ const a = Math.random() * Math.PI * 2; spawn(p.x, p.y, p.z, Math.cos(a) * R(0.3, 1.1), R(1.0, 2.2), Math.sin(a) * R(0.3, 1.1), '#bfeeff', R(0.03, 0.06), R(0.4, 0.7), {grav: 6, bright: 1.3}); }
    },
    firework(p, color = pick(PALETTE), count = 130){
      const c2 = pick(PALETTE);
      for (let k = 0; k < count; k++){ const d = sphereDir(), v = R(2.2, 3.8); spawn(p.x, p.y, p.z, d[0] * v, d[1] * v, d[2] * v, k % 3 ? color : c2, R(0.05, 0.08), R(1.1, 1.8), {grav: 1.6, drag: 1.1, bright: 2.8, fade: 2}); }
      for (let k = 0; k < 30; k++){ const d = sphereDir(); spawn(p.x, p.y, p.z, d[0] * 0.6, d[1] * 0.6, d[2] * 0.6, '#ffffff', R(0.08, 0.14), R(0.3, 0.5), {shape: 2, bright: 3.0, grow: -1}); }
    },
    trail(p, color){ spawn(p.x, p.y, p.z, R(-0.2, 0.2), R(-0.3, 0.1), R(-0.2, 0.2), color, R(0.04, 0.07), R(0.3, 0.5), {bright: 2.2, grow: -1}); },
    smoke(p, wind = 0){ spawn(p.x, p.y, p.z, wind + R(-0.08, 0.08), R(0.25, 0.4), R(-0.08, 0.08), '#f6f1fa', R(0.07, 0.1), R(1.4, 1.9), {grav: -0.15, grow: 1.3, alpha: 0.55, fade: 1}); },
    firefly(p){ spawn(p.x, p.y, p.z, R(-0.12, 0.12), R(0.03, 0.12), R(-0.12, 0.12), '#fff1a0', R(0.025, 0.04), R(2.5, 4.5), {bright: 2.2, fade: 1, alpha: 0.95}); },
    fountain(p){ for (let k = 0; k < 3; k++){ const a = Math.random() * Math.PI * 2; spawn(p.x, p.y, p.z, Math.cos(a) * R(0.05, 0.35), R(1.6, 2.1), Math.sin(a) * R(0.05, 0.35), '#d8f4ff', R(0.035, 0.055), R(0.75, 0.95), {grav: 4.2, bright: 1.25, alpha: 0.85}); } },
    hearts(p){ for (let k = 0; k < 6; k++) spawn(p.x + R(-0.15, 0.15), p.y + 0.2, p.z + R(-0.15, 0.15), R(-0.1, 0.1), R(0.5, 0.9), R(-0.1, 0.1), '#ff6f9a', R(0.08, 0.12), R(0.8, 1.2), {grav: -0.1, grow: -0.5, fade: 2}); },
    update(dt){
      for (let i = 0; i < n;){
        life[i] -= dt;
        if (life[i] <= 0){
          n--;
          if (i !== n){
            for (let k = 0; k < 3; k++){ pos[i * 3 + k] = pos[n * 3 + k]; vel[i * 3 + k] = vel[n * 3 + k]; col[i * 3 + k] = col[n * 3 + k]; }
            size0[i] = size0[n]; life[i] = life[n]; maxLife[i] = maxLife[n]; grav[i] = grav[n]; drag[i] = drag[n]; grow[i] = grow[n]; fade[i] = fade[n]; alpha0[i] = alpha0[n]; shape[i] = shape[n];
          }
          continue;
        }
        vel[i * 3 + 1] -= grav[i] * dt;
        const k = 1 - Math.min(0.95, drag[i] * dt);
        vel[i * 3] *= k; vel[i * 3 + 1] *= k; vel[i * 3 + 2] *= k;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const t = 1 - life[i] / maxLife[i];   // 0 刚出生，1 快没了
        size[i] = Math.max(0.001, size0[i] * (1 + grow[i] * t));
        alpha[i] = alpha0[i] * (fade[i] === 1 ? Math.sin(t * Math.PI) : fade[i] === 2 ? (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3) : 1 - t * t);
        i++;
      }
      geo.setDrawRange(0, n);
      for (const a of ['position', 'aColor', 'aSize', 'aAlpha', 'aShape']) geo.attributes[a].needsUpdate = true;
    },
    get count(){ return n; }
  };
  return fx;
}
