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
