import { Game } from './game.js';
import * as Save from './save.js';
import { getItemDef } from './collectibles.js';
import { BUFF_CANDIES, BUFF_CANDY_TYPES } from './buffCandies.js';
import { PARADE_ROUTE, PARADE_TRACKS } from './parade.js';
import { MEMORIAL_ROUTE } from './memorial.js';
import { TouchControls, isMobileDevice } from './touch.js';
import { ShoeVoice } from './shoeVoice.js';
import { CLASS_LINES } from './classJokes.js';
import { drawYokaiSprite } from './yokai.js';
import { paintShoePair } from './shoeFollowers.js';
import { ShoeTalk, SHOE_THEORY } from './shoeTalk.js';
import { PuzzleView } from './puzzleView.js';
import { CONTROL_KEYS, CONTROL_KEYS_MOBILE, getHintContent } from './hints.js';
import { MOBILE } from './config.js';

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
const hintScreen = document.querySelector('#hintScreen');
const trickDoorScreen = document.querySelector('#trickDoorScreen');
const trickPuzzleScreen = document.querySelector('#trickPuzzleScreen');
const rosterScreen = document.querySelector('#rosterScreen');
const sacrificeScreen = document.querySelector('#sacrificeScreen');
const defeatScreen = document.querySelector('#defeatScreen');
const completeScreen = document.querySelector('#completeScreen');
const letterScreen = document.querySelector('#letterScreen');
const letterSealed = document.querySelector('#letterSealed');
const letterOpened = document.querySelector('#letterOpened');
const openLetterButton = document.querySelector('#openLetterButton');
const laterLetterButton = document.querySelector('#laterLetterButton');
const talkToShoeButton = document.querySelector('#talkToShoeButton');
const closeLetterButton = document.querySelector('#closeLetterButton');
const shoeTalkScreen = document.querySelector('#shoeTalkScreen');
const shoeTalkCanvas = document.querySelector('#shoeTalkCanvas');
const shoeTalkBubbles = document.querySelector('#shoeTalkBubbles');
const closeShoeTalkButton = document.querySelector('#closeShoeTalkButton');
const shoeTheoryButton = document.querySelector('#shoeTheoryButton');
const shoeTalkTheory = document.querySelector('#shoeTalkTheory');
const shoeTalkTheoryTitle = document.querySelector('#shoeTalkTheoryTitle');
const shoeTalkTheoryBody = document.querySelector('#shoeTalkTheoryBody');
const shoeTalkReplayButton = document.querySelector('#shoeTalkReplayButton');
const shoeTalkDoneButton = document.querySelector('#shoeTalkDoneButton');
const shoeRackSection = document.querySelector('#shoeRackSection');
const shoeRack = document.querySelector('#shoeRack');
const shoeRackDetail = document.querySelector('#shoeRackDetail');

const modeActions = document.querySelector('#modeActions');
const startTutorialButton = document.querySelector('#startTutorialButton');
const tutorialBadge = document.querySelector('#tutorialBadge');
const tutorialDetail = document.querySelector('#tutorialDetail');
const replayTutorialButton = document.querySelector('#replayTutorialButton');
const startMemorialButton = document.querySelector('#startMemorialButton');
const startParadeButton = document.querySelector('#startParadeButton');
const startTrickButton = document.querySelector('#startTrickButton');
const mainRouteNote = document.querySelector('#mainRouteNote');
const sideRouteNote = document.querySelector('#sideRouteNote');
const continueButton = document.querySelector('#continueButton');
const continueLabel = document.querySelector('#continueLabel');
const continueDetail = document.querySelector('#continueDetail');
const clearSaveButton = document.querySelector('#clearSaveButton');
const startLetterButton = document.querySelector('#startLetterButton');
const closeTrackButton = document.querySelector('#closeTrackButton');
const trackGrid = document.querySelector('#trackGrid');
const resumeButton = document.querySelector('#resumeButton');
const pauseRestartButton = document.querySelector('#pauseRestartButton');
const pauseHintButton = document.querySelector('#pauseHintButton');
const pauseExitButton = document.querySelector('#pauseExitButton');
const defeatRestartButton = document.querySelector('#defeatRestartButton');
const defeatExitButton = document.querySelector('#defeatExitButton');
const closeBackpackButton = document.querySelector('#closeBackpackButton');
const closeHintButton = document.querySelector('#closeHintButton');
const hintTitle = document.querySelector('#hintTitle');
const hintStep = document.querySelector('#hintStep');
const hintObjective = document.querySelector('#hintObjective');
const hintList = document.querySelector('#hintList');
const hintKeys = document.querySelector('#hintKeys');
const screenMenuButton = document.querySelector('#screenMenuButton');
const screenHintButton = document.querySelector('#screenHintButton');
const screenCorner = document.querySelector('#screenCorner');
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
const memorialBodyEn = document.querySelector('#memorialBodyEn');
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
const staticHudDistance = document.querySelector('#staticHudDistance');
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
// 落幕的旁白和名单：整块由 ending.js 填字，这里只负责在进出这一幕时收放。
const endingLayer = document.querySelector('#endingLayer');
const questTrack = document.querySelector('#questTrack');
const questText = document.querySelector('#questText');
const questTime = document.querySelector('#questTime');
const questProgress = document.querySelector('#questProgress');
const questExitButton = document.querySelector('#questExitButton');
const questFoot = document.querySelector('#questFoot');

const toast = document.querySelector('#toast');
const candyReward = document.querySelector('#candyReward');
const candyRewardCard = candyReward.querySelector('.candy-reward-card');
const candyRewardKicker = document.querySelector('#candyRewardKicker');
const candyRewardGlyph = document.querySelector('#candyRewardGlyph');
const candyRewardName = document.querySelector('#candyRewardName');
const candyRewardTag = document.querySelector('#candyRewardTag');
const candyRewardCount = document.querySelector('#candyRewardCount');
const candyRewardSparks = document.querySelector('#candyRewardSparks');
const shoeReward = document.querySelector('#shoeReward');
const shoeRewardCard = shoeReward.querySelector('.shoe-reward-card');
const shoeRewardKicker = document.querySelector('#shoeRewardKicker');
const shoeRewardCanvas = document.querySelector('#shoeRewardCanvas');
const shoeRewardName = document.querySelector('#shoeRewardName');
const shoeRewardTag = document.querySelector('#shoeRewardTag');
const shoeRewardEn = document.querySelector('#shoeRewardEn');
const shoeRewardCount = document.querySelector('#shoeRewardCount');
const shoeRewardSparks = document.querySelector('#shoeRewardSparks');
const openingCard = document.querySelector('#openingCard');
const openingCn = document.querySelector('#openingCn');
const openingEn = document.querySelector('#openingEn');
const openingTutorialToggle = document.querySelector('#openingTutorialToggle');
const openingTutorialTitle = document.querySelector('#openingTutorialTitle');
const openingTutorialMark = document.querySelector('#openingTutorialMark');
const openingTutorial = document.querySelector('#openingTutorial');
const openingTutorialCn = document.querySelector('#openingTutorialCn');
const openingSkip = document.querySelector('#openingSkip');
const blessingCard = document.querySelector('#blessingCard');
const blessingKicker = document.querySelector('#blessingKicker');
const blessingCn = document.querySelector('#blessingCn');
const blessingEn = document.querySelector('#blessingEn');
const signCard = document.querySelector('#signCard');
const signKicker = document.querySelector('#signKicker');
const signCn = document.querySelector('#signCn');
const signEn = document.querySelector('#signEn');
const signClose = document.querySelector('#signClose');
const touchRoot = document.querySelector('#touchControls');
const touchInteractButton = document.querySelector('#touchInteractButton');
const topStatusText = document.querySelector('#topStatusText');
const completeKicker = document.querySelector('#completeKicker');
const completeTitle = document.querySelector('#completeTitle');
const completeCopy = document.querySelector('#completeCopy');
const completeTime = document.querySelector('#completeTime');
const completeBones = document.querySelector('#completeBones');
const completeHands = document.querySelector('#completeHands');
const completeCostumes = document.querySelector('#completeCostumes');
const completeFit = document.querySelector('#completeFit');

