export const SOLO_HEALTH = 100;
export const BOTTLE_DAMAGE = 10;
export const PUNCH_DAMAGE = 25;
export const SLIPPER_GRAVITY = 500;

// Aim once at the position captured when Fox attacks; never follow him afterward.
export function slipperTrajectory(start, target) {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const seconds = Math.max(0.8, Math.min(1.3, Math.hypot(dx, dy) / 400));
  return { vx: dx / seconds, vy: (dy - 0.5 * SLIPPER_GRAVITY * seconds ** 2) / seconds, seconds };
}

export function remainingSoloHealth(health, damage) {
  return Math.max(0, health - damage);
}

export const SOLO_CHASE_SPEED = 110;
export const SOLO_PUNCH_RANGE = 85;
export const SOLO_CHARGE_MS = 650;
export const SOLO_RECOVERY_MS = 900;

export class SoloBrain {
  phase = 'chase';
  until = 0;
  direction = -1;
  attackId = 0;

  step(now, x, targetX) {
    const result = (velocity = 0, strike = false) => ({ phase: this.phase, direction: this.direction, velocity, strike, attackId: this.attackId });
    if (this.phase === 'dead' || this.phase === 'halted') return result();
    if (this.phase === 'stunned' || this.phase === 'recovery') {
      if (now < this.until) return result();
      this.phase = 'chase';
    }
    if (this.phase === 'charge') {
      if (now < this.until) return result();
      this.phase = 'recovery';
      this.until = now + SOLO_RECOVERY_MS;
      return result(0, true);
    }
    const distance = targetX - x;
    this.direction = Math.sign(distance) || this.direction;
    if (Math.abs(distance) <= SOLO_PUNCH_RANGE) {
      this.phase = 'charge';
      this.until = now + SOLO_CHARGE_MS;
      this.attackId++;
      return result();
    }
    return result(this.direction * SOLO_CHASE_SPEED);
  }

  stun(now) {
    if (this.phase === 'dead' || this.phase === 'halted') return;
    this.phase = 'stunned';
    this.until = now + 400;
    this.attackId++;
  }

  currentAttack(id) { return this.phase === 'recovery' && this.attackId === id; }
  defeat() { this.phase = 'dead'; this.attackId++; }
  halt() { this.phase = 'halted'; this.attackId++; }
}

export function soloPunchBounds(x, feetY, direction) {
  return { x: x + direction * 58 - 41, y: feetY - 92, width: 82, height: 44 };
}

export function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
