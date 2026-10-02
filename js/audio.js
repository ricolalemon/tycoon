// 声音：全部用 WebAudio 当场合成，没有任何音频文件。音效短小清脆，背景乐是一首自己写的小曲子（原创旋律）
export function createAudio(store){
  let ctx = null, master, sfxG, musG, noiseBuf;
  const A = {on: store.get('sound', true) !== false, music: store.get('music', true) !== false, ready: false};
  const now = () => ctx.currentTime;

  function ensure(){
    if (ctx){ if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e){ return false; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.gain.value = A.on ? 0.85 : 0; sfxG.connect(master);
    musG = ctx.createGain(); musG.gain.value = 0; musG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.ready = true;
    return true;
  }
  // 一个音：f 起始频率，f2 滑到的频率，dur 长度，g 音量，a 起音，type 波形，lp 低通
  function tone(o){
    const t0 = now() + (o.t || 0), dur = o.dur || 0.2, out = o.out || sfxG;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    if (o.detune) osc.detune.value = o.detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(o.g || 0.2, t0 + (o.a || 0.006));
    if (o.hold) env.gain.setValueAtTime(o.g || 0.2, t0 + o.hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (o.lp){ const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 0.7; node.connect(f); node = f; }
    node.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  function noise(o){
    const t0 = now() + (o.t || 0), dur = o.dur || 0.1, out = o.out || sfxG;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    let node = src;
    if (o.lp){ const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0); if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t0 + dur); node.connect(f); node = f; }
    if (o.hp){ const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(o.g || 0.2, t0 + (o.a || 0.005));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(env);
    env.connect(out);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  const SFX = {
    click(){ tone({f: 900, f2: 1200, dur: 0.05, g: 0.1}); },
    pop(){ tone({f: 500, f2: 900, dur: 0.07, g: 0.14}); },
    hop(k = 0){ const f = 480 * Math.pow(2, Math.min(k, 10) / 12); tone({f, f2: f * 1.35, dur: 0.09, g: 0.16, type: 'triangle', lp: 3000}); },
    land(){ tone({f: 170, f2: 60, dur: 0.16, g: 0.32}); noise({dur: 0.06, lp: 1400, g: 0.12}); },
    dice(){
      for (let k = 0; k < 4; k++) noise({t: k * 0.07, dur: 0.045, lp: 2600, hp: 300, g: 0.1});
      for (const [t, f] of [[0.34, 520], [0.47, 430], [0.58, 380], [0.67, 340], [0.74, 320]]){ tone({t, f, f2: f * 0.8, dur: 0.045, g: 0.12, type: 'triangle'}); noise({t, dur: 0.03, lp: 5000, g: 0.06}); }
    },
    coin(){ tone({f: 1319, dur: 0.22, g: 0.14}); tone({t: 0.07, f: 1760, dur: 0.45, g: 0.16}); },
    coins(){ for (let k = 0; k < 3; k++){ tone({t: k * 0.09, f: 1319 * Math.pow(2, k / 12), dur: 0.2, g: 0.1}); tone({t: k * 0.09 + 0.06, f: 1760 * Math.pow(2, k / 12), dur: 0.35, g: 0.11}); } },
    pay(){ tone({f: 440, f2: 330, dur: 0.16, g: 0.14, type: 'triangle'}); tone({t: 0.15, f: 330, f2: 250, dur: 0.28, g: 0.14, type: 'triangle'}); },
    buy(){ [523, 659, 784, 1047].forEach((f, k) => tone({t: k * 0.085, f, dur: 0.28, g: 0.14, type: 'triangle', lp: 4000})); [523, 659, 784].forEach(f => tone({t: 0.36, f: f * 2, dur: 0.6, g: 0.07})); },
    build(){ for (const t of [0, 0.13]){ noise({t, dur: 0.05, lp: 900, g: 0.28}); tone({t, f: 190, f2: 120, dur: 0.07, g: 0.18}); } tone({t: 0.3, f: 1047, dur: 0.35, g: 0.12}); tone({t: 0.36, f: 1319, dur: 0.4, g: 0.1}); },
    hotel(){ SFX.build(); [784, 988, 1175, 1568].forEach((f, k) => tone({t: 0.45 + k * 0.1, f, dur: 0.3, g: 0.12, type: 'triangle'})); for (let k = 0; k < 5; k++) tone({t: 0.9 + k * 0.06, f: 2000 + Math.random() * 1500, dur: 0.15, g: 0.05}); },
    card(){ noise({dur: 0.28, lp: 6000, lp2: 600, g: 0.12, a: 0.03}); tone({t: 0.26, f: 1500, dur: 0.04, g: 0.1}); },
    jail(){ tone({f: 330, f2: 165, dur: 0.6, g: 0.1, type: 'sawtooth', lp: 900}); tone({t: 0.55, f: 165, f2: 120, dur: 0.5, g: 0.1, type: 'sawtooth', lp: 700}); },
    bust(){ [392, 349, 311, 262].forEach((f, k) => tone({t: k * 0.2, f, dur: 0.38, g: 0.14, type: 'triangle'})); },
    win(){ [523, 659, 784, 1047, 1319].forEach((f, k) => tone({t: k * 0.11, f, dur: 0.32, g: 0.13, type: 'triangle'})); [523, 659, 784, 1047].forEach(f => tone({t: 0.6, f, dur: 1.2, g: 0.08, hold: 0.5})); },
    lose(){ [392, 330, 262].forEach((f, k) => tone({t: k * 0.26, f, dur: 0.55, g: 0.12})); },
    turn(){ tone({f: 880, dur: 0.12, g: 0.12}); tone({t: 0.11, f: 1175, dur: 0.3, g: 0.12}); },
    go(){ SFX.coins(); },
    launch(){ tone({f: 300, f2: 1500, dur: 0.4, g: 0.05, a: 0.05}); },
    boom(){ noise({dur: 0.3, lp: 400, g: 0.5, a: 0.002}); for (let k = 0; k < 7; k++) noise({t: 0.08 + Math.random() * 0.45, dur: 0.02, hp: 2500, g: 0.12}); },
    whistle(){ for (const f of [587, 740]) tone({f, dur: 0.55, g: 0.045, type: 'square', lp: 1400, a: 0.04, hold: 0.3}); },
    teleport(){ tone({f: 600, f2: 1800, dur: 0.25, g: 0.1}); tone({t: 0.3, f: 1800, f2: 500, dur: 0.3, g: 0.1}); },
    zap(){ tone({f: 400, f2: 2400, dur: 0.18, g: 0.09, type: 'triangle'}); tone({t: 0.12, f: 1600, dur: 0.2, g: 0.08}); },
    wreck(){ noise({dur: 0.35, lp: 1200, lp2: 200, g: 0.4, a: 0.003}); tone({f: 120, f2: 40, dur: 0.4, g: 0.25}); for (let k = 0; k < 4; k++) noise({t: 0.1 + k * 0.08, dur: 0.04, lp: 3000, g: 0.12}); },
    snore(){ for (const t of [0, 0.45]) tone({t, f: 110, f2: 70, dur: 0.4, g: 0.1, type: 'sawtooth', lp: 500, a: 0.08}); },
    tada(){ SFX.win(); }
  };

  /* ---------- 背景乐 ---------- */
  // 原创小曲：C 大调，112 拍，每小节 8 个八分音符（0 是休止）。A 段轻快，B 段往上走一点
  const A_MEL = [
    [76, 76, 79, 0, 84, 0, 79, 0], [81, 79, 76, 74, 72, 0, 0, 0], [74, 74, 77, 0, 81, 0, 77, 0], [79, 77, 76, 74, 76, 0, 0, 0],
    [76, 76, 79, 0, 84, 0, 86, 0], [88, 86, 84, 81, 79, 0, 0, 0], [81, 0, 79, 0, 77, 0, 76, 0], [74, 0, 76, 0, 72, 0, 0, 0]
  ];
  const B_MEL = [
    [77, 0, 81, 0, 84, 0, 81, 0], [79, 0, 83, 0, 86, 0, 83, 0], [76, 79, 83, 0, 88, 0, 86, 84], [81, 0, 84, 0, 81, 79, 76, 0],
    [77, 81, 84, 0, 86, 0, 84, 0], [83, 0, 86, 0, 88, 0, 86, 0], [84, 0, 88, 86, 84, 0, 79, 0], [84, 0, 0, 0, 0, 0, 0, 0]
  ];
  const CH = {C: [60, 64, 67], Am: [57, 60, 64], Dm: [62, 65, 69], G: [55, 59, 62], F: [53, 57, 60], Em: [52, 55, 59]};
  const A_CH = ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'F', 'G'], B_CH = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
  const BPM = 112, BEAT = 60 / BPM, EIGHTH = BEAT / 2;
  let timer = 0, nextBar = 0, barIdx = 0;
  function playBar(bar, at){
    const sec = Math.floor(bar / 8) % 2 ? B_MEL : A_MEL, chs = Math.floor(bar / 8) % 2 ? B_CH : A_CH;
    const k = bar % 8, mel = sec[k], ch = CH[chs[k]];
    // 旋律：八音盒的音色（正弦加一点三角波，衰减快）
    mel.forEach((m, j) => {
      if (!m) return;
      const t = at - now() + j * EIGHTH;
      tone({t, f: midi(m), dur: 0.42, g: 0.11, out: musG, lp: 3200});
      tone({t, f: midi(m), dur: 0.3, g: 0.035, type: 'triangle', out: musG, lp: 2000});
      tone({t, f: midi(m) * 2, dur: 0.18, g: 0.025, out: musG});
    });
    // 和弦：轻轻垫着
    ch.forEach(m => tone({t: at - now(), f: midi(m), dur: BEAT * 4, g: 0.035, a: 0.08, hold: BEAT * 3.2, type: 'triangle', out: musG, lp: 1200}));
    // 贝斯：根音、五音蹦蹦跳
    for (let b = 0; b < 4; b++){
      const m = (b % 2 ? ch[2] : ch[0]) - 12;
      tone({t: at - now() + b * BEAT, f: midi(m), dur: 0.26, g: 0.13, type: 'sine', out: musG});
      tone({t: at - now() + b * BEAT, f: midi(m) * 2, dur: 0.12, g: 0.04, type: 'triangle', out: musG, lp: 900});
    }
    // 节奏：沙锤在反拍
    for (let b = 0; b < 4; b++) noise({t: at - now() + b * BEAT + EIGHTH, dur: 0.035, hp: 7000, g: 0.025, out: musG});
  }
  function tick(){
    if (!ctx) return;
    while (nextBar < now() + 0.5){
      playBar(barIdx++, nextBar);
      nextBar += BEAT * 4;
    }
  }
  function startMusic(){
    if (!ctx || timer) return;
    nextBar = now() + 0.1;
    barIdx = 0;
    timer = setInterval(tick, 120);
    tick();
    musG.gain.cancelScheduledValues(now());
    musG.gain.setValueAtTime(0.0001, now());
    musG.gain.exponentialRampToValueAtTime(0.42, now() + 1.5);
  }
  function stopMusic(){
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
    if (ctx){ musG.gain.cancelScheduledValues(now()); musG.gain.setValueAtTime(musG.gain.value, now()); musG.gain.exponentialRampToValueAtTime(0.0001, now() + 0.6); }
  }

  A.ensure = ensure;
  // 调试用
  A.SFX = SFX;
  A._mute = () => { if (master) master.gain.value = 0; };
  // 用户点了一下以后才允许出声；之后每次叫 sfx 都会先确认一下
  A.unlock = () => { if (!ensure()) return; if (A.music && A.on && !timer) startMusic(); };
  A.sfx = (name, ...args) => { if (!A.on || !ctx || !SFX[name]) return; try { SFX[name](...args); } catch (e) {} };
  A.setOn = v => {
    A.on = v;
    store.set('sound', v);
    if (!ensure()) return;
    sfxG.gain.setTargetAtTime(v ? 0.85 : 0, now(), 0.02);
    if (v && A.music) startMusic(); else stopMusic();
  };
  A.setMusic = v => { A.music = v; store.set('music', v); if (!ensure()) return; if (v && A.on) startMusic(); else stopMusic(); };
  A.duck = v => { if (ctx && timer) musG.gain.setTargetAtTime(v ? 0.12 : 0.42, now(), 0.3); };
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (A.on) ctx.resume().catch(() => {}); });
  return A;
}
