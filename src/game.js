import { AudioKit } from './audio.js';
import { CANDY_EFFECTS, neutralEffectMods, randomBetween } from './candyEffects.js';
import {
  CANDY_TYPES,
  COSTUME_BY_ID,
  COSTUMES,
  difficultyLabel,
  getItemDef,
  getRarity,
} from './collectibles.js';
import { FIELD, STEP, VIEW } from './config.js';
import { Input } from './input.js';
import { Level } from './level.js';
import {
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
import { SNEAK_ROUTE, SNEAK_STAGES } from './sneak.js';
import {
  createSneakInput,
  createSneakState,
  getSneakCompletion,
  getSneakHud,
  initSneakStage,
  rewindSneakStageScore,
  updateSneak,
  updateSneakCamera,
} from './sneakMode.js';
import { ParticleSystem } from './particles.js';
import { Player } from './player.js';
import { PumpkinWorld } from './pumpkins.js';
import { Renderer } from './renderer.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function formatDirectionE(dir) {
  return dir === 'up' ? '↑' : '↓';
}

function formatDirectionB(dir) {
  return dir === 'in' ? '⊗' : '⊙';
}

/** 百鬼夜行的队伍支援 / 组合技：只有同行者在队里时才生效。 */
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
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    // 「鬼鬼祟祟」的第二名玩家。其它线路里只创建、不更新、不绘制。
    this.partner = new Player(
      this.level.spawn2?.x ?? this.level.spawn.x + 24,
      this.level.spawn2?.y ?? this.level.spawn.y,
    );
    this.sneakInput = createSneakInput(this.input);
    // 普通线路里 members 只有主角；百鬼夜行会把同行者陆续加进来。
    this.companions = [];
    this.members = [this.player];
    // 百鬼夜行的队伍支援：同伴会把自己的本事分给整支队伍。
    this.teamSupport = null;
    this.renderer = new Renderer(canvas, this.level, this.particles);

    this.state = 'title';
    this.mode = 'tutorial';
    // 百鬼夜行的三条赛道：下一次开局用哪一条。
    this.pendingParadeTrack = 'easy';
    this.camera = { x: 0, y: 0 };
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.introFlash = 0;
    this.damageFlash = 0;
    this.respawnGrace = 0;
    this.shoeDistance = 0;

    this.onStateChange = null;
    this.onNotice = null;
    this.onComplete = null;

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
      // 「五盏灯」追思线路：每段路一个病人；前四段每 5 秒触发，第五段留出跳跃窗口。
      routeStage: this.level.stage ?? 0,
      totalMemories: MEMORIAL_TOTAL_MEMORIES,
      seenMemories: new Set(),
      litLights: new Set(),
      memorialNext: 0,
      memorialFreeze: 0,
      memorialDrift: 0,
      memorialDoze: 0,
      memorialTunnel: 0,
      memorialPending: null,
      // 第一段南瓜车：入场动画、检查任务与超时抓狂状态。
      carriageIntro: 0,
      carriageIntroTotal: 0,
      carriageRiding: false,
      carriageX: 0,
      carriageQuest: null,
      carriageAlarm: false,
      carriageHopTimer: 0,
      // 第一段中路口的南瓜高墙：只在第一次走近时提示一次。
      pumpkinHintShown: false,
      // 「百鬼夜行」：被瘴气冲散的次数，以及最近一次撞碎石壁的时间（防重复提示）。
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
      // 「鬼鬼祟祟」的双人潜行状态。
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
    session.memorialNext = randomBetween(
      chapter.trigger.firstInterval ?? chapter.trigger.interval ?? [12, 18],
    );
    session.memorialFreeze = 0;
    session.memorialDrift = 0;
    session.memorialDoze = 0;
    session.memorialTunnel = 0;
    session.memorialPending = null;
    session.carriageQuest = null;
    session.carriageAlarm = false;
    session.carriageHopTimer = 0;
    session.carriageIntro = 0;
    session.carriageIntroTotal = 0;
    session.carriageRiding = false;
    session.carriageX = 0;
    session.pumpkinHintShown = false;

    if (chapter.stage === 1) {
      const carriage = this.level.devices.find((device) => device.type === 'carriage');
      if (carriage) {
        // 南瓜车从左侧驶入，停稳后玩家才从车上下来。
        session.carriageIntro = 2.4;
        session.carriageIntroTotal = 2.4;
        session.carriageRiding = true;
        session.carriageX = carriage.x - 220;
      }
    }

    if (!carry) session.totalMemories = MEMORIAL_TOTAL_MEMORIES;
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
          ? '科学怪人把肩膀一沉，整面裂石壁轰地塌了。'
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
    return this.audio.toggleMuted();
  }

  getShoeFit() {
    return Math.min(0.99, 0.38 + this.shoeDistance / 38000);
  }

  loadTheme(themeId, mode, carrySession = null) {
    // 百鬼夜行的赛道要跟着这一局走：新开局取 pendingParadeTrack，
    // 段落之间和重来本段则沿用 carrySession 里记下的那一条。
    const paradeTrackId =
      carrySession?.paradeTrack ?? (mode === 'parade' ? this.pendingParadeTrack : 'easy');
    this.level = new Level(themeId, { paradeTrack: paradeTrackId });
    this.pumpkins = new PumpkinWorld(this.level);
    this.renderer = new Renderer(this.canvas, this.level, this.particles);
    this.mode = mode;
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

    if (carrySession && (mode === 'memorial' || mode === 'parade' || mode === 'sneak')) {
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
    }

    if (mode === 'parade') {
      this.setupParadeParty();
    } else if (mode === 'sneak') {
      this.companions = [];
      this.members = [this.player, this.partner];
    } else {
      this.companions = [];
      this.members = [this.player];
    }
    if (mode !== 'parade') this.rebuildPartySupport();

    this.initMemorialState(Boolean(carrySession));
    if (mode === 'sneak') {
      initSneakStage(this);
      this.player.appearance = 'ghost';
      this.player.ghostVariant = 0;
      this.player.crouchScale = 0.62;
      this.partner.appearance = 'ghost';
      this.partner.ghostVariant = 1;
      this.partner.crouchScale = 0.62;
    } else {
      this.player.crouchScale = null;
      this.partner.crouchScale = null;
    }

    this.particles.clear();

    this.camera.x = 0;
    this.camera.y = 0;
    if (mode === 'sneak') updateSneakCamera(this, 0, true);
    else this.updateCamera(STEP, true);
    this.accumulator = 0;
    this.respawnGrace = 0;
    this.introFlash = 0.9;
    this.damageFlash = 0;
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

  /** 开始「五盏灯」追思路线，从第一段墓园夜路走起。 */
  startMemorial() {
    this.audio.unlock();
    this.loadTheme('memorial-1', 'memorial');
    this.setState('playing');
    this.notify(MEMORIAL_ROUTE.intro, 3600);
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
    this.setState('tracks');
  }

  closeParadeTracks() {
    if (this.state !== 'tracks') return;
    this.setState('title');
  }

  getParadeTrackId() {
    return this.session?.paradeTrack ?? this.pendingParadeTrack ?? 'easy';
  }

  /** 开始「百鬼夜行」：选一条赛道，从第一段山道走起。 */
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
    this.audio.checkpoint();
    this.notify(
      member.yokaiId === 'franken'
        ? '科学怪人留在了夜路。裂石以后要全队一起顶。'
        : `${def?.name ?? '同行者'}留在了夜路。队伍还剩 ${this.members.length} 人。`,
      4200,
    );
    this.setState('playing');
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

  /** 开始「鬼鬼祟祟」：双人同屏潜行，从第一段后院走起。 */
  startSneak() {
    this.audio.unlock();
    this.loadTheme('sneak-1', 'sneak');
    this.setState('playing');
    this.notify(SNEAK_ROUTE.intro, 5600);
    window.setTimeout(() => {
      const stage = SNEAK_STAGES[0];
      if (stage && this.mode === 'sneak' && this.state === 'playing') {
        this.notify(stage.intro, 4600);
      }
    }, 5800);
  }

  /** 百鬼名册：看当前队伍和还没遇到的客人。 */
  openRoster() {
    if (this.mode !== 'parade' || this.state !== 'playing') return;
    this.setState('roster');
  }

  closeRoster() {
    if (this.state !== 'roster') return;
    this.accumulator = 0;
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
    this.setState('title');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.setState('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.audio.unlock();
    this.accumulator = 0;
    this.setState('playing');
  }

  openBackpack() {
    if (this.state !== 'playing') return;
    this.session.backpackOpened = true;
    this.setState('inventory');
  }

  closeBackpack() {
    if (this.state !== 'inventory') return;
    this.accumulator = 0;
    this.setState('playing');
  }

  skipTutorial() {
    if (this.mode !== 'tutorial' || this.state !== 'playing') return;
    // 跳过教程后直接进入当前的主线「追思小径」，
    // 不再把已经并进第五段的「电磁长夜」当成一条独立线路。
    this.startMemorial();
    this.notify('教程已跳过。追思小径从墓园门口开始，路上的提示会照看你。', 4200);
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
      this.loadTheme(themeId, mode, carry);
    } else if (mode === 'parade') {
      // 回到这一段的起点：之前加入的同行者还在，这一段新请的客人要重新敲石鼓。
      this.loadTheme(themeId, mode, this.session);
    } else if (mode === 'sneak') {
      // 回到这一段的起点：本段之前被发现的次数也退回去。
      rewindSneakStageScore(this);
      this.loadTheme(themeId, mode, this.session);
    } else {
      this.loadTheme(themeId, mode);
    }
    this.setState('playing');
  }

  /**
   * E / 互动。传入 actor 时只让那一个角色动手——鬼鬼祟祟里
   * 鬼鬼按 E、祟祟按 /，各管各的南瓜；不传时沿用「谁最合适谁动手」。
   */
  interact(actor = null) {
    if (this.state !== 'playing') return;
    if (this.mode === 'memorial' && this.session.carriageIntro > 0) return;
    const device =
      this.mode === 'parade'
        ? this.getNearbyParadeDevice()
        : this.mode === 'sneak'
          ? null
          : this.level.getNearbyDevice(this.player.bounds);
    if (!device) {
      // 附近没有铜球、骨槽或南瓜车时，E 用来抱起 / 抛出地上的南瓜。
      // 所有线路都支持；鬼鬼祟祟里由按自己那个键的小鬼动手。
      this.interactWithPumpkin(actor);
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
        this.player.charge = 0;
        this.audio.discharge();
        this.particles.spawnElectric(this.player.centerX, this.player.centerY, 6);
        this.notify('电荷已释放。你又是绝缘的了。');
      } else {
        this.player.charge = device.charge;
        this.audio.charge();
        this.particles.spawnElectric(this.player.centerX, this.player.centerY, 10);
        const label = device.charge > 0 ? '正' : '负';
        this.notify(`电荷 q = ${device.charge > 0 ? '+1' : '-1'}。铜球借给你一小簇${label}电。`);
      }
      return;
    }

    if (device.type === 'boneSlot' && !device.solved) {
      this.openBackpack();
    }
  }

  /** 抱起或抛出南瓜。传了 actor 就只让他动手，否则挑最合适的那一个。 */
  interactWithPumpkin(actor = null) {
    const players = this.mode === 'sneak' ? [this.player, this.partner] : [this.player];
    const chosen = actor && players.includes(actor) ? actor : this.pumpkins?.pickPlayer(players);
    if (!chosen) return;
    const action = this.pumpkins.interact(chosen);
    if (!action) return;
    // 鬼鬼祟祟里祟祟用的是 /，提示里要说对他自己那个键。
    const key = this.mode === 'sneak' && chosen === this.partner ? '/' : 'E';
    if (action === 'pickup') {
      this.audio.pickup(false);
      this.particles.spawnDust(chosen.centerX, chosen.feetY, 0, 3);
      this.notify(`抱起了一颗南瓜。按 ${key} 抛出；落到另一颗上就会叠起来。`, 2200);
    } else {
      this.audio.jump();
      this.particles.spawnDust(chosen.centerX, chosen.feetY, chosen.facing, 2);
      this.notify('南瓜抛了出去。', 1500);
    }
  }

  /** 检查南瓜车的锁。任务期间检查会结束任务并解除报警。 */
  checkCarriage(carriage) {
    if (this.level.stage !== 1) return;
    const session = this.session;
    const trigger = getMemorialChapter(1)?.trigger;

    if (!session.carriageQuest) {
      this.notify('南瓜车锁着。你刚刚已经看过了。', 1800);
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
      this.notify('石鼓已经敲过了。它安静地听着队伍继续往前走。', 1800);
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
    this.audio.checkpoint();
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
      return { ok: false, message: '骨槽轻轻把这块骨头吐了出来。它在等一只真正的右手。' };
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
    return { ok: true, message: '校准完成' };
  }

  /**
   * 第一段开场：南瓜车从左侧驶入，停稳后玩家从车上下来。
   * 返回 true 表示仍在演出中，此时不结算玩家物理与路上的行为。
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

    const total = session.carriageIntroTotal || 2.4;
    session.carriageIntro = Math.max(0, session.carriageIntro - dt);
    const elapsed = total - session.carriageIntro;
    const travel = 1.5;
    const t = Math.min(1, elapsed / travel);
    const ease = 1 - (1 - t) ** 3;
    const fromX = carriage.x - 220;
    session.carriageX = fromX + (carriage.x - fromX) * ease;
    this.input.clearPressed();

    if (session.carriageRiding && elapsed >= 1.6) {
      // 下车：落到车门右侧，站定后再把操控交回玩家。
      session.carriageRiding = false;
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

    if (session.carriageIntro <= 0) {
      session.carriageX = carriage.x;
      session.carriageRiding = false;
      // 从落地开始重新计时，5 秒后才冒出第一句「回去看看」。
      session.memorialNext = 5;
    }
    return true;
  }

  update(dt) {
    this.session.time += dt;
    this.introFlash = Math.max(0, this.introFlash - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.respawnGrace = Math.max(0, this.respawnGrace - dt);

    // 双人潜行有自己的一整套循环：两个玩家、灯、石板门、影子桥。
    if (this.mode === 'sneak') {
      updateSneak(this, dt);
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
          '水里不能起跳：按住 ↑ 划水，贴近水面再按跳。气泡柱会把人托回水面。',
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
            ? '石桥压在水面上。潜下去，从桥洞里穿过去。'
            : '石梁塌在水面上。潜到水底，从下面钻过去。',
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
    // 百鬼夜行里整支队伍都参与推挤；其它线路只有主角。
    this.pumpkins.update(dt, this.members);
    this.updateCandyActions(dt);
    this.updateMemorialActions(dt);
    this.updateCarriageAlarm(dt);
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
    this.updateCheckpoints();
    this.updatePumpkinHints();
    this.updateTutorial(dt);
    this.updateHazards();
    this.updateGoal();
  }

  collectPickups() {
    const player = this.player;
    const session = this.session;
    for (const pickup of this.activePickups) {
      if (pickup.collected) continue;

      if (
        Math.abs(pickup.x - player.centerX) < 10 &&
        Math.abs(pickup.y - player.centerY) < 15
      ) {
        pickup.collected = true;
        const def = getItemDef(pickup.type);
        session.collected[pickup.type] = (session.collected[pickup.type] ?? 0) + 1;

        if (def.category === 'bone') {
          session.bones += 1;
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
  }

  /**
   * 吃下一颗糖。同种糖再吃一颗会把持续时间叠上去（最多叠到两倍），
   * 不同种类的糖则同时存在，由 updateCandyTimers 逐项相乘。
   */
  activateCandy(type) {
    const effect = CANDY_EFFECTS[type];
    if (!effect) return false;

    const session = this.session;
    const existing = session.candyEffects[type];
    if (existing) {
      existing.remaining = Math.min(effect.duration * 2, existing.remaining + effect.duration);
      this.notify(
        `${getItemDef(type).label}叠加 · ${effect.disorder}再延长 ${effect.duration} 秒（共 ${Math.ceil(existing.remaining)} 秒）。`,
        2200,
      );
    } else {
      session.candyEffects[type] = {
        remaining: effect.duration,
        duration: effect.duration,
        elapsed: 0,
      };
      this.notify(
        `吃下${getItemDef(type).label} · ${effect.disorder}（${effect.code}）· ${effect.tag} ${effect.duration} 秒。`,
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

    this.audio.tutorialChime();
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
        this.notify(`${CANDY_EFFECTS[type].disorder}消退了 · ${CANDY_EFFECTS[type].tag}结束。`, 1800);
        continue;
      }

      const effect = CANDY_EFFECTS[type];
      const effectMods = effect?.mods ?? {};
      mods.moveScale *= effectMods.moveScale ?? 1;
      mods.jumpVelocityScale *= effectMods.jumpVelocityScale ?? 1;
      mods.frictionScale *= effectMods.frictionScale ?? 1;
      mods.gravityScale *= effectMods.gravityScale ?? 1;
      if (effectMods.invertAxis) mods.invertAxis = true;
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

    this.player.effectMods = mods;
  }

  /** 结算完玩家物理后，触发各状态带来的「不受控动作」。 */
  updateCandyActions(dt) {
    const session = this.session;
    const effects = session.candyEffects;
    const player = this.player;
    if (player.hovering || session.sleeping) return;

    // 抽动障碍：短促的不自主抖动，方向和幅度都带一点随机。
    if (effects.poppingCandy) {
      session.ticNext -= dt;
      if (session.ticNext <= 0) {
        const tic = CANDY_EFFECTS.poppingCandy.tic;
        session.ticNext = randomBetween(tic.interval);
        player.ticImpulse(tic.push, tic.hop);
        this.particles.spawnDust(player.centerX, player.feetY, player.facing, 1);
      }
    }

    // 躁狂症：随机自动起跳，高度为普通跳跃的 2 倍。
    if (effects.candyCorn) {
      session.maniaNextJump -= dt;
      if (session.maniaNextJump <= 0) {
        session.maniaNextJump = randomBetween(CANDY_EFFECTS.candyCorn.autoJump.interval);
        if (player.onGround && !player.currentField) {
          player.autoJump(CANDY_EFFECTS.candyCorn.autoJump.height);
        }
      }
    }

    // 惊恐障碍：定时向前冲刺，冲刺瞬间免疫危险。
    if (effects.sourGummy) {
      session.panicNextDash -= dt;
      if (session.panicNextDash <= 0) {
        session.panicNextDash = randomBetween(CANDY_EFFECTS.sourGummy.panic.interval);
        const panic = CANDY_EFFECTS.sourGummy.panic;
        player.panicDash(panic.speed, panic.hop);
        session.panicGrace = panic.grace;
        this.particles.spawnDust(player.centerX, player.feetY, player.facing, 4);
        this.audio.spark();
      }
    }

    // 强迫症：落地后补一次重复跳跃。
    if (effects.lollipop && session.compulsionPending && player.onGround) {
      session.compulsionDelay -= dt;
      if (session.compulsionDelay <= 0) {
        session.compulsionPending = false;
        player.autoJump(CANDY_EFFECTS.lollipop.repeatJump.height);
      }
    }
  }

  /**
   * 「五盏灯」的持续状态与下一次发作计时。
   * 在玩家物理之前运行：把这一段的连续修正、定身和停顿写进 effectMods。
   */
  updateMemorialTimers(dt) {
    if (this.mode !== 'memorial') return;
    const chapter = getMemorialChapter(this.level.stage);
    if (!chapter) return;

    const session = this.session;
    const player = this.player;
    const mods = player.effectMods;
    const trigger = chapter.trigger;

    applyMemorialMods(mods, chapter);
    // 微睡眠的暗屏与惊恐发作的隧道视野都在这里自然淡出。
    session.memorialDoze = Math.max(0, session.memorialDoze - dt);
    session.memorialTunnel = Math.max(0, session.memorialTunnel - dt);

    // 第一段是南瓜车检查，走另一套计时：每 5 秒一个任务，10 秒倒计时。
    if (trigger.kind === 'carriage') {
      this.updateCarriageTimers(dt);
      return;
    }

    if (session.memorialFreeze > 0) {
      session.memorialFreeze = Math.max(0, session.memorialFreeze - dt);
      mods.lockAxis = true;
      mods.lockJump = true;
      // 反复检查 / 后退时，身体会自己往回走一小段；不是玩家按出来的。
      if (session.memorialFreeze > 0 && session.memorialDrift) {
        player.vx = session.memorialDrift;
      } else if (session.memorialFreeze <= 0) {
        session.memorialDrift = 0;
      }
      return;
    }

    if (session.memorialPending) return;

    session.memorialNext -= dt;
    if (session.memorialNext <= 0) {
      session.memorialNext = randomBetween(trigger.interval);
      session.memorialPending = trigger.kind;
    }
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
      this.notify(trigger.line ?? '我要回去看看南瓜车锁没锁。', 3000);
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
    const notice = trigger.notice ?? '';
    session.memorialDrift = 0;

    if (kind === 'startle') {
      player.startle(trigger.push, trigger.hop);
      session.memorialFreeze = 0.2;
      session.memorialDrift = -player.facing * trigger.push * 0.8;
      this.particles.spawnDust(player.centerX, player.feetY, -player.facing, 2);
    } else if (kind === 'check') {
      player.checkTurn(trigger.push, trigger.hop);
      session.memorialFreeze = 0.55;
      session.memorialDrift = player.facing * trigger.push * 0.9;
      this.particles.spawnDust(player.centerX, player.feetY, player.facing, 3);
    } else if (kind === 'slump') {
      player.vx = 0;
      session.memorialFreeze = trigger.duration ?? 1.2;
      this.particles.spawnDust(player.centerX, player.feetY, 0, 1);
    } else if (kind === 'panic') {
      // 惊恐发作：短暂定身，视野从四周向内收成一条隧道，再自己慢慢打开。
      player.vx = 0;
      session.memorialFreeze = trigger.duration ?? 1.1;
      session.memorialTunnel = trigger.tunnel ?? 2.4;
      this.audio.spark();
    } else if (kind === 'doze') {
      // 微睡眠：失去控制一小会儿，画面暗下去，随后自己醒来。
      player.vx = 0;
      session.memorialFreeze = trigger.duration ?? 0.85;
      session.memorialDoze = (trigger.duration ?? 0.85) + 0.6;
      this.particles.spawnDust(player.centerX, player.feetY, 0, 1);
    }

    this.audio.checkpoint();
    if (notice) this.notify(notice, 2400);
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
      this.notify(memory.line, 4800);
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
    this.loadTheme(chapter.levelId, 'memorial', this.session);
    this.introFlash = 0.9;
    this.accumulator = 0;
    this.notify(chapter.intro, 5600);
  }

  checkCostumeCompletion() {
    const session = this.session;
    for (const costume of COSTUMES) {
      if (session.completedCostumes.includes(costume.id)) continue;
      const complete = costume.parts.every((part) => (session.collected[part] ?? 0) > 0);
      if (!complete) continue;

      session.completedCostumes.push(costume.id);
      session.equippedCostume = costume.id;
      this.player.costume = costume.id;
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
      this.player.costume = null;
      return { ok: true, message: `换下了${costume.name}。` };
    }

    this.session.equippedCostume = id;
    this.player.costume = id;
    this.audio.pickup(true);
    return { ok: true, message: `换上了${costume.name}。` };
  }

  updateCheckpoints() {
    // 百鬼夜行要等最慢的那双脚也过了落脚点，才把整支队伍记在新位置；
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
      } else {
        break;
      }
    }
  }

  /**
   * 第一段路中央的南瓜高墙：走近时提示一次怎么用南瓜翻过去。
   * 提示只出现一次，之后靠玩家自己试。
   */
  updatePumpkinHints() {
    if (this.mode !== 'memorial' || this.level.stage !== 1) return;
    if (this.session.pumpkinHintShown) return;
    const wallX = 54 * VIEW.TILE;
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
      complete = this.session.bones > 0;
    } else if (step.id === 'pumpkin') {
      complete = pumpkinStats.pushes > 12;
    } else if (step.id === 'pumpkin-toss') {
      complete = pumpkinStats.throws > 0;
    } else if (step.id === 'pumpkin-stack') {
      // 叠高本身可以顺手做掉，但这一步要等玩家真的踩着南瓜翻过教学高墙。
      complete = pumpkinStats.stacks > 0 && this.player.centerX > 41 * VIEW.TILE;
    } else if (step.id === 'candy') {
      complete = this.session.candies > 0;
    } else if (step.id === 'backpack') {
      complete = this.session.backpackOpened;
    } else if (step.id === 'finish') {
      complete = this.player.centerX >= this.level.goalX - 6;
    }

    if (!complete) return;

    if (step.cheer) this.notify(step.cheer, 2200);
    this.audio.tutorialChime();
    this.session.tutorialStep += 1;
    this.session.tutorialStepCooldown = 0.7;

    if (this.session.tutorialStep >= steps.length) {
      this.completeRun();
    }
  }

  updateHazards() {
    if (this.respawnGrace > 0) return;
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
      this.notify('裂谷吞掉了你的脚步。回到上一个落脚点吧。', 2400);
    }

    const checkpoint = this.session.checkpoint;
    this.player.reset(checkpoint.x, checkpoint.y);
    this.player.shoeFit = this.getShoeFit();
    this.camera.x = 0;
    this.camera.y = 0;
    this.updateCamera(STEP, true);
    this.accumulator = 0;
  }

  /**
   * 百鬼夜行的危险：任何一个同行者碰到瘴气，整支队伍都会在下一个落脚点
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
    this.loadTheme(chapter.levelId, 'parade', this.session);
    this.introFlash = 0.9;
    this.accumulator = 0;
    this.notify(`${chapter.name} · ${chapter.title}。${chapter.intro}`, 6200);
  }

  /** 两个人都到门口后，进入下一段。 */
  advanceSneak() {
    const nextStage = this.level.stage + 1;
    if (nextStage > SNEAK_ROUTE.totalStages) {
      this.completeRun();
      return;
    }

    this.audio.tutorialChime();
    this.loadTheme(`sneak-${nextStage}`, 'sneak', this.session);
    this.introFlash = 0.9;
    this.accumulator = 0;
    const stage = SNEAK_STAGES[nextStage - 1];
    this.notify(`${stage.name}。${stage.intro}`, 5600);
  }

  updateGoal() {
    if (this.session.completed) return;

    if (this.mode === 'parade') {
      // 鸟居只认「所有同行者都在门下」。落在后面的脚会把整支队伍叫住。
      if (
        this.members.length > 0 &&
        this.members.every((member) => this.isMemberAtGate(member))
      ) {
        if (this.level.stage < PARADE_ROUTE.totalStages) this.advanceParade();
        else this.completeRun();
      }
      return;
    }

    if (this.mode === 'memorial') {
      if (this.player.centerX >= this.level.goalX - 4) {
        if (this.level.stage < MEMORIAL_ROUTE.totalStages) this.advanceMemorial();
        else this.completeRun();
      }
      return;
    }

    if (this.mode === 'tutorial') {
      const lastStep = this.level.tutorialSteps.length - 1;
      if (this.session.tutorialStep < lastStep) return;
    }

    if (this.player.centerX >= this.level.goalX - 4) {
      this.completeRun();
    }
  }

  completeRun() {
    if (this.session.completed) return;
    this.session.completed = true;
    this.player.vx = 0;
    this.player.vy = 0;
    this.input.releaseAll();
    this.audio.complete();
    this.onComplete?.(this.getCompletionData());
    this.setState('complete');
  }

  getCompletionData() {
    const sneakResult = this.mode === 'sneak' ? getSneakCompletion(this) : null;
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
          : this.mode === 'sneak'
            ? SNEAK_ROUTE.totalStages
            : MEMORIAL_ROUTE.totalStages,
      memories: this.session.seenMemories.size,
      totalMemories: this.session.totalMemories,
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
      spotted: sneakResult?.spotted ?? 0,
      falls: sneakResult?.falls ?? 0,
      // 鬼鬼祟祟和百鬼夜行的结尾文案跟赛道数据放在一起，结算页直接用。
      finale:
        this.mode === 'sneak'
          ? SNEAK_ROUTE.finale
          : paradeTrack?.finale ?? null,
    };
  }

  getHudState() {
    const level = this.level;
    const session = this.session;
    const player = this.player;
    const span = Math.max(1, level.goalX - level.spawn.x);
    const trailX =
      this.mode === 'parade' || this.mode === 'sneak'
        ? Math.min(...this.members.map((member) => member.centerX))
        : player.centerX;
    const progress = clamp((trailX - level.spawn.x) / span, 0, 1);
    const device =
      this.mode === 'parade'
        ? this.getNearbyParadeDevice()
        : this.mode === 'sneak'
          ? null
          : this.getNearbyDevice();

    let interaction = null;
    if (this.mode === 'memorial' && session.carriageIntro > 0) {
      // 下车演出期间不显示互动提示。
    } else if (device?.type === 'mask') {
      if (!device.joined) {
        interaction = {
          kind: 'mask',
          key: 'E',
          available: true,
          text: device.prompt ?? '敲响石鼓',
        };
      }
    } else if (device?.type === 'charger') {
      const sameCharge = player.charge === device.charge;
      const label = device.charge > 0 ? '正电' : '负电';
      interaction = {
        kind: 'charger',
        key: 'E',
        available: true,
        text: sameCharge ? `已带${label} · 按 E 释放电荷` : `握住铜球 · 带上${label}`,
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
        key: 'E',
        available: true,
        text: session.carriageQuest ? '检查南瓜车锁' : '摸摸南瓜车',
      };
    } else {
      // 附近没有装置时，把「抱起 / 抛出南瓜」交给同一条互动提示。
      // 鬼鬼祟祟里两个人各用各的键（鬼鬼 E、祟祟 /），两个人都够得到时一起显示。
      if (this.mode === 'sneak') {
        const promptA = this.pumpkins?.getPrompt(this.player, 'E');
        const promptB = this.pumpkins?.getPrompt(this.partner, '/');
        if (promptA && promptB) {
          interaction = {
            kind: 'pumpkin',
            key: 'E',
            altKey: '/',
            available: true,
            text: '鬼鬼 / 祟祟 · 各自抱起或抛出南瓜',
          };
        } else if (promptA) {
          interaction = { ...promptA, text: `鬼鬼 · ${promptA.text}` };
        } else if (promptB) {
          interaction = { ...promptB, text: `祟祟 · ${promptB.text}` };
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
      electron = {
        charged: player.charge !== 0,
        distance: player.nearElectron.distance,
        radius: player.nearElectron.radius,
        forceX: electronForce.x,
        forceY: electronForce.y,
        forceMag: Math.hypot(electronForce.x, electronForce.y),
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
        stageLabel: chapter?.stageLabel ?? '',
        patient: chapter?.patient ?? '',
        disorder: chapter?.disorder ?? '',
        code: chapter?.code ?? '',
        tag: chapter?.tag ?? '',
        body: chapter?.body ?? '',
        accent: chapter?.accent ?? '#d8b57a',
        memories: session.seenMemories.size,
        totalMemories: session.totalMemories,
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
        body = '全队都站在鸟居下了。灯的影子把门照开了一条缝。';
      } else if (spread > 8) {
        body = '队伍拉得太长了。往回走几步，让后面的人也跟上来。';
      } else if (gateCount > 0) {
        body = `还差 ${count - gateCount} 名同行者到门。`;
      } else if (track.lossRule === 'sacrifice') {
        body = '困难赛道：中瘴气后留下一人。';
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

    let sneak = null;
    if (this.mode === 'sneak') sneak = getSneakHud(this);

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
        const effect = CANDY_EFFECTS[type];
        return {
          type,
          label: getItemDef(type).label,
          disorder: effect?.disorder ?? '未知状态',
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
      parade,
      sneak,
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

  updateCamera(dt, snap = false) {
    const maxX = Math.max(0, this.level.pixelWidth - VIEW.WIDTH);
    const maxY = Math.max(0, this.level.pixelHeight - VIEW.HEIGHT);
    const focus = this.getFocus();
    const lookAhead = clamp(this.player.vx * 0.24, -22, 22);
    const targetX = clamp(
      focus.x - VIEW.WIDTH * 0.43 + lookAhead,
      0,
      maxX,
    );
    // 整体取景上移两格，让头顶的尖刺与高层路线更早进入画面。
    const targetY = clamp(
      focus.y - VIEW.HEIGHT * 0.56 - VIEW.TILE * 2,
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
