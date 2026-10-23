// Collapsed color trigger opens a native popover containing the HSV picker. SV plane uses arrows (Shift: 10); hue and alpha use native sliders. Values commit on blur/Enter; Escape restores.
// open() shows the picker, for owners that hide the trigger.
import { checkProps, modelSetter, uid, h, attr, prop, toggle, style, text, children, listen } from "../dom.js";
import { createIcon } from "./icon.js";
import { clamp, rgba, hexAlpha } from "../../src/lib/values.js";
import { rgb, toHsv, fromHsv, hsl, parseColor } from "../../src/lib/color.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  hideTrigger: { type: Boolean },
};
const FORMATS = ["HSL", "RGBA", "HEX"];
const EXAMPLES = { HSL: "hsl(180, 50%, 50%).", RGBA: "rgba(0, 128, 255, 0.5).", HEX: "#RRGGBB or #RRGGBBAA." };

export function createColorEditor(given) {
  let props = checkProps("ColorEditor", SPEC, given);
  const id = uid();
  let panelPosition = null;
  let panelDrag = null;
  let hsv = toHsv(props.value.hex);
  let editing = null;
  let draft = "";
  let errorFormat = "";
  let message = "";
  const setModel = modelSetter(given, () => props, "value", (value) => apply({ value }));

  const values = () => {
    const [h, s, l] = hsl(props.value.hex);
    return {
      HSL: `hsl(${h}, ${s}%, ${l}%)`,
      RGBA: `rgba(${rgb(props.value.hex).join(", ")}, ${+props.value.alpha.toFixed(3)})`,
      HEX: hexAlpha(props.value),
    };
  };
  function setHsv(patch) {
    hsv = { ...hsv, ...patch };
    setModel({ ...props.value, hex: fromHsv(hsv.h, hsv.s, hsv.v) });
    render();
  }

  function open() {
    panelPosition = null;
    render();
    panel.showPopover();
  }
  function constrainPanel(x, y) {
    const box = panel.getBoundingClientRect();
    panelPosition = {
      x: clamp(x, 8, Math.max(8, window.innerWidth - box.width - 8)),
      y: clamp(y, 8, Math.max(8, window.innerHeight - box.height - 8)),
    };
    render();
  }
  function startPanelDrag(event) {
    if (event.button !== 0 || event.target.closest("button") || panelDrag) return;
    event.preventDefault();
    const box = panel.getBoundingClientRect();
    panelDrag = { id: event.pointerId, x: event.clientX - box.left, y: event.clientY - box.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePanel(event) {
    if (!panelDrag || panelDrag.id !== event.pointerId) return;
    constrainPanel(event.clientX - panelDrag.x, event.clientY - panelDrag.y);
  }
  function endPanelDrag(event) {
    if (!panelDrag || panelDrag.id !== event.pointerId) return;
    panelDrag = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function resizePanel() {
    if (panelPosition && panel.matches(":popover-open")) constrainPanel(panelPosition.x, panelPosition.y);
  }

  let pointer = null;
  function start(event) {
    if (event.button !== 0 || pointer !== null) return;
    event.preventDefault();
    event.currentTarget.focus();
    pointer = event.pointerId;
    event.currentTarget.setPointerCapture(pointer);
    drag(event);
  }
  function drag(event) {
    if (pointer !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    setHsv({
      s: clamp(((event.clientX - box.left) / box.width) * 100, 0, 100),
      v: clamp(100 - ((event.clientY - box.top) / box.height) * 100, 0, 100),
    });
  }
  function stop(event) {
    if (pointer !== event.pointerId) return;
    pointer = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function nudge(event) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    setHsv({
      s: clamp(hsv.s + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), 0, 100),
      v: clamp(hsv.v + (event.key === "ArrowDown" ? -step : event.key === "ArrowUp" ? step : 0), 0, 100),
    });
  }
  function commit(format) {
    if (editing !== format) return;
    const next = parseColor(format, draft, props.value);
    if (next) {
      setModel(next);
      editing = null;
      errorFormat = "";
      message = "";
    } else {
      errorFormat = format;
      message = "Enter " + EXAMPLES[format];
    }
    render();
  }
  async function copy(format) {
    try {
      await navigator.clipboard.writeText(values()[format]);
      message = format + " copied.";
    } catch {
      message = "Copy unavailable. Select the value and copy it manually.";
    }
    render();
  }

  const triggerColor = h("span");
  const triggerCode = h("code");
  const trigger = h(
    "button",
    { class: "picker-trigger", "aria-label": "Open color picker", on: { click: open } },
    h("span", { class: "trigger-swatch checker" }, triggerColor),
    triggerCode,
  );
  const currentColor = h("span");
  const current = h("div", { class: "current-color checker", role: "img" }, currentColor);
  const marker = h("span", { class: "sv-marker" });
  const plane = h(
    "button",
    {
      class: "sv-plane",
      "aria-label": "Saturation and brightness",
      on: { pointerdown: start, pointermove: drag, pointerup: stop, pointercancel: stop, lostpointercapture: stop, keydown: nudge },
    },
    marker,
  );
  const alpha = h("input", {
    class: "alpha-slider",
    type: "range",
    "aria-label": "Opacity",
    "aria-orientation": "vertical",
    min: "0",
    max: "100",
    step: "1",
    on: { input: (event) => setModel({ ...props.value, alpha: Number(event.target.value) / 100 }) },
  });
  const alphaTrack = h("div", { class: "alpha-track checker" }, alpha);
  const hue = h("input", {
    class: "hue-slider",
    type: "range",
    "aria-label": "Hue",
    min: "0",
    max: "360",
    step: "1",
    on: { input: (event) => setHsv({ h: Number(event.target.value) }) },
  });
  const rows = FORMATS.map((format) => {
    const input = h("input", {
      id: id + format,
      name: format,
      autocomplete: "off",
      spellcheck: "false",
      on: {
        focus: () => {
          editing = format;
          draft = values()[format];
          render();
        },
        input: (event) => {
          draft = event.target.value;
          render();
        },
        blur: () => commit(format),
        keydown: (event) => {
          if (event.key === "Enter") event.target.blur();
          else if (event.key === "Escape") {
            editing = null;
            errorFormat = "";
            render();
            event.target.blur();
          }
        },
      },
    });
    const element = h(
      "div",
      { class: "value-row" },
      h("label", { for: id + format }, format),
      input,
      h("button", { class: "copy-button", "aria-label": "Copy " + format, on: { click: () => copy(format) } }, createIcon({ name: "copy" }).element),
    );
    return { format, input, element };
  });
  const feedback = h("p", { id: id + "feedback", class: "feedback", role: "status" });
  const exactContent = h("div", { class: "exact-values-content" });
  const panel = h(
    "div",
    { id: id + "-picker", popover: true, class: "picker-panel", role: "dialog", "aria-label": "Color picker" },
    h(
      "div",
      {
        class: "picker-heading",
        on: { pointerdown: startPanelDrag, pointermove: movePanel, pointerup: endPanelDrag, pointercancel: endPanelDrag, lostpointercapture: endPanelDrag },
      },
      h("strong", null, "Color"),
      h("button", { on: { click: () => panel.hidePopover() } }, "Close"),
    ),
    h("div", { class: "color-surfaces" }, current, plane, alphaTrack),
    hue,
    h("details", { class: "exact-values" }, h("summary", null, "Exact values"), exactContent),
  );
  const element = h("div", { class: "color-editor" });
  const stopResize = listen(window, "resize", resizePanel);

  function render() {
    const color = rgba(props.value);
    const all = values();
    toggle(element, "trigger-hidden", props.hideTrigger);
    children(element, [!props.hideTrigger && trigger, panel]);
    style(triggerColor, "background", color);
    text(triggerCode, hexAlpha(props.value));
    for (const [key, value] of Object.entries({ margin: 0, inset: "auto", left: `${panelPosition?.x}px`, top: `${panelPosition?.y}px` }))
      style(panel, key, panelPosition ? value : null);
    attr(current, "aria-label", "Current color " + hexAlpha(props.value));
    style(currentColor, "background", color);
    attr(plane, "aria-description", `Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%. Use left and right for saturation, up and down for brightness.`);
    style(plane, "background", `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h} 100% 50%)`);
    style(marker, "left", hsv.s + "%");
    style(marker, "top", 100 - hsv.v + "%");
    style(alphaTrack, "--color", props.value.hex);
    prop(alpha, "value", props.value.alpha * 100);
    prop(hue, "value", hsv.h);
    for (const { format, input } of rows) {
      prop(input, "value", editing === format ? draft : all[format]);
      attr(input, "aria-invalid", String(errorFormat === format));
      attr(input, "aria-describedby", errorFormat === format ? id + "feedback" : null);
    }
    text(feedback, message);
    children(exactContent, [...rows.map((row) => row.element), message && feedback]);
  }
  // Like Vue's watch on the hex: an outside color change moves the picker, keeping the hue when it is undefined.
  function apply(partial) {
    const before = props.value.hex;
    props = { ...props, ...partial };
    if (props.value.hex !== before && props.value.hex !== fromHsv(hsv.h, hsv.s, hsv.v)) hsv = toHsv(props.value.hex, hsv.h);
    render();
  }

  render();
  return {
    element,
    update(partial) {
      apply(checkProps("ColorEditor", SPEC, partial, props));
    },
    destroy() {
      stopResize();
    },
    open,
  };
}
