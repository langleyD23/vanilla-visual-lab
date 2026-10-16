/*
 * Visual Lab · 示例内容数据文件
 * ------------------------------------------------------------------
 * 开源版只包含视觉实现层，这里是一份虚构的示例内容，用来演示各区块与特效。
 * 换成你自己的内容：直接改这个文件，不需要动任何视觉代码。
 *
 * 约定：
 *   placeholder: true   → 页面上会显示“示例”角标，填入真实内容后删掉这一行即可
 *   留空字符串 ""       → 对应字段不显示
 *   projects[].keywords → 同时是首屏光场的词源，也是项目筛选标签
 */
window.SITE_CONTENT = {
  meta: {
    title: "Visual Lab · 前端视觉实现",
  },

  profile: {
    name: "Visual Lab",
    // 头像：填图片路径（如 "assets/avatar.jpg"）。留空则显示程序生成的抽象图形。
    avatar: "",
    role: "软件开发者",                      // 占位，请替换
    roleEn: "SOFTWARE DEVELOPER",
    headline: "把想法做成可运行的系统。",       // 占位，请替换
    headlineEn: "From intent to artifact.",
    intro: "这里是一两句话的自我介绍，说明你做什么、擅长什么、关注什么。",  // 占位，请替换
    // 滚动到首屏中段时出现的陈述句（占位，请替换）
    beat: { k: "FROM INTENT TO ARTIFACT", l1: "从一个想法，", l2: "到一件作品。" },
    // 文字之海里额外出现的概念词（会和项目关键词、技能一起出现）
    seaWords: ["intent", "context", "tool", "artifact", "构建", "检索", "执行", "记忆"],
    placeholder: true,
    primaryCta: { label: "查看项目", href: "#projects" },
    secondaryCta: { label: "了解经历", href: "#experience" },
  },

  // 导航顺序要与页面区块的渲染顺序一致：首页 → 项目 → 技能 → 经历
  sections: [
    { id: "home", no: "01", label: "首页", en: "Home" },
    { id: "projects", no: "02", label: "项目", en: "Projects" },
    { id: "skills", no: "03", label: "技能", en: "Skills" },
    { id: "experience", no: "04", label: "经历", en: "Experience" },
  ],

  projects: {
    title: "项目",
    lead: "每个项目按“问题 → 职责 → 方案 → 成果”展开。把鼠标移到某一行，或用键盘聚焦，可预览它的关键词结构。",
    items: [
      {
        id: "project-a",
        placeholder: true,
        no: "01",
        title: "示例项目 A",
        subtitle: "多源记录核对与合并",
        period: "2025 – 2026",
        type: "后端系统",
        status: "示例状态",
        role: "示例职责：这里写你在项目里负责的部分。",
        summary: "两个来源各自提交同一份记录，核对一致后才写入终态；不一致的记录留在待处理区。",
        problem: "两个来源对同一件事的描述可能不同。直接覆盖会丢信息，人工比对又跟不上量。",
        solution: "把「提交」和「生效」拆开：来源各自落库，再按固定顺序核对；一致才推进终态，不一致的进入待处理队列。",
        result: "示例内容，用于演示详情页排版、结构图与交互，不对应任何真实系统。",
        limits: "这里是「设计边界」的排版位置：写清方案不覆盖什么、后续怎么处理。",
        focus: "双边核对与终态一致性",
        contribution: "这里是「我负责的部分」在页面上的排版位置，示例文本。",
        stack: ["Java", "Spring Boot", "MySQL", "Redis"],
        keywords: ["Java", "Spring Boot", "MySQL", "Redis", "高并发"],
        links: [
          // { label: "GitHub", href: "https://..." },
        ],
        screenshot: "",                       // 填图片路径，如 "assets/a-cover.png"
        // 案例故事：标题、四步流程、另一条路径与要点（详情页"技术实现"里的核心视觉）
        caseStudy: {
          eyebrow: "RECONCILE / 01",
          title: "两份记录，如何合成一条可信结果？",
          intro: "先核对双方意见，再决定是否进入终态；不一致时不急着写入。",
          steps: [
            { title: "各自提交", desc: "两个来源独立落库" },
            { title: "双向核对", desc: "逐字段比对差异" },
            { title: "一致后写入", desc: "事务内推进终态" },
            { title: "归档记录", desc: "保留来源与变更" }
          ],
          branch: "不一致 → 留在待处理区 → 人工确认或重新提交；暂不写入终态。",
          insights: [
            { title: "重复提交", text: "状态检查加唯一约束，阻止同一条记录重复推进。" },
            { title: "并发更新", text: "按固定顺序加锁并刷新实体，协调写入与人工调整。" },
            { title: "权限边界", text: "只读角色可以查看，推进终态仍要求对应身份。" }
          ]
        },
        // 架构图：layers 自上而下；node.to 表示与下一层哪些节点相连（用于点击高亮）
        architecture: {
          layers: [
            { name: "接入层", nodes: [
              { id: "a1", label: "客户端", desc: "这里说明该模块的职责。", to: ["b1"] },
              { id: "a2", label: "网关", desc: "这里说明该模块的职责。", to: ["b1", "b2"] },
            ]},
            { name: "服务层", nodes: [
              { id: "b1", label: "业务服务", desc: "这里说明该模块的职责。", to: ["c1"] },
              { id: "b2", label: "任务调度", desc: "这里说明该模块的职责。", to: ["c1", "c2"] },
            ]},
            { name: "数据层", nodes: [
              { id: "c1", label: "MySQL", desc: "这里说明存储内容与取舍。", to: [] },
              { id: "c2", label: "Redis", desc: "这里说明缓存策略。", to: [] },
            ]},
          ],
        },
      },
      {
        id: "project-b",
        placeholder: true,
        no: "02",
        title: "示例项目 B",
        subtitle: "版本化的知识更新",
        period: "2024 – 2025",
        type: "AI Agent",
        status: "示例状态",
        role: "示例职责：这里写你在项目里负责的部分。",
        summary: "系统从对话里抽取候选信息，用户可以修正；旧来源或过期版本不能覆盖较新的有效记录。",
        problem: "抽取出来的信息可能来自较早的对话，用户后来纠正过，但旧候选在下一轮又被写回去了。",
        solution: "每条记录保留来源与版本：进入有效记录前先过一道版本校验，来源顺序不对或版本过期的候选直接止步。",
        result: "示例内容，用于演示详情页排版、结构图与交互，不对应任何真实系统。",
        limits: "这里是「设计边界」的排版位置：写清方案不覆盖什么、后续怎么处理。",
        focus: "来源留痕与版本校验",
        contribution: "这里是「我负责的部分」在页面上的排版位置，示例文本。",
        stack: ["Python", "LLM", "MCP", "FastAPI"],
        keywords: ["Python", "LLM", "Agent", "MCP", "检索"],
        links: [],
        screenshot: "",
        caseStudy: {
          eyebrow: "REVISION / 02",
          title: "用户已经纠正过的信息，不该被旧记录写回来。",
          intro: "每条记录保留来源与版本，可以更新，也可以由用户查看与修正。",
          steps: [
            { title: "完成对话", desc: "保留用户原始证据" },
            { title: "抽取候选", desc: "校验证据与结构" },
            { title: "版本校验", desc: "比较来源顺序与版本" },
            { title: "按需召回", desc: "依当前问题取用" }
          ],
          branch: "含义不明确 → 保留待确认；旧来源或过期版本 → 不覆盖较新的有效记录。",
          insights: [
            { title: "可追溯", text: "回答引用具体片段，区分原始页码与文档标注页码。" },
            { title: "可恢复", text: "暂停或删除后留下抑制记录，阻止旧候选重新生效。" },
            { title: "用户可控制", text: "记忆支持查看与修正，删除记忆不改写历史回复。" }
          ]
        },
        architecture: {
          layers: [
            { name: "交互层", nodes: [
              { id: "a1", label: "用户请求", desc: "这里说明该模块的职责。", to: ["b1"] },
            ]},
            { name: "编排层", nodes: [
              { id: "b1", label: "Agent 编排", desc: "这里说明该模块的职责。", to: ["c1", "c2"] },
              { id: "b2", label: "上下文管理", desc: "这里说明该模块的职责。", to: ["c2"] },
            ]},
            { name: "能力层", nodes: [
              { id: "c1", label: "工具调用", desc: "这里说明该模块的职责。", to: [] },
              { id: "c2", label: "检索 / 记忆", desc: "这里说明该模块的职责。", to: [] },
            ]},
          ],
        },
      },
      {
        id: "project-c",
        placeholder: true,
        no: "03",
        title: "示例项目 C",
        subtitle: "批量任务与产物导出",
        period: "2023 – 2024",
        type: "工程工具",
        status: "示例状态",
        role: "示例职责：这里写你在项目里负责的部分。",
        summary: "把重复的批处理流程收敛成一条命令：读取配置、执行任务、输出可核对的产物与报告。",
        problem: "同样的批量操作每次都要手工重复，出错后也很难追溯是哪一步的问题。",
        solution: "把流程拆成可重放的阶段，每阶段留下产物与日志；失败可以从任意阶段重跑，不必从头再来。",
        result: "示例内容，用于演示详情页排版与通用四步流程图，不对应任何真实系统。",
        limits: "这里是「设计边界」的排版位置：写清方案不覆盖什么、后续怎么处理。",
        focus: "可重放的批处理流程",
        contribution: "这里是「我负责的部分」在页面上的排版位置，示例文本。",
        stack: ["JavaScript", "Docker", "SQL"],
        keywords: ["JavaScript", "Docker", "自动化", "Git", "SQL"],
        links: [],
        screenshot: "",
        caseStudy: {
          eyebrow: "PIPELINE / 03",
          title: "一批任务跑完之后，怎么知道每一步都对？",
          intro: "把流程拆成阶段，每阶段留下可以复核的产物。",
          steps: [
            { title: "读取配置", desc: "校验输入与目标" },
            { title: "分阶段执行", desc: "每步独立可重跑" },
            { title: "留存产物", desc: "结果与日志一起落盘" },
            { title: "输出报告", desc: "汇总可核对的结果" }
          ],
          branch: "某阶段失败 → 保留已完成产物 → 从该阶段重跑，不必从头再来。",
          insights: [
            { title: "幂等", text: "同一阶段重复执行不会产生重复产物。" },
            { title: "可追溯", text: "每份产物对应一次执行记录与输入快照。" }
          ]
        },
        architecture: {
          layers: [
            { name: "入口", nodes: [
              { id: "a1", label: "命令行 / 界面", desc: "这里说明该模块的职责。", to: ["b1"] },
            ]},
            { name: "核心", nodes: [
              { id: "b1", label: "核心逻辑", desc: "这里说明该模块的职责。", to: ["c1"] },
            ]},
            { name: "输出", nodes: [
              { id: "c1", label: "产物 / 报告", desc: "这里说明该模块的职责。", to: [] },
            ]},
          ],
        },
      },
    ],
  },

  experience: {
    title: "经历",
    lead: "按时间倒序。点击条目可展开细节，并显示与它关联的项目。",
    items: [
      {
        placeholder: true,
        period: "2024 – 至今",
        title: "职位名称",
        org: "公司 / 组织",
        summary: "一句话说明这段经历的职责范围。",
        detail: "这里写更详细的内容：做了什么、产出什么、学到什么。",
        projectIds: ["project-a", "project-b"],
      },
      {
        placeholder: true,
        period: "2022 – 2024",
        title: "职位名称",
        org: "公司 / 组织",
        summary: "一句话说明这段经历的职责范围。",
        detail: "这里写更详细的内容。",
        projectIds: ["project-c"],
      },
      {
        placeholder: true,
        period: "2018 – 2022",
        title: "学校 / 专业",
        org: "教育背景",
        summary: "一句话说明学习方向。",
        detail: "",
        projectIds: [],
      },
    ],
  },

  skills: {
    title: "技能",
    lead: "点选文字标志，查看协作方式；选择技术栈，关联到具体作品。",
    aiTools: [
      {
        id: "claude", name: "Claude", no: "01", image: "assets/ai-symbols/claude.png",
        label: "组织与表达", color: "#df956d", placeholder: true,
        title: "把想法，组织成结构。",
        description: "从需求梳理到代码阅读，让零散信息成为可以讨论、实现和修改的方案。",
        steps: ["梳理需求", "组织实现", "检查表达"],
        note: "这里补充一次真实的协作：输入是什么、怎样迭代、最终由你完成了什么。",
        words: ["context", "prompt", "compose", "review", "structure", "function", "return", "const"]
      },
      {
        id: "gpt", name: "GPT", no: "02", image: "assets/ai-symbols/chatgpt.png",
        label: "推导与验证", color: "#e5e8e8", placeholder: true,
        title: "让思路，经过验证。",
        description: "围绕一个问题拆解条件、比较方案，再把判断落到可检查的代码与结果上。",
        steps: ["拆解问题", "比较方案", "验证结果"],
        note: "这里补充你的判断依据、验证方法，以及你对生成结果做过的修正。",
        words: ["reason", "import", "return", "verify", "async", "def", "class", "if"]
      },
      {
        id: "deepseek", name: "DeepSeek", no: "03", image: "assets/ai-symbols/deepseek.svg",
        label: "探索与迭代", color: "#c2d2df", placeholder: true,
        title: "把探索，推进到实现。",
        description: "从思路尝试到实现对照，在多轮迭代中保留有效部分，逐步逼近可用的方案。",
        steps: ["尝试思路", "实现对照", "迭代改进"],
        note: "这里补充一段实际的迭代过程，以及你的选择、修改与最终产出。",
        words: ["python", "execute", "class", "return", "async", "iterate", "def", "for"]
      }
    ],
    groups: [
      { name: "语言", items: ["Java", "Python", "JavaScript", "SQL"] },
      { name: "后端", items: ["Spring Boot", "FastAPI", "MySQL", "Redis", "Docker"] },
      { name: "AI / Agent", items: ["LLM", "Agent", "MCP", "检索"] },
      { name: "工程", items: ["高并发", "自动化", "Git"] },
    ],
  },

  closing: {
    title: "让想法，有迹可循。",
    lead: "从问题出发，在作品中留下答案。",
  },

  footer: "© 2026 Visual Lab",
};

