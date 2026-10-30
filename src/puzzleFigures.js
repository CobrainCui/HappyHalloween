/**
 * 几何题上的图。都是纯 SVG，不碰 canvas，也不跟着镜头动。
 *
 * 每张图只画一件事：哪两条线平行、哪两条边相等、哪个角被平分。
 * 题目问的是「能推出什么」，所以图里不写任何数字。
 *
 *   parallelBend  两平行线之间一条折线：∠B = ∠A + ∠C
 *   ssa           两边和其中一边的对角相等：不能判定全等
 *   isosceles     等腰三角形顶角平分线：三线合一
 *   bisector      角平分线上的点到两边距离相等
 */

const NS = 'http://www.w3.org/2000/svg';

const LINE = '#e9e1cc';
const ACCENT = '#ffcf72';
const MARK = '#9ff2c2';

function node(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function segment(parent, x1, y1, x2, y2, { color = LINE, width = 1.6, dash = null } = {}) {
  parent.append(
    node('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: color,
      'stroke-width': width,
      'stroke-linecap': 'round',
      ...(dash ? { 'stroke-dasharray': dash } : {}),
    }),
  );
}

/** 在 (x, y) 周围画一个很小的点，标出字母所在的位置。 */
function dot(parent, x, y, color = LINE) {
  parent.append(node('circle', { cx: x, cy: y, r: 1.8, fill: color }));
}

function label(parent, x, y, text, { color = ACCENT, size = 12, anchor = 'middle' } = {}) {
  const textNode = node('text', {
    x,
    y,
    fill: color,
    'font-size': size,
    'font-family': 'inherit',
    'text-anchor': anchor,
    'dominant-baseline': 'middle',
  });
  textNode.textContent = text;
  parent.append(textNode);
}

/** 以 (cx, cy) 为圆心、r 为半径，从 a1 度画到 a2 度的小圆弧（角度按屏幕坐标算）。 */
function arc(parent, cx, cy, r, a1, a2, { color = ACCENT, width = 1.3 } = {}) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const p1 = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))];
  const p2 = [cx + r * Math.cos(rad(a2)), cy + r * Math.sin(rad(a2))];
  const sweep = a2 > a1 ? 1 : 0;
  parent.append(
    node('path', {
      d: `M ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} A ${r} ${r} 0 0 ${sweep} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`,
      fill: 'none',
      stroke: color,
      'stroke-width': width,
      'stroke-linecap': 'round',
    }),
  );
}

/** 一段线上的等长记号：短横撇在线的中点，和线成直角。 */
function tick(parent, x, y, dx, dy, { double = false } = {}) {
  const length = Math.hypot(dx, dy) || 1;
  // 垂线方向
  const px = -dy / length;
  const py = dx / length;
  const draw = (offset) => {
    const cx = x + (dx / length) * offset;
    const cy = y + (dy / length) * offset;
    segment(parent, cx - px * 5, cy - py * 5, cx + px * 5, cy + py * 5, {
      color: MARK,
      width: 1.5,
    });
  };
  draw(double ? -3.4 : 0);
  if (double) draw(3.4);
}

/** 直角记号：在垂足 F 处画一个小方角，u 是沿边的方向，n 是指向另一点的方向。 */
function rightAngle(parent, fx, fy, ux, uy, nx, ny, size = 7) {
  const ax = fx + ux * size;
  const ay = fy + uy * size;
  const bx = ax + nx * size;
  const by = ay + ny * size;
  const cx = fx + nx * size;
  const cy = fy + ny * size;
  parent.append(
    node('path', {
      d: `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)} L ${cx.toFixed(1)} ${cy.toFixed(1)}`,
      fill: 'none',
      stroke: MARK,
      'stroke-width': 1.3,
    }),
  );
}

/* ---------------- 四张图 ---------------- */

/** 两平行线之间的一条折线：∠B 等于 ∠A 加 ∠C。 */
function parallelBend(svg) {
  segment(svg, 34, 40, 240, 40);
  segment(svg, 34, 110, 240, 110);
  label(svg, 20, 40, 'l');
  label(svg, 20, 110, 'm');

  const A = [150, 40];
  const B = [70, 76];
  const C = [150, 110];
  segment(svg, ...A, ...B);
  segment(svg, ...B, ...C);
  for (const [x, y] of [A, B, C]) dot(svg, x, y);

  label(svg, 160, 33, 'A');
  label(svg, 58, 82, 'B');
  label(svg, 160, 118, 'C');

  // ∠A：沿 l 往左的射线，与 AB 之间。
  arc(svg, A[0], A[1], 17, 180, 155.8);
  // ∠B：BA 与 BC 之间（开口朝右）。
  arc(svg, B[0], B[1], 17, -24.2, 23);
  // ∠C：沿 m 往左的射线，与 CB 之间。
  arc(svg, C[0], C[1], 17, 180, 203);
  label(svg, 125, 47, '∠A');
  label(svg, 96, 76, '∠B');
  label(svg, 125, 103, '∠C');
}

