import { validLimits } from "./numeric-limits.js";
import { validColor } from "./values.js";
import { rampDefault, envelopeDefault } from "./bezier.js";
import { defaultDurations, defaultTracks, validDurations } from "./timeline.js";
import { validAngleRange } from "./angle-range.js";
import { validVector } from "./vector.js";
// The timing examples are two steps of one timeline; their Bézier curves are the tracks' eases.
export const timelineSteps = [
  {
    id: "rise",
    name: "Rise",
    duration: 2,
    tracks: [{ id: "ramp", name: "Timing ramp", start: 0.25, end: 1.75, ease: rampDefault }],
  },
  {
    id: "pulse",
    name: "Pulse",
    duration: 2,
    tracks: [{ id: "envelope", name: "Pulse envelope", start: 0.25, end: 1.75, ease: envelopeDefault, envelope: true }],
  },
];
export const defaults = {
  durations: defaultDurations(timelineSteps),
  tracks: defaultTracks(timelineSteps),
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
  angleRange: { start: 300, sweep: 120 },
  position: { x: 50, y: 50 },
  rotation: 45,
  vector: { angle: 135, length: 150 },
  dimensions: { width: 320, height: 180, locked: true },
  slider: 8,
  sliderBounds: { min: 1, max: 24 },
  rangeBounds: { min: 0, max: 100 },
  positionBounds: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } },
  rotationBounds: { min: -36000, max: 36000 },
  vectorBounds: { angle: { min: -36000, max: 36000 }, length: { min: 0, max: 200 } },
  dimensionsBounds: {
    width: { min: 1, max: 4096 },
    height: { min: 1, max: 4096 },
  },
  durationLimits: { min: 0.1, max: 60 },
  gradientBounds: { min: 0, max: 100 },
  choices: { align: "center", shape: "circle", fill: true },
};
export const validators = {
  angleRange: validAngleRange,
  durations: (v) => validDurations(timelineSteps, v),
  // Track contents are merged key by key with restoreTracks after loading.
  tracks: (v) => v !== null && typeof v === "object",
  palette: (v) =>
    Array.isArray(v) && v.length >= 1 && v.length <= 8 && v.every(validColor),
  gradient: (v) =>
    Array.isArray(v) &&
    v.length >= 2 &&
    v.length <= 8 &&
    v.every((s) => validColor(s) && Number.isFinite(s.position)),
  range: (v) =>
    v &&
    Number.isInteger(v.min) &&
    Number.isInteger(v.max) &&
    Number.isSafeInteger(v.min) &&
    Number.isSafeInteger(v.max) &&
    v.min <= v.max,
  position: (v) => v && Number.isFinite(v.x) && Number.isFinite(v.y),
  rotation: (v) => Number.isSafeInteger(v),
  dimensions: (v) =>
    v &&
    Number.isFinite(v.width) &&
    Number.isFinite(v.height) &&
    typeof v.locked === "boolean",
  slider: (v) => Number.isSafeInteger(v),
  sliderBounds: (v) => validLimits(v, { integer: true }),
  rangeBounds: (v) => validLimits(v, { integer: true }),
  positionBounds: (v) => v && ["x", "y"].every((key) => validLimits(v[key])),
  rotationBounds: (v) => validLimits(v, { integer: true }),
  vector: validVector,
  vectorBounds: (v) =>
    v &&
    validLimits(v.angle, { integer: true }) &&
    validLimits(v.length, { integer: true }),
  dimensionsBounds: (v) =>
    v &&
    ["width", "height"].every((key) => validLimits(v[key])),
  durationLimits: (v) => validLimits(v),
  gradientBounds: (v) => validLimits(v),
  choices: (v) =>
    v &&
    ["left", "center", "right"].includes(v.align) &&
    ["circle", "square"].includes(v.shape) &&
    typeof v.fill === "boolean",
};
