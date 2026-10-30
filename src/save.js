/**
 * 浏览器本地存档。
 *
 * 游戏逻辑只依赖三个动作：load() / save(game) / reset()。
 * 存什么由 snapshot() 的白名单决定——新增玩法字段必须手动登记，
 * 这样定时器、过场和瞬时身体状态不会悄悄写进存档。
 *
 * Set 不能直接 JSON 序列化（会变成 {}），所有 Set 在这里统一展开成数组，
 * 读档时再还原成 Set。
 */

import { COSTUME_BY_ID } from './collectibles.js';

const STORAGE_KEY = 'pumpkin-hollow.save.v1';
const SCHEMA_VERSION = 2;
// 走路时每隔一段时间落一次盘；显式事件（落脚点、拾取、通关）也会触发，
// 但都走同一个节流，最多每秒写一次 localStorage。
const WRITE_INTERVAL = 1000;
const AUTOSAVE_INTERVAL = 2;

export const AUTOSAVE_SECONDS = AUTOSAVE_INTERVAL;

const ROUTE_LABELS = {
  tutorial: '新手教程',
  memorial: '给老师送南瓜派',
  parade: '魑魅魍魉',
  trick: 'Trick or Treat',
};

const SAVEABLE_MODES = new Set(Object.keys(ROUTE_LABELS));

/** localStorage 后端。将来换成云端时只需要实现同样的三个方法。 */
const browserLocal = {
  read() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  write(text) {
    window.localStorage.setItem(STORAGE_KEY, text);
  },
  remove() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

let backend = browserLocal;
// 最近一次读入或合并后的完整文档。
let doc = null;
// 存档来自更新版本：不清档，也不覆盖，交给玩家决定。
let readOnly = false;
let pending = false;
let timer = 0;
let lastWrite = 0;
let reportedError = false;
let errorReporter = null;

function report(message) {
  if (reportedError) return;
  reportedError = true;
  if (errorReporter) errorReporter(message);
  else console.warn(message);
}

export function setErrorReporter(fn) {
  errorReporter = typeof fn === 'function' ? fn : null;
}

export function setBackend(next) {
  if (!next || typeof next.read !== 'function') return;
  backend = next;
  doc = null;
  readOnly = false;
}

/**
 * 逐版迁移。
 *   第 0 版（没有 schemaVersion 的旧档）：直接补上版本号；
 *   第 1 版：信是「弹出来就算看过」，没有打开 / 稍后再看的选择。
 *            升成已读并收进背包，老玩家也能在背包里重新翻开它、和鞋说话。
 */
const MIGRATIONS = {
  0: (data) => data,
  1: (data) => {
    if (!data.settings?.memorialLetterSeen) return data;
    if (data.settings.memorialLetterRead !== undefined) return data;
    return {
      ...data,
      settings: {
        ...data.settings,
        memorialLetterRead: true,
        memorialLetterInBag: true,
      },
    };
  },
};

function migrate(data) {
  let version = Number.isFinite(data.schemaVersion) ? data.schemaVersion : 0;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    data = step(data);
    version += 1;
  }
  return { ...data, schemaVersion: version };
}

export function load() {
  let raw = null;
  try {
    raw = backend.read();
  } catch (error) {
    report('读取存档失败：浏览器不允许本地存储。');
    return null;
  }
  if (!raw) {
    doc = null;
    readOnly = false;
    return null;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    report('存档已损坏，本次从起点开始（旧档没有被删除）。');
    doc = null;
    readOnly = false;
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    doc = null;
    readOnly = false;
    return null;
  }

  const version = Number.isFinite(parsed.schemaVersion) ? parsed.schemaVersion : 0;
  if (version > SCHEMA_VERSION) {
    // 更新的版本：不迁移、不清档、不覆盖。
    readOnly = true;
    doc = parsed;
    report('存档来自更新的版本，本次不会覆盖它。清档后才能重新保存。');
    return parsed;
  }

  readOnly = false;
  doc = migrate(parsed);
  // 老存档里主线可能已经通关却没有这个标记：升成一次性的剧情标记，
  // 免得重走主线时把皮鞋的合脚度和那封信又清零。
  if (doc.routes?.memorial?.completed && !doc.settings?.memorialCleared) {
    doc.settings = { ...(doc.settings ?? {}), memorialCleared: true };
  }
  return doc;
}

/** 内存里的当前文档；起始页刷新「继续」按钮时用，不重新读盘。 */
export function current() {
  return doc;
}

/** 当前文档里是否有值得继续的进度。 */
export function hasProgress(data = doc) {
  return Boolean(describeRun(data));
}

