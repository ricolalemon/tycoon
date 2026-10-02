// 最后一道后期：移轴虚化（上下边缘轻微模糊，像看一个微缩模型）、暗角、一点点饱和
import * as THREE from 'three';

export const ToyShader = {
  uniforms: {
    tDiffuse: {value: null},
    resolution: {value: new THREE.Vector2(1, 1)},
    focus: {value: 0.5},      // 清楚的那条线在屏幕的哪个高度（0 底 1 顶）
    strength: {value: 1.0},   // 模糊多少像素
    vignette: {value: 0.32},
    saturation: {value: 1.08}
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float focus, strength, vignette, saturation;
    varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - focus);
      float amt = smoothstep(0.2, 0.62, d) * strength;
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (amt > 0.01){
        vec2 px = amt / resolution;
        vec3 acc = c * 2.0;
        float wsum = 2.0;
        for (int k = 0; k < 6; k++){
          float a = float(k) * 1.0471976;
          vec2 o = vec2(cos(a), sin(a));
          acc += texture2D(tDiffuse, vUv + o * px * 2.2).rgb;
          acc += texture2D(tDiffuse, vUv + o * px * 1.1 + vec2(0.5, 0.0) * px).rgb;
          wsum += 2.0;
        }
        c = acc / wsum;
      }
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, saturation);
      float v = smoothstep(0.45, 1.25, length((vUv - 0.5) * vec2(1.0, 1.15)) * 1.5);
      c *= 1.0 - vignette * v;
      gl_FragColor = vec4(c, 1.0);
    }`
};
