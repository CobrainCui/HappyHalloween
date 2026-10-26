import { Game } from './game.js';
import * as Save from './save.js';
import { getItemDef } from './collectibles.js';
import { CANDY_EFFECTS, CANDY_EFFECT_TYPES } from './candyEffects.js';
import { BUFF_CANDIES, BUFF_CANDY_TYPES } from './buffCandies.js';
import { PARADE_ROUTE, PARADE_TRACKS } from './parade.js';
import { TouchControls, isMobileDevice } from './touch.js';
import { ShoeVoice } from './shoeVoice.js';
import { CLASS_LINES } from './classJokes.js';
import { drawYokaiSprite } from './yokai.js';
import { PuzzleView } from './puzzleView.js';

/**
 * 版本开关：默认「班级版」，`?v=public` 为公开版。
 * 班级版会加载 classJokes.js 里的私货台词；公开版不加载。
 */
const VERSION =
  new URLSearchParams(window.location.search).get('v') === 'public' ? 'public' : 'class';
document.documentElement.classList.toggle('is-public-version', VERSION === 'public');

const isMobile = isMobileDevice();
document.documentElement.classList.toggle('is-mobile', isMobile);

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#startScreen');
const trackScreen = document.querySelector('#trackScreen');
const pauseScreen = document.querySelector('#pauseScreen');
const backpackScreen = document.querySelector('#backpackScreen');
const pouchScreen = document.querySelector('#pouchScreen');
const trickDoorScreen = document.querySelector('#trickDoorScreen');
const trickPuzzleScreen = document.querySelector('#trickPuzzleScreen');
const rosterScreen = document.querySelector('#rosterScreen');
const sacrificeScreen = document.querySelector('#sacrificeScreen');
const defeatScreen = document.querySelector('#defeatScreen');
const completeScreen = document.querySelector('#completeScreen');

const startTutorialButton = document.querySelector('#startTutorialButton');
const startMemorialButton = document.querySelector('#startMemorialButton');
const startParadeButton = document.querySelector('#startParadeButton');
const startTrickButton = document.querySelector('#startTrickButton');
const continueButton = document.querySelector('#continueButton');
const continueLabel = document.querySelector('#continueLabel');
const continueDetail = document.querySelector('#continueDetail');
const clearSaveButton = document.querySelector('#clearSaveButton');
const closeTrackButton = document.querySelector('#closeTrackButton');
const trackGrid = document.querySelector('#trackGrid');
const resumeButton = document.querySelector('#resumeButton');
const pauseRestartButton = document.querySelector('#pauseRestartButton');
const pauseExitButton = document.querySelector('#pauseExitButton');
const defeatRestartButton = document.querySelector('#defeatRestartButton');
const defeatExitButton = document.querySelector('#defeatExitButton');
const closeBackpackButton = document.querySelector('#closeBackpackButton');
const closePouchButton = document.querySelector('#closePouchButton');
const closeTrickDoorButton = document.querySelector('#closeTrickDoorButton');
const trickDoorPortrait = document.querySelector('#trickDoorPortrait');
const trickDoorKind = document.querySelector('#trickDoorKind');
const trickDoorName = document.querySelector('#trickDoorName');
const trickDoorLine = document.querySelector('#trickDoorLine');
const trickDoorTask = document.querySelector('#trickDoorTask');
const trickDoorTrick = document.querySelector('#trickDoorTrick');
const trickDoorCandy = document.querySelector('#trickDoorCandy');
const trickHelpButton = document.querySelector('#trickHelpButton');
const trickTrickButton = document.querySelector('#trickTrickButton');
const trickLaterButton = document.querySelector('#trickLaterButton');
const closeTrickPuzzleButton = document.querySelector('#closeTrickPuzzleButton');
const trickPuzzleKicker = document.querySelector('#trickPuzzleKicker');
const trickPuzzleTitle = document.querySelector('#trickPuzzleTitle');
const trickPuzzleIntro = document.querySelector('#trickPuzzleIntro');
const trickPuzzleStep = document.querySelector('#trickPuzzleStep');
const trickPuzzleMistakes = document.querySelector('#trickPuzzleMistakes');
const trickPuzzleStage = document.querySelector('#trickPuzzleStage');
const trickPuzzleFeedback = document.querySelector('#trickPuzzleFeedback');
const trickPuzzleLeaveButton = document.querySelector('#trickPuzzleLeaveButton');
const closeRosterButton = document.querySelector('#closeRosterButton');
const skipTutorialButton = document.querySelector('#skipTutorialButton');
const replayButton = document.querySelector('#replayButton');
const completeExitButton = document.querySelector('#completeExitButton');

const playerPanel = document.querySelector('#playerPanel');
const panelCollapseButton = document.querySelector('#panelCollapseButton');
const panelCollapseMark = document.querySelector('#panelCollapseMark');
const panelCollapseLabel = document.querySelector('#panelCollapseLabel');
const panelMode = document.querySelector('#panelMode');
const panelTheme = document.querySelector('#panelTheme');
const panelProgressText = document.querySelector('#panelProgressText');
const panelProgressBar = document.querySelector('#panelProgressBar');
const panelBones = document.querySelector('#panelBones');
const panelHands = document.querySelector('#panelHands');
const panelCandies = document.querySelector('#panelCandies');
const panelCostume = document.querySelector('#panelCostume');
const panelTime = document.querySelector('#panelTime');
const compactCells = [
  {
    cell: document.querySelector('#compactCellA'),
    label: document.querySelector('#compactLabelA'),
    value: document.querySelector('#compactValueA'),
  },
  {
    cell: document.querySelector('#compactCellB'),
    label: document.querySelector('#compactLabelB'),
    value: document.querySelector('#compactValueB'),
  },
  {
    cell: document.querySelector('#compactCellC'),
    label: document.querySelector('#compactLabelC'),
    value: document.querySelector('#compactValueC'),
  },
];
const panelFitBar = document.querySelector('#panelFitBar');
const panelCharge = document.querySelector('#panelCharge');
const panelChargeText = document.querySelector('#panelChargeText');
const panelShoeLabel = document.querySelector('#panelShoeLabel');
const panelEffects = document.querySelector('#panelEffects');
const effectChips = document.querySelector('#effectChips');
const panelPouchCount = document.querySelector('#panelPouchCount');
const panelGrid = document.querySelector('#panelGrid');
const memorialInfo = document.querySelector('#memorialInfo');
const memorialCondition = document.querySelector('#memorialCondition');
const memorialBody = document.querySelector('#memorialBody');
const memorialLights = document.querySelector('#memorialLights');
const memorialGateRow = document.querySelector('#memorialGateRow');
const memorialGates = document.querySelector('#memorialGates');
const memorialShoeRow = document.querySelector('#memorialShoeRow');
const memorialShoes = document.querySelector('#memorialShoes');
const paradeInfo = document.querySelector('#paradeInfo');
const paradeTrackName = document.querySelector('#paradeTrackName');
const paradeTrackTier = document.querySelector('#paradeTrackTier');
const paradeCount = document.querySelector('#paradeCount');
const paradeGate = document.querySelector('#paradeGate');
const paradeBody = document.querySelector('#paradeBody');
const paradeScatters = document.querySelector('#paradeScatters');
const trickInfo = document.querySelector('#trickInfo');
const trickDoors = document.querySelector('#trickDoors');
const trickPouch = document.querySelector('#trickPouch');
const trickTricks = document.querySelector('#trickTricks');
const trickBody = document.querySelector('#trickBody');
const sneakInfo = document.querySelector('#sneakInfo');
const sneakRowA = document.querySelector('#sneakRowA');
const sneakRowB = document.querySelector('#sneakRowB');
const sneakBarA = document.querySelector('#sneakBarA');
const sneakBarB = document.querySelector('#sneakBarB');
const sneakStateA = document.querySelector('#sneakStateA');
const sneakStateB = document.querySelector('#sneakStateB');
const sneakSpotted = document.querySelector('#sneakSpotted');
const sneakCheckpoint = document.querySelector('#sneakCheckpoint');
const sneakCombo = document.querySelector('#sneakCombo');
const sneakLegend = document.querySelector('#sneakLegend');
const rosterGrid = document.querySelector('#rosterGrid');
const rosterCount = document.querySelector('#rosterCount');
const rosterSupports = document.querySelector('#rosterSupports');
const sacrificeGrid = document.querySelector('#sacrificeGrid');
const sacrificeCount = document.querySelector('#sacrificeCount');
const sacrificeCopy = document.querySelector('#sacrificeCopy');
const defeatCopy = document.querySelector('#defeatCopy');
const statBones = document.querySelector('#statBones');
const statCandies = document.querySelector('#statCandies');
const statHands = document.querySelector('#statHands');
const statCostumes = document.querySelector('#statCostumes');
const statMemories = document.querySelector('#statMemories');
const statStages = document.querySelector('#statStages');
const statShoes = document.querySelector('#statShoes');
const statParty = document.querySelector('#statParty');
const statScatters = document.querySelector('#statScatters');
const statLost = document.querySelector('#statLost');
const statSpotted = document.querySelector('#statSpotted');
const statFalls = document.querySelector('#statFalls');
const statDoors = document.querySelector('#statDoors');
const statTricks = document.querySelector('#statTricks');
const statPouch = document.querySelector('#statPouch');
const statSkipped = document.querySelector('#statSkipped');
const statTrickCandies = document.querySelector('#statTrickCandies');
const statFit = document.querySelector('#statFit');
const completeMemories = document.querySelector('#completeMemories');
const completeStages = document.querySelector('#completeStages');
const completeShoes = document.querySelector('#completeShoes');
const completeParty = document.querySelector('#completeParty');
const completeScatters = document.querySelector('#completeScatters');
const completeLost = document.querySelector('#completeLost');
const completeSpotted = document.querySelector('#completeSpotted');
const completeFalls = document.querySelector('#completeFalls');
const completeDoors = document.querySelector('#completeDoors');
const completeTricks = document.querySelector('#completeTricks');
const completePouch = document.querySelector('#completePouch');
const completeSkipped = document.querySelector('#completeSkipped');
const completeTrickCandies = document.querySelector('#completeTrickCandies');

