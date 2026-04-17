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
      if (tp) {
        textModel.value = tp.model || textModel.value
        textBaseUrl.value = tp.base_url || ''
      }
      if (ip) {
        imageModel.value = ip.model || imageModel.value
        imageBaseUrl.value = ip.base_url || ''
      }
    }
  } catch {}
})

async function handleSave() {
  saving.value = true
  try {
    const res = await saveConfig({
      text_generation: {
        active_provider: 'default',
        providers: {
          default: { api_key: textApiKey.value, base_url: textBaseUrl.value, model: textModel.value }
        }
      },
      image_generation: {
        active_provider: 'default',
        providers: {
          default: { api_key: imageApiKey.value, base_url: imageBaseUrl.value, model: imageModel.value }
        }
      }
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
    testResult.value = res.success ? '✅ 文本服务连接成功！' : '❌ ' + res.error
  } catch (e) { testResult.value = '❌ 连接异常: ' + String(e) }
  finally { testingText.value = false }
}

async function handleTestImage() {
  if (!imageApiKey.value) { alert('请先填写图片 API Key'); return }
  testingImage.value = true; testResult.value = ''
  try {
    const res = await testConnection({ type: 'image_api', api_key: imageApiKey.value, base_url: imageBaseUrl.value, model: imageModel.value })
    testResult.value = res.success ? '✅ 图片服务连接成功！' : '❌ ' + res.error
  } catch (e) { testResult.value = '❌ 连接异常: ' + String(e) }
  finally { testingImage.value = false }
}
</script>

<template>
  <div class="settings-view">
    <h2>⚙️ 系统设置</h2>
    <p class="desc">配置 AI 服务商的 API Key 和模型参数</p>

    <div class="settings-grid">
      <div class="card">
        <h3>📝 文本生成（大纲 & 文案）</h3>
        <div class="field">
          <label>API Key</label>
          <input type="text" v-model="textApiKey" placeholder="sk-xxxx 或 AIza..." />
        </div>
        <div class="field">
          <label>Base URL（可选）</label>
          <input type="text" v-model="textBaseUrl" placeholder="留空使用默认" />
        </div>
        <div class="field">
          <label>模型</label>
          <input type="text" v-model="textModel" placeholder="gemini-2.0-flash" />
        </div>
        <button class="btn-secondary test-btn" @click="handleTestText" :disabled="testingText">
          {{ testingText ? '测试中...' : '🔌 测试连接' }}
        </button>
      </div>

      <div class="card">
        <h3>🎨 图片生成</h3>
        <div class="field">
          <label>API Key</label>
          <input type="text" v-model="imageApiKey" placeholder="sk-xxxx 或 AIza..." />
        </div>
        <div class="field">
          <label>Base URL（可选）</label>
          <input type="text" v-model="imageBaseUrl" placeholder="留空使用默认" />
        </div>
        <div class="field">
          <label>模型</label>
          <input type="text" v-model="imageModel" placeholder="gemini-3-pro-image-preview" />
        </div>
        <button class="btn-secondary test-btn" @click="handleTestImage" :disabled="testingImage">
          {{ testingImage ? '测试中...' : '🔌 测试连接' }}
        </button>
      </div>
    </div>

    <div v-if="testResult" class="test-result" :class="{ success: testResult.startsWith('✅'), error: testResult.startsWith('❌') }">
      {{ testResult }}
    </div>

    <div class="save-area">
      <button class="btn-primary" @click="handleSave" :disabled="saving">
        {{ saving ? '保存中...' : '💾 保存配置' }}
      </button>
      <span v-if="saved" class="saved-msg">✅ 配置已保存到服务端</span>
    </div>

    <div class="card info-card">
      <h4>💡 配置说明</h4>
      <ul>
        <li>文本生成推荐 Gemini 2.0 Flash 或 GPT-4o</li>
        <li>图片生成推荐 Gemini 3 Pro Image Preview 或 Nano Banana Pro</li>
        <li>如果在国内使用，请配置代理 Base URL</li>
        <li>配置文件存储在 <code>text_providers.yaml</code> 和 <code>image_providers.yaml</code></li>
        <li>点击「测试连接」可验证 API Key 和 Base URL 是否正确</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.settings-view { max-width: 800px; margin: 0 auto; }
.settings-view h2 { margin-bottom: 0.3rem; }
.desc { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.settings-grid h3 { font-size: 0.95rem; margin-bottom: 1rem; }
.field { margin-bottom: 0.8rem; }
.field label { display: block; font-size: 0.8rem; font-weight: 500; margin-bottom: 0.3rem; color: var(--text-secondary); }
.test-btn { width: 100%; margin-top: 0.5rem; }
.test-result { padding: 0.6rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; }
.test-result.success { background: rgba(74,222,128,0.1); color: var(--success); border: 1px solid rgba(74,222,128,0.3); }
.test-result.error { background: rgba(248,113,113,0.1); color: var(--error); border: 1px solid rgba(248,113,113,0.3); }
.save-area { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.saved-msg { color: var(--success); font-size: 0.85rem; }
.info-card { font-size: 0.85rem; }
.info-card h4 { margin-bottom: 0.6rem; }
.info-card ul { padding-left: 1.2rem; color: var(--text-secondary); }
.info-card li { margin-bottom: 0.3rem; }
.info-card code { background: var(--bg-input); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.8rem; }
</style>
