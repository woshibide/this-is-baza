import { clampToLimits } from "./numeric-limits.js";

// Past 100% the view zooms out: the point stays on the rest rim and the dial shrinks to 100/length.
// A negative length, allowed when the user's limits allow it, points the opposite way.
export function dialScale(length) {
  return Math.min(1, 100 / Math.abs(length));
}

// Signed point distance from the center in rest radii.
export function pointDistance(length) {
  return Math.sign(length) * Math.min(Math.abs(length), 100) / 100;
}

// Length after dragging `delta` rest radii along the direction; the gain is the same at any zoom.
export function lengthAfterDrag(start, delta, limits, step = 1) {
  return clampToLimits(Math.round((start + delta * 100) / step) * step, limits);
}

// Signed component of a pointer offset along a direction; zero points up, clockwise is positive.
export function alongDirection(x, y, angle) {
  const radians = angle * Math.PI / 180;
  return x * Math.sin(radians) - y * Math.cos(radians);
}

export function validVector(value) {
  return !!value && Number.isSafeInteger(value.angle) &&
    Number.isSafeInteger(value.length);
}
