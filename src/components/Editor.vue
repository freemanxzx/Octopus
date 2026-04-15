<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, shallowRef, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import mathjax3 from 'markdown-it-mathjax3';
import hljs from 'highlight.js';
// @ts-ignore
import * as htmlToImage from 'html-to-image';
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { uploadImage, type UploadConfig } from '../utils/uploader';

// Static raw CSS imports to bypass Vite dynamic loader sandbox and CDN blocks
import githubCss from 'highlight.js/styles/github.css?raw';
import vs2015Css from 'highlight.js/styles/vs2015.css?raw';
import atomOneDarkCss from 'highlight.js/styles/atom-one-dark.css?raw';
import atomOneLightCss from 'highlight.js/styles/atom-one-light.css?raw';
import monokaiCss from 'highlight.js/styles/monokai.css?raw';
import draculaCss from 'highlight.js/styles/base16/dracula.css?raw';

const codeThemeMap: Record<string, string> = {
  'github': githubCss,
  'vs2015': vs2015Css,
  'atom-one-dark': atomOneDarkCss,
  'atom-one-light': atomOneLightCss,
  'monokai': monokaiCss,
  'dracula': draculaCss
};

const isDesktop = ref(!!(window as any).electronAPI);
const isWechatAvailable = ref(!!(window as any).wechatAPI);

// Wenyan Parity: Themes Picker (BMPI Collection)
const themes = [
  { id: 'wechat-bmpi-01-default', name: '默认原始' },
  { id: 'wechat-bmpi-02-orange', name: '阳光甜橙' },
  { id: 'wechat-bmpi-03-purple', name: '魅力紫黑' },
  { id: 'wechat-bmpi-04-tender-green', name: '清新嫩绿' },
  { id: 'wechat-bmpi-05-greenery', name: '绿意盎然' },
  { id: 'wechat-bmpi-06-scarlet', name: '猩红亮丽' },
  { id: 'wechat-bmpi-07-blue-jade', name: '碧玉湛蓝' },
  { id: 'wechat-bmpi-08-indigo', name: '靛青纯蓝' },
  { id: 'wechat-bmpi-09-yamabuki', name: '山吹金黄' },
  { id: 'wechat-bmpi-10-tech', name: '极客科技' },
  { id: 'wechat-bmpi-11-geek-black', name: '极客黑白' },
  { id: 'wechat-bmpi-12-rose-purple', name: '玫瑰紫罗' },
  { id: 'wechat-bmpi-13-moe-green', name: '萌萌初绿' },
  { id: 'wechat-bmpi-14-fullstack-blue', name: '全栈静夜蓝' },
  { id: 'wechat-bmpi-15-simple-black', name: '简约纯黑' },
  { id: 'wechat-bmpi-16-orange-blue', name: '繁花橙蓝' },
];
const selectedTheme = ref('wechat-bmpi-16-orange-blue');

// Dynamically injected style block for the preview pane
const themeStyleContent = ref("");
const loadTheme = async (themeId: string) => {
  try {
    const baseCssObj = await import(`../assets/themes/_base/basic.css?raw`);
    const themeCssObj = await import(`../assets/themes/${themeId}.css?raw`);
    themeStyleContent.value = (baseCssObj.default || "") + "\n\n/* ----- THEME OVERRIDES ----- */\n\n" + (themeCssObj.default || "");
  } catch(e) {
    console.error("Theme load failed", e);
  }
}
watch(selectedTheme, (val) => loadTheme(val));
onMounted(() => loadTheme(selectedTheme.value));

// Wenyan Parity: Code Block Highlighter Themes
const codeThemes = [
  { id: 'github', name: 'Github' },
  { id: 'vs2015', name: 'VS 2015' },
  { id: 'atom-one-dark', name: 'Atom Dark' },
  { id: 'atom-one-light', name: 'Atom Light' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'dracula', name: 'Dracula' }
];
const selectedCodeTheme = ref('github');
const codeThemeStyleContent = ref("");

const loadCodeTheme = (themeId: string) => {
  try {
    const rawCss = codeThemeMap[themeId] || "";
    const boostedCss = rawCss.replace(/(^|}|,)\s*([^{}]+?)\s*(?={|,)/g, (m: string, prefix: string, selector: string) => {
      const sel = selector.trim();
      if (sel.startsWith('@') || sel === '') return m;
      return `${prefix}\n#nice ${sel}`;
    });
    codeThemeStyleContent.value = boostedCss;
  } catch(e) {
    console.error("Code Theme load failed", e);
  }
}
watch(selectedCodeTheme, (val) => loadCodeTheme(val));
onMounted(() => loadCodeTheme(selectedCodeTheme.value));

const isEditingTheme = ref(false);
const dsTab = ref<'core' | 'visual' | 'native'>('core');

// Immersive Zen Mode State
const isZenMode = ref(false);
const isAiMenuOpen = ref(false);
const isZenToolbarExpanded = ref(true);
const isZenToolbarPinned = ref(false);
const zenX = ref(window.innerWidth / 2 - 250);
const zenY = ref(16);
let isZenDragging = false;
let startMouseX = 0, startMouseY = 0;
let startZenX = 0, startZenY = 0;

const startZenDrag = (e: MouseEvent) => {
  isZenDragging = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  startZenX = zenX.value;
  startZenY = zenY.value;
  document.addEventListener('mousemove', onZenDrag);
  document.addEventListener('mouseup', endZenDrag);
};
const onZenDrag = (e: MouseEvent) => {
  if (!isZenDragging) return;
  zenX.value = startZenX + (e.clientX - startMouseX);
  zenY.value = startZenY + (e.clientY - startMouseY);
};
const endZenDrag = () => {
  isZenDragging = false;
  document.removeEventListener('mousemove', onZenDrag);
  document.removeEventListener('mouseup', endZenDrag);
};

const toggleCSS = () => {
  isEditingTheme.value = !isEditingTheme.value;
  if (isEditingTheme.value) {
    showToast("已提取当前主题源码进入直接编辑模式", "success");
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

## 4. 外链智能探测 (Smart URI Scanner)
本应用通过精确的 AST (抽象语法树) 解析系统来搜捕并高亮任何可能导致平台封禁的外部链接。您可以测试下底下的智能探测器：
1. [外链测试链接 一号 (GitHub)](https://github.com/)
2. [外链测试链接 二号 (Vue 官方文档)](https://vuejs.org/)
3. [外链测试链接 三号 (Google)](https://google.com/)

这里放入一张高清水印配图：
![Octopus 架构流引擎](https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80 "程序员工作空间模拟") 

## 5. 多图横向滑动测试 (Image Flow)

如果需要在同一排版位置放入多张图片作横向滚动展示，只需要使用原生的尖括号（前后带有 \`<\` 和 \`>\`）包裹图库，并在图片之间用英文逗号分隔：

<![横屏图 1](https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80),![横屏图 2](https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80),![横屏图 3](https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80)>

## 6. 数学公式与方程测试 (Math / LaTeX)

支持原生内联公式，比如爱因斯坦的神秘魔法 $E=mc^2$。如果你在推导算法模型，甚至可以直接唤醒强大的 MathJax 渲染引擎：

$$
\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}
$$

$$
\\mathcal{L} = -\\frac{1}{2} \\log \\left( 2\\pi\\sigma^2 \\right) - \\frac{(x-\\mu)^2}{2\\sigma^2}
$$

---
✨ **测试结束**。以上排版在右侧的引擎中全部被严格遵守并在任何设备下稳定呈现。点按上方的「复制到微信」按钮，粘贴到公众号编辑后台体验终极无损穿透效果吧！
`);

const htmlOutput = ref<string>('');


const previewContainer = ref<HTMLElement | null>(null);

// Status Bar Computations
const wordCount = computed(() => {
  const text = content.value || '';
  const cnMatches = text.match(/[\u4e00-\u9fa5]/g) || [];
  const enWords = text.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(w => w.length > 0) || [];
  return cnMatches.length + enWords.length;
});
const lineCount = computed(() => {
  return (content.value || '').split('\n').length;
});

// TOC Sidebar Logic
interface TocItem {
  level: number;
  text: string;
  line: number;
}
const tocList = ref<TocItem[]>([]);
const showToc = ref(true); console.log('showToc init to:', showToc.value);

interface ExtLinkItem {
  text: string;
  url: string;
  line: number;
}
const externalLinks = ref<ExtLinkItem[]>([]);
const hasExternalLinks = computed(() => externalLinks.value.length > 0);
const activeExtLinkIdx = ref(0);
const showLinkWarning = ref(true);
const isLinkRadarExpanded = ref(false);
let linkCheckDebounce: number | null = null;

const jumpToExtLine = (direction: 'next' | 'prev' | 'current') => {
  if (externalLinks.value.length === 0) return;
  
  if (direction === 'next') {
    activeExtLinkIdx.value = (activeExtLinkIdx.value + 1) % externalLinks.value.length;
  } else if (direction === 'prev') {
    activeExtLinkIdx.value = (activeExtLinkIdx.value - 1 + externalLinks.value.length) % externalLinks.value.length;
  }
  
  if (view.value) {
    try {
      const ln = externalLinks.value[activeExtLinkIdx.value].line;
      const targetPos = view.value.state.doc.line(ln).from;
      view.value.dispatch({
        selection: { anchor: targetPos, head: targetPos },
        effects: EditorView.scrollIntoView(targetPos, { y: "center" })
      });
      view.value.focus();
    } catch(e) {}
  }
};

watch(content, (newVal) => {
  const lines = newVal.split('\n');
  const items: TocItem[] = [];
  let inCodeBlock = false;
  
  if (linkCheckDebounce) window.clearTimeout(linkCheckDebounce);
  linkCheckDebounce = window.setTimeout(() => {
    const linksFound: ExtLinkItem[] = [];
    const extLinkRegex = /(?:^|[^!])\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g;
    
    lines.forEach((lineText, idx) => {
      let match;
      while ((match = extLinkRegex.exec(lineText)) !== null) {
        linksFound.push({
          text: match[1],
          url: match[2],
          line: idx + 1
        });
      }
    });

    if (linksFound.length > 0 && externalLinks.value.length === 0) {
      showLinkWarning.value = true;
      activeExtLinkIdx.value = 0;
    } else if (linksFound.length === 0) {
      showLinkWarning.value = false;
    }
    
    externalLinks.value = linksFound;
    if (activeExtLinkIdx.value >= externalLinks.value.length) {
      activeExtLinkIdx.value = 0;
    }
  }, 600);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      items.push({
        level: match[1].length,
        text: match[2].replace(/<[^>]+>/g, '').trim(),
        line: i + 1
      });
    }
  }
  tocList.value = items;
}, { immediate: true });

const scrollToLine = (lineNode: number) => {
  if (!view.value) return;
  const state = view.value.state;
  const targetLine = Math.min(Math.max(1, lineNode), state.doc.lines);
  const pos = state.doc.line(targetLine).from;
  
  view.value.dispatch({
    selection: { anchor: pos },
    scrollIntoView: true
  });
  view.value.focus();
};

// Weiyan/MarkdownNice Parity Core Mutators
function markdownItSpan(md: any) {
  md.core.ruler.push("heading_span", (state: any) => {
    for (let i = 0; i < state.tokens.length - 1; i++) {
      if (state.tokens[i].type !== "heading_open" || state.tokens[i + 1].type !== "inline") continue;
      const inlineToken = state.tokens[i + 1];
      if (!inlineToken.content) continue;
      const p1 = new state.Token("html_inline", "", 0);
      p1.content = `<span class="prefix"></span><span class="content">`;
      inlineToken.children.unshift(p1);
      const p2 = new state.Token("html_inline", "", 0);
      p2.content = `</span><span class="suffix"></span>`;
      inlineToken.children.push(p2);
      i += 2;
    }
  });
}

function markdownItTableContainer(md: any) {
  md.core.ruler.push("table-container", (state: any) => {
    const arr = [];
    for (let i = 0; i < state.tokens.length; i++) {
      const cur = state.tokens[i];
      if (cur.type === "table_open") {
        const span = new state.Token("html_inline", "", 0);
        span.content = `<section class="table-container">`;
        arr.push(span);
        arr.push(cur);
      } else if (cur.type === "table_close") {
        const span = new state.Token("html_inline", "", 0);
        span.content = `</section>`;
        arr.push(cur);
        arr.push(span);
      } else {
        arr.push(cur);
      }
    }
    state.tokens = arr;
  });
}

function markdownItLiReplacer(md: any) {
  md.renderer.rules.list_item_open = () => "<li><section>";
  md.renderer.rules.list_item_close = () => "</section></li>";
}

function markdownItMultiquote(md: any) {
  md.core.ruler.push("blockquote-class", (state: any) => {
    let count = 0;
    let outerQuote: any;
    for (let i = 0; i < state.tokens.length; i++) {
      const cur = state.tokens[i];
      if (cur.type === "blockquote_open") {
        if (count === 0) outerQuote = cur;
        count++;
        continue;
      }
      if (count > 0) {
        outerQuote.attrs = [["class", "multiquote-" + count]];
        count = 0;
      }
    }
  });
}

function markdownItImageFlow(md: any) {
  const tokenize = (state: any, start: any) => {
    const matchReg = /^<((!\[[^[\]]*\]\([^()]+\)(,?\s*(?=>)|,\s*(?!>)))+)>/;
    const srcLine = state.src.slice(state.bMarks[start], state.eMarks[start]);

    if (srcLine.charCodeAt(0) !== 0x3c /* < */) {
      return false;
    }
    const match = matchReg.exec(srcLine);

    if (match) {
      const images = match[1].match(/\[[^\]]*\]\([^)]+\)/g);
      if (images && images.length > 0) {
        const token = state.push("imageFlow", "", 0);
        token.meta = images;
        token.block = true;
        state.line++;
        return true;
      }
    }
    return false;
  };

  md.renderer.rules.imageFlow = (tokens: any, idx: any) => {
    const start = `<section class="imageflow-layer1"><section class="imageflow-layer2">`;
    const end = `</section></section><p class="imageflow-caption"><<< 左右滑动见更多 >>></p>`;
    const contents = tokens[idx].meta;
    let wrappedContent = "";
    contents.forEach((content: any) => {
      let altMatch = content.match(/\[([^[\]]*)\]/);
      let srcMatch = content.match(/[^[]*\(([^()]*)\)[^\]]*/);
      let alt = altMatch ? altMatch[1] : "";
      let src = srcMatch ? srcMatch[1] : "";
      wrappedContent += `<section class="imageflow-layer3"><img alt="${alt}" src="${src}" class="imageflow-img" /></section>`;
    });

    return start + wrappedContent + end;
  };

  md.block.ruler.before("paragraph", "imageFlow", tokenize);
}



