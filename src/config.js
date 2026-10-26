/**
 * 全局配置：画面、物理和玩家尺寸。
 * 修改这里即可统一调整手感与游戏分辨率。
 */
export const VIEW = Object.freeze({
  WIDTH: 512,
  HEIGHT: 288,
  TILE: 16,
});

export const STEP = 1 / 60;

export const PLAYER = Object.freeze({
  WIDTH: 10,
  HEIGHT: 18,
});

/**
 * 速度选择器（匀强 E/B 场）用的物理常数。
 * 内部坐标是像素，HUD 用米；18 px = 1 m 只用于换算。
 */
export const FIELD = Object.freeze({
  pixelsPerMeter: 18,
  // 单位电荷在单位场强下获得的加速度（px/s²）。校准到平衡点附近
  // 每偏离 1 px/s 产生约 1.7 px/s² 的回复，与旧手感一致。
  chargeToMass: 25.5,
  // 与速度成正比的介质阻力（1/s），也负责让悬浮可以被稳定操控。
  drag: 2.7,
  maxSpeedX: 158,
  maxSpeedY: 145,
});

export const ELECTRON = Object.freeze({
  // 电子核心附近的加速度上限。略高于重力，用来延长/改变跳跃；
  // 再高会把玩家长时间吸在半空，所以这里封顶。
  maxAcceleration: 1200,
});

export const PHYSICS = Object.freeze({
  gravity: 1050,
  maxFall: 520,
  moveSpeed: 104,
  groundAccel: 1350,
  airAccel: 820,
  groundFriction: 1500,
  airFriction: 220,
  jumpSpeed: 300,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  fastFallScale: 1.8,
  crouchScale: 0.42,
  jumpCutScale: 1.85,
});

export const PALETTE = Object.freeze({
  skyTop: '#0d0819',
  skyMid: '#1a0f2b',
  skyLow: '#302039',
  moon: '#f5e6bd',
  moonShade: '#d9c491',
  farHill: '#24152f',
  nearHill: '#180e22',
  mist: '#a681c3',
  pumpkin: '#ff7d1a',
  pumpkinLight: '#ffb347',
  pumpkinDark: '#c9520d',
  candle: '#ffd678',
  bone: '#f2e4cc',
  moss: '#657a48',
  mossLight: '#8ca466',
  earth: '#291824',
  earthDark: '#1b0f19',
  stone: '#44324f',
  stoneLight: '#5d4769',
  wood: '#59363a',
  woodLight: '#7f5046',
  cloak: '#2a173b',
  cloakLight: '#42275b',
  ink: '#120a19',
});
