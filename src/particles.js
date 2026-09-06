/**
 * Particle Engine for visual juice and game feedback:
 * - Key pickup sparkle bursts
 * - Exit portal swirling energy
 * - Enemy collision impact sparks
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emitEMPWave(x, y) {
    this.particles.push({
      type: 'ring',
      x,
      y,
      radius: 5,
      maxRadius: 360,
      growthSpeed: 520,
      color: '#00f2ff',
      life: 0.65,
      maxLife: 0.65,
      lineWidth: 5
    });
  }

  emitStunSparks(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 16;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        size: 2 + Math.random() * 2,
        initialSize: 3,
        color: Math.random() > 0.5 ? '#00f2ff' : '#ffffff',
        life: 0.2,
        maxLife: 0.2,
        alpha: 1,
        glow: true
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'ring') {
        p.radius += p.growthSpeed * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
        p.lineWidth = Math.max(0.5, 5 * p.alpha);
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.size = Math.max(0, p.initialSize * (p.life / p.maxLife));
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      if (p.type === 'ring') {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.lineWidth;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.glow ? 8 : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  emitKeySparkles(x, y, color = '#ffd700', count = 24) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 90;
      const life = 0.4 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        initialSize: 2.5 + Math.random() * 2.5,
        color,
        life,
        maxLife: life,
        alpha: 1,
        glow: true
      });
    }
  }

  emitHitSparks(x, y, color = '#ff0055', count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 120;
      const life = 0.3 + Math.random() * 0.35;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        initialSize: 3 + Math.random() * 2,
        color,
        life,
        maxLife: life,
        alpha: 1,
        glow: true
      });
    }
  }

  emitPortalVortex(x, y, color = '#00f2ff') {
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 10;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const speed = 25;
    // Spiral inwards
    const inwardAngle = angle + Math.PI * 0.8;

    this.particles.push({
      x: px,
      y: py,
      vx: Math.cos(inwardAngle) * speed,
      vy: Math.sin(inwardAngle) * speed,
      size: 1.5 + Math.random() * 1.5,
      initialSize: 1.5 + Math.random() * 1.5,
      color,
      life: 0.5,
      maxLife: 0.5,
      alpha: 0.8,
      glow: true
    });
  }

  clear() {
    this.particles = [];
  }
}
