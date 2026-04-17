<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'

const router = useRouter()
const store = useGeneratorStore()

function removePage(idx: number) {
  store.pages.splice(idx, 1)
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
    <div class="outline-header animate-fade-in">
      <div>
        <h2>内容大纲</h2>
        <p class="subtitle">{{ store.topic }} · {{ store.pages.length }} 页</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="router.push('/app')">← 返回</button>
        <button class="btn-primary" @click="startGenerate">🚀 开始并发生成</button>
      </div>
    </div>

    <div class="pages-list">
      <div
        v-for="(page, idx) in store.pages"
        :key="page.index"
        class="page-card animate-fade-in"
        :style="{ animationDelay: `${idx * 0.05}s` }"
      >
        <div class="page-header">
          <div class="page-badge-group">
            <span class="page-num">{{ idx + 1 }}</span>
            <span class="page-type" :class="page.type">
              {{ page.type === 'cover' ? '封面' : page.type === 'summary' ? '互动摘要' : '正文' }}
            </span>
          </div>
          <div class="page-actions">
            <button class="icon-btn" @click="movePage(idx, -1)" :disabled="idx === 0" title="上移">↑</button>
            <button class="icon-btn" @click="movePage(idx, 1)" :disabled="idx === store.pages.length - 1" title="下移">↓</button>
            <button class="icon-btn danger" @click="removePage(idx)" title="删除">✕</button>
          </div>
        </div>
        <textarea v-model="page.content" rows="4" class="page-editor"></textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
.outline-view { max-width: 800px; margin: 0 auto; }
.outline-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
}
.outline-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
.subtitle { font-size: 0.85rem; color: var(--text-secondary); }
.header-actions { display: flex; gap: 0.6rem; }

.pages-list { display: flex; flex-direction: column; gap: 1rem; }
.page-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.2rem 1.5rem;
  transition: all 0.3s var(--ease-out);
}
.page-card:hover { border-color: var(--border-hover); }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
.page-badge-group { display: flex; align-items: center; gap: 0.6rem; }
.page-num {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--accent-gradient); color: white; font-weight: 700; font-size: 0.75rem;
  border-radius: var(--radius-sm);
}
.page-type {
  font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm); background: var(--bg-input); color: var(--text-secondary);
}
.page-type.cover { background: rgba(236,72,153,0.12); color: #f472b6; }
.page-type.summary { background: rgba(52,211,153,0.12); color: #34d399; }

.page-actions { display: flex; gap: 0.3rem; }
.icon-btn {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text-tertiary); font-size: 0.8rem; padding: 0; cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover { border-color: var(--accent-start); color: var(--accent-start); }
.icon-btn.danger:hover { border-color: var(--error); color: var(--error); }
.icon-btn:disabled { opacity: 0.25; cursor: not-allowed; }

.page-editor {
  width: 100%; box-sizing: border-box;
  background: var(--bg-input); border: 1px solid var(--border);
  color: var(--text-primary); border-radius: var(--radius-sm);
  padding: 0.8rem 1rem; font-family: inherit; font-size: 0.875rem;
  resize: vertical; min-height: 80px; outline: none;
  transition: border-color 0.2s;
}
.page-editor:focus { border-color: var(--accent-start); box-shadow: 0 0 0 3px var(--accent-glow); }
</style>
