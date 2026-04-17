<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getHistoryList, getHistoryStats, searchHistory, deleteHistory, getHistory, getHistoryDownloadUrl, getImageUrl, scanAllTasks, type HistoryRecord } from '../api'

const router = useRouter()

const records = ref<HistoryRecord[]>([])
const loading = ref(false)
const stats = ref<any>(null)
const currentTab = ref('all')
const searchKeyword = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const isScanning = ref(false)

// Gallery modal state
const viewingRecord = ref<any>(null)

async function loadData() {
  loading.value = true
  try {
    const status = currentTab.value === 'all' ? undefined : currentTab.value
    const res = await getHistoryList(currentPage.value, 12, status)
    if (res.success) {
      records.value = res.records || []
      totalPages.value = res.total_pages || 1
    }
  } finally { loading.value = false }
}

async function loadStats() {
  try {
    const res = await getHistoryStats()
    if (res.success) stats.value = res
  } catch {}
}

function switchTab(tab: string) {
  currentTab.value = tab
  currentPage.value = 1
  loadData()
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) { loadData(); return }
  loading.value = true
  try {
    const res = await searchHistory(searchKeyword.value)
    if (res.success) { records.value = res.records || []; totalPages.value = 1 }
  } finally { loading.value = false }
}

async function confirmDelete(rec: any) {
  if (confirm(`确定删除「${rec.title}」吗？`)) {
    await deleteHistory(rec.id)
    loadData()
    loadStats()
  }
}

async function viewImages(id: string) {
  const res = await getHistory(id)
  if (res.success) viewingRecord.value = res.record
}

function downloadAll() {
  if (!viewingRecord.value) return
  window.open(getHistoryDownloadUrl(viewingRecord.value.id))
}

async function handleScanAll() {
  isScanning.value = true
  try {
    const result = await scanAllTasks()
    if (result.success) {
      alert(`扫描完成！同步 ${result.synced || 0} 个任务`)
      await loadData()
      await loadStats()
    }
  } finally { isScanning.value = false }
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', generating: '生成中', partial: '部分完成', completed: '已完成', error: '错误' }
  return map[status] || status
}