const inventoryBones = document.querySelector('#inventoryBones');
const inventoryBonesTotal = document.querySelector('#inventoryBonesTotal');
const inventoryHands = document.querySelector('#inventoryHands');
const inventoryList = document.querySelector('#inventoryList');
const inventoryTime = document.querySelector('#inventoryTime');
const inventoryFitItem = document.querySelector('#inventoryFitItem');
const inventoryFit = document.querySelector('#inventoryFit');
const inventoryGrid = document.querySelector('#inventoryGrid');
const inventoryHandBox = document.querySelector('#inventoryHandBox');
const inventoryCarryNote = document.querySelector('#inventoryCarryNote');
const wardrobePanel = document.querySelector('#wardrobePanel');
const wardrobeGrid = document.querySelector('#wardrobeGrid');
const wardrobeProgress = document.querySelector('#wardrobeProgress');
const placementPanel = document.querySelector('#placementPanel');
const placementField = document.querySelector('#placementField');
const placementItems = document.querySelector('#placementItems');
const pouchGrid = document.querySelector('#pouchGrid');
const pouchTotal = document.querySelector('#pouchTotal');
const rosterPouchGrid = document.querySelector('#rosterPouchGrid');
const rosterPouchTotal = document.querySelector('#rosterPouchTotal');

const PLACE_ORDER = ['rib', 'femur', 'skull', 'rightHand'];

const game = new Game(canvas);
// 手机屏幕小：把镜头里的世界整体放大一点，人物和环境才看得清；
// 最右端再给右手按键留一条空白，走到头时门不会压在按键底下。
// 这两项都记在 Game 上，之后每一张新图重建渲染器时会自动带上。
if (isMobile) {
  game.setCameraFraming({
    zoom: MOBILE.cameraZoom,
    rightPadding: MOBILE.cameraRightPadding,
  });
}
// 手机上没有第二套方向键：第三段让「回音」跟着主角走。
game.mobileAssist = isMobile;

// 与皮鞋对话：独立的一块画布，不占游戏循环。信纸上的按钮和背包里的鞋都调它。
const shoeTalk = new ShoeTalk({ canvas: shoeTalkCanvas, bubbleLayer: shoeTalkBubbles });
shoeTalk.onQuestion = (index) => {
  // 问到「学习的定义」时，把下面那个「皮鞋学习论」轻轻亮一下。
  if (index === 2) shoeTheoryButton?.classList.add('is-hinting');
};
// 最后一句说完再停一会儿，这一幕自己收起来，不用玩家再点一次「收起」。
// 如果这时正翻着「皮鞋学习论」，就先记下来，等他收起来再把整幕关上。
let shoeTalkClosePending = false;
shoeTalk.onFinish = () => {
  if (shoeTalkScreen.hidden) return;
  if (!shoeTalkTheory.hidden) {
    shoeTalkClosePending = true;
    return;
  }
  closeShoeTalk();
};
if (shoeTalkTheoryTitle) shoeTalkTheoryTitle.textContent = SHOE_THEORY.title;
if (shoeTalkTheoryBody) shoeTalkTheoryBody.textContent = SHOE_THEORY.body;

const puzzleView = new PuzzleView({
  stage: trickPuzzleStage,
  feedback: trickPuzzleFeedback,
  metaStep: trickPuzzleStep,
  metaMistakes: trickPuzzleMistakes,
  onSolved: (houseId) => game.solveTrickPuzzle(houseId),
  onPersist: () => game.persist(),
  // 谜题面板只报名：answerRight / answerWrong / flip 都由 AudioKit 合成。
  onSound: (name) => game.audio[name]?.(),
});
let toastTimer = 0;
let candyRewardTimers = [];
let candyBumpTarget = null;
let shoeRewardTimers = [];
let shoeBumpTarget = null;
let blessingTimer = 0;
// 祝福停留的这段时间里，飘在左上角的提示先让一让：别压在她的那句话上。
let blessingUntil = 0;
let tutorialPipSignature = '';

