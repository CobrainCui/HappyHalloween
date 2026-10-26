import { FIELD, PHYSICS, PLAYER, PALETTE, VIEW } from './config.js';
import { neutralEffectMods } from './candyEffects.js';
import { drawYokaiSprite } from './yokai.js';
import { drawSneakGhost } from './sneakActor.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

export class Player {
  constructor(x, y, variant = null) {
    this.w = PLAYER.WIDTH;
    this.h = PLAYER.HEIGHT;
    this.variant = variant;
    this.yokaiId = variant?.id ?? 'lantern';
    this.traits = variant?.traits ?? {};
    // 「鬼鬼祟祟」的两只小鬼：外观、配色与暴露度。
    this.appearance = 'pumpkin';
    this.ghostVariant = 0;
    this.crouchScale = null;
    this.exposure = 0;
    this.hidden = false;
    this.seen = false;

    this.onJump = null;
    this.onLand = null;
    this.onStep = null;
    this.onHoverSpark = null;
    this.onFieldEnter = null;
    this.onFieldExit = null;
    this.onElectricSpark = null;
    // 科学怪人撞塌裂石时由 Game 接管碎屑、音效和提示。
    this.onSmash = null;
    // 没有科学怪人时，撞到裂石只通知 Game，由全队一起推。
    this.onCrackBlocked = null;
    // 按住 ↓ 从单向木板落下去时通知 Game（教程用它判断「穿过木板」）。
    this.onDropThrough = null;
    // 入水 / 出水时由 Game 接管水花、气泡和声音。
    this.onWaterEnter = null;
    this.onWaterExit = null;
    // 狼人的双击冲刺与黑猫的蹬墙跳，由 Game 接管尘土和音效。
    this.onDash = null;
    this.onWallJump = null;

    this.charge = 0;
    this.shoeFit = 0.36;
    // 只有追思小径给主角穿上皮鞋；其它线路光脚，合脚度不参与手感。
    this.hasShoes = false;
    this.costume = null;
    this.currentField = null;
    this.nearElectron = null;
    this.hovering = false;
    this.inWater = false;
    this.inUpdraft = false;
    this.isGliding = false;
    this.hoverSparkTimer = 0;
    this.electronSparkTimer = 0;
    this.autoJumping = false;
    // 糖果状态的临时修正，由 Game 每帧写入。默认全部中性。
    this.effectMods = neutralEffectMods();

    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = true;
    this.crouching = false;
    this.coyote = PHYSICS.coyoteTime;
    this.jumpBuffer = 0;
    this.walkPhase = 0;
    this.stepTimer = 0;
    this.stepSide = 1;
    this.currentField = null;
    this.nearElectron = null;
    this.hovering = false;
    this.inWater = false;
    this.inUpdraft = false;
    this.isGliding = false;
    this.hoverSparkTimer = 0;
    this.electronSparkTimer = 0;
    this.autoJumping = false;
    this.extraJumpsUsed = 0;
    // 狼人双击冲刺 / 黑猫蹬墙跳的计时。
    this.dashClock = 0;
    this.dashCooldown = 0;
    this.lastDashTap = 0;
    this.wallSide = 0;
    this.wallJumpCooldown = 0;
    this.effectMods = neutralEffectMods();
    this.exposure = 0;
    this.hidden = false;
    this.seen = false;
    // 「鬼鬼祟祟」：站在谁头上 / 头上站着谁。由 sneakMode 每帧维护。
    this.standingOn = null;
    this.carrying = null;
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get centerY() {
    return this.y + this.h / 2;
  }

  get feetY() {
    return this.y + this.h;
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt, input, level) {
    this.currentField = level.getFieldAt(this.centerX, this.centerY);
    this.nearElectron = level.getNearbyElectron(this.centerX, this.centerY);
    // 雨川的水域。水只改变手感，不淹死人：沼泽怪游得快，别的脚踩着河床走。
    const wasInWater = this.inWater;
    const water = level.getWaterAt ? level.getWaterAt(this.centerX, this.centerY) : null;
    this.inWater = Boolean(water);
    const updraft = level.getUpdraftAt ? level.getUpdraftAt(this.centerX, this.centerY) : null;
    this.inUpdraft = Boolean(updraft);
    if (this.inWater && !wasInWater) this.onWaterEnter?.(this.centerX, water.y, this.vy);
    else if (!this.inWater && wasInWater) this.onWaterExit?.(this.centerX, this.feetY, this.vy);
    const traits = this.traits ?? {};
    // 百鬼夜行的队伍支援：同伴把本事分给整支队伍。
    const support = this.teamSupport ?? {};

    if (this.onGround) this.extraJumpsUsed = 0;

    // 飞行妄想优先于场悬浮：正飞着的时候，场暂时拉不住你。
    if (this.currentField && this.charge !== 0 && !this.effectMods.flight) {
      this.updateHover(dt, input, level, this.currentField);
      return;
    }

    if (this.hovering) {
      this.hovering = false;
      this.onFieldExit?.();
    }

    const wasOnGround = this.onGround;
    let landingImpact = 0;

    if (input.consumePress('up')) {
      this.jumpBuffer = PHYSICS.jumpBuffer;
    } else {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    }

    this.coyote = this.onGround
      ? PHYSICS.coyoteTime
      : Math.max(0, this.coyote - dt);

    this.crouching = this.onGround && input.isDown('down');

    this.dashClock += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.wallJumpCooldown = Math.max(0, this.wallJumpCooldown - dt);

    // 狼人「双击冲刺」：在地面上快速双击 ← / →，整支队伍一起向前扑一段。
    // 蝙蝠也在队里时，冲刺可以在空中使用（组合技「月下连扑」）。
    if (support.dash) {
      const tapRight = input.consumePress('right');
      const tapLeft = input.consumePress('left');
      const tapDir = tapRight ? 1 : tapLeft ? -1 : 0;
      if (tapDir !== 0) {
        const canDash = this.onGround || support.airDash;
        if (
          canDash &&
          !this.crouching &&
          !water &&
          this.dashCooldown <= 0 &&
          this.lastDashTap === tapDir &&
          this.dashClock <= 0.3
        ) {
          this.vx = tapDir * Math.max(Math.abs(this.vx), PHYSICS.moveSpeed * 2.6);
          this.facing = tapDir;
          this.dashCooldown = 1.1;
          this.lastDashTap = 0;
          this.onDash?.(this.centerX, this.centerY, tapDir);
        } else {
          this.lastDashTap = tapDir;
          this.dashClock = 0;
        }
      }
    } else {
      this.lastDashTap = 0;
    }

    // 黑猫「猫步」：在空中贴着墙时，可以再从墙上蹬一下。
    this.wallSide = 0;
    if (support.wallJump && !this.onGround && !water) {
      const probeY = this.y + this.h * 0.5;
      if (level.isSolidAtPixel(this.x - 1, probeY)) this.wallSide = -1;
      else if (level.isSolidAtPixel(this.x + this.w + 1, probeY)) this.wallSide = 1;
    }

    // 水平移动。鞋子越合脚，抓地和加速越自然，但提升非常克制。
    // 没有穿鞋的线路（教程、百鬼夜行、鬼鬼祟祟）按 1 倍算，不受合脚度影响。
    // 糖果状态会整体缩放移动速度与摩擦；「走神」时方向输入暂时失效，
    // 「对立违抗」时 ← 与 → 的效果对调。
    // 同行者还各有自己的体型：科学怪人慢，床单幽灵轻，沼泽怪在水里快。
    const mods = this.effectMods;
    let axis = mods.lockAxis
      ? 0
      : (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    if (mods.invertAxis) axis = -axis;
    const speedScale = this.crouching ? this.crouchScale ?? PHYSICS.crouchScale : 1;
    const shoeBonus = this.hasShoes ? 0.97 + clamp(this.shoeFit, 0, 1) * 0.06 : 1;
    const traitMove = (traits.moveScale ?? 1) * (support.speedBoost ?? 1);
    const waterMove = water
      ? traits.water
        ? traits.waterMoveScale ?? 1.2
        : 0.72
      : 1;
    const maxSpeed = PHYSICS.moveSpeed * speedScale * shoeBonus * mods.moveScale * traitMove * waterMove;
    const acceleration =
      (this.onGround ? PHYSICS.groundAccel : PHYSICS.airAccel) *
      shoeBonus *
      mods.moveScale *
      traitMove *
      waterMove;

    if (axis !== 0) {
      this.vx = approach(this.vx, axis * maxSpeed, acceleration * dt);
      this.facing = axis;
    } else {
      const friction =
        (this.onGround ? PHYSICS.groundFriction : PHYSICS.airFriction) *
        mods.frictionScale *
        (traits.frictionScale ?? 1) *
        (water ? 0.55 : 1);
      this.vx = approach(this.vx, 0, friction * dt);
    }

    // 水流：沼泽怪不受影响。水面的一层流得更急，逼着不会游的脚往深处走。
    if (water && !traits.water) {
      const nearSurface = this.centerY < water.y + 10;
      const currentX =
        nearSurface && water.surfaceCurrentX != null
          ? water.surfaceCurrentX
          : water.currentX;
      if (currentX) this.vx += currentX * dt;
    }
    // 水里的横向阻力，避免被水流一路送走。
    if (water) {
      this.vx *= Math.max(0, 1 - 1.15 * dt);
    }

    if (mods.flight) {
      // 飞行妄想：↑ 直接上升，↓ 下压；什么都不按就慢慢下沉。
      // 飞行期间不消耗跳跃输入，落地与撞顶仍由 moveVertical 处理。
      input.consumePress('up');
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.autoJumping = false;
      this.crouching = false;
      this.onGround = false;

      const flight = mods.flight;
      const rising = !mods.lockJump && input.isDown('up');
      if (rising) {
        this.vy = Math.max(-flight.maxRise, this.vy - flight.riseAccel * dt);
      } else if (input.isDown('down')) {
        this.vy = Math.min(flight.maxFall, this.vy + flight.fallAccel * dt);
      } else {
        this.vy = Math.min(flight.maxFall, this.vy + flight.idleGravity * dt);
      }
      this.vy = clamp(this.vy, -flight.maxRise, flight.maxFall);
    } else {
      const jumpVelocity =
        PHYSICS.jumpSpeed *
        mods.jumpVelocityScale *
        (traits.jumpScale ?? 1) *
        (support.jumpBoost ?? 1);

      // 起跳与土狼时间（离开平台边缘后的短暂起跳宽限）
      if (this.jumpBuffer > 0 && this.coyote > 0 && !mods.lockJump && !water) {
        this.vy = -jumpVelocity;
        this.autoJumping = false;
        this.onGround = false;
        this.crouching = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.extraJumpsUsed = 0;
        this.onJump?.(this.centerX, this.feetY, false);
      }

      // 黑猫「猫步」：身体贴着墙时，再按一次 ↑ 就从墙上蹬出去。
      // 它不消耗二段跳的次数，所以猫和蝙蝠同时在队里时，可以墙跳后再二段跳。
      let wallJumped = false;
      if (
        support.wallJump &&
        this.jumpBuffer > 0 &&
        !mods.lockJump &&
        !water &&
        !this.onGround &&
        this.coyote <= 0 &&
        this.wallSide !== 0 &&
        this.wallJumpCooldown <= 0
      ) {
        this.vy = -jumpVelocity * 0.96;
        this.vx = -this.wallSide * PHYSICS.moveSpeed * 1.45;
        this.facing = -this.wallSide;
        this.autoJumping = false;
        this.crouching = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.extraJumpsUsed = 0;
        this.wallJumpCooldown = 0.22;
        wallJumped = true;
        this.onWallJump?.(this.centerX, this.feetY, this.wallSide);
      }

      // 二段跳：蝙蝠同行时，整支队伍都能在空中再蹬一次。
      // 触发方式是「起跳后松开 ↑，在空中再按一次 ↑」。
      const extraJumps = Math.max(traits.extraJumps ?? 0, support.extraJumps ?? 0);
      if (
        this.jumpBuffer > 0 &&
        !mods.lockJump &&
        !water &&
        !this.onGround &&
        this.coyote <= 0 &&
        !wallJumped &&
        this.extraJumpsUsed < extraJumps
      ) {
        this.vy = -jumpVelocity * 0.92;
        this.autoJumping = false;
        this.crouching = false;
        this.jumpBuffer = 0;
        this.extraJumpsUsed += 1;
        this.onJump?.(this.centerX, this.feetY, true);
      }

      // 重力：松开 ↑ 更快下落；空中按 ↓ 快速下落。
      // 不受控的自动跳完整走完抛物线，不因没按住 ↑ 而被截短。
      let gravity =
        PHYSICS.gravity *
        (mods.gravityScale ?? 1) *
        (traits.gravityScale ?? 1) *
        (support.floatScale ?? 1);
      let maxFall = PHYSICS.maxFall * (traits.maxFallScale ?? 1) * (support.floatScale ?? 1);
      // 滑翔：女巫自己最强；女巫在队里时，其他人也能借一点扫帚的风。
      const glideTier = traits.glide ? 2 : support.glide ? 1 : 0;
      const gliding =
        glideTier > 0 &&
        !water &&
        !this.onGround &&
        input.isDown('up') &&
        this.vy > 0;
      this.isGliding = gliding;
      if (gliding) {
        if (glideTier === 2) {
          gravity *= 0.22;
          maxFall = Math.min(maxFall, 46);
        } else {
          gravity *= 0.28;
          maxFall = Math.min(maxFall, 58);
        }
      }
      if (this.vy < 0 && !input.isDown('up') && !this.autoJumping) {
        gravity *= PHYSICS.jumpCutScale;
      }
      if (this.vy >= 0) this.autoJumping = false;
      if (this.vy > 0 && input.isDown('down')) gravity *= PHYSICS.fastFallScale;

      if (water) {
        // 水里不能从河床起跳，只能划水；贴着水面按跳才会跃出去。
        gravity *= 0.26;
        maxFall = Math.min(maxFall, 76);
        const nearSurface = this.centerY <= water.y + 8;
        if (this.jumpBuffer > 0 && !mods.lockJump && nearSurface) {
          // 水面跃出：比陆地上的起跳更干脆，用来翻上湿滑的河岸。
          this.vy = -PHYSICS.jumpSpeed * 1.04 * (traits.jumpScale ?? 1);
          this.jumpBuffer = 0;
          this.extraJumpsUsed = Math.max(1, this.extraJumpsUsed);
          this.autoJumping = false;
          this.onJump?.(this.centerX, this.feetY, false);
        } else {
          // 气泡柱：把身体往上托，按住 ↓ 可以留在水底。
          if (updraft && !input.isDown('down')) {
            const force = updraft.force ?? -920;
            const cap = updraft.maxRise ?? -190;
            this.vy = Math.max(cap, this.vy + force * dt);
            this.jumpBuffer = 0;
            this.autoJumping = false;
          }
          // 按住 ↑ 划水：沼泽怪划得又快又稳；沼泽怪在队里时，所有人都省力一点。
          const risingCap = traits.swim ? -110 : (support.swimCap ?? -48);
          if (input.isDown('up') && !mods.lockJump && this.vy > risingCap) {
            const stroke = (traits.swim ?? 420) * (support.swimBoost ?? 1);
            this.vy = Math.max(risingCap, this.vy - stroke * dt);
            this.jumpBuffer = 0;
            this.autoJumping = false;
          }
        }
      }

      this.vy = Math.min(this.vy + gravity * dt, maxFall);
    }

    this.applyElectricForce(dt, level);

    this.moveHorizontal(this.vx * dt, level);

    const dy = this.vy * dt;
    const prevBottom = this.feetY;
    const fallSpeed = this.vy;
    this.onGround = false;
    this.moveVertical(dy, level, input.isDown('down'), prevBottom);
    if (dy > 0 && this.onGround) landingImpact = Math.abs(fallSpeed);
    if (this.onGround) this.extraJumpsUsed = 0;

    if (landingImpact > 150 && !wasOnGround) {
      this.onLand?.(this.centerX, this.feetY, landingImpact);
    }

    // 行走动画和脚步粒子
    if (this.onGround && Math.abs(this.vx) > 10) {
      this.walkPhase += Math.abs(this.vx) * dt * 0.14;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0 && !this.crouching) {
        this.stepSide *= -1;
        this.stepTimer = 0.22;
        this.onStep?.(this.centerX, this.feetY, this.stepSide, Math.abs(this.vx));
      }
    } else {
      this.stepTimer = 0;
      if (this.onGround) this.walkPhase = 0;
    }
  }

  updateHover(dt, input, level, field) {
    const justEntered = !this.hovering;
    if (justEntered) {
      this.hovering = true;
      this.vy = Math.min(this.vy, -48);
      this.jumpBuffer = 0;
      this.onFieldEnter?.(field);
    }

    this.onGround = false;
    this.crouching = false;
    this.coyote = 0;

    // 悬浮时 ↑ 不参与跳跃。按住 → 向右推进，按住 ← 向左推进；速度可以反向。
    input.consumePress('up');
    this.jumpBuffer = 0;

    // 横向：玩家自己的推进力，之后与洛伦兹力的横向分量叠加。
    // 「走神」时推进失效；「反向操作」时 ← / → 对调。
    const mods = this.effectMods;
    const wantRight = !mods.lockAxis && input.isDown('right');
    const wantLeft = !mods.lockAxis && input.isDown('left');
    const accelerate = mods.invertAxis ? wantLeft : wantRight;
    const brake = mods.invertAxis ? wantRight : wantLeft;
    if (accelerate && !brake) {
      this.vx += 98 * dt;
    } else if (brake && !accelerate) {
      this.vx -= 132 * dt;
    } else {
      this.vx = approach(this.vx, 0, 13 * dt);
    }

    // F = q(E + v × B)。轨迹完全由场和当前速度决定：
    // 偏快/偏慢不再被脚本化成“上升/下沉”，而是由 E 与 v×B 的竞争决定；
    // 未对齐的场也会按电荷正负和 B 的方向给出不同结果。
    const em = level.getFieldAcceleration(field, this.charge, this.vx, this.vy);
    // 左右都允许推进；负速度会改变 v×B 的方向，反向也有真实后果。
    this.vx = clamp(this.vx + em.x * dt, -FIELD.maxSpeedX, FIELD.maxSpeedX);

    // 悬浮时重力被场抵消，只剩介质阻力；阻力让竖直方向可以被操控。
    const dragY = -this.vy * FIELD.drag;
    this.vy = clamp(
      this.vy + (em.y + dragY) * dt,
      -FIELD.maxSpeedY,
      FIELD.maxSpeedY,
    );

    if (Math.abs(this.vx) > 2) this.facing = this.vx > 0 ? 1 : -1;

    this.moveHorizontal(this.vx * dt, level);

    const prevBottom = this.feetY;
    this.moveVertical(this.vy * dt, level, false, prevBottom);
    this.onGround = false;

    // 场的上边界：把旅人挡在可见的场域内。
    if (this.y < field.y + 8) {
      this.y = field.y + 8;
      this.vy = Math.max(this.vy, 0);
    }

    this.walkPhase += Math.abs(this.vx) * dt * 0.08;

    this.hoverSparkTimer -= dt;
    if (this.hoverSparkTimer <= 0) {
      this.hoverSparkTimer = 0.13;
      this.onHoverSpark?.(this.centerX, this.feetY, field);
    }
  }

  /**
   * 不受控的向上跳。heightMultiplier 是「跳起高度」相对普通跳跃的倍数，
   * 初速度按平方根换算；跳跃期间不锁操作，左右移动照常。
   */
  autoJump(heightMultiplier = 1) {
    const scale = this.effectMods?.jumpVelocityScale ?? 1;
    const velocity = PHYSICS.jumpSpeed * Math.sqrt(Math.max(0.05, heightMultiplier)) * scale;
    this.vy = -velocity;
    this.autoJumping = true;
    this.onGround = false;
    this.crouching = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.onJump?.(this.centerX, this.feetY, true);
  }

  /** 抽动：一下很短的向上弹动，同时随机向一侧偏一点。 */
  ticImpulse(push = 70, hop = 150) {
    this.vx += (Math.random() < 0.5 ? -1 : 1) * push * (0.6 + Math.random() * 0.8);
    if (this.onGround) {
      this.vy = -hop;
      this.autoJumping = false;
      this.onGround = false;
      this.crouching = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    } else {
      this.vy -= hop * 0.4;
    }
  }

  /** 惊恐冲刺：一股向前（或向后）的冲力，并带一个短促的惊跳。 */
  panicDash(speed = 250, hop = 150) {
    this.vx = this.facing * speed;
    if (this.onGround) {
      this.vy = -hop;
      this.autoJumping = false;
      this.onGround = false;
      this.crouching = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }
  }

  /** 惊跳：没有来由地向后缩一下，脚离地一点点。 */
  startle(push = 70, hop = 110) {
    this.vx = -this.facing * push;
    if (this.onGround) {
      this.vy = -hop;
      this.autoJumping = false;
      this.onGround = false;
      this.crouching = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    } else {
      this.vy -= hop * 0.35;
    }
  }

  /** 反复检查：脚步自己掉头，往回走几步。 */
  checkTurn(push = 110, hop = 70) {
    this.facing = -this.facing;
    this.vx = this.facing * push;
    if (this.onGround) {
      this.vy = -hop;
      this.autoJumping = false;
      this.onGround = false;
      this.crouching = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }
  }

  applyElectricForce(dt, level) {
    if (this.charge === 0 || level.electrons.length === 0) return;

    // 电子带负电：正电荷沿电场线被吸引，负电荷逆电场线被排斥。
    // 多个电子的场按矢量叠加，符号统一由 getElectronAcceleration 处理。
    const acceleration = level.getElectronAcceleration(
      this.centerX,
      this.centerY,
      this.charge,
    );
    this.vx += acceleration.x * dt;
    this.vy += acceleration.y * dt;

    if (this.nearElectron && this.nearElectron.distance < 30) {
      this.electronSparkTimer -= dt;
      if (this.electronSparkTimer <= 0) {
        this.electronSparkTimer = 0.18;
        this.onElectricSpark?.(this.nearElectron.x, this.nearElectron.y);
      }
    }

    this.vx = clamp(this.vx, -250, 250);
    this.vy = clamp(this.vy, -500, PHYSICS.maxFall);
  }

  moveHorizontal(dx, level) {
    if (dx === 0) return;
    const T = VIEW.TILE;
    this.x += dx;

    const rowTop = Math.floor(this.y / T);
    const rowBottom = Math.floor((this.y + this.h - 0.001) / T);

    if (dx > 0) {
      const col = Math.floor((this.x + this.w - 0.001) / T);
      for (let row = rowTop; row <= rowBottom; row += 1) {
        const tile = level.getTile(col, row);
        if (tile === 'C' && this.traits?.smash) {
          level.breakColumn(col, row);
          this.onSmash?.(col * T, row * T);
        } else if (tile === 'C') {
          this.onCrackBlocked?.(col, row);
        }
        if (level.isSolid(col, row)) {
          this.x = col * T - this.w;
          this.vx = 0;
          break;
        }
      }
    } else {
      const col = Math.floor(this.x / T);
      for (let row = rowTop; row <= rowBottom; row += 1) {
        const tile = level.getTile(col, row);
        if (tile === 'C' && this.traits?.smash) {
          level.breakColumn(col, row);
          this.onSmash?.(col * T, row * T);
        } else if (tile === 'C') {
          this.onCrackBlocked?.(col, row);
        }
        if (level.isSolid(col, row)) {
          this.x = (col + 1) * T;
          this.vx = 0;
          break;
        }
      }
    }
  }

  moveVertical(dy, level, downHeld, prevBottom) {
    if (dy === 0) return;
    const T = VIEW.TILE;
    this.y += dy;

    const colLeft = Math.floor(this.x / T);
    const colRight = Math.floor((this.x + this.w - 0.001) / T);

    if (dy > 0) {
      const row = Math.floor((this.y + this.h - 0.001) / T);
      for (let col = colLeft; col <= colRight; col += 1) {
        const tile = level.getTile(col, row);
        // 'G' 是关着的铁门，'S' 是正在维持的影子桥；都由 isSolid 统一判断。
        const solid = level.isSolid(col, row);
        const canLandOnOneWay =
          tile === 'P' &&
          !downHeld &&
          prevBottom <= row * T + 1;

        // 按住 ↓ 从木板上穿下去。通知 Game，教程用它判断玩家学会了「下穿」。
        if (tile === 'P' && downHeld && prevBottom <= row * T + 1) {
          this.onDropThrough?.(this.centerX, this.feetY);
        }

        if (solid || canLandOnOneWay) {
          this.y = row * T - this.h;
          this.vy = 0;
          this.onGround = true;
          return;
        }
      }
    } else {
      const row = Math.floor(this.y / T);
      for (let col = colLeft; col <= colRight; col += 1) {
        if (level.isSolid(col, row)) {
          this.y = (row + 1) * T;
          this.vy = 0;
          return;
        }
      }
    }
  }

  draw(ctx, cameraX, cameraY, time) {
    const sx = Math.round(this.centerX - cameraX);
    const sy = Math.round(this.feetY - cameraY);

    // 鬼鬼祟祟：两只半透明的小鬼，潜行时会压扁、变淡。
    if (this.appearance === 'ghost') {
      drawSneakGhost(ctx, this, time, sx, sy);
      return;
    }

    // 百鬼夜行的同行者：每一副身体有自己的画法，但共用同一套影子与状态。
    if (this.variant) {
      drawYokaiSprite(
        ctx,
        sx,
        sy,
        this.variant,
        {
          time,
          facing: this.facing,
          moving: this.onGround && Math.abs(this.vx) > 10,
          airborne: !this.onGround || this.hovering,
          crouching: this.crouching,
          walkPhase: this.walkPhase,
          inWater: this.inWater,
          gliding: this.isGliding,
          charge: this.charge,
        },
      );
      return;
    }

    const moving = this.onGround && Math.abs(this.vx) > 10;
    const airborne = !this.onGround || this.hovering || this.inWater;
    const swing = Math.sin(this.walkPhase);
    const bob = moving ? (Math.abs(swing) > 0.65 ? -1 : 0) : 0;
    const upperOffset = this.crouching ? 3 : bob;

    // 脚下的软阴影
    ctx.globalAlpha = airborne ? 0.08 : 0.24;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(sx - 5, sy - 1, 10, 2);
    ctx.globalAlpha = 1;

    // 水纹：脚下的一圈浅色涟漪，和陆地上的影子区分开。
    if (this.inWater) {
      ctx.globalAlpha = 0.28 + Math.sin(time * 4.2) * 0.06;
      ctx.fillStyle = '#8fe1de';
      ctx.fillRect(sx - 8, sy - 1, 16, 1);
      ctx.fillRect(sx - 5, sy + 2, 10, 1);
      ctx.globalAlpha = 1;
    }

    // 南瓜头的暖光
    const glow = ctx.createRadialGradient(sx, sy - 14, 1, sx, sy - 14, 25);
    glow.addColorStop(0, 'rgba(255, 152, 58, 0.18)');
    glow.addColorStop(0.55, 'rgba(255, 115, 35, 0.07)');
    glow.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 25, sy - 39, 50, 50);

    // 带电时皮肤边缘的冷色微光
    if (this.charge !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const warm = this.charge > 0;
      const electric = ctx.createRadialGradient(sx, sy - 12, 2, sx, sy - 12, 22);
      electric.addColorStop(0, warm ? 'rgba(255, 193, 91, 0.08)' : 'rgba(96, 207, 255, 0.08)');
      electric.addColorStop(1, warm ? 'rgba(255, 160, 54, 0)' : 'rgba(96, 207, 255, 0)');
      ctx.fillStyle = electric;
      ctx.fillRect(sx - 24, sy - 36, 48, 46);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(sx, sy);
    // 水里整个人是浮着的：轻轻上下漂，身体也会慢慢晃。
    if (this.inWater) {
      ctx.translate(0, Math.round(Math.sin(time * 3.1)));
      ctx.rotate(Math.sin(time * 2.2) * 0.04);
    }
    ctx.scale(this.facing, 1);

    // 腿：走路时前后交替，腾空时收起。脚上是一双崭新的皮鞋。
    const legOffset = moving ? Math.round(swing * 1.5) : 0;
    ctx.fillStyle = '#1a0e20';
    if (airborne) {
      ctx.fillRect(-5, -4, 2, 3);
      ctx.fillRect(2, -4, 2, 3);
    } else if (this.crouching) {
      ctx.fillRect(-5, -3, 3, 3);
      ctx.fillRect(1, -3, 3, 3);
    } else {
      ctx.fillRect(-4 + legOffset, -4, 2, 4);
      ctx.fillRect(2 - legOffset, -4, 2, 4);
    }

    // 皮鞋：暗棕鞋面 + 一点鞋头反光
    ctx.fillStyle = '#2e1a16';
    if (airborne) {
      ctx.fillRect(-6, -2, 4, 2);
      ctx.fillRect(2, -2, 4, 2);
    } else if (this.crouching) {
      ctx.fillRect(-6, -1, 4, 1);
      ctx.fillRect(1, -1, 4, 1);
    } else {
      ctx.fillRect(-5 + legOffset, -1, 4, 1);
      ctx.fillRect(2 - legOffset, -1, 4, 1);
    }
    ctx.fillStyle = '#8a6045';
    if (airborne) {
      ctx.fillRect(-6, -2, 1, 1);
      ctx.fillRect(2, -2, 1, 1);
    } else {
      ctx.fillRect(-5 + legOffset, -1, 1, 1);
      ctx.fillRect(2 - legOffset, -1, 1, 1);
    }

    ctx.save();
    ctx.translate(0, upperOffset);

    // 斗篷
    ctx.fillStyle = PALETTE.cloak;
    ctx.fillRect(-5, -13, 10, 2);
    if (airborne) {
      ctx.fillRect(-8, -11, 16, 3);
      ctx.fillRect(-6, -8, 12, 5);
    } else {
      ctx.fillRect(-6, -11, 12, 4);
      ctx.fillRect(-5, -7, 10, 3);
    }
    ctx.fillStyle = PALETTE.cloakLight;
    ctx.fillRect(-4, -11, 2, 5);
    ctx.fillRect(-3, -6, 2, 2);
    ctx.fillStyle = '#1b0f28';
    ctx.fillRect(-5, -4, 10, 1);

    // 手臂和提灯
    const lanternLift = airborne ? -1 : moving ? Math.round(Math.sin(this.walkPhase + 1) * 1) : 0;
    ctx.fillStyle = PALETTE.cloak;
    ctx.fillRect(5, -9 + lanternLift, 3, 2);

    ctx.save();
    ctx.translate(7, -7 + lanternLift);
    ctx.fillStyle = '#53312f';
    ctx.fillRect(0, -2, 4, 1);
    ctx.fillRect(0, 1, 4, 1);
    ctx.fillRect(0, -2, 1, 4);
    ctx.fillRect(3, -2, 1, 4);
    ctx.fillStyle = PALETTE.candle;
    ctx.fillRect(1, -1, 2, 2);
    ctx.fillStyle = '#fff0b3';
    ctx.fillRect(1, -1, 1, 1);
    ctx.restore();

    // 南瓜头
    ctx.fillStyle = PALETTE.pumpkinDark;
    ctx.fillRect(-3, -21, 6, 1);
    ctx.fillRect(-4, -20, 8, 1);
    ctx.fillRect(-5, -19, 10, 7);
    ctx.fillRect(-4, -12, 8, 1);

    ctx.fillStyle = PALETTE.pumpkin;
    ctx.fillRect(-3, -20, 6, 1);
    ctx.fillRect(-4, -19, 8, 1);
    ctx.fillRect(-5, -18, 9, 6);
    ctx.fillRect(-4, -12, 8, 1);

    ctx.fillStyle = PALETTE.pumpkinLight;
    ctx.fillRect(-3, -19, 4, 1);
    ctx.fillRect(-4, -18, 2, 2);
    ctx.fillStyle = PALETTE.pumpkinDark;
    ctx.fillRect(-4, -16, 1, 4);
    ctx.fillRect(3, -16, 1, 4);

    // 脸
    ctx.fillStyle = '#1b0d18';
    ctx.fillRect(-4, -17, 2, 1);
    ctx.fillRect(-3, -16, 1, 1);
    ctx.fillRect(2, -17, 2, 1);
    ctx.fillRect(2, -16, 1, 1);
    ctx.fillRect(-2, -14, 4, 1);
    ctx.fillRect(-1, -13, 2, 1);
    ctx.fillStyle = PALETTE.candle;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(-3, -16, 1, 1);
    ctx.fillRect(3, -16, 1, 1);
    ctx.globalAlpha = 1;

    // 歪歪的尖顶帽
    ctx.fillStyle = '#1e102c';
    ctx.fillRect(-7, -22, 14, 2);
    ctx.fillRect(-4, -24, 8, 2);
    ctx.fillRect(-3, -25, 7, 1);
    ctx.fillRect(-2, -26, 5, 1);
    ctx.fillRect(-1, -27, 3, 1);
    ctx.fillRect(-3, -28, 2, 1);
    ctx.fillStyle = '#3c2352';
    ctx.fillRect(-7, -22, 14, 1);
    ctx.fillRect(-3, -24, 4, 1);
    ctx.fillStyle = PALETTE.pumpkin;
    ctx.fillRect(-4, -23, 8, 1);
    ctx.fillStyle = PALETTE.pumpkinLight;
    ctx.fillRect(-4, -23, 3, 1);

    this.drawCostume(ctx, time);

    // 电荷标记：两簇很轻的蓝色电弧
    if (this.charge !== 0) {
      const pulse = 0.45 + Math.sin(time * 11) * 0.25;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = this.charge > 0 ? '#ffd36e' : '#86e7ff';
      ctx.fillRect(-7, -10, 1, 1);
      ctx.fillRect(6, -8, 1, 1);
      ctx.fillRect(-6, -3, 1, 1);
      ctx.fillRect(4, -13, 1, 1);
      ctx.globalAlpha = 1;
    }

    // 借女巫的扫帚风滑翔时，身边也会拖出几道短风线。
    if (this.isGliding) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#c8fff7';
      ctx.fillRect(-10, -18, 5, 1);
      ctx.fillRect(6, -13, 5, 1);
      ctx.globalAlpha = 1;
    }

    // 水下的气泡：从斗篷和南瓜帽旁边往上冒
    if (this.inWater) {
      const drift = Math.round(Math.sin(time * 4.2) * 2);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#bdf6ef';
      ctx.fillRect(5 + drift, -25, 1, 1);
      ctx.fillRect(-6 - drift, -19, 2, 1);
      ctx.fillRect(3, -15 + drift, 1, 1);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * 时装只改外观，不参与碰撞和物理。
   * 调用时已经处于角色本地坐标（朝向已翻转、脚下为 0）。
   */
  drawCostume(ctx, time) {
    if (this.costume === 'ghost') this.drawGhostCostume(ctx, time);
    else if (this.costume === 'skeleton') this.drawSkeletonCostume(ctx, time);
    else if (this.costume === 'pumpkinWizard') this.drawWizardCostume(ctx, time);
  }

  drawGhostCostume(ctx, time) {
    const sway = Math.round(Math.sin(time * 2.4));

    // 床单罩住尖帽、南瓜头和斗篷，只露出皮鞋。
    ctx.fillStyle = '#e9e3d6';
    ctx.fillRect(-6, -28, 12, 2);
    ctx.fillRect(-7, -26, 14, 12);
    ctx.fillRect(-6, -14, 12, 10);
    ctx.fillRect(-6, -4 + sway, 2, 2);
    ctx.fillRect(-3, -4, 2, 3);
    ctx.fillRect(0, -4 - sway, 2, 2);
    ctx.fillRect(3, -4, 2, 3);

    // 布褶和翻边
    ctx.fillStyle = '#cfc7b6';
    ctx.fillRect(-6, -25, 1, 20);
    ctx.fillRect(6, -25, 1, 9);
    ctx.fillRect(-1, -24, 1, 9);
    ctx.fillStyle = '#f7f2e8';
    ctx.fillRect(-6, -28, 12, 1);
    ctx.fillRect(3, -22, 1, 7);

    // 剪出来的两个眼洞
    ctx.fillStyle = '#171020';
    ctx.fillRect(-4, -20, 3, 3);
    ctx.fillRect(2, -20, 3, 3);
  }

  drawSkeletonCostume(ctx, time) {
    // 头骨面具盖住南瓜脸
    ctx.fillStyle = '#efe2c8';
    ctx.fillRect(-4, -21, 8, 2);
    ctx.fillRect(-5, -19, 10, 7);
    ctx.fillRect(-4, -12, 8, 2);
    ctx.fillRect(-3, -10, 6, 1);
    ctx.fillStyle = '#171020';
    ctx.fillRect(-4, -18, 3, 3);
    ctx.fillRect(1, -18, 3, 3);
    ctx.fillRect(-1, -15, 2, 2);
    ctx.fillStyle = '#c8b79a';
    ctx.fillRect(-3, -12, 1, 1);
    ctx.fillRect(-1, -12, 1, 1);
    ctx.fillRect(1, -12, 1, 1);
    ctx.fillRect(3, -12, 1, 1);

    // 肋骨和肩骨
    ctx.fillStyle = '#e9ddc6';
    ctx.fillRect(-4, -11, 8, 1);
    ctx.fillRect(-4, -9, 8, 1);
    ctx.fillRect(-4, -7, 8, 1);
    ctx.fillRect(-4, -5, 8, 1);
    ctx.fillRect(-1, -11, 2, 7);
    ctx.fillRect(-6, -12, 2, 2);
    ctx.fillRect(4, -12, 2, 2);
  }

  drawWizardCostume(ctx, time) {
    // 星纹斗篷
    ctx.fillStyle = '#2b1a4d';
    ctx.fillRect(-6, -13, 12, 4);
    ctx.fillRect(-5, -9, 10, 5);
    ctx.fillStyle = '#3d276b';
    ctx.fillRect(-4, -12, 2, 6);
    ctx.fillRect(2, -12, 2, 6);
    ctx.fillStyle = Math.sin(time * 4) > 0 ? '#ffe6a3' : '#ffd678';
    ctx.fillRect(-3, -11, 1, 1);
    ctx.fillRect(3, -8, 1, 1);
    ctx.fillRect(-1, -6, 1, 1);
    ctx.fillRect(1, -10, 1, 1);

    // 比原来更高、更歪的尖帽
    ctx.fillStyle = '#241542';
    ctx.fillRect(-7, -23, 14, 2);
    ctx.fillRect(-5, -25, 10, 2);
    ctx.fillRect(-4, -27, 8, 2);
    ctx.fillRect(-3, -29, 6, 2);
    ctx.fillRect(-2, -31, 4, 2);
    ctx.fillRect(-1, -33, 3, 1);
    ctx.fillStyle = '#43286f';
    ctx.fillRect(-7, -23, 14, 1);
    ctx.fillRect(-3, -29, 2, 1);
    ctx.fillStyle = PALETTE.pumpkin;
    ctx.fillRect(-5, -23, 10, 1);
    ctx.fillStyle = '#ffd678';
    ctx.fillRect(0, -28, 1, 1);
    ctx.fillRect(-2, -25, 1, 1);

    // 假胡子
    ctx.fillStyle = '#ded5e4';
    ctx.fillRect(-3, -12, 6, 2);
    ctx.fillRect(-2, -10, 4, 1);

    // 左手的南瓜魔杖
    ctx.fillStyle = '#5d3a2a';
    ctx.fillRect(-9, -10, 1, 7);
    ctx.fillStyle = '#ff9b3d';
    ctx.fillRect(-10, -12, 3, 2);
    ctx.fillStyle = '#ffd678';
    ctx.fillRect(-9, -12, 1, 1);
  }
}
