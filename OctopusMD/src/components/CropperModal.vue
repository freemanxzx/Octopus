<template>
  <div v-if="isOpen" class="cropper-overlay" @click.self="closeModal">
    <div class="cropper-modal">
      <div class="cropper-header">
        <h3>裁剪图片</h3>
        <button class="icon-btn close-btn" @click="closeModal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div class="cropper-body">
        <div class="cropper-container-wrapper">
          <img ref="imageRef" :src="imageUrl" alt="Target Image" style="display: block; max-width: 100%;">
        </div>
      </div>
      
      <div class="cropper-footer">
        <div class="cropper-tools">
          <button class="tool-btn" @click="cropper?.rotate(-90)" title="向左旋转">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
          <button class="tool-btn" @click="cropper?.rotate(90)" title="向右旋转">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
          </button>
          <div class="tool-divider"></div>
          <button class="tool-btn" @click="cropper?.setAspectRatio(1)" title="1:1 方形">1:1</button>
          <button class="tool-btn" @click="cropper?.setAspectRatio(16/9)" title="16:9 宽屏">16:9</button>
          <button class="tool-btn" @click="cropper?.setAspectRatio(NaN)" title="自由裁剪">自由</button>
        </div>
        <div class="cropper-actions">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="handleSave" :disabled="isSaving">
            <span v-if="isSaving" class="loading-spinner"></span>
            {{ isSaving ? '保存中...' : '确认裁剪并替换' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const props = defineProps<{
  isOpen: boolean;
  imageUrl: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', file: File): void;
}>();

const imageRef = ref<HTMLImageElement | null>(null);
const cropper = ref<Cropper | null>(null);
const isSaving = ref(false);

const initCropper = () => {
  if (cropper.value) {
    cropper.value.destroy();
  }
  if (imageRef.value) {
    cropper.value = new Cropper(imageRef.value, {
      viewMode: 1,
      dragMode: 'crop',
      autoCropArea: 1,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  }
};

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    await nextTick(); // Wait for DOM to render img
    // Initialize cropper after a tiny delay specifically for large images to be decoded by the browser
    setTimeout(initCropper, 100);
  } else {
    if (cropper.value) {
      cropper.value.destroy();
      cropper.value = null;
    }
  }
});

onUnmounted(() => {
  if (cropper.value) {
    cropper.value.destroy();
  }
});

const closeModal = () => {
  if (isSaving.value) return;
  emit('close');
};

const handleSave = () => {
  if (!cropper.value || isSaving.value) return;
  
  isSaving.value = true;
  cropper.value.getCroppedCanvas({
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  }).toBlob((blob: Blob | null) => {
    isSaving.value = false;
    if (blob) {
      // Create a unique filename for the cropped result
      const filename = `cropped-${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      emit('save', file);
    } else {
      alert("裁剪提取失败");
    }
  }, 'image/png', 1);
};
</script>

<style scoped>
.cropper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cropper-modal {
  width: 800px;
  max-width: 95vw;
  background: var(--bg-panel, #ffffff);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScaleUp {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.cropper-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle, #eee);
}

.cropper-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-hover, #f0f0f0);
  color: var(--text-primary, #333);
}

.cropper-body {
  height: 60vh;
  min-height: 400px;
  background: #e5e5e5;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cropper-container-wrapper {
  width: 100%;
  height: 100%;
}

.cropper-footer {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-app, #fafafa);
  border-top: 1px solid var(--border-subtle, #eee);
}

.cropper-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tool-btn {
  background: white;
  border: 1px solid var(--border-subtle, #ddd);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--text-primary, #444);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.tool-btn:hover {
  background: var(--bg-hover, #f5f5f5);
  border-color: #bbb;
}

.tool-divider {
  width: 1px;
  height: 20px;
  background: var(--border-subtle, #ddd);
  margin: 0 4px;
}

.cropper-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-subtle, #ddd);
}

.btn-secondary:hover {
  background: rgba(0,0,0,0.05);
}

.btn-primary {
  background: var(--primary, #1a73e8);
  color: white;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
  box-shadow: 0 4px 10px rgba(26, 115, 232, 0.4);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

html.dark .cropper-body {
  background: #121212;
}

html.dark .tool-btn {
  background: #2a2a2a;
  border-color: #444;
  color: #ddd;
}

html.dark .tool-btn:hover {
  background: #333;
  border-color: #555;
}
</style>
