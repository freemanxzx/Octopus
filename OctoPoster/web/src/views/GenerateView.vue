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
const doneCount = computed(() => store.pages.filter(p => store.pageStatus[p.index] === 'done').length)

onMounted(() => {
  if (!store.pages.length) { router.push('/'); return }
  startGeneration()
})

function startGeneration() {
  store.isGenerating = true
  generateImages(
    store.pages, store.taskId, store.outline, store.topic, store.style, store.platform,
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
    const result = await retryImage(store.taskId, page, store.outline, store.topic, store.style, store.platform)
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
  await retrySingle(index)
}
</script>

<template>
  <div class="generate-view">
    <div class="gen-header animate-fade-in">
      <div>
        <h2>⚡ 并发渲染引擎</h2>
        <p class="subtitle" v-if="store.isGenerating">
          正在渲染第 {{ doneCount + 1 }} / {{ store.pages.length }} 页...
        </p>
        <p class="subtitle" v-else-if="hasFailedImages">{{ failedIndexes.length }} 张图片异常，可一键补全</p>
        <p class="subtitle" v-else>全部 {{ store.pages.length }} 张完成 ✅</p>
      </div>
      <div class="header-actions">
        <button v-if="hasFailedImages && !store.isGenerating" class="btn-primary" @click="retryAllFailed" :disabled="isRetrying">
          {{ isRetrying ? '补全中...' : '🔄 一键补全' }}
        </button>
        <button class="btn-secondary" @click="router.push('/outline')">← 返回大纲</button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-card animate-fade-in" style="animation-delay: 0.1s">
      <div class="progress-meta">
        <span>渲染进度</span>
        <span class="progress-pct">{{ Math.round(progressPercent) }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <div class="gen-grid">
      <div
        v-for="page in store.pages"
        :key="page.index"
        class="gen-card animate-fade-in"
        :class="store.pageStatus[page.index]"
        :style="{ animationDelay: `${page.index * 0.06}s` }"
      >
        <div class="card-top">
          <span class="page-num">{{ page.index + 1 }}</span>
          <span class="page-type">{{ page.type === 'cover' ? '封面' : page.type === 'summary' ? '摘要' : '内容' }}</span>
        </div>

        <!-- Done -->
        <div v-if="store.pageStatus[page.index] === 'done'" class="card-body image-wrap">
          <img :src="store.imageUrls[page.index]" alt="" />
          <div class="image-overlay">
            <button class="overlay-btn" @click="regenerateSingle(page.index)">🔄 重新生成</button>
          </div>
        </div>

        <!-- Generating -->
        <div v-else-if="store.pageStatus[page.index] === 'generating'" class="card-body generating-state">
          <div class="gen-orb"></div>
          <span>渲染中...</span>
        </div>

        <!-- Error -->
        <div v-else-if="store.pageStatus[page.index] === 'error'" class="card-body error-state">
          <span>❌</span>
          <span class="error-text">{{ store.errors[page.index] }}</span>
          <button class="retry-btn" @click="retrySingle(page.index)">点击重试</button>
        </div>

        <!-- Pending -->
        <div v-else class="card-body pending-state">
          <span>⏳ 队列等待</span>
        </div>

        <div class="card-footer">
          <span>P{{ page.index + 1 }}</span>
          <span class="status-dot" :class="store.pageStatus[page.index] || 'pending'"></span>
        </div>
      </div>
    </div>

    <div v-if="store.isGenerating" class="gen-footer animate-pulse">
      引擎运行中，请保持页面打开...
    </div>
  </div>
</template>

<style scoped>
.generate-view { max-width: 1100px; margin: 0 auto; }
.gen-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.gen-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
.subtitle { font-size: 0.85rem; color: var(--text-secondary); }
.header-actions { display: flex; gap: 0.6rem; }

/* Progress */
.progress-card {
  background: var(--bg-card); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 1.2rem 1.5rem; margin-bottom: 2rem;
}
.progress-meta { display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-weight: 600; font-size: 0.9rem; }
.progress-pct { color: var(--accent-start); }
.progress-track { background: var(--bg-input); border-radius: var(--radius-full); height: 6px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent-gradient); border-radius: var(--radius-full); transition: width 0.5s var(--ease-out); }

/* Grid */
.gen-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.2rem; }
.gen-card {
  background: var(--bg-card); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 0.8rem; display: flex; flex-direction: column; min-height: 240px;
  transition: all 0.3s var(--ease-out);
}
.gen-card:hover { border-color: var(--border-hover); }
.gen-card.done { border-color: rgba(52,211,153,0.25); }
.gen-card.error { border-color: rgba(248,113,113,0.25); }
.gen-card.generating { border-color: rgba(139,92,246,0.25); }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.page-num { font-weight: 800; font-size: 0.85rem; color: var(--accent-start); }
.page-type { font-size: 0.7rem; color: var(--text-tertiary); background: var(--bg-input); padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); }

.card-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; }
.pending-state { color: var(--text-tertiary); font-size: 0.85rem; }
.error-state { color: var(--error); }
.error-text { font-size: 0.7rem; max-height: 40px; overflow: hidden; text-align: center; }
.retry-btn {
  background: rgba(248,113,113,0.1); color: var(--error); border: 1px solid rgba(248,113,113,0.2);
  padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem; cursor: pointer; margin-top: 0.3rem;
}
.retry-btn:hover { background: rgba(248,113,113,0.2); }

.generating-state { color: var(--accent-start); font-size: 0.85rem; }
.gen-orb {
  width: 40px; height: 40px; border-radius: 50%;
  background: radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%);
  animation: float 3s ease-in-out infinite;
  margin-bottom: 0.5rem;
}

.image-wrap { position: relative; overflow: hidden; border-radius: var(--radius-sm); }
.image-wrap img { width: 100%; border-radius: var(--radius-sm); object-fit: cover; display: block; }
.image-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s;
}
.image-wrap:hover .image-overlay { opacity: 1; }
.overlay-btn {
  background: var(--accent-gradient); color: white; border: none;
  padding: 0.5rem 1rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 600; cursor: pointer;
}

.card-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--border);
  font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary);
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted);
}
.status-dot.done { background: var(--success); box-shadow: 0 0 8px rgba(52,211,153,0.5); }
.status-dot.error { background: var(--error); box-shadow: 0 0 8px rgba(248,113,113,0.5); }
.status-dot.generating { background: var(--accent-start); box-shadow: 0 0 8px rgba(139,92,246,0.5); animation: pulse 1.5s infinite; }

.gen-footer { text-align: center; margin-top: 2rem; color: var(--text-secondary); font-size: 0.9rem; }
</style>
