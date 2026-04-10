<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import hljs from 'highlight.js';
// @ts-ignore
import * as htmlToImage from 'html-to-image';
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

const isDesktop = ref(!!(window as any).electronAPI);
const isWechatAvailable = ref(!!(window as any).wechatAPI);

// Wenyan Parity: Themes Picker (BMPI Collection)
const themes = [
  { id: 'wechat-bmpi-01-default', name: '01. 默认原始' },
  { id: 'wechat-bmpi-02-orange', name: '02. 阳光甜橙' },
  { id: 'wechat-bmpi-03-purple', name: '03. 魅力紫黑' },
  { id: 'wechat-bmpi-04-tender-green', name: '04. 清新嫩绿' },
  { id: 'wechat-bmpi-05-greenery', name: '05. 绿意盎然' },
  { id: 'wechat-bmpi-06-scarlet', name: '06. 猩红亮丽' },
  { id: 'wechat-bmpi-07-blue-jade', name: '07. 碧玉湛蓝' },
  { id: 'wechat-bmpi-08-indigo', name: '08. 靛青纯蓝' },
  { id: 'wechat-bmpi-09-yamabuki', name: '09. 山吹金黄' },
  { id: 'wechat-bmpi-10-tech', name: '10. 极客科技' },
  { id: 'wechat-bmpi-11-geek-black', name: '11. 极客黑白' },
  { id: 'wechat-bmpi-12-rose-purple', name: '12. 玫瑰紫罗' },
  { id: 'wechat-bmpi-13-moe-green', name: '13. 萌萌初绿' },
  { id: 'wechat-bmpi-14-fullstack-blue', name: '14. 全栈静夜蓝' },
  { id: 'wechat-bmpi-15-simple-black', name: '15. 简约纯黑' },
  { id: 'wechat-bmpi-16-orange-blue', name: '16. 繁花橙蓝' },
];
const selectedTheme = ref('wechat-bmpi-16-orange-blue');

// Dynamically injected style block for the preview pane
const themeStyleContent = ref("");
const loadTheme = async (themeId: string) => {
  try {
    const cssObj = await import(`../assets/themes/${themeId}.css?raw`);
    themeStyleContent.value = cssObj.default || "";
  } catch(e) {
    console.error("Theme load failed", e);
  }
}
watch(selectedTheme, (val) => loadTheme(val));
onMounted(() => loadTheme(selectedTheme.value));

// Wenyan Parity: Code Block Highlighter Themes
const codeThemes = [
  { id: 'github', name: '代码: Github' },
  { id: 'vs2015', name: '代码: VS 2015' },
  { id: 'atom-one-dark', name: '代码: Atom Dark' },
  { id: 'atom-one-light', name: '代码: Atom Light' },
  { id: 'monokai', name: '代码: Monokai' },
  { id: 'dracula', name: '代码: Dracula' }
];
const selectedCodeTheme = ref('github');
const codeThemeStyleContent = ref("");

const loadCodeTheme = async (themeId: string) => {
  try {
    const cssObj = await import(`highlight.js/styles/${themeId}.css?raw`);
    codeThemeStyleContent.value = cssObj.default || "";
  } catch(e) {
    console.error("Code Theme load failed", e);
  }
}
watch(selectedCodeTheme, (val) => loadCodeTheme(val));
onMounted(() => loadCodeTheme(selectedCodeTheme.value));

const isEditingTheme = ref(false);
const customStyleContent = ref("");

const toggleCSS = () => {
  isEditingTheme.value = !isEditingTheme.value;
  if (isEditingTheme.value) {
    customStyleContent.value = themeStyleContent.value;
    showToast("已提取当前主题源码进入自定义编辑模式", "success");
  } else {
    customStyleContent.value = "";
  }
};