/**
 * 新手教程是不是已经走完——起始页靠它决定主线开不开。
 *
 * 这一条只记在 settings.tutorialCleared 里，而且只往上翻：
 * 重走教程、中途退出都不会把主线重新锁上。
 * 老存档没有这个字段：只要其它线路留下过记录，就当成早就过了教程。
 */
export function tutorialCleared(data = doc) {
  if (!data) return false;
  if (data.settings?.tutorialCleared) return true;
  const routes = data.routes ?? {};
  return ['memorial', 'parade', 'trick'].some((key) => Boolean(routes[key]));
}

/**
 * 主线「给老师送南瓜派」走完过一次没有。
 *
 * 和教程标记一样只往上翻：走完一次之后，皮鞋就永远合脚、之后每一趟都从 100% 起，
 * 也不会再收到老师那封信。重走主线、中途退出都不会把它抹掉。
 */
export function memorialCleared(data = doc) {
  if (!data) return false;
  if (data.settings?.memorialCleared) return true;
  // 兼容老存档：读档时通常已经被提升成 settings 里的标记，这里再兜一层。
  return Boolean(data.routes?.memorial?.completed);
}

/** 老师那封信是不是已经递到玩家面前过了；递过一次就不再自动弹出。 */
export function memorialLetterSeen(data = doc) {
  return Boolean(data?.settings?.memorialLetterSeen);
}

/** 老师那封信递到玩家面前的那一刻记一次，并立刻落盘。 */
export function markMemorialLetterSeen() {
  return patchSettings({ memorialLetterSeen: true });
}

/** 信读过了没有。读过之后底部才会出现「与皮鞋对话」。 */
export function memorialLetterRead(data = doc) {
  return Boolean(data?.settings?.memorialLetterRead);
}

/** 信是不是收在背包里：选了「稍后再看」，或者后来读完了。 */
export function memorialLetterInBag(data = doc) {
  return Boolean(data?.settings?.memorialLetterInBag);
}

/** 把信收进背包（「稍后再看」时调用）。 */
export function markMemorialLetterInBag() {
  return patchSettings({ memorialLetterInBag: true });
}

/** 信被打开读完：既算已读，也从此收进背包，随时能再翻。 */
export function markMemorialLetterRead() {
  return patchSettings({ memorialLetterRead: true, memorialLetterInBag: true });
}

/** 写一条 settings 标记并立刻落盘。 */
function patchSettings(patch) {
  if (readOnly) return false;
  if (!doc) doc = { schemaVersion: SCHEMA_VERSION, settings: {}, routes: {} };
  doc.settings = { ...(doc.settings ?? {}), ...patch };
  pending = true;
  // 这些都是一辈子只发生一次的剧情标记：直接落盘，别等节流那一秒。
  return flush();
}

/** 某条线路走到第几段；没有记录时按 1 算。 */
export function routeStage(key, route) {
  const stage = Math.max(1, route?.stage ?? 1);
  // 旧存档里的第三段是电磁赛道；现在它顺延到第四段。
  return key === 'memorial' && stage === 3 && route?.sneakCheckpointIndex === undefined ? 4 : stage;
}

function routeKeyOf(game) {
  return SAVEABLE_MODES.has(game?.mode) ? game.mode : null;
}

function takeCheckpoint(game, session) {
  const checkpoint = session.checkpoint ?? game.level?.spawn ?? { x: 0, y: 0 };
  const label = game.level?.checkpoints?.[session.checkpointIndex]?.label ?? '';
  return {
    checkpoint: { x: Math.round(checkpoint.x ?? 0), y: Math.round(checkpoint.y ?? 0) },
    checkpointIndex: session.checkpointIndex ?? -1,
    checkpointLabel: label,
  };
}

