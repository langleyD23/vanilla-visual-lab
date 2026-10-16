/* 专属结构图：为示例项目 project-a / project-b 各提供一张机制示意图，其余项目回退到通用四步流程。 */
(function () {
  'use strict';
  var FX = window.FX, cleanup = null;
  var NS = 'http://www.w3.org/2000/svg';
  function node(id, classes, no, title, description, code, extra) {
    return '<div class="network-node ' + classes + '" data-network-node="' + id + '"><span class="case-step-no">' + no + '</span>' +
      '<h3>' + title + '</h3><p>' + description + '</p><code class="network-code">' + code + '</code>' + (extra || '') + '</div>';
  }
  FX.projectDiagramHTML = function (p) {
    if (p.id === 'project-a') return '<div class="case-diagram case-network" data-blueprint="project-a">' +
      '<div class="case-diagram-label"><span>双边确认 / 一条可信记录</span><span>01 — RECONCILE</span></div>' +
      '<div class="network-grid network-confirm"><svg class="network-links" aria-hidden="true"></svg>' +
      node('a','network-source-a','01 / A','一方提交','提交结果与实际规则','RESULT / RULES') +
      node('b','network-source-b','01 / B','另一方提交','独立核对并提交意见','RESULT / RULES') +
      node('compare','network-compare','02 / CHECK','双向核对','获胜者、规则<br>与违规项','RECONCILE') +
      node('settle','network-settle','03 / COMMIT','一致后结算','事务内更新与记账','TRANSACTION', '<div class="network-archive"><span>04</span>归档结果与流水</div>') +
      node('dispute','network-dispute','BRANCH / HOLD','不一致 → 争议','协商、撤回或重新提交','NO SETTLEMENT') +
      '</div><div class="network-foot"><span>两条输入 · 一次核对 · 明确终态</span><span>一致才结算，争议期间暂不记账。</span></div></div>';
    if (p.id === 'project-b') return '<div class="case-diagram case-network" data-blueprint="project-b">' +
      '<div class="case-diagram-label"><span>记忆更新 / 来源与版本</span><span>02 — REVISION</span></div>' +
      '<div class="network-grid network-memory"><svg class="network-links" aria-hidden="true"></svg>' +
      node('old','memory-old','EARLIER / 候选','较早的抽取','来自旧对话<br>或旧记录版本','EARLIER SOURCE') +
      node('new','memory-new','LATEST / 修正','用户的新修正','保留来源证据<br>更新有效记录','USER CORRECTION') +
      node('gate','memory-gate','CHECK / 更新校验','版本门','检查来源顺序<br>核对记录版本','SOURCE / VERSION') +
      node('current','memory-current','CURRENT / 有效记录','保留较新的信息','旧来源或过期版本不能覆盖它；后续按当前问题召回。','MEMORY / CONTEXT','<span class="memory-status">可查看 · 可修正 · 可暂停</span>') +
      '</div><div class="network-foot"><span>保留来源，尊重修正。</span><span>修正生效，旧候选止步于版本门。</span></div></div>';
    return '';
  };
  FX.clearProjectBlueprint = function () { if (cleanup) cleanup(); cleanup = null; };
  FX.initProjectBlueprint = function (root) {
    FX.clearProjectBlueprint();
    var diagram = root.querySelector('[data-blueprint]');
    if (!diagram) {
      var flow = root.querySelector('.case-flow');
      if (!flow) return;
      var timers = [], flowObserver, hasPlayed = false;
      function trace() {
        if (hasPlayed || FX.reduced) return;
        hasPlayed = true;
        Array.prototype.forEach.call(flow.children, function(step,i){
          timers.push(setTimeout(function(){ if(step.isConnected && !FX.reduced)step.classList.add('is-tracing'); },i*350));
          timers.push(setTimeout(function(){ step.classList.remove('is-tracing'); },i*350+700));
        });
      }
      if ('IntersectionObserver' in window) {
        flowObserver = new IntersectionObserver(function(entries){if(entries.some(function(e){return e.isIntersecting;})){trace();flowObserver.disconnect();}}, {root:root,threshold:.3});
        flowObserver.observe(flow);
      } else trace();
      cleanup = function(){timers.forEach(clearTimeout);if(flowObserver)flowObserver.disconnect();};
      return;
    }
    var grid = diagram.querySelector('.network-grid'), svg = grid.querySelector('svg');
    var memory = diagram.dataset.blueprint === 'project-b';
    var edges = memory ? [['old','gate','stopped'],['new','gate','main'],['gate','current','main']] :
      [['a','compare','main'],['b','compare','main'],['compare','settle','main'],['compare','dispute','alternate']];
    var nodes = {}, paths = [], raf = 0, observer, resize, played = false, disposed = false;
    grid.querySelectorAll('[data-network-node]').forEach(function (el,i) { nodes[el.dataset.networkNode] = el; el.style.setProperty('--node-delay', i * 55 + 'ms'); });
    function element(name, attributes) {
      var el = document.createElementNS(NS,name);
      Object.keys(attributes).forEach(function (key) { el.setAttribute(key, attributes[key]); }); svg.appendChild(el); return el;
    }
    function draw() {
      if (disposed || !grid.isConnected) return;
      svg.innerHTML = ''; paths = [];
      var rect = grid.getBoundingClientRect(), vertical = innerWidth <= 650;
      if (rect.width < 1 || rect.height < 1) return;
      svg.setAttribute('viewBox','0 0 ' + rect.width + ' ' + rect.height);
      edges.forEach(function (edge) {
        var f = nodes[edge[0]].getBoundingClientRect(), t = nodes[edge[1]].getBoundingClientRect();
        var x1 = (vertical ? f.left+f.width/2 : f.right)-rect.left;
        var y1 = (vertical ? f.bottom : f.top+f.height/2)-rect.top;
        var x2 = (vertical ? t.left+t.width/2 : t.left)-rect.left;
        var y2 = (vertical ? t.top : t.top+t.height/2)-rect.top;
        if (edge[2] === 'stopped') { if (vertical) y2 -= 12; else x2 -= 12; }
        var bend = vertical ? Math.max(15,(y2-y1)/2) : Math.max(15,(x2-x1)/2);
        var d = vertical ? 'M'+x1+','+y1+' C'+x1+','+(y1+bend)+' '+x2+','+(y2-bend)+' '+x2+','+y2 :
          'M'+x1+','+y1+' C'+(x1+bend)+','+y1+' '+(x2-bend)+','+y2+' '+x2+','+y2;
        var path = element('path',{d:d,class:'edge-'+edge[2]});
        paths.push({path:path,kind:edge[2]});
        if (edge[2] === 'stopped') {
          element('path',{d:'M'+(x2-4)+','+(y2-4)+' l8,8 M'+(x2+4)+','+(y2-4)+' l-8,8',class:'edge-stop'});
        } else {
          element('path',{d: vertical ? 'M'+(x2-3)+','+(y2-5)+' L'+x2+','+y2+' L'+(x2+3)+','+(y2-5) :
            'M'+(x2-5)+','+(y2-3)+' L'+x2+','+y2+' L'+(x2-5)+','+(y2+3),class:'edge-arrow'});
        }
      });
    }
    function play() {
      if (played || disposed) return; played = true;
      if (FX.reduced) return;
      diagram.classList.add('is-playing');
      var moving = paths.filter(function (item) { return item.kind === 'main'; }).map(function (item,i) {
        return {path:item.path, length:item.path.getTotalLength(), dot:element('circle',{r:2.6}), delay:i*190};
      });
      var started = performance.now();
      function frame(now) {
        if (disposed || !diagram.isConnected || FX.reduced) { moving.forEach(function(item){ item.dot.remove(); }); return; }
        var finished = true;
        moving.forEach(function (item) {
          var k = Math.max(0,Math.min(1,(now-started-item.delay)/620));
          var pt = item.path.getPointAtLength(k*item.length);
          item.dot.setAttribute('cx',pt.x); item.dot.setAttribute('cy',pt.y);
          item.dot.setAttribute('opacity', k>0 && k<1 ? 1 : 0);
          if (k<1) finished=false;
        });
        if (!finished) raf=requestAnimationFrame(frame);
        else { moving.forEach(function(item){item.dot.remove();}); diagram.classList.remove('is-playing'); }
      }
      raf=requestAnimationFrame(frame);
    }
    draw();
    if ('ResizeObserver' in window) { resize=new ResizeObserver(draw); resize.observe(grid); }
    else window.addEventListener('resize',draw);
    if ('IntersectionObserver' in window) {
      observer=new IntersectionObserver(function(entries){ if(entries.some(function(e){return e.isIntersecting;})) { play(); observer.disconnect(); } },{root:root,threshold:.25});
      observer.observe(diagram);
    } else play();
    cleanup=function(){ disposed=true; cancelAnimationFrame(raf); if(observer)observer.disconnect(); if(resize)resize.disconnect(); else window.removeEventListener('resize',draw); };
  };
})();