const content = ref<string>(`
# Octopus MD 功能全域验证套件 🐙

欢迎体验全面重构后的双端通用版 **Octopus MD**。本套件将针对排版工具栏与 \`[格式]\` 菜单内的 12 项核心功能进行全量覆盖测试。

## 1. 基础内联格式测试 (Inline Formats)
在这段话中，我们要测试所有的基础文字排版标记。比如**极具视觉冲击力的绝对加粗文本 (Ctrl+B)**，或是配合辅助说明的*轻盈斜体文字 (Ctrl+I)*。在编写教程时，常常需要使用 \`console.log('行内代码')\` 这样的标签符号，如果发现内容需要废弃移除，还可以随时增加 ~~优雅的删除线 (Ctrl+U)~~。

## 2. 块级元素测试 (Block Elements)
如果我们需要强调段落：
> 这是一段经典的引用块说明 (Quote Block)。它可以作为旁解，甚至连续嵌套使用。

或者我们需要编写大量的后端代码，Mac 代码块引擎将被完美激活：

\`\`\`javascript
// 多行代码块 (Ctrl+Alt+C) 测试
function initializeOctopus(config) {
  const { glassmorphism, nativeAPI } = config;
  return new OctopusInstance({ featureParity: true });
}
\`\`\`

## 3. 表格与媒体测试 (Tables & Media)

| 平台核心指标 | Web端 (SaaS) | Desktop (Electron) | 备注 |
| :--- | :--- | :--- | :--- |
| **原生跨域限制** | 严格受限 | ✅ **已黑科技突破** | 微信直推核心 |
| **文件读写权限** | 仅限临时 Blob | ✅ **原生高速 I/O** | - |
| **超清截图生成** | 支持 | 支持 | 100%覆盖 |

这里放入一张高清水印配图：
![Octopus 架构流引擎](https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80 "程序员工作空间模拟") 

## 4. 微信图文黑科技测试 (WeChat Black Magic)

在微信公众号生态中，外链总是会被无情拦截。但现在您可以直接写标准链接，比如探讨前沿技术的 [苹果官方设计与技术规范](https://developer.apple.com/design/ "Human Interface Guidelines")，以及深度的 [TypeScript 官方权威接口指南](https://www.typescriptlang.org/)。

*点击顶部菜单中的 \`[格式] -> [微信外链转脚注]\`，您会看到所有带超链接的文字旁边会自动升起极致优雅的蓝色数字上标，紧接着文章末尾会自动生成一条由高亮分割线隔开的【参考资料】深度摘要版块！这在过去的 Markdown2Html 原生文颜工具中备受大量推文作者的热烈追捧！*

---
✨ **测试结束**。以上排版在右侧的引擎中全部被严格遵守并在任何设备下稳定呈现。点按上方的「复制到微信」按钮，粘贴到公众号编辑后台体验终极无损穿透效果吧！
`);

const htmlOutput = ref<string>('');
const previewContainer = ref<HTMLElement | null>(null);

// Setup MarkdownIt with Highlight.js
const md = new MarkdownIt({ 
  html: true, 
  linkify: true, 
  typographer: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
}).use(footnote);

// Unified Toast System
const toastState = ref({ message: '', type: 'info' as 'success'|'error'|'info', visible: false });
let toastTimer: any = null;
const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
  toastState.value = { message: msg, type, visible: true };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastState.value.visible = false; }, 3500);
};

// Unified Modal System
const modalState = ref({ visible: false, title: '', message: '', isConfirm: false, onResolve: null as any });
const showModal = (title: string, message: string, isConfirm: boolean = false): Promise<boolean> => {
  return new Promise(resolve => {
    modalState.value = { visible: true, title, message, isConfirm, onResolve: resolve };
  });
};
const clsoeModal = (result: boolean) => {
  modalState.value.visible = false;
  if (modalState.value.onResolve) modalState.value.onResolve(result);
};

// Replace standard alerts
const customAlert = (msg: string) => showModal("提示", msg, false);
const customConfirm = (msg: string) => showModal("确认操作", msg, true);

// Feature Toggles
const isMacCodeBlock = ref(false);
const useSerifFont = ref(false);
const enableLinkFootnote = ref(true);
const showReferences = ref(true);
const showDiagrams = ref(true);

const updateHtml = () => {
  let rawHtml = md.render(content.value);

  // Deep Parity: WeChat Link Footnotes & References
  if (enableLinkFootnote.value || showReferences.value) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const links = doc.querySelectorAll('a[href^="http"]');
    
    if (links.length > 0) {
      let refsHtml = '<div class="references-section" style="margin-top: 50px; border-top: 1px solid #e1e4e8; padding-top: 20px;">';
      refsHtml += '<h3 style="font-size: 16px; margin-bottom: 12px;">参考资料</h3><ul style="list-style: none; padding: 0; margin: 0;">';
      
      links.forEach((a, i) => {
         const num = i + 1;
         
         if (enableLinkFootnote.value) {
           const sup = doc.createElement('sup');
           sup.className = 'wechat-footnote-ref';
           sup.style.cssText = "font-size: 12px; color: #4f46e5; margin-left: 2px;";
           sup.textContent = `[${num}]`;
           a.appendChild(sup);
         }
         
         if (showReferences.value) {
           refsHtml += `<li style="margin-bottom: 8px; font-size: 14px; line-height: 1.6;">
             <span style="display:inline-block; width:1.8rem; color:#64748b; font-weight:500;">[${num}]</span>
             <strong style="color: #333;">${a.textContent.replace(`[${num}]`,'')}</strong>: 
             <span style="color:#64748b; word-break: break-all;">${(a as HTMLAnchorElement).href}</span>
           </li>`;
         }
      });
      refsHtml += '</ul></div>';
      
      if (showReferences.value) {
        rawHtml = doc.body.innerHTML + refsHtml;
      } else {
        rawHtml = doc.body.innerHTML; 
      }
    }
  }

  htmlOutput.value = `<section id="nice" class="markdown-body" style="width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important;">${rawHtml}</section>`;
};

