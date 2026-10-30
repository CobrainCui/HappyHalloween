import { AudioKit } from './audio.js';
import {
  CANDY_EFFECTS,
  getCandyEffect,
  isBuffCandy,
  neutralEffectMods,
  randomBetween,
} from './candyEffects.js';
import { BUFF_CANDIES } from './buffCandies.js';
import { CandyPouch } from './candyPouch.js';
import {
  CANDY_TYPES,
  COSTUME_BY_ID,
  COSTUMES,
  difficultyLabel,
  getItemDef,
  getRarity,
} from './collectibles.js';
import { FIELD, PHYSICS, STEP, VIEW } from './config.js';
import { MemorialEnding } from './ending.js';
import { Input } from './input.js';
import { Level } from './level.js';
import {
  TRICK_HOUSES,
  TRICK_RACE,
  TRICK_ROUTE,
  getTrickHouse,
  getTrickHouseByRoom,
} from './trickOrTreat.js';
import {
  getPuzzleProgress,
  getTrickPuzzle,
  isValidPuzzleState,
  normalizePuzzleState,
} from './trickPuzzles.js';
import {
  MEMORIAL_CHAPTERS,
  MEMORIAL_ROUTE,
  MEMORIAL_TOTAL_MEMORIES,
  applyMemorialMods,
  getMemorialChapter,
} from './memorial.js';
import {
  PARADE_COMBOS,
  PARADE_ROUTE,
  PARADE_TOTAL_YOKAI,
  YOKAI,
  YOKAI_ORDER,
  getParadeChapter,
  getParadeTrack,
  getYokai,
} from './parade.js';
import { getSetGateState, updateSetGates } from './setTheory.js';
import { ShoeFollowers, shoeRewardFor } from './shoeFollowers.js';
import {
  createSneakInput,
  createSneakState,
  getSneakHud,
  initSneakStage,
  respawnSneakPair,
  rewindSneakStageScore,
  updateSneak,
  updateSneakCamera,
} from './sneakMode.js';
import { ParticleSystem } from './particles.js';
import { Player } from './player.js';
import { PumpkinWorld, pumpkinLabel } from './pumpkins.js';
import { Renderer } from './renderer.js';
import {
  AUTOSAVE_SECONDS,
  apply as applySaveData,
  applyWallet,
  current as currentSave,
  flush as flushSave,
  memorialCleared,
  save as saveGame,
} from './save.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const TRICK_GROUND_Y = 16 * VIEW.TILE;

function formatDirectionE(dir) {
  return dir === 'up' ? '↑' : '↓';
}

function formatDirectionB(dir) {
  return dir === 'in' ? '⊗' : '⊙';
}