/** 从当前 Game 实例抽出可持久的部分（第二节 A–D 的白名单）。 */
export function snapshot(game) {
  const routeKey = routeKeyOf(game);
  const session = game?.session;
  const level = game?.level;
  if (!routeKey || !session || !level) return null;

  const stage = routeKey === 'tutorial' ? 1 : level.stage ?? 1;
  const route = {
    stage,
    levelId: level.id,
    completed: Boolean(session.completed),
    updatedAt: new Date().toISOString(),
    ...takeCheckpoint(game, session),
  };

  if (routeKey === 'tutorial') {
    route.step = session.tutorialStep ?? 0;
  } else if (routeKey === 'memorial') {
    route.litLights = [...(session.litLights ?? [])];
    route.seenMemories = [...(session.seenMemories ?? [])];
    // 第三段是双人潜行：影子记号、被发现和失足次数跟着追思路线一起存。
    route.sneakCheckpointIndex = session.sneak?.checkpointIndex ?? -1;
    route.spotted = session.sneak?.spotted ?? 0;
    route.falls = session.sneak?.falls ?? 0;
  } else if (routeKey === 'parade') {
    route.track = session.paradeTrack ?? 'easy';
    route.lost = [...(session.paradeLost ?? [])];
  } else if (routeKey === 'trick') {
    // 每户记住「帮过 / 捣过蛋」，以及当前接下的任务和所在的房间。
    route.houses = { ...(session.trickHouses ?? {}) };
    route.activeHouse = session.trickActiveHouse ?? null;
    route.room = session.trickRoom ?? null;
    // 捣蛋后的后巷竞速：只记被哪一户追，读档后从起跑线重来。
    route.raceHouse = session.trickRaceHouse ?? null;
    route.trickCandies = session.trickCandies ?? 0;
    route.trickTricks = session.trickTricks ?? 0;
    // 门上的谜题进度：牌序、找到的差别、答到第几题。只存普通数据。
    route.puzzles = JSON.parse(JSON.stringify(session.trickPuzzleStates ?? {}));
  }

  // 主线通关是一次性的剧情标记：存档里已经有，或这一趟刚走完最后一段，
  // 都算走过。它只往上翻，重走或中途退出都不会抹掉。
  const memorialDone =
    Boolean(doc?.settings?.memorialCleared) ||
    (routeKey === 'memorial' && Boolean(session.completed));

  const data = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    settings: {
      audioMuted: Boolean(game.audio?.muted),
      lastRoute: routeKey,
      // 教程通关是一条单向标记：重走教程、中途退出都不会把主线重新锁上。
      ...(routeKey === 'tutorial' && session.completed ? { tutorialCleared: true } : {}),
      // 主线通关同理：走完一次，皮鞋永远合脚，那封信也不再出现。
      ...(memorialDone ? { memorialCleared: true } : {}),
    },
    routes: { [routeKey]: route },
  };

  // 行囊与合脚度只对教程和追思小径成立。
  // 百鬼里的 session 是空的，写进去会把之前的收集冲掉。
  if (routeKey === 'tutorial' || routeKey === 'memorial') {
    data.wallet = {
      collected: { ...(session.collected ?? {}) },
      candyTypes: { ...(session.candyTypes ?? {}) },
      bones: session.bones ?? 0,
      rightHandBones: session.rightHandBones ?? 0,
      boneTypes: { ...(session.boneTypes ?? {}) },
      completedCostumes: [...(session.completedCostumes ?? [])],
      equippedCostume: session.equippedCostume ?? null,
      joinedYokai: [...(session.joinedYokai ?? [])],
    };
    data.body = {
      shoeDistance: Math.max(0, Math.round(game.shoeDistance ?? 0)),
      distance: Math.round(session.distance ?? 0),
      jumpCount: session.jumpCount ?? 0,
      manualJumpCount: session.manualJumpCount ?? 0,
      dropThroughs: session.dropThroughs ?? 0,
      playSeconds: Math.round(session.time ?? 0),
    };
  }

  return data;
}

function mergeDoc(base, patch) {
  const next = {
    ...(base ?? {}),
    ...patch,
    settings: { ...(base?.settings ?? {}), ...(patch.settings ?? {}) },
    routes: { ...(base?.routes ?? {}) },
  };
  if (patch.wallet) next.wallet = { ...(base?.wallet ?? {}), ...patch.wallet };
  if (patch.body) next.body = { ...(base?.body ?? {}), ...patch.body };
  for (const [key, value] of Object.entries(patch.routes ?? {})) {
    next.routes[key] = { ...(next.routes[key] ?? {}), ...value };
  }
  return next;
}

function schedule() {
  if (timer) return;
  const wait = Math.max(0, WRITE_INTERVAL - (Date.now() - lastWrite));
  timer = window.setTimeout(() => {
    timer = 0;
    flush();
  }, wait);
}

/** 立即落盘（beforeunload、切后台、通关时用）。 */
export function flush() {
  if (!pending || !doc) return true;
  if (readOnly) {
    pending = false;
    return false;
  }
  try {
    doc.updatedAt = new Date().toISOString();
    backend.write(JSON.stringify(doc));
    lastWrite = Date.now();
    pending = false;
    return true;
  } catch {
    report('存档写入失败：浏览器不允许本地存储，这一局不会被保存。');
    return false;
  }
}

/** 合并写入当前进度。节流到最多每秒一次。 */
export function save(game) {
  if (readOnly) {
    report('存档来自更新的版本，本次不会覆盖它。清档后才能重新保存。');
    return false;
  }
  const patch = snapshot(game);
  if (!patch) return false;
  doc = mergeDoc(doc, patch);
  pending = true;
  schedule();
  return true;
}

