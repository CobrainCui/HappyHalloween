import { Game } from './game.js';
import { getItemDef } from './collectibles.js';
import { CANDY_EFFECTS, CANDY_EFFECT_TYPES } from './candyEffects.js';
import { PARADE_ROUTE, PARADE_TRACKS } from './parade.js';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#startScreen');
const trackScreen = document.querySelector('#trackScreen');
const pauseScreen = document.querySelector('#pauseScreen');
const backpackScreen = document.querySelector('#backpackScreen');
const rosterScreen = document.querySelector('#rosterScreen');
const sacrificeScreen = document.querySelector('#sacrificeScreen');
const defeatScreen = document.querySelector('#defeatScreen');
const completeScreen = document.querySelector('#completeScreen');

const startTutorialButton = document.querySelector('#startTutorialButton');
const startMemorialButton = document.querySelector('#startMemorialButton');
const startParadeButton = document.querySelector('#startParadeButton');
const startSneakButton = document.querySelector('#startSneakButton');
const closeTrackButton = document.querySelector('#closeTrackButton');
const trackGrid = document.querySelector('#trackGrid');
const resumeButton = document.querySelector('#resumeButton');
const pauseExitButton = document.querySelector('#pauseExitButton');
const defeatRestartButton = document.querySelector('#defeatRestartButton');
const defeatExitButton = document.querySelector('#defeatExitButton');
const closeBackpackButton = document.querySelector('#closeBackpackButton');
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
const panelGrid = document.querySelector('#panelGrid');
const memorialInfo = document.querySelector('#memorialInfo');
const memorialCondition = document.querySelector('#memorialCondition');
const memorialBody = document.querySelector('#memorialBody');
const memorialLights = document.querySelector('#memorialLights');
const paradeInfo = document.querySelector('#paradeInfo');
const paradeTrackName = document.querySelector('#paradeTrackName');
const paradeTrackTier = document.querySelector('#paradeTrackTier');
const paradeCount = document.querySelector('#paradeCount');
const paradeGate = document.querySelector('#paradeGate');
const paradeBody = document.querySelector('#paradeBody');
const paradeScatters = document.querySelector('#paradeScatters');
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
const statParty = document.querySelector('#statParty');
const statScatters = document.querySelector('#statScatters');
const statLost = document.querySelector('#statLost');
const statSpotted = document.querySelector('#statSpotted');
const statFalls = document.querySelector('#statFalls');
const statFit = document.querySelector('#statFit');
const completeMemories = document.querySelector('#completeMemories');
const completeStages = document.querySelector('#completeStages');
const completeParty = document.querySelector('#completeParty');
const completeScatters = document.querySelector('#completeScatters');
const completeLost = document.querySelector('#completeLost');
const completeSpotted = document.querySelector('#completeSpotted');
const completeFalls = document.querySelector('#completeFalls');

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

const PLACE_ORDER = ['rib', 'femur', 'skull', 'rightHand'];

const game = new Game(canvas);
let toastTimer = 0;
let tutorialPipSignature = '';

// 右上角面板的三种形态：完整 → 简省信息 → 只剩一枚开关。
const PANEL_COLLAPSE_STATES = ['full', 'compact', 'switch'];
const PANEL_COLLAPSE_META = {
  full: { mark: '简', label: '', action: '折叠成简省信息版' },
  compact: { mark: '收', label: '', action: '收成开关' },
  switch: { mark: '▸', label: '旅人手记', action: '展开旅人手记' },
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

setPanelCollapse('full');

panelCollapseButton.addEventListener('click', (event) => {
  const index = PANEL_COLLAPSE_STATES.indexOf(panelCollapse);
  setPanelCollapse(PANEL_COLLAPSE_STATES[(index + 1) % PANEL_COLLAPSE_STATES.length]);
  // 鼠标点完把焦点还给游戏；键盘（detail 为 0）仍留在按钮上。
  if (event.detail > 0) panelCollapseButton.blur();
});

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__pumpkinGame = game;
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
  if (fit < 0.62) return '渐渐合脚';
  if (fit < 0.8) return '很合脚';
  return '旧友般合脚';
}

function showToast(message, duration = 2000) {
  if (!message) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, duration);
}