// Setup MarkdownIt with Highlight.js and all Weiyan Parity Injectors
const md = new MarkdownIt({ 
  html: true, 
  linkify: true, 
  typographer: true,
  highlight: function (str: string, lang: string) {
    const escapeHtml = (s: string) => s.replace(/[&<>'"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[c] as string));
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="custom hljs"><code>' + hljs.highlight(str, { language: lang }).value + '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="custom hljs"><code>' + escapeHtml(str) + '</code></pre>';
  }
})
.use(footnote)
.use(mathjax3)
.use(markdownItSpan)
.use(markdownItTableContainer)
.use(markdownItLiReplacer)
.use(markdownItMultiquote)
.use(markdownItImageFlow)
// Weiyan Parity: Semantic layout shortcodes
.use((window as any).markdownitContainer || (() => {}), 'shadow', {
  render: function (tokens: any, idx: any) {
    if (tokens[idx].nesting === 1) {
      return '<div class="mdnice-shadow" style="box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">\n';
    } else {
      return '</div>\n';
    }
  }
})
.use((window as any).markdownitContainer || (() => {}), 'center', {
  render: function (tokens: any, idx: any) {
    if (tokens[idx].nesting === 1) {
      return '<div class="mdnice-center" style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 1em;">\n';
    } else {
      return '</div>\n';
    }
  }
})
.use((window as any).markdownitRUBY || (() => {})); // Doocs Parity: Ruby {注音}

// History Tracking
const savedDrafts = ref<{time: string, content: string}[]>([]);
const isHistoryVisible = ref(false);

const loadDraftsHistory = () => {
  try {
    savedDrafts.value = JSON.parse(localStorage.getItem('octopus_snapshots') || '[]');
  } catch(e) {}
  isHistoryVisible.value = true;
  activeMenu.value = null;
};
const restoreDraft = (draftContent: string) => {
  content.value = draftContent;
  isHistoryVisible.value = false;
  showToast("✅ 已成功回滚至历史时光机版本", "success");
};

// AI Panel State Schema
const isAIAssistantVisible = ref(false);
const isAITextToImageVisible = ref(false);
const aiPrompt = ref('');
const aiResponse = ref('');
const isAILoading = ref(false);
const t2iPrompt = ref('');
const isT2ILoading = ref(false);

const openAIPanel = () => {
    isHistoryVisible.value = false;
    isAITextToImageVisible.value = false;
    isAIAssistantVisible.value = !isAIAssistantVisible.value;
};

const openT2IPanel = () => {
    isHistoryVisible.value = false;
    isAIAssistantVisible.value = false;
    isAITextToImageVisible.value = !isAITextToImageVisible.value;
};

const dispatchAICall = async (sysPrompt: string, userText: string) => {
    if (!uploadConfig.value.aiEndpoint) {
        showToast('⚠️ 未配置 API Endpoint 端点，请进入 [上传与配置] 面板设置', 'error');
        isAIAssistantVisible.value = false;
        isImageConfigVisible.value = true;
        return;
    }
    isAILoading.value = true;
    aiResponse.value = '🧠 AI模型引擎思考中...';
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (uploadConfig.value.aiKey) headers['Authorization'] = `Bearer ${uploadConfig.value.aiKey}`;
        
        const res = await fetch(`${uploadConfig.value.aiEndpoint}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: uploadConfig.value.aiModel || 'Qwen/Qwen2.5-7B-Instruct',
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: userText }
                ]
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        aiResponse.value = data.choices[0].message.content;
    } catch(e: any) {
        aiResponse.value = `❌ 调用失败: ${e.message}`;
    } finally {
        isAILoading.value = false;
    }
};

const dispatchT2ICall = async () => {
    if (!uploadConfig.value.aiEndpoint) {
        showToast('⚠️ 未配置 API Endpoint 端点，请进入 [上传与配置] 面板设置', 'error');
        isAITextToImageVisible.value = false;
        isImageConfigVisible.value = true;
        return;
    }
    if (!t2iPrompt.value.trim()) return;
    isT2ILoading.value = true;
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (uploadConfig.value.aiKey) headers['Authorization'] = `Bearer ${uploadConfig.value.aiKey}`;
        
        const res = await fetch(`${uploadConfig.value.aiEndpoint}/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: uploadConfig.value.aiImageModel || 'Kwai-Kolors/Kolors',
                prompt: t2iPrompt.value,
                n: 1,
                size: '1024x1024'
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        
        const imgUrl = data.data[0].url;
        const imgSyntax = `\n![AI生成图像](${imgUrl})\n`;
        
        if (view.value) {
            const pos = view.value.state.selection.main.head;
            view.value.dispatch({ changes: { from: pos, insert: imgSyntax } });
            showToast('✅ 图片已插入文章成功！', 'success');
        }
        isAITextToImageVisible.value = false;
    } catch(e: any) {
        showToast(`❌ 生成失败: ${e.message}`, 'error');
    } finally {
        isT2ILoading.value = false;
    }
};

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

// Clipboard 
const copyToClipboard = (text: string) => {
  if (navigator && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showToast('回复内容已复制入剪切板', 'success');
  }
};

// Replace standard alerts
const customAlert = (msg: string) => showModal("提示", msg, false);
const customConfirm = (msg: string) => showModal("确认操作", msg, true);

// Image Upload State
const isImageConfigVisible = ref(false);
const uploadConfig = ref<UploadConfig>(
  (() => {
    try {
      const saved = localStorage.getItem('octopus-upload-config');
      const parsed = saved ? JSON.parse(saved) : { provider: 'base64' };
      if (!parsed.aiEndpoint) parsed.aiEndpoint = 'https://proxy-ai.doocs.org/v1';
      if (!parsed.aiKey) parsed.aiKey = '';
      if (!parsed.aiModel) parsed.aiModel = 'Qwen/Qwen2.5-7B-Instruct';
      if (!parsed.aiImageModel) parsed.aiImageModel = 'Kwai-Kolors/Kolors';
      return parsed;
    } catch {
      return { provider: 'base64', aiEndpoint: 'https://proxy-ai.doocs.org/v1', aiKey: '', aiModel: 'Qwen/Qwen2.5-7B-Instruct', aiImageModel: 'Kwai-Kolors/Kolors' };
    }
  })()
);
watch(uploadConfig, (val) => localStorage.setItem('octopus-upload-config', JSON.stringify(val)), { deep: true });

// Manual Toolbar Image Upload
const fileInput = ref<HTMLInputElement | null>(null);
const triggerImageUpload = () => {
  if (fileInput.value) {
    fileInput.value.value = '';
    fileInput.value.click();
  }
};

const handleFileSelected = (e: any) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (view.value) {
    const pos = view.value.state.selection.main.head;
    handleFileUpload(file, view.value, pos);
  }
};

const handleFileUpload = async (file: File, viewArg: EditorView, pos: number) => {
  if (!file.type.startsWith('image/')) return;
  showToast('正在向图床传输图片...', 'info');
  const tempName = `![上传中... ${file.name}]()`;
  viewArg.dispatch({ changes: { from: pos, insert: tempName } });
  
  try {
    const url = await uploadImage(file, uploadConfig.value);
    const finalSyntax = `![image](${url})`;
    const docStr = viewArg.state.doc.toString();
    const startIdx = docStr.indexOf(tempName);
    if (startIdx !== -1) {
      viewArg.dispatch({
        changes: { from: startIdx, to: startIdx + tempName.length, insert: finalSyntax }
      });
      showToast('✅ 图片上传成功！', 'success');
    }
  } catch (e: any) {
    customAlert(`图片上传失败: ${e.message}`);
    const docStr = viewArg.state.doc.toString();
    const startIdx = docStr.indexOf(tempName);
    if (startIdx !== -1) {
      viewArg.dispatch({ changes: { from: startIdx, to: startIdx + tempName.length, insert: "" } });
    }
  }
};

// Feature Toggles
const isMacCodeBlock = ref(false);
const documentFontFamily = ref('system-sans');
const enableLinkFootnote = ref(true);
const showReferences = ref(true);
const showDiagrams = ref(true);

const updateHtml = () => {
  let rawHtml = md.render(content.value);

  // Deep Parity: Mac Code Block Styling
  if (isMacCodeBlock.value) {
    rawHtml = rawHtml.replace(/<pre class="custom hljs">/g, (match) => {
      return `<div class="mac-code-block">` + match;
    }).replace(/<\/pre>/g, '</pre></div>');
  }

  // Deep Parity: WeChat Link Footnotes & References
  if (enableLinkFootnote.value || showReferences.value) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const links = doc.querySelectorAll('a[href^="http"]');
    
    if (links.length > 0) {
      let refsHtml = '<h3 class="footnotes-sep"></h3>\n<section class="footnotes">\n';
      
      links.forEach((a, i) => {
         const num = i + 1;
         
         if (enableLinkFootnote.value) {
           const sup = doc.createElement('sup');
           sup.className = 'footnote-ref';
           sup.innerHTML = `[${num}]`;
           
           const textNode = a.innerHTML;
           a.innerHTML = `<span class="footnote-word">${textNode}</span>`;
           a.appendChild(sup);
         }
         
         if (showReferences.value) {
           // Weiyan Parity: .footnote-item > p > .footnote-word
           refsHtml += `<section id="fn${num}" class="footnote-item"><span class="footnote-num">[${num}] </span><p><span class="footnote-word">${a.textContent.replace(`[${num}]`,'')}</span>: <em>${(a as HTMLAnchorElement).href}</em></p></section>\n`;
         }
      });
      refsHtml += '</section>';
      
      if (showReferences.value) {
        rawHtml = doc.body.innerHTML + refsHtml;
      } else {
        rawHtml = doc.body.innerHTML; 
      }
    }
  }

  // Deep Parity: Implicit Figures
  rawHtml = rawHtml.replace(/<p>\s*(<img[^>]+alt="([^"]*)"[^>]*>)\s*<\/p>/g, (match, imgCore, altText) => {
    if (altText && altText.trim() !== '') {
      return `<figure>${imgCore}<figcaption>${altText}</figcaption></figure>`;
    }
    return `<figure>${imgCore}</figure>`;
  });

  htmlOutput.value = `<section id="nice" class="markdown-body" style="width: 100% !important; max-width: none !important;">${rawHtml}</section>`;
};

watch([content, isMacCodeBlock, documentFontFamily, enableLinkFootnote, showReferences, showDiagrams], updateHtml);
onMounted(updateHtml);

// Dropdown Menu Logic
const activeMenu = ref<string | null>(null);
const toggleMenu = (menu: string | null) => {
  activeMenu.value = activeMenu.value === menu ? null : menu;
};


const exportHtmlFile = () => {
  const boilerplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Markdown Export</title><style>${themeStyleContent.value}
</head><body>${htmlOutput.value}</body></html>`;
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

const formatMd = async () => {
  if ((window as any).prettier && (window as any).prettierPlugins) {
    try {
      const formatted = await (window as any).prettier.format(content.value, {
        parser: 'markdown',
        plugins: [(window as any).prettierPlugins.markdown],
        proseWrap: 'preserve'
      });
      content.value = formatted;
      showToast("✨ Prettier AST 格式化重绘完毕！", "success");
      return;
    } catch (e: any) {
      console.error(e);
      showToast("排版解析失败，已触发兜底清理", "error");
    }
  }
  // Fallback
  content.value = content.value.replace(/\n{3,}/g, '\n\n').trim();
  showToast("✨ Markdown 基本清理完成！", "success");
};

const convertClipboardHtmlToMd = async () => {
  try {
    const items = await navigator.clipboard.read();
    let htmlContent = "";
    for (let item of items) {
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        htmlContent = await blob.text();
        break;
      }
    }
    
    if (htmlContent && (window as any).TurndownService) {
      const turndownService = new (window as any).TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
      const md = turndownService.turndown(htmlContent);
      content.value = content.value ? content.value + '\n\n' + md : md;
      showToast("✅ 已成功提取剪贴板网页富文本，转化并追加 Markdown！", "success");
    } else if (!htmlContent) {
      customAlert("您的剪贴板目前为空，或未包含任何网页富文本格式 (text/html)。请先去网页上高亮并复制一段图文。");
    } else {
      customAlert("Turndown 解析引擎未加载完成，请刷新页面。");
    }
  } catch (err: any) {
    customAlert("获取操作系统剪贴板权限失败，或不支持该功能：\n" + err.message);
  }
};

const resetEditor = async () => {
  const confirmed = await customConfirm('确定要清空编辑器内的全部内容吗？此操作无法撤销。');
  if (confirmed) {
    content.value = '';
    showToast("已清空", "success");
  }
};


const toggleLinkFootnote = () => { 
  enableLinkFootnote.value = !enableLinkFootnote.value; 
  updateHtml(); 
  showToast(enableLinkFootnote.value ? "已开启微信外链转脚注" : "已关闭外链转脚注", "success");
};
const toggleReferences = () => { 
  showReferences.value = !showReferences.value; 
  updateHtml(); 
  showToast(showReferences.value ? "已开启显示脚注引用" : "已隐藏参考资料", "success");
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
  return classes.join(' ');
});

const isSyncModalVisible = ref(false);
const isVisualConfigVisible = ref(false);

const visualTheme = reactive({
  baseFontSize: '',
  baseColor: '',
  primaryColor: '',
  h1Size: '',
  h2Size: '',
  h3Size: '',
  headingAlign: '',
  lineHeight: '',
  paragraphMargin: '',
  blockquoteColor: '',
  blockquoteBg: ''
});


const clearVisualTheme = () => {
  Object.keys(visualTheme).forEach(k => {
    (visualTheme as any)[k] = '';
  });
};



const visualOverridesCss = computed(() => {
  let css = '';
  const tv = visualTheme;
  const dFont = documentFontFamily.value;

  if (dFont === 'lxgw') css += `@import url('https://cdn.staticfile.org/lxgw-wenkai-screen-webfont/1.6.0/lxgwwenkaiscreen.css');\n`;
  else if (dFont === 'fira') css += `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap');\n`;
  else if (dFont === 'jetbrains') css += `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');\n`;
  else if (dFont === 'zcool') css += `@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap');\n`;
  else if (dFont === 'zcool_huangyou') css += `@import url('https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap');\n`;
  else if (dFont === 'mashanzheng') css += `@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');\n`;
  else if (dFont === 'zhimangxing') css += `@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap');\n`;
  else if (dFont === 'longcang') css += `@import url('https://fonts.googleapis.com/css2?family=Long+Cang&display=swap');\n`;
  else if (dFont === 'smiley') css += `@import url('https://cdn.staticfile.net/smiley-sans/1.1.1/smiley-sans.min.css');\n`;
  else if (dFont === 'notosans') css += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');\n`;
  else if (dFont === 'notoserif') css += `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');\n`;

  if (dFont !== 'system-sans') {
    let f = '';
    if (dFont === 'system-serif') f = 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif';
    else if (dFont === 'notosans') f = '"Noto Sans SC", sans-serif';
    else if (dFont === 'notoserif') f = '"Noto Serif SC", serif';
    else if (dFont === 'lxgw') f = '"LXGW WenKai Screen", sans-serif';
    else if (dFont === 'smiley') f = 'SmileySans-Oblique, sans-serif';
    else if (dFont === 'zcool') f = '"ZCOOL XiaoWei", serif';
    else if (dFont === 'zcool_huangyou') f = '"ZCOOL QingKe HuangYou", cursive';
    else if (dFont === 'mashanzheng') f = '"Ma Shan Zheng", cursive';
    else if (dFont === 'zhimangxing') f = '"Zhi Mang Xing", cursive';
    else if (dFont === 'longcang') f = '"Long Cang", cursive';
    else if (dFont === 'fira') f = '"Fira Code", monospace';
    else if (dFont === 'jetbrains') f = '"JetBrains Mono", monospace';
    else if (dFont === 'yahei') f = '"Microsoft YaHei", "微软雅黑", sans-serif';
    else if (dFont === 'pingfang') f = '"PingFang SC", "PingFang TC", sans-serif';
    else if (dFont === 'helvetica') f = '"Helvetica Neue", Helvetica, sans-serif';
    else if (dFont === 'times') f = '"Times New Roman", Times, serif';
    if (f) css += `#nice, #nice * { font-family: ${f} !important; }\n`;
  }

  if (tv.baseFontSize || tv.baseColor || tv.lineHeight) {
    css += `\n#nice { ${tv.baseFontSize ? `font-size: ${tv.baseFontSize}px !important;` : ''} ${tv.baseColor ? `color: ${tv.baseColor} !important;` : ''} ${tv.lineHeight ? `line-height: ${tv.lineHeight} !important;` : ''} }`;
    css += `\n#nice p { ${tv.baseColor ? `color: ${tv.baseColor} !important;` : ''} ${tv.baseFontSize ? `font-size: ${tv.baseFontSize}px !important;` : ''} ${tv.paragraphMargin ? `margin: ${tv.paragraphMargin}px 0 !important;` : ''} }`;
  }
  if (tv.primaryColor) {
    css += `\n#nice h1, #nice h2, #nice h3, #nice h4 { color: ${tv.primaryColor} !important; }`;
    css += `\n#nice h1 .code-snippet_outer, #nice h2 .code-snippet_outer, #nice h3 .code-snippet_outer { color: ${tv.primaryColor} !important; }`;
    css += `\n#nice a { color: ${tv.primaryColor} !important; border-bottom: 1px solid ${tv.primaryColor} !important; }`;
    css += `\n#nice strong { color: ${tv.primaryColor} !important; }`;
  }
  if (tv.headingAlign) {
    css += `\n#nice h1, #nice h2, #nice h3, #nice h4 { text-align: ${tv.headingAlign} !important; }`;
  }
  if (tv.h1Size) css += `\n#nice h1 { font-size: ${tv.h1Size}px !important; }`;
  if (tv.h2Size) css += `\n#nice h2 { font-size: ${tv.h2Size}px !important; }`;
  if (tv.h3Size) css += `\n#nice h3 { font-size: ${tv.h3Size}px !important; }`;
  if (tv.blockquoteColor || tv.blockquoteBg) {
    css += `\n#nice blockquote { ${tv.blockquoteColor ? `border-left-color: ${tv.blockquoteColor} !important;` : ''} ${tv.blockquoteBg ? `background: ${tv.blockquoteBg} !important;` : ''} }`;
  }
  return css;
});



const syncToPlatform = (plat: 'wechat' | 'zhihu' | 'juejin' | 'csdn' | 'twitter' | 'weibo') => {
  copyHtml(plat);
  isSyncModalVisible.value = false;
  
  const urls: Record<string, string> = {
    wechat: 'https://mp.weixin.qq.com/',
    zhihu: 'https://zhuanlan.zhihu.com/write',
    juejin: 'https://juejin.cn/editor/drafts/new',
    csdn: 'https://mp.csdn.net/mp_blog/creation/editor',
    twitter: 'https://twitter.com/compose/tweet',
    weibo: 'https://weibo.com/'
  };
  
  // URL routing is now handled safely by the COSE Extension mapping in background.js.
  // We keep this generic fallback ONLY if the extension isn't installed.
  window.setTimeout(() => {
    if (!isCoseInstalled.value) {
      window.open(urls[plat], '_blank');
    }
  }, 100);
};

