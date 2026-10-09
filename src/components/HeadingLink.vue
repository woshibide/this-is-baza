<template>
  <span class="heading-link">
    <button type="button" :aria-label="`Copy link to ${label}`" :title="`Copy link to ${label}`" @click="copy">
      <Icon :name="copied ? 'check' : 'copy'" />
    </button>
    <span class="copy-status" role="status">{{ message }}</span>
    <input v-if="failed" class="copy-fallback" :aria-label="`Link to ${label}`" :value="link" readonly @focus="$event.target.select()" />
  </span>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  anchor: { type: String, required: true },
  label: { type: String, required: true },
});
const copied = ref(false), failed = ref(false), message = ref(""), link = ref("");
let timer;
async function copy() {
  clearTimeout(timer);
  const url = new URL(window.location.href);
  url.hash = props.anchor;
  link.value = url.href;
  try {
    await navigator.clipboard.writeText(link.value);
    copied.value = true;
    failed.value = false;
    message.value = "Link copied";
    timer = setTimeout(() => { copied.value = false; message.value = ""; }, 2000);
  } catch {
    copied.value = false;
    failed.value = true;
    message.value = "Select the link below to copy it.";
  }
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
.heading-link { display: inline-block; position: relative; margin-left: 8px; vertical-align: middle; line-height: 1; }
.heading-link button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  min-height: 28px;
  padding: 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
}
.heading-link button:hover, .heading-link button:focus-visible { opacity: 1; background: var(--soft, #e8e8e8); }
.heading-link button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.copy-status:not(:empty), .copy-fallback {
  position: absolute;
  z-index: 2;
  left: 0;
  top: 100%;
  padding: 6px 8px;
  background: var(--paper, #fff);
  color: var(--ink, #242424);
  border: 1px solid var(--line, #ccc);
  border-radius: 4px;
  font: 12px/1.5 Arial, sans-serif;
  white-space: nowrap;
}
.copy-fallback { top: calc(100% + 32px); width: 280px; }
</style>
