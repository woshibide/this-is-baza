import { clampToLimits } from "./numeric-limits.js";

// Coordinates relative to the dial center; zero points up, clockwise is positive.
export function angleAtPoint(x, y) {
  if (Math.hypot(x, y) < 6) return null;
  return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
}

export function rotationAtAngle(current, angle, limits, step = 1) {
  if (angle === null) return current;
  const orientation = ((current % 360) + 360) % 360;
  let delta = ((angle - orientation + 540) % 360) - 180;
  if (delta === -180) delta = 180;
  return clampToLimits(Math.round((current + delta) / step) * step, limits);
}
