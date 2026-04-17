<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'
import { generateOutline } from '../api'

const router = useRouter()
const store = useGeneratorStore()
const topic = ref('')
const images = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const loading = ref(false)
const error = ref('')
const selectedStyle = ref('default')

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    images.value.push(...Array.from(target.files))
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer && e.dataTransfer.files) {
    images.value.push(...Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
  }
}

async function handleGenerate() {
  if (!topic.value.trim()) return
  loading.value = true
  error.value = ''
  store.setTopic(topic.value.trim())
  store.setStyle(selectedStyle.value)

  try {
    const result = await generateOutline(topic.value.trim(), images.value.length > 0 ? images.value : undefined)
    if (result.success && result.pages) {
      store.setOutline(result.outline || '', result.pages)
      router.push('/outline')
    } else {
      error.value = result.error || '大纲生成失败'
    }
  } catch (e: any) {
    error.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="home">
    <div class="hero">
      <div class="hero-icon">🎨</div>
      <h2>一句话，生成整套小红书图文</h2>
      <p class="hero-desc">输入你的主题或创意，AI 将自动生成 6-12 页精美的小红书风格图文内容</p>
    </div>

    <div 
      class="input-area card dropzone-card" 
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      :class="{ 'drop-active': isDragging }"
    >
      <div v-if="isDragging" class="drag-overlay">
        <div class="drag-icon">📥</div>
        <h3>松开鼠标，添加参考图</h3>
      </div>

      <label>输入你的主题</label>
      <textarea
        v-model="topic"
        placeholder="例如：5分钟学会手冲咖啡、程序员必备的10个效率工具、秋冬穿搭指南..."
        rows="3"
        @keydown.ctrl.enter="handleGenerate"
      />
      
      <div style="margin-top: 0.8rem; display: flex; gap: 0.8rem; flex-wrap: wrap;">
        <div 
          v-for="(img, idx) in images" 
          :key="idx" 
          class="img-preview-badge"
        >
          📷 {{ img.name }}
          <span class="remove-img" @click="images.splice(idx, 1)">✕</span>
        </div>
      </div>

      <div class="input-actions" style="border-top: 1px solid var(--border); margin-top: 1rem; padding-top: 1rem;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button class="btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" @click="fileInput?.click()">
            📎 添加垫图
          </button>
          <input type="file" ref="fileInput" accept="image/*" multiple @change="onFileChange" style="display: none" />
          
          <select v-model="selectedStyle" class="style-select">
            <option value="default">默认风格</option>
            <option value="minimalist">极简高级风</option>
            <option value="illustration">精美插画风</option>
            <option value="photography">真实摄影风</option>
            <option value="workplace">职场精英风</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="hint">Ctrl + Enter 快速生成</span>
          <button class="btn-primary" :disabled="!topic.trim() || loading" @click="handleGenerate">
            <span v-if="loading" class="spinner" style="margin-right:6px"></span>
            {{ loading ? '正在上传与生成大纲...' : '✨ 开始创作' }}
          </button>
        </div>
      </div>
      <div v-if="error" class="error-msg">❌ {{ error }}</div>
    </div>

    <div class="features">
      <div class="feature-card card">
        <div class="feature-icon">📝</div>
        <h3>智能大纲</h3>
        <p>AI 自动规划 6-12 页内容结构</p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon">🎭</div>
        <h3>风格统一</h3>
        <p>封面锁定全套图片视觉风格</p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon">⚡</div>
        <h3>并发生成</h3>
        <p>多张图片同时生成，极速出图</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home { max-width: 700px; margin: 0 auto; }
.hero { text-align: center; margin-bottom: 2rem; }
.hero-icon { font-size: 3rem; margin-bottom: 0.8rem; }
.hero h2 {
  font-size: 1.6rem; font-weight: 700;
  background: linear-gradient(90deg, #ff6b6b, #ffa07a, #ffd93d);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hero-desc { color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.9rem; }
.input-area { margin-bottom: 2rem; }
.input-area label { display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 0.8rem; flex-wrap: wrap; gap: 1rem; }
.style-select { background: var(--bg-input); border: 1px solid var(--border); color: var(--text-primary); border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; outline: none; }
.hint { font-size: 0.75rem; color: var(--text-secondary); }
.error-msg { margin-top: 0.8rem; padding: 0.6rem; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); border-radius: 8px; font-size: 0.85rem; color: var(--error); }
.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.feature-card { text-align: center; padding: 1.2rem; }
.feature-icon { font-size: 1.8rem; margin-bottom: 0.5rem; }
.feature-card h3 { font-size: 0.95rem; margin-bottom: 0.3rem; }
.feature-card p { font-size: 0.8rem; color: var(--text-secondary); }
.img-preview-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-input); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; border: 1px solid var(--border); }
.remove-img { cursor: pointer; color: var(--error); opacity: 0.7; }
.remove-img:hover { opacity: 1; }

.dropzone-card { position: relative; overflow: hidden; transition: all 0.3s ease; }
.drop-active { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-glow); transform: scale(1.02); }
.drag-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(26,26,46,0.9); backdrop-filter: blur(4px);
  z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--accent); border: 2px dashed var(--accent); border-radius: var(--radius);
  animation: pulse 1.5s infinite;
}
.drag-icon { font-size: 3rem; margin-bottom: 1rem; pointer-events: none; }
.drag-overlay h3 { pointer-events: none; }
</style>
