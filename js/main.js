/* Visual Lab · 渲染与交互。所有文案都来自 content.js，渲染层不写死内容。 */
(function () {
  "use strict";
  var C = window.SITE_CONTENT;
  if (!C) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // 只允许 http(s)/mailto/相对路径，避免 content.js 里误填 javascript: 之类
  function safeHref(u) {
    u = String(u || "");
    return /^(https?:|mailto:|#|\.{0,2}\/|assets\/)/i.test(u) ? u : "#";
  }
  var badge = function (on) { return on ? '<span class="badge">示例</span>' : ""; };
  var projects = C.projects.items;
  var cityEntries = C.projects.entries || projects;
  var byId = {};
  projects.forEach(function (p) { byId[p.id] = p; });

  var state = {
    previewId: projects.length ? projects[0].id : null,
    openedId: null,
    reduced: false,
    lastFocusEl: null,
  };
  var heroField = null, contactField = null, terrain = null;
  var archCleanup = null;

  /* ---------- 渲染 ---------- */
  function renderNav() {
    $("#nav").innerHTML = C.sections.map(function (s) {
      return '<a href="#' + s.id + '" data-sec="' + s.id + '"><span class="no">' + s.no + '</span>' + esc(s.label) + '</a>';
    }).join("");
  }

  function renderHero() {
    var p = C.profile;
    var bt = p.beat || {};
    return '<section class="hero" id="home" aria-labelledby="heroName"><div class="hero-pin">' +
      '<canvas class="hero-canvas" id="heroCanvas" aria-hidden="true"></canvas>' +
      '<div class="hero-inner">' +
        '<div>' +
          '<p class="eyebrow boot" style="--d:0ms"><span class="lmark" aria-hidden="true"></span>' + esc(p.roleEn) + '</p>' +
          '<h1 id="heroName">' + esc(p.name) + '</h1>' +
          (p.identity ? '<p class="hero-identity">' + esc(p.identity) + '</p>' : '') +
          '<p class="hero-sub boot" style="--d:500ms"><span data-type="' + esc(p.headline) + '">' + esc(p.headline) + '</span><span class="hero-sub-en">' + esc(p.headlineEn) + '</span></p>' +
          '<p class="hero-intro boot" style="--d:700ms">' + esc(p.intro) + badge(p.placeholder) + '</p>' +
          '<div class="hero-cta boot" style="--d:850ms">' +
            '<a class="btn btn--primary" href="' + esc(safeHref(p.primaryCta.href)) + '">' + esc(p.primaryCta.label) + '<span class="arrow" aria-hidden="true">→</span></a>' +
            '<a class="btn btn--ghost" href="' + esc(safeHref(p.secondaryCta.href)) + '">' + esc(p.secondaryCta.label) + '<span class="arrow" aria-hidden="true">→</span></a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hero-beat" aria-hidden="true"><p class="beat-k"><span class="lmark"></span>' + esc(bt.k || "") + '</p>' +
        '<span class="beat-l1">' + esc(bt.l1 || "") + '</span><span class="beat-l2">' + esc(bt.l2 || "") + '</span></div>' +
      '<div class="hero-foot"><span class="hero-hint" id="heroHint">' + esc(C.profile.role) + ' · 滚动，文字之海会升起日出</span>' +
      '<a class="scroll-cue" href="#projects"><span>SCROLL</span><i aria-hidden="true"></i></a></div>' +
    '</div></section>';
  }

  function renderMarquee() {
    var seen = {}, ws = [];
    (C.profile.seaWords || []).concat.apply(C.profile.seaWords || [], projects.map(function (p) { return p.keywords; })).forEach(function (w) { if (!seen[w]) { seen[w] = 1; ws.push(w); } });
    var one = ws.map(function (w, i) { return '<span>' + esc(w) + '</span><span class="sep">/</span>'; }).join("");
    var rev = ws.slice().reverse().map(function (w) { return '<span>' + esc(w) + '</span><span class="sep">/</span>'; }).join("");
    return '<div class="marquee" aria-hidden="true"><div class="marq-row">' + one + one + '</div><div class="marq-row">' + rev + rev + '</div></div>';
  }

  function sectionHead(sec, data, lightNo) {
    return '<div class="sec-head reveal"><div class="sec-title"><span class="no">' + sec.no + '</span>' +
      '<div><h2>' + esc(data.title) + '</h2><div class="en">' + esc(sec.en) + '</div></div></div>' +
      '<p class="sec-lead">' + esc(data.lead) + '</p></div>';
  }
  function secOf(id) { return C.sections.filter(function (s) { return s.id === id; })[0]; }

  function renderProjects() {
    var d = C.projects;
    var items = cityEntries.map(function (p) {
      return '<article class="proj-index-item studio-card" data-project-id="' + esc(p.id) + '">' +
        '<div class="studio-card-code" aria-hidden="true">' + esc(p.stack.slice(0, 3).join(' / ')) + '</div>' +
        '<button class="proj-index-select" type="button" aria-pressed="false" aria-label="选择' + esc(p.title) + '">' +
          '<span class="proj-index-no">' + esc(p.no) + '</span><span class="proj-index-heading">' +
          '<span class="proj-index-title">' + esc(p.title) + badge(p.placeholder) + '</span>' +
          '<span class="proj-index-type">' + esc(p.type) + (p.period ? ' · ' + esc(p.period) : '') + '</span></span>' +
          '<span class="proj-index-cue" aria-hidden="true">↗</span></button>' +
        '<p class="proj-index-summary">' + esc(p.summary) + '</p>' +
        '<div class="studio-card-tags">' + p.stack.slice(0,4).map(function(t){return '<span>'+esc(t)+'</span>';}).join('') + '</div>' +
        (p.collection ? '<button type="button" class="proj-index-cta" data-collection="' + esc(p.id) + '">浏览四项作品 <span aria-hidden="true">→</span></button>' :
          '<a href="#/project/' + esc(p.id) + '" class="proj-index-cta">查看详情 <span aria-hidden="true">→</span></a>') + '</article>';
    }).join('');
    return '<section class="proj-section" id="projects" aria-labelledby="h-projects"><div class="proj-city-layout">' +
      '<div class="proj-index-panel"><header class="proj-city-header">' +
        '<div class="sec-no"><span class="lmark" aria-hidden="true"></span>02 / PROJECT EXPLORER</div>' +
        '<h2 id="h-projects">做过的<em>项目。</em></h2>' +
        '<p class="proj-city-lead">先看它用来做什么，再看我写了什么。</p>' +
        '<p class="proj-city-note">四项工程实践，两个个人项目。</p></header>' +
        '<div class="proj-index-list">' + items + '</div>' +
        '<div class="proj-index-foot"><span class="lmark" aria-hidden="true"></span><span>业务协作 / 资料与记忆 / 工程实践</span></div></div>' +
      '<div class="city-column"><div class="proj-city-stage">' +
        '<div class="city-stage-heading"><span>CODE BECOMES ARCHITECTURE</span><span>构建 · 连接 · 落地</span></div>' +
        '<div class="city-canvas-wrap"><canvas id="cityCanvas" aria-label="项目代码城市，亦可通过左侧列表选择作品"></canvas>' +
          '<div class="city-pins" id="cityPins"></div><div class="city-fallback"><div class="city-fallback-content">' +
            '<svg class="city-fallback-icon" viewBox="0 0 80 80" fill="none" stroke="currentColor"><rect x="10" y="30" width="15" height="40"/><rect x="30" y="20" width="15" height="50"/><rect x="50" y="35" width="15" height="35"/><path d="M5 70h70"/></svg>' +
            '<h3 class="city-fallback-title">作品由此展开</h3><p class="city-fallback-desc">选择项目，阅读问题、设计与成果。</p></div></div></div>' +
        '<div class="city-stage-foot"><span>SELECTED WORK · 06</span><div class="city-controls visible">' +
          '<span class="city-status" id="cityStatus" role="status">待构建</span>' +
          '<button type="button" class="city-control-btn" id="cityPauseBtn" aria-pressed="false">暂停</button>' +
          '<button type="button" class="city-control-btn" id="cityReplayBtn">重播构建</button></div></div></div>' +
        '<div class="city-info-panel" id="cityInfoPanel" aria-live="polite" aria-atomic="true"></div></div></div></section>';
  }

  // 终端风检索：关键词取自项目真实的技术栈/关键词
  function tuiHTML() {
    var tags = {};
    projects.forEach(function (p) { p.stack.concat(p.keywords).forEach(function (k) { tags[k] = 1; }); });
    return '<div class="tui reveal" role="search"><div class="tui-top"><span>FIND / PROJECTS</span><b id="tuiStat">HITS ' + projects.length + '/' + projects.length + '</b></div>' +
      '<label class="tui-in"><span class="prompt" aria-hidden="true">&gt;</span><span class="sr-only">按关键词筛选项目</span>' +
      '<input id="tuiQ" type="search" autocomplete="off" spellcheck="false" placeholder="输入关键词，如 Agent、Redis、检索"></label>' +
      '<div class="tui-tags" id="tuiTags">' + Object.keys(tags).slice(0, 12).map(function (k) {
        return '<button type="button" data-q="' + esc(k) + '" aria-pressed="false">' + esc(k) + '</button>'; }).join("") + '</div>' +
      '<div class="sr-only" id="tuiLive" aria-live="polite"></div></div>';
  }

  function renderExperience() {
    var d = C.experience;
    var items = d.items.map(function (e, i) {
      var rel = (e.projectIds || []).filter(function (id) { return byId[id]; });
      return '<li class="tl-item" data-i="' + i + '">' +
        '<button class="tl-head" type="button" aria-expanded="false" aria-controls="tl-b' + i + '">' +
          '<span class="tl-period">' + esc(e.period) + '</span>' +
          '<span><span class="tl-title" style="display:block">' + esc(e.title) + badge(e.placeholder) + '</span><span class="tl-org" style="display:block">' + esc(e.org) + '</span></span>' +
          '<span class="tl-toggle" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="tl-body" id="tl-b' + i + '"><div><div class="tl-body-in">' +
          '<p class="tl-sum">' + esc(e.summary) + '</p>' +
          (e.detail ? '<p class="tl-detail">' + esc(e.detail) + '</p>' : "") +
          (rel.length ? '<div class="tl-rel"><span>关联项目</span>' + rel.map(function (id) {
            return '<button type="button" data-open="' + esc(id) + '">' + esc(byId[id].title) + '</button>';
          }).join("") + '</div>' : "") +
        '</div></div></div></li>';
    }).join("");
    return '<section class="sec sec--light" id="experience" aria-labelledby="h-exp"><div class="sec-inner">' +
      sectionHead(secOf("experience"), d).replace("<h2>", '<h2 id="h-exp">') +
      '<ul class="tl reveal" id="tl">' + items + '</ul></div></section>';
  }

  function renderSkills() {
    var d = C.skills;
    var focus = (d.focus || []).map(function(f){
      return '<article class="capability"><h3>'+esc(f.title)+'</h3><p>'+esc(f.text)+'</p><div>'+f.projects.filter(function(id){return byId[id];}).map(function(id){return '<a href="#/project/'+esc(id)+'">'+esc(byId[id].title)+' <span aria-hidden="true">↗</span></a>';}).join('')+'</div></article>';
    }).join('');
    var tools = (d.aiTools || []).map(function (tool, i) {
      return '<button class="ai-tool' + (i === 0 ? ' is-selected' : '') + '" type="button" data-ai-tool="' + esc(tool.id) + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" aria-controls="aiToolReading" style="--ai-color:' + esc(tool.color) + '">' +
        '<span class="ai-tool-top"><span><b class="ai-tool-number">' + esc(tool.no) + '</b><span class="ai-tool-type"> / AI COLLABORATION</span></span><span class="ai-tool-indicator" aria-hidden="true">↗</span></span>' +
        '<span class="ai-art"><img class="ai-shape-backup" src="' + esc(tool.image) + '" alt="" aria-hidden="true"><canvas class="ai-symbol-canvas" data-symbol="' + esc(tool.id) + '" aria-hidden="true"></canvas></span>' +
        '<span class="ai-tool-caption"><span class="ai-tool-name">' + esc(tool.name) + '</span><span class="ai-tool-role">' + esc(tool.label) + '</span></span></button>';
    }).join('');
    var groups = d.groups.map(function (g) {
      return '<div class="skill-group"><h3>' + esc(g.name) + '</h3><div class="skill-chips">' +
        g.items.map(function (s) { return '<button class="chip" type="button" aria-pressed="false" data-skill="' + esc(s) + '">' + esc(s) + '</button>'; }).join("") +
        '</div></div>';
    }).join("");
    return '<section class="skills-section" id="skills" aria-labelledby="h-skills">' +
      '<canvas class="terrain-canvas" id="terrainCanvas" aria-hidden="true"></canvas>' +
      '<div class="sec-inner">' +
      '<header class="skills-header"><div class="sec-no"><span class="lmark" aria-hidden="true"></span>03 / CAPABILITIES</div>' +
      '<h2 id="h-skills">技能<span class="subtitle">Technical Stack</span></h2>' +
      '<p class="skills-lead">' + esc(d.lead) + '</p></header>' +
      (focus ? '<div class="capability-grid">'+focus+'</div>' : '') +
      '<div class="skills-stack-label"><span>技术栈</span><span>TOOLS INTO PRACTICE</span></div>' +
      '<div class="skill-groups reveal">' + groups + '</div>' +
      '<div class="skill-result" id="skillResult" aria-live="polite"><span class="lbl">USED IN</span>选择一项技能。</div>' +
      (tools ? '<details class="ai-secondary"><summary><span>辅助工作方式</span><span>AI COLLABORATION <i aria-hidden="true">＋</i></span></summary><div class="ai-workbench"><div class="ai-workbench-head"><p>在方案比较、代码阅读与验证中使用 AI。</p><div class="ai-workbench-controls"><button type="button" data-ai-replay>重播汇聚 <span aria-hidden="true">↻</span></button></div></div><p class="ai-mobile-hint">左右滑动浏览，点选查看协作方式。</p><div class="ai-tool-grid">' + tools + '</div><div id="aiToolReading" class="ai-tool-reading" aria-live="polite" aria-atomic="true"></div></div></details>' : '') +
    '</div></section>';
  }

  function renderContact() {
    var d = C.closing;
    return '<section class="sec sec--dark contact closing" id="closing" aria-labelledby="h-closing">' +
      '<canvas class="contact-canvas" id="contactCanvas" aria-hidden="true"></canvas>' +
      '<div class="sec-inner reveal"><p class="closing-kicker mono">FROM INTENT TO ARTIFACT</p>' +
      '<svg class="big-l" viewBox="0 0 100 130" aria-hidden="true"><path pathLength="1" d="M6 0V124H70"/></svg>' +
      '<h2 id="h-closing">' + esc(d.title) + '</h2><p class="sec-lead">' + esc(d.lead) + '</p>' +
      '<a class="closing-link" href="#projects">再看一件作品 <span aria-hidden="true">↗</span></a>' +
      (C.profile.avatar ? '<div class="closing-sign"><img src="' + esc(safeHref(C.profile.avatar)) + '" alt="" loading="lazy"></div>' : '') +
      '</div></section>' +
      '<footer class="site-foot"><span>' + esc(C.footer) + '</span><span class="footer-note">想法，结构，作品。</span><a href="#home">回到顶部 ↑</a></footer>';
  }

  /* ---------- 旧版二维预览，仅供兼容 ---------- */
  /* 当前渲染层已不再输出 #previewCard / .proj-row；保留这段只为兼容老结构。
     setPreview 会经 FX.projects 暴露给特效层（当前无实现），所以必须先判存在，
     否则一旦重新接线就会在 null 上取 innerHTML 直接抛错。 */
  function previewSVG(p) {
    var kws = p.keywords.slice(0, 7);
    var cx = 150, cy = 100, R = 76, n = kws.length;
    var links = "", nodes = "";
    kws.forEach(function (k, i) {
      var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * R * 1.55, y = cy + Math.sin(a) * R * 0.95;
      links += '<path class="pv-link" pathLength="1" style="--i:' + i + '" d="M' + cx + ' ' + cy + ' L' + x.toFixed(1) + ' ' + y.toFixed(1) + '"/>';
      nodes += '<g class="pv-node" style="--i:' + i + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><circle r="4"/><text y="-11">' + esc(k) + '</text></g>';
    });
    return '<svg class="preview-svg" viewBox="0 0 300 200" role="img" aria-label="' + esc(p.title) + ' 的关键词结构：' + esc(kws.join("、")) + '">' +
      links + nodes + '<g class="pv-node is-hub" transform="translate(' + cx + ' ' + cy + ')"><circle r="7"/></g></svg>';
  }

  function renderPreview() {
    var p = byId[state.previewId];
    var card = $("#previewCard");
    if (!card) return;
    if (!p) { card.innerHTML = ""; return; }
    card.innerHTML =
      '<div class="preview-top"><span>PREVIEW · ' + esc(p.no) + '</span><span>' + esc(p.type) + '</span></div>' +
      '<div class="preview-title">' + esc(p.title) + '</div>' + previewSVG(p) +
      '<dl class="preview-meta"><dt>职责</dt><dd>' + esc(p.role) + '</dd><dt>技术</dt><dd>' + esc(p.stack.join(" / ")) + '</dd></dl>' +
      (p.placeholder ? '<div class="preview-note">示例内容 · 由 content.js 提供</div>' : "");
    $$(".proj-row").forEach(function (r) { r.classList.toggle("is-active", r.getAttribute("data-id") === state.previewId); });
    syncKeywords(p);
  }

  // 项目被预览时：同步点亮技能、行内标签与光场
  function syncKeywords(p) {
    var set = {};
    (p ? p.keywords.concat(p.stack) : []).forEach(function (k) { set[k.toLowerCase()] = 1; });
    $$(".chip").forEach(function (c) {
      if (!c.classList.contains("is-pinned")) c.classList.toggle("is-on", !!set[c.getAttribute("data-skill").toLowerCase()]);
    });
    $$(".proj-row").forEach(function (r) {
      var on = r.getAttribute("data-id") === (p && p.id);
      $$(".tag", r).forEach(function (t) { t.classList.toggle("is-on", on); });
    });
    if (heroField) heroField.setFocus(p ? p.keywords : null);
  }

  function setPreview(id) {
    if (!byId[id] || id === state.previewId) return;
    state.previewId = id;
    renderPreview();
    if (window.FX && window.FX.drawLink) window.FX.drawLink();
  }

  /* ---------- 项目详情 ---------- */
  var archSel = null;

  function caseStudyHTML(p) {
    var c = p.caseStudy;
    if (!c) return '';
    var diagram = window.FX && FX.projectDiagramHTML ? FX.projectDiagramHTML(p) : '';
    if (!diagram) diagram = '<div class="case-diagram"><div class="case-diagram-label"><span>关键流程</span><span>PROCESS / DESIGN</span></div>' +
      '<ol class="case-flow">' + c.steps.map(function (step, i) {
        return '<li><span class="case-step-no">0' + (i + 1) + '</span><h3>' + esc(step.title) + '</h3><p>' + esc(step.desc) + '</p></li>';
      }).join('') + '</ol><p class="case-branch"><span>另一条路径</span>' + esc(c.branch) + '</p></div>';
    return '<section class="case-study" id="caseStudy" aria-labelledby="caseTitle"><div class="case-heading">' +
      '<p class="case-eyebrow">' + esc(c.eyebrow) + '</p><h2 id="caseTitle">' + esc(c.title) + '</h2><p>' + esc(c.intro) + '</p></div>' +
      diagram +
      '<div class="case-insights">' + c.insights.map(function (insight) {
        return '<div><h3>' + esc(insight.title) + '</h3><p>' + esc(insight.text) + '</p></div>';
      }).join('') + '</div></section>';
  }

  function detailHTML(p) {
    var i = projects.indexOf(p);
    var prev = projects[(i - 1 + projects.length) % projects.length];
    var next = projects[(i + 1) % projects.length];
    function textBlocks(rows) { return rows.filter(function (b) { return b[2]; }).map(function (b) {
      return '<div class="dblock"><h2><span>' + b[1].toUpperCase() + '</span><b>' + b[0] + '</b></h2><p>' + esc(b[2]) + '</p></div>';
    }).join(''); }
    var approach = textBlocks([["方案与取舍", "Approach", p.solution]]);
    var scope = textBlocks([["实现与交付", "Implementation", p.result], ["设计边界", "Scope", p.limits]]);
    var shot = p.screenshot ? '<figure class="project-screen" id="projectScreen"><a class="detail-shot" href="' + esc(safeHref(p.screenshot)) + '" target="_blank" rel="noopener" aria-label="查看' + esc(p.title) + '界面大图"><img width="1800" height="1125" src="' + esc(safeHref(p.screenshot)) + '" alt="' + esc(p.title) + '，' + esc(p.screenDescription || p.subtitle) + '。示例图，非真实运营数据。"></a>' +
      '<figcaption><span>' + esc(p.screenshotCaption || '') + '</span><a href="' + esc(safeHref(p.screenshot)) + '" target="_blank" rel="noopener">查看大图 ↗</a></figcaption></figure>' : '';
    var links = (p.links || []).map(function (l) {
      return '<a href="' + esc(safeHref(l.href)) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + ' ↗</a>';
    }).join("");
    var arch = p.architecture && p.architecture.layers && p.architecture.layers.length
      ? '<section class="arch" aria-labelledby="archT"><div class="arch-head"><h2 id="archT">系统结构</h2>' +
        '<div class="arch-ctl"><button type="button" id="archSpread" aria-pressed="false">展开层级</button><button type="button" id="archReset">重置选择</button></div></div>' +
        '<div class="arch-stage" id="archStage"><svg class="arch-link-svg" id="archLinks" aria-hidden="true"></svg><div class="arch-layers" id="archLayers">' +
        p.architecture.layers.map(function (ly, li) {
          return '<div class="arch-layer" style="--z:' + (li * 30) + '"><div class="arch-lname">' + esc(ly.name) + '</div><div class="arch-nodes">' +
            ly.nodes.map(function (n) { return '<button type="button" class="anode" data-node="' + esc(n.id) + '" aria-pressed="false"><span class="anode-label">' + esc(n.label) + '</span><span class="anode-desc">' + esc(n.desc) + '</span></button>'; }).join("") +
            '</div></div>';
        }).join("") +
        '</div>' +
        '<div class="arch-note" id="archNote" aria-live="polite"><b>NODE</b>点击一个模块，查看它的职责与上下游。</div></div>' +
        '<p class="arch-cap">逻辑职责示意 · 点击查看上下游，展开阅读模块职责。</p></section>'
      : "";
    return '<div class="detail-bar"><a class="detail-back" id="detailBack" href="#projects"><span class="arrow" aria-hidden="true">←</span>返回作品</a>' +
      '<span class="detail-file" aria-hidden="true">' + esc(p.no) + ' / ' + esc(p.type) + '</span>' +
      '<div class="detail-nav"><button type="button" data-go="' + esc(prev.id) + '" aria-label="上一个项目：' + esc(prev.title) + '">← 上一个</button>' +
      '<button type="button" data-go="' + esc(next.id) + '" aria-label="下一个项目：' + esc(next.title) + '">下一个 →</button></div></div>' +
      '<article class="detail-in" data-project-id="' + esc(p.id) + '"><div class="detail-opening"><p class="detail-kicker">项目 ' + esc(p.no) + ' <span>/</span> ' + esc(p.type) + (p.period ? ' / ' + esc(p.period) : "") + '</p>' +
      '<h1 id="detailTitle">' + esc(p.title) + badge(p.placeholder) + '</h1>' +
      (p.subtitle ? '<p class="detail-subtitle">' + esc(p.subtitle) + '</p>' : '') +
      '</div>' +
      '<dl class="project-facts"><div><dt>个人职责</dt><dd>'+esc(p.role || '工程实践')+'</dd></div><div><dt>项目状态</dt><dd>'+esc(p.status || '工程实践')+'</dd></div>'+(p.period ? '<div><dt>项目时间</dt><dd>'+esc(p.period)+'</dd></div>':'')+'</dl>' +
      '<p class="detail-sum business-summary">' + esc(p.summary) + '</p>' + shot +
      (p.contribution ? '<div class="project-contribution"><span>我负责的部分</span><p>'+esc(p.contribution)+'</p></div>':'') +
      (p.screenDescription ? '<p class="business-screen-note">'+esc(p.screenDescription)+'</p>':'') +
      (links ? '<div class="detail-links">' + links + '</div>' : "") +
      '<details class="technical-notes"><summary><span>技术实现</span><span>'+esc(p.focus)+' <i aria-hidden="true">＋</i></span></summary><div class="technical-notes-body">' +
      '<aside class="detail-dependencies" aria-label="项目技术栈"><div class="dependency-head"><span>用到的技术</span></div><div class="detail-stack">' + p.stack.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("") + '</div></aside>' +
      '<div class="project-context"><span>遇到的问题</span><p>' + esc(p.problem) + '</p></div>' +
      caseStudyHTML(p) + '<div class="detail-blocks">' + approach + '</div>' + arch + '</div></details>' +
      '<section id="implementation" class="detail-blocks implementation-blocks" aria-label="实现范围">' + scope + '</section></article>';
  }

  function openDetail(id, fromHash) {
    var p = byId[id];
    if (!p) return;
    var el = $("#detail");
    var wasOpen = !el.hidden;
    if (!wasOpen) {
      state.scrollY = window.scrollY;
      state.lastFocusEl = document.activeElement;
    }
    state.openedId = id;
    if (archCleanup) { archCleanup(); archCleanup = null; }
    el.innerHTML = detailHTML(p);
    el.hidden = false;
    $("#main").inert = true;
    $("#top").inert = true;
    if (window.FX && FX.suspendCity) FX.suspendCity(true);
    el.scrollTop = 0;
    document.documentElement.classList.add("no-scroll");
    document.title = p.title + " · " + C.meta.title;
    archSel = null;
    bindArch(p);
    if (window.FX && FX.initProjectBlueprint) FX.initProjectBlueprint(el);
    var technicalNotes = $(".technical-notes", el);
    if (technicalNotes) technicalNotes.addEventListener('toggle', function () {
      if (technicalNotes.open) window.dispatchEvent(new Event('resize'));
    });
    $("#detailBack").focus({ preventScroll: true });
  }

  function closeDetail() {
    var el = $("#detail");
    if (el.hidden) return;
    if (archCleanup) { archCleanup(); archCleanup = null; }
    if (window.FX && FX.clearProjectBlueprint) FX.clearProjectBlueprint();
    el.hidden = true;
    $("#main").inert = false;
    $("#top").inert = false;
    if (window.FX && FX.suspendCity) FX.suspendCity(false);
    el.innerHTML = "";
    state.openedId = null;
    document.documentElement.classList.remove("no-scroll");
    document.title = C.meta.title;
    var y = state.scrollY || 0;
    window.scrollTo(0, y);
    if (state.lastFocusEl && document.contains(state.lastFocusEl)) state.lastFocusEl.focus({ preventScroll: true });
  }

  function bindArch(p) {
    var stage = $("#archStage");
    if (!stage) return;
    var layers = $("#archLayers"), svg = $("#archLinks");
    var nodes = {};
    p.architecture.layers.forEach(function (ly) { ly.nodes.forEach(function (n) { nodes[n.id] = n; }); });

    // 节点中心取变换后的实际位置，坐标相对 stage；连线画在不旋转的覆盖层，所以 3D 展开时也对得上
    function center(id) {
      var b = $('[data-node="' + id + '"]', layers);
      if (!b) return null;
      var r = b.getBoundingClientRect(), o = stage.getBoundingClientRect();
      return { x:r.left-o.left+r.width/2, y:r.top-o.top+r.height/2, left:r.left-o.left, top:r.top-o.top, bottom:r.bottom-o.top };
    }
    function draw(animate) {
      if (!stage.isConnected) return;
      svg.innerHTML = "";
      var o = stage.getBoundingClientRect();
      if (o.width < 1 || o.height < 1) return;
      svg.setAttribute("viewBox", "0 0 " + o.width + " " + o.height);
      var live = null;
      Object.keys(nodes).forEach(function (fid) {
        var from = center(fid);
        nodes[fid].to.forEach(function (tid) {
          var t = center(tid);
          if (!from || !t) return;
          var mobile = innerWidth <= 650, mid = (from.bottom+t.top)/2;
          var d = mobile ? 'M'+from.left+' '+from.y+' C8 '+from.y+' 8 '+t.y+' '+t.left+' '+t.y :
            'M'+from.x+' '+from.bottom+' C'+from.x+' '+mid+' '+t.x+' '+mid+' '+t.x+' '+t.top;
          var on = fid === archSel;
          svg.insertAdjacentHTML("beforeend", '<path class="' + (on ? "on" : "") + '" d="'+d+'"/>');
          if (on && !live) live = svg.lastElementChild;
        });
      });
      if (animate && live && !state.reduced) {
        // 一枚光点沿被选节点的第一条边走一次
        var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", "4"); svg.appendChild(dot);
        var len = live.getTotalLength(), t0 = performance.now(), dur = 800;
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          var pt = live.getPointAtLength(len * e);
          dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
          if (k < 1 && dot.isConnected) requestAnimationFrame(step); else dot.remove();
        })(t0);
      }
    }
    function select(id) {
      archSel = archSel === id ? null : id;
      var rel = archSel ? nodes[archSel].to : [];
      $$(".anode", layers).forEach(function (b) {
        var nid = b.getAttribute("data-node");
        b.classList.toggle("is-sel", nid === archSel);
        b.classList.toggle("is-rel", rel.indexOf(nid) > -1);
        b.setAttribute("aria-pressed", nid === archSel ? "true" : "false");
      });
      stage.classList.toggle("has-sel", !!archSel);
      var note = $("#archNote");
      if (archSel) {
        var up = Object.keys(nodes).filter(function (k) { return nodes[k].to.indexOf(archSel) > -1; }).map(function (k) { return nodes[k].label; });
        var dn = nodes[archSel].to.map(function (k) { return nodes[k] && nodes[k].label; }).filter(Boolean);
        note.innerHTML = "<b>" + esc(nodes[archSel].label) + "</b>" + esc(nodes[archSel].desc) +
          (up.length ? "<br>上游：" + esc(up.join("、")) : "") + (dn.length ? "<br>下游：" + esc(dn.join("、")) : "");
      } else {
        note.innerHTML = "<b>NODE</b>点击一个模块，查看它的职责与上下游。";
      }
      draw(true);
    }
    draw(false);
    layers.addEventListener("click", function (e) {
      var b = e.target.closest(".anode");
      if (b) select(b.getAttribute("data-node"));
    });
    $("#archReset").addEventListener("click", function () { if (archSel) select(archSel); });
    $("#archSpread").addEventListener("click", function (e) {
      var on = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", on ? "true" : "false");
      e.currentTarget.textContent = on ? "折叠层级" : "展开层级";
      layers.classList.toggle("is-spread", on);
      if (state.reduced) { draw(false); return; }
      stage.classList.add("moving");
      clearTimeout(stage._t);
      stage._t = setTimeout(function () { stage.classList.remove("moving"); draw(false); }, 400);
    });
    var resize = typeof ResizeObserver === 'function' ? new ResizeObserver(function(){draw(false);}) : null;
    if (resize) resize.observe(stage); else window.addEventListener('resize',draw);
    archCleanup = function(){clearTimeout(stage._t);if(resize)resize.disconnect();else window.removeEventListener('resize',draw);};
  }

  /* ---------- 路由：#/project/<id> 可直达，浏览器返回可用 ---------- */
  var routed = false;
  function apply() {                       // 总是读取当前 hash，避免转场期间用到过期状态
    var m = /^#\/project\/([\w-]+)$/.exec(location.hash);
    if (m && byId[m[1]]) openDetail(m[1], true); else closeDetail();
  }
  function route() {
    var m = /^#\/project\/([\w-]+)$/.exec(location.hash);
    var target = m && byId[m[1]], from = state.openedId;
    var changing = (target ? target.id : null) !== from;
    var mode = !from ? 'open' : target ? 'swap' : 'close';
    if (routed && changing && window.FX) window.FX.transition(apply, {mode:mode, project:target || byId[from]});
    else { if (window.FX && FX.finishTransition) FX.finishTransition(); apply(); }
    routed = true;
  }

  /* ---------- 技能 → 项目 ---------- */
  function bindSkills() {
    var res = $('#skillResult');
    function show(chip, pin) {
      if (!chip) return;
      var on = !pin || chip.getAttribute('aria-pressed') !== 'true';
      if (pin) $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed','false'); c.classList.remove('is-pinned','is-on'); });
      if (!on) { res.innerHTML = '<span class="lbl">USED IN</span>选择一项技能。'; if (heroField) heroField.setFocus(null); return; }
      if (pin) { chip.setAttribute('aria-pressed','true'); chip.classList.add('is-pinned','is-on'); }
      var s = chip.getAttribute('data-skill').toLowerCase();
      var hit = projects.filter(function (p) { return p.keywords.concat(p.stack).some(function (k) { return k.toLowerCase() === s; }); });
      res.innerHTML = '<span class="lbl">USED IN</span>' + (hit.length ? hit.map(function (p) { return '<a href="#/project/' + esc(p.id) + '">' + esc(p.title) + ' ↗</a>'; }).join('') : '项目资料待补充。');
      if (heroField) heroField.setFocus([chip.getAttribute('data-skill')]);
    }
    $('#skills').addEventListener('click', function (e) { show(e.target.closest('.chip'), true); });
    $('#skills').addEventListener('focusin', function (e) { show(e.target.closest('.chip'), false); });
  }

  function initCodeCity() {
    if (!window.FX || !FX.initCodeCity) return;
    var city = FX.initCodeCity({ projects: cityEntries });
    if (city && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { FX.buildCity(false); obs.disconnect(); }
      }, {threshold: .12});
      obs.observe($('.proj-city-stage'));
    } else if (city) FX.buildCity(false);
    $('#cityReplayBtn').addEventListener('click', function () { FX.buildCity(true); });
    $('#cityPauseBtn').addEventListener('click', function () { FX.pauseCity(); });
  }

  function bindProjectIndex() {
    var list = $('.proj-index-list'), timer = 0;
    function preview(id) { if (window.FX) FX.setCityProject(id, true); }
    list.addEventListener('mouseover', function (e) {
      var item = e.target.closest('.proj-index-item');
      if (!item || (e.relatedTarget && item.contains(e.relatedTarget))) return;
      clearTimeout(timer); timer = setTimeout(function () { preview(item.dataset.projectId); }, 120);
    });
    list.addEventListener('mouseout', function (e) {
      var item = e.target.closest('.proj-index-item');
      if (!item || (e.relatedTarget && item.contains(e.relatedTarget))) return;
      clearTimeout(timer); preview(null);
    });
    list.addEventListener('focusin', function (e) { var item = e.target.closest('.proj-index-item'); if (item) preview(item.dataset.projectId); });
    list.addEventListener('focusout', function (e) {
      var item = e.target.closest('.proj-index-item');
      if (item && (!e.relatedTarget || !item.contains(e.relatedTarget))) preview(null);
    });
    list.addEventListener('click', function (e) {
      var collection = e.target.closest('[data-collection]');
      if (collection) {
        clearTimeout(timer); FX.setCityProject(collection.dataset.collection, false);
        $('#cityInfoPanel').scrollIntoView({ block: 'start', behavior: state.reduced ? 'instant' : 'smooth' });
        var firstLink = $('.collection-card', $('#cityInfoPanel'));
        if (firstLink) firstLink.focus({ preventScroll: true });
        return;
      }
      var button = e.target.closest('.proj-index-select');
      if (button) { clearTimeout(timer); FX.setCityProject(button.closest('.proj-index-item').dataset.projectId, false); }
    });
    list.addEventListener('keydown', function (e) {
      var button = e.target.closest('.proj-index-select');
      if (!button || ['ArrowDown','ArrowUp','Home','End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var buttons = $$('.proj-index-select', list), i = buttons.indexOf(button);
      var next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length-1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    });
    if (cityEntries.length) FX.setCityProject(cityEntries[0].id, false);
  }

  /* ---------- 动效开关 ---------- */
  function setReduced(v, persist) {
    state.reduced = v;
    document.documentElement.classList.toggle("reduce-motion", v);
    document.documentElement.classList.toggle("motion-enabled", !v);
    var b = $("#motionToggle");
    b.setAttribute("aria-pressed", v ? "true" : "false");
    b.title = v ? "已减少动态效果，点击恢复" : "减少动态效果";
    if (heroField) heroField.setReduced(v);
    if (contactField) contactField.setReduced(v);
    if (window.FX) {
      if (v && FX.finishTransition) FX.finishTransition();
      if (window.FX.setReduced) window.FX.setReduced(v);
      if (window.FX.setCityReduced) window.FX.setCityReduced(v);
      if (window.FX.setAISymbolsReduced) window.FX.setAISymbolsReduced(v);
    }
    if (terrain) terrain.setReduced(v);
    if (persist) { try { localStorage.setItem("reduceMotion", v ? "1" : "0"); } catch (e) {} }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    document.title = C.meta.title;
    renderNav();
    $("#main").innerHTML = renderHero() + renderMarquee() + renderProjects() + renderSkills() + renderExperience() + renderContact();
    bindSkills();
    if (window.FX && FX.initAISymbols) FX.initAISymbols(C.skills.aiTools || []);
    var aiDetails = $('.ai-secondary');
    if (aiDetails) aiDetails.addEventListener('toggle',function(){ if(aiDetails.open)window.dispatchEvent(new Event('resize')); });

    // Code City：初始化代码城市
    initCodeCity();

    // 项目索引交互（新）
    bindProjectIndex();

    // 经历时间线
    $("#tl").addEventListener("click", function (e) {
      var open = e.target.closest("[data-open]");
      if (open) { location.hash = "#/project/" + open.getAttribute("data-open"); return; }
      var head = e.target.closest(".tl-head");
      if (!head) return;
      var item = head.parentNode, on = !item.classList.contains("is-open");
      item.classList.toggle("is-open", on);
      head.setAttribute("aria-expanded", on ? "true" : "false");
      window.dispatchEvent(new Event("scroll"));
    });

    // 详情：上一个/下一个、Esc、焦点圈定
    var det = $("#detail");
    det.addEventListener("click", function (e) {
      var jump = e.target.closest('[data-detail-section]');
      if (jump) {
        var target = document.getElementById(jump.dataset.detailSection);
        if (target) target.scrollIntoView({ block: 'start', behavior: state.reduced ? 'instant' : 'smooth' });
        return;
      }
      var go = e.target.closest("[data-go]");
      if (go) { location.replace("#/project/" + go.getAttribute("data-go")); return; }
      if (e.target.closest("#detailBack")) {
        e.preventDefault();
        if (history.length > 1 && state.cameFromPage) history.back(); else { location.hash = "#projects"; }
      }
    });
    document.addEventListener("keydown", function (e) {
      if (det.hidden) return;
      if (e.key === "Escape") { if (history.length > 1 && state.cameFromPage) history.back(); else location.hash = "#projects"; return; }
      if (e.key !== "Tab") return;
      var f = $$('a[href], button, summary, [tabindex]:not([tabindex="-1"])', det).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener("hashchange", function () {
      if (/^#\/project\//.test(location.hash)) state.cameFromPage = true;
      route();
    });

    // 菜单
    var menu = $("#menuBtn"), nav = $("#nav");
    menu.addEventListener("click", function () {
      var on = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", on);
      menu.setAttribute("aria-expanded", on ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("is-open"); menu.setAttribute("aria-expanded", "false"); }
    });

    // 光场：优先 WebGL 文字之海，失败则降级为 Canvas2D 词场，再不行保留静态背景
    var words = (C.profile.seaWords || []).slice();
    projects.forEach(function (p) { words = words.concat(p.keywords, p.stack); });
    C.skills.groups.forEach(function (g) { words = words.concat(g.items); });
    var seen = {}, vocab = [];
    words.forEach(function (w) { if (w && !seen[w]) { seen[w] = 1; vocab.push(w); } });
    function makeField(sel, seaOpts, fallbackOpts) {
      var cv = $(sel);
      if (!cv) return null;
      try { return new window.Sea(cv, vocab, seaOpts); }
      catch (err) {
        if (window.console) console.warn("WebGL 不可用，降级为 Canvas2D 词场", err);
      }
      try {
        var fresh = cv.cloneNode(false);        // 已绑定过 webgl 的 canvas 不能再取 2d 上下文
        fresh.classList.add("is-fallback");
        cv.parentNode.replaceChild(fresh, cv);
        return new window.WordField(fresh, vocab, fallbackOpts);
      } catch (err2) { cv.classList.add("is-fallback"); return null; }
    }
    heroField = makeField("#heroCanvas", { sunX: 0.3 },
      { getRegion: function (cv) { return [cv.clientHeight * 0.64, cv.clientHeight * 0.95]; } });
    contactField = makeField("#contactCanvas", { fixed: 0.8, sunX: 0.55, moon: true },
      { getRegion: function (cv) { return [cv.clientHeight * 0.58, cv.clientHeight * 0.96]; }, interactive: false, alpha: 0.5, density: 0.8 });
    if (window.FX && window.FX.projects) window.FX.projects({ projects: projects, setPreview: setPreview, getPreview: function () { return state.previewId; } });
    var tc = $("#terrainCanvas");
    if (tc && window.FX && window.FX.terrain) terrain = window.FX.terrain(tc);

    // 动效偏好：系统设置优先，页面开关可覆盖并记住
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var saved = null;
    try { saved = localStorage.getItem("reduceMotion"); } catch (e) {}
    setReduced(saved === null ? !!(mq && mq.matches) : saved === "1", false);
    if (window.FX) window.FX.init({ sea: heroField });
    if (mq && mq.addEventListener) mq.addEventListener("change", function (e) { setReduced(e.matches, false); });
    $("#motionToggle").addEventListener("click", function () { setReduced(!state.reduced, true); });

    // 章节出现与当前章节标记
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.08 });
      $$(".reveal").forEach(function (n) { io.observe(n); });
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          $$("#nav a").forEach(function (a) {
            if (a.getAttribute("data-sec") === en.target.id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      C.sections.forEach(function (s) { var n = document.getElementById(s.id); if (n) spy.observe(n); });
    } else {
      $$(".reveal").forEach(function (n) { n.classList.add("in"); });
    }

    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
