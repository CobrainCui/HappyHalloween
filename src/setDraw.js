/**
 * 集合庭院的画法。
 *
 * 这一段不画互相重叠的区间，也不画「颜色 × 形状」的杂交南瓜。每颗元素
 * 都是一个完整的东西：骷髅、幽灵、眼睛、蜡烛、手、骨头。元素身上不挂标签，
 * 玩家从门楣左侧的成员板读出 A、B 里各有什么，再自己判断每颗东西的归属。
 *
 * 门楣上另有一块宽一截的成员板：A、B 两行图标放大两倍，旁边直接写名字，
 * 玩家不用猜小图标是什么。映射门（接龙门）的成员板画成一列 A → B 的箭头，
 * 其余没画出的段留问号。
 *
 * 地面分格的门，格子上的牌子写着这一格认的具体运算：
 *
 *   A − B / A ∩ B / B − A / A ∪ B（上面加一横，即两边都不在）
 *
 * 映射门的地面不是四个格子，而是一排小台（3 / 4 / 5 个）：每个台子上立着
 * A 里的一个元素，要放的是它在 B 里的像。放对了的元素会亮起来；全部分对，
 * 整扇石门缓缓沉进地里。
 */

import { VIEW } from './config.js';

const T = VIEW.TILE;

const A_GOLD = '232, 190, 90';
const B_BLUE = '110, 170, 220';
const NEUTRAL = '150, 140, 170';
const SOLVED_TINT = '158, 232, 190';
const IDLE_TINT = '150, 140, 170';
const INK = '14, 9, 20';

const OPERATOR = '214, 202, 224';

// 门楣成员板上的中文名。整个游戏只有这一处在 canvas 上写中文：
// 元素小像放大到两倍，旁边直接写名字，玩家不用猜图标。
const LOOK_NAMES = Object.freeze({
  skull: '骷髅',
  ghost: '幽灵',
  eye: '眼睛',
  candle: '蜡烛',
  hand: '手',
  bone: '骨头',
});

const NAME_FONT =
  '10px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", sans-serif';
const NAME_COLOR = '226, 218, 196';
const ICON_CELL = 18;
const BOARD_PAD = 7;
const BOARD_ROW = 18;