/** 清档，回到全新状态。 */
export function reset() {
  if (timer) {
    window.clearTimeout(timer);
    timer = 0;
  }
  pending = false;
  doc = null;
  readOnly = false;
  reportedError = false;
  try {
    backend.remove();
  } catch {
    report('清除存档失败：浏览器不允许本地存储。');
  }
}

/**
 * 只把共用的行囊写回 Game：收集、骨头、时装、糖纸。
 * 新开一局时也调用它，收集物才不会因为重走而清零。
 */
export function applyWallet(game, data) {
  const wallet = data?.wallet;
  if (!wallet || !game?.session) return;
  if (game.mode !== 'tutorial' && game.mode !== 'memorial') return;

  const session = game.session;
  session.collected = { ...(wallet.collected ?? {}) };
  session.candyTypes = { ...(session.candyTypes ?? {}), ...(wallet.candyTypes ?? {}) };
  session.candies = Object.values(session.candyTypes).reduce((sum, n) => sum + (n ?? 0), 0);
  session.bones = wallet.bones ?? 0;
  session.rightHandBones = wallet.rightHandBones ?? 0;
  session.boneTypes = { ...(session.boneTypes ?? {}), ...(wallet.boneTypes ?? {}) };
  // 旧存档里可能还留着已经撤掉的时装（如南瓜巫师），读档时一并清掉。
  session.completedCostumes = [...(wallet.completedCostumes ?? [])].filter((id) =>
    COSTUME_BY_ID.has(id),
  );
  session.equippedCostume = COSTUME_BY_ID.has(wallet.equippedCostume)
    ? wallet.equippedCostume
    : null;
  session.joinedYokai = [...(wallet.joinedYokai ?? [])];

  game.player.costume = session.equippedCostume;
  game.partner.costume = session.equippedCostume;
  game.player.shoeFit = game.getShoeFit?.() ?? game.player.shoeFit;
}

/**
 * 把共用部分写回 Game：钱包、身体统计、设置。
 * 线路自己的进度（落脚点、灯、队伍）由 Game.continueSaved() 应用，
 * 因为那需要先加载对应的地图。
 */
export function apply(game, data) {
  if (!game || !data) return;

  if (typeof data.settings?.audioMuted === 'boolean') {
    game.audio?.setMuted?.(data.settings.audioMuted);
  }

  const body = data.body ?? {};
  if (Number.isFinite(body.shoeDistance)) {
    game.shoeDistance = body.shoeDistance;
  }

  // 行囊只属于教程与追思小径；百鬼不碰它。
  if (game.mode !== 'tutorial' && game.mode !== 'memorial') return;
  applyWallet(game, data);
  if (!data.wallet) return;

  const session = game.session;
  session.distance = body.distance ?? 0;
  session.jumpCount = body.jumpCount ?? 0;
  session.manualJumpCount = body.manualJumpCount ?? 0;
  session.dropThroughs = body.dropThroughs ?? 0;
  session.time = body.playSeconds ?? 0;
}

/**
 * 起始页的「继续」文案。返回 null 表示没有可继续的线路。
 * 同一份存档里可能留着几条线路，取最近更新且还没通关的那一条。
 */
export function describeRun(data = doc) {
  if (!data?.routes) return null;
  const candidates = Object.entries(data.routes)
    .filter(([key, route]) => ROUTE_LABELS[key] && route && !route.completed)
    .sort((a, b) => String(b[1].updatedAt ?? '').localeCompare(String(a[1].updatedAt ?? '')));
  const entry = candidates[0];
  if (!entry) return null;
  const [key, route] = entry;

  const stage = routeStage(key, route);
  let title = ROUTE_LABELS[key];
  if (key !== 'tutorial' && key !== 'trick') title += ` · 第 ${stage} 段`;
  if (key === 'trick' && route.room === 'witch') title += ' · 女巫的庭院';
  if (key === 'trick' && route.room === 'warlock') title += ' · 男巫的地窖';
  if (key === 'trick' && route.raceHouse && !route.room) title += ' · 后巷追击';
  if (key === 'parade' && route.track === 'hard') title += ' · 困难';
  if (key === 'parade' && route.track === 'normal') title += ' · 普通';

  const checkpointLabel =
    key === 'memorial' && stage === 4 && route.stage === 3 && route.checkpointLabel
      ? route.checkpointLabel.replace('第 3 段', '第 4 段')
      : route.checkpointLabel;
  const detail =
    key === 'trick' && route.raceHouse
      ? '从后巷的起跑线重新开始'
      : checkpointLabel
        ? `上次停在「${checkpointLabel}」的落脚点`
        : '从上次的落脚点继续';

  return {
    routeKey: key,
    stage,
    completed: Boolean(route.completed),
    title,
    detail,
  };
}

// 移动端切后台不会触发 beforeunload，两种时机都要落盘。
window.addEventListener('beforeunload', () => flush());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
});