// Feature: Complete CSS-Inlined HTML Copy for Multi-Platform
const copyHtml = (platform: 'wechat' | 'zhihu' | 'juejin' | 'csdn' | 'twitter' | 'weibo' = 'wechat') => {
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

  // Weiyan MathJax Parity Handling for WeChat
  if (platform === 'wechat') {
    const mjxs = clone.getElementsByTagName('mjx-container');
    // First, fix SVG attributes dynamically
    for (let i = 0; i < mjxs.length; i++) {
        const mjx = mjxs[i] as HTMLElement;
        mjx.removeAttribute("jax");
        mjx.removeAttribute("tabindex");
        mjx.removeAttribute("ctxtmenu_counter");
        
        const svg = mjx.querySelector('svg');
        if (svg) {
            const width = svg.getAttribute("width");
            const height = svg.getAttribute("height");
            svg.removeAttribute("width");
            svg.removeAttribute("height");
            if (width) svg.style.width = width;
            if (height) svg.style.height = height;
        }
    }
    clone.querySelectorAll('style').forEach(s => s.remove());
    
    
    let cloneHtml = clone.innerHTML;
    // Replace <mjx-container display="true"> with <section> (Block)
    cloneHtml = cloneHtml.replace(/<mjx-container([^>]*?display="true"[^>]*?)>([\s\S]*?)<\/mjx-container>/g, "<section $1>$2</section>");
    // Replace remaining <mjx-container> with <span> (Inline)
    cloneHtml = cloneHtml.replace(/<mjx-container([^>]*?)>([\s\S]*?)<\/mjx-container>/g, "<span $1>$2</span>");
    
    // Padding spaces for inline elements to avoid WeChat crowding bugs
    cloneHtml = cloneHtml.replace(/\s<span class="MathJax"/g, '&nbsp;<span class="MathJax"');
    cloneHtml = cloneHtml.replace(/svg><\/span>\s/g, "svg></span>&nbsp;");
    
    // Explicit borders for fractional strokes and tables
    cloneHtml = cloneHtml.replace(/class="mjx-solid"/g, 'fill="none" stroke-width="70"');
    
    // Strip MathML hidden assistive tags that pollute WeChat copy 
    cloneHtml = cloneHtml.replace(/<mjx-assistive-mml[\s\S]*?<\/mjx-assistive-mml>/g, "");
    
    clone.innerHTML = cloneHtml;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(clone);
  selection?.removeAllRanges();
  selection?.addRange(range);
  
  try {
    const platName = platform === 'wechat' ? '微信' : (platform === 'zhihu' ? '知乎' : (platform === 'weibo' ? '微博' : (platform === 'twitter' ? 'X (Twitter)' : '云端')));
    
    // Check if the Extension bridge is listening. If yes, pass raw payloads via IPC.
    // If not, it falls back instantly to the old behavior (just copying).
    if (isCoseInstalled.value) {
        window.postMessage({
            type: 'OCTOPUS_EMIT_SYNC',
            payload: {
                target: platform,
                html: clone.innerHTML,
                markdown: content.value,
                meta: {
                    title: content.value.split('\n')[0].replace(/^[#\s]+/, '').trim() || "Untitled Octopus Draft",
                    tags: ["Markdown", "Octopus"]
                }
            }
        }, '*');
    }
  
    document.execCommand('copy');
    if (isCoseInstalled.value) {
        showToast(`🚀 已存入剪贴板！正由 COSE 扩展接管前往【${platName}】并尝试自动注入...`, "success");
    } else {
        showToast(`✅ 已入板！请直接去【${platName}】粘贴以完成发布。(推荐安装 COSE 扩展实现全自动)`, "success");
    }
  } catch (e) {
    customAlert("获取剪贴板权限失败，请确保您在 HTTPS 环境下或检查浏览器设置。");
  }
  
  selection?.removeAllRanges();
  document.body.removeChild(clone);
};

const isExporting = ref(false);
const isCoseInstalled = ref(false);

onMounted(() => {

  document.addEventListener('click', (e) => {
    isAiMenuOpen.value = false;
  });

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'OCTOPUS_COSE_INSTALLED') {
      isCoseInstalled.value = true;
      console.log('✅ Octopus COSE Extension detected: v' + event.data.version);
    }
  });
});

const printPdf = () => {
  window.setTimeout(() => window.print(), 100);
};

const viewMode = ref<'pc' | 'mobile'>('pc');

