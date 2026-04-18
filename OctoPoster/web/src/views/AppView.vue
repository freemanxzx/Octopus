<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '../stores/generator'
import { generateOutline, generateOutlineFromURL, generateOutlineFromDoc } from '../api'
import { getTemplates, renderTemplate } from '../api'

const router = useRouter()
const generatorStore = useGeneratorStore()

// Input states
const inputMode = ref<'topic' | 'url' | 'doc'>('topic')
const topic = ref('')
const urlVal = ref('')
const docFile = ref<File | null>(null)
const uploadedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const docFileInput = ref<HTMLInputElement | null>(null)

// Global params
const genMode = ref<'ai' | 'template'>('ai')
const selectedPlatform = ref('xhs')
const selectedStyle = ref('default')
const platforms = [
  { id: 'xhs', label: '📕 小红书', ratio: '3:4' },
  { id: 'gzh', label: '💬 公众号', ratio: '1:1' },
  { id: 'moments', label: '📱 朋友圈', ratio: '1:1' },
  { id: 'ecom', label: '🛒 电商', ratio: '3:4' }
]

// Status
const loading = ref(false)
const error = ref('')

// Template Engine
const templates = ref<any[]>([])
const selectedTemplate = ref<any>(null)
const templateData = ref<Record<string, string>>({})
const renderingTemplate = ref(false)
const renderedImageUrl = ref('')

onMounted(async () => {
  try {
    const res = await getTemplates()
    if (res.success) {
      templates.value = res.templates || []
    }
  } catch (e) {
    console.error('Failed to load templates', e)
  }
})

function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    uploadedFiles.value.push(...Array.from(target.files))
  }
}

function handleDocUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    docFile.value = target.files[0]
  }
}

async function handleGenerate() {
  if (genMode.value === 'template') {
    // Tell UX to select a template if they haven't but hit generate
    if (!selectedTemplate.value) {
      error.value = '请在右侧选择一个渲染模板！'
    } else {
      handleRenderTemplate()
    }
    return
  }

  // AI Pipeline
  loading.value = true
  error.value = ''

  try {
    let res
    if (inputMode.value === 'url') {
      if (!urlVal.value.trim()) { error.value = '请输入文章 URL'; return }
      res = await generateOutlineFromURL(urlVal.value.trim())
    } else if (inputMode.value === 'doc') {
      if (!docFile.value) { error.value = '请选择文档文件'; return }
      res = await generateOutlineFromDoc(docFile.value)
    } else {
      if (!topic.value.trim()) { error.value = '请输入主题'; return }
      const filesArgs = uploadedFiles.value.length > 0 ? uploadedFiles.value : undefined
      res = await generateOutline(topic.value.trim(), filesArgs)
    }

    if (res.success && res.pages) {
      generatorStore.setTopic(inputMode.value === 'topic' ? topic.value.trim() : `[${inputMode.value}] Imported`)
      generatorStore.setStyle(selectedStyle.value)
      generatorStore.setPlatform(selectedPlatform.value)
      generatorStore.setOutline(res.outline || '', res.pages, res.canvas)
      router.push('/outline')
    } else {
      error.value = res.error || '大纲生成失败'
    }
  } catch (err: any) {
    error.value = err.message || '网络错误'
  } finally {
    loading.value = false
  }
}

function selectTemplate(tpl: any) {
  selectedTemplate.value = tpl
  templateData.value = {}
  tpl.slots.forEach((s: string) => { templateData.value[s] = '' })
  renderedImageUrl.value = ''
  error.value = ''
}

async function handleRenderTemplate() {
  if (!selectedTemplate.value) return
  renderingTemplate.value = true
  
  try {
    const ratio = platforms.find(p => p.id === selectedPlatform.value)?.ratio || '3:4'
    const res = await renderTemplate(selectedTemplate.value.id, templateData.value, ratio)
    if (res.success && res.image_url && res.task_id) {
      renderedImageUrl.value = `http://localhost:12399/api/tasks/${res.task_id}/${selectedTemplate.value.id}.png`
    } else {
      error.value = res.error || '模板渲染失败'
    }
  } catch (err: any) {
    error.value = err.message || '网络错误'
  } finally {
    renderingTemplate.value = false
  }
}
</script>

