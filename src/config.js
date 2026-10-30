/**
 * 全局配置：画面、物理和玩家尺寸。
 * 修改这里即可统一调整手感与游戏分辨率。
 */
export const VIEW = Object.freeze({
  WIDTH: 512,
  HEIGHT: 288,
  TILE: 16,
});

/**
 * 手机横屏时，整块画面离眼睛更远，人在镜头里显得太小。
 * 这里的倍率直接把镜头里的世界放大：1.25 表示可见范围缩到原来的 4/5，
 * 人物、南瓜、门一起变大，HUD 和虚拟按键不受影响。
 */
export const MOBILE = Object.freeze({
  cameraZoom: 1.25,
  /**
   * 右手按键占了画面右边一条，地图走到头时门和角色会正好压在按键底下。
   * 镜头在最右端再往右多滚这么多（占可见宽度的比例），整条路就往左让出来一截，
   * 多出来的那一条是夜空 —— 地图最后一列会往右续画，看起来像路继续伸进夜色里。
   */
  cameraRightPadding: 0.2,
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
  // 库仑定律 F = k·q·Q/r²。角色的质量并进常数里：
  // 加速度 a = coulombConstant · q · Q / r²（px/s²）。
  // 校准：r = 64 px 时约 1950 px/s²，接近两倍重力，刚好把一次跳跃托起来；
  // 距离翻一倍，加速度就只剩四分之一。
  coulombConstant: 8_000_000,
  // 电子在画面上有大小：把它当成半径 16 px 的均匀带电球。
  // 球外严格是 kQ/r²；球内按高斯定律线性减弱，r → 0 时不会发散。
  radius: 16,
  // 早期「有界气泡」模型的加速度上限。电磁长夜（糖纸街）还在用那套，
  // 它的 80px 裂隙靠旧手感撑着，换力律要连着重新摆平台。
  legacyMaxAcceleration: 1200,
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