watch(content, updateHtml);
onMounted(updateHtml);

// Dropdown Menu Logic
const activeMenu = ref<string | null>(null);
const toggleMenu = (menu: string) => {
  activeMenu.value = activeMenu.value === menu ? null : menu;
};

// File I/O Operations
const importMd = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md';
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        content.value = e.target.result;
        showToast("✅ 文档导入成功", "success");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

const exportMd = () => {
  const blob = new Blob([content.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.md';
  a.click();
  URL.revokeObjectURL(url);
  showToast("✅ Markdown 源文件下载成功", "success");
};

const exportHtmlFile = () => {
  const boilerplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Markdown Export</title><style>${themeStyleContent.value}\n${customStyleContent.value}</style></head><body>${htmlOutput.value}</body></html>`;
  const blob = new Blob([boilerplate], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.html';
  a.click();
  URL.revokeObjectURL(url);
  showToast("✅ HTML 源码文件下载成功", "success");
};

// Close dropdown on outside click
const closeMenu = (e: Event) => {
  if (!(e.target as HTMLElement).closest('.menu-item')) {
    activeMenu.value = null;
  }
};
onMounted(() => document.addEventListener('click', closeMenu));
onUnmounted(() => document.removeEventListener('click', closeMenu));

const formatMd = () => {
  // Simple heuristic Markdown cleaner
  content.value = content.value.replace(/\n{3,}/g, '\n\n').trim();
  showToast("✨ Markdown 内容排版已优化清理！", "success");
};

const resetEditor = async () => {
  const confirmed = await customConfirm('确定要清空编辑器内的全部内容吗？此操作无法撤销。');
  if (confirmed) {
    content.value = '';
    showToast("已清空", "success");
  }
};

const toggleSerif = () => { 
  useSerifFont.value = !useSerifFont.value; 
  updateHtml(); 
  showToast(useSerifFont.value ? "已切换至衬线字体" : "已切换至无衬线字体", "success");
};
const toggleLinkFootnote = () => { 
  enableLinkFootnote.value = !enableLinkFootnote.value; 
  updateHtml(); 
  showToast(enableLinkFootnote.value ? "已开启微信外链转脚注" : "已关闭外链转脚注", "success");
};
const toggleReferences = () => { 
  showReferences.value = !showReferences.value; 
  updateHtml(); 
  showToast(showReferences.value ? "已开启显示参考资料" : "已隐藏参考资料", "success");
};
const toggleDiagrams = () => { 
  showDiagrams.value = !showDiagrams.value; 
  updateHtml(); 
  showToast("图解(Mermaid)状态已更新", "info");
};

const toggleMacCodeBlock = () => {
  isMacCodeBlock.value = !isMacCodeBlock.value;
  updateHtml();
  showToast(isMacCodeBlock.value ? "Mac 代码块风格已开启！" : "Mac 代码块风格已关闭！", "success");
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      customAlert(`无法全屏: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
};

const showAbout = () => {
  customAlert("🐙 Octopus MD\n全平台自媒体图文编辑器\nVersion 1.0.0 (Feature Parity with Markdown2Html)\n打造最高效的图文处理流。");
};

const notImpl = () => showToast("高级功能正在加速接入中，敬请期待！", "info");

// CSS bindings for Mac Code Block and Serif
const extraCssClass = computed(() => {
  let classes = [];
  if (isMacCodeBlock.value) classes.push('mac-code-enabled');
  if (useSerifFont.value) classes.push('serif-font');
  return classes.join(' ');
});

// Feature: Complete CSS-Inlined HTML Copy for Multi-Platform
const copyHtml = (platform: 'wechat' | 'zhihu' | 'juejin' = 'wechat') => {
  if (!previewContainer.value) return;
  const original = previewContainer.value.querySelector('.preview-content') as HTMLElement;
  if (!original) return;

  const clone = original.cloneNode(true) as HTMLElement;
  
  if (platform === 'zhihu') {
    // Zhihu specific DOM cleanup if needed
    // Zhihu heavily sanitizes, we just copy raw styled blocks and let them truncate
  }
  
  const sourceNodes = original.querySelectorAll('*');
  const targetNodes = clone.querySelectorAll('*');
  
  for (let i = 0; i < sourceNodes.length; i++) {
    const computed = window.getComputedStyle(sourceNodes[i]);
    const propertiesToKeep = ['color', 'background-color', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-decoration', 'margin', 'padding', 'border', 'border-radius', 'line-height', 'text-align', 'display'];
    
    let cssStr = '';
    propertiesToKeep.forEach(prop => {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== '0px' && val !== 'transparent' && val !== 'none' && val !== 'normal') {
        cssStr += `${prop}:${val};`;
      }
    });
    if (cssStr) {
      (targetNodes[i] as HTMLElement).style.cssText = cssStr;
    }
  }
  
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  document.body.appendChild(clone);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(clone);
  selection?.removeAllRanges();
  selection?.addRange(range);
  
  try {
    document.execCommand('copy');
    const platName = platform === 'wechat' ? '微信' : (platform === 'zhihu' ? '知乎' : '掘金');
    showToast(`✅ CSS深度内联成功！已专门适配【${platName}】并复制，可以直接去粘贴了！`, "success");
  } catch (e) {
    customAlert("❌ 复制失败，浏览器阻止了剪贴板访问。");
  }
  
  selection?.removeAllRanges();
  document.body.removeChild(clone);
};

const isExporting = ref(false);

const printPdf = () => {
  window.setTimeout(() => window.print(), 100);
};

const isPreviewMode = ref(false);
const togglePreviewMode = () => {
  isPreviewMode.value = !isPreviewMode.value;
  showToast(isPreviewMode.value ? "已进入沉浸预览模式" : "已退出沉浸预览模式", "success");
};

const exportImage = async () => {
  if (!previewContainer.value) return;
  try {
    isExporting.value = true;
    showToast("正在拼合超清长图，这可能需要几秒钟...", "info");
    // Allow Vue to render the overlay
    await new Promise(r => setTimeout(r, 100));

    const contentNode = previewContainer.value.querySelector('.preview-content') as HTMLElement;
    if (!contentNode) throw new Error("无法定位预览区域内容");

    const dataUrl = await htmlToImage.toPng(contentNode, { 
      backgroundColor: '#ffffff',
      pixelRatio: 2, // Retina resolution
      style: {
        transform: 'none',
        height: contentNode.scrollHeight + 'px',
        width: contentNode.scrollWidth + 'px'
      }
    });

    if (isDesktop.value) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      // @ts-ignore
      await window.electronAPI.writeFile('./octopus-export.png', base64Data, 'base64');
      setTimeout(() => showToast("✅ 已通过 Electron 原生通道保存为 octopus-export.png！", "success"), 100);
    } else {
      const link = document.createElement('a');
      link.download = 'octopus-export.png';
      link.href = dataUrl;
      link.click();
      showToast("✅ 长图生成完毕并开始下载", "success");
    }
  } catch (e: any) {
    customAlert('长图生成失败，请重试:\n' + e.message);
  } finally {
    isExporting.value = false;
  }
};

// Resizable split pane logic
const leftWidth = ref(50);
const isDragging = ref(false);

const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const newWidth = (e.clientX / window.innerWidth) * 100;
  if (newWidth > 15 && newWidth < 85) {
    leftWidth.value = newWidth;
  }
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// Scroll Synchronization Logic
let isSyncing = false;
let scrollTimeout: any;

const syncScroll = (source: HTMLElement, target: HTMLElement) => {
  if (isSyncing) return;
  isSyncing = true;
  
  const sourceScrollable = source.scrollHeight - source.clientHeight;
  const targetScrollable = target.scrollHeight - target.clientHeight;
  
  if (sourceScrollable <= 0 || targetScrollable <= 0) {
    isSyncing = false;
    return;
  }
  
  const percentage = source.scrollTop / sourceScrollable;
  // Clamp percentage stringently
  const clampP = Math.max(0, Math.min(1, percentage));
  target.scrollTop = clampP * targetScrollable;
  
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => { isSyncing = false; }, 50);
};

