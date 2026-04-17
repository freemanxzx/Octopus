<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-left" @click="router.push('/')">
        <span class="logo">🐙</span>
        <h1>OctoPoster</h1>
        <span class="tagline">AI 小红书图文生成器</span>
      </div>
      <nav class="header-nav">
        <router-link to="/">首页</router-link>
        <template v-if="authStore.isLoggedIn">
          <router-link to="/app">创作台</router-link>
          <router-link to="/history">📂 历史记录</router-link>
          <router-link to="/settings">⚙️ 设置</router-link>
          <div class="user-profile">
            <span class="credits">🪙 {{ authStore.credits }} 积分</span>
            <span class="email">{{ authStore.user?.email || 'User' }}</span>
            <button class="logout-btn" @click="handleLogout">退出</button>
          </div>
        </template>
        <template v-else>
          <router-link to="/">登录使用</router-link>
        </template>
      </nav>
    </header>
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}
.logo { font-size: 1.5rem; }
.app-header h1 {
  font-size: 1.15rem;
  font-weight: 700;
  background: linear-gradient(90deg, #ff6b6b, #ffa07a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}
.tagline {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  margin-left: 0.3rem;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}
.header-nav a {
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.header-nav a:hover,
.header-nav a.router-link-active {
  color: #ff6b6b;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 1px solid rgba(255,255,255,0.1);
}
.credits {
  background: rgba(255,189,46,0.15);
  color: #ffbd2e;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.email {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.logout-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-secondary);
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}
.logout-btn:hover {
  color: var(--text-primary);
  border-color: rgba(255,255,255,0.3);
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
</style>