// 触屏按键只借用 Input 的动作集合，游戏逻辑不需要知道设备。
// 桌面端这层一直隐藏，也不会被激活。
const touchControls = new TouchControls(touchRoot, game.input, {
  onBag: () => toggleBagPanel(),
  onHint: () => openHintPanel(),
  onPause: () => {
    if (game.state === 'playing') game.pause();
  },
  onInteract: () => {
    if (game.state === 'sign') {
      game.closeSign();
      return;
    }
    if (game.state !== 'playing') return;
    // 手机只有一个「互动」按钮，按当下的情况挑一件事做：
    // 惊恐发作时先呼吸；空着手站在能走的门边时，它跟着提示变成「离开」，
    // 一样要点两下才真的走；身边有装置时去摸装置；其余时候抱 / 抛身边的东西。
    if (game.isPanicActive()) {
      game.handlePanicPress();
      return;
    }
    // 站在故事路牌旁时，互动键先把路牌摊开。
    if (game.getNearbySign()) {
      game.openSign();
      return;
    }
    if (!game.pumpkins?.getCarried(game.player) && game.getTrickExitDevice()) {
      game.requestTrickExit();
      return;
    }
    if (game.shouldUseDevice()) {
      game.useDevice();
      return;
    }
    // 手机端第三段由你一个人操作：互动也固定交给主角，
    // 回音会自动跟着走，不会抢走南瓜。
    game.interact(game.isSneakStage() ? game.player : undefined);
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
  if (performance.now() < blessingUntil) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, toastDuration(message, duration));
}

// 追思小径每段文字的第二行：一、二段是英文，第三段换成了文言文。
// 文言文不走斜体，换成正楷一些的字面；空行则整块收起来。
const CJK_TEXT = /[㐀-鿿]/;
function setSecondaryLine(node, text) {
  if (!node) return;
  const value = text ?? '';
  node.textContent = value;
  node.hidden = !value;
  node.classList.toggle('is-verse', CJK_TEXT.test(value));
}

/** 糖纸街面板里「糖袋」那一格的数字；面板收起来时退到手机上那排精简数字。 */
function pouchCountNode() {
  const nodes = [trickPouch, panelPouchCount];
  for (const slot of compactCells) {
    if (slot.label.textContent === '糖袋' && !slot.cell.hidden) nodes.push(slot.value);
  }
  return nodes.find((node) => node && node.getClientRects().length) ?? null;
}

/** HUD 按 1280×720 缩放，量出来的屏幕像素要除以它才是这一层的坐标。 */
function screenUiScale() {
  const width = screenUi.getBoundingClientRect().width;
  return screenUi.offsetWidth > 0 && width > 0 ? width / screenUi.offsetWidth : 1;
}

/** 糖袋计数的落点：整行那格数字靠右，落点贴右边；收起来的精简数字很小，就压在它身上。 */
function pouchCountAnchor() {
  const target = pouchCountNode();
  if (!target) return null;
  const box = target.getBoundingClientRect();
  return {
    x: box.width >= 60 ? box.right - 12 : box.left + box.width / 2,
    y: box.top + box.height / 2,
  };
}

/** 卡片飞向糖袋计数的位移，按两边此刻在屏幕上的位置算，HUD 挪过位置也对得上。 */
function layOutCandyFlight() {
  const anchor = pouchCountAnchor();
  if (!anchor) return;
  const cardBox = candyRewardCard.getBoundingClientRect();
  const scale = screenUiScale();
  const dx = (anchor.x - (cardBox.left + cardBox.width / 2)) / scale;
  const dy = (anchor.y - (cardBox.top + cardBox.height / 2)) / scale;
  candyReward.style.setProperty('--fly-x', `${Math.round(dx)}px`);
  candyReward.style.setProperty('--fly-y', `${Math.round(dy)}px`);
  // 中途往上抬一点，走弧线而不是直线。
  candyReward.style.setProperty('--fly-mx', `${Math.round(dx * 0.55)}px`);
  candyReward.style.setProperty('--fly-my', `${Math.round(dy * 0.45 - 36)}px`);
}

function bumpPouchCount() {
  const target = pouchCountNode();
  if (!target) return;
  candyBumpTarget?.classList.remove('is-candy-bump');
  candyBumpTarget = target;
  target.style.setProperty(
    '--accent',
    candyReward.style.getPropertyValue('--accent') || '#ffcf72',
  );
  void target.offsetWidth;
  target.classList.add('is-candy-bump');
  candyRewardTimers.push(
    window.setTimeout(() => target.classList.remove('is-candy-bump'), 700),
  );
}

/** 卡片落进糖袋时，计数上扩一圈同色的光环。 */
function pingPouchCount() {
  const anchor = pouchCountAnchor();
  if (!anchor) return;
  const scale = screenUiScale();
  const rootBox = candyReward.getBoundingClientRect();
  const ping = document.createElement('span');
  ping.className = 'candy-reward-ping';
  ping.style.left = `${Math.round((anchor.x - rootBox.left) / scale)}px`;
  ping.style.top = `${Math.round((anchor.y - rootBox.top) / scale)}px`;
  candyReward.append(ping);
  candyRewardTimers.push(window.setTimeout(() => ping.remove(), 900));
}

function stopCandyReward() {
  for (const timer of candyRewardTimers) window.clearTimeout(timer);
  candyRewardTimers = [];
  candyBumpTarget?.classList.remove('is-candy-bump');
  candyBumpTarget = null;
  // 半路收掉时，落袋那圈光还没到时间清自己。
  for (const ping of candyReward.querySelectorAll('.candy-reward-ping')) ping.remove();
  candyReward.classList.remove('is-collecting');
  candyReward.hidden = true;
}

/**
 * 拿到一颗糖：卡片在画面中间弹出来，停一下，再缩成一点飞进糖袋的计数，
 * 计数跟着亮一下、扩一圈光。糖纸街每做成一户都走这一遍。
 */
function playCandyReward(reward) {
  if (!reward) return;
  stopCandyReward();

  const accent = reward.accent ?? '#ffcf72';
  const added = Number(reward.added) || 0;
  candyReward.style.setProperty('--accent', accent);
  candyRewardKicker.textContent = `${reward.mode === 'trick' ? '捣蛋' : '帮忙'} · ${
    reward.houseName ?? '糖纸街'
  }`;
  candyRewardGlyph.textContent = reward.glyph ?? '✦';
  candyRewardName.textContent = reward.name ?? '一颗糖';
  candyRewardTag.textContent = reward.tag ?? '';
  candyRewardCount.textContent = added > 0 ? `糖袋 +${added}` : '糖袋满了';
  candyRewardCount.classList.toggle('is-full', added <= 0);

  candyRewardSparks.replaceChildren();
  for (let i = 0; i < 12; i += 1) {
    const spark = document.createElement('i');
    spark.style.setProperty('--a', `${i * 30 + (Math.random() * 14 - 7)}deg`);
    // 起点贴着卡片外沿，再散到画面外，不然大半程都被卡片挡住。
    spark.style.setProperty('--d', `${156 + Math.random() * 64}px`);
    spark.style.setProperty('--s', `${6 + Math.random() * 3}px`);
    candyRewardSparks.append(spark);
  }

  candyReward.hidden = false;
  layOutCandyFlight();
  // 连着拿到两颗时，动画要跟着从头放一遍。
  candyReward.classList.remove('is-collecting');
  void candyRewardCard.offsetWidth;

  candyRewardTimers.push(
    window.setTimeout(() => {
      candyReward.classList.add('is-collecting');
      candyRewardTimers.push(
        window.setTimeout(() => {
          // 卡片已经缩到看不见了，再留一会儿，好让计数上那圈光有时间放完。
          bumpPouchCount();
          pingPouchCount();
          candyRewardTimers.push(
            window.setTimeout(() => {
              candyReward.classList.remove('is-collecting');
              candyReward.hidden = true;
            }, 760),
          );
        }, 640),
      );
    }, 1180),
  );
}

/** 鞋落进哪一格：游玩时是旅人手记里「身后」那一行，结算页是「身后的鞋」。 */
function shoeCountNode() {
  const nodes = [memorialShoes, completeShoes];
  return nodes.find((node) => node && node.getClientRects().length) ?? null;
}

function shoeCountAnchor() {
  const target = shoeCountNode();
  if (!target) return null;
  const box = target.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** 卡片飞向「身后」那一格：和糖飞向糖袋同一套弧线，只是落点换了一处。 */
function layOutShoeFlight() {
  const anchor = shoeCountAnchor();
  if (!anchor) {
    // 找不到「身后」那一格（碑前那一幕里没有面板）：就在原地缩掉，
    // 别让它飞向上一张卡片留下的旧坐标。
    for (const key of ['--fly-x', '--fly-y', '--fly-mx', '--fly-my']) {
      shoeReward.style.setProperty(key, '0px');
    }
    return false;
  }
  const cardBox = shoeRewardCard.getBoundingClientRect();
  const scale = screenUiScale();
  const dx = (anchor.x - (cardBox.left + cardBox.width / 2)) / scale;
  const dy = (anchor.y - (cardBox.top + cardBox.height / 2)) / scale;
  shoeReward.style.setProperty('--fly-x', `${Math.round(dx)}px`);
  shoeReward.style.setProperty('--fly-y', `${Math.round(dy)}px`);
  shoeReward.style.setProperty('--fly-mx', `${Math.round(dx * 0.55)}px`);
  shoeReward.style.setProperty('--fly-my', `${Math.round(dy * 0.45 - 36)}px`);
  return true;
}

function bumpShoeCount() {
  const target = shoeCountNode();
  if (!target) return;
  shoeBumpTarget?.classList.remove('is-shoe-bump');
  shoeBumpTarget = target;
  target.style.setProperty(
    '--accent',
    shoeReward.style.getPropertyValue('--accent') || '#c6b3e0',
  );
  void target.offsetWidth;
  target.classList.add('is-shoe-bump');
  shoeRewardTimers.push(
    window.setTimeout(() => target.classList.remove('is-shoe-bump'), 700),
  );
}

/** 鞋落进那一格时，落点上扩一圈同色的光环。 */
function pingShoeCount() {
  const anchor = shoeCountAnchor();
  if (!anchor) return;
  const scale = screenUiScale();
  const rootBox = shoeReward.getBoundingClientRect();
  const ping = document.createElement('span');
  ping.className = 'shoe-reward-ping';
  ping.style.left = `${Math.round((anchor.x - rootBox.left) / scale)}px`;
  ping.style.top = `${Math.round((anchor.y - rootBox.top) / scale)}px`;
  shoeReward.append(ping);
  shoeRewardTimers.push(window.setTimeout(() => ping.remove(), 900));
}

function stopShoeReward() {
  for (const timer of shoeRewardTimers) window.clearTimeout(timer);
  shoeRewardTimers = [];
  shoeBumpTarget?.classList.remove('is-shoe-bump');
  shoeBumpTarget = null;
  for (const ping of shoeReward.querySelectorAll('.shoe-reward-ping')) ping.remove();
  shoeReward.classList.remove('is-collecting');
  shoeReward.classList.remove('has-blessing');
  shoeReward.hidden = true;
  playerPanel.classList.remove('is-rewarding');
}

/**
 * 卡片正中那双鞋：和路上跟着的同一套画法，放大七倍画出来。
 * 逻辑画布 24×12 格，鞋跟踩在第 9 行，靴筒最高的那双也留得下。
 */
function drawShoeRewardArt(reward) {
  const ctx = shoeRewardCanvas?.getContext('2d');
  if (!ctx) return;
  const scale = 7;
  const logicalW = 24;
  const logicalH = 12;
  shoeRewardCanvas.width = logicalW * scale;
  shoeRewardCanvas.height = logicalH * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, logicalW, logicalH);
  paintShoePair(ctx, {
    style: reward.shoe,
    accent: reward.accent,
    centerX: logicalW / 2,
    groundY: 9,
  });
}

/**
 * 走完一段：那一段的人的鞋弹出来，停一下，再缩成一点落进「身后」那一格。
 * 和拿到一颗糖同一套节奏，中间画的是鞋本身——就是接下来跟在身后的那一双。
 */
function playShoeReward(reward) {
  if (!reward) return;
  stopShoeReward();
  stopBlessing();

  // 桌面端鞋卡和祝福同时出现：祝福卡高过一行时，鞋卡往下让一点，别压住英文。
  shoeReward.classList.toggle('has-blessing', Boolean(reward.blessing));

  const accent = reward.accent ?? '#c6b3e0';
  shoeReward.style.setProperty('--accent', accent);
  // 手机上卡片和祝福会重叠：先藏起旅人手记，让卡片和祝福有自己的位置。
  playerPanel.classList.add('is-rewarding');
  // 开篇的人物小传压在卡片上：中文一行、英文一行；没有小传时才写落脚习惯。
  shoeRewardKicker.textContent = `${reward.stageLabel ?? `第 ${reward.stage} 段`} · ${
    reward.patient ?? ''
  }`;
  shoeRewardName.textContent = reward.shoeName ?? '一双鞋';
  shoeRewardTag.textContent = reward.bio ?? reward.line ?? '';
  setSecondaryLine(shoeRewardEn, reward.bioEn);
  shoeRewardCount.textContent = '身后的鞋 +1';
  drawShoeRewardArt(reward);

  shoeRewardSparks.replaceChildren();
  for (let i = 0; i < 12; i += 1) {
    const spark = document.createElement('i');
    spark.style.setProperty('--a', `${i * 30 + (Math.random() * 14 - 7)}deg`);
    spark.style.setProperty('--d', `${156 + Math.random() * 64}px`);
    spark.style.setProperty('--s', `${6 + Math.random() * 3}px`);
    shoeRewardSparks.append(spark);
  }

  shoeReward.hidden = false;
  // 卡片在画面上停几秒才收：有小传的卡片多留一会儿，让中英文都看得完。
  const holdMs = reward.bio ? 5200 : 3180;
  // 鞋和祝福一起出现：卡片正中是鞋与人物小传，画面上方是这一段的病人留给主角的话。
  // 手机屏幕矮，两张卡会叠在一起，等鞋收进「身后」再浮出祝福。
  if (reward.blessing) {
    if (isMobile) {
      shoeRewardTimers.push(
        window.setTimeout(() => playBlessing(reward), holdMs + 1500),
      );
    } else {
      playBlessing(reward);
    }
  }
  // 连着走过两段时，动画要跟着从头放一遍。
  shoeReward.classList.remove('is-collecting');
  void shoeRewardCard.offsetWidth;

  // 卡片在画面上停几秒才收：有小传的卡片多留一会儿，让中英文都看得完。
  shoeRewardTimers.push(
    window.setTimeout(() => {
      // 落点等这一刻再量：换图、结算页弹出来之后，「身后」那一格才在。
      layOutShoeFlight();
      shoeReward.classList.add('is-collecting');
      shoeRewardTimers.push(
        window.setTimeout(() => {
          bumpShoeCount();
          pingShoeCount();
          shoeRewardTimers.push(
            window.setTimeout(() => {
              shoeReward.classList.remove('is-collecting');
              shoeReward.hidden = true;
              if (!reward.blessing) playerPanel.classList.remove('is-rewarding');
            }, 760),
          );
        }, 640),
      );
    }, holdMs),
  );
}

/**
 * 通关一段之后浮出来的祝福：中英文各一行，停在画面上方几秒再自己收掉。
 * 不挡路、不接管按键，玩家可以边走边看。
 */
function playBlessing(reward) {
  const blessing = reward.blessing;
  if (!blessing?.cn) return;
  stopBlessing();
  // stopBlessing 会收起「让旅人手记靠边」的标记，这里再打上：
  // 手机上祝福也要独占画面，直到它自己收掉。
  playerPanel.classList.add('is-rewarding');
  // 祝福是这一段的收尾：左上角的飘字先收掉，等它说完再恢复。
  toast.classList.remove('is-visible');
  window.clearTimeout(toastTimer);
  blessingUntil = performance.now() + 8000;
  blessingKicker.textContent = `${reward.patient ?? ''} 送给主角的话 · A word for you`;
  blessingCn.textContent = blessing.cn;
  setSecondaryLine(blessingEn, blessing.en);
  blessingCard.hidden = false;
  blessingCard.classList.remove('is-visible');
  void blessingCard.offsetWidth;
  blessingCard.classList.add('is-visible');
  blessingTimer = window.setTimeout(() => {
    blessingCard.classList.remove('is-visible');
    blessingTimer = window.setTimeout(() => {
      blessingCard.hidden = true;
      playerPanel.classList.remove('is-rewarding');
      blessingUntil = 0;
    }, 400);
  }, 7600);
}

function stopBlessing() {
  if (blessingTimer) window.clearTimeout(blessingTimer);
  blessingTimer = 0;
  blessingUntil = 0;
  blessingCard.classList.remove('is-visible');
  blessingCard.hidden = true;
  playerPanel.classList.remove('is-rewarding');
}

/**
 * 起始页的入口主次。
 *
 * 教程没走完时只有教程是亮的：主线与两条附带的夜路压暗，点一下只给一句提示。
 * 教程走完之后，主线顶到最上面，并写明走到第几段；
 * 魑魅魍魉和糖纸街留在下面的「附带的夜路」里，随时能走。
 */
function refreshStartScreen(data = Save.current()) {
  const cleared = Save.tutorialCleared(data);
  const tutorial = data?.routes?.tutorial;
  const memorial = data?.routes?.memorial;

  modeActions.dataset.gate = cleared ? 'routes' : 'tutorial';
  startTutorialButton.hidden = cleared;
  replayTutorialButton.hidden = !cleared;
  // 收在背包里的信：起始页也留一个安静的入口，不用先进一趟夜路再开背包。
  const letterInBag = Save.memorialLetterInBag(data);
  startLetterButton.hidden = !letterInBag;
  if (letterInBag) {
    startLetterButton.textContent = Save.memorialLetterRead(data)
      ? '再看皮鞋的信'
      : '打开皮鞋的信';
  }

  // 教程还没走完：说清楚从哪儿接上、大概要多久。
  if (!cleared) {
    const step = tutorial?.step ?? 0;
    tutorialBadge.textContent = '第一步';
    tutorialDetail.textContent =
      step > 0 && !tutorial?.completed
        ? `接着上次 · 第 ${step + 1} 课`
        : '约 2 分钟 · 走路、跳跃、推南瓜';
  }

  for (const button of [startMemorialButton, startParadeButton, startTrickButton]) {
    button.classList.toggle('is-locked', !cleared);
    if (cleared) button.removeAttribute('aria-disabled');
    else button.setAttribute('aria-disabled', 'true');
  }

  mainRouteNote.textContent = !cleared
    ? '教程后开放'
    : !memorial
      ? '四段夜路'
      : memorial.completed
        ? '四段走完了'
        : `第 ${Save.routeStage('memorial', memorial)} / ${MEMORIAL_ROUTE.totalStages} 段`;
  sideRouteNote.textContent = cleared ? '随时能走' : '教程后开放';
}

/**
 * 起始页的「继续」按钮：有可读的存档时才出现。
 * 文案只写线路和段落，详细状态留在游戏里，不把面板塞满。
 */
function refreshContinue(data = Save.current()) {
  const run = Save.describeRun(data);
  continueButton.hidden = !run;
  clearSaveButton.hidden = !data;
  if (run) {
    continueLabel.textContent = run.title;
    continueDetail.textContent = run.detail;
  }
  refreshStartScreen(data);
}

/**
 * 皮鞋的信：主线第一次走完、从碑前回到目录时出现一次。
 * 一出现就把「递过了」的标记落下，之后回到目录都不会再自动弹；
 * 信本身仍然留在背包里，随时能翻开、能叫鞋说话。
 */
function maybeShowMemorialLetter() {
  if (!letterScreen.hidden) return;
  if (!Save.memorialCleared()) return;
  // 已经做过选择（打开过，或收进了背包）就不再弹；
  // 如果上次是在信封面前直接关掉了页面，下次回到目录仍然把信递上来。
  const decided = Save.memorialLetterRead() || Save.memorialLetterInBag();
  if (Save.memorialLetterSeen() && decided) return;
  showMemorialLetter({ opened: false });
  if (!Save.memorialLetterSeen()) Save.markMemorialLetterSeen();
  openLetterButton?.focus?.({ preventScroll: true });
}

/** 打开信纸；从背包里翻出来时也走这里。 */
function showMemorialLetter({ opened = false } = {}) {
  letterScreen.hidden = false;
  letterSealed.hidden = opened;
  letterOpened.hidden = !opened;
}

/** 「打开」：读到信的内容，从此已读，也收进背包。 */
function openMemorialLetter() {
  Save.markMemorialLetterRead();
  letterSealed.hidden = true;
  letterOpened.hidden = false;
  talkToShoeButton?.focus?.({ preventScroll: true });
  if (!backpackScreen.hidden) updateShoeRack();
  refreshStartScreen();
}

/** 「稍后再看」：不读，但信收进背包，之后在背包里点开。 */
function postponeMemorialLetter() {
  Save.markMemorialLetterInBag();
  letterScreen.hidden = true;
  showToast('信收进了背包 · 随时能翻开。', 3000);
  if (!backpackScreen.hidden) updateShoeRack();
  refreshStartScreen();
  if (!startLetterButton.hidden) startLetterButton.focus({ preventScroll: true });
}

/** 收起：没拆开过就按「稍后再看」处理，别让信丢掉。 */
function closeMemorialLetter() {
  if (!letterSealed.hidden) {
    postponeMemorialLetter();
    return;
  }
  letterScreen.hidden = true;
  if (!startScreen.hidden && !startLetterButton.hidden) {
    startLetterButton.focus({ preventScroll: true });
  }
}

/** 从背包里点开那封信：直接读，不再问一次打开还是稍后。 */
function openLetterFromBag() {
  Save.markMemorialLetterRead();
  showMemorialLetter({ opened: true });
  talkToShoeButton?.focus?.({ preventScroll: true });
  if (!backpackScreen.hidden) updateShoeRack();
  refreshStartScreen();
}

/**
 * 与皮鞋对话：信收起，角色和鞋面对面。穿着什么时装，画面上就是什么样。
 * 这一幕不进入游戏状态——背包或目录照常在下面，关掉就回到原来的画面。
 */
function openShoeTalk() {
  if (!shoeTalk || !shoeTalkScreen) return;
  letterScreen.hidden = true;
  shoeTalkScreen.hidden = false;
  shoeTalkClosePending = false;
  shoeTalkTheory.hidden = true;
  shoeTalkTheory.closest('.shoe-talk-panel')?.classList.remove('is-showing-theory');
  shoeTheoryButton.textContent = '什么是皮鞋学习论？';
  shoeTheoryButton.classList.remove('is-hinting');
  // 穿什么时装就画什么：当前这一局优先，其次读档里记着的那一套。
  const costume =
    game.player?.costume ??
    game.session?.equippedCostume ??
    Save.current()?.wallet?.equippedCostume ??
    null;
  shoeTalk.start(costume);
  closeShoeTalkButton?.focus?.({ preventScroll: true });
}

function closeShoeTalk() {
  shoeTalkScreen.hidden = true;
  shoeTalk?.stop();
  shoeTalkClosePending = false;
  // 关掉之后把焦点交回去，键盘和读屏不会停在一个已经藏起来的按钮上。
  if (!letterScreen.hidden) talkToShoeButton?.focus?.({ preventScroll: true });
  else if (!startScreen.hidden && !startLetterButton.hidden) {
    startLetterButton.focus({ preventScroll: true });
  }
}

function toggleShoeTheory() {
  const showing = shoeTalkTheory.hidden;
  shoeTalkTheory.hidden = !showing;
  shoeTheoryButton.textContent = showing ? '收起皮鞋学习论' : '什么是皮鞋学习论？';
  // 展开说明时把舞台收起来：短屏幕上说明才读得完，收起按钮也还够得着。
  shoeTalkTheory.closest('.shoe-talk-panel')?.classList.toggle('is-showing-theory', showing);
  if (showing) {
    shoeTheoryButton.classList.remove('is-hinting');
    requestAnimationFrame(() => {
      shoeTalkTheory.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  } else if (shoeTalkClosePending) {
    // 说明是在这一幕该收起来的时候翻开的：收好了，就把整幕一起关上。
    closeShoeTalk();
  }
}

function hideAllOverlays() {
  for (const overlay of [
    startScreen,
    trackScreen,
    pauseScreen,
    backpackScreen,
    hintScreen,
    trickDoorScreen,
    trickPuzzleScreen,
    rosterScreen,
    sacrificeScreen,
    defeatScreen,
    completeScreen,
    letterScreen,
    shoeTalkScreen,
    signCard,
  ]) {
    overlay.hidden = true;
  }
  shoeTalk?.stop();
  shoeTalkClosePending = false;
}

function syncOverlays(state) {
  hideAllOverlays();
  if (state !== 'trickPuzzle') puzzleView.close();

  // 开场白和祝福是画面上方的浮字，不占一个独立状态：
  // 不在游玩里、或换了状态，就先收起来。
  if (state !== 'playing') openingCard.hidden = true;
  // 落幕的文字层只在碑前那一幕出现；结算页、目录都先收掉。
  endingLayer.hidden = state !== 'ending';
  if (state === 'title' || state === 'complete' || state === 'ending') stopBlessing();
  if (state === 'sign') {
    const sign = game.session?.readingSign;
    if (sign) {
      signKicker.textContent = `路牌 ${sign.index + 1}/${sign.total} · Road Sign`;
      signCn.textContent = sign.cn;
      setSecondaryLine(signEn, sign.en);
      signClose.textContent = isMobile ? '轻触这里收起' : 'V / Esc 收起';
      signCard.hidden = false;
    }
  }

  // 名册、送别和结算面板会把路让出来；飘在上面的提示先收掉，别盖住标题。
  if (
    state === 'roster' ||
    state === 'complete' ||
    state === 'sacrifice' ||
    state === 'defeat' ||
    state === 'inventory' ||
    state === 'hint' ||
    state === 'paused' ||
    state === 'ending' ||
    state === 'trickDoor' ||
    state === 'trickPuzzle' ||
    state === 'sign'
  ) {
    toast.classList.remove('is-visible');
  }

  // 拿糖的卡片只在街上放；一开面板就收掉，别悬在对话和结算上面。
  if (state !== 'playing') stopCandyReward();
  // 拿到鞋的卡片要跟到下一幕去：前几段的鞋落进旅人手记的「身后」，
  // 最后那双是在碑前那一幕的黑屏上先放完的，所以 ending 也不收。
  // 只在真正的对话面板上收掉，免得和结算页抢画面。
  if (state !== 'playing' && state !== 'complete' && state !== 'ending') stopShoeReward();

  if (state === 'title') startScreen.hidden = false;
  else if (state === 'tracks') trackScreen.hidden = false;
  else if (state === 'paused') pauseScreen.hidden = false;
  else if (state === 'inventory') backpackScreen.hidden = false;
  else if (state === 'hint') {
    hintScreen.hidden = false;
    updateHint();
  } else if (state === 'trickDoor') {
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
    state === 'hint' ||
    state === 'trickDoor' ||
    state === 'trickPuzzle' ||
    state === 'roster' ||
    state === 'sacrifice';
  playerPanel.hidden = !inRun;

  // 左上角常驻的「目录 / 提示」：只要在一局里就能看见；
  // 标题页、赛道选择页和结算页不重复摆按钮。
  const hasCorner =
    inRun ||
    state === 'trickPuzzle' ||
    state === 'defeat';
  if (screenCorner) screenCorner.hidden = !hasCorner;
  if (screenHintButton) {
    screenHintButton.hidden = !(state === 'playing' || state === 'paused');
  }

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
    topStatusText.textContent = '背包 · 骨头、衣橱和糖袋';
  } else if (state === 'hint') {
    window.setTimeout(() => closeHintButton.focus({ preventScroll: true }), 0);
    updateHint();
    topStatusText.textContent = '提示 · 这一关怎么走';
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

  updateWardrobe(hud);
  updatePlacementPanel(hud);
  updateShoeRack();

  // 糖纸街的街面和追思前几段没有完整行囊：背包里只带糖袋；
  // 衣橱在追思路上一路都能打开，随时能看时装拼到哪一步。
  const hasBackpack =
    game.mode === 'trick'
      ? Boolean(game.session?.trickRoom)
      : game.mode !== 'memorial' || Boolean(game.level.memorialChapter?.hasBackpack);
  const hasWardrobe = hasBackpack || game.mode === 'memorial';
  inventoryGrid.hidden = !hasBackpack;
  inventoryHandBox.hidden = !hasBackpack;
  wardrobePanel.hidden = !hasWardrobe;
  if (!hasBackpack) placementPanel.hidden = true;
  inventoryCarryNote.hidden = hasBackpack;
  inventoryCarryNote.textContent =
    game.mode === 'trick'
      ? '糖纸街不摆骨头和时装，背包里只带糖袋。'
      : '这一段手里只有灯；鞋、衣橱和糖袋照常打开。';

  updatePouch();
}

/** 糖袋：十种增益糖，全线路通用。按数字键或点卡片吃一颗。 */
function updatePouch() {
  const pouch = game.getPouchState();
  pouchTotal.textContent = String(pouch.total);
  fillPouchGrid(pouchGrid, pouch);
}

/* ---------------- 背包里的鞋架 ----------------
 * 脚上这双和身后跟着的鞋都摆在这里；点一张卡片，下面展开它的细节。
 * 只有主线有鞋，其它线路整块不出现。
 */
let shoeRackSelection = 'own';

function updateShoeRack(scroll = false) {
  const rack = game.getShoeRackState?.();
  if (!rack) return;
  const inMemorial = rack.mode === 'memorial';
  shoeRackSection.hidden = !inMemorial;
  if (!inMemorial) {
    shoeRackDetail.hidden = true;
    return;
  }

  const entries = [rack.own, ...rack.followers];
  if (!entries.some((entry) => entry.id === shoeRackSelection)) shoeRackSelection = 'own';

  shoeRack.replaceChildren();

  // 先放那封信：读过 / 没读过的状态写在第二行，点开就能重读或叫鞋说话。
  if (Save.memorialLetterInBag()) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'shoe-card shoe-card--letter';
    const glyph = document.createElement('span');
    glyph.className = 'shoe-card-letter';
    glyph.textContent = '✉';
    glyph.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'shoe-card-copy';
    const name = document.createElement('b');
    name.textContent = '皮鞋的信';
    const note = document.createElement('em');
    note.textContent = Save.memorialLetterRead() ? '读过了 · 点开再看看' : '未读 · 收在背包里';
    copy.append(name, note);
    card.append(glyph, copy);
    card.addEventListener('click', openLetterFromBag);
    shoeRack.append(card);
  }

  for (const entry of entries) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'shoe-card';
    card.classList.toggle('is-own', entry.kind === 'own');
    card.classList.toggle('is-selected', entry.id === shoeRackSelection);
    card.style.setProperty('--accent', entry.accent);

    const art = document.createElement('canvas');
    art.className = 'shoe-card-art';
    art.setAttribute('aria-hidden', 'true');
    drawShoeCardArt(art, entry);

    const copy = document.createElement('span');
    copy.className = 'shoe-card-copy';
    const name = document.createElement('b');
    name.textContent =
      entry.kind === 'own' ? '自己脚上' : `${entry.patient}的${entry.shoeName}`;
    const note = document.createElement('em');
    note.textContent =
      entry.kind === 'own'
        ? `${entry.shoeName} · 合脚度 ${formatPercent(entry.fit)}`
        : `${entry.stageLabel} · ${entry.following ? '跟在身后' : '收在鞋架'}`;
    copy.append(name, note);

    card.append(art, copy);
    card.addEventListener('click', () => {
      shoeRackSelection = entry.id;
      updateShoeRack(true);
    });
    shoeRack.append(card);
  }

  renderShoeDetail(entries.find((entry) => entry.id === shoeRackSelection) ?? entries[0], scroll);
}

/** 卡片上那双鞋：和路上跟着的同一套画法。 */
function drawShoeCardArt(canvas, entry) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const scale = 5;
  const logicalW = 24;
  const logicalH = 12;
  canvas.width = logicalW * scale;
  canvas.height = logicalH * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, logicalW, logicalH);
  paintShoePair(ctx, {
    style: entry.shoe,
    accent: entry.accent,
    centerX: logicalW / 2,
    groundY: 9,
  });
}

