// The single place for Jev (TypeSafe System One) constants: model, thresholds, and questions.
// Jev only judges; values, bounds, steps, and labels always come from the sketch's code.

export const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
// A pinned version, not an alias, so the same candidates get the same answers between runs.
export const MODEL = "jev-1.13.0";

// Choice answers below `choice` confidence, and Noul probabilities between `noulNo` and `noulYes`, come back as "review".
export const THRESHOLDS = { choice: 0.8, noulYes: 0.8, noulNo: 0.2 };

// One option per intent row in references/ui-controls.md.
export const CONTROLS = {
  BezierControl: {
    covers: "How a value changes over time within a clip: easing, acceleration, a fade or growth curve, or a pulse that rises then falls.",
    not: "The clip's duration or start time, which are numbers; a spatial path, which is a position.",
    examples: ["ease of a fade-in", "pulse envelope of a glow"],
  },
  ColorEditor: {
    covers: "One color with its opacity: a fill, stroke, ink, or solid background.",
    not: "Several colors used together (PaletteControl) or colors blended along a direction (GradientControl).",
    examples: ["letter color", "stroke color"],
  },
  PaletteControl: {
    covers: "A set of separate colors the artwork picks from or cycles through.",
    not: "Colors blended into each other along a direction, which is a gradient.",
    examples: ["three tile colors", "confetti colors"],
  },
  GradientControl: {
    covers: "Two or more color stops at positions that blend into each other.",
    not: "Separate colors used independently, which is a palette.",
    examples: ["sky wash from top to bottom", "radial glow stops"],
  },
  RangeControl: {
    covers: "A minimum and a maximum of one quantity that the artwork chooses within.",
    not: "A single number, or an interval of angles that can wrap past 0 degrees.",
    examples: ["random size between 20 and 80", "allowed speed range"],
  },
  AngleRangeControl: {
    covers: "An interval of allowed directions or angles, which can cross 0 degrees.",
    not: "One direction, or a minimum and maximum of a non-angular quantity.",
    examples: ["spray cone", "allowed rotation from 300 to 60 degrees"],
  },
  PositionControl: {
    covers: "A point in the composition: a position, offset, origin, or start or end location.",
    not: "A direction without a location, or a width and height.",
    examples: ["start position of a slide", "center of a burst"],
  },
  AngleControl: {
    covers: "A single direction or rotation in degrees, including multiple turns.",
    not: "A direction that also has a magnitude (VectorControl), or an interval of angles.",
    examples: ["rotation of a shape", "light direction"],
  },
  VectorControl: {
    covers: "A direction together with a magnitude: force, velocity, wind, or a push.",
    not: "A direction alone (AngleControl), or a point in the composition (PositionControl).",
    examples: ["wind with strength", "initial velocity"],
  },
  DimensionsControl: {
    covers: "A width and a height together, possibly with a locked aspect ratio.",
    not: "One length alone, which is a single number.",
    examples: ["tile size", "artboard dimensions"],
  },
  SliderControl: {
    covers: "Any single number: a count, size, scale, delay, duration, amount, frame rate, or percentage.",
    not: "Two related numbers (a range, a position, dimensions), or an angle, which has its own dial.",
    examples: ["number of copies", "letter size", "start scale", "frame rate"],
  },
  ChoiceControl: {
    covers: "A pick from a short fixed list of named options, or an on/off setting of the artwork, export, or interface.",
    not: "A number, even one with few useful values; playing or pausing the animation, which is the timeline's transport.",
    examples: ["alignment", "aspect ratio preset", "theme light or dark", "transparent background on or off"],
  },
  Timeline: {
    covers: "The sequence itself: whether it is playing or paused, the playhead, scrubbing, selecting a step or clip, and the keyframe timing of animated elements.",
    not: "A value that a keyframed element animates; that value gets its own control.",
    examples: ["play position", "keyframe start and end times of a clip"],
  },
  none_fits: {
    covers: "A value that needs a control the reference set does not have.",
    not: "Anything one of the other options covers, even approximately.",
    examples: ["spring stiffness with a response preview", "a freehand drawn path"],
  },
};

export const REGIONS = {
  left_panel: {
    covers: "Settings that hold for the whole piece at every moment of the sequence: composition size and aspect ratio, colors and sizes that style the whole artwork, export, and interface theme.",
    not: "A setting that only takes effect during one step or one animated clip.",
    examples: ["letter color", "background gradient", "letter size", "export format"],
  },
  inspector: {
    covers: "Settings of one step of the sequence or one animated clip within a step, such as its duration, ease, start and end values, or stagger; they only take effect while that step or clip plays.",
    not: "A color or size that styles the whole artwork throughout; an animated clip is a timeline track, not a shape or letter of the artwork.",
    examples: ["intro duration", "start scale of the intro's scale clip", "ease of the outro"],
  },
  timeline: "Playback and timing of the sequence: playing or pausing, the playhead, choosing a step or clip, and keyframe times dragged on lanes.",
};

export const SECTIONS = {
  composition: "The frame of the piece: aspect ratio and composition size.",
  artwork: "What the artwork looks like or how it moves: colors, sizes, counts, shapes, motion parameters.",
  interface: "How the editor itself looks or behaves, not the artwork: theme, panel layout.",
  export: "How files are written: format, output size, frame rate, transparency.",
};

// Every question reads one candidate: `sketch` describes the piece, `value` is the setting being judged.
export const QUESTIONS = {
  expose: {
    type: "noul",
    instructions:
      "Should the person using this creative-coding sketch be able to change `value` from the editor's interface?",
    criteria: {
      true: "An artistic, composition, export, or interface choice a person would want to adjust, or editor state the person operates directly: playing or pausing, the playhead, the selected step or clip, and opening or collapsing panels.",
      false: "Drawing mechanics that keep the artwork correct rather than shape its look, such as a text baseline or alignment anchor; or a number the code computes from other values, such as each item's position in a stagger worked out from its index, which nobody sets directly.",
    },
  },
  control: {
    type: "choice",
    instructions:
      "Which interface control should edit `value`? Judge by what the value means in `value.usage` and its shape in `value.example`.",
    criteria: CONTROLS,
  },
  region: {
    type: "choice",
    instructions:
      "In which region of the editor's workspace does the control for `value` belong?",
    criteria: REGIONS,
  },
  section: {
    type: "choice",
    instructions:
      "If `value` is shown in the left panel, which section of the left panel does it belong to?",
    criteria: SECTIONS,
  },
  persist: {
    type: "noul",
    instructions:
      "Should `value` be saved so it comes back after the page is refreshed?",
    criteria: {
      true: "A choice the person made and expects to keep: artwork parameters, their editable bounds, export settings, theme, and whether panels are open.",
      false: "Transient editor state: whether playback is running, the current selection, which step is open, keyboard focus, or a drag in progress.",
    },
  },
};
