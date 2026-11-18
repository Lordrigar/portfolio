export const POWER_DURATION = 20_000;
export const POWER_COOLDOWN = 30_000;

export class PowerupState {
  phase = 'idle';
  activeUntil = 0;
  cooldownUntil = 0;
  bonusHealth = 0;

  request(now, bottles) {
    if (bottles < 1) return 'missing-bottle';
    if (this.phase !== 'idle' || now < this.cooldownUntil) return 'unavailable';
    this.phase = 'drinking';
    return 'started';
  }

  activate(now) {
    if (this.phase !== 'flashing') return false;
    this.phase = 'active';
    this.activeUntil = now + POWER_DURATION;
    this.cooldownUntil = now + POWER_COOLDOWN;
    this.bonusHealth = 2;
    return true;
  }

  expire(now) {
    if (this.phase !== 'active' || now < this.activeUntil) return false;
    this.phase = 'idle';
    this.bonusHealth = 0;
    return true;
  }

  absorbDamage(amount) {
    const absorbed = Math.min(this.bonusHealth, amount);
    this.bonusHealth -= absorbed;
    return amount - absorbed;
  }

  remaining(now) { return Math.max(0, this.activeUntil - now); }
  cooldown(now) { return Math.max(0, Math.ceil((this.cooldownUntil - now) / 1000)); }

  cancel() {
    this.phase = 'idle';
    this.bonusHealth = 0;
    this.activeUntil = 0;
  }
}