/** 点开的那一张：脚上这双写合脚度和皮鞋学习论，身后的写人和那一句话。 */
function renderShoeDetail(entry, scroll = false) {
  if (!entry) {
    shoeRackDetail.hidden = true;
    return;
  }
  shoeRackDetail.hidden = false;
  shoeRackDetail.replaceChildren();
  shoeRackDetail.style.setProperty('--accent', entry.accent);

  const head = document.createElement('div');
  head.className = 'shoe-detail-head';
  const kicker = document.createElement('p');
  kicker.className = 'shoe-detail-kicker';
  kicker.textContent =
    entry.kind === 'own'
      ? `合脚度 ${formatPercent(entry.fit)}`
      : `${entry.stageLabel} · ${entry.following ? '跟在身后' : '收在鞋架'}`;
  const title = document.createElement('p');
  title.className = 'shoe-detail-title';
  title.textContent =
    entry.kind === 'own' ? '自己脚上的皮鞋' : `${entry.patient}的${entry.shoeName}`;
  head.append(kicker, title);
  shoeRackDetail.append(head);

  if (entry.kind === 'own') {
    const bar = document.createElement('div');
    bar.className = 'shoe-fit-bar';
    const fill = document.createElement('i');
    fill.style.width = `${Math.round(entry.fit * 100)}%`;
    bar.append(fill);
    shoeRackDetail.append(bar);

    const copy = document.createElement('p');
    copy.className = 'shoe-detail-copy';
    copy.textContent = '穿得越久越合脚。走完主线那一趟，它会停在 100%。';
    shoeRackDetail.append(copy);

    // 看不懂「皮鞋学习论」的，就在自己鞋底下读一遍。
    const theory = document.createElement('div');
    theory.className = 'shoe-detail-theory';
    const theoryTitle = document.createElement('p');
    theoryTitle.className = 'shoe-theory-title';
    theoryTitle.textContent = SHOE_THEORY.title;
    const theoryBody = document.createElement('p');
    theoryBody.textContent = SHOE_THEORY.body;
    theory.append(theoryTitle, theoryBody);
    shoeRackDetail.append(theory);

    if (Save.memorialLetterRead()) {
      const talk = document.createElement('button');
      talk.type = 'button';
      talk.className = 'secondary-button shoe-detail-talk';
      talk.textContent = '与皮鞋对话';
      talk.addEventListener('click', openShoeTalk);
      shoeRackDetail.append(talk);
    } else {
      const hint = document.createElement('p');
      hint.className = 'shoe-detail-hint';
      hint.textContent = '读完那封信，它会开口。';
      shoeRackDetail.append(hint);
    }
    if (scroll) shoeRackDetail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }

  if (entry.bio) {
    const bio = document.createElement('p');
    bio.className = 'shoe-detail-copy';
    bio.textContent = entry.bio;
    shoeRackDetail.append(bio);
  }
  if (entry.line) {
    const line = document.createElement('p');
    line.className = 'shoe-detail-line';
    line.textContent = entry.line;
    shoeRackDetail.append(line);
  }
  if (entry.blessing?.cn) {
    const blessing = document.createElement('p');
    blessing.className = 'shoe-detail-blessing';
    blessing.textContent = `它留给你的话：${entry.blessing.cn}`;
    shoeRackDetail.append(blessing);
  }
  if (scroll) shoeRackDetail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/** 魑魅魍魉里没有背包，名册面板顺带装糖袋。 */
function updateRosterCandy() {
  const pouch = game.getPouchState();
  rosterPouchTotal.textContent = String(pouch.total);
  fillPouchGrid(rosterPouchGrid, pouch);
}

/** 吃一颗糖；背包不关，吃完还能接着吃或直接按 Tab 回路上。 */
function eatPouchCandy(type) {
  const result = game.usePouchCandy(type);
  if (!result.ok) {
    showToast(result.message, 2400);
  } else {
    showToast(`吃下${result.def.name} · ${result.def.tag} ${result.def.duration} 秒。`, 2200);
  }
  updatePouch();
  updateRosterCandy();
  updateHud();
  return result;
}

function fillPouchGrid(grid, pouch = game.getPouchState()) {
  grid.replaceChildren();

  if (pouch.total <= 0) {
    const empty = document.createElement('p');
    empty.className = 'pouch-empty';
    empty.textContent =
      '糖袋是空的。去糖纸街敲一户人家的门：帮忙做完任务，或者抢了糖就跑，都能换到一颗。';
    grid.append(empty);
  }

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
    use.addEventListener('click', () => eatPouchCandy(type));

    card.append(top, title, tag, copy, use);
    grid.append(card);
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
    // 每一户的后巷都不一样：规则一样说，巷子的脾气跟着这一户补一句。
    const twist = house.raceTwist ? `（这一户的后巷：${house.raceTwist}）` : '';
    trickDoorTrick.textContent = `捣蛋 · 抢了就跑：夺过这颗${house.candyName}钻进后巷。跑到街尾的栅门、没被追上，拿到的一定是它；被追上，糖会被拿回去。${twist}`;
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
  // 名册就是魑魅魍魉的行囊：糖袋也放在这里，Tab 一个键就能吃到。
  updateRosterCandy();
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
      note.textContent = '还没遇见 · 到石鼓前按 Q';
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
    sacrificeCopy.textContent = `绷带把${context.name || '中招的人'}拉了回来，但仍要留下一人，他给队伍的加成也会失效。`;
  } else {
    sacrificeCopy.textContent =
      '瘴气冲散了队伍。留下一位同行者，他给队伍的加成也会失效。';
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

function updateWardrobe(hud) {
  wardrobeGrid.replaceChildren();

  const completeCount = hud.costumes.filter((costume) => costume.complete).length;
  const foundParts = hud.costumes.reduce((sum, costume) => sum + costume.foundCount, 0);
  const totalParts = hud.costumes.reduce((sum, costume) => sum + costume.difficulty, 0);
  wardrobeProgress.textContent =
    `已拼好 ${completeCount} / ${hud.costumes.length} 套 · 零件 ${foundParts} / ${totalParts}`;

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
      const nearer = hud.electron.model === 'coulomb' ? '，越近越强' : '';
      staticHudCharge.textContent =
        hud.charge > 0 ? 'q = +1' : hud.charge < 0 ? 'q = -1' : 'q = 0';
      staticHudDistance.textContent = `r = ${Math.round(hud.electron.distance)} px`;
      // 合力以体重为单位：×1.0 就是和重力一样大，×2.0 就是两倍。
      staticHudForce.textContent = !hud.electron.charged
        ? '—'
        : `${forceArrow(hud.electron.forceX, hud.electron.forceY, hud.electron.forceMag)} ×${(hud.electron.forceG ?? 0).toFixed(1)}`;
      staticHudStatus.textContent = !hud.electron.charged
        ? '电子带负电。未带电时，它碰不到你。'
        : hud.electron.airborne && hud.electron.forceG > 0.6
          ? '被电子拉住时，按 Q 放掉电荷。'
          : hud.charge > 0
            ? `异种电荷相吸：正电荷被电子吸引${nearer}。`
            : `同种电荷相斥：负电荷被电子排斥${nearer}。`;
    } else {
      staticHud.hidden = true;
    }
  }
}

