/**
 * 糖纸街后八户的门上谜题。
 *
 * 女巫和男巫的任务是整间房；其余八户不再搬南瓜，而是八种不同的门：
 *   skeleton   找规律（骨阵）
 *   ghost      脑筋急转弯
 *   werewolf   高难度闯关（屋顶追月，数据在 level.js / game.js）
 *   mummy      记忆配对
 *   franken    万圣节知识问答
 *   cat        找不同
 *   pumpkinKing 天平推理
 *   vampire    真假话推理
 *
 * 这里只放题目和纯数据；面板渲染在 puzzleView.js，进度存在 session 里。
 */

export const TRICK_PUZZLES = Object.freeze({
  skeleton: {
    type: 'sequence',
    title: '骨牌上的数',
    intro: '阿骨把骨头摆成三排。最后一堆空着，等你按规矩补上。',
    rounds: [
      {
        values: [1, 2, 4, 8],
        prompt: '下一堆该有几根骨头？',
        options: [12, 16, 24, 32],
        answer: 1,
        why: '每一堆都是前一排的两倍。',
        hint: '看相邻两堆的倍数，不是加多少。',
      },
      {
        values: [1, 1, 2, 3, 5],
        prompt: '下一堆该有几根骨头？',
        options: [6, 7, 8, 10],
        answer: 2,
        why: '前两堆加起来，正好是下一堆。',
        hint: '把前两堆放到一起数一遍。',
      },
      {
        values: [2, 3, 5, 8, 12],
        prompt: '下一堆该有几根骨头？',
        options: [15, 16, 17, 20],
        answer: 2,
        why: '相邻两堆依次多 1、2、3、4，所以再往下该多 5。',
        hint: '先看每一对相邻的骨头差多少。',
      },
    ],
  },

  ghost: {
    type: 'riddle',
    title: '床单上的三个问题',
    intro: '小飘睡不着，在床单上写了三道题。答对，窗子就会亮一盏。',
    rounds: [
      {
        prompt: '什么东西越洗越脏？',
        options: ['水', '毛巾', '南瓜', '月亮'],
        answer: 0,
        why: '水把别的东西洗干净，自己就脏了。',
        hint: '它没有固定的形状，洗的时候总要流走。',
      },
      {
        prompt: '什么门永远关不上？',
        options: ['球门', '车门', '家门', '校门'],
        answer: 0,
        why: '球门只有门框，没有门扇。',
        hint: '它站在那里，总有人往里面踢东西。',
      },
      {
        prompt: '一年里有几个月有 28 天？',
        options: ['二月', '每个月', '十二月', '没有'],
        answer: 1,
        why: '每个月都至少有 28 天，不止二月。',
        hint: '别只想二月。',
      },
    ],
  },

  mummy: {
    type: 'memory',
    title: '绷带下的图案',
    intro: '十六张牌，八对图案。翻开两张一样的，绷带就松开一截。',
    pairs: 8,
    icons: ['pumpkin', 'ghost', 'bat', 'skull', 'candle', 'moon', 'cat', 'candy'],
  },

  franken: {
    type: 'trivia',
    title: '四道万圣题',
    intro: '阿壮的脑袋里接错了线。答对四道万圣节的题，线路就通。',
    rounds: [
      {
        prompt: '万圣节前夜（Halloween）是几月几日？',
        options: ['10 月 31 日', '11 月 1 日', '12 月 24 日', '10 月 1 日'],
        answer: 0,
        why: '万圣夜是 10 月 31 日，第二天才是万圣节。',
        hint: '它在十月的最后一天。',
      },
      {
        prompt: '“Trick or treat” 是什么意思？',
        options: ['不给糖就捣蛋', '一起跳舞', '要糖或要钱', '晚上好'],
        answer: 0,
        why: '孩子们敲门要糖：给糖，还是捣蛋。',
        hint: '和糖有关，也和捣蛋有关。',
      },
      {
        prompt: '南瓜灯最早不是用南瓜做的。最早用的是什么？',
        options: ['芜菁', '西瓜', '木头', '陶罐'],
        answer: 0,
        why: '爱尔兰人最早把芜菁挖空做灯，到了美洲才改用南瓜。',
        hint: '是一种根茎很大的蔬菜。',
      },
      {
        prompt: '万圣节起源于哪个古老节庆？',
        options: ['凯尔特人的萨温节', '古罗马的农神节', '北欧的冬至', '埃及的尼罗河节'],
        answer: 0,
        why: '萨温节（Samhain）是凯尔特人的夏末节，后来和万圣节连在一起。',
        hint: '来自不列颠群岛的古老民族。',
      },
    ],
  },

  cat: {
    type: 'spot',
    title: '两扇窗',
    intro: '左边是煤球看见的窗，右边是你看见的窗。右边有四处不一样。',
    columns: 4,
    // 两扇窗的十六个格子。null 是空格；candleOut / moonFull 是同一个图案的另一种样子。
    left: [
      'moon', 'bat', 'pumpkin', 'ghost',
      'candle', 'skull', 'cat', 'candy',
      'tomb', 'candle', 'spider', 'pumpkin',
      'ghost', 'cat', null, 'moon',
    ],
    right: [
      'moon', null, 'pumpkin', 'ghost',
      'candleOut', 'skull', 'cat', 'candy',
      'tomb', 'candle', 'spider', 'pumpkin',
      'ghost', 'cat', 'spider', 'moonFull',
    ],
  },

  pumpkinKing: {
    type: 'balance',
    title: '南瓜秤',
    intro: '老瓤的三杆秤都差一点才平。把右边的糖加到刚刚好。',
    rounds: [
      {
        equations: [
          { left: [{ icon: 'pumpkin', n: 1 }], right: [{ icon: 'apple', n: 2 }] },
          { left: [{ icon: 'apple', n: 1 }], right: [{ icon: 'candy', n: 3 }] },
        ],
        question: { left: [{ icon: 'pumpkin', n: 1 }], right: [{ icon: 'candy', n: '?' }] },
        answer: 6,
        max: 15,
        why: '一个南瓜等于两个苹果；每个苹果三颗糖，所以 2 × 3 = 6。',
        hint: '先把南瓜换成苹果，再把苹果换成糖。',
      },
      {
        equations: [
          { left: [{ icon: 'pumpkin', n: 1 }], right: [{ icon: 'apple', n: 3 }] },
          { left: [{ icon: 'apple', n: 1 }], right: [{ icon: 'candy', n: 2 }] },
        ],
        question: { left: [{ icon: 'pumpkin', n: 2 }], right: [{ icon: 'candy', n: '?' }] },
        answer: 12,
        max: 20,
        why: '一个南瓜等于三个苹果，每个苹果两颗糖：3 × 2 = 6，两个南瓜就是 12。',
        hint: '先算一个南瓜，再翻倍。',
      },
      {
        equations: [
          { left: [{ icon: 'pumpkin', n: 1 }, { icon: 'apple', n: 1 }], right: [{ icon: 'candy', n: 5 }] },
          { left: [{ icon: 'apple', n: 1 }], right: [{ icon: 'candy', n: 2 }] },
        ],
        question: { left: [{ icon: 'pumpkin', n: 1 }], right: [{ icon: 'candy', n: '?' }] },
        answer: 3,
        max: 12,
        why: '苹果占两颗糖，剩下的 5 − 2 = 3 颗就是南瓜。',
        hint: '先把苹果那部分从五颗糖里拿掉。',
      },
    ],
  },

  vampire: {
    type: 'deduction',
    title: '三只箱子',
    intro: '德古把糖藏进一只箱子。每轮只有一句箱子上写的是真话。',
    rounds: [
      {
        prompt: '三只箱子，只有一只箱子上的话是真的。糖在哪只箱子？',
        boxes: [
          { label: 'A', text: '糖在 B 箱里。' },
          { label: 'B', text: '糖不在 B 箱里。' },
          { label: 'C', text: '糖不在 C 箱里。' },
        ],
        options: ['A 箱', 'B 箱', 'C 箱'],
        answer: 2,
        why: 'A 和 B 的话正好相反，必有一真。那 C 的话就是假——糖在 C 箱。',
        hint: '先找两句互相矛盾的话。',
      },
      {
        prompt: '三只箱子，只有一只箱子上的话是真的。糖在哪只箱子？',
        boxes: [
          { label: 'A', text: '糖在 C 箱里。' },
          { label: 'B', text: '糖不在 A 箱里。' },
          { label: 'C', text: '糖不在 C 箱里。' },
        ],
        options: ['A 箱', 'B 箱', 'C 箱'],
        answer: 0,
        why: 'A 和 C 的话正好相反，必有一真。B 的话是假——糖在 A 箱。',
        hint: '哪两句说的是同一只箱子，却一个说在一个说不在？',
      },
      {
        prompt: '三只箱子，只有一只箱子上的话是真的。糖在哪只箱子？',
        boxes: [
          { label: 'A', text: '糖在 A 箱里。' },
          { label: 'B', text: '糖不在 A 箱里。' },
          { label: 'C', text: '糖不在 B 箱里。' },
        ],
        options: ['A 箱', 'B 箱', 'C 箱'],
        answer: 1,
        why: 'A 和 B 的话正好相反，必有一真。C 的话是假——糖在 B 箱。',
        hint: 'A 和 B 总有一句是真的，所以 C 只能是假的。',
      },
    ],
  },
});

