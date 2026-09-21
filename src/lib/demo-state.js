import { validLimits } from "./numeric-limits.js";
import { finite, validColor } from "./values.js";
import { rampDefault, envelopeDefault, validCurve } from "./bezier.js";
import { validTimeline } from "./timeline.js";
export const defaults = {
  ramp: rampDefault,
  envelope: envelopeDefault,
  duration: 4,
  timeline: null,
  fps: 30,
  palette: [
    { hex: "#006a78", alpha: 1 },
    { hex: "#cd654b", alpha: 0.65 },
    { hex: "#7894b2", alpha: 0.3 },
  ],
  gradient: [
    { hex: "#006a78", alpha: 1, position: 0 },
    { hex: "#7894b2", alpha: 0, position: 100 },
  ],
  range: { min: 20, max: 80 },
  position: { x: 50, y: 50 },
  rotation: 45,
  dimensions: { width: 320, height: 180, locked: true },
  count: 8,
  countBounds: { min: 1, max: 24 },
  rangeBounds: { min: 0, max: 100 },
  positionBounds: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } },
  rotationBounds: { min: -36000, max: 36000 },
  dimensionsBounds: {
    width: { min: 1, max: 4096 },
    height: { min: 1, max: 4096 },
  },
  durationBounds: { min: 0.1, max: 60 },
  gradientBounds: { min: 0, max: 100 },
  choices: { align: "center", shape: "circle", fill: true },
};
export const validators = {
  ramp: (v) => validCurve(v, rampDefault),
  envelope: (v) => validCurve(v, envelopeDefault),
  duration: (v) => finite(v, 0.1, Number.MAX_SAFE_INTEGER),
  timeline: (v) => v === null || validTimeline(v),
  fps: (v) => [24, 30, 60].includes(v),
  palette: (v) =>
    Array.isArray(v) && v.length >= 1 && v.length <= 8 && v.every(validColor),
  gradient: (v) =>
    Array.isArray(v) &&
    v.length >= 2 &&
    v.length <= 8 &&
    v.every((s) => validColor(s) && finite(s.position, 0, 100)),
  range: (v) =>
    v &&
    Number.isInteger(v.min) &&
    Number.isInteger(v.max) &&
    Number.isSafeInteger(v.min) &&
    Number.isSafeInteger(v.max) &&
    v.min <= v.max,
  position: (v) => v && finite(v.x, 0, 100) && finite(v.y, 0, 100),
  rotation: (v) => Number.isSafeInteger(v),
  dimensions: (v) =>
    v &&
    finite(v.width, 1, Number.MAX_SAFE_INTEGER) &&
    finite(v.height, 1, Number.MAX_SAFE_INTEGER) &&
    typeof v.locked === "boolean",
  count: (v) => Number.isSafeInteger(v),
  countBounds: (v) => validLimits(v, { integer: true }),
  rangeBounds: (v) => validLimits(v, { integer: true }),
  positionBounds: (v) =>
    v &&
    ["x", "y"].every((key) =>
      validLimits(v[key], { hardMin: 0, hardMax: 100 }),
    ),
  rotationBounds: (v) => validLimits(v, { integer: true }),
  dimensionsBounds: (v) =>
    v &&
    ["width", "height"].every((key) => validLimits(v[key], { hardMin: 1 })),
  durationBounds: (v) => validLimits(v, { hardMin: 0.1 }),
  gradientBounds: (v) => validLimits(v, { hardMin: 0, hardMax: 100 }),
  choices: (v) =>
    v &&
    ["left", "center", "right"].includes(v.align) &&
    ["circle", "square"].includes(v.shape) &&
    typeof v.fill === "boolean",
};
