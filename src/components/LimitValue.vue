<!-- One editable boundary. The parent supplies spatial placement; parsing and the -0/null contract stay shared.
     A limit is the user's clamp on the value: any number is allowed, never a hardcoded range. -->
<style scoped>
.limit-value {
  position: relative;
  min-width: 0;
}
label {
  gap: 1px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.4;
}
.caption {
  padding: 0 6px;
}
.limit-value input.limit-input[type="text"] {
  width: var(--limit-width);
  min-width: 4ch;
  max-width: 100%;
  height: 28px;
  padding: 3px 6px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: var(--muted);
  font:
    12px/1.4 ui-monospace,
    monospace;
  font-variant-numeric: tabular-nums;
}
.limit-value input.limit-input:hover {
  background: var(--control-bg, var(--paper));
  border-color: var(--line);
  color: var(--ink);
}
.limit-value input.limit-input:focus {
  background: var(--control-bg, var(--paper));
  border-color: var(--accent);
  color: var(--ink);
}
.limit-value input.limit-input:focus-visible {
  outline-width: 2px;
  outline-offset: 1px;
}
.limit-value.maximum label {
  align-items: flex-end;
  text-align: right;
}
.limit-value.maximum input {
  text-align: right;
}
.message {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 2;
  width: max-content;
  max-width: min(250px, calc(100vw - 72px));
  padding: 6px 9px;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--control-bg, var(--paper));
  color: var(--ink);
  font-size: 12px;
  box-shadow: 0 3px 8px var(--shadow-color, color-mix(in srgb, var(--ink) 10%, transparent));
  pointer-events: none;
}
.maximum .message {
  left: auto;
  right: 0;
}
.hint {
  display: none;
}
.limit-value:focus-within .hint {
  display: block;
}
</style>
<template>
  <div
    class="limit-value"
    :class="{ maximum: side === 'max' }"
    :style="{ '--limit-width': `calc(${Math.max(3, draft.length)}ch + 16px)` }"
  >
    <label
      ><span class="caption">{{ side === "min" ? "Min" : "Max" }}</span
      ><input
        class="limit-input"
        :class="{ 'number-scrub': model[side] !== null }"
        type="text"
        :title="model[side] === null ? 'Type a number to set this limit.' : NUMBER_SCRUB_HINT"
        :aria-description="model[side] === null ? 'Type a number to set this limit.' : NUMBER_SCRUB_HINT"
        :aria-label="`${label} ${side === 'min' ? 'minimum' : 'maximum'} limit`"
        :name="`${id}-${side}`"
        autocomplete="off"
        :spellcheck="false"
        :value="draft"
        :aria-describedby="`${id}-message`"
        :aria-invalid="Boolean(error)"
        v-on="scrubber.events"
        @focus="$event.target.select()"
        @input="draft = $event.target.value"
        @blur="commit"
        @keydown.enter="$event.target.blur()"
        @keydown.esc="restore"
    /></label>
    <p v-if="error" :id="`${id}-message`" class="message" role="status">
      {{ error }}
    </p>
    <p v-else :id="`${id}-message`" class="message hint">
      −0 removes this limit.
    </p>
  </div>
</template>
<script setup>
import { ref, useId, watch, onBeforeUnmount } from "vue";
import { parseLimit, SAFE_MIN, SAFE_MAX } from "../lib/numeric-limits.js";
import { createNumberScrubber, NUMBER_SCRUB_HINT } from "../lib/number-scrub.js";
const model = defineModel({ type: Object, required: true });
const props = defineProps({
  side: { type: String, required: true },
  label: { type: String, required: true },
  integer: Boolean,
});
const id = useId(),
  draft = ref(""),
  error = ref("");
const scrubber = createNumberScrubber({
  read: () => ({
    value: model.value[props.side],
    min: props.side === "max" ? (model.value.min ?? SAFE_MIN) : SAFE_MIN,
    max: props.side === "min" ? (model.value.max ?? SAFE_MAX) : SAFE_MAX,
    step: props.integer ? 1 : "any",
  }),
  write: (value) => {
    draft.value = String(value);
    commit();
  },
});
onBeforeUnmount(scrubber.dispose);
function restore() {
  draft.value =
    model.value[props.side] === null ? "-0" : String(model.value[props.side]);
  error.value = "";
}
watch(() => model.value[props.side], restore, { immediate: true });
function commit() {
  const result = parseLimit(draft.value, props.side, model.value, props);
  if (result.error) {
    error.value = result.error;
    return;
  }
  error.value = "";
  model.value = result.value;
  draft.value =
    result.value[props.side] === null ? "-0" : String(result.value[props.side]);
}
</script>