/** 魑魅魍魉的队伍支援 / 组合技：只有同行者在队里时才生效。 */
function getParadeSupports(members) {
  const ids = new Set(members.map((member) => member.yokaiId));
  const list = [];
  if (ids.has('lantern')) list.push({ label: '灯火', detail: '队伍的头' });
  if (ids.has('franken')) list.push({ label: '开路', detail: '裂石壁整列撞塌' });
  if (ids.has('sheet')) list.push({ label: '轻风', detail: '全队下落更轻' });
  if (ids.has('swamp')) list.push({ label: '泡泡护航', detail: '全队划水省力' });
  if (ids.has('bat')) list.push({ label: '全队二段跳', detail: '空中再按 ↑' });
  if (ids.has('mummy')) list.push({ label: '绷带兜底', detail: '每落脚点救一人' });
  if (ids.has('boneA') && ids.has('boneB')) list.push({ label: '双子步频', detail: '全队移速 +6%' });
  if (ids.has('wolf')) list.push({ label: '双击冲刺', detail: '地面双击 ←/→' });
  if (ids.has('witch')) list.push({ label: '全队滑翔', detail: '下落按住 ↑' });
  if (ids.has('cat')) list.push({ label: '猫步蹬墙', detail: '贴墙时再按 ↑' });
  for (const combo of PARADE_COMBOS) {
    if (combo.members.every((id) => ids.has(id))) {
      list.push({ label: combo.name, detail: combo.detail, combo: true });
    }
  }
  return list;
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input();
    this.input.enabled = false;
    this.audio = new AudioKit();
    this.particles = new ParticleSystem();
    this.level = new Level('tutorial');
    this.pumpkins = new PumpkinWorld(this.level);
    this.bindPumpkinAudio();
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    // 第三段的第二名玩家「回音」。其它线路里只创建、不更新、不绘制。
    this.partner = new Player(
      this.level.spawn2?.x ?? this.level.spawn.x + 24,
      this.level.spawn2?.y ?? this.level.spawn.y,
    );
    this.sneakInput = createSneakInput(this.input);
    // 普通线路里 members 只有主角；魑魅魍魉会把同行者陆续加进来。
    this.companions = [];
    this.members = [this.player];
    // 魑魅魍魉的队伍支援：同伴会把自己的本事分给整支队伍。
    this.teamSupport = null;
    // 镜头倍率（手机端放大画面用），桌面端是 1。
    this.cameraZoom = 1;
    // 镜头在最右端额外往右滚的比例（手机端给右手按键留白），桌面端是 0。
    this.cameraRightPadding = 0;
    this.renderer = new Renderer(canvas, this.level, this.particles);

    this.state = 'title';
    this.mode = 'tutorial';
    // 魑魅魍魉的三条赛道：下一次开局用哪一条。
    this.pendingParadeTrack = 'easy';
    this.camera = { x: 0, y: 0 };
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.introFlash = 0;
    this.damageFlash = 0;
    this.respawnGrace = 0;
    this.shoeDistance = 0;
    // 主线走完过一次之后，皮鞋就永远合脚：之后每一趟都从 100% 起。
    this.shoeFitComplete = false;
    // 每走过一段，那一段的人留下的鞋就跟在身后。只有追思小径用得上。
    this.shoeFollowers = new ShoeFollowers();
    // 第一次真正加载地图后才允许写存档，避免起始页的空白教程档盖掉真进度。
    this.started = false;
    this.saveClock = 0;
    // 跨线路保存的增益糖。只存数量，状态仍落在每一局的 session.candyEffects。
    // 糖装在背包的糖袋里，按 Tab 打开背包就能吃。
    this.pouch = new CandyPouch();
    // 提示面板同理：从暂停打开，关掉后回到暂停。
    this.hintReturnState = 'playing';
    // 走到终点门时先停一小会儿，让穿门的光效完整放完再换图。
    this.doorEntry = null;
    // 送完最后一盒南瓜派后的碑前长镜头；只在结尾这一段存在。
    this.ending = null;
    // 后巷竞速的追兵状态（只在捣蛋后的那一张图里存在）。
    this.race = null;
    // 糖纸街的离开键：第一下只把门推开一条缝，几秒内再按一下才真的走。
    this.trickExitArm = 0;
    this.trickExitArmDevice = null;

    this.onStateChange = null;
    this.onNotice = null;
    this.onComplete = null;
    // 糖进袋的那一刻：画面外由 main.js 播「拿到一颗糖」的动效。
    this.onCandyReward = null;
    // 走完一段、那双鞋跟到身后时：由 main.js 播「拿到一双鞋」的动效。
    this.onShoeReward = null;

    this.activePickups = this.clonePickups(this.level);
    this.session = this.createSession(this.level.id, 'tutorial');

    this.bindPlayerEvents();
    this.bindPartnerEvents();
    this.updateCamera(STEP, true);

    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
  }

  createSession(themeId, mode) {
    return {
      themeId,
      mode,
      time: 0,
      distance: 0,
      bones: 0,
      rightHandBones: 0,
      boneTypes: { rib: 0, femur: 0, skull: 0, leftHand: 0, rightHand: 0 },
      // 本局见过的东西。零件被放进骨槽也不会从「见过」里扣除。
      collected: {},
      candies: 0,
      candyTypes: Object.fromEntries(CANDY_TYPES.map((type) => [type, 0])),
      completedCostumes: [],
      equippedCostume: null,
      checkpoint: { x: this.level.spawn.x, y: this.level.spawn.y },
      checkpointIndex: -1,
      completed: false,
      skippedTutorial: false,
      backpackOpened: false,
      tutorialStep: 0,
      tutorialStepCooldown: 0,
      jumpCount: 0,
      manualJumpCount: 0,
      dropThroughs: 0,
      // 只统计「这一局亲手捡到的」，教程步骤用它判断，
      // 不会被存档带回来的行囊直接跳过。
      bonesPicked: 0,
      candiesPicked: 0,
      seenFields: new Set(),
      // 糖果状态：type -> { remaining, duration }。不同糖果同时存在时效果叠加。
      candyEffects: {},
      // 各状态的触发计时器。
      maniaNextJump: 0,
      panicNextDash: 0,
      panicGrace: 0,
      adhdNextLapse: 0,
      adhdLapse: 0,
      ticNext: 0,
      sleepNext: 0,
      sleepRemaining: 0,
      sleeping: false,
      compulsionPending: false,
      compulsionDelay: 0,
      // 「四盏灯」追思线路：每段路一个病人，行为各有一套计时。
      routeStage: this.level.stage ?? 0,
      totalMemories: MEMORIAL_TOTAL_MEMORIES,
      seenMemories: new Set(),
      litLights: new Set(),
      memorialNext: 0,
      memorialTunnel: 0,
      memorialPending: null,
      // 第二段惊恐障碍：预兆 / 呼吸小游戏 / 平复后的定神期。
      memorialPanic: null,
      memorialCalm: 0,
      // 第四段恶劣心境：重量、暂时抬不起脚、旧灯带来的「透亮」。
      memorialSlump: 0,
      memorialLift: 0,
      memorialDepth: 0,
      solacesLit: new Set(),
      // 已经跟到身后的鞋：每双只在第一次跟上来时提一句。
      shoeNotices: new Set(),
      // 第一段南瓜车：入场动画、检查任务与超时抓狂状态。
      carriageIntro: 0,
      carriageIntroTotal: 0,
      carriageBeatIndex: 0,
      carriageRolling: false,
      carriageDustTimer: 0,
      carriageIntroSeen: false,
      carriageRiding: false,
      // 提前按 Q 下车后，车程结束但开场白还要接着播完。
      carriageIntroSkipped: false,
      carriageX: 0,
      carriageQuest: null,
      carriageAlarm: false,
      carriageHopTimer: 0,
      // 开场的南瓜派教程默认折叠；展开时开场车程停住，等玩家读完再走。
      carriageTutorialOpen: false,
      // 第一段的故事路牌：读过哪几块、正在读哪一块。
      readSigns: new Set(),
      readingSign: null,
      // 第一段尽头挡住出口的南瓜高墙：只在第一次走近时提示一次。
      pumpkinHintShown: false,
      // 「魑魅魍魉」：被瘴气冲散的次数，以及最近一次撞碎石壁的时间（防重复提示）。
      paradeStage: this.level.stage ?? 0,
      paradeScatters: 0,
      // 赛道与困难赛道的「送别」：留在夜里的同伴不会在下一段复活。
      paradeTrack: this.pendingParadeTrack ?? 'easy',
      paradeLost: [],
      paradeRescueReady: 0,
      paradeNineLivesUsed: false,
      paradePendingSacrifice: false,
      paradeSacrificeReason: null,
      paradeDefeated: false,
      // 没有科学怪人时，裂石要靠全队贴住石壁一起推。
      paradeTeamSmashContact: null,
      paradeTeamSmashTimer: 0,
      paradeTeamSmashKey: null,
      paradeTeamSmashHintShown: false,
      smashNoticeAt: -10,
      waterTipShown: false,
      diveTipShown: false,
      glideComboTipShown: false,
      joinedYokai: [],
      // Trick or Treat 的糖纸街：每户是「帮过 / 捣过蛋」，以及当前接下的是哪一户。
      trickHouses: {},
      trickActiveHouse: null,
      trickRoom: null,
      trickDoorHouse: null,
      // 捣蛋后的后巷竞速：正在被哪一户追。只在竞速期间有值。
      trickRaceHouse: null,
      // 每扇谜题门的进度：翻牌顺序、找到的窗户差别、答到第几题。
      trickPuzzleStates: {},
      trickTricks: 0,
      trickCandies: 0,
      trickAllDoneNotified: false,
      // 从糖袋里吃掉的增益糖数量（不影响路上糖纸的统计）。
      buffUses: 0,
      // 第三段的双人潜行状态。
      sneak: createSneakState(),
    };
  }

  /** 进入一段追思路线时，重置这一段的计时与即时状态。 */
  initMemorialState(carry = false) {
    if (this.mode !== 'memorial') return;
    const chapter = getMemorialChapter(this.level.stage);
    if (!chapter) return;
    const session = this.session;
    session.routeStage = chapter.stage;
    // 第三段把症状交给潜行本身，没有额外的周期触发。
    const trigger = chapter.trigger;
    session.memorialNext = trigger
      ? randomBetween(trigger.firstInterval ?? trigger.interval ?? [12, 18])
      : 0;
    session.memorialTunnel = 0;
    session.memorialPending = null;
    session.memorialPanic = null;
    session.memorialCalm = 0;
    session.memorialSlump = 0;
    session.memorialLift = 0;
    session.memorialDepth = 0;
    session.solacesLit = new Set();
    session.carriageQuest = null;
    session.carriageAlarm = false;
    session.carriageHopTimer = 0;
    session.carriageIntro = 0;
    session.carriageIntroTotal = 0;
    session.carriageBeatIndex = 0;
    session.carriageRolling = false;
    session.carriageDustTimer = 0;
    session.carriageRiding = false;
    session.carriageIntroSkipped = false;
    session.carriageX = 0;
    session.carriageTutorialOpen = false;
    session.readingSign = null;
    session.pumpkinHintShown = false;

    const opening = chapter.opening;
    if (chapter.stage === 1 && opening && !session.carriageIntroSeen) {
      const carriage = this.level.devices.find((device) => device.type === 'carriage');
      if (carriage) {
        // 南瓜车从墓园外驶入，车上讲完这一夜的来由，停稳后玩家才下车。
        session.carriageIntro = opening.total;
        session.carriageIntroTotal = opening.total;
        session.carriageRiding = true;
        session.carriageX = carriage.x - 220;
      }
    }

    if (!carry) session.totalMemories = MEMORIAL_TOTAL_MEMORIES;
    this.setupShoeFollowers();
  }

  /**
   * 按当前段落排出身后已经跟着的鞋。
   * 先走过的那双离角色最近，后来跟上的接在队伍末尾；所有鞋共用同一条足迹链。
   */
  setupShoeFollowers() {
    if (this.mode !== 'memorial') return;
    const session = this.session;
    this.shoeFollowers.setStage(this.level.stage);
    this.shoeFollowers.resetAt(this.player.centerX, this.player.feetY, this.player.facing);

    const fresh = this.shoeFollowers.pairs.filter(
      (pair) => !session.shoeNotices.has(pair.stage),
    );
    if (!fresh.length) return;
    for (const pair of fresh) session.shoeNotices.add(pair.stage);

    // 一次只提最新跟上的那双，别把开场提示挤掉。
    const latest = fresh[fresh.length - 1];
    window.setTimeout(() => {
      if (this.mode !== 'memorial' || this.state !== 'playing') return;
      this.notify(
        `${latest.name}的${latest.shoeName ?? '皮鞋'}跟在你身后了。${latest.manner?.line ?? ''}`,
        4200,
      );
    }, 7200);
  }

  /** 每帧把主角走过的路记下来，让身后的鞋按固定距离跟住。 */
  updateShoeFollowers(dt) {
    if (this.mode !== 'memorial') return;
    this.shoeFollowers.update(dt, this.player, this.level);
  }

  /**
   * 走完一段：那一段的人留在了夜里，只剩下一双鞋从下一段起跟在身后。
   * 这里把「第几段、谁的鞋」报给界面，由 main.js 播拿到鞋的动效；
   * 顺手记进 shoeNotices，免得进新图后第七秒那句「跟在你身后了」再说一遍。
   */
  presentShoeReward(stage) {
    const reward = shoeRewardFor(stage);
    if (!reward) return null;
    this.session.shoeNotices?.add(stage);
    this.onShoeReward?.(reward);
    return reward;
  }

  clonePickups(level) {
    return level.pickups.map((pickup) => ({ ...pickup, collected: false }));
  }

  bindPlayerEvents() {
    this.player.onJump = (x, y, automatic = false) => {
      if (this.player.inWater) {
        // 水面跃出：水花代替脚下的尘土。
        this.particles.spawnSplash(x, y + 4, 8);
        this.audio.splash();
      } else {
        this.particles.spawnDust(x, y, 0, 5);
        this.audio.jump();
      }
      this.session.jumpCount += 1;
      if (!automatic) this.session.manualJumpCount += 1;

      // 强迫症：玩家自己的起跳会「种下」一次必须重复的跳跃。
      if (!automatic && this.session.candyEffects.lollipop) {
        this.session.compulsionPending = true;
        this.session.compulsionDelay = CANDY_EFFECTS.lollipop.repeatJump.delay;
      }
    };

    this.player.onLand = (x, y, impact) => {
      this.particles.spawnLanding(x, y, impact);
      this.audio.land(impact);
    };

    this.player.onStep = (x, y, side, speed) => {
      this.particles.spawnDust(x, y, side, speed > 70 ? 2 : 1);
    };

    this.player.onHoverSpark = (x, y) => {
      this.particles.spawnElectric(x + (Math.random() - 0.5) * 8, y - 2, 1);
    };

    this.player.onElectricSpark = (x, y) => {
      this.particles.spawnElectric(x, y, 4);
      this.audio.spark();
    };

    this.player.onFieldEnter = (field) => {
      if (this.session.seenFields.has(field.id)) return;
      this.session.seenFields.add(field.id);
      const balanced = this.level.isFieldBalanced(field);
      const speed = ((field.e.mag / field.b.mag)).toFixed(1);
      this.notify(
        balanced
          ? `速度选择器启动 · 平衡速度 ${speed} m/s。← / → 调速，平衡要向右。`
          : `${field.label} · B 与 E 不配对。回前一座骨槽，放入右手骨。`,
        2800,
      );
    };

    this.player.onSmash = (x, y) => this.handleSmash(x, y);
    this.player.onCrackBlocked = (col, row) => this.registerCrackPush(col, row);
    this.player.onDash = (x, y, dir) => {
      this.particles.spawnDust(x, y + 8, dir, 6);
      this.audio.jump();
    };
    this.player.onWallJump = (x, y, side) => {
      this.particles.spawnDust(x, y - 4, side, 5);
      this.audio.jump();
    };
    this.player.onWaterEnter = (x, y, vy) => {
      this.particles.spawnSplash(x, y, 11);
      this.particles.spawnBubble(x, y, 3, 9);
      if (Math.abs(vy) > 110) this.audio.splash();
    };
    this.player.onWaterExit = (x, y) => {
      this.particles.spawnSplash(x, y, 6);
      this.audio.splash();
    };

    // 教程用：按住 ↓ 从单向木板上落下去，算一次「穿过木板」。
    this.player.onDropThrough = () => {
      this.session.dropThroughs += 1;
    };
  }

  /**
   * 南瓜世界不直接依赖音效对象：推、叠高各给它一条回调。
   * 推的那一声在 PumpkinWorld 里已经限流，这里只管放。
   * 掉进岩浆这类地方就没了的南瓜，也在这里留一点碎屑。
   */
  bindPumpkinAudio() {
    if (!this.pumpkins) return;
    this.pumpkins.onPush = () => this.audio.push();
    this.pumpkins.onStack = () => this.audio.stack();
    this.pumpkins.onLost = (pumpkin) => {
      this.particles.spawnDust(pumpkin.x + pumpkin.w / 2, pumpkin.y + pumpkin.h / 2, 0, 6);
    };
  }

  /** 科学怪人撞塌裂石时的碎屑、音效与一次性提示。 */
  handleSmash(x, y) {
    this.particles.spawnSpark(x + 8, y + 8, 12);
    this.particles.spawnDust(x + 8, y + 16, 0, 7);
    this.audio.land(300);
    const now = this.session.time;
    if (now - (this.session.smashNoticeAt ?? -10) > 2.2) {
      this.session.smashNoticeAt = now;
      const hasFranken = this.members.some((member) => member.yokaiId === 'franken');
      this.notify(
        hasFranken
          ? '科学怪人一肩膀把裂石壁撞塌了。'
          : '科学怪人不在了。剩下的人一起推塌了裂石。',
        2600,
      );
    }
  }

  /**
   * 没有科学怪人时，撞到裂石只是「顶住」，由 updateTeamSmash() 累积时间。
   * 每帧只记下最近一处被顶住的裂石。
   */
  registerCrackPush(col, row) {
    if (!this.teamSupport?.smashFallback) return;
    this.session.paradeTeamSmashContact = { col, row };
  }

  /**
   * 全队合力推裂石：贴住同一面石壁的人越多，推塌得越快。
   * 一个人也能推，只是要顶得更久，保证困难赛道不会因为少了科学怪人而卡死。
   */
  updateTeamSmash(dt) {
    const contact = this.session.paradeTeamSmashContact;
    const key = contact ? `${contact.col}:${contact.row}` : null;
    if (!this.teamSupport?.smashFallback || !contact) {
      this.session.paradeTeamSmashContact = null;
      this.session.paradeTeamSmashTimer = 0;
      this.session.paradeTeamSmashKey = null;
      return;
    }

    if (this.session.paradeTeamSmashKey !== key) {
      this.session.paradeTeamSmashKey = key;
      this.session.paradeTeamSmashTimer = 0;
    }

    const tile = this.level.tileSize;
    const centerX = contact.col * tile + tile / 2;
    const centerY = contact.row * tile + tile / 2;
    const pushers = this.members.filter(
      (member) =>
        Math.abs(member.centerX - centerX) < tile * 2.5 &&
        Math.abs(member.centerY - centerY) < tile * 3,
    ).length;

    this.session.paradeTeamSmashTimer += dt;
    if (!this.session.paradeTeamSmashHintShown && this.session.paradeTeamSmashTimer > 0.35) {
      this.session.paradeTeamSmashHintShown = true;
      this.notify('没有科学怪人，裂石要全队一起顶。', 2400);
    }
    if (Math.random() < dt * 8) {
      this.particles.spawnDust(centerX, (contact.row + 1) * tile, 0, 1);
    }

    const required = pushers >= 3 ? 0.8 : pushers === 2 ? 1.4 : 2.4;
    if (this.session.paradeTeamSmashTimer < required) return;

    const broken = this.level.breakColumn(contact.col, contact.row);
    this.session.paradeTeamSmashContact = null;
    this.session.paradeTeamSmashTimer = 0;
    this.session.paradeTeamSmashKey = null;
    if (broken) this.handleSmash(broken.x, broken.y);
  }

  /** 给同行者绑定与主角相同、但更安静的反馈。 */
  bindCompanionEvents(member) {
    member.onJump = (x, y) => {
      if (member.inWater) {
        // 水面跃出：水花代替脚下的尘土。
        this.particles.spawnSplash(x, y + 4, member === this.player ? 8 : 4);
        if (member === this.player) this.audio.splash();
      } else {
        this.particles.spawnDust(x, y, 0, 2);
        if (member === this.player) this.audio.jump();
      }
      this.session.jumpCount += 1;
    };
    member.onLand = (x, y, impact) => {
      this.particles.spawnLanding(x, y, impact * 0.7);
      if (member === this.player) this.audio.land(impact);
    };
    member.onStep = (x, y, side, speed) => {
      this.particles.spawnDust(x, y, side, 1);
    };
    member.onSmash = (x, y) => this.handleSmash(x, y);
    member.onCrackBlocked = (col, row) => this.registerCrackPush(col, row);
    member.onDash = (x, y, dir) => {
      this.particles.spawnDust(x, y + 8, dir, 3);
      if (member === this.player) this.audio.jump();
    };
    member.onWallJump = (x, y, side) => {
      this.particles.spawnDust(x, y - 4, side, 2);
      if (member === this.player) this.audio.jump();
    };
    member.onWaterEnter = (x, y, vy) => {
      const big = member === this.player;
      this.particles.spawnSplash(x, y, big ? 11 : 5);
      this.particles.spawnBubble(x, y, big ? 3 : 1, 9);
      if (big && Math.abs(vy) > 110) this.audio.splash();
    };
    member.onWaterExit = (x, y) => {
      this.particles.spawnSplash(x, y, member === this.player ? 6 : 3);
      if (member === this.player) this.audio.splash();
    };
  }

  createParadeMember(id, x, y) {
    const def = getYokai(id);
    const member = new Player(x, y, def ?? null);
    member.shoeFit = this.getShoeFit();
    this.bindCompanionEvents(member);
    return member;
  }

  /**
   * 按当前这一段的地图重建队伍。party 是这一段开场就已经在队伍里的同行者；
   * 这一段新遇到的人通过石鼓（device.type === 'mask'）加入。
   */
  setupParadeParty() {
    const lost = new Set(this.session.paradeLost ?? []);
    const party = (this.level.party ?? ['lantern']).filter((id) => !lost.has(id));
    this.companions = [];
    this.player.variant = null;
    this.player.yokaiId = 'lantern';
    this.player.traits = {};

    party.slice(1).forEach((id, index) => {
      const x = this.level.spawn.x + 16 * (index + 1);
      this.companions.push(this.createParadeMember(id, x, this.level.spawn.y));
    });
    this.members = [this.player, ...this.companions];
    this.session.joinedYokai = [...party];
    this.session.paradeStage = this.level.stage;
    // 每段开始时，绷带兜底和「九命绷带」都重新可用。
    this.session.paradeRescueReady = 0;
    this.session.paradeNineLivesUsed = false;
    this.session.paradePendingSacrifice = false;
    this.session.paradeTeamSmashContact = null;
    this.session.paradeTeamSmashTimer = 0;
    this.session.paradeTeamSmashKey = null;
    this.session.paradeTeamSmashHintShown = false;
    this.rebuildPartySupport();
    this.session.paradeRescueReady = this.teamSupport?.rescue ?? 0;
  }

  /**
   * 同行者不是各自为战：蝙蝠把二段跳分给全队，女巫把滑翔分给全队，
   * 沼泽怪让所有人划水省力，两只骷髅凑齐时整队提速，床单幽灵让全队落得轻一点。
   */
  rebuildPartySupport() {
    if (this.mode !== 'parade') {
      this.teamSupport = null;
      this.player.teamSupport = null;
      this.partner.teamSupport = null;
      return;
    }
    const ids = new Set(this.members.map((member) => member.yokaiId));
    const frankenLost = (this.session.paradeLost ?? []).includes('franken');
    const support = {
      extraJumps: ids.has('bat') ? 1 : 0,
      glide: ids.has('witch'),
      swimBoost: ids.has('swamp') ? 1.2 : 1,
      swimCap: ids.has('swamp') ? -64 : -48,
      speedBoost: ids.has('boneA') && ids.has('boneB') ? 1.06 : 1,
      floatScale: ids.has('sheet') ? 0.94 : 1,
      jumpBoost: ids.has('sheet') ? 1.03 : 1,
      // 新同伴把本事分给整队。
      dash: ids.has('wolf'),
      airDash: ids.has('wolf') && ids.has('bat'),
      wallJump: ids.has('cat'),
      rescue: ids.has('mummy') ? 1 : 0,
      nineLives: ids.has('mummy') && ids.has('cat'),
      // 困难赛道里如果科学怪人已经被留下，剩余队伍还能一起推塌裂石：
      // 不再一碰就碎，要贴住石壁顶一段时间，避免软锁的同时也让开路能力变弱。
      smashFallback: !ids.has('franken') && frankenLost,
    };
    this.teamSupport = support;
    for (const member of this.members) member.teamSupport = support;
  }

  /** 请一位新同行者加入。落点尽量排在队伍末尾，仍由同一套方向键控制。 */
  addParadeMember(id) {
    if (this.members.some((member) => member.yokaiId === id)) return null;
    if ((this.session.paradeLost ?? []).includes(id)) return null;
    const def = getYokai(id);
    if (!def) return null;

    const count = this.companions.length;
    const clampX = (value) =>
      Math.max(8, Math.min(this.level.pixelWidth - 20, Math.round(value)));
    let x = clampX(this.player.x - 16 - count * 8);
    let y = this.player.y;
    // 如果身后紧贴石壁，就改站到队伍右侧。
    const solidAt = (px, py) =>
      this.level.isSolid(Math.floor(px / this.level.tileSize), Math.floor(py / this.level.tileSize));
    if (solidAt(x + 5, y + 4) || solidAt(x + 5, y + this.player.h - 2)) {
      x = clampX(this.player.x + 16 + count * 8);
      y = this.player.y - 2;
    }

    const member = this.createParadeMember(id, x, y);
    this.companions.push(member);
    this.members = [this.player, ...this.companions];
    this.session.joinedYokai.push(id);
    this.rebuildPartySupport();
    if (id === 'mummy' && this.teamSupport?.rescue) {
      // 木乃伊刚加入时，这一段的绷带立即就能用一次。
      this.session.paradeRescueReady = Math.max(
        this.session.paradeRescueReady ?? 0,
        this.teamSupport.rescue,
      );
    }

    this.audio.tutorialChime();
    this.particles.spawnSpark(member.centerX, member.centerY, 12);
    this.notify(
      `${def.name}「${def.title}」加入了队伍 · ${def.trait}`,
      def.id === 'bat' || def.id === 'witch' ? 5600 : 3800,
    );
    this.announceParadeCombo(id);
    return member;
  }

  /** 新同伴凑齐一组组合技时，多提示一次怎么用。 */
  announceParadeCombo(id) {
    const ids = new Set(this.members.map((member) => member.yokaiId));
    const tips = {
      moondash: {
        required: ['wolf', 'bat'],
        text: '组合技「月下连扑」：二段跳后空中双击 ←/→。',
      },
      ninelives: {
        required: ['mummy', 'cat'],
        text: '组合技「九命绷带」：困难赛道每段免一次送别。',
      },
      whirlwind: {
        required: ['bat', 'witch'],
        text: '组合技「扫帚旋风」：二段跳后按住 ↑ 滑翔。',
      },
    };
    const tip = Object.values(tips).find(
      (entry) => entry.required.includes(id) && entry.required.every((memberId) => ids.has(memberId)),
    );
    if (tip) window.setTimeout(() => this.notify(tip.text, 5200), 3600);
  }

  /** 第二名玩家的脚步 / 落地 / 起跳反馈；它不参与其它线路。 */
  bindPartnerEvents() {
    this.partner.onJump = (x, y) => {
      this.particles.spawnDust(x, y, 0, 4);
      this.audio.jump();
    };
    this.partner.onLand = (x, y, impact) => {
      this.particles.spawnLanding(x, y, impact);
      this.audio.land(impact);
    };
    this.partner.onStep = (x, y, side, speed) => {
      this.particles.spawnDust(x, y, side, speed > 70 ? 2 : 1);
    };
  }

  toggleMute() {
    const muted = this.audio.toggleMuted();
    this.persist();
    return muted;
  }

  getShoeFit() {
    // 主线走过一次之后，皮鞋就彻底合脚：之后每一趟都从 100% 起，
    // 不再靠里程慢慢磨。这一趟刚好走完最后一段时也一样。
    if (this.shoeFitComplete || memorialCleared(currentSave())) return 1;
    return Math.min(0.99, 0.38 + this.shoeDistance / 38000);
  }

  /**
   * 背包里的鞋架：脚上这双，和此刻跟在身后的每一双。
   * 只取已经出现在这一趟路上的事实，卡片上的字由 main.js 排版。
   */
  getShoeRackState() {
    // 主线走完过一次，四双鞋都算收进来了：重走时即使还没跟上来，也摆在鞋架上。
    const cleared = memorialCleared(currentSave());
    const following = new Map(
      this.shoeFollowers.pairs.map((pair) => [pair.stage, pair]),
    );
    const stages =
      this.mode !== 'memorial'
        ? []
        : cleared
          ? MEMORIAL_CHAPTERS.map((chapter) => chapter.stage)
          : [...following.keys()];

    const followers = stages.map((stage) => {
      const pair = following.get(stage);
      const reward = shoeRewardFor(stage);
      return {
        kind: 'follower',
        id: `stage-${stage}`,
        stage,
        patient: pair?.name ?? reward?.patient ?? '',
        shoe: pair?.shoe ?? reward?.shoe ?? 'oxford',
        shoeName: pair?.shoeName ?? reward?.shoeName ?? '鞋',
        accent: pair?.accent ?? reward?.accent ?? '#c6b3e0',
        stageLabel: reward?.stageLabel ?? `第 ${stage} 段`,
        line: pair?.manner?.line ?? reward?.line ?? '',
        bio: reward?.bio ?? reward?.intro ?? '',
        bioEn: reward?.bioEn ?? '',
        blessing: reward?.blessing ?? null,
        // 这一双此刻是不是真的走在身后；只是收在鞋架上的也算。
        following: Boolean(pair),
      };
    });

    return {
      mode: this.mode,
      fit: this.getShoeFit(),
      own: {
        kind: 'own',
        id: 'own',
        shoe: 'oxford',
        shoeName: '系带皮鞋',
        accent: '#ffcf72',
        fit: this.getShoeFit(),
      },
      followers,
    };
  }

  /**
   * 写一次存档。snapshot() 只取白名单字段，save.js 负责节流；
   * flush = true 时立刻落盘（通关、切后台这类时机）。
   */
  persist(flush = false) {
    if (!this.started) return false;
    const saved = saveGame(this);
    if (flush) flushSave();
    return saved;
  }

  /**
   * 从本地存档继续：先加载那条线路的那一段，再把共用行囊、
   * 落脚点和线路专属状态写回 session。
   */
  continueSaved(data, routeKey = data?.settings?.lastRoute) {
    const route = data?.routes?.[routeKey];
    if (!route) return false;

    let levelId = null;
    if (routeKey === 'tutorial') {
      levelId = 'tutorial';
    } else if (routeKey === 'memorial') {
      let stage = clamp(route.stage ?? 1, 1, MEMORIAL_ROUTE.totalStages);
      // 旧存档：第三段还是周叔的电磁赛道，没有 sneakCheckpointIndex 字段。
      // 现在电磁赛道顺延到第四段，把旧进度接过去。
      if (stage === 3 && route.sneakCheckpointIndex === undefined) stage = 4;
      levelId = getMemorialChapter(stage)?.levelId ?? `memorial-${stage}`;
    } else if (routeKey === 'parade') {
      const stage = clamp(route.stage ?? 1, 1, PARADE_ROUTE.totalStages);
      this.pendingParadeTrack = getParadeTrack(route.track ?? 'easy').id;
      levelId = getParadeChapter(stage)?.levelId ?? `parade-${stage}`;
    } else if (routeKey === 'trick') {
      levelId = route.room
        ? getTrickHouseByRoom(route.room)?.task.levelId ?? 'trick'
        : route.raceHouse && getTrickHouse(route.raceHouse)
          ? 'trick-race'
          : 'trick';
    }
    if (!levelId) return false;

    this.audio.unlock();
    // 读档直接落进后巷时，也要按那一户的巷子建图。
    this.loadTheme(
      levelId,
      routeKey,
      null,
      routeKey === 'trick' ? { trickRaceHouse: route.raceHouse ?? null } : {},
    );
    applySaveData(this, data);
    this.restoreRouteState(routeKey, route);
    this.setState('playing');
    this.notify(
      routeKey === 'tutorial'
        ? '继续上次的教程。'
        : routeKey === 'trick'
          ? route.room
            ? `继续糖纸街 · ${getTrickHouseByRoom(route.room)?.name ?? '这户'}的房间。`
            : route.raceHouse
              ? `继续后巷 · ${getTrickHouse(route.raceHouse)?.name ?? '这户'}还在追。`
              : '继续糖纸街 · 敲过的门都还在。'
          : routeKey === 'memorial'
            ? `继续第 ${Math.max(1, this.level.stage ?? route.stage ?? 1)} 段 · 回到上次的落脚点。`
            : `继续第 ${Math.max(1, route.stage ?? 1)} 段 · 回到上次的落脚点。`,
      2800,
    );
    return true;
  }

  /** 把线路自己的进度写回刚加载的地图。 */
  restoreRouteState(routeKey, route) {
    const session = this.session;

    if (routeKey === 'memorial') {
      // 旧存档里的第三段是电磁赛道；如果它被接到第四段，
      // 记忆和灯光的 id 也要从 memorial-3- 改成 memorial-4-。
      const legacyShift = this.level.stage === 4 && route.stage === 3;
      const remapIds = (ids) =>
        legacyShift ? ids.map((id) => id.replace(/^memorial-3-/, 'memorial-4-')) : ids;
      session.seenMemories = new Set(remapIds(route.seenMemories ?? []));
      session.litLights = new Set(remapIds(route.litLights ?? []));
      session.routeStage = this.level.stage;
      // 能读到存档说明第一段的南瓜车开场已经看过，不再重播。
      session.carriageIntro = 0;
      session.carriageIntroSeen = true;
      // 第三段是双人潜行：把影子记号、被发现和失足次数一起还原。
      // 走到第四段后读档时，发现 / 失足次数也继续保持。
      if (session.sneak) {
        session.sneak.spotted = route.spotted ?? 0;
        session.sneak.falls = route.falls ?? 0;
        if (this.level.sneak) {
          session.sneak.checkpointIndex = route.sneakCheckpointIndex ?? -1;
          // 本段重来时不会把读档前的记录退回去。
          session.sneak.stageStartSpotted = session.sneak.spotted;
          session.sneak.stageStartFalls = session.sneak.falls;
        }
      }
    } else if (routeKey === 'parade') {
      session.paradeLost = [...(route.lost ?? [])];
      session.paradeTrack = route.track ?? session.paradeTrack;
      // 重新按「这一段 + 送别名册」组队，读档后不会多出已离开的人。
      this.setupParadeParty();
    } else if (routeKey === 'tutorial') {
      // 教程改短过，旧存档的步数可能超出现在的步数；夹在最后一个可见步骤里。
      const lastStep = Math.max(0, (this.level.tutorialSteps?.length ?? 1) - 1);
      session.tutorialStep = Math.min(route.step ?? 0, lastStep);
      this.level.syncTutorialGates(session.tutorialStep);
    } else if (routeKey === 'trick') {
      const houses = { ...(route.houses ?? {}) };
      // 兼容旧存档：doors 的键是 trick-door-<序号>，值是 treat / trick。
      if (!route.houses && route.doors) {
        for (const [doorId, state] of Object.entries(route.doors)) {
          const index = Number(String(doorId).split('-').pop());
          const house = TRICK_HOUSES[index - 1];
          if (house) houses[house.id] = state === 'trick' ? 'trick' : 'help';
        }
      }
      session.trickHouses = houses;
      session.trickRoom = route.room ?? null;
      session.trickActiveHouse = route.activeHouse ?? null;
      session.trickDoorHouse = null;
      // 后巷竞速只记「被哪一户追」；追兵位置不存档，读档后从起跑线重来。
      session.trickRaceHouse =
        route.raceHouse && getTrickHouse(route.raceHouse) ? route.raceHouse : null;
      session.trickCandies = route.trickCandies ?? 0;
      session.trickTricks = route.trickTricks ?? 0;
      session.trickPuzzleStates = { ...(route.puzzles ?? {}) };
      session.trickAllDoneNotified = Object.keys(houses).length >= TRICK_HOUSES.length;
      if (!session.trickRoom && !session.trickRaceHouse) this.syncTrickHouseDevices();
    }

    session.checkpointIndex = route.checkpointIndex ?? -1;
    if (route.checkpoint && Number.isFinite(route.checkpoint.x)) {
      session.checkpoint = { x: route.checkpoint.x, y: route.checkpoint.y };
    }
    session.completed = Boolean(route.completed);

    // 站到存档坐标上，而不是这一段的起点。
    if (routeKey === 'memorial' && this.level.sneak) {
      respawnSneakPair(this);
    } else if (routeKey === 'parade') {
      this.placePartyAtCheckpoint(session.checkpoint);
    } else if (session.checkpoint) {
      this.player.reset(session.checkpoint.x, session.checkpoint.y);
      this.player.shoeFit = this.getShoeFit();
    }
    // 读档落点和开场不同：身后的鞋重新在落脚点后面排队。
    if (routeKey === 'memorial') {
      this.shoeFollowers.resetAt(this.player.centerX, this.player.feetY, this.player.facing);
    }

    // 读档时正在被追：从起跑线重新摆好赛道，追兵从头压上来。
    if (routeKey === 'trick' && session.trickRaceHouse) {
      this.initTrickRace(getTrickHouse(session.trickRaceHouse));
    }

    this.camera.x = 0;
    this.camera.y = 0;
    this.updateCamera(STEP, true);
    this.accumulator = 0;
    this.saveClock = 0;
    this.persist();
  }

  /** 魑魅魍魉整支队伍一起落在落脚点，前后错开一点。 */
  placePartyAtCheckpoint(checkpoint) {
    const count = this.members.length;
    this.members.forEach((member, index) => {
      const offset = (index - (count - 1) / 2) * 10;
      member.reset(checkpoint.x + offset, checkpoint.y);
      member.shoeFit = this.getShoeFit();
    });
  }

  loadTheme(themeId, mode, carrySession = null, options = {}) {
    // 换图时门里的光效已经结束，别把上一步的停顿带进来。
    this.doorEntry = null;
    // 结尾长镜头只属于上一条走完的追思路；新开一局或换图都要收掉。
    this.ending = null;
    // 后巷竞速的追兵状态只属于上一张图；换图后由 initTrickRace 重新建立。
    this.race = null;
    // 魑魅魍魉的赛道要跟着这一局走：新开局取 pendingParadeTrack，
    // 段落之间和重来本段则沿用 carrySession 里记下的那一条。
    const paradeTrackId =
      carrySession?.paradeTrack ?? (mode === 'parade' ? this.pendingParadeTrack : 'easy');
    // 后巷是十户各一条：读档进来时也要知道这次被谁追。
    const trickRaceHouse =
      options.trickRaceHouse ?? carrySession?.trickRaceHouse ?? null;
    this.level = new Level(themeId, {
      paradeTrack: paradeTrackId,
      trickRaceHouse,
    });
    // 第三段虽然属于 memorial，但要按潜行段来更新和绘制。
    const sneakStage = this.level.sneak;
    this.pumpkins = new PumpkinWorld(this.level);
    this.bindPumpkinAudio();
    const cameraZoom = this.cameraZoom ?? 1;
    this.renderer = new Renderer(this.canvas, this.level, this.particles);
    // 换图会重建渲染器：镜头倍率（手机端放大）要跟着带过去。
    this.renderer.setCameraZoom(cameraZoom);
    this.mode = mode;
    // 主线走过一次之后皮鞋就永远合脚：这一趟从 100% 起，重走也一样。
    this.shoeFitComplete = mode === 'memorial' && memorialCleared(currentSave());
    this.activePickups = this.clonePickups(this.level);
    this.player.reset(this.level.spawn.x, this.level.spawn.y);
    this.player.charge = 0;
    this.player.costume = null;
    this.player.shoeFit = this.getShoeFit();
    // 皮鞋是追思小径的暗线；其它线路没有鞋，也不积累磨损。
    this.player.hasShoes = mode === 'memorial';
    this.player.variant = null;
    this.player.yokaiId = 'lantern';
    this.player.traits = {};
    this.partner.reset(
      this.level.spawn2?.x ?? this.level.spawn.x + 24,
      this.level.spawn2?.y ?? this.level.spawn.y,
    );
    this.partner.charge = 0;
    this.partner.costume = null;
    this.partner.variant = null;
    this.partner.yokaiId = 'lantern';
    this.partner.traits = {};
    this.player.appearance = 'pumpkin';
    this.partner.appearance = 'pumpkin';

    if (
      carrySession &&
      (mode === 'memorial' || mode === 'parade' || mode === 'trick')
    ) {
      // 段与段之间保留本局的统计、已点亮的灯和走过的记忆。
      this.session = carrySession;
      this.session.themeId = themeId;
      this.session.mode = mode;
      this.session.paradeTrack = paradeTrackId;
      this.session.checkpoint = { x: this.level.spawn.x, y: this.level.spawn.y };
      this.session.checkpointIndex = -1;
      this.session.candyEffects = {};
      this.session.paradePendingSacrifice = false;
      this.session.paradeRescueReady = 0;
      this.session.paradeNineLivesUsed = false;
    } else {
      this.session = this.createSession(themeId, mode);
      this.session.paradeTrack = paradeTrackId;
      // 教程与追思小径的行囊跨局保留：骨头、时装、糖纸从存档里带回来。
      // 这一段代码也在读档时运行，随后 apply() 会用同一份数据再覆盖一次（幂等）。
      if (mode === 'tutorial' || mode === 'memorial') {
        const saved = currentSave();
        if (saved) applyWallet(this, saved);
      }
    }

    if (mode === 'parade') {
      this.setupParadeParty();
    } else if (sneakStage) {
      // 第三段是双人潜行：你和回音各占一个身体。
      this.companions = [];
      this.members = [this.player, this.partner];
    } else {
      this.companions = [];
      this.members = [this.player];
    }
    if (mode !== 'parade') this.rebuildPartySupport();

    this.initMemorialState(Boolean(carrySession));
    if (sneakStage) {
      initSneakStage(this);
      // 主角还是那个提南瓜派的人；回音是半透明的、只有你看得见的另一个自己：
      // 同一副身体、同一套画法，只是换了一层被月光洗淡的颜色。
      this.player.appearance = 'pumpkin';
      this.player.crouchScale = 0.62;
      this.partner.appearance = 'ghost';
      this.partner.crouchScale = 0.62;
      this.partner.hasShoes = false;
    } else {
      this.player.crouchScale = null;
      this.partner.crouchScale = null;
    }
    // 换段之后时装要从行囊里重新穿上；第三段的回音和你穿同一套。
    this.syncCostumes();

    this.particles.clear();

    this.camera.x = 0;
    this.camera.y = 0;
    if (sneakStage) updateSneakCamera(this, 0, true);
    else this.updateCamera(STEP, true);
    this.accumulator = 0;
    this.respawnGrace = 0;
    this.introFlash = 0.9;
    this.damageFlash = 0;

    // 教程门在当前步骤之前都打开；读档后教程进度可能不是 0。
    this.level.syncTutorialGates(this.session.tutorialStep ?? 0);

    // 新的一段（或新开一局）立刻记下所在线路与起点；
    // 读档时随后的 restoreRouteState() 会再覆盖成存档里的落脚点。
    this.started = true;
    this.saveClock = 0;
    this.persist();
  }

  startTutorial() {
    this.audio.unlock();
    this.loadTheme('tutorial', 'tutorial');
    this.setState('playing');
    this.notify(this.level.theme.startTip);
  }

  startTheme(themeId, customTip = null) {
    this.audio.unlock();
    this.loadTheme(themeId, 'journey');
    this.setState('playing');
    this.notify(customTip ?? this.level.theme.startTip);
  }

  /** 开始「给老师送南瓜派」正式线路，从第一段墓园夜路走起。 */
  startMemorial() {
    this.audio.unlock();
    this.loadTheme('memorial-1', 'memorial');
    this.setState('playing');
    // 第一段开场由南瓜车上的几句独白来讲，下车时再提示这一段的目标。
    if (this.session.carriageIntro > 0) return;
    this.notify(
      MEMORIAL_ROUTE.introEn
        ? `${MEMORIAL_ROUTE.intro}\n${MEMORIAL_ROUTE.introEn}`
        : MEMORIAL_ROUTE.intro,
      4600,
    );
    window.setTimeout(() => {
      const chapter = getMemorialChapter(1);
      if (chapter && this.mode === 'memorial' && this.state === 'playing') {
        this.notify(chapter.intro, 4600);
      }
    }, 3800);
  }

  /** 打开三条赛道的选择页。 */
  openParadeTracks() {
    if (this.state !== 'title') return;
    // 这一下点击本身就可以解锁音频：赛道页的开合声从第一次点击就听得见。
    this.audio.unlock();
    this.audio.panel(true);
    this.setState('tracks');
  }

  closeParadeTracks() {
    if (this.state !== 'tracks') return;
    this.audio.panel(false);
    this.setState('title');
  }

  getParadeTrackId() {
    return this.session?.paradeTrack ?? this.pendingParadeTrack ?? 'easy';
  }

  /** 开始「魑魅魍魉」：选一条赛道，从第一段山道走起。 */
  startParade(trackId = this.getParadeTrackId()) {
    this.audio.unlock();
    this.pendingParadeTrack = getParadeTrack(trackId).id;
    this.loadTheme('parade-1', 'parade');
    this.setState('playing');
    const track = getParadeTrack(this.session.paradeTrack);
    this.notify(`${track.tier} · ${track.name}。${track.detail}`, 4200);
    window.setTimeout(() => {
      const chapter = getParadeChapter(1);
      if (chapter && this.mode === 'parade' && this.state === 'playing') {
        this.notify(chapter.intro, 4600);
      }
    }, 5800);
  }

  /**
   * 困难赛道被冲散后，让玩家从名册里亲手留下一人。
   * 提灯童子不在候选里：灯不能留下。
   */
  openSacrifice(reason = 'scatter', name = '') {
    if (this.state !== 'playing') return;
    this.session.paradePendingSacrifice = true;
    this.session.paradeSacrificeReason = { reason, name };
    this.setState('sacrifice');
  }

  getSacrificeContext() {
    return this.session.paradeSacrificeReason ?? { reason: 'scatter', name: '' };
  }

  getSacrificeChoices() {
    return this.companions.map((member) => {
      const def = getYokai(member.yokaiId);
      return {
        id: member.yokaiId,
        name: def?.name ?? '同行者',
        title: def?.title ?? '',
        role: def?.role ?? '',
        traitLabel: def?.traitLabel ?? '',
        teamLabel: def?.teamLabel ?? '',
        trait: def?.trait ?? '',
        accent: def?.accent ?? '#e8b878',
      };
    });
  }

  chooseSacrifice(yokaiId) {
    if (this.state !== 'sacrifice') return false;
    const index = this.companions.findIndex((member) => member.yokaiId === yokaiId);
    if (index < 0) return false;

    const [member] = this.companions.splice(index, 1);
    const def = getYokai(member.yokaiId);
    this.members = [this.player, ...this.companions];
    if (!this.session.paradeLost.includes(member.yokaiId)) {
      this.session.paradeLost.push(member.yokaiId);
    }
    this.session.paradePendingSacrifice = false;
    this.session.paradeSacrificeReason = null;
    this.session.paradeRescueReady = 0;
    this.rebuildPartySupport();
    this.accumulator = 0;
    this.audio.farewell();
    this.notify(
      member.yokaiId === 'franken'
        ? '科学怪人留在了夜路。裂石以后要全队一起顶。'
        : `${def?.name ?? '同行者'}留在了夜路。队伍还剩 ${this.members.length} 人。`,
      4200,
    );
    this.setState('playing');
    this.persist();
    return true;
  }

  /** 困难赛道里只剩提灯童子，再被冲散一次就没有队伍了。 */
  defeatParade() {
    if (this.state === 'defeat') return;
    this.session.paradeDefeated = true;
    this.input.releaseAll();
    this.audio.death();
    this.setState('defeat');
  }

  /**
   * 当前这一段是不是双人潜行。
   * 它现在是追思路线的第三段，所以不能再用 mode === 'sneak' 判断；
   * 统一看地图上的 sneak 标记。
   */
  isSneakStage() {
    return Boolean(this.level?.sneak);
  }

  /**
   * Trick or Treat：一条没有危险的糖纸街，十扇门各给一种增益糖。
   * 每一趟都是新的：十户的糖可以一遍遍地拿，糖袋只管往上加。
   */
  startTrickOrTreat() {
    this.audio.unlock();
    this.loadTheme('trick', 'trick');
    this.syncTrickHouseDevices();
    this.setState('playing');
    this.notify(TRICK_ROUTE.intro, 7600);
    window.setTimeout(() => {
      if (this.mode === 'trick' && this.state === 'playing' && !this.session.trickRoom) {
        this.notify(TRICK_ROUTE.reminder, 5200);
      }
    }, 7800);
  }

  /** 百鬼名册：看当前队伍和还没遇到的客人。 */
  openRoster() {
    if (this.mode !== 'parade' || this.state !== 'playing') return;
    this.audio.panel(true);
    this.setState('roster');
  }

  closeRoster() {
    if (this.state !== 'roster') return;
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState('playing');
  }

  setState(state) {
    if (state === this.state) return;
    this.state = state;
    this.input.enabled = state === 'playing';
    if (state !== 'playing') this.input.releaseAll();
    this.onStateChange?.(state);
  }

  notify(message, duration = 2200) {
    if (!message) return;
    this.onNotice?.(message, duration);
  }

  returnToTitle() {
    // 从碑前直接回起始页（调试或中途退出）时，别让长镜头还挂在标题上。
    this.ending = null;
    this.persist(true);
    this.setState('title');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.persist(true);
    this.audio.panel(true);
    this.setState('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.audio.unlock();
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState('playing');
  }

  openBackpack() {
    if (this.state !== 'playing') return;
    this.session.backpackOpened = true;
    this.persist();
    this.audio.panel(true);
    this.setState('inventory');
  }

  closeBackpack() {
    if (this.state !== 'inventory') return;
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState('playing');
  }

  /**
   * 提示面板：可以在进行中或暂停时打开；
   * 打开时玩法停住，关掉后回到打开前的状态。
   */
  openHint() {
    if (this.state !== 'playing' && this.state !== 'paused') return false;
    this.hintReturnState = this.state;
    this.accumulator = 0;
    this.audio.panel(true);
    this.setState('hint');
    return true;
  }

  closeHint() {
    if (this.state !== 'hint') return;
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState(this.hintReturnState === 'paused' ? 'paused' : 'playing');
  }

  getPouchState() {
    return this.pouch.snapshot();
  }

  /**
   * 从糖袋里吃一颗增益糖。
   * 魑魅魍魉里整支队伍一起生效，第三段里你和回音一起生效；
   * 其它线路只有主角。
   */
  usePouchCandy(type) {
    const def = BUFF_CANDIES[type];
    if (!def) return { ok: false, message: '糖袋里没有这种糖。' };
    if (this.state !== 'inventory' && this.state !== 'roster' && this.state !== 'playing') {
      return { ok: false, message: '现在不能吃糖。' };
    }
    if (!this.pouch.take(type)) {
      return { ok: false, message: `糖袋里没有${def.name}了。` };
    }

    this.session.buffUses = (this.session.buffUses ?? 0) + 1;
    this.activateCandy(type, { source: 'pouch' });
    return { ok: true, def };
  }

  restart() {
    if (this.state === 'title') return;
    this.audio.unlock();
    const themeId = this.level.id;
    const mode = this.mode;
    this.input.releaseAll();

    if (mode === 'memorial') {
      // 只回到这一段的起点：保留之前段落点过的灯，把本段重新变成未点亮。
      const carry = this.session;
      const prefix = `memorial-${this.level.stage}-`;
      for (const id of [...carry.seenMemories]) {
        if (!id.startsWith(prefix)) continue;
        carry.seenMemories.delete(id);
        carry.litLights.delete(id);
      }
      // 第三段重来时，本段之前被发现的次数也退回去。
      if (this.isSneakStage()) rewindSneakStageScore(this);
      this.loadTheme(themeId, mode, carry);
    } else if (mode === 'parade') {
      // 回到这一段的起点：之前加入的同行者还在，这一段新请的客人要重新敲石鼓。
      this.loadTheme(themeId, mode, this.session);
    } else if (mode === 'trick') {
      // 后巷竞速里重来：先记下追人的是哪一户，再把赛道从头摆一遍。
      const racedHouse = this.race?.house ?? getTrickHouse(this.session.trickRaceHouse);
      this.loadTheme(themeId, mode, this.session);
      if (this.level.race && racedHouse) {
        this.initTrickRace(racedHouse);
      } else if (!this.session.trickRoom) {
        this.syncTrickHouseDevices();
      }
    } else {
      this.loadTheme(themeId, mode);
    }
    this.setState('playing');
  }

  /**
   * E：抱起 / 抛出身边的东西。传入 actor 时只让那一个角色动手——第三段里
   * 你按 E、回音按 /，各管各的南瓜；不传时沿用「谁最合适谁动手」。
   * 装置归 Q、离开归 X、呼吸归空格，同一个键不兼两份差事。
   */
  interact(actor = null) {
    if (this.state !== 'playing') return;
    // 惊恐发作时只认空格呼吸；坐在南瓜车上时只认 Q 下车。这两种时候 E 不抱东西。
    if (this.isPanicActive()) return;
    // 提前下车后开场白还在播，但人已经落地，E 照常可用。
    if (this.mode === 'memorial' && this.session.carriageIntro > 0 && !this.session.carriageIntroSkipped) return;
    // 抱着东西时，E 只负责把它抛出去。
    if (!this.isSneakStage() && this.pumpkins?.getCarried(this.player)) {
      this.interactWithPumpkin(this.player);
      return;
    }
    this.interactWithPumpkin(actor);
  }

  /**
   * Q：摸身边的装置——石鼓、铜球、南瓜车、糖门，以及半空中放掉身上的电荷。
   * 抱 / 抛归 E，离开归 X，各按各的键。
   */
  useDevice() {
    if (this.state !== 'playing') return;
    // 惊恐发作时先呼吸，装置等平复了再摸。
    if (this.mode === 'memorial' && this.session.memorialPanic) return;
    if (this.mode === 'memorial' && this.session.carriageIntro > 0 && !this.session.carriageIntroSkipped) {
      // 坐在南瓜车上时，Q 用来直接下车。
      this.skipCarriageIntro();
      return;
    }
    const device =
      this.mode === 'parade'
        ? this.getNearbyParadeDevice()
        : this.isSneakStage()
          ? null
          : this.level.getNearbyDevice(this.player.bounds);
    if (!device) {
      // 半空里被电子拉住时，Q 用来放掉身上的电荷。
      // 库仑力只跟电荷和距离有关，电荷一放，人就能落回去。
      if (!this.player.onGround && this.player.charge !== 0) {
        this.dischargePlayerCharge();
        return;
      }
      this.notify('身边没有能摸的装置。抱起 / 抛出东西用 E。', 1600);
      return;
    }

    if (device.type === 'trickRaceExit' || device.type === 'trickExit') {
      // 离开挂在 X 上：Q 只摸装置，免得在门边想摸东西的人手一抖就走出了这一关。
      this.notify('要离开这里，按 X。', 1800);
      return;
    }

    if (device.type === 'candyDoor') {
      this.openTrickDoor(device);
      return;
    }

    if (device.type === 'carriage') {
      this.checkCarriage(device);
      return;
    }

    if (device.type === 'mask') {
      this.joinParade(device);
      return;
    }

    if (device.type === 'charger') {
      if (this.player.charge === device.charge) {
        this.dischargePlayerCharge();
      } else {
        this.player.charge = device.charge;
        this.audio.charge();
        this.particles.spawnElectric(this.player.centerX, this.player.centerY, 10);
        const label = device.charge > 0 ? '正' : '负';
        this.notify(`电荷 q = ${device.charge > 0 ? '+1' : '-1'}。铜球给你一点${label}电。`);
      }
      return;
    }

    // 骨槽只认 Tab：Q 不顺手打开背包，同一个键不兼两份差事。
  }

  /**
   * 放掉身上的电荷。
   * 铜球旁再按一次、或者在半空被电子拉住时按 Q，都走这里。
   */
  dischargePlayerCharge() {
    if (this.player.charge === 0) return;
    this.player.charge = 0;
    this.audio.discharge();
    this.particles.spawnElectric(this.player.centerX, this.player.centerY, 6);
    this.notify('电荷已释放。你又是绝缘的了。');
  }

  /** 抱起或放下身边的东西。传了 actor 就只让他动手，否则挑最合适的那一个。 */
  interactWithPumpkin(actor = null) {
    const players = this.isSneakStage() ? [this.player, this.partner] : [this.player];
    const chosen = actor && players.includes(actor) ? actor : this.pumpkins?.pickPlayer(players);
    if (!chosen) return false;
    // 动手之前先记下这一颗：抛出去之后就找不回来了，名字还得照它自己的叫。
    const subject = this.pumpkins.getCarried(chosen) ?? this.pumpkins.findNearby(chosen);
    const action = this.pumpkins.interact(chosen);
    if (!action) return false;
    // 潜行段里回音用的是 /，提示里要说对他自己那个键。
    const key = this.isSneakStage() && chosen === this.partner ? '/' : 'E';
    // 集合庭院里的元素按名字说（骷髅、眼睛……），只有普通南瓜才叫南瓜。
    const name = pumpkinLabel(subject);
    if (action === 'pickup') {
      this.audio.pickup(false);
      this.particles.spawnDust(chosen.centerX, chosen.feetY, 0, 3);
      this.notify(
        name
          ? `拿起了${name}。按 ${key} 放下；扔进属于它的坑里。`
          : `抱起了一颗南瓜。按 ${key} 抛出；落到另一颗上就会叠起来。`,
        2200,
      );
    } else {
      this.audio.toss();
      this.particles.spawnDust(chosen.centerX, chosen.feetY, chosen.facing, 2);
      this.notify(name ? `${name}放了下来。` : '南瓜抛了出去。', 1500);
    }
    return true;
  }

  /** 检查南瓜车的锁。任务期间检查会结束任务并解除报警。 */
  /**
   * 糖纸街：敲门后停下来和这户的人说话。
   * 对话面板由 main.js 根据 getTrickDoorState() 画出来，玩家选「帮忙」或「捣蛋」。
   */
  openTrickDoor(device) {
    if (this.mode !== 'trick' || this.state !== 'playing') return;
    this.session.trickDoorHouse = device.houseId;
    // 走到门前按 Q：先敲两下门，门里的人才会应声。
    this.audio.knock();
    this.setState('trickDoor');
  }

  closeTrickDoor() {
    if (this.state !== 'trickDoor') return;
    this.session.trickDoorHouse = null;
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState('playing');
  }

  getTrickDoorState() {
    const house = getTrickHouse(this.session.trickDoorHouse);
    if (!house) return null;
    const device = this.getTrickHouseDevice(house.id);
    return {
      house,
      helped: this.session.trickHouses[house.id] === 'help',
      tricked: this.session.trickHouses[house.id] === 'trick',
      active: this.session.trickActiveHouse === house.id,
      isRoom: house.task.type === 'room',
      isPuzzle: house.task.type === 'puzzle',
      taskTitle: house.taskTitle,
      taskText: house.taskText,
      trickText: house.trickLine,
      reward: {
        type: house.candyType,
        name: house.candyName,
        tag: house.candyTag,
        glyph: house.candyGlyph,
        accent: house.candyAccent,
      },
      device,
    };
  }

  /** 接下这户的任务。房间任务直接进屋；门上的谜题留在门上，狼人的追月留在街上。 */
  chooseTrickHelp() {
    const house = getTrickHouse(this.session.trickDoorHouse);
    if (!house) return;
    if (house.task.type === 'room') {
      this.enterTrickRoom(house);
      return;
    }
    this.session.trickActiveHouse = house.id;
    if (house.task.type === 'puzzle') {
      this.session.trickDoorHouse = null;
      this.ensureTrickPuzzleState(house.id);
      this.accumulator = 0;
      this.persist();
      this.audio.panel(true);
      this.setState('trickPuzzle');
      return;
    }
    this.closeTrickDoor();
    this.syncTrickHouseDevices();
    this.persist();
    this.notify(house.taskTitle, 3000);
  }

  /** 门上的谜题：取回（或初始化）这一户的进度。 */
  ensureTrickPuzzleState(houseId) {
    const puzzle = getTrickPuzzle(houseId);
    if (!puzzle) return null;
    const states = this.session.trickPuzzleStates ?? (this.session.trickPuzzleStates = {});
    const existing = states[houseId];
    // 进度对象要一直用同一个引用：面板每帧都会被 HUD 查询，不能每查一次就换新对象。
    if (isValidPuzzleState(puzzle, existing)) return existing;
    const current = normalizePuzzleState(puzzle, existing);
    states[houseId] = current;
    return current;
  }

  getTrickPuzzleState(houseId) {
    return this.ensureTrickPuzzleState(houseId);
  }

  getTrickPuzzleProgress(houseId) {
    const puzzle = getTrickPuzzle(houseId);
    if (!puzzle) return { progress: 0, total: 0, ratio: 0, text: '' };
    return getPuzzleProgress(puzzle, this.getTrickPuzzleState(houseId));
  }

  getTrickPuzzleViewState() {
    const house = getTrickHouse(this.session.trickActiveHouse);
    if (!house || house.task.type !== 'puzzle') return null;
    const puzzle = getTrickPuzzle(house.id);
    if (!puzzle) return null;
    return {
      house: { ...house, puzzle },
      puzzle,
      state: this.getTrickPuzzleState(house.id),
    };
  }

  closeTrickPuzzle() {
    if (this.state !== 'trickPuzzle') return;
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState('playing');
    this.syncTrickHouseDevices();
    this.persist();
  }

  /** 谜题面板完成：把这一户的固定糖装进糖袋，回到街上。 */
  solveTrickPuzzle(houseId) {
    const house = getTrickHouse(houseId);
    if (!house || house.task.type !== 'puzzle') return;
    this.completeTrickTask(house, 'help', { silent: true });
    // 下一次敲门从头再来：答完的题不留着，牌也重新洗过。
    if (this.session.trickPuzzleStates) delete this.session.trickPuzzleStates[house.id];
    this.syncTrickHouseDevices();
    this.accumulator = 0;
    this.setState('playing');
    this.notify(house.success, 4800);
  }

  /**
   * 捣蛋：抢过这一户的糖就跑，钻进糖纸街屋后的巷子。
   * 跑到街尾的栅门、没被追上，拿到的是这一户自己的那颗糖；
   * 被追上，糖被拿回去，这一户留到下一趟。
   */
  chooseTrickTrick() {
    const house = getTrickHouse(this.session.trickDoorHouse);
    if (!house) return;
    this.startTrickRace(house);
  }

  /** 进入后巷竞速。追兵就是这一户的人，跑的途中不换图。 */
  startTrickRace(house) {
    if (!house) return;
    this.session.trickDoorHouse = null;
    this.session.trickRaceHouse = house.id;
    this.session.trickRoom = null;
    if (this.session.trickActiveHouse === house.id) {
      this.session.trickActiveHouse = null;
    }
    this.loadTheme('trick-race', 'trick', this.session);
    this.initTrickRace(house);
    this.setState('playing');
    this.persist();
    this.audio.trick();
    this.notify(
      `${house.name}追了出来。${house.raceTwist ?? ''}${TRICK_RACE.reminder}`,
      4400,
    );
  }

  /** 摆好起跑线、追兵与糖浆区。读档和 R 重来也走这里。 */
  initTrickRace(house) {
    const data = this.level?.race;
    if (!data || !house) {
      this.race = null;
      return;
    }
    this.race = {
      houseId: house.id,
      house,
      elapsed: 0,
      grace: data.grace ?? TRICK_RACE.grace,
      chaserX: data.chaserStartX,
      gapTiles: TRICK_RACE.startGap / VIEW.TILE,
      boost: 0,
      warned: false,
      result: null,
      goalX: data.goalX,
    };
    // 街尾栅门的信标用这一户的颜色，和追兵身上的光一致。
    data.accent = house.accent ?? data.accent;
    this.session.trickRaceHouse = house.id;
    this.session.checkpoint = { x: data.spawn.x, y: data.spawn.y };
    this.player.reset(data.spawn.x, data.spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facing = 1;
    this.player.shoeFit = this.getShoeFit();
    this.camera.x = 0;
    this.camera.y = 0;
    this.updateCamera(STEP, true);
    this.accumulator = 0;
  }

  /**
   * 每帧推进追兵：前 grace 秒不动，之后按赛程从 128 涨到 138 px/s，
   * 再按领先距离做一次加速 / 收力。玩家在竞速里的基础速度是 135 px/s，
   * 糖浆能再冲一段——跑得顺就领先，停下来或反复撞箱子就会被贴上。
   */
  updateTrickRace(dt) {
    const race = this.race;
    const data = this.level?.race;
    if (!race || !data || race.result) return;

    race.elapsed += dt;
    if (race.grace > 0) {
      race.grace = Math.max(0, race.grace - dt);
    } else {
      const span = Math.max(1, data.goalX - data.spawn.x);
      const progress = clamp((race.chaserX - data.spawn.x) / span, 0, 1);
      // 每一户的追兵速度曲线不一样：狼人最凶，德古越跑越快。
      const chaser = data.chaser ?? TRICK_RACE;
      let speed = chaser.startSpeed + chaser.speedGain * progress;
      // 按距离写的追赶曲线：甩得太远就加速，快贴上时稍微收力。
      // 追兵始终留在画面附近，玩家跑得再好也不会让它彻底消失。
      const leadTiles = (this.player.x - (race.chaserX + 8)) / VIEW.TILE;
      if (leadTiles > chaser.chaseLeadTiles) {
        speed *= Math.min(
          chaser.maxCatchUp,
          1 + (leadTiles - chaser.chaseLeadTiles) * chaser.catchUpPerTile,
        );
      } else if (leadTiles < chaser.mercyTiles) {
        speed *= chaser.mercyScale;
      }
      race.chaserX += speed * dt;
    }

    // 糖浆加速带：踩上去刷新冲刺时间，速度加成交给 updateCandyTimers。
    if (race.boost > 0) race.boost = Math.max(0, race.boost - dt);
    for (const zone of data.speedZones ?? []) {
      const player = this.player;
      if (
        player.centerX >= zone.x &&
        player.centerX <= zone.x + zone.w &&
        player.feetY >= zone.y - 4 &&
        player.feetY <= zone.y + zone.h + 12
      ) {
        race.boost = Math.max(race.boost, zone.boost ?? 1.1);
        if (!zone.seen) {
          zone.seen = true;
          this.audio.pickup(true);
          this.notify('踩到糖浆，冲一段！', 1400);
        }
      }
    }

    // 追兵与玩家之间的距离。负数就是已经被贴上。
    race.gapTiles = (this.player.x - (race.chaserX + 8)) / VIEW.TILE;
    if (!race.warned && race.gapTiles < TRICK_RACE.warnGapTiles) {
      race.warned = true;
      this.audio.error();
      this.notify('追兵快贴上后背了——别停。', 2200);
    }

    // 路况提示：分岔、糖浆、最后直道，各只出现一次。
    for (const hint of data.hints ?? []) {
      if (hint.shown || this.player.centerX < hint.at) continue;
      hint.shown = true;
      this.notify(hint.text, 2600);
    }

    if (race.gapTiles <= 0) this.catchTrickRace();
  }

  /** 被追上：先停半秒让糖纸浪压过来，然后糖被拿走、回到这户门口。 */
  catchTrickRace() {
    const race = this.race;
    if (!race || race.result) return;
    race.result = 'caught';
    // 这半秒里玩家不能再操作，画面、粒子和追兵继续走完。
    race.catchTimer = 0.6;
    this.damageFlash = 0.9;
    this.audio.death();
    this.input.releaseAll();
    this.player.vx = 0;
    this.player.vy = 0;
    this.particles.spawnDeathBurst(this.player.centerX, this.player.centerY, 'miasma');
    this.particles.spawnCandyBurst(this.player.centerX, this.player.centerY);
  }

  /** 跑到街尾：这一户的糖进袋，门上挂彩纸，回到街上。 */
  finishTrickRace() {
    const race = this.race;
    if (!race || race.result) return;
    const house = race.house;
    race.result = 'escaped';

    // 副本可以反复玩：同一户再逃一次，糖就再加一颗。
    const added = this.pouch.add(house.candyType, 1);
    this.session.trickCandies += added;
    this.session.trickTricks += 1;
    this.session.trickHouses[house.id] = 'trick';
    this.session.trickRaceHouse = null;
    this.race = null;

    this.audio.trick();
    this.audio.pickup(true);
    this.loadTheme('trick', 'trick', this.session);
    this.syncTrickHouseDevices();
    const device = this.getTrickHouseDevice(house.id);
    if (device) {
      device.flash = 1;
      this.particles.spawnCandyBurst(device.x, device.y - 30, {
        accent: house.candyAccent,
        count: 14,
      });
      this.particles.spawnSpark(device.x, device.y - 34, 18);
    }
    this.restoreStreetPosition(house, device, 26);
    this.persist();
    this.presentCandyReward(house, { added, mode: 'trick' });

    const reward = added ? `糖袋 +1 · ${house.candyName}。` : '糖袋满了，糖没能装进去。';
    this.notify(`${TRICK_RACE.escape}${house.trickLine} ${reward}`, 5600);
    this.checkTrickProgress();
  }

  /**
   * 眼前这扇门能不能走。糖纸街副本里只有两种：房间的后门、后巷的掉头口。
   * 离开单独用 X，不挂在 Q 或 E 上。
   */
  getTrickExitDevice() {
    if (this.mode !== 'trick' || this.state !== 'playing') return null;
    const device = this.getNearbyDevice();
    return device?.type === 'trickExit' || device?.type === 'trickRaceExit' ? device : null;
  }

  /** 按 X 的提示已经亮过一次了吗？HUD 靠它改文案。 */
  isTrickExitArmed(deviceId = this.getTrickExitDevice()?.id) {
    return Boolean(deviceId) && this.trickExitArm > 0 && this.trickExitArmDevice === deviceId;
  }

  /**
   * X：离开房间 / 掉头回街上。
   *
   * 第一下只是把手按在门上，2.6 秒内再按一下才真的走：离开这一关不可逆，
   * 不该由一次走神决定。走开或换一扇门，要重新按两下。
   */
  requestTrickExit() {
    const device = this.getTrickExitDevice();
    if (!device) {
      this.notify('附近没有能走的门。', 1400);
      return;
    }
    if (this.isTrickExitArmed(device.id)) {
      this.trickExitArm = 0;
      this.trickExitArmDevice = null;
      if (device.type === 'trickRaceExit') this.quitTrickRace();
      else this.leaveTrickRoom();
      return;
    }
    this.trickExitArm = 2.6;
    this.trickExitArmDevice = device.id;
    this.notify(
      device.type === 'trickRaceExit' ? '再按一次 X，掉头回街上。' : '再按一次 X，回糖纸街。',
      2000,
    );
  }

  /**
   * 任务面板上的「退出任务」：不必走回门口，手机上也一样。
   *
   * 房间任务直接回到街上（房间里的进度作废，和从后门走一样）；
   * 屋顶追月把记号退回第一道，人和糖都留在原地；
   * 后巷竞速掉头回街上。谜题面板有自己的「先离开」，不在这里。
   */
  exitTrickTask() {
    if (this.state !== 'playing') return;
    if (this.race && !this.race.result) {
      this.quitTrickRace();
      return;
    }
    if (this.mode !== 'trick') return;
    if (this.session.trickRoom) {
      this.leaveTrickRoom();
      return;
    }
    const house = getTrickHouse(this.session.trickActiveHouse);
    if (!house) return;
    if (house.task.type === 'chase') {
      const task = this.getTrickTaskForHouse(house.id);
      if (task) {
        task.running = false;
        task.markIndex = 0;
        task.progress = 0;
        task.timeLeft = task.timeLimit ?? 30;
        if (task.guard) {
          task.guard.x = (task.guard.left + task.guard.right) / 2;
          task.guard.dir = 1;
        }
      }
    }
    this.session.trickActiveHouse = null;
    this.syncTrickHouseDevices();
    this.accumulator = 0;
    this.audio.panel(false);
    this.persist();
    this.notify('你把这一户的活儿先放下了。糖还在他们手里。', 2800);
  }

  /** 掉头从后门回街上：不拿糖，这一户保持原样。 */
  quitTrickRace() {
    if (!this.race || this.race.result) return;
    this.trickExitArm = 0;
    this.trickExitArmDevice = null;
    const house = this.race.house;
    this.race.result = 'quit';
    this.returnFromTrickRace(house, 'quit');
  }

  /** 竞速结束（被追上或主动放弃）后回到这户门口。 */
  returnFromTrickRace(house, result) {
    this.session.trickRaceHouse = null;
    this.race = null;
    this.loadTheme('trick', 'trick', this.session);
    this.syncTrickHouseDevices();
    const device = this.getTrickHouseDevice(house.id);
    this.restoreStreetPosition(house, device, -28);
    this.persist();
    if (result === 'caught') {
      this.notify(
        `被${house.name}追上了。${house.candyName}被拿了回去，这一户留到下一趟。`,
        5200,
      );
    } else {
      this.notify(TRICK_RACE.quit, 3200);
    }
  }

  /** 从任何一张小地图回到糖纸街时，把玩家放回这一户门口。 */
  restoreStreetPosition(house, device, offset = 26) {
    const x = device ? device.x + offset : house.tile * VIEW.TILE + offset;
    const groundY = device ? device.y : TRICK_GROUND_Y;
    this.player.reset(x, groundY - this.player.h);
    this.player.vx = 0;
    this.player.vy = 0;
    this.session.checkpoint = { x, y: groundY - this.player.h };
    this.camera.x = 0;
    this.camera.y = 0;
    this.updateCamera(STEP, true);
    this.accumulator = 0;
    this.setState('playing');
  }

  enterTrickRoom(house) {
    if (!house) return;
    this.session.trickRoom = house.task.room;
    this.session.trickActiveHouse = house.id;
    this.session.trickDoorHouse = null;
    this.loadTheme(house.task.levelId, 'trick', this.session);
    this.session.trickRoom = house.task.room;
    this.session.trickActiveHouse = house.id;
    this.session.checkpoint = { x: this.level.spawn.x, y: this.level.spawn.y };
    this.setState('playing');
    this.persist();
    this.notify(house.taskTitle, 3000);
  }

  /** 从房间回到街上；后门随时可用，任务没做完也可以走。 */
  leaveTrickRoom({ silent = false } = {}) {
    if (this.mode !== 'trick' || !this.session.trickRoom) return;
    this.trickExitArm = 0;
    this.trickExitArmDevice = null;
    const room = this.session.trickRoom;
    const house = getTrickHouseByRoom(room);
    this.session.trickRoom = null;
    this.session.trickActiveHouse = null;
    this.loadTheme('trick', 'trick', this.session);
    this.session.trickRoom = null;
    this.session.trickActiveHouse = null;
    this.syncTrickHouseDevices();

    if (house) {
      const device = this.getTrickHouseDevice(house.id);
      if (device) {
        this.player.reset(device.x - 28, device.y - this.player.h);
        this.session.checkpoint = {
          x: device.x - 28,
          y: device.y - this.player.h,
        };
      }
    }
    this.updateCamera(STEP, true);
    this.setState('playing');
    this.persist();
    if (!silent) this.notify(TRICK_ROUTE.roomLeave, 2400);
  }

  /** 房间任务走到头：把这一户的固定糖装进糖袋，然后回到街上。 */
  finishTrickRoomTask() {
    const room = this.session.trickRoom;
    const house = getTrickHouseByRoom(room);
    if (!house) return;
    this.completeTrickTask(house, 'help', { silent: true });
    this.leaveTrickRoom({ silent: true });
    this.notify(house.success, 4600);
  }

  getTrickHouseDevice(houseId) {
    return (
      this.level.devices?.find(
        (device) => device.type === 'candyDoor' && device.houseId === houseId,
      ) ?? null
    );
  }

  getTrickTaskForHouse(houseId) {
    return (
      this.level.trickTasks?.find((task) => task.houseId === houseId) ?? null
    );
  }

  syncTrickHouseDevices() {
    if (this.level.id !== 'trick') return;
    for (const device of this.level.devices ?? []) {
      if (device.type !== 'candyDoor') continue;
      const state = this.session.trickHouses[device.houseId] ?? null;
      device.done = Boolean(state);
      device.helped = state === 'help';
      device.tricked = state === 'trick';
      device.active = this.session.trickActiveHouse === device.houseId;
    }
  }

  /**
   * 这一户的固定糖，以及糖袋满了的情况。捣蛋不再走这里。
   * 副本是独立的小副本，可以反复玩：同一户做几遍，糖就往袋里加几颗。
   */
  completeTrickTask(house, mode = 'help', { silent = false } = {}) {
    if (!house) return;
    const device = this.getTrickHouseDevice(house.id);

    const added = this.pouch.add(house.candyType, 1);
    this.session.trickCandies += added;
    this.session.trickHouses[house.id] = 'help';
    if (this.session.trickActiveHouse === house.id) {
      this.session.trickActiveHouse = null;
    }
    if (device) {
      device.done = true;
      device.helped = true;
      device.tricked = false;
      device.active = false;
      device.flash = 1;
    }
    // 这一户可以再来一次：屋顶的月亮记号退回第一个；谜题在 solveTrickPuzzle 里重新洗过。
    if (house.task.type === 'chase') {
      const task = this.getTrickTaskForHouse(house.id);
      if (task) {
        task.running = false;
        task.markIndex = 0;
        task.progress = 0;
        task.timeLeft = task.timeLimit ?? 30;
      }
    }
    this.session.checkpoint = {
      x: house.tile * VIEW.TILE + 26,
      y: TRICK_GROUND_Y - this.player.h,
    };
    this.audio.checkpoint();
    this.audio.pickup(false);
    if (device) {
      this.particles.spawnCandyBurst(device.x, device.y - 30, {
        accent: house.candyAccent,
        count: 14,
      });
      this.particles.spawnSpark(device.x, device.y - 34, 18);
    }
    this.persist();
    this.presentCandyReward(house, { added, mode });
    if (!silent) {
      this.notify(
        added
          ? house.success
          : `糖袋满了，${house.candyName}没能装进去。这一户的任务已经完成了。`,
        4600,
      );
    }
    this.checkTrickProgress();
  }

  checkTrickProgress() {
    const resolved = Object.keys(this.session.trickHouses ?? {}).length;
    if (resolved < TRICK_HOUSES.length) return;
    if (this.session.trickAllDoneNotified) return;
    this.session.trickAllDoneNotified = true;
    this.audio.checkpoint();
    this.notify('十户都走过了。街尾的门一直开着。', 3200);
  }

  /**
   * 一颗糖落进糖袋：把这一户、这颗糖和袋里现在的数报给界面。
   * 提示条只说故事，这里负责把「拿到了什么」做大。
   */
  presentCandyReward(house, { added = 0, mode = 'help' } = {}) {
    if (!house) return;
    this.onCandyReward?.({
      mode,
      type: house.candyType,
      name: house.candyName,
      tag: house.candyTag,
      glyph: house.candyGlyph,
      accent: house.candyAccent,
      houseName: house.name,
      houseTitle: house.title,
      added,
      total: this.pouch.total,
    });
  }

  /** 任务的当前进度。 */
  getTrickTaskProgress(task) {
    if (!task) return { progress: 0, need: 0, ratio: 0, text: '' };
    const pumpkins = (this.pumpkins?.pumpkins ?? []).filter(
      (pumpkin) => !pumpkin.carrier,
    );

    if (task.kind === 'break') {
      return {
        progress: task.broken ? 1 : 0,
        need: 1,
        ratio: task.broken ? 1 : 0,
        text: task.broken ? '裂石碎了' : '把南瓜扔向裂石',
      };
    }

    if (task.kind === 'chase') {
      const step = task.markIndex ?? 0;
      const need = task.need ?? 5;
      const seconds = Math.max(0, Math.ceil(task.timeLeft ?? 0));
      return {
        progress: step,
        need,
        ratio: need > 0 ? step / need : 0,
        text: task.running
          ? `月亮记号 ${step}/${need} · ${seconds}s`
          : step > 0
            ? `月亮记号 ${step}/${need}`
            : '从街面跳上第一级屋顶',
      };
    }

    if (task.kind === 'reach') {
      const inZone = task.zones.some(
        (zone) =>
          this.player.centerX >= zone.x &&
          this.player.centerX <= zone.x + zone.w &&
          this.player.centerY >= zone.y &&
          this.player.centerY <= zone.y + zone.h,
      );
      return {
        progress: inZone ? 1 : 0,
        need: 1,
        ratio: inZone ? 1 : 0,
        text: inZone ? '到了' : '跳到记号旁边',
      };
    }

    if (task.kind === 'plates') {
      let count = 0;
      for (const plate of task.plates) {
        const occupied = pumpkins.some(
          (pumpkin) =>
            pumpkin.x + pumpkin.w / 2 >= plate.x &&
            pumpkin.x + pumpkin.w / 2 <= plate.x + plate.w &&
            Math.abs(pumpkin.y + pumpkin.h - (plate.y + plate.h)) < 18,
        );
        plate.occupied = occupied;
        if (occupied) count += 1;
      }
      return {
        progress: count,
        need: task.need,
        ratio: task.need > 0 ? count / task.need : 0,
        text: `盘子 ${count}/${task.need}`,
      };
    }

    const count = pumpkins.filter((pumpkin) =>
      task.zones.some((zone) => {
        const cx = pumpkin.x + pumpkin.w / 2;
        const bottom = pumpkin.y + pumpkin.h;
        return (
          cx >= zone.x &&
          cx <= zone.x + zone.w &&
          bottom >= zone.y - 54 &&
          bottom <= zone.y + zone.h + 10
        );
      }),
    ).length;
    return {
      progress: count,
      need: task.need,
      ratio: task.need > 0 ? Math.min(1, count / task.need) : 0,
      text: `${count}/${task.need}`,
    };
  }

  /** 每帧更新街上的任务：狼人的屋顶追月，以及旧短任务的兼容分支。 */
  updateTrickTasks(dt) {
    if (this.mode !== 'trick' || this.session.trickRoom) return;
    for (const device of this.level.devices ?? []) {
      if (device.type === 'candyDoor' && device.flash > 0) {
        device.flash = Math.max(0, device.flash - dt);
      }
    }

    for (const task of this.level.trickTasks ?? []) {
      task.active = this.session.trickActiveHouse === task.houseId;
      if (!task.active) continue;

      if (task.kind === 'break' && !task.broken) {
        const hit = (this.pumpkins?.pumpkins ?? []).some(
          (pumpkin) =>
            !pumpkin.carrier &&
            pumpkin.x + pumpkin.w > task.target.x &&
            pumpkin.x < task.target.x + task.target.w &&
            pumpkin.y + pumpkin.h > task.target.y &&
            pumpkin.y < task.target.y + task.target.h,
        );
        if (hit) {
          task.broken = true;
          this.audio.land(180);
          this.particles.spawnDust(
            task.target.x + task.target.w / 2,
            task.target.y + task.target.h / 2,
            0,
            10,
          );
          this.notify('裂石碎了。', 1800);
        }
      }

      if (task.kind === 'chase') {
        const result = this.updateChaseTask(task, dt);
        if (result === 'complete') {
          const house = getTrickHouse(task.houseId);
          if (house) this.completeTrickTask(house, 'help');
          return;
        }
      }

      const progress = this.getTrickTaskProgress(task);
      task.progress = progress.progress;
      if (progress.need > 0 && progress.progress >= progress.need) {
        const house = getTrickHouse(task.houseId);
        if (house) this.completeTrickTask(house, 'help');
        return;
      }
    }
  }

  /** 狼人的屋顶追月：按顺序踩月亮记号，掉回街面或超时就重来。 */
  chaseZoneAt(zone) {
    if (!zone) return false;
    return (
      this.player.centerX >= zone.x &&
      this.player.centerX <= zone.x + zone.w &&
      this.player.centerY >= zone.y &&
      this.player.centerY <= zone.y + zone.h
    );
  }

  updateChaseTask(task, dt) {
    // 阿嚎一直在自己那条屋脊上来回走，没开跑的时候也在走。
    this.moveChaseGuard(task, dt);
    if (!task.running) {
      const first = task.zones?.[0];
      if (this.chaseZoneAt(first)) {
        task.running = true;
        task.timeLeft = task.timeLimit ?? 30;
        task.markIndex = 1;
        task.progress = 1;
        this.audio.checkpoint();
        this.particles.spawnSpark(first.x + first.w / 2, first.y + first.h / 2, 14);
        this.notify(
          `月亮记号 1/${task.need}。月亮开始落了——踩完屋顶上的记号，别碰上${task.house?.name ?? '阿嚎'}。`,
          3200,
        );
      }
      return null;
    }

    task.timeLeft = Math.max(0, task.timeLeft - dt);
    if (task.timeLeft <= 0) {
      this.resetChaseTask(task, '月亮落下去了。屋顶的记号重新开始。');
      return null;
    }

    // 撞进阿嚎怀里：它把人在屋脊上按一下，记号全废，回到街面重来。
    if (this.chaseGuardCatches(task)) {
      this.resetChaseTask(
        task,
        `${task.house?.name ?? '阿嚎'}把你从屋脊上扑了下来。月亮记号重新开始。`,
      );
      return null;
    }

    for (let index = task.markIndex + 1; index < task.zones.length; index += 1) {
      if (this.chaseZoneAt(task.zones[index])) {
        this.resetChaseTask(task, '记号要按顺序踩。月亮记号重新开始。');
        return null;
      }
    }

    const next = task.zones[task.markIndex];
    if (this.chaseZoneAt(next)) {
      task.markIndex += 1;
      task.progress = task.markIndex;
      this.particles.spawnSpark(next.x + next.w / 2, next.y + next.h / 2, 12);
      if (task.markIndex >= task.need) {
        task.running = false;
        this.audio.checkpoint();
        return 'complete';
      }
      this.audio.checkpoint();
      this.notify(
        `月亮记号 ${task.markIndex}/${task.need} · 还剩 ${Math.ceil(task.timeLeft)} 秒。`,
        1800,
      );
      return null;
    }

    // 从屋顶掉回街面：记号作废，回到第一级下面重来。
    if (this.player.onGround && this.player.feetY >= TRICK_GROUND_Y - 6) {
      this.resetChaseTask(task, '你从屋顶掉了下来。月亮记号重新开始。');
    }
    return null;
  }

  /** 守着屋脊的阿嚎：在左右两个端点之间来回走，走到头就折返。 */
  moveChaseGuard(task, dt) {
    const guard = task.guard;
    if (!guard) return;
    guard.x += guard.dir * guard.speed * dt;
    if (guard.x <= guard.left) {
      guard.x = guard.left;
      guard.dir = 1;
    } else if (guard.x >= guard.right) {
      guard.x = guard.right;
      guard.dir = -1;
    }
  }

  /** 人和阿嚎的身体有没有叠在一起。判断框比画上的狼窄一圈，擦身而过不算被扑。 */
  chaseGuardCatches(task) {
    const guard = task.guard;
    if (!guard) return false;
    return (
      this.player.x + this.player.w > guard.x - 9 &&
      this.player.x < guard.x + 9 &&
      this.player.y + this.player.h > guard.y - 32 &&
      this.player.y < guard.y
    );
  }

  resetChaseTask(task, message) {
    task.running = false;
    task.markIndex = 0;
    task.progress = 0;
    task.timeLeft = task.timeLimit ?? 30;
    // 阿嚎也回到屋脊中间，下一次重来面对的是同一条路线。
    if (task.guard) {
      task.guard.x = (task.guard.left + task.guard.right) / 2;
      task.guard.dir = 1;
    }
    this.audio.death();
    if (task.start) {
      this.player.reset(task.start.x, task.start.y);
      this.player.vx = 0;
      this.player.vy = 0;
      this.camera.x = 0;
      this.camera.y = 0;
      this.updateCamera(STEP, true);
    }
    this.accumulator = 0;
    this.notify(message, 3200);
  }

  /** 门前提示与可用状态，HUD 与交互提示共用。 */
  getCandyDoorPrompt(device) {
    if (!device) return '';
    const house = getTrickHouse(device.houseId);
    if (device.active || this.session.trickActiveHouse === device.houseId) {
      return `继续 · ${house?.taskTitle ?? '这户的任务'}`;
    }
    // 副本可以反复玩：帮过、捣过蛋的门再敲一次，照样给一颗糖。
    if (device.done) return '再敲一次 · 还能拿一颗';
    return `敲门 · 看看是谁`;
  }

  checkCarriage(carriage) {
    if (this.level.stage !== 1) return;
    const session = this.session;
    const trigger = getMemorialChapter(1)?.trigger;

    if (!session.carriageQuest) {
      this.notify('南瓜车锁着。你刚看过了。', 1800);
      return;
    }

    session.carriageQuest = null;
    session.carriageAlarm = false;
    session.carriageHopTimer = 0;
    session.memorialNext = randomBetween(trigger?.interval ?? [5, 5]);
    this.audio.checkpoint();
    this.particles.spawnSpark(carriage.x, carriage.y - 20, 10);
    this.notify(trigger?.success ?? '锁好了。南瓜车不会自己跑掉。', 2400);
  }

  /** 敲响石鼓，让这一段的新客人加入队伍。 */
  joinParade(device) {
    if (this.mode !== 'parade') return;
    if (device.joined) {
      this.notify('石鼓已经敲过了。', 1800);
      return;
    }

    device.joined = true;
    const joined = [];
    for (const id of device.yokaiIds ?? []) {
      const member = this.addParadeMember(id);
      if (member) joined.push(member);
    }
    if (!joined.length) {
      const lost = (device.yokaiIds ?? []).some((id) =>
        (this.session.paradeLost ?? []).includes(id),
      );
      this.notify(
        lost
          ? '这位客人已经留在夜里了。'
          : '这一位已经在队伍里了。',
        2600,
      );
      return;
    }

    const last = joined[joined.length - 1];
    this.particles.spawnSpark(device.x, device.y - 28, 16);
    this.particles.spawnSpark(last.centerX, last.centerY, 10);
    // 石鼓是敲出来的，不是走出来的：这一下用鼓声，而不是普通的通过音。
    this.audio.drum();
  }

  getNearbyDevice() {
    return this.level.getNearbyDevice(this.player.bounds);
  }

  /** 队伍里任何一位同行者靠近装置，都算「身边有装置」。 */
  getNearbyParadeDevice() {
    for (const member of this.members) {
      const device = this.level.getNearbyDevice(member.bounds);
      if (device) return device;
    }
    return null;
  }

  /** 这一局此刻是否正被惊恐发作接管：这段时间只认空格呼吸。 */
  isPanicActive() {
    return (
      this.mode === 'memorial' &&
      this.state === 'playing' &&
      Boolean(this.session?.memorialPanic)
    );
  }

  /**
   * 手机上的单个互动键要挑一件事做：身边有装置、手上却空着时先摸装置，
   * 其余情况仍然交给 E 的抱 / 抛。
   */
  shouldUseDevice() {
    if (this.state !== 'playing' || this.isPanicActive()) return false;
    if (this.pumpkins?.getCarried(this.player)) return false;
    const device =
      this.mode === 'parade'
        ? this.getNearbyParadeDevice()
        : this.isSneakStage()
          ? null
          : this.getNearbyDevice();
    if (!device) return false;
    // 装置旁边还落着一颗能抱的南瓜时，仍然优先抱起它。
    return !this.pumpkins?.findNearby(this.player);
  }

  getNearbyBoneSlot() {
    const device = this.getNearbyDevice();
    return device?.type === 'boneSlot' ? device : null;
  }

  getPlacementStation() {
    const station = this.getNearbyBoneSlot();
    return station && !station.solved ? station : null;
  }

  placeBone(type) {
    if (this.state !== 'inventory') {
      return { ok: false, message: '先打开背包。' };
    }

    const station = this.getPlacementStation();
    if (!station) {
      return { ok: false, message: '这里没有等待填放的骨槽。' };
    }

    const count = this.session.boneTypes[type] ?? 0;
    if (count <= 0) {
      return { ok: false, message: '背包里没有这种骨头。' };
    }

    if (type !== 'rightHand') {
      this.audio.error();
      return { ok: false, message: '骨槽不收这块骨头。它只认右手骨。' };
    }

    const field = this.level.fieldZones.find((zone) => zone.id === station.fieldId);
    if (!field) {
      return { ok: false, message: '骨槽没有对准任何场。' };
    }

    station.solved = true;
    station.placedType = type;
    this.session.boneTypes.rightHand = Math.max(0, this.session.boneTypes.rightHand - 1);
    this.session.rightHandBones = Math.max(0, this.session.rightHandBones - 1);

    field.b.dir = field.e.dir === 'down' ? 'in' : 'out';
    const target = field.b.dir === 'in' ? '纸内 ⊗' : '纸外 ⊙';
    this.audio.calibrate();
    this.particles.spawnElectric(station.x, station.y - 22, 12);
    this.closeBackpack();
    this.notify(`右手骨嵌进骨槽。${field.label} 的 B 已对齐到${target}。`, 3000);
    this.persist();
    return { ok: true, message: '校准完成' };
  }

  /**
   * 第一段开场：南瓜车从墓园外慢慢驶入，车上的几句独白把这一夜的来由讲完，
   * 车停稳后玩家从车上下来。返回 true 表示仍在演出中，此时不结算玩家物理与
   * 路上的行为。
   */
  updateCarriageIntro(dt) {
    if (this.mode !== 'memorial' || this.level.stage !== 1) return false;
    const session = this.session;
    if (!(session.carriageIntro > 0)) return false;

    const carriage = this.level.devices.find((device) => device.type === 'carriage');
    if (!carriage) {
      session.carriageIntro = 0;
      return false;
    }

    const opening = getMemorialChapter(1)?.opening ?? {};
    const total = session.carriageIntroTotal || opening.total || 2.4;
    // 提前下车后车程已经结束，但开场白还按原来的节奏往下播，玩家先自由行动。
    const narrating = session.carriageIntroSkipped;
    // 教程展开时，车停在原地，独白也停在当前这一句，等玩家读完再走。
    if (session.carriageTutorialOpen) {
      if (!narrating) return true;
      return false;
    }
    session.carriageIntro = Math.max(0, session.carriageIntro - dt);
    const elapsed = total - session.carriageIntro;

    if (!narrating) {
      // 车缓慢驶入：前面一段有速度，停稳后就不再晃。
      const drive = opening.driveTime ?? 1.5;
      const t = Math.min(1, elapsed / drive);
      const ease = 1 - (1 - t) ** 3;
      const fromX = carriage.x - 220;
      session.carriageX = fromX + (carriage.x - fromX) * ease;
      session.carriageRolling = elapsed < drive;
      this.input.clearPressed();

      // 车轴扬起的尘土，让缓慢驶入有速度感。
      if (session.carriageRolling) {
        session.carriageDustTimer -= dt;
        if (session.carriageDustTimer <= 0) {
          session.carriageDustTimer = 0.1;
          this.particles.spawnDust(session.carriageX - 16, carriage.y, -1, 1);
          this.particles.spawnDust(session.carriageX + 16, carriage.y, -1, 1);
        }
      }
    }

    // 车上的开场白写在画面正上方，由界面层按 beat 显示；这里只记走到第几句。
    const beats = opening.beats ?? [];
    while (
      session.carriageBeatIndex < beats.length &&
      elapsed >= beats[session.carriageBeatIndex].at
    ) {
      session.carriageBeatIndex += 1;
    }

    if (session.carriageRiding && elapsed >= (opening.alightAt ?? 1.6)) {
      this.alightFromCarriage(carriage);
    }

    if (session.carriageIntro <= 0) {
      this.finishCarriageIntro(carriage);
    }
    return !narrating;
  }

  /** 从车上下来，落到车门右侧。重复调用不会把玩家再挪一次。 */
  alightFromCarriage(carriage) {
    const session = this.session;
    if (!session.carriageRiding) return;
    session.carriageRiding = false;
    session.carriageRolling = false;
    session.carriageX = carriage.x;

    const player = this.player;
    player.x = carriage.x + 24;
    player.y = carriage.y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.onGround = true;
    player.autoJumping = false;
    player.crouching = false;
    this.audio.land(140);
    this.particles.spawnDust(player.centerX, player.feetY, 1, 5);
  }

  /** 结束开场演出，把操控交回玩家，并提示这一段的路。 */
  finishCarriageIntro(carriage) {
    const session = this.session;
    this.alightFromCarriage(carriage);
    session.carriageIntro = 0;
    session.carriageIntroTotal = 0;
    session.carriageRolling = false;
    session.carriageIntroSkipped = false;
    session.carriageX = carriage.x;
    session.carriageIntroSeen = true;
    session.carriageTutorialOpen = false;
    // 从落地开始重新计时，5 秒后才冒出第一句「回去看看」。
    session.memorialNext = 5;
  }

  /** 开场南瓜派教程：展开时停住车程（提前下车后停住独白），收起后接着走。 */
  setOpeningTutorialOpen(open) {
    if (this.mode !== 'memorial' || this.level.stage !== 1) return;
    if (!(this.session.carriageIntro > 0)) return;
    this.session.carriageTutorialOpen = Boolean(open);
  }

  /**
   * 坐车时按 Q 直接下车；开头几秒不接受，免得开场就误跳过独白。
   * 提前下车只是结束车程，剩下几句开场白继续播，不影响后面的文字。
   */
  skipCarriageIntro() {
    if (this.mode !== 'memorial' || this.level.stage !== 1) return false;
    const session = this.session;
    if (!(session.carriageIntro > 0)) return false;
    const opening = getMemorialChapter(1)?.opening;
    const elapsed = session.carriageIntroTotal - session.carriageIntro;
    if (elapsed < (opening?.skipAfter ?? 4.5)) return false;
    const carriage = this.level.devices.find((device) => device.type === 'carriage');
    if (!carriage) return false;
    // 已经站在地上时再按 Q，就是把剩下的独白收掉。
    if (!session.carriageRiding) {
      this.finishCarriageIntro(carriage);
      return true;
    }
    // 提前下车只结束车程：人先落地，开场白照旧按自己的节奏播完，不跟着断掉。
    session.carriageIntroSkipped = true;
    session.carriageTutorialOpen = false;
    this.alightFromCarriage(carriage);
    return true;
  }

  /**
   * 身边的故事路牌：每段路上五块，一块一句，中文在上、英文在下。
   * 只认横向距离，玩家站在台阶上也能读。
   */
  getNearbySign() {
    if (this.mode !== 'memorial') return null;
    const chapter = getMemorialChapter(this.level.stage);
    if (!chapter?.roadSigns?.length) return null;
    const signs = this.level.decorations.filter(
      (decoration) => decoration.type === 'sign' && decoration.story,
    );
    if (!signs.length) return null;
    const x = this.player.centerX;
    let best = null;
    let bestDistance = Infinity;
    for (const sign of signs) {
      const distance = Math.abs(sign.x - x);
      if (distance > 30 || distance >= bestDistance) continue;
      best = sign;
      bestDistance = distance;
    }
    if (!best) return null;
    const line = chapter?.roadSigns?.[best.signIndex];
    if (!line) return null;
    return {
      id: best.signId,
      index: best.signIndex,
      total: chapter.roadSigns.length,
      x: best.x,
      cn: line.cn,
      en: line.en,
    };
  }

  /** 读路牌：停在原地，把这一句摊开给玩家看。 */
  openSign() {
    if (this.state !== 'playing') return false;
    // 开场车程里先专心看开场白，路牌等下车再读；提前下车后就不拦了。
    if (this.mode === 'memorial' && this.session.carriageIntro > 0 && !this.session.carriageIntroSkipped) {
      return false;
    }
    const sign = this.getNearbySign();
    if (!sign) {
      this.notify('身边没有路牌。', 1400);
      return false;
    }
    this.session.readingSign = sign;
    this.session.readSigns.add(sign.id);
    this.audio.panel(true);
    this.setState('sign');
    return true;
  }

  closeSign() {
    if (this.state !== 'sign') return;
    this.session.readingSign = null;
    this.accumulator = 0;
    this.audio.panel(false);
    this.setState('playing');
  }

  toggleSign() {
    if (this.state === 'sign') {
      this.closeSign();
      return true;
    }
    return this.openSign();
  }

  update(dt) {
    this.session.time += dt;
    this.trickExitArm = Math.max(0, this.trickExitArm - dt);
    this.introFlash = Math.max(0, this.introFlash - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.respawnGrace = Math.max(0, this.respawnGrace - dt);
    // 刚穿过门时，新地图上还留一层暖光，慢慢退掉。
    this.session.portalFlash = Math.max(0, (this.session.portalFlash ?? 0) - dt);

    // 站在门里的一瞬间：只让镜头、粒子和光效继续，玩法停住。
    if (this.updateDoorEntry(dt)) return;

    // 后巷竞速被追上的半秒：灯和糖纸浪压过来，不接受操作。
    if (this.race?.catchTimer > 0) {
      this.race.catchTimer -= dt;
      this.particles.update(dt);
      this.updateCamera(dt);
      if (this.race.catchTimer <= 0) {
        const house = this.race.house;
        this.returnFromTrickRace(house, 'caught');
      }
      return;
    }

    // 第三段的双人潜行有自己的一整套循环：两个玩家、灯、石板门、影子桥。
    if (this.isSneakStage()) {
      updateSneak(this, dt);
      this.updateShoeFollowers(dt);
      return;
    }

    this.updateCandyTimers(dt);
    // 第一段开场：南瓜车驶入、玩家下车。这段时间不接管操控。
    if (this.updateCarriageIntro(dt)) {
      this.updateCamera(dt);
      this.particles.update(dt);
      return;
    }
    this.updateMemorialTimers(dt);
    if (this.mode === 'parade') {
      // 一套按键，所有同行者一起走。每个人拿到一份自己的「刚按下」副本，
      // 否则第一位同行者会把跳跃事件消费掉，后面的人就听不见号令。
      this.session.paradeTeamSmashContact = null;
      for (const member of this.members) {
        member.update(dt, this.input.fork(), this.level);
        if (member.inUpdraft && Math.random() < dt * 9) {
          this.particles.spawnBubble(
            member.centerX + (Math.random() - 0.5) * 6,
            member.centerY,
            1,
            4,
          );
        }
      }
      this.input.clearPressed();
      this.updateTeamSmash(dt);
      if (this.player.inWater && !this.session.waterTipShown) {
        this.session.waterTipShown = true;
        this.notify(
          '水里不能起跳：按住 ↑ 划水，贴近水面按跳；贴住岸边按方向键也能爬上去。',
          5200,
        );
      }
      if (
        this.player.inWater &&
        !this.session.diveTipShown &&
        ((this.level.stage === 3 &&
          this.player.centerX > 52 * VIEW.TILE &&
          this.player.centerX < 58 * VIEW.TILE) ||
          (this.level.stage === 4 &&
            this.player.centerX > 32 * VIEW.TILE &&
            this.player.centerX < 36 * VIEW.TILE))
      ) {
        this.session.diveTipShown = true;
        this.notify(
          this.level.stage === 3
            ? '石桥压在水面上。潜下去，从桥洞里过去。'
            : '石梁塌在水面上。潜到水底，从下面过去。',
          4200,
        );
      }
      if (
        this.level.stage === 6 &&
        !this.session.glideComboTipShown &&
        this.members.some((member) => member.yokaiId === 'witch') &&
        this.player.centerX > 70 * VIEW.TILE
      ) {
        this.session.glideComboTipShown = true;
        this.notify(
          '先跳、松开 ↑、再按 ↑ 二段跳；然后按住 ↑，全队借扫帚滑翔。',
          6000,
        );
      }
    } else {
      this.player.update(dt, this.input, this.level);
    }
    // 地上的南瓜：推、抛、叠高，以及把玩家稳稳接在南瓜顶上。
    // 魑魅魍魉里整支队伍都参与推挤；其它线路只有主角。
    this.pumpkins.update(dt, this.members);
    // 第二段的集合门：把这一座庭院的每颗元素都搬进正确的集合区域。
    if (this.level.setGates?.length) updateSetGates(this, dt);
    this.updateCandyActions(dt);
    this.updateMemorialActions(dt);
    this.updateCarriageAlarm(dt);
    // 身后那几双鞋沿着刚走过的路跟住；必须在玩家物理之后采样。
    this.updateShoeFollowers(dt);
    this.updateCamera(dt);
    this.particles.update(dt);

    const walked = this.player.onGround ? Math.abs(this.player.vx) * dt : 0;
    this.session.distance += walked;
    // 只有追思小径会磨鞋；其它线路不累计磨损。
    if (this.mode === 'memorial') {
      this.shoeDistance += walked;
      this.player.shoeFit = this.getShoeFit();
    }

    this.collectPickups();
    this.updateMemorialMemories();
    this.updateMemorialSolaces();
    this.updateCheckpoints();
    this.updatePumpkinHints();
    this.updateTutorial(dt);
    if (this.mode === 'trick' && !this.session.trickRoom) this.updateTrickTasks(dt);
    if (this.mode === 'trick' && this.race) this.updateTrickRace(dt);
    this.updateHazards();
    this.updateGoal();
  }

  collectPickups() {
    const player = this.player;
    const session = this.session;
    // 磁力糖：把自动拾取的圈子放大。平时还是贴得很近才捡到。
    const magnet = player.effectMods?.magnet ?? 0;
    const reachX = Math.max(10, magnet);
    const reachY = Math.max(15, magnet * 0.8);
    let picked = false;
    for (const pickup of this.activePickups) {
      if (pickup.collected) continue;

      // 少数最难的时装零件被一层「糖光」护着：只有对应的增益糖生效时才拿得到。
      // 没吃糖也能靠近看，但会在旁边提示还差哪一种糖。
      if (pickup.requiresBuff && !session.candyEffects[pickup.requiresBuff]) {
        const near =
          Math.abs(pickup.x - player.centerX) < 42 &&
          Math.abs(pickup.y - player.centerY) < 48;
        if (near && session.time - (pickup.lockHintAt ?? -99) > 5) {
          pickup.lockHintAt = session.time;
          const buff = getCandyEffect(pickup.requiresBuff);
          const buffName = buff?.name ?? '对应增益糖';
          const hasInPouch = (this.pouch?.get?.(pickup.requiresBuff) ?? 0) > 0;
          this.notify(
            hasInPouch
              ? `零件被一层糖光护着。打开背包，在糖袋里吃一颗${buffName}才能拿。`
              : `零件被一层糖光护着。需要${buffName}——去糖纸街换一颗，再带回来。`,
            3200,
          );
        }
        continue;
      }

      if (
        Math.abs(pickup.x - player.centerX) < reachX &&
        Math.abs(pickup.y - player.centerY) < reachY
      ) {
        pickup.collected = true;
        picked = true;
        const def = getItemDef(pickup.type);
        session.collected[pickup.type] = (session.collected[pickup.type] ?? 0) + 1;

        if (def.category === 'bone') {
          session.bones += 1;
          session.bonesPicked = (session.bonesPicked ?? 0) + 1;
          session.boneTypes[pickup.type] = (session.boneTypes[pickup.type] ?? 0) + 1;
          if (pickup.type === 'rightHand') {
            session.rightHandBones += 1;
            this.notify('拾取：右手骨。可以在骨槽前打开背包，把它放进去。', 2600);
          } else if (pickup.type === 'leftHand') {
            this.notify('拾取：左手骨。骨槽不收它，但骷髅时装需要它。', 2400);
          } else {
            this.notify(`拾取：${def.label} +1`, 1400);
          }
          this.audio.pickup(pickup.type === 'rightHand');
          this.particles.spawnBoneBurst(pickup.x, pickup.y);
        } else if (def.category === 'candy') {
          session.candies += 1;
          session.candiesPicked = (session.candiesPicked ?? 0) + 1;
          session.candyTypes[pickup.type] = (session.candyTypes[pickup.type] ?? 0) + 1;
          this.activateCandy(pickup.type);
          this.audio.pickup(false);
          this.particles.spawnCandyBurst(pickup.x, pickup.y);
        } else {
          const costume = COSTUME_BY_ID.get(def.costume);
          const rarity = getRarity(pickup.type);
          this.notify(
            `拾取零件：${def.label}（${rarity.label}）· ${costume?.name ?? '时装'}`,
            2200,
          );
          this.audio.pickup(true);
          this.particles.spawnPartBurst(pickup.x, pickup.y);
        }

        this.checkCostumeCompletion();
      }
    }
    if (picked) this.persist();
  }

  /**
   * 吃下一颗糖。同种糖再吃一颗会把持续时间叠上去（最多叠到两倍），
   * 不同种类的糖则同时存在，由 updateCandyTimers 逐项相乘。
   *
   * 路上捡到的糖纸和糖袋里的增益糖共用这套计时；
   * source = 'pouch' 时按线路换一个说法（整支队伍 / 两只鬼 / 你）。
   */
  activateCandy(type, { source = 'pickup' } = {}) {
    const effect = getCandyEffect(type);
    if (!effect) return false;

    const buff = isBuffCandy(type);
    const label = buff ? effect.name : getItemDef(type).label;
    const desc = buff
      ? effect.tag
      : `${effect.disorder}（${effect.code}）· ${effect.tag}`;
    const actor =
      source !== 'pouch'
        ? ''
        : this.mode === 'parade'
          ? '整支队伍'
          : this.isSneakStage()
            ? '你和回音'
            : '你';

    const session = this.session;
    const existing = session.candyEffects[type];
    if (existing) {
      existing.remaining = Math.min(effect.duration * 2, existing.remaining + effect.duration);
      this.notify(
        `${label}叠加 · ${buff ? '再延长' : `${effect.disorder}再延长`} ${effect.duration} 秒（共 ${Math.ceil(existing.remaining)} 秒）。`,
        2200,
      );
    } else {
      session.candyEffects[type] = {
        remaining: effect.duration,
        duration: effect.duration,
        elapsed: 0,
      };
      this.notify(
        `${actor}吃下${label} · ${desc} ${effect.duration} 秒。`,
        2600,
      );
    }

    // 新状态从短暂的缓冲后开始触发，避免一捡起来就立刻弹走。
    if (effect.autoJump) session.maniaNextJump = Math.min(session.maniaNextJump || 1, 0.6);
    if (effect.panic) session.panicNextDash = Math.min(session.panicNextDash || 1.2, 1.2);
    if (effect.lapse) {
      session.adhdNextLapse = Math.min(session.adhdNextLapse || 1, 1);
      session.adhdLapse = 0;
    }
    if (effect.tic) session.ticNext = Math.min(session.ticNext || 0.8, 0.8);
    if (effect.sleep) {
      session.sleepNext = Math.min(session.sleepNext || 3, 3);
      session.sleepRemaining = 0;
      session.sleeping = false;
    }
    if (effect.repeatJump) session.compulsionPending = false;

    // 从糖袋里吃：先咬开糖纸；路上捡到糖仍然用那声更亮的提示音。
    if (source === 'pouch') this.audio.eat();
    else this.audio.tutorialChime();
    return true;
  }

  /** 每帧先结算持续时间，算出这一帧的角色修正值。 */
  updateCandyTimers(dt) {
    const session = this.session;
    const effects = session.candyEffects;
    const mods = neutralEffectMods();

    session.panicGrace = Math.max(0, session.panicGrace - dt);
    session.sleeping = false;

    for (const [type, entry] of Object.entries(effects)) {
      entry.remaining -= dt;
      entry.elapsed = (entry.elapsed ?? 0) + dt;
      if (entry.remaining <= 0) {
        delete effects[type];
        const expired = getCandyEffect(type);
        if (expired) {
          this.notify(
            `${expired.kind === 'buff' ? expired.name : expired.disorder}消退了 · ${expired.tag}结束。`,
            1800,
          );
        }
        continue;
      }

      const effect = getCandyEffect(type);
      const effectMods = effect?.mods ?? {};
      mods.moveScale *= effectMods.moveScale ?? 1;
      mods.jumpVelocityScale *= effectMods.jumpVelocityScale ?? 1;
      mods.frictionScale *= effectMods.frictionScale ?? 1;
      mods.gravityScale *= effectMods.gravityScale ?? 1;
      mods.maxFallScale *= effectMods.maxFallScale ?? 1;
      mods.extraJumps += effectMods.extraJumps ?? 0;
      mods.magnet = Math.max(mods.magnet, effectMods.magnet ?? 0);
      if (effectMods.invertAxis) mods.invertAxis = true;
      if (effectMods.glide) mods.glide = true;
      if (effectMods.dash) mods.dash = true;
      if (effectMods.airDash) mods.airDash = true;
      if (effectMods.wallJump) mods.wallJump = true;
      if (effectMods.shield) mods.shield = true;
      if (effect?.flight) mods.flight = effect.flight;

      // 注意缺陷多动障碍：隔一阵走神半秒，方向输入暂时失效。
      if (effect?.lapse) {
        const lapse = effect.lapse;
        if (session.adhdLapse > 0) {
          session.adhdLapse = Math.max(0, session.adhdLapse - dt);
          if (session.adhdLapse > 0) mods.lockAxis = true;
        } else {
          session.adhdNextLapse -= dt;
          if (session.adhdNextLapse <= 0) {
            session.adhdNextLapse = randomBetween(lapse.interval);
            session.adhdLapse = lapse.duration;
            mods.lockAxis = true;
            this.particles.spawnElectric(this.player.centerX, this.player.centerY - 6, 2);
          }
        }
      }

      // 双相情感障碍：每 period 秒在高涨 / 低落之间切换。
      if (effect?.bipolar) {
        const { period, high, low } = effect.bipolar;
        const phase = Math.floor(entry.elapsed / period) % 2 === 0 ? 'high' : 'low';
        const phaseMods = phase === 'high' ? high : low;
        entry.phase = phase;
        mods.moveScale *= phaseMods.moveScale ?? 1;
        mods.jumpVelocityScale *= phaseMods.jumpVelocityScale ?? 1;
      }

      // 发作性睡病：隔几秒突然睡着，期间操作全部失效。
      if (effect?.sleep) {
        const sleep = effect.sleep;
        if (session.sleepRemaining > 0) {
          session.sleepRemaining = Math.max(0, session.sleepRemaining - dt);
          session.sleeping = true;
          mods.lockAxis = true;
          mods.lockJump = true;
        } else {
          session.sleepNext -= dt;
          if (session.sleepNext <= 0) {
            session.sleepNext = randomBetween(sleep.interval);
            session.sleepRemaining = sleep.duration;
            session.sleeping = true;
            mods.lockAxis = true;
            mods.lockJump = true;
            this.particles.spawnDust(this.player.centerX, this.player.feetY, 0, 2);
          }
        }
      }
    }

    // 状态消失后立刻清掉未兑现的强迫跳跃。
    if (!effects.lollipop) session.compulsionPending = false;

    // 后巷竞速：被追的人跑得比平时快；踩到糖浆再叠一段短冲刺。
    // 每一户的巷子可以自己定快多少（狼人巷里跑得最快）。
    if (this.mode === 'trick' && this.race) {
      const data = this.level?.race;
      mods.moveScale *= data?.playerSpeedScale ?? TRICK_RACE.playerSpeedScale;
      if (this.race.boost > 0) mods.moveScale *= data?.boostScale ?? TRICK_RACE.boostScale;
    }

    for (const target of this.candyTargets()) {
      target.effectMods = { ...mods };
    }
  }

  /** 糖果状态作用在哪些身体上：百鬼整队、潜行段两个人、其它线路只有主角。 */
  candyTargets() {
    if (this.isSneakStage()) return [this.player, this.partner];
    return this.members?.length ? this.members : [this.player];
  }

  /** 结算完玩家物理后，触发各状态带来的「不受控动作」。 */
  updateCandyActions(dt) {
    const session = this.session;
    const effects = session.candyEffects;
    const targets = this.candyTargets().filter((target) => !target.hovering);
    if (session.sleeping || targets.length === 0) return;

    // 抽动障碍：短促的不自主抖动，方向和幅度都带一点随机。
    if (effects.poppingCandy) {
      session.ticNext -= dt;
      if (session.ticNext <= 0) {
        const tic = CANDY_EFFECTS.poppingCandy.tic;
        session.ticNext = randomBetween(tic.interval);
        for (const target of targets) {
          target.ticImpulse(tic.push, tic.hop);
          this.particles.spawnDust(target.centerX, target.feetY, target.facing, 1);
        }
      }
    }

    // 躁狂症：随机自动起跳，高度为普通跳跃的 2 倍。
    if (effects.candyCorn) {
      session.maniaNextJump -= dt;
      if (session.maniaNextJump <= 0) {
        session.maniaNextJump = randomBetween(CANDY_EFFECTS.candyCorn.autoJump.interval);
        for (const target of targets) {
          if (target.onGround && !target.currentField) {
            target.autoJump(CANDY_EFFECTS.candyCorn.autoJump.height);
          }
        }
      }
    }

    // 惊恐障碍：定时向前冲刺，冲刺瞬间免疫危险。
    if (effects.sourGummy) {
      session.panicNextDash -= dt;
      if (session.panicNextDash <= 0) {
        session.panicNextDash = randomBetween(CANDY_EFFECTS.sourGummy.panic.interval);
        const panic = CANDY_EFFECTS.sourGummy.panic;
        for (const target of targets) {
          target.panicDash(panic.speed, panic.hop);
          this.particles.spawnDust(target.centerX, target.feetY, target.facing, 4);
        }
        session.panicGrace = panic.grace;
        this.audio.spark();
      }
    }

    // 强迫症：落地后补一次重复跳跃。整队里先落地的那一位触发一次。
    if (effects.lollipop && session.compulsionPending) {
      const grounded = targets.filter((target) => target.onGround);
      if (grounded.length > 0) {
        session.compulsionDelay -= dt;
        if (session.compulsionDelay <= 0) {
          session.compulsionPending = false;
          for (const target of grounded) {
            target.autoJump(CANDY_EFFECTS.lollipop.repeatJump.height);
          }
        }
      }
    }
  }

  /**
   * 「四盏灯」的持续状态与下一次发作计时。
   * 在玩家物理之前运行：把这一段的连续修正、惊恐的呼吸状态、
   * 恶劣心境的重量与停顿写进 effectMods。
   */
  updateMemorialTimers(dt) {
    if (this.mode !== 'memorial') return;
    // 第三段的阻力来自提灯人和石板，不跑惊恐 / 低谷的周期计时。
    if (this.isSneakStage()) return;
    const chapter = getMemorialChapter(this.level.stage);
    if (!chapter) return;

    const session = this.session;
    const player = this.player;
    const mods = player.effectMods;
    const trigger = chapter.trigger;

    applyMemorialMods(mods, chapter);
    // 惊恐收拢的视野、平复期和旧灯带来的透亮都在这里自然淡出。
    session.memorialTunnel = Math.max(0, session.memorialTunnel - dt);
    session.memorialCalm = Math.max(0, session.memorialCalm - dt);
    session.memorialLift = Math.max(0, session.memorialLift - dt);

    // 把呼吸走完后的「定神」给一点很轻的手感奖励：脚步比平常稳一点。
    if (chapter.kind === 'panic' && session.memorialCalm > 0) {
      mods.moveScale *= 1.05;
      mods.jumpVelocityScale *= 1.03;
    }

    // 第四段：路程越深，身上越沉；旧灯的透亮会暂时把重量拿开。
    this.applyMemorialWeight(mods, chapter, player);

    // 第一段是南瓜车检查，走另一套计时：每 5 秒一个任务，10 秒倒计时。
    if (trigger.kind === 'carriage') {
      this.updateCarriageTimers(dt);
      return;
    }

    // 第二段：惊恐一旦开始，就由呼吸小游戏接管；平复期内不再安排下一次。
    if (session.memorialPanic) {
      this.updatePanicState(dt, mods, trigger);
      return;
    }

    // 第四段：抬不起脚时仍然可以慢慢挪，按方向键会更快把脚拔出来。
    if (session.memorialSlump > 0) {
      this.updateSlumpState(dt, mods);
      return;
    }

    if (session.memorialPending) return;
    if (session.memorialCalm > 0) {
      // 定神期里不发作，但下一次的计时继续走：平复之后不会干等太久。
      session.memorialNext = Math.max(0, session.memorialNext - dt);
      return;
    }

    session.memorialNext -= dt;
    if (session.memorialNext > 0) return;

    // 「抬不起脚」只落在结实的落脚点上：半空或电磁场里不发作。
    if (trigger.kind === 'slump' && (!player.onGround || player.currentField)) {
      session.memorialNext = 3;
      return;
    }

    session.memorialNext = randomBetween(trigger.interval);
    session.memorialPending = trigger.kind;
  }

  /** 第四段的负重：随走过的路程加深；透亮期间脚步回到平常，甚至轻一点。 */
  applyMemorialWeight(mods, chapter, player) {
    if (chapter.kind !== 'dysthymia') return;
    const session = this.session;
    const span = Math.max(1, this.level.goalX - this.level.spawn.x);
    const progress = Math.max(
      0,
      Math.min(1, (player.centerX - this.level.spawn.x) / span),
    );
    // 只增不减：走回头路不会把已经压上来的重量卸掉。
    session.memorialDepth = Math.max(session.memorialDepth ?? 0, progress);
    const depth = session.memorialDepth;

    if (session.memorialLift > 0) {
      // 好日子：颜色和脚步一起回来一会儿。
      mods.moveScale *= 1.08;
      mods.jumpVelocityScale *= 1.05;
      return;
    }
    mods.moveScale *= 1 - depth * 0.12;
    mods.jumpVelocityScale *= 1 - depth * 0.05;
  }

  /** 第二段：惊恐预兆 → 一次呼吸 → 平复。呼吸用空格，按一下或按住都认。 */
  updatePanicState(dt, mods, trigger) {
    const session = this.session;
    const panic = session.memorialPanic;
    const player = this.player;

    if (panic.phase === 'warn') {
      panic.timer = Math.max(0, panic.timer - dt);
      // 预兆期还能走，只是心里已经发紧。
      mods.moveScale *= 0.94;
      if (panic.timer <= 0) {
        panic.phase = 'breath';
        panic.beat = 0;
        panic.elapsed = 0;
        panic.missCooldown = 0;
        this.audio.heartbeat();
        // 疾病发作照这一段的原文：中文一行、英文一行。原文比操作提示长，多停一会儿。
        const line = trigger.line ?? trigger.notice ?? '心跳撞了起来。按住空格，慢慢呼吸。';
        this.notify(
          trigger.lineEn ? `${line}\n${trigger.lineEn}` : line,
          trigger.line ? 4600 : 2600,
        );
      }
      return;
    }

    // 发作期：身体定住，视野收拢成角色身边的一只小孔。
    panic.elapsed += dt;
    panic.missCooldown = Math.max(0, panic.missCooldown - dt);
    panic.beat = (panic.beat + dt / (trigger.beatPeriod ?? 1.5)) % 1;
    mods.lockAxis = true;
    mods.lockJump = true;
    player.vx = 0;

    // 一次呼吸不需要卡拍子：按住空格也算。留 0.3 秒让收拢先演出来。
    if (
      (panic.required ?? 3) <= 1 &&
      panic.elapsed > 0.3 &&
      this.input.isDown('breath')
    ) {
      panic.breaths = 1;
      this.audio.breath(panic.breaths);
      this.finishPanic(false);
      return;
    }

    // 一直不按也不会卡死：呼吸会自己慢下来，只是没有「定神」奖励。
    if (panic.elapsed >= (trigger.patience ?? 18)) {
      this.finishPanic(true);
    }
  }

  /** 第四段：一步抬不起来。还能慢慢挪；按方向键会更快结束。 */
  updateSlumpState(dt, mods) {
    const session = this.session;
    const moving = this.input.isDown('left') || this.input.isDown('right');
    session.memorialSlump = Math.max(
      0,
      session.memorialSlump - dt * (moving ? 2.4 : 1),
    );
    mods.moveScale *= 0.34;
    mods.jumpVelocityScale *= 0.76;
    if (session.memorialSlump <= 0) {
      this.audio.checkpoint();
      this.particles.spawnDust(this.player.centerX, this.player.feetY, 0, 2);
    }
  }

  /**
   * 玩家在惊恐发作时按空格：
   *   - 预兆期：稳住呼吸，直接平复（奖励一次更短的定神）；
   *   - 发作期：一次呼吸——按一下就行，不用卡时机；按住空格也能收到。
   */
  handlePanicPress() {
    const session = this.session;
    const panic = session.memorialPanic;
    if (!panic) return false;
    const chapter = getMemorialChapter(this.level.stage);
    const trigger = chapter?.trigger;
    if (!trigger) return false;

    if (panic.phase === 'warn') {
      this.audio.checkpoint();
      this.finishPanic(false, trigger.calmNotice ?? '你稳住了呼吸。', 6);
      return true;
    }

    // 一次呼吸：按一下空格就够，不需要卡时机；按住空格由 updatePanicState 收到。
    if ((panic.required ?? 3) <= 1) {
      panic.breaths = 1;
      this.audio.breath(panic.breaths);
      this.particles.spawnSpark(this.player.centerX, this.player.centerY - 10, 6);
      this.finishPanic(false);
      return true;
    }

    const start = trigger.windowStart ?? 0.46;
    const end = trigger.windowEnd ?? 0.86;
    if (panic.beat >= start && panic.beat <= end) {
      panic.breaths += 1;
      panic.beat = 0;
      this.audio.breath(panic.breaths);
      this.particles.spawnSpark(this.player.centerX, this.player.centerY - 10, 6);
      if (panic.breaths >= (trigger.breaths ?? 3)) {
        this.finishPanic(false);
      }
    } else if (panic.missCooldown <= 0) {
      panic.missCooldown = 0.35;
      this.audio.error();
    }
    return true;
  }

  /** 结束一次惊恐：留下短暂的定神期，围着角色的那只孔慢慢打开。 */
  finishPanic(auto = false, notice = null, calm = null) {
    const session = this.session;
    const chapter = getMemorialChapter(this.level.stage);
    const trigger = chapter?.trigger ?? {};
    if (!session.memorialPanic) return;
    // 预兆期就稳住了的话，视野还没合拢，不需要再演一次「慢慢打开」。
    const hadTunnel = session.memorialPanic.phase === 'breath';
    session.memorialPanic = null;
    session.memorialCalm = calm ?? trigger.calm ?? 10;
    session.memorialTunnel = hadTunnel ? 2.2 : 0;
    this.audio.tutorialChime();
    this.particles.spawnSpark(this.player.centerX, this.player.centerY - 12, 10);
    this.notify(
      notice ?? (auto
        ? trigger.autoNotice ?? '呼吸自己慢了下来。'
        : trigger.success ?? '四周慢慢打开了。'),
      2400,
    );
  }

  /** 第一段：每 5 秒冒出一次「回去看看」的念头，任务条有 10 秒倒计时。 */
  updateCarriageTimers(dt) {
    const session = this.session;
    const chapter = getMemorialChapter(1);
    const trigger = chapter?.trigger;
    if (!trigger) return;

    const quest = session.carriageQuest;
    if (quest) {
      quest.remaining = Math.max(0, quest.remaining - dt);
      if (quest.remaining <= 0 && !session.carriageAlarm) {
        session.carriageAlarm = true;
        session.carriageHopTimer = 0;
        this.audio.error();
        this.notify(trigger.alarm ?? '……万一没锁呢？', 2600);
      }
      return;
    }

    session.memorialNext -= dt;
    if (session.memorialNext <= 0) {
      session.memorialNext = randomBetween(trigger.interval);
      session.carriageQuest = {
        total: trigger.countdown ?? 10,
        remaining: trigger.countdown ?? 10,
      };
      session.carriageAlarm = false;
      this.audio.checkpoint();
      const line = trigger.line ?? '头痛来了，有预谋的逐渐弥漫的疼痛，像一块冰冷的金属片慢慢嵌入前额';
      this.notify(
        trigger.lineEn ? `${line}\n${trigger.lineEn}` : line,
        3600,
      );
    }
  }

  /** 超时后角色抓狂：一落地就自己再跳起来；左右操控仍然有效。 */
  updateCarriageAlarm(dt) {
    if (this.mode !== 'memorial' || this.level.stage !== 1) return;
    const session = this.session;
    if (!session.carriageAlarm) return;

    session.carriageHopTimer = Math.max(0, session.carriageHopTimer - dt);
    if (this.player.onGround && session.carriageHopTimer <= 0) {
      this.player.autoJump(1);
      session.carriageHopTimer = 0.18;
    }
  }

  /** 玩家物理结算后，兑现这一段的低频行为。 */
  updateMemorialActions(dt) {
    if (this.mode !== 'memorial') return;
    const session = this.session;
    const kind = session.memorialPending;
    if (!kind) return;
    session.memorialPending = null;

    const chapter = getMemorialChapter(this.level.stage);
    const trigger = chapter?.trigger;
    if (!chapter || !trigger) return;

    const player = this.player;

    if (kind === 'panic') {
      // 惊恐发作：先给一秒多的心跳预兆，再把视野收拢成角色身边的一只小孔。
      // 预兆期按空格可以稳住；发作后按一下或按住空格呼吸一次。
      player.vx = 0;
      session.memorialPanic = {
        phase: 'warn',
        timer: trigger.premonition ?? 1.2,
        beat: 0,
        breaths: 0,
        required: trigger.breaths ?? 3,
        elapsed: 0,
        missCooldown: 0,
        windowStart: trigger.windowStart ?? 0.46,
        windowEnd: trigger.windowEnd ?? 0.86,
      };
      this.audio.heartbeat();
      this.notify(trigger.premonitionNotice ?? '心跳快了一下。', 1900);
      return;
    }

    if (kind === 'slump') {
      // 恶劣心境：一步抬不起来。不是定死，按住方向键能一步一步挪出去。
      player.vx *= 0.25;
      session.memorialSlump = trigger.duration ?? 1.2;
      this.particles.spawnDust(player.centerX, player.feetY, 0, 2);
      this.notify(trigger.notice ?? '这一步抬不起来。', 2200);
      return;
    }
  }

  /**
   * 第四段的旧灯：走到跟前自动点起，给一段「透亮」。
   * 灯只点一次；颜色和脚步回来后，重量还会慢慢压回来。
   */
  updateMemorialSolaces() {
    if (this.mode !== 'memorial') return;
    const solaces = this.level.solaces ?? [];
    if (!solaces.length) return;
    const session = this.session;
    const chapter = getMemorialChapter(this.level.stage);
    for (const solace of solaces) {
      if (session.solacesLit.has(solace.id)) continue;
      if (Math.abs(this.player.centerX - solace.x) > 28) continue;

      session.solacesLit.add(solace.id);
      session.memorialLift = chapter?.solace?.duration ?? 9;
      this.audio.lamp();
      this.particles.spawnSpark(solace.x, solace.y - 14, 12);
      this.notify(solace.line ?? chapter?.solace?.line ?? '旧灯还亮着。', 2400);
    }
  }

  /** 经过记忆点时，点一盏小灯，并说出那个人的名字。 */
  updateMemorialMemories() {
    if (this.mode !== 'memorial') return;
    const session = this.session;
    for (const memory of this.level.memorials) {
      if (session.seenMemories.has(memory.id)) continue;
      // 提前一点点触发，让人影和蜡烛出现在前面，而不是被玩家自己盖住。
      if (this.player.centerX < memory.x - 30) continue;

      session.seenMemories.add(memory.id);
      session.litLights.add(memory.id);
      this.audio.tutorialChime();
      this.particles.spawnSpark(memory.x, memory.y - 16, 8);
      this.notify(
        memory.lineEn ? `${memory.line}\n${memory.lineEn}` : memory.line,
        5200,
      );
      this.persist();
    }
  }

  /** 走到这一段的门边：下一段换一张更短的地图，记忆与鞋子的磨损继续。 */
  advanceMemorial() {
    const nextStage = this.level.stage + 1;
    if (nextStage > MEMORIAL_ROUTE.totalStages) {
      this.completeRun();
      return;
    }

    const chapter = getMemorialChapter(nextStage);
    if (!chapter) {
      this.completeRun();
      return;
    }

    this.audio.complete();
    // 这一段的人留在了夜里：先把他们的鞋报给界面，再换到下一张图。
    // 顺序不能反——新图一加载就会把「跟在你身后了」的提示排上。
    this.presentShoeReward(this.level.stage);
    // 新地图从一层暖光里浮出来，像是刚从门里穿过去。
    this.session.portalFlash = 0.8;
    this.loadTheme(chapter.levelId, 'memorial', this.session);
    this.introFlash = 0.9;
    this.accumulator = 0;
    // 上一段的鞋卡片和「送给主角的话」还要在画面上停一会儿；
    // 换段的提示先让开，别和祝福挤在同一块地方。
    const cleared = getMemorialChapter(this.level.stage - 1);
    if (cleared?.blessing) {
      window.setTimeout(() => {
        if (this.mode === 'memorial' && this.state === 'playing') {
          this.notify(chapter.intro, 5200);
        }
      }, 15200);
    } else {
      this.notify(chapter.intro, 5600);
    }
  }

  checkCostumeCompletion() {
    const session = this.session;
    for (const costume of COSTUMES) {
      if (session.completedCostumes.includes(costume.id)) continue;
      const complete = costume.parts.every((part) => (session.collected[part] ?? 0) > 0);
      if (!complete) continue;

      session.completedCostumes.push(costume.id);
      session.equippedCostume = costume.id;
      this.syncCostumes();
      this.audio.tutorialChime();
      this.notify(
        `时装拼好了 · ${costume.name}（${costume.subtitle}）。已自动换上，打开背包可以换。`,
        3400,
      );
    }
  }

  equipCostume(id) {
    const costume = COSTUME_BY_ID.get(id);
    if (!costume) return { ok: false, message: '没有这件时装。' };
    if (!this.session.completedCostumes.includes(id)) {
      const missing = costume.parts.filter(
        (part) => (this.session.collected[part] ?? 0) <= 0,
      ).length;
      return { ok: false, message: `还差 ${missing} 件零件，先把它们找齐。` };
    }

    if (this.session.equippedCostume === id) {
      this.session.equippedCostume = null;
      this.syncCostumes();
      this.audio.equip();
      this.persist();
      return { ok: true, message: `换下了${costume.name}。` };
    }

    this.session.equippedCostume = id;
    this.syncCostumes();
    this.audio.equip();
    this.persist();
    return { ok: true, message: `换上了${costume.name}。` };
  }

  /**
   * 时装只改外观，不碰碰撞和物理。
   * 第三段双人潜行里，回音和你穿同一套，两个人一起变。
   */
  syncCostumes() {
    const id = this.session?.equippedCostume ?? null;
    if (this.player) this.player.costume = id;
    if (this.partner) this.partner.costume = id;
  }

  updateCheckpoints() {
    // 魑魅魍魉要等最慢的那双脚也过了落脚点，才把整支队伍记在新位置；
    // 之后有人被瘴气冲散，全队会一起回到这里。
    const lead =
      this.mode === 'parade'
        ? Math.min(...this.members.map((member) => member.centerX))
        : this.player.centerX;
    for (let index = this.session.checkpointIndex + 1; index < this.level.checkpoints.length; index += 1) {
      const checkpoint = this.level.checkpoints[index];
      if (lead >= checkpoint.x) {
        this.session.checkpointIndex = index;
        this.session.checkpoint = { x: checkpoint.x, y: checkpoint.y };
        // 木乃伊的绷带在每个落脚点重新绷紧：一次单独的救援。
        if (this.mode === 'parade') {
          this.session.paradeRescueReady = this.teamSupport?.rescue ?? 0;
        }
        this.notify(`落脚点已记下 · ${checkpoint.label}`, 1800);
        this.audio.checkpoint();
        this.persist();
      } else {
        break;
      }
    }
  }

  /**
   * 第一段尽头挡住出口的南瓜高墙：走近时提示一次怎么用南瓜翻过去。
   * 提示只出现一次，之后靠玩家自己试。
   */
  updatePumpkinHints() {
    if (this.mode !== 'memorial' || this.level.stage !== 1) return;
    if (this.session.pumpkinHintShown) return;
    const wallX = this.level.stackWallX ?? 38 * VIEW.TILE;
    if (this.player.centerX < wallX - 150 || this.player.centerX > wallX + 8) return;
    this.session.pumpkinHintShown = true;
    this.notify(
      '前面的墙比一个人高。把南瓜推到墙边，再抱起一颗抛上去叠好，踩着南瓜翻过去。',
      5600,
    );
  }

  updateTutorial(dt) {
    if (this.mode !== 'tutorial' || this.session.completed) return;

    const steps = this.level.tutorialSteps;
    this.session.tutorialStepCooldown = Math.max(0, this.session.tutorialStepCooldown - dt);
    if (this.session.tutorialStepCooldown > 0) return;

    const step = steps[this.session.tutorialStep];
    if (!step) return;

    const pumpkinStats = this.pumpkins?.stats ?? { pushes: 0, throws: 0 };

    let complete = false;
    if (step.id === 'move') {
      complete = Math.abs(this.player.x - this.level.spawn.x) > 58;
    } else if (step.id === 'jump') {
      complete = this.session.manualJumpCount > 0;
    } else if (step.id === 'drop') {
      complete = this.session.dropThroughs > 0;
    } else if (step.id === 'collect') {
      complete = (this.session.bonesPicked ?? 0) > 0;
    } else if (step.id === 'pumpkin') {
      // 推和抛要各做一次：南瓜既能被身体顶走，也能抱起来扔出去。
      complete = pumpkinStats.pushes > 12 && pumpkinStats.throws > 0;
    } else if (step.id === 'pumpkin-stack') {
      // 叠高本身可以顺手做掉，但这一步要等玩家真的踩着南瓜翻过教学高墙。
      const wallX = (this.level.stackWallX ?? 40 * VIEW.TILE) + VIEW.TILE;
      complete = pumpkinStats.stacks > 0 && this.player.centerX > wallX;
    } else if (step.id === 'backpack') {
      // 糖果现在都从糖纸街来，装在背包的糖袋里：这一课要真的打开背包看一次。
      complete = this.session.backpackOpened;
    } else if (step.id === 'finish') {
      complete = this.player.centerX >= this.level.goalX - 6;
    }

    if (!complete) return;

    if (step.cheer) this.notify(step.cheer, 2200);
    this.audio.tutorialChime();
    this.session.tutorialStep += 1;
    this.session.tutorialStepCooldown = 0.7;
    // 这一课的门打开，下一课的门还关着。
    this.level.syncTutorialGates(this.session.tutorialStep);
    this.persist();

    if (this.session.tutorialStep >= steps.length) {
      this.beginDoorEntry(() => this.completeRun());
    }
  }

  updateHazards() {
    if (this.respawnGrace > 0) return;
    // 护身糖：危险碰不到你（魑魅魍魉里是整支队伍）。
    if (this.candyTargets().some((target) => target.effectMods?.shield)) return;
    // 惊恐冲刺的那一瞬间，危险碰不到你。
    if (this.session.panicGrace > 0) return;
    if (this.mode === 'parade') {
      this.updateParadeHazards();
      return;
    }
    const hazard = this.level.overlapsHazard(this.player.bounds);
    if (!hazard) return;

    this.damageFlash = 0.8;
    this.respawnGrace = 0.9;
    this.particles.spawnDeathBurst(this.player.centerX, this.player.centerY, hazard.type);
    if (hazard.type === 'lava') {
      this.audio.lava();
      this.notify(
        this.player.charge === 0
          ? '岩浆把你送了回来。你还没带电，先回去找铜球。'
          : '岩浆把你送回了上一个落脚点。电荷还留着。',
        2600,
      );
    } else if (hazard.type === 'spikes') {
      this.audio.death();
      this.notify('井顶的尖刺把你送了回来。先把 B 对齐，别让场把你托上去。', 2600);
    } else {
      this.audio.death();
      this.notify('你掉进了裂谷。回到上一个落脚点。', 2400);
    }

    const checkpoint = this.session.checkpoint;
    this.player.reset(checkpoint.x, checkpoint.y);
    this.player.shoeFit = this.getShoeFit();
    // 身后的鞋也跟着回到落脚点，别从坠落的原路一路追过来。
    if (this.mode === 'memorial') {
      this.shoeFollowers.resetAt(this.player.centerX, this.player.feetY, this.player.facing);
    }
    this.camera.x = 0;
    this.camera.y = 0;
    this.updateCamera(STEP, true);
    this.accumulator = 0;
  }

  /**
   * 魑魅魍魉的危险：任何一个同行者碰到瘴气，整支队伍都会在下一个落脚点
   * 重新聚拢。一个人掉队就是全队掉队，这是「一个都不能少」的代价。
   */
  updateParadeHazards() {
    let hazard = null;
    let victim = null;
    for (const member of this.members) {
      const hit = this.level.overlapsHazard(member.bounds);
      if (hit) {
        hazard = hit;
        victim = member;
        break;
      }
    }
    if (!hazard) return;

    const track = getParadeTrack(this.session.paradeTrack);
    const hard = track.lossRule === 'sacrifice';
    const checkpoint = this.session.checkpoint;
    const victimDef = getYokai(victim.yokaiId);
    const victimName = victim.yokaiId === 'lantern' ? '你' : victimDef?.name ?? '同行者';
    this.damageFlash = 0.8;
    this.respawnGrace = 1.0;
    this.particles.spawnDeathBurst(victim.centerX, victim.centerY, hazard.type);
    if (hazard.type === 'lava') this.audio.lava();
    else this.audio.death();

    // 木乃伊「绷带兜底」：每个落脚点一次，只把中招的人拉回来。
    // 全队不必重来，被冲散次数也不会增加。
    // 但困难赛道的规则更重：绷带能免掉回程，却免不掉「留下一个名字」。
    let rescued = false;
    if ((this.teamSupport?.rescue ?? 0) > 0 && (this.session.paradeRescueReady ?? 0) > 0) {
      rescued = true;
      this.session.paradeRescueReady -= 1;
      const index = Math.max(0, this.members.indexOf(victim));
      victim.reset(checkpoint.x + (index - (this.members.length - 1) / 2) * 10, checkpoint.y);
      victim.shoeFit = this.getShoeFit();
      this.particles.spawnSpark(victim.centerX, victim.centerY, 14);
      this.notify(
        hard
          ? `绷带兜底 · ${victimName}被拉了回来；仍要留下一人。`
          : `绷带兜底 · ${victimName}被拉回了落脚点。`,
        3200,
      );
      this.camera.x = 0;
      this.camera.y = 0;
      this.updateCamera(STEP, true);
    }

    if (!rescued) {
      this.session.paradeScatters = (this.session.paradeScatters ?? 0) + 1;
      this.notify(
        hazard.type === 'miasma'
          ? `瘴气把${victim.yokaiId === 'lantern' ? '你' : '队伍'}冲散了。所有人回到上一个落脚点，重新聚拢。`
          : '队伍被冲散了。所有人回到上一个落脚点。',
        2800,
      );

      const count = this.members.length;
      this.members.forEach((member, index) => {
        const offset = (index - (count - 1) / 2) * 10;
        member.reset(checkpoint.x + offset, checkpoint.y);
        member.shoeFit = this.getShoeFit();
      });
      this.camera.x = 0;
      this.camera.y = 0;
      this.updateCamera(STEP, true);
    }
    this.accumulator = 0;

    // 困难赛道：被冲散一次，就要从名册上亲手留下一人。
    // 提灯童子不能留下；黑猫 + 木乃伊的组合技每段能顶替一次。
    if (!hard) return;
    if (this.companions.length === 0) {
      this.defeatParade();
      return;
    }
    if (this.teamSupport?.nineLives && !this.session.paradeNineLivesUsed) {
      this.session.paradeNineLivesUsed = true;
      this.particles.spawnSpark(this.player.centerX, this.player.centerY, 20);
      this.notify(
        '九命绷带 · 这一段免一次送别。',
        3600,
      );
      return;
    }
    this.openSacrifice(rescued ? 'rescue' : 'scatter', victimName);
  }

  /** 某位同行者是否已经站在鸟居下（横向到门，纵向也在门所在的高度）。 */
  isMemberAtGate(member) {
    const goalY = this.level.goalY;
    if (member.centerX < this.level.goalX - 12) return false;
    if (goalY == null) return true;
    return Math.abs(member.feetY - goalY) < 52;
  }

  paradeGateCount() {
    if (this.mode !== 'parade') return 0;
    return this.members.filter((member) => this.isMemberAtGate(member)).length;
  }

  /** 门在身后合上：下一段换一张地图，队伍、时间和被冲散次数继续。 */
  advanceParade() {
    const nextStage = this.level.stage + 1;
    if (nextStage > PARADE_ROUTE.totalStages) {
      this.completeRun();
      return;
    }

    const chapter = getParadeChapter(nextStage);
    if (!chapter) {
      this.completeRun();
      return;
    }

    this.audio.complete();
    this.session.portalFlash = 0.8;
    this.loadTheme(chapter.levelId, 'parade', this.session);
    this.introFlash = 0.9;
    this.accumulator = 0;
    this.notify(`${chapter.name} · ${chapter.title}。${chapter.intro}`, 6200);
  }

  /** 走进门前的一小段停顿：停住玩法，只留光和粒子。 */
  updateDoorEntry(dt) {
    if (!this.doorEntry) return false;
    this.doorEntry.timer -= dt;
    this.particles.update(dt);
    this.updateCamera(dt);
    if (this.doorEntry.timer <= 0) {
      const arrive = this.doorEntry.onArrive;
      this.doorEntry = null;
      arrive?.();
    }
    return true;
  }

  /** 触发一次穿门：镜头和粒子继续，玩家、同行者都停下来。 */
  beginDoorEntry(onArrive) {
    if (this.doorEntry || this.session.completed) return;
    this.doorEntry = { timer: 0.62, duration: 0.62, onArrive };
    this.player.vx = 0;
    this.player.vy = 0;
    this.partner.vx = 0;
    this.partner.vy = 0;
    this.input.releaseAll();
    this.audio.checkpoint();
    this.particles.spawnSpark(this.level.goalX, this.player.centerY, 16);
  }

  updateGoal() {
    if (this.doorEntry) return;
    if (this.session.completed) return;

    if (this.mode === 'parade') {
      // 鸟居只认「所有同行者都在门下」。落在后面的脚会把整支队伍叫住。
      if (
        this.members.length > 0 &&
        this.members.every((member) => this.isMemberAtGate(member))
      ) {
        if (this.level.stage < PARADE_ROUTE.totalStages) {
          this.beginDoorEntry(() => this.advanceParade());
        } else {
          this.beginDoorEntry(() => this.completeRun());
        }
      }
      return;
    }

    if (this.mode === 'memorial') {
      if (this.player.centerX >= this.level.goalX - 4) {
        if (this.level.stage < MEMORIAL_ROUTE.totalStages) {
          this.beginDoorEntry(() => this.advanceMemorial());
        } else {
          // 最后一道门后面不是结算页，而是碑前的那一幕。
          this.beginDoorEntry(() => this.beginMemorialEnding());
        }
      }
      return;
    }

    if (this.mode === 'trick') {
      if (this.player.centerX < this.level.goalX - 4) return;
      if (this.level.race) {
        // 后巷竞速：穿过街尾栅门才算逃脱，结算完回到这一户门口。
        this.beginDoorEntry(() => this.finishTrickRace());
      } else if (this.session.trickRoom) {
        this.beginDoorEntry(() => this.finishTrickRoomTask());
      } else {
        // 街尾的门永远开着：没拿完、没敲过的门都可以留在身后。
        this.beginDoorEntry(() => this.completeRun());
      }
      return;
    }

    if (this.mode === 'tutorial') {
      const lastStep = this.level.tutorialSteps.length - 1;
      if (this.session.tutorialStep < lastStep) return;
    }

    if (this.player.centerX >= this.level.goalX - 4) {
      this.beginDoorEntry(() => this.completeRun());
    }
  }

  /**
   * 最后一道门后面：先把周叔那双鞋也叫上来，再把画面交给 ending.js。
   * 这一幕播完才真正结算。
   */
  beginMemorialEnding() {
    if (this.mode !== 'memorial' || this.session.completed || this.ending) return;
    if (this.level.stage >= MEMORIAL_ROUTE.totalStages) {
      this.shoeFollowers.setStage(MEMORIAL_ROUTE.totalStages + 1);
      this.shoeFollowers.resetAt(this.player.centerX, this.player.feetY, this.player.facing);
      // 最后那双鞋的卡片赶在碑前那一幕之前：这一幕开场是全黑的，
      // 卡片正好落在黑屏上，放完再让墓园淡进来。
      this.presentShoeReward(MEMORIAL_ROUTE.totalStages);
    }
    this.ending = new MemorialEnding(this);
    this.doorEntry = null;
    this.accumulator = 0;
    this.setState('ending');
  }

  /** 碑前这一幕可以跳过，但先让人看见黑屏里的雪。 */
  skipEnding() {
    if (this.state !== 'ending' || !this.ending) return false;
    return this.ending.skip();
  }

  finishMemorialEnding() {
    this.ending = null;
    this.completeRun();
  }

  completeRun() {
    if (this.session.completed) return;
    this.session.completed = true;
    // 结算页出现时，碑前的画面已经收掉了。
    this.ending = null;
    this.player.vx = 0;
    this.player.vy = 0;
    this.input.releaseAll();
    this.audio.complete();
    // 第四段也走完了：周叔的雨靴最后跟上来，四双鞋一起停在碑前。
    if (
      this.mode === 'memorial' &&
      this.level.stage >= MEMORIAL_ROUTE.totalStages
    ) {
      this.shoeFollowers.setStage(MEMORIAL_ROUTE.totalStages + 1);
      this.shoeFollowers.resetAt(this.player.centerX, this.player.feetY, this.player.facing);
      // 四段走完，皮鞋恰好合脚：这一趟从 99% 跨到 100%，之后永远保持满。
      this.shoeFitComplete = true;
      this.player.shoeFit = 1;
    }
    // 通关要立刻落盘：之后停在结算页，不会再有行走中的自动保存。
    this.persist(true);
    this.onComplete?.(this.getCompletionData());
    this.setState('complete');
  }

  getCompletionData() {
    const paradeTrack =
      this.mode === 'parade' ? getParadeTrack(this.session.paradeTrack) : null;
    return {
      mode: this.mode,
      themeId: this.level.id,
      themeName: this.level.theme.name,
      chapter: this.level.theme.chapter,
      time: this.session.time,
      bones: this.session.bones,
      totalBones: this.level.getTotalBones(),
      rightHandBones: this.session.rightHandBones,
      candies: this.session.candies,
      totalCandies: this.level.getTotalCandies(),
      costumes: this.session.completedCostumes.length,
      totalCostumes: COSTUMES.length,
      equippedCostume: this.session.equippedCostume,
      shoeFit: this.getShoeFit(),
      stage: this.level.stage,
      stages:
        this.mode === 'parade'
          ? PARADE_ROUTE.totalStages
          : this.mode === 'trick'
            ? 1
            : MEMORIAL_ROUTE.totalStages,
      memories: this.session.seenMemories.size,
      totalMemories: this.session.totalMemories,
      // 结算页只用它写「身后的鞋 N 双」。
      shoes: this.mode === 'memorial' ? this.shoeFollowers.getNames() : [],
      partySize: this.members.length,
      totalParty: PARADE_TOTAL_YOKAI,
      scatters: this.session.paradeScatters ?? 0,
      lostCount: (this.session.paradeLost ?? []).length,
      track: paradeTrack
        ? {
            id: paradeTrack.id,
            name: paradeTrack.name,
            tier: paradeTrack.tier,
          }
        : null,
      spotted: this.session.sneak?.spotted ?? 0,
      falls: this.session.sneak?.falls ?? 0,
      buffUses: this.session.buffUses ?? 0,
      trick:
        this.mode === 'trick'
          ? (() => {
              const states = Object.values(this.session.trickHouses ?? {});
              const helped = states.filter((state) => state === 'help').length;
              const tricked = states.filter((state) => state === 'trick').length;
              return {
                helped,
                tricked,
                left: Math.max(0, TRICK_HOUSES.length - helped - tricked),
                totalHouses: TRICK_HOUSES.length,
                tricks: this.session.trickTricks,
                candies: this.session.trickCandies,
                pouchTotal: this.pouch.total,
              };
            })()
          : null,
      // 魑魅魍魉和送南瓜派的结尾文案跟赛道数据放在一起，结算页直接用。
      finale:
        this.mode === 'trick'
          ? TRICK_ROUTE.complete
          : this.mode === 'memorial'
            ? MEMORIAL_ROUTE.finale
            : paradeTrack?.finale ?? null,
    };
  }

  getHudState() {
    const level = this.level;
    const session = this.session;
    const player = this.player;
    const span = Math.max(1, level.goalX - level.spawn.x);
    const trailX =
      this.mode === 'parade' || this.isSneakStage()
        ? Math.min(...this.members.map((member) => member.centerX))
        : player.centerX;
    const progress = clamp((trailX - level.spawn.x) / span, 0, 1);
    const device =
      this.mode === 'parade'
        ? this.getNearbyParadeDevice()
        : this.isSneakStage()
          ? null
          : this.getNearbyDevice();

    let interaction = null;
    if (this.mode === 'memorial' && session.memorialPanic) {
      const panic = session.memorialPanic;
      interaction = {
        kind: 'panic',
        // 呼吸有自己的键，和抱南瓜的 E 分开。
        key: 'Space',
        available: true,
        text:
          panic.phase === 'warn'
            ? '稳住呼吸'
            : (panic.required ?? 3) <= 1
              ? '按住呼吸'
              : `跟着呼吸 ${panic.breaths}/${panic.required}`,
      };
    } else if (this.mode === 'memorial' && session.carriageIntro > 0 && session.carriageRiding) {
      // 坐车途中可以按 Q 直接下车；先让第一句独白说完再提示。
      // 提前下车后开场白还在播，但人已经在走，这里不再提示下车。
      const opening = getMemorialChapter(1)?.opening;
      const elapsed = (session.carriageIntroTotal || 0) - session.carriageIntro;
      if (elapsed >= (opening?.skipAfter ?? 4.5)) {
        interaction = {
          kind: 'carriageRide',
          key: 'Q',
          available: true,
          text: '直接下车',
        };
      }
    } else if (!this.isSneakStage() && this.pumpkins?.getCarried(this.player)) {
      // 手里抱着东西时 E 只会把它抛出，提示也跟着说抛出，而不是门或装置。
      interaction = this.pumpkins.getPrompt(this.player, 'E');
    } else if (this.mode === 'memorial' && this.getNearbySign()) {
      // 路牌有自己的键：E 抱南瓜、Q 摸装置、V 读路牌。
      const sign = this.getNearbySign();
      interaction = {
        kind: 'sign',
        key: 'V',
        available: true,
        text: `读路牌 · ${sign.index + 1}/${sign.total}`,
      };
    } else if (device?.type === 'trickRaceExit') {
      const armed = this.isTrickExitArmed(device.id);
      interaction = {
        kind: 'trickRaceExit',
        key: 'X',
        available: true,
        armed,
        text: armed ? '再按一次 · 掉头回街上' : '掉头回街上 · 不要这颗糖了',
      };
    } else if (device?.type === 'candyDoor') {
      // 做完的门也能再敲：副本可以反复玩，Q 一直是可用的。
      interaction = {
        kind: 'candyDoor',
        key: 'Q',
        available: true,
        text: this.getCandyDoorPrompt(device),
      };
    } else if (device?.type === 'trickExit') {
      const armed = this.isTrickExitArmed(device.id);
      interaction = {
        kind: 'trickExit',
        key: 'X',
        available: true,
        armed,
        text: armed ? '再按一次 · 回糖纸街' : '回糖纸街 · 这户的糖先不拿',
      };
    } else if (device?.type === 'mask') {
      if (!device.joined) {
        interaction = {
          kind: 'mask',
          key: 'Q',
          available: true,
          text: device.prompt ?? '敲响石鼓',
        };
      }
    } else if (device?.type === 'charger') {
      const sameCharge = player.charge === device.charge;
      const label = device.charge > 0 ? '正电' : '负电';
      interaction = {
        kind: 'charger',
        key: 'Q',
        available: true,
        text: sameCharge ? `已带${label} · 再按一次释放电荷` : `握住铜球 · 带上${label}`,
      };
    } else if (device?.type === 'boneSlot' && !device.solved) {
      interaction = {
        kind: 'boneSlot',
        key: 'Tab',
        available: true,
        solved: false,
        text: '打开背包 · 选择要放入骨槽的东西',
      };
    } else if (device?.type === 'carriage') {
      interaction = {
        kind: 'carriage',
        key: 'Q',
        available: true,
        text: session.carriageQuest ? '检查南瓜车锁' : '摸摸南瓜车',
      };
    } else {
      // 附近没有装置时，把「抱起 / 抛出南瓜」交给同一条互动提示。
      // 潜行段里两个人各用各的键（你 E、回音 /），两个人都够得到时一起显示。
      if (this.isSneakStage()) {
        const promptA = this.pumpkins?.getPrompt(this.player, 'E');
        const promptB = this.pumpkins?.getPrompt(this.partner, '/');
        if (promptA && promptB) {
          interaction = {
            kind: 'pumpkin',
            key: 'E',
            altKey: '/',
            available: true,
            text: '你和回音 · 各自抱起或抛出南瓜',
          };
        } else if (promptA) {
          interaction = { ...promptA, text: `你 · ${promptA.text}` };
        } else if (promptB) {
          interaction = { ...promptB, text: `回音 · ${promptB.text}` };
        }
      } else {
        const pumpkinInteraction = this.pumpkins?.getPrompt(this.player, 'E');
        if (pumpkinInteraction) interaction = pumpkinInteraction;
      }
    }

    const placementStation = this.getPlacementStation();

    const currentField = player.currentField;
    const previewField = currentField
      ? null
      : level.fieldZones.find((zone) => zone.id === device?.fieldId);

    let field = null;
    const rawField = currentField ?? previewField;
    if (rawField) {
      const balanced = level.isFieldBalanced(rawField);
      const required = (rawField.e.mag / rawField.b.mag) * FIELD.pixelsPerMeter;
      const current = player.vx;
      const delta = (current - required) / FIELD.pixelsPerMeter;
      const reversed = current < -0.5;
      const force = level.getFieldAcceleration(
        rawField,
        player.charge,
        player.vx,
        player.vy,
      );
      const lift =
        !currentField || player.charge === 0 || Math.abs(force.y) < 0.5
          ? 'none'
          : force.y > 0
            ? 'down'
            : 'up';
      field = {
        id: rawField.id,
        label: rawField.label,
        active: Boolean(currentField),
        eMag: rawField.e.mag,
        eDir: formatDirectionE(rawField.e.dir),
        eRawDir: rawField.e.dir,
        bMag: rawField.b.mag,
        bDir: formatDirectionB(rawField.b.dir),
        bRawDir: rawField.b.dir,
        balanced,
        required: required / FIELD.pixelsPerMeter,
        current: current / FIELD.pixelsPerMeter,
        speedRatio: clamp(Math.abs(current) / required, 0, 1.6),
        delta,
        reversed,
        lift,
        hovering: player.hovering,
        charged: player.charge !== 0,
        status: this.getFieldStatus(rawField, balanced, delta, currentField, lift),
      };
    }

    let electron = null;
    if (player.nearElectron) {
      const electronForce = level.getElectronAcceleration(
        player.centerX,
        player.centerY,
        player.charge,
      );
      // 力的方向与大小都直接来自库仑定律，HUD 只是把它画出来。
      // forceG 是加速度相对重力的倍数：1.0 表示和体重一样大。
      const forceMag = Math.hypot(electronForce.x, electronForce.y);
      electron = {
        charged: player.charge !== 0,
        airborne: !player.onGround,
        distance: player.nearElectron.distance,
        radius: player.nearElectron.radius,
        model: level.electronModel,
        forceX: electronForce.x,
        forceY: electronForce.y,
        forceMag,
        forceG: forceMag / PHYSICS.gravity,
      };
    }

    let tutorial = null;
    if (this.mode === 'tutorial') {
      const step = level.tutorialSteps[session.tutorialStep];
      tutorial = {
        index: Math.min(session.tutorialStep + 1, level.tutorialSteps.length),
        total: level.tutorialSteps.length,
        text: step?.text ?? '',
        complete: session.completed,
      };
    }

    let memorial = null;
    if (this.mode === 'memorial') {
      const chapter = getMemorialChapter(level.stage);
      memorial = {
        stage: level.stage,
        total: MEMORIAL_ROUTE.totalStages,
        kind: chapter?.kind ?? '',
        stageLabel: chapter?.stageLabel ?? '',
        patient: chapter?.patient ?? '',
        disorder: chapter?.disorder ?? '',
        code: chapter?.code ?? '',
        tag: chapter?.tag ?? '',
        body: chapter?.body ?? '',
        bodyEn: chapter?.bodyEn ?? '',
        accent: chapter?.accent ?? '#d8b57a',
        memories: session.seenMemories.size,
        totalMemories: session.totalMemories,
        panic: session.memorialPanic
          ? {
              phase: session.memorialPanic.phase,
              breaths: session.memorialPanic.breaths,
              required: session.memorialPanic.required,
            }
          : null,
        lift: session.memorialLift,
        slump: session.memorialSlump,
        // 第二段的集合门：面板只留「解开几道 / 一共几道 · 现在在哪个区域」。
        setGates: getSetGateState(level),
        // 已经跟到身后的鞋：面板只写名字，不写解释。
        shoes: this.shoeFollowers.getNames(),
      };
    }

    let quest = null;
    if (this.mode === 'memorial' && level.stage === 1 && session.carriageQuest) {
      const chapter = getMemorialChapter(1);
      quest = {
        text: chapter?.trigger?.task ?? '去看看南瓜车锁没锁',
        remaining: session.carriageQuest.remaining,
        total: session.carriageQuest.total,
        alarm: session.carriageAlarm,
      };
    }

    // 开场车程：画面上方的开场白、折叠的南瓜派教程，以及能不能直接下车。
    let opening = null;
    if (this.mode === 'memorial' && level.stage === 1 && session.carriageIntro > 0) {
      const conf = getMemorialChapter(1)?.opening ?? {};
      const beats = conf.beats ?? [];
      const shown = session.carriageBeatIndex - 1;
      const index = Math.max(0, Math.min(beats.length - 1, shown));
      const beat = shown >= 0 ? beats[index] : null;
      const elapsed = (session.carriageIntroTotal || 0) - session.carriageIntro;
      // 南瓜派教程等第二句「你要知道……」出现后再露面，不抢第一句的开场白。
      const tutorialBeat = beats.findIndex((entry) => entry.tutorial);
      opening = {
        cn: beat?.cn ?? '',
        en: beat?.en ?? '',
        index,
        total: beats.length,
        tutorialOpen: Boolean(session.carriageTutorialOpen),
        tutorial: conf.tutorial ?? null,
        tutorialVisible: tutorialBeat >= 0 && shown >= tutorialBeat,
        // 提前下车后开场白继续播，但「直接下车」的提示就不必再挂了。
        canSkip: !session.carriageIntroSkipped && elapsed >= (conf.skipAfter ?? 7),
      };
    }

    // 正在读的路牌：一句中文、一句英文。
    const sign = session.readingSign ?? null;

    let parade = null;
    if (this.mode === 'parade') {
      const chapter = getParadeChapter(level.stage);
      const track = getParadeTrack(session.paradeTrack);
      const lostIds = session.paradeLost ?? [];
      const count = this.members.length;
      const gateCount = this.paradeGateCount();
      const minX = Math.min(...this.members.map((member) => member.centerX));
      const maxX = Math.max(...this.members.map((member) => member.centerX));
      const spread = (maxX - minX) / Math.max(1, level.tileSize);

      const memberInfo = this.members.map((member) => {
        const def = getYokai(member.yokaiId);
        return {
          id: member.yokaiId,
          name: def?.name ?? '同行者',
          title: def?.title ?? '',
          role: def?.role ?? '',
          traitLabel: def?.traitLabel ?? '',
          teamLabel: def?.teamLabel ?? '',
          trait: def?.trait ?? '',
          line: def?.line ?? '',
          accent: def?.accent ?? '#e8b878',
          stage: def?.stage ?? 0,
          atGate: this.isMemberAtGate(member),
        };
      });

      const upcoming = YOKAI_ORDER.filter(
        (id) =>
          !this.members.some((member) => member.yokaiId === id) &&
          !lostIds.includes(id),
      ).map((id) => {
        const def = getYokai(id);
        return {
          id,
          name: def?.name ?? '客人',
          title: def?.title ?? '',
          role: def?.role ?? '',
          traitLabel: def?.traitLabel ?? '',
          teamLabel: def?.teamLabel ?? '',
          trait: def?.trait ?? '',
          accent: def?.accent ?? '#e8b878',
          stage: def?.stage ?? 0,
        };
      });

      const lost = lostIds.map((id) => {
        const def = getYokai(id);
        return {
          id,
          name: def?.name ?? '同行者',
          title: def?.title ?? '',
          role: def?.role ?? '',
          traitLabel: def?.traitLabel ?? '',
          teamLabel: def?.teamLabel ?? '',
          trait: def?.trait ?? '',
          accent: def?.accent ?? '#e8b878',
          stage: def?.stage ?? 0,
        };
      });

      let body = chapter?.body ?? '';
      if (count > 0 && gateCount === count) {
        body = '全队都到门下了。门开了。';
      } else if (spread > 8) {
        body = '队伍拉得太长了。往回走几步，让后面的人也跟上来。';
      } else if (gateCount > 0) {
        body = `还差 ${count - gateCount} 名同行者到门。`;
      } else if (track.lossRule === 'sacrifice') {
        body = '困难赛道：碰到瘴气，就要从名册里留下一名同行者。';
      }

      const supports = getParadeSupports(this.members);
      if (this.teamSupport?.smashFallback) {
        supports.push({ label: '合力推石', detail: '全队贴墙顶' });
      }

      parade = {
        stage: level.stage,
        total: PARADE_ROUTE.totalStages,
        stageLabel: chapter?.stageLabel ?? '',
        name: chapter?.name ?? '',
        title: chapter?.title ?? '',
        objective: level.objective,
        count,
        totalMembers: PARADE_TOTAL_YOKAI,
        gateCount,
        gateTotal: count,
        scatters: session.paradeScatters ?? 0,
        spread,
        body,
        track: {
          id: track.id,
          name: track.name,
          tier: track.tier,
          badge: track.badge,
          detail: track.detail,
          lossRule: track.lossRule,
        },
        lost,
        rescueReady: session.paradeRescueReady ?? 0,
        nineLives:
          Boolean(this.teamSupport?.nineLives) && !session.paradeNineLivesUsed,
        members: memberInfo,
        upcoming,
        supports,
      };
    }

    let trick = null;
    if (this.mode === 'trick') {
      const states = session.trickHouses ?? {};
      const helped = Object.values(states).filter((state) => state === 'help').length;
      const tricked = Object.values(states).filter((state) => state === 'trick').length;
      const left = Math.max(0, TRICK_HOUSES.length - helped - tricked);
      const activeHouse = session.trickActiveHouse
        ? getTrickHouse(session.trickActiveHouse)
        : null;
      const roomHouse = session.trickRoom
        ? getTrickHouseByRoom(session.trickRoom)
        : null;
      const nearDoor = device?.type === 'candyDoor' ? device : null;
      // 「下一户」只看前面还没敲过的门：走过的留在身后。
      // 按门号取第一扇没做完的门会让提示在整条街上一直停在女巫那户。
      const doors = (this.level.devices ?? [])
        .filter((entry) => entry.type === 'candyDoor')
        .sort((a, b) => a.x - b.x);
      const aheadDoor =
        doors.find(
          (entry) => !entry.done && entry.x + VIEW.TILE * 0.5 >= this.player.centerX,
        ) ?? null;
      const behindDoor = [...doors].reverse().find((entry) => !entry.done) ?? null;
      const nextDoor = aheadDoor ?? behindDoor;

      let body = '';
      const race = this.race;
      const raceHouse = race?.house ?? null;
      if (race && raceHouse) {
        const gap = race.gapTiles ?? 0;
        const gapTiles = Math.round(Math.abs(gap));
        // 进度条是「领先距离」：追兵贴上来时条会空掉并变红。
        body = `${raceHouse.name}在后面追 · 跑到街尾的栅门`;
        quest = {
          kind: 'trickRace',
          text: `${raceHouse.name}在后面追`,
          remaining: gap,
          total: 18,
          progressText: `${gap >= 0 ? '甩开' : '落后'} ${gapTiles} 格`,
          ratio: clamp(gap / 18, 0, 1),
          alarm: gap < TRICK_RACE.dangerGapTiles,
        };
      } else if (session.trickRoom && roomHouse) {
        const gates = getSetGateState(this.level);
        if (gates) {
          const ratio = gates.total > 0 ? gates.solved / gates.total : 0;
          body = `${roomHouse.taskTitle} · 石门 ${gates.solved}/${gates.total}`;
          quest = {
            kind: 'trickTask',
            text: roomHouse.taskText,
            remaining: gates.solved,
            total: gates.total,
            progressText: `石门 ${gates.solved}/${gates.total}`,
            ratio,
            alarm: false,
          };
        } else {
          const ratio = clamp(
            (this.player.centerX - this.level.spawn.x) /
              Math.max(1, this.level.goalX - this.level.spawn.x),
            0,
            1,
          );
          body = `${roomHouse.taskTitle} · ${roomHouse.taskText}`;
          quest = {
            kind: 'trickTask',
            text: roomHouse.taskText,
            remaining: ratio,
            total: 1,
            progressText: `${Math.round(ratio * 100)}%`,
            ratio,
            alarm: false,
          };
        }
      } else if (activeHouse) {
        const activeTask = this.getTrickTaskForHouse(activeHouse.id);
        const progress =
          activeHouse.task.type === 'puzzle'
            ? this.getTrickPuzzleProgress(activeHouse.id)
            : this.getTrickTaskProgress(activeTask);
        const total = progress.need ?? progress.total ?? 0;
        body = `${activeHouse.taskTitle} · ${activeHouse.taskText}（${progress.text}）`;
        quest = {
          kind: 'trickTask',
          text: activeHouse.taskText,
          remaining: progress.progress,
          total,
          progressText: progress.text,
          ratio: progress.ratio,
          alarm: false,
        };
      } else if (nearDoor) {
        const house = getTrickHouse(nearDoor.houseId);
        const state = states[nearDoor.houseId];
        body = `第 ${nearDoor.houseIndex} 户 · ${house?.title ?? '客人'}${
          state === 'help' ? ' · 已经帮过' : state === 'trick' ? ' · 捣过蛋' : ''
        }`;
      } else if (aheadDoor) {
        const house = getTrickHouse(aheadDoor.houseId);
        body = `下一户：第 ${aheadDoor.houseIndex} 户 · ${house?.title ?? '客人'} · ${
          house?.taskTitle ?? ''
        }`;
      } else if (nextDoor) {
        const house = getTrickHouse(nextDoor.houseId);
        body = `前面没有没敲的门了 · 身后还有第 ${nextDoor.houseIndex} 户 · ${
          house?.title ?? '客人'
        }`;
      } else {
        body = '十户都走过了。街尾随时可以走。';
      }

      trick = {
        helped,
        tricked,
        left,
        totalHouses: TRICK_HOUSES.length,
        activeHouse: activeHouse?.id ?? null,
        activeName: activeHouse?.title ?? '',
        room: session.trickRoom,
        roomName: roomHouse?.name ?? '',
        tricks: session.trickTricks,
        candies: session.trickCandies,
        pouchTotal: this.pouch.total,
        body,
        task: quest?.kind === 'trickTask' ? quest : null,
        race:
          race && raceHouse
            ? {
                houseId: race.houseId,
                name: raceHouse.name,
                title: raceHouse.title,
                gapTiles: Math.round(race.gapTiles ?? 0),
                boosting: race.boost > 0,
                candyName: raceHouse.candyName,
              }
            : null,
      };
    }

    let sneak = null;
    if (this.isSneakStage()) sneak = getSneakHud(this);

    const costumes = COSTUMES.map((costume) => {
      const parts = costume.parts.map((type) => {
        const count = session.collected[type] ?? 0;
        const rarity = getRarity(type);
        return {
          type,
          label: getItemDef(type).label,
          rarity: getItemDef(type).rarity ?? 'common',
          rarityLabel: rarity.label,
          count,
          found: count > 0,
        };
      });
      const foundCount = parts.filter((part) => part.found).length;
      return {
        id: costume.id,
        name: costume.name,
        subtitle: costume.subtitle,
        blurb: costume.blurb,
        accent: costume.accent,
        difficulty: costume.parts.length,
        difficultyLabel: difficultyLabel(costume.parts.length),
        parts,
        foundCount,
        missing: costume.parts.length - foundCount,
        complete: session.completedCostumes.includes(costume.id),
        equipped: session.equippedCostume === costume.id,
      };
    });

    return {
      mode: this.mode,
      state: this.state,
      themeId: level.id,
      themeName: level.theme.name,
      chapter: level.theme.chapter,
      objective: level.objective,
      progress,
      bones: session.bones,
      totalBones: level.getTotalBones(),
      rightHandBones: session.rightHandBones,
      boneTypes: session.boneTypes,
      candies: session.candies,
      totalCandies: level.getTotalCandies(),
      candyTypes: session.candyTypes,
      activeEffects: Object.entries(session.candyEffects).map(([type, entry]) => {
        const effect = getCandyEffect(type);
        const buff = Boolean(effect?.kind === 'buff');
        return {
          type,
          kind: buff ? 'buff' : 'mood',
          label: buff ? effect.name : getItemDef(type).label,
          disorder: effect?.disorder ?? '',
          code: effect?.code ?? '',
          icdName: effect?.icdName ?? '',
          tag: effect?.tag ?? '',
          summary: effect?.summary ?? '',
          accent: effect?.accent ?? '#ffcf4a',
          duration: entry.duration,
          remaining: entry.remaining,
          ratio: entry.duration > 0 ? clamp(entry.remaining / entry.duration, 0, 1) : 0,
          phaseLabel:
            entry.phase === 'high' ? '高涨' : entry.phase === 'low' ? '低落' : '',
          sleeping: Boolean(effect?.sleep && session.sleeping),
        };
      }),
      costumes,
      equippedCostume: session.equippedCostume,
      time: session.time,
      shoeFit: this.getShoeFit(),
      charge: player.charge,
      field,
      electron,
      interaction,
      placement: placementStation
        ? {
            stationId: placementStation.id,
            fieldId: placementStation.fieldId,
            fieldLabel:
              level.fieldZones.find((zone) => zone.id === placementStation.fieldId)?.label ??
              '下一段场',
            boneTypes: { ...session.boneTypes },
          }
        : null,
      tutorial,
      memorial,
      opening,
      sign,
      parade,
      trick,
      sneak,
      pouchTotal: this.pouch.total,
      quest,
      introFlash: this.introFlash,
      hovering: player.hovering,
    };
  }

  getFieldStatus(field, balanced, delta, activeField, lift) {
    if (!activeField) {
      return balanced
        ? '场已就绪 · 踏入光幕后按住 ← → 调速'
        : '磁场方向错误 · 打开背包，把右手骨放入骨槽';
    }
    if (this.player.charge === 0) return '未带电 · 场力不起作用';
    if (!balanced) {
      return lift === 'up'
        ? '场未对齐 · 合力把你托向井顶'
        : '场未对齐 · 合力把你压向熔岩';
    }
    if (this.player.vx < -0.5) return '反向行进 · 按 → 转回正向';
    if (Math.abs(delta) < 0.18) return '平衡 · 保持这个速度';
    if (delta < 0) return '速度偏慢 · 按 → 加速';
    return '速度偏快 · 按 ← 减速';
  }

  /** 镜头跟随整支队伍的中心；普通线路仍然跟着主角。 */
  getFocus() {
    if (this.mode !== 'parade' || this.members.length < 2) {
      return { x: this.player.centerX, y: this.player.centerY };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const member of this.members) {
      minX = Math.min(minX, member.centerX);
      maxX = Math.max(maxX, member.centerX);
      minY = Math.min(minY, member.centerY);
      maxY = Math.max(maxY, member.centerY);
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 - 4 };
  }

  /** 镜头倍率：手机端放大画面用。记在这里，换图重建渲染器时按它恢复。 */
  setCameraZoom(zoom) {
    this.renderer?.setCameraZoom(zoom);
    this.cameraZoom = this.renderer?.cameraZoom ?? 1;
  }

  /**
   * 手机端的镜头取景：放大倍率，加上最右端给右手按键留出的空白。
   * rightPadding 是占可见宽度的比例，0 就是原来的贴边取景。
   */
  setCameraFraming({ zoom = 1, rightPadding = 0 } = {}) {
    this.setCameraZoom(zoom);
    const padding = Number(rightPadding);
    this.cameraRightPadding = Number.isFinite(padding)
      ? Math.min(0.5, Math.max(0, padding))
      : 0;
  }

  updateCamera(dt, snap = false) {
    // 镜头放大时可见范围变窄，贴边和跟随都要按可见尺寸算。
    const viewWidth = this.renderer?.viewWidth ?? VIEW.WIDTH;
    const viewHeight = this.renderer?.viewHeight ?? VIEW.HEIGHT;
    // 手机端在最右端再多滚一截：右手按键盖住的那一条留成夜空，
    // 门和走到头的主角就不会压在按键底下。
    const rightPad = viewWidth * (this.cameraRightPadding ?? 0);
    const maxX = Math.max(0, this.level.pixelWidth - viewWidth + rightPad);
    const maxY = Math.max(0, this.level.pixelHeight - viewHeight);
    const focus = this.getFocus();
    const lookAhead = clamp(this.player.vx * 0.24, -22, 22);
    const targetX = clamp(
      focus.x - viewWidth * 0.43 + lookAhead,
      0,
      maxX,
    );
    // 整体取景上移两格，让头顶的尖刺与高层路线更早进入画面。
    const targetY = clamp(
      focus.y - viewHeight * 0.56 - VIEW.TILE * 2,
      0,
      maxY,
    );

    if (snap) {
      this.camera.x = targetX;
      this.camera.y = targetY;
      return;
    }

    const smoothing = 1 - Math.exp(-dt * 7);
    this.camera.x += (targetX - this.camera.x) * smoothing;
    this.camera.y += (targetY - this.camera.y) * smoothing;
    this.camera.x = clamp(this.camera.x, 0, maxX);
    this.camera.y = clamp(this.camera.y, 0, maxY);
  }

  tick(timestamp) {
    const now = timestamp / 1000;
    if (this.lastTimestamp === 0) this.lastTimestamp = now;
    const delta = Math.min(0.05, Math.max(0, now - this.lastTimestamp));
    this.lastTimestamp = now;

    if (this.state === 'playing') {
      this.accumulator += delta;
      while (this.accumulator >= STEP && this.state === 'playing') {
        this.update(STEP);
        this.accumulator -= STEP;
      }
      // 走路时也在攒进度：落脚点之间最多丢两秒。
      this.saveClock += delta;
      if (this.saveClock >= AUTOSAVE_SECONDS) {
        this.saveClock = 0;
        this.persist();
      }
    } else if (this.state === 'ending') {
      // 碑前这一幕按真实时间走，不跟着固定步长。
      this.accumulator = 0;
      this.ending?.update(delta);
      if (this.ending?.finished) this.finishMemorialEnding();
    } else {
      this.accumulator = 0;
    }

    this.renderer.render(this, now);
    this.rafId = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
  }
}