const setViewMode = (mode: 'pc' | 'mobile') => {
  viewMode.value = mode;
  leftWidth.value = mode === 'mobile' ? 60 : 50;
};
const importMd = async () => {
  if (isDesktop.value && (window as any).electronAPI && (window as any).electronAPI.readFile) {
    try {
       // Dummy default for graceful fallback if user hasn't explicitly patched electronAPI yet
       const result = await (window as any).electronAPI.readFile();
       if (result && result.content) {
         content.value = result.content;
         showToast("✅ 已成功载入本地 Markdown 文件", "success");
       }
    } catch(e: any) {
       customAlert("❌ 读取失败: " + e.message);
    }
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md, .txt, .docx';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (file.name.endsWith('.docx')) {
         if ((window as any).mammoth) {
            try {
              const arrayBuffer = await file.arrayBuffer();
              const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
              let htmlStr = result.value;
              if ((window as any).TurndownService) {
                  const turndownService = new (window as any).TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
                  content.value = turndownService.turndown(htmlStr);
                  showToast("✅ 已通过 Mammoth 引擎完美解析导入 Word (.docx) 排版！", "success");
              } else {
                  customAlert("缺少 Turndown 解析库，无法转换 DOM。");
              }
            } catch(docxErr) {
               customAlert("Word 文档解析失败: " + String(docxErr));
            }
         } else {
            customAlert("缺少 Mammoth DOCX 核心模块，请刷新页面检查 CDN 网络。");
         }
      } else {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          content.value = e.target.result;
          showToast("✅ SaaS云通道：成功解析导入 Markdown 文档", "success");
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
};

// Phase 19: Multidimensional Export Pipeline
const exportFile = (type: 'md' | 'html' | 'json') => {
  let output = '';
  let filename = 'document.' + type;
  let mimeType = 'text/plain';

  if (type === 'md') {
    output = content.value;
  } else if (type === 'html') {
    const rawHtml = document.getElementById('nice')?.innerHTML || '';
    output = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Octopus Export</title><style>body { font-family: sans-serif; padding: 20px; }

:deep(.cm-scroller) {
  padding-top: 4px !important;
}
:deep(.cm-content) {
  padding-top: 4px !important;
}
  


:deep(.cm-wrapper) { margin-top: 0 !important; }
.editor-main-area { padding-top: 0 !important; margin-top: 0 !important; }


/* =========================================================
   ULTIMATE LAYOUT GAP FIXES (APPENDED LAST TO WIN SPECIFICITY)
   ========================================================= */
.formatting-toolbar {
  margin: 0 !important;
  margin-bottom: 0 !important;
  border-bottom: 0 !important;
}

.workspace {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

.toc-header {
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  padding: 0 12px !important;
  line-height: 32px !important;
}

/* CodeMirror explicit padding reset to fix false-gap illusion on right side */
:deep(.cm-scroller),
:deep(.cm-content) {
  padding-top: 4px !important;
  margin-top: 0 !important;
}

/* Kill any rogue header spacers */
.header-spacer {
  display: none !important;
  height: 0 !important;
}





/* Wipe out margin-top and padding-top on the first element in the mobile preview using :deep() */
.preview-content-wrapper :deep(*) {
  /* We apply a generic first-child reset deep down */
}
:deep(.preview-content) > *:first-child),
:deep(.preview-content) > section:first-child > *:first-child),
:deep(#rich_media_content > *:first-child) {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

/* Ensure the markdown-body itself has no margin/padding at the top */
:deep(.preview-content)) {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

/* Also kill the padding inside the wrapper itself entirely on top */
.preview-content-wrapper {
  padding-top: 0 !important;
  margin-top: 0 !important;
}

\n\/* BRUTAL MOBILE GAP RESET *\/\n.preview-content-wrapper :deep(*) {\n  margin-top: 0 !important;\n  padding-top: 0 !important;\n}\n.preview-content-wrapper :deep(h1), .preview-content-wrapper :deep(h2), .preview-content-wrapper :deep(p) {\n  margin-top: 1em;\n}\n.preview-content-wrapper :deep(*:first-child) {\n  margin-top: 0 !important;\n  padding-top: 0 !important;\n}\n.preview-content-wrapper :deep(#rich_media_content) {\n  padding-top: 0 !important;\n}\n\/* Re-enable normal spacing for sibling text blocks *\/\n.preview-content-wrapper :deep(* + h1), .preview-content-wrapper :deep(* + h2) { margin-top: 1.5em !important; }\n.preview-content-wrapper .preview-content :deep(> h1:first-of-type), .preview-content-wrapper .preview-content :deep(> div:first-child > h1:first-of-type), .preview-content-wrapper :deep(#rich_media_content > h1:first-of-type), .preview-content-wrapper :deep(#rich_media_content > section > h1:first-of-type) { margin-top: 0 !important; padding-top: 0 !important; }\n\n\/* SCORCHED EARTH MOBILE TOP RESET *\/\n.preview-content-wrapper .preview-content :deep(> *:first-child),\n.preview-content-wrapper .preview-content :deep(> section:first-child),\n.preview-content-wrapper .preview-content :deep(#rich_media_content > *:first-child),\n.preview-content-wrapper .preview-content :deep(#rich_media_content > section:first-child > *:first-child) {\n  margin-top: 0 !important;\n  padding-top: 0 !important;\n}\n\/* Target WeChat specific wrappers *\/\n.preview-content-wrapper :deep(#js_article),\n.preview-content-wrapper :deep(#rich_media_content) {\n  padding-top: 0 !important;\n  margin-top: 0 !important;\n}\n\/* Target empty paragraphs if markdown injects them *\/\n.preview-content-wrapper :deep(p:empty:first-child) {\n  display: none !important;\n}\n.preview-content-wrapper :deep(.rich_media_area_primary) {\n  padding-top: 0 !important;\n}\n</style></head><body>${rawHtml}</body></html>`;
    mimeType = 'text/html';
  } else if (type === 'json') {
    const rawHtml = document.getElementById('nice')?.innerHTML || '';
    output = JSON.stringify({ 
       title: "Octopus Export", 
       timestamp: Date.now(),
       content: content.value, 
       html: rawHtml 
    }, null, 2);
    mimeType = 'application/json';
  }

  const blob = new Blob([output], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ SaaS云通道：成功导出为 .${type}`);
};

const exportMd = async () => {
  if (isDesktop.value && (window as any).electronAPI && (window as any).electronAPI.writeFile) {
    try {
      await (window as any).electronAPI.writeFile('./export.md', content.value, 'utf-8');
      showToast("✅ 原生通道写入完毕，已保存为 export.md", "success");
    } catch(e: any) {
      customAlert("保存失败: " + e.message);
    }
  } else {
    const blob = new Blob([content.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast("✅ Markdown 源码文件下载成功", "success");
  }
};

const togglePreviewMode = () => {
  isZenMode.value = !isZenMode.value;
  showToast(isZenMode.value ? "已进入全屏沉浸编辑模式" : "已退出全屏模式", "success");
  if (isZenMode.value && viewMode.value === 'mobile') {
    setViewMode('pc');
  }
};

// Scroll Synchronization Logic
let syncEditorTimeout: any;
let syncPreviewTimeout: any;
let isSyncingEditor = false;
let isSyncingPreview = false;

const findHeadingElementInPreview = (text: string, level: number, container: HTMLElement) => {
  const normalized = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const headings = container.querySelectorAll(`h1, h2, h3, h4, h5, h6`);
  for (let i = 0; i < headings.length; i++) {
    const el = headings[i] as HTMLElement;
    if (level && Number(el.tagName.charAt(1)) !== level) continue;
    const hText = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (hText === normalized || hText.includes(normalized) || normalized.includes(hText)) {
      return el;
    }
  }
  return null;
};

const executeSyncMath = (source: HTMLElement, target: HTMLElement, isSrcEditor: boolean) => {
  const sourceScrollable = source.scrollHeight - source.clientHeight;
  const targetScrollable = target.scrollHeight - target.clientHeight;
  
  if (sourceScrollable <= 0 || targetScrollable <= 0) return;

  // Utilize AST Semantic Interpolation if both containers and view are ready
  if (view.value && tocList.value.length > 0) {
    try {
      const anchors: { eTop: number, pTop: number }[] = [{ eTop: 0, pTop: 0 }];
      const doc = view.value.state.doc;
      
      tocList.value.forEach(item => {
        const el = findHeadingElementInPreview(item.text, item.level, isSrcEditor ? target : source);
        if (el) {
          try {
            const ePos = doc.line(item.line).from;
            const eTop = view.value.lineBlockAt(ePos).top;
            const pTop = Math.max(0, el.offsetTop - 40); // 40px visual margin
            anchors.push({ eTop, pTop });
          } catch(e) {}
        }
      });
      
      anchors.push({ eTop: sourceScrollable + (isSrcEditor ? 0 : 0), pTop: targetScrollable }); // Absolute ends
      anchors.sort((a,b) => isSrcEditor ? a.eTop - b.eTop : a.pTop - b.pTop);
      
      const scrollVal = source.scrollTop;
      let prev = anchors[0];
      let next = anchors[anchors.length - 1];
      
      for (let i = 0; i < anchors.length; i++) {
        const val = isSrcEditor ? anchors[i].eTop : anchors[i].pTop;
        if (val > scrollVal) {
            next = anchors[i];
            prev = i > 0 ? anchors[i-1] : anchors[0];
            break;
        }
        prev = anchors[i];
      }
      
      if (prev !== next) {
        const rangeSrc = isSrcEditor ? (next.eTop - prev.eTop) : (next.pTop - prev.pTop);
        const rangeTarget = isSrcEditor ? (next.pTop - prev.pTop) : (next.eTop - prev.eTop);
        
        if (rangeSrc > 0) {
          const ratio = (scrollVal - (isSrcEditor ? prev.eTop : prev.pTop)) / rangeSrc;
          target.scrollTop = (isSrcEditor ? prev.pTop : prev.eTop) + ratio * rangeTarget;
          return;
        }
      }
    } catch (e) {
      console.warn("Interpolative scrolling skipped", e);
    }
  }
  
  // Fallback to purely proportional mapping
  const percentage = source.scrollTop / sourceScrollable;
  target.scrollTop = percentage * targetScrollable;
};

const exportImage = async () => {
  if (!previewContainer.value) return;
  try {
    isExporting.value = true;
    showToast("正在拼合超清长图，这可能需要几秒钟...", "info");
    
    // TEMPORARY FIX: Switch to PC view so Mobile Notch/Borders are not exported!
    const wasMobile = viewMode.value === 'mobile';
    if (wasMobile) {
      viewMode.value = 'pc';
    }
    
    // Allow Vue to render the overlay and the PC view
    await new Promise(r => setTimeout(r, 200));

    const contentNode = previewContainer.value.querySelector('.preview-content') as HTMLElement;
    if (!contentNode) throw new Error("无法定位预览区域内容");

    const dataUrl = await htmlToImage.toPng(contentNode, { 
      backgroundColor: 'var(--bg-preview)',
      pixelRatio: 2, // Retina resolution
      style: {
        transform: 'none',
        height: contentNode.scrollHeight + 'px',
        width: '850px', // Standard comfortable reading width for long images
        padding: '40px',
        margin: '0',
        borderRadius: '0',
        boxShadow: 'none',
        border: 'none',
        maxWidth: 'none'
      }
    });

    if (wasMobile) {
      viewMode.value = 'mobile'; // Restore the phone shell immediately after capture
    }

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

// CodeMirror dynamic theme management
const isDarkMode = ref(false);

onMounted(() => {
  if (typeof document !== 'undefined') {
    isDarkMode.value = document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => {
      isDarkMode.value = document.documentElement.classList.contains('dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
});

const extensions = computed(() => {
  const exts: any[] = [
    markdown(), 
    EditorView.domEventHandlers({
      paste(event: ClipboardEvent, view: EditorView) {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                handleFileUpload(file, view, view.state.selection.main.head);
                event.preventDefault();
                return true;
              }
            }
          }
        }
        return false;
      },
      drop(event: DragEvent, view: EditorView) {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos !== null) {
              handleFileUpload(file, view, pos);
              event.preventDefault();
              return true;
            }
          }
        }
        return false;
      }
    })
  ];
  
  if (isDarkMode.value) {
    exts.push(oneDark);
  }
  
  return exts;
});
const view = shallowRef();
const handleReady = (payload: any) => { 
  view.value = payload.view; 
  
  const cmScroll = payload.view.scrollDOM;
  const preview = previewContainer.value;
  if (!cmScroll || !preview) return;

  cmScroll.addEventListener('scroll', () => {
    // If the scroll was triggered programmatically by the preview pane
    if (isSyncingPreview) return;
    
    // Set lock indicating Editor is actively driving the scroll
    isSyncingEditor = true;
    clearTimeout(syncEditorTimeout);
    syncEditorTimeout = setTimeout(() => { isSyncingEditor = false; }, 50);
    
    // Process Editor -> Preview Semantic Translation
    executeSyncMath(cmScroll, preview, true);
    
    // Mobile Preview Scroll Sync: sync iPhone frame's inner wrapper
    if (viewMode.value === 'mobile') {
      const mobileWrapper = preview.querySelector('.preview-content-wrapper') as HTMLElement;
      if (mobileWrapper) {
        const srcPct = cmScroll.scrollTop / Math.max(1, cmScroll.scrollHeight - cmScroll.clientHeight);
        mobileWrapper.scrollTop = srcPct * (mobileWrapper.scrollHeight - mobileWrapper.clientHeight);
      }
    }
  });
  
  preview.addEventListener('scroll', () => {
    // If the scroll was triggered programmatically by the editor pane
    if (isSyncingEditor) return;
    
    // Set lock indicating Preview is actively driving the scroll
    isSyncingPreview = true;
    clearTimeout(syncPreviewTimeout);
    syncPreviewTimeout = setTimeout(() => { isSyncingPreview = false; }, 50);
    
    // Process Preview -> Editor Semantic Translation
    executeSyncMath(preview, cmScroll, false);
  });
};

// Formatting Toolbar Logic


// ═══ Multi-Select Distribution System ═══
const selectedPlatforms = ref<string[]>([]);
const togglePlatformSelection = (platform: string) => {
  const idx = selectedPlatforms.value.indexOf(platform);
  if (idx > -1) {
    selectedPlatforms.value.splice(idx, 1);
  } else {
    selectedPlatforms.value.push(platform);
  }
};

const platformLabels: Record<string, string> = {
  wechat: '微信公众号',
  zhihu: '知乎',
  juejin: '稀土掘金',
  csdn: 'CSDN',
  twitter: 'X (Twitter)',
  weibo: '微博'
};
const syncQueue = ref<{platform: string, status: 'pending' | 'done'}[]>([]);

const distributeToSelectedPlatforms = async () => {
  if (selectedPlatforms.value.length === 0) {
    showToast('请至少选择一个分发平台', 'info');
    return;
  }
  
  if (isCoseInstalled.value) {
    for (const platform of selectedPlatforms.value) {
      syncToPlatform(platform as any);
      await new Promise(r => setTimeout(r, 600)); 
    }
    toggleMenu('');
    showToast('一键分发指令已触发完成！', 'success');
  } else {
    // 降级模式：预先拷入基础剪贴板并直接全开所有窗口
    copyHtml('wechat');
    const urls: Record<string, string> = {
      wechat: 'https://mp.weixin.qq.com/',
      zhihu: 'https://zhuanlan.zhihu.com/write',
      juejin: 'https://juejin.cn/editor/drafts/new',
      csdn: 'https://editor.csdn.net/md/',
      twitter: 'https://twitter.com/compose/tweet',
      weibo: 'https://weibo.com/'
    };
    
    let blockedPopups = false;
    for (const p of selectedPlatforms.value) {
      if (urls[p]) {
        const newWindow = window.open(urls[p], '_blank');
        if (!newWindow) blockedPopups = true;
      }
    }
    
    toggleMenu('');
    if (blockedPopups) {
      showToast('⚠️ 浏览器弹窗拦截：为实现真正一键多发，请点击地址栏右侧图标“始终允许弹窗”！', 'error');
    } else {
      showToast('富文本已拷贝至剪贴板，平台窗口已打开就绪！', 'success');
    }
  }
};

const executeManualSync = (platform: string) => {
  syncToPlatform(platform as any);
  const q = syncQueue.value.find(item => item.platform === platform);
  if (q) q.status = 'done';
};

// ═══ Global Keyboard Shortcuts ═══
const handleGlobalKeydown = (e: KeyboardEvent) => {
  const ctrl = e.ctrlKey || e.metaKey;
  const alt = e.altKey;
  const key = e.key.toLowerCase();

  if (!ctrl) return;

  // Ctrl+key shortcuts (no Alt)
  if (!alt) {
    switch (key) {
      case 'b': e.preventDefault(); insertFormat('**', '**'); break;
      case 'i': e.preventDefault(); insertFormat('*', '*'); break;
      case 'd': e.preventDefault(); insertFormat('~~', '~~'); break;
      case 'k': e.preventDefault(); insertFormat('[', '](https://)'); break;
      case 'e': e.preventDefault(); insertFormat('\`', '\`'); break;
      case 'u': e.preventDefault(); insertFormat('- ', ''); break;
      case 'o': e.preventDefault(); insertFormat('1. ', ''); break;
      case 'q': e.preventDefault(); insertFormat('> ', ''); break;
      case 'h': e.preventDefault(); insertFormat('\n---\n', ''); break;
    }
  }

  // Ctrl+Alt+key shortcuts
  if (alt) {
    switch (key) {
      case 'c': e.preventDefault(); insertFormat('\n\`\`\`\n', '\n\`\`\`\n'); break;
      case 't': e.preventDefault(); insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', ''); break;
      case 'i': e.preventDefault(); insertFormat('![图片描述](', ') '); break;
      case 'd': e.preventDefault(); toggleDiagrams(); break;
      case 'f': e.preventDefault(); formatMd(); break;
    }
  }
};
onMounted(() => document.addEventListener('keydown', handleGlobalKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown));

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
    <!-- Ambient Background Glow -->
    <div class="ambient-glow" style="position: absolute; top: 0; right: 0; width: 600px; height: 600px; background: radial-gradient(circle at top right, rgba(139, 90, 43, 0.05), transparent 400px); pointer-events: none; z-index: 0;"></div>
    
    <component :is="'style'" v-if="themeStyleContent" id="dynamic-theme">{{ themeStyleContent }}</component>
    <component :is="'style'" v-if="codeThemeStyleContent" id="dynamic-code-theme">{{ codeThemeStyleContent }}</component>
    <component :is="'style'" v-if="visualOverridesCss" id="dynamic-visual-theme">{{ visualOverridesCss }}</component>
    
    <!-- Tier 1: System Menu Bar (Hidden in Zen Mode) -->
    <header class="octopus-header v1-2-header flex w-full items-center justify-between" v-show="!isZenMode" :style="{
      height: '56px', 
      background: '#ffffff',
      borderBottom: '1px solid var(--border-subtle)', 
      position: 'relative',
      zIndex: 200, 
      padding: '0 16px'
    }">
      <div class="brand-group" style="display: flex; align-items: center; gap: 16px;">
        <div class="brand" style="display: flex; align-items: center; gap: 8px;">
          <span class="material-symbols-outlined" style="color: var(--primary); font-size: 1.5rem;">edit_document</span>
          <h1 style="color: var(--text-primary); font-family: var(--font-display); font-size: 1rem; font-weight: bold; margin: 0; white-space: nowrap;">Octopus MD</h1>
        </div>
        
        <nav class="classic-menus" style="display: flex; gap: 4px; margin-left: 16px;">
          <!-- File Menu -->
          <div class="menu-item" @click.stop="toggleMenu('file')">
            文件
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'file'">
              <div class="dropdown-item" @click="importMd"><span class="shortcut">OPEN</span>导入 Markdown 文件</div>
              <div class="dropdown-item" @click="exportFile('md')"><span class="shortcut">.MD</span>导出 Markdown</div>
              <div class="dropdown-item" @click="exportFile('html')"><span class="shortcut">.HTML</span>导出 HTML</div>
              <div class="dropdown-item" @click="exportFile('json')"><span class="shortcut">.JSON</span>导出 JSON 数据</div>
              <div v-show="!isDesktop" class="dropdown-item" @click="printPdf"><span class="shortcut">PDF</span>导出 PDF（打印）</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="exportImage"><span class="shortcut">IMAGE</span>导出高清长图</div>
            </div>
          </div>
          <!-- Format Menu -->
          <div class="menu-item" @click.stop="toggleMenu('format')">
            格式
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'format'">
              <div class="dropdown-item" @click="insertFormat('**', '**')"><span class="shortcut">Ctrl B</span>加粗</div>
              <div class="dropdown-item" @click="insertFormat('*', '*')"><span class="shortcut">Ctrl I</span>斜体</div>
              <div class="dropdown-item" @click="insertFormat('~~', '~~')"><span class="shortcut">Ctrl D</span>删除线</div>
              <div class="dropdown-item" @click="insertFormat('[', '](https://)')"><span class="shortcut">Ctrl K</span>超链接</div>
              
              <div class="dropdown-item" @click="insertFormat('`', '`')"><span class="shortcut">Ctrl E</span>行内代码</div>
              <div class="dropdown-item" @click="insertFormat('\n```\n', '\n```\n')"><span class="shortcut">Ctrl+Alt+C</span>多行代码</div>
              
              <div class="dropdown-item" @click="insertFormat('<span style=&quot;color: red;&quot;>', '</span>')"><span class="shortcut"></span>文字颜色</div>

              <div class="dropdown-divider"></div>

              <div class="dropdown-item" @click="insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '')"><span class="shortcut">Ctrl+Alt+T</span>表格</div>
              <div class="dropdown-item" @click="insertFormat('![图片描述](', ') ')"><span class="shortcut">Ctrl+Alt+I</span>图片</div>

              <div class="dropdown-divider"></div>

              <div class="dropdown-item has-submenu">
                <span class="shortcut" style="font-weight: 800; opacity: 1;">›</span><span style="font-family: serif; font-weight: 900; margin-right: 8px;">H₁</span>标题
                <div class="submenu">
                  <div class="dropdown-item" @click="insertFormat('# ', '')">H1 一级标题</div>
                  <div class="dropdown-item" @click="insertFormat('## ', '')">H2 二级标题</div>
                  <div class="dropdown-item" @click="insertFormat('### ', '')">H3 三级标题</div>
                  <div class="dropdown-item" @click="insertFormat('#### ', '')">H4 四级标题</div>
                  <div class="dropdown-item" @click="insertFormat('##### ', '')">H5 五级标题</div>
                  <div class="dropdown-item" @click="insertFormat('###### ', '')">H6 六级标题</div>
                </div>
              </div>
              <div class="dropdown-item" @click="insertFormat('- ', '')"><span class="shortcut">Ctrl U</span>无序列表</div>
              <div class="dropdown-item" @click="insertFormat('1. ', '')"><span class="shortcut">Ctrl O</span>有序列表</div>
              <div class="dropdown-item" @click="insertFormat('> ', '')"><span class="shortcut">Ctrl Q</span>引用块</div>
              <div class="dropdown-item" @click="insertFormat('\n---\n', '')"><span class="shortcut">Ctrl H</span>分割线</div>
              <div class="dropdown-item" @click="insertFormat('- [ ] ', '')"><span class="shortcut">TODO</span>待办列表</div>

              <div class="dropdown-divider"></div>

              <div class="dropdown-item" @click="toggleLinkFootnote"><span class="shortcut"></span>外链转脚注</div>
              <div class="dropdown-item" @click="toggleReferences">
                <span class="check-icon">{{ showReferences ? '✅' : '　' }}</span>显示参考资料
              </div>
              <div class="dropdown-item" @click="toggleDiagrams">
                <span class="shortcut">Ctrl+Alt+D</span><span class="check-icon">{{ showDiagrams ? '✅' : '　' }}</span>显示图解
              </div>
              <div class="dropdown-item" @click="formatMd"><span class="shortcut">Ctrl+Alt+F</span>格式化 Markdown</div>
              
              <div class="dropdown-item" @click="showModal('字数与解析估算', `当前正文包含 ${(content || '').length} 个字符数。预计阅读时间约为 ${Math.max(1, Math.ceil((content || '').length / 300))} 分钟。`, false)">
                <span class="shortcut"></span>字数统计
              </div>
            </div>
          </div>
          <!-- Function/Insert Menu -->
          <div class="menu-item" @click.stop="toggleMenu('function')">
            功能与插入
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'function'">
              <div class="dropdown-item" @click="convertClipboardHtmlToMd"><span class="shortcut">PASTE</span>粘贴富文本转 Markdown</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="insertFormat('{注音|Ruby语法}', '')"><span class="shortcut">Ruby</span>插入注音（Ruby）</div>
              <div class="dropdown-item" @click="insertFormat('\n\n<section style=&quot;display:flex; padding:15px; border-radius:10px; background:#f8f9fa; border:1px solid #e9ecef; align-items:center; margin:20px 0;&quot;><img src=&quot;https://api.dicebear.com/7.x/bottts/svg?seed=Octopus&quot; style=&quot;width:60px; height:60px; border-radius:50%; margin-right:15px;&quot;/><div><h3 style=&quot;margin:0 0 5px 0; color:#343a40;&quot;>这里是公众号名字</h3><p style=&quot;margin:0; font-size:13px; color:#6c757d;&quot;>欢迎关注我的公众号，每天分享最前沿硬核的极客技术与排版黑魔法！</p></div></section>\n\n', '')"><span class="shortcut">CARD</span>插入公众号名片</div>
            </div>
          </div>
          <!-- View Menu -->
          <div class="menu-item" @click.stop="toggleMenu('view')">
            查看
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'view'">
              <div class="dropdown-item" @click="viewMode = 'pc'">
                <span class="shortcut">宽屏 PC 布局</span><span class="check-icon" style="margin-left: 8px;">{{ viewMode === 'pc' ? '■' : '　' }}</span>PC 宽屏视图
              </div>
              <div class="dropdown-item" @click="viewMode = 'mobile'">
                <span class="shortcut">iPhone 布局</span><span class="check-icon" style="margin-left: 8px;">{{ viewMode === 'mobile' ? '■' : '　' }}</span>手机预览视图
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="togglePreviewMode"><span class="shortcut">F11 ZEN</span>{{ isZenMode ? '退出沉浸模式' : '进入沉浸模式' }}</div>
              <div class="dropdown-item" @click="toggleMacCodeBlock"><span class="shortcut">MAC</span>{{ isMacCodeBlock ? '卸载' : '部署' }} Mac 风格代码块</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="loadDraftsHistory"><span class="shortcut">HISTORY</span>历史草稿管理</div>
            </div>
          </div>
          <!-- Settings Menu -->
          <div class="menu-item" @click.stop="toggleMenu('settings')">
            设置
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'settings'">
              <div class="dropdown-item" @click="isImageConfigVisible = true; activeMenu = null"><span class="shortcut">HOST</span>图床配置</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="resetEditor"><span class="shortcut">RESET</span>重置编辑器</div>
            </div>
          </div>
          <!-- Help Menu -->
          <div class="menu-item" @click.stop="toggleMenu('help')">
            帮助
            <div class="dropdown-menu dropdown-menu-large" v-show="activeMenu === 'help'">
              <div class="dropdown-item" @click="notImpl"><span class="shortcut">LOG</span>更新日志</div>
              <div class="dropdown-item" @click="notImpl"><span class="shortcut">KEYS</span>快捷键一览</div>
              <div class="dropdown-item" @click="showAbout"><span class="shortcut">INFO</span>关于 Octopus MD</div>
            </div>
          </div>
        </nav>
      </div>

      <!-- Hidden file input for image uploads (used by Action Rail) -->
      <input type="file" ref="fileInput" @change="handleFileSelected" accept="image/*" style="display: none" />

      <div class="actions" style="display: flex; align-items: center; gap: 16px;">
        <div class="view-toggles-pill" style="display: flex; background: rgba(0,0,0,0.04); padding: 4px; border-radius: var(--radius-md);">
            <button class="pill-btn" :class="{active: viewMode === 'pc'}" @click="setViewMode('pc')" style="background: transparent; border: none; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 12px; display: flex; align-items: center; gap: 4px; transition: all 0.2s; color: var(--text-secondary);">
              PC版式
            </button>
            <button class="pill-btn" :class="{active: viewMode === 'mobile'}" @click="setViewMode('mobile')" style="background: transparent; border: none; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 12px; display: flex; align-items: center; gap: 4px; transition: all 0.2s; color: var(--text-secondary);">
              手机预览
            </button>
        </div>



        <button @click="isEditingTheme = !isEditingTheme; activeMenu = null" style="display: flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: var(--radius-md); background: rgba(139, 90, 43, 0.1); border: 1px solid rgba(139, 90, 43, 0.3); color: var(--primary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
          <span class="material-symbols-outlined" style="font-size: 18px;">code_blocks</span>
          <span>排版中心</span>
        </button>
      </div>
    </header>

    <!-- Tier 2: Formatting Toolbar (Floats dynamically or Pins in Zen Mode) -->
    <div class="formatting-toolbar" :class="{ 'is-zen-floating': isZenMode && !isZenToolbarPinned }" :style="isZenMode && !isZenToolbarPinned ? { left: zenX + 'px', top: zenY + 'px', position: 'fixed', zIndex: 2000, margin: 0, width: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', cursor: 'move', userSelect: 'none', borderRadius: '12px', padding: '0', flexDirection: 'column', background: 'var(--bg-panel)' } : (isZenMode && isZenToolbarPinned ? { position: 'static', width: '100%', margin: 0, borderRadius: 0, padding: 0, boxShadow: 'var(--shadow-subtle)', background: 'var(--bg-panel)' } : { padding: 0, height: 'auto', background: 'var(--bg-panel)' })" @mousedown.prevent="isZenMode && !isZenToolbarPinned ? startZenDrag($event) : null">
      
      <!-- Zen Mode Drag Handle -->
      <div v-if="isZenMode" class="zen-toolbar-handle" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(59, 130, 246, 0.08); border-bottom: 1px solid var(--border-subtle); border-radius: 12px 12px 0 0;" :style="isZenToolbarPinned ? { cursor: 'default' } : {}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
          <span style="font-size: 0.85rem; font-weight: bold; color: var(--text-primary); letter-spacing: 0.5px;">排版工具列</span>
        </div>
        <div style="display: flex; gap: 6px;">
           <button class="icon-btn" @click.stop="isZenToolbarPinned = !isZenToolbarPinned" style="width: 24px; height: 24px; border-radius: 4px; padding: 0; font-size: 0.9rem;" :title="isZenToolbarPinned ? '取消固定并允许悬浮' : '钉在网页顶部'">{{ isZenToolbarPinned ? '📌' : '📍' }}</button>
           <button class="icon-btn" @click.stop="isZenToolbarExpanded = !isZenToolbarExpanded" style="width: 24px; height: 24px; border-radius: 4px; padding: 0;" title="折叠/展开">{{ isZenToolbarExpanded ? '一' : '＋' }}</button>
           <button class="icon-btn" @click.stop="togglePreviewMode" style="width: 24px; height: 24px; border-radius: 4px; padding: 0; color: #ef4444;" title="退出全屏">✖</button>
        </div>
      </div>

      <div class="format-actions" v-show="!isZenMode || isZenToolbarExpanded" @mousedown.stop :style="isZenMode ? { padding: '10px 16px', gap: '8px', cursor: 'default' } : {}">
        <button class="icon-btn" title="侧边大纲导航" @click="showToc = !showToc" :style="{ color: showToc ? 'var(--accent-color)' : '', background: showToc ? 'rgba(56, 189, 248, 0.1)' : '' }"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
        <div class="toolbar-divider"></div>
        <button class="icon-btn" title="删除线" @click="insertFormat('~~', '~~')"><span style="text-decoration: line-through; font-weight: bold; font-family: sans-serif;">S</span></button>
        <button class="icon-btn" title="加粗" @click="insertFormat('**', '**')"><strong style="font-family: serif; font-size: 1.1rem;">B</strong></button>
        <button class="icon-btn" title="倾斜" @click="insertFormat('*', '*')"><em style="font-family: serif; font-size: 1.1rem; font-weight: bold;">I</em></button>
        <button class="icon-btn" title="代码块" @click="insertFormat('\n```\n', '\n```\n')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round"><polyline points="4 8 10 12 4 16"></polyline><line x1="12" y1="18" x2="20" y2="18"></line></svg></button>
        <button class="icon-btn" title="行内代码" @click="insertFormat('`', '`')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline><line x1="14" y1="4" x2="10" y2="20"></line></svg></button>
        <button class="icon-btn" title="链接" @click="insertFormat('[', '](https://)')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>
        <button class="icon-btn" title="表格" @click="insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '')"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg></button>
        <button class="icon-btn" title="上传/插入图片" @click="triggerImageUpload"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
        <button class="icon-btn" title="引用" @click="insertFormat('\n> ', '')" style="font-weight: 800; font-size: 1.2rem; line-height: 1; font-family: Times, serif;">"</button>
        <button class="icon-btn" title="格式化排版" @click="formatMd"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg></button>
        
        <div class="toolbar-divider"></div>
        <button class="icon-btn" title="配置服务器或图床" @click="isImageConfigVisible = true; activeMenu = null"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></button>
        <button class="icon-btn" title="微信外链转引用" @click="toggleLinkFootnote"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span style="position: absolute; font-size: 9px; right: -2px; bottom: -2px; font-weight: bold; background: var(--bg-hover); border-radius: 4px; padding: 0 3px;">WX</span></button>
      </div>
    </div>


    <transition name="slide-up">
    <div v-if="hasExternalLinks && showLinkWarning" class="smart-link-palette">
      <div class="smart-link-header" @click="isLinkRadarExpanded = !isLinkRadarExpanded" style="cursor: pointer; user-select: none;">
        <div class="smart-title">
          <div class="smart-icon-box pulse-warning">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <span>外链探测雷达</span>
          <span class="smart-badge badge-warn">{{ externalLinks.length }} 个发现 (点击{{ isLinkRadarExpanded ? '收起' : '展开详情' }})</span>
        </div>
        <div class="smart-actions">
          <button class="smart-btn-primary" @click.stop="toggleLinkFootnote(); showLinkWarning = false">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            一键转为脚注
          </button>
          <button class="smart-btn-icon" @click.stop="showLinkWarning = false" title="忽略警告">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      <transition name="slide-up">
      <div v-show="isLinkRadarExpanded" v-if="externalLinks.length > 0" class="smart-locator-glass">
        <div class="locator-info-block" @click="jumpToExtLine('current')" title="点击传送至源码处">
           <div class="locator-top-meta">
             <span class="locator-line-tag">Line {{ externalLinks[activeExtLinkIdx].line }}</span>
             <span class="locator-anchor-text">{{ externalLinks[activeExtLinkIdx].text }}</span>
           </div>
           <div class="locator-url-track">{{ externalLinks[activeExtLinkIdx].url }}</div>
        </div>
        
        <div class="locator-nav-controls">
           <button class="locator-nav-btn" @click="jumpToExtLine('prev')" title="上一个冲突项">
             <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
           </button>
           <span class="locator-counter-text">{{ activeExtLinkIdx + 1 }}/{{ externalLinks.length }}</span>
           <button class="locator-nav-btn" @click="jumpToExtLine('next')" title="下一个冲突项">
             <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
           </button>
        </div>
      </div>
      </transition>
    </div>
    </transition>

    <main class="workspace" :class="{ 'is-dragging': isDragging }" :style="isZenMode && !isZenToolbarPinned ? { height: '100vh', paddingTop: '0' } : {}">
      <div class="editor-pane" :style="{ width: isEditingTheme ? '33.333%' : (leftWidth + '%') }">
        <div class="editor-main-area" style="display: flex; flex: 1; flex-direction: row; min-height: 0; min-width: 0; width: 100%;">
        
        <div v-show="showToc" class="toc-panel">
          <div class="toc-header">
            <span>导航目录</span>
            <button class="icon-btn" style="width: 24px; height: 24px; font-size: 0.7rem;" @click="showToc = false">✕</button>
          </div>
          <div class="toc-content">
            <div 
              v-for="(item, idx) in tocList" 
              :key="idx" 
              class="toc-item" 
              :class="'toc-level-' + item.level"
              @click="scrollToLine(item.line)">
              {{ item.text }}
            </div>
            <div v-if="tocList.length === 0" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
              暂无 1~2 级标题
            </div>
          </div>
        </div>

        <div class="cm-wrapper" style="flex: 1; min-width: 0;">
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
        <!-- v1.2 Editor Footer Bar -->
        </div>
        <div style="height: 32px; border-top: 1px solid var(--border-subtle); background: #f8fafc; display: flex; align-items: center; padding: 0 16px; justify-content: flex-end; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em;">字符数: {{ content.length }}</span>
            <span style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em;">行数: {{ content.split('\n').length }}</span>
            <span style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em;">估算阅读耗时: 约 {{ Math.max(1, Math.ceil(content.length / 300)) }} 分钟</span>
          </div>
        </div>
      </div>

      <!-- Draggable Splitter -->
      <div v-show="!isEditingTheme" class="resizer" @mousedown.prevent="startDrag">
        <div class="resizer-handle"></div>
      </div>

      <div class="preview-pane" :class="{ 'is-mobile': viewMode === 'mobile' }" ref="previewContainer" :style="{ width: isEditingTheme ? '33.333%' : (100 - leftWidth + '%'), position: 'relative' }">
        
        <!-- Inject dynamic CSS raw strings explicitly into the DOM -->
        <component :is="'style'" v-if="themeStyleContent" id="markdown-theme">{{ themeStyleContent }}</component>
        <component :is="'style'" v-if="codeThemeStyleContent" id="code-theme">{{ codeThemeStyleContent }}</component>

        <!-- Mobile Layout Wrapper: Design Reference Parity -->
        <div v-if="viewMode === 'mobile'" class="mobile-preview-pane">
          <!-- Ambient Glow -->
          <div class="ambient-glow"></div>
          <!-- Centered iPhone (design ref: 390×844, radius 54, padding 12) -->
          <div class="iphone-scale-wrapper staggered-2">
            <div class="iphone-frame">
              <div class="iphone-screen">
                <!-- Authentic iOS Status Bar -->
                <div class="ios-status-bar" style="height: 48px; width: 100%; position: absolute; top: 0; left: 0; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 26px 10px 26px; box-sizing: border-box; z-index: 10; pointer-events: none; color: #000;">
                  <span style="font-size: 15px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: -0.2px;">9:41</span>
                  <!-- Dynamic Island -->
                  <div style="position: absolute; left: 50%; top: 11px; transform: translateX(-50%); width: 120px; height: 35px; background: #000; border-radius: 20px;"></div>
                  <!-- Right Icons -->
                  <div style="display: flex; gap: 6px; align-items: center; padding-bottom: 2px;">
                    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><path d="M17 3.5C17 2.67157 16.3284 2 15.5 2C15.5 2 14 2 14 2V9C14 9 15.5 9 15.5 9C16.3284 9 17 8.32843 17 7.5V3.5Z"/><rect x="0.5" y="0.5" width="12" height="10" rx="2.5" stroke="currentColor" fill="transparent"/><rect x="2" y="2" width="9" height="7" rx="1" fill="currentColor"/></svg>
                  </div>
                </div>
                <div class="preview-content-wrapper" style="width: 100%; height: 100%; overflow-y: auto; padding: 56px 16px 16px 16px; box-sizing: border-box; font-family: 'Noto Serif SC', serif; color: #1a1a1a;">
                  <div class="preview-content" :class="extraCssClass" v-html="htmlOutput"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Standard wrapper for PC View -->
        <div v-else class="preview-content" :class="extraCssClass" v-html="htmlOutput"></div>
        
      </div>

      <!-- Action Rail removed: all functions available via Header menus + Distribution Pill -->

      <!-- Floating Action Buttons (v1.2 Design: FAB Rotary Menu) -->
      <div v-show="!isZenMode && !isEditingTheme" style="position: absolute; bottom: 32px; right: 32px; display: flex; flex-direction: column; gap: 16px; z-index: 1000;" class="fab-wrapper">
        
        <!-- Rotary AI Menu Container -->
        <div class="fab-container" :class="{ 'is-open': isAiMenuOpen }" @click.stop>
          
          <div class="fab-menu">
            <button class="fab-item" @click.stop="isAiMenuOpen = false; openT2IPanel()">
              <span class="fab-label">文生图</span>
              <div class="fab-icon-wrapper pic-gen">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </div>
            </button>
            <button class="fab-item" @click.stop="isAiMenuOpen = false; openAIPanel()">
              <span class="fab-label">助手</span>
              <div class="fab-icon-wrapper assistant">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
                </svg>
              </div>
            </button>
          </div>

          <button class="fab-btn ai-rotary-btn" @click.stop="isAiMenuOpen = !isAiMenuOpen" style="width: 48px; height: 48px; border-radius: 9999px; background: #ffffff; border: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; color: var(--primary); cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.05); position: relative; z-index: 1002; outline: none;">
            <span class="action-icon material-symbols-outlined" style="font-size: 24px;">auto_awesome</span>
            <div class="ai-tooltip" style="position: absolute; right: 56px; background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); padding: 6px 12px; border-radius: var(--radius-md); font-size: 13px; color: #1a1a1a; opacity: 0; pointer-events: none; transition: opacity 0.2s; white-space: nowrap; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 2px 8px rgba(0,0,0,0.05);">AI 功能集合</div>
          </button>
        </div>

        <div style="position: relative; display: flex; flex-direction: column; align-items: center;" @click.stop="toggleMenu('fabPublish')">
          <div class="dropdown-menu" style="top: auto !important; bottom: calc(100% + 16px); right: 0; left: auto; width: 340px; padding: 16px; display: flex; flex-direction: column; gap: 12px; cursor: default; transform-origin: bottom right;" v-show="activeMenu === 'fabPublish'" @click.stop>
            <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">发布到内容平台 (COSE)</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              <button v-for="p in ['wechat', 'zhihu', 'juejin', 'csdn']" :key="p"
                class="brutalist-sync-btn" 
                @click.stop="togglePlatformSelection(p)"
                :style="{ 
                  padding: '12px', border: '2px solid', borderRadius: '12px', fontWeight: '700', 
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', justifyContent: 'center', gap: '4px',
                  borderColor: selectedPlatforms.includes(p) ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                  background: selectedPlatforms.includes(p) ? 'rgba(139, 90, 43, 0.08)' : 'transparent',
                  color: selectedPlatforms.includes(p) ? 'var(--primary)' : 'var(--text-muted)'
                }">
                <img :src="`https://cdn.simpleicons.org/${p}/${ {'wechat':'07C160', 'zhihu':'0084FF', 'juejin':'1E80FF', 'csdn':'FC5531'}[p] }`" 
                     :style="{ width: '28px', height: '28px', opacity: selectedPlatforms.includes(p) ? 1 : 0.6, filter: selectedPlatforms.includes(p) ? 'none' : 'grayscale(100%)', transition: 'all 0.2s' }" />
                <span style="font-size: 13px; margin-top: 4px;">{{ platformLabels[p] }}</span>
                <span style="font-size: 10px; color: var(--primary); transition: all 0.2s" :style="{ opacity: selectedPlatforms.includes(p) ? 1 : 0 }">✓ 已选</span>
              </button>
            </div>
            
            <div v-show="!isCoseInstalled" style="background: rgba(139, 90, 43, 0.05); border-left: 3px solid var(--primary); padding: 10px 12px; border-radius: 4px; font-size: 12px; color: #8b5a2b; line-height: 1.5; margin-top: 4px;">
              <strong>⚠️ 原生轻量分发模式已开启</strong><br>
              未检测到本地特权桥接插件。发射后程序将预先拷入格式，请在各大平台页面中自行 <strong>Ctrl+V 粘贴</strong> 即可发布。
            </div>

            <button v-if="selectedPlatforms.length > 0" class="distribute-action-btn" @click="distributeToSelectedPlatforms" style="width: 100%; padding: 12px; border-radius: 10px; font-weight: 800; border: none; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(139,90,43,0.3); margin-top: 4px;">
               🚀 一键发射到所选平台 ({{selectedPlatforms.length}})
            </button>
          </div>
          
          <button class="fab-btn" :class="{ 'is-active': activeMenu === 'fabPublish' }" style="width: 48px; height: 48px; border-radius: 9999px; background: var(--primary); border: none; display: flex; align-items: center; justify-content: center; color: #ffffff; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: transform 0.2s; position: relative; z-index: 1000;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <span class="material-symbols-outlined" style="font-size: 24px;">sync</span>
            <div style="position: absolute; right: 56px; background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); padding: 6px 12px; border-radius: var(--radius-md); font-size: 13px; color: #1a1a1a; opacity: 0; pointer-events: none; transition: opacity 0.2s; white-space: nowrap; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 2px 8px rgba(0,0,0,0.05);">一键分发中心</div>
          </button>
        </div>
      </div>
      
      <!-- Tier 3 Designer Pane (Tabs: Visual / Native CSS) -->
      <div v-show="isEditingTheme && !isZenMode" class="editor-pane css-pane" style="width: 33.333%; border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; background: #faf9f7; min-height: 0; box-shadow: -10px 0 30px rgba(0,0,0,0.04); z-index: 50;">
        <!-- Panel Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid rgba(139,90,43,0.08);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 3px; height: 18px; background: var(--primary); border-radius: 2px;"></div>
            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); letter-spacing: 0.02em;">排版中心</span>
          </div>
          <button @click="isEditingTheme = false" style="width: 28px; height: 28px; border: none; background: rgba(0,0,0,0.04); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.15s; font-size: 14px;" onmouseover="this.style.background='rgba(0,0,0,0.08)'" onmouseout="this.style.background='rgba(0,0,0,0.04)'">✕</button>
        </div>
        <div class="sidebar-tabs" style="display:flex; padding: 4px 16px; gap: 4px; background: transparent;">
           <button class="s-tab" :class="{active: dsTab === 'core'}" @click="dsTab = 'core'" style="flex:1; padding:8px 0; border:none; background:transparent; color:var(--text-muted); cursor:pointer; font-weight:600; font-size: 12px; letter-spacing: 0.06em; border-radius: 6px; transition: all 0.2s;">主题排版</button>
           <button class="s-tab" :class="{active: dsTab === 'visual'}" @click="dsTab = 'visual'" style="flex:1; padding:8px 0; border:none; background:transparent; color:var(--text-muted); cursor:pointer; font-weight:600; font-size: 12px; letter-spacing: 0.06em; border-radius: 6px; transition: all 0.2s;">视觉定制</button>
           <button class="s-tab" :class="{active: dsTab === 'native'}" @click="dsTab = 'native'" style="flex:1; padding:8px 0; border:none; background:transparent; color:var(--text-muted); cursor:pointer; font-weight:600; font-size: 12px; letter-spacing: 0.06em; border-radius: 6px; transition: all 0.2s;" title="底层强制覆盖编辑">样式代码</button>
        </div>
        
        <!-- CORE: Heritage Features & Publishing Center -->
        <div v-show="dsTab === 'core'" style="flex:1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Themes & Code Block Styles -->
          <div class="brutalist-config-group">
            <h3 style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.1em;">全局排版主题</h3>
            <div style="display: flex; flex-direction: column; gap: 2px;">
               <button v-for="(t, idx) in themes" :key="t.id" 
                       @click="selectedTheme = t.id"
                       class="theme-list-item"
                       :class="{ 'is-active': selectedTheme === t.id }"
                       style="display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: none; border-radius: 6px; background: transparent; cursor: pointer; text-align: left; transition: all 0.15s; position: relative; color: var(--text-primary); width: 100%; font-family: inherit;">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); width: 20px; text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums;" :style="{ color: selectedTheme === t.id ? 'var(--primary)' : '' }">{{ String(idx + 1).padStart(2, '0') }}</span>
                  <div style="width: 1px; height: 16px; background: rgba(0,0,0,0.06); flex-shrink: 0;"></div>
                  <span style="font-weight: 500; font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" :style="{ fontWeight: selectedTheme === t.id ? '700' : '500', color: selectedTheme === t.id ? 'var(--primary)' : '' }">{{ t.name.replace(/^\\d+\\.?\\s*/, '') }}</span>
                  <svg v-if="selectedTheme === t.id" viewBox="0 0 24 24" width="14" height="14" stroke="var(--primary)" fill="none" stroke-width="3" style="flex-shrink: 0; opacity: 0.8;"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </button>
            </div>
          </div>

          <div class="brutalist-config-group">
            <h3 style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.1em;">代码高亮风格</h3>
            <select v-model="selectedCodeTheme" class="panel-select" style="width: 100%; padding: 10px 14px; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; background: #fff; font-size: 13px; font-weight: 500; color: var(--text-primary); cursor: pointer; outline: none; transition: border-color 0.2s; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>'); background-repeat: no-repeat; background-position: right 12px center;">
              <option v-for="c in codeThemes" :key="c.id" :value="c.id">{{c.name}}</option>
            </select>
          </div>

          <div class="brutalist-config-group">
            <h3 style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.1em;">正文字体</h3>
            <select v-model="documentFontFamily" class="panel-select" style="width: 100%; padding: 10px 14px; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; background: #fff; font-size: 13px; font-weight: 500; color: var(--text-primary); cursor: pointer; outline: none; transition: border-color 0.2s; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>'); background-repeat: no-repeat; background-position: right 12px center;">
              <optgroup label="开源免授权区域">
                <option value="system-sans">无衬线体 (原生黑体)</option>
                <option value="system-serif">经典衬线 (原生宋明)</option>
                <option value="notosans">思源黑体 (Noto Sans)</option>
                <option value="notoserif">思源宋体 (Noto Serif)</option>
                <option value="lxgw">霞鹜文楷 (手写黑板报)</option>
                <option value="smiley">得意黑 (Smiley Sans)</option>
                <option value="zcool">站酷小薇 (文艺优雅)</option>
                <option value="zcool_huangyou">站酷黄油体</option>
                <option value="mashanzheng">马善政毛笔体</option>
                <option value="zhimangxing">志莽行书</option>
                <option value="longcang">龙藏草书</option>
                <option value="fira">Fira Code (编程等宽)</option>
                <option value="jetbrains">JetBrains Mono</option>
              </optgroup>
              <optgroup label="⚠️ 商业版权/风险区">
                <option value="pingfang">PingFang (⚠️ 商用禁忌)</option>
                <option value="yahei">微软雅黑 (⚠️ 极高风险)</option>
                <option value="helvetica">Helvetica (⚠️ 国际版权)</option>
                <option value="times">Times New Roman</option>
              </optgroup>
            </select>
          </div>
        </div>
        
        <div v-show="dsTab === 'visual'" style="flex:1; overflow-y: auto; padding: 16px 20px;">
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0; margin-bottom: 20px; line-height: 1.5; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">无需敲击代码。在此调整以下数值即可“傻瓜式”快速覆盖底层排版系统的主流风格。（留空则维持原貌）</p>

              <!-- 视觉定制区块提取自原 Modal -->
              <div class="visual-section" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 14px 0; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.06);">整体观感</h4>
                <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                  <div class="setting-item">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">核心主色 (Primary Color)</label>
                    <div style="display: flex; gap: 8px; margin-top:6px;">
                      <input type="color" v-model="visualTheme.primaryColor" style="flex: 0 0 36px; height: 34px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; padding: 2px; cursor: pointer;" />
                      <input type="text" v-model="visualTheme.primaryColor" placeholder="#ff0080" class="setting-input" style="flex: 1; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                  </div>
                  <div class="setting-item">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">正文基础字号 & 行高</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top:6px;">
                      <input type="number" v-model="visualTheme.baseFontSize" placeholder="字号(px) 如 15" class="setting-input" style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      <input type="number" v-model="visualTheme.lineHeight" placeholder="行高 如 1.8" step="0.1" class="setting-input" style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                  </div>
                  <div class="setting-item">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">正文文字颜色</label>
                    <div style="display: flex; gap: 8px; margin-top:6px;">
                      <input type="color" v-model="visualTheme.baseColor" style="flex: 0 0 34px; height: 34px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; padding: 2px; cursor: pointer;" />
                      <input type="text" v-model="visualTheme.baseColor" placeholder="#333333" class="setting-input" style="flex: 1; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="visual-section" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 14px 0; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.06);">标题结构</h4>
                <div style="margin-bottom: 12px;">
                     <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary); display:block; margin-bottom: 6px;">全局标题对齐</label>
                     <select v-model="visualTheme.headingAlign" class="panel-select" style="width: 100%; padding: 10px 14px; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; background: #fff; color: var(--text-primary); font-size: 13px; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>'); background-repeat: no-repeat; background-position: right 12px center;">
                       <option value="">默认由主题控制</option>
                       <option value="left">左对齐 (Left)</option>
                       <option value="center">居中 (Center)</option>
                     </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                  <div class="setting-item">
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display:block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">H1(px)</label>
                    <input type="number" v-model="visualTheme.h1Size" placeholder="24" class="setting-input" style="width: 100%; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                  </div>
                  <div class="setting-item">
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display:block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">H2(px)</label>
                    <input type="number" v-model="visualTheme.h2Size" placeholder="20" class="setting-input" style="width: 100%; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                  </div>
                  <div class="setting-item">
                    <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display:block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">H3(px)</label>
                    <input type="number" v-model="visualTheme.h3Size" placeholder="18" class="setting-input" style="width: 100%; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                  </div>
                </div>
              </div>
              
              <div class="visual-section" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 14px 0; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.06);">细节组件</h4>
                <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                  <div class="setting-item">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary); display:block; margin-bottom: 6px;">段落上下外边距 (px)</label>
                    <input type="number" v-model="visualTheme.paragraphMargin" placeholder="例如: 16" class="setting-input" style="width:100%; padding:6px 8px; border:none; border-radius:0; background:var(--bg-editor); color:var(--text-primary); border-bottom: 2px solid transparent;" />
                  </div>
                  <div class="setting-item">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary); display:block; margin-bottom: 6px;">引用块左竖线颜色</label>
                    <div style="display: flex; gap: 4px;">
                       <input type="color" v-model="visualTheme.blockquoteColor" style="flex: 0 0 34px; height: 34px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; padding: 2px; cursor: pointer;" />
                       <input type="text" v-model="visualTheme.blockquoteColor" placeholder="#cccccc" class="setting-input" style="flex: 1; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                  </div>
                  <div class="setting-item">
                    <label style="font-weight: 600; font-size: 12px; color: var(--text-secondary); display:block; margin-bottom: 6px;">引用块主体背景色</label>
                    <div style="display: flex; gap: 4px;">
                       <input type="color" v-model="visualTheme.blockquoteBg" style="flex: 0 0 34px; height: 34px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; padding: 2px; cursor: pointer;" />
                       <input type="text" v-model="visualTheme.blockquoteBg" placeholder="如 rgba(0,0,0,0.05)" class="setting-input" style="flex: 1; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: #fff; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div style="text-align: right; margin-top: 10px;">
                <button style="background: transparent; color: var(--text-muted); border: 1px solid rgba(0,0,0,0.08); padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; width: 100%; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;" @click="clearVisualTheme" onmouseover="this.style.borderColor='rgba(239,68,68,0.3)';this.style.color='#ef4444'" onmouseout="this.style.borderColor='rgba(0,0,0,0.08)';this.style.color='var(--text-muted)'"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>重置为主题默认值</button>
              </div>
        </div>

        <!-- USER Editable Current Theme Layer -->
        <Codemirror v-show="dsTab === 'native'" v-model="themeStyleContent" :extensions="[oneDark]" style="flex: 1; overflow: auto;" />
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
    </main>

    <!-- Global Modal Container -->
      <transition name="fade">
        <div v-if="modalState.visible || isImageConfigVisible || isSyncModalVisible || isVisualConfigVisible" class="export-overlay" @click.self="isImageConfigVisible = false; isSyncModalVisible = false; isVisualConfigVisible = false; clsoeModal(false)">
          <!-- General Dialog -->
          <div v-if="modalState.visible" class="export-modal custom-modal">
            <h3 style="margin-top:0;">{{ modalState.title }}</h3>
            <p style="margin: 1.5rem 0; white-space: pre-wrap;">{{ modalState.message }}</p>
            <div class="modal-actions">
              <button v-if="modalState.isConfirm" class="btn btn-native" @click="clsoeModal(false)">取消</button>
              <button class="btn btn-primary" @click="clsoeModal(true)">确定</button>
            </div>
          </div>
          
          <!-- Sync Center Modal (COSE Emulation) -->
          <div v-if="isSyncModalVisible" class="export-modal custom-modal sync-modal" style="width: 500px; max-width: 95vw;">
            <h3 style="margin-top:0; color: var(--text-primary);">🚀 跨平台内容分发与同步中心</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px;">系统将通过深层 DOM 提取内联样式并锁定入富文本剪贴板，随后自动为您调起目标平台的编辑后台。<br/><span style="color:var(--accent-color);font-weight:600;">受限于浏览器安全策略机制，云端无法为您自动粘贴。您进入平台后只需按下</span> <kbd style="background:var(--bg-active);padding:2px 4px;border-radius:4px;border:1px solid var(--border-strong);">Ctrl+V</kbd> <span style="color:var(--accent-color);font-weight:600;">即可实现 100% 格式转网同步过去无损粘贴！</span></p>
            
            <div class="sync-platform-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 480px; overflow-y: auto;">
              <button class="sync-grid-btn wechat" @click="syncToPlatform('wechat')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:8px; border:1px solid #10b981; background:rgba(16,185,129,0.05); color:#059669; cursor:pointer; transition:all 0.2s;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M8.5 13.5c-3.5 0-6.5-2.5-6.5-5.5S5 2.5 8.5 2.5 15 5 15 8c0 3-3 5.5-6.5 5.5zm-1-7c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm6 11c3 0 5.5-2 5.5-4.5S19.5 9 16.5 9c-.5 0-1 .05-1.5.15.5 1 .85 2 .85 3.35 0 3-2.5 5.5-5.5 5.5-.85 0-1.65-.2-2.35-.5-.4 1.5-1.5 2.5-2.5 3 1 .5 2 1 3 1 2.5 0 4.5-2 4.5-4.5z"/></svg>
                <span style="font-weight:600; font-size: 1rem;">同步至 微信公众号</span>
              </button>
              <button class="sync-grid-btn zhihu" @click="syncToPlatform('zhihu')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:8px; border:1px solid #3b82f6; background:rgba(59,130,246,0.05); color:#2563eb; cursor:pointer; transition:all 0.2s;">
                <span style="font-size: 32px; font-weight: 900; font-family: -apple-system, sans-serif; letter-spacing: -2px; line-height: 1;">知</span>
                <span style="font-weight:600; font-size: 1rem;">快速分发 知乎专栏</span>
              </button>
              <button class="sync-grid-btn juejin" @click="syncToPlatform('juejin')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:8px; border:1px solid #6366f1; background:rgba(99,102,241,0.05); color:#4f46e5; cursor:pointer; transition:all 0.2s;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 2l-3.3 2.7h6.6L12 2zm-5.7 4.7l-2.4 1.9 8.1 6.6 8.1-6.6-2.4-1.9-5.7 4.7-5.7-4.7zm0 2.2L1.8 12 12 20.3 22.2 12l-4.5-3.1L12 13.6 6.3 8.9z"></path></svg>
                <span style="font-weight:600; font-size: 1rem;">一键推流 稀土掘金</span>
              </button>
              <button class="sync-grid-btn twitter" @click="syncToPlatform('twitter')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:8px; border:1px solid #000; background:rgba(0,0,0,0.05); color:#000; cursor:pointer; transition:all 0.2s;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                <span style="font-weight:600; font-size: 1rem;">分布 X (Twitter) 线索</span>
              </button>
              <button class="sync-grid-btn weibo" @click="syncToPlatform('weibo')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:8px; border:1px solid #ef4444; background:rgba(239,68,68,0.05); color:#dc2626; cursor:pointer; transition:all 0.2s;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M20.1 9.8c-.8-.2-1.3-.3-1.3-.3 1.1-.6 1.7-1.4 1.5-2.4-.2-1.2-1.6-1.8-3.4-1.3l-1.3.4s.5-.6.5-1.1c.1-1.1-1-2.1-2.4-2-1.5.1-2.7 1.2-2.7 2.6v.5l-.8-.8C8.9 4 7 3.5 5.2 4.3 2 5.5.3 9.4 1.5 12.8c.8 2.3 2.7 4 4.8 4.7 4.5 1.5 9.7-.5 11.9-4.8.8-1.5.8-2.6.4-3.3zm-6.6 5.8c-2.3 2.1-6.1 1.7-8.5-.9-2.4-2.6-2.6-6.4-.3-8.5 2.3-2.1 6.1-1.7 8.5.9 2.4 2.6 2.6 6.4.3 8.5zm-1.8-4.4c-.6.9-1.9 1.4-3.1 1.2-1.2-.2-2-.9-2.3-1.8-.2-.7.1-1.3.6-1.5.5-.3 1.2-.2 1.8.2.9.7 1.2 1.7 1 2.3zm-.1-2.5c-.3.4-1 .6-1.6.4-.6-.2-1-.7-.9-1.2.1-.4.5-.5.9-.3.6.1 1 .5.9 1zm3.8 2.4c-.2 1.5-1.4 2.8-3.1 3.2-2.1.4-4.2-.3-5.2-1.8-.9-1.3-.8-3 0-4.3 1-1.5 3.3-2.2 5.3-1.4 1.7.7 2.6 2.3 2.4 3.9z"/></svg>
                <span style="font-weight:600; font-size: 1rem;">同步至 微博长文章</span>
              </button>
              <button class="sync-grid-btn csdn" @click="syncToPlatform('csdn')" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:8px; border:1px solid #ef4444; background:rgba(239,68,68,0.05); color:#dc2626; cursor:pointer; transition:all 0.2s;">
                <span style="font-size: 32px; font-weight: bold; font-family: Courier New, monospace; letter-spacing: -1px; line-height: 1;">C</span>
                <span style="font-weight:600; font-size: 1rem;">推流至 CSDN 博客</span>
              </button>
            </div>
            
            <div style="text-align: right; margin-top: 24px;">
              <button class="btn btn-native" @click="isSyncModalVisible = false">关闭同步中心</button>
            </div>
          </div>
          
          <!-- Image Host Configuration Dialog -->
          <div v-if="isImageConfigVisible" class="export-modal custom-modal" style="width: 420px; max-width: 90vw;">
            <h3 style="margin-top:0; margin-bottom: 1rem; color: var(--text-primary);">图床上传服务配置</h3>
            
            <div style="margin-bottom: 1rem;">
              <p style="margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 500;">选择默认支持策略</p>
              <select v-model="uploadConfig.provider" style="width: 100%; padding: 0.5rem; border-radius: 6px; background: var(--border-subtle); color: var(--text-primary); border: 1px solid var(--border-strong);">
                <option value="base64">本地 Base64 原生内联 (免配置/体积受限)</option>
                <option value="picgo">PicGo 本地服务器挂载 (http://127.0.0.1:36677)</option>
                <option value="github">GitHub 仓库直连 (jsDelivr CDN 全球分发)</option>
                <option value="alioss">阿里云 OSS 存储 (AliOSS)</option>
                <option value="txcos">腾讯云 COS 存储 (TxCOS)</option>
                <option value="qiniu">七牛云 存储 (Qiniu)</option>
              </select>
            </div>
            
            <div v-if="uploadConfig.provider === 'github'" style="display: flex; flex-direction: column; gap: 0.8rem;">
              <div>
                <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">GitHub Repo (例如: john/blog-assets)</p>
                <input v-model="uploadConfig.githubRepo" type="text" placeholder="username/repo" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
              <div>
                <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">Personal Access Token (用于 API 写权限)</p>
                <input v-model="uploadConfig.githubToken" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxx" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="flex: 1;">
                  <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">存储路径</p>
                  <input v-model="uploadConfig.githubPath" type="text" placeholder="images/2026" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
                <div style="flex: 1;">
                  <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">分支</p>
                  <input v-model="uploadConfig.githubBranch" type="text" placeholder="main" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
              </div>
            </div>

            <div v-if="['alioss', 'txcos', 'qiniu'].includes(uploadConfig.provider)" style="display: flex; flex-direction: column; gap: 0.8rem;">
              <div>
                <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">AccessKey (AK)</p>
                <input v-model="uploadConfig.accessKey" type="text" placeholder="AccessKey ID" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
              <div>
                <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">SecretKey (SK)</p>
                <input v-model="uploadConfig.secretKey" type="password" placeholder="AccessKey Secret" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="flex: 1;">
                  <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">Bucket</p>
                  <input v-model="uploadConfig.bucket" type="text" placeholder="Bucket 名称" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
                <div style="flex: 1;">
                  <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">Region / 区域</p>
                  <input v-model="uploadConfig.region" type="text" :placeholder="uploadConfig.provider === 'qiniu' ? 'z0' : (uploadConfig.provider === 'alioss' ? 'oss-cn-hangzhou' : 'ap-guangzhou')" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="flex: 1;">
                  <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">存储目录路径 (可选)</p>
                  <input v-model="uploadConfig.path" type="text" placeholder="blog/uploads/" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
              </div>
              <div v-if="uploadConfig.provider === 'qiniu'">
                 <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">CDN 访问域名 (七牛必填)</p>
                 <input v-model="uploadConfig.domain" type="text" placeholder="https://cdn.example.com" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
            </div>
            
            <p v-if="uploadConfig.provider === 'picgo'" style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 5px;">* 确保您的后台已启动 PicGo 客户端进程并默认开启了 Server 支持，即可无缝连接任意外部图床 (AliOSS/COS/SMMS)。</p>
            
            <h3 style="margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; color: var(--text-primary); font-size: 1rem;">🤖 AI 助手与模型凭证配置</h3>
            <div style="display: flex; flex-direction: column; gap: 0.8rem;">
              <div>
                <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">API 主机地址 (默认提供免费代理服务器)</p>
                <input v-model="uploadConfig.aiEndpoint" type="text" placeholder="https://proxy-ai.doocs.org/v1" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
              <div>
                <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">API 密匙 (默认源无需认证接口凭证)</p>
                <input v-model="uploadConfig.aiKey" type="password" placeholder="sk-..." style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="flex: 1;">
                   <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">对话大模型 (Model ID)</p>
                   <input v-model="uploadConfig.aiModel" type="text" placeholder="Qwen/Qwen2.5-7B-Instruct" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
                <div style="flex: 1;">
                   <p style="margin-bottom: 0.3rem; font-size: 0.85rem; color: var(--text-secondary);">绘图大模型 (Model ID)</p>
                   <input v-model="uploadConfig.aiImageModel" type="text" placeholder="Kwai-Kolors/Kolors" style="width: 100%; padding: 0.4rem; border-radius: 4px; background: var(--bg-app); color: var(--text-primary); border: 1px solid var(--border-strong);" />
                </div>
              </div>
            </div>

            <div class="modal-actions" style="margin-top: 1.5rem;">
              <button class="btn btn-primary" style="width: 100%; justify-content: center;" @click="isImageConfigVisible = false">保存配置并关闭</button>
            </div>
          </div>


          
        </div>
      </transition>

      

      <!-- AI Assistant Drawer Slide Out -->
      <transition name="slide-up">
        <div v-if="isAIAssistantVisible" class="ai-drawer-panel" style="position: absolute; left: 85px; top: 120px; width: 350px; max-height: calc(100% - 150px); background: var(--bg-panel); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid var(--border-subtle); z-index: 150; display: flex; flex-direction: column; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(59, 130, 246, 0.1));">
            <div style="display: flex; align-items: center; gap: 8px;">
               <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6;"></div>
               <strong style="color: var(--text-primary); font-size: 1rem;">AI 创作助理</strong>
            </div>
            <button class="close-btn" @click="isAIAssistantVisible = false" style="background:transparent; border:none; color: var(--text-secondary); cursor:pointer;">✕</button>
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">一键指令操作：</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px;" @click="dispatchAICall('你是一个资深的公众号排版与润色小助手。请修正粗浅的错别字，并使用更高级、吸引人的自媒体口吻润色下文。', content)">✨ 文本润色校对</button>
              <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px;" @click="dispatchAICall('你是一个文档专家。请提取下文的逻辑大纲，使用嵌套 Markdown 列表紧凑返回。', content)">📑 提取通篇大纲</button>
              <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px;" @click="dispatchAICall('作为资深双语专业译者，请把提供下来的段落流利且地道地翻译成英文。', content)">🌍 原文转译外文</button>
              <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px;" @click="dispatchAICall('根据内容，请帮我直接输出5个爆款且吸睛的自媒体文章标题供我备选。', content)">💡 吸睛标题生成</button>
            </div>
            <hr style="border:none; border-top: 1px dashed var(--border-color); margin: 8px 0;" />
            <div style="display: flex; flex-direction: column; gap: 8px;">
               <label style="font-size: 0.85rem; color: var(--text-primary);">自定义灵感提问：</label>
               <textarea v-model="aiPrompt" rows="3" placeholder="例如：帮我梳理三条关于开源生态系统的好处..." style="width: 100%; border-radius: 6px; padding: 8px; border: 1px solid var(--border-strong); background: var(--bg-app); color: var(--text-primary); resize: none; font-family: inherit; font-size: 0.9rem;"></textarea>
               <button class="btn btn-primary" :disabled="isAILoading || !aiPrompt" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #6366f1, #3b82f6); border: none;" @click="dispatchAICall('你是一个得力的自媒体全能创作助手。', aiPrompt)">
                  <span v-if="isAILoading">引擎调度运算中...</span>
                  <span v-else>发送请求 🚀</span>
               </button>
            </div>
            <div v-if="aiResponse" style="margin-top: 16px; padding: 12px; border-radius: 8px; background: var(--bg-app); border: 1px solid var(--border-subtle); position: relative;">
               <p style="font-size: 0.8rem; font-weight: 600; color: #3b82f6; margin-top: 0; margin-bottom: 8px;">助手回复</p>
               <div style="font-size: 0.85rem; color: var(--text-primary); white-space: pre-wrap; line-height: 1.5; max-height: 250px; overflow-y: auto; padding-right: 4px; user-select: text;">{{ aiResponse }}</div>
               <button v-if="!isAILoading" class="btn btn-secondary" style="position: absolute; top: 8px; right: 8px; padding: 4px 8px; font-size: 0.75rem;" @click="copyToClipboard(aiResponse)">复制</button>
            </div>
          </div>
        </div>
      </transition>

      <!-- AI Text-To-Image Diffusion Modal -->
      <transition name="fade">
        <div v-if="isAITextToImageVisible" class="export-overlay" style="z-index: 150;" @click.self="isAITextToImageVisible = false">
          <div class="export-modal custom-modal" style="max-width: 500px; width: 90%; z-index: 151;">
             <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
               <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">🖼️ 文生图 (AI 图像扩散)</h3>
               <button class="btn btn-native" style="padding: 4px 8px; font-size: 0.8rem;" @click="isAITextToImageVisible = false">✕</button>
             </div>
             <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px;">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top:0;">请输入高度具体的描绘咒语，系统将通过通用图像大模型接口为您渲染配图，并直接自动插入至 Markdown 编辑器中。</p>
                <textarea v-model="t2iPrompt" rows="5" placeholder="例如：赛博朋克深渊背景下，一只发光的粉红色八爪鱼正在敲击漂浮的机械键盘面板..." style="width: 100%; border-radius: 6px; padding: 10px; border: 1px solid var(--border-strong); background: var(--bg-app); color: var(--text-primary); resize: none; font-family: inherit; font-size: 0.95rem;"></textarea>
                <button class="btn btn-primary" :disabled="isT2ILoading || !t2iPrompt" style="width: 100%; justify-content: center; height: 44px; margin-top: 10px; background: linear-gradient(135deg, #a855f7, #8b5cf6); border: none; font-size: 1rem;" @click="dispatchT2ICall">
                  <span v-if="isT2ILoading">引擎构图中 (云渲染约需 10-15 秒)...</span>
                  <span v-else>生成图像 & 注入原文 ✨</span>
               </button>
             </div>
          </div>
        </div>
      </transition>

      <!-- History Timeline Modal -->
      <transition name="fade">
        <div v-if="isHistoryVisible" class="export-overlay" @click.self="isHistoryVisible = false">
          <div class="export-modal custom-modal" style="max-width: 600px; width: 90%; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">📖 本地草稿时光机</h3>
              <button class="btn btn-native" style="padding: 4px 8px; font-size: 0.8rem;" @click="isHistoryVisible = false">✕</button>
            </div>
            <div class="modal-body" style="overflow-y: auto; flex: 1;">
              <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9rem;">系统每 10 秒自动为您进行容灾快照。点击按钮即可将编辑器无缝回退至当时状态。</p>
              
              <div v-if="savedDrafts.length === 0" style="text-align: center; color: var(--text-secondary); padding: 40px 0;">
                暂无历史记录缓存
              </div>
              
              <div v-for="(draft, idx) in savedDrafts" :key="idx" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div>
                  <strong style="color: var(--text-primary);">{{ draft.time }}</strong>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px;">
                    {{ draft.content.replace(/\n/g, ' ') }}
                  </div>
                </div>
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" @click="restoreDraft(draft.content)">回滚恢复</button>
              </div>
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
    <!-- Note: removed isolated </main> that trapped modals -->
    <!-- Tier 4: Bottom Status Bar — Removed in v1.2 (stats now in editor-pane footer) -->
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

html, body {
  margin: 0; padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-app);
  font-family: var(--font-ui);
}