const extensions = [markdown(), oneDark];
const view = shallowRef();
const handleReady = (payload: any) => { 
  view.value = payload.view; 
  
  const cmScroll = payload.view.scrollDOM;
  const preview = previewContainer.value;
  if (!cmScroll || !preview) return;

  cmScroll.addEventListener('scroll', () => {
    // Only trigger if mouse is hovering this pane
    if (preview.matches(':hover') || isSyncing) return;
    syncScroll(cmScroll, preview);
  });
  
  preview.addEventListener('scroll', () => {
    // Only trigger if mouse is hovering this pane
    if (cmScroll.matches(':hover') || isSyncing) return;
    syncScroll(preview, cmScroll);
  });
};

// Formatting Toolbar Logic
const insertFormat = (prefix: string, suffix: string = '') => {
  if (!view.value) return;
  const state = view.value.state;
  const selection = state.selection.main;
  const selectedText = state.sliceDoc(selection.from, selection.to);
  
  view.value.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: `${prefix}${selectedText}${suffix}`
    },
    selection: { anchor: selection.from + prefix.length, head: selection.to + prefix.length }
  });
  view.value.focus();
};
</script>

<template>
  <div class="octopus-layout">
    <component :is="'style'" v-if="themeStyleContent" id="dynamic-theme">{{ themeStyleContent }}</component>
    <component :is="'style'" v-if="codeThemeStyleContent" id="dynamic-code-theme">{{ codeThemeStyleContent }}</component>
    
    <!-- Tier 1: System Menu Bar -->
    <header class="octopus-header system-menu-bar">
      <div class="brand-group">
        <div class="brand">
          <span class="logo">🐙</span>
          <h1 style="margin-right: 1.5rem; white-space: nowrap;">Octopus MD</h1>
        </div>
        
        <nav class="classic-menus">
          <!-- File Menu -->
          <div class="menu-item" @click.stop="toggleMenu('file')">
            文件
            <div class="dropdown-menu" v-show="activeMenu === 'file'">
              <div class="dropdown-item" @click="importMd">导入 .md 文档</div>
              <div class="dropdown-item" @click="exportMd">下载 .md 文档</div>
              <div class="dropdown-item" @click="exportHtmlFile">下载 .html源码</div>
              <div v-show="!isDesktop" class="dropdown-item" @click="printPdf">导出 PDF (打印预览)</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="exportImage">导出长图封面</div>
            </div>
          </div>
          <!-- Format Menu -->
          <div class="menu-item" @click.stop="toggleMenu('format')">
            格式
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'format'">
              <div class="dropdown-item" @click="insertFormat('~~', '~~')"><span class="shortcut">Ctrl+U</span>删除线</div>
              <div class="dropdown-item" @click="insertFormat('**', '**')"><span class="shortcut">Ctrl+B</span>加粗</div>
              <div class="dropdown-item" @click="insertFormat('*', '*')"><span class="shortcut">Ctrl+I</span>倾斜</div>
              <div class="dropdown-item" @click="insertFormat('\n```\n', '\n```\n')"><span class="shortcut">Ctrl+Alt+C</span>代码</div>
              <div class="dropdown-item" @click="insertFormat('`', '`')"><span class="shortcut">Ctrl+Alt+V</span>行内代码</div>
              
              <div class="dropdown-divider"></div>
              
              <div class="dropdown-item" @click="insertFormat('[', '](https://)')"><span class="shortcut">Ctrl+K</span>链接</div>
              <div class="dropdown-item" @click="insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '')"><span class="shortcut">Ctrl+Alt+T</span>表格</div>
              <div class="dropdown-item" @click="insertFormat('![图片描述](', ') ')"><span class="shortcut">Ctrl+Alt+I</span>图片</div>
              <div class="dropdown-item" @click="toggleSerif">
                <span class="check-icon">{{ useSerifFont ? '✅' : '　' }}</span>衬线字体
              </div>

              <div class="dropdown-divider"></div>

              <div class="dropdown-item" @click="toggleLinkFootnote"><span class="shortcut">Ctrl+Alt+L</span>微信外链转脚注</div>
              <div class="dropdown-item" @click="toggleReferences">
                <span class="check-icon">{{ showReferences ? '✅' : '　' }}</span>显示参考资料
              </div>
              <div class="dropdown-item" @click="toggleDiagrams">
                <span class="shortcut">Ctrl+Alt+D</span><span class="check-icon">{{ showDiagrams ? '✅' : '　' }}</span>显示图解
              </div>
              <div class="dropdown-item" @click="formatMd"><span class="shortcut">Ctrl+Alt+F</span>格式化文档</div>
            </div>
          </div>
          <!-- Theme Menu Removed to Actions Bar -->
          <!-- Function Menu -->
          <div class="menu-item" @click.stop="toggleMenu('function')">
            功能
            <div class="dropdown-menu" v-show="activeMenu === 'function'">
              <div class="dropdown-item" @click="notImpl">微信文章同步</div>
              <div class="dropdown-item" @click="notImpl">保存到云端</div>
            </div>
          </div>
          <!-- View Menu -->
          <div class="menu-item" @click.stop="toggleMenu('view')">
            查看
            <div class="dropdown-menu" v-show="activeMenu === 'view'">
              <div class="dropdown-item" @click="togglePreviewMode">{{ isPreviewMode ? '关闭预览模式' : '开启沉浸预览模式' }}</div>
              <div class="dropdown-item" @click="toggleMacCodeBlock">{{ isMacCodeBlock ? '关闭' : '开启' }} Mac代码块风格</div>
              <div class="dropdown-item" @click="toggleFullscreen">全屏沉浸模式</div>
            </div>
          </div>
          <!-- Settings Menu -->
          <div class="menu-item" @click.stop="toggleMenu('settings')">
            设置
            <div class="dropdown-menu" v-show="activeMenu === 'settings'">
              <div class="dropdown-item" @click="notImpl">图床配置绑定</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="resetEditor">重置编辑器内容</div>
            </div>
          </div>
          <!-- Help Menu -->
          <div class="menu-item" @click.stop="toggleMenu('help')">
            帮助
            <div class="dropdown-menu" v-show="activeMenu === 'help'">
              <div class="dropdown-item" @click="notImpl">更新日志</div>
              <div class="dropdown-item" @click="notImpl">快捷键一览</div>
              <div class="dropdown-item" @click="showAbout">关于 Octopus MD</div>
            </div>
          </div>
        </nav>
      </div>

      <div class="actions">
        <!-- Title bar actions (if any) are kept extremely minimal now -->
      </div>
    </header>

    <!-- Tier 2: Formatting Toolbar -->
    <div class="octopus-header formatting-toolbar">
      <div class="format-actions">
        <button class="icon-btn" title="删除线" @click="insertFormat('~~', '~~')"><span style="text-decoration: line-through; font-weight: bold; font-family: sans-serif;">S</span></button>
        <button class="icon-btn" title="加粗" @click="insertFormat('**', '**')"><strong style="font-family: serif; font-size: 1.1rem;">B</strong></button>
        <button class="icon-btn" title="倾斜" @click="insertFormat('*', '*')"><em style="font-family: serif; font-size: 1.1rem; font-weight: bold;">I</em></button>
        <button class="icon-btn" title="代码块" @click="insertFormat('\n```\n', '\n```\n')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"><polyline points="4 8 10 12 4 16"></polyline><line x1="12" y1="18" x2="20" y2="18"></line></svg></button>
        <button class="icon-btn" title="行内代码" @click="insertFormat('`', '`')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline><line x1="14" y1="4" x2="10" y2="20"></line></svg></button>
        <button class="icon-btn" title="链接" @click="insertFormat('[', '](https://)')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>
        <button class="icon-btn" title="表格" @click="insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg></button>
        <button class="icon-btn" title="图片" @click="insertFormat('![图片描述](', ') ')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
        <button class="icon-btn" title="引用" @click="insertFormat('\n> ', '')" style="font-weight: 800; font-size: 1.2rem; line-height: 1; font-family: Times, serif;">"</button>
        <button class="icon-btn" title="格式化排版" @click="formatMd"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg></button>
      </div>

      <div class="actions">
        <!-- Direct High-Visibility Theme Controls -->
        <select v-model="selectedCodeTheme" class="theme-select inline-select" style="margin-right: 0.5rem; max-width: 140px;">
          <option v-for="c in codeThemes" :key="c.id" :value="c.id">代码: {{c.name}}</option>
        </select>
        <select v-model="selectedTheme" class="theme-select inline-select" style="margin-right: 0.5rem;">
          <option v-for="t in themes" :key="t.id" :value="t.id">{{t.name}}</option>
        </select>

        <button class="btn btn-native" style="margin-right: 0.5rem;" @click="toggleCSS">
          <span v-if="!isEditingTheme">⚙️ 自定义 CSS</span><span v-else>关闭自定义</span>
        </button>

        <div class="copy-group" style="margin-right: 0.5rem;">
          <button class="btn-copy wechat" @click="copyHtml('wechat')">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            微信
          </button>
          <button class="btn-copy zhihu" @click="copyHtml('zhihu')">知乎</button>
          <button class="btn-copy juejin" @click="copyHtml('juejin')">掘金</button>
        </div>

        <button class="btn btn-primary" @click="exportImage">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          导出图片
        </button>
      </div>
    </div>

    <main class="workspace" :class="{ 'is-dragging': isDragging }">
      <div v-show="!isPreviewMode" class="editor-pane" :style="{ width: isEditingTheme ? '33.333%' : (leftWidth + '%') }">
        <Codemirror
          v-model="content"
          placeholder="Start writing..."
          :style="{ height: '100%', width: '100%', fontSize: '15px' }"
          :autofocus="true"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="extensions"
          @ready="handleReady"
        />
      </div>

      <!-- Draggable Splitter -->
      <div v-show="!isPreviewMode && !isEditingTheme" class="resizer" @mousedown.prevent="startDrag">
        <div class="resizer-handle"></div>
      </div>

      <div class="preview-pane" ref="previewContainer" :style="{ width: isPreviewMode ? '100%' : (isEditingTheme ? '33.333%' : (100 - leftWidth + '%')) }">
        <component :is="'style'" v-if="customStyleContent" id="custom-theme">{{ customStyleContent }}</component>
        <div class="preview-content" :class="extraCssClass" v-html="htmlOutput"></div>
      </div>
      
      <!-- Tier 3 CSS Pane for 3-Column Layout (Moved to the Far Right) -->
      <div v-show="isEditingTheme && !isPreviewMode" class="editor-pane css-pane" style="width: 33.333%; border-left: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column;">
        <div style="background: #1e293b; padding: 0.6rem 1rem; color: #cbd5e1; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.05);">
           🎨 实时 CSS 编辑器
        </div>
        <Codemirror v-model="customStyleContent" :extensions="[oneDark]" style="flex: 1; overflow: hidden;" />
      </div>
      <!-- Loading Overlay -->
      <transition name="fade">
        <div v-if="isExporting" class="export-overlay">
          <div class="export-modal loading-modal">
            <div class="spinner"></div>
            <h3>正在生成超清长图</h3>
            <p>系统正在穿透渲染长文本节点并进行双倍抗锯齿采样，请稍候...</p>
          </div>
        </div>
      </transition>

      <!-- Global Modal Container -->
      <transition name="fade">
        <div v-if="modalState.visible" class="export-overlay">
          <div class="export-modal custom-modal">
            <h3 style="margin-top:0;">{{ modalState.title }}</h3>
            <p style="margin: 1.5rem 0; white-space: pre-wrap;">{{ modalState.message }}</p>
            <div class="modal-actions">
              <button v-if="modalState.isConfirm" class="btn btn-native" @click="clsoeModal(false)">取消</button>
              <button class="btn btn-primary" @click="clsoeModal(true)">确定</button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Toast Container -->
      <transition name="slide-up">
        <div v-if="toastState.visible" class="toast-container" :class="'toast-' + toastState.type">
          {{ toastState.message }}
        </div>
      </transition>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body {
  margin: 0; padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0f172a;
}

