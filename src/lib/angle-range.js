export const wrapDegrees = (value) => ((value % 360) + 360) % 360;

// Store a clockwise sweep so coincident endpoints distinguish 0° from 360°.
export function validAngleRange(value) {
  return !!value && Number.isInteger(value.start) && value.start >= 0 &&
    value.start < 360 && Number.isInteger(value.sweep) &&
    value.sweep >= 0 && value.sweep <= 360;
}

export function moveAngleRange(value, part, delta) {
  if (part === "band") return { ...value, start: wrapDegrees(value.start + delta) };
  const sweep = Math.max(0, Math.min(360, value.sweep + (part === "start" ? -delta : delta)));
  return {
    start: part === "start" ? wrapDegrees(value.start + value.sweep - sweep) : value.start,
    sweep,
  };
}

export function anglePoint(degrees, radius = 52) {
  const radians = degrees * Math.PI / 180;
  return { x: 160 + Math.sin(radians) * radius, y: 90 - Math.cos(radians) * radius };
}

export function angleRangeArc(start, sweep) {
  const from = anglePoint(start), to = anglePoint(start + sweep);
  if (sweep === 360) {
    const opposite = anglePoint(start + 180);
    return `M${from.x} ${from.y} A52 52 0 0 1 ${opposite.x} ${opposite.y} A52 52 0 0 1 ${from.x} ${from.y}`;
  }
  return `M${from.x} ${from.y} A52 52 0 ${sweep > 180 ? 1 : 0} 1 ${to.x} ${to.y}`;
}
