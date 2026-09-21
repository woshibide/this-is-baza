import { clamp, finite, clone } from "./values.js";
// Handles use absolute normalized coordinates; solve X(time) before evaluating Y(value).
export const handleRoom = 0.75;
export const handleMin = -handleRoom;
export const handleMax = 1 + handleRoom;
export const rampDefault = [
  { x: 0, y: 0, out: { x: 0.22, y: 0 } },
  { x: 1, y: 1, in: { x: 0.78, y: 1 } },
];
export const envelopeDefault = [
  { x: 0, y: 0, out: { x: 0.22, y: 0 } },
  { x: 0.5, y: 1, in: { x: 0.28, y: 1 }, out: { x: 0.72, y: 1 } },
  { x: 1, y: 0, in: { x: 0.78, y: 0 } },
];
export function validCurve(points, defaults) {
  const point = (p) =>
    p && finite(p.x, 0, 1) && finite(p.y, handleMin, handleMax);
  const handle = (p, start, end) =>
    p && finite(p.x, start, end) && finite(p.y, handleMin, handleMax);
  return (
    Array.isArray(points) &&
    points.length === defaults.length &&
    points.every(point) &&
    points[0].x === 0 &&
    points.at(-1).x === 1 &&
    points.every(
      (p, i) =>
        ((i > 0 && i < points.length - 1) || p.y === defaults[i].y) &&
        (i === points.length - 1 ||
          (points[i + 1].x - p.x >= 0.019999 &&
            handle(p.out, p.x, points[i + 1].x) &&
            handle(points[i + 1].in, p.x, points[i + 1].x))),
    )
  );
}
// A handle is bounded by its segment's anchors, never by its opposing handle.
export function moveCurvePoint(value, { index, kind }, x, y) {
  const points = clone(value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return points;
  const anchor = points[index];
  if (kind === "anchor") {
    if (index === 0 || index === points.length - 1) return points;
    const previous = points[index - 1],
      next = points[index + 1];
    const time = clamp(x, previous.x + 0.02, next.x - 0.02);
    const delta = time - anchor.x;
    const height = clamp(y, handleMin, handleMax);
    const heightDelta = height - anchor.y;
    anchor.y = height;
    anchor.in.y = clamp(anchor.in.y + heightDelta, handleMin, handleMax);
    anchor.out.y = clamp(anchor.out.y + heightDelta, handleMin, handleMax);
    anchor.x = time;
    anchor.in.x = clamp(anchor.in.x + delta, previous.x, time);
    anchor.out.x = clamp(anchor.out.x + delta, time, next.x);
    previous.out.x = clamp(previous.out.x, previous.x, time);
    next.in.x = clamp(next.in.x, time, next.x);
  } else {
    const start = kind === "in" ? points[index - 1].x : anchor.x;
    const end = kind === "in" ? anchor.x : points[index + 1].x;
    anchor[kind].x = clamp(x, start, end);
    anchor[kind].y = clamp(y, handleMin, handleMax);
  }
  return points;
}
function cubic(a, b, c, d, t) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}
export function evaluateCurve(points, time) {
  const x = clamp(time, 0, 1),
    end = points.findIndex((p, i) => i > 0 && p.x >= x),
    b = points[end],
    a = points[end - 1];
  if (x === a.x) return a.y;
  if (x === b.x) return b.y;
  let low = 0,
    high = 1;
  // X remains monotonic when both handles stay inside the segment, even if they cross.
  for (let i = 0; i < 32; i++) {
    const u = (low + high) / 2;
    if (cubic(a.x, a.out.x, b.in.x, b.x, u) < x) low = u;
    else high = u;
  }
  return cubic(a.y, a.out.y, b.in.y, b.y, (low + high) / 2);
}
