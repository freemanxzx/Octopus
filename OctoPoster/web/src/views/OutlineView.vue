<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'

const router = useRouter()
const store = useGeneratorStore()

function removePage(idx: number) {
  store.pages.splice(idx, 1)
  // Re-index
  store.pages.forEach((p, i) => p.index = i)
}

function movePage(idx: number, dir: -1 | 1) {
  const target = idx + dir
  if (target < 0 || target >= store.pages.length) return
  const tmp = store.pages[idx]
  store.pages[idx] = store.pages[target]
  store.pages[target] = tmp
  store.pages.forEach((p, i) => p.index = i)
}

function startGenerate() {
  const taskId = 'task_' + Date.now().toString(36)
  store.setTaskId(taskId)
  router.push('/generate')
}
</script>

<template>
  <div class="outline-view">
    <div class="outline-header">
      <div>
        <h2>📋 内容大纲</h2>
        <p class="subtitle">主题：{{ store.topic }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="router.push('/')">← 返回</button>
        <button class="btn-primary" @click="startGenerate">🚀 开始生成图片</button>
      </div>
    </div>

    <div class="pages-list">
      <div v-for="(page, idx) in store.pages" :key="page.index" class="page-card card">
        <div class="page-header">
          <span class="page-badge" :class="page.type">
            {{ page.type === 'cover' ? '封面' : page.type === 'summary' ? '总结' : `第${idx}页` }}
          </span>
          <div class="page-actions">
            <button class="btn-icon" @click="movePage(idx, -1)" :disabled="idx === 0">↑</button>
            <button class="btn-icon" @click="movePage(idx, 1)" :disabled="idx === store.pages.length - 1">↓</button>
            <button class="btn-icon danger" @click="removePage(idx)">✕</button>
          </div>
        </div>
        <textarea
          v-model="page.content"
          rows="4"
          class="page-editor"
        />
      </div>
    </div>

    <div class="page-count">共 {{ store.pages.length }} 页</div>
  </div>
</template>

<style scoped>
.outline-view { max-width: 800px; margin: 0 auto; }
.outline-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.outline-header h2 { margin-bottom: 0.2rem; }
.subtitle { font-size: 0.85rem; color: var(--text-secondary); }
.header-actions { display: flex; gap: 0.6rem; }
.pages-list { display: flex; flex-direction: column; gap: 0.8rem; }
.page-card { position: relative; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.page-badge {
  font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem;
  border-radius: 4px; background: var(--bg-input); color: var(--text-secondary);
}
.page-badge.cover { background: rgba(255,107,107,0.15); color: var(--accent); }
.page-badge.summary { background: rgba(74,222,128,0.15); color: var(--success); }
.page-actions { display: flex; gap: 0.3rem; }
.btn-icon {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-secondary); font-size: 0.8rem; padding: 0; cursor: pointer;
  transition: all 0.15s;
}
.btn-icon:hover { border-color: var(--accent); color: var(--accent); }
.btn-icon.danger:hover { border-color: var(--error); color: var(--error); }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
.page-editor { min-height: 80px; resize: vertical; }
.page-count { text-align: center; margin-top: 1rem; color: var(--text-secondary); font-size: 0.85rem; }
</style>
