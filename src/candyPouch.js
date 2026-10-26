/**
 * 糖袋：跨线路保存的增益糖。
 *
 * 糖果来自「Trick or Treat」副本，装进袋子后可以在任何一条路上按 Q 吃一颗。
 * 这里只存每种增益糖的数量，不存状态；状态由当前这一局的 session.candyEffects 管。
 *
 * 和新手教程 / 追思路上的彩色糖纸是两套东西：
 * 糖纸捡到就吃，是临时状态；糖袋里的糖可以留到别的线路。
 *
 * localStorage 不可用（隐私模式、file:// 等）时退化成只在本次页面里有效。
 */
import { BUFF_CANDY_TYPES } from './buffCandies.js';

export const POUCH_STORAGE_KEY = 'pumpkin-hollow.candy-pouch.v1';
export const POUCH_LIMIT = 99;

function emptyCounts() {
  return Object.fromEntries(BUFF_CANDY_TYPES.map((type) => [type, 0]));
}

function sanitize(raw) {
  const counts = emptyCounts();
  if (!raw || typeof raw !== 'object') return counts;
  for (const type of BUFF_CANDY_TYPES) {
    const value = Number(raw[type]);
    if (!Number.isFinite(value) || value <= 0) continue;
    counts[type] = Math.min(POUCH_LIMIT, Math.floor(value));
  }
  return counts;
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(POUCH_STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : emptyCounts();
  } catch {
    return emptyCounts();
  }
}

function writeStorage(counts) {
  try {
    window.localStorage.setItem(POUCH_STORAGE_KEY, JSON.stringify(counts));
    return true;
  } catch {
    return false;
  }
}

export class CandyPouch {
  constructor() {
    this.counts = readStorage();
  }

  get(type) {
    return this.counts[type] ?? 0;
  }

  get total() {
    return BUFF_CANDY_TYPES.reduce((sum, type) => sum + this.get(type), 0);
  }

  /** 放进去几颗就返回几颗；袋满时可能少于请求的数量。 */
  add(type, amount = 1) {
    if (!BUFF_CANDY_TYPES.includes(type) || amount <= 0) return 0;
    const before = this.get(type);
    const after = Math.min(POUCH_LIMIT, before + Math.floor(amount));
    this.counts[type] = after;
    writeStorage(this.counts);
    return after - before;
  }

  /** 吃一颗。袋子空的时候返回 false，不改任何状态。 */
  take(type) {
    if (this.get(type) <= 0) return false;
    this.counts[type] -= 1;
    writeStorage(this.counts);
    return true;
  }

  snapshot() {
    return {
      counts: { ...this.counts },
      total: this.total,
      limit: POUCH_LIMIT,
      types: [...BUFF_CANDY_TYPES],
    };
  }

  reset() {
    this.counts = emptyCounts();
    writeStorage(this.counts);
  }
}
