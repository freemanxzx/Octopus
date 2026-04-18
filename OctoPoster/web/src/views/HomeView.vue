<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginModal from '../components/auth/LoginModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const showLogin = ref(false)

// Typing animation
const typedText = ref('')
const prompts = [
  '如何写出10万+爆款小红书笔记？',
  '帮我做一张杭州旅行攻略封面',
  '将这篇公众号文章转化为小红书图文',
  '生成一组护肤品种草海报',
]
let promptIdx = 0
let charIdx = 0
let isDeleting = false
let typeTimer: ReturnType<typeof setTimeout> | null = null

function typeLoop() {
  const current = prompts[promptIdx]
  if (!isDeleting) {
    typedText.value = current.substring(0, charIdx + 1)
    charIdx++
    if (charIdx >= current.length) {
      typeTimer = setTimeout(() => { isDeleting = true; typeLoop() }, 2000)
      return
    }
    typeTimer = setTimeout(typeLoop, 80)
  } else {
    typedText.value = current.substring(0, charIdx - 1)
    charIdx--
    if (charIdx <= 0) {
      isDeleting = false
      promptIdx = (promptIdx + 1) % prompts.length
      typeTimer = setTimeout(typeLoop, 400)
      return
    }
    typeTimer = setTimeout(typeLoop, 40)
  }
}

// Scroll-driven reveal
const sectionsVisible = ref<Record<string, boolean>>({})
let observer: IntersectionObserver | null = null

onMounted(() => {
  typeLoop()
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          sectionsVisible.value[e.target.id] = true
        }
      })
    },
    { threshold: 0.15 }
  )
  document.querySelectorAll('.reveal-section').forEach(el => observer!.observe(el))
})

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer)
  observer?.disconnect()
})

function handleStart() {
  if (authStore.isLoggedIn) {
    router.push('/app')
  } else {
    showLogin.value = true
  }
}