/* Scrollbars — thin, minimal */
.preview-pane::-webkit-scrollbar,
.editor-pane :deep(.cm-scroller)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.preview-pane::-webkit-scrollbar-track,
.editor-pane :deep(.cm-scroller)::-webkit-scrollbar-track {
  background: transparent;
}
.preview-pane::-webkit-scrollbar-thumb,
.editor-pane :deep(.cm-scroller)::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.5);
  border-radius: 0 !important;
}
.preview-pane::-webkit-scrollbar-thumb:hover,
.editor-pane :deep(.cm-scroller)::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.8);
}

.octopus-layout {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  font-family: var(--font-ui);
  background: var(--bg-app);
  background-attachment: fixed;
  color: var(--text-primary);
  overflow: hidden;
  padding: 0;
  gap: 0;
  transition: background-color var(--transition-speed) var(--transition-timing);
  animation: appEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes appEntry {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}


/* Quick Actions & TOC Styling */
.format-actions { display: flex; align-items: center; gap: 0.4rem; padding: 0 12px; background: transparent; border-bottom: none; overflow-x: auto; height: 100%; min-height: 40px; margin: 0; }
.format-actions::-webkit-scrollbar { height: 0; display: none; }
.icon-btn { background: transparent; color: var(--text-primary); border: 1px solid transparent; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-family: inherit; font-size: 1rem; position: relative; flex-shrink: 0; }
.icon-btn:hover { background: var(--border-strong); }
.toolbar-divider { width: 1px; height: 16px; background: var(--border-subtle); margin: 0 4px; }
.toc-panel { width: 220px; height: 100%; background: var(--bg-panel); border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; flex-shrink: 0; transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toc-header { height: 32px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); font-weight: 600; font-size: 0.8rem; color: var(--text-primary); }
.toc-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px 0; }
.toc-content::-webkit-scrollbar { width: 6px; }  
.toc-content::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }   
.toc-item { padding: 6px 12px 6px 20px; font-size: 0.8rem; color: var(--text-primary); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s; line-height: 1.4; }
.toc-item:hover { background: var(--border-subtle); }
/* Remove the old ambient glow pseudo-element — we use body bg-image instead */
.octopus-layout::before {
  display: none;
}
.octopus-layout > * {
  z-index: 1;
}

