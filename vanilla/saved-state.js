// Page-owned persistence. Components know nothing about storage or other instances.
// The owner reads state, calls set(name, value) for every change, and shows status.
import { clone } from "../src/lib/values.js";

export const STATUS = {
  saving: "Values save locally in this browser.",
  invalid: "Local storage unavailable or invalid; using defaults.",
  unavailable: "Local storage unavailable; changes last for this session.",
};

// Merges a stored payload ({ version: 1, values }) into the defaults, key by key, keeping only valid values.
// Throws when the text is not JSON or a validator throws, as reading storage would.
export function restoreValues(text, defaults, validators) {
  const values = clone(defaults);
  const saved = JSON.parse(text);
  if (saved?.version === 1 && saved.values && typeof saved.values === "object") {
    for (const name of Object.keys(defaults)) if (validators[name](saved.values[name])) values[name] = clone(saved.values[name]);
  }
  return values;
}

export function createSavedState(key, defaults, validators) {
  for (const name of Object.keys(defaults))
    if (typeof validators[name] !== "function") throw new Error(`createSavedState: no validator for "${name}".`);
  let status = STATUS.saving;
  let state = clone(defaults);
  try {
    state = restoreValues(localStorage.getItem(key), defaults, validators);
  } catch {
    status = STATUS.invalid;
  }
  return {
    get state() { return state; },
    get status() { return status; },
    // Replaces one value and writes the whole payload synchronously.
    set(name, value) {
      if (!(name in defaults)) throw new Error(`createSavedState: unknown key "${name}".`);
      state = { ...state, [name]: value };
      try {
        localStorage.setItem(key, JSON.stringify({ version: 1, values: state }));
      } catch {
        status = STATUS.unavailable;
      }
    },
  };
}
