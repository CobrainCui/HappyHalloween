/**
 * 糖果 = 临时状态。
 *
 * 每种糖果对应一种真实存在的精神障碍诊断名（ICD-10 中文正式名称），
 * 只借用该诊断里「可观察到的行为表现」做玩法，不描述、不评判真实的患病体验，
 * 也不构成任何医学诊断。名称与编码均来自现行诊断分类，没有自造病名。
 *
 * 叠加规则：
 *   - 不同糖果的状态可以同时存在，行为与数值按乘法叠加；
 *   - 同一种糖果再吃一颗，持续时间累加（上限为单颗时长的 2 倍）。
 */

export const CANDY_EFFECTS = Object.freeze({
  candyCorn: {
    disorder: '躁狂症',
    code: 'F30',
    icdName: '躁狂发作',
    tag: '自动高跳',
    duration: 10,
    accent: '#ffcf4a',
    summary:
      '精力过剩、动作停不下来：每隔一小段时间自动向上跳，跳高是平常的 2 倍；跳到空中也照样能左右移动。',
    mods: { moveScale: 1.06 },
    // height 是「高度倍数」，换算成初速度时会开平方。
    autoJump: { height: 2, interval: [1.0, 1.8] },
  },

  lollipop: {
    disorder: '强迫症',
    code: 'F42',
    icdName: '强迫性障碍',
    tag: '重复跳跃',
    duration: 10,
    accent: '#ff6fa5',
    summary:
      '重复同一个动作：每次起跳落地后，身体会不受控地再补跳一次，约为平常高度的 3/4。',
    mods: {},
    repeatJump: { height: 0.75, delay: 0.06 },
  },

  chocolate: {
    disorder: '抑郁障碍',
    code: 'F32',
    icdName: '抑郁发作',
    tag: '动作迟滞',
    duration: 10,
    accent: '#a87a58',
    summary:
      '精神运动性迟滞：脚步变慢、跳跃变低，身体也更沉——落地比平时更重、更快。',
    mods: { moveScale: 0.62, jumpVelocityScale: 0.91, gravityScale: 1.18 },
  },

  sourGummy: {
    disorder: '惊恐障碍',
    code: 'F41.0',
    icdName: '惊恐障碍',
    tag: '惊恐冲刺',
    duration: 8,
    accent: '#8dffa8',
    summary:
      '突如其来的惊恐与逃离冲动：每隔几秒不受控地向前冲一步，并带一个短促的惊跳；冲刺的一瞬间不会被危险碰到。',
    mods: {},
    panic: { interval: [2.6, 3.8], speed: 250, hop: 150, grace: 0.45 },
  },

  licorice: {
    disorder: '注意缺陷多动障碍',
    code: 'F90',
    icdName: '多动性障碍',
    tag: '多动 · 走神',
    duration: 10,
    accent: '#c86b6b',
    summary:
      '多动、注意难以持续：跑得更快，但每隔一阵会走神半秒，左右输入暂时不起作用。',
    mods: { moveScale: 1.45, frictionScale: 0.6 },
    lapse: { interval: [2.0, 3.2], duration: 0.3 },
  },

  marshmallow: {
    disorder: '妄想性障碍',
    code: 'F22',
    icdName: '妄想性障碍',
    tag: '飞行妄想',
    duration: 8,
    accent: '#ffd9ec',
    summary:
      '夸大性妄想：你坚信自己会飞——这 8 秒里真的飞得起来。按住 ↑ 持续上升，松开就慢慢下沉，← → 照常移动；飞着的时候，场也暂时拉不住你。',
    mods: {},
    flight: { riseAccel: 640, fallAccel: 420, maxRise: 175, maxFall: 130, idleGravity: 140 },
  },

  poppingCandy: {
    disorder: '抽动障碍',
    code: 'F95',
    icdName: '抽动障碍',
    tag: '不自主抽动',
    duration: 8,
    accent: '#ff9a6b',
    summary:
      '不自主的抽动：每隔一秒左右，身体会突然抖一下——短促地向上弹一点，同时往旁边偏一点。',
    mods: {},
    tic: { interval: [0.7, 1.4], hop: 150, push: 70 },
  },

  toffee: {
    disorder: '双相情感障碍',
    code: 'F31',
    icdName: '双相情感障碍',
    tag: '两极交替',
    duration: 12,
    accent: '#e0ad63',
    summary:
      '情绪在两极之间来回，每 3 秒换一次：高涨时脚步轻快、跳得更高；低落时整个人沉下来，走得慢、跳得低。',
    mods: {},
    bipolar: {
      period: 3,
      high: { moveScale: 1.5, jumpVelocityScale: 1.2 },
      low: { moveScale: 0.55, jumpVelocityScale: 0.8 },
    },
  },

  mint: {
    disorder: '发作性睡病',
    code: 'G47.4',
    icdName: '发作性睡病',
    tag: '睡眠发作',
    duration: 10,
    accent: '#a9ecff',
    summary:
      '突如其来的睡意：每隔几秒会睡着约 1 秒，期间左右和跳跃都不听使唤，身体顺着惯性往下坠。',
    mods: {},
    sleep: { interval: [4.5, 6.5], duration: 1 },
  },

  nougat: {
    disorder: '对立违抗障碍',
    code: 'F91.3',
    icdName: '对立违抗性障碍',
    tag: '反向操作',
    duration: 8,
    accent: '#f0d29a',
    summary:
      '你说东，它偏往西：← 和 → 的效果对调。想往右走，得按左键。',
    mods: { invertAxis: true },
  },
});

export const CANDY_EFFECT_TYPES = Object.freeze(Object.keys(CANDY_EFFECTS));

export function getCandyEffect(type) {
  return CANDY_EFFECTS[type] ?? null;
}

/** 没有任何状态时的中性修正值。 */
export function neutralEffectMods() {
  return {
    moveScale: 1,
    jumpVelocityScale: 1,
    frictionScale: 1,
    gravityScale: 1,
    lockAxis: false,
    lockJump: false,
    invertAxis: false,
    flight: null,
  };
}

export function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}