// 任务面板上的「退出任务」：第一下只是把按钮点亮，3 秒内再点一下才真的走。
// 离开房间会丢掉屋里的进度，不该由一次手滑决定；换了任务就重新点亮。
let questExitArmUntil = 0;
let questExitTimer = 0;
let questExitBeat = '';

function resetQuestExitArm() {
  if (!questExitArmUntil) return;
  questExitArmUntil = 0;
  window.clearTimeout(questExitTimer);
  questExitTimer = 0;
  questExitButton.classList.remove('is-armed');
  questExitButton.textContent = '退出任务';
}

questExitButton.addEventListener('click', () => {
  if (performance.now() < questExitArmUntil) {
    resetQuestExitArm();
    game.exitTrickTask();
    return;
  }
  questExitArmUntil = performance.now() + 3200;
  questExitButton.classList.add('is-armed');
  questExitButton.textContent = '再点一次 · 退出任务';
  window.clearTimeout(questExitTimer);
  questExitTimer = window.setTimeout(resetQuestExitArm, 3200);
});

function updateQuest(hud) {
  const quest = hud.quest;
  const visible = Boolean(quest) && (hud.state === 'playing' || hud.state === 'paused');
  questTrack.hidden = !visible;
  gameScreen.classList.toggle('has-quest', visible);
  gameScreen.classList.toggle('is-alarm', Boolean(visible && quest?.alarm));

  if (!visible) {
    questTrack.classList.remove('is-alarm');
    questFoot.classList.remove('is-open');
    resetQuestExitArm();
    return;
  }

  // 糖纸街的任务都可以从这张小面板上退出；谜题面板有自己的「先离开」。
  const canExit = quest.kind === 'trickTask' || quest.kind === 'trickRace';
  const beat = canExit ? `${quest.kind}:${quest.text}` : '';
  if (beat !== questExitBeat) {
    questExitBeat = beat;
    resetQuestExitArm();
  }
  questFoot.classList.toggle('is-open', canExit);

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

/**
 * 开场车程：画面正上方的开场白与折叠的南瓜派教程。
 *
 * 中文一行、英文一行，字号比普通提示大；每一句换上来时淡入一次。
 * 教程默认折叠，点标题才展开；展开时 Game 会停住车程（提前下车后则停住独白），
 * 读完再继续。
 */
function updateOpening(hud) {
  const opening = hud.opening;
  if (!opening || hud.state !== 'playing') {
    openingCard.hidden = true;
    playerPanel.classList.remove('is-opening-hidden');
    return;
  }

  const beatKey = `${opening.index}:${opening.cn}`;
  if (openingCard.dataset.beat !== beatKey) {
    openingCard.dataset.beat = beatKey;
    openingCn.textContent = opening.cn;
    openingEn.textContent = opening.en;
    openingCn.hidden = !opening.cn;
    openingEn.hidden = !opening.en;
    openingCard.classList.remove('is-new-beat');
    if (opening.cn) {
      void openingCard.offsetWidth;
      openingCard.classList.add('is-new-beat');
    }
  }

  // 教程正文只写一次；标题、正文都直接读章节数据。教程只有中文原文。
  // 教程跟在第二句开场白后面出现，第一句时先不露面。
  const tutorial = opening.tutorial;
  const showTutorial = Boolean(tutorial && opening.tutorialVisible);
  openingTutorialToggle.hidden = !showTutorial;
  if (showTutorial) {
    openingTutorialTitle.textContent = tutorial.label ?? '南瓜派教程';
    openingTutorialCn.textContent = tutorial.cn ?? '';
  }

  const open = showTutorial && Boolean(opening.tutorialOpen);
  openingTutorial.hidden = !open;
  openingCard.classList.toggle('is-tutorial-open', open);
  openingTutorialToggle.setAttribute('aria-expanded', String(open));
  openingTutorialMark.textContent = open ? '收起' : '展开';
  openingSkip.hidden = !opening.canSkip;

  openingCard.hidden = false;
  // 开场白要占满画面上方：右上角的旅人手记先让开。
  playerPanel.classList.add('is-opening-hidden');
}

function setOpeningTutorialOpen(open) {
  openingTutorial.hidden = !open;
  openingCard.classList.toggle('is-tutorial-open', open);
  openingTutorialToggle.setAttribute('aria-expanded', String(open));
  openingTutorialMark.textContent = open ? '收起' : '展开';
  game.setOpeningTutorialOpen(open);
}

openingTutorialToggle.addEventListener('click', () => {
  const open = openingTutorialToggle.getAttribute('aria-expanded') !== 'true';
  setOpeningTutorialOpen(open);
});

signCard.addEventListener('click', (event) => {
  if (event.target.closest('#signClose') && game.state === 'sign') game.closeSign();
});

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
            ? '送派'
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
      setSecondaryLine(memorialBodyEn, memorial.bodyEn);
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
                  ['糖袋', String(hud.pouchTotal ?? 0)],
                  ['时间', formatTime(hud.time)],
                ];
    setCompactStats(compactStats);
  }

  sneakLegend.hidden = !(isSneak && hud.state === 'playing');

  updateFieldHud(hud);
  updateTutorial(hud);
  updateQuest(hud);
  updateActiveEffects(hud);
  updateOpening(hud);

  if (hud.state === 'playing' && hud.interaction) {
    interactionPrompt.hidden = false;
    interactionText.textContent = hud.interaction.text;
    interactionKey.hidden = !hud.interaction.key;
    interactionKey.textContent = hud.interaction.key ?? '';
    // 第三段里两个人各有自己的互动键，两个人身边都有南瓜时两个键一起显示。
    interactionKeyAlt.hidden = !hud.interaction.altKey;
    interactionKeyAlt.textContent = hud.interaction.altKey ?? '';
    interactionPrompt.classList.toggle('is-locked', !hud.interaction.available);
    // 手机上没有键盘：惊恐发作时右下角的「互动」变成「呼吸」，
    // 站在能走的门边时变成「离开」。
    const leavingTrick =
      hud.interaction.kind === 'trickExit' || hud.interaction.kind === 'trickRaceExit';
    setTouchInteractLabel(
      hud.interaction.kind === 'panic'
        ? '呼吸'
        : leavingTrick
          ? '离开'
          : hud.interaction.kind === 'sign'
            ? '路牌'
            : '互动',
    );
    // 手机上交给 CSS 把提示抬到虚拟按键上方，避免和拇指打架。
    if (hud.tutorial && !isMobile) {
      interactionPrompt.style.bottom = '136px';
    } else {
      interactionPrompt.style.removeProperty('bottom');
    }
  } else {
    interactionPrompt.hidden = true;
    setTouchInteractLabel('互动');
  }
}

