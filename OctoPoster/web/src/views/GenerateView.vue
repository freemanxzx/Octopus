<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'
import { generateImages, retryImage } from '../api'

const router = useRouter()
const store = useGeneratorStore()
const isRetrying = ref(false)

const failedIndexes = computed(() =>
  store.pages.filter(p => store.pageStatus[p.index] === 'error').map(p => p.index)
)
const hasFailedImages = computed(() => failedIndexes.value.length > 0)
const progressPercent = computed(() => {
  if (!store.pages.length) return 0
  const done = store.pages.filter(p => store.pageStatus[p.index] === 'done' || store.pageStatus[p.index] === 'error').length
  return (done / store.pages.length) * 100
})

onMounted(() => {
  if (!store.pages.length) { router.push('/'); return }
  startGeneration()
})

function startGeneration() {
  store.isGenerating = true
  generateImages(
    store.pages, store.taskId, store.outline, store.topic, store.style,
    (event, data) => {
      if (event === 'progress' && data.index !== undefined) store.updatePageStatus(data.index, 'generating')
      else if (event === 'complete' && data.index !== undefined) store.setImageUrl(data.index, data.image_url || '')
      else if (event === 'error' && data.index !== undefined) store.setPageError(data.index, data.message || '生成失败')
    },
    () => { store.isGenerating = false; router.push('/result') },
    (err) => { store.isGenerating = false; console.error('Generation error:', err) },
  )
}

async function retrySingle(index: number) {
  const page = store.pages[index]
  if (!page) return
  store.updatePageStatus(index, 'generating')
  try {
    const result = await retryImage(store.taskId, page, store.outline, store.topic, store.style)
    if (result.success && result.image_url) store.setImageUrl(index, result.image_url)
    else store.setPageError(index, result.error || '重试失败')
  } catch (e) {
    store.setPageError(index, String(e))
  }
}

async function retryAllFailed() {
  isRetrying.value = true
  for (const idx of failedIndexes.value) {
    await retrySingle(idx)
  }
  isRetrying.value = false
}

async function regenerateSingle(index: number) {
  await retrySingle(index) // Same backend logic
}

function getStatusText(s: string) {
  const m: Record<string, string> = { done: '完成', error: '失败', generating: '生成中', pending: '等待中' }
  return m[s] || s
}
</script>

<template>
  <div class="generate-view">
    <div class="gen-header">
      <div>
        <h2>⚡ 生成结果</h2>
        <p class="subtitle" v-if="store.isGenerating">
          正在生成第 {{ store.pages.filter(p => store.pageStatus[p.index] === 'done').length + 1 }} / {{ store.pages.length }} 页
        </p>
        <p class="subtitle" v-else-if="hasFailedImages">{{ failedIndexes.length }} 张图片生成失败，可点击重试</p>
        <p class="subtitle" v-else>全部 {{ store.pages.length }} 张图片生成完成</p>
      </div>
      <div style="display:flex;gap:0.6rem">
        <button v-if="hasFailedImages && !store.isGenerating" class="btn-primary" @click="retryAllFailed" :disabled="isRetrying">
          {{ isRetrying ? '补全中...' : '🔄 一键补全失败图片' }}
        </button>
        <button class="btn-secondary" @click="router.push('/outline')">← 返回大纲</button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="card" style="margin-bottom:1.5rem">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
        <span style="font-weight:600">生成进度</span>
        <span style="color:var(--accent);font-weight:600">{{ Math.round(progressPercent) }}%</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <div class="progress-grid">
      <div
        v-for="page in store.pages"
        :key="page.index"
        class="progress-card card"
        :class="store.pageStatus[page.index]"
      >
        <div class="card-top">
          <span class="page-num">{{ page.index + 1 }}</span>
          <span class="page-type">{{ page.type === 'cover' ? '封面' : page.type === 'summary' ? '总结' : '内容' }}</span>
        </div>

        <!-- Done with hover overlay -->
        <div v-if="store.pageStatus[page.index] === 'done'" class="card-body image-wrap">
          <img :src="store.imageUrls[page.index]" alt="" class="preview-img" />
          <div class="image-overlay">
            <button class="overlay-btn" @click="regenerateSingle(page.index)">🔄 重新生成</button>
          </div>
        </div>

        <!-- Generating -->
        <div v-else-if="store.pageStatus[page.index] === 'generating'" class="card-body">
          <div class="spinner"></div>
          <span>生成中...</span>
        </div>

        <!-- Error with retry -->
        <div v-else-if="store.pageStatus[page.index] === 'error'" class="card-body error">
          <span>❌</span>
          <span class="error-text">{{ store.errors[page.index] }}</span>
          <button class="retry-btn" @click="retrySingle(page.index)">点击重试</button>
        </div>

        <!-- Pending -->
        <div v-else class="card-body pending">
          <span>⏳ 等待中</span>
        </div>

        <div class="image-footer">
          <span class="page-label">Page {{ page.index + 1 }}</span>
          <span class="status-badge" :class="store.pageStatus[page.index]">{{ getStatusText(store.pageStatus[page.index] || 'pending') }}</span>
        </div>
      </div>
    </div>

    <div v-if="store.isGenerating" class="gen-footer animate-pulse">
      🔄 正在生成中，请稍候...
    </div>
  </div>
</template>

<style scoped>
.generate-view { max-width: 1000px; margin: 0 auto; }
.gen-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.gen-header h2 { margin-bottom: 0.2rem; }
.subtitle { font-size: 0.85rem; color: var(--text-secondary); }
.progress-bar-track { background: var(--bg-input); border-radius: 6px; height: 8px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #ee5a24); border-radius: 6px; transition: width 0.5s ease; }
.progress-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.progress-card { padding: 0.8rem; text-align: center; transition: all 0.3s; min-height: 220px; display: flex; flex-direction: column; }
.progress-card.done { border-color: rgba(74,222,128,0.3); }
.progress-card.error { border-color: rgba(248,113,113,0.3); }
.progress-card.generating { border-color: rgba(255,107,107,0.3); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.page-num { font-weight: 700; font-size: 0.9rem; color: var(--accent); }
.page-type { font-size: 0.7rem; color: var(--text-secondary); background: var(--bg-input); padding: 0.1rem 0.4rem; border-radius: 4px; }
.card-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; }
.card-body.pending { color: var(--text-secondary); font-size: 0.85rem; }
.card-body.error { color: var(--error); }
.error-text { font-size: 0.75rem; max-height: 40px; overflow: hidden; }
.preview-img { width: 100%; border-radius: 6px; object-fit: cover; }
.image-wrap { position: relative; overflow: hidden; border-radius: 6px; }
.image-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
.image-wrap:hover .image-overlay { opacity: 1; }
.overlay-btn { background: rgba(255,107,107,0.9); color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
.retry-btn { background: rgba(255,107,107,0.15); color: var(--accent); border: 1px solid rgba(255,107,107,0.3); padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-top: 0.3rem; }
.image-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.4rem; margin-top: 0.4rem; border-top: 1px solid var(--border); }
.page-label { font-size: 0.75rem; font-weight: 600; }
.status-badge { font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; }
.status-badge.done { background: rgba(74,222,128,0.15); color: var(--success); }
.status-badge.error { background: rgba(248,113,113,0.15); color: var(--error); }
.status-badge.generating { background: rgba(255,107,107,0.15); color: var(--accent); }
.gen-footer { text-align: center; margin-top: 1.5rem; color: var(--text-secondary); font-size: 0.9rem; }
</style>
