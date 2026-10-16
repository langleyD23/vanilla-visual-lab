/* Canvas 文字标志；以图形轮廓约束字形，聚合完成后不持续绘制。 */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {}, symbols = [], reduced = false;
  var W = 420, H = 360, chars = '{}[]()=>;:+/01', selected = null;
  function esc(s) { return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function rand(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function Symbol(canvas, tool, index) {
    var ctx = canvas.getContext('2d'), particles = [], mask = null, loaded = false, visible = false, lens = null;
    var frame = 0, last = 0, elapsed = 0, duration = 1.85 + index * .13, active = index === 0, io, done = false;
    var random = rand(4519 + index * 779);
    function resize() {
      var dpr = Math.min(devicePixelRatio || 1, 1.5), width = canvas.clientWidth || 320;
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(width*H/W*dpr);
      if (loaded) draw(done || reduced ? 1 : elapsed/duration);
    }
    function inside(x,y) {
      if (x<0||x>=W||y<0||y>=H) return false;
      return mask[(Math.floor(y)*W+Math.floor(x))*4+3] > 120;
    }
    function prepare(image) {
      var source = document.createElement('canvas');source.width=W;source.height=H;
      var g = source.getContext('2d',{willReadFrequently:true});
      var sourceScale=Math.min(W/image.width,H/image.height);
      g.drawImage(image,(W-image.width*sourceScale)/2,(H-image.height*sourceScale)/2,image.width*sourceScale,image.height*sourceScale);
      var data = g.getImageData(0,0,W,H), pixels = data.data;
      var minX=W,minY=H,maxX=0,maxY=0;
      for(var y=0;y<H;y++)for(var x=0;x<W;x++){
        var i=(y*W+x)*4, a=pixels[i+3];
        var on=tool.id==='gpt' ? a>120&&Math.min(pixels[i],pixels[i+1],pixels[i+2])>225 : a>120;
        pixels[i+3]=on?255:0;
        if(on){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      }
      if(maxX<=minX)throw new Error('Empty symbol silhouette');
      g.putImageData(data,0,0);
      var normalized=document.createElement('canvas');normalized.width=W;normalized.height=H;
      var n=normalized.getContext('2d',{willReadFrequently:true});
      var bw=maxX-minX+1,bh=maxY-minY+1,scale=Math.min(322/bw,292/bh),tw=bw*scale,th=bh*scale;
      n.drawImage(source,minX,minY,bw,bh,(W-tw)/2,(H-th)/2,tw,th);
      mask=n.getImageData(0,0,W,H).data;
      // 先布置可读关键词，其余轮廓用小字符补足，避免文字相互覆盖。
      var occupied=[];
      function reserve(x,y,width,height){occupied.push({x:x-2,y:y-height/2-2,w:width+4,h:height+4});}
      function free(x,y){return !occupied.some(function(r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;});}
      for(var k=0;k<tool.words.length;k++){
        var text=tool.words[k],font=k<3?20:15;
        ctx.font='600 '+font+'px monospace';var width=ctx.measureText(text).width;
        for(var attempt=0;attempt<600;attempt++){
          var px=55+random()*(310-width),py=42+random()*276,fit=true;
          for(var xx=px;xx<px+width;xx+=4)if(!inside(xx,py-font*.28)||!inside(xx,py+font*.28)||!free(xx,py-font*.45)||!free(xx,py+font*.45)){fit=false;break;}
          if(fit){particles.push(point(px,py,text,font,true));reserve(px,py,width,font);break;}
        }
      }
      for(var yy=34;yy<H-24;yy+=9)for(var xx=38;xx<W-30;xx+=6){
        if(inside(xx,yy)&&free(xx,yy))particles.push(point(xx,yy,chars[Math.floor(random()*chars.length)],8.5,false));
      }
      loaded=true;canvas.parentNode.classList.add('is-ready');resize();
      if(reduced){done=true;draw(1);}else if(visible)start();else draw(0);
    }
    function point(x,y,text,font,word){
      var angle=Math.atan2(y-H/2,x-W/2)+(random()-.5)*.35,dist=12+random()*35;
      return {x:x,y:y,sx:x+Math.cos(angle)*dist,sy:y+Math.sin(angle)*dist,text:text,font:font,word:word,delay:random()*.25,alpha:word?1:.68+random()*.3};
    }
    function draw(progress){
      if(!ctx)return;
      ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.textBaseline='middle';ctx.fillStyle=tool.color;
      particles.forEach(function(p){
        var t=Math.max(0,Math.min(1,(progress-p.delay)/(1-p.delay))),ease=1-Math.pow(1-t,3);
        ctx.globalAlpha=p.alpha*(active?1:.84)*Math.min(1,t*4);
        ctx.font=(p.word?'600 ':'400 ')+p.font+'px monospace';
        var x=p.sx+(p.x-p.sx)*ease,y=p.sy+(p.y-p.sy)*ease;
        if(lens&&done&&!reduced){var dx=x-lens.x,dy=y-lens.y,d=Math.hypot(dx,dy),pull=Math.max(0,1-d/74)*7;if(d>1){x+=dx/d*pull;y+=dy/d*pull;}}
        ctx.fillText(p.text,x,y);
      });ctx.globalAlpha=1;
      canvas.dataset.progress=Math.min(1,progress).toFixed(3);canvas.dataset.particles=String(particles.length);
    }
    function tick(now){
      frame=0;if(!visible||document.hidden||reduced||done)return;
      if(now-last>=1000/30){elapsed+=Math.min((now-last)/1000,.07);last=now;draw(elapsed/duration);}
      if(elapsed>=duration){done=true;draw(1);return;}frame=requestAnimationFrame(tick);
    }
    function start(){if(!loaded||frame||done||reduced||!visible||document.hidden)return;last=performance.now();frame=requestAnimationFrame(tick);}
    function stop(){if(frame)cancelAnimationFrame(frame);frame=0;}
    function visibility(){if(document.hidden)stop();else start();}
    var self={setReduced:function(v){lens=null;if(v){stop();if(loaded){done=true;draw(1);}}else start();},pointer:function(x,y){lens=x==null?null:{x:x,y:y};if(loaded&&done&&!reduced)draw(1);},select:function(on){active=on;if(loaded)draw(done||reduced?1:elapsed/duration);},replay:function(){if(!loaded)return;stop();lens=null;elapsed=0;done=reduced;draw(reduced?1:0);start();},destroy:function(){stop();if(io)io.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);}};
    if(!ctx)return self;
    if('IntersectionObserver'in window){io=new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(visible)start();else stop();},{threshold:.15});io.observe(canvas);}else visible=true;
    window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);resize();
    var image=new Image();image.onload=function(){try{prepare(image);}catch(e){console.warn('代码标志保留图形预览',e);}};image.onerror=function(){canvas.parentNode.classList.add('is-unavailable');};image.src=(window.AI_SYMBOL_MASKS||{})[tool.id]||tool.image;
    return self;
  }
  FX.initAISymbols=function(tools){
    var root=document.querySelector('.ai-workbench');if(!root||!tools.length)return;
    symbols.forEach(function(s){s.destroy();});symbols=[];
    tools.forEach(function(tool,i){
      var canvas=root.querySelector('[data-symbol="'+tool.id+'"]'),button=canvas.closest('.ai-tool'),symbol=new Symbol(canvas,tool,i);symbols.push(symbol);
      button.addEventListener('pointermove',function(e){if(e.pointerType==='touch')return;var r=canvas.getBoundingClientRect();symbol.pointer((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height);});
      button.addEventListener('pointerleave',function(){symbol.pointer(null);});
    });
    function select(id,align){
      var tool=tools.filter(function(t){return t.id===id;})[0];if(!tool)return;
      selected=id;root.querySelectorAll('.ai-tool').forEach(function(b,i){var on=b.dataset.aiTool===id;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',String(on));symbols[i].select(on);});
      if(align&&innerWidth<=650)root.querySelector('[data-ai-tool="'+id+'"]').scrollIntoView({block:'nearest',inline:'start',behavior:reduced?'instant':'smooth'});
      document.getElementById('aiToolReading').innerHTML='<div><p class="ai-reading-kicker">'+esc(tool.name)+' / COLLABORATION'+(tool.placeholder?'<span class="badge">示例</span>':'')+'</p><h3>'+esc(tool.title)+'</h3><p class="ai-reading-desc">'+esc(tool.description)+'</p></div><div><p class="ai-reading-flow">'+tool.steps.map(function(s){return '<span>'+esc(s)+'</span>';}).join('<i aria-hidden="true">→</i>')+'</p><p class="ai-reading-note">'+esc(tool.note)+'</p><a class="ai-reading-context" href="#projects">回到作品，查看实现 <span aria-hidden="true">↗</span></a></div>';
    }
    root.addEventListener('click',function(e){if(e.target.closest('[data-ai-replay]')){symbols.forEach(function(s){s.replay();});return;}var b=e.target.closest('.ai-tool');if(b)select(b.dataset.aiTool,true);});
    root.addEventListener('keydown',function(e){var b=e.target.closest('.ai-tool');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();var buttons=Array.from(root.querySelectorAll('.ai-tool')),i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();select(buttons[next].dataset.aiTool,true);});
    select(tools[0].id);
  };
  FX.setAISymbolsReduced=function(v){reduced=v;symbols.forEach(function(s){s.setReduced(v);});var button=document.querySelector('[data-ai-replay]');if(button)button.disabled=v;};
})();
