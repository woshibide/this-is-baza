// Editable limits are the user's clamp on a value; nothing clamps the limits themselves.
// Any safe number is a valid limit, and null removes it. There is no domain or hardcoded range:
// code that cannot handle a value guards it where it uses the value, never in the limits.
export const SAFE_MIN = Number.MIN_SAFE_INTEGER;
export const SAFE_MAX = Number.MAX_SAFE_INTEGER;
export function validLimits(value, { integer = false } = {}) {
  return Boolean(
    value &&
    [value.min, value.max].every(
      (n) =>
        n === null ||
        (Number.isFinite(n) &&
          Math.abs(n) <= SAFE_MAX &&
          (!integer || Number.isInteger(n))),
    ) &&
    (value.min === null || value.max === null || value.min <= value.max),
  );
}
export function effectiveLimits(limits) {
  return { min: limits.min ?? SAFE_MIN, max: limits.max ?? SAFE_MAX };
}
export function clampToLimits(value, limits) {
  return Math.max(limits.min, Math.min(limits.max, value));
}
export function parseLimit(text, side, limits, { integer = false } = {}) {
  const raw = text.trim().replace("−", "-");
  const value = raw === "-0" ? null : Number(raw);
  if (
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) ||
    (value !== null &&
      (!Number.isFinite(value) ||
        Math.abs(value) > SAFE_MAX ||
        (integer && !Number.isInteger(value))))
  ) {
    return {
      error: `Enter ${integer ? "a whole number" : "a number"}, or -0 for no custom limit.`,
    };
  }
  const next = { ...limits, [side]: value };
  if (!validLimits(next))
    return { error: "Minimum must be less than or equal to maximum." };
  return { value: next };
}
// A finite viewport for an unbounded control. Freeze this scale for each drag.
export function displayLimits(limits, values, fallback = { min: 0, max: 100 }) {
  let min = limits.min ?? Math.min(fallback.min, ...values);
  let max = limits.max ?? Math.max(fallback.max, ...values);
  if (min >= max) {
    if (limits.min === null) min = max - 1;
    else max = min + 1;
  }
  return { min, max };
}
// A finite viewport for a plot with a nominal extent, such as a 0–100% canvas: it shows the
// nominal extent and widens to include set limits and values outside it. Freeze it for each drag.
export function overshootView(limits, values, nominal = { min: 0, max: 100 }) {
  return {
    min: Math.min(nominal.min, limits.min ?? nominal.min, ...values),
    max: Math.max(nominal.max, limits.max ?? nominal.max, ...values),
  };
}
export function moveInterval(initial, part, delta, limits) {
  if (part === "band") {
    const shift = Math.max(
      limits.min - initial.min,
      Math.min(limits.max - initial.max, delta),
    );
    return { min: initial.min + shift, max: initial.max + shift };
  }
  return {
    ...initial,
    [part]: clampToLimits(initial[part] + delta, {
      min: part === "min" ? limits.min : initial.min,
      max: part === "min" ? initial.max : limits.max,
    }),
  };
}
