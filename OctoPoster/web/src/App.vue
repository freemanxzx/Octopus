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
    <header class="app-header" v-if="$route.path !== '/' && $route.path !== '/app' && $route.path !== '/result'">
      <div class="header-inner">
        <div class="header-left" @click="router.push('/')">
          <span class="logo">🐙</span>
          <span class="logo-text">OctoPoster</span>
        </div>
        <nav class="header-nav">
          <router-link to="/">首页</router-link>
          <template v-if="authStore.isLoggedIn">
            <router-link to="/app">创作台</router-link>
            <router-link to="/history">历史</router-link>
            <router-link to="/settings">设置</router-link>
            <div class="user-pill">
              <span class="credits">🪙 {{ authStore.credits }}</span>
              <button class="btn-ghost logout-btn" @click="handleLogout">退出</button>
            </div>
          </template>
        </nav>
      </div>
    </header>
    <main class="app-main" :class="{ 'full-bleed': $route.path === '/' || $route.path === '/app' || $route.path === '/result' }">
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
  height: 64px;
  background: rgba(8, 8, 12, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}
.logo { font-size: 1.5rem; }
.logo-text {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.header-nav a {
  color: var(--text-tertiary);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.header-nav a:hover { color: var(--text-primary); background: var(--bg-hover); }
.header-nav a.router-link-active { color: var(--text-primary); background: rgba(139,92,246,0.1); }

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-left: 0.5rem;
  padding-left: 0.8rem;
  border-left: 1px solid var(--border);
}
.credits {
  background: rgba(251,191,36,0.1);
  color: #fbbf24;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}
.logout-btn {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 2rem;
}
.app-main.full-bleed {
  max-width: 100%;
  padding: 0;
}
</style>
