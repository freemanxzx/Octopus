<script setup lang="ts">
import { computed } from 'vue'
import { useGeneratorStore } from '../stores/generator'
import { generateContent } from '../api'

const store = useGeneratorStore()

const loading = computed(() => store.contentStatus === 'generating')
const isDone = computed(() => store.contentStatus === 'done')
const isError = computed(() => store.contentStatus === 'error')

const formattedCopywriting = computed(() => {
  if (!store.copywriting) return []
  return store.copywriting.split('\n').filter(p => p.trim())
})

async function handleGenerate() {
  if (loading.value) return

  store.startContentGeneration()
  try {
    const result = await generateContent(store.topic, store.outline)
    if (result.success && result.titles && result.copywriting && result.tags) {
      store.setContent(result.titles, result.copywriting, result.tags)
    } else {
      store.setContentError(result.error || '生成文案失败')
    }
  } catch (err: any) {
    store.setContentError(err.message || '网络错误，请重试')
  }
}

async function copyText(text: string, e: Event) {
  try {
    await navigator.clipboard.writeText(text)
    const el = e.target as HTMLElement
    const originalText = el.innerText
    el.innerText = '已复制!'
    setTimeout(() => {
      el.innerText = originalText
    }, 2000)
  } catch(err) {
    console.error('Copy failed', err)
  }
}

function copyAllTags(e: Event) {
  const text = store.tags.map(t => `#${t}`).join(' ')
  copyText(text, e)
}
</script>

<template>
  <div class="content-display card animate-fade-in" style="animation-delay: 0.3s">
    <div v-if="store.contentStatus === 'idle'" class="idle-state">
      <h3>小红书爆款文案生成</h3>
      <p>自动根据您的主题与大纲，生成吸引眼球的标题、详细种草文案和热门标签。</p>
      <button class="btn-primary" @click="handleGenerate">✨ 一键生成图文配套文案</button>
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>AI 正在构思爆款文案，请稍候...</p>
    </div>

    <div v-else-if="isError" class="error-state">
      <p class="err-msg">❌ {{ store.contentError }}</p>
      <button class="btn-secondary" @click="handleGenerate">重新生成</button>
    </div>

    <div v-else-if="isDone" class="done-state">
      <div class="section-header">
        <h3>爆款标题 (推荐 {{ store.titles.length }} 个)</h3>
        <button class="btn-icon" @click="handleGenerate" title="重新生成全部文案">🔄</button>
      </div>
      
      <div class="titles-list">
        <div 
          v-for="(title, idx) in store.titles" 
          :key="idx" 
          class="title-item"
        >
          <span class="badge">{{ idx === 0 ? '首选' : `备选${idx}` }}</span>
          <span class="text">{{ title }}</span>
          <button class="btn-secondary copy-btn" @click="copyText(title, $event)">复制</button>
        </div>
      </div>

      <div class="section-header">
        <h3>正文与排版</h3>
        <button class="btn-secondary" @click="copyText(store.copywriting, $event)">复制全部</button>
      </div>
      <div class="copywriting-box">
        <p v-for="(p, i) in formattedCopywriting" :key="i">{{ p }}</p>
      </div>

      <div class="section-header">
        <h3>热门标签</h3>
        <button class="btn-secondary" @click="copyAllTags($event)">复制所有标签</button>
      </div>
      <div class="tags-list">
        <span 
          v-for="(tag, idx) in store.tags" 
          :key="idx" 
          class="tag-item" 
          @click="copyText(`#${tag}`, $event)"
        >
          #{{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-display { margin-top: 2rem; }
.idle-state, .loading-state, .error-state {
  text-align: center;
  padding: 3rem 1rem;
}
.idle-state h3 { margin-bottom: 0.5rem; color: var(--accent); }
.idle-state p { color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem; }
.spinner { margin: 0 auto 1rem; width: 30px; height: 30px; }
.err-msg { color: var(--error); margin-bottom: 1rem; }

.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin: 1.5rem 0 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
.section-header h3 { font-size: 1.1rem; margin: 0; }

.titles-list { display: flex; flex-direction: column; gap: 0.8rem; }
.title-item {
  display: flex; align-items: center; gap: 1rem;
  background: var(--bg-input); padding: 0.8rem 1rem; border-radius: 8px;
}
.badge { background: var(--accent); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.title-item:not(:first-child) .badge { background: var(--text-secondary); }
.text { flex: 1; font-size: 0.95rem; font-weight: 500; }
.copy-btn { padding: 0.4rem 0.8rem; font-size: 0.8rem; }

.copywriting-box {
  background: var(--bg-input); padding: 1.2rem; border-radius: 8px;
  font-size: 0.95rem; line-height: 1.8; color: var(--text-primary);
}
.copywriting-box p { margin-bottom: 0.8rem; }
.copywriting-box p:last-child { margin-bottom: 0; }

.tags-list { display: flex; flex-wrap: wrap; gap: 0.8rem; }
.tag-item {
  background: rgba(255,107,107,0.1); color: var(--accent);
  padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.tag-item:hover { background: var(--accent); color: white; transform: translateY(-2px); }

.btn-icon { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; padding: 0;}
.btn-icon:hover { opacity: 1; }
</style>
