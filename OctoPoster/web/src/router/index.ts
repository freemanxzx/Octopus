import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/app', name: 'app', component: () => import('../views/AppView.vue') },
    { path: '/outline', name: 'outline', component: () => import('../views/OutlineView.vue') },
    { path: '/generate', name: 'generate', component: () => import('../views/GenerateView.vue') },
    { path: '/result', name: 'result', component: () => import('../views/ResultView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
    { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue') },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  // Protect all paths except landing page
  if (to.path !== '/' && !authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
