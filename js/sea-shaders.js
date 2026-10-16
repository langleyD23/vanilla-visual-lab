/*
 * 文字之海 · 着色器
 * 做法：文字图集 + 实例化四边形，波浪位移、透视、雾化、指针抬升都在顶点着色器里完成
 * 海面是空间化的文字：远处细密、近处粗大；滚动时相机抬升、地平线上升，色温由冷转暖。
 */
window.SeaShaders = {
  NW: 48,

  wordVS: [
    "precision highp float;",
    "attribute vec2 aCorner; attribute vec3 aPos; attribute float aIdx;",
    "uniform vec4 uRect[48]; uniform float uFocus[48]; uniform vec2 uAtlas;",
    "uniform float uTime, uTravel, uPitch, uCamH, uAsp, uTanH, uZ0, uZR, uSize;",
    "uniform vec2 uPtr; uniform float uPtrK;",
    "varying vec2 vUV; varying float vA; varying float vHot; varying float vX;",
    "vec3 proj(vec3 w, float cp, float sp) {",
    "  vec3 p = vec3(w.x, w.y - uCamH, w.z);",
    "  float d = -p.y * sp + p.z * cp;",
    "  float v = p.y * cp + p.z * sp;",
    "  return vec3(p.x / (uTanH * uAsp), v / uTanH, d);",
    "}",
    "void main() {",
    "  int id = int(aIdx + 0.5);",
    "  vec4 r = uRect[id];",
    "  float asp = ((r.z - r.x) * uAtlas.x) / ((r.w - r.y) * uAtlas.y);",
    "  float f = uFocus[id];",
    "  float z = uZ0 + mod(aPos.y - uTravel - uZ0, uZR);",
    "  float x = aPos.x;",
    "  float t = uTime;",
    "  float hw = 0.42 * sin(x * 0.21 + t * 0.55 + z * 0.11) + 0.24 * sin(z * 0.34 - t * 0.7 + x * 0.05);",
    "  float cp = cos(uPitch), sp = sin(uPitch);",
    "  vec3 c0 = proj(vec3(x, hw, z), cp, sp);",
    "  vec2 dd = (c0.xy / c0.z - uPtr) * vec2(uAsp, 1.0);",
    "  float lift = uPtrK * exp(-dot(dd, dd) * 14.0) * 1.1 + f * 0.55;",
    "  float H = uSize * (1.0 + 0.3 * f);",
    "  float W = H * asp;",
    "  float tilt = 0.95;",
    "  vec3 w = vec3(x + (aCorner.x - 0.5) * W,",
    "                hw + lift + aCorner.y * H * sin(tilt),",
    "                z + aCorner.y * H * cos(tilt));",
    "  vec3 q = proj(w, cp, sp);",
    "  gl_Position = vec4(q.xy, 0.0, q.z);",
    "  vUV = vec2(mix(r.x, r.z, aCorner.x), mix(r.w, r.y, aCorner.y));",
    "  float near = smoothstep(uZ0, uZ0 + 3.5, z);",
    "  float far = 1.0 - smoothstep(uZR * 0.28, uZR * 0.95, z - uZ0);",
    "  float tw = 0.7 + 0.3 * sin(aPos.z * 13.0 + t * 0.8);",
    "  vA = near * far * tw * (0.5 + 0.5 * f);",
    "  vHot = f; vX = c0.x / c0.z;",
    "}"
  ].join("\n"),

  wordFS: [
    "precision mediump float;",
    "uniform sampler2D uTex; uniform float uWarm, uSun, uSunX, uMoon;",
    "varying vec2 vUV; varying float vA; varying float vHot; varying float vX;",
    "void main() {",
    "  float a = texture2D(uTex, vUV).a;",
    "  vec3 cool = vec3(0.60, 0.69, 0.82);",
    // 暖的那一端：太阳给暖金，月亮给冷银蓝
    "  vec3 warmEnd = mix(vec3(0.90, 0.66, 0.42), vec3(0.66, 0.75, 0.92), uMoon);",
    "  float near = exp(-pow((vX - uSunX) * 1.3, 2.0));",
    "  vec3 col = mix(cool, warmEnd, clamp(uWarm * (0.25 + 0.75 * near), 0.0, 1.0));",
    "  vec3 hotC = mix(vec3(0.96, 0.78, 0.52), vec3(0.90, 0.95, 1.00), uMoon);",
    "  col = mix(col, hotC, vHot);",
    // 月光不像日光那样铺开，锚点附近的提亮要收着
    "  float boost = 1.0 + uSun * near * mix(0.9, 0.5, uMoon) + vHot * 0.8;",
    "  gl_FragColor = vec4(col * boost, a * vA);",
    "}"
  ].join("\n"),

  bgVS: "attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0.0, 1.0); }",

  bgFS: [
    "precision mediump float;",
    "uniform vec2 uRes; uniform float uHor, uSunE, uSunX, uWarm, uTime, uAsp, uMoon;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
    // 值噪声（两倍频）：只给月海边缘加不规则。
    // 用 Hoskins 的 fract 哈希而不是 sin 哈希 —— 手机端 mediump 是 fp16，sin(大数) 会烂掉。
    "float hash21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }",
    "float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y); }",
    "float fbm2(vec2 p){ return vn(p) * 0.65 + vn(p * 2.1 + 3.7) * 0.35; }",
    "float fbm3(vec2 p){ return vn(p) * 0.53 + vn(p * 2.1 + 3.7) * 0.28 + vn(p * 4.3 + 11.1) * 0.19; }",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  float up = uv.y - uHor;",
    // 夜空比黄昏更暗、更偏蓝
    "  vec3 ink = mix(vec3(0.043, 0.063, 0.082), vec3(0.026, 0.038, 0.060), uMoon);",
    "  vec3 skyT = mix(vec3(0.085, 0.115, 0.150), vec3(0.042, 0.058, 0.092), uMoon);",
    "  vec3 seaT = mix(vec3(0.070, 0.095, 0.125), vec3(0.034, 0.048, 0.072), uMoon);",
    "  vec3 col = mix(skyT, ink, smoothstep(0.0, 0.75, up));",
    "  if (up < 0.0) col = mix(seaT, ink, smoothstep(0.0, 0.9, -up));",
    // 月亮比太阳小一圈
    "  float rad = mix(0.090, 0.064, uMoon);",
    "  vec2 sp = vec2(uSunX * 0.5 + 0.5, uHor + rad * (-1.15 + 1.95 * uSunE));",
    "  vec2 d = (uv - sp) * vec2(uAsp, 1.0);",
    "  float r = length(d);",
    "  vec3 body = mix(vec3(0.95, 0.72, 0.50), vec3(0.90, 0.93, 0.99), uMoon);",
    // 光晕：太阳是铺开的一片暖光，月亮是紧贴盘面的一圈冷雾。
    // 月亮的衰减尺度必须小于月盘半径，否则盘面会被自己的光晕糊掉。
    "  float glowK = mix(3.4, 30.0, uMoon);",
    "  float glowA = mix((0.10 + 0.55 * uWarm) * (0.35 + 0.65 * uSunE), 0.15 * (0.30 + 0.70 * uSunE), uMoon);",
    "  col += body * exp(-r * glowK) * glowA * (up > 0.0 ? 1.0 : mix(0.55, 0.40, uMoon));",
    // 盘外再留一层高斯薄雾（只在月亮上），免得月盘像贴纸一样硬贴在天上
    "  col += body * exp(-pow(max(r - rad, 0.0) * 22.0, 2.0)) * mix(0.0, 0.07, uMoon) * (0.35 + 0.65 * uSunE);",
    "  float disc = (1.0 - smoothstep(rad - 0.0015, rad + 0.0015, r)) * smoothstep(-0.002, 0.002, up);",
    // 月面：盘坐标 mp（半径 = 1）里生成月海。
    // 亮高地是偏暖的象牙白，月海是偏冷的灰蓝；临边只收最外一圈，盘心压平，免得糊成一颗亮球。
    "  float limb = mix(1.0 - 0.34 * smoothstep(0.0, rad * 0.92, r),",
    "                    1.0 - 0.26 * pow(clamp(r / rad, 0.0, 1.0), 2.4), uMoon);",
    "  vec2 mp = d / rad;",
    "  float maria = 1.0;",
    // 月海不是几个圆斑，是连成一片、边缘被撞击撕碎的低反射区 —— 用三倍频噪声场生成，
    // 再叠五个高斯种子（4 个压暗 + 1 个把南部高地整体提亮）推成真实满月那副「月中人」的脸。
    "  if (uMoon > 0.5) {",
    "    vec2 g1 = mp - vec2(-0.62, 0.05);",
    "    vec2 g2 = mp - vec2(-0.30, 0.46);",
    "    vec2 g3 = mp - vec2( 0.30, 0.28);",
    "    vec2 g4 = mp - vec2( 0.68, 0.42);",
    "    vec2 g5 = mp - vec2(-0.10,-0.58);",
    "    float rf = length(mp);",
    "    float mf = fbm3(mp * 1.55 + 12.7);",
    "    mf += 0.30 * exp(-dot(g1, g1) * 2.6);",
    "    mf += 0.24 * exp(-dot(g2, g2) * 5.0);",
    "    mf += 0.21 * exp(-dot(g3, g3) * 5.2);",
    "    mf += 0.16 * exp(-dot(g4, g4) * 13.0);",
    "    mf -= 0.32 * exp(-dot(g5, g5) * 3.4);",
    "    mf -= 0.06 * mp.y;",
    // 亮边：把月海从盘缘往回推一点，让亮高地始终连成一整片，而不是一堆浮在暗底上的亮斑
    "    mf -= 0.14 * smoothstep(0.70, 1.00, rf);",
    "    float grain = fbm2(mp * 6.5 + 21.0);",
    "    maria = 1.0 - 0.42 * smoothstep(0.64, 0.76, mf);",
    "    maria *= (0.88 + 0.12 * fbm2(mp * 3.0 + 1.5)) * (0.94 + 0.12 * grain);",
    "  }",
    "  vec3 moonFace = mix(vec3(0.46, 0.49, 0.57), vec3(0.95, 0.94, 0.91), clamp(maria, 0.32, 1.06)) * limb;",
    "  vec3 face = mix(vec3(0.99, 0.84, 0.62), moonFace, uMoon);",
    "  col = mix(col, face, disc * clamp(uSunE * 1.4, 0.0, 1.0));",
    "  if (up < 0.0) {",
    // 水面反光：太阳是一片宽暖带，月亮是一条窄而碎的银路
    "    float dx = abs((uv.x - (uSunX * 0.5 + 0.5)) * uAsp);",
    "    float k = 1.0 + (-up) * mix(14.0, 22.0, uMoon);",
    "    float freq = mix(260.0, 330.0, uMoon);",
    "    float sw = mix(1.5, 2.3, uMoon);",
    "    float band = 0.55 + 0.45 * sin(uv.y * freq + uTime * mix(1.6, 2.2, uMoon) + sin(uv.x * 30.0 + uTime) * sw);",
    "    float wide = mix(55.0, 108.0, uMoon);",
    "    float refA = mix((0.10 + 0.55 * uWarm) * uSunE, 0.40 * uSunE, uMoon);",
    "    col += body * exp(-dx * dx * wide / k) * band * refA * exp(up * 2.2);",
    "  }",
    "  col *= 1.0 - 0.35 * pow(length(uv - 0.5) * 1.25, 2.0);",
    "  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 120.0;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n")
};
