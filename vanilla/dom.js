// Small DOM helpers shared by the vanilla components: element creation, cached patches, ids, props, and models.
// Patches remember the last value they wrote, like a virtual DOM diff: a typed draft or a focused field is left alone until its source changes.

let nextId = 0;
export const uid = () => `baza-${nextId++}`;

const SVG = "http://www.w3.org/2000/svg";

function build(element, attrs, children) {
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (name === "on") for (const [type, listener] of Object.entries(value)) element.addEventListener(type, listener);
    else if (name === "style") for (const [key, part] of Object.entries(value)) style(element, key, part);
    else if (name.startsWith(".")) prop(element, name.slice(1), value);
    else attr(element, name, value);
  }
  element.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
  return element;
}

// h("div", { class: "row", "aria-label": "X", ".value": 3, style: { width: "4px" }, on: { click } }, ...children)
export const h = (tag, attrs, ...children) => build(document.createElement(tag), attrs, children);
export const svg = (tag, attrs, ...children) => build(document.createElementNS(SVG, tag), attrs, children);

function changed(element, key, value) {
  const cache = (element.__baza ??= new Map());
  if (cache.has(key) && Object.is(cache.get(key), value)) return false;
  cache.set(key, value);
  return true;
}

// null, undefined, and false remove an attribute; true writes an empty one. Pass "false" for ARIA values.
export function attr(element, name, value) {
  if (!changed(element, `attr:${name}`, value)) return;
  if (value === null || value === undefined || value === false) element.removeAttribute(name);
  else element.setAttribute(name, value === true ? "" : String(value));
}

// Like Vue, a value is written only when it differs from what the field shows, so the caret stays put,
// and value, checked, and selected are mirrored to their attributes.
export function prop(element, name, value) {
  if (!changed(element, `prop:${name}`, value)) return;
  if (name === "value") {
    const next = value === null || value === undefined ? "" : String(value);
    if (element.value !== next) element.value = next;
    if (value === null || value === undefined) element.removeAttribute("value");
    else element.setAttribute("value", next);
    return;
  }
  element[name] = value;
  if (name === "checked" || name === "selected") attr(element, name, Boolean(value));
}

export function toggle(element, name, on) {
  if (changed(element, `class:${name}`, Boolean(on))) element.classList.toggle(name, Boolean(on));
}

export function style(element, name, value) {
  if (!changed(element, `style:${name}`, value)) return;
  if (value === null || value === undefined || value === "") element.style.removeProperty(name);
  else element.style.setProperty(name, String(value));
  if (!element.style.length) element.removeAttribute("style");
}

export function text(node, value) {
  if (changed(node, "text", String(value))) node.textContent = String(value);
}

// Patches the child list with the fewest moves: nodes that stay are never re-inserted, so they keep focus and state.
// Empty values (null, undefined, false, "") are skipped; anything else must be a node, because identity matters.
export function children(element, nodes) {
  const next = nodes.flat().filter((child) => child !== null && child !== undefined && child !== false && child !== "");
  const stray = next.find((child) => !(child instanceof Node));
  if (stray !== undefined) throw new Error(`children() takes nodes, got ${JSON.stringify(stray)}.`);
  const keep = new Set(next);
  for (const child of [...element.childNodes]) if (!keep.has(child)) child.remove();
  next.forEach((child, i) => {
    if (element.childNodes[i] !== child) element.insertBefore(child, element.childNodes[i] ?? null);
  });
}

const TYPE_NAMES = new Map([[String, "string"], [Number, "number"], [Boolean, "boolean"], [Function, "function"]]);
function matches(type, value) {
  if (type === Object) return Object.prototype.toString.call(value) === "[object Object]";
  if (type === Array) return Array.isArray(value);
  if (TYPE_NAMES.has(type)) return typeof value === TYPE_NAMES.get(type);
  return value instanceof type;
}
function typeLabel(type) {
  return [type].flat().map((t) => t.name).join(" or ");
}

// Validates props against a spec shaped like Vue's props option, and throws instead of warning.
// Boolean props default to false; function defaults of Object and Array props are factories.
export function checkProps(component, spec, given, previous = null) {
  for (const name of Object.keys(given))
    if (!(name in spec)) throw new Error(`${component}: unknown prop "${name}".`);
  const result = previous ? { ...previous } : {};
  for (const [name, rule] of Object.entries(spec)) {
    const types = [rule.type].flat();
    let value = name in given ? given[name] : previous ? previous[name] : undefined;
    if (!previous && value === undefined) {
      if (typeof rule.default === "function" && !types.includes(Function)) value = rule.default();
      else if (rule.default !== undefined) value = rule.default;
      else if (types.includes(Boolean)) value = false;
    }
    // Like Vue, an absent or undefined Boolean prop is false.
    if (value === undefined && types.includes(Boolean) && !types.includes(String)) value = false;
    if (value === undefined || value === null) {
      if (rule.required) throw new Error(`${component}: missing required prop "${name}".`);
    } else if (rule.type && !types.some((type) => matches(type, value))) {
      throw new Error(`${component}: prop "${name}" must be ${typeLabel(rule.type)}, got ${JSON.stringify(value)}.`);
    } else if (rule.validator && !rule.validator(value)) {
      throw new Error(`${component}: invalid value for prop "${name}": ${JSON.stringify(value)}.`);
    }
    result[name] = value;
  }
  return result;
}

// "value" pairs with onInput, any other model "name" with on<Name>Input.
export const modelCallback = (name) =>
  name === "value" ? "onInput" : `on${name[0].toUpperCase()}${name.slice(1)}Input`;

const UNSET = {};
// Mirrors Vue's defineModel: when the owner passes both the value and its callback, the owner holds the state
// and calls update(); otherwise the component keeps the value itself. Repeating the current value is a no-op.
// Until `ready()` is true the owner has no handle to call update() with, so the component also keeps the value.
export function modelSetter(given, read, name, keepLocally, ready = () => true) {
  const callback = modelCallback(name);
  const owned = name in given && typeof given[callback] === "function";
  let previous = UNSET;
  return (value) => {
    const props = read();
    if (Object.is(value, props[name]) && (previous === UNSET || Object.is(value, previous))) return;
    previous = value;
    if (!owned || !ready()) keepLocally(value);
    props[callback]?.(value);
  };
}

// Wraps a component's draw function: a render requested while drawing (a child emitting during its update)
// runs again after the current pass, so a pass never finishes with values read before the change.
export function renderer(draw) {
  let drawing = false;
  let again = false;
  return function render() {
    if (drawing) {
      again = true;
      return;
    }
    drawing = true;
    try {
      do {
        again = false;
        draw();
      } while (again);
    } finally {
      drawing = false;
    }
  };
}

// Document and window listeners that a component removes on destroy().
export function listen(target, type, listener, options) {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}
