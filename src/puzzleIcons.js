/**
 * 糖纸街谜题里的小图标。
 *
 * 谜题面板是 DOM，画面却要和游戏里的像素角色对得上，所以这里用和
 * 场景一致的矩形像素画法，而不是 emoji。每个图标都画在 16×16 的
 * 方格里，中心在 (0, 0)，调用方给尺寸和中心点即可。
 */

const INK = '#1b0f19';
const BONE = '#f2e4cc';
const PUMPKIN = '#ff7d1a';
const PUMPKIN_LIGHT = '#ffb347';
const PUMPKIN_DARK = '#c9520d';
const STEM = '#657a48';

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function circle(ctx, color, x, y, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function pumpkin(ctx) {
  rect(ctx, STEM, -1.5, -8, 3, 4);
  rect(ctx, '#8ca466', -4, -7, 2, 1);
  rect(ctx, PUMPKIN, -7, -5, 14, 11);
  rect(ctx, PUMPKIN_LIGHT, -5, -6, 10, 2);
  rect(ctx, PUMPKIN_DARK, -7, 4, 14, 2);
  rect(ctx, INK, -5, -2, 3, 3);
  rect(ctx, INK, 2, -2, 3, 3);
  rect(ctx, INK, -3, 2, 6, 2);
  rect(ctx, INK, -5, 1, 2, 2);
  rect(ctx, INK, 3, 1, 2, 2);
}

function ghost(ctx) {
  rect(ctx, '#e8f4ff', -6, -6, 12, 11);
  rect(ctx, '#d7ecff', -4, -6, 4, 2);
  rect(ctx, '#d7ecff', -6, 5, 3, 2);
  rect(ctx, '#d7ecff', -2, 5, 4, 2);
  rect(ctx, '#d7ecff', 3, 5, 3, 2);
  rect(ctx, INK, -4, -2, 2, 3);
  rect(ctx, INK, 2, -2, 2, 3);
  rect(ctx, INK, -1, 2, 2, 1);
}

function bat(ctx) {
  rect(ctx, '#4a2a6a', -8, -4, 5, 3);
  rect(ctx, '#4a2a6a', -8, -1, 4, 2);
  rect(ctx, '#4a2a6a', 3, -4, 5, 3);
  rect(ctx, '#4a2a6a', 4, -1, 4, 2);
  rect(ctx, '#2a173b', -3, -5, 6, 8);
  rect(ctx, '#2a173b', -2, -7, 2, 3);
  rect(ctx, '#2a173b', 0, -7, 2, 3);
  rect(ctx, '#ffe08a', -2, -2, 1, 2);
  rect(ctx, '#ffe08a', 1, -2, 1, 2);
  rect(ctx, '#7a5a9a', -3, 3, 2, 2);
  rect(ctx, '#7a5a9a', 1, 3, 2, 2);
}

function skull(ctx) {
  rect(ctx, BONE, -5, -6, 10, 9);
  rect(ctx, '#e2d2b4', -4, 3, 8, 3);
  rect(ctx, '#e2d2b4', -6, -5, 2, 7);
  rect(ctx, INK, -4, -3, 3, 3);
  rect(ctx, INK, 1, -3, 3, 3);
  rect(ctx, INK, 0, 0, 1, 2);
  rect(ctx, INK, -3, 4, 1, 2);
  rect(ctx, INK, -1, 4, 1, 2);
  rect(ctx, INK, 1, 4, 1, 2);
  rect(ctx, INK, 3, 4, 1, 2);
}

function candle(ctx, variant = 0) {
  const lit = variant !== 1;
  rect(ctx, '#f5e6c8', -3, -1, 6, 8);
  rect(ctx, '#fff4e4', -2, -1, 2, 6);
  rect(ctx, '#d9c491', -3, 6, 6, 2);
  rect(ctx, '#7f5046', -5, 7, 10, 2);
  if (lit) {
    rect(ctx, '#ff9a3c', -1, -5, 2, 4);
    rect(ctx, '#ffd678', 0, -4, 1, 2);
    rect(ctx, '#fff0a8', -1, -6, 1, 2);
  } else {
    rect(ctx, '#5a4a5e', -1, -2, 2, 2);
  }
}

function moon(ctx, variant = 0) {
  if (variant === 1) {
    circle(ctx, '#f5e6bd', 0, 0, 6);
    circle(ctx, '#d9c491', -2, -2, 1.4);
    circle(ctx, '#d9c491', 2, 1, 1);
    circle(ctx, '#d9c491', 1, -3, 0.8);
    return;
  }
  circle(ctx, '#f5e6bd', -1, 0, 6);
  circle(ctx, '#1b0f19', 2.6, -1.6, 5.4);
}

function cat(ctx, variant = 0) {
  rect(ctx, '#1a1220', -6, -4, 12, 9);
  rect(ctx, '#1a1220', -6, -7, 3, 4);
  rect(ctx, '#1a1220', 3, -7, 3, 4);
  rect(ctx, '#0d0912', -4, -6, 2, 2);
  rect(ctx, '#0d0912', 2, -6, 2, 2);
  const eye = variant === 1 ? '#ffd678' : '#a8d8ff';
  rect(ctx, eye, -4, -2, 3, 2);
  rect(ctx, eye, 1, -2, 3, 2);
  rect(ctx, '#ff9aa8', -1, 2, 2, 1);
  rect(ctx, '#4a3a52', -7, 2, 5, 1);
  rect(ctx, '#4a3a52', 2, 2, 5, 1);
}

function candy(ctx) {
  rect(ctx, '#ff8f9a', -4, -3, 8, 6);
  rect(ctx, '#ffb4bc', -3, -3, 6, 2);
  rect(ctx, '#e06a7a', -4, 2, 8, 1);
  rect(ctx, '#ffd678', -1, -1, 2, 2);
  ctx.fillStyle = '#ff8f9a';
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(-8, -4);
  ctx.lineTo(-8, 4);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.lineTo(8, -4);
  ctx.lineTo(8, 4);
  ctx.lineTo(4, 2);
  ctx.closePath();
  ctx.fill();
}

function bone(ctx) {
  rect(ctx, BONE, -5, -2, 10, 4);
  rect(ctx, BONE, -7, -4, 3, 3);
  rect(ctx, BONE, -7, 1, 3, 3);
  rect(ctx, BONE, 4, -4, 3, 3);
  rect(ctx, BONE, 4, 1, 3, 3);
  rect(ctx, '#e2d2b4', -5, 1, 10, 1);
}

function apple(ctx) {
  rect(ctx, '#d94b4b', -5, -3, 10, 9);
  rect(ctx, '#b23a45', -5, 4, 10, 2);
  rect(ctx, '#ff8a8a', -3, -2, 2, 5);
  rect(ctx, '#5a3a2e', 0, -6, 2, 3);
  rect(ctx, STEM, 2, -6, 3, 2);
}

function spider(ctx) {
  rect(ctx, '#1a1220', -3, -3, 6, 6);
  rect(ctx, '#2a173b', -2, -4, 4, 2);
  rect(ctx, '#a8d8ff', -2, -1, 1, 1);
  rect(ctx, '#a8d8ff', 1, -1, 1, 1);
  rect(ctx, '#1a1220', -8, -4, 4, 1);
  rect(ctx, '#1a1220', 4, -4, 4, 1);
  rect(ctx, '#1a1220', -8, 3, 4, 1);
  rect(ctx, '#1a1220', 4, 3, 4, 1);
  rect(ctx, '#1a1220', -7, -6, 3, 1);
  rect(ctx, '#1a1220', 4, -6, 3, 1);
}

function tomb(ctx) {
  rect(ctx, '#6b6172', -5, -3, 10, 11);
  rect(ctx, '#7d7284', -5, -6, 10, 3);
  rect(ctx, '#514a5a', -5, -3, 10, 1);
  rect(ctx, '#3a3442', -3, -6, 2, 9);
  rect(ctx, '#3a3442', -4, -4, 6, 2);
  rect(ctx, '#514a5a', -5, 7, 10, 2);
}

function eye(ctx) {
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, INK, -2, -2, 4, 4);
  rect(ctx, '#ff8f9a', -1, -1, 2, 2);
  rect(ctx, '#fff4e4', -1, -1, 1, 1);
}

const DRAWERS = {
  pumpkin,
  ghost,
  bat,
  skull,
  candle,
  moon,
  cat,
  candy,
  bone,
  apple,
  spider,
  tomb,
  eye,
};

export const PUZZLE_ICONS = Object.freeze(Object.keys(DRAWERS));

/**
 * 在 (cx, cy) 画一个 16×16 的像素图标。
 * variant 给蜡烛（1 = 熄灭）、月亮（1 = 满月）、猫（1 = 金眼）使用。
 */
export function drawPuzzleIcon(ctx, icon, cx, cy, size, variant = 0) {
  const draw = DRAWERS[icon];
  if (!draw) return;
  const scale = size / 16;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;
  draw(ctx, variant);
  ctx.restore();
}

/** 把图标画进一整块 canvas，用于卡片和窗户格子。 */
export function paintPuzzleIcon(canvas, icon, variant = 0, background = null) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  drawPuzzleIcon(ctx, icon, size / 2, size / 2, size * 0.78, variant);
}