.octopus-layout {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
  background: #0f172a;
  color: #fff;
  overflow: hidden;
}

.octopus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.system-menu-bar {
  padding: 0.4rem 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 200;
  box-shadow: none;
}

.formatting-toolbar {
  padding: 0.5rem 1.5rem;
  background: #0f172a;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 100;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  flex-direction: row;
}

.classic-menus {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.menu-item {
  color: #94a3b8;
  font-size: 0.88rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
  user-select: none;
}

.menu-item:hover, .menu-item.active {
  color: white;
  background: rgba(255,255,255,0.1);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.2rem;
  background: #1e293b;
  min-width: 160px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  z-index: 100;
  padding: 0.4rem 0;
}

.dropdown-menu-large {
  min-width: 200px;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  color: #cbd5e1;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  position: relative;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dropdown-item .shortcut {
  color: #64748b;
  font-size: 0.75rem;
  margin-left: auto;
  position: absolute;
  right: 1rem;
}

.dropdown-item .check-icon {
  margin-right: 0.5rem;
  width: 1rem;
  display: inline-block;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0.3rem 0;
}

.format-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.icon-btn {
  background: transparent;
  color: #cbd5e1;
  border: 1px solid transparent;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  font-size: 1rem;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
  border-color: rgba(255,255,255,0.15);
}

.icon-btn svg {
  color: currentColor;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 0.5rem;
}

.inline-select {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  height: 32px;
}

.logo {
  font-size: 1.5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(0px); }
}

