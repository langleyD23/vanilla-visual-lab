/* V7 · 代码立面展开成项目图纸。装饰层不接收输入，路由不依赖动画完成。 */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {};
  var source = null, entry = null, active = null;
  var ease = 'cubic-bezier(.22,.74,.16,1)';
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function geometry(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
    return { x: r.left, y: r.top, w: r.width, h: r.height, font: parseFloat(getComputedStyle(el).fontSize) };
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#/project/"], [data-go], #detailBack');
    if (!link) return;
    var host = link.closest('.proj-index-item, .collection-card, .city-info-panel');
    var heading = host && host.querySelector('.proj-index-title, h4, .city-info-title');
    if (link.hasAttribute('data-go') || link.id === 'detailBack') heading = document.getElementById('detailTitle');
    var r = link.getBoundingClientRect();
    source = { x: e.detail ? e.clientX : r.left + r.width / 2, y: e.detail ? e.clientY : r.top + r.height / 2,
      title: geometry(heading || link), at: performance.now() };
  }, true);
  function cancel(apply) {
    if (!active) return;
    var a = active; active = null;
    a.timers.forEach(clearTimeout);
    a.animations.forEach(function (animation) { animation.cancel(); });
    a.layer.remove();
    document.documentElement.classList.remove('folio-running');
    if (apply && !a.applied) a.action();
  }
  FX.finishTransition = function () { cancel(true); };
  FX.transition = function (action, options) {
    cancel(false);
    options = options || {};
    var mode = options.mode || 'open', p = options.project || {};
    if (FX.reduced || !Element.prototype.animate) { action(); return; }
    // 本地逐帧验收用慢放参数；正常网址保持 920 / 460 / 320 ms。
    var reviewRate = new URLSearchParams(location.search).get('motion-review') === 'slow' ? 8 : 1;
    var mobile = innerWidth <= 650, duration = (mode === 'open' ? 920 : mode === 'close' ? 460 : 320) * reviewRate;
    var o = source && performance.now() - source.at < 1200 ? source : { x: innerWidth / 2, y: innerHeight / 2, title: null };
    o = Object.assign({}, o, {x:Math.max(24,Math.min(innerWidth-24,o.x)),y:Math.max(64,Math.min(innerHeight-32,o.y))});
    if (mode === 'open') entry = o;
    var destination = mode === 'close' && entry ? entry : o;
    var layer = document.createElement('div');
    layer.className = 'folio-transition folio-' + mode;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.setProperty('--cut-x', o.x + 'px'); layer.style.setProperty('--cut-y', o.y + 'px');
    var words = (p.stack || []).concat(p.keywords || []).slice(0, 9);
    layer.innerHTML = '<div class="folio-shade"></div><div class="folio-cut"></div><div class="folio-planes">' + [0,1,2].map(function (i) {
      return '<div class="folio-plane" style="--plane:' + i + '"><div class="folio-plane-code">' +
        '<span class="folio-plane-index">' + esc(p.no) + ' / 0' + (i + 1) + '</span><pre>' +
        words.map(function (word, n) { return '<span><b>' + String(n + 1).padStart(2, '0') + '</b> ' + esc(word) + ' <i>' + (n % 2 ? '→' : '{ }') + '</i></span>'; }).join('') +
        '</pre></div><div class="folio-plane-grid"></div><span class="folio-plane-rule"></span></div>';
    }).join('') + '</div><div class="folio-title">' + esc(p.title) + '</div>';
    document.body.appendChild(layer); document.documentElement.classList.add('folio-running');
    var a = active = { layer: layer, timers: [], animations: [], action: action, applied: false };
    function animate(el, frames, timing) {
      // 覆盖阶段必须按真实时间到达，避免整段 easing 提前揭开尚未切换的内容。
      var anim = el.animate(frames, Object.assign({ duration: duration, easing: 'linear', fill: 'both' }, timing || {}));
      a.animations.push(anim); return anim;
    }
    function later(fn, ms) { a.timers.push(setTimeout(function () { if (active === a) fn(); }, ms)); }
    var title = layer.querySelector('.folio-title');
    var start = mode === 'open' ? o.title : geometry(document.getElementById('detailTitle'));
    start = start || { x: Math.max(24, o.x - 100), y: Math.max(80, o.y - 25), font: 24 };
    start = Object.assign({},start,{x:Math.max(20,Math.min(innerWidth-60,start.x)),y:Math.max(64,Math.min(innerHeight-50,start.y))});
    title.style.left = start.x + 'px'; title.style.top = start.y + 'px'; title.style.fontSize = start.font + 'px';
    title.style.maxWidth = Math.max(0, innerWidth - start.x - 20) + 'px';
    var planes = layer.querySelectorAll('.folio-plane');
    if (mode === 'swap') {
      title.style.display = 'none';
      animate(layer, [{opacity:0, transform:'translateX(4%)'}, {opacity:1, transform:'none', offset:.42}, {opacity:0, transform:'translateX(-4%)'}]);
      later(function () { a.applied = true; action(); }, 135 * reviewRate);
    } else {
      animate(layer.querySelector('.folio-shade'), mode === 'open' ? [{opacity:0},{opacity:.45,offset:.35},{opacity:0,offset:1}] : [{opacity:0},{opacity:0}]);
      animate(layer.querySelector('.folio-cut'), [{transform:'scaleY(0)',opacity:0},{transform:'scaleY(1)',opacity:1,offset:.2},{transform:'scaleY(1)',opacity:0,offset:.65},{opacity:0}]);
      Array.prototype.forEach.call(planes, function (plane, i) {
        var cx = mobile ? innerWidth / 2 : (i + .5) * innerWidth / 3;
        var cy = mobile ? (i + .5) * innerHeight / 3 : innerHeight / 2;
        var collapsed = 'translate(' + (destination.x - cx) + 'px,' + (destination.y - cy) + 'px) scale(' + (mobile ? '.74,.14' : '.14,.44') + ') rotateY(' + (mobile ? '0' : '-52') + 'deg) rotateZ(' + (mobile ? '-3' : '-14') + 'deg)';
        var lifted = 'translate(' + ((i - 1) * (mobile ? 0 : 46)) + 'px,' + ((i - 1) * (mobile ? 28 : -20)) + 'px) scale(.86) rotateY(' + (mobile ? '0' : '-24') + 'deg) rotateZ(' + (mobile ? '0' : '-8') + 'deg)';
        animate(plane, mode === 'open' ? [
          {transform:collapsed,opacity:0,background:'#101820'},
          {transform:collapsed,opacity:1,background:'#101820',offset:.13,easing:ease},
          {transform:lifted,opacity:1,background:'#101820',offset:.36,easing:ease},
          {transform:'none',opacity:1,background:'#101c26',offset:.51},
          {transform:'none',opacity:1,background:'#101c26',offset:.68,easing:ease},
          {transform:'translateY(-10px)',opacity:0,background:'#101c26'}
        ] : [
          {transform:'none',opacity:1,background:'#101c26'},
          {transform:lifted,opacity:1,background:'#101820',offset:.48},
          {transform:collapsed,opacity:0,background:'#101820'}
        ]);
        animate(plane.querySelector('.folio-plane-code'), mode === 'open' ? [{opacity:.75},{opacity:.7,offset:.32},{opacity:0,offset:.52},{opacity:0}] : [{opacity:0},{opacity:.65,offset:.55},{opacity:0}]);
        animate(plane.querySelector('.folio-plane-grid'), mode === 'open' ? [{opacity:0},{opacity:0,offset:.28},{opacity:.65,offset:.52},{opacity:.65,offset:.68},{opacity:0}] : [{opacity:.5},{opacity:0}]);
      });
      var mid = { x: mobile ? 24 : Math.max(48, (innerWidth - 1060) / 2), y: Math.min(innerHeight * .28, 220), font: mobile ? 36 : 64 };
      var firstDuration = (mode === 'open' ? 470 : 180) * reviewRate;
      animate(title, [{left:start.x+'px',top:start.y+'px',fontSize:start.font+'px',color:mode==='open'?'#dfa66a':'#edf5f7',opacity:1},
        {left:mid.x+'px',top:mid.y+'px',fontSize:mid.font+'px',color:mode==='open'?'#edf5f7':'#dfa66a',opacity:1}], {duration:firstDuration,easing:ease});
      later(function () {
        a.applied = true; action();
        var end = mode === 'open' ? geometry(document.getElementById('detailTitle')) : destination.title;
        end = end || {x:destination.x - 80,y:destination.y - 20,font:20};
        title.style.maxWidth = Math.max(0, innerWidth - end.x - 20) + 'px';
        animate(title, [{left:mid.x+'px',top:mid.y+'px',fontSize:mid.font+'px',color:mode==='open'?'#edf5f7':'#dfa66a',opacity:1},
          {left:end.x+'px',top:end.y+'px',fontSize:end.font+'px',color:mode==='open'?'#edf5f7':'#dfa66a',opacity:mode==='open'?1:0}], {duration:duration-firstDuration,easing:ease});
      }, firstDuration);
    }
    later(function () { cancel(false); }, duration);
  };
})();