function setTouchInteractLabel(label) {
  if (!touchInteractButton || touchInteractButton.textContent === label) return;
  touchInteractButton.textContent = label;
  touchInteractButton.setAttribute('aria-label', label);
}

function fillCompleteScreen(result) {
  const isMemorial = result.mode === 'memorial';
  const isParade = result.mode === 'parade';
  const isTrick = result.mode === 'trick';

  completeKicker.textContent = isParade
    ? `Hyakki yakō · ${result.track?.tier ?? '简单'} · ${result.track?.name ?? '提灯夜路'}`
    : isMemorial
      ? 'Sir Loved Pumpkin Pie'
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
  completeExitButton.textContent = result.mode === 'tutorial' ? '去给老师送南瓜派' : '退回目录';

  statBones.hidden = isMemorial || isParade || isTrick;
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
  if (state === 'title') {
    refreshContinue();
    // 主线第一次走完、回到目录：先把那封信递过来。
    maybeShowMemorialLetter();
  }
};

game.onNotice = (message, duration) => {
  showToast(message, duration);
};

game.onCandyReward = (reward) => {
  playCandyReward(reward);
};

game.onShoeReward = (reward) => {
  playShoeReward(reward);
};

game.onComplete = (result) => {
  fillCompleteScreen(result);
};