function getStatusClass(status: string) {
  const map: Record<string, string> = { draft: 'badge-draft', completed: 'badge-done', partial: 'badge-partial', generating: 'badge-gen', error: 'badge-err' }
  return map[status] || ''
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<template>
  <div class="history-view">
    <div class="history-header">
      <div>
        <h2>📂 我的创作</h2>
        <p v-if="stats" class="stats-line">
          共 {{ stats.total ?? 0 }} 条记录 ·
          {{ stats.by_status?.completed ?? 0 }} 已完成 ·
          {{ stats.by_status?.draft ?? 0 }} 草稿
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="handleScanAll" :disabled="isScanning">
          {{ isScanning ? '同步中...' : '🔄 同步历史' }}
        </button>
        <button class="btn-primary" @click="router.push('/')">➕ 新建图文</button>
      </div>
    </div>

    <!-- Tabs + Search -->
    <div class="toolbar">
      <div class="tabs">
        <button :class="{ active: currentTab === 'all' }" @click="switchTab('all')">全部</button>
        <button :class="{ active: currentTab === 'completed' }" @click="switchTab('completed')">已完成</button>
        <button :class="{ active: currentTab === 'draft' }" @click="switchTab('draft')">草稿箱</button>
      </div>
      <div class="search-box">
        <input v-model="searchKeyword" placeholder="搜索标题..." @keyup.enter="handleSearch" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="text-align:center; padding:3rem"><div class="spinner"></div></div>

    <!-- Empty -->
    <div v-else-if="records.length === 0" class="empty-state">
      <div style="font-size:3rem; opacity:0.4; margin-bottom:1rem">📦</div>
      <h3>暂无相关记录</h3>
      <p style="color:var(--text-secondary); margin-top:0.5rem">去创建一个新的作品吧</p>
    </div>

    <!-- Gallery Grid -->
    <div v-else class="gallery-grid">
      <div v-for="rec in records" :key="rec.id" class="gallery-card card animate-fade-in" @click="viewImages(rec.id)">
        <div class="card-thumb">
          <img v-if="rec.thumbnail && rec.task_id" :src="getImageUrl(rec.task_id!, rec.thumbnail)" alt="" />
          <div v-else class="thumb-placeholder">🎨</div>
        </div>
        <div class="card-info">
          <h4>{{ rec.title }}</h4>
          <div class="card-meta">
            <span class="badge" :class="getStatusClass(rec.status)">{{ getStatusLabel(rec.status) }}</span>
            <span class="date">{{ new Date(rec.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
        <button class="delete-btn" @click.stop="confirmDelete(rec)" title="删除">🗑️</button>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="btn-secondary" :disabled="currentPage <= 1" @click="currentPage--; loadData()">上一页</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button class="btn-secondary" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">下一页</button>
    </div>

    <!-- Image Gallery Modal -->
    <div v-if="viewingRecord" class="modal-overlay" @click.self="viewingRecord = null">
      <div class="modal-content card">
        <div class="modal-header">
          <h3>{{ viewingRecord.title }}</h3>
          <div class="modal-actions">
            <button class="btn-secondary" @click="downloadAll">📥 打包下载</button>
            <button class="btn-icon" @click="viewingRecord = null">✕</button>
          </div>
        </div>
        <div class="modal-grid">
          <div v-for="(filename, idx) in (viewingRecord.images?.generated || [])" :key="idx" class="modal-img-card">
            <img :src="getImageUrl(viewingRecord.images.task_id, filename as string) + '?thumbnail=false'" :alt="'Page ' + (Number(idx)+1)" />
            <span class="img-label">Page {{ Number(idx) + 1 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-view { max-width: 1100px; margin: 0 auto; }
.history-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.history-header h2 { margin-bottom: 0.2rem; }
.stats-line { font-size: 0.8rem; color: var(--text-secondary); }
.header-actions { display: flex; gap: 0.6rem; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem; flex-wrap: wrap; gap: 0.8rem; }
.tabs { display: flex; gap: 0; }
.tabs button { background: transparent; color: var(--text-secondary); border: none; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
.search-box input { background: var(--bg-input); border: 1px solid var(--border); border-radius: 20px; padding: 0.4rem 1rem; color: var(--text-primary); font-size: 0.8rem; width: 200px; outline: none; }
.search-box input:focus { border-color: var(--accent); }
.empty-state { text-align: center; padding: 4rem; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.gallery-card { padding: 0; overflow: hidden; cursor: pointer; transition: all 0.3s; position: relative; }
.gallery-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
.card-thumb { height: 160px; overflow: hidden; background: var(--bg-input); }
.card-thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 3rem; opacity: 0.3; }
.card-info { padding: 0.8rem 1rem; }
.card-info h4 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.badge { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; }
.badge-done { background: rgba(74,222,128,0.15); color: var(--success); }
.badge-draft { background: rgba(251,191,36,0.15); color: var(--warning); }
.badge-partial { background: rgba(96,165,250,0.15); color: #60a5fa; }
.badge-gen { background: rgba(255,107,107,0.15); color: var(--accent); }
.badge-err { background: rgba(248,113,113,0.15); color: var(--error); }
.date { font-size: 0.7rem; color: var(--text-secondary); }
.delete-btn { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.5); border: none; border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 0.8rem; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
.gallery-card:hover .delete-btn { opacity: 1; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.modal-content { max-width: 900px; width: 100%; max-height: 85vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.modal-actions { display: flex; gap: 0.6rem; align-items: center; }
.modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.8rem; }
.modal-img-card { position: relative; border-radius: 8px; overflow: hidden; }
.modal-img-card img { width: 100%; display: block; border-radius: 8px; }
.img-label { position: absolute; bottom: 6px; left: 6px; background: rgba(0,0,0,0.6); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; }
</style>
