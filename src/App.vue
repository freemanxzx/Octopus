<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import Editor from './components/Editor.vue';

const errorDetails = ref('');

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
  <Editor v-else />
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #f0f2f5;
}
</style>
