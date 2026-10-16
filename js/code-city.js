/* ==========================================================================
   Code City · 代码成为建筑
   --------------------------------------------------------------------------
   做法：
     1. 先用体块编排城市 —— 街谷、主楼群、近景楼、远景天际线
     2. 每栋楼的四个立面 + 屋顶，按「一行代码一个行位」铺满
     3. 逐行代码预渲染成图集，用 InstancedBufferGeometry 实例化，
        自定义着色器按实例取 UV、按实例着色、按深度雾化
     4. 汇聚动画：每个行位保留稳定身份，从散落到落位分阶段推进

   对外 API：new CodeCity(canvas, options)，方法见文件末尾。
   ========================================================================== */
(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("Code City: THREE.js 未加载");
    return;
  }

  /* ---------------------------------------------------------------- 调色 */
  var COL = {
    bg: 0x090d12,
    ink: 0x0b1017,          // 楼体核心（比背景略亮一点，才能看出体量）
    inkSide: 0x080b0f,
    roof: 0x0d1218,
    textNear: [0.85, 0.88, 0.91],   // #CAD3D9
    fog: [0.035, 0.051, 0.071],
    warm: 0xdfa66a
  };

  /* ------------------------------------------------- 项目代码块（按栈分） */
  /* 每个项目的建筑群用它自己技术栈的代码来砌。
     这些行会被 curateLines 再筛一遍（丢掉空行/纯括号/过短/过长），
     所以这里写的行**尽量落在 22–54 字符**，正面观感才均匀。
     代码是通用的工程写法，与任何真实项目无关。 */
  var CODE_BLOCKS = {
    // 项目 A：后端系统 · Java / Spring Boot / MySQL / Redis
    java: [
      "package com.example.order;",
      "",
      "import java.time.Duration;",
      "import java.time.Instant;",
      "import java.util.List;",
      "import java.util.Optional;",
      "import java.util.Objects;",
      "import java.util.stream.Collectors;",
      "",
      "import org.springframework.stereotype.Service;",
      "import org.springframework.transaction.annotation.Transactional;",
      "import org.springframework.scheduling.annotation.Scheduled;",
      "",
      "@Service",
      "public class OrderService {",
      "",
      "    private static final int MAX_RETRY = 3;",
      "    private static final Duration TTL = Duration.ofMinutes(30);",
      "",
      "    private final OrderRepository repository;",
      "    private final Cache<String, Order> cache;",
      "    private final EventPublisher publisher;",
      "    private final RetryTemplate retry;",
      "",
      "    public OrderService(OrderRepository repository,",
      "                        Cache<String, Order> cache,",
      "                        EventPublisher publisher,",
      "                        RetryTemplate retry) {",
      "        this.repository = repository;",
      "        this.cache = cache;",
      "        this.publisher = publisher;",
      "        this.retry = retry;",
      "    }",
      "",
      "    @Transactional(readOnly = true)",
      "    public Optional<Order> find(Long orderId) {",
      "        return repository.findById(orderId);",
      "    }",
      "",
      "    @Transactional(readOnly = true)",
      "    public List<Order> findByUser(Long userId) {",
      "        var rows = repository.findByUserId(userId);",
      "        return rows.stream()",
      "                .filter(Order::isActive)",
      "                .sorted(comparing(Order::createdAt))",
      "                .collect(Collectors.toList());",
      "    }",
      "",
      "    @Transactional",
      "    public Result<Order> submit(Long orderId) {",
      "        var cached = cache.get(key(orderId));",
      "        if (cached != null) {",
      "            return Result.ok(cached);",
      "        }",
      "        var row = repository.findById(orderId)",
      "                .orElseThrow(() -> new NotFound(orderId));",
      "        validate(row);",
      "        var saved = repository.save(row.markSubmitted());",
      "        cache.put(key(orderId), saved, TTL);",
      "        publisher.publish(new OrderSubmitted(saved.id()));",
      "        return Result.ok(saved);",
      "    }",
      "",
      "    @Transactional",
      "    public void cancel(Long orderId) {",
      "        var row = repository.findById(orderId)",
      "                .orElseThrow(NotFound::new);",
      "        repository.save(row.markCancelled());",
      "        cache.evict(key(orderId));",
      "        publisher.publish(new OrderCancelled(orderId));",
      "    }",
      "",
      "    private void validate(Order row) {",
      "        Objects.requireNonNull(row, \"order must not be null\");",
      "        if (row.status() != Status.DRAFT) {",
      "            throw new IllegalState(row.status());",
      "        }",
      "    }",
      "",
      "    public long countByStatus(Status status) {",
      "        return repository.countByStatus(status);",
      "    }",
      "",
      "    @Scheduled(fixedDelay = 60_000)",
      "    public void expireDrafts() {",
      "        var before = Instant.now().minus(Duration.ofDays(30));",
      "        var n = repository.expireBefore(Status.DRAFT, before);",
      "        log.info(\"expired {} drafts\", n);",
      "    }",
      "",
      "    private String key(Long id) {",
      "        return \"order:\" + id;",
      "    }",
      "",
      "    public enum Status { DRAFT, SUBMITTED, CANCELLED }",
      "}"
    ],

    // 项目 B：AI Agent · Python / LLM / MCP / FastAPI
    python: [
      "from dataclasses import dataclass, field",
      "from typing import Any",
      "import logging",
      "import time",
      "",
      "logger = logging.getLogger(__name__)",
      "",
      "",
      "@dataclass",
      "class Agent:",
      "    tools: dict[str, Any]",
      "    memory: list[dict] = field(default_factory=list)",
      "    trace: list[tuple] = field(default_factory=list)",
      "    max_steps: int = 8",
      "",
      "    async def run(self, task: str) -> str:",
      "        context = await self.recall(task)",
      "        plan = self.plan(task, context)",
      "",
      "        for step in plan[: self.max_steps]:",
      "            observation = await self.step(step, context)",
      "            if not self.verify(step, observation):",
      "                return await self.retry(step)",
      "",
      "        return await self.summarize()",
      "",
      "    async def step(self, step, context):",
      "        started = time.monotonic()",
      "        tool = self.tools.get(step.tool)",
      "        if tool is None:",
      "            raise UnknownTool(step.tool)",
      "",
      "        result = await tool(**step.args)",
      "        self.memory.append({\"step\": step.name, \"result\": result})",
      "        self.trace.append((step.name, time.monotonic() - started))",
      "        return result",
      "",
      "    async def recall(self, query: str, k: int = 8) -> list[dict]:",
      "        vector = await embed(query)",
      "        hits = await self.index.search(vector, k)",
      "        ranked = await self.rerank(query, hits)",
      "        return [h for h in ranked if h.score > 0.42]",
      "",
      "    def plan(self, task: str, context: list[dict]) -> list[Step]:",
      "        prompt = self.render_plan_prompt(task, context)",
      "        return self.model.parse(prompt, schema=Step)",
      "",
      "    async def summarize(self, results=None) -> str:",
      "        results = results or self.memory",
      "        prompt = self.render_summary_prompt(results)",
      "        return await self.model.complete(prompt)",
      "",
      "    async def retry(self, step, backoff: float = 0.4) -> str:",
      "        await asyncio.sleep(backoff)",
      "        return await self.step(step, self.memory)",
      "",
      "    def verify(self, step, observation) -> bool:",
      "        return self.validator.check(step.expect, observation)",
      "",
      "    @property",
      "    def steps_used(self) -> int:",
      "        return len(self.memory)"
    ],

    // 项目 C：工程工具 · 混合栈（SQL / Docker / 前端）
    infra: [
      "CREATE TABLE orders (",
      "  id BIGINT PRIMARY KEY,",
      "  tenant_id BIGINT NOT NULL,",
      "  status VARCHAR(24) NOT NULL,",
      "  created_at TIMESTAMP DEFAULT now()",
      ");",
      "",
      "CREATE INDEX idx_orders_tenant",
      "  ON orders (tenant_id, created_at DESC);",
      "",
      "SELECT id, name, score",
      "  FROM candidates",
      " WHERE tenant_id = ?",
      "   AND created_at > ?",
      "   AND status IN ('ready', 'review')",
      " ORDER BY score DESC, id ASC",
      " LIMIT 20;",
      "",
      "WITH ranked AS (",
      "  SELECT id, ROW_NUMBER() OVER (",
      "    PARTITION BY tenant_id ORDER BY score DESC",
      "  ) AS rn",
      "  FROM candidates",
      ")",
      "SELECT * FROM ranked WHERE rn <= 50;",
      "",
      "UPDATE orders SET status = 'expired'",
      " WHERE status = 'draft'",
      "   AND created_at < now() - interval '30 day';",
      "",
      "INSERT INTO audit_log (order_id, action, at)",
      "VALUES (?, 'submit', now())",
      "  ON CONFLICT (order_id) DO UPDATE",
      "    SET action = EXCLUDED.action;",
      "",
      "FROM node:20-alpine AS build",
      "WORKDIR /app",
      "COPY package*.json ./",
      "RUN npm ci --omit=dev",
      "RUN npm run build",
      "",
      "FROM nginx:1.27-alpine",
      "COPY --from=build /app/dist /usr/share/nginx/html",
      "COPY nginx.conf /etc/nginx/conf.d/default.conf",
      "EXPOSE 80",
      "CMD [\"nginx\", \"-g\", \"daemon off;\"]",
      "",
      "const cache = new Map()",
      "",
      "export function set(key, value, ttl = 60000) {",
      "  const expires = Date.now() + ttl",
      "  cache.set(key, { value, expires })",
      "}",
      "",
      "export function get(key) {",
      "  const hit = cache.get(key)",
      "  if (!hit) return null",
      "  if (hit.expires < Date.now()) return null",
      "  return hit.value",
      "}",
      "",
      "export async function retry(fn, times = 3) {",
      "  for (let i = 0; i < times; i++) {",
      "    try { return await fn() } catch (err) {",
      "      if (i === times - 1) throw err",
      "    }",
      "  }",
      "}"
    ]
  };

  /* ------------------------------------------------------------ 工具函数 */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------ 选行 */
  /* 立面上要的是「均匀的排布节奏」，不是一份能编辑的源文件。
     原始源码里的格式在小字号下全是噪点：
       · 空行、只有大括号/标点的行        → 立面被戳出空洞
       · 极短的行（} / ) / ;）            → 看着像碎屑
       · 参差不齐的长行                    → 右边缘犬牙交错
       · 逐级递进的缩进                    → 左边缘锯齿
     这里只做「挑选 + 归一化」，不改写的代码内容：
       · 丢掉空行 / 纯标点行 / 过短 / 过长
       · 缩进压成 0 / 2 / 4 三档，左边缘因此只有三个整齐的起点
     过长的行直接不要，而不是截断 —— 截断会切出 "vo" "klass" 这种半个词。 */
  function curateLines(lines) {
    var MIN = 22, MAX = 54;
    var onlyPunct = /^[{}()\[\];,.<>=+\-*/&#@!?|"'`~^%$:\\\s]+$/;
    var out = [];

    for (var i = 0; i < lines.length; i++) {
      var raw = String(lines[i]).replace(/\s+$/, "");
      var body = raw.replace(/^\s+/, "");
      if (!body) continue;                      // 空行
      if (onlyPunct.test(body)) continue;       // 纯括号 / 标点

      var indent = raw.length - body.length;
      var lead = indent >= 8 ? "    " : (indent >= 4 ? "  " : "");
      var text = lead + body;

      if (text.length < MIN || text.length > MAX) continue;
      out.push(text);
    }
    return out;
  }

  /* =================================================================== */
  window.CodeCity = function (canvas, options) {
    var self = this;
    var opt = options || {};

    var state = {
      buildProgress: 0,
      playbackState: "idle",
      hoverProjectId: null,
      selectedProjectId: null,
      reduced: false,
      duration: 3.2,
      suspended: false,
      quality: opt.quality || "medium",
      projects: opt.projects || []
    };

    var renderer, scene, camera, clock;
    var cityGroup;
    var rafId = null, isRunning = false, visible = true;
    var atlas = null;
    var textMesh = null, coreMesh = null, anchor = null, pathLine = null;
    var instanceData = null;      // 每个行位的身份与起止
    var projectIdList = [];       // 项目 id → 索引
    var clusterAnchors = [];      // 每个项目建筑群的底部锚点
    var destroyed = false, io = null, compact = innerWidth <= 820, towers = [];
    var pathDot = null, pathPoints = [], pathTravel = 1, effectiveProject = null;
    var raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(), pointerStart = null;
    var cameraShift = 0, cameraShiftTarget = 0, lastFrame = 0, phaseElapsed = 0;

    /* ------------------------------------------------------- 逐行代码图集 */
    /* 关键：面片只取「墨迹带」，不取整行。
       22px 等宽字的墨迹盒（上伸部+下伸部）约 26px，行高必须 ≥ 它，
       否则相邻行会在图集里叠在一起 —— 屏幕上就是每个字下面拖一截残影。
       行距由世界坐标的 lineH 控制，与图集行高无关，所以放大 rowH 不会让立面变稀。 */
    function buildAtlas(blocks) {
      var COL_W = 1024, COLS = 3;              // 列宽只要装得下最长的一行（22px × 62 字符 ≈ 820px）
      var W = COL_W * COLS, H = 2048;
      var rowH = 30;
      var fontSize = 22;
      var inkTop = 3, inkBot = 27;             // 行内墨迹带，上下各留 3px 缓冲
      var inkH = inkBot - inkTop;
      var baseOffset = 21;                     // alphabetic 基线在行内的位置

      var cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      var ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      ctx.font = fontSize + 'px "JetBrains Mono","Cascadia Mono",Consolas,monospace';
      ctx.textBaseline = "alphabetic";         // 固定基线，各行的墨迹位置才一致
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";

      var pad = 8;
      var rowsPerCol = Math.floor(H / rowH);
      var capacity = rowsPerCol * COLS;
      var meta = [];
      var ranges = {};

      var slot = 0;
      Object.keys(blocks).forEach(function (key) {
        var lines = curateLines(blocks[key]);
        ranges[key] = { start: slot, end: slot };
        lines.forEach(function (text) {
          if (slot >= capacity) return;
          var col = Math.floor(slot / rowsPerCol);
          var r = slot % rowsPerCol;
          var x = col * COL_W + pad;

          ctx.fillText(text, x, r * rowH + baseOffset);
          var w = Math.max(1, ctx.measureText(text).width);

          meta.push({
            u0: (col * COL_W) / W,
            u1: (col * COL_W + Math.min(COL_W, pad * 2 + w)) / W,
            v0: (r * rowH + inkTop) / H,
            v1: (r * rowH + inkBot) / H,
            aspect: w / inkH,            // 宽高比按墨迹高度算，不是按行高
            text: text
          });
          slot++;
          ranges[key].end = slot;
        });
      });

      var tex = new THREE.CanvasTexture(cv);
      // 关掉 mipmap：图集里每条代码只占很小的高度，多级渐远会把细笔画的
      // 覆盖率平均掉，远处直接消失。改用着色器里按深度做透明度衰减来收远景。
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
      tex.needsUpdate = true;

      return { texture: tex, meta: meta, ranges: ranges, width: W, height: H, rowH: rowH };
    }

    /* ---------------------------------------------- 手排城市：街谷 + 楼群 */
    /* 单位是「世界单位」；街道沿 -Z 向消失点延伸，楼分列两侧 */
    function buildLayout(projects) {
      var out = [], clusters = [];
      var defs = compact ? [
        {x:-10,z:4,w:7.8,d:7,h:20}, {x:9,z:-3,w:8.4,d:7.6,h:24}, {x:-1,z:-20,w:8,d:7.6,h:17},
        {x:-19,z:-20,w:6,d:6,h:15}, {x:19,z:-25,w:6,d:6,h:14}
      ] : [
        {x:-12,z:7,w:9,d:8.4,h:25}, {x:12,z:0,w:8.6,d:8.4,h:22}, {x:-1,z:-26,w:8.8,d:8,h:20},
        {x:-23,z:-28,w:7,d:7,h:18}, {x:23,z:-28,w:7,d:7,h:21}
      ];
      function add(x,z,w,d,h,index,block,scenery,seed) {
        out.push({x:x,z:z,w:w,d:d,h:h,projectIndex:index,block:block,scenery:scenery,seed:seed,lineH:compact?.58:(scenery?.68:.48)});
      }
      projects.slice(0,5).forEach(function(project,i){
        var t=defs[i], stack=(project.stack||[]).join(' ').toLowerCase();
        var block=/python|llm|agent/.test(stack)?'python':/java|spring/.test(stack)?'java':'infra';
        clusters.push({x:t.x,z:t.z,h:t.h});
        add(t.x,t.z,t.w,t.d,t.h,i,block,false,977*(i+1));
        if(!compact && i<3) {
          add(t.x+(i===0?-9:i===1?9:7),t.z-11,t.w*.77,t.d*.84,t.h*.66,i,block,false,977*(i+1)+131);
          if(i<2)add(t.x,t.z-14,t.w*.83,t.d*.82,t.h*.78,i,block,false,977*(i+1)+263);
        }
      });
      if(!compact) {
        // 低体量近景只框住街道，不再遮住作品主体。
        add(-29,17,9,9,12,-1,'infra',true,41);add(29,12,8,9,10,-1,'infra',true,42);
        [[-22,-48,8,8,24],[-9,-51,9,9,31],[8,-53,8,9,28],[23,-49,8,8,22],[-31,-62,8,8,18],[-15,-70,10,10,29],[4,-72,10,9,35],[26,-68,10,10,27]].forEach(function(t,i){add(t[0],t[1],t[2],t[3],t[4],-1,'infra',true,500+i);});
      } else {
        add(-15,-36,8,7,19,-1,'infra',true,501);add(12,-38,8,7,23,-1,'infra',true,502);
      }
      towers=out;
      return {towers:out,lineH:compact?.58:.48,clusters:clusters};
    }

    /* ------------------------------------------- 把代码行铺到楼体各个面上 */
    /* 返回每个行位的：目标位姿、起始位姿、项目归属、阶段延迟 */
    function layoutLines(layout) {
      var rand = mulberry32(20261010);
      var out = [];

      layout.towers.forEach(function (t) {
        var halfW = t.w / 2, halfD = t.d / 2;
        var r = mulberry32(t.seed);
        var lineH = t.lineH || layout.lineH;   // 逐楼行距：近景细、远景粗

        // 四个立面：[法线轴, 面宽, 面的中心偏移, 朝向角, 亮度]
        var faces = [
          { axis: "z", sign: 1,  width: t.w, ox: 0,      oz: halfD,  rot: 0,             lit: 1.00 },  // 正面（朝相机）
          { axis: "x", sign: 1,  width: t.d, ox: halfW,  oz: 0,      rot: Math.PI / 2,   lit: 0.64 },  // 右侧
          { axis: "x", sign: -1, width: t.d, ox: -halfW, oz: 0,      rot: -Math.PI / 2,  lit: 0.42 },  // 左侧
          { axis: "z", sign: -1, width: t.w, ox: 0,      oz: -halfD, rot: Math.PI,       lit: 0.22 }   // 背面
        ];

        // 这一栋楼从自己代码块的哪一行开始读；转角处接着往下读，
        // 所以四面连起来像读一个真实文件的一段，而不是随机拼贴
        var range = atlas.ranges[t.block] || atlas.ranges.infra || { start: 0, end: atlas.meta.length };
        var span = Math.max(1, range.end - range.start);
        var cursor = Math.floor(r() * span);

        faces.forEach(function (f, fi) {
          var rows = Math.floor((t.h - 0.7) / lineH);
          // 面片高度 = 行距。面片现在只覆盖墨迹带，所以字形实占 92% 行距 ——
          // 密度由这里决定，与图集行高无关
          var h = lineH;
          var maxW = f.width - 0.4;

          for (var row = 0; row < rows; row++) {
            var meta = atlas.meta[range.start + ((cursor + row) % span)];
            if (!meta) continue;

            var uw = meta.u1 - meta.u0;
            var uh = meta.v1 - meta.v0;
            var naturalW = h * meta.aspect;
            var w = naturalW;

            // 比立面还长的行：不缩小字形（那会让立面忽大忽小），
            // 而是照真实情况截断 —— 只取左边一段，字高保持一致
            if (naturalW > maxW) {
              uw *= maxW / naturalW;
              w = maxW;
            }

            // 归一化缩进后左边缘只有三个起点，不再加抖动 —— 齐才好看
            var u = -f.width / 2 + 0.2 + w / 2;
            var y = 0.35 + row * lineH;

            var tx, tz, nx, nz;
            if (f.axis === "z") {
              tx = t.x + u; tz = t.z + f.oz; nx = 0; nz = f.sign;
            } else {
              tx = t.x + f.ox; tz = t.z + u; nx = f.sign; nz = 0;
            }
            // 稍微离开墙面，避免与体块打架
            tx += nx * 0.04; tz += nz * 0.04;

            out.push({
              proj: t.projectIndex,
              faceLit: f.lit * (t.scenery ? 0.55 : 1),
              target: { x: tx, y: y, z: tz },
              rot: f.rot,
              w: w, h: h,
              uo: [meta.u0, meta.v0],
              us: [uw, uh],
              // 起始位置：在楼体上方与四周散落
              source: {
                x: tx + (r() - 0.5) * 5,
                y: y + 3 + r() * 5,
                z: tz + 1 + r() * 3
              },
              // 阶段延迟与「楼层 + 面」相关，不是每个字各自随机
              delay: clamp(0.02 + (row / Math.max(1, rows)) * 0.37 + fi * 0.025 + r() * 0.025, 0, 0.72),
              bend: (r() - 0.5) * 2.4
            });
          }
          cursor += rows;                  // 转角后接着读
        });

        // 屋顶：按行铺满。单行代码的宽高比约 20:1，几乎占满整个屋顶宽度，
        // 所以不能按固定列数排 —— 要一行一行塞，塞不下再换行。
        var h2 = lineH * 0.49;                    // 比立面小一档，屋顶才铺得开
        var rowPitch = h2 * 1.55;
        var roofRows = Math.max(3, Math.floor((t.d - 1.1) / rowPitch));
        var z0 = -t.d / 2 + 0.55;
        var xEnd = t.w / 2 - 0.3;
        var roofIndex = 0;

        for (var rr = 0; rr < roofRows; rr++) {
          var zz = z0 + rr * rowPitch;
          var xx = -t.w / 2 + 0.4;

          while (xx < xEnd) {
            var meta2 = atlas.meta[range.start + ((cursor + roofIndex) % span)];
            roofIndex++;
            if (!meta2) break;

            var w2 = h2 * meta2.aspect;
            if (xx + w2 > xEnd) break;             // 这一行塞不下了，换下一行

            out.push({
              proj: t.projectIndex,
              faceLit: 0.74 * (t.scenery ? 0.5 : 1),   // 屋顶受光，比侧面亮
              target: { x: t.x + xx + w2 / 2, y: t.h + 0.05, z: t.z + zz },
              rot: 0,
              pitch: -Math.PI / 2,        // 绕 X 放平 —— 屋顶的字躺在楼顶上
              w: w2, h: h2,
              uo: [meta2.u0, meta2.v0],
              us: [meta2.u1 - meta2.u0, meta2.v1 - meta2.v0],
              source: {
                x: t.x + xx + w2 / 2 + (r() - .5) * 3,
                y: t.h + 3 + r() * 4,
                z: t.z + zz + 1 + r() * 3
              },
              delay: clamp(0.48 + (rr / roofRows) * 0.13 + r() * 0.025, 0, 0.78),
              bend: (r() - 0.5) * 2.0
            });

            xx += w2 + 0.22;                       // 行内接着排
          }
        }
      });

      return out;
    }

    /* ------------------------------------------------------------ 体块核心 */
    /* 实心楼体：负责遮挡与体量；文字只在它外面一点点 */
    function buildCores(layout) {
      var geo = new THREE.BoxGeometry(1, 1, 1);
      var mat = new THREE.MeshBasicMaterial({ color: COL.ink });
      var mesh = new THREE.InstancedMesh(geo, mat, layout.towers.length);
      var m = new THREE.Matrix4();

      layout.towers.forEach(function (t, i) {
        m.compose(
          new THREE.Vector3(t.x, t.h / 2, t.z),
          new THREE.Quaternion(),
          new THREE.Vector3(t.w, t.h, t.d)
        );
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      return mesh;
    }

    /* ------------------------------------------------------- 文字实例网格 */
    function buildTextMesh(rows) {
      var base = new THREE.PlaneGeometry(1, 1);
      var geo = new THREE.InstancedBufferGeometry();
      geo.index = base.index;
      geo.setAttribute("position", base.getAttribute("position"));
      geo.setAttribute("uv", base.getAttribute("uv"));
      geo.instanceCount = rows.length;

      var n = rows.length;
      var aOffset = new Float32Array(n * 3);
      var aScale = new Float32Array(n * 2);
      var aRot = new Float32Array(n);
      var aPitch = new Float32Array(n);
      var aUvOff = new Float32Array(n * 2);
      var aUvScale = new Float32Array(n * 2);
      var aTint = new Float32Array(n);
      var aProj = new Float32Array(n);
      var aReveal = new Float32Array(n);

      // 起始状态全部用「散落」位置
      for (var i = 0; i < n; i++) {
        var r = rows[i];
        aOffset[i * 3] = r.source.x;
        aOffset[i * 3 + 1] = r.source.y;
        aOffset[i * 3 + 2] = r.source.z;
        aScale[i * 2] = r.w;
        aScale[i * 2 + 1] = r.h;
        aRot[i] = r.rot;
        aPitch[i] = r.pitch || 0;
        aUvOff[i * 2] = r.uo[0];
        aUvOff[i * 2 + 1] = r.uo[1];
        aUvScale[i * 2] = r.us[0];
        aUvScale[i * 2 + 1] = r.us[1];
        aTint[i] = r.faceLit;
        aProj[i] = r.proj;
      }

      geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(aOffset, 3));
      geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(aScale, 2));
      geo.setAttribute("aRot", new THREE.InstancedBufferAttribute(aRot, 1));
      geo.setAttribute("aPitch", new THREE.InstancedBufferAttribute(aPitch, 1));
      geo.setAttribute("aUvOff", new THREE.InstancedBufferAttribute(aUvOff, 2));
      geo.setAttribute("aUvScale", new THREE.InstancedBufferAttribute(aUvScale, 2));
      geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(aTint, 1));
      geo.setAttribute("aProj", new THREE.InstancedBufferAttribute(aProj, 1));
      geo.setAttribute("aReveal", new THREE.InstancedBufferAttribute(aReveal, 1));

      var mat = new THREE.ShaderMaterial({
        uniforms: {
          uAtlas: { value: atlas.texture },
          uFogColor: { value: new THREE.Vector3(COL.fog[0], COL.fog[1], COL.fog[2]) },
          uFogNear: { value: 52.0 },
          uFogFar: { value: 165.0 },
          uNear: { value: new THREE.Vector3(COL.textNear[0], COL.textNear[1], COL.textNear[2]) },
          uWarm: { value: new THREE.Vector3(0.875, 0.651, 0.416) },
          uActive: { value: -99.0 },     // 选中的项目索引
          uHover: { value: -99.0 },
          uHasActive: { value: 0.0 },
          uGain: { value: 1.35 },        // 亮度增益：图集字形在小尺寸下 alpha 偏低
          uOpacity: { value: 1.0 }
        },
        vertexShader: [
          "attribute vec3 aOffset;",
          "attribute vec2 aScale;",
          "attribute float aRot;",
          "attribute float aPitch;",
          "attribute vec2 aUvOff;",
          "attribute vec2 aUvScale;",
          "attribute float aTint;",
          "attribute float aProj;",
          "attribute float aReveal;",
          "varying vec2 vUv;",
          "varying float vTint;",
          "varying float vProj;",
          "varying float vDepth;",
          "varying float vReveal;",
          "void main() {",
          "  vUv = uv * aUvScale + aUvOff;",
          "  vTint = aTint;",
          "  vProj = aProj;",
          "  vReveal = aReveal;",
          "  vec3 p = vec3(position.x * aScale.x * (0.65 + 0.35 * aReveal), position.y * aScale.y, 0.0);",
          // 先绕 X 放平（屋顶的文字要躺在楼顶上），再绕 Y 转到这个面的朝向
          "  float cp = cos(aPitch), sp = sin(aPitch);",
          "  p = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);",
          "  float c = cos(aRot), s = sin(aRot);",
          "  vec3 rp = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);",
          "  vec4 mv = viewMatrix * vec4(rp + aOffset, 1.0);",
          "  vDepth = -mv.z;",
          "  gl_Position = projectionMatrix * mv;",
          "}"
        ].join("\n"),
        fragmentShader: [
          "uniform sampler2D uAtlas;",
          "uniform vec3 uFogColor;",
          "uniform float uFogNear;",
          "uniform float uFogFar;",
          "uniform vec3 uNear;",
          "uniform vec3 uWarm;",
          "uniform float uActive;",
          "uniform float uHover;",
          "uniform float uHasActive;",
          "uniform float uGain;",
          "uniform float uOpacity;",
          "varying vec2 vUv;",
          "varying float vTint;",
          "varying float vProj;",
          "varying float vDepth;",
          "varying float vReveal;",
          "void main() {",
          "  vec4 t = texture2D(uAtlas, vUv);",
          "  if (t.a < 0.05) discard;",
          "  float isActive = step(abs(vProj - uActive), 0.5) * uHasActive;",
          "  float isHover  = step(abs(vProj - uHover), 0.5);",
          // 选中：提亮并偏暖；其余：整体压暗，但天际线仍可辨认
          "  float dim = mix(1.0, 0.76, uHasActive * (1.0 - isActive));",
          "  float lit = vTint * dim * mix(1.0, 1.15, isActive) * mix(1.0, 1.08, isHover);",
          "  vec3 base = mix(uNear, uWarm, isActive * 0.62 + isHover * 0.18);",
          "  vec3 c = base * lit * uGain * t.rgb;",
          "  float f = smoothstep(uFogNear, uFogFar, vDepth);",
          "  c = mix(c, uFogColor * t.a, f);",
          "  c = c / (1.0 + c * 0.2);",
          "  gl_FragColor = vec4(c, t.a * uOpacity * smoothstep(0.0, 0.25, vReveal) * (1.0 - f * 0.82));",
          "}"
        ].join("\n"),
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide
      });

      var mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      return { mesh: mesh, geo: geo, mat: mat };
    }

    /* --------------------------------------------------------------- 场景 */
    function init() {
      if (!canvas || !canvas.getContext) return false;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          alpha: false,
          antialias: state.quality !== "low",
          powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.5));
        renderer.setClearColor(COL.bg, 1);

        scene = new THREE.Scene();

        var w = Math.max(1, canvas.clientWidth || 800);
        var h = Math.max(1, canvas.clientHeight || 600);
        camera = new THREE.PerspectiveCamera(46, w / h, 0.5, 400);
        applyCamera(0);

        cityGroup = new THREE.Group();
        scene.add(cityGroup);
        clock = new THREE.Clock();

        atlas = buildAtlas(CODE_BLOCKS);

        // 唯一暖色锚点：立在街谷里的一个光点
        anchor = makeAnchor();
        anchor.position.set(0, 0.9, 10);
        scene.add(anchor);
        pathDot = new THREE.Sprite(anchor.material.clone());
        pathDot.scale.setScalar(.65);
        scene.add(pathDot);
        makeStreet();

        return true;
      } catch (e) {
        console.error("Code City 初始化失败:", e);
        return false;
      }
    }

    function applyCamera(p) {
      if(!camera)return;
      var aspect=camera.aspect||1,tanV=Math.tan(camera.fov*Math.PI/360);
      var width=compact?44:76,height=compact?40:56;
      var distance=Math.max(compact?65:82,width/(2*tanV*aspect),height/(2*tanV));
      var target=new THREE.Vector3(compact?0:-1,compact?11:12,compact?-10:-18);
      var dir=new THREE.Vector3(compact?.10:.18,compact?.45:.43,1).normalize();
      camera.position.copy(target).addScaledVector(dir,distance+(1-p)*1.2);
      camera.position.x+=cameraShift;
      camera.lookAt(target);camera.updateMatrixWorld();
    }
    function makeStreet() {
      var values=[];
      for(var z=14;z>=-84;z-=7)values.push(-4,.02,z,4,.02,z);
      [-4,0,4].forEach(function(x){values.push(x,.02,18,x,.02,-85);});
      var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(values,3));
      var mat=new THREE.LineBasicMaterial({color:0x607d90,transparent:true,opacity:.13});
      scene.add(new THREE.LineSegments(geo,mat));
    }

    function makeAnchor() {
      var c = document.createElement("canvas");
      c.width = c.height = 128;
      var g = c.getContext("2d");
      var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,242,220,0.95)");
      grd.addColorStop(0.06, "rgba(240,190,130,0.85)");
      grd.addColorStop(0.24, "rgba(223,166,106,0.22)");
      grd.addColorStop(1, "rgba(223,166,106,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);

      var tex = new THREE.CanvasTexture(c);
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      spr.scale.set(1.9, 1.9, 1);
      return spr;
    }

    /* ------------------------------------------------ 选中项目：暖色路径 */
    /* 从街谷里的暖点连到选中建筑群的底部；只在有选中/hover 时可见 */
    function buildPath() {
      var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18),3));
      var mat=new THREE.LineBasicMaterial({color:COL.warm,transparent:true,opacity:0,depthWrite:false});
      var line=new THREE.Line(geo,mat);line.frustumCulled=false;cityGroup.add(line);
      pathLine={line:line,mat:mat,geo:geo};
    }
    function updatePath(idx) {
      if(!pathLine)return;
      if(idx<0||!clusterAnchors[idx]){pathLine.mat.opacity=0;pathDot.visible=false;return;}
      var a=clusterAnchors[idx];
      pathPoints=[new THREE.Vector3(0,.9,10),new THREE.Vector3(0,.9,0),new THREE.Vector3(0,.9,a.z+7),new THREE.Vector3(a.x*.45,.9,a.z+7),new THREE.Vector3(a.x,.9,a.z+7),new THREE.Vector3(a.x,.9,a.z+4)];
      var arr=pathLine.geo.attributes.position;
      pathPoints.forEach(function(p,i){arr.setXYZ(i,p.x,p.y,p.z);});arr.needsUpdate=true;pathLine.geo.computeBoundingSphere();
      pathLine.mat.opacity=.58;pathDot.visible=true;
      pathDot.position.copy(pathPoints[state.reduced ? pathPoints.length-1 : 0]);
    }
    function disposeGroup(group) {
      group.children.slice().forEach(function(o){group.remove(o);if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
    }
    function rebuild() {
      disposeGroup(cityGroup);
      var layout=buildLayout(state.projects);
      coreMesh=buildCores(layout);cityGroup.add(coreMesh);
      var rows=layoutLines(layout), cap=compact?4200:10000;
      var step=Math.max(1,rows.length/cap), kept=[];
      for(var i=0;i<rows.length;i+=step)kept.push(rows[Math.floor(i)]);
      instanceData=kept;textMesh=buildTextMesh(kept);cityGroup.add(textMesh.mesh);
      projectIdList=state.projects.slice(0,5).map(function(p){return p.id;});clusterAnchors=layout.clusters;
      buildPath();updateInstances(state.buildProgress);refreshHighlight();
    }
    function updateInstances(progress) {
      if(!textMesh||!instanceData)return;
      var geo=textMesh.geo,off=geo.attributes.aOffset,rot=geo.attributes.aRot,pitch=geo.attributes.aPitch,reveal=geo.attributes.aReveal;
      for(var i=0;i<instanceData.length;i++){
        var r=instanceData[i],q=clamp((progress-r.delay)/(1-r.delay),0,1),e=easeInOutCubic(q),arc=Math.sin(e*Math.PI)*r.bend*.3;
        off.setXYZ(i,lerp(r.source.x,r.target.x,e)+arc,lerp(r.source.y,r.target.y,e),lerp(r.source.z,r.target.z,e));
        rot.setX(i,r.rot*e);pitch.setX(i,(r.pitch||0)*e);reveal.setX(i,q);
      }
      off.needsUpdate=rot.needsUpdate=pitch.needsUpdate=reveal.needsUpdate=true;
    }
    function projIndex(id){var i=projectIdList.indexOf(id);return i<0?-99:i;}
    function refreshHighlight() {
      if(!textMesh)return;
      var id=state.hoverProjectId||state.selectedProjectId,idx=projIndex(id),u=textMesh.mat.uniforms;
      u.uActive.value=idx;u.uHover.value=-99;u.uHasActive.value=idx>-1?1:0;
      if(effectiveProject!==id){effectiveProject=id;pathTravel=state.reduced?1:0;}
      updatePath(idx);requestPaint();
    }
    function paint() {
      if(!renderer||!scene||!camera||destroyed)return;
      renderer.render(scene,camera);
      if(opt.onProjectPositions)opt.onProjectPositions(clusterAnchors.map(function(a,i){
        var v=new THREE.Vector3(a.x,a.h+1.3,a.z).project(camera);
        return {id:projectIdList[i],x:(v.x*.5+.5)*canvas.clientWidth,y:(-.5*v.y+.5)*canvas.clientHeight,visible:state.buildProgress>.78&&v.z<1&&Math.abs(v.x)<.96&&Math.abs(v.y)<.92};
      }));
    }
    function notify(){if(opt.onState)opt.onState(state.playbackState,state.buildProgress);}
    function finish() {
      state.buildProgress=1;state.playbackState='complete';updateInstances(1);applyCamera(1);notify();
      if(opt.onBuildComplete)opt.onBuildComplete();
    }
    function animate(now) {
      rafId=null;
      if(!isRunning)return;
      if(!visible||document.hidden||state.suspended||state.reduced||state.playbackState==='paused'){self.stop();paint();return;}
      var interval=1000/(compact?24:30);
      if(now-lastFrame>=interval){
        var dt=Math.min((now-lastFrame)/1000,.08);lastFrame=now;phaseElapsed+=dt;
        if(state.playbackState==='building'){
          state.buildProgress=Math.min(1,state.buildProgress+dt/state.duration);
          updateInstances(state.buildProgress);notify();
          if(state.buildProgress>=1)finish();
        }
        cameraShift+=(cameraShiftTarget-cameraShift)*Math.min(1,dt*5);applyCamera(state.buildProgress);
        if(textMesh)textMesh.mat.uniforms.uOpacity.value=.985+.015*Math.sin(phaseElapsed*.5);
        anchor.scale.setScalar(1.6+.035*Math.sin(phaseElapsed));
        if(pathDot&&pathPoints.length){
          pathTravel=Math.min(1,pathTravel+dt/1.2);
          var t=pathTravel*(pathPoints.length-1),ix=Math.min(pathPoints.length-2,Math.floor(t));
          pathDot.position.copy(pathPoints[ix]).lerp(pathPoints[ix+1],t-ix);
        }
        paint();
      }
      rafId=requestAnimationFrame(animate);
    }
    function updateLoop() {
      var go=visible&&!document.hidden&&!state.suspended&&!state.reduced&&state.playbackState!=='paused'&&state.playbackState!=='idle';
      if(go&&!isRunning){isRunning=true;lastFrame=performance.now();rafId=requestAnimationFrame(animate);}
      else if(!go)self.stop();
    }
    function requestPaint(){if(!isRunning)paint();updateLoop();}
    self.buildCity=function(duration){
      if(!self.ready||destroyed)return false;
      if(!textMesh)rebuild();
      state.duration=duration||3.2;state.buildProgress=0;state.playbackState='building';
      updateInstances(0);applyCamera(0);pathTravel=0;notify();
      if(state.reduced)finish();
      requestPaint();return true;
    };
    self.replay=function(){return self.buildCity(8);};
    self.start=updateLoop;
    self.stop=function(){isRunning=false;if(rafId!=null)cancelAnimationFrame(rafId);rafId=null;};
    self.setPaused=function(v){if(state.playbackState==='complete'||state.playbackState==='idle')return;state.playbackState=v?'paused':'building';notify();requestPaint();};
    self.setSuspended=function(v){state.suspended=v;updateLoop();if(!v)requestPaint();};
    self.resize=function(){
      if(!renderer||!camera)return;
      var next=innerWidth<=820,changed=next!==compact;compact=next;
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,compact?1:1.5));
      renderer.setSize(Math.max(1,canvas.clientWidth),Math.max(1,canvas.clientHeight),false);
      camera.aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);camera.updateProjectionMatrix();
      if(changed&&textMesh)rebuild();
      applyCamera(state.buildProgress);requestPaint();
    };
    self.setProjects=function(list){state.projects=list||[];if(textMesh)rebuild();};
    self.setHoverProject=function(id){if(state.hoverProjectId===id)return;state.hoverProjectId=id||null;refreshHighlight();};
    self.setSelectedProject=function(id){if(state.selectedProjectId===id)return;state.selectedProjectId=id||null;refreshHighlight();};
    self.setReduced=function(v){
      state.reduced=!!v;cameraShift=cameraShiftTarget=0;
      if(v&&(state.playbackState==='building'||state.playbackState==='paused'))finish();
      if(textMesh)textMesh.mat.uniforms.uOpacity.value=1;
      if(anchor)anchor.scale.setScalar(1.6);
      pathTravel=1;applyCamera(state.buildProgress);requestPaint();
    };
    self.getState=function(){return {progress:state.buildProgress,playback:state.playbackState,reduced:state.reduced,compact:compact,instances:instanceData?instanceData.length:0,memory:renderer?Object.assign({},renderer.info.memory):null};};
    function hit(e){
      if(!coreMesh||state.buildProgress<.8)return null;
      var r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
      raycaster.setFromCamera(mouse,camera);
      var hits=raycaster.intersectObject(coreMesh,false);
      if(!hits.length)return null;
      var tower=towers[hits[0].instanceId];return tower&&tower.projectIndex>=0?projectIdList[tower.projectIndex]:null;
    }
    var lastHover=null;
    function move(e){
      if(e.pointerType==='touch')return;
      var id=hit(e);canvas.style.cursor=id?'pointer':'default';
      if(id!==lastHover){lastHover=id;if(opt.onHover)opt.onHover(id);}
      if(!state.reduced){var r=canvas.getBoundingClientRect();cameraShiftTarget=((e.clientX-r.left)/r.width-.5)*1.4;updateLoop();}
    }
    function leave(){lastHover=null;canvas.style.cursor='default';cameraShiftTarget=0;if(opt.onHover)opt.onHover(null);updateLoop();}
    function down(e){pointerStart={x:e.clientX,y:e.clientY};}
    function cancel(){pointerStart=null;}
    function up(e){var start=pointerStart;pointerStart=null;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)return;var id=hit(e);if(id&&opt.onSelect)opt.onSelect(id);}
    function lost(e){e.preventDefault();self.stop();self.ready=false;if(opt.onError)opt.onError('context_lost');}
    function vis(){updateLoop();}
    self.destroy=function(){
      destroyed=true;self.stop();if(io)io.disconnect();
      window.removeEventListener('resize',self.resize);document.removeEventListener('visibilitychange',vis);
      canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('webglcontextlost',lost);
      var maps=new Set();if(scene)scene.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)maps.add(o.material.map);o.material.dispose();}});
      maps.forEach(function(t){t.dispose();});if(atlas)atlas.texture.dispose();if(renderer)renderer.dispose();
      renderer=scene=camera=textMesh=instanceData=null;
    };
    self.ready=init();
    if(!self.ready)return self;
    canvas.addEventListener('pointermove',move,{passive:true});canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointerdown',down,{passive:true});canvas.addEventListener('pointerup',up,{passive:true});canvas.addEventListener('pointercancel',cancel,{passive:true});canvas.addEventListener('webglcontextlost',lost);
    window.addEventListener('resize',self.resize);document.addEventListener('visibilitychange',vis);
    if('IntersectionObserver'in window){io=new IntersectionObserver(function(es){visible=es[0].isIntersecting;updateLoop();if(visible)requestPaint();});io.observe(canvas);}
    self.resize();return self;
  };
})();
