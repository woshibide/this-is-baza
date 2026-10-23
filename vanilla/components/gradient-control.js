// Spatial sRGB gradient: [{hex, alpha, position}]. Stop identities stay stable while dragging.
import { checkProps, modelSetter, h, attr, prop, style, text, children, renderer } from "../dom.js";
import { effectiveLimits, clampToLimits } from "../../src/lib/numeric-limits.js";
import { createNumberField } from "./number-field.js";
import { createGraphicPanel } from "./graphic-panel.js";
import { createColorEditor } from "./color-editor.js";
import { createIcon } from "./icon.js";
import { rgba, arrowDelta } from "../../src/lib/values.js";

const SPEC = {
  value: { type: Array, required: true },
  onInput: { type: Function },
  bounds: { type: Object, default: () => ({ min: 0, max: 100 }) },
  onBoundsInput: { type: Function },
  heading: { type: String, default: "Gradient stops" },
};

export function createGradientControl(given) {
  let props = checkProps("GradientControl", SPEC, given);
  let selected = 0;
  let pointer = null;
  let ready = false;
  let rendered = false;
  const keep = (partial) => apply(partial);
  const setModel = modelSetter(given, () => props, "value", (value) => keep({ value }), () => ready);
  const setBounds = modelSetter(given, () => props, "bounds", (bounds) => keep({ bounds }), () => ready);
  const effective = () => effectiveLimits(props.bounds, 0, 100);
  const gradient = () =>
    `linear-gradient(90deg in srgb, ${[...props.value]
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${rgba(stop)} ${stop.position}%`)
      .join(",")})`;

  function update(value) {
    setModel(props.value.map((stop, i) => (i === selected ? { ...stop, ...value } : stop)));
  }
  function setPosition(value) {
    update({ position: clampToLimits(value, effective()) });
  }
  function start(event, index) {
    if (event.button !== 0) return;
    event.preventDefault();
    selected = index;
    render();
    event.currentTarget.focus();
    pointer = event.pointerId;
    track.setPointerCapture(pointer);
    drag(event);
  }
  function drag(event) {
    if (event.pointerId !== pointer) return;
    const rect = track.getBoundingClientRect();
    setPosition(((event.clientX - rect.left) / rect.width) * 100);
  }
  function finish() {
    pointer = null;
  }
  function nudge(event, index) {
    const delta = arrowDelta(event);
    if (!delta) return;
    selected = index;
    render();
    setPosition(props.value[index].position + delta.x - delta.y);
  }
  function add() {
    if (props.value.length >= 8) return;
    const next = [...props.value, { ...props.value[selected], position: clampToLimits(50, effective()) }];
    setModel(next);
    selected = next.length - 1;
    render();
  }
  function remove() {
    if (props.value.length <= 2) return;
    const next = props.value.filter((_, i) => i !== selected);
    setModel(next);
    selected = Math.min(selected, next.length - 1);
    render();
  }

  const paint = h("div", { class: "gradient-paint" });
  const track = h(
    "div",
    { class: "gradient-track checker", on: { pointermove: drag, pointerup: finish, pointercancel: finish, lostpointercapture: finish } },
    paint,
  );
  const stops = [];
  function stopButton(i) {
    const label = document.createTextNode("");
    const check = createIcon({ name: "check" }).element;
    check.classList.add("selection-check");
    const element = h(
      "button",
      {
        class: "stop",
        on: {
          click: () => {
            selected = i;
            render();
          },
          pointerdown: (event) => start(event, i),
          keydown: (event) => nudge(event, i),
        },
      },
      label,
      check,
    );
    return { element, label };
  }
  const addButton = h("button", { on: { click: add } }, createIcon({ name: "plus" }).element, "Add stop");
  const removeButton = h("button", { on: { click: remove } }, " Remove stop ");
  const color = createColorEditor({ value: props.value[selected], onInput: (value) => update(value) });
  const position = createNumberField({
    limits: props.bounds,
    onLimitsInput: (bounds) => setBounds(bounds),
    label: "Selected stop position %",
    value: +props.value[selected].position.toFixed(2),
    min: 0,
    max: 100,
    onInput: setPosition,
  });
  position.element.classList.add("position");
  const panel = createGraphicPanel({
    content: track,
    footer: [h("div", { class: "row" }, addButton, removeButton), color.element],
    fields: position.element,
  });
  const title = h("h2");
  const element = h(
    "section",
    { class: "baza-gradient-control" },
    title,
    h("p", null, "Drag a numbered stop or enter its exact position."),
    panel.element,
    h("p", { class: "note" }, " Two to eight stops. Arrow keys move 1%; Shift moves 5%. Stops retain their identities when crossing. "),
  );

  const render = renderer(draw);
  function draw() {
    const list = props.value;
    attr(element, "aria-label", props.heading);
    text(title, props.heading);
    style(paint, "background", gradient());
    while (stops.length < list.length) stops.push(stopButton(stops.length));
    stops.length = list.length;
    list.forEach((stop, i) => {
      const s = stops[i];
      style(s.element, "left", stop.position + "%");
      attr(s.element, "aria-pressed", String(selected === i));
      attr(s.element, "aria-label", `Stop ${i + 1}, position ${stop.position.toFixed(1)}%`);
      text(s.label, `${i + 1} `);
    });
    children(track, [paint, ...stops.map((s) => s.element)]);
    prop(addButton, "disabled", list.length >= 8);
    prop(removeButton, "disabled", list.length <= 2);
    color.update({ value: list[selected] });
    position.update({ limits: props.bounds, value: +list[selected].position.toFixed(2) });
  }
  // Mirrors the Vue component's watchers: new effective bounds clamp every stop, and the selection stays within the stops.
  function apply(partial) {
    const before = props;
    props = { ...props, ...partial };
    selected = Math.max(0, Math.min(selected, props.value.length - 1));
    if (rendered) render();
    if (before.bounds !== props.bounds) clampStops();
  }
  function clampStops() {
    const limits = effective();
    setModel(props.value.map((stop) => ({ ...stop, position: clampToLimits(stop.position, limits) })));
  }

  clampStops();
  render();
  rendered = ready = true;
  return {
    element,
    update(partial) {
      apply(checkProps("GradientControl", SPEC, partial, props));
    },
    destroy() {
      color.destroy();
      position.destroy();
    },
  };
}
