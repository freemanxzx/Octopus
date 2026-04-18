<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as fabric from 'fabric'
import { sendCanvasCommand } from '../api'

// Protocol Types
export interface CanvasLayer {
  id: string
  type: string
  left: number
  top: number
  width: number
  height: number
  visible: boolean
  selectable: boolean
  z_index: number
  content?: string
  src?: string
  fill?: string
  opacity?: number
  font_size?: number
  font_family?: string
  font_weight?: string
  text_align?: string
}

export interface CanvasPage {
  id: string
  page_number: number
  layers: CanvasLayer[]
}

export interface CanvasDocument {
  id: string
  title: string
  aspect_ratio: string
  width: number
  height: number
  background: string
  pages: CanvasPage[]
}

const props = defineProps<{
  document?: CanvasDocument
  pageIndex?: number
  imageUrl?: string // Backwards compatibility for single images
  width?: number
  height?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', dataUrl: string): void
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let canvas: fabric.Canvas | null = null
const currentWidth = ref(props.width || 1080)
const currentHeight = ref(props.height || 1440)

// Editor state
const textInput = ref('')
const activeLayerType = ref('')
const isMagicRunning = ref(false)

onMounted(() => {
  if (!canvasEl.value) return
  
  // Set dimensions based on document if available
  if (props.document && props.document.width) {
    currentWidth.value = props.document.width
    currentHeight.value = props.document.height
  }
  
  // For web preview, we scale the canvas down physically but keep resolution high via multiplier on export
  const displayScale = 0.4
  
  canvas = new fabric.Canvas(canvasEl.value, {
    width: currentWidth.value * displayScale,
    height: currentHeight.value * displayScale,
    backgroundColor: props.document?.background || '#0B0B0F',
  })

  // To map protocol to display
  canvas.setDimensions({ width: currentWidth.value * displayScale, height: currentHeight.value * displayScale })
  
  // Listen for selection to update UI
  canvas.on('selection:created', updateSelection)
  canvas.on('selection:updated', updateSelection)
  canvas.on('selection:cleared', () => { activeLayerType.value = '' })

  if (props.document) {
    loadDocument(props.document)
  } else if (props.imageUrl) {
    loadBackgroundImage(props.imageUrl)
  }
})

onUnmounted(() => {
  if (canvas) {
    canvas.dispose()
    canvas = null
  }
})

watch(() => props.document, (newDoc) => {
  if (newDoc && canvas) {
    if (newDoc.width && newDoc.height) {
      currentWidth.value = newDoc.width
      currentHeight.value = newDoc.height
      const displayScale = 0.4
      canvas.setDimensions({ width: currentWidth.value * displayScale, height: currentHeight.value * displayScale })
    }
    loadDocument(newDoc)
  }
}, { deep: true })

function loadDocument(doc: CanvasDocument) {
  if (!canvas) return
  canvas.clear()
  canvas.backgroundColor = doc.background
  
  const pIdx = props.pageIndex || 0
  if (doc.pages && doc.pages.length > pIdx) {
    const page = doc.pages[pIdx]
    // Inject the final generated AI image as the background source!
    if (props.imageUrl && page.layers.length > 0 && page.layers[0].type === 'image') {
      page.layers[0].src = props.imageUrl
    }
    renderProtocolLayers(page.layers, currentWidth.value, currentHeight.value)
  }
}

// Coordinate mapping: Protocol is percentage based relative to Width/Height
function renderProtocolLayers(layers: CanvasLayer[], baseW: number, baseH: number) {
  if (!canvas) return
  const displayScale = 0.4 // internal preview scale
  
  const fabricObjects: fabric.FabricObject[] = []
  
  // Sort by z-index
  const sortedLayers = [...layers].sort((a, b) => a.z_index - b.z_index)

  for (const layer of sortedLayers) {
    if (!layer.visible) continue
    
    // Absolute position in Canvas relative to base dimensions
    const scaleLeft = (layer.left / 100) * baseW * displayScale
    const scaleTop = (layer.top / 100) * baseH * displayScale
    const scaleW = (layer.width / 100) * baseW * displayScale
    const scaleH = (layer.height / 100) * baseH * displayScale

    if (layer.type === 'image') {
      // Background mock for now
      const rect = new fabric.Rect({
        left: scaleLeft, top: scaleTop, width: scaleW, height: scaleH,
        fill: layer.fill || '#1c1c28',
        selectable: layer.selectable,
        rx: 20, ry: 20
      })
      if (layer.src) {
        // If has src, load image
        fabric.Image.fromURL(layer.src, { crossOrigin: 'anonymous' }).then((img: any) => {
          img.set({
            left: scaleLeft, top: scaleTop,
            scaleX: scaleW / (img.width || 1), scaleY: scaleH / (img.height || 1),
            selectable: layer.selectable
          })
          canvas?.add(img)
          canvas?.remove(rect) // remove placeholder
        }).catch((e: Error) => {
          console.warn('Failed to load layer img:', e)
          fabricObjects.push(rect)
        })
      } else {
        fabricObjects.push(rect)
      }
    } else if (layer.type === 'text') {
      const fontSize = (layer.font_size! / 100) * baseW * displayScale
      const text = new fabric.IText(layer.content || '', {
        left: scaleLeft, top: scaleTop,
        fontSize: fontSize,
        fill: layer.fill || '#FFFFFF',
        fontFamily: layer.font_family || 'Inter, PingFang SC, sans-serif',
        fontWeight: layer.font_weight || 'normal',
        textAlign: (layer.text_align as 'left'|'center'|'right') || 'left',
        selectable: layer.selectable,
        width: scaleW
      })
      fabricObjects.push(text)
    }
  }

  fabricObjects.forEach(obj => canvas?.add(obj))
  canvas.renderAll()
}

function loadBackgroundImage(url: string) {
  if (!canvas) return
  const displayScale = 0.4
  fabric.Image.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
    const scaleX = (currentWidth.value * displayScale) / (img.width || 1)
    const scaleY = (currentHeight.value * displayScale) / (img.height || 1)
    const scale = Math.max(scaleX, scaleY)
    img.set({
      scaleX: scale, scaleY: scale,
      originX: 'center', originY: 'center',
      left: (currentWidth.value * displayScale) / 2,
      top: (currentHeight.value * displayScale) / 2,
      selectable: false
    })
    canvas!.backgroundImage = img
    canvas!.renderAll()
  }).catch((e: Error) => {
    console.warn('Failed to load bg image:', e)
  })
}

