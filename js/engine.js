// 规则：只在房主那边跑。不碰画面，所有变化都写进局面 S，再交给 commit 去存、去广播、去画
import {SQ, N, JAIL, STATIONS, GROUP_SQ, START_CASH, PASS_GO, JAIL_FINE, STATION_RENT, CHARS, BOT_NAMES, CHANCE, FATE, TUNE} from './data.js?v=9c5962e2';

export const ROLL_MS = 1350, STEP_MS = 230, LAND_PAD = 380, TELEPORT_MS = 720;
const rid = (n = 6) => Array.from({length: n}, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');
const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const skill = p => p.ch;

export class Game {
  // commit：局面变了要做的事；wait(ms, fn)：过一会儿再做（测试时可以换成立刻做）
  constructor({commit, wait = (ms, fn) => setTimeout(fn, ms), fast = () => false}){
    this.S = null;
    this.commit = () => commit(this.S);
    this.wait = wait;
    this.fast = fast;
    this.epoch = 0;
    this.botTok = 0;
  }
  ms(v){ return this.fast() ? 1 : v; }

  /* ---------- 大厅 ---------- */
  newLobby(hostPid, name, solo){
    this.epoch++;
    this.S = {v: 2, gid: rid(), phase: 'lobby', hostId: hostPid, seats: [{pid: hostPid, name, ai: false, ch: 'sheep'}], maxRounds: 20, seq: 0, log: []};
    if (solo){ this.addBot(); this.addBot(); }
    return this.S;
  }
  freeChar(prefer){
    const used = new Set(this.S.seats.map(s => s.ch));
    if (prefer && !used.has(prefer)) return prefer;
    const free = CHARS.filter(c => !used.has(c.id));
    return (free[Math.floor(Math.random() * free.length)] || CHARS[0]).id;
  }
  addBot(){
    const S = this.S;
    if (S.seats.length >= 4) return;
    const used = new Set(S.seats.map(s => s.name));
    S.seats.push({pid: 'bot-' + rid(5), name: BOT_NAMES.find(n => !used.has(n)) || '电脑', ai: true, ch: this.freeChar()});
  }
  lobbyAct(pid, a){
    const S = this.S, host = pid === S.hostId, seat = S.seats.find(s => s.pid === pid);
    switch (a.type){
      case 'join': {
        const name = String(a.name || '').trim().slice(0, 10) || '旅客';
        if (seat) seat.name = name;
        else if (S.seats.length < 4) S.seats.push({pid, name, ai: false, ch: this.freeChar(a.ch)});
        else return;
        break;
      }
      case 'char':
        if (!seat || !CHARS.some(c => c.id === a.ch) || S.seats.some(s => s.ch === a.ch && s !== seat)) return;
        seat.ch = a.ch;
        break;
      case 'leave':
        if (host || !seat) return;
        S.seats = S.seats.filter(s => s.pid !== pid);
        break;
      case 'addBot': if (!host) return; this.addBot(); break;
      case 'remove': if (!host || a.pid === S.hostId) return; S.seats = S.seats.filter(s => s.pid !== a.pid); break;
      case 'rounds': if (!host) return; S.maxRounds = [0, 15, 20, 30].includes(+a.n) ? +a.n : 20; break;
      case 'start': if (!host || S.seats.length < 2) return; return this.start();
      default: return;
    }
    this.commit();
  }
  start(){
    const S = this.S;
    this.epoch++;
    Object.assign(S, {
      phase: 'play', gid: rid(),
      players: S.seats.map(s => ({pid: s.pid, name: s.name, ai: s.ai, ch: s.ch, cash: START_CASH, pos: 0, jail: 0, cards: 0, out: false, auto: false})),
      own: Array(N).fill(-1), lvl: Array(N).fill(0),
      turn: 0, round: 1, step: 'roll', dice: [3, 4], one: false, rollId: 0, dbl: 0, again: false,
      decks: {chance: shuffled(CHANCE.map((_, i) => i)), fate: shuffled(FATE.map((_, i) => i))}, deckPos: {chance: 0, fate: 0},
      card: null, offer: -1, anim: null, animSeq: 0, landSq: -1, freeBuilt: false, rank: null, endNow: false, outCount: 0,
      fx: [], fxSeq: 0, log: []
    });
    this.log(`出发！每人 ${START_CASH} 元，${S.maxRounds ? `玩 ${S.maxRounds} 圈` : '玩到只剩一个人'}`);
    this.commit();
  }
  backToLobby(){
    const S = this.S;
    this.epoch++;
    S.phase = 'lobby';
    S.seats = S.players.map(p => ({pid: p.pid, name: p.name, ai: p.ai, ch: p.ch}));
    S.players = null;
    S.log = [];
    this.commit();
  }

  /* ---------- 小工具 ---------- */
  get cur(){ return this.S.players ? this.S.players[this.S.turn] : null; }
  idx(p){ return this.S.players.indexOf(p); }
  log(t){ const L = this.S.log; L.unshift(t); if (L.length > 40) L.length = 40; }
  fx(e){ const S = this.S; S.fx.push({...e, id: ++S.fxSeq}); if (S.fx.length > 24) S.fx.shift(); }
  cash(p, v){ if (!v) return; p.cash += v; this.fx({k: 'cash', pid: p.pid, v}); }
  ownsGroup(o, g){ return o >= 0 && GROUP_SQ[g].every(i => this.S.own[i] === o); }
  price(p, i){ return skill(p) === 'pig' ? Math.round(SQ[i].p * TUNE.pigOff) : SQ[i].p; }
  houseCost(p, i){ return skill(p) === 'panda' ? Math.round(SQ[i].hc * TUNE.pandaOff) : SQ[i].hc; }
  // 这一格现在的过路费（还没算角色本事）
  baseRent(i){
    const S = this.S, o = S.own[i], s = SQ[i];
    if (s.t === 'station') return STATION_RENT[STATIONS.filter(k => S.own[k] === o).length];
    const l = S.lvl[i];
    if (l) return s.r[l];
    return this.ownsGroup(o, s.g) ? s.r[0] * 2 : s.r[0];
  }
  rentFor(payer, i){
    const owner = this.S.players[this.S.own[i]];
    let r = this.baseRent(i) * TUNE.rentMul;
    if (skill(owner) === 'tiger') r *= TUNE.tigerUp;
    if (skill(payer) === 'fox') r *= TUNE.foxOff;
    return Math.round(r);
  }
  worth(p){
    const k = this.idx(p);
    let w = p.cash;
    this.S.own.forEach((o, i) => { if (o === k) w += SQ[i].p + (this.S.lvl[i] || 0) * (SQ[i].hc || 0); });
    return w;
  }
  // 每回合可以在自己任意一座城市加盖一栋；凑齐同色的城市随时能盖，不限栋数
  freeBuild(p){ return !this.S.freeBuilt; }
  canBuild(p, i){
    const S = this.S, s = SQ[i], k = this.idx(p);
    return S.phase === 'play' && this.cur === p && (S.step === 'roll' || S.step === 'manage') && s && s.t === 'prop' &&
      S.own[i] === k && (this.ownsGroup(k, s.g) || this.freeBuild(p)) && S.lvl[i] < 5 && p.cash >= this.houseCost(p, i);
  }
  canSell(p, i){
    const S = this.S;
    return S.phase === 'play' && this.cur === p && (S.step === 'roll' || S.step === 'manage') && S.own[i] === this.idx(p) && S.lvl[i] > 0;
  }

  /* ---------- 玩家操作 ---------- */
  act(pid, a){
    const S = this.S;
    if (!S) return;
    if (S.phase === 'lobby') return this.lobbyAct(pid, a);
    if (S.phase === 'over'){ if (a.type === 'again' && pid === S.hostId) this.backToLobby(); return; }
    const p = S.players.find(q => q.pid === pid);
    if (p) this.play(p, a);
  }
  play(p, a){
    const S = this.S;
    if (S.phase !== 'play' || this.cur !== p) return;
    switch (a.type){
      case 'roll':
        if (S.step === 'roll' || (S.step === 'manage' && S.again && !p.jail)) this.roll(p, !!a.one && skill(p) === 'rabbit' && !p.jail);
        break;
      case 'buy': {
        if (S.step !== 'buy') return;
        const i = S.offer, cost = this.price(p, i);
        if (p.cash >= cost){
          this.cash(p, -cost);
          S.own[i] = S.turn;
          this.fx({k: 'buy', pid: p.pid, i, v: cost});
          this.log(`${p.name} 买下了${SQ[i].n}，花了 ${cost}`);
        }
        S.offer = -1;
        this.after(p);
        break;
      }
      case 'skip':
        if (S.step !== 'buy') return;
        this.log(`${p.name} 没买${SQ[S.offer].n}`);
        this.fx({k: 'skip', pid: p.pid, i: S.offer});
        S.offer = -1;
        this.after(p);
        break;
      case 'build': {
        if (!this.canBuild(p, a.sq)) return;
        if (!this.ownsGroup(S.turn, SQ[a.sq].g)) S.freeBuilt = true;
        const cost = this.houseCost(p, a.sq);
        this.cash(p, -cost);
        S.lvl[a.sq]++;
        this.fx({k: 'build', pid: p.pid, i: a.sq, lvl: S.lvl[a.sq], v: cost});
        this.log(`${p.name} 在${SQ[a.sq].n}${S.lvl[a.sq] === 5 ? '盖起了大酒店' : `盖了第 ${S.lvl[a.sq]} 栋房子`}`);
        this.commit();
        break;
      }
      case 'sell':
        if (!this.canSell(p, a.sq)) return;
        S.lvl[a.sq]--;
        this.cash(p, SQ[a.sq].hc / 2);
        this.fx({k: 'sell', pid: p.pid, i: a.sq, v: SQ[a.sq].hc / 2});
        this.log(`${p.name} 卖掉${SQ[a.sq].n}的一栋房子，拿回 ${SQ[a.sq].hc / 2}`);
        this.commit();
        break;
      case 'payJail':
        if (S.step !== 'roll' || !p.jail || p.cash < JAIL_FINE) return;
        this.cash(p, -JAIL_FINE);
        p.jail = 0;
        this.fx({k: 'free', pid: p.pid, how: 'pay'});
        this.log(`${p.name} 交了 ${JAIL_FINE} 元出狱`);
        this.commit();
        break;
      case 'useCard':
        if (S.step !== 'roll' || !p.jail || !p.cards) return;
        p.cards--;
        p.jail = 0;
        this.fx({k: 'free', pid: p.pid, how: 'card'});
        this.log(`${p.name} 用出狱卡出狱了`);
        this.commit();
        break;
      case 'end':
        if (S.step === 'manage' && !(S.again && !p.jail)) this.endTurn();
        break;
    }
  }
  roll(p, one){
    const S = this.S;
    const d1 = 1 + Math.floor(Math.random() * 6), d2 = one ? 0 : 1 + Math.floor(Math.random() * 6);
    S.dice = [d1, d2];
    S.one = one;
    S.rollId++;
    S.card = null;
    S.again = false;
    S.landSq = -1;
    S.step = 'rolling';
    this.commit();
    const ep = this.epoch;
    this.wait(this.ms(ROLL_MS), () => { if (ep === this.epoch) this.afterRoll(p, d1, d2); });
  }
  afterRoll(p, d1, d2){
    const S = this.S, sum = d1 + d2, dbl = d2 > 0 && d1 === d2;
    this.fx({k: 'roll', pid: p.pid, d: [d1, d2], dbl});
    if (p.jail){
      if (dbl){ p.jail = 0; this.fx({k: 'free', pid: p.pid, how: 'dbl'}); this.log(`${p.name} 掷出对子，出狱了`); return this.move(p, sum); }
      p.jail++;
      if (p.jail > 3){
        p.jail = 0;
        this.log(`${p.name} 关满三回合，交 ${JAIL_FINE} 元出狱`);
        this.pay(p, null, JAIL_FINE, '出狱');
        if (p.out) return this.endTurn();
        return this.move(p, sum);
      }
      this.log(`${p.name} 没掷出对子，还得待在监狱里`);
      this.fx({k: 'stay', pid: p.pid});
      S.step = 'manage';
      return this.commit();
    }
    if (dbl){
      S.dbl++;
      if (S.dbl >= 3){
        this.log(`${p.name} 连着三次掷出对子，开太快了，进监狱`);
        this.goJail(p);
        return this.after(p);
      }
      S.again = true;
    }
    this.log(`${p.name} 掷出 ${d2 ? `${d1}+${d2}` : d1}${dbl ? '，是对子，还能再掷一次' : ''}`);
    this.move(p, sum);
  }
  move(p, n){
    const path = [];
    let pos = p.pos;
    for (let k = 0; k < Math.abs(n); k++){ pos = (pos + (n > 0 ? 1 : N - 1)) % N; path.push(pos); }
    this.walk(p, path, n > 0);
  }
  moveTo(p, target){
    const path = [];
    let pos = p.pos;
    while (pos !== target){ pos = (pos + 1) % N; path.push(pos); }
    this.walk(p, path, true);
  }
  walk(p, path, forward){
    const S = this.S;
    if (forward && path.includes(0)){
      const bonus = PASS_GO + (skill(p) === 'sheep' ? TUNE.sheepBonus : 0);
      this.cash(p, bonus);
      this.fx({k: 'go', pid: p.pid, v: bonus});
      this.log(`${p.name} 经过起点，领 ${bonus} 元`);
    }
    // 远路（卡片送你去很远的地方）走快一点，整段不超过三秒左右
    const step = path.length > 12 ? Math.max(70, Math.round(STEP_MS * 12 / path.length)) : STEP_MS;
    S.anim = {id: ++S.animSeq, pid: p.pid, from: p.pos, path, ms: step};
    if (path.length) p.pos = path[path.length - 1];
    S.step = 'moving';
    this.commit();
    const ep = this.epoch;
    this.wait(this.ms(path.length * step + LAND_PAD), () => { if (ep === this.epoch && S.step === 'moving') this.land(p); });
  }
  goJail(p){
    const S = this.S;
    S.anim = {id: ++S.animSeq, pid: p.pid, from: p.pos, path: [JAIL], jump: true};
    p.pos = JAIL;
    p.jail = 1;
    S.again = false;
    S.dbl = 0;
    this.fx({k: 'jail', pid: p.pid});
  }
  land(p){
    const S = this.S, i = p.pos, s = SQ[i];
    if (s.t === 'prop' || s.t === 'station'){
      const o = S.own[i];
      if (o === -1){
        if (p.cash >= this.price(p, i)){ S.step = 'buy'; S.offer = i; return this.commit(); }
        this.log(`${p.name} 走到${s.n}，可是钱不够买`);
      } else if (o !== S.turn && !S.players[o].out){
        this.pay(p, S.players[o], this.rentFor(p, i), `${s.n}的过路费`);
      } else if (o === S.turn && s.t === 'prop'){
        S.landSq = i;
      }
    } else if (s.t === 'tax'){
      this.pay(p, null, s.amt, s.n);
    } else if (s.t === 'chance' || s.t === 'fate'){
      return this.draw(p, s.t);
    } else if (s.t === 'gojail'){
      this.log(`${p.name} 走到「进监狱」，被关进去了`);
      this.goJail(p);
      S.step = 'moving';
      this.commit();
      const ep = this.epoch;
      return this.wait(this.ms(TELEPORT_MS), () => { if (ep === this.epoch) this.after(p); });
    } else if (s.t === 'shop' || s.t === 'bank' || s.t === 'stock'){
      this.log(`${s.n}下一版开张，今天先路过`);
    }
    this.after(p);
  }
  after(p){
    if (p.out) return this.endTurn();
    this.S.step = 'manage';
    this.commit();
  }
  draw(p, deck){
    const S = this.S, list = deck === 'chance' ? CHANCE : FATE;
    const c = list[S.decks[deck][S.deckPos[deck]++ % list.length]];
    S.card = {deck, text: c.text, id: S.rollId * 10 + S.deckPos[deck]};
    S.cardPending = {deck, k: list.indexOf(c)};
    this.fx({k: 'card', pid: p.pid, deck, text: c.text});
    this.log(`${p.name} 抽到${deck === 'chance' ? '机会' : '命运'}：${c.text}`);
    // 先让大家看一眼卡片再生效
    S.step = 'moving';
    this.commit();
    const ep = this.epoch;
    this.wait(this.ms(1500), () => { if (ep === this.epoch) this.applyCard(p, c); });
  }
  applyCard(p, c){
    const S = this.S;
    S.cardPending = null;
    switch (c.k){
      case 'to': return this.moveTo(p, c.pos);
      case 'station': return this.moveTo(p, STATIONS.find(k => k > p.pos) ?? STATIONS[0]);
      case 'back': return this.move(p, -c.n);
      case 'jail':
        this.goJail(p);
        S.step = 'moving';
        this.commit();
        { const ep = this.epoch; return this.wait(this.ms(TELEPORT_MS), () => { if (ep === this.epoch) this.after(p); }); }
      case 'card': p.cards++; break;
      case 'money': if (c.v > 0) this.cash(p, c.v); else this.pay(p, null, -c.v, '卡片'); break;
      case 'each':
        for (const q of S.players){
          if (q === p || q.out) continue;
          if (c.v < 0) this.pay(p, q, -c.v, '卡片'); else this.pay(q, p, c.v, '卡片');
          if (p.out) break;
        }
        break;
      case 'repair': {
        const k = S.turn;
        let fee = 0;
        S.own.forEach((o, i) => { if (o === k) fee += S.lvl[i] === 5 ? 100 : S.lvl[i] * 25; });
        if (fee) this.pay(p, null, fee, '房屋维修'); else this.log(`${p.name} 没有房子，不用修`);
        break;
      }
    }
    this.after(p);
  }
  // 付钱：不够先半价卖房子，再半价把城市卖回银行；还不够就破产，欠的那部分对方收不到
  pay(from, to, amt, why){
    const S = this.S;
    this.cash(from, -amt);
    if (to) this.cash(to, amt);
    this.fx({k: 'pay', pid: from.pid, to: to ? to.pid : null, v: amt, why: why || ''});
    if (why) this.log(`${from.name} 付给${to ? to.name : '银行'} ${amt} 元（${why}）`);
    if (from.cash >= 0) return;
    const k = this.idx(from);
    const mine = S.own.map((o, i) => (o === k ? i : -1)).filter(i => i >= 0);
    let raised = 0;
    for (const i of mine.slice().sort((a, b) => S.lvl[b] - S.lvl[a])){
      while (S.lvl[i] > 0 && from.cash + raised < 0){ S.lvl[i]--; raised += SQ[i].hc / 2; }
    }
    for (const i of mine.slice().sort((a, b) => SQ[a].p - SQ[b].p)){
      if (from.cash + raised >= 0) break;
      if (S.lvl[i]) continue;
      S.own[i] = -1;
      raised += SQ[i].p / 2;
    }
    this.cash(from, raised);
    if (from.cash >= 0){ this.log(`${from.name} 钱不够，卖掉房产凑了出来`); return; }
    if (to) this.cash(to, from.cash);
    from.cash = 0;
    from.out = true;
    from.outAt = ++S.outCount;
    S.own.forEach((o, i) => { if (o === k){ S.own[i] = -1; S.lvl[i] = 0; } });
    this.fx({k: 'bust', pid: from.pid});
    this.log(`${from.name} 破产出局了`);
    if (S.players.filter(q => !q.out).length <= 1) S.endNow = true;
  }
  endTurn(){
    const S = this.S;
    S.card = null;
    S.offer = -1;
    S.again = false;
    S.dbl = 0;
    S.landSq = -1;
    if (S.endNow || S.players.filter(q => !q.out).length <= 1) return this.over();
    let t = S.turn;
    do t = (t + 1) % S.players.length; while (S.players[t].out);
    if (t <= S.turn){
      S.round++;
      if (S.maxRounds && S.round > S.maxRounds) return this.over();
    }
    S.turn = t;
    S.step = 'roll';
    S.freeBuilt = false;
    this.commit();
  }
  over(){
    const S = this.S;
    S.phase = 'over';
    S.step = 'over';
    S.rank = S.players.map(p => ({pid: p.pid, name: p.name, ch: p.ch, ai: p.ai, out: p.out, outAt: p.outAt || 0, worth: p.out ? 0 : this.worth(p)}))
      .sort((a, b) => (a.out - b.out) || (b.worth - a.worth) || (b.outAt - a.outAt));
    this.log(`游戏结束，${S.rank[0].name} 赢了`);
    this.commit();
  }
  // 房主刷新页面后接着跑
  resume(){
    const S = this.S;
    if (!S || S.phase !== 'play') return;
    const p = this.cur, ep = ++this.epoch;
    if (S.step === 'rolling') this.wait(400, () => { if (ep === this.epoch) this.afterRoll(p, S.dice[0], S.dice[1]); });
    else if (S.step === 'moving') this.wait(400, () => {
      if (ep !== this.epoch) return;
      if (S.cardPending) this.applyCard(p, (S.cardPending.deck === 'chance' ? CHANCE : FATE)[S.cardPending.k]);
      else this.land(p);
    });
  }

  /* ---------- 电脑玩家（也替掉线的人代打） ---------- */
  bestBuild(p){
    const S = this.S, k = this.idx(p);
    let best = -1, bestGain = 0;
    S.own.forEach((o, i) => {
      if (o !== k || SQ[i].t !== 'prop' || !this.canBuild(p, i) || p.cash - this.houseCost(p, i) < TUNE.botReserve) return;
      const l = S.lvl[i], gain = (SQ[i].r[l + 1] - (l ? SQ[i].r[l] : SQ[i].r[0])) / this.houseCost(p, i) * (this.ownsGroup(k, SQ[i].g) ? 1.3 : 1);
      if (gain > bestGain){ bestGain = gain; best = i; }
    });
    return best;
  }
  // 兔子：比较掷一颗和两颗时，平均要交多少过路费
  rabbitPick(p){
    const S = this.S, k = this.idx(p);
    const risk = d => { const i = (p.pos + d) % N, o = S.own[i]; return o >= 0 && o !== k && !S.players[o].out ? this.rentFor(p, i) : 0; };
    let one = 0, two = 0;
    for (let a = 1; a <= 6; a++){ one += risk(a) / 6; for (let b = 1; b <= 6; b++) two += risk(a + b) / 36; }
    return one + 20 < two;
  }
  botMove(p){
    const S = this.S;
    if (S.phase !== 'play' || this.cur !== p || !['roll', 'buy', 'manage'].includes(S.step)) return;
    if (S.step === 'buy'){
      const s = SQ[S.offer], k = S.turn, cost = this.price(p, S.offer);
      const completes = s.t === 'prop' && GROUP_SQ[s.g].every(i => i === S.offer || S.own[i] === k);
      return this.play(p, {type: p.cash - cost >= (completes ? 60 : TUNE.botBuyKeep) ? 'buy' : 'skip'});
    }
    const b = this.bestBuild(p);
    if (b >= 0) return this.play(p, {type: 'build', sq: b});
    if (S.step === 'roll'){
      if (p.jail && p.cards) return this.play(p, {type: 'useCard'});
      if (p.jail && p.cash >= 400 && S.round < 12) return this.play(p, {type: 'payJail'});
      return this.play(p, {type: 'roll', one: skill(p) === 'rabbit' && !p.jail && this.rabbitPick(p)});
    }
    if (S.step === 'manage') return this.play(p, {type: S.again && !p.jail ? 'roll' : 'end'});
  }
  scheduleBots(){
    const S = this.S;
    if (!S || S.phase !== 'play' || !['roll', 'buy', 'manage'].includes(S.step)) return;
    const p = this.cur;
    if (!p || !(p.ai || p.auto)) return;
    const tok = ++this.botTok, ep = this.epoch;
    // 电脑掷骰子前想一下，落地以后停久一点，让人看清发生了什么
    const delay = S.step === 'manage' ? 1800 : S.step === 'buy' ? 1400 : 1000;
    this.wait(this.ms(p.ai ? delay : delay + 400), () => { if (tok === this.botTok && ep === this.epoch && this.cur === p) this.botMove(p); });
  }
}
