<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
// @ts-ignore
import * as htmlToImage from 'html-to-image';

const isDesktop = !!(window as any).electronAPI;
const isWechatAvailable = !!(window as any).wechatAPI;

const content = ref<string>('# Hello SaaS!\n\nThis is the Universal Markdown Engine. Let\'s cite something [wiki](https://wikipedia.org "Wiki Article").');
const htmlOutput = ref<string>('');
const previewContainer = ref<HTMLElement | null>(null);

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
  .use(footnote);

const updateHtml = () => {
  htmlOutput.value = md.render(content.value);
};

watch(content, () => {
  updateHtml();
});

onMounted(() => {
  updateHtml();
});

const exportImage = async () => {
  if (!previewContainer.value) return;
  try {
    const dataUrl = await htmlToImage.toPng(previewContainer.value);
    
    // Universal Adapter Branching!
    // @ts-ignore
    if (window.electronAPI) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      // @ts-ignore
      await window.electronAPI.writeFile('./export.png', base64Data, 'base64');
      alert("✅ Saved natively to export.png via Electron!");
    } else {
      const link = document.createElement('a');
      link.download = 'article-export.png';
      link.href = dataUrl;
      link.click();
      alert("✅ Saved to browser downloads folder!");
    }
  } catch (e: any) {
    alert('Error exporting: ' + e.message);
  }
};
</script>

<template>
  <div class="editor-layout">
    <div class="toolbar">
      <button @click="exportImage">📸 Export Long Image</button>
      <button v-if="isDesktop" class="native-btn">💾 Native File Save</button>
      <button v-if="isWechatAvailable" class="native-btn wechat-btn">💬 Native WeChat Push</button>
    </div>
    <div class="split-pane">
      <textarea v-model="content" class="raw-markdown" placeholder="Write markdown here..."></textarea>
      <!-- We ID this container for html-to-image -->
      <div class="preview-pane" ref="previewContainer" v-html="htmlOutput"></div>
    </div>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.toolbar {
  padding: 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 10px;
}
.toolbar button {
  padding: 5px 15px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
}
.native-btn {
  background: #2a2a2a !important;
  color: white;
}
.wechat-btn {
  background: #07c160 !important;
}
.split-pane {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.raw-markdown {
  width: 50%;
  padding: 20px;
  border: none;
  border-right: 1px solid #eee;
  resize: none;
  font-family: monospace;
  font-size: 14px;
}
.preview-pane {
  width: 50%;
  padding: 20px;
  overflow-y: auto;
  background: #fff;
  color: #333;
}
</style>