const fieldHud = document.querySelector('#fieldHud');
const fieldLabel = document.querySelector('#fieldLabel');
const fieldTag = document.querySelector('#fieldTag');
const fieldE = document.querySelector('#fieldE');
const fieldB = document.querySelector('#fieldB');
const fieldForce = document.querySelector('#fieldForce');
const fieldRequired = document.querySelector('#fieldRequired');
const fieldCurrent = document.querySelector('#fieldCurrent');
const fieldDelta = document.querySelector('#fieldDelta');
const fieldStatus = document.querySelector('#fieldStatus');
const fieldControls = document.querySelector('#fieldControls');
const fieldSpeedBar = document.querySelector('#fieldSpeedBar');
const fieldSpeedMark = document.querySelector('#fieldSpeedMark');

const staticHud = document.querySelector('#staticHud');
const staticHudStatus = document.querySelector('#staticHudStatus');
const staticHudCharge = document.querySelector('#staticHudCharge');
const staticHudForce = document.querySelector('#staticHudForce');

const interactionPrompt = document.querySelector('#interactionPrompt');
const interactionText = document.querySelector('#interactionText');
const interactionKey = document.querySelector('#interactionKey');
const interactionKeyAlt = document.querySelector('#interactionKeyAlt');
const tutorialCoach = document.querySelector('#tutorialCoach');
const tutorialStepLabel = document.querySelector('#tutorialStepLabel');
const tutorialText = document.querySelector('#tutorialText');
const tutorialPips = document.querySelector('#tutorialPips');

const gameScreen = document.querySelector('#gameScreen');
const screenUi = document.querySelector('#screenUi');
const questTrack = document.querySelector('#questTrack');
const questText = document.querySelector('#questText');
const questTime = document.querySelector('#questTime');
const questProgress = document.querySelector('#questProgress');

const toast = document.querySelector('#toast');
const touchRoot = document.querySelector('#touchControls');
const topStatusText = document.querySelector('#topStatusText');
const completeKicker = document.querySelector('#completeKicker');
const completeTitle = document.querySelector('#completeTitle');
const completeCopy = document.querySelector('#completeCopy');
const completeTime = document.querySelector('#completeTime');
const completeBones = document.querySelector('#completeBones');
const completeCandies = document.querySelector('#completeCandies');
const completeHands = document.querySelector('#completeHands');
const completeCostumes = document.querySelector('#completeCostumes');
const completeFit = document.querySelector('#completeFit');

const inventoryBones = document.querySelector('#inventoryBones');
const inventoryBonesTotal = document.querySelector('#inventoryBonesTotal');
const inventoryHands = document.querySelector('#inventoryHands');
const inventoryCandies = document.querySelector('#inventoryCandies');
const inventoryCandyTypes = document.querySelector('#inventoryCandyTypes');
const candyCatalogue = document.querySelector('#candyCatalogue');
const inventoryList = document.querySelector('#inventoryList');
const inventoryTime = document.querySelector('#inventoryTime');
const inventoryFitItem = document.querySelector('#inventoryFitItem');
const inventoryFit = document.querySelector('#inventoryFit');
const wardrobeGrid = document.querySelector('#wardrobeGrid');
const placementPanel = document.querySelector('#placementPanel');
const placementField = document.querySelector('#placementField');
const placementItems = document.querySelector('#placementItems');
const pouchGrid = document.querySelector('#pouchGrid');
const pouchTotal = document.querySelector('#pouchTotal');

const PLACE_ORDER = ['rib', 'femur', 'skull', 'rightHand'];

const game = new Game(canvas);
// 手机上没有第二套方向键：第三段让「回音」跟着主角走。
game.mobileAssist = isMobile;
const puzzleView = new PuzzleView({
  stage: trickPuzzleStage,
  feedback: trickPuzzleFeedback,
  metaStep: trickPuzzleStep,
  metaMistakes: trickPuzzleMistakes,
  onSolved: (houseId) => game.solveTrickPuzzle(houseId),
  onPersist: () => game.persist(),
});
let toastTimer = 0;
let tutorialPipSignature = '';

// 触屏按键只借用 Input 的动作集合，游戏逻辑不需要知道设备。
// 桌面端这层一直隐藏，也不会被激活。
const touchControls = new TouchControls(touchRoot, game.input, {
  onBag: () => toggleBagPanel(),
  onPouch: () => togglePouchPanel(),
  onPause: () => {
    if (game.state === 'playing') game.pause();
  },
  onInteract: () => {
    if (game.state === 'playing') {
      // 手机端第三段由你一个人操作：互动也固定交给主角，
      // 回音会自动跟着走，不会抢走南瓜。
      game.interact(game.isSneakStage() ? game.player : undefined);
    }
  },
});

// 右上角面板的三种形态：完整 → 简省信息 → 只剩一枚开关。
const PANEL_COLLAPSE_STATES = ['full', 'compact', 'switch'];
const PANEL_COLLAPSE_META = {
  full: { mark: '简', label: '', action: '折叠面板' },
  compact: { mark: '收', label: '', action: '收成按钮' },
  switch: { mark: '▸', label: '旅人手记', action: '展开面板' },
};
let panelCollapse = 'full';

function setPanelCollapse(next) {
  panelCollapse = PANEL_COLLAPSE_STATES.includes(next) ? next : 'full';
  const meta = PANEL_COLLAPSE_META[panelCollapse];
  playerPanel.dataset.collapse = panelCollapse;
  panelCollapseMark.textContent = meta.mark;
  panelCollapseLabel.textContent = meta.label;
  panelCollapseButton.setAttribute('aria-expanded', String(panelCollapse === 'full'));
  panelCollapseButton.setAttribute('aria-label', meta.action);
  panelCollapseButton.title = meta.action;
}

function setCompactStats(stats) {
  compactCells.forEach((slot, index) => {
    const entry = stats[index];
    slot.cell.hidden = !entry;
    if (!entry) return;
    slot.label.textContent = entry[0];
    slot.value.textContent = entry[1];
  });
}

// 手机横屏时画面只有几百像素宽，先收成简省信息版，需要时再展开。
setPanelCollapse(isMobile ? 'compact' : 'full');

panelCollapseButton.addEventListener('click', (event) => {
  const index = PANEL_COLLAPSE_STATES.indexOf(panelCollapse);
  setPanelCollapse(PANEL_COLLAPSE_STATES[(index + 1) % PANEL_COLLAPSE_STATES.length]);
  // 鼠标点完把焦点还给游戏；键盘（detail 为 0）仍留在按钮上。
  if (event.detail > 0) panelCollapseButton.blur();
});

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__pumpkinGame = game;
  window.__puzzleView = puzzleView;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const remain = String(total % 60).padStart(2, '0');
  return `${minutes}:${remain}`;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function forceArrow(fx, fy, mag) {
  if (mag < 1) return '≈0';
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  if (ay > ax * 2) return fy > 0 ? '↓' : '↑';
  if (ax > ay * 2) return fx > 0 ? '→' : '←';
  if (fx > 0) return fy > 0 ? '↘' : '↗';
  return fy > 0 ? '↙' : '↖';
}

function shoeLabel(fit) {
  if (fit < 0.46) return '崭新';
  if (fit < 0.62) return '正在合脚';
  if (fit < 0.8) return '合脚';
  return '像自己的脚';
}

// 长句按字数补时间：一屏提示最多四五行，字越多停留越久。
// 短提示照旧，只有超过十六个字的段落才额外加时。
function toastDuration(message, duration) {
  const extra = Math.max(0, message.length - 16) * 100;
  return Math.min(duration + extra, 14000);
}

function showToast(message, duration = 2000) {
  if (!message) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, toastDuration(message, duration));
}

/**
 * 起始页的「继续」按钮：有可读的存档时才出现。
 * 文案只写线路和段落，详细状态留在游戏里，不把面板塞满。
 */
function refreshContinue(data = Save.current()) {
  const run = Save.describeRun(data);
  continueButton.hidden = !run;
  clearSaveButton.hidden = !data;
  if (!run) return;
  continueLabel.textContent = run.title;
  continueDetail.textContent = run.detail;
}

function hideAllOverlays() {
  for (const overlay of [
    startScreen,
    trackScreen,
    pauseScreen,
    backpackScreen,
    pouchScreen,
    trickDoorScreen,
    trickPuzzleScreen,
    rosterScreen,
    sacrificeScreen,
    defeatScreen,
    completeScreen,
  ]) {
    overlay.hidden = true;
  }
}

