<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginModal from '../components/auth/LoginModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const showLogin = ref(false)
const typedText = ref('')
const currentText = '如何写出10万+爆款小红书笔记？'

onMounted(() => {
  let i = 0
  setTimeout(() => {
    const timer = setInterval(() => {
      typedText.value += currentText.charAt(i)
      i++
      if (i >= currentText.length) clearInterval(timer)
    }, 100)
  }, 500)
})

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
    <!-- Navbar -->
    <nav class="glass-nav">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-icon">🐙</span>
          <span class="logo-text">OctoPoster</span>
        </div>
        <div class="nav-links">
          <a href="#">产品功能</a>
          <a href="#">应用场景</a>
          <a href="#">价格方案</a>
        </div>
        <div class="nav-actions">
          <button class="btn-ghost" @click="handleStart">控制台</button>
          <button class="btn-primary start-btn" @click="handleStart">免费试用</button>
        </div>
      </div>
    </nav>

    <!-- Background glowing orbs -->
    <div class="glow-orb orb-1"></div>
    <div class="glow-orb orb-2"></div>
    <div class="glow-orb orb-3"></div>

    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-chip">✨ 全新升级：现已加入底层图片编辑画布！</div>
      <h1 class="hero-title">一句话，<br/><span class="text-gradient">搞定小红书爆款内容</span></h1>
      <p class="hero-subtitle">
        基于多模态大模型与智能编排引擎，聚合图文生成、文档解析、排版模板与底层专业修图于一身，从灵感到成片仅需数十秒。
      </p>

      <!-- Central Input Mockup -->
      <div class="hero-input-area" @click="handleStart">
        <div class="input-glass-box">
          <div class="input-icon">✨</div>
          <div class="typing-text">
            {{ typedText }}<span class="cursor">|</span>
          </div>
          <button class="input-submit-btn">立即生成</button>
        </div>
        <div class="input-tags">
          <span>✔️ URL直接导入</span>
          <span>✔️ 文章自动洗稿</span>
          <span>✔️ 16种高转化海报模板</span>
        </div>
      </div>
    </div>

    <!-- Features Showcase -->
    <div class="features-section">
      <div class="features-grid">
        <div class="glass-card feature-card">
          <div class="card-icon-wrap bg-blue">
            <span class="icon">📥</span>
          </div>
          <h3>多源输入引擎</h3>
          <p>突破单一的主题输入。现在可以直接粘贴一篇公众号长文链接，或者上传数十页的 TXT/MD 原稿。八爪将自动理解长文逻辑，为你提炼最精辟的小红书大纲结构。</p>
        </div>
        <div class="glass-card feature-card">
          <div class="card-icon-wrap bg-purple">
            <span class="icon">📐</span>
          </div>
          <h3>极速渲染模板库</h3>
          <p>告别死板的模型生成！基于底层强劲渲染引擎，我们内置了诸多直接对标行业头部高转化率的海报模板。从图层到文字尺寸完美自适应各大主流社交平台规则。</p>
        </div>
        <div class="glass-card feature-card">
          <div class="card-icon-wrap bg-pink">
            <span class="icon">🖌️</span>
          </div>
          <h3>专业生产力画布</h3>
          <p>我们深知最后的微调对一幅图文的至关重要。生成的海报可以直接在专业级的 Fabric 画布中拖放、调整文字、更换图层。同时无缝接入 AI 去背景等深加工能力。</p>
        </div>
      </div>
    </div>

    <!-- Footer Mockup -->
    <footer class="glass-footer">
      <p>© 2026 OctoPoster AI. Empowering creators to do more with less.</p>
    </footer>

    <LoginModal v-if="showLogin" @close="showLogin = false" />
  </div>
</template>

<style scoped>
.landing-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background-color: #0b0c10;
  color: #fff;
  overflow-x: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* Background Glowing Orbs */
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  z-index: 0;
  opacity: 0.6;
  animation: float 20s infinite ease-in-out;
}
.orb-1 { width: 500px; height: 500px; background: rgba(139, 92, 246, 0.4); top: -100px; left: -100px; animation-delay: 0s; }
.orb-2 { width: 600px; height: 600px; background: rgba(236, 72, 153, 0.3); top: 30%; right: -200px; animation-delay: -5s; }
.orb-3 { width: 450px; height: 450px; background: rgba(59, 130, 246, 0.4); bottom: -150px; left: 20%; animation-delay: -10s; }

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(50px, -50px) scale(1.1); }
  66% { transform: translate(-30px, 50px) scale(0.9); }
}

