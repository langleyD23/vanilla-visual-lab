/*
 * 关键词光场（Canvas2D）
 * - 词源：content.js 里的项目关键词与技能，所以它既是氛围，也是真实的技能/项目索引
 * - 每个词有稳定 id、基础位置、种子；位置由确定性公式给出，不逐帧随机
 * - 指针只在光场区域内产生局部抬升与提亮；离开后平滑回到基线
 * - setFocus(words) 让指定词提亮并向一侧聚拢，其余降低亮度
 * - 不接管点击；canvas 对辅助技术隐藏
 */
(function () {
  "use strict";

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function WordField(canvas, words, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = Object.assign({ density: 1, interactive: true, alpha: 1 }, opts || {});
    this.words = [];
    this.focus = null;       // Set<string> | null
    this.focusT = 0;         // 0..1 平滑后的聚焦程度
    this.pointer = { x: 0, y: 0, active: false, k: 0 };
    this.running = false;
    this.reduced = false;
    this.visible = true;
    this.raf = 0;
    this.last = 0;
    this.time = 0;
    this.build(words);
    this.resize();
    var self = this;
    this._onResize = function () { self.resize(); self.draw(); };
    window.addEventListener("resize", this._onResize);
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver(function (es) {
        self.visible = es[0].isIntersecting;
        self.update();
      });
      this.io.observe(canvas);
    }
    this._onVis = function () { self.update(); };
    document.addEventListener("visibilitychange", this._onVis);
    if (this.opts.interactive) {
      this._onMove = function (e) {
        var r = canvas.getBoundingClientRect();
        self.pointer.x = e.clientX - r.left;
        self.pointer.y = e.clientY - r.top;
        self.pointer.active = true;
        if (self.reduced) return;
      };
      this._onLeave = function () { self.pointer.active = false; };
      window.addEventListener("pointermove", this._onMove, { passive: true });
      document.addEventListener("pointerleave", this._onLeave);
    }
  }

  WordField.prototype.build = function (words) {
    var seen = {};
    this.vocab = [];
    for (var i = 0; i < words.length; i++) {
      if (words[i] && !seen[words[i]]) { seen[words[i]] = 1; this.vocab.push(words[i]); }
    }
  };

  // 按进深分行、行内按列抖动：词之间不重叠，列数随画布宽度缩放（窄屏更稀疏）
  WordField.prototype.layout = function () {
    var rnd = mulberry32(20261010);
    var vocab = this.vocab, rows = 5, out = [], k = 0;
    var scale = Math.max(0.3, Math.min(1, this.w / 1200)) * this.opts.density;
    // 洗牌（固定种子），保证每次布局一致
    var order = vocab.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    for (var r = 0; r < rows; r++) {
      var cols = Math.max(2, Math.round((8 - r) * scale));
      for (var c = 0; c < cols; c++) {
        out.push({
          id: r + ":" + c,
          text: order[k++ % order.length],
          row: r, rows: rows,
          u: (c + 0.3 + rnd() * 0.4) / cols,   // 限制在格子中段，相邻词不会贴到一起
          jit: (rnd() - 0.5) * 0.5,
          seed: rnd() * 6.283,
          drift: 0.4 + rnd() * 0.6,
        });
      }
    }
    this.words = out;
  };

  WordField.prototype.resize = function () {
    var c = this.canvas;
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1 : 1.5);
    var w = c.clientWidth, h = c.clientHeight;
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    this.dpr = dpr; this.w = w; this.h = h;
    var reg = this.opts.getRegion ? this.opts.getRegion(c) : [h * 0.6, h * 0.95];
    this.y0 = reg[0]; this.y1 = Math.max(reg[0] + 60, reg[1]);
    this.layout();
  };

  WordField.prototype.setReduced = function (v) {
    this.reduced = v;
    this.update();
    this.draw();
  };

  WordField.prototype.setFocus = function (list) {
    this.focus = list && list.length ? new Set(list) : null;
    this.update();
  };

  WordField.prototype.update = function () {
    var should = this.visible && !document.hidden && !this.reduced;
    if (should && !this.running) {
      this.running = true; this.last = performance.now();
      var self = this;
      var loop = function (t) {
        if (!self.running) return;
        var dt = Math.min(0.05, (t - self.last) / 1000); // 限制时间增量，避免切回标签页时跳变
        self.last = t; self.time += dt;
        self.step(dt); self.draw();
        self.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!should && this.running) {
      this.running = false; cancelAnimationFrame(this.raf);
    }
  };

  WordField.prototype.step = function (dt) {
    var k = 1 - Math.exp(-dt * 6);
    var ft = this.focus ? 1 : 0;
    this.focusT += (ft - this.focusT) * k;
    this.pointer.k += ((this.pointer.active ? 1 : 0) - this.pointer.k) * (1 - Math.exp(-dt * 5));
  };

  // 透视：行越靠后越近（字更大、更亮、更靠下、间距更大）
  WordField.prototype.project = function (wd, t) {
    var pr = Math.pow(wd.row / (wd.rows - 1), 1.25);          // 0 远 .. 1 近
    var rowH = (this.y1 - this.y0) / wd.rows;
    var y = this.y0 + (this.y1 - this.y0) * (0.04 + 0.86 * pr) + wd.jit * rowH * 0.5;
    var squeeze = 0.78 + 0.2 * pr;                            // 远处略向中间收
    var x = this.w * (0.5 + (wd.u - 0.5) * squeeze);
    var amp = 1.5 + pr * 5;
    y += Math.sin(wd.u * 9 + t * 0.55 * wd.drift + wd.seed) * amp
       + Math.sin(wd.row * 2.3 - t * 0.4 + wd.seed * 0.5) * amp * 0.6;
    var size = (10 + pr * 13) * Math.max(0.75, Math.min(1, this.w / 900));
    return { x: x, y: y, size: size, persp: pr };
  };

  WordField.prototype.draw = function () {
    var ctx = this.ctx, d = this.dpr;
    if (!ctx) return;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    var t = this.reduced ? 0 : this.time;
    var focus = this.focus, ft = this.focusT;
    var px = this.pointer.x, py = this.pointer.y, pk = this.pointer.k;
    var radius = Math.max(90, this.w * 0.15);
    var base = this.opts.alpha;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // 按进深排序，远处先画
    var order = this.words;
    for (var i = 0; i < order.length; i++) {
      var wd = order[i];
      var p = this.project(wd, t);
      var a = (0.1 + p.persp * 0.34) * base;
      var hot = false;
      var x = p.x, y = p.y;

      if (focus) {
        var on = focus.has(wd.text);
        if (on) {
          hot = true;
          // 聚焦词向画面中部略微聚拢并抬升
          var tx = this.w * (0.3 + 0.4 * ((wd.u * 7.3) % 1));
          x += (tx - x) * 0.35 * ft;
          y -= 14 * ft;
          a = a + (0.95 - a) * ft;
        } else {
          a *= 1 - 0.65 * ft;
        }
      }

      if (pk > 0.01 && !this.reduced) {
        var dx = x - px, dy = y - py;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          var f = (1 - dist / radius);
          f = f * f * pk;
          y -= f * 9;
          x += (dx / (dist + 1)) * f * 7;
          a += f * 0.45;
        }
      }

      if (a < 0.02) continue;
      ctx.font = Math.round(p.size) + 'px "Cascadia Mono", Consolas, "Microsoft YaHei", monospace';
      ctx.fillStyle = hot ? "rgba(223,166,106," + Math.min(1, a) + ")" : "rgba(168,184,212," + Math.min(1, a) + ")";
      ctx.fillText(wd.text, x, y);
    }

    // 地平线：一条极细的线
    var gy = this.y0 - 10;
    var g = ctx.createLinearGradient(0, gy, this.w, gy);
    g.addColorStop(0, "rgba(168,184,212,0)");
    g.addColorStop(0.5, "rgba(168,184,212,.18)");
    g.addColorStop(1, "rgba(168,184,212,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, this.w, 1);
  };

  WordField.prototype.destroy = function () {
    this.running = false; cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("visibilitychange", this._onVis);
    if (this._onMove) window.removeEventListener("pointermove", this._onMove);
    if (this._onLeave) document.removeEventListener("pointerleave", this._onLeave);
    if (this.io) this.io.disconnect();
  };

  window.WordField = WordField;
})();
