// 把规则、3D 画面、联机、声音和界面串起来
import {createScene} from './scene.js?v=1bf53f6e';
import {Game, STEP_MS} from './engine.js?v=1bf53f6e';
import {createNet} from './net.js?v=1bf53f6e';
import {createAudio} from './audio.js?v=1bf53f6e';
import {SQ, GROUPS, CHARS, JAIL_FINE, STATION_RENT, PASS_GO, TUNE} from './data.js?v=1bf53f6e';

/* ---------- 基本工具 ---------- */
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const params = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
// 本地测试时 ?as=xxx 让同一个浏览器的两个标签页当两个人
const NS = 'tycoon2:' + (LOCAL && params.get('as') ? params.get('as') + ':' : '');
const store = {
  get(k, d){ try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
  del(k){ try { localStorage.removeItem(NS + k); } catch (e) {} }
};
const rid = n => Array.from({length: n}, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
const ME = store.get('pid', '') || (() => { const id = rid(10); store.set('pid', id); return id; })();
let myName = store.get('name', '') || '旅客' + Math.floor(1000 + Math.random() * 9000);
// claude.ai 的预览页面不允许连外面的服务器，联机用不了
const PREVIEW = !!window.claude || /(^|\.)claude(usercontent)?\.(ai|com)$/.test(location.hostname);
const charOf = id => CHARS.find(c => c.id === id) || CHARS[0];
const money = n => (n < 0 ? '-¥' : '¥') + Math.abs(Math.round(n));
let toastTimer = 0;
function toast(text, ms = 2200){
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
const audio = createAudio(store);
const sfx = (n, ...a) => audio.sfx(n, ...a);
// 第一次碰屏幕以后才允许出声
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => audio.unlock(), {passive: true});

/* ---------- 局面 ---------- */
let S = null, isHost = false, room = null;   // room：null 首页，'' 单机，四个字母 联机
const FAST = {on: false};
const game = new Game({commit: onCommit, fast: () => FAST.on});
const net = createNet({
  me: ME, name: () => myName,
  onState, onIntent: (pid, a) => game.act(pid, a),
  onHello: hello => { if (!game.S) return; if (game.S.phase === 'lobby') game.lobbyAct(hello.pid, {type: 'join', name: hello.name}); else net.send('state', game.S); },
  onPresence, onFail: text => { if (!S) showWait('连不上房间', text); }
});
let sc = null, idleOn = null;
function idle(on){ if (idleOn !== on){ idleOn = on; sc.idle(on); if (on) sc.drift(1 / 170); } }
const cur = () => (S && S.players ? S.players[S.turn] : null);
const me = () => (S && S.players ? S.players.find(p => p.pid === ME) : null);

function onCommit(st){
  st.seq = (st.seq || 0) + 1;
  S = st;
  if (isHost){
    store.set('game:' + (room || 'solo'), st);
    if (room) net.send('state', st);
  }
  render();
  game.scheduleBots();
}
let lastSeq = -1, lastGid = '';
function onState(st){
  if (!st || (st.seq === lastSeq && st.gid === lastGid)) return;
  lastSeq = st.seq;
  lastGid = st.gid;
  S = st;
  clearTimeout(waitTimer);
  render();
}
// 我做了一个操作：房主自己算，别人发给房主
function send(a){
  if (!S) return;
  if (isHost) game.act(ME, a);
  else net.send('intent', {pid: ME, a});
}
// 房主：谁掉线超过 4 秒就由电脑代打，回来了就还给他
const offSince = {};
function onPresence(){
  const G = game.S;
  if (isHost && G && G.phase === 'play' && net.ok){
    let changed = false;
    const now = Date.now();
    for (const p of G.players){
      if (p.ai || p.pid === ME) continue;
      const on = net.online.has(p.pid);
      if (on) delete offSince[p.pid];
      else if (!offSince[p.pid]) offSince[p.pid] = p.auto ? now - 5000 : now;
      const auto = !on && now - offSince[p.pid] > 4000;
      if (auto !== p.auto){ p.auto = auto; changed = true; game.log(`${p.name} ${auto ? '掉线了，先由电脑代打' : '回来了'}`); }
    }
    if (changed) game.commit();
  }
  if (S) render();
}
setInterval(() => {
  if (!room || !isHost || !game.S) return;
  onPresence();
  if (net.ok) net.send('state', game.S);
}, 4000);

/* ---------- 进出房间 ---------- */
let waitTimer = 0;
function enterRoom(code, create){
  room = code;
  if (location.hash.slice(1) !== code) history.replaceState(null, '', location.pathname + location.search + '#' + code);
  const saved = store.get('game:' + code, null);
  isHost = !!create || !!(saved && saved.hostId === ME);
  lastSeq = -1;
  resetView();
  if (isHost){
    if (saved && saved.hostId === ME){ game.S = saved; game.resume(); }
    else game.newLobby(ME, myName, false);
    if (game.S.phase === 'lobby'){ const s = game.S.seats.find(x => x.pid === ME); if (s) s.name = myName; }
    S = game.S;
    game.scheduleBots();
  } else {
    game.S = null;
    S = null;
    showWait('正在进房间…', '连上以后会自动进去。');
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => { if (!S) showWait('没找到这个房间', '房间号可能不对，或者开房间的朋友还没打开游戏。等他打开后点「再试一次」。'); }, 8000);
  }
  net.start(code, () => isHost);
  render();
}
function startSolo(){
  room = '';
  history.replaceState(null, '', location.pathname + location.search);
  isHost = true;
  net.stop();
  resetView();
  const saved = store.get('game:solo', null);
  if (saved && saved.phase !== 'over'){ game.S = saved; game.resume(); }
  else game.newLobby(ME, myName, true);
  if (game.S.phase === 'lobby'){ const s = game.S.seats.find(x => x.pid === ME); if (s) s.name = myName; }
  S = game.S;
  game.scheduleBots();
  render();
}
function leaveRoom(){
  if (S && S.phase === 'lobby' && !isHost) net.send('intent', {pid: ME, a: {type: 'leave'}});
  if (isHost && room === '' && S && S.phase === 'over') store.del('game:solo');
  net.stop();
  game.epoch++;
  game.S = null;
  S = null;
  room = null;
  isHost = false;
  closeModal();
  history.replaceState(null, '', location.pathname + location.search);
  render();
}
function showWait(title, text){
  $('waitTitle').textContent = title;
  $('waitText').textContent = text;
}

/* ---------- 画面 ---------- */
let shownRoll = 0, shownAnim = 0, shownFx = 0, shownCard = 0, viewGid = '', lastTurnPid = '', animating = 0, lastPhase = '';
function resetView(){ viewGid = ''; }
function screen(id){
  for (const k of ['home', 'waiting', 'lobby']){
    const was = !$(k).hidden;
    $(k).hidden = k !== id;
    if (!was && k === id){ const p = $(k).querySelector('.panel'); p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }
  }
  $('hud').hidden = id !== 'game';
}
// 一天的时间跟着圈数走：开局清晨，中盘黄昏，收官深夜。不限圈数就每 16 圈一天
function dayFor(){
  const span = S.maxRounds || 16;
  const prog = ((S.round - 1) + S.turn / S.players.length) / span;
  return S.maxRounds ? 0.08 + Math.min(1, prog) * 0.86 : (0.08 + prog * 0.86) % 1;
}
function render(){
  if (!sc) return;
  if (room === null){
    screen('home');
    if (document.activeElement !== $('nameIn')) $('nameIn').value = myName;
    const saved = store.get('game:solo', null);
    $('btnSolo').textContent = saved && saved.phase === 'play' ? '接着玩上一局（和电脑）' : '和电脑玩';
    idle(true); syncBoard(null); renderSound(); return;
  }
  if (!S){ screen('waiting'); return; }
  if (S.phase === 'lobby'){ screen('lobby'); renderLobby(); idle(true); syncBoard(null); closeModal('over'); return; }
  screen('game');
  idle(false);
  sc.setDay(dayFor(), S.gid === viewGid);
  // 换了一局（或者刚进来）：不要重播以前的动画
  if (S.gid !== viewGid){
    viewGid = S.gid;
    shownRoll = S.rollId;
    shownAnim = S.anim ? S.anim.id : 0;
    shownFx = S.fxSeq;
    shownCard = S.card ? S.card.id : 0;
    lastTurnPid = '';
    animating = 0;
    sc.syncTokens(S.players);
    if (cur()) sc.focusTile(cur().pos);
    cashShown.clear();
  }
  playEffects();
  syncBoard(S);
  renderHud();
  if (S.phase === 'over'){ if (lastPhase !== 'over') celebrateOver(); renderOver(); }
  else if (modalKind === 'over') closeModal();
  lastPhase = S.phase;
  if (modalKind === 'city' && cityOpen >= 0) openCity(cityOpen, true);
  if (modalKind === 'mine') openMine(true);
}
function syncBoard(st){
  for (let i = 0; i < SQ.length; i++){
    const o = st && st.own ? st.own[i] : -1;
    sc.setTile(i, o >= 0 ? charOf(st.players[o].ch).color : null, st && st.lvl ? st.lvl[i] : 0);
  }
  if (st && st.players && !animating) sc.syncTokens(st.players);
  if (!st || !st.players) sc.syncTokens([]);
}
// 骰子、走棋、金额变化、抽卡：只播新的，配上声音和粒子
let lastCoinAt = 0;
function playEffects(){
  if (S.rollId !== shownRoll){
    shownRoll = S.rollId;
    if (overview) setOverview(false);
    sc.focusTile(cur().pos);
    sfx('dice');
    sc.rollDice(S.one ? [S.dice[0], 0] : S.dice);
  }
  if (S.anim && S.anim.id !== shownAnim){
    shownAnim = S.anim.id;
    const a = S.anim;
    animating++;
    const done = () => { animating--; if (S && S.players) sc.syncTokens(S.players); };
    if (a.jump){
      sfx('teleport');
      sc.teleport(a.pid, a.path[a.path.length - 1]).then(() => { sfx('jail'); done(); }, done);
    } else {
      const n = a.path.length;
      sc.hop(a.pid, a.path, FAST.on ? 5 : (a.ms || STEP_MS) - 15, k => { if (!FAST.on) sfx(k === n - 1 ? 'land' : 'hop', k); }).then(done, done);
    }
  }
  for (const f of S.fx){
    if (f.id <= shownFx) continue;
    shownFx = f.id;
    if (f.k === 'cash'){
      floatMoney(f.pid, f.v);
      const now = Date.now();
      if (now - lastCoinAt > 160){ lastCoinAt = now; sfx(f.v > 0 ? 'coin' : 'pay'); }
      if (f.v > 0) setTimeout(() => { const p = sc.tokenPos(f.pid); if (p) sc.burst('coins', p); }, animating ? 450 : 60);
    }
    if (f.k === 'buy'){ sfx('buy'); sc.burst('confetti', f.i); }
    if (f.k === 'build'){ if (S.lvl[f.i] === 5){ sfx('hotel'); sc.fireworks(f.i, 3); } else sfx('build'); }
    if (f.k === 'bust'){ const p = S.players.find(q => q.pid === f.pid); if (p) toast(`${p.name} 破产出局了`); sfx('bust'); }
  }
  if (S.card && S.card.id !== shownCard){
    shownCard = S.card.id;
    sfx('card');
    showDeckCard(S.card);
  }
}
const pendingFloats = [];
function floatMoney(pid, v){
  // 等棋子走到位再冒数字
  setTimeout(() => {
    const pos = sc.tokenScreenPos(pid);
    if (!pos) return;
    const f = el('div', 'float ' + (v > 0 ? 'up' : 'down'), (v > 0 ? '+' : '-') + Math.abs(Math.round(v)));
    const n = pendingFloats.filter(x => x.pid === pid && Date.now() - x.t < 600).length;
    pendingFloats.push({pid, t: Date.now()});
    f.style.left = pos.x + 'px';
    f.style.top = (pos.y - n * 30) + 'px';
    $('floats').appendChild(f);
    setTimeout(() => f.remove(), 1700);
  }, animating ? 450 : 60);
}
function celebrateOver(){
  const win = S.rank && S.rank[0];
  if (!win) return;
  sfx(win.pid === ME ? 'win' : S.players.some(p => p.pid === ME) ? 'lose' : 'tada');
  for (let k = 0; k < 4; k++) setTimeout(() => sc.fireworks([0, 10, 20, 30][k], 2), k * 500);
  const p = sc.tokenPos(win.pid);
  if (p) sc.burst('confetti', p);
}

/* ---------- 头像 ---------- */
function avatar(ch, cls = 'av'){
  const c = charOf(ch), a = el('span', cls);
  a.style.setProperty('--c', c.color);
  const img = new Image();
  img.alt = c.name;
  img.src = sc.portrait(c.id);
  a.appendChild(img);
  return a;
}

/* ---------- 首页、大厅 ---------- */
function renderLobby(){
  const host = isHost, solo = room === '';
  $('lobbyTitle').textContent = solo ? '和电脑玩' : '选个角色，等人上车';
  $('lobbyRoom').hidden = solo;
  $('lobbyRoom').textContent = '房间 ' + room;
  $('btnLeave').textContent = solo ? '回首页' : '退出房间';
  const box = $('chars');
  box.replaceChildren();
  const mySeat = S.seats.find(s => s.pid === ME);
  CHARS.forEach(c => {
    const owner = S.seats.find(s => s.ch === c.id);
    const b = el('button', 'char' + (owner && owner.pid !== ME ? ' taken' : ''));
    b.type = 'button';
    b.style.setProperty('--c', c.color);
    b.setAttribute('aria-pressed', String(!!mySeat && mySeat.ch === c.id));
    b.append(avatar(c.id, 'face'), el('b', '', c.name), el('i', '', c.skill), el('small', '', c.desc));
    if (owner && owner.pid !== ME) b.appendChild(el('span', 'who', owner.name));
    b.disabled = !mySeat || (owner && owner.pid !== ME);
    b.addEventListener('click', () => { sfx('pop'); send({type: 'char', ch: c.id}); });
    box.appendChild(b);
  });
  const ul = $('seats');
  ul.replaceChildren();
  S.seats.forEach(s => {
    const li = el('li', 'seat');
    const nm = el('span', 'nm', s.name);
    if (s.pid === ME) nm.appendChild(el('span', 'tag pink', '你'));
    if (s.pid === S.hostId && !solo) nm.appendChild(el('span', 'tag', '房主'));
    if (s.ai) nm.appendChild(el('span', 'tag', '电脑'));
    else if (!solo && s.pid !== ME && net.ok && !net.online.has(s.pid)) nm.appendChild(el('span', 'tag', '离线'));
    li.append(avatar(s.ch), nm);
    if (host && s.pid !== S.hostId){
      const x = el('button', 'btn ghost small', '移出');
      x.type = 'button';
      x.addEventListener('click', () => send({type: 'remove', pid: s.pid}));
      li.appendChild(x);
    } else li.appendChild(el('span'));
    ul.appendChild(li);
  });
  for (let k = S.seats.length; k < 4; k++){
    const li = el('li', 'seat empty');
    li.append(el('span', 'av', '·'), el('span', 'nm', '空座'));
    if (host){
      const a = el('button', 'btn ghost small', '加电脑');
      a.type = 'button';
      a.addEventListener('click', () => { sfx('pop'); send({type: 'addBot'}); });
      li.appendChild(a);
    } else li.appendChild(el('span'));
    ul.appendChild(li);
  }
  const sel = $('roundsSel');
  sel.value = String(S.maxRounds);
  sel.disabled = !host;
  $('shareBox').hidden = solo || !host;
  $('shareLink').textContent = location.origin + location.pathname + '#' + room;
  const acts = $('lobbyActs');
  acts.replaceChildren();
  if (host){
    const go = el('button', 'btn', S.seats.length < 2 ? '至少两个人才能出发' : `出发！（${S.seats.length} 人）`);
    go.type = 'button';
    go.disabled = S.seats.length < 2;
    go.addEventListener('click', () => { sfx('buy'); send({type: 'start'}); });
    acts.appendChild(go);
  }
  $('lobbyNote').textContent = host ? (solo ? '点空座可以多加电脑对手。' : '') : `${S.seats.length} 人在车上，房主点「出发」就开始。`;
}

/* ---------- 对局界面 ---------- */
const cashShown = new Map();
let cashTween = 0;
function tickCash(){
  cashTween = 0;
  if (!S || !S.players) return;
  let more = false;
  for (const q of S.players){
    const d = cashShown.get(q.pid);
    if (!d || !d.el.isConnected) continue;
    if (Math.abs(d.v - q.cash) < 1) d.v = q.cash;
    else { d.v += (q.cash - d.v) * 0.18; more = true; }
    d.el.textContent = money(d.v);
  }
  if (more) cashTween = requestAnimationFrame(tickCash);
}
function renderHud(){
  const p = cur(), mine = p && p.pid === ME;
  const box = $('players');
  box.replaceChildren();
  S.players.forEach((q, k) => {
    const c = charOf(q.ch);
    const d = el('div', 'pc' + (k === S.turn && S.phase === 'play' ? ' cur' : '') + (q.out ? ' out' : ''));
    d.style.setProperty('--c', c.color);
    const info = el('span', 'info');
    const cashEl = el('span', 'cash');
    const shown = cashShown.get(q.pid);
    const v = shown ? shown.v : q.cash;
    cashEl.textContent = money(v);
    cashShown.set(q.pid, {v, el: cashEl});
    info.append(el('span', 'nm', q.pid === ME ? '你' : q.name), cashEl);
    d.append(avatar(q.ch), info);
    const badge = q.out ? '破产' : q.jail ? '坐牢' : q.auto ? '代打' : q.ai ? '电脑' : '';
    if (badge) d.appendChild(el('span', 'badge', badge));
    box.appendChild(d);
  });
  if (!cashTween) cashTween = requestAnimationFrame(tickCash);
  $('turnWho').textContent = S.phase === 'over' ? '游戏结束' : mine ? `轮到你了 · ${charOf(p.ch).name}` : `轮到 ${p.name}`;
  const rd = S.maxRounds ? Math.min(S.round, S.maxRounds) : S.round;
  const t = sc.day, clock = t < 0.08 ? '🌅' : t < 0.4 ? '☀️' : t < 0.56 ? '🌇' : t < 0.9 ? '🌙' : '🌅';
  $('roundLbl').textContent = `${clock} ${S.maxRounds ? `${rd}/${S.maxRounds} 圈` : `第 ${rd} 圈`}`;
  if (mine && lastTurnPid !== ME && S.phase === 'play' && S.players.some(q => q.pid !== ME && !q.out)){ toast('轮到你了'); sfx('turn'); }
  if (p && p.pid !== lastTurnPid && S.phase === 'play' && S.step === 'roll') sc.focusTile(p.pos);
  lastTurnPid = p ? p.pid : '';
  const hostGone = room && !isHost && net.ok && !net.online.has(S.hostId);
  $('banner').hidden = !hostGone;
  $('banner').textContent = '房主暂时离线了，等他回来就能接着玩';
  renderMsg(p, mine);
  renderActs(p, mine);
  if (mine && !p.auto && S.step === 'buy' && S.offer >= 0 && modalKind !== 'buy') openBuy(S.offer);
  if (!(mine && !p.auto && S.step === 'buy') && modalKind === 'buy') closeModal();
  renderSound();
}
function renderSound(){
  const on = audio.on;
  for (const id of ['btnSound', 'btnSoundHome']){ const b = $(id); if (!b) continue; b.firstChild.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-label', on ? '关掉声音' : '打开声音'); }
}
function renderMsg(p, mine){
  const m = $('msg');
  let text = '';
  if (S.phase === 'play'){
    if (S.step === 'buy' && !mine) text = `${p.name} 走到${SQ[S.offer].n}，在想要不要买`;
    else if (S.step === 'roll' && p.jail) text = mine ? `你在监狱里：交 ${JAIL_FINE} 元出来，或者掷出对子出狱` : `${p.name} 在监狱里`;
    else if (S.step === 'manage' && mine && S.own[p.pos] === S.turn && game_canBuild(p, p.pos)) text = `这是你的${SQ[p.pos].n}，顺手在这里加盖一栋？`;
    else text = S.log[0] || '';
  }
  m.textContent = text;
  m.hidden = !text;
}
function bigBtn(label, ico, a, cls = ''){
  const b = el('button', 'big ' + cls);
  b.type = 'button';
  b.append(el('span', 'ico', ico), el('span', '', label));
  b.addEventListener('click', () => { sfx('click'); send(a); });
  return b;
}
function smallBtn(label, a, cls = 'ghost'){
  const b = el('button', 'btn small ' + cls, label);
  b.type = 'button';
  b.addEventListener('click', () => { sfx('click'); send(a); });
  return b;
}
function renderActs(p, mine){
  const box = $('acts');
  box.replaceChildren();
  if (S.phase !== 'play') return;
  if (!mine || p.auto){
    const who = p.pid === ME ? '电脑在替你代打' : (p.ai || p.auto) ? `${p.name} 在想…` : `等 ${p.name}`;
    box.appendChild(el('div', 'waiting', S.step === 'rolling' ? '骰子在滚…' : S.step === 'moving' ? '走着呢…' : who));
    return;
  }
  if (S.step === 'roll'){
    if (p.jail){
      if (p.cash >= JAIL_FINE) box.appendChild(smallBtn(`交 ${JAIL_FINE} 出狱`, {type: 'payJail'}, 'lemon'));
      if (p.cards) box.appendChild(smallBtn('用出狱卡', {type: 'useCard'}, 'mint'));
      box.appendChild(bigBtn('碰运气', '🎲', {type: 'roll'}));
    } else if (p.ch === 'rabbit'){
      box.appendChild(bigBtn('掷骰子', '🎲', {type: 'roll'}));
      box.appendChild(smallBtn('只掷一颗', {type: 'roll', one: true}, 'ghost'));
    } else box.appendChild(bigBtn('掷骰子', '🎲', {type: 'roll'}));
  } else if (S.step === 'manage'){
    const i = p.pos;
    if (S.own[i] === S.turn && game_canBuild(p, i)) box.appendChild(smallBtn(`在${SQ[i].n}加盖一栋 ${money(houseCost(p, i))}`, {type: 'build', sq: i}, 'lemon'));
    box.appendChild(S.again && !p.jail ? bigBtn('再掷一次', '🎲', {type: 'roll'}, 'lemon') : bigBtn('结束回合', '✓', {type: 'end'}, 'mint'));
  } else if (S.step === 'buy'){
    const b = el('button', 'big lemon');
    b.type = 'button';
    b.append(el('span', 'ico', '🏙️'), el('span', '', '看看这城'));
    b.addEventListener('click', () => openBuy(S.offer));
    box.appendChild(b);
  } else {
    box.appendChild(el('div', 'waiting', S.step === 'rolling' ? '骰子在滚…' : '走着呢…'));
  }
}
// 规则判断借用 Game 里的写法（别人手机上也要能算按钮能不能点）
function houseCost(p, i){ return p.ch === 'panda' ? Math.round(SQ[i].hc * TUNE.pandaOff) : SQ[i].hc; }
function priceFor(p, i){ return p.ch === 'pig' ? Math.round(SQ[i].p * TUNE.pigOff) : SQ[i].p; }
function ownsGroup(o, g){ return o >= 0 && SQ.every((s, i) => s.t !== 'prop' || s.g !== g || S.own[i] === o); }
function game_canBuild(p, i){
  const s = SQ[i], k = S.players.indexOf(p);
  return S.phase === 'play' && cur() === p && (S.step === 'roll' || S.step === 'manage') && s && s.t === 'prop' &&
    S.own[i] === k && (ownsGroup(k, s.g) || !S.freeBuilt) && S.lvl[i] < 5 && p.cash >= houseCost(p, i);
}
function game_canSell(p, i){
  return S.phase === 'play' && cur() === p && (S.step === 'roll' || S.step === 'manage') && S.own[i] === S.players.indexOf(p) && S.lvl[i] > 0;
}
function baseRent(i){
  const o = S.own[i], s = SQ[i];
  if (s.t === 'station') return STATION_RENT[SQ.filter((x, k) => x.t === 'station' && S.own[k] === o).length];
  return S.lvl[i] ? s.r[S.lvl[i]] : ownsGroup(o, s.g) ? s.r[0] * 2 : s.r[0];
}

/* ---------- 卡片弹窗 ---------- */
let modalKind = '', cityOpen = -1, deckTimer = 0;
function openModal(kind, card, clear, still){
  const m = $('modal');
  if (still) card.style.animation = 'none';
  m.replaceChildren(card);
  m.className = 'modal' + (clear ? ' clear' : '');
  m.hidden = false;
  modalKind = kind;
  if (!still && !clear) sfx('pop');
}
function closeModal(kind){
  if (kind && modalKind !== kind) return;
  $('modal').hidden = true;
  modalKind = '';
  cityOpen = -1;
  if (sc) sc.highlight(-1);
}
$('modal').addEventListener('click', e => { if (e.target === e.currentTarget && modalKind !== 'buy' && modalKind !== 'over') closeModal(); });
// 城市卡片的头：颜色条、地标插画、名字和一句话
function cityCard(i){
  const s = SQ[i], card = el('div', 'card city');
  const head = el('div', 'card-head');
  head.style.setProperty('--g', s.t === 'prop' ? GROUPS[s.g].color : '#9aa6c8');
  const pic = new Image();
  pic.className = 'pic';
  pic.alt = s.spot || s.n;
  pic.src = sc.snapshot(i);
  const tx = el('div', 'tx');
  tx.append(el('h3', '', s.n), el('p', '', s.t === 'prop' ? `${s.spot} · ${GROUPS[s.g].name}色 ${SQ.filter(x => x.t === 'prop' && x.g === s.g).length} 座一组` : '交通站'));
  head.append(tx, pic);
  const body = el('div', 'card-body');
  body.appendChild(el('p', 'blurb', s.blurb));
  card.append(head, body);
  return {card, body};
}
function rentTable(i){
  const s = SQ[i], tb = el('table', 'rent');
  const rows = s.t === 'station'
    ? [['有 1 个站', 25], ['有 2 个站', 50], ['有 3 个站', 100], ['4 个站都有', 200]]
    : [['空地', s.r[0]], ['整组都是你的', s.r[0] * 2], ['1 栋房子', s.r[1]], ['2 栋房子', s.r[2]], ['3 栋房子', s.r[3]], ['4 栋房子', s.r[4]], ['大酒店', s.r[5]]];
  const o = S.own[i];
  let nowIdx = -1;
  if (o >= 0){
    if (s.t === 'station') nowIdx = SQ.filter((x, k) => x.t === 'station' && S.own[k] === o).length - 1;
    else nowIdx = S.lvl[i] ? S.lvl[i] + 1 : ownsGroup(o, s.g) ? 1 : 0;
  }
  rows.forEach(([label, v], k) => {
    const tr = el('tr', k === nowIdx ? 'now' : '');
    tr.append(el('td', '', label), el('td', '', '¥' + v));
    tb.appendChild(tr);
  });
  return tb;
}
function openBuy(i){
  const p = cur(), s = SQ[i], {card, body} = cityCard(i);
  const cost = priceFor(p, i);
  const price = el('div', 'price');
  if (cost !== s.p) price.appendChild(el('s', '', '¥' + s.p));
  price.append(document.createTextNode('¥' + cost), el('small', '', cost !== s.p ? '福福的八折价' : '买下它'));
  body.append(price, rentTable(i));
  const row = el('div', 'row');
  const buy = el('button', 'btn', '买下');
  buy.type = 'button';
  buy.disabled = p.cash < cost;
  buy.addEventListener('click', () => { closeModal(); send({type: 'buy'}); });
  const skip = el('button', 'btn ghost', '不买');
  skip.type = 'button';
  skip.addEventListener('click', () => { sfx('click'); closeModal(); send({type: 'skip'}); });
  row.append(buy, skip);
  body.appendChild(row);
  sc.highlight(i);
  openModal('buy', card);
}
function openCity(i, refresh){
  const s = SQ[i];
  if (!S || !S.players){ if (!refresh) toast(`${s.n}：${s.blurb}`, 3200); return; }
  if (!['prop', 'station'].includes(s.t)){
    if (!refresh) toast(`${s.n}：${s.blurb}`, 3200);
    return;
  }
  cityOpen = i;
  const o = S.own[i], owner = o >= 0 ? S.players[o] : null, my = me();
  const {card, body} = cityCard(i);
  const info = el('div', 'price');
  if (owner) info.append(document.createTextNode(money(baseRent(i))), el('small', '', `现在的过路费 · 主人 ${owner.pid === ME ? '你' : owner.name}`));
  else info.append(document.createTextNode('¥' + s.p), el('small', '', '还没人买'));
  body.append(info, rentTable(i));
  const row = el('div', 'row');
  if (my && o === S.players.indexOf(my) && s.t === 'prop'){
    if (S.lvl[i] < 5){
      const b = el('button', 'btn lemon small', `${S.lvl[i] === 4 ? '升级大酒店' : '加盖一栋'} ${money(houseCost(my, i))}`);
      b.type = 'button';
      b.disabled = !game_canBuild(my, i) || my.auto;
      b.addEventListener('click', () => send({type: 'build', sq: i}));
      row.appendChild(b);
    }
    if (S.lvl[i] > 0){
      const b = el('button', 'btn ghost small', `卖一栋 +¥${s.hc / 2}`);
      b.type = 'button';
      b.disabled = !game_canSell(my, i) || my.auto;
      b.addEventListener('click', () => send({type: 'sell', sq: i}));
      row.appendChild(b);
    }
    let why = '';
    if (cur() !== my) why = '轮到你的时候才能盖房子。';
    else if (!(S.step === 'roll' || S.step === 'manage')) why = '这一步走完再盖。';
    else if (!ownsGroup(o, s.g) && S.freeBuilt) why = '这回合已经盖过一栋了；凑齐同色的城市才能接着盖。';
    else if (S.lvl[i] < 5 && my.cash < houseCost(my, i)) why = '钱不够盖房子。';
    if (why) body.appendChild(el('p', 'note', why));
  }
  const close = el('button', 'btn ghost small', '关闭');
  close.type = 'button';
  close.addEventListener('click', () => closeModal());
  row.appendChild(close);
  body.appendChild(row);
  sc.highlight(i);
  openModal('city', card, false, refresh);
}
function openMine(refresh){
  const my = me();
  if (!my){ if (!refresh) toast('你在旁边看，不在这局里'); return; }
  const k = S.players.indexOf(my);
  const card = el('div', 'card');
  const head = el('div', 'card-head');
  head.style.setProperty('--g', charOf(my.ch).color);
  const tx = el('div', 'tx');
  tx.append(el('h3', '', '我的城市'), el('p', '', `${charOf(my.ch).name} · ${charOf(my.ch).skill}：${charOf(my.ch).desc}`));
  head.append(tx, avatar(my.ch, 'pic-av'));
  const body = el('div', 'card-body');
  const list = el('ul', 'mine');
  const mineSq = SQ.map((s, i) => i).filter(i => S.own[i] === k);
  if (!mineSq.length) body.appendChild(el('p', 'note', '还没有城市。走到没人买的城市就能买下。'));
  for (const i of mineSq){
    const s = SQ[i], li = el('li');
    const dot = el('span', 'dot');
    dot.style.setProperty('--g', s.t === 'prop' ? GROUPS[s.g].color : '#9aa6c8');
    const pic = new Image();
    pic.className = 'thumb';
    pic.src = sc.snapshot(i);
    const nm = el('span', '');
    nm.append(el('div', 'nm', s.n), el('div', 'lv', s.t === 'station' ? `车站 · 过路费 ${money(baseRent(i))}` : `${S.lvl[i] === 5 ? '大酒店' : S.lvl[i] ? S.lvl[i] + ' 栋房子' : '空地'} · 过路费 ${money(baseRent(i))}`));
    li.append(dot, pic, nm);
    if (s.t === 'prop' && S.lvl[i] < 5){
      const b = el('button', 'btn lemon small', `盖 ${money(houseCost(my, i))}`);
      b.type = 'button';
      b.disabled = !game_canBuild(my, i) || my.auto;
      b.addEventListener('click', () => send({type: 'build', sq: i}));
      li.appendChild(b);
    } else li.appendChild(el('span'));
    list.appendChild(li);
  }
  if (mineSq.length) body.appendChild(list);
  body.appendChild(el('p', 'note', S.freeBuilt ? '这回合已经用掉了随便盖的那一栋；凑齐同色的城市还能接着盖。' : '轮到你时，可以在任意一座自己的城市加盖一栋；凑齐同色的城市随时能盖。'));
  const close = el('button', 'btn ghost small', '关闭');
  close.type = 'button';
  close.addEventListener('click', () => closeModal());
  body.appendChild(close);
  card.append(head, body);
  openModal('mine', card, false, refresh);
}
function showDeckCard(c){
  const card = el('div', 'deck-card');
  const head = el('div', 'card-head');
  head.style.setProperty('--g', c.deck === 'chance' ? '#ffad5f' : '#b9a5ff');
  head.append(el('div', 'big-ico', c.deck === 'chance' ? '❓' : '🔮'), el('h3', '', c.deck === 'chance' ? '机会' : '命运'));
  card.append(head, el('div', 'text', c.text));
  if (modalKind === 'buy' || modalKind === 'over') return;
  openModal('deck', card, true);
  clearTimeout(deckTimer);
  deckTimer = setTimeout(() => closeModal('deck'), 2300);
}
function renderOver(){
  if (modalKind === 'over') return;
  const card = el('div', 'card');
  const head = el('div', 'card-head');
  head.style.setProperty('--g', 'var(--pink)');
  const win = S.rank[0];
  const tx = el('div', 'tx');
  tx.append(el('h3', '', win.pid === ME ? '你赢了！' : `${win.name} 赢了`), el('p', '', S.maxRounds && S.round > S.maxRounds ? `${S.maxRounds} 圈走完了，按身家（现金加房产）排名` : '其他人都破产了'));
  head.append(tx, avatar(win.ch, 'pic-av'));
  const body = el('div', 'card-body');
  const ol = el('ol', 'rank');
  S.rank.forEach((r, k) => {
    const li = el('li');
    li.append(el('span', 'no', String(k + 1)), avatar(r.ch), el('span', 'nm', r.name + (r.pid === ME ? '（你）' : '')), el('span', 'w', r.out ? '破产' : money(r.worth)));
    ol.appendChild(li);
  });
  body.appendChild(ol);
  const row = el('div', 'row');
  if (isHost){
    const again = el('button', 'btn', '再来一局');
    again.type = 'button';
    again.addEventListener('click', () => { closeModal(); send({type: 'again'}); });
    row.appendChild(again);
  } else body.appendChild(el('p', 'note', '等房主点「再来一局」，或者回首页。'));
  const home = el('button', 'btn ghost', '回首页');
  home.type = 'button';
  home.addEventListener('click', leaveRoom);
  row.appendChild(home);
  body.appendChild(row);
  card.append(head, body);
  openModal('over', card, false, true);
}
function openMenu(){
  const card = el('div', 'card');
  const head = el('div', 'card-head');
  head.style.setProperty('--g', 'var(--grape)');
  head.appendChild(el('div', 'tx')).appendChild(el('h3', '', '怎么玩'));
  const body = el('div', 'card-body');
  const ul = el('ul', 'rules');
  for (const t of ['掷骰子往前走，走到没人买的城市可以买下。', '别人走到你的城市要交过路费；凑齐同色的城市，空地过路费翻倍。', '轮到你时，可以在任意一座自己的城市加盖一栋房子；凑齐同色随时能盖。盖满四栋可以升级大酒店。', '掷出对子可以再掷一次，连着三次对子要进监狱。', `经过起点领 ${PASS_GO} 元。钱不够付账会先卖房子，再卖城市，还不够就破产。`, '每个角色有自己的本事，开局时选。', '圈数走完时按身家排名；或者只剩一个人没破产，他就赢了。', '点任何一格可以看它的介绍和过路费。']) ul.appendChild(el('li', '', t));
  body.appendChild(ul);
  const sw = el('div', 'switches');
  const mk = (label, get, set) => {
    const b = el('button', 'btn ghost small', '');
    b.type = 'button';
    const paint = () => { b.textContent = `${label}：${get() ? '开' : '关'}`; };
    paint();
    b.addEventListener('click', () => { set(!get()); paint(); renderSound(); });
    return b;
  };
  sw.append(mk('声音', () => audio.on, v => audio.setOn(v)), mk('音乐', () => audio.music, v => audio.setMusic(v)));
  body.appendChild(sw);
  const row = el('div', 'row');
  const leave = el('button', 'btn ghost', room ? '退出房间' : '回首页');
  leave.type = 'button';
  leave.addEventListener('click', () => { closeModal(); leaveRoom(); });
  const close = el('button', 'btn', '接着玩');
  close.type = 'button';
  close.addEventListener('click', () => closeModal());
  row.append(close, leave);
  body.appendChild(row);
  card.append(head, body);
  openModal('menu', card);
}

/* ---------- 按钮 ---------- */
function takeName(){
  const v = $('nameIn').value.trim().slice(0, 10);
  if (v){ myName = v; store.set('name', v); }
}
$('btnCreate').addEventListener('click', () => {
  takeName();
  sfx('pop');
  let code = '';
  for (let k = 0; k < 4; k++) code += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)];
  enterRoom(code, true);
});
$('btnSolo').addEventListener('click', () => { takeName(); sfx('pop'); startSolo(); });
function joinTyped(){
  takeName();
  const code = $('codeIn').value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)){ $('homeErr').textContent = '房间号是四个英文字母，看看朋友发的链接最后那几个字母。'; return; }
  $('homeErr').textContent = '';
  enterRoom(code, false);
}
$('btnJoin').addEventListener('click', joinTyped);
$('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); joinTyped(); } });
$('btnLeave').addEventListener('click', () => { sfx('click'); leaveRoom(); });
$('btnRetry').addEventListener('click', () => { if (room) enterRoom(room, false); });
$('btnHome2').addEventListener('click', leaveRoom);
$('roundsSel').addEventListener('change', e => send({type: 'rounds', n: +e.target.value}));
$('btnCopy').addEventListener('click', () => {
  const text = $('shareLink').textContent;
  const fallback = () => { const r = document.createRange(); r.selectNodeContents($('shareLink')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('长按链接复制'); };
  try { navigator.clipboard.writeText(text).then(() => toast('链接复制好了，发给朋友吧'), fallback); } catch (e){ fallback(); }
});
$('btnMine').addEventListener('click', () => openMine());
$('btnMenu').addEventListener('click', openMenu);
for (const id of ['btnSound', 'btnSoundHome']) $(id).addEventListener('click', () => { audio.setOn(!audio.on); renderSound(); if (audio.on) sfx('pop'); });
let overview = false;
function setOverview(on){
  overview = on;
  $('btnView').firstChild.textContent = on ? '🎯' : '🔭';
  $('btnView').querySelector('span').textContent = on ? '跟随' : '全图';
  $('btnView').setAttribute('aria-label', on ? '跟着棋子' : '看全图');
}
$('btnView').addEventListener('click', () => {
  sfx('click');
  setOverview(!overview);
  if (overview) sc.overview(); else if (cur()) sc.focusTile(cur().pos);
});
window.addEventListener('hashchange', () => {
  const code = location.hash.slice(1).toUpperCase();
  if (!PREVIEW && /^[A-Z]{4}$/.test(code) && code !== room) enterRoom(code, false);
});

/* ---------- 开机 ---------- */
if (PREVIEW){
  $('btnCreate').hidden = true;
  $('joinBox').hidden = true;
  $('previewNote').hidden = false;
}
sc = await createScene($('stage'), {onTileClick: i => { sfx('click'); openCity(i); }});
sc.onBoom = () => sfx('boom');
$('loading').classList.add('gone');
setTimeout(() => $('loading').remove(), 900);
{
  const code = location.hash.slice(1).toUpperCase();
  if (!PREVIEW && /^[A-Z]{4}$/.test(code)) enterRoom(code, false);
  else { sc.intro(); idleOn = true; sc.drift(1 / 170); render(); }
}
if (LOCAL) window.__t = {game, get S(){ return S; }, FAST, sc, send, startSolo, enterRoom, leaveRoom, ME, render, net, audio};
