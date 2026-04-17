<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginModal from '../components/auth/LoginModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const showLogin = ref(false)

function handleStart() {
  if (authStore.isLoggedIn) {
    router.push('/app')
  } else {
    showLogin.value = true
  }
}
</script>

<template>
  <div class="landing-page">
    <div class="hero">
      <div class="hero-content form-animate" style="animation-delay: 0.1s">
        <h1>让创作<span class="highlight">从未如此简单</span></h1>
        <p class="subtitle">输入主题，90秒全自动生成爆款小红书图文。从大纲、文案到智能配图，AI 帮你搞定一切。</p>
        <button class="btn-primary hero-btn" @click="handleStart">
          {{ authStore.isLoggedIn ? '进入创作工作台 🚀' : '免费开始使用 ✨' }}
        </button>
        <p class="hero-tip">首次注册送 200 积分，可免费生成多套完整图文</p>
      </div>
      <div class="hero-mockup form-animate" style="animation-delay: 0.2s">
        <div class="mockup-card">
          <div class="mockup-header">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
          </div>
          <img src="https://images.unsplash.com/photo-1616469829581-73993eb86b02?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Demo" />
        </div>
      </div>
    </div>

    <div class="features-section">
      <h2 style="text-align: center; margin-bottom: 3rem">三大核心优势</h2>
      <div class="features-grid">
        <div class="feature-card form-animate" style="animation-delay: 0.3s">
          <div class="icon">🚀</div>
          <h3>一键生成完整图文</h3>
          <p>只需输入一个主题，AI 自动生成从大纲、爆款标题到正文与标签的全部内容，灵感即刻落地。</p>
        </div>
        <div class="feature-card form-animate" style="animation-delay: 0.4s">
          <div class="icon">🎨</div>
          <h3>AI 智能连贯配图</h3>
          <p>结合多模态大模型与智能分镜技术，并发生成 6~9 张连贯、画风一致的高清配图。</p>
        </div>
        <div class="feature-card form-animate" style="animation-delay: 0.5s">
          <div class="icon">🔒</div>
          <h3>安全且多风格可选</h3>
          <p>基于云端严格合规审核，并提供职场、实拍、插画等多种主流社交媒体爆款风格一键切换。</p>
        </div>
      </div>
    </div>

    <LoginModal v-if="showLogin" @close="showLogin = false" />
  </div>
</template>

<style scoped>
.landing-page { width: 100%; min-height: calc(100vh - 70px); }
.hero { display: flex; align-items: center; justify-content: space-between; padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; gap: 4rem; min-height: 70vh; }
.hero-content { flex: 1; max-width: 500px; }
.hero-content h1 { font-size: 3.5rem; font-weight: 800; line-height: 1.2; margin-bottom: 1.5rem; color: var(--text-primary); }
.highlight { color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(90deg, #ff4757, #ff6b81); }
.subtitle { font-size: 1.1rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 2.5rem; }
.hero-btn { font-size: 1.2rem; padding: 1rem 2.5rem; border-radius: 50px; cursor: pointer; box-shadow: 0 10px 20px rgba(255, 71, 87, 0.3); transition: all 0.3s; }
.hero-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(255, 71, 87, 0.4); }
.hero-tip { font-size: 0.85rem; color: var(--text-secondary); margin-top: 1rem; opacity: 0.8; }

.hero-mockup { flex: 1; display: flex; justify-content: center; }
.mockup-card { width: 100%; max-width: 450px; background: var(--bg-card); border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid rgba(255,255,255,0.1); transform: perspective(1000px) rotateY(-10deg) rotateX(5deg); transition: transform 0.5s ease; }
.mockup-card:hover { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
.mockup-header { background: rgba(0,0,0,0.2); padding: 12px 16px; display: flex; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27c93f; }
.mockup-card img { width: 100%; display: block; }

.features-section { padding: 5rem 2rem; background: var(--bg-card); border-top: 1px solid rgba(255,255,255,0.05); }
.features-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
.feature-card { background: var(--bg-input); padding: 2.5rem; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.3s; }
.feature-card:hover { transform: translateY(-10px); }
.feature-card .icon { font-size: 3rem; margin-bottom: 1.5rem; }
.feature-card h3 { font-size: 1.3rem; margin-bottom: 1rem; color: var(--text-primary); }
.feature-card p { font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; }

@media (max-width: 900px) {
  .hero { flex-direction: column; text-align: center; padding: 2rem 1rem; }
  .hero-content { margin: 0 auto; }
  .features-grid { grid-template-columns: 1fr; }
  .mockup-card { transform: none; }
}
</style>