/** 两个三角形：两边和其中一边的对角分别相等——全等吗？ */
function ssa(svg) {
  // 第一个三角形
  const A = [18, 104];
  const B = [104, 104];
  const C = [66, 42];
  segment(svg, ...A, ...B);
  segment(svg, ...A, ...C);
  segment(svg, ...B, ...C);
  dot(svg, ...A);
  dot(svg, ...B);
  dot(svg, ...C);
  label(svg, 12, 114, 'A');
  label(svg, 110, 114, 'B');
  label(svg, 66, 32, 'C');
  tick(svg, (A[0] + B[0]) / 2, 104, B[0] - A[0], 0);
  tick(svg, (A[0] + C[0]) / 2, (A[1] + C[1]) / 2, C[0] - A[0], C[1] - A[1], { double: true });
  arc(svg, B[0], B[1], 17, 180, 238.5);

  // 第二个三角形：两条边一样长，夹角也一样，第三边却不同。
  const D = [146, 104];
  const E = [232, 104];
  const F = [191, 37];
  segment(svg, ...D, ...E);
  segment(svg, ...D, ...F);
  segment(svg, ...E, ...F);
  dot(svg, ...D);
  dot(svg, ...E);
  dot(svg, ...F);
  label(svg, 140, 114, 'D');
  label(svg, 238, 114, 'E');
  label(svg, 191, 27, 'F');
  tick(svg, (D[0] + E[0]) / 2, 104, E[0] - D[0], 0);
  tick(svg, (D[0] + F[0]) / 2, (D[1] + F[1]) / 2, F[0] - D[0], F[1] - D[1], { double: true });
  arc(svg, E[0], E[1], 17, 180, 238.5);
}

/** 等腰三角形：顶角平分线也是底边上的高和中线。 */
function isosceles(svg) {
  const A = [130, 24];
  const B = [52, 110];
  const C = [208, 110];
  const D = [130, 110];
  segment(svg, ...A, ...B);
  segment(svg, ...A, ...C);
  segment(svg, ...B, ...C);
  segment(svg, ...A, ...D);
  for (const [x, y] of [A, B, C, D]) dot(svg, x, y);

  label(svg, 130, 14, 'A');
  label(svg, 40, 122, 'B');
  label(svg, 220, 122, 'C');
  label(svg, 130, 122, 'D');

  // 两腰相等
  tick(svg, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, B[0] - A[0], B[1] - A[1]);
  tick(svg, (A[0] + C[0]) / 2, (A[1] + C[1]) / 2, C[0] - A[0], C[1] - A[1]);

  // 顶角被 AD 分成两个一样大的角：两段同样大的弧。
  arc(svg, A[0], A[1], 22, 90, 132.2);
  arc(svg, A[0], A[1], 22, 47.8, 90);
}

/** 角平分线：到两边的距离相等。 */
function bisector(svg) {
  const O = [28, 112];
  const A = [232, 96];
  const B = [196, 30];
  const P = [154, 79];
  segment(svg, ...O, ...A);
  segment(svg, ...O, ...B);
  segment(svg, ...O, ...P);

  const D = [155.8, 102];
  const E = [142.8, 56];
  segment(svg, ...P, ...D);
  segment(svg, ...P, ...E);
  for (const [x, y] of [O, P, D, E]) dot(svg, x, y);

  label(svg, 16, 120, 'O');
  label(svg, 163, 74, 'P');
  label(svg, 162, 110, 'D');
  label(svg, 133, 47, 'E');

  // 两个垂足处的直角
  rightAngle(svg, D[0], D[1], -0.997, 0.078, -0.078, -0.997);
  rightAngle(svg, E[0], E[1], -0.899, 0.439, 0.438, 0.899);

  // 角平分线把 ∠O 分成两个一样大的角：两段同样大的弧。
  arc(svg, O[0], O[1], 26, -26, -14.7);
  arc(svg, O[0], O[1], 26, -14.7, -4.5);
}

const FIGURES = {
  parallelBend,
  ssa,
  isosceles,
  bisector,
};

/** 按名字取一张图；没有这张图就返回 null，面板会照常显示文字题。 */
export function createPuzzleFigure(id) {
  const draw = FIGURES[id];
  if (!draw) return null;

  const svg = node('svg', {
    viewBox: '0 0 260 130',
    role: 'img',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.classList.add('puzzle-figure-svg');
  draw(svg);
  const wrap = document.createElement('div');
  wrap.className = 'puzzle-figure';
  wrap.append(svg);
  return wrap;
}
