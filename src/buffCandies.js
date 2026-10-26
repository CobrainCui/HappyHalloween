/**
 * Trick or Treat 副本的增益糖。
 *
 * 和 candyEffects.js 里的十种「路上的糖」不是一套：
 * 这里没有诊断名、没有编码，也不借用任何症状，只是十种普通的行为增益。
 *
 * 效果仍然走同一套 effectMods：
 *   - 不同糖的效果乘算叠加；
 *   - 同一种糖再吃一颗，持续时间累加（上限为单颗时长的 2 倍）。
 */
export const BUFF_CANDIES = Object.freeze({
  spring: {
    kind: 'buff',
    name: '弹簧糖',
    tag: '跳得更高',
    glyph: '跳',
    duration: 12,
    accent: '#ffd166',
    summary: '跳跃高度明显变高，落地还是原样。',
    mods: { jumpVelocityScale: 1.5 },
  },

  feather: {
    kind: 'buff',
    name: '羽毛糖',
    tag: '缓落 · 滑翔',
    glyph: '羽',
    duration: 12,
    accent: '#cfe9ff',
    summary: '下落更慢；下落时按住 ↑ 会张开滑翔。',
    mods: { gravityScale: 0.78, maxFallScale: 0.55, glide: true },
  },

  doubleJump: {
    kind: 'buff',
    name: '二段跳糖',
    tag: '空中再跳一次',
    glyph: '二',
    duration: 12,
    accent: '#9ff2c2',
    summary: '跳起后松开 ↑，在空中再按一次 ↑。',
    mods: { extraJumps: 1 },
  },

  tailwind: {
    kind: 'buff',
    name: '疾风糖',
    tag: '跑得更快',
    glyph: '风',
    duration: 12,
    accent: '#ffb4e6',
    summary: '跑动速度更快，起步也更利落。',
    mods: { moveScale: 1.5, frictionScale: 1.15 },
  },

  flight: {
    kind: 'buff',
    name: '飞天糖',
    tag: '按住 ↑ 飞',
    glyph: '飞',
    duration: 8,
    accent: '#c9a7ff',
    summary: '按住 ↑ 上升，松开慢慢下沉；← → 照常移动。',
    mods: {},
    flight: { riseAccel: 720, fallAccel: 460, maxRise: 190, maxFall: 120, idleGravity: 110 },
  },

  moonGravity: {
    kind: 'buff',
    name: '月亮糖',
    tag: '重力变小',
    glyph: '月',
    duration: 12,
    accent: '#ffe9a8',
    summary: '身体变轻，跳得更飘，落得也慢。',
    mods: { gravityScale: 0.55, jumpVelocityScale: 1.08, maxFallScale: 0.8 },
  },

  ward: {
    kind: 'buff',
    name: '护身糖',
    tag: '危险不近身',
    glyph: '盾',
    duration: 12,
    accent: '#8de6ff',
    summary: '岩浆、尖刺和黑水沟都碰不到你。',
    mods: { shield: true },
  },

  magnet: {
    kind: 'buff',
    name: '磁力糖',
    tag: '拾取范围变大',
    glyph: '磁',
    duration: 12,
    accent: '#ffa8a8',
    summary: '附近的骨头、零件和糖纸会自动进背包。',
    mods: { magnet: 64 },
  },

  dash: {
    kind: 'buff',
    name: '冲刺糖',
    tag: '双击冲刺',
    glyph: '冲',
    duration: 12,
    accent: '#ffcf8a',
    summary: '在地面快速双击 ← / → 向前冲一段；空中也能冲。',
    mods: { dash: true, airDash: true },
  },

  wallStep: {
    kind: 'buff',
    name: '蹬墙糖',
    tag: '贴墙再跳',
    glyph: '墙',
    duration: 12,
    accent: '#a8d8ff',
    summary: '在空中贴住墙时，再按一次 ↑ 从墙上蹬出去。',
    mods: { wallJump: true },
  },
});

export const BUFF_CANDY_TYPES = Object.freeze(Object.keys(BUFF_CANDIES));

export function getBuffCandy(type) {
  return BUFF_CANDIES[type] ?? null;
}
