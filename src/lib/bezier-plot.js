import { moveCurvePoint } from "./bezier.js";

const restingHeight = 140;
export const plotPadding = restingHeight * 0.75 / 4;
export const graphHeight = restingHeight + 2 * plotPadding;
const markerInset = 8;

// Keep the frame fixed while the entire value scale fits the edited curve.
export function curveViewport(points) {
  const values = points.flatMap((p) => [p.y, p.in?.y, p.out?.y])
    .filter((y) => y !== undefined);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const margin = (plotPadding - markerInset) / restingHeight;
  const height = (graphHeight - 2 * markerInset) / (max - min + 2 * margin);
  const bottom = markerInset + (max + margin) * height;
  return { min, max, height, bottom, py: (y) => markerInset + (max - y + margin) * height };
}

// Keep grid density readable regardless of the current value range.
export function curveGridValues(points) {
  const view = curveViewport(points);
  const desired = Math.max(0.25, (view.max - view.min) / 8);
  const magnitude = 10 ** Math.floor(Math.log10(desired));
  const step = [1, 2, 2.5, 5, 10].find((n) => n * magnitude >= desired) * magnitude;
  const first = Math.ceil(view.min / step);
  const count = Math.floor(view.max / step) - first + 1;
  return [...new Set([0, 1, ...Array.from({ length: count }, (_, i) => (first + i) * step)])]
    .sort((a, b) => a - b);
}

// Points are the pointer-down snapshot. Keep its scale for the whole gesture,
// with half-speed vertical movement so rescaling cannot amplify small drags.
export function moveCurvePointInPlot(points, selected, x, pixelY) {
  if (![x, pixelY].every(Number.isFinite)) return points;
  const anchor = points[selected.index];
  const point = selected.kind === "anchor" ? anchor : anchor[selected.kind];
  const view = curveViewport(points);
  const deltaY = (view.py(point.y) - pixelY) / view.height;
  return moveCurvePoint(points, selected, x, point.y + deltaY * 0.5);
}
