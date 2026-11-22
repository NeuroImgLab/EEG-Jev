/* Presentation clock and connector geometry only. No data or model computation. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EEGJevReplay = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const complete = (s) => { s.playing = false; s.phase = 'hold'; s.elapsed = 0; delete s.resumeConfirmation; };
  const pause = (s) => { if (s.playing && s.phase === 'hold') s.resumeConfirmation = true; s.playing = false; };
  const replay = (s, reduced = false) => {
    if (reduced) return complete(s);
    s.playing = true; s.phase = 'sweep'; s.elapsed = 0; delete s.resumeConfirmation;
  };
  const play = (s, reduced = false) => {
    if (reduced) return complete(s);
    if (s.phase === 'hold' && !s.resumeConfirmation) replay(s); else s.playing = true;
    delete s.resumeConfirmation;
  };
  const progress = (s, duration) => s.phase === 'hold' ? 1 : Math.min(1, s.elapsed / duration);
  const advance = (s, dt, duration, confirmation) => {
    if (!s.playing || !Number.isFinite(dt) || dt < 0) return null;
    s.elapsed += dt;
    if (s.phase === 'sweep' && s.elapsed + 1e-9 >= duration) {
      s.phase = 'hold'; s.elapsed = 0; return 'answer';
    }
    return s.phase === 'hold' && s.elapsed + 1e-9 >= confirmation ? 'next' : null;
  };
  // A straight segment lies outside both cards, including its rounded-corner box.
  // The padding is a Euclidean CSS-pixel distance, independent of SVG scaling.
  function connector(a, b, pad = 10) {
    const ca = {x:a.left+a.width/2,y:a.top+a.height/2};
    const cb = {x:b.left+b.width/2,y:b.top+b.height/2};
    const d = Math.hypot(cb.x-ca.x,cb.y-ca.y);
    if (!d) return null;
    function outside(c, target, r) {
      const ux=(target.x-c.x)/d,uy=(target.y-c.y)/d;
      const hit=Math.min(ux ? r.width/2/Math.abs(ux) : Infinity,uy ? r.height/2/Math.abs(uy) : Infinity);
      const dist=(t)=>Math.hypot(Math.max(r.left-(c.x+ux*t),0,c.x+ux*t-r.left-r.width),Math.max(r.top-(c.y+uy*t),0,c.y+uy*t-r.top-r.height));
      let lo=hit,hi=hit+pad*2;
      for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(dist(mid)<pad)lo=mid;else hi=mid;}
      return {x:c.x+ux*hi,y:c.y+uy*hi,travel:hi};
    }
    const start=outside(ca,cb,a),end=outside(cb,ca,b);
    return start.travel+end.travel < d ? {start,end} : null;
  }
  return {complete,pause,replay,play,progress,advance,connector};
});
