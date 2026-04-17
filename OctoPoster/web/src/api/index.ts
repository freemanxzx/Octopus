const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:12399'

export function getHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { ...extraHeaders }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export interface Page {
  index: number
  type: 'cover' | 'content' | 'summary'
  content: string
}

export interface OutlineResult {
  success: boolean
  outline?: string
  pages?: Page[]
  error?: string
}

export interface ContentResult {
  success: boolean
  titles?: string[]
  copywriting?: string
  tags?: string[]
  error?: string
}

export interface SSEventData {
  index?: number
  status?: string
  message?: string
  image_url?: string
  current?: number
  total?: number
  phase?: string
  task_id?: string
  retryable?: boolean
}

// Generate outline from a topic
export async function generateOutline(topic: string, images?: File[]): Promise<OutlineResult> {
  let base64Images: string[] = []
  if (images && images.length > 0) {
    base64Images = await Promise.all(images.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = error => reject(error)
      })
    }))
  }

  const res = await fetch(`${API_BASE}/api/outline`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ topic, images: base64Images }),
  })
  return res.json()
}

// Generate content (titles, copywriting, tags)
export async function generateContent(topic: string, outline: string): Promise<ContentResult> {
  const res = await fetch(`${API_BASE}/api/content`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ topic, outline }),
  })
  return res.json()
}

// Start SSE image generation stream
export function generateImages(
  pages: Page[],
  taskId: string,
  fullOutline: string,
  userTopic: string,
  style: string,
  onEvent: (event: string, data: SSEventData) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  // We use fetch + ReadableStream for SSE since EventSource only supports GET
  fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      pages,
      task_id: taskId,
      full_outline: fullOutline,
      user_topic: userTopic,
      style: style,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      function processChunk() {
        reader.read().then(({ done, value }) => {
          if (done) {
            onDone()
            return
          }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                onEvent(currentEvent, data)
              } catch { /* ignore parse errors */ }
            }
          }
          processChunk()
        })
      }
      processChunk()
    })
    .catch((err) => onError(err.message))
}

// Retry a single image
export async function retryImage(
  taskId: string,
  page: Page,
  fullOutline: string,
  userTopic: string,
  style: string,
): Promise<{ success: boolean; image_url?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/retry`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ task_id: taskId, page, full_outline: fullOutline, user_topic: userTopic, style }),
  })
  return res.json()
}

// Get image URL
export function getImageUrl(taskId: string, filename: string): string {
  return `${API_BASE}/api/images/${taskId}/${filename}`
}

// ==================== History API ====================

export interface HistoryRecord {
  id: string
  title: string
  created_at: string
  updated_at: string
  status: string
  thumbnail: string | null
  page_count?: number
  task_id?: string
  outline?: any
  images?: { task_id: string; generated: string[] }
}

export async function createHistory(topic: string, outline: any, taskId?: string) {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ topic, outline, task_id: taskId }),
  })
  return res.json()
}

export async function getHistoryList(page = 1, pageSize = 20, status?: string) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status && status !== 'all') params.set('status', status)
  const res = await fetch(`${API_BASE}/api/history?${params}`, { headers: getHeaders() })
  return res.json()
}

export async function getHistory(id: string) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, { headers: getHeaders() })
  return res.json()
}

export async function updateHistory(id: string, data: any) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteHistory(id: string) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, { method: 'DELETE', headers: getHeaders() })
  return res.json()
}

export async function searchHistory(keyword: string) {
  const res = await fetch(`${API_BASE}/api/history/search?keyword=${encodeURIComponent(keyword)}`, { headers: getHeaders() })
  return res.json()
}

export async function getHistoryStats() {
  const res = await fetch(`${API_BASE}/api/history/stats`, { headers: getHeaders() })
  return res.json()
}

export async function scanAllTasks() {
  const res = await fetch(`${API_BASE}/api/history/scan-all`, { method: 'POST', headers: getHeaders() })
  return res.json()
}

export function getHistoryDownloadUrl(id: string): string {
  return `${API_BASE}/api/history/${id}/download`
}

// ==================== Config API ====================

export async function getConfig() {
  const res = await fetch(`${API_BASE}/api/config`, { headers: getHeaders() })
  return res.json()
}

export async function saveConfig(data: any) {
  const res = await fetch(`${API_BASE}/api/config`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function testConnection(data: { type: string; api_key: string; base_url?: string; model?: string }) {
  const res = await fetch(`${API_BASE}/api/config/test`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  return res.json()
}

// ==================== Regenerate API ====================

export async function regenerateImage(
  taskId: string, page: Page, useReference: boolean,
  context?: { fullOutline: string; userTopic: string; style?: string }
) {
  const res = await fetch(`${API_BASE}/api/regenerate`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      task_id: taskId, page, use_reference: useReference,
      full_outline: context?.fullOutline || '', user_topic: context?.userTopic || '',
      style: context?.style || 'default',
    }),
  })
  return res.json()
}