function hideAllOverlays() {
  for (const overlay of [
    startScreen,
    trackScreen,
    pauseScreen,
    backpackScreen,
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

  // 名册、送别和结算面板会把路让出来；飘在上面的提示先收掉，别盖住标题。
  if (
    state === 'roster' ||
    state === 'complete' ||
    state === 'sacrifice' ||
    state === 'defeat'
  ) {
    toast.classList.remove('is-visible');
  }

  if (state === 'title') startScreen.hidden = false;
  else if (state === 'tracks') trackScreen.hidden = false;
  else if (state === 'paused') pauseScreen.hidden = false;
  else if (state === 'inventory') backpackScreen.hidden = false;
  else if (state === 'roster') rosterScreen.hidden = false;
  else if (state === 'sacrifice') {
    sacrificeScreen.hidden = false;
    updateSacrifice();
  } else if (state === 'defeat') defeatScreen.hidden = false;
  else if (state === 'complete') completeScreen.hidden = false;

  const inRun =
    state === 'playing' ||
    state === 'paused' ||
    state === 'inventory' ||
    state === 'roster' ||
    state === 'sacrifice';
  playerPanel.hidden = !inRun;

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
    topStatusText.textContent = '百鬼夜行 · 选一条夜路';
  } else if (state === 'sacrifice') {
    window.setTimeout(() => {
      sacrificeGrid.querySelector('button')?.focus({ preventScroll: true });
    }, 0);
    topStatusText.textContent = '无灯长夜 · 从名册上留下一个名字';
  } else if (state === 'defeat') {
    window.setTimeout(() => defeatRestartButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent = '无灯长夜 · 灯火孤单';
  } else if (state === 'paused') {
    window.setTimeout(() => resumeButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent = '旅程暂停 · 灯还亮着';
  } else if (state === 'inventory') {
    window.setTimeout(() => closeBackpackButton.focus({ preventScroll: true }), 0);
    updateInventory();
    topStatusText.textContent = '背包 · 看看捡来的骨头';
  } else if (state === 'roster') {
    window.setTimeout(() => closeRosterButton.focus({ preventScroll: true }), 0);
    updateRoster();
    topStatusText.textContent = '百鬼名册 · 队伍里的脚';
  } else if (state === 'title') {
    topStatusText.textContent = '教程 · 追思小径 · 百鬼夜行 · 鬼鬼祟祟';
  } else if (state === 'complete') {
    window.setTimeout(() => replayButton.focus({ preventScroll: true }), 0);
    topStatusText.textContent =
      game.mode === 'tutorial'
        ? '教程完成'
        : game.mode === 'memorial'
          ? '追思小径 · 五盏灯都点上了'
          : game.mode === 'parade'
            ? '百鬼夜行 · 百鬼门开了'
            : game.mode === 'sneak'
              ? '鬼鬼祟祟 · 屋顶到了'
              : '电磁长夜 · 段落完成';
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
    empty.textContent = '还没有捡到骨头。路上那些发光的白色碎片在等你。';
    inventoryList.append(empty);
  }

  updateCandyTypes(hud);
  updateCandyCatalogue(hud);
  updateWardrobe(hud);
  updatePlacementPanel(hud);
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
      note.textContent = '还没遇见 · 石鼓前按 E';
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
    sacrificeCopy.textContent = `绷带把${context.name || '中招的人'}拉了回来，但仍要留下一人；支援也会失效。`;
  } else {
    sacrificeCopy.textContent =
      '瘴气冲散了队伍。留下一人；支援也会失效。';
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
    empty.textContent = '罐子还是空的。路上那些彩色的糖纸在等你。';
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
    empty.textContent = '背包里没有可以放入的东西。先去附近找找。';
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
    const chip = document.createElement('span');
    chip.className = 'effect-chip';
    chip.style.setProperty('--accent', effect.accent);
    chip.style.setProperty('--remain', `${Math.round(effect.ratio * 100)}%`);
    chip.title = `${effect.label} · ${effect.disorder}（${effect.icdName}）\n${effect.summary}`;

    const dot = document.createElement('i');
    dot.className = 'effect-dot';

    const name = document.createElement('span');
    name.className = 'effect-name';
    name.textContent = `${effect.disorder} ${effect.code}${
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
  const isSneak = hud.mode === 'sneak';

  if (
    hud.state === 'playing' ||
    hud.state === 'paused' ||
    hud.state === 'inventory' ||
    hud.state === 'roster' ||
    hud.state === 'sacrifice'
  ) {
    const percent = Math.round(hud.progress * 100);
    panelMode.textContent =
      hud.mode === 'tutorial'
        ? '教程'
        : isMemorial
          ? '追思'
          : isParade
            ? '百鬼'
            : isSneak
              ? '双人'
              : '旅程';
    panelTheme.textContent = isSneak && hud.sneak
      ? `第 ${hud.sneak.stage}/${hud.sneak.total} 段 · ${hud.sneak.name}`
      : isParade && hud.parade
        ? `${hud.parade.stageLabel} · ${hud.parade.name} · ${hud.parade.title}`
        : isMemorial && hud.memorial
          ? `${hud.memorial.stageLabel} · ${hud.memorial.patient}`
          : hud.themeName;
    panelProgressText.textContent = `${percent}%`;
    panelProgressBar.style.width = `${percent}%`;
    panelBones.textContent = `${hud.bones}/${hud.totalBones}`;
    panelHands.textContent = String(hud.rightHandBones);
    panelCandies.textContent = `${hud.candies}/${hud.totalCandies}`;
    const equipped = hud.costumes.find((costume) => costume.equipped);
    panelCostume.textContent = equipped ? equipped.name : '未换装';
    panelTime.textContent = formatTime(hud.time);
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
    panelGrid.hidden = isMemorial || isParade || isSneak;
    memorialInfo.hidden = !isMemorial;
    paradeInfo.hidden = !isParade;
    sneakInfo.hidden = !isSneak;

    if (isMemorial && hud.memorial) {
      const memorial = hud.memorial;
      memorialCondition.textContent = `${memorial.code} · ${memorial.disorder}`;
      memorialBody.textContent = memorial.body;
      memorialLights.textContent = `${memorial.memories}/${memorial.totalMemories}`;
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
        ? `潜行 · 第 ${hud.sneak.stage}/${hud.sneak.total} 段 · ${hud.sneak.name}`
        : `目标 · ${hud.objective}`;
    }

    // 简省版只留这一局最要紧的两三个数：灯、队伍、暴露，或背包。
    const compactStats =
      isMemorial && hud.memorial
        ? [
            ['这一段', hud.memorial.patient],
            ['灯', `${hud.memorial.memories}/${hud.memorial.totalMemories}`],
          ]
        : isParade && hud.parade
          ? [
              ['同行', `${hud.parade.count}/${hud.parade.totalMembers}`],
              ['到门', `${hud.parade.gateCount}/${hud.parade.gateTotal}`],
              hud.parade.track?.lossRule === 'sacrifice'
                ? ['留在夜里', String(hud.parade.lost?.length ?? 0)]
                : ['被冲散', String(hud.parade.scatters)],
            ]
          : isSneak && hud.sneak
            ? [
                ['被发现', String(hud.sneak.spotted)],
                ['鬼鬼', hud.sneak.states?.[0] ?? '安静'],
                ['祟祟', hud.sneak.states?.[1] ?? '安静'],
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
    // 鬼鬼祟祟里两个人各有自己的互动键，两个人身边都有南瓜时两个键一起显示。
    interactionKeyAlt.hidden = !hud.interaction.altKey;
    interactionKeyAlt.textContent = hud.interaction.altKey ?? '';
    interactionPrompt.classList.toggle('is-locked', !hud.interaction.available);
    if (hud.tutorial) {
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
  const isSneak = result.mode === 'sneak';

  completeKicker.textContent = isSneak
    ? 'Sneaky business · two ghosts'
    : isParade
    ? `Hyakki yakō · ${result.track?.tier ?? '简单'} · ${result.track?.name ?? '提灯夜路'}`
    : isMemorial
      ? 'All Souls’ night · five lights'
      : result.mode === 'tutorial'
        ? 'Tutorial complete'
        : 'Electromagnetic night · complete';
  completeTitle.textContent = isSneak
    ? '屋顶到了'
    : isParade
    ? '百鬼门开了'
    : isMemorial
      ? '墓园到了'
      : result.mode === 'tutorial'
        ? '小径走完了'
        : `${result.themeName} · 段落完成`;
  completeCopy.textContent = isSneak
    ? result.finale ??
      '第十三声钟响时，两只小鬼并排坐在屋脊上。老守夜人把最后一根引线点着，回头朝空荡荡的屋脊看了一眼，像是早就知道那儿坐着谁。'
    : isParade
    ? result.finale ?? PARADE_ROUTE.finale
    : isMemorial
      ? '五段路都走完了。五个人，五盏灯；墓园最里面，还有留给家里人的第六盏。'
      : result.mode === 'tutorial'
        ? '下一步，去追思小径。五个人，五盏灯；最后一程会沉入地下，走进电磁长夜。'
        : '你穿过了电子厅和两口熔岩井。长夜仍在继续，但这一段已经走完。';
  completeTime.textContent = formatTime(result.time);
  completeBones.textContent = `${result.bones}/${result.totalBones}`;
  completeCandies.textContent = `${result.candies}/${result.totalCandies}`;
  completeHands.textContent = String(result.rightHandBones);
  completeCostumes.textContent = `${result.costumes}/${result.totalCostumes}`;
  completeMemories.textContent = `${result.memories}/${result.totalMemories}`;
  completeStages.textContent = `${result.stage}/${result.stages}`;
  completeParty.textContent = `${result.partySize ?? 0}/${result.totalParty ?? 0}`;
  completeScatters.textContent = String(result.scatters ?? 0);
  completeLost.textContent = String(result.lostCount ?? 0);
  completeSpotted.textContent = String(result.spotted ?? 0);
  completeFalls.textContent = String(result.falls ?? 0);
  completeFit.textContent = formatPercent(result.shoeFit);
  completeExitButton.textContent = result.mode === 'tutorial' ? '进入追思小径' : '回到起始页';

  statBones.hidden = isMemorial || isParade || isSneak;
  statCandies.hidden = isMemorial || isParade || isSneak;
  statHands.hidden = isMemorial || isParade || isSneak;
  statCostumes.hidden = isMemorial || isParade || isSneak;
  statMemories.hidden = !isMemorial;
  statStages.hidden = !isMemorial && !isSneak;
  statParty.hidden = !isParade;
  statScatters.hidden = !isParade;
  statLost.hidden = !isParade || (result.lostCount ?? 0) === 0;
  statSpotted.hidden = !isSneak;
  statFalls.hidden = !isSneak;
  statFit.hidden = !isMemorial;
  replayButton.textContent = isMemorial || isParade
    ? '从第一段再走一遍'
    : isSneak
      ? '从第一段再潜行'
      : '再走一遍';
}

game.onStateChange = (state) => {
  syncOverlays(state);
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

startSneakButton.addEventListener('click', () => {
  enterFullscreen();
  game.startSneak();
});

resumeButton.addEventListener('click', () => {
  game.resume();
});

pauseExitButton.addEventListener('click', () => {
  game.returnToTitle();
});

closeBackpackButton.addEventListener('click', () => {
  game.closeBackpack();
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
  else if (game.mode === 'sneak') game.startSneak();
  else game.restart();
});

completeExitButton.addEventListener('click', () => {
  if (game.mode === 'tutorial') game.startMemorial();
  else game.returnToTitle();
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
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
    // 浏览器不给全屏（比如在受限的 iframe 里）就留在铺满窗口的布局里。
  });
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
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

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.repeat) return;

  if (event.code === 'KeyF') {
    event.preventDefault();
    toggleFullscreen();
    return;
  }

  const targetIsButton =
    event.target instanceof HTMLElement &&
    (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT');

  if (event.code === 'Tab') {
    // 双人潜行没有背包：两只鬼只带了一胆子。
    if (game.mode === 'sneak') {
      event.preventDefault();
      if (game.state === 'playing') {
        showToast('潜行时没有背包。两只鬼只带了一胆子。', 1900);
      }
      return;
    }
    // 百鬼夜行里 Tab 打开的是队伍名册：谁跟着你、谁还没遇到。
    if (game.mode === 'parade') {
      event.preventDefault();
      if (game.state === 'playing') {
        game.openRoster();
        updateRoster();
      } else if (game.state === 'roster') {
        game.closeRoster();
      }
      return;
    }
    // 前四段手里只有灯；第五段进入电磁长夜，背包与骨槽重新可用。
    if (game.mode === 'memorial' && game.level.stage !== 5) {
      event.preventDefault();
      if (game.state === 'playing') showToast('追思路上不用背包，手里只有灯。', 1800);
      return;
    }
    if (game.state === 'playing') {
      event.preventDefault();
      game.openBackpack();
      updateInventory();
    } else if (game.state === 'inventory') {
      event.preventDefault();
      game.closeBackpack();
    }
    return;
  }

  if (event.code === 'KeyE' && game.state === 'playing') {
    event.preventDefault();
    // 鬼鬼祟祟里 E 只属于鬼鬼；祟祟用 / 键，两个人不再抢同一个互动键。
    game.interact(game.mode === 'sneak' ? game.player : undefined);
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

  if (event.code === 'Slash' && game.mode === 'sneak' && game.state === 'playing') {
    event.preventDefault();
    game.interact(game.partner);
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
    game.restart();
    showToast(
      game.mode === 'memorial'
        ? '已回到这一段的起点 · 灯还亮着'
        : game.mode === 'parade'
          ? game.getParadeTrackId() === 'hard'
            ? '已回到本段起点 · 留下的人不会回来'
            : '已回到这一段的起点 · 之前同行的客人还在'
          : game.mode === 'sneak'
            ? '已回到这一段起点 · 被发现次数也退回去了'
            : '已回到本段起点 · 南瓜还在原地',
    );
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

renderTracks();
syncOverlays(game.state);
syncFullscreenUi();
window.setInterval(updateHud, 100);
