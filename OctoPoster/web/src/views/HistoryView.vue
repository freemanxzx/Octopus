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
  const map: Record<string, string> = { draft: '草稿', generating: '渲染中', partial: '部分完成', completed: '已完成', error: '异常' }
  return map[status] || status
}

onMounted(() => { loadData(); loadStats() })
</script>

<template>
  <div class="history-view">
    <div class="history-header animate-fade-in">
      <div>
        <h2>创作归档</h2>
        <p v-if="stats" class="stats-line">
          {{ stats.total ?? 0 }} 条记录 · {{ stats.by_status?.completed ?? 0 }} 已完成 · {{ stats.by_status?.draft ?? 0 }} 草稿
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="handleScanAll" :disabled="isScanning">
          {{ isScanning ? '同步中...' : '🔄 同步' }}
        </button>
        <button class="btn-primary" @click="router.push('/app')">+ 新建</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar animate-fade-in" style="animation-delay: 0.05s">
      <div class="tab-group">
        <button class="tab-btn" :class="{ active: currentTab === 'all' }" @click="switchTab('all')">全部</button>
        <button class="tab-btn" :class="{ active: currentTab === 'completed' }" @click="switchTab('completed')">已完成</button>
        <button class="tab-btn" :class="{ active: currentTab === 'draft' }" @click="switchTab('draft')">草稿</button>
      </div>
      <div class="search-box">
        <input v-model="searchKeyword" placeholder="搜索标题..." @keyup.enter="handleSearch" />
      </div>
    </div>

    <div v-if="loading" style="text-align:center; padding:4rem"><div class="spinner"></div></div>

    <div v-else-if="records.length === 0" class="empty-state">
      <div class="empty-orb"></div>
      <h3>暂无记录</h3>
      <p>开始你的第一次创作吧</p>
    </div>

    <div v-else class="history-grid">
      <div
        v-for="(rec, idx) in records"
        :key="rec.id"
        class="history-card animate-fade-in"
        :style="{ animationDelay: `${idx * 0.04}s` }"
        @click="viewImages(rec.id)"
      >
        <div class="card-thumb">
          <img v-if="rec.thumbnail && rec.task_id" :src="getImageUrl(rec.task_id!, rec.thumbnail)" alt="" />
          <div v-else class="thumb-placeholder">🎨</div>
        </div>
        <div class="card-info">
          <h4>{{ rec.title }}</h4>
          <div class="card-meta">
            <span class="status-badge" :class="rec.status">{{ getStatusLabel(rec.status) }}</span>
            <span class="date">{{ new Date(rec.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
        <button class="delete-btn" @click.stop="confirmDelete(rec)" title="删除">🗑️</button>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="btn-secondary" :disabled="currentPage <= 1" @click="currentPage--; loadData()">← 上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="btn-secondary" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">下一页 →</button>
    </div>

    <!-- Modal -->
    <div v-if="viewingRecord" class="modal-overlay" @click.self="viewingRecord = null">
      <div class="modal-panel">
        <div class="modal-header">
          <h3>{{ viewingRecord.title }}</h3>
          <div class="modal-actions">
            <button class="btn-secondary" @click="downloadAll">📥 打包</button>
            <button class="btn-ghost" @click="viewingRecord = null">✕</button>
          </div>
        </div>
        <div class="modal-grid">
          <div v-for="(filename, idx) in (viewingRecord.images?.generated || [])" :key="idx" class="modal-img">
            <img :src="getImageUrl(viewingRecord.images.task_id, filename as string) + '?thumbnail=false'" :alt="'P' + (Number(idx)+1)" />
            <span class="img-label">P{{ Number(idx) + 1 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-view { max-width: 1200px; margin: 0 auto; }
.history-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.history-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
.stats-line { font-size: 0.8rem; color: var(--text-secondary); }
.header-actions { display: flex; gap: 0.6rem; }

/* Toolbar */
.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
}
.tab-group {
  display: flex; background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 0.2rem; gap: 0;
}
.tab-btn {
  background: transparent; color: var(--text-tertiary); border: none;
  padding: 0.4rem 1rem; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; border-radius: 6px; transition: all 0.2s;
}
.tab-btn.active { background: rgba(139,92,246,0.15); color: var(--accent-start); }
.search-box input {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-full); padding: 0.5rem 1rem;
  color: var(--text-primary); font-size: 0.8rem; width: 220px;
}
.search-box input:focus { border-color: var(--accent-start); }

/* Empty */
.empty-state { text-align: center; padding: 5rem; color: var(--text-tertiary); }
.empty-orb { width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%); margin: 0 auto 1.5rem; animation: float 5s infinite ease-in-out; }
.empty-state h3 { margin-bottom: 0.3rem; }

/* Grid */
.history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.2rem; }
.history-card {
  background: var(--bg-card); backdrop-filter: blur(12px); position: relative;
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  overflow: hidden; cursor: pointer; transition: all 0.3s var(--ease-out);
}
.history-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--border-hover); }

.card-thumb { height: 160px; overflow: hidden; background: var(--bg-elevated); }
.card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.history-card:hover .card-thumb img { transform: scale(1.05); }
.thumb-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 3rem; opacity: 0.2; }

.card-info { padding: 1rem; }
.card-info h4 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }

.status-badge {
  font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); font-weight: 600;
  background: var(--bg-input);  color: var(--text-tertiary);
}
.status-badge.completed { background: rgba(52,211,153,0.12); color: var(--success); }
.status-badge.draft { background: rgba(251,191,36,0.12); color: var(--warning); }
.status-badge.partial { background: rgba(96,165,250,0.12); color: var(--info); }
.status-badge.generating { background: rgba(139,92,246,0.12); color: var(--accent-start); }
.status-badge.error { background: rgba(248,113,113,0.12); color: var(--error); }
.date { font-size: 0.7rem; color: var(--text-tertiary); }

.delete-btn {
  position: absolute; top: 10px; right: 10px;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  border: none; border-radius: var(--radius-sm); padding: 0.3rem 0.5rem;
  font-size: 0.8rem; cursor: pointer; opacity: 0; transition: opacity 0.2s;
}
.history-card:hover .delete-btn { opacity: 1; }

.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 1rem; margin-top: 2.5rem;
}
.page-info { font-size: 0.85rem; color: var(--text-secondary); }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 2rem;
}
.modal-panel {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius-xl); max-width: 950px; width: 100%;
  max-height: 85vh; overflow-y: auto; padding: 2rem;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h3 { font-size: 1.2rem; }
.modal-actions { display: flex; gap: 0.6rem; align-items: center; }
.modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.modal-img { position: relative; border-radius: var(--radius-md); overflow: hidden; }
.modal-img img { width: 100%; display: block; border-radius: var(--radius-md); }
.img-label {
  position: absolute; bottom: 8px; left: 8px;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.7rem; font-weight: 600;
}
</style>
