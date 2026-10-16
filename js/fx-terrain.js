/* 技能区背景：透视网格 + 被指针牵引的“势阱”，一枚暖色光点沿螺旋轨道落入阱底。
 * Canvas2D 实现：网格点由确定性公式给出，指针只改变势阱中心，不逐帧随机。 */
(function () {
  "use strict";
  var FX = window.FX = window.FX || {};

  FX.terrain = function (canvas) {
    var ctx = canvas.getContext("2d"), w = 0, h = 0, dpr = 1;
    var well = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    var visible = false, running = false, raf = 0, t = 0, reduced = FX.reduced;
    var COLS = 34, ROWS = 22;

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      draw();
    }
    // 网格点 (u,v∈0..1) → 屏幕：v 越大越近；势阱使高度下陷并带有扭转
    function pt(u, v) {
      var dx = u - well.x, dz = v - well.y, r2 = dx * dx + dz * dz * 1.4;
      var well_ = Math.exp(-r2 * 26), tw = well_ * 1.3;
      var c = Math.cos(tw), s = Math.sin(tw);
      var uu = well.x + dx * c - dz * s * 0.7, vv = well.y + dx * s * 0.7 + dz * c;
      var depth = 0.18 + vv * 0.82;
      var sink = well_ * 0.36 + Math.sin(uu * 9 + t * 0.5) * 0.004 * depth;
      return [w * (0.5 + (uu - 0.5) * (0.35 + depth * 1.35)), h * (0.34 + depth * 0.62 + sink * depth), well_];
    }
    function draw() {
      if (!w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      var i, j, p;
      for (j = 0; j <= ROWS; j++) {                       // 横线
        var v = j / ROWS; ctx.beginPath();
        for (i = 0; i <= COLS; i++) { p = pt(i / COLS, v); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = "rgba(168,184,212," + (0.05 + v * 0.2) + ")"; ctx.stroke();
      }
      for (i = 0; i <= COLS; i++) {                       // 纵线
        ctx.beginPath();
        for (j = 0; j <= ROWS; j++) { p = pt(i / COLS, j / ROWS); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = "rgba(168,184,212,.13)"; ctx.stroke();
      }
      // 势阱中心的暖光
      var c = pt(well.x, well.y), g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], w * 0.14);
      g.addColorStop(0, "rgba(223,166,106,.38)"); g.addColorStop(1, "rgba(223,166,106,0)");
      ctx.fillStyle = g; ctx.fillRect(c[0] - w * 0.14, c[1] - w * 0.14, w * 0.28, w * 0.28);
      // 光点 + 拖尾：沿螺旋，7 秒一圈落入阱底
      for (var k = 0; k < 14; k++) {
        var f = ((t / 7) - k * 0.012) % 1; if (f < 0) f += 1;
        var r = 0.36 * (1 - f) + 0.01, a = f * 11 + 1.2;
        var q = pt(well.x + Math.cos(a) * r, well.y + Math.sin(a) * r * 0.7);
        ctx.fillStyle = "rgba(223,166,106," + (k === 0 ? 1 : 0.5 * (1 - k / 14)) + ")";
        ctx.beginPath(); ctx.arc(q[0], q[1], k === 0 ? 3.2 : 2 * (1 - k / 16), 0, 6.283); ctx.fill();
      }
    }
    function update() {
      var go = visible && !document.hidden && !reduced;
      if (go && !running) {
        running = true; var last = performance.now();
        (function loop(now) {
          if (!running) return;
          var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
          well.x += (well.tx - well.x) * (1 - Math.exp(-dt * 3)); well.y += (well.ty - well.y) * (1 - Math.exp(-dt * 3));
          draw(); raf = requestAnimationFrame(loop);
        })(last);
      } else if (!go && running) { running = false; cancelAnimationFrame(raf); }
    }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = canvas.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      well.tx = Math.max(0.15, Math.min(0.85, (e.clientX - r.left) / r.width));
      well.ty = Math.max(0.3, Math.min(0.85, 0.3 + (e.clientY - r.top) / r.height * 0.55));
    }, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", update);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; update(); }).observe(canvas);
    else visible = true;
    resize();
    return { setReduced: function (v) { reduced = v; if (v) { t = 2; well.x = well.tx = 0.5; well.y = well.ty = 0.55; } update(); draw(); } };
  };
})();
