// 联机：借咩了个咩那个 Supabase 项目的实时频道，房主说了算，别人只发操作过去
// publishable key 本来就是给网页公开用的；不建表，只在频道里广播
export const SB = {url: 'https://ghjrmmqnajguwkfoplgo.supabase.co', key: 'sb_publishable_1YWUN4fZ3c_TjQD9p6Lmlg_K-vDB6y_'};

export function createNet({me, name, onState, onIntent, onHello, onPresence, onFail}){
  let client = null, ch = null;
  const net = {ok: false, online: new Set()};
  net.start = (code, isHost) => {
    net.stop();
    if (!window.supabase){ onFail('联机服务没加载上，检查一下网络。'); return; }
    try { client = client || window.supabase.createClient(SB.url, SB.key); } catch (e){ onFail('连不上联机服务。'); return; }
    const c = client.channel('tycoon2-' + code, {config: {broadcast: {self: false}, presence: {key: me}}});
    ch = c;
    c.on('broadcast', {event: 'state'}, ({payload}) => { if (c === ch && !isHost()) onState(payload); });
    c.on('broadcast', {event: 'intent'}, ({payload}) => { if (c === ch && isHost() && payload && payload.a) onIntent(payload.pid, payload.a); });
    c.on('broadcast', {event: 'hello'}, ({payload}) => { if (c === ch && isHost() && payload) onHello(payload); });
    c.on('presence', {event: 'sync'}, () => { if (c !== ch) return; net.online = new Set(Object.keys(c.presenceState())); onPresence(); });
    c.subscribe(async status => {
      if (c !== ch) return;
      if (status === 'SUBSCRIBED'){
        net.ok = true;
        try { await c.track({name: name()}); } catch (e) {}
        if (!isHost()) net.send('hello', {pid: me, name: name()});
        onPresence();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
        net.ok = false;
        onFail('网络不太好，连不上房间。');
      }
    });
  };
  net.stop = () => {
    if (ch && client){ try { client.removeChannel(ch); } catch (e) {} }
    ch = null;
    net.ok = false;
    net.online = new Set();
  };
  net.send = (event, payload) => { if (ch && net.ok) ch.send({type: 'broadcast', event, payload}).catch(() => {}); };
  net.hello = () => net.send('hello', {pid: me, name: name()});
  return net;
}
