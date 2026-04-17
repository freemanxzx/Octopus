<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as fabric from 'fabric'

const props = defineProps<{
  imageUrl: string
  width?: number
  height?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', dataUrl: string): void
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let canvas: fabric.Canvas | null = null
const canvasWidth = props.width || 540
const canvasHeight = props.height || 720
const textInput = ref('')

onMounted(() => {
  if (!canvasEl.value) return
  canvas = new fabric.Canvas(canvasEl.value, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: '#0B0B0F',
  })
  if (props.imageUrl) loadBackgroundImage(props.imageUrl)
})

onUnmounted(() => { if (canvas) { canvas.dispose(); canvas = null } })

watch(() => props.imageUrl, (newUrl) => {
  if (newUrl && canvas) loadBackgroundImage(newUrl)
})

function loadBackgroundImage(url: string) {
  if (!canvas) return
  const imgEl = new Image()
  imgEl.crossOrigin = 'anonymous'
  imgEl.src = url
  imgEl.onload = () => {
    const fabricImg = new fabric.FabricImage(imgEl)
    const scaleX = canvasWidth / fabricImg.width!
    const scaleY = canvasHeight / fabricImg.height!
    const scale = Math.max(scaleX, scaleY)
    fabricImg.set({ scaleX: scale, scaleY: scale, originX: 'center', originY: 'center', left: canvasWidth / 2, top: canvasHeight / 2, selectable: false, evented: false })
    canvas!.backgroundImage = fabricImg
    canvas!.renderAll()
  }
}

function addText() {
  if (!canvas) return
  const text = new fabric.IText(textInput.value || '双击编辑文字', {
    left: canvasWidth / 2, top: canvasHeight / 2,
    originX: 'center', originY: 'center', fontSize: 32, fill: '#ffffff',
    fontFamily: 'Inter, Noto Sans SC, PingFang SC, sans-serif', fontWeight: '700',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.4)', blur: 10, offsetX: 2, offsetY: 2 }),
    editable: true,
  })
  canvas.add(text); canvas.setActiveObject(text); textInput.value = ''
}

function addShape(type: 'rect' | 'circle') {
  if (!canvas) return
  let shape: fabric.FabricObject
  if (type === 'rect') {
    shape = new fabric.Rect({ left: canvasWidth/2 - 50, top: canvasHeight/2 - 30, width: 100, height: 60, fill: 'rgba(139,92,246,0.4)', rx: 10, ry: 10, stroke: '#8b5cf6', strokeWidth: 2 })
  } else {
    shape = new fabric.Circle({ left: canvasWidth/2 - 30, top: canvasHeight/2 - 30, radius: 30, fill: 'rgba(236,72,153,0.4)', stroke: '#ec4899', strokeWidth: 2 })
  }
  canvas.add(shape); canvas.setActiveObject(shape)
}

function deleteSelected() {
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (active) { canvas.remove(active); canvas.discardActiveObject(); canvas.renderAll() }
}

function exportImage() {
  if (!canvas) return
  const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })
  emit('save', dataUrl)
}

function bringForward() { if (!canvas) return; const obj = canvas.getActiveObject(); if (obj) { canvas.bringObjectForward(obj); canvas.renderAll() } }
function sendBackward() { if (!canvas) return; const obj = canvas.getActiveObject(); if (obj) { canvas.sendObjectBackwards(obj); canvas.renderAll() } }
</script>

<template>
  <div class="canvas-overlay" @click.self="emit('close')">
    <div class="canvas-panel animate-scale-in">
      <div class="panel-header">
        <h3>画布编辑器</h3>
        <div class="panel-actions">
          <button class="btn-ghost" @click="emit('close')">取消</button>
          <button class="btn-primary" @click="exportImage">💾 导出 2x</button>
        </div>
      </div>

      <div class="panel-body">
        <div class="toolbar-strip">
          <div class="tool-group">
            <input v-model="textInput" placeholder="输入文字..." class="tool-input" @keydown.enter="addText" />
            <button class="tool-btn" @click="addText" title="添加文字">T</button>
          </div>
          <div class="tool-group">
            <button class="tool-btn" @click="addShape('rect')" title="矩形">▢</button>
            <button class="tool-btn" @click="addShape('circle')" title="圆形">○</button>
          </div>
          <div class="tool-group">
            <button class="tool-btn" @click="bringForward" title="上移">↑</button>
            <button class="tool-btn" @click="sendBackward" title="下移">↓</button>
            <button class="tool-btn danger" @click="deleteSelected" title="删除">🗑</button>
          </div>
        </div>
        <div class="canvas-wrap">
          <canvas ref="canvasEl"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
}
.canvas-panel {
  background: var(--bg-elevated, #111118);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl, 24px);
  box-shadow: var(--shadow-lg);
  max-width: 95vw; max-height: 95vh; overflow: auto;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.5rem; border-bottom: 1px solid var(--border);
}
.panel-header h3 { font-size: 1rem; font-weight: 700; }
.panel-actions { display: flex; gap: 0.5rem; }
.panel-body { padding: 1.2rem 1.5rem; }

.toolbar-strip {
  display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;
}
.tool-group {
  display: flex; gap: 0.3rem; align-items: center;
  background: var(--bg-card, rgba(24,24,32,0.5));
  border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.3rem;
}
.tool-btn {
  width: 36px; height: 36px; border: none; background: transparent;
  color: var(--text-secondary); border-radius: 6px; cursor: pointer;
  font-size: 0.9rem; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.tool-btn:hover { background: rgba(139,92,246,0.15); color: var(--accent-start, #8b5cf6); }
.tool-btn.danger:hover { background: rgba(248,113,113,0.15); color: var(--error, #f87171); }
.tool-input {
  width: 140px; padding: 0.4rem 0.6rem;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); font-size: 0.8rem; outline: none;
}
.tool-input:focus { border-color: var(--accent-start, #8b5cf6); }
.canvas-wrap {
  border: 1px solid var(--border); border-radius: var(--radius-md);
  overflow: hidden; display: inline-block;
}
</style>