/** 教程没走完时，主线与两条附带的夜路都只回一句话。 */
function tutorialGateOpen() {
  if (Save.tutorialCleared(Save.current())) return true;
  showToast('先把新手教程走完——大约两分钟，主线才会开。', 3600);
  return false;
}

startTutorialButton.addEventListener('click', () => {
  enterFullscreen();
  game.startTutorial();
});

replayTutorialButton.addEventListener('click', () => {
  enterFullscreen();
  game.startTutorial();
});

startMemorialButton.addEventListener('click', () => {
  if (!tutorialGateOpen()) return;
  enterFullscreen();
  game.startMemorial();
});

startParadeButton.addEventListener('click', () => {
  if (!tutorialGateOpen()) return;
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
  if (!tutorialGateOpen()) return;
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

pauseHintButton.addEventListener('click', () => {
  openHintPanel();
});

pauseExitButton.addEventListener('click', () => {
  returnToDirectory();
});

screenMenuButton.addEventListener('click', () => {
  returnToDirectory();
});

screenHintButton.addEventListener('click', () => {
  openHintPanel();
});

closeHintButton.addEventListener('click', () => {
  game.closeHint();
});

closeBackpackButton.addEventListener('click', () => {
  game.closeBackpack();
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

replayButton.addEventListener('click', () => {
  // 结算页上的鞋可能还在飞，重开一局前先把它收掉。
  stopShoeReward();
  if (game.mode === 'memorial') game.startMemorial();
  else if (game.mode === 'parade') game.startParade(game.getParadeTrackId());
  else if (game.mode === 'trick') game.startTrickOrTreat();
  else game.restart();
});

completeExitButton.addEventListener('click', () => {
  if (game.mode === 'tutorial') game.startMemorial();
  else game.returnToTitle();
});

// 老师的信：先问打开还是稍后再看；读完之后可以叫鞋说话。
openLetterButton.addEventListener('click', openMemorialLetter);
laterLetterButton.addEventListener('click', postponeMemorialLetter);
talkToShoeButton.addEventListener('click', openShoeTalk);
closeLetterButton.addEventListener('click', closeMemorialLetter);
startLetterButton.addEventListener('click', openLetterFromBag);

// 与皮鞋对话：收起、再听一遍、翻出皮鞋学习论。
closeShoeTalkButton.addEventListener('click', closeShoeTalk);
shoeTalkDoneButton.addEventListener('click', closeShoeTalk);
shoeTalkReplayButton.addEventListener('click', openShoeTalk);
shoeTheoryButton.addEventListener('click', toggleShoeTheory);

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

/** Tab 和触屏「背包」共用：背包和名册里都带着糖袋，所有线路同一个键。 */
function toggleBagPanel() {
  if (game.state === 'inventory') {
    game.closeBackpack();
    return;
  }
  if (game.state === 'roster') {
    game.closeRoster();
    return;
  }
  if (game.state !== 'playing') return;
  // 魑魅魍魉里打开的是队伍名册：谁跟着你、谁还没遇到；糖袋附在名册下面。
  if (game.mode === 'parade') {
    game.openRoster();
    updateRoster();
    return;
  }
  // 糖纸街的街面和追思前几段没有完整行囊，背包里只留糖袋。
  game.openBackpack();
  updateInventory();
}

/** H / 左上角「提示」：打开这一关的提示面板，再按一次关闭。 */
function openHintPanel() {
  if (game.state === 'hint') {
    game.closeHint();
    return;
  }
  if (!game.openHint()) return;
  updateHint();
}

function updateHint() {
  const content = getHintContent(game);
  if (!content) return;
  hintTitle.textContent = content.title ?? '提示';
  hintStep.textContent = content.stepLabel ?? '';
  hintObjective.textContent = content.objective ?? '';

  hintList.replaceChildren();
  const hints = content.hints?.length
    ? [...content.hints]
    : ['这一关已经走到最后，继续往右就是出口。'];
  // 提示是按键盘写的；手机上先说清楚「互动」= E / Q / X / 空格。
  if (isMobile) {
    hints.push('手机上的「互动」就是 E / Q / X / 空格：抱起、摸装置、敲门、呼吸、离开都按它。');
  }
  hints.forEach((text, index) => {
    const item = document.createElement('li');
    const number = document.createElement('b');
    number.textContent = String(index + 1);
    number.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.textContent = text;
    item.append(number, copy);
    hintList.append(item);
  });

  hintKeys.replaceChildren();
  // 手机上列虚拟按键，不列键盘：这一局根本按不到 E / Q / Tab。
  for (const key of isMobile ? CONTROL_KEYS_MOBILE : CONTROL_KEYS) {
    const entry = document.createElement('span');
    entry.textContent = key;
    hintKeys.append(entry);
  }
}

/** 从任何一局里退回起始页（目录）。中途退出会先落盘，回来还能继续。 */
function returnToDirectory() {
  if (game.state === 'title') return;
  game.returnToTitle();
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

  // 老师的信盖在目录上：没拆开时 Esc 等于「稍后再看」；拆开后 Esc 收起。
  if (!letterScreen.hidden) {
    if (event.code === 'Escape') {
      event.preventDefault();
      closeMemorialLetter();
    }
    return;
  }

  // 与皮鞋对话盖在最上面：Esc 收起，其它键交给聚焦的按钮。
  if (!shoeTalkScreen.hidden) {
    if (event.code === 'Escape' || event.code === 'KeyE') {
      event.preventDefault();
      closeShoeTalk();
    }
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

  // 路牌：V 摊开 / 收起；摊开时玩法停住，只读这一句。
  if (game.state === 'sign') {
    if (
      event.code === 'KeyV' ||
      event.code === 'Escape' ||
      event.code === 'KeyE' ||
      event.code === 'Space' ||
      event.code === 'Enter'
    ) {
      event.preventDefault();
      game.closeSign();
    }
    return;
  }

  if (event.code === 'KeyV' && game.state === 'playing' && game.mode === 'memorial') {
    event.preventDefault();
    game.toggleSign();
    return;
  }

  // H：看这一关的提示；提示面板打开时再按一次关闭。
  if (event.code === 'KeyH') {
    event.preventDefault();
    openHintPanel();
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

  // 糖纸街副本：离开房间 / 掉头回街只认 X（按两下），E 不再负责走人。
  if (event.code === 'KeyX' && game.state === 'playing' && game.mode === 'trick') {
    event.preventDefault();
    game.requestTrickExit();
    return;
  }

  // 惊恐发作时，空格是专门留给呼吸的键：按一下或按住都认。
  if (event.code === 'Space' && game.state === 'playing' && game.isPanicActive()) {
    event.preventDefault();
    game.handlePanicPress();
    return;
  }

  // E：只抱起 / 抛出身边的东西，不再兼任装置、呼吸或离开。
  if (event.code === 'KeyE' && game.state === 'playing') {
    event.preventDefault();
    // 潜行段里 E 只属于你；回音用 / 键，两个人不再抢同一个互动键。
    game.interact(game.isSneakStage() ? game.player : undefined);
    return;
  }

  // Q：摸身边的装置——石鼓、铜球、南瓜车、糖门，与抱南瓜分开。
  if (event.code === 'KeyQ' && game.state === 'playing') {
    event.preventDefault();
    game.useDevice();
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

  // 背包 / 名册里的数字键：1–4 先归骨槽，没有骨槽可放时用来吃糖。
  if (
    (game.state === 'inventory' || game.state === 'roster') &&
    /^Digit[0-9]$/.test(event.code)
  ) {
    const index = event.code === 'Digit0' ? 9 : Number(event.code.slice(-1)) - 1;
    if (game.state === 'inventory' && index < PLACE_ORDER.length) {
      const hud = game.getHudState();
      const type = PLACE_ORDER[index];
      if (hud.placement && type) {
        event.preventDefault();
        handlePlacement(type);
        return;
      }
    }
    const type = BUFF_CANDY_TYPES[index];
    if (type) {
      event.preventDefault();
      eatPouchCandy(type);
    }
    return;
  }

  if (event.code === 'Enter') {
    if (targetIsButton) return;
    if (game.state === 'title') {
      event.preventDefault();
      // 回车等于点起始页最上面那个亮着的按钮：先接着上次走，
      // 没有存档就先走教程，教程走完了才进主线。
      if (!continueButton.hidden) {
        continueButton.click();
      } else if (Save.tutorialCleared(Save.current())) {
        enterFullscreen();
        game.startMemorial();
      } else {
        enterFullscreen();
        game.startTutorial();
      }
    } else if (game.state === 'paused') {
      event.preventDefault();
      game.resume();
    } else if (game.state === 'inventory') {
      event.preventDefault();
      game.closeBackpack();
    } else if (game.state === 'hint') {
      event.preventDefault();
      game.closeHint();
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
    } else if (game.state === 'hint') {
      event.preventDefault();
      game.closeHint();
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
// 刷新页面时也把还没做选择的那封信递上来；做过选择就不会再弹。
maybeShowMemorialLetter();
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