function syncOverlays(state) {
  hideAllOverlays();
  if (state !== 'trickPuzzle') puzzleView.close();

  // 名册、送别和结算面板会把路让出来；飘在上面的提示先收掉，别盖住标题。
  if (
    state === 'roster' ||
    state === 'complete' ||
    state === 'sacrifice' ||
    state === 'defeat' ||
    state === 'inventory' ||
    state === 'pouch' ||
    state === 'trickDoor' ||
    state === 'trickPuzzle'
  ) {
    toast.classList.remove('is-visible');
  }

  if (state === 'title') startScreen.hidden = false;
  else if (state === 'tracks') trackScreen.hidden = false;
  else if (state === 'paused') pauseScreen.hidden = false;
  else if (state === 'inventory') backpackScreen.hidden = false;
  else if (state === 'pouch') pouchScreen.hidden = false;
  else if (state === 'trickDoor') {
    trickDoorScreen.hidden = false;
    updateTrickDoor();
  } else if (state === 'trickPuzzle') {
    trickPuzzleScreen.hidden = false;
    updateTrickPuzzle();
  } else if (state === 'roster') rosterScreen.hidden = false;
  else if (state === 'sacrifice') {
    sacrificeScreen.hidden = false;
    updateSacrifice();
  } else if (state === 'defeat') defeatScreen.hidden = false;
  else if (state === 'complete') completeScreen.hidden = false;

  const inRun =
    state === 'playing' ||
    state === 'paused' ||
    state === 'inventory' ||
    state === 'pouch' ||
    state === 'trickDoor' ||
    state === 'trickPuzzle' ||
    state === 'roster' ||
    state === 'sacrifice';
  playerPanel.hidden = !inRun;

  // 触屏按键只在真正操作时出现；面板打开时让位给弹层。
  // 第三段在手机上是单指操作，回音会自动跟着你走。
  const showTouchControls = isMobile && state === 'playing';
  touchRoot.hidden = !showTouchControls;
  touchControls.setActive(showTouchControls);
  if (isMobile) {
    const trickHub = game.mode === 'trick' && !game.session?.trickRoom;
    touchControls.setBagLabel(
      game.mode === 'parade'
        ? '名册'
        : game.mode === 'trick'
          ? trickHub
            ? '糖袋'
            : '背包'
          : '背包',
    );
    // 糖纸街的街面没有背包：Tab 和「糖袋」按钮是同一件事。
    const bagButton = touchRoot.querySelector('#touchBagButton');
    if (bagButton) bagButton.hidden = trickHub;
  }

  if (state === 'playing' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  if (state !== 'playing') {
    fieldHud.hidden = true;
    staticHud.hidden = true;
    interactionPrompt.hidden = true;
    tutorialCoach.hidden = true;
    sneakLegend.hidden = true;
  }

  if (state === 'tracks') {
    window.setTimeout(() => {
      trackGrid.querySelector('button')?.focus({ preventScroll: true });
    }, 0);
    topStatusText.textContent = '魑魅魍魉 · 选一条夜路';
  } else if (state === 'sacrifice') {
    window.setTimeout(() => {
      sacrificeGrid.querySelector('button')?.focus({ preventScroll: true });
    }, 0);
    topStatusText.textContent = '无灯长夜 · 从名册里留下一人';
  } else if (state === 'defeat') {
    window.setTimeout(() => defeatRestartButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent = '无灯长夜 · 没人可留了';
  } else if (state === 'paused') {
    window.setTimeout(() => resumeButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent = '暂停 · 灯还亮着';
  } else if (state === 'inventory') {
    window.setTimeout(() => closeBackpackButton.focus({ preventScroll: true }), 0);
    updateInventory();
    topStatusText.textContent = '背包 · 骨头和糖果';
  } else if (state === 'pouch') {
    window.setTimeout(() => closePouchButton.focus({ preventScroll: true }), 0);
    updatePouch();
    topStatusText.textContent = '糖袋 · 全线路通用';
  } else if (state === 'trickDoor') {
    window.setTimeout(() => trickHelpButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent = '糖纸街 · 敲门';
  } else if (state === 'trickPuzzle') {
    window.setTimeout(() => closeTrickPuzzleButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent = '糖纸街 · 门上的谜';
  } else if (state === 'roster') {
    window.setTimeout(() => closeRosterButton.focus({ preventScroll: true }), 0);
    updateRoster();
    topStatusText.textContent = '百鬼名册 · 同行者';
  } else if (state === 'title') {
    topStatusText.textContent = '三条夜路 · 一个糖纸街副本';
  } else if (state === 'complete') {
    window.setTimeout(() => replayButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent =
      game.mode === 'tutorial'
        ? '教程完成'
        : game.mode === 'memorial'
          ? '给老师送南瓜派 · 南瓜派送到了'
          : game.mode === 'parade'
            ? '魑魅魍魉 · 百鬼门开了'
            : game.mode === 'trick'
              ? 'Trick or Treat · 街尾到了'
              : '电磁长夜 · 段落完成';
  } else if (state === 'ending') {
    topStatusText.textContent = '给老师送南瓜派 · 碑前';
  }

  updateHud();
}

function updateInventory() {
  const hud = game.getHudState();
  inventoryBones.textContent = String(hud.bones);
  inventoryBonesTotal.textContent = String(hud.totalBones);
  inventoryHands.textContent = String(hud.rightHandBones);
  inventoryCandies.textContent = String(hud.candies);
  inventoryTime.textContent = formatTime(hud.time);
  // 只有追思小径有皮鞋；其它线路的背包里不摆鞋。
  inventoryFitItem.hidden = hud.mode !== 'memorial';
  inventoryFit.textContent = formatPercent(hud.shoeFit);

  inventoryList.replaceChildren();
  let entries = 0;
  for (const [type, count] of Object.entries(hud.boneTypes)) {
    if (!count) continue;
    entries += 1;
    const item = document.createElement('li');
    const name = document.createElement('span');
    const swatch = document.createElement('i');
    swatch.className = 'bone-swatch';
    name.append(swatch, document.createTextNode(getItemDef(type).label));
    const amount = document.createElement('b');
    amount.textContent = `× ${count}`;
    item.append(name, amount);
    inventoryList.append(item);
  }

  if (!entries) {
    const empty = document.createElement('li');
    empty.textContent = '还没有捡到骨头。路上有发光的白色碎片。';
    inventoryList.append(empty);
  }

  updateCandyTypes(hud);
  updateCandyCatalogue(hud);
  updateWardrobe(hud);
  updatePlacementPanel(hud);
}

/** 糖袋：十种增益糖，全线路通用。按数字键或点卡片吃一颗。 */
function updatePouch() {
  const pouch = game.getPouchState();
  pouchTotal.textContent = String(pouch.total);
  pouchGrid.replaceChildren();

  BUFF_CANDY_TYPES.forEach((type, index) => {
    const def = BUFF_CANDIES[type];
    const count = pouch.counts[type] ?? 0;

    const card = document.createElement('article');
    card.className = 'pouch-card';
    card.style.setProperty('--accent', def.accent);
    card.classList.toggle('is-empty', count <= 0);
    card.title = `${def.name} · ${def.tag}\n${def.summary}`;

    const top = document.createElement('div');
    top.className = 'pouch-card-top';

    const key = document.createElement('span');
    key.className = 'pouch-key';
    key.textContent = index === 9 ? '0' : String(index + 1);

    const glyph = document.createElement('i');
    glyph.className = 'pouch-glyph';
    glyph.textContent = def.glyph;

    const amount = document.createElement('b');
    amount.className = 'pouch-amount';
    amount.textContent = `×${count}`;

    top.append(key, glyph, amount);

    const title = document.createElement('strong');
    title.textContent = def.name;

    const tag = document.createElement('em');
    tag.textContent = `${def.tag} · ${def.duration} 秒`;

    const copy = document.createElement('p');
    copy.textContent = def.summary;

    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'pouch-use';
    use.disabled = count <= 0;
    use.textContent = count <= 0 ? '袋里没有' : '吃一颗';
    use.addEventListener('click', () => {
      const result = game.usePouchCandy(type);
      if (!result.ok) {
        showToast(result.message, 2400);
        updatePouch();
        updateHud();
        return;
      }
      // 吃下去就回到路上；想再吃一颗再按 Q。
      game.closePouch();
      updateHud();
    });

    card.append(top, title, tag, copy, use);
    pouchGrid.append(card);
  });
}

/** 糖纸街的人物对话：敲门后由 Game 暂停游戏，这里画人物、任务和两个选择。 */
function drawTrickPortrait(house) {
  const canvas = trickDoorPortrait;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const accent = house.accent ?? '#ffcf72';
  ctx.save();
  const aura = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height * 0.55,
    4,
    canvas.width / 2,
    canvas.height * 0.55,
    canvas.width * 0.55,
  );
  aura.addColorStop(0, `${accent}44`);
  aura.addColorStop(1, `${accent}00`);
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height - 8);
  ctx.scale(2.15, 2.15);
  drawYokaiSprite(ctx, 0, 0, house, {
    time: performance.now() / 1000,
    facing: 1,
    moving: false,
    airborne: false,
    crouching: false,
    walkPhase: 0,
    inWater: false,
    gliding: false,
    charge: 0,
  });
  ctx.restore();
}

function updateTrickDoor() {
  const state = game.getTrickDoorState?.();
  if (!state) return;
  const house = state.house;
  trickDoorScreen.style.setProperty('--accent', house.accent ?? '#ffcf72');
  trickDoorKind.textContent = `${house.kind} · 第 ${house.index} 户`;
  trickDoorName.textContent = `${house.name}「${house.title}」`;
  trickDoorLine.textContent = house.line;
  trickDoorTask.textContent = `${house.taskTitle}：${house.taskText}`;
  if (trickDoorTrick) {
    trickDoorTrick.textContent = `捣蛋 · 抢了就跑：夺过这颗${house.candyName}钻进后巷。跑到街尾的栅门、没被追上，拿到的一定是它；被追上，糖会被拿回去。`;
  }
  trickDoorCandy.replaceChildren();

  const glyph = document.createElement('i');
  glyph.className = 'pouch-glyph';
  glyph.textContent = house.candyGlyph;
  glyph.style.setProperty('--accent', house.candyAccent);
  const name = document.createElement('span');
  name.textContent = `${house.candyName} · ${house.candyTag}`;
  name.style.color = house.candyAccent;
  trickDoorCandy.append(glyph, name);

  trickHelpButton.textContent = state.isRoom
    ? '进屋帮忙'
    : state.isPuzzle
      ? state.active
        ? '继续解谜'
        : '解开门上的谜'
      : state.active
        ? '继续这件事'
        : '接下这件事';
  trickTrickButton.textContent = '捣蛋 · 抢糖就跑';
  drawTrickPortrait(house);
}

/** 门上的谜题：人物、题面和进度都由游戏状态给出。 */
function updateTrickPuzzle() {
  const view = game.getTrickPuzzleViewState?.();
  if (!view) return;
  trickPuzzleScreen.style.setProperty('--accent', view.house.accent ?? '#ffcf72');
  trickPuzzleKicker.textContent = `${view.house.kind} · 第 ${view.house.index} 户`;
  trickPuzzleTitle.textContent = view.puzzle.title;
  trickPuzzleIntro.textContent = view.puzzle.intro ?? view.house.taskText;
  puzzleView.open(view.house, view.state);
}

/** 百鬼名册：当前同行者在前，还没遇到的客人灰着排在后面。 */
function updateRoster() {
  const hud = game.getHudState();
  const parade = hud.parade;
  rosterGrid.replaceChildren();
  rosterSupports.replaceChildren();
  if (!parade) {
    rosterCount.textContent = '0 / 0';
    const empty = document.createElement('p');
    empty.className = 'roster-empty';
    empty.textContent = '名册还是空的。';
    rosterGrid.append(empty);
    return;
  }

  rosterCount.textContent = `${parade.count} / ${parade.totalMembers}`;

  for (const support of parade.supports ?? []) {
    const chip = document.createElement('span');
    chip.className = 'roster-support';
    chip.classList.toggle('is-combo', Boolean(support.combo));
    const label = document.createElement('b');
    label.textContent = support.label;
    const detail = document.createElement('span');
    detail.textContent = support.detail;
    chip.append(label, detail);
    rosterSupports.append(chip);
  }

  const makeCard = (member, locked, lost = false) => {
    const card = document.createElement('article');
    card.className = 'roster-card';
    card.classList.toggle('is-locked', locked);
    card.classList.toggle('is-lost', lost);
    card.style.setProperty('--accent', member.accent ?? '#e8b878');

    const head = document.createElement('div');
    head.className = 'roster-card-head';
    const name = document.createElement('span');
    name.className = 'roster-name';
    name.textContent = member.name;
    const title = document.createElement('em');
    title.textContent = member.title ? `「${member.title}」` : '';
    name.append(title);
    const role = document.createElement('span');
    role.className = 'roster-role';
    role.textContent = lost
      ? `第 ${member.stage} 段 · 留在夜里`
      : locked
        ? `第 ${member.stage} 段 · 未遇`
        : member.role;
    head.append(name, role);

    const trait = document.createElement('span');
    trait.className = 'roster-trait';
    trait.textContent = member.teamLabel
      ? `${member.traitLabel} · ${member.teamLabel}`
      : member.traitLabel;

    const body = document.createElement('p');
    body.className = 'roster-body';
    body.textContent = member.trait;

    if (lost) {
      const note = document.createElement('p');
      note.className = 'roster-locked roster-lost-note';
      note.textContent = '留在了夜路上 · 本局不会回来';
      card.append(head, trait, note);
    } else if (locked) {
      const note = document.createElement('p');
      note.className = 'roster-locked';
      note.textContent = '还没遇见 · 到石鼓前互动';
      card.append(head, trait, note);
    } else {
      // 台词放到悬停提示里，卡片只留一句手感说明。
      if (member.line) card.title = member.line;
      card.append(head, trait, body);
    }
    return card;
  };

  for (const member of parade.members) {
    rosterGrid.append(makeCard(member, false));
  }
  for (const member of parade.upcoming) {
    rosterGrid.append(makeCard(member, true));
  }
  for (const member of parade.lost ?? []) {
    rosterGrid.append(makeCard(member, false, true));
  }
}

/** 困难赛道的送别：名册上的每一位同伴都是一张可以按下的牌。 */
function updateSacrifice() {
  const choices = game.getSacrificeChoices?.() ?? [];
  const context = game.getSacrificeContext?.() ?? { reason: 'scatter', name: '' };
  sacrificeGrid.replaceChildren();
  sacrificeCount.textContent = String(choices.length);
  if (!choices.length) {
    sacrificeCopy.textContent = '没有可以留下的人了。';
  } else if (context.reason === 'rescue') {
    sacrificeCopy.textContent = `绷带把${context.name || '中招的人'}拉了回来，但仍要留下一人，支援也会失效。`;
  } else {
    sacrificeCopy.textContent =
      '瘴气冲散了队伍。留下一人，他的支援也会失效。';
  }

  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sacrifice-card';
    button.style.setProperty('--accent', choice.accent ?? '#e8b878');

    const key = document.createElement('span');
    key.className = 'sacrifice-key';
    key.textContent = String(index + 1);

    const head = document.createElement('span');
    head.className = 'sacrifice-head';
    const name = document.createElement('strong');
    name.textContent = choice.name;
    const title = document.createElement('em');
    title.textContent = choice.title ? `「${choice.title}」` : '';
    head.append(name, title);

    const trait = document.createElement('span');
    trait.className = 'sacrifice-trait';
    trait.textContent = choice.teamLabel
      ? `${choice.traitLabel} · ${choice.teamLabel}`
      : choice.traitLabel;

    const body = document.createElement('span');
    body.className = 'sacrifice-body';
    body.textContent = choice.trait;

    button.append(key, head, trait, body);
    button.addEventListener('click', () => game.chooseSacrifice(choice.id));
    sacrificeGrid.append(button);
  });
}

/** 起始页上的三条赛道卡片。 */
function renderTracks() {
  trackGrid.replaceChildren();
  for (const track of PARADE_TRACKS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `track-card track-card--${track.id}`;

    const tier = document.createElement('span');
    tier.className = 'track-tier';
    tier.textContent = track.tier;

    const badge = document.createElement('span');
    badge.className = 'track-badge';
    badge.textContent = track.badge;

    const name = document.createElement('strong');
    name.className = 'track-name';
    name.textContent = track.name;

    const sub = document.createElement('span');
    sub.className = 'track-sub';
    sub.textContent = track.subtitle;

    const detail = document.createElement('span');
    detail.className = 'track-detail';
    detail.textContent = track.detail;

    const go = document.createElement('span');
    go.className = 'track-go';
    go.textContent = '走这条夜路 →';

    button.append(tier, badge, name, sub, detail, go);
    button.addEventListener('click', () => game.startParade(track.id));
    trackGrid.append(button);
  }
}

function updateCandyTypes(hud) {
  inventoryCandyTypes.replaceChildren();
  let found = false;

  for (const [type, count] of Object.entries(hud.candyTypes)) {
    if (!count) continue;
    found = true;
    const effect = CANDY_EFFECTS[type];
    const chip = document.createElement('span');
    chip.className = 'candy-kind';
    if (effect) chip.title = `${effect.disorder}（${effect.icdName}）· ${effect.summary}`;
    const dot = document.createElement('i');
    dot.className = `candy-dot candy-dot--${type}`;
    const name = document.createElement('span');
    name.textContent = effect
      ? `${getItemDef(type).label} · ${effect.disorder}`
      : getItemDef(type).label;
    const amount = document.createElement('b');
    amount.textContent = `×${count}`;
    chip.append(dot, name, amount);
    inventoryCandyTypes.append(chip);
  }

  if (!found) {
    const empty = document.createElement('span');
    empty.className = 'candy-empty';
    empty.textContent = '罐子还是空的。路上有彩色的糖纸。';
    inventoryCandyTypes.append(empty);
  }
}

/** 糖果图鉴：糖名、对应的疾病名与编码、吃下后的行为。 */
function updateCandyCatalogue(hud) {
  candyCatalogue.replaceChildren();

  for (const type of CANDY_EFFECT_TYPES) {
    const effect = CANDY_EFFECTS[type];
    const def = getItemDef(type);
    const count = hud.candyTypes?.[type] ?? 0;

    const item = document.createElement('li');
    item.className = 'candy-entry';
    item.classList.toggle('is-found', count > 0);

    const dot = document.createElement('i');
    dot.className = `candy-dot candy-dot--${type}`;

    const text = document.createElement('div');
    text.className = 'candy-entry-text';

    const title = document.createElement('p');
    title.className = 'candy-entry-title';
    const name = document.createElement('b');
    name.textContent = def.label;
    const disorder = document.createElement('span');
    disorder.textContent = `${effect.disorder} · ${effect.code}`;
    title.append(name, disorder);

    const copy = document.createElement('p');
    copy.className = 'candy-entry-copy';
    copy.textContent = `${effect.tag}，${effect.duration} 秒。${effect.summary}`;

    text.append(title, copy);

    const amount = document.createElement('em');
    amount.className = 'candy-entry-count';
    amount.textContent = count > 0 ? `已吃 ×${count}` : '还没找到';

    item.append(dot, text, amount);
    candyCatalogue.append(item);
  }
}

function updateWardrobe(hud) {
  wardrobeGrid.replaceChildren();

  for (const costume of hud.costumes) {
    const card = document.createElement('article');
    card.className = 'wardrobe-card';
    card.style.setProperty('--accent', costume.accent);
    card.classList.toggle('is-complete', costume.complete);
    card.classList.toggle('is-equipped', costume.equipped);

    const top = document.createElement('div');
    top.className = 'wardrobe-card-top';
    const count = document.createElement('span');
    count.textContent = `${costume.difficulty} 件零件`;
    const difficulty = document.createElement('span');
    difficulty.className = 'wardrobe-difficulty';
    difficulty.textContent = costume.difficultyLabel;
    top.append(count, difficulty);

    const title = document.createElement('h4');
    title.textContent = costume.name;
    const subtitle = document.createElement('em');
    subtitle.textContent = costume.subtitle;
    title.append(' ', subtitle);
    card.title = costume.blurb;

    const list = document.createElement('ul');
    list.className = 'wardrobe-parts';
    for (const part of costume.parts) {
      const item = document.createElement('li');
      item.classList.toggle('is-found', part.found);
      const mark = document.createElement('i');
      mark.className = 'wardrobe-check';
      mark.textContent = part.found ? '✓' : '·';
      const name = document.createElement('span');
      name.textContent = part.label;
      const rarity = document.createElement('em');
      rarity.className = `wardrobe-rarity rarity-${part.rarity}`;
      rarity.textContent = part.rarityLabel;
      const amount = document.createElement('b');
      amount.textContent = part.found ? '1/1' : '0/1';
      item.append(mark, name, rarity, amount);
      list.append(item);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wardrobe-equip';
    if (!costume.complete) {
      button.disabled = true;
      button.textContent = `还差 ${costume.missing} 件`;
    } else if (costume.equipped) {
      button.textContent = '换下';
    } else {
      button.textContent = '穿上';
    }
    button.addEventListener('click', () => {
      const result = game.equipCostume(costume.id);
      if (!result.ok) showToast(result.message, 2400);
      updateInventory();
      updateHud();
    });

    card.append(top, title, list, button);
    wardrobeGrid.append(card);
  }
}

function updatePlacementPanel(hud) {
  if (!hud.placement) {
    placementPanel.hidden = true;
    placementItems.replaceChildren();
    return;
  }

  placementPanel.hidden = false;
  placementField.textContent = hud.placement.fieldLabel;
  placementItems.replaceChildren();

  let anyAvailable = false;
  PLACE_ORDER.forEach((type, index) => {
    const count = hud.placement.boneTypes[type] ?? 0;
    if (count > 0) anyAvailable = true;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'placement-item';
    button.disabled = count <= 0;
    button.dataset.type = type;

    const key = document.createElement('span');
    key.className = 'placement-key';
    key.textContent = String(index + 1);

    const swatch = document.createElement('i');
    swatch.className = 'bone-swatch';

    const name = document.createElement('span');
    name.className = 'placement-name';
    name.textContent = getItemDef(type).label;

    const amount = document.createElement('b');
    amount.textContent = `× ${count}`;

    const action = document.createElement('span');
    action.className = 'placement-action';
    action.textContent = '放入';

    button.append(key, swatch, name, amount, action);
    button.addEventListener('click', () => handlePlacement(type));
    placementItems.append(button);
  });

  if (!anyAvailable) {
    const empty = document.createElement('p');
    empty.className = 'placement-empty';
    empty.textContent = '背包里没有能放进去的东西。去附近找找。';
    placementItems.append(empty);
  }
}

function handlePlacement(type) {
  const result = game.placeBone(type);
  if (!result.ok && result.message) {
    showToast(result.message, 2600);
  }
}

function updateTutorial(hud) {
  if (!hud.tutorial || hud.state !== 'playing' || hud.tutorial.complete) {
    tutorialCoach.hidden = true;
    return;
  }

  tutorialCoach.hidden = false;
  tutorialStepLabel.textContent = `教程 ${hud.tutorial.index}/${hud.tutorial.total}`;
  tutorialText.textContent = hud.tutorial.text;

  const signature = `${hud.tutorial.index}/${hud.tutorial.total}`;
  if (signature !== tutorialPipSignature) {
    tutorialPipSignature = signature;
    tutorialPips.replaceChildren();
    for (let index = 0; index < hud.tutorial.total; index += 1) {
      const pip = document.createElement('i');
      if (index < hud.tutorial.index - 1) pip.classList.add('is-done');
      if (index === hud.tutorial.index - 1) pip.classList.add('is-current');
      tutorialPips.append(pip);
    }
  }
}

function updateActiveEffects(hud) {
  const effects = hud.activeEffects ?? [];
  panelEffects.hidden = effects.length === 0;
  effectChips.replaceChildren();

  for (const effect of effects) {
    const isBuff = effect.kind === 'buff';
    const chip = document.createElement('span');
    chip.className = 'effect-chip';
    chip.style.setProperty('--accent', effect.accent);
    chip.style.setProperty('--remain', `${Math.round(effect.ratio * 100)}%`);
    chip.title = isBuff
      ? `${effect.label} · ${effect.tag}\n${effect.summary}`
      : `${effect.label} · ${effect.disorder}（${effect.icdName}）\n${effect.summary}`;

    const dot = document.createElement('i');
    dot.className = 'effect-dot';

    const name = document.createElement('span');
    name.className = 'effect-name';
    name.textContent = isBuff
      ? `${effect.label} · ${effect.tag}${effect.sleeping ? ' · 睡着' : ''}`
      : `${effect.disorder} ${effect.code}${
          effect.phaseLabel ? ` · ${effect.phaseLabel}` : ''
        }${effect.sleeping ? ' · 睡着' : ''}`;

    const time = document.createElement('b');
    time.className = 'effect-time';
    time.textContent = `${Math.max(0, effect.remaining).toFixed(1)}s`;

    chip.append(dot, name, time);
    effectChips.append(chip);
  }
}

function updateFieldHud(hud) {
  if (hud.state !== 'playing') {
    fieldHud.hidden = true;
    staticHud.hidden = true;
    return;
  }

  if (hud.field) {
    const field = hud.field;
    fieldHud.hidden = false;
    staticHud.hidden = true;
    fieldLabel.textContent = field.label;
    fieldTag.textContent = field.active ? '匀强场 · 运行中' : '匀强场 · 预览';
    fieldE.textContent = `${field.eDir} ${field.eMag.toFixed(1)} N/C`;
    fieldB.textContent = `${field.bDir} ${field.bRawDir === 'in' ? '纸内' : '纸外'} ${field.bMag.toFixed(1)} T`;
    fieldForce.textContent = !field.active || !field.charged
      ? '—'
      : field.lift === 'up'
        ? '↑'
        : field.lift === 'down'
          ? '↓'
          : '≈0';
    fieldRequired.textContent = field.balanced
      ? `${field.required.toFixed(1)} m/s`
      : '—';
    fieldSpeedMark.style.display = field.balanced ? '' : 'none';
    fieldCurrent.textContent = (Math.abs(field.current) < 0.05 ? 0 : field.current).toFixed(1);
    fieldSpeedBar.classList.toggle('is-reversed', field.reversed);

    const scaleMax = Math.max(field.required * 2, Math.abs(field.current) * 1.1, 1);
    fieldSpeedBar.style.width = `${Math.min(100, (Math.abs(field.current) / scaleMax) * 100)}%`;
    fieldSpeedMark.style.left = `${Math.min(100, (field.required / scaleMax) * 100)}%`;
    fieldDelta.textContent = !field.active
      ? field.balanced
        ? '待入'
        : '未对齐'
      : !field.charged
        ? '未带电'
        : field.balanced
          ? field.reversed
            ? '反向'
            : Math.abs(field.delta) < 0.18
              ? '平衡'
              : field.delta < 0
                ? '偏慢'
                : '偏快'
          : field.lift === 'up'
            ? '合力 ↑ 上浮'
            : '合力 ↓ 下沉';
    fieldStatus.textContent = field.status;
    fieldStatus.classList.toggle('is-alert', !field.balanced || field.hovering && Math.abs(field.delta) > 0.35);
    fieldStatus.classList.toggle('is-good', field.balanced && field.hovering && Math.abs(field.delta) <= 0.18);

    if (!field.balanced) {
      fieldControls.textContent = '打开背包 · 把右手骨放入骨槽';
    } else if (!field.charged) {
      fieldControls.textContent = '先给身体带上电荷';
    } else if (!field.active) {
      fieldControls.textContent = '踏入光幕后开始悬浮';
    } else {
      fieldControls.textContent = '← / → 左右推进 · 平衡需向右';
    }
  } else {
    fieldHud.hidden = true;
    if (hud.electron) {
      staticHud.hidden = false;
      staticHudCharge.textContent =
        hud.charge > 0 ? 'q = +1' : hud.charge < 0 ? 'q = -1' : 'q = 0';
      staticHudForce.textContent = !hud.electron.charged
        ? '—'
        : forceArrow(hud.electron.forceX, hud.electron.forceY, hud.electron.forceMag);
      staticHudStatus.textContent = !hud.electron.charged
        ? '电子带负电。未带电时，它碰不到你。'
        : hud.charge > 0
          ? '异种电荷相吸：正电荷被电子吸引。'
          : '同种电荷相斥：负电荷被电子排斥。';
    } else {
      staticHud.hidden = true;
    }
  }
}

function updateQuest(hud) {
  const quest = hud.quest;
  const visible = Boolean(quest) && (hud.state === 'playing' || hud.state === 'paused');
  questTrack.hidden = !visible;
  gameScreen.classList.toggle('has-quest', visible);
  gameScreen.classList.toggle('is-alarm', Boolean(visible && quest?.alarm));

  if (!visible) {
    questTrack.classList.remove('is-alarm');
    return;
  }

  if (quest.kind === 'trickRace') {
    questText.textContent = quest.text;
    questTime.textContent = quest.progressText ?? '';
    const ratio = Math.max(0, Math.min(1, quest.ratio ?? 0));
    questProgress.style.width = `${ratio * 100}%`;
    questTrack.classList.toggle('is-alarm', Boolean(quest.alarm));
    return;
  }

  if (quest.kind === 'trickTask') {
    questText.textContent = quest.text;
    questTime.textContent = quest.progressText ?? '';
    const ratio = Math.max(0, Math.min(1, quest.ratio ?? 0));
    questProgress.style.width = `${ratio * 100}%`;
    questTrack.classList.remove('is-alarm');
    return;
  }

  questText.textContent = quest.text;
  questTime.textContent = quest.alarm ? '超时' : `${Math.max(0, quest.remaining).toFixed(1)}s`;
  const ratio = quest.alarm
    ? 0
    : Math.max(0, Math.min(1, quest.remaining / Math.max(1, quest.total)));
  questProgress.style.width = `${ratio * 100}%`;
  questTrack.classList.toggle('is-alarm', Boolean(quest.alarm));
}

function updateHud() {
  const hud = game.getHudState();
  const isMemorial = hud.mode === 'memorial';
  const isParade = hud.mode === 'parade';
  // 第三段同时是追思路线和双人潜行：以地图上的 sneak 标记为准。
  const isSneak = Boolean(hud.sneak);
  const isTrick = hud.mode === 'trick';

  if (
    hud.state === 'playing' ||
    hud.state === 'paused' ||
    hud.state === 'inventory' ||
    hud.state === 'roster' ||
    hud.state === 'sacrifice'
  ) {
    const percent = Math.round(hud.progress * 100);
    panelMode.textContent =
      isSneak
        ? '双人'
        : hud.mode === 'tutorial'
          ? '教程'
          : isMemorial
            ? '追思'
            : isParade
              ? '百鬼'
              : isTrick
                ? '副本'
                : '旅程';
    panelTheme.textContent = isMemorial && hud.memorial
      ? `${hud.memorial.stageLabel} · ${hud.memorial.patient}`
      : isParade && hud.parade
        ? `${hud.parade.stageLabel} · ${hud.parade.name} · ${hud.parade.title}`
        : isSneak && hud.sneak
          ? `第 ${hud.sneak.stage}/${hud.sneak.total} 段 · ${hud.sneak.name}`
          : isTrick
            ? `Trick or Treat · ${hud.themeName}`
            : hud.themeName;
    panelProgressText.textContent = `${percent}%`;
    panelProgressBar.style.width = `${percent}%`;
    panelBones.textContent = `${hud.bones}/${hud.totalBones}`;
    panelHands.textContent = String(hud.rightHandBones);
    panelCandies.textContent = `${hud.candies}/${hud.totalCandies}`;
    const equipped = hud.costumes.find((costume) => costume.equipped);
    panelCostume.textContent = equipped ? equipped.name : '未换装';
    panelTime.textContent = formatTime(hud.time);
    panelPouchCount.textContent = String(hud.pouchTotal ?? 0);
    panelFitBar.style.width = `${Math.round(hud.shoeFit * 100)}%`;
    panelShoeLabel.textContent = shoeLabel(hud.shoeFit);
    panelCharge.classList.toggle('is-charged', hud.charge !== 0);
    panelCharge.classList.toggle('is-positive', hud.charge > 0);
    panelCharge.classList.toggle('is-negative', hud.charge < 0);
    panelChargeText.textContent =
      hud.charge > 0 ? '电荷 q = +1' : hud.charge < 0 ? '电荷 q = -1' : '未带电 · 绝缘';

    // 皮鞋只属于追思小径：其它线路不摆鞋，也不显示合脚度。
    playerPanel.classList.toggle('is-shoeless', !isMemorial);
    playerPanel.classList.toggle('is-memorial', isMemorial);
    playerPanel.classList.toggle('is-parade', isParade);
    playerPanel.classList.toggle('is-sneak', isSneak);
    playerPanel.classList.toggle('is-trick', isTrick);
    panelGrid.hidden = isMemorial || isParade || isSneak || isTrick;
    memorialInfo.hidden = !isMemorial;
    paradeInfo.hidden = !isParade;
    sneakInfo.hidden = !isSneak;
    trickInfo.hidden = !isTrick;

    if (isMemorial && hud.memorial) {
      const memorial = hud.memorial;
      memorialCondition.textContent = `${memorial.code} · ${memorial.disorder}`;
      memorialBody.textContent = memorial.body;
      memorialLights.textContent = `${memorial.memories}/${memorial.totalMemories}`;
      // 只有第二段有集合门；其它段落这一行收起来。
      memorialGateRow.hidden = !memorial.setGates;
      if (memorial.setGates) {
        const gates = memorial.setGates;
        memorialGates.textContent = `${gates.solved}/${gates.total}`;
      }
      // 身后还没有鞋时（第一段）这一行不占地方。
      memorialShoeRow.hidden = !(memorial.shoes?.length > 0);
      if (memorial.shoes?.length) memorialShoes.textContent = memorial.shoes.join(' · ');
    }

    if (isParade && hud.parade) {
      const parade = hud.parade;
      if (parade.track) {
        paradeTrackName.textContent = parade.track.name;
        paradeTrackTier.textContent = parade.track.tier;
        paradeTrackTier.dataset.lossRule = parade.track.lossRule ?? 'scatter';
      }
      paradeCount.textContent = `${parade.count} / ${parade.totalMembers}`;
      paradeGate.textContent = `${parade.gateCount} / ${parade.gateTotal}`;
      paradeBody.textContent = parade.body;
      paradeScatters.textContent = String(parade.scatters);
    }

    if (isTrick && hud.trick) {
      const trick = hud.trick;
      trickDoors.textContent = `${trick.helped} / ${trick.totalHouses}`;
      trickPouch.textContent = String(trick.pouchTotal);
      trickTricks.textContent = String(trick.tricked);
      trickBody.textContent = trick.body;
    }

    if (isSneak && hud.sneak) {
      const sneak = hud.sneak;
      const exposureA = Math.round((sneak.exposures?.[0] ?? 0) * 100);
      const exposureB = Math.round((sneak.exposures?.[1] ?? 0) * 100);
      sneakBarA.style.width = `${exposureA}%`;
      sneakBarB.style.width = `${exposureB}%`;
      sneakStateA.textContent = sneak.states?.[0] ?? '安静';
      sneakStateB.textContent = sneak.states?.[1] ?? '安静';
      sneakRowA.classList.toggle('is-alert', (sneak.exposures?.[0] ?? 0) > 0.55);
      sneakRowB.classList.toggle('is-alert', (sneak.exposures?.[1] ?? 0) > 0.55);
      sneakSpotted.textContent = String(sneak.spotted);
      sneakCheckpoint.textContent = sneak.checkpoint;
      if (sneak.combo) {
        sneakCombo.hidden = false;
        sneakCombo.textContent = sneak.combo;
        sneakCombo.classList.toggle('is-rope', Boolean(sneak.ropeActive));
      } else {
        sneakCombo.hidden = true;
        sneakCombo.textContent = '';
      }
    }

    if (hud.state === 'playing') {
      topStatusText.textContent = isSneak && hud.sneak
        ? `潜行 · ${hud.memorial?.stageLabel ?? `第 ${hud.sneak.stage} 段`} · ${hud.memorial?.patient ?? hud.sneak.name}`
        : `目标 · ${hud.objective}`;
    }

    // 简省版只留这一局最要紧的两三个数：暴露、灯、队伍，或背包。
    const compactStats =
      isSneak && hud.sneak
        ? [
            ['被发现', String(hud.sneak.spotted)],
            ['你', hud.sneak.states?.[0] ?? '安静'],
            ['回音', hud.sneak.states?.[1] ?? '安静'],
          ]
        : isMemorial && hud.memorial
          ? [
              ['这一段', hud.memorial.patient],
              ['灯', `${hud.memorial.memories}/${hud.memorial.totalMemories}`],
              ...(hud.memorial.setGates
                ? [['集合门', `${hud.memorial.setGates.solved}/${hud.memorial.setGates.total}`]]
                : []),
            ]
          : isParade && hud.parade
            ? [
                ['同行', `${hud.parade.count}/${hud.parade.totalMembers}`],
                ['到门', `${hud.parade.gateCount}/${hud.parade.gateTotal}`],
                hud.parade.track?.lossRule === 'sacrifice'
                  ? ['留在夜里', String(hud.parade.lost?.length ?? 0)]
                  : ['被冲散', String(hud.parade.scatters)],
              ]
            : isTrick && hud.trick
              ? hud.trick.race
                ? [
                    ['追兵', `${Math.abs(hud.trick.race.gapTiles)} 格`],
                    ['这一户', hud.trick.race.candyName ?? '糖'],
                    ['糖袋', String(hud.trick.pouchTotal)],
                  ]
                : [
                    ['帮忙', `${hud.trick.helped}/${hud.trick.totalHouses}`],
                    ['糖袋', String(hud.trick.pouchTotal)],
                    ['捣蛋', String(hud.trick.tricked)],
                  ]
              : [
                  ['骨头', `${hud.bones}/${hud.totalBones}`],
                  ['糖果', `${hud.candies}/${hud.totalCandies}`],
                  ['时间', formatTime(hud.time)],
                ];
    setCompactStats(compactStats);
  }

  sneakLegend.hidden = !(isSneak && hud.state === 'playing');

  updateFieldHud(hud);
  updateTutorial(hud);
  updateQuest(hud);
  updateActiveEffects(hud);

  if (hud.state === 'playing' && hud.interaction) {
    interactionPrompt.hidden = false;
    interactionText.textContent = hud.interaction.text;
    interactionKey.hidden = !hud.interaction.key;
    interactionKey.textContent = hud.interaction.key ?? '';
    // 第三段里两个人各有自己的互动键，两个人身边都有南瓜时两个键一起显示。
    interactionKeyAlt.hidden = !hud.interaction.altKey;
    interactionKeyAlt.textContent = hud.interaction.altKey ?? '';
    interactionPrompt.classList.toggle('is-locked', !hud.interaction.available);
    // 手机上交给 CSS 把提示抬到虚拟按键上方，避免和拇指打架。
    if (hud.tutorial && !isMobile) {
      interactionPrompt.style.bottom = '136px';
    } else {
      interactionPrompt.style.removeProperty('bottom');
    }
  } else {
    interactionPrompt.hidden = true;
  }
}

function fillCompleteScreen(result) {
  const isMemorial = result.mode === 'memorial';
  const isParade = result.mode === 'parade';
  const isTrick = result.mode === 'trick';

  completeKicker.textContent = isParade
    ? `Hyakki yakō · ${result.track?.tier ?? '简单'} · ${result.track?.name ?? '提灯夜路'}`
    : isMemorial
      ? 'Sir loved pumpkin pie'
      : isTrick
        ? 'Trick or treat · sugar-paper street'
        : result.mode === 'tutorial'
          ? 'Tutorial complete'
          : 'Electromagnetic night · complete';
  completeTitle.textContent = isParade
    ? '百鬼门开了'
    : isMemorial
      ? '南瓜派送到了'
      : isTrick
        ? '糖纸街走完了'
        : result.mode === 'tutorial'
          ? '小径走完了'
          : `${result.themeName} · 这一段落走完了`;
  completeCopy.textContent = isParade
    ? result.finale ?? PARADE_ROUTE.finale
    : isMemorial
      ? result.finale ??
        '四段路走完了。老师的墓前，南瓜派还是温的。'
      : isTrick
        ? result.finale ??
          '你走到街尾。帮过的人、捣过蛋的人、没敲的门，都留在身后。'
        : result.mode === 'tutorial'
          ? '下一步去给老师送南瓜派：四段夜路，四个人，一盒南瓜派。'
          : '你穿过了电子厅和两口熔岩井。这一段走完了，长夜还没结束。';
  completeTime.textContent = formatTime(result.time);
  completeBones.textContent = `${result.bones}/${result.totalBones}`;
  completeCandies.textContent = `${result.candies}/${result.totalCandies}`;
  completeHands.textContent = String(result.rightHandBones);
  completeCostumes.textContent = `${result.costumes}/${result.totalCostumes}`;
  completeMemories.textContent = `${result.memories}/${result.totalMemories}`;
  completeStages.textContent = `${result.stage}/${result.stages}`;
  completeShoes.textContent = `${result.shoes?.length ?? 0} 双`;
  completeParty.textContent = `${result.partySize ?? 0}/${result.totalParty ?? 0}`;
  completeScatters.textContent = String(result.scatters ?? 0);
  completeLost.textContent = String(result.lostCount ?? 0);
  completeSpotted.textContent = String(result.spotted ?? 0);
  completeFalls.textContent = String(result.falls ?? 0);
  completeDoors.textContent = `${result.trick?.helped ?? 0}/${result.trick?.totalHouses ?? 0}`;
  completeTricks.textContent = String(result.trick?.tricked ?? 0);
  completePouch.textContent = String(result.trick?.pouchTotal ?? 0);
  completeSkipped.textContent = String(result.trick?.left ?? 0);
  completeTrickCandies.textContent = String(result.trick?.candies ?? 0);
  completeFit.textContent = formatPercent(result.shoeFit);
  completeExitButton.textContent = result.mode === 'tutorial' ? '去给老师送南瓜派' : '回到起始页';

  statBones.hidden = isMemorial || isParade || isTrick;
  statCandies.hidden = isMemorial || isParade || isTrick;
  statHands.hidden = isMemorial || isParade || isTrick;
  statCostumes.hidden = isMemorial || isParade || isTrick;
  statMemories.hidden = !isMemorial;
  statStages.hidden = !isMemorial;
  statShoes.hidden = !isMemorial || !(result.shoes?.length > 0);
  statParty.hidden = !isParade;
  statScatters.hidden = !isParade;
  statLost.hidden = !isParade || (result.lostCount ?? 0) === 0;
  // 潜行统计只在第三段内部使用，整条追思路线的结算不单独展示。
  statSpotted.hidden = true;
  statFalls.hidden = true;
  statDoors.hidden = !isTrick;
  statTricks.hidden = !isTrick;
  statPouch.hidden = !isTrick;
  statSkipped.hidden = !isTrick;
  statTrickCandies.hidden = !isTrick;
  statFit.hidden = !isMemorial;
  replayButton.textContent = isMemorial || isParade
    ? '从第一段再走一遍'
    : isTrick
      ? '再走一趟糖纸街'
      : '再走一遍';
}

game.onStateChange = (state) => {
  syncOverlays(state);
  // 回到起始页时刷新「继续」——通关或换线路后那里已经变了。
  if (state === 'title') refreshContinue();
};

game.onNotice = (message, duration) => {
  showToast(message, duration);
};

game.onComplete = (result) => {
  fillCompleteScreen(result);
};

startTutorialButton.addEventListener('click', () => {
  enterFullscreen();
  game.startTutorial();
});

startMemorialButton.addEventListener('click', () => {
  enterFullscreen();
  game.startMemorial();
});

startParadeButton.addEventListener('click', () => {
  enterFullscreen();
  game.openParadeTracks();
});

closeTrackButton.addEventListener('click', () => {
  game.closeParadeTracks();
});

defeatRestartButton.addEventListener('click', () => {
  game.startParade(game.getParadeTrackId());
});

defeatExitButton.addEventListener('click', () => {
  game.returnToTitle();
});

startTrickButton.addEventListener('click', () => {
  enterFullscreen();
  game.startTrickOrTreat();
});

continueButton.addEventListener('click', () => {
  const data = Save.current() ?? Save.load();
  const run = Save.describeRun(data);
  if (!run) {
    refreshContinue(data);
    showToast('没有可以继续的进度。', 2400);
    return;
  }
  enterFullscreen();
  if (!game.continueSaved(data, run.routeKey)) {
    showToast('读档失败，这次从起点开始。', 3200);
    return;
  }
  refreshContinue(Save.current());
});

clearSaveButton.addEventListener('click', () => {
  if (!window.confirm('清除本地存档？线路进度、点亮的灯和收集都会消失。')) return;
  Save.reset();
  // 糖袋有自己的存储键，一起清掉才算真的回到全新状态。
  game.pouch?.reset();
  refreshContinue(null);
  showToast('本地存档已清除。', 2400);
});

resumeButton.addEventListener('click', () => {
  game.resume();
});

pauseRestartButton.addEventListener('click', () => {
  restartRun();
});

pauseExitButton.addEventListener('click', () => {
  game.returnToTitle();
});

closeBackpackButton.addEventListener('click', () => {
  game.closeBackpack();
});

closePouchButton.addEventListener('click', () => {
  game.closePouch();
});

closeTrickDoorButton.addEventListener('click', () => {
  game.closeTrickDoor();
});

trickLaterButton.addEventListener('click', () => {
  game.closeTrickDoor();
});

closeTrickPuzzleButton.addEventListener('click', () => {
  game.closeTrickPuzzle();
});

trickPuzzleLeaveButton.addEventListener('click', () => {
  game.closeTrickPuzzle();
});

trickHelpButton.addEventListener('click', () => {
  game.chooseTrickHelp();
});

trickTrickButton.addEventListener('click', () => {
  game.chooseTrickTrick();
  updateHud();
});

closeRosterButton.addEventListener('click', () => {
  game.closeRoster();
});

skipTutorialButton.addEventListener('click', () => {
  game.skipTutorial();
});

replayButton.addEventListener('click', () => {
  if (game.mode === 'memorial') game.startMemorial();
  else if (game.mode === 'parade') game.startParade(game.getParadeTrackId());
  else if (game.mode === 'trick') game.startTrickOrTreat();
  else game.restart();
});

completeExitButton.addEventListener('click', () => {
  if (game.mode === 'tutorial') game.startMemorial();
  else game.returnToTitle();
});

// 手机上跳过碑前那一幕：点一下画面就行，不看虚拟按键。
canvas.addEventListener('pointerdown', () => {
  if (game.state === 'ending') game.skipEnding();
});

// ---------- 全屏 ----------

const fullscreenToggles = document.querySelectorAll('.fullscreen-toggle');

// HUD 以 1280×720 为设计基准，铺满全屏时整块等比放大，跟着画面一起变大。
function syncUiScale() {
  const width = gameScreen.clientWidth;
  if (!width) return;
  const scale = Math.max(1, Math.min(3, width / 1280));
  screenUi.style.setProperty('--ui-scale', String(Math.round(scale * 1000) / 1000));
}

function syncFullscreenUi() {
  const active = Boolean(document.fullscreenElement);
  for (const button of fullscreenToggles) {
    button.setAttribute('aria-pressed', String(active));
    const label = button.querySelector('[data-fullscreen-label]');
    if (label) label.textContent = active ? '退出全屏' : '全屏';
  }
  syncUiScale();
}

function enterFullscreen() {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  try {
    const request = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    Promise.resolve(request)
      .then(() => {
        // 安卓可以借全屏锁成横屏；iOS 不支持，交给横屏提示。
        if (!isMobile) return;
        try {
          window.screen?.orientation?.lock?.('landscape')?.catch?.(() => {});
        } catch {
          // 有的浏览器会同步抛错，忽略即可。
        }
      })
      .catch(() => {
        // 浏览器不给全屏（比如在受限的 iframe 里）就留在铺满窗口的布局里。
      });
  } catch {
    // 少数浏览器会同步拒绝全屏请求。
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    try {
      Promise.resolve(document.exitFullscreen?.()).catch(() => {});
    } catch {
      // 退出全屏失败时保持现状。
    }
  } else {
    enterFullscreen();
  }
}

for (const button of fullscreenToggles) {
  button.addEventListener('click', () => {
    toggleFullscreen();
    button.blur();
  });
}

document.addEventListener('fullscreenchange', syncFullscreenUi);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(syncUiScale).observe(gameScreen);
} else {
  window.addEventListener('resize', syncUiScale);
}

/** Tab 和触屏「背包」共用：按模式决定打开背包、名册，还是只给一句提示。 */
function toggleBagPanel() {
  if (game.state === 'pouch') {
    game.closePouch();
    return;
  }
  // 糖纸街的街面没有别的背包，Tab 直接打开糖袋；
  // 进了女巫 / 男巫的房间，Tab 打开背包（男巫的骨槽要用右手骨）。
  if (game.mode === 'trick') {
    if (game.state === 'playing') {
      if (game.session?.trickRoom) {
        game.openBackpack();
        updateInventory();
      } else {
        game.openPouch();
        updatePouch();
      }
    } else if (game.state === 'inventory') {
      game.closeBackpack();
    }
    return;
  }
  // 魑魅魍魉里打开的是队伍名册：谁跟着你、谁还没遇到。
  if (game.mode === 'parade') {
    if (game.state === 'playing') {
      game.openRoster();
      updateRoster();
    } else if (game.state === 'roster') {
      game.closeRoster();
    }
    return;
  }
  // 前两段手里只有灯；第三段进入地下后，背包与骨槽重新可用。
  if (game.mode === 'memorial' && !game.level.memorialChapter?.hasBackpack) {
    if (game.state === 'playing') {
      showToast('追思路上不用背包，手里只有灯；糖袋按 Q。', 2200);
    }
    return;
  }
  if (game.state === 'playing') {
    game.openBackpack();
    updateInventory();
  } else if (game.state === 'inventory') {
    game.closeBackpack();
  }
}

/** Q / 触屏「糖袋」：任何线路都能打开；吃糖的按钮在面板里。 */
function togglePouchPanel() {
  if (game.state === 'pouch') {
    game.closePouch();
    return;
  }
  if (game.state !== 'playing' && game.state !== 'paused') return;
  if (game.openPouch()) updatePouch();
}

/** R 和触屏暂停面板里的「重走这一段」共用。 */
function restartRun() {
  if (game.state !== 'playing' && game.state !== 'paused') return;
  game.restart();
  showToast(
    game.mode === 'memorial'
      ? game.isSneakStage()
        ? '已回到这一段起点 · 被发现次数也退回去了'
        : '已回到这一段的起点 · 灯还亮着'
      : game.mode === 'parade'
        ? game.getParadeTrackId() === 'hard'
          ? '已回到本段起点 · 留下的人不会回来'
          : '已回到本段起点 · 之前同行的客人还在'
        : game.mode === 'trick'
          ? game.race
            ? '后巷竞速重来 · 追兵回到起跑线'
            : game.session?.trickRoom
              ? '已回到这间房的起点 · 房间任务重来'
              : '已回到糖纸街起点 · 帮过的门还在'
          : '已回到本段起点 · 南瓜还在原地',
  );
}

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.repeat) return;

  if (event.code === 'KeyF') {
    event.preventDefault();
    toggleFullscreen();
    return;
  }

  // 碑前的那一幕：E / 空格 / 回车 / Esc 都能跳过；别的键不在这里生效。
  if (game.state === 'ending') {
    if (
      event.code === 'KeyE' ||
      event.code === 'Space' ||
      event.code === 'Enter' ||
      event.code === 'Escape'
    ) {
      event.preventDefault();
      game.skipEnding();
    }
    return;
  }

  if (event.code === 'KeyQ') {
    event.preventDefault();
    togglePouchPanel();
    return;
  }

  const targetIsButton =
    event.target instanceof HTMLElement &&
    (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT');

  if (event.code === 'Tab') {
    event.preventDefault();
    toggleBagPanel();
    return;
  }

  if (event.code === 'KeyE' && game.state === 'playing') {
    event.preventDefault();
    // 按住 E 呼吸时，键盘重复事件不该在平复之后继续抓 / 丢南瓜。
    if (event.repeat) return;
    // 潜行段里 E 只属于你；回音用 / 键，两个人不再抢同一个互动键。
    game.interact(game.isSneakStage() ? game.player : undefined);
    return;
  }

  // 糖纸街的人物对话：1 帮忙、2 捣蛋、3 先不进去。
  if (game.state === 'trickDoor') {
    if (event.code === 'Escape') {
      event.preventDefault();
      game.closeTrickDoor();
    } else if (event.code === 'Digit1') {
      event.preventDefault();
      game.chooseTrickHelp();
    } else if (event.code === 'Digit2') {
      event.preventDefault();
      game.chooseTrickTrick();
      updateHud();
    } else if (event.code === 'Digit3') {
      event.preventDefault();
      game.closeTrickDoor();
    }
    return;
  }

  // 门上的谜题：Esc 先离开，题面留在门上。
  if (game.state === 'trickPuzzle') {
    if (event.code === 'Escape') {
      event.preventDefault();
      game.closeTrickPuzzle();
    }
    return;
  }

  // 困难赛道的送别：数字键 1–9 直接选择要留下的同行者。
  if (game.state === 'sacrifice' && /^Digit[1-9]$/.test(event.code)) {
    event.preventDefault();
    const choices = game.getSacrificeChoices();
    const choice = choices[Number(event.code.slice(-1)) - 1];
    if (choice) game.chooseSacrifice(choice.id);
    return;
  }

  if (game.state === 'sacrifice') {
    // 送别不能取消：方向键、空格等按键不应该把焦点挪出卡片。
    if (event.code === 'Escape' || event.code === 'KeyR') event.preventDefault();
    return;
  }

  if (event.code === 'Slash' && game.isSneakStage() && game.state === 'playing') {
    event.preventDefault();
    game.interact(game.partner);
    return;
  }

  if (game.state === 'pouch' && /^Digit[0-9]$/.test(event.code)) {
    event.preventDefault();
    const index = event.code === 'Digit0' ? 9 : Number(event.code.slice(-1)) - 1;
    const type = BUFF_CANDY_TYPES[index];
    if (type) {
      const result = game.usePouchCandy(type);
      if (!result.ok) {
        showToast(result.message, 2400);
        updatePouch();
        updateHud();
      } else {
        game.closePouch();
        updateHud();
      }
    }
    return;
  }

  if (game.state === 'inventory' && /^Digit[1-4]$/.test(event.code)) {
    const hud = game.getHudState();
    const type = PLACE_ORDER[Number(event.code.slice(-1)) - 1];
    if (hud.placement && type) {
      event.preventDefault();
      handlePlacement(type);
    }
    return;
  }

  if (event.code === 'Enter') {
    if (targetIsButton) return;
    if (game.state === 'title') {
      event.preventDefault();
      enterFullscreen();
      game.startTutorial();
    } else if (game.state === 'paused') {
      event.preventDefault();
      game.resume();
    } else if (game.state === 'inventory') {
      event.preventDefault();
      game.closeBackpack();
    } else if (game.state === 'pouch') {
      event.preventDefault();
      game.closePouch();
    } else if (game.state === 'trickDoor') {
      event.preventDefault();
      game.closeTrickDoor();
    } else if (game.state === 'roster') {
      event.preventDefault();
      game.closeRoster();
    }
    return;
  }

  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (game.state === 'playing') {
      event.preventDefault();
      game.pause();
    } else if (game.state === 'paused') {
      event.preventDefault();
      game.resume();
    } else if (game.state === 'inventory') {
      event.preventDefault();
      game.closeBackpack();
    } else if (game.state === 'pouch') {
      event.preventDefault();
      game.closePouch();
    } else if (game.state === 'trickDoor') {
      event.preventDefault();
      game.closeTrickDoor();
    } else if (game.state === 'roster') {
      event.preventDefault();
      game.closeRoster();
    } else if (game.state === 'tracks') {
      event.preventDefault();
      game.closeParadeTracks();
    } else if (game.state === 'defeat') {
      event.preventDefault();
      game.returnToTitle();
    } else if (game.state === 'complete') {
      event.preventDefault();
      game.returnToTitle();
    }
    return;
  }

  if (event.code === 'KeyR' && (game.state === 'playing' || game.state === 'paused')) {
    event.preventDefault();
    restartRun();
    return;
  }

  if (event.code === 'KeyM') {
    const muted = game.toggleMute();
    showToast(muted ? '音效已关闭' : '音效已开启');
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.pause();
});

