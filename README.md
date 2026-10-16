# Visual Lab · 原生前端视觉实现

零依赖、零构建的前端视觉实现集合：纯 HTML + CSS + 原生 JS（ES5 风格，`var` / 函数式）。
**双击 `index.html` 就能跑**，不需要 npm、打包器、框架或任何构建步骤。

> 仓库里只有视觉实现层。演示内容全部是虚构示例（`js/content.js`），不含任何真实项目、业务数据或个人信息。

---

## 里面有什么

| 装置 | 实现方式 | 入口文件 |
|---|---|---|
| **文字之海** | WebGL。文字预渲染成图集 + 实例化四边形；波浪位移、透视投影、深度雾化、指针抬升全在顶点着色器里。滚动驱动相机抬升、地平线上升、日出与色温由冷转暖 | `js/sea.js` `js/sea-shaders.js` |
| **文字光场**（降级版） | Canvas2D。按进深分行、行内抖动的 2D 词场，确定性种子保证每次布局一致 | `js/field.js` |
| **代码城市** | Three.js。逐行代码预渲染成图集，用 `InstancedBufferGeometry` 铺满每栋楼的四个立面与屋顶；每行保留稳定身份，从散落到落位分阶段汇聚 | `js/code-city.js` |
| **城市语义联动** | 悬停 / 选中 / 播放状态与项目数据共享同一个"有效项目"，暖色路径连到选中建筑群 | `js/city-integration.js` |
| **文字标志** | Canvas2D 轮廓采样：用图形轮廓约束字形位置，先排布可读关键词、再用小字符补足剪影 | `js/ai-symbols.js` `js/ai-symbol-masks.js` |
| **势阱地形** | Canvas2D 透视网格，指针牵引"势阱"使网格下陷扭转，一枚暖色光点沿螺旋轨道落入阱底 | `js/fx-terrain.js` |
| **图纸转场** | 以点击位置为中心展开三片"图纸"，把列表项变成详情页；装饰层不接收输入，路由不依赖动画完成 | `js/folio-transition.js` |
| **渲染与路由** | 一次 `innerHTML` 渲染全部区块；`#/project/<id>` hash 路由可直达；详情覆盖层用 `inert` + 焦点圈定 | `js/main.js` |
| **专属结构图** | 两个示例项目各有一张机制示意图，其余项目回退到通用四步流程 | `js/project-blueprints.js` |

## 工程特性

- **零依赖、零构建** —— 没有 npm、没有打包器、没有框架。`vendor/three.min.js` 是唯一的第三方库（MIT）。
- **分层降级** —— WebGL 不可用 → Canvas2D 词场 → 静态背景；Three.js 初始化失败 → 城市区切到静态阅读模式；每种装置都有自己的兜底路径。
- **尊重动效偏好** —— 系统 `prefers-reduced-motion` 会关掉滚动驱动动画与转场；页面右上角另有手动开关，选择记在 `localStorage`。
- **键盘可达** —— 跳转正文的 skip link、详情页焦点圈定、Esc 关闭、列表与工具卡支持方向键 / Home / End。
- **移动端** —— 断点覆盖到 360px，无横向溢出。

## 快速开始

```bash
# 方式一：直接双击 index.html

# 方式二：起本地服务（推荐，file:// 下个别浏览器会限制纹理与图集）
node server.mjs
# → http://127.0.0.1:5176
```

## 换成你自己的内容

**只改 `js/content.js`**：姓名、导航、项目、经历、技能、AI 工具说明、收尾文案全在里面。
视觉代码不需要动。

约定：

- `placeholder: true` 的条目会在页面上显示"示例"角标，填好真实内容后删掉那一行即可
- 留空字符串 `""` 的字段不显示
- `projects[].keywords` 同时是首屏光场的词源和项目筛选标签

## 目录结构

```
index.html            骨架（一个空 <main> 交给 JS 渲染）
server.mjs            零依赖静态服务（127.0.0.1:5176）

js/                   13 个文件
  content.js          ★ 全部示例内容（改内容只动这里）
  main.js             渲染与交互：导航、区块、详情页、路由
  sea.js + sea-shaders.js   WebGL 文字海
  field.js            2D 文字光场（降级层）
  code-city.js        Three.js 代码城市
  city-integration.js 城市与项目数据联动
  fx-core.js          滚动进度、指针聚光、开场动画
  fx-terrain.js       技能区势阱地形
  folio-transition.js 图纸转场
  ai-symbols.js + ai-symbol-masks.js   文字标志与轮廓源
  project-blueprints.js   示例项目的专属结构图

css/                  13 张样式表
  style.css           基础变量与页眉
  art-direction.css   总控层（注意：它靠特异性生效，不是靠加载顺序）
  其余                 各区块、各特效、响应式

assets/
  ai-symbols/         三个 AI 工具标识（见下方署名）
  favicon.svg         折叠 L 图形母题

vendor/three.min.js   three.js r160（MIT）
```

## 第三方资源与署名

| 资源 | 来源 | 说明 |
|---|---|---|
| `vendor/three.min.js` | [three.js](https://threejs.org/) r160 | MIT License |
| `assets/ai-symbols/claude.png` | Claude 标识，© Anthropic | 指代性引用 |
| `assets/ai-symbols/chatgpt.png` | ChatGPT / OpenAI 标识，© OpenAI | 指代性引用 |
| `assets/ai-symbols/deepseek.svg` | DeepSeek 标识，© DeepSeek | 指代性引用 |

三个 AI 标识只用于说明"与这些工具协作过"这一件事，**不代表任何官方关联、赞助或背书**，商标归各自所有者。如果你的使用场景不同，请自行替换或移除。

## 许可

**非商用。** 可以自由学习、修改、用于个人与非商业项目，保留署名即可；商业用途需另行授权。详见 [LICENSE](LICENSE)。