<template>
  <div class="studio-workspace">
    <!-- Top Glass Header -->
    <header class="studio-header">
      <div class="header-left">
        <span class="logo-text">OctoPoster <span class="badge">Studio</span></span>
      </div>
      <div class="header-mid">
        <div class="mode-toggle">
          <button class="mode-btn" :class="{ active: genMode === 'ai' }" @click="genMode = 'ai'">🎨 AI 原创引擎</button>
          <button class="mode-btn" :class="{ active: genMode === 'template' }" @click="genMode = 'template'">📐 排版模板库</button>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-ghost" @click="router.push('/')">退出工作台</button>
      </div>
    </header>

    <div class="studio-body">
      <!-- Left Sidebar: Configuration -->
      <aside class="config-sidebar">
        <div class="sidebar-section">
          <h3 class="section-title">1. 输入内容源</h3>
          <div class="input-tabs">
            <button class="tab-btn" :class="{ active: inputMode === 'topic' }" @click="inputMode = 'topic'">主题</button>
            <button class="tab-btn" :class="{ active: inputMode === 'url' }" @click="inputMode = 'url'">链接</button>
            <button class="tab-btn" :class="{ active: inputMode === 'doc' }" @click="inputMode = 'doc'">文档</button>
          </div>

          <!-- Topic Input -->
          <div v-if="inputMode === 'topic'" class="tab-content animate-fade-in">
            <textarea
              v-model="topic"
              placeholder="描述你想生成的小红书内容，例如：5分钟学会手冲咖啡..."
              rows="4"
              class="studio-textarea"
              @keydown.enter.ctrl="handleGenerate"
            ></textarea>
            <div class="img-preview-group">
              <div v-for="(file, idx) in uploadedFiles" :key="idx" class="img-preview-badge">
                📷 {{ file.name }}
                <button class="remove-img" @click="uploadedFiles.splice(idx, 1)">✕</button>
              </div>
              <button class="btn-ghost-small" @click="fileInput?.click()">+ 添加参考图</button>
              <input type="file" ref="fileInput" accept="image/*" multiple @change="handleFileUpload" style="display: none" />
            </div>
          </div>

          <!-- URL Input -->
          <div v-if="inputMode === 'url'" class="tab-content animate-fade-in">
            <div class="url-input-wrap">
              <span class="url-icon">🌐</span>
              <input v-model="urlVal" type="url" placeholder="粘贴任意公众号/文章链接" class="studio-input" @keydown.enter="handleGenerate" />
            </div>
            <p class="input-hint">AI 将自动提取网页正文并总结。</p>
          </div>

          <!-- Doc Input -->
          <div v-if="inputMode === 'doc'" class="tab-content animate-fade-in">
            <div class="doc-upload-zone" @click="docFileInput?.click()">
              <div v-if="docFile" class="doc-selected">
                <span class="doc-icon">📄</span>
                <div class="doc-info">
                  <div class="doc-name">{{ docFile.name }}</div>
                  <div class="doc-size">{{ (docFile.size / 1024).toFixed(1) }} KB</div>
                </div>
                <button class="remove-doc" @click.stop="docFile = null">✕</button>
              </div>
              <div v-else class="doc-placeholder">
                <span class="upload-icon">📤</span>
                <p>点击或拖拽 TXT/MD 文件</p>
              </div>
            </div>
            <input type="file" ref="docFileInput" accept=".txt,.md,.markdown" @change="handleDocUpload" style="display: none" />
          </div>
        </div>

        <div class="sidebar-section">
          <h3 class="section-title">2. 全局参数</h3>
          <div class="params-group">
            <label class="param-label">目标平台比例</label>
            <div class="platform-selector">
              <button
                v-for="p in platforms"
                :key="p.id"
                class="platform-btn"
                :class="{ active: selectedPlatform === p.id }"
                @click="selectedPlatform = p.id"
              >
                {{ p.label }} <span class="ratio-tag">{{ p.ratio }}</span>
              </button>
            </div>
          </div>

          <div class="params-group" v-if="genMode === 'ai'">
            <label class="param-label">视觉风格</label>
            <select v-model="selectedStyle" class="studio-select">
              <option value="default">默认泛用组合</option>
              <option value="minimalist">极简高级风</option>
              <option value="illustration">精美插画风</option>
              <option value="photography">真实摄影风</option>
              <option value="workplace">职场精英风</option>
            </select>
          </div>
        </div>

        <div class="sidebar-action">
          <button class="spark-btn" :disabled="loading" @click="handleGenerate">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? '正在解析推理中...' : '✨ 发动引擎生成' }}
          </button>
        </div>
        <div v-if="error" class="error-msg">❌ {{ error }}</div>
      </aside>

      <!-- Right Main Area: Playground -->
      <main class="studio-playground">
        <div class="playground-inner">
          <div v-if="genMode === 'ai'" class="ai-mode-view">
            <div class="empty-state">
              <div class="glowing-orb"></div>
              <h2>AI 原创引擎已就绪</h2>
              <p>在左侧配置灵感与参数，AI 将基于 Stable Diffusion 和智能布局算法并发生成独一无二的高清套图。</p>
            </div>
          </div>

          <div v-if="genMode === 'template'" class="template-mode-view">
            <div class="playground-header">
              <h2>高级排版模板库</h2>
              <p>直接利用底层 Chromedp 渲染管线，实现企业级的高精度版式输出。</p>
            </div>
            
            <div v-if="!selectedTemplate" class="template-grid">
              <div v-for="tpl in templates" :key="tpl.id" class="template-card" @click="selectTemplate(tpl)">
                <div class="tpl-preview" :class="tpl.id">{{ tpl.name.charAt(0) }}</div>
                <div class="tpl-info">
                  <div class="tpl-name">{{ tpl.name }}</div>
                  <div class="tpl-desc">{{ tpl.description }}</div>
                </div>
              </div>
              <div v-if="templates.length === 0" class="empty-text">加载模板失败，请检查服务。</div>
            </div>

            <div v-else class="template-editor-panel">
              <div class="editor-topbar">
                <span>正在编辑: <strong>{{ selectedTemplate.name }}</strong></span>
                <button class="btn-ghost-small" @click="selectedTemplate = null">← 返回模板库</button>
              </div>
              
              <div class="slot-fields">
                <div v-for="slot in selectedTemplate.slots" :key="slot" class="slot-field">
                  <label>{{ slot === 'points' ? '核心要点 (请用分号分隔)' : slot.toUpperCase() }}</label>
                  <textarea v-if="slot === 'points'" v-model="templateData[slot]" rows="3" class="studio-textarea"></textarea>
                  <input v-else v-model="templateData[slot]" class="studio-input" />
                </div>
              </div>

              <div class="editor-actions" style="margin-top: 1rem">
                <button class="spark-btn small" :disabled="renderingTemplate" @click="handleRenderTemplate">
                  <span v-if="renderingTemplate" class="spinner"></span>
                  {{ renderingTemplate ? '渲染中...' : '🎯 开始靶向渲染' }}
                </button>
              </div>

              <div v-if="renderedImageUrl" class="rendered-preview animate-scale-in">
                <img :src="renderedImageUrl" alt="结果" />
                <a :href="renderedImageUrl" download class="btn-ghost-small" style="display: inline-block; margin-top: 1rem;">📥 下载此页</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.studio-workspace {
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
  padding: 0 1.5rem; flex-shrink: 0;
  z-index: 50;
}
.logo-text { font-weight: 800; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem; }
.badge { font-size: 0.6rem; padding: 0.15rem 0.4rem; background: rgba(236,72,153,0.15); color: #f472b6; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

/* Mode Toggle */
.mode-toggle { display: flex; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.2rem; border: 1px solid rgba(255,255,255,0.05); }
.mode-btn { padding: 0.4rem 1rem; border: none; background: transparent; color: #a1a1aa; font-size: 0.85rem; font-weight: 500; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.mode-btn.active { background: rgba(255,255,255,0.1); color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }

/* Body Area */
.studio-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Sidebar */
.config-sidebar {
  width: 320px; flex-shrink: 0;
  background: rgba(18, 18, 22, 0.4);
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 2rem;
  overflow-y: auto;
}
.section-title { font-size: 0.8rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; }

/* Input Elements */
.input-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; background: rgba(0,0,0,0.3); padding: 0.3rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
.tab-btn { flex: 1; padding: 0.4rem 0; background: transparent; border: none; color: #71717a; font-size: 0.85rem; font-weight: 500; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.tab-btn.active { background: rgba(59,130,246,0.15); color: #60a5fa; box-shadow: inset 0 0 0 1px rgba(59,130,246,0.3); }

.studio-textarea, .studio-input, .studio-select {
  width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
  color: #e5e7eb; padding: 0.8rem; font-size: 0.9rem; font-family: inherit;
  transition: all 0.2s; outline: none;
}
.studio-textarea:focus, .studio-input:focus, .studio-select:focus { border-color: #8b5cf6; background: rgba(0,0,0,0.4); box-shadow: 0 0 0 2px rgba(139,92,246,0.1); }
.studio-select { appearance: none; cursor: pointer; }

/* URL Input */
.url-input-wrap { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0 0.8rem; transition: border-color 0.2s; }
.url-input-wrap:focus-within { border-color: #8b5cf6; }
.url-input-wrap .studio-input { border: none; padding-left: 0; padding-right: 0; background: transparent; }
.input-hint { font-size: 0.75rem; color: #71717a; margin-top: 0.5rem; }

/* Image upload styling */
.img-preview-group { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.img-preview-badge { display: flex; justify-content: space-between; font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 0.4rem 0.6rem; border-radius: 6px; }
.remove-img { background: transparent; border: none; color: #71717a; cursor: pointer; font-size: 0.8rem; transition: color 0.2s; }
.remove-img:hover { color: #ef4444; }

/* Doc Input */
.doc-upload-zone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
.doc-upload-zone:hover { border-color: #8b5cf6; background: rgba(139,92,246,0.05); }
.upload-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
.doc-placeholder p { font-size: 0.85rem; color: #a1a1aa; margin: 0; }
.doc-selected { display: flex; align-items: center; gap: 1rem; text-align: left; }
.doc-icon { font-size: 2rem; }
.doc-name { font-size: 0.85rem; font-weight: 600; color: #fff; }
.doc-size { font-size: 0.7rem; color: #a1a1aa; }
.remove-doc { margin-left: auto; background: transparent; border: none; color: #a1a1aa; cursor: pointer; }
.remove-doc:hover { color: #ef4444; }

/* Platform / Params */
.params-group { margin-bottom: 1.5rem; }
.param-label { display: block; font-size: 0.75rem; color: #71717a; margin-bottom: 0.6rem; letter-spacing: 0.5px; }
.platform-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.platform-btn {
  background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 0.6rem; border-radius: 8px;
  color: #a1a1aa; font-size: 0.8rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; transition: all 0.2s;
}
.platform-btn:hover { background: rgba(255,255,255,0.05); }
.platform-btn.active { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.5); color: #c4b5fd; box-shadow: 0 4px 12px rgba(139,92,246,0.15); }
.ratio-tag { font-size: 0.65rem; opacity: 0.7; }

/* Buttons */
.spark-btn {
  width: 100%; padding: 1rem; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 10px 30px rgba(139,92,246,0.3); transition: all 0.3s;
  display: flex; align-items: center; justify-content: center;
}
.spark-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 40px rgba(236,72,153,0.4); }
.spark-btn:disabled { opacity: 0.5; cursor: not-allowed; animation: pulse 2s infinite; }
.spark-btn.small { padding: 0.7rem; font-size: 0.9rem; }
.btn-ghost, .btn-ghost-small { background: transparent; border: none; color: #a1a1aa; cursor: pointer; transition: color 0.25s; padding: 0.4rem 0.8rem; border-radius: 6px; }
.btn-ghost-small { font-size: 0.8rem; padding: 0.3rem 0; }
.btn-ghost:hover, .btn-ghost-small:hover { color: #fff; background: rgba(255,255,255,0.05); }

/* Main Playground */
.studio-playground {
  flex: 1; position: relative; background: radial-gradient(circle at center, #111118 0%, #08080C 100%);
  overflow-y: auto; display: flex; justify-content: center; padding: 2rem;
}
.playground-inner { width: 100%; max-width: 900px; }

/* AI Mode Empty state */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 50vh; text-align: center; color: #71717a; }
.glowing-orb { width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%); margin-bottom: 2rem; animation: float 6s infinite ease-in-out; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }

/* Template Playground */
.playground-header { margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 1rem; }
.playground-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
.playground-header p { color: #a1a1aa; font-size: 0.9rem; }

.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; }
.template-card {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s;
}
.template-card:hover { transform: translateY(-5px); border-color: rgba(236,72,153,0.4); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.tpl-preview { height: 120px; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 900; opacity: 0.9; }
.tpl-preview.gradient_card { background: linear-gradient(135deg, #3b82f6, #ec4899); }
.tpl-preview.dark_elegant { background: linear-gradient(135deg, #18181b, #27272a); color: #fbbf24; }
.tpl-preview.fresh_minimal { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #166534; }
.tpl-info { padding: 1rem; }
.tpl-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.3rem; }
.tpl-desc { font-size: 0.75rem; color: #71717a; }

.template-editor-panel {
  background: rgba(20,20,25,0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem;
}
.editor-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; color: #e5e7eb; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1rem; }
.slot-fields { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
.slot-field label { display: block; font-size: 0.75rem; color: #a1a1aa; margin-bottom: 0.4rem; letter-spacing: 0.5px; }
.rendered-preview { margin-top: 2rem; text-align: center; background: #000; border-radius: 12px; padding: 1rem; border: 1px solid rgba(255,255,255,0.1); }
.rendered-preview img { max-width: 100%; border-radius: 8px; display: block; margin: 0 auto 1rem; }

.animate-scale-in { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.error-msg { background: rgba(239,68,68,0.1); color: #ef4444; padding: 0.8rem; border-radius: 8px; font-size: 0.8rem; margin-top: 1rem; border: 1px solid rgba(239,68,68,0.2); }
</style>
