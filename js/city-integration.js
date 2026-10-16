/* 项目状态与图形解耦；悬停、选择、摘要及路线共享一个有效项目。 */
(function () {
  'use strict';
  var FX = window.FX = window.FX || {}, city = null;
  var state = { selected: null, hover: null, playback: 'idle', reduced: false };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function project(id) { return (SITE_CONTENT.projects.entries || SITE_CONTENT.projects.items).filter(function(p){return p.id === id;})[0]; }
  function effective() { return state.hover || state.selected; }
  function status(mode, progress) {
    state.playback = mode;
    var el = document.getElementById('cityStatus'), pause = document.getElementById('cityPauseBtn');
    var text = mode === 'building' ? (progress < .32 ? '代码汇聚' : progress < .78 ? '结构成形' : '作品落地') : mode === 'paused' ? '已暂停' : mode === 'complete' ? '已落成' : mode === 'fallback' ? '项目阅读' : '待构建';
    if (el && el.textContent !== text) el.textContent = text;
    if (pause) { pause.disabled = mode !== 'building' && mode !== 'paused'; pause.textContent = mode === 'paused' ? '继续' : '暂停'; pause.setAttribute('aria-pressed',String(mode === 'paused')); }
  }
  function sync() {
    var id = effective(), p = project(id);
    document.querySelectorAll('.proj-index-item').forEach(function(item){
      var selected = item.dataset.projectId === state.selected;
      item.classList.toggle('is-active',selected);
      item.classList.toggle('is-preview',item.dataset.projectId === id);
      item.querySelector('.proj-index-select').setAttribute('aria-pressed',String(selected));
    });
    document.querySelectorAll('.city-pin').forEach(function(pin){pin.classList.toggle('is-active',pin.dataset.projectId === id);pin.setAttribute('aria-pressed',String(pin.dataset.projectId === state.selected));});
    var panel = document.getElementById('cityInfoPanel');
    if (p && panel.dataset.projectId !== id) {
      panel.dataset.projectId = id;
      var heading = '<div class="city-info-top"><div><p class="city-info-kicker">' + esc(p.no) + ' / ' + esc(p.type) + (p.period ? ' / ' + esc(p.period) : '') + '</p><h3 class="city-info-title">' + esc(p.title) + '</h3></div>';
      if (p.collection) {
        panel.innerHTML = heading + '<span class="collection-count">04 / WORKS</span></div><p class="collection-intro">' + esc(p.summary) + '</p><div class="collection-grid">' +
          p.collection.map(function(projectId) {
            var item = SITE_CONTENT.projects.items.filter(function(value){return value.id === projectId;})[0];
            if (!item) return '';
            return '<a class="collection-card" href="#/project/' + esc(item.id) + '"><img class="collection-cover" src="'+esc(item.screenshot)+'" width="1800" height="1125" loading="lazy" alt="'+esc(item.title)+'脱敏业务界面"><span class="collection-card-top"><span>' + esc(item.type) + '</span><span aria-hidden="true">↗</span></span><h4>' + esc(item.title) + '</h4><p>' + esc(item.subtitle) + '</p></a>';
          }).join('') + '</div>';
      } else {
        panel.innerHTML = heading + '<a class="city-info-open" href="#/project/' + esc(p.id) + '">走进项目 <span aria-hidden="true">↗</span></a></div>' +
          '<a class="personal-cover" href="#/project/'+esc(p.id)+'" aria-label="查看'+esc(p.title)+'"><img src="'+esc(p.screenshot)+'" width="1800" height="1125" loading="lazy" alt="'+esc(p.title)+'脱敏业务界面"></a><p class="personal-summary">'+esc(p.summary)+'</p><div class="city-info-stack">' + p.stack.slice(0,6).map(function(s){return '<span>' + esc(s) + '</span>';}).join('') + '</div>';
      }
    }
    if (city) { city.setSelectedProject(state.selected); city.setHoverProject(state.hover); }
  }
  FX.setCityProject = function(id, hover) {
    if (id && !project(id)) return;
    if (hover) state.hover=id; else {state.selected=id;state.hover=null;}
    sync();
  };
  function fallback() {
    document.querySelector('.city-fallback').classList.add('active');
    document.getElementById('cityCanvas').style.display='none';
    document.getElementById('cityPins').hidden=true;
    document.getElementById('cityReplayBtn').disabled=true;
    status('fallback');
  }
  FX.initCodeCity = function(o) {
    var pins = document.getElementById('cityPins');
    pins.innerHTML = o.projects.map(function(p){return '<button type="button" class="city-pin" data-project-id="' + esc(p.id) + '" aria-pressed="false" aria-label="选择' + esc(p.title) + '" hidden>' + esc(p.no) + '</button>';}).join('');
    pins.addEventListener('click',function(e){var pin=e.target.closest('.city-pin');if(pin)FX.setCityProject(pin.dataset.projectId,false);});
    pins.addEventListener('focusin',function(e){var pin=e.target.closest('.city-pin');if(pin)FX.setCityProject(pin.dataset.projectId,true);});
    pins.addEventListener('focusout',function(){FX.setCityProject(null,true);});
    if (!window.THREE || !window.CodeCity) {fallback();return null;}
    try {
      city = new CodeCity(document.getElementById('cityCanvas'),{
        projects:o.projects,quality:innerWidth<=820?'low':'medium',
        onState:status,onBuildComplete:function(){status('complete',1);},onError:fallback,
        onHover:function(id){FX.setCityProject(id,true);},onSelect:function(id){FX.setCityProject(id,false);},
        onProjectPositions:function(positions){positions.forEach(function(p){var el=pins.querySelector('[data-project-id="'+p.id+'"]');if(!el)return;el.hidden=!p.visible;el.style.transform='translate('+p.x.toFixed(1)+'px,'+p.y.toFixed(1)+'px) translate(-50%,-100%)';});}
      });
      if(!city.ready){city.destroy();city=null;fallback();return null;}
      sync();return city;
    }catch(e){if(city)city.destroy();city=null;console.warn('城市使用静态阅读模式',e);fallback();return null;}
  };
  FX.buildCity=function(replay){if(city)city.buildCity(replay?8:3.2);};
  FX.pauseCity=function(){if(city)city.setPaused(state.playback!=='paused');};
  FX.setCityReduced=function(v){state.reduced=v;if(city)city.setReduced(v);};
  FX.suspendCity=function(v){if(city)city.setSuspended(v);};
  FX.destroyCity=function(){if(city)city.destroy();city=null;};
  FX.getCityState=function(){return city?city.getState():null;};
})();