/* === Glass Panel Header === */
.octopus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 56px;
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0 !important;
  box-shadow: none;
  z-index: 100;
  flex-shrink: 0;
  transition: all var(--transition-speed) var(--transition-timing);
}

.system-menu-bar {
  padding: 0 1.5rem;
  height: 56px;
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
  z-index: 200;
  box-shadow: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.system-menu-bar .brand-group {
  flex: 1;
}

.system-menu-bar .actions {
  flex: 1;
}

.formatting-toolbar {
  padding: 0 1.5rem;
  height: 48px;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.formatting-toolbar .actions {
  display: flex;
  align-items: center;
  margin-left: auto;
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
  gap: 0.25rem;
  margin-left: 0.5rem;
}

/* --- Solid Opaque Premium Menus --- */

.menu-item {
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 14px;
  margin: 0 4px;
  cursor: pointer;
  border-radius: 6px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  user-select: none;
  white-space: nowrap;
}

.menu-item:hover, .menu-item.active {
  background: rgba(0, 0, 0, 0.05);
}

html.dark .menu-item:hover, html.dark .menu-item.active {
  background: rgba(255, 255, 255, 0.1);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  background: var(--bg-panel);
  min-width: 250px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px !important;
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.2), 0 4px 16px -4px rgba(0, 0, 0, 0.1) !important; 
  z-index: 1000;
  padding: 8px;
  animation: eliteMenuSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-origin: top center;
}

html.dark .dropdown-menu {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.5), 0 4px 16px -4px rgba(0, 0, 0, 0.3) !important;
}