const GLYPHS = {
  A: ['01110', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  N: ['01110', '10001', '10001', '10001', '10001'],
  U: ['10001', '10001', '10001', '10001', '01110'],
  '-': ['00000', '00000', '11111', '00000', '00000'],
  // 映射门的门楣：A → B
  R: ['00010', '00001', '11111', '00001', '00010'],
};

function drawGlyph(ctx, pattern, x, y, scale, color) {
  ctx.fillStyle = `rgb(${color})`;
  for (let row = 0; row < pattern.length; row += 1) {
    for (let col = 0; col < pattern[row].length; col += 1) {
      if (pattern[row][col] !== '1') continue;
      ctx.fillRect(
        Math.round(x + col * scale),
        Math.round(y + row * scale),
        scale,
        scale,
      );
    }
  }
}

/**
 * 把一串符号画成一整条式子，返回占用的宽度。
 * complement 为真时，整条式子上方加一横——集合的补集记号。
 */
function drawExpressionParts(ctx, parts, cx, y, scale, complement = false) {
  const advance = 5 * scale + 2;
  const width = parts.length * advance - 2;
  const startX = Math.round(cx - width / 2);
  let x = startX;

  parts.forEach(([key, color]) => {
    drawGlyph(ctx, GLYPHS[key], x, y, scale, color);
    x += advance;
  });

  if (complement) {
    ctx.fillStyle = `rgba(${OPERATOR}, 0.9)`;
    ctx.fillRect(startX - 1, y - 3, width + 2, Math.max(1, Math.round(scale / 2)));
  }
  return width;
}

/** 门楣上的表达式：A 用金色，B 用蓝色，补集在整条式子上加一横。 */
function drawExpression(ctx, gate, centerX, y, scale) {
  const parts =
    gate.expr === 'intersect'
      ? [['A', A_GOLD], ['N', OPERATOR], ['B', B_BLUE]]
      : gate.expr === 'difference'
        ? [['A', A_GOLD], ['-', OPERATOR], ['B', B_BLUE]]
        : gate.expr === 'mapping'
          ? [['A', A_GOLD], ['R', OPERATOR], ['B', B_BLUE]]
          : [['A', A_GOLD]];
  drawExpressionParts(ctx, parts, centerX, y, scale, gate.expr === 'complement');
}

/* ---------------- 成员板上的名字 ---------------- */

function drawName(ctx, name, x, y, color = NAME_COLOR) {
  if (!name) return;
  ctx.save();
  ctx.font = NAME_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(${color}, 0.95)`;
  ctx.fillText(name, Math.round(x), Math.round(y));
  ctx.restore();
}

function drawCenteredName(ctx, name, cx, y, color = NAME_COLOR) {
  if (!name) return;
  ctx.save();
  ctx.font = NAME_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(${color}, 0.95)`;
  ctx.fillText(name, Math.round(cx), Math.round(y));
  ctx.restore();
}

function measureName(ctx, look) {
  const name = LOOK_NAMES[look];
  if (!name) return 0;
  ctx.save();
  ctx.font = NAME_FONT;
  const width = ctx.measureText(name).width;
  ctx.restore();
  return width;
}

/**
 * 地面格子认的具体运算。
 * 两集合时四格分别写 A−B、A∩B、B−A、A∪B 上加一横；
 * 单集合时两格写 A 和 A 上加一横。
 */
function trayExpression(tray, twoSets) {
  if (!twoSets) {
    return { parts: [['A', A_GOLD]], complement: tray.id !== 'a' };
  }
  if (tray.id === 'a') {
    return { parts: [['A', A_GOLD], ['-', OPERATOR], ['B', B_BLUE]] };
  }
  if (tray.id === 'both') {
    return { parts: [['A', A_GOLD], ['N', OPERATOR], ['B', B_BLUE]] };
  }
  if (tray.id === 'b') {
    return { parts: [['B', B_BLUE], ['-', OPERATOR], ['A', A_GOLD]] };
  }
  return { parts: [['A', A_GOLD], ['U', OPERATOR], ['B', B_BLUE]], complement: true };
}

/**
 * 集合里的成员小像。默认按 1 像素画；成员板会传 scale = 2，
 * 把图标放大到能一眼认出来。
 */
function drawObjectIcon(ctx, look, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (scale !== 1) ctx.scale(scale, scale);
  drawObjectIconAt(ctx, look);
  ctx.restore();
}

function drawObjectIconAt(ctx, look) {
  const put = (x, y, w, h, color = '226, 218, 196') => {
    ctx.fillStyle = `rgb(${color})`;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const dark = '60, 48, 66';

  if (look === 'ghost') {
    put(-2, -3, 4, 5, '205, 232, 232');
    put(-3, -2, 6, 3, '205, 232, 232');
    put(-3, 1, 1, 1, '205, 232, 232');
    put(-1, 1, 1, 1, '205, 232, 232');
    put(1, 1, 1, 1, '205, 232, 232');
    put(-2, -2, 1, 1, dark);
    put(1, -2, 1, 1, dark);
  } else if (look === 'eye') {
    // 门上的小像里，眼睛也画成圆的：眼白、虹膜、瞳孔三层同心圆。
    const ex = 0.5;
    const ey = 0.5;
    ctx.fillStyle = 'rgb(120, 88, 78)';
    ctx.beginPath();
    ctx.arc(ex, ey, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgb(239, 230, 216)';
    ctx.beginPath();
    ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgb(178, 60, 54)';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (look === 'candle') {
    put(-1, -1, 3, 5, '232, 220, 196');
    put(0, -4, 1, 3, '255, 207, 110');
    put(0, -5, 1, 1, '255, 240, 179');
    put(-2, 4, 5, 1, dark);
  } else if (look === 'hand') {
    put(-2, -1, 5, 4);
    put(-2, -4, 1, 3);
    put(0, -5, 1, 4);
    put(2, -4, 1, 3);
    put(-4, 0, 2, 1);
  } else if (look === 'bone') {
    put(-3, 0, 6, 2);
    put(-4, -1, 2, 2);
    put(-4, 1, 2, 2);
    put(2, -1, 2, 2);
    put(2, 1, 2, 2);
  } else {
    // skull
    put(-2, -3, 4, 4);
    put(-3, -2, 6, 3);
    put(-2, 1, 1, 1);
    put(0, 1, 1, 1);
    put(1, 1, 1, 1);
    put(-2, -2, 1, 1, dark);
    put(1, -2, 1, 1, dark);
  }
}

/* ---------------- 门楣上的成员板 ---------------- */

/** 成员板左侧的 A / B / Aᶜ 标记，放大两倍画。 */
function drawMemberLabel(ctx, label, x, y, color) {
  const glyph = label === 'C' ? 'A' : label;
  drawGlyph(ctx, GLYPHS[glyph], x, y - 5, 2, color);
  if (label === 'C') {
    // 补集：A 上面加一横。
    ctx.fillStyle = `rgba(${color}, 0.9)`;
    ctx.fillRect(x - 1, y - 8, 12, 1);
  }
}

function drawBoardFrame(ctx, gate, x, y, width, height) {
  const edge = '196, 160, 214';
  // 板子挂在石门左侧的墙沿上：一根短杆连到门顶，避开右上角的旅人手记。
  ctx.fillStyle = 'rgba(10, 6, 14, 0.85)';
  ctx.fillRect(x + width - 3, y + height, 2, Math.max(8, gate.top - (y + height) + 4));

  ctx.fillStyle = 'rgba(10, 6, 14, 0.92)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = `rgba(${edge}, 0.55)`;
  ctx.fillRect(x, y, width, 1);
  ctx.fillRect(x, y + height - 1, width, 1);
  ctx.fillRect(x, y, 1, height);
  ctx.fillRect(x + width - 1, y, 1, height);
  ctx.fillStyle = `rgba(${edge}, 0.8)`;
  ctx.fillRect(x + 2, y + 2, 2, 1);
  ctx.fillRect(x + width - 4, y + 2, 2, 1);
  ctx.fillRect(x + 2, y + height - 3, 2, 1);
  ctx.fillRect(x + width - 4, y + height - 3, 2, 1);
}

/**
 * 分格庭院的门楣成员板：A、B 两行，图标放大，名字写在旁边。
 * 单集合的补集门第二行是 Aᶜ。
 */
function drawSortBoard(ctx, gate) {
  const rows = gate.twoSets
    ? [
        { label: 'A', color: A_GOLD, members: gate.aMembers ?? [] },
        { label: 'B', color: B_BLUE, members: gate.bMembers ?? [] },
      ]
    : [
        { label: 'A', color: A_GOLD, members: gate.aMembers ?? [] },
        { label: 'C', color: NEUTRAL, members: gate.notAMembers ?? [] },
      ];
  const labelW = 16;

  let contentW = 0;
  for (const row of rows) {
    let w = labelW;
    for (const member of row.members) {
      w += ICON_CELL + 3 + Math.ceil(measureName(ctx, member.look)) + 10;
    }
    contentW = Math.max(contentW, w);
  }

  const width = Math.max(92, contentW + BOARD_PAD * 2);
  const height = rows.length * BOARD_ROW + BOARD_PAD * 2;
  // 靠石门左侧立着，免得被右上角的旅人手记盖住。
  const x = Math.round(gate.x - width);
  const y = Math.round(gate.top - height - 8);
  drawBoardFrame(ctx, gate, x, y, width, height);

  rows.forEach((row, index) => {
    const cy = y + BOARD_PAD + index * BOARD_ROW + BOARD_ROW / 2;
    drawMemberLabel(ctx, row.label, x + BOARD_PAD, cy, row.color);
    let mx = x + BOARD_PAD + labelW;
    if (!row.members.length) {
      ctx.fillStyle = 'rgba(170, 160, 185, 0.7)';
      ctx.fillRect(mx, cy, 4, 1);
      return;
    }
    for (const member of row.members) {
      drawObjectIcon(ctx, member.look ?? 'skull', mx + ICON_CELL / 2, cy, 2);
      drawName(ctx, LOOK_NAMES[member.look] ?? '?', mx + ICON_CELL + 3, cy);
      mx += ICON_CELL + 3 + Math.ceil(measureName(ctx, member.look)) + 10;
    }
  });
}

function drawArrowDown(ctx, cx, top, bottom, color, dashed) {
  const x = Math.round(cx);
  const y0 = Math.round(top);
  const y1 = Math.round(bottom);
  ctx.fillStyle = `rgba(${color}, 0.9)`;
  if (dashed) {
    for (let y = y0; y < y1 - 2; y += 3) ctx.fillRect(x, y, 1, 1);
  } else {
    ctx.fillRect(x, y0, 1, Math.max(1, y1 - y0 - 2));
  }
  ctx.fillRect(x - 2, y1 - 2, 5, 1);
  ctx.fillRect(x - 1, y1 - 1, 3, 1);
}

/**
 * 映射门（接龙门）的成员板：A 一行、B 一行，中间用箭头连起来。
 * 只画出前 shownLinks 段，其余留问号——玩家从已经给出的两段
 * 看出「每样东西接在它后面的那一样」，再把剩下的补上。
 */
function drawMappingBoard(ctx, gate) {
  const chain = gate.chain ?? [];
  if (!chain.length) return;
  const shown = Math.max(
    1,
    Math.min(chain.length - 1, gate.shownLinks ?? chain.length - 1),
  );
  const labelW = 16;
  const columns = chain.map((look, index) => {
    const next = index < shown ? chain[(index + 1) % chain.length] : null;
    const nameW = Math.max(
      Math.ceil(measureName(ctx, look)),
      next ? Math.ceil(measureName(ctx, next)) : 12,
    );
    return { look, next, width: ICON_CELL + 3 + nameW + 10 };
  });
  const contentW = labelW + columns.reduce((sum, col) => sum + col.width, 0);
  const width = Math.max(104, contentW + BOARD_PAD * 2);
  const titleH = 12;
  const height = BOARD_PAD * 2 + titleH + BOARD_ROW * 2 + 6;
  // 靠石门左侧立着，免得被右上角的旅人手记盖住。
  const x = Math.round(gate.x - width);
  const y = Math.round(gate.top - height - 8);
  drawBoardFrame(ctx, gate, x, y, width, height);

  drawCenteredName(ctx, '找规律', x + width / 2, y + BOARD_PAD + 4, '196, 160, 214');

  const rowAy = y + BOARD_PAD + titleH + BOARD_ROW / 2;
  const rowBy = rowAy + BOARD_ROW + 6;
  drawMemberLabel(ctx, 'A', x + BOARD_PAD, rowAy, A_GOLD);
  drawMemberLabel(ctx, 'B', x + BOARD_PAD, rowBy, B_BLUE);

  let mx = x + BOARD_PAD + labelW;
  for (const col of columns) {
    const center = mx + ICON_CELL / 2;
    drawObjectIcon(ctx, col.look, center, rowAy, 2);
    drawName(ctx, LOOK_NAMES[col.look] ?? '?', mx + ICON_CELL + 3, rowAy);

    drawArrowDown(
      ctx,
      center,
      rowAy + 8,
      rowBy - 8,
      col.next ? OPERATOR : '150, 140, 170',
      !col.next,
    );

    if (col.next) {
      drawObjectIcon(ctx, col.next, center, rowBy, 2);
      drawName(ctx, LOOK_NAMES[col.next] ?? '?', mx + ICON_CELL + 3, rowBy);
    } else {
      drawCenteredName(ctx, '?', center, rowBy, '190, 180, 200');
    }
    mx += col.width;
  }
}

function drawGateBoard(ctx, gate) {
  if (gate.kind === 'mapping') drawMappingBoard(ctx, gate);
  else drawSortBoard(ctx, gate);
}

/* ---------------- 地上会动的东西 ---------------- */

const OBJECT_PALETTES = Object.freeze({
  skull: { body: '#e6dcc4', light: '#f6efdd', dark: '#9b8f76', glow: '230, 220, 190' },
  ghost: { body: '#cfe6e6', light: '#eefafa', dark: '#8faeb2', glow: '170, 220, 220' },
  eye: { body: '#efe6d8', light: '#fbf7ee', dark: '#6e2a26', glow: '230, 120, 110' },
  candle: { body: '#e8dcc4', light: '#f6efdd', dark: '#9b8f76', glow: '255, 200, 100' },
  hand: { body: '#e6dcc4', light: '#f6efdd', dark: '#9b8f76', glow: '230, 220, 190' },
  bone: { body: '#e6dcc4', light: '#f6efdd', dark: '#9b8f76', glow: '230, 220, 190' },
});

/**
 * 被玩家推、抱、抛的元素。物理还是南瓜的 14×12 盒子，
 * 但画成骷髅、幽灵、眼睛、蜡烛、手或骨头；身上不挂归属标签，
 * 放对了才亮起来。
 */
export function drawSetElement(renderer, pumpkin, time, submersion = 0) {
  const ctx = renderer.ctx;
  const look = pumpkin.look ?? 'skull';
  const p = OBJECT_PALETTES[look] ?? OBJECT_PALETTES.skull;
  const x = Math.round(pumpkin.x + pumpkin.w / 2);
  const y = Math.round(pumpkin.y + pumpkin.h);
  const marks = pumpkin.setMarks;

  ctx.save();
  ctx.translate(x, y);

  // 地面影子：泡在水里就不画了，水面看不到岸上的那种影子。
  if (submersion <= 0) {
    ctx.fillStyle = 'rgba(8, 4, 12, 0.55)';
    ctx.fillRect(-6, -1, 12, 2);
  }

  // 东西本身的颜色光
  const lit = Boolean(marks?.correct);
  ctx.globalCompositeOperation = 'lighter';
  const glowMul = 1 - submersion * 0.6;
  const glow = ctx.createRadialGradient(0, -9, 1, 0, -9, 18);
  glow.addColorStop(0, `rgba(${p.glow}, ${(lit ? 0.26 : 0.1) * glowMul})`);
  glow.addColorStop(1, `rgba(${p.glow}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-20, -28, 40, 30);

  // 放对了：整颗东西亮起来，顶上缓缓升起几点光。
  if (lit) {
    const halo = ctx.createRadialGradient(0, -8, 3, 0, -8, 22);
    halo.addColorStop(0, 'rgba(214, 246, 218, 0.16)');
    halo.addColorStop(1, 'rgba(214, 246, 218, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-24, -32, 48, 36);

    for (let i = 0; i < 3; i += 1) {
      const phase = (time * 0.4 + i * 0.33) % 1;
      const px = Math.sin(time * 0.9 + i * 2.1) * 5;
      const py = -10 - phase * 16;
      ctx.globalAlpha = (1 - phase) * 0.7;
      ctx.fillStyle = 'rgb(222, 248, 214)';
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';

  if (look === 'ghost') {
    ctx.fillStyle = p.dark;
    ctx.fillRect(-5, -15, 10, 11);
    ctx.fillRect(-6, -12, 12, 8);
    ctx.fillRect(-5, -4, 10, 3);
    ctx.fillRect(-6, -1, 2, 2);
    ctx.fillRect(-2, -1, 2, 2);
    ctx.fillRect(2, -1, 2, 2);
    ctx.fillStyle = p.body;
    ctx.fillRect(-4, -14, 8, 10);
    ctx.fillRect(-5, -11, 10, 7);
    ctx.fillRect(-4, -4, 8, 2);
    ctx.fillRect(-5, -2, 1, 2);
    ctx.fillRect(-1, -2, 1, 2);
    ctx.fillRect(3, -2, 1, 2);
    ctx.fillStyle = p.light;
    ctx.fillRect(-4, -13, 3, 2);
    ctx.fillStyle = '#160d18';
    ctx.fillRect(-3, -10, 2, 2);
    ctx.fillRect(1, -10, 2, 2);
    ctx.fillRect(-1, -6, 2, 1);
  } else if (look === 'eye') {
    // 一只圆眼睛：深色眼眶、眼白、虹膜、瞳孔、高光，全是同心圆。
    const ey = -6.5;
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.arc(0, ey, 6.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.arc(0, ey, 5.4, 0, Math.PI * 2);
    ctx.fill();
    // 眼白上的一层薄影，让它看起来是个球而不是一个圆片
    ctx.fillStyle = 'rgba(110, 42, 38, 0.13)';
    ctx.beginPath();
    ctx.arc(0, ey, 5.4, Math.PI * 0.9, Math.PI * 1.7);
    ctx.fill();
    ctx.fillStyle = '#b23c36';
    ctx.beginPath();
    ctx.arc(0.4, ey, 2.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a1c18';
    ctx.beginPath();
    ctx.arc(0.4, ey, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c0b0a';
    ctx.beginPath();
    ctx.arc(0.4, ey, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.light;
    ctx.beginPath();
    ctx.arc(-1.4, ey - 1.8, 1.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (look === 'candle') {
    const flick = Math.sin(time * 9 + x) * 0.5;
    ctx.fillStyle = p.dark;
    ctx.fillRect(-3, -16, 6, 16);
    ctx.fillRect(-4, -13, 1, 4);
    ctx.fillRect(3, -11, 1, 3);
    ctx.fillRect(-4, -2, 8, 2);
    ctx.fillStyle = p.body;
    ctx.fillRect(-2, -15, 4, 14);
    ctx.fillStyle = p.light;
    ctx.fillRect(-2, -14, 2, 10);
    ctx.fillStyle = p.dark;
    ctx.fillRect(-1, -18, 2, 2);
    ctx.fillStyle = '#ffcf6e';
    ctx.fillRect(-1 + Math.round(flick), -22, 2, 4);
    ctx.fillStyle = '#fff0b3';
    ctx.fillRect(Math.round(flick), -21, 1, 2);
  } else if (look === 'hand') {
    ctx.fillStyle = p.dark;
    ctx.fillRect(-5, -7, 10, 7);
    for (let i = 0; i < 4; i += 1) ctx.fillRect(-5 + i * 3, -12, 2, 6);
    ctx.fillRect(-7, -6, 2, 3);
    ctx.fillStyle = p.body;
    ctx.fillRect(-4, -6, 8, 5);
    for (let i = 0; i < 4; i += 1) ctx.fillRect(-4 + i * 3, -11, 1, 5);
    ctx.fillStyle = p.light;
    ctx.fillRect(-4, -6, 2, 1);
  } else if (look === 'bone') {
    ctx.fillStyle = p.dark;
    ctx.fillRect(-6, -6, 12, 4);
    ctx.fillRect(-8, -8, 3, 3);
    ctx.fillRect(-8, -2, 3, 3);
    ctx.fillRect(5, -8, 3, 3);
    ctx.fillRect(5, -2, 3, 3);
    ctx.fillStyle = p.body;
    ctx.fillRect(-5, -5, 10, 2);
    ctx.fillRect(-7, -7, 2, 2);
    ctx.fillRect(-7, -2, 2, 2);
    ctx.fillRect(5, -7, 2, 2);
    ctx.fillRect(5, -2, 2, 2);
    ctx.fillStyle = p.light;
    ctx.fillRect(-4, -5, 4, 1);
  } else {
    // skull
    ctx.fillStyle = p.dark;
    ctx.fillRect(-6, -11, 12, 8);
    ctx.fillRect(-7, -8, 14, 6);
    ctx.fillRect(-5, -2, 10, 3);
    ctx.fillStyle = p.body;
    ctx.fillRect(-5, -10, 10, 7);
    ctx.fillRect(-6, -8, 12, 5);
    ctx.fillRect(-4, -2, 8, 2);
    ctx.fillStyle = p.light;
    ctx.fillRect(-4, -9, 3, 2);
    ctx.fillStyle = '#160d18';
    ctx.fillRect(-4, -8, 3, 3);
    ctx.fillRect(1, -8, 3, 3);
    ctx.fillRect(-1, -5, 2, 2);
    ctx.fillRect(-4, -3, 1, 2);
    ctx.fillRect(-1, -3, 1, 2);
    ctx.fillRect(2, -3, 1, 2);
  }

  // 水下压一层冷蓝色调，只染在元素已经画好的像素上。
  if (submersion > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(24, 82, 104, ${submersion * 0.38})`;
    ctx.fillRect(-20, -28, 40, 30);
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

/* ---------------- 地面上的四个格子 ---------------- */

function drawTrayPlate(ctx, tray, time) {
  const x = Math.round(tray.x);
  const w = Math.round(tray.w);
  const y = Math.round(tray.y);
  const tint = tray.tint ?? IDLE_TINT;
  const target = Boolean(tray.target);
  const pulse = 0.6 + Math.sin(time * 2.2 + x * 0.02) * 0.2;

  ctx.fillStyle = 'rgba(12, 8, 18, 0.55)';
  ctx.fillRect(x, y - 5, w, 5);

  ctx.fillStyle = `rgba(${tint}, ${target ? 0.9 : 0.4})`;
  ctx.fillRect(x, y - 9, w, 1);
  ctx.fillRect(x, y - 9, 1, 9);
  ctx.fillRect(x + w - 1, y - 9, 1, 9);
  ctx.fillStyle = `rgba(${tint}, ${target ? 0.95 : 0.5})`;
  ctx.fillRect(x, y - 11, 2, 2);
  ctx.fillRect(x + w - 2, y - 11, 2, 2);

  if (target) {
    const beam = ctx.createLinearGradient(0, y - 32, 0, y);
    beam.addColorStop(0, `rgba(${tint}, 0)`);
    beam.addColorStop(0.7, `rgba(${tint}, ${0.05 + pulse * 0.02})`);
    beam.addColorStop(1, `rgba(${tint}, 0.13)`);
    ctx.fillStyle = beam;
    ctx.fillRect(x + 1, y - 32, w - 2, 32);
  } else {
    ctx.fillStyle = `rgba(${tint}, 0.035)`;
    ctx.fillRect(x + 1, y - 20, w - 2, 20);
  }

  ctx.globalAlpha = target ? 0.5 : 0.22;
  ctx.fillStyle = `rgb(${tint})`;
  for (let px = x + 3; px <= x + w - 3; px += 4) {
    ctx.fillRect(px, y - 3, 2, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * 映射门的台子：上面立着 A 里的一个元素（放大图标 + 名字），
 * 下面那道向下的箭头指着要放东西的格子。
 */
function drawMappingTraySign(ctx, tray, time) {
  // 映射门的小台 id 就是 A 里的那个 look：骷髅台、幽灵台、蜡烛台。
  const look = tray.id ?? 'skull';
  const cx = Math.round(tray.x + tray.w / 2);
  const ground = Math.round(tray.y);
  const target = Boolean(tray.target);
  // 小台是 A 的位置：牌子用金色；脚下的格子是 B 的位置，用蓝色。
  const tint = A_GOLD;
  const pulse = 0.6 + Math.sin(time * 2.4 + tray.x * 0.02) * 0.2;
  const plateW = 30;
  const plateH = 34;
  const plateTop = ground - 60;
  const plateX = Math.round(cx - plateW / 2);

  // 立杆
  ctx.fillStyle = 'rgba(10, 6, 14, 0.8)';
  ctx.fillRect(cx - 1, plateTop + plateH, 2, ground - plateTop - plateH - 4);

  ctx.fillStyle = target ? 'rgba(24, 16, 32, 0.94)' : 'rgba(10, 6, 14, 0.86)';
  ctx.fillRect(plateX, plateTop, plateW, plateH);
  ctx.fillStyle = `rgba(${tint}, ${target ? 0.95 : 0.5})`;
  ctx.fillRect(plateX, plateTop, plateW, 1);
  ctx.fillRect(plateX, plateTop + plateH - 1, plateW, 1);
  ctx.fillRect(plateX, plateTop, 1, plateH);
  ctx.fillRect(plateX + plateW - 1, plateTop, 1, plateH);

  drawObjectIcon(ctx, look, cx, plateTop + 11, 2);
  drawCenteredName(ctx, LOOK_NAMES[look] ?? '', cx, plateTop + 27, NAME_COLOR);

  // 指向地面的小箭头：蓝色格子才是放 B 的位置。
  ctx.fillStyle = `rgba(${B_BLUE}, 0.85)`;
  ctx.fillRect(cx - 2, ground - 8, 5, 1);
  ctx.fillRect(cx - 1, ground - 6, 3, 1);
  ctx.fillRect(cx, ground - 4, 1, 1);

  if (target) {
    ctx.globalAlpha = 0.4 + pulse * 0.4;
    ctx.fillStyle = `rgb(${tint})`;
    ctx.fillRect(cx - 3, plateTop - 6, 6, 1);
    ctx.fillRect(cx - 1, plateTop - 8, 2, 1);
    ctx.globalAlpha = 1;
  }
}

/** 格子上的牌子：写出这一格认的具体运算，而不是只写一个 A 或 B。 */
function drawTraySign(ctx, tray, time, gate) {
  if (gate.kind === 'mapping') {
    drawMappingTraySign(ctx, tray, time);
    return;
  }

  const cx = Math.round(tray.x + tray.w / 2);
  const ground = Math.round(tray.y);
  const target = Boolean(tray.target);
  const tint = tray.tint ?? IDLE_TINT;
  const pulse = 0.6 + Math.sin(time * 2.4 + tray.x * 0.02) * 0.2;
  const scale = 2;
  const { parts, complement } = trayExpression(tray, gate.twoSets);

  // 立杆
  ctx.fillStyle = 'rgba(10, 6, 14, 0.8)';
  ctx.fillRect(cx - 1, ground - 38, 2, 32);

  const width = parts.length * (5 * scale + 2) - 2;
  const y = ground - 52;
  const plateTop = y - 7;
  const plateW = width + 8;
  const plateH = 5 * scale + 12;

  ctx.fillStyle = target ? 'rgba(24, 16, 32, 0.94)' : 'rgba(10, 6, 14, 0.86)';
  ctx.fillRect(Math.round(cx - plateW / 2), plateTop, plateW, plateH);
  ctx.fillStyle = `rgba(${tint}, ${target ? 0.95 : 0.5})`;
  ctx.fillRect(Math.round(cx - plateW / 2), plateTop, plateW, 1);
  ctx.fillRect(Math.round(cx - plateW / 2), plateTop + plateH - 1, plateW, 1);
  ctx.fillRect(Math.round(cx - plateW / 2), plateTop, 1, plateH);
  ctx.fillRect(Math.round(cx + plateW / 2) - 1, plateTop, 1, plateH);

  drawExpressionParts(ctx, parts, cx, y, scale, complement);

  if (target) {
    ctx.globalAlpha = 0.4 + pulse * 0.4;
    ctx.fillStyle = `rgb(${tint})`;
    ctx.fillRect(cx - 3, plateTop - 6, 6, 1);
    ctx.fillRect(cx - 1, plateTop - 8, 2, 1);
    ctx.globalAlpha = 1;
  }
}

/** 画所有格子。格子只是地面标记，不挡路。 */
export function drawSetTrays(renderer, time, cameraX) {
  const gates = renderer.level.setGates;
  if (!gates?.length) return;

  const ctx = renderer.ctx;
  for (const gate of gates) {
    if (gate.centerX < cameraX - 320 || gate.centerX > cameraX + VIEW.WIDTH + 320) {
      continue;
    }
    for (const tray of gate.trays ?? []) {
      if (tray.x + tray.w < cameraX - 60 || tray.x > cameraX + VIEW.WIDTH + 60) continue;
      drawTrayPlate(ctx, tray, time);
      drawTraySign(ctx, tray, time, gate);
    }
  }
}

/* ---------------- 门上的图 ---------------- */

function drawMiniTrays(ctx, gate, cx, y) {
  const trays = gate.trays ?? [];
  if (!trays.length) return;
  const cellW = 7;
  const gap = 2;
  const total = trays.length * cellW + (trays.length - 1) * gap;
  const start = cx - total / 2;

  trays.forEach((tray, index) => {
    const x = Math.round(start + index * (cellW + gap));
    const tint = tray.tint ?? IDLE_TINT;
    const target = Boolean(tray.target);
    ctx.fillStyle = `rgba(${tint}, ${target ? 0.5 : 0.12})`;
    ctx.fillRect(x, y, cellW, 8);
    ctx.fillStyle = `rgba(${tint}, ${target ? 0.95 : 0.4})`;
    ctx.fillRect(x, y, cellW, 1);
    ctx.fillRect(x, y, 1, 8);
    ctx.fillRect(x + cellW - 1, y, 1, 8);
    if (target) {
      ctx.fillStyle = 'rgba(255, 246, 212, 0.9)';
      ctx.fillRect(x + 3, y + 3, 1, 2);
    }
  });
}

function drawGatePlaque(ctx, gate, time) {
  const x = gate.x;
  const y = gate.top;
  const w = gate.w;
  const h = gate.h;
  const total = gate.pumpkinCount ?? gate.total ?? 0;
  const placed = gate.placed ?? 0;
  const ratio = total > 0 ? placed / total : 0;
  const pulse = 0.6 + Math.sin(time * 2 + gate.centerX * 0.01) * 0.2;
  const edge = '196, 160, 214';

  ctx.save();

  ctx.fillStyle = `rgba(${INK}, 0.46)`;
  ctx.fillRect(x + 1, y, w - 2, h);

  ctx.globalAlpha = Math.min(1, 0.34 * pulse + ratio * 0.6);
  ctx.fillStyle = `rgb(${edge})`;
  ctx.fillRect(x + 1, y + 3, 1, h - 6);
  ctx.fillRect(x + w - 2, y + 3, 1, h - 6);
  ctx.globalAlpha = 1;

  ctx.fillStyle = `rgba(${edge}, 0.45)`;
  ctx.fillRect(x + 2, y + 2, w - 4, 1);
  ctx.fillStyle = `rgba(${INK}, 0.5)`;
  ctx.fillRect(x + 2, y + 3, w - 4, 2);
  ctx.fillStyle = `rgba(${INK}, 0.7)`;
  ctx.fillRect(x + 3, y + 5, w - 6, 16);
  ctx.fillStyle = `rgba(${edge}, 0.35)`;
  ctx.fillRect(x + 3, y + 5, w - 6, 1);
  drawExpression(ctx, gate, gate.centerX, y + 10, 2);

  // 成员板挂在门楣上方，这里只留四个小格的地图和门脚进度。
  drawMiniTrays(ctx, gate, gate.centerX, y + 34);

  const step = 5;
  const startX = gate.centerX - ((total - 1) * step) / 2;
  for (let index = 0; index < total; index += 1) {
    const on = index < placed;
    ctx.fillStyle = on ? `rgb(${SOLVED_TINT})` : `rgba(${IDLE_TINT}, 0.8)`;
    ctx.fillRect(Math.round(startX + index * step - 1), y + h - 14, 3, 3);
  }

  ctx.restore();
}

/**
 * 石门缓缓下沉：整扇门（石头门身和顶上的符障）一起往下走，
 * 沉到地面以下之后碰撞才撤掉。下沉期间的地面原格由 level 那侧跳过，
 * 这里只画这一份正在移动的门。
 */
function drawSinkingGate(renderer, gate) {
  const ctx = renderer.ctx;
  const duration = gate.sinkDuration ?? 2.4;
  const t = Math.min(1, (gate.sinkT ?? 0) / duration);
  const ease = t * t * (3 - 2 * t);
  const ground = gate.y;
  const offset = ease * (gate.h + T);

  ctx.save();
  ctx.beginPath();
  ctx.rect(gate.x - 8, 0, gate.w + 16, ground + 2);
  ctx.clip();
  ctx.translate(0, offset);
  ctx.globalAlpha = 1 - ease * 0.3;
  for (const cell of gate.tiles ?? []) {
    if (cell.char === 'B') renderer.drawStoneTile(cell.col, cell.row);
    else if (cell.char === 'g') drawSetWard(renderer, cell.col, cell.row);
  }
  ctx.restore();

  // 地面留下的那道缝：门沉下去时亮一下。
  const fade = 1 - t;
  if (fade > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.4;
    const seam = ctx.createLinearGradient(0, ground - 12, 0, ground);
    seam.addColorStop(0, 'rgba(196, 160, 214, 0)');
    seam.addColorStop(1, 'rgba(196, 160, 214, 0.9)');
    ctx.fillStyle = seam;
    ctx.fillRect(gate.x, ground - 12, gate.w, 12);
    ctx.restore();
  }
}

/** 主入口：地面格子 + 还没打开的门。 */
export function drawSetCourtyards(renderer, time, cameraX) {
  const gates = renderer.level.setGates;
  if (!gates?.length) return;

  const ctx = renderer.ctx;
  drawSetTrays(renderer, time, cameraX);

  for (const gate of gates) {
    if (gate.centerX < cameraX - 320 || gate.centerX > cameraX + VIEW.WIDTH + 320) {
      continue;
    }
    if (gate.sinking) {
      drawSinkingGate(renderer, gate);
      continue;
    }
    if (!gate.solved) {
      drawGatePlaque(ctx, gate, time);
      drawGateBoard(ctx, gate);
    }
  }
}

/** 门顶那道一直封到夜空的透明符障：极淡的紫色竖线，偶尔浮一粒符号。 */
export function drawSetWard(renderer, col, row) {
  const ctx = renderer.ctx;
  const x = col * T;
  const y = row * T;
  const now = performance.now();
  const pulse = 0.65 + Math.sin(now * 0.0019 + row * 0.5 + col * 0.8) * 0.3;

  ctx.save();
  ctx.globalAlpha = 0.05 * pulse;
  ctx.fillStyle = '#c9a6e0';
  ctx.fillRect(x + 4, y, 1, T);
  ctx.fillRect(x + 11, y, 1, T);

  const mote = (row * 5 + Math.floor(now * 0.009) + col) % 15;
  ctx.globalAlpha = 0.1 * pulse;
  ctx.fillRect(x + 6 + (mote % 3), y + 2 + ((mote * 5) % 13), 1, 1);
  ctx.restore();
}

/** 远处雾里的两圆：阿岚笔记上的图，只留一层很淡的轮廓。 */
export function drawSetRing(renderer, decoration, time) {
  const ctx = renderer.ctx;
  const x = decoration.x;
  const y = decoration.y;
  const r = decoration.r;
  const gap = decoration.gap ?? r * 0.6;
  const breathe = 0.17 + Math.sin(time * 0.5 + x * 0.01) * 0.032;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [cx, tint] of [
    [x, A_GOLD],
    [x + gap, B_BLUE],
  ]) {
    const dots = 30;
    for (let dot = 0; dot < dots; dot += 1) {
      const angle = (dot / dots) * Math.PI * 2;
      const px = Math.round(cx + Math.cos(angle) * r);
      const py = Math.round(y + Math.sin(angle) * r);
      const bright = dot % 5 === 0;
      ctx.globalAlpha = bright ? breathe * 2 : breathe;
      ctx.fillStyle = `rgb(${tint})`;
      ctx.fillRect(px, py, bright ? 2 : 1, 1);
    }
  }
  ctx.restore();
}
