<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'
import ContentDisplay from '../components/ContentDisplay.vue'
import CanvasEditor from '../components/CanvasEditor.vue'

const router = useRouter()
const store = useGeneratorStore()
const editingIndex = ref<number | null>(null)
const editingImageUrl = ref('')

function downloadAll() {
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
  router.push('/app')
}

function openEditor(index: number) {
  const url = store.imageUrls[index]
  if (!url) return
  editingIndex.value = index
  editingImageUrl.value = url
}

function closeEditor() {
  editingIndex.value = null
  editingImageUrl.value = ''
}

function handleEditorSave(dataUrl: string) {
  if (editingIndex.value !== null) {
    store.setImageUrl(editingIndex.value, dataUrl)
  }
  closeEditor()
}
</script>

<template>
  <div class="result-workspace">
    <!-- Top Glass Header -->
    <header class="studio-header">
      <div class="header-left">
        <span class="logo-text" @click="startOver" style="cursor: pointer;">
          OctoPoster <span class="badge">Result</span>
        </span>
      </div>
      <div class="header-mid">
        <div class="header-title">
          {{ store.topic }} <span class="counter">· 产出 {{ Object.keys(store.imageUrls).length }} 张</span>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-ghost" @click="startOver">← 返回工作台</button>
        <button class="spark-btn-small" @click="downloadAll">📥 一键提取全套</button>
      </div>
    </header>

    <div class="result-body">
      <!-- Left side: AI Content Metadata -->
      <aside class="metadata-sidebar">
        <ContentDisplay />
      </aside>

      <!-- Right Side: HD Gallery -->
      <main class="gallery-playground">
        <div class="gallery-grid">
          <div
            v-for="(page, idx) in store.pages"
            :key="page.index"
            class="gallery-card animate-fade-in"
            :style="{ animationDelay: `${idx * 0.06}s` }"
          >
            <!-- Badge overlay -->
            <div class="card-badge">
              <span class="page-idx">P{{ page.index + 1 }}</span>
              <span class="page-type-tag" :class="page.type">
                {{ page.type === 'cover' ? '封面' : page.type === 'summary' ? '互动摘要' : '核心内容' }}
              </span>
            </div>

            <div v-if="store.imageUrls[page.index]" class="image-wrapper">
              <img :src="store.imageUrls[page.index]" :alt="`第${page.index + 1}页`" />
              <!-- Hover Action Overlay -->
              <div class="image-overlay">
                <button class="edit-btn-huge" @click="openEditor(page.index)">
                  <span class="edit-icon">🖌️</span>
                  <span>进入画布编辑</span>
                </button>
              </div>
            </div>
            <div v-else class="image-placeholder">
              <div class="err-glow"></div>
              <span>❌ 该页生成中断</span>
              <span class="err-detail">{{ store.errors[page.index] }}</span>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Canvas Editor Modal -->
    <CanvasEditor
      v-if="editingIndex !== null"
      :image-url="editingImageUrl"
      @close="closeEditor"
      @save="handleEditorSave"
    />
  </div>
</template>

<style scoped>
.result-workspace {
  display: flex; flex-direction: column;
  height: 100vh;
  background: var(--bg-main, #0B0B0F);
  color: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* Header */
.studio-header {
  height: 60px;
  background: rgba(18, 18, 22, 0.7);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 1.5rem; flex-shrink: 0; z-index: 50;
}
.logo-text { font-weight: 800; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem; }
.badge { font-size: 0.6rem; padding: 0.15rem 0.4rem; background: rgba(59,130,246,0.15); color: #60a5fa; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.header-mid { flex: 1; text-align: center; }
.header-title { font-weight: 600; font-size: 0.95rem; color: #f3f4f6; }
.counter { color: #a1a1aa; font-weight: 400; font-size: 0.85rem; margin-left: 0.4rem; }
.header-right { display: flex; gap: 1rem; align-items: center; }

/* Buttons */
.btn-ghost { background: transparent; border: none; color: #a1a1aa; font-size: 0.85rem; cursor: pointer; transition: color 0.25s; }
.btn-ghost:hover { color: #fff; }
.spark-btn-small {
  padding: 0.5rem 1.2rem; border: none; border-radius: 50px;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #fff; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 15px rgba(139,92,246,0.3); transition: all 0.3s;
}
.spark-btn-small:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(236,72,153,0.4); }

/* Body Area */
.result-body {
  display: flex; flex: 1; overflow: hidden; position: relative;
}

/* Sidebar for content/copywriting */
.metadata-sidebar {
  width: 320px; flex-shrink: 0;
  background: rgba(18, 18, 22, 0.4);
  border-right: 1px solid rgba(255,255,255,0.06);
  overflow-y: auto;
}
/* Note: ContentDisplay component handles its own inner styles, but will inherit dark mode natively */

/* Playground / Gallery */
.gallery-playground {
  flex: 1; position: relative;
  background: radial-gradient(circle at center, #111118 0%, #08080C 100%);
  overflow-y: auto; padding: 2rem;
}
.gallery-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem; max-width: 1400px; margin: 0 auto;
}
.gallery-card {
  position: relative; border-radius: 16px; overflow: hidden;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s;
}
.gallery-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.6); border-color: rgba(236,72,153,0.3); }

/* Badges */
.card-badge {
  position: absolute; top: 12px; left: 12px; z-index: 10;
  display: flex; gap: 0.4rem; align-items: center;
}
.page-idx { background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 800; font-size: 0.75rem; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.page-type-tag { font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: #a1a1aa; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.page-type-tag.cover { background: rgba(236,72,153,0.4); color: #fdf2f8; }
.page-type-tag.summary { background: rgba(59,130,246,0.4); color: #eff6ff; }

/* Image Area */
.image-wrapper { position: relative; width: 100%; aspect-ratio: 3/4; display: flex; }
.image-wrapper img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 16px; }

/* Overlay for Editing */
.image-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(2px); border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s ease;
}
.image-wrapper:hover .image-overlay { opacity: 1; }

.edit-btn-huge {
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  color: #fff; padding: 1rem 1.5rem; border-radius: 50px;
  font-size: 0.95rem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 0.6rem;
  backdrop-filter: blur(8px); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateY(20px);
}
.image-wrapper:hover .edit-btn-huge { transform: translateY(0); }
.edit-btn-huge:hover { background: rgba(236,72,153,0.8); border-color: #ec4899; box-shadow: 0 10px 30px rgba(236,72,153,0.4); }
.edit-icon { font-size: 1.2rem; }

/* Errors */
.image-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ef4444; gap: 0.6rem; font-size: 0.85rem; background: rgba(239,68,68,0.05); }
.err-glow { width: 60px; height: 60px; border-radius: 50%; background: rgba(239,68,68,0.2); filter: blur(20px); position: absolute; }
.err-detail { font-size: 0.75rem; color: #fca5a5; max-width: 80%; text-align: center; z-index: 1; }

.animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
</style>