@keyframes eliteMenuSlide {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dropdown-menu-large {
  min-width: 280px;
}

.dropdown-item {
  padding: 10px 14px;
  margin: 2px 0;
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  border-radius: 6px !important;
  transition: background 0.1s ease;
  border: none;
}

.dropdown-item:hover {
  background: rgba(0, 0, 0, 0.06);
}

html.dark .dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* Keyboard Shortcut badges */
.dropdown-item .shortcut {
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.04);
  padding: 3px 8px;
  border-radius: 6px;
  margin-left: auto;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
  order: 2; /* Flex layout alignment override */
  letter-spacing: 0px;
}

html.dark .dropdown-item .shortcut {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

.dropdown-item:hover .shortcut {
  background: rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

html.dark .dropdown-item:hover .shortcut {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.dropdown-item .check-icon {
  margin-right: 0.5rem;
  width: 1rem;
  display: inline-block;
  font-size: 13px;
}

/* Cascading Submenu Styling */
.dropdown-item.has-submenu .submenu {
  position: absolute;
  top: -8px;
  left: 100%;
  margin-left: 6px;
  display: none;
  background: var(--bg-panel); 
  border: 1px solid var(--border-subtle); 
  border-radius: 10px !important;
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.15), 0 4px 16px -4px rgba(0, 0, 0, 0.08) !important; 
  padding: 8px;
  min-width: 200px;
  z-index: 1001;
}

html.dark .dropdown-item.has-submenu .submenu {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.5), 0 4px 16px -4px rgba(0, 0, 0, 0.3) !important;
}

.dropdown-item.has-submenu:hover .submenu {
  display: block;
  animation: eliteMenuSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.octopus-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 1.2rem;
  background: var(--bg-panel);
  border-top: 1px solid var(--border-subtle);
  font-size: 0.75rem;
  color: var(--text-muted);
  user-select: none;
  z-index: 100;
}

.octopus-status-bar .status-item {
  margin-right: 1.5rem;
}

.dropdown-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 6px 8px;
  opacity: 0.8;
}

html.dark .dropdown-divider {
  background: rgba(255, 255, 255, 0.1);
}

.format-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.icon-btn {
  background: transparent;
  color: var(--text-muted);
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0 !important;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  font-size: 1rem;
  position: relative;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--accent-color);
}

.icon-btn svg {
  color: currentColor;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-strong);
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
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  -webkit-text-fill-color: unset;
  background: none;
}

.current-env-indicator {
  font-size: 0.75rem;
  color: var(--text-muted);
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
  color: var(--accent-color);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.theme-select {
  background: var(--border-strong);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  border-radius: 0 !important;
  padding: 0.4rem 0.75rem;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
}
.theme-select option {
  background: var(--bg-panel);
  color: var(--text-primary);
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0 !important;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-primary {
  background: var(--accent-color);
  color: #0f111a;
}

.btn-copy {
  background: var(--accent-color);
  color: #0f111a;
}

.btn-native {
  background: transparent;
  color: var(--accent-color);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(12px);
}

.btn-wechat {
  background: var(--success-color, #10b981);
  color: #ffffff;
}

.workspace {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  min-height: 0;
  border-radius: 0 !important;
  border: none;
  border-top: 1px solid var(--border-subtle);
  box-shadow: none;
  background: transparent;
  transition: all var(--transition-speed) var(--transition-timing);
}

.workspace.is-dragging {
  cursor: col-resize;
  user-select: none;
}

.editor-pane {
  height: 100%;
  border-right: 1px solid var(--border-subtle);
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  transition: background-color var(--transition-speed) var(--transition-timing);
}

/* Force CodeMirror to fill bounds without stretching */
.cm-wrapper {
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
}
.editor-pane ::v-deep(.cm-editor) {
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 15px !important;
  line-height: 1.625 !important;
  background: transparent !important;
  color: #374151 !important;
}
.editor-pane ::v-deep(.cm-scroller) {
  overflow-y: auto;
  overflow-x: auto;
  height: 100%;
}
.editor-pane ::v-deep(.cm-content) {
  font-family: 'JetBrains Mono', monospace !important;
  padding: 2rem !important;
}
.editor-pane ::v-deep(.cm-gutters) {
  background: transparent !important;
  border-right: none !important;
  color: #64748b !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 15px !important;
  min-width: 48px;
  padding-right: 1rem;
  padding-top: 0.25rem;
}
.editor-pane ::v-deep(.cm-lineNumbers .cm-gutterElement) {
  text-align: right;
  padding-right: 1rem;
}

/* TOC Panel */
.toc-panel {
  width: 220px;
  height: 100%;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.toc-header {
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
  font-weight: 600;
  flex-shrink: 0;
}
.toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.toc-content::-webkit-scrollbar { width: 6px; }
.toc-content::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 0 !important; }
.toc-item {
  padding: 6px 12px 6px 20px;
  font-size: 0.8rem;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
  line-height: 1.4;
}
.toc-item:hover {
  background: var(--border-subtle);
  color: var(--accent-color);
}
.toc-level-1 {
  font-weight: 600;
  padding-left: 12px;
  margin-top: 4px;
}
.toc-level-2 {
  padding-left: 24px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.toc-level-2::before {
  content: '└ ';
  opacity: 0.3;
}

.resizer {
  width: 4px;
  background: var(--border-subtle);
  cursor: col-resize;
  position: relative;
  z-index: 10;
  transition: background 0.2s;
  border-left: 1px solid rgba(0, 0, 0, 0.2);
}

.resizer:hover, .workspace.is-dragging .resizer {
  background: var(--accent-color);
}

.resizer-handle {
  display: none;
}

.preview-pane {
  height: 100%;
  position: relative;
  background: var(--bg-preview);
  color: var(--text-primary);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.preview-pane::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.5);
  border-radius: 0 !important;
}
.preview-pane::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.8);
}

.preview-pane.is-mobile {
  background: var(--bg-app);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 0;
}

.preview-content {
  padding: 2.5rem 2.5rem 4rem 2.5rem !important;
  width: 100% !important;
  max-width: 48rem !important;
  margin: 0 auto !important;
  min-height: 100% !important;
  background: transparent !important;
  box-sizing: border-box !important;
  border: none !important;
  box-shadow: none !important;
  font-family: var(--font-body) !important;
  font-size: 15px !important;
  line-height: 1.8 !important;
  color: var(--text-primary) !important;
}

.view-toggles-pill {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: transparent;
  gap: 2px;
}

.view-toggles-pill .pill-btn {
  background: transparent;
  color: var(--text-muted);
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 0 !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}
.view-toggles-pill .pill-btn.active {
  background: var(--accent-light);
  color: var(--accent-color);
}
.view-toggles-pill .pill-btn:hover {
  color: var(--accent-color);
}

/* --- UI Components --- */

.theme-select-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  padding: 4px 10px;
  border-radius: 0 !important;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  transition: all 0.25s ease;
}
.theme-select-group:hover, .theme-select-group:focus-within {
  background: var(--bg-panel);
  border-color: var(--accent-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.modern-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  border-right: 1px solid var(--border-subtle);
  padding-right: 10px;
  margin-right: 4px;
}

.modern-select {
  appearance: none;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  padding: 0 16px 0 0;
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M2%204l4%204%204-4%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right center;
  max-width: 150px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.css-customize-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-hover);
  border: 1px solid transparent;
  border-radius: 0 !important;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.css-customize-btn:hover {
  background: transparent;
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.preview-pane.is-mobile .preview-content {
  width: 414px !important;
  max-width: 414px !important;
  min-height: 852px !important;
  border-radius: 0 !important;
  border: 4px solid var(--bg-panel) !important;
  box-shadow: 
    var(--shadow-preview-device),
    0 0 0 10px var(--border-subtle),
    inset 0 0 0 1px var(--border-subtle) !important;
  padding: 5.5rem 1.5rem 2.5rem 1.5rem !important;
  margin: 0 auto !important;
  position: relative;
  background: var(--bg-preview) !important;
}

/* Modern iPhone Dynamic Island */
.preview-pane.is-mobile .preview-content::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 35px;
  background: #000000;
  border-radius: 0 !important;
  z-index: 10;
  box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.2);
}

/* iPhone physical buttons simulation (Volume and Power) */
.preview-pane.is-mobile .preview-content::after {
  content: '';
  position: absolute;
  top: 200px;
  left: -14px;
  width: 4px;
  height: 60px;
  background: var(--border-strong);
  border-radius: 0 !important;
  box-shadow: 
    0 -80px 0 0 var(--border-strong), 
    0 -120px 0 -1px var(--border-strong),
    432px 30px 0 0 var(--border-strong); /* Right power button */
}

/* Force Weiyan containers to strictly fill the pane to eliminate right-side gaps */
::v-deep(#nice) {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding-bottom: 0 !important;
}