// Showcase data
const showcaseItems = [
  { title: '旅行攻略', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', emoji: '✈️' },
  { title: '美食种草', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', emoji: '🍰' },
  { title: '护肤测评', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)', emoji: '✨' },
  { title: '穿搭分享', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)', emoji: '👗' },
  { title: '读书笔记', gradient: 'linear-gradient(135deg, #fa709a, #fee140)', emoji: '📖' },
  { title: '健身打卡', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', emoji: '💪' },
  { title: '数码开箱', gradient: 'linear-gradient(135deg, #fccb90, #d57eeb)', emoji: '📱' },
  { title: '家居好物', gradient: 'linear-gradient(135deg, #96fbc4, #f9f586)', emoji: '🏡' },
]

const features = [
  { icon: '🧠', title: 'AI 深度理解', desc: '不只是拼凑文字。基于多模态大模型，从主题到爆款文案一气呵成——自动提炼金句、编排图层结构、匹配情绪色调。', color: '#8b5cf6' },
  { icon: '📥', title: '万物皆可导入', desc: '支持主题词、公众号 URL、TXT/Markdown 文档直接灌入。AI 自动拆解长文逻辑，萃取最适合视觉呈现的核心观点。', color: '#3b82f6' },
  { icon: '🖌️', title: '专业级画布编辑', desc: '基于 Fabric.js 的像素级拖放编辑器，内置 AI 去背景、智能重排等魔法工具。所见即所得，精修只需数秒。', color: '#ec4899' },
  { icon: '📐', title: '一键跨平台适配', desc: '小红书 3:4、公众号 16:9、朋友圈 1:1——一份方案、多端自适应输出。告别重复排版的无效内耗。', color: '#10b981' },
]

const steps = [
  { num: '01', title: '输入灵感', desc: '主题词、URL 或文档', icon: '💡' },
  { num: '02', title: 'AI 编排', desc: '自动生成大纲与文案', icon: '🧠' },
  { num: '03', title: '极速渲染', desc: '并发生成全部海报图', icon: '⚡' },
  { num: '04', title: '精修发布', desc: '画布微调、导出成片', icon: '🚀' },
]
</script>

<template>
  <div class="landing-page">
    <!-- Animated Mesh Background -->
    <div class="mesh-bg">
      <div class="mesh-orb orb-a"></div>
      <div class="mesh-orb orb-b"></div>
      <div class="mesh-orb orb-c"></div>
      <div class="mesh-orb orb-d"></div>
    </div>

    <!-- Grid Lines Overlay-->
    <div class="grid-overlay"></div>

    <!-- ─── Navigation ─── -->
    <nav class="top-nav">
      <div class="nav-inner">
        <div class="nav-brand" @click="router.push('/')">
          <span class="brand-logo">🐙</span>
          <span class="brand-text">OctoPoster</span>
          <span class="brand-badge">AI</span>
        </div>
        <div class="nav-links">
          <a href="#features">核心能力</a>
          <a href="#workflow">工作流程</a>
          <a href="#showcase">创作展示</a>
        </div>
        <div class="nav-actions">
          <button class="nav-btn-ghost" @click="handleStart">控制台</button>
          <button class="nav-btn-cta" @click="handleStart">
            <span class="cta-spark">✦</span> 开始创作
          </button>
        </div>
      </div>
    </nav>

    <!-- ─── Section 1: Hero ─── -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-announce">
          <span class="announce-dot"></span>
          全新升级 · 内置 AI 智能画布编辑器
        </div>
        <h1 class="hero-headline">
          AI 驱动的<br/>
          <span class="headline-gradient">内容创作工作室</span>
        </h1>
        <p class="hero-desc">
          从灵感到成片，仅需数十秒。聚合多模态大模型、智能排版引擎与专业级画布，
          一站式搞定小红书、公众号、朋友圈全平台爆款图文。
        </p>

        <!-- Interactive Input -->
        <div class="hero-input-wrap" @click="handleStart">
          <div class="input-glow"></div>
          <div class="input-box">
            <span class="input-sparkle">✨</span>
            <div class="input-text">
              {{ typedText }}<span class="type-cursor"></span>
            </div>
            <button class="input-go">
              立即生成 <span class="go-arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Trust Badges -->
        <div class="trust-row">
          <div class="trust-item">
            <span class="trust-check">✓</span> 10秒极速出图
          </div>
          <div class="trust-item">
            <span class="trust-check">✓</span> 支持 URL/文档导入
          </div>
          <div class="trust-item">
            <span class="trust-check">✓</span> 专业画布深度编辑
          </div>
          <div class="trust-item">
            <span class="trust-check">✓</span> 多平台一键适配
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Section 2: Showcase Strip ─── -->
    <section id="showcase" class="showcase-section reveal-section" :class="{ visible: sectionsVisible['showcase'] }">
      <div class="section-header">
        <span class="section-tag">创作展示</span>
        <h2>无限场景，一键驾驭</h2>
        <p>无论是旅行攻略、美食种草还是产品测评，AI 引擎都能精准匹配视觉风格</p>
      </div>
      <div class="showcase-track">
        <div class="showcase-slider">
          <div
            v-for="(item, i) in [...showcaseItems, ...showcaseItems]"
            :key="i"
            class="showcase-card"
            :style="{ '--card-gradient': item.gradient }"
          >
            <div class="showcase-card-inner">
              <span class="showcase-emoji">{{ item.emoji }}</span>
              <span class="showcase-title">{{ item.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Section 3: Features ─── -->
    <section id="features" class="features-section reveal-section" :class="{ visible: sectionsVisible['features'] }">
      <div class="section-header">
        <span class="section-tag">核心能力</span>
        <h2>远不止"AI 生图"</h2>
        <p>从内容理解到专业排版，每一步都经过精心打磨</p>
      </div>
      <div class="features-grid">
        <div
          v-for="(f, i) in features"
          :key="i"
          class="feature-card"
          :style="{ animationDelay: `${i * 0.12}s`, '--accent': f.color }"
        >
          <div class="feature-icon">{{ f.icon }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
          <div class="feature-glow"></div>
        </div>
      </div>
    </section>

    <!-- ─── Section 4: Workflow ─── -->
    <section id="workflow" class="workflow-section reveal-section" :class="{ visible: sectionsVisible['workflow'] }">
      <div class="section-header">
        <span class="section-tag">工作流程</span>
        <h2>4 步，从零到爆款</h2>
        <p>极简操作路径，让创作专注于创意本身</p>
      </div>
      <div class="workflow-timeline">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="wf-step"
          :style="{ animationDelay: `${i * 0.15}s` }"
        >
          <div class="wf-num">{{ s.num }}</div>
          <div class="wf-icon">{{ s.icon }}</div>
          <h4>{{ s.title }}</h4>
          <p>{{ s.desc }}</p>
          <div class="wf-connector" v-if="i < steps.length - 1"></div>
        </div>
      </div>
    </section>

    <!-- ─── Section 5: Stats / Social Proof ─── -->
    <section class="stats-section reveal-section" :class="{ visible: sectionsVisible['stats'] }" id="stats">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">10<span class="stat-unit">秒</span></div>
          <div class="stat-label">平均出图速度</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-number">7<span class="stat-unit">+</span></div>
          <div class="stat-label">AI 智能工具</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-number">∞</div>
          <div class="stat-label">创意可能性</div>
        </div>
      </div>
    </section>

    <!-- ─── Section 6: Final CTA ─── -->
    <section class="cta-section reveal-section" :class="{ visible: sectionsVisible['cta'] }" id="cta">
      <div class="cta-content">
        <div class="cta-glow-ring"></div>
        <h2>准备好让 AI 成为你的创作搭档了吗？</h2>
        <p>免费开始，无需信用卡。体验从灵感到成品的极致效率。</p>
        <button class="cta-mega-btn" @click="handleStart">
          <span class="mega-spark">🐙</span>
          立即免费体验
          <span class="mega-arrow">→</span>
        </button>
      </div>
    </section>

    <!-- ─── Footer ─── -->
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span>🐙</span> OctoPoster
        </div>
        <div class="footer-links">
          <a href="#">产品功能</a>
          <a href="#">使用文档</a>
          <a href="#">关于我们</a>
        </div>
        <div class="footer-copy">
          © 2026 OctoPoster AI · 让每一次创作都与众不同
        </div>
      </div>
    </footer>

    <LoginModal v-if="showLogin" @close="showLogin = false" />
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════
   OctoPoster Landing Page v3
   Premium Dark Mode · Glassmorphism
   ══════════════════════════════════════ */
.landing-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  overflow-x: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ─── Animated Mesh Background ─── */
.mesh-bg {
  position: fixed; inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.mesh-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.35;
  animation: orbit 25s infinite ease-in-out;
}
.orb-a { width: 600px; height: 600px; background: rgba(139,92,246,0.25); top: -15%; left: -10%; animation-delay: 0s; }
.orb-b { width: 500px; height: 500px; background: rgba(236,72,153,0.15); top: 20%; right: -15%; animation-delay: -6s; }
.orb-c { width: 700px; height: 700px; background: rgba(59,130,246,0.15); bottom: -20%; left: 30%; animation-delay: -12s; }
.orb-d { width: 400px; height: 400px; background: rgba(16,185,129,0.10); top: 60%; left: -5%; animation-delay: -18s; }

@keyframes orbit {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(60px, -40px) scale(1.15); }
  50% { transform: translate(-40px, 60px) scale(0.9); }
  75% { transform: translate(30px, 30px) scale(1.05); }
}

/* Subtle Grid Overlay */
.grid-overlay {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ─── Navigation ─── */
.top-nav {
  position: fixed; top: 0; left: 0; right: 0;
  height: 72px; z-index: 1000;
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.nav-inner {
  max-width: 1280px; margin: 0 auto; height: 100%;
  padding: 0 2rem;
  display: flex; align-items: center; justify-content: space-between;
}
.nav-brand {
  display: flex; align-items: center; gap: 0.6rem; cursor: pointer;
}
.brand-logo { font-size: 1.8rem; }
.brand-text {
  font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px;
  background: linear-gradient(135deg, #0F172A, #334155);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.brand-badge {
  font-size: 0.6rem; font-weight: 700;
  padding: 0.15rem 0.5rem;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-radius: 20px; color: #fff;
  letter-spacing: 1px;
}
.nav-links {
  display: flex; gap: 2.5rem;
}
.nav-links a {
  color: #475569; text-decoration: none; font-size: 0.9rem; font-weight: 500;
  transition: color 0.3s;
}
.nav-links a:hover { color: #0F172A; }
.nav-actions { display: flex; gap: 1rem; align-items: center; }
.nav-btn-ghost {
  background: transparent; border: 1px solid rgba(0,0,0,0.08);
  color: #475569; font-size: 0.88rem; font-weight: 500;
  padding: 0.55rem 1.2rem; border-radius: 50px; cursor: pointer;
  transition: all 0.3s;
}
.nav-btn-ghost:hover { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.12); color: #0F172A; }
.nav-btn-cta {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 1.6rem; border-radius: 50px; border: none;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff; font-size: 0.88rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 15px rgba(139,92,246,0.25);
  transition: all 0.3s ease;
}
.nav-btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(236,72,153,0.3);
}
.cta-spark { font-size: 0.7rem; }

/* ─── Hero Section ─── */
.hero-section {
  position: relative; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 120px 2rem 80px;
  text-align: center;
}
.hero-content {
  max-width: 800px; margin: 0 auto;
}
.hero-announce {
  display: inline-flex; align-items: center; gap: 0.6rem;
  padding: 0.5rem 1.4rem;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 50px; font-size: 0.85rem; font-weight: 600;
  color: #4f46e5;
  margin-bottom: 2.5rem;
  animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.announce-dot {
  width: 8px; height: 8px; background: #6366f1;
  border-radius: 50%;
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
}

.hero-headline {
  font-size: 4.5rem; font-weight: 900; line-height: 1.12;
  letter-spacing: -2px; color: #0F172A;
  margin-bottom: 1.8rem;
  animation: fadeUp 1s ease-out;
}
.headline-gradient {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: gradientShift 6s ease infinite;
}
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero-desc {
  max-width: 600px; margin: 0 auto 3.5rem;
  font-size: 1.15rem; line-height: 1.8; color: #475569;
  animation: fadeUp 1.2s ease-out;
}

/* ─── Hero Input ─── */
.hero-input-wrap {
  position: relative;
  max-width: 680px; margin: 0 auto; cursor: pointer;
  animation: fadeUp 1.5s ease-out;
}
.input-glow {
  position: absolute; inset: -3px;
  background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2), rgba(59,130,246,0.2));
  border-radius: 60px; filter: blur(20px); opacity: 0.5;
  transition: opacity 0.4s;
}
.hero-input-wrap:hover .input-glow { opacity: 0.8; }
.input-box {
  position: relative;
  display: flex; align-items: center;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0,0,0,0.06);
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  border-radius: 60px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.06);
  transition: all 0.3s;
}
.hero-input-wrap:hover .input-box {
  border-color: rgba(0,0,0,0.1);
  background: rgba(255,255,255,1);
  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
}
.input-sparkle { font-size: 1.4rem; margin-right: 1rem; }
.input-text {
  flex: 1; text-align: left;
  font-size: 1.1rem; color: #1e293b;
  white-space: nowrap; overflow: hidden;
  min-height: 24px;
}
.type-cursor {
  display: inline-block; width: 2px; height: 1.2em;
  background: #6366f1; margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink-cursor 1s step-end infinite;
}
@keyframes blink-cursor { 50% { opacity: 0; } }

.input-go {
  display: flex; align-items: center; gap: 0.5rem;
  background: #0f172a; color: #fff;
  font-weight: 800; font-size: 1rem;
  padding: 0.9rem 2rem; border-radius: 50px; border: none;
  cursor: pointer; white-space: nowrap;
  transition: all 0.3s;
}
.hero-input-wrap:hover .input-go {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: #fff;
  box-shadow: 0 8px 25px rgba(99,102,241,0.3);
}
.go-arrow { transition: transform 0.3s; }
.hero-input-wrap:hover .go-arrow { transform: translateX(4px); }

/* Trust Badges */
.trust-row {
  display: flex; justify-content: center; flex-wrap: wrap; gap: 1.5rem;
  margin-top: 2rem;
  animation: fadeUp 1.8s ease-out;
}
.trust-item {
  font-size: 0.85rem; color: #64748B; font-weight: 500;
  display: flex; align-items: center; gap: 0.4rem;
}
.trust-check { color: #10B981; font-weight: 700; }

/* ─── Section Common ─── */
.section-header {
  text-align: center; margin-bottom: 4rem;
}
.section-tag {
  display: inline-block;
  padding: 0.35rem 1rem; border-radius: 50px;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  color: #6366f1; font-size: 0.8rem; font-weight: 700;
  margin-bottom: 1.2rem;
  letter-spacing: 1px;
}
.section-header h2 {
  font-size: 2.8rem; font-weight: 800; letter-spacing: -1px;
  color: #0F172A; margin-bottom: 1rem;
}
.section-header p {
  font-size: 1.05rem; color: #64748B; max-width: 500px; margin: 0 auto;
}

.reveal-section {
  opacity: 0; transform: translateY(40px);
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
}
.reveal-section.visible {
  opacity: 1; transform: translateY(0);
}

/* ─── Section 2: Showcase ─── */
.showcase-section {
  position: relative; z-index: 10;
  padding: 6rem 0;
  overflow: hidden;
}
.showcase-track {
  width: 100%;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
}
.showcase-slider {
  display: flex; gap: 1.5rem;
  animation: scroll-left 30s linear infinite;
  width: max-content;
}
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.showcase-card {
  flex-shrink: 0;
  width: 200px; height: 280px;
  border-radius: 20px;
  background: var(--card-gradient);
  display: flex; align-items: flex-end; justify-content: center;
  padding-bottom: 1.5rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  transition: transform 0.4s ease;
  position: relative; overflow: hidden;
}
.showcase-card:hover { transform: scale(1.05) translateY(-6px); }
.showcase-card-inner {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
}
.showcase-emoji { font-size: 2.5rem; }
.showcase-title {
  font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.95);
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

/* ─── Section 3: Features ─── */
.features-section {
  position: relative; z-index: 10;
  max-width: 1200px; margin: 0 auto;
  padding: 6rem 2rem;
}
.features-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;
}
.feature-card {
  position: relative; overflow: hidden;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 24px; padding: 2.5rem;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.feature-card:hover {
  transform: translateY(-8px);
  border-color: rgba(0,0,0,0.1);
  background: rgba(255,255,255,0.9);
  box-shadow: 0 20px 40px rgba(0,0,0,0.06);
}
.feature-icon {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; margin-bottom: 1.5rem;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
.feature-card h3 {
  font-size: 1.35rem; font-weight: 700; color: #0F172A;
  margin-bottom: 0.8rem; letter-spacing: -0.3px;
}
.feature-card p {
  font-size: 0.95rem; color: #475569; line-height: 1.7;
}
.feature-glow {
  position: absolute; bottom: -50px; right: -50px;
  width: 200px; height: 200px; border-radius: 50%;
  background: var(--accent);
  filter: blur(80px); opacity: 0;
  transition: opacity 0.5s;
}
.feature-card:hover .feature-glow { opacity: 0.12; }

/* ─── Section 4: Workflow ─── */
.workflow-section {
  position: relative; z-index: 10;
  max-width: 1100px; margin: 0 auto;
  padding: 6rem 2rem;
}
.workflow-timeline {
  display: flex; justify-content: center; gap: 0;
}
.wf-step {
  position: relative;
  flex: 1; max-width: 240px;
  text-align: center; padding: 2rem 1.5rem;
}
.wf-num {
  font-size: 0.75rem; font-weight: 800;
  color: #6366f1; letter-spacing: 2px;
  margin-bottom: 0.8rem;
}
.wf-icon {
  width: 64px; height: 64px; margin: 0 auto 1.2rem;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
  transition: all 0.3s;
}
.wf-step:hover .wf-icon {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.25);
  transform: scale(1.08);
}
.wf-step h4 {
  font-size: 1.15rem; font-weight: 700; color: #0F172A;
  margin-bottom: 0.5rem;
}
.wf-step p {
  font-size: 0.85rem; color: #64748B;
}
.wf-connector {
  position: absolute; top: 50%; right: -10px;
  width: 20px; height: 2px;
  background: linear-gradient(90deg, rgba(99,102,241,0.3), rgba(99,102,241,0.05));
}

/* ─── Section 5: Stats ─── */
.stats-section {
  position: relative; z-index: 10;
  padding: 5rem 2rem;
}
.stats-grid {
  display: flex; align-items: center; justify-content: center;
  gap: 4rem; max-width: 900px; margin: 0 auto;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 28px; padding: 3.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.04);
}
.stat-item { text-align: center; }
.stat-number {
  font-size: 3.5rem; font-weight: 900; letter-spacing: -2px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.stat-unit { font-size: 1.8rem; }
.stat-label { font-size: 0.9rem; color: #64748B; margin-top: 0.5rem; font-weight: 600; }
.stat-divider { width: 1px; height: 60px; background: rgba(0,0,0,0.08); }

/* ─── Section 6: CTA ─── */
.cta-section {
  position: relative; z-index: 10;
  padding: 8rem 2rem;
  text-align: center;
}
.cta-content {
  position: relative; max-width: 700px; margin: 0 auto;
}
.cta-glow-ring {
  position: absolute; top: 50%; left: 50%;
  width: 400px; height: 400px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
  pointer-events: none;
}
.cta-section h2 {
  font-size: 2.8rem; font-weight: 800; letter-spacing: -1px;
  color: #0F172A; margin-bottom: 1.2rem;
  position: relative;
}
.cta-section p {
  font-size: 1.1rem; color: #475569; margin-bottom: 3rem;
  position: relative;
}
.cta-mega-btn {
  display: inline-flex; align-items: center; gap: 0.8rem;
  padding: 1rem 3rem; border-radius: 60px; border: none;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: #fff; font-size: 1.15rem; font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(99,102,241,0.25);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
.cta-mega-btn:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 15px 40px rgba(236,72,153,0.35);
}
.mega-spark { font-size: 1.3rem; }
.mega-arrow { transition: transform 0.3s; }
.cta-mega-btn:hover .mega-arrow { transform: translateX(6px); }

/* ─── Footer ─── */
.site-footer {
  position: relative; z-index: 10;
  border-top: 1px solid rgba(0,0,0,0.06);
  padding: 3rem 2rem;
  background: #FFFFFF;
}
.footer-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 1rem;
}
.footer-brand {
  font-size: 1.1rem; font-weight: 700; color: #475569;
  display: flex; align-items: center; gap: 0.5rem;
}
.footer-links { display: flex; gap: 2rem; }
.footer-links a {
  color: #64748B; text-decoration: none; font-size: 0.85rem;
  transition: color 0.2s;
}
.footer-links a:hover { color: #0F172A; }
.footer-copy { font-size: 0.8rem; color: #94A3B8; }

/* ─── Animations ─── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Responsive ─── */
@media (max-width: 900px) {
  .hero-headline { font-size: 3rem; }
  .features-grid { grid-template-columns: 1fr; }
  .workflow-timeline { flex-direction: column; align-items: center; }
  .wf-connector { display: none; }
  .stats-grid {
    flex-direction: column; gap: 2rem;
  }
  .stat-divider { width: 80px; height: 1px; }
  .nav-links { display: none; }
  .section-header h2 { font-size: 2rem; }
  .cta-section h2 { font-size: 2rem; }
}

@media (max-width: 600px) {
  .hero-headline { font-size: 2.4rem; letter-spacing: -1px; }
  .hero-desc { font-size: 1rem; }
  .input-go { padding: 0.7rem 1.2rem; font-size: 0.85rem; }
  .trust-row { flex-direction: column; gap: 0.6rem; align-items: center; }
  .showcase-card { width: 160px; height: 220px; }
}
</style>