function updateSelection() {
  if (!canvas) return
  const activeObj = canvas.getActiveObject()
  if (activeObj) {
    activeLayerType.value = activeObj.type || 'object'
    if (activeObj.type === 'i-text') {
      textInput.value = (activeObj as fabric.IText).text || ''
    }
  }
}

// Toolbar functionality
function updateText() {
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (active && active.type === 'i-text') {
    (active as fabric.IText).set('text', textInput.value)
    canvas.renderAll()
  } else {
    // Add new text
    const text = new fabric.IText(textInput.value || '双击编辑', {
      left: 100, top: 100, fontSize: 32, fill: '#fff',
      fontFamily: 'Inter', editable: true
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    textInput.value = ''
  }
}

function deleteSelected() {
  if (!canvas) return
  const active = canvas.getActiveObjects()
  if (active.length) {
    active.forEach(obj => canvas!.remove(obj))
    canvas.discardActiveObject()
    canvas.renderAll()
  }
}

function exportImage() {
  if (!canvas) return
  // Reverse the displayScale for export to get original resolution
  const multiplier = 1 / 0.4
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: multiplier })
  emit('save', dataUrl)
}

function bringForward() { if (!canvas) return; const obj = canvas.getActiveObject(); if (obj) { canvas.bringObjectForward(obj); canvas.renderAll() } }
function sendBackward() { if (!canvas) return; const obj = canvas.getActiveObject(); if (obj) { canvas.sendObjectBackwards(obj); canvas.renderAll() } }

