<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  page: { type: String, required: true },
  homeHref: { type: String, default: "./" },
  contents: { type: Array, default: () => [] },
});
const sections = computed(() => [{ id: "overview", label: "Overview" }, ...props.contents]);
const activeSection = ref("overview");
let scrollFrame = 0;
function updateActiveSection() {
  scrollFrame = 0;
  let current = "overview";
  for (const { id } of sections.value) {
    if (document.getElementById(id)?.getBoundingClientRect().top <= 48) current = id;
  }
  if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    current = sections.value.at(-1).id;
  }
  activeSection.value = current;
}
function scheduleActiveSection() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActiveSection);
}
onMounted(() => {
  // Vue creates the anchor targets after the browser's initial fragment lookup.
  const target = sections.value.find(({ id }) => `#${id}` === window.location.hash);
  if (target) document.getElementById(target.id)?.scrollIntoView();
  scheduleActiveSection();
  window.addEventListener("scroll", scheduleActiveSection, { passive: true });
  window.addEventListener("resize", scheduleActiveSection);
});
onUnmounted(() => {
  cancelAnimationFrame(scrollFrame);
  window.removeEventListener("scroll", scheduleActiveSection);
  window.removeEventListener("resize", scheduleActiveSection);
});
</script>

<template>
  <div class="site-page">
    <a class="site-skip" href="#overview">Skip to content</a>
    <header class="site-header">
      <a class="site-name" :href="homeHref">Baza</a>
      <nav class="site-links" aria-label="Main navigation">
        <a :href="homeHref" :aria-current="page === 'home' ? 'page' : undefined">Readme</a>
        <a :href="`${homeHref}examples/`" :aria-current="page === 'examples' ? 'page' : undefined">UI examples</a>
        <a href="https://github.com/woshibide/this-is-baza" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
    </header>
    <div class="site-body">
      <nav class="contents" aria-label="Contents">
        <strong class="contents-title">Contents</strong>
        <ul>
          <li v-for="item in sections" :key="item.id" :class="{ 'contents-example': item.example }">
            <a :href="`#${item.id}`" :aria-current="activeSection === item.id ? 'location' : undefined">{{ item.label }}</a>
          </li>
        </ul>
      </nav>
      <div class="site-article">
        <nav class="breadcrumbs" aria-label="Breadcrumbs">
          <a v-if="page !== 'home'" :href="homeHref">Baza</a>
          <span v-else>Baza</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ page === 'home' ? 'Readme' : title }}</span>
        </nav>
        <main class="page-main">
          <div id="overview" class="page-heading">
            <h1>{{ title }}</h1>
            <slot name="tools" />
          </div>
          <slot />
        </main>
        <footer class="site-footer">
          Baza by <a href="https://github.com/woshibide" target="_blank" rel="noopener noreferrer">woshibide</a> and
          <a href="https://github.com/woshibide/this-is-baza/graphs/contributors" target="_blank" rel="noopener noreferrer">contributors</a>.
          Built with <a href="https://vuejs.org/" target="_blank" rel="noopener noreferrer">Vue</a>.
          Icons: <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer">Lucide</a> and <a href="https://feathericons.com/" target="_blank" rel="noopener noreferrer">Feather</a>.
          <a href="https://github.com/woshibide/this-is-baza/blob/main/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener noreferrer">Credits and licenses</a>.
        </footer>
      </div>
    </div>
  </div>
</template>

<style>
body { margin: 0; }
</style>

<style scoped>
.site-page { min-height: 100dvh; background: #fff; color: #202122; color-scheme: light; }
.site-page, .site-page * { box-sizing: border-box; }
.site-header, .contents, .breadcrumbs, .site-footer { font: 14px/1.6 Arial, sans-serif; }
.site-header {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 24px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #eaecf0;
}
.site-name { font: 26px/1.2 Georgia, "Times New Roman", serif; }
.site-links { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; }
.site-page a { color: #36c; text-decoration: none; }
.site-page a:hover { text-decoration: underline; }
.site-page a:focus-visible { outline: 2px solid #36c; outline-offset: 2px; }
.site-links [aria-current="page"] { color: #202122; }
.site-body { display: flex; align-items: flex-start; max-width: 1180px; margin: 0 auto; }
.contents {
  position: sticky;
  top: 20px;
  flex: 0 0 196px;
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  margin: 28px 0 0;
  padding: 0 16px 0 24px;
  display: block;
  font-size: 12px;
  line-height: 1.4;
}
.contents-title { display: block; padding-bottom: 7px; border-bottom: 1px solid #a2a9b1; }
.contents ul { list-style: none; margin: 8px 0 0; padding: 0; }
.contents li { margin: 0; }
.contents a { display: block; padding: 3px 0 3px 8px; border-left: 2px solid transparent; }
.contents .contents-example a { padding-left: 18px; }
.contents a[aria-current="location"] { border-left-color: #36c; color: #202122; font-weight: 700; }
.contents a:focus-visible { outline-offset: -2px; }
.site-article { flex: 1; min-width: 0; max-width: 908px; padding: 24px 24px 48px; }
.breadcrumbs { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; color: #54595d; font-size: 12px; }
.page-main { max-width: none; padding: 0; margin: 0; }
.page-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-bottom: 16px; scroll-margin-top: 20px; }
.page-heading h1 { color: #202122; font: 400 32px/1.3 Georgia, "Times New Roman", serif; letter-spacing: normal; margin: 0; }
.site-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eaecf0; color: #54595d; font-size: 12px; }
.site-skip { position: fixed; left: 16px; top: 8px; transform: translateY(-200%); background: #fff; padding: 8px; z-index: 20; }
.site-skip:focus { transform: none; }
@media (max-width: 800px) {
  .site-body { display: block; }
  .contents { position: static; max-height: none; margin: 20px 0 0; padding: 0 24px; }
  .contents ul { columns: 2; }
  .contents li { break-inside: avoid; }
}
@media (max-width: 600px) {
  .site-header { padding: 16px; flex-wrap: wrap; }
  .site-links { gap: 6px 14px; }
  .contents { padding: 0 16px; }
  .site-article { padding: 20px 16px 36px; }
}
</style>
