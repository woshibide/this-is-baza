<script setup>
import PageLayout from "./PageLayout.vue";
import { html, contents } from "virtual:readme";
import "./readme.css";
</script>

<template>
  <PageLayout title="Baza" page="home" :contents="contents">
    <div class="readme" v-html="html" />
  </PageLayout>
</template>
