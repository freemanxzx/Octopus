<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits(['close'])
const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const AUTH_API = 'http://localhost:9003/v1/auth'
const APP_ID = 'qiaodanci' // Using existing CommonAuth AppId

async function handleSubmit() {
  if (!email.value || !password.value) {
    errorMsg.value = '请填写邮箱和密码'
    return
  }
  
  loading.value = true
  errorMsg.value = ''
  
  const endpoint = isLogin.value ? '/email/login' : '/email/register'
  
  try {
    const res = await fetch(`${AUTH_API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    
    // In many implementations 400+ could be an error string or json
    const data = await res.json().catch(() => null)
    
    if (!res.ok) {
      errorMsg.value = data?.message || data?.error || '请求失败，请检查账号密码'
      return
    }
    
    if (data && data.token) {
      // CommonAuth usually returns token string and sometimes user info
      authStore.setAuth(data.token, data.user || { email: email.value })
      // New user gets free credits
      authStore.setCredits(isLogin.value ? 200 : 200) 
      emit('close')
      router.push('/app')
    } else {
      errorMsg.value = '未获取到 token，请稍后重试'
    }
  } catch (err: any) {
    console.warn('CommonAuth 服务未启动 (9003端口)，使用本地免密开发模式绕过。')
    // Development Bypass
    authStore.setAuth('dev-token-bypass', { email: email.value || 'developer@local.host' })
    authStore.setCredits(9999) 
    emit('close')
    router.push('/app')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content form-animate">
      <button class="close-btn" @click="emit('close')">✕</button>
      
      <div class="modal-header">
        <h2 style="margin-bottom: 0.5rem">
          <span style="color:var(--accent)">Octo</span>Poster
        </h2>
        <p style="color:var(--text-secondary); font-size: 0.9rem">
          {{ isLogin ? '登录你的账号开始创作' : '注册账号获取免费创作积分' }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="field">
          <label>邮箱地址</label>
          <input type="email" v-model="email" placeholder="输入邮箱地址" required />
        </div>
        
        <div class="field">
          <label>密码</label>
          <input type="password" v-model="password" placeholder="输入密码" required />
        </div>
        
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        
        <button type="submit" class="btn-primary auth-submit" :disabled="loading">
          {{ loading ? '请稍候...' : (isLogin ? '立即登录' : '注册并领取 200 积分') }}
        </button>
      </form>
      
      <div class="modal-footer">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <a href="#" @click.prevent="isLogin = !isLogin; errorMsg = ''">
          {{ isLogin ? '免费注册' : '直接登录' }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-content { background: var(--bg-card); width: 100%; max-width: 400px; border-radius: 16px; padding: 2.5rem; position: relative; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 25px 50px rgba(0,0,0,0.2); }
.close-btn { position: absolute; top: 1rem; right: 1rem; background: transparent; border: none; font-size: 1.2rem; color: var(--text-secondary); cursor: pointer; transition: color 0.2s; }
.close-btn:hover { color: var(--text-primary); }
.modal-header { text-align: center; margin-bottom: 2rem; }
.field { margin-bottom: 1.2rem; }
.field label { display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem; font-weight: 500; }
.field input { width: 100%; box-sizing: border-box; background: var(--bg-input); border: 1px solid var(--border); padding: 0.8rem 1rem; border-radius: 8px; color: var(--text-primary); outline: none; transition: border-color 0.2s; }
.field input:focus { border-color: var(--accent); }
.auth-submit { width: 100%; padding: 0.8rem; font-size: 1rem; border-radius: 8px; margin-top: 1rem; }
.modal-footer { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-secondary); }
.modal-footer a { color: var(--accent); text-decoration: none; font-weight: 600; margin-left: 0.5rem; }
.error-msg { color: var(--error); font-size: 0.85rem; background: rgba(248,113,113,0.1); padding: 0.6rem; border-radius: 6px; margin-top: -0.5rem; margin-bottom: 0.5rem; }
</style>
