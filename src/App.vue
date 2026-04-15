<script setup lang="ts">
import { onErrorCaptured, ref, onMounted } from 'vue';
import Editor from './components/Editor.vue';
import './assets/css/theme-tokens.css';

const errorDetails = ref('');
const isDarkMode = ref(false);

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

onMounted(() => {
  // Read preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark');
  }
});

onErrorCaptured((err, instance, info) => {
  console.error("APP CAUGHT:", err);
  errorDetails.value = (err as Error).stack || String(err);
  return false;
});
</script>

<template>
  <div v-if="errorDetails" style="color: red; padding: 20px; white-space: pre-wrap; font-family: monospace;">
    <h1>Fatal Error in App</h1>
    {{ errorDetails }}
  </div>
  <template v-else>
    <Editor />
  </template>
</template>

<style>

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  background-color: var(--bg-app);
  overflow: hidden;
  height: 100%;
  width: 100%;
}

html {
  overflow: hidden;
  height: 100%;
  width: 100%;
}

#app {
  overflow: hidden;
  height: 100%;
  width: 100%;
}
</style>
