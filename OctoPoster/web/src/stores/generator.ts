import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Page } from '../api'

export const useGeneratorStore = defineStore('generator', () => {
  const topic = ref('')
  const outline = ref('')
  const style = ref('default')
  const platform = ref('xhs') // 'xhs' | 'gzh' | 'moments' | 'ecom'
  const pages = ref<Page[]>([])
  const taskId = ref('')
  const isGenerating = ref(false)

  // Map of page index -> image URL
  const imageUrls = ref<Record<number, string>>({})
  // Map of page index -> error message
  const errors = ref<Record<number, string>>({})
  // Map of page index -> status ('pending' | 'generating' | 'done' | 'error')
  const pageStatus = ref<Record<number, string>>({})

  // Content generation results
  const titles = ref<string[]>([])
  const copywriting = ref('')
  const tags = ref<string[]>([])
  const contentStatus = ref<'idle' | 'generating' | 'done' | 'error'>('idle')
  const contentError = ref('')

  function setTopic(t: string) {
    topic.value = t
  }

  function setStyle(s: string) {
    style.value = s
  }

  function setPlatform(p: string) {
    platform.value = p
  }

  function setOutline(o: string, p: Page[]) {
    outline.value = o
    pages.value = p
    // Reset generation state
    imageUrls.value = {}
    errors.value = {}
    pageStatus.value = {}
    for (const page of p) {
      pageStatus.value[page.index] = 'pending'
    }
  }

  function setTaskId(id: string) {
    taskId.value = id
  }

  function updatePageStatus(index: number, status: string) {
    pageStatus.value[index] = status
  }

  function setImageUrl(index: number, url: string) {
    imageUrls.value[index] = url
    pageStatus.value[index] = 'done'
  }

  function setPageError(index: number, msg: string) {
    errors.value[index] = msg
    pageStatus.value[index] = 'error'
  }

  function startContentGeneration() {
    contentStatus.value = 'generating'
    contentError.value = ''
  }

  function setContent(t: string[], c: string, tg: string[]) {
    titles.value = t
    copywriting.value = c
    tags.value = tg
    contentStatus.value = 'done'
  }

  function setContentError(err: string) {
    contentStatus.value = 'error'
    contentError.value = err
  }

  function reset() {
    topic.value = ''
    outline.value = ''
    pages.value = []
    taskId.value = ''
    isGenerating.value = false
    imageUrls.value = {}
    errors.value = {}
    pageStatus.value = {}
    titles.value = []
    copywriting.value = ''
    tags.value = []
    contentStatus.value = 'idle'
    contentError.value = ''
  }

  return {
    topic, outline, style, platform, pages, taskId, isGenerating,
    imageUrls, errors, pageStatus,
    titles, copywriting, tags, contentStatus, contentError,
    setTopic, setStyle, setPlatform, setOutline, setTaskId,
    updatePageStatus, setImageUrl, setPageError,
    startContentGeneration, setContent, setContentError, reset,
  }
})