async function handleMagic(cmd: string) {
  if (!canvas) return
  const activeObj = canvas.getActiveObject() as fabric.Image
  if (!activeObj || (activeObj.type !== 'image' && activeObj.type !== 'rect')) return
  
  if (cmd === 'remove_bg') {
    isMagicRunning.value = true
    try {
      // In a real scenario, activeObj.getSrc() would return the image URL
      // Since some layers might be generated on the fly, we attempt string retrieval
      const url = typeof activeObj.getSrc === 'function' ? activeObj.getSrc() : ''
      if (!url) {
        alert("找不到有效图片地址")
        isMagicRunning.value = false
        return
      }

      const res = await sendCanvasCommand('remove_background', { url })
      if (res.success && res.result) {
        let newUrl = res.result.trim()
        // Extract URL if the agent wrapped it accidentally in markdown
        const match = newUrl.match(/https?:\/\/[^\s"'<]+/)
        if (match) newUrl = match[0]

        try {
          // @ts-ignore
          await activeObj.setSrc(newUrl, { crossOrigin: 'anonymous' })
          canvas!.renderAll()
        } catch (setErr) {
          console.error("Failed to load new magic image", setErr)
        }
      } else {
        console.error('Magic failed', res.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      isMagicRunning.value = false
    }
  }
async function handleGlobalMagic(command: string) {
  if (command === 'smart_relayout') {
    if (!props.document) return
    isMagicRunning.value = true
    try {
      const pIdx = props.pageIndex || 0
      const pageData = props.document.pages[pIdx]
      // Serialize the current page configuration layers to string
      const docJson = JSON.stringify(pageData)
      
      const res = await sendCanvasCommand(command, { document: docJson })
      if (res.success && res.result) {
        let rawJson = res.result
        // Clean potential markdown injected by rogue LLMs
        if (rawJson.includes('```json')) {
           rawJson = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim()
        } else if (rawJson.includes('```')) {
           rawJson = rawJson.replace(/```/g, '').trim()
        }
        
        try {
          const updatedPage = JSON.parse(rawJson)
          if (updatedPage && updatedPage.layers) {
             // Overwrite layers with AI generated beauty
             props.document.pages[pIdx].layers = updatedPage.layers
             // Re-render
             loadDocument(props.document)
          } else {
             alert("AI返回的排版数据格式暂不兼容")
          }
        } catch (je) {
          console.error("JSON parse failed. Raw text:", rawJson)
          alert("AI 引擎返回了破坏性格式，智能排版中断")
        }
      } else {
        alert("智能排版失败: " + (res.error || "未知异常"))
      }
    } catch (e: any) {
      alert("操作网络失败: " + e.message)
    } finally {
      isMagicRunning.value = false
    }
  }
}
</script>

<template>
  <div class="canvas-overlay" @click.self="emit('close')">
    <div class="canvas-panel animate-scale-in">
      <div class="panel-header">
        <h3>智能排版画布 (Pro Editor)</h3>
        <div class="panel-actions">
          <button class="btn-ghost" @click="emit('close')">取消</button>
          <button class="btn-primary" @click="exportImage">💾 导出高清大图</button>
        </div>
      </div>

      <div class="panel-body">
        <div class="toolbar-strip">
          <div class="tool-group">
            <input v-model="textInput" placeholder="图层文字..." class="tool-input" @keydown.enter="updateText" />
            <button class="tool-btn" @click="updateText" title="更新/添加文字">T</button>
          </div>
          
          <div class="tool-divider"></div>
          
          <div class="tool-group">
            <button class="tool-btn" @click="bringForward" title="上移图层">↑</button>
            <button class="tool-btn" @click="sendBackward" title="下移图层">↓</button>
            <button class="tool-btn danger" @click="deleteSelected" title="删除">🗑</button>
          </div>

          <!-- Magic AI Placeholder for Phase 7 -->
          <div class="tool-divider"></div>
          <div class="tool-group magic-group">
            <h4 style="margin-bottom:0.5rem; color:#fdf2f8;">✨ AI 魔法引擎</h4>
            
            <!-- Global Canvas Layout Rewriting Generator -->
            <button class="tool-btn global-magic" title="将当前海报全框架发送给顶尖AI设计师引擎进行一键重绘" 
              @click="handleGlobalMagic('smart_relayout')" 
              :disabled="isMagicRunning"
              style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; margin-bottom: 0.8rem; width: 100%; border: none;"
            >
              {{ isMagicRunning ? '📐 算力倾泻重绘中...' : '📐 智能一键重排' }}
            </button>

            <p v-if="activeLayerType !== 'image'" style="font-size:0.75rem; color:#a1a1aa; margin-bottom:0.5rem; border-top: 1px dotted #333; padding-top: 0.8rem;">
              👉 图像工具：请先在左侧画板选择要处理的图片图层
            </p>
            <button class="tool-btn magic" title="AI智能去背景" 
              @click="handleMagic('remove_bg')" 
              :disabled="isMagicRunning || activeLayerType !== 'image'"
              :style="{ opacity: activeLayerType !== 'image' ? 0.5 : 1 }"
            >
              {{ isMagicRunning ? '🪄 正在执行...' : '🪄 一键去背景' }}
            </button>
          </div>
        </div>
        
        <div class="canvas-container-wrap">
          <canvas ref="canvasEl"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
}
.canvas-panel {
  background: var(--bg-elevated, #111118);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl, 24px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-width: 95vw; max-height: 95vh; overflow: auto;
  display: flex; flex-direction: column;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--border);
}
.panel-header h3 { font-size: 1.1rem; font-weight: 700; background: -webkit-linear-gradient(45deg, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.panel-actions { display: flex; gap: 0.5rem; }
.panel-body { padding: 1.5rem; display: flex; flex-direction: column; align-items: center; background: #08080A;}

.toolbar-strip {
  display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap;
  background: var(--bg-card); padding: 0.5rem 1rem; border-radius: var(--radius-lg); border: 1px solid var(--border);
  width: 100%; justify-content: center;
}
.tool-group { display: flex; gap: 0.4rem; align-items: center; }
.tool-divider { width: 1px; height: 24px; background: var(--border); }

.tool-btn {
  width: 38px; height: 38px; border: none; background: transparent;
  color: var(--text-secondary); border-radius: 8px; cursor: pointer;
  font-size: 1rem; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.tool-btn:hover { background: rgba(139,92,246,0.15); color: var(--text-primary); }
.tool-btn.danger:hover { background: rgba(248,113,113,0.15); color: var(--error, #f87171); }
.tool-btn.magic { width: auto; padding: 0 1rem; font-weight: 600; color: #a78bfa; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); }
.tool-btn.magic:hover { background: rgba(139,92,246,0.25); box-shadow: 0 0 15px rgba(139,92,246,0.4); }

.tool-input {
  width: 180px; padding: 0.5rem 0.8rem;
  background: rgba(0,0,0,0.3); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; outline: none;
  transition: border-color 0.2s;
}
.tool-input:focus { border-color: #8b5cf6; }

.canvas-container-wrap {
  border: 1px solid var(--border); border-radius: var(--radius-md);
  overflow: hidden; display: inline-block; box-shadow: 0 0 40px rgba(0,0,0,0.5);
  background: #000;
}
</style>
