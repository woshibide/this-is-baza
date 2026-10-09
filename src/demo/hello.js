// Workspace demo artwork: lowercase "hello" staggers in, then vanishes.
// render() is pure: the same state and time always draw the same frame, for preview, scrubbing, and export.
import { clamp, rgba } from "../lib/values.js";
import { easeOf, stepAt, trackValue } from "../lib/timeline.js";

const WORD = "hello";
const length = { label: "Letter length (% of clip)", value: 50, min: 5, max: 100, step: 1 };
const order = { label: "Order", value: "first", options: [["first", "First to last"], ["last", "Last to first"]] };
const percent = (label) => () => ({ min: 0, max: 100, unit: "%", label });

export const STEPS = [
  {
    id: "intro",
    name: "Intro",
    duration: 2.4,
    tracks: [
      {
        id: "scale", name: "Scale", start: 0, end: 1.2, ease: easeOf("back"),
        params: { from: { label: "Start scale (×)", value: 0.4, min: 0, max: 2, step: 0.01 }, length, order },
        range: (track) => ({ min: track.from, max: 1, unit: "×", label: "Scale" }),
      },
      {
        id: "slide", name: "Slide", start: 0, end: 1.2, ease: easeOf("out"),
        params: { from: { label: "Start position", value: { x: 50, y: 62 }, position: true }, length, order },
        range: percent("Travel"),
      },
      {
        id: "fade", name: "Fade", start: 0, end: 0.9, ease: easeOf("linear"),
        params: { length, order },
        range: percent("Opacity"),
      },
    ],
  },
  {
    id: "outro",
    name: "Outro",
    duration: 1.6,
    tracks: [
      {
        id: "vanish", name: "Vanish", start: 0.2, end: 1.2, ease: easeOf("in"),
        params: {
          scale: { label: "End scale (×)", value: 0.6, min: 0, max: 2, step: 0.01 },
          to: { label: "End position", value: { x: 50, y: 42 }, position: true },
          length: { ...length, value: 40 },
          order,
        },
        range: percent("Gone"),
      },
    ],
  },
];

// A subtle top-to-bottom wash behind dark letters.
export const LOOK = {
  background: [
    { hex: "#f6f1e7", alpha: 1, position: 0 },
    { hex: "#dfe6ea", alpha: 1, position: 100 },
  ],
  ink: { hex: "#161616", alpha: 1 },
  size: 28,
};

// One letter of a staggered track: letters share the clip, each taking `length` % of it, in order q (0 first, 1 last).
function letter(track, local, q) {
  const span = track.end - track.start;
  const own = span * (track.length / 100);
  const start = track.start + (span - own) * (track.order === "last" ? 1 - q : q);
  return trackValue({ start, end: start + own, ease: track.ease }, local).value;
}
const lerp = (a, b, t) => a + (b - a) * t;

// Offset of an XY point (0–100%, 50/50 is the rest position) in composition pixels.
const offsetOf = (point, width, height) => ({ x: ((point.x - 50) / 100) * width, y: ((point.y - 50) / 100) * height });

// look: { background: stops, ink, size }; options.transparent skips the background.
export function render(ctx, { width, height }, look, timeline, time, { transparent = false } = {}) {
  ctx.clearRect(0, 0, width, height);
  if (!transparent) {
    const wash = ctx.createLinearGradient(0, 0, 0, height);
    for (const stop of [...look.background].sort((a, b) => a.position - b.position))
      wash.addColorStop(stop.position / 100, rgba(stop));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
  }
  const { index, local } = stepAt(STEPS, timeline.durations, time);
  const step = STEPS[index].id;
  const { intro, outro } = timeline.tracks;
  const size = (look.size / 100) * height;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = rgba(look.ink);
  const widths = [...WORD].map((char) => ctx.measureText(char).width);
  let x = (width - widths.reduce((a, b) => a + b, 0)) / 2;
  [...WORD].forEach((char, i) => {
    const q = WORD.length > 1 ? i / (WORD.length - 1) : 0;
    let scale = 1, alpha = 1, dx = 0, dy = 0;
    if (step === "intro") {
      const from = offsetOf(intro.slide.from, width, height);
      const travel = letter(intro.slide, local, q);
      scale = lerp(intro.scale.from, 1, letter(intro.scale, local, q));
      dx = lerp(from.x, 0, travel);
      dy = lerp(from.y, 0, travel);
      alpha = letter(intro.fade, local, q);
    } else {
      const to = offsetOf(outro.vanish.to, width, height);
      const gone = letter(outro.vanish, local, q);
      scale = lerp(1, outro.vanish.scale, gone);
      dx = lerp(0, to.x, gone);
      dy = lerp(0, to.y, gone);
      alpha = 1 - gone;
    }
    const center = x + widths[i] / 2;
    x += widths[i];
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(center + dx, height / 2 + dy);
    ctx.scale(scale, scale);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
}
