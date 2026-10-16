/* 视觉效果核心：滚动进度、首屏舞台、指针聚光、开场打字/字母、头像倾斜。
 * 一切装饰都可被“减少动态”关闭，且不影响内容的可读与可点击。 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var FX = window.FX = { reduced: false, sea: null, fields: [] };
  var root = document.documentElement;
  var raf = 0, ticking = false;

  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    raf = requestAnimationFrame(function () {
      ticking = false;
      var max = root.scrollHeight - innerHeight;
      root.style.setProperty("--sp", max > 0 ? (scrollY / max).toFixed(4) : 0);
      var hero = $("#home");
      if (!hero) return;
      var span = hero.offsetHeight - innerHeight;
      var p = FX.reduced || span <= 0 ? 0 : clamp(-hero.getBoundingClientRect().top / span);
      hero.style.setProperty("--p", p.toFixed(4));
      hero.classList.toggle("is-past", p > 0.42);
      if (FX.sea && FX.sea.setProgress) FX.sea.setProgress(FX.reduced ? 0.18 : p);
    });
  }

  FX.setReduced = function (v) {
    FX.reduced = v;
    onScroll();
    if (FX.sea && FX.sea.setProgress) FX.sea.setProgress(v ? 0.18 : 0);
  };

  /* 指针聚光（仅鼠标）+ 头像倾斜 */
  function pointer() {
    var spot = document.createElement("div");
    spot.className = "spot"; spot.setAttribute("aria-hidden", "true");
    document.body.appendChild(spot);
    var line = document.createElement("div");
    line.className = "progress-line"; line.setAttribute("aria-hidden", "true");
    document.body.appendChild(line);
    var mx = 0, my = 0, pend = false;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || FX.reduced) return;
      mx = e.clientX; my = e.clientY;
      if (pend) return;
      pend = true;
      requestAnimationFrame(function () {
        pend = false;
        spot.style.setProperty("--mx", mx + "px"); spot.style.setProperty("--my", my + "px");
        spot.classList.add("on");
        var av = $(".avatar");
        if (av) {
          var r = av.getBoundingClientRect();
          var dx = (mx - (r.left + r.width / 2)) / innerWidth, dy = (my - (r.top + r.height / 2)) / innerHeight;
          av.style.setProperty("--ry", (dx * 14).toFixed(2) + "deg");
          av.style.setProperty("--rx", (-dy * 14).toFixed(2) + "deg");
        }
      });
    }, { passive: true });
    document.addEventListener("pointerleave", function () { spot.classList.remove("on"); });
  }

  /* 开场：名字逐字升起；定位语打字机（完整文字始终保留给读屏与无脚本场景） */
  function intro() {
    var h1 = $("#heroName");
    if (h1 && !h1.querySelector(".ltr")) {
      var t = h1.textContent;
      h1.setAttribute("aria-label", t);
      h1.innerHTML = Array.prototype.map.call(t, function (ch, i) {
        return '<span class="ltr" style="--i:' + i + '" aria-hidden="true">' + ch + '</span>';
      }).join("");
    }
    var el = $("[data-type]");
    if (!el) return;
    var full = el.getAttribute("data-type"), cur = document.createElement("span");
    cur.className = "type-cursor"; cur.setAttribute("aria-hidden", "true");
    if (FX.reduced) { el.textContent = full; return; }
    el.textContent = ""; el.appendChild(cur);
    var i = 0;
    setTimeout(function tick() {
      if (i >= full.length) { cur.classList.add("is-done"); return; }
      el.insertBefore(document.createTextNode(full.charAt(i++)), cur);
      setTimeout(tick, 55 + Math.random() * 60);
    }, 700);
  }

  FX.init = function (o) {
    FX.sea = o.sea || null;
    pointer();
    intro();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  };
})();
