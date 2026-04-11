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
    <div class="global-theme-toggle" @click="toggleTheme" :title="isDarkMode ? '切换至亮色模式' : '切换至暗色模式'">
      <svg v-if="isDarkMode" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      <svg v-else viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
    </div>
    <Editor />
  </template>
</template>

<style>
.global-theme-toggle {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 1000;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: var(--text-primary);
  background: var(--border-subtle);
  transition: all 0.3s var(--transition-timing);
  backdrop-filter: blur(8px);
}
.global-theme-toggle:hover {
  background: var(--border-strong);
  transform: scale(1.05);
}
body {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  background-color: var(--bg-app);
}
</style>
