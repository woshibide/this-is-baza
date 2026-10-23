// One editable boundary. The parent supplies spatial placement; parsing and the -0/null contract stay shared.
import { checkProps, modelSetter, uid, h, attr, prop, toggle, style, text, children } from "../dom.js";
import { parseLimit, SAFE_MIN, SAFE_MAX } from "../../src/lib/numeric-limits.js";
import { createNumberScrubber, NUMBER_SCRUB_HINT } from "../../src/lib/number-scrub.js";

const SPEC = {
  value: { type: Object, required: true },
  onInput: { type: Function },
  side: { type: String, required: true },
  label: { type: String, required: true },
  integer: { type: Boolean },
  hardMin: { type: Number, default: SAFE_MIN },
  hardMax: { type: Number, default: SAFE_MAX },
};

export function createLimitValue(given) {
  let props = checkProps("LimitValue", SPEC, given);
  const id = uid();
  let draft = "";
  let error = "";
  const setModel = modelSetter(given, () => props, "value", (value) => {
    props = { ...props, value };
    watchSide();
  });
  const scrubber = createNumberScrubber({
    read: () => ({
      value: props.value[props.side],
      min: Math.max(props.hardMin, props.side === "max" ? (props.value.min ?? SAFE_MIN) : SAFE_MIN),
      max: Math.min(props.hardMax, props.side === "min" ? (props.value.max ?? SAFE_MAX) : SAFE_MAX),
      step: props.integer ? 1 : "any",
    }),
    write: (value) => {
      draft = String(value);
      commit();
    },
  });
  const domainHint = () =>
    props.hardMin !== SAFE_MIN && props.hardMax !== SAFE_MAX
      ? ` Valid values: ${props.hardMin}-${props.hardMax}.`
      : props.hardMin !== SAFE_MIN
        ? ` Minimum valid value: ${props.hardMin}.`
        : props.hardMax !== SAFE_MAX
          ? ` Maximum valid value: ${props.hardMax}.`
          : "";

  function restore() {
    draft = props.value[props.side] === null ? "-0" : String(props.value[props.side]);
    error = "";
    render();
  }
  function commit() {
    const result = parseLimit(draft, props.side, props.value, props);
    if (result.error) {
      error = result.error;
      render();
      return;
    }
    error = "";
    setModel(result.value);
    draft = result.value[props.side] === null ? "-0" : String(result.value[props.side]);
    render();
  }

  const caption = h("span", { class: "caption" });
  const input = h("input", {
    class: "limit-input",
    type: "text",
    autocomplete: "off",
    spellcheck: "false",
    "aria-describedby": `${id}-message`,
  });
  for (const [type, listener] of Object.entries(scrubber.events)) input.addEventListener(type, listener);
  input.addEventListener("focus", (event) => event.target.select());
  input.addEventListener("input", (event) => {
    draft = event.target.value;
    render();
  });
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.target.blur();
    else if (event.key === "Escape") restore();
  });
  const message = h("p", { id: `${id}-message`, class: "message", role: "status" });
  const hint = h("p", { id: `${id}-message`, class: "message hint" });
  const element = h("div", { class: "limit-value" }, h("label", null, caption, input));

  function render() {
    const { side, label } = props;
    const unset = props.value[side] === null;
    toggle(element, "maximum", side === "max");
    style(element, "--limit-width", `calc(${Math.max(3, draft.length)}ch + 16px)`);
    text(caption, side === "min" ? "Min" : "Max");
    toggle(input, "number-scrub", !unset);
    attr(input, "title", unset ? "Type a number to set this limit." : NUMBER_SCRUB_HINT);
    attr(input, "aria-description", unset ? "Type a number to set this limit." : NUMBER_SCRUB_HINT);
    attr(input, "aria-label", `${label} ${side === "min" ? "minimum" : "maximum"} limit`);
    attr(input, "name", `${id}-${side}`);
    prop(input, "value", draft);
    attr(input, "aria-invalid", String(Boolean(error)));
    if (error) text(message, error);
    else text(hint, ` −0 removes this limit.${domainHint()}`);
    children(element, [element.firstChild, error ? message : hint]);
  }

  // Like Vue's watch on the bound side: a new value from outside replaces the draft and clears the error.
  let watched = props.value[props.side];
  function watchSide() {
    if (Object.is(watched, props.value[props.side])) return render();
    watched = props.value[props.side];
    restore();
  }
  restore();
  return {
    element,
    update(partial) {
      props = checkProps("LimitValue", SPEC, partial, props);
      watchSide();
    },
    destroy() {
      scrubber.dispose();
    },
  };
}