/* Glass Navigation */
.glass-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 70px;
  background: rgba(11, 12, 16, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  z-index: 100;
  display: flex;
  align-items: center;
}
.nav-content {
  width: 100%; max-width: 1200px; margin: 0 auto;
  padding: 0 2rem; display: flex; justify-content: space-between; align-items: center;
}
.logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.3rem; font-weight: 800; tracking: -0.5px; }
.logo-icon { font-size: 1.6rem; }
.logo-text { background: linear-gradient(90deg, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.nav-links { display: flex; gap: 2rem; }
.nav-links a { color: #a1a1aa; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: #fff; }
.nav-actions { display: flex; gap: 1rem; align-items: center; }
.btn-ghost { background: transparent; border: none; color: #fff; font-size: 0.95rem; font-weight: 500; cursor: pointer; padding: 0.5rem 1rem; border-radius: 8px; transition: background 0.2s; }
.btn-ghost:hover { background: rgba(255, 255, 255, 0.1); }
.btn-primary.start-btn { padding: 0.6rem 1.5rem; border-radius: 50px; background: linear-gradient(135deg, #ec4899, #8b5cf6); border: none; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s; }
.btn-primary.start-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(236, 72, 153, 0.3); }

/* Hero Section */
.hero {
  position: relative;
  z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 85vh; padding-top: 70px; text-align: center;
}
.hero-chip {
  padding: 0.5rem 1.2rem; background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd; border-radius: 50px; font-size: 0.85rem; font-weight: 600;
  margin-bottom: 2rem;
  animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.hero-title {
  font-size: 4.5rem; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px;
  margin-bottom: 1.5rem; color: #fff;
  animation: fadeIn 1s ease-out;
}
.text-gradient {
  background: linear-gradient(135deg, #60a5fa, #c084fc, #f472b6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hero-subtitle {
  max-width: 600px; font-size: 1.15rem; color: #9ca3af; line-height: 1.7;
  margin-bottom: 3.5rem;
  animation: fadeIn 1.2s ease-out;
}

/* Interactive Input Mockup */
.hero-input-area {
  width: 100%; max-width: 700px; margin: 0 auto; cursor: pointer;
  animation: slideUp 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.input-glass-box {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.5rem 0.5rem 0.5rem 1.5rem; border-radius: 60px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
  transition: all 0.3s ease;
}
.hero-input-area:hover .input-glass-box {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 30px 60px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.2);
}
.input-icon { font-size: 1.5rem; opacity: 0.8; margin-right: 1rem; }
.typing-text { flex: 1; text-align: left; font-size: 1.15rem; color: #e5e7eb; white-space: nowrap; overflow: hidden; }
.cursor { display: inline-block; width: 2px; color: #8b5cf6; animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
.input-submit-btn {
  background: #fff; color: #000; font-weight: 700; font-size: 1rem;
  padding: 0.9rem 2rem; border-radius: 50px; border: none; cursor: pointer;
  transition: background 0.2s;
}
.hero-input-area:hover .input-submit-btn { background: #e2e8f0; }

.input-tags {
  display: flex; justify-content: center; gap: 1.5rem; margin-top: 1.5rem;
}
.input-tags span {
  font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 0.4rem;
  font-weight: 500;
}

/* Features Grid */
.features-section {
  position: relative; z-index: 10;
  max-width: 1200px; margin: 0 auto; padding: 4rem 2rem 8rem;
}
.features-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;
}
.glass-card {
  background: rgba(30, 30, 40, 0.4);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px; padding: 2.5rem;
  transition: transform 0.3s, background 0.3s, border-color 0.3s;
}
.glass-card:hover {
  transform: translateY(-10px);
  background: rgba(40, 40, 50, 0.6);
  border-color: rgba(255, 255, 255, 0.15);
}
.card-icon-wrap {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; margin-bottom: 2rem;
}
.bg-blue { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
.bg-purple { background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); }
.bg-pink { background: rgba(236, 72, 153, 0.15); border: 1px solid rgba(236, 72, 153, 0.3); }

.feature-card h3 { font-size: 1.4rem; margin-bottom: 1rem; color: #f3f4f6; font-weight: 700; letter-spacing: -0.5px; }
.feature-card p { font-size: 0.95rem; color: #9ca3af; line-height: 1.6; }

/* Footer */
.glass-footer {
  text-align: center; padding: 2rem; position: relative; z-index: 10;
  border-top: 1px solid rgba(255, 255, 255, 0.05); color: #6b7280; font-size: 0.85rem;
}

/* Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 900px) {
  .hero-title { font-size: 3rem; }
  .features-grid { grid-template-columns: 1fr; }
  .nav-links { display: none; }
}
</style>
