const DUST_COLORS = ['#8b728e', '#6f5a79', '#a48a99', '#57445f'];

export class ParticleSystem {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  spawnDust(x, y, direction = 0, amount = 4) {
    for (let i = 0; i < amount; i += 1) {
      this.items.push({
        kind: 'dust',
        x: x + (Math.random() - 0.5) * 7,
        y: y - Math.random() * 3,
        vx: (Math.random() - 0.5) * 24 - direction * 10,
        vy: -Math.random() * 24 - 4,
        gravity: 60,
        size: Math.random() < 0.45 ? 2 : 1,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        color: DUST_COLORS[(Math.random() * DUST_COLORS.length) | 0],
        glow: false,
      });
    }
  }

  spawnLanding(x, y, impact = 200) {
    const amount = Math.min(11, 4 + Math.round(impact / 60));
    for (let i = 0; i < amount; i += 1) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.items.push({
        kind: 'dust',
        x: x + (Math.random() - 0.5) * 9,
        y: y - Math.random() * 2,
        vx: side * (16 + Math.random() * 48),
        vy: -Math.random() * 35,
        gravity: 150,
        size: Math.random() < 0.55 ? 2 : 1,
        life: 0.3 + Math.random() * 0.38,
        maxLife: 0.68,
        color: DUST_COLORS[(Math.random() * DUST_COLORS.length) | 0],
        glow: false,
      });
    }
  }

  spawnSplash(x, y, amount = 7) {
    const colors = ['#bdf6ef', '#8fe1de', '#eafffb', '#6ec9c4'];
    for (let i = 0; i < amount; i += 1) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.items.push({
        kind: 'splash',
        x: x + (Math.random() - 0.5) * 10,
        y: y - Math.random() * 2,
        vx: side * (18 + Math.random() * 55),
        vy: -35 - Math.random() * 75,
        gravity: 300,
        size: Math.random() < 0.5 ? 2 : 1,
        life: 0.25 + Math.random() * 0.3,
        maxLife: 0.55,
        color: colors[(Math.random() * colors.length) | 0],
        glow: false,
      });
    }
  }

  spawnBubble(x, y, amount = 1, spread = 7) {
    const colors = ['#bdf6ef', '#8fe1de', '#eafffb'];
    for (let i = 0; i < amount; i += 1) {
      this.items.push({
        kind: 'bubble',
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 10,
        vy: -14 - Math.random() * 26,
        gravity: -22,
        size: Math.random() < 0.35 ? 2 : 1,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 1.2,
        color: colors[(Math.random() * colors.length) | 0],
        glow: false,
      });
    }
  }

  spawnSpark(x, y, amount = 3) {
    for (let i = 0; i < amount; i += 1) {
      this.items.push({
        kind: 'spark',
        x,
        y,
        vx: (Math.random() - 0.5) * 26,
        vy: -18 - Math.random() * 30,
        gravity: 24,
        size: 1,
        life: 0.3 + Math.random() * 0.35,
        maxLife: 0.65,
        color: Math.random() < 0.5 ? '#ffd678' : '#ff9d38',
        glow: true,
      });
    }
  }

  spawnElectric(x, y, amount = 4) {
    for (let i = 0; i < amount; i += 1) {
      this.items.push({
        kind: 'electric',
        x: x + (Math.random() - 0.5) * 9,
        y: y + (Math.random() - 0.5) * 9,
        vx: (Math.random() - 0.5) * 70,
        vy: (Math.random() - 0.5) * 60 - 8,
        gravity: 5,
        size: Math.random() < 0.3 ? 2 : 1,
        life: 0.22 + Math.random() * 0.32,
        maxLife: 0.54,
        color: Math.random() < 0.45 ? '#d9f8ff' : '#61d7ff',
        glow: true,
      });
    }
  }

  spawnBoneBurst(x, y) {
    // 所有骨头共用同一套碎屑，避免用颜色暗示哪一种骨头更特殊。
    const colors = ['#f2e4cc', '#cdb99e', '#fff4d8'];
    for (let i = 0; i < 7; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 36;
      this.items.push({
        kind: 'bone',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 16,
        gravity: 85,
        size: Math.random() < 0.35 ? 2 : 1,
        life: 0.35 + Math.random() * 0.36,
        maxLife: 0.7,
        color: colors[(Math.random() * colors.length) | 0],
        glow: false,
      });
    }
  }

  spawnCandyBurst(x, y) {
    const colors = ['#ff6fa5', '#ffd166', '#fff4d8', '#ff9b3d'];
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 24 + Math.random() * 34;
      this.items.push({
        kind: 'candy',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        gravity: 120,
        size: Math.random() < 0.45 ? 2 : 1,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: colors[(Math.random() * colors.length) | 0],
        glow: true,
      });
    }
  }

  spawnPartBurst(x, y) {
    // 时装零件用偏冷的纸片碎屑，和骨头、糖果区分开。
    const colors = ['#c9b6ef', '#8f74c9', '#ffe2b5', '#f2ecff'];
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.items.push({
        kind: 'part',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        gravity: 100,
        size: Math.random() < 0.4 ? 2 : 1,
        life: 0.32 + Math.random() * 0.34,
        maxLife: 0.66,
        color: colors[(Math.random() * colors.length) | 0],
        glow: true,
      });
    }
  }

  spawnDeathBurst(x, y, hazardType = 'lava') {
    const colors = hazardType === 'lava'
      ? ['#ff7d1a', '#ffd166', '#e23e16', '#ffb347']
      : hazardType === 'spikes'
        ? ['#e8dcc7', '#c7b6a0', '#8f4a3c', '#fff4d8']
        : ['#9d6bd3', '#62418c', '#d5b8ef', '#39254c'];

    for (let i = 0; i < 16; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 26 + Math.random() * 90;
      this.items.push({
        kind: 'death',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        gravity: 220,
        size: Math.random() < 0.4 ? 2 : 1,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
        color: colors[(Math.random() * colors.length) | 0],
        glow: hazardType === 'lava',
      });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const particle = this.items[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }

      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
    }
  }

  draw(ctx, cameraX, cameraY = 0) {
    for (const particle of this.items) {
      const alpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));
      const x = Math.round(particle.x - cameraX);
      const y = Math.round(particle.y - cameraY);

      ctx.globalAlpha = alpha;
      if (particle.glow) {
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.fillStyle = particle.color;
      ctx.fillRect(x, y, particle.size, particle.size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
}