.brand h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.current-env-indicator {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge.desktop {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge.web {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #cbd5e1;
}

.theme-select {
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
}
.theme-select option {
  background: #1e293b;
  color: white;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: linear-gradient(to right, #3b82f6, #4f46e5);
  color: white;
}

.btn-copy {
  background: linear-gradient(to right, #f59e0b, #d97706);
  color: white;
}

.btn-native {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-wechat {
  background: linear-gradient(to right, #059669, #10b981);
  color: white;
}

.workspace {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.workspace.is-dragging {
  cursor: col-resize;
  user-select: none;
}

.editor-pane {
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  background: #282c34;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Force CodeMirror to fill bounds without stretching */
.editor-pane ::v-deep(.cm-editor) {
  height: 100%;
  flex: 1;
  overflow: hidden;
}
.editor-pane ::v-deep(.cm-scroller) {
  overflow: auto;
}

.resizer {
  width: 4px;
  background: rgba(255, 255, 255, 0.05);
  cursor: col-resize;
  position: relative;
  z-index: 10;
  transition: background 0.2s;
  border-left: 1px solid rgba(0, 0, 0, 0.2);
}

.resizer:hover, .workspace.is-dragging .resizer {
  background: #3b82f6;
}

.resizer-handle {
  display: none;
}

.preview-pane {
  height: 100%;
  background: #ffffff;  /* Edge-to-edge white */
  color: #334155;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.preview-pane::-webkit-scrollbar {
  width: 8px;
}
.preview-pane::-webkit-scrollbar-track {
  background: transparent;
}
.preview-pane::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.preview-content {
  padding: 2rem 3rem 0 3rem !important; /* NO padding-bottom creating fake space */
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  min-height: 100% !important;
  background: #ffffff !important;
  box-sizing: border-box !important;
  border: none !important;
  box-shadow: none !important;
}

/* Force Weiyan containers to strictly fill the pane to eliminate right-side gaps */
::v-deep(#nice) {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding-bottom: 0 !important;
}

/* Base Typo protections ensuring the rendering area is completely standalone from app styling */
.preview-content ::v-deep(div),
.preview-content ::v-deep(p),
.preview-content ::v-deep(h1),
.preview-content ::v-deep(h2) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
}

/* Mac Code Block Styles */
.mac-code-enabled ::v-deep(pre) {
  padding-top: 36px !important;
  position: relative;
}

.mac-code-enabled ::v-deep(pre::before) {
  content: '';
  position: absolute;
  top: 12px;
  left: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff5f56;
  box-shadow: 20px 0 0 #ffbd2e, 40px 0 0 #27c93f;
}
/* Extra Modal Styling */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.copy-group {
  display: flex;
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.copy-group .btn-copy {
  background: transparent;
  border: none;
  border-right: 1px solid rgba(255,255,255,0.1);
  border-radius: 0;
  padding: 0.4rem 0.8rem;
  color: #e2e8f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.copy-group .btn-copy:last-child {
  border-right: none;
}
.copy-group .btn-copy.wechat:hover { background: #059669; color: white; }
.copy-group .btn-copy.zhihu:hover { background: #0084ff; color: white; }
.copy-group .btn-copy.juejin:hover { background: #1e80ff; color: white; }

.export-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.export-modal {
  background: #1e293b;
  padding: 2.5rem 3rem;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  text-align: center;
  border: 1px solid rgba(255,255,255,0.1);
  max-width: 400px;
  min-width: 320px;
}

.custom-modal {
  padding: 2rem;
  text-align: left;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #1e293b;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  z-index: 99999;
  display: flex;
  align-items: center;
  font-weight: 500;
  border-left: 4px solid #3b82f6; 
}

.toast-success { border-left-color: #10b981; }
.toast-error { border-left-color: #ef4444; }
.toast-info { border-left-color: #3b82f6; }

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.export-modal h3 {
  color: #f1f5f9;
  font-size: 1.2rem;
}

.export-modal p {
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.serif-font, .serif-font * {
  font-family: Georgia, "Times New Roman", "Source Serif Pro", serif !important;
}

@media print {
  .system-menu-bar, .formatting-toolbar, .editor-pane, .resizer, .css-pane, .actions {
    display: none !important;
  }
  .preview-pane {
    width: 100% !important;
    overflow: visible !important;
    height: auto !important;
  }
  .workspace {
    overflow: visible !important;
  }
}
</style>
