/* 文字之海 · WebGL 渲染器（着色器见 sea-shaders.js）。失败时抛错，由调用方降级到 Canvas2D 词场 */
(function () {
  "use strict";
  var S = window.SeaShaders;
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sstep(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs, attribs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    attribs.forEach(function (n, i) { gl.bindAttribLocation(p, i, n); });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {};
    return p;
  }
  function loc(gl, p, n) {
    if (!(n in p.u)) p.u[n] = gl.getUniformLocation(p, n) || gl.getUniformLocation(p, n + "[0]");
    return p.u[n];
  }

  var TANH = Math.tan(25 * Math.PI / 180);   // 垂直视场 50°
  var Z0 = 5, ZR = 120, SIZE = 0.42;

  function Sea(canvas, vocab, opts) {
    this.o = Object.assign({ fixed: null, sunX: 0.28, onLost: null }, opts || {});
    var gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) throw new Error("no webgl");
    this.canvas = canvas; this.gl = gl;
    this.vocab = vocab.slice(0, S.NW); this.n = this.vocab.length;
    this.progress = this.target = this.o.fixed != null ? this.o.fixed : 0;
    this.time = 0; this.travel = 0; this.vel = 0; this.dead = false;
    this.ptr = { x: 0, y: -2, k: 0, tk: 0 };
    this.foc = new Float32Array(S.NW); this.tfoc = new Float32Array(S.NW);
    this.reduced = false; this.visible = true; this.running = false;
    this.pw = program(gl, S.wordVS, S.wordFS, ["aCorner", "aPos", "aIdx"]);
    this.pb = program(gl, S.bgVS, S.bgFS, ["aP"]);
    this.atlas();
    this.tri = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.xr = 0; this.buf = gl.createBuffer();
    this.bind();
    this.resize();
  }

  Sea.prototype.atlas = function () {
    var gl = this.gl, W = 2048, fs = 44, cell = 64, pad = 8;
    var c = document.createElement("canvas"), x = pad, y = 0, rows = 1, i;
    c.width = W; c.height = 1024;
    var g = c.getContext("2d");
    g.font = fs + 'px "Cascadia Mono", Consolas, "Microsoft YaHei", "PingFang SC", monospace';
    g.textBaseline = "middle"; g.fillStyle = "#fff";
    this.rect = new Float32Array(S.NW * 4);
    for (i = 0; i < this.n; i++) {
      var w = Math.ceil(g.measureText(this.vocab[i]).width) + pad * 2;
      if (x + w > W) { x = pad; y += cell; rows++; }
      g.fillText(this.vocab[i], x + pad, y + cell / 2);
      this.rect.set([(x + pad) / W, (y + 6) / c.height, (x + w - pad) / W, (y + cell - 6) / c.height], i * 4);
      x += w + pad;
    }
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var an = gl.getExtension("EXT_texture_filter_anisotropic");
    if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    this.atlasSize = [W, c.height];
  };

  // 词的世界坐标一次生成，之后只在着色器里滚动与波动；x 范围随画面宽高比缩放
  Sea.prototype.build = function (xr, spacing, rowN) {
    var gl = this.gl, cols = Math.round(2 * xr / spacing), rows = rowN || (this.asp < 1 ? 44 : 64), r = rng(20261010), data = [], k = 0, i, j, q;
    var order = []; for (i = 0; i < this.n; i++) order.push(i);
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); q = order[i]; order[i] = order[j]; order[j] = q; }
    var cn = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
    for (var ro = 0; ro < rows; ro++) {
      for (var co = 0; co < cols; co++) {
        var px = (co + (ro % 2) * 0.5 + r() * 0.6 - 0.3) / cols * 2 * xr - xr;
        var pz = ro / rows * ZR + r() * 1.2;
        var sd = r() * 6.283, idx = order[k++ % this.n];
        for (q = 0; q < 6; q++) data.push(cn[q][0], cn[q][1], px, pz, sd, idx);
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    this.count = data.length / 6; this.xr = xr;
  };

  Sea.prototype.bind = function () {
    var self = this, c = this.canvas;
    this.onMove = function (e) {
      if (e.pointerType === "touch") { self.ptr.tk = 0; return; }
      var r = c.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      self.ptr.tx = (e.clientX - r.left) / r.width * 2 - 1;
      self.ptr.ty = 1 - (e.clientY - r.top) / r.height * 2;
      self.ptr.tk = inside ? 1 : 0;
    };
    this.onResize = function () { self.resize(); };
    this.onVis = function () { self.update(); };
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
    c.addEventListener("webglcontextlost", function (e) {
      e.preventDefault(); self.dead = true; self.update();
      if (self.o.onLost) self.o.onLost();
    });
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; self.update(); });
      this.io.observe(c);
    }
  };

  Sea.prototype.resize = function () {
    var c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1 : 1.5);
    var w = c.clientWidth || 1, h = c.clientHeight || 1;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    this.asp = w / h;
    var xr = Math.max(30, Math.min(110, this.asp * 58));
    var compact = this.asp < 1;
    // 词语横向间距按屏幕像素守下限：窄屏上列距只剩桌面的六成，词会互相压住
    var spacing = compact ? 4.6 : 6, rowN = compact ? 44 : 64;
    var k = Math.min(1, (w / Math.round(2 * xr / spacing)) / 48);
    if (k < 1) {
      spacing = spacing / k;
      rowN = Math.max(12, Math.round(rowN * k));
    }
    if (Math.abs(xr - this.xr) > 4 || this.compact !== compact || this.rowN !== rowN) {
      this.compact = compact; this.rowN = rowN;
      this.build(xr, spacing, rowN);
    }
    if (this.reduced || !this.running) this.draw();
  };

  // 滚动进度 p(0..1) → 相机：地平线上升，海面铺满；太阳升起；色温由冷转暖
  Sea.prototype.cam = function () {
    var p = this.progress, e = sstep(0, 1, p), portrait = this.asp < 1;
    var h0 = portrait ? -0.5 : -0.32, h1 = portrait ? 0.1 : 0.25;
    var hn = mix(h0, h1, e);
    return {
      pitch: Math.atan(hn * TANH), camH: mix(1.8, 3.0, e), hor: (hn + 1) / 2,
      sun: sstep(0.12, 0.92, p), warm: 0.04 + 0.96 * sstep(0.08, 0.95, p),
    };
  };

  Sea.prototype.draw = function () {
    if (this.dead) return;
    var gl = this.gl, c = this.canvas, k = this.cam(), o = this.o, U = function (p, n) { return loc(gl, p, n); };
    gl.viewport(0, 0, c.width, c.height);
    gl.disable(gl.BLEND);
    var b = this.pb; gl.useProgram(b);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri);
    gl.enableVertexAttribArray(0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U(b, "uRes"), c.width, c.height);
    gl.uniform1f(U(b, "uHor"), k.hor); gl.uniform1f(U(b, "uSunE"), k.sun);
    gl.uniform1f(U(b, "uSunX"), this.o.sunX); gl.uniform1f(U(b, "uWarm"), k.warm);
    gl.uniform1f(U(b, "uTime"), this.time); gl.uniform1f(U(b, "uAsp"), this.asp);
    gl.uniform1f(U(b, "uMoon"), o.moon ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    var w = this.pw; gl.useProgram(w);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 8);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 20);
    gl.uniform4fv(U(w, "uRect"), this.rect); gl.uniform1fv(U(w, "uFocus"), this.foc);
    gl.uniform2f(U(w, "uAtlas"), this.atlasSize[0], this.atlasSize[1]);
    gl.uniform1f(U(w, "uTime"), this.time); gl.uniform1f(U(w, "uTravel"), this.travel);
    gl.uniform1f(U(w, "uPitch"), k.pitch); gl.uniform1f(U(w, "uCamH"), k.camH);
    gl.uniform1f(U(w, "uAsp"), this.asp); gl.uniform1f(U(w, "uTanH"), TANH);
    gl.uniform1f(U(w, "uZ0"), Z0); gl.uniform1f(U(w, "uZR"), ZR); gl.uniform1f(U(w, "uSize"), SIZE);
    gl.uniform2f(U(w, "uPtr"), this.ptr.x, this.ptr.y); gl.uniform1f(U(w, "uPtrK"), this.ptr.k);
    gl.uniform1i(U(w, "uTex"), 0);
    gl.uniform1f(U(w, "uWarm"), k.warm); gl.uniform1f(U(w, "uSun"), k.sun); gl.uniform1f(U(w, "uSunX"), this.o.sunX);
    gl.uniform1f(U(w, "uMoon"), o.moon ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.count);
  };

  /* (渲染循环与对外接口见下) */
  Sea.prototype.step = function (dt) {
    var o = this.o;
    if (o.fixed == null) {
      var prev = this.progress;
      this.progress += (this.target - this.progress) * (1 - Math.exp(-dt * 5));
      this.vel += ((this.progress - prev) / Math.max(dt, 1e-3) - this.vel) * (1 - Math.exp(-dt * 4));
    }
    this.time += dt;
    this.travel += dt * (0.9 + Math.min(14, Math.abs(this.vel) * 22));
    var pk = 1 - Math.exp(-dt * 8), p = this.ptr;
    p.k += ((p.tk || 0) - p.k) * pk;
    if (p.tk) { p.x += ((p.tx) - p.x) * pk; p.y += ((p.ty) - p.y) * pk; }
    for (var i = 0; i < this.n; i++) this.foc[i] += (this.tfoc[i] - this.foc[i]) * (1 - Math.exp(-dt * 7));
  };

  Sea.prototype.update = function () {
    var go = this.visible && !document.hidden && !this.reduced && !this.dead, self = this;
    if (go && !this.running) {
      this.running = true; var last = performance.now();
      var loop = function (t) {
        if (!self.running) return;
        self.step(Math.min(0.05, (t - last) / 1000)); last = t;
        self.draw(); self.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!go && this.running) { this.running = false; cancelAnimationFrame(this.raf); }
  };

  // 对外接口（与 WordField 同名，调用方不必区分渲染器）
  Sea.prototype.setProgress = function (p) {
    if (this.o.fixed != null) return;
    this.target = Math.max(0, Math.min(1, p));
    if (!this.running) { this.progress = this.target; this.draw(); }
  };
  Sea.prototype.setFocus = function (list) {
    var set = {}; (list || []).forEach(function (w) { set[w] = 1; });
    for (var i = 0; i < this.n; i++) this.tfoc[i] = set[this.vocab[i]] ? 1 : 0;
    if (!this.running) { this.foc.set(this.tfoc); this.draw(); }
  };
  Sea.prototype.setReduced = function (v) {
    this.reduced = v;
    if (v) { this.time = 3; this.travel = 10; this.ptr.k = 0; this.ptr.tk = 0; }
    this.update(); this.draw();
  };
  Sea.prototype.destroy = function () {
    this.running = false; cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
    if (this.io) this.io.disconnect();
  };
  window.Sea = Sea;
})();
