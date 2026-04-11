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
const showToc = ref(true);

const hasExternalLinks = ref(false);
const showLinkWarning = ref(false);
let linkCheckDebounce: number | null = null;

watch(content, (newVal) => {
  const lines = newVal.split('\n');
  const items: TocItem[] = [];
  let inCodeBlock = false;
  
  if (linkCheckDebounce) window.clearTimeout(linkCheckDebounce);
  linkCheckDebounce = window.setTimeout(() => {
    const extLinkRegex = /(?:^|[^!])\[.*?\]\((https?:\/\/[^\s\)]+)\)/;
    if (extLinkRegex.test(newVal)) {
      hasExternalLinks.value = true;
      showLinkWarning.value = true;
    } else {
      hasExternalLinks.value = false;
      showLinkWarning.value = false;
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
.use(markdownItImageFlow);

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

// Image Upload State
const isImageConfigVisible = ref(false);
const uploadConfig = ref<UploadConfig>(
  (() => {
    try {
      const saved = localStorage.getItem('octopus-upload-config');
      return saved ? JSON.parse(saved) : { provider: 'base64' };
    } catch {
      return { provider: 'base64' };
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
const useSerifFont = ref(false);
const enableLinkFootnote = ref(true);
const showReferences = ref(true);
const showDiagrams = ref(true);

const updateHtml = () => {
  let rawHtml = md.render(content.value);

  // Deep Parity: Mac Code Block Styling
  if (isMacCodeBlock.value) {
    rawHtml = rawHtml.replace(/<pre class="custom hljs">/g, (match) => {
      return `<div class="mac-code-block"><div class="mac-header"><span class="mac-dot" style="background:#ff5f56"></span><span class="mac-dot" style="background:#ffbd2e"></span><span class="mac-dot" style="background:#27c93f"></span></div>` + match;
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
           refsHtml += `<span id="fn${num}" class="footnote-item"><span class="footnote-num">[${num}] </span><p><span class="footnote-word">${a.textContent.replace(`[${num}]`,'')}</span>: <em>${(a as HTMLAnchorElement).href}</em></p></span>\n`;
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

  const serifStyle = useSerifFont.value ? "font-family: Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif !important;" : "";

  htmlOutput.value = `<section id="nice" class="markdown-body ${useSerifFont.value ? 'use-serif' : ''}" style="width: 100% !important; max-width: none !important; ${serifStyle}">${rawHtml}</section>`;
};

watch([content, isMacCodeBlock, useSerifFont, enableLinkFootnote, showReferences, showDiagrams], updateHtml);
onMounted(updateHtml);

// Dropdown Menu Logic
const activeMenu = ref<string | null>(null);
const toggleMenu = (menu: string) => {
  activeMenu.value = activeMenu.value === menu ? null : menu;
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

const copyText = () => {
  const node = document.createElement('div');
  node.innerHTML = htmlOutput.value;
  const text = node.innerText || node.textContent || '';
  navigator.clipboard.writeText(text).then(() => {
    toastState.value.message = '✓ 已复制纯文本到剪贴板';
    toastState.value.type = 'success';
    toastState.value.visible = true;
    setTimeout(() => { toastState.value.visible = false }, 2000);
  });
};

const visualOverridesCss = computed(() => {
  let css = '';
  const tv = visualTheme;
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



const syncToPlatform = (plat: 'wechat' | 'zhihu' | 'juejin' | 'csdn') => {
  copyHtml(plat === 'csdn' ? 'juejin' : plat as any);
  isSyncModalVisible.value = false;
  
  const urls: Record<string, string> = {
    wechat: 'https://mp.weixin.qq.com/',
    zhihu: 'https://zhuanlan.zhihu.com/write',
    juejin: 'https://juejin.cn/editor/drafts/new',
    csdn: 'https://mp.csdn.net/mp_blog/creation/editor'
  };
  
  window.setTimeout(() => {
    const platNames: Record<string, string> = { wechat: '微信公众号', zhihu: '知乎专栏', juejin: '稀土掘金', csdn: 'CSDN博客' };
    window.open(urls[plat], '_blank');
    showToast(`内容与样式已成功提取为富文本剪贴板！已为您跳转至 ${platNames[plat]}，请直接使用 Ctrl+V 粘贴完成发布。`, 'success');
  }, 100);
};

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
const viewMode = ref<'pc' | 'mobile'>('mobile');

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
    input.accept = '.md, .txt';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        content.value = e.target.result;
        showToast("✅ SaaS云通道：成功解析导入 Markdown 文档", "success");
      };
      reader.readAsText(file);
    };
    input.click();
  }
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
  isPreviewMode.value = !isPreviewMode.value;
  showToast(isPreviewMode.value ? "已进入沉浸预览模式" : "已退出沉浸预览模式", "success");
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
    <component :is="'style'" v-if="visualOverridesCss" id="dynamic-visual-theme">{{ visualOverridesCss }}</component>
    
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
              <div class="dropdown-item" @click="viewMode = 'pc'">
                <span class="check-icon">{{ viewMode === 'pc' ? '✅' : '　' }}</span>宽屏 PC 预览
              </div>
              <div class="dropdown-item" @click="viewMode = 'mobile'">
                <span class="check-icon">{{ viewMode === 'mobile' ? '✅' : '　' }}</span>Mobile 手机预览
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="togglePreviewMode">{{ isPreviewMode ? '关闭预览模式' : '开启沉浸全屏' }}</div>
              <div class="dropdown-item" @click="toggleMacCodeBlock">{{ isMacCodeBlock ? '关闭' : '开启' }} Mac代码块风格</div>
            </div>
          </div>
          <!-- Settings Menu -->
          <div class="menu-item" @click.stop="toggleMenu('settings')">
            设置
            <div class="dropdown-menu" v-show="activeMenu === 'settings'">
              <div class="dropdown-item" @click="isImageConfigVisible = true; activeMenu = null">配置图床 (Image Host)</div>
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
        <div class="view-toggles-pill">
          <button class="pill-btn" :class="{active: viewMode === 'pc'}" @click="viewMode = 'pc'">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            PC 版式
          </button>
          <button class="pill-btn" :class="{active: viewMode === 'mobile'}" @click="viewMode = 'mobile'">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            手机壳预览
          </button>
        </div>

        <!-- NEW CTA: Article Distribution Platform -->
        <div class="publish-action">
           <button class="publish-btn" @click="isSyncModalVisible = true"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 2l-2 22-7-6.2-4 4V13L21 2zm-8.8 9.3l-8.6 4.3 18.6-11.6z"></path></svg> 跨平台同步中心 (COSE)</button>
        </div>
      </div>    </header>

    <!-- Tier 2: Formatting Toolbar -->
    <div class="octopus-header formatting-toolbar">
      <div class="format-actions">
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
        <input type="file" ref="fileInput" @change="handleFileSelected" accept="image/*" style="display: none" />
        <button class="icon-btn" title="引用" @click="insertFormat('\n> ', '')" style="font-weight: 800; font-size: 1.2rem; line-height: 1; font-family: Times, serif;">"</button>
        <button class="icon-btn" title="格式化排版" @click="formatMd"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg></button>

        <div class="toolbar-divider"></div>
        <button class="icon-btn" title="配置服务器或图床" @click="isImageConfigVisible = true; activeMenu = null"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></button>
        <button class="icon-btn" title="转微信脚注 / 外部链接转换" @click="toggleLinkFootnote"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span style="position: absolute; font-size: 9px; right: -2px; bottom: -2px; font-weight: bold; background: var(--bg-hover); border-radius: 4px; padding: 0 3px;">WX</span></button>
        <button class="icon-btn" title="MAC 风格代码块" :class="{ active: isMacCodeBlock }" @click="toggleMacCodeBlock" :style="{ color: isMacCodeBlock ? 'var(--accent-color)' : '', background: isMacCodeBlock ? 'rgba(56, 189, 248, 0.1)' : '' }"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><circle cx="6" cy="7" r="1.5"></circle><circle cx="12" cy="7" r="1.5"></circle></svg></button>
        <button class="icon-btn" title="沉浸视图 / 全屏" @click="togglePreviewMode" :style="{ color: isPreviewMode ? 'var(--accent-color)' : '' }"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg></button>
      </div>

      <div class="actions" style="display: flex; gap: 12px; align-items: center;">

        <div class="theme-select-group">
          <span class="modern-label"><span style="font-weight:900;margin-right:2px;font-family:serif;">Aa</span>正文字体</span>
          <select v-model="useSerifFont" class="modern-select" style="min-width: 140px;">
            <option :value="false">无衬线体 (标准)</option>
            <option :value="true">经典衬线 (学术)</option>
          </select>
        </div>

        <div class="theme-select-group">
          <span class="modern-label"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>代码块</span>
          <select v-model="selectedCodeTheme" class="modern-select">
            <option v-for="c in codeThemes" :key="c.id" :value="c.id">{{c.name}}</option>
          </select>
        </div>

        <div class="theme-select-group">
          <span class="modern-label"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>排版主题</span>
          <select v-model="selectedTheme" class="modern-select">
            <option v-for="t in themes" :key="t.id" :value="t.id">{{t.name}}</option>
          </select>
        </div>

        <button class="btn btn-native" style="padding: 4px 10px; font-size: 0.85rem;" @click="isVisualConfigVisible = true; activeMenu = null">🎨 深度定制设计</button>
        <button class="btn btn-native" style="padding: 4px 10px; font-size: 0.85rem;" @click="activeMenu = activeMenu === 'css' ? null : 'css'">⚙️ 实时 CSS</button>

      </div>
    </div>

    <div v-if="hasExternalLinks && showLinkWarning" class="wx-link-alert">
      <div class="wx-link-msg">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        智能探测：检测到外部链接！微信公众号不支持外链点击，推荐将其转为专属“脚注格式”。
      </div>
      <div class="wx-link-acts">
        <button class="wx-btn-primary" @click="toggleLinkFootnote(); showLinkWarning = false">一键转换脚注</button>
        <button class="wx-btn-close" @click="showLinkWarning = false"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>

    <main class="workspace" :class="{ 'is-dragging': isDragging }">
      <div v-show="!isPreviewMode" class="editor-pane" :style="{ width: isEditingTheme ? '33.333%' : (leftWidth + '%') }">
        
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

        <div class="cm-wrapper">
          <Codemirror
            v-model="content"
            placeholder="Start writing..."
            :style="{ height: '100%', width: '100%', fontSize: '15px' }"
            :autofocus="true"
            :indent-with-tab="true"
            :tab-size="2"
            :extensions="extensions"
            @ready="handleReady"
            @focus="showToc = false"
            @change="showToc = false"
          />
        </div>
      </div>

      <!-- Draggable Splitter -->
      <div v-show="!isPreviewMode && !isEditingTheme" class="resizer" @mousedown.prevent="startDrag">
        <div class="resizer-handle"></div>
      </div>

      <div class="preview-pane" :class="{ 'is-mobile': viewMode === 'mobile' }" ref="previewContainer" :style="{ width: isPreviewMode ? '100%' : (isEditingTheme ? '33.333%' : (100 - leftWidth + '%')) }">
        <!-- Floating Quick Actions Restored -->
        <div class="floating-toolbar" style="position: absolute; top: 16px; right: 24px; z-index: 1000; display: flex; flex-direction: column; gap: 8px;">
          <!-- WeChat Copy Button -->
          <button class="icon-btn floating-action" title="一键复制公众号文章" @click="copyHtml('wechat')" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-panel); box-shadow: var(--shadow-glass); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); border: 1px solid var(--border-color); color: var(--text-primary); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
             <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </button>
          
          <!-- Plain Text Copy Button -->
          <button class="icon-btn floating-action" title="复制全平台纯文本" @click="copyText()" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-panel); box-shadow: var(--shadow-glass); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); border: 1px solid var(--border-color); color: var(--text-primary); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
             <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          
          <!-- Fullscreen Toggle Button -->
          <button class="icon-btn floating-action" title="全屏沉浸预览 (Zen Mode)" @click="togglePreviewMode" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-panel); box-shadow: var(--shadow-glass); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); border: 1px solid var(--border-color); color: var(--text-primary); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
             <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
          </button>
        </div>
        
        <!-- Inject dynamic CSS raw strings explicitly into the DOM -->
        <component :is="'style'" v-if="themeStyleContent && !isEditingTheme" id="markdown-theme">{{ themeStyleContent }}</component>
        <component :is="'style'" v-if="codeThemeStyleContent" id="code-theme">{{ codeThemeStyleContent }}</component>
        <component :is="'style'" v-if="customStyleContent && isEditingTheme" id="custom-theme">{{ customStyleContent }}</component>
        
        <div class="preview-content" :class="extraCssClass" v-html="htmlOutput"></div>
        


      </div>
      
      <!-- Tier 3 CSS Pane for 3-Column Layout (Moved to the Far Right) -->
      <div v-show="isEditingTheme && !isPreviewMode" class="editor-pane css-pane" style="width: 33.333%; border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column;">
        <div style="background: var(--bg-panel); padding: 0.6rem 1rem; color: var(--text-primary); font-weight: bold; border-bottom: 1px solid var(--border-subtle);">
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
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px;">系统将通过深层 DOM 提取内联样式并锁定入富文本剪贴板，随后自动为您调起目标平台的编辑后台。<br/>您只需在目标编辑器按下 <kbd style="background:var(--bg-active);padding:2px 4px;border-radius:4px;border:1px solid var(--border-strong);">Ctrl+V</kbd> 即可完成 100% 格式无损同步。</p>
            
            <div class="sync-platform-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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
            
            <div class="modal-actions" style="margin-top: 1.5rem;">
              <button class="btn btn-primary" style="width: 100%; justify-content: center;" @click="isImageConfigVisible = false">保存并关闭</button>
            </div>
          </div>

          <!-- Visual Theme Designer Modal (Word-style Configuration) -->
          <div v-if="isVisualConfigVisible" class="export-modal custom-modal visual-modal" style="width: 550px; max-width: 95vw;">
            <h3 style="margin-top:0; margin-bottom: 1rem; color: var(--text-primary);">🎨 深度视觉定制 (Visual Builder)</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5;">无需编写 CSS 代码。在此调整任意数值即可实时覆盖底层排版风格。留空将使用当前主题默认值。</p>
            
            <div class="visual-accordion">
              <!-- Globals -->
              <div class="visual-section">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--accent-color); border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">🌐 全局参数 (Global)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div class="setting-item">
                    <label>基础字号 (px)</label>
                    <input type="number" v-model="visualTheme.baseFontSize" placeholder="例如: 15" class="setting-input"/>
                  </div>
                  <div class="setting-item">
                    <label>正文行高</label>
                    <input type="number" step="0.1" v-model="visualTheme.lineHeight" placeholder="例如: 1.8" class="setting-input"/>
                  </div>
                  <div class="setting-item">
                    <label>全局文字颜色</label>
                    <div style="display: flex; gap: 8px;">
                      <input type="color" v-model="visualTheme.baseColor" style="flex: 0 0 40px; height: 32px; border:none; border-radius:4px; padding:0; cursor:pointer;"/>
                      <input type="text" v-model="visualTheme.baseColor" placeholder="#333333" class="setting-input" style="flex: 1;"/>
                    </div>
                  </div>
                  <div class="setting-item">
                    <label>主题强调色 (主色)</label>
                    <div style="display: flex; gap: 8px;">
                      <input type="color" v-model="visualTheme.primaryColor" style="flex: 0 0 40px; height: 32px; border:none; border-radius:4px; padding:0; cursor:pointer;"/>
                      <input type="text" v-model="visualTheme.primaryColor" placeholder="#ff0080" class="setting-input" style="flex: 1;"/>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Headings -->
              <div class="visual-section" style="margin-top: 24px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--accent-color); border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">📝 标题等级 (Headings)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div class="setting-item">
                    <label>通用排版对齐</label>
                    <select v-model="visualTheme.headingAlign" class="setting-input">
                      <option value="">默认 (由主题控制)</option>
                      <option value="left">左对齐 (Left)</option>
                      <option value="center">居中 (Center)</option>
                    </select>
                  </div>
                  <div class="setting-item">
                    <label>H1 一级标题 (px)</label>
                    <input type="number" v-model="visualTheme.h1Size" placeholder="例如: 24" class="setting-input"/>
                  </div>
                  <div class="setting-item">
                    <label>H2 二级标题 (px)</label>
                    <input type="number" v-model="visualTheme.h2Size" placeholder="例如: 20" class="setting-input"/>
                  </div>
                  <div class="setting-item">
                    <label>H3 三级标题 (px)</label>
                    <input type="number" v-model="visualTheme.h3Size" placeholder="例如: 18" class="setting-input"/>
                  </div>
                </div>
              </div>
              
              <!-- Paragraphs -->
              <div class="visual-section" style="margin-top: 24px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--accent-color); border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">📐 细节组件 (Blocks)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div class="setting-item">
                    <label>段落上下外边距 (px)</label>
                    <input type="number" v-model="visualTheme.paragraphMargin" placeholder="例如: 16" class="setting-input"/>
                  </div>
                  <div class="setting-item">
                    <label>引用块竖线颜色</label>
                    <div style="display: flex; gap: 8px;">
                      <input type="color" v-model="visualTheme.blockquoteColor" style="flex: 0 0 40px; height: 32px; border:none; border-radius:4px; padding:0; cursor:pointer;"/>
                      <input type="text" v-model="visualTheme.blockquoteColor" placeholder="#cccccc" class="setting-input" style="flex: 1;"/>
                    </div>
                  </div>
                  <div class="setting-item" style="grid-column: span 2;">
                    <label>引用块背景色</label>
                    <div style="display: flex; gap: 8px;">
                      <input type="color" v-model="visualTheme.blockquoteBg" style="flex: 0 0 40px; height: 32px; border:none; border-radius:4px; padding:0; cursor:pointer;"/>
                      <input type="text" v-model="visualTheme.blockquoteBg" placeholder="例如: rgba(0,0,0,0.05)" class="setting-input" style="flex: 1;"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="text-align: right; margin-top: 32px; display: flex; justify-content: space-between; align-items: center;">
              <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size:0.9rem;" @click="clearVisualTheme">🗑️ 清空所有定制</button>
              <button class="btn btn-primary" style="padding: 8px 24px; font-weight: 600;" @click="isVisualConfigVisible = false">应用定制并关闭 (Apply)</button>
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

    <!-- Tier 4: Bottom Status Bar -->
    <footer v-show="!isPreviewMode" class="octopus-status-bar">
      <div class="status-left">
        <span class="status-item">字符数: <strong style="color: var(--text-primary)">{{ wordCount }}</strong></span>
        <span class="status-item">行数: <strong style="color: var(--text-primary)">{{ lineCount }}</strong></span>
      </div>
      <div class="status-right">
        <span class="status-item" style="color: #10b981" v-if="isDesktop"><svg style="vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>桌面原生核心加载完毕</span>
        <span class="status-item" style="color: #f59e0b" v-else><svg style="vertical-align: middle; margin-right: 4px;" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>纯Web沙盒云模式</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body {
  margin: 0; padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-app);
}

/* Workspace Specific Scrollbars - Dual Mode (Dark/Light) */
/* Light Mode Scrollbar for Preview Pane */
.preview-pane::-webkit-scrollbar {
  width: 14px;
  height: 14px;
}
.preview-pane::-webkit-scrollbar-track {
  background: transparent;
}
.preview-pane::-webkit-scrollbar-thumb {
  background: var(--text-primary);
  border: 4px solid var(--bg-preview); /* Match preview-pane background */
  border-radius: 9999px;
  background-clip: padding-box;
}
.preview-pane::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
  border: 4px solid var(--bg-preview);
}

/* Dark Mode Scrollbar for Editor/CSS Panes */
.editor-pane-scrollbar-mixin,
.editor-pane ::v-deep(.cm-scroller)::-webkit-scrollbar {
  width: 14px;
  height: 14px;
}
.editor-pane ::v-deep(.cm-scroller)::-webkit-scrollbar-track {
  background: transparent;
}
.editor-pane ::v-deep(.cm-scroller)::-webkit-scrollbar-thumb {
  background: #475569;
  border: 4px solid var(--bg-panel); /* Match editor background */
  border-radius: 9999px;
  background-clip: padding-box;
}
.editor-pane ::v-deep(.cm-scroller)::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
  border: 4px solid var(--bg-panel);
}

.octopus-layout {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg-app);
  color: var(--text-primary);
  overflow: hidden;
  padding: 16px 20px;
  gap: 16px;
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

/* Ambient Deep Glow in the Background */
.octopus-layout::before {
  content: '';
  position: absolute;
  top: -10vw;
  left: -10vw;
  width: 50vw;
  height: 50vw;
  background: var(--ambient-glow);
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.5;
  z-index: 0;
  pointer-events: none;
}
.octopus-layout > * {
  z-index: 1; /* Keep content above ambient glow */
}

.octopus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--bg-toolbar);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  z-index: 100;
  transition: all var(--transition-speed) var(--transition-timing);
}

