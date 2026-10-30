/**
 * 可拾取物的统一图鉴。
 *
 * 三类东西共用一套拾取逻辑：
 *   bone  —— 骨头，其中 skull / rib / femur / leftHand 同时是骷髅时装的零件；
 *   part  —— 其他时装的零件；
 *   candy —— 旧糖果条目：这一版路上不摆糖，糖果只来自糖纸街的糖袋，条目保留未用。
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

  // 吸血鬼
  vampireCollar: { category: 'part', label: '高竖领', costume: 'vampire', rarity: 'common', glow: '226, 96, 110' },
  vampireCape: { category: 'part', label: '燕尾披风', costume: 'vampire', rarity: 'rare', glow: '226, 96, 110' },
  fangs: { category: 'part', label: '尖牙假牙', costume: 'vampire', rarity: 'common', glow: '255, 236, 220' },

  // 木乃伊
  mummyEye: { category: 'part', label: '蒙眼布条', costume: 'mummy', rarity: 'common', glow: '226, 210, 170' },
  mummyWrap: { category: 'part', label: '旧绷带', costume: 'mummy', rarity: 'uncommon', glow: '226, 210, 170' },
  mummyTail: { category: 'part', label: '松开的布尾', costume: 'mummy', rarity: 'rare', glow: '226, 210, 170' },

  // 小女巫
  witchHat: { category: 'part', label: '宽檐尖帽', costume: 'witch', rarity: 'rare', glow: '178, 150, 255' },
  broom: { category: 'part', label: '旧扫帚', costume: 'witch', rarity: 'uncommon', glow: '178, 150, 255' },
  catDoll: { category: 'part', label: '黑猫布偶', costume: 'witch', rarity: 'rare', glow: '178, 150, 255' },

  // 旧糖果条目：这一版没有关卡摆放，效果定义留在 candyEffects.js。
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
 * 五套时装，每套三件左右。
 * 骷髅直接使用教程小径上本来就有的骨头，不额外消耗右手骨；
 * 吸血鬼、木乃伊和小女巫的零件分在「给老师送南瓜派」的四段夜路上。
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
    blurb: '教程小径上捡的骨头，正好拼成一副骨架。左手骨最难找。',
    parts: ['skull', 'rib', 'femur', 'leftHand'],
    accent: '#f2e4cc',
  },
  {
    id: 'vampire',
    name: '吸血鬼',
    subtitle: '夜里的体面人',
    blurb: '高竖领、燕尾披风，再配一对尖牙。走夜路也要体面。',
    parts: ['vampireCollar', 'vampireCape', 'fangs'],
    accent: '#e0606e',
  },
  {
    id: 'mummy',
    name: '木乃伊',
    subtitle: '刚从地窖出来',
    blurb: '旧绷带从头缠到脚，只留一条缝看路，最后再拖一段松开的布尾。',
    parts: ['mummyEye', 'mummyWrap', 'mummyTail'],
    accent: '#d9cba6',
  },
  {
    id: 'witch',
    name: '小女巫',
    subtitle: '跟着扫帚走',
    blurb: '宽檐尖帽、一把旧扫帚，肩头再坐一只黑猫布偶。',
    parts: ['witchHat', 'broom', 'catDoll'],
    accent: '#b296ea',
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