export function getTrickPuzzle(houseId) {
  return TRICK_PUZZLES[houseId] ?? null;
}

/** 谜题里的一格：null 是空格；xxOut / xxFull 是另一种画法。 */
export function normalizeCell(cell) {
  if (!cell) return null;
  if (cell === 'candleOut') return { icon: 'candle', variant: 1 };
  if (cell === 'moonFull') return { icon: 'moon', variant: 1 };
  if (cell === 'catGold') return { icon: 'cat', variant: 1 };
  return { icon: cell, variant: 0 };
}

export function cellKey(cell) {
  const normalized = normalizeCell(cell);
  return normalized ? `${normalized.icon}:${normalized.variant}` : null;
}

/** 找不同：左右两扇窗里所有不一样的格子。 */
export function spotDifferences(puzzle) {
  const differences = [];
  for (let index = 0; index < puzzle.left.length; index += 1) {
    if (cellKey(puzzle.left[index]) !== cellKey(puzzle.right[index])) {
      differences.push(index);
    }
  }
  return differences;
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** 新开一扇谜题门时的初始进度。 */
export function createPuzzleState(puzzle, random = Math.random) {
  if (!puzzle) return { step: 0, mistakes: 0 };
  if (puzzle.type === 'memory') {
    const deck = shuffle([...puzzle.icons, ...puzzle.icons], random);
    return { deck, matched: [], open: [], moves: 0 };
  }
  if (puzzle.type === 'spot') {
    return { found: [], mistakes: 0 };
  }
  return { step: 0, mistakes: 0 };
}

/** 存档里读回来的进度可能缺字段，补齐后再交给面板。 */
export function normalizePuzzleState(puzzle, state, random = Math.random) {
  if (!puzzle) return { step: 0, mistakes: 0 };
  const fresh = createPuzzleState(puzzle, random);
  if (!state || typeof state !== 'object') return fresh;

  if (puzzle.type === 'memory') {
    const deck = Array.isArray(state.deck) ? state.deck : [];
    const valid = deck.length === (puzzle.pairs ?? 0) * 2;
    if (!valid) return fresh;
    const inRange = (index) => Number.isInteger(index) && index >= 0 && index < deck.length;
    const open = Array.isArray(state.open) ? state.open.filter(inRange).slice(0, 2) : [];
    return {
      deck,
      matched: Array.isArray(state.matched) ? state.matched.filter(inRange) : [],
      // 只保留一张翻开的牌；两张悬着的牌是上一次比较到一半，重开时清掉。
      open: open.length === 1 ? open : [],
      moves: Number.isFinite(state.moves) ? Math.max(0, state.moves) : 0,
    };
  }

  if (puzzle.type === 'spot') {
    const valid = new Set(spotDifferences(puzzle));
    return {
      found: Array.isArray(state.found)
        ? [...new Set(state.found.filter((index) => valid.has(index)))]
        : [],
      mistakes: Number.isFinite(state.mistakes) ? Math.max(0, state.mistakes) : 0,
    };
  }

  const total = puzzle.rounds?.length ?? 0;
  return {
    step: Number.isFinite(state.step) ? Math.max(0, Math.min(total, state.step)) : 0,
    mistakes: Number.isFinite(state.mistakes) ? Math.max(0, state.mistakes) : 0,
  };
}

/** 面板进度，也给街上的任务条用。 */
export function getPuzzleProgress(puzzle, state) {
  const fallback = { progress: 0, total: 1, ratio: 0, text: '' };
  if (!puzzle) return fallback;
  if (puzzle.type === 'memory') {
    const matchedCards = new Set(state?.matched ?? []).size;
    const matched = Math.floor(matchedCards / 2);
    const total = puzzle.pairs;
    return {
      progress: matched,
      total,
      ratio: total > 0 ? matched / total : 0,
      text: `配对 ${matched}/${total}`,
    };
  }
  if (puzzle.type === 'spot') {
    const found = state?.found?.length ?? 0;
    const total = spotDifferences(puzzle).length;
    return {
      progress: found,
      total,
      ratio: total > 0 ? found / total : 0,
      text: `找到 ${found}/${total} 处`,
    };
  }
  const total = puzzle.rounds?.length ?? 1;
  const step = Math.min(state?.step ?? 0, total);
  return {
    progress: step,
    total,
    ratio: total > 0 ? step / total : 0,
    text: step >= total ? '都答对了' : `第 ${step + 1}/${total} 题`,
  };
}
