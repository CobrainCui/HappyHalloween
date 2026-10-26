/**
 * 可拾取物的统一图鉴。
 *
 * 三类东西共用一套拾取逻辑：
 *   bone  —— 骨头，其中 skull / rib / femur / leftHand 同时是骷髅时装的零件；
 *   part  —— 其他时装的零件；
 *   candy —— 糖果，捡到就会吃下，短暂进入一种「状态」。具体效果见 candyEffects.js。
 *
 * 时装的完成条件是「每种零件至少捡到过一次」。收集记录只增不减，
 * 所以之后就算把背包里的东西用掉，也不会把已经见过的零件扣回去。
 */

export const ITEM_DEFS = Object.freeze({
  // 骨头
  rib: { category: 'bone', label: '肋骨', costume: 'skeleton', rarity: 'common', glow: '255, 222, 157' },
  femur: { category: 'bone', label: '腿骨', costume: 'skeleton', rarity: 'common', glow: '255, 222, 157' },
  skull: { category: 'bone', label: '头骨', costume: 'skeleton', rarity: 'common', glow: '255, 222, 157' },
  leftHand: { category: 'bone', label: '左手骨', costume: 'skeleton', rarity: 'uncommon', glow: '255, 222, 157' },
  rightHand: { category: 'bone', label: '右手骨', rarity: 'common', glow: '255, 222, 157' },

  // 阿飘
  sheet: { category: 'part', label: '旧床单', costume: 'ghost', rarity: 'common', glow: '206, 214, 235' },
  eyeHoles: { category: 'part', label: '黑布眼洞', costume: 'ghost', rarity: 'uncommon', glow: '140, 220, 255' },

  // 南瓜巫师
  wizardHat: { category: 'part', label: '破尖帽', costume: 'pumpkinWizard', rarity: 'rare', glow: '255, 196, 120' },
  starCloak: { category: 'part', label: '星纹斗篷', costume: 'pumpkinWizard', rarity: 'rare', glow: '255, 196, 120' },
  wand: { category: 'part', label: '南瓜魔杖', costume: 'pumpkinWizard', rarity: 'rare', glow: '255, 196, 120' },
  spellbook: { category: 'part', label: '咒语书', costume: 'pumpkinWizard', rarity: 'uncommon', glow: '140, 220, 255' },
  beard: { category: 'part', label: '假胡子', costume: 'pumpkinWizard', rarity: 'uncommon', glow: '140, 220, 255' },

  // 糖果：每种糖对应一种状态，各自的疾病名与行为在 candyEffects.js 里。
  candyCorn: { category: 'candy', label: '玉米糖', rarity: 'common', glow: '255, 176, 92' },
  lollipop: { category: 'candy', label: '棒棒糖', rarity: 'common', glow: '255, 132, 182' },
  chocolate: { category: 'candy', label: '巧克力', rarity: 'common', glow: '214, 154, 110' },
  sourGummy: { category: 'candy', label: '酸味软糖', rarity: 'uncommon', glow: '141, 255, 168' },
  licorice: { category: 'candy', label: '甘草糖', rarity: 'uncommon', glow: '200, 107, 107' },
  marshmallow: { category: 'candy', label: '棉花糖', rarity: 'uncommon', glow: '255, 217, 236' },
  poppingCandy: { category: 'candy', label: '跳跳糖', rarity: 'uncommon', glow: '255, 154, 107' },
  toffee: { category: 'candy', label: '太妃糖', rarity: 'uncommon', glow: '224, 173, 99' },
  mint: { category: 'candy', label: '薄荷糖', rarity: 'uncommon', glow: '169, 236, 255' },
  nougat: { category: 'candy', label: '牛轧糖', rarity: 'uncommon', glow: '240, 210, 154' },
});

export const RARITY = Object.freeze({
  common: { label: '常见', color: '#9bb27d' },
  uncommon: { label: '少见', color: '#78c7e8' },
  rare: { label: '稀有', color: '#d79bff' },
});

/**
 * 三套时装，零件数分别是 2 / 4 / 5，收集难度依次提高。
 * 骷髅直接使用路上本来就有的骨头，不额外消耗右手骨。
 */
export const COSTUMES = Object.freeze([
  {
    id: 'ghost',
    name: '阿飘',
    subtitle: '假扮鬼',
    blurb: '把旧床单罩在头上，剪两个洞。今晚扮鬼。',
    parts: ['sheet', 'eyeHoles'],
    accent: '#cdd7ea',
  },
  {
    id: 'skeleton',
    name: '骷髅',
    subtitle: '骨头拼的',
    blurb: '路上捡的骨头，正好拼成一副骨架。左手骨最难找。',
    parts: ['skull', 'rib', 'femur', 'leftHand'],
    accent: '#f2e4cc',
  },
  {
    id: 'pumpkinWizard',
    name: '南瓜巫师',
    subtitle: '长夜里的正经巫师',
    blurb: '尖帽、星袍、魔杖、咒语书，再加上一把假胡子。',
    parts: ['wizardHat', 'starCloak', 'wand', 'spellbook', 'beard'],
    accent: '#ffb347',
  },
]);

export const COSTUME_BY_ID = new Map(COSTUMES.map((costume) => [costume.id, costume]));

export const CANDY_TYPES = Object.freeze(
  Object.keys(ITEM_DEFS).filter((type) => ITEM_DEFS[type].category === 'candy'),
);

const FALLBACK_ITEM = Object.freeze({
  category: 'bone',
  label: '骨头',
  rarity: 'common',
  glow: '255, 222, 157',
});

export function getItemDef(type) {
  return ITEM_DEFS[type] ?? FALLBACK_ITEM;
}

export function getRarity(type) {
  return RARITY[getItemDef(type).rarity] ?? RARITY.common;
}

export function isBone(type) {
  return getItemDef(type).category === 'bone';
}

export function isPart(type) {
  return getItemDef(type).category === 'part';
}

export function isCandy(type) {
  return getItemDef(type).category === 'candy';
}

export function difficultyLabel(partCount) {
  if (partCount <= 2) return '易拼';
  if (partCount <= 4) return '顺手';
  return '费事';
}