.view-toggles {
  display: flex;
  background: var(--bg-toolbar);
  padding: 4px;
  border-radius: 0 !important;
  margin-right: 1.5rem;
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 1px var(--border-subtle);
}
.view-toggles .btn-toggle {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 0 !important;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.view-toggles .btn-toggle:hover {
  color: var(--text-primary);
}
.view-toggles .btn-toggle.active {
  background: var(--accent-color);
  color: var(--bg-preview);
  box-shadow: 0 2px 8px rgba(74, 141, 248, 0.4);
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
  border-radius: 0 !important;
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

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-group {
  display: flex;
  gap: 0.5rem;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-strong);
}

.premium-select-wrapper {
  position: relative;
  display: inline-block;
}

.premium-select {
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-primary);
  padding: 0.35rem 2.2rem 0.35rem 0.8rem;
  border-radius: 0 !important;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M2%204l4%204%204-4%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
  max-width: 170px;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.premium-select:hover {
  background-color: var(--bg-active);
}

.btn-icon-text {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.35rem 0.5rem;
  border-radius: 0 !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-icon-text:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.export-modal {
  background: var(--bg-panel);
  padding: 2.5rem 3rem;
  border-radius: 0 !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  text-align: center;
  border: 1px solid var(--border-strong);
  max-width: 400px;
  min-width: 320px;
  color: var(--text-primary);
}

.premium-modal {
  border-radius: 0 !important;
  background: var(--bg-panel);
  box-shadow: 0 40px 80px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(48px) saturate(200%);
}

.setting-item label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.setting-input {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 0 !important;
  background: var(--bg-app);
  color: var(--text-primary);
  padding: 8px 12px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.setting-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  outline: none;
}

.copy-group {
  display: flex;
  background: var(--bg-hover);
  border-radius: 0 !important;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.btn-group-item {
  background: transparent;
  border: none;
  border-right: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-group-item:hover {
  color: var(--text-primary);
  background: var(--border-strong);
}

.btn-group-item:last-child {
  border-right: none;
}

.btn-group-item.wechat:hover { background: #059669; }
.btn-group-item.zhihu:hover { background: #0084ff; }
.btn-group-item.juejin:hover { background: #1e80ff; }

.btn-primary-filled {
  background: var(--accent-color);
  color: var(--text-primary);
  border: none;
  border-radius: 0 !important;
  padding: 0.35rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary-filled:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.view-toggles-pill {
  display: flex;
  background: var(--bg-app); /* Match the dark nav background */
  padding: 4px;
  border-radius: 0 !important;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px var(--border-subtle);
}

.pill-btn {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 0 !important;
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.pill-btn:hover {
  color: var(--text-primary);
}

.pill-btn.active {
  background: #498df8;
  color: var(--text-primary);
  box-shadow: 0 2px 10px rgba(73, 141, 248, 0.4);
}

.floating-toolbar {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-glass); /* Bugfix: Using global glass variable */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 14px 10px;
  border-radius: 0 !important;
  box-shadow: var(--shadow-glass); /* Bugfix: Premium generic shadow instead of hardcoded dark shadow */
  z-index: 50;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.float-btn {
  width: 44px; height: 44px;
  border-radius: 0 !important;
  border: none;
  background: var(--bg-hover); /* Contrast Bugfix: Uses dynamic theme token */
  color: var(--text-secondary);
  cursor: pointer;
  display: flex; 
  justify-content: center; 
  align-items: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.float-btn:hover {
  color: var(--text-primary);
  transform: translateX(-4px) scale(1.05); /* Enhanced Micro-animation */
  box-shadow: 0 8px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.1);
}

.float-btn.wechat:hover { background: rgba(5, 150, 105, 0.15); color: #10b981; }
.float-btn.zhihu:hover { background: rgba(0, 132, 255, 0.15); color: #38bdf8; }
.float-btn.juejin:hover { background: rgba(30, 128, 255, 0.15); color: #60a5fa; }
.float-btn.export:hover { background: rgba(99, 102, 241, 0.15); color: #818cf8; }

.float-divider {
  width: 100%;
  height: 1px;
  background: var(--border-strong);
  margin: 6px 0;
}

.export-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--bg-glass); /* Bugfix: Support light mode for export overlay */
  backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.export-modal {
  background: var(--bg-panel);
  padding: 2.5rem 3rem;
  border-radius: 0 !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  text-align: center;
  border: 1px solid var(--border-strong);
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
  bottom: 2.5rem;
  right: 2.5rem;
  background: rgba(15, 23, 42, 0.75); /* MacOS Glassmorphism */
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  color: #f8fafc;
  padding: 1.2rem 1.8rem;
  border-radius: 0 !important;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08); /* Elite shadow */
  z-index: 99999;
  display: flex;
  align-items: center;
  font-weight: 500;
  border-left: 4px solid var(--accent-color); 
  letter-spacing: 0.01em;
}

.toast-success { border-left-color: #34d399; }
.toast-error { border-left-color: #fb7185; }
.toast-info { border-left-color: var(--accent-color); }

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
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-strong);
  border-top-color: var(--accent-color);
  border-radius: 0 !important;
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
  .system-menu-bar, .formatting-toolbar, .editor-pane, .resizer, .css-pane, .actions, .toc-panel {
    display: none !important;
  }
  body, html, .octopus-layout, .workspace, .preview-pane, .preview-content {
    background: white !important;
    color: black !important;
    height: auto !important;
    overflow: visible !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  /* Content Flow Constraints */
  .preview-content {
    box-shadow: none !important;
    border: none !important;
  }
  /* Page breaks optimization */
  pre, blockquote, img, table {
    page-break-inside: avoid;
  }
  h1, h2, h3, h4, h5 {
    page-break-after: avoid;
  }
}
/* Mac Code Block Styles */
.mac-code-block {
  border-radius: 0 !important;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid rgba(0,0,0,0.1);
  box-sizing: border-box;
}
.mac-code-block .mac-header {
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: rgba(180, 180, 180, 0.15);
  gap: 8px;
}
.mac-code-block .mac-dot {
  width: 12px; height: 12px;
  border-radius: 0 !important;
  display: inline-block;
}
.mac-code-block pre.hljs {
  margin: 0 !important;
  border-radius: 0 !important;
}

/* Sidebar Control Tabs */
.s-tab { border-bottom: 2px solid transparent !important; opacity: 0.5; transition: all 0.2s; }
.s-tab:hover { opacity: 0.8; }
.s-tab.active { color: var(--primary) !important; border-bottom-color: var(--primary) !important; }

/* User-Requested UI Component Polish (Segments) */
.view-toggles-pill {
  display: flex;
  background: var(--bg-hover);
  padding: 4px;
  border-radius: 0 !important;
  gap: 4px;
  border: 1px solid var(--border-subtle);
}

.view-toggles-pill .pill-btn {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  border-radius: 0 !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.view-toggles-pill .pill-btn:hover {
  color: var(--text-primary);
  background: var(--bg-active);
}

.view-toggles-pill .pill-btn.active {
  background: var(--bg-panel);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-subtle);
}

html.dark .view-toggles-pill .pill-btn.active {
  background: var(--bg-active);
  color: #ffffff;
}

/* WX Link Auto Detection Banner (Redesigned to Bottom-Left) */
.smart-link-palette {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 560px;
  max-width: 90vw;
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 0 !important;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0,0,0,0.06);
  z-index: 2000;
  display: flex;
  flex-direction: column;
}
html.dark .smart-link-palette {
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.smart-link-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
}

.smart-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.smart-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 0 !important;
  color: #fff;
  background: #f59e0b;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}

.smart-badge {
  font-size: 0.75rem;
  padding: 4px 12px;
  border-radius: 0 !important;
  font-weight: 700;
  letter-spacing: 0.3px;
  transition: all 0.2s;
}
.smart-badge:hover {
  background: rgba(245, 158, 11, 0.25);
}
.badge-warn {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.smart-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.smart-btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-hover);
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: 0 !important;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.smart-btn-primary:hover {
  background: var(--bg-active);
  border-color: var(--border-color);
}

.smart-btn-icon {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 0 !important;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}
.smart-btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.smart-locator-glass {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px;
  padding: 16px;
  background: rgba(245, 158, 11, 0.03);
  border: 1px dashed rgba(245, 158, 11, 0.3);
  border-radius: 0 !important;
  transition: all 0.2s;
}
.smart-locator-glass:hover {
  background: rgba(245, 158, 11, 0.08);
}

.locator-info-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 75%;
  cursor: pointer;
}

.locator-top-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.locator-line-tag {
  background: #f59e0b;
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 0 !important;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.3);
}

.locator-anchor-text {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.locator-url-track {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-decoration: underline dashed;
  text-underline-offset: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
}

/* Nav Controls within Locator Block */
.locator-nav-controls {
  display: flex;
  align-items: center;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 0 !important;
  padding: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.locator-nav-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.locator-nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.locator-counter-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0 12px;
  min-width: 40px;
  text-align: center;
}

.locator-nav-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-app);
  padding: 4px;
  border-radius: 0 !important;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.locator-nav-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  opacity: 0.6;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 0 !important;
  transition: all 0.2s;
}
.locator-nav-btn:hover {
  opacity: 1;
  background: var(--bg-hover);
}

.locator-counter-text {
  font-size: 0.8rem;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--text-primary);
  min-width: 38px;
  text-align: center;
}
/* MDNice Parity: Floating AI Sidebar */
.floating-ai-sidebar {
  position: absolute;
  top: 50%;
  left: 24px; /* Move cleanly to the far-left edge */
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 100;
}

.ai-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.ai-tool:hover {
  transform: translateY(-4px);
}

.ai-icon-bg {
  width: 44px;
  height: 44px;
  border-radius: 0 !important;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.ai-tool:hover .ai-icon-bg.blue {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}
.ai-tool:hover .ai-icon-bg.purple {
  box-shadow: 0 8px 20px rgba(168, 85, 247, 0.4);
}

.ai-icon-bg.blue {
  background: linear-gradient(135deg, #6366f1, #3b82f6);
}

.ai-icon-bg.purple {
  background: linear-gradient(135deg, #a855f7, #8b5cf6);
}

.ai-tool-text {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: color 0.3s;
  letter-spacing: 0.5px;
}

.ai-tool:hover .ai-tool-text {
  color: var(--text-primary);
}

/* Format Submenu Styles */
.has-submenu {
  position: relative;
}
.has-submenu .submenu {
  display: block;
  position: absolute;
  left: 100%;
  top: -4px;
  min-width: 140px;
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 0 !important;
  box-shadow: var(--shadow-glass);
  padding: 6px;
  visibility: hidden;
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 105;
}
.has-submenu:hover .submenu {
  visibility: visible;
  opacity: 1;
  transform: translateX(0);
}

/* ═══ Action Rail Hover Effects ═══ */
.rail-btn:hover {
  color: var(--accent-color) !important;
  background: rgba(0, 240, 255, 0.1) !important;
  transform: scale(1.05);
}

/* ═══ Distribution Pill Hover Effects ═══ */
.dist-btn:hover {
  color: var(--text-primary) !important;
}

/* ═══ v1.2 iPhone Frame Styles ═══ */
.iphone-frame {
  width: 390px;
  height: 844px;
  border-radius: 54px !important;
  background-color: #1c1c1c;
  padding: 12px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 0 2px #444;
}
.iphone-notch {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 35px;
  background-color: #000;
  border-radius: 20px !important;
  z-index: 20;
}
.iphone-screen {
  width: 100%;
  height: 100%;
  border-radius: 42px !important;
  background-color: #ffffff;
  overflow: hidden;
  position: relative;
}
.iphone-reflection {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
  pointer-events: none;
  z-index: 10;
}

/* FAB Hover Tooltips */
.fab-btn:hover {
  box-shadow: 0 0 20px rgba(139, 90, 43, 0.15) !important;
}
.fab-btn:hover > div {
  opacity: 1 !important;
}

/* Active Pill Button Styling */
.pill-btn.active {
  background: var(--primary) !important;
  color: #fff !important;
  box-shadow: 0 0 20px rgba(139, 90, 43, 0.15);
}

/* Editor pane bg + flex column for footer */
.editor-pane {
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

/* Preview pane bg */
.preview-pane {
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* Mobile preview content padding - use thin realistic margins */
.preview-pane.is-mobile .preview-content-wrapper {
  padding: 0 12px !important;
  overflow-x: hidden !important;
}

/* Ensure mobile preview content text doesn't overflow */
.preview-pane.is-mobile .preview-content {
  overflow-wrap: break-word !important;
  word-break: break-word !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* Force all child elements inside mobile preview to respect container width */
.preview-pane.is-mobile .preview-content * {
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.preview-pane.is-mobile .preview-content img {
  height: auto !important;
}
.preview-pane.is-mobile .preview-content pre {
  overflow-x: auto !important;
  white-space: pre-wrap !important;
}
.preview-pane.is-mobile .preview-content table {
  display: block !important;
  overflow-x: auto !important;
  width: 100% !important;
}
.preview-pane.is-mobile .preview-content section#nice {
  max-width: 100% !important;
  width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow-x: hidden !important;
}

/* ═══ Fix Inner Gray & Black Borders + Black Rect Phantom ═══ */
/* Remove Github-markdown and Theme injected borders and shadow from wrappers */
.preview-pane.is-mobile ::v-deep(.preview-content-wrapper),
.preview-pane.is-mobile ::v-deep(.preview-content),
.preview-pane.is-mobile ::v-deep(#nice),
.preview-pane.is-mobile ::v-deep(.markdown-body) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important; /* Let iphone-screen be the white background */
}

/* Nuke rogue theme-injected notches on the wrapper */
.preview-pane.is-mobile ::v-deep(.preview-content-wrapper::before),
.preview-pane.is-mobile ::v-deep(.preview-content-wrapper::after),
.preview-pane.is-mobile ::v-deep(#nice::before),
.preview-pane.is-mobile ::v-deep(#nice::after),
.preview-pane.is-mobile ::v-deep(.preview-content::before),
.preview-pane.is-mobile ::v-deep(.preview-content::after),
.preview-pane.is-mobile ::v-deep(.markdown-body::before),
.preview-pane.is-mobile ::v-deep(.markdown-body::after) {
  display: none !important;
  content: none !important;
  width: 0 !important;
  height: 0 !important;
  background: none !important;
}

/* Nuclear: kill ANY element with black background that looks like a notch */
.preview-pane.is-mobile ::v-deep(.mac-code-block) {
  box-shadow: none !important;
  border: none !important;
}

/* Kill any stray .mac-header or phantom black block injection in mobile view */
.preview-pane.is-mobile ::v-deep(.mac-header) {
  display: none !important;
  height: 0 !important;
  opacity: 0 !important;
}
.preview-pane.is-mobile ::v-deep(.mac-code-block),
.preview-pane.is-mobile ::v-deep(pre) {
  padding-top: 0 !important;
  border: none !important;
}

/* ═══ Phase 18: Design Reference Parity ═══ */

/* Outer wrapper: full-height centered flex container matching design ref */
.mobile-preview-pane {
  width: 100%;
  height: 100%;
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #f1f5f9 !important;
}

/* Ensure preview pane is also STRICTLY f1f5f9 for seamless blending */
.preview-pane.is-mobile {
  background: #f1f5f9 !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Ambient glow from design ref */
.mobile-preview-pane > .ambient-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle at top right, rgba(139, 90, 43, 0.05), transparent 400px);
  pointer-events: none;
  z-index: 0;
}

/* Scale wrapper: ensures phone fits in available space */
.iphone-scale-wrapper {
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Scale to fit: 844px native + 24px margin = ~868px needed. Scale down if viewport is shorter */
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

/* iPhone Frame: exact design reference specs */
.iphone-frame {
  width: 390px;
  height: 844px;
  border-radius: 54px;
  background-color: #1c1c1c;
  padding: 12px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 0 2px #444;
  flex-shrink: 0;
  /* Scale to fit available height */
  max-height: 100%;
  transform: scale(1);
  transform-origin: center center;
}

/* When the container is shorter than 844px, scale frame down to fit */
@media (max-height: 950px) {
  .iphone-frame {
    transform: scale(0.85);
  }
}
@media (max-height: 800px) {
  .iphone-frame {
    transform: scale(0.72);
  }
}

.iphone-screen {
  width: 100%;
  height: 100%;
  border-radius: 42px;
  background-color: #ffffff;
  overflow: hidden;
  position: relative;
}

/* Entrance animation */
@keyframes floatUpFade {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}

.staggered-2 {
  animation: floatUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.1s;
}
</style>

<style>

/* --- AI Rotary Menu Layout --- */
.fab-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.fab-container .ai-rotary-btn .action-icon {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}
.fab-container:not(.is-open) .ai-rotary-btn:hover .ai-tooltip {
  opacity: 1 !important;
}
.fab-btn:hover > div {
  opacity: 1 !important;
}
.fab-container.is-open .ai-rotary-btn .action-icon {
  transform: rotate(135deg) scale(0.9);
}
.fab-container.is-open .ai-rotary-btn {
  box-shadow: 0 12px 30px rgba(0,0,0,0.15) !important;
}
.fab-menu {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  pointer-events: none;
}
.fab-container.is-open .fab-menu {
  pointer-events: auto;
}
.fab-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0;
  transform: translateY(20px) scale(0.8) rotate(-10deg);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 0;
}
.fab-container.is-open .fab-item {
  opacity: 1;
  transform: translateY(0) scale(1) rotate(0deg);
}
/* Stagger bottom to top */
.fab-container.is-open .fab-item:nth-child(2) {
  transition-delay: 0.05s;
}
.fab-container.is-open .fab-item:nth-child(1) {
  transition-delay: 0.1s;
}
.fab-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  color: white;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fab-icon-wrapper.assistant {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
}
.fab-icon-wrapper.pic-gen {
  background: linear-gradient(135deg, #a855f7, #ec4899);
}
.fab-item:hover .fab-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}
.fab-label {
  background: var(--bg-panel);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'PingFang SC', sans-serif;
  border: 1px solid var(--border-subtle);
  transition: transform 0.2s;
}
.fab-item:hover .fab-label {
  transform: translateX(-4px);
  color: var(--primary);
  border-color: var(--primary);
}
html.dark .fab-label {
  background: #2a2a2a;
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

/* Theme List Items */
.theme-list-item:hover { background: rgba(0,0,0,0.03) !important; }
.theme-list-item.is-active { background: rgba(139,90,43,0.06) !important; }
.setting-input:focus { border-color: var(--primary) !important; }
.panel-select:focus { border-color: var(--primary) !important; }
</style>

