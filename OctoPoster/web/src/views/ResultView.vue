<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'
import ContentDisplay from '../components/ContentDisplay.vue'

const router = useRouter()
const store = useGeneratorStore()

function downloadAll() {
  // Open each image URL in sequence for download
  const urls = Object.entries(store.imageUrls).sort(([a], [b]) => Number(a) - Number(b))
  for (const [, url] of urls) {
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

function startOver() {
  store.reset()
  router.push('/')
}
</script>

<template>
  <div class="result-view">
    <div class="result-header">
      <div>
        <h2>✅ 生成完成</h2>
        <p class="subtitle">主题：{{ store.topic }} · {{ Object.keys(store.imageUrls).length }} 张图片</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="downloadAll">📥 批量下载</button>
        <button class="btn-primary" @click="startOver">🔄 新建创作</button>
      </div>
    </div>

    <div class="image-grid">
      <div
        v-for="(page, idx) in store.pages"
        :key="page.index"
        class="image-card card animate-fade-in"
        :style="{ animationDelay: `${idx * 0.08}s` }"
      >
        <div class="card-label">
          <span class="page-idx">{{ page.index + 1 }}</span>
          <span class="page-type-tag" :class="page.type">
            {{ page.type === 'cover' ? '封面' : page.type === 'summary' ? '总结' : '内容' }}
          </span>
        </div>

        <div v-if="store.imageUrls[page.index]" class="image-wrapper">
          <img :src="store.imageUrls[page.index]" :alt="`第${page.index + 1}页`" />
        </div>
        <div v-else class="image-placeholder">
          <span>❌ 该页生成失败</span>
          <span class="err-detail">{{ store.errors[page.index] }}</span>
        </div>
      </div>
    </div>

    <!-- AI Copywriting and Tags -->
    <ContentDisplay />
  </div>
</template>

<style scoped>
.result-view { max-width: 1000px; margin: 0 auto; }
.result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.result-header h2 { margin-bottom: 0.2rem; }
.subtitle { font-size: 0.85rem; color: var(--text-secondary); }
.header-actions { display: flex; gap: 0.6rem; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.image-card { padding: 0.8rem; }
.card-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.page-idx { font-weight: 700; color: var(--accent); }
.page-type-tag { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: var(--bg-input); color: var(--text-secondary); }
.page-type-tag.cover { background: rgba(255,107,107,0.15); color: var(--accent); }
.page-type-tag.summary { background: rgba(74,222,128,0.15); color: var(--success); }
.image-wrapper img { width: 100%; border-radius: 8px; display: block; }
.image-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; color: var(--text-secondary); gap: 0.4rem; font-size: 0.85rem; }
.err-detail { font-size: 0.7rem; color: var(--error); max-width: 180px; text-align: center; }
</style>
