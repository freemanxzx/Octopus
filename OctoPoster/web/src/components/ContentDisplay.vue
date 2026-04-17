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
    setTimeout(() => { el.innerText = originalText }, 2000)
  } catch(err) { console.error('Copy failed', err) }
}

function copyAllTags(e: Event) {
  const text = store.tags.map(t => `#${t}`).join(' ')
  copyText(text, e)
}
</script>

<template>
  <div class="content-display">
    <div v-if="store.contentStatus === 'idle'" class="idle-state">
      <h3>AI 爆款文案生成</h3>
      <p>根据主题与大纲，自动输出标题、正文和标签</p>
      <button class="btn-primary" @click="handleGenerate">✨ 一键生成文案</button>
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>AI 正在构思中...</p>
    </div>

    <div v-else-if="isError" class="error-state">
      <p class="err-msg">❌ {{ store.contentError }}</p>
      <button class="btn-secondary" @click="handleGenerate">重新生成</button>
    </div>

    <div v-else-if="isDone" class="done-state">
      <div class="section-header">
        <h4>推荐标题 ({{ store.titles.length }})</h4>
        <button class="btn-ghost regen-btn" @click="handleGenerate">🔄</button>
      </div>
      <div class="titles-list">
        <div v-for="(title, idx) in store.titles" :key="idx" class="title-item">
          <span class="title-badge">{{ idx === 0 ? '首选' : `备${idx}` }}</span>
          <span class="title-text">{{ title }}</span>
          <button class="btn-ghost copy-btn" @click="copyText(title, $event)">复制</button>
        </div>
      </div>

      <div class="section-header">
        <h4>正文文案</h4>
        <button class="btn-ghost copy-btn" @click="copyText(store.copywriting, $event)">复制全部</button>
      </div>
      <div class="copywriting-box">
        <p v-for="(p, i) in formattedCopywriting" :key="i">{{ p }}</p>
      </div>

      <div class="section-header">
        <h4>热门标签</h4>
        <button class="btn-ghost copy-btn" @click="copyAllTags($event)">复制所有</button>
      </div>
      <div class="tags-list">
        <span v-for="(tag, idx) in store.tags" :key="idx" class="tag-pill" @click="copyText(`#${tag}`, $event)">
          #{{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-display { padding: 1.5rem; }
.idle-state, .loading-state, .error-state { text-align: center; padding: 2rem 1rem; }
.idle-state h3 { font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; }
.idle-state p { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem; }
.err-msg { color: var(--error); margin-bottom: 1rem; font-size: 0.85rem; }

.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin: 1.5rem 0 0.8rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;
}
.section-header h4 { font-size: 0.9rem; font-weight: 700; }
.regen-btn { font-size: 1rem; padding: 0.2rem; }
.copy-btn { font-size: 0.75rem; }

.titles-list { display: flex; flex-direction: column; gap: 0.6rem; }
.title-item {
  display: flex; align-items: center; gap: 0.8rem;
  background: var(--bg-input); padding: 0.7rem 1rem; border-radius: var(--radius-sm);
}
.title-badge {
  background: var(--accent-gradient); color: white;
  padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700;
  flex-shrink: 0;
}
.title-item:not(:first-child) .title-badge { background: var(--bg-card); color: var(--text-tertiary); }
.title-text { flex: 1; font-size: 0.9rem; font-weight: 500; }

.copywriting-box {
  background: var(--bg-input); padding: 1rem; border-radius: var(--radius-sm);
  font-size: 0.85rem; line-height: 1.8; color: var(--text-primary);
}
.copywriting-box p { margin-bottom: 0.6rem; }
.copywriting-box p:last-child { margin-bottom: 0; }

.tags-list { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.tag-pill {
  background: rgba(139,92,246,0.1); color: var(--accent-start);
  padding: 0.35rem 0.7rem; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.tag-pill:hover { background: var(--accent-start); color: white; transform: translateY(-1px); }
</style>