/* ---------------- 本地存档 ----------------
 * 起始页先读一次，刷新「继续」按钮；共用行囊（钱包、合脚度、设置）
 * 在真正点「继续」时由 Game.continueSaved() 再按线路补回去。
 */
Save.setErrorReporter((message) => showToast(message, 5200));
const bootSave = Save.load();
if (bootSave) Save.apply(game, bootSave);
refreshContinue(bootSave);

renderTracks();
syncOverlays(game.state);
syncFullscreenUi();
window.setInterval(updateHud, 100);

/* ---------------- 皮鞋的声音 ----------------
 * 独立轮询，不碰原有循环。只在追思小径说话。
 * 台词池在 src/shoeVoice.js；班级私货在 src/classJokes.js。
 */
const shoeVoiceEl = document.querySelector('#shoeVoice');
const shoeVoice = new ShoeVoice({
  extraLines: VERSION === 'class' ? CLASS_LINES : [],
});

let shoeVoiceHideAt = 0;
let shoeVoiceTimer = 0;
let shoeVoiceLastTime = Infinity;

function tickShoeVoice() {
  const hud = game.getHudState();

  // 本局时间往回跳 = 重开了，把说过的话忘掉。
  if (hud.time < shoeVoiceLastTime - 0.05) {
    shoeVoice.reset();
    shoeVoiceEl.classList.remove('is-visible');
    shoeVoiceHideAt = 0;
  }
  shoeVoiceLastTime = hud.time;

  const now = performance.now();
  if (now < shoeVoiceHideAt) return;

  const line = shoeVoice.tick({
    state: hud.state,
    mode: hud.mode,
    fit: hud.shoeFit,
    progress: hud.progress,
    jumps: game.session?.jumpCount ?? 0,
    now,
  });
  if (!line) return;

  shoeVoiceEl.textContent = line;
  shoeVoiceEl.classList.add('is-visible');
  shoeVoiceHideAt = now + 5200;
  window.clearTimeout(shoeVoiceTimer);
  shoeVoiceTimer = window.setTimeout(() => {
    shoeVoiceEl.classList.remove('is-visible');
  }, 5200);
}

window.setInterval(tickShoeVoice, 130);