.system-menu-bar {
  padding: 0.5rem 1.5rem;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
  z-index: 200;
  box-shadow: none;
  display: flex;
  justify-content: space-between;
}

.system-menu-bar .brand-group {
  flex: 1;
}

.system-menu-bar .actions {
  flex: 1;
}

.formatting-toolbar {
  padding: 0.5rem 1.5rem;
  background: var(--bg-toolbar);
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  border-bottom: 1px solid var(--border-subtle);
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
  gap: 0.5rem;
  margin-left: 1rem;
}

.menu-item {
  color: var(--text-secondary);
  font-size: 0.88rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
  user-select: none;
}

.menu-item:hover, .menu-item.active {
  color: var(--text-primary);
  background: var(--border-strong);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: var(--bg-panel);
  min-width: 180px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  z-index: 100;
  padding: 6px;
  animation: menuFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes menuFadeIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dropdown-menu-large {
  min-width: 220px;
}

.dropdown-item {
  padding: 6px 12px;
  margin: 2px 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dropdown-item .shortcut {
  color: var(--text-muted);
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
  margin: 4px 6px;
}

.format-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.icon-btn {
  background: transparent;
  color: var(--text-primary);
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
  position: relative;
}

.icon-btn:hover {
  background: var(--border-strong);
  color: var(--text-primary);
  border-color: var(--border-strong);
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
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #FF0080, #7928CA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
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
  border-radius: 6px;
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
  background: linear-gradient(to right, var(--accent-color), #4f46e5);
  color: var(--text-primary);
}

.btn-copy {
  background: linear-gradient(to right, #f59e0b, #d97706);
  color: var(--text-primary);
}

.btn-native {
  background: var(--border-strong);
  color: #f1f5f9;
  border: 1px solid var(--border-strong);
}

.btn-wechat {
  background: linear-gradient(to right, #059669, #10b981);
  color: var(--text-primary);
}

.workspace {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  min-height: 0; /* CRITICAL BUGFIX: Prevents flex children blowout */
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  box-shadow: 
    var(--shadow-glass),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05); /* Premium Top Border Glow */
  background: var(--bg-panel);
  transition: all var(--transition-speed) var(--transition-timing);
}

.workspace.is-dragging {
  cursor: col-resize;
  user-select: none;
}

.editor-pane {
  height: 100%;
  border-right: 1px solid var(--border-subtle);
  background: var(--bg-panel);
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
}
.editor-pane ::v-deep(.cm-scroller) {
  overflow-y: auto;
  overflow-x: auto;
  height: 100%;
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
  height: 48px;
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
.toc-content::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
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
  background: var(--bg-preview);  /* Edge-to-edge true white PC view */
  color: var(--text-primary);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.preview-pane::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border: 2px solid transparent;
  background-clip: padding-box;
}
.preview-pane::-webkit-scrollbar-thumb:hover {
  background: var(--border-strong);
}

.preview-pane.is-mobile {
  background: var(--bg-app);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 0;
}

.preview-content {
  padding: 2.5rem 3rem 4rem 3rem !important; /* Soft bottom flow */
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  min-height: 100% !important;
  background: var(--bg-preview) !important;
  box-sizing: border-box !important;
  border: none !important;
  box-shadow: none !important;
}

.view-toggles-pill {
  display: flex;
  background: var(--bg-app); /* Match the dark nav background */
}

/* --- UI Components --- */

.theme-select-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-panel);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-strong);
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
  border-radius: 8px;
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
  border-radius: 46px !important;
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
  border-radius: 20px;
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
  border-radius: 4px 0 0 4px;
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
  border-radius: 8px;
  margin-right: 1.5rem;
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.3), 0 1px 1px var(--border-subtle);
}
.view-toggles .btn-toggle {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 6px;
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
  border-radius: 6px;
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
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-icon-text:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.copy-group {
  display: flex;
  background: var(--bg-hover);
  border-radius: 6px;
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
  border-radius: 6px;
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
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px var(--border-subtle);
}

.pill-btn {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 6px;
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
  border-radius: 20px;
  box-shadow: var(--shadow-glass); /* Bugfix: Premium generic shadow instead of hardcoded dark shadow */
  z-index: 50;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.float-btn {
  width: 44px; height: 44px;
  border-radius: 12px;
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
  border-radius: 16px;
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
  border-radius: 14px;
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
  border-radius: 8px;
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
  border-radius: 50%;
  display: inline-block;
}
.mac-code-block pre.hljs {
  margin: 0 !important;
  border-radius: 0 0 8px 8px !important;
}

/* User-Requested UI Component Polish (Segments) */
.view-toggles-pill {
  display: flex;
  background: var(--bg-hover);
  padding: 4px;
  border-radius: 10px;
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
  border-radius: 6px;
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

/* WX Link Auto Detection Banner */
.wx-link-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.3);
  padding: 8px 16px;
  color: var(--text-primary);
  font-size: 13px;
  border-radius: 8px;
  margin: 0 20px 10px 20px;
  box-shadow: 0 2px 8px rgba(234, 179, 8, 0.08), inset 0 1px 0 rgba(255,255,255,0.2);
  animation: appEntry 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  z-index: 50;
}
html.dark .wx-link-alert {
  background: rgba(234, 179, 8, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.wx-link-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c2410c; 
  font-weight: 500;
}
html.dark .wx-link-msg { color: #facc15; }

.wx-link-acts {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wx-btn-primary {
  background: var(--bg-panel);
  border: 1px solid #eab308;
  color: #c2410c;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.wx-btn-primary:hover {
  background: #eab308;
  color: #ffffff;
}
html.dark .wx-btn-primary {
  color: #fce68a;
  border-color: #ca8a04;
}
html.dark .wx-btn-primary:hover {
  color: #1e293b;
}
.wx-btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
}
.wx-btn-close:hover {
  background: rgba(234, 179, 8, 0.2);
  color: #ca8a04;
}
</style>
