<!-- Lucide UI icons; licenses and attribution: ../../THIRD_PARTY_NOTICES.txt. -->
<style scoped>
svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: none;
}
</style>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'pause'">
      <rect x="14" y="3" width="5" height="18" rx="1" />
      <rect x="5" y="3" width="5" height="18" rx="1" />
    </template>
    <path v-else :d="paths[name]" />
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true,
    validator: (value) =>
      ["play", "pause", "reset", "plus", "minus", "copy", "check"].includes(value),
  },
});
const paths = {
  play: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
  reset: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5",
  plus: "M5 12h14 M12 5v14",
  copy: "M9 9h12v12H9z M5 15H3V3h12v2",
  minus: "M5 12h14",
  check: "M20 6 9 17l-5-5",
};
</script>
