<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getConfig, saveConfig, testConnection } from '../api'

const textApiKey = ref('')
const textModel = ref('gemini-2.0-flash')
const textBaseUrl = ref('')
const imageApiKey = ref('')
const imageModel = ref('gemini-3-pro-image-preview')
const imageBaseUrl = ref('')
const saved = ref(false)
const saving = ref(false)
const testingText = ref(false)
const testingImage = ref(false)
const testResult = ref('')

onMounted(async () => {
  try {
    const res = await getConfig()
    if (res.success) {
      const tc = res.config.text_generation
      const ic = res.config.image_generation
      const tp = tc.providers?.[tc.active_provider]
      const ip = ic.providers?.[ic.active_provider]
      if (tp) { textModel.value = tp.model || textModel.value; textBaseUrl.value = tp.base_url || '' }
      if (ip) { imageModel.value = ip.model || imageModel.value; imageBaseUrl.value = ip.base_url || '' }
    }
  } catch {}
})

async function handleSave() {
  saving.value = true
  try {
    const res = await saveConfig({
      text_generation: { active_provider: 'default', providers: { default: { api_key: textApiKey.value, base_url: textBaseUrl.value, model: textModel.value } } },
      image_generation: { active_provider: 'default', providers: { default: { api_key: imageApiKey.value, base_url: imageBaseUrl.value, model: imageModel.value } } }
    })
    if (res.success) { saved.value = true; setTimeout(() => saved.value = false, 3000) }
    else alert('保存失败: ' + res.error)
  } finally { saving.value = false }
}

async function handleTestText() {
  if (!textApiKey.value) { alert('请先填写文本 API Key'); return }
  testingText.value = true; testResult.value = ''
  try {
    const res = await testConnection({ type: 'openai_compatible', api_key: textApiKey.value, base_url: textBaseUrl.value, model: textModel.value })
    testResult.value = res.success ? '✅ 文本服务连接成功' : '❌ ' + res.error
  } catch (e) { testResult.value = '❌ 连接异常: ' + String(e) }
  finally { testingText.value = false }
}

async function handleTestImage() {
  if (!imageApiKey.value) { alert('请先填写图片 API Key'); return }
  testingImage.value = true; testResult.value = ''
  try {
    const res = await testConnection({ type: 'image_api', api_key: imageApiKey.value, base_url: imageBaseUrl.value, model: imageModel.value })
    testResult.value = res.success ? '✅ 图片服务连接成功' : '❌ ' + res.error
  } catch (e) { testResult.value = '❌ 连接异常: ' + String(e) }
  finally { testingImage.value = false }
}
</script>

<template>
  <div class="settings-view">
    <div class="settings-header animate-fade-in">
      <h2>系统设置</h2>
      <p class="desc">管理 AI 服务 API Key 与模型参数</p>
    </div>

    <div class="settings-grid">
      <div class="provider-card animate-fade-in" style="animation-delay: 0.05s">
        <div class="provider-header">
          <span class="provider-icon">📝</span>
          <h3>文本生成引擎</h3>
        </div>
        <p class="provider-desc">负责大纲推理与文案输出</p>
        <div class="field">
          <label>API Key</label>
          <input type="text" v-model="textApiKey" placeholder="sk-xxxx 或 AIza..." />
        </div>
        <div class="field">
          <label>Base URL（可选）</label>
          <input type="text" v-model="textBaseUrl" placeholder="留空使用默认" />
        </div>
        <div class="field">
          <label>模型标识</label>
          <input type="text" v-model="textModel" placeholder="gemini-2.0-flash" />
        </div>
        <button class="btn-secondary test-btn" @click="handleTestText" :disabled="testingText">
          {{ testingText ? '探测中...' : '🔌 测试连接' }}
        </button>
      </div>

      <div class="provider-card animate-fade-in" style="animation-delay: 0.1s">
        <div class="provider-header">
          <span class="provider-icon">🎨</span>
          <h3>图片生成引擎</h3>
        </div>
        <p class="provider-desc">负责高清海报图片渲染</p>
        <div class="field">
          <label>API Key</label>
          <input type="text" v-model="imageApiKey" placeholder="sk-xxxx 或 AIza..." />
        </div>
        <div class="field">
          <label>Base URL（可选）</label>
          <input type="text" v-model="imageBaseUrl" placeholder="留空使用默认" />
        </div>
        <div class="field">
          <label>模型标识</label>
          <input type="text" v-model="imageModel" placeholder="gemini-3-pro-image-preview" />
        </div>
        <button class="btn-secondary test-btn" @click="handleTestImage" :disabled="testingImage">
          {{ testingImage ? '探测中...' : '🔌 测试连接' }}
        </button>
      </div>
    </div>

    <div v-if="testResult" class="test-result animate-scale-in" :class="{ success: testResult.startsWith('✅'), error: testResult.startsWith('❌') }">
      {{ testResult }}
    </div>

    <div class="save-area animate-fade-in" style="animation-delay: 0.15s">
      <button class="btn-primary" @click="handleSave" :disabled="saving">
        {{ saving ? '写入中...' : '💾 保存配置' }}
      </button>
      <span v-if="saved" class="saved-msg">✅ 已同步到服务端</span>
    </div>
  </div>
</template>

<style scoped>
.settings-view { max-width: 900px; margin: 0 auto; }
.settings-header { margin-bottom: 2rem; }
.settings-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
.desc { color: var(--text-secondary); font-size: 0.85rem; }

.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }

.provider-card {
  background: var(--bg-card); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 1.5rem; transition: all 0.3s var(--ease-out);
}
.provider-card:hover { border-color: var(--border-hover); }

.provider-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem; }
.provider-icon { font-size: 1.5rem; }
.provider-header h3 { font-size: 1rem; font-weight: 700; }
.provider-desc { font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 1.2rem; }

.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text-secondary); letter-spacing: 0.3px; }
.test-btn { width: 100%; margin-top: 0.5rem; }

.test-result {
  padding: 0.8rem 1.2rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.85rem;
}
.test-result.success { background: rgba(52,211,153,0.08); color: var(--success); border: 1px solid rgba(52,211,153,0.2); }
.test-result.error { background: rgba(248,113,113,0.08); color: var(--error); border: 1px solid rgba(248,113,113,0.2); }

.save-area { display: flex; align-items: center; gap: 1rem; }
.saved-msg { color: var(--success); font-size: 0.85rem; }

@media (max-width: 700px) {
  .settings-grid { grid-template-columns: 1fr; }
}
</style>
