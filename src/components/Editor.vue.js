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
import { uploadImage } from '../utils/uploader';
import { syncToWechatDraft } from '../utils/wechat';
// Static raw CSS imports to bypass Vite dynamic loader sandbox and CDN blocks
import githubCss from 'highlight.js/styles/github.css?raw';
import vs2015Css from 'highlight.js/styles/vs2015.css?raw';
import atomOneDarkCss from 'highlight.js/styles/atom-one-dark.css?raw';
import atomOneLightCss from 'highlight.js/styles/atom-one-light.css?raw';
import monokaiCss from 'highlight.js/styles/monokai.css?raw';
import draculaCss from 'highlight.js/styles/base16/dracula.css?raw';
import tutorialDoc from '../assets/tutorial.md?raw';
const codeThemeMap = {
    'github': githubCss,
    'vs2015': vs2015Css,
    'atom-one-dark': atomOneDarkCss,
    'atom-one-light': atomOneLightCss,
    'monokai': monokaiCss,
    'dracula': draculaCss
};
// --- Image Cropper Logic ---
const isCropperOpen = ref(false);
const currentCropImageUrl = ref('');
const openCropper = (url) => {
    currentCropImageUrl.value = url;
    isCropperOpen.value = true;
};
const closeCropper = () => {
    isCropperOpen.value = false;
    currentCropImageUrl.value = '';
};
const handlePreviewClick = (e) => {
    const target = e.target;
    if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
        const src = target.getAttribute('src');
        if (src && !src.startsWith('data:image')) {
            openCropper(src);
        }
    }
};
const handleCropSave = async (file) => {
    try {
        const oldUrl = currentCropImageUrl.value;
        // Build a temp config fallback to GitHub or picgo if not strictly typed
        let conf = { provider: 'picgo' };
        const stored = localStorage.getItem('octopus-img');
        if (stored) {
            try {
                conf = JSON.parse(stored);
            }
            catch (e) { }
        }
        const newUrl = await uploadImage(file, conf);
        // Replace markdown string
        content.value = content.value.replace(oldUrl, newUrl);
        closeCropper();
        // Toast
        if (typeof showToast === "function") {
            showToast("图片裁剪并替换成功", "success");
        }
    }
    catch (e) {
        console.error(e);
        if (typeof showToast === "function")
            showToast("替换失败：" + e.message, "error");
    }
};
// --- End Image Cropper Logic ---
const isDesktop = ref(!!window.electronAPI);
const isWechatAvailable = ref(!!window.wechatAPI);
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
const loadTheme = async (themeId) => {
    try {
        const baseCssObj = await import(`../assets/themes/_base/basic.css?raw`);
        const themeCssObj = await import(`../assets/themes/${themeId}.css?raw`);
        themeStyleContent.value = (baseCssObj.default || "") + "\n\n/* ----- THEME OVERRIDES ----- */\n\n" + (themeCssObj.default || "");
    }
    catch (e) {
        console.error("Theme load failed", e);
    }
};
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
const loadCodeTheme = (themeId) => {
    try {
        const rawCss = codeThemeMap[themeId] || "";
        const boostedCss = rawCss.replace(/(^|}|,)\s*([^{}]+?)\s*(?={|,)/g, (m, prefix, selector) => {
            const sel = selector.trim();
            if (sel.startsWith('@') || sel === '')
                return m;
            return `${prefix}\n#nice ${sel}`;
        });
        codeThemeStyleContent.value = boostedCss;
    }
    catch (e) {
        console.error("Code Theme load failed", e);
    }
};
watch(selectedCodeTheme, (val) => loadCodeTheme(val));
onMounted(() => loadCodeTheme(selectedCodeTheme.value));
const isEditingTheme = ref(false);
const dsTab = ref('core');
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
const startZenDrag = (e) => {
    isZenDragging = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startZenX = zenX.value;
    startZenY = zenY.value;
    document.addEventListener('mousemove', onZenDrag);
    document.addEventListener('mouseup', endZenDrag);
};
const onZenDrag = (e) => {
    if (!isZenDragging)
        return;
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
const content = ref(`
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
const htmlOutput = ref('');
const previewContainer = ref(null);
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
const tocList = ref([]);
const showToc = ref(true);
console.log('showToc init to:', showToc.value);
const externalLinks = ref([]);
const hasExternalLinks = computed(() => externalLinks.value.length > 0);
const activeExtLinkIdx = ref(0);
const showLinkWarning = ref(true);
const userDismissedLinkRadar = ref(false);
const isLinkRadarExpanded = ref(false);
let linkCheckDebounce = null;
const jumpToExtLine = (direction) => {
    if (externalLinks.value.length === 0)
        return;
    if (direction === 'next') {
        activeExtLinkIdx.value = (activeExtLinkIdx.value + 1) % externalLinks.value.length;
    }
    else if (direction === 'prev') {
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
        }
        catch (e) { }
    }
};
watch(content, (newVal) => {
    const lines = newVal.split('\n');
    const items = [];
    let inCodeBlock = false;
    if (linkCheckDebounce)
        window.clearTimeout(linkCheckDebounce);
    linkCheckDebounce = window.setTimeout(() => {
        const linksFound = [];
        const extLinkRegex = /(?:^|[^!])\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g;
        let isInsideCode = false;
        lines.forEach((lineText, idx) => {
            if (lineText.trim().startsWith('```')) {
                isInsideCode = !isInsideCode;
                return;
            }
            if (isInsideCode)
                return;
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
        }
        else if (linksFound.length === 0) {
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
        if (inCodeBlock)
            continue;
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
const scrollToLine = (lineNode) => {
    if (!view.value)
        return;
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
function markdownItSpan(md) {
    md.core.ruler.push("heading_span", (state) => {
        for (let i = 0; i < state.tokens.length - 1; i++) {
            if (state.tokens[i].type !== "heading_open" || state.tokens[i + 1].type !== "inline")
                continue;
            const inlineToken = state.tokens[i + 1];
            if (!inlineToken.content)
                continue;
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
function markdownItTableContainer(md) {
    md.core.ruler.push("table-container", (state) => {
        const arr = [];
        for (let i = 0; i < state.tokens.length; i++) {
            const cur = state.tokens[i];
            if (cur.type === "table_open") {
                const span = new state.Token("html_inline", "", 0);
                span.content = `<section class="table-container">`;
                arr.push(span);
                arr.push(cur);
            }
            else if (cur.type === "table_close") {
                const span = new state.Token("html_inline", "", 0);
                span.content = `</section>`;
                arr.push(cur);
                arr.push(span);
            }
            else {
                arr.push(cur);
            }
        }
        state.tokens = arr;
    });
}
function markdownItLiReplacer(md) {
    md.renderer.rules.list_item_open = () => "<li><section>";
    md.renderer.rules.list_item_close = () => "</section></li>";
}
function markdownItMultiquote(md) {
    md.core.ruler.push("blockquote-class", (state) => {
        let count = 0;
        let outerQuote;
        for (let i = 0; i < state.tokens.length; i++) {
            const cur = state.tokens[i];
            if (cur.type === "blockquote_open") {
                if (count === 0)
                    outerQuote = cur;
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
function markdownItImageFlow(md) {
    const tokenize = (state, start) => {
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
    md.renderer.rules.imageFlow = (tokens, idx) => {
        const start = `<section class="imageflow-layer1"><section class="imageflow-layer2">`;
        const end = `</section></section><p class="imageflow-caption"><<< 左右滑动见更多 >>></p>`;
        const contents = tokens[idx].meta;
        let wrappedContent = "";
        contents.forEach((content) => {
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
    highlight: function (str, lang) {
        const escapeHtml = (s) => s.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="custom hljs"><code>' + hljs.highlight(str, { language: lang }).value + '</code></pre>';
            }
            catch (__) { }
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
    .use(window.markdownitContainer || (() => { }), 'shadow', {
    render: function (tokens, idx) {
        if (tokens[idx].nesting === 1) {
            return '<div class="mdnice-shadow" style="box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">\n';
        }
        else {
            return '</div>\n';
        }
    }
})
    .use(window.markdownitContainer || (() => { }), 'center', {
    render: function (tokens, idx) {
        if (tokens[idx].nesting === 1) {
            return '<div class="mdnice-center" style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 1em;">\n';
        }
        else {
            return '</div>\n';
        }
    }
})
    .use(window.markdownitRUBY || (() => { })); // Doocs Parity: Ruby {注音}
// History Tracking
const savedDrafts = ref([]);
const isHistoryVisible = ref(false);
const loadDraftsHistory = () => {
    try {
        savedDrafts.value = JSON.parse(localStorage.getItem('octopus_snapshots') || '[]');
    }
    catch (e) { }
    isHistoryVisible.value = true;
    activeMenu.value = null;
};
const restoreDraft = (draftContent) => {
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
const dispatchAICall = async (sysPrompt, userText) => {
    if (!uploadConfig.value.aiEndpoint) {
        showToast('⚠️ 未配置 API Endpoint 端点，请进入 [上传与配置] 面板设置', 'error');
        isAIAssistantVisible.value = false;
        isImageConfigVisible.value = true;
        return;
    }
    isAILoading.value = true;
    aiResponse.value = '🧠 AI模型引擎思考中...';
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (uploadConfig.value.aiKey)
            headers['Authorization'] = `Bearer ${uploadConfig.value.aiKey}`;
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
        if (data.error)
            throw new Error(data.error.message);
        aiResponse.value = data.choices[0].message.content;
    }
    catch (e) {
        aiResponse.value = `❌ 调用失败: ${e.message}`;
    }
    finally {
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
    if (!t2iPrompt.value.trim())
        return;
    isT2ILoading.value = true;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (uploadConfig.value.aiKey)
            headers['Authorization'] = `Bearer ${uploadConfig.value.aiKey}`;
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
        if (data.error)
            throw new Error(data.error.message);
        const imgUrl = data.data[0].url;
        const imgSyntax = `\n![AI生成图像](${imgUrl})\n`;
        if (view.value) {
            const pos = view.value.state.selection.main.head;
            view.value.dispatch({ changes: { from: pos, insert: imgSyntax } });
            showToast('✅ 图片已插入文章成功！', 'success');
        }
        isAITextToImageVisible.value = false;
    }
    catch (e) {
        showToast(`❌ 生成失败: ${e.message}`, 'error');
    }
    finally {
        isT2ILoading.value = false;
    }
};
// Unified Toast System
const toastState = ref({ message: '', type: 'info', visible: false });
let toastTimer = null;
const showToast = (msg, type = 'info') => {
    toastState.value = { message: msg, type, visible: true };
    if (toastTimer)
        clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastState.value.visible = false; }, 3500);
};
// Unified Modal System
const modalState = ref({ visible: false, title: '', message: '', isConfirm: false, onResolve: null });
const showModal = (title, message, isConfirm = false) => {
    return new Promise(resolve => {
        modalState.value = { visible: true, title, message, isConfirm, onResolve: resolve };
    });
};
const clsoeModal = (result) => {
    modalState.value.visible = false;
    if (modalState.value.onResolve)
        modalState.value.onResolve(result);
};
// Clipboard 
const copyToClipboard = (text) => {
    if (navigator && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast('回复内容已复制入剪切板', 'success');
    }
};
// Replace standard alerts
const customAlert = (msg) => showModal("提示", msg, false);
const customConfirm = (msg) => showModal("确认操作", msg, true);
// Image Upload State
const isImageConfigVisible = ref(false);
const uploadConfig = ref((() => {
    try {
        const saved = localStorage.getItem('octopus-upload-config');
        const parsed = saved ? JSON.parse(saved) : { provider: 'base64' };
        if (!parsed.aiEndpoint)
            parsed.aiEndpoint = 'https://proxy-ai.doocs.org/v1';
        if (!parsed.aiKey)
            parsed.aiKey = '';
        if (!parsed.aiModel)
            parsed.aiModel = 'Qwen/Qwen2.5-7B-Instruct';
        if (!parsed.aiImageModel)
            parsed.aiImageModel = 'Kwai-Kolors/Kolors';
        return parsed;
    }
    catch {
        return { provider: 'base64', aiEndpoint: 'https://proxy-ai.doocs.org/v1', aiKey: '', aiModel: 'Qwen/Qwen2.5-7B-Instruct', aiImageModel: 'Kwai-Kolors/Kolors' };
    }
})());
watch(uploadConfig, (val) => localStorage.setItem('octopus-upload-config', JSON.stringify(val)), { deep: true });
// Manual Toolbar Image Upload
const fileInput = ref(null);
const triggerImageUpload = () => {
    if (fileInput.value) {
        fileInput.value.value = '';
        fileInput.value.click();
    }
};
const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file)
        return;
    if (view.value) {
        const pos = view.value.state.selection.main.head;
        handleFileUpload(file, view.value, pos);
    }
};
const handleFileUpload = async (file, viewArg, pos) => {
    if (!file.type.startsWith('image/'))
        return;
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
    }
    catch (e) {
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
                    refsHtml += `<section id="fn${num}" class="footnote-item"><span class="footnote-num">[${num}] </span><p><span class="footnote-word">${a.textContent.replace(`[${num}]`, '')}</span>: <em>${a.href}</em></p></section>\n`;
                }
            });
            refsHtml += '</section>';
            if (showReferences.value) {
                rawHtml = doc.body.innerHTML + refsHtml;
            }
            else {
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
const activeMenu = ref(null);
const toggleMenu = (menu) => {
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
const closeMenu = (e) => {
    if (!e.target.closest('.menu-item')) {
        activeMenu.value = null;
    }
};
onMounted(() => document.addEventListener('click', closeMenu));
onUnmounted(() => document.removeEventListener('click', closeMenu));
const formatMd = async () => {
    if (window.prettier && window.prettierPlugins) {
        try {
            const formatted = await window.prettier.format(content.value, {
                parser: 'markdown',
                plugins: [window.prettierPlugins.markdown],
                proseWrap: 'preserve'
            });
            content.value = formatted;
            showToast("✨ Prettier AST 格式化重绘完毕！", "success");
            return;
        }
        catch (e) {
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
        if (htmlContent && window.TurndownService) {
            const turndownService = new window.TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
            const md = turndownService.turndown(htmlContent);
            content.value = content.value ? content.value + '\n\n' + md : md;
            showToast("✅ 已成功提取剪贴板网页富文本，转化并追加 Markdown！", "success");
        }
        else if (!htmlContent) {
            customAlert("您的剪贴板目前为空，或未包含任何网页富文本格式 (text/html)。请先去网页上高亮并复制一段图文。");
        }
        else {
            customAlert("Turndown 解析引擎未加载完成，请刷新页面。");
        }
    }
    catch (err) {
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
    }
    else {
        document.exitFullscreen();
    }
};
const showAbout = () => {
    customAlert("🐙 Octopus MD\n全平台自媒体图文编辑器\nVersion 1.0.0 (Feature Parity with Markdown2Html)\n打造最高效的图文处理流。");
};
const loadTutorial = () => {
    if (confirm("确定要加载基础教程吗？\n警告：这将会完全覆盖当前编辑器中的内容！请确保您已经保存了重要的草稿。")) {
        content.value = tutorialDoc || "# 教程加载失败\n\n请检查文件是否损坏。";
        activeMenu.value = null;
        showToast("教程文档已成功加载至编辑器", "success");
    }
};
// CSS bindings for Mac Code Block and Serif
const extraCssClass = computed(() => {
    let classes = [];
    if (isMacCodeBlock.value)
        classes.push('mac-code-enabled');
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
        visualTheme[k] = '';
    });
};
const visualOverridesCss = computed(() => {
    let css = '';
    const tv = visualTheme;
    const dFont = documentFontFamily.value;
    if (dFont === 'lxgw')
        css += `@import url('https://cdn.staticfile.org/lxgw-wenkai-screen-webfont/1.6.0/lxgwwenkaiscreen.css');\n`;
    else if (dFont === 'fira')
        css += `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap');\n`;
    else if (dFont === 'jetbrains')
        css += `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');\n`;
    else if (dFont === 'zcool')
        css += `@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap');\n`;
    else if (dFont === 'zcool_huangyou')
        css += `@import url('https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap');\n`;
    else if (dFont === 'mashanzheng')
        css += `@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');\n`;
    else if (dFont === 'zhimangxing')
        css += `@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap');\n`;
    else if (dFont === 'longcang')
        css += `@import url('https://fonts.googleapis.com/css2?family=Long+Cang&display=swap');\n`;
    else if (dFont === 'smiley')
        css += `@import url('https://cdn.staticfile.net/smiley-sans/1.1.1/smiley-sans.min.css');\n`;
    else if (dFont === 'notosans')
        css += `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');\n`;
    else if (dFont === 'notoserif')
        css += `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');\n`;
    if (dFont !== 'system-sans') {
        let f = '';
        if (dFont === 'system-serif')
            f = 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif';
        else if (dFont === 'notosans')
            f = '"Noto Sans SC", sans-serif';
        else if (dFont === 'notoserif')
            f = '"Noto Serif SC", serif';
        else if (dFont === 'lxgw')
            f = '"LXGW WenKai Screen", sans-serif';
        else if (dFont === 'smiley')
            f = 'SmileySans-Oblique, sans-serif';
        else if (dFont === 'zcool')
            f = '"ZCOOL XiaoWei", serif';
        else if (dFont === 'zcool_huangyou')
            f = '"ZCOOL QingKe HuangYou", cursive';
        else if (dFont === 'mashanzheng')
            f = '"Ma Shan Zheng", cursive';
        else if (dFont === 'zhimangxing')
            f = '"Zhi Mang Xing", cursive';
        else if (dFont === 'longcang')
            f = '"Long Cang", cursive';
        else if (dFont === 'fira')
            f = '"Fira Code", monospace';
        else if (dFont === 'jetbrains')
            f = '"JetBrains Mono", monospace';
        else if (dFont === 'yahei')
            f = '"Microsoft YaHei", "微软雅黑", sans-serif';
        else if (dFont === 'pingfang')
            f = '"PingFang SC", "PingFang TC", sans-serif';
        else if (dFont === 'helvetica')
            f = '"Helvetica Neue", Helvetica, sans-serif';
        else if (dFont === 'times')
            f = '"Times New Roman", Times, serif';
        if (f)
            css += `#nice, #nice * { font-family: ${f} !important; }\n`;
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
    if (tv.h1Size)
        css += `\n#nice h1 { font-size: ${tv.h1Size}px !important; }`;
    if (tv.h2Size)
        css += `\n#nice h2 { font-size: ${tv.h2Size}px !important; }`;
    if (tv.h3Size)
        css += `\n#nice h3 { font-size: ${tv.h3Size}px !important; }`;
    if (tv.blockquoteColor || tv.blockquoteBg) {
        css += `\n#nice blockquote { ${tv.blockquoteColor ? `border-left-color: ${tv.blockquoteColor} !important;` : ''} ${tv.blockquoteBg ? `background: ${tv.blockquoteBg} !important;` : ''} }`;
    }
    return css;
});
const syncToPlatform = (plat) => {
    copyHtml(plat);
    isSyncModalVisible.value = false;
    const urls = {
        wechat: 'https://mp.weixin.qq.com/',
        zhihu: 'https://zhuanlan.zhihu.com/write',
        juejin: 'https://juejin.cn/editor/drafts/new',
        csdn: 'https://mp.csdn.net/mp_blog/creation/editor',
        twitter: 'https://twitter.com/compose/tweet',
        weibo: 'https://weibo.com/'
    };
    // URL routing is now handled safely by the sync Extension mapping in background.js.
    // We keep this generic fallback ONLY if the extension isn't installed.
    window.setTimeout(() => {
        if (!isExtensionInstalled.value) {
            window.open(urls[plat], '_blank');
        }
    }, 100);
};
// Feature: Complete CSS-Inlined HTML Copy for Multi-Platform
const copyHtml = (platform = 'wechat') => {
    if (!previewContainer.value)
        return;
    const original = previewContainer.value.querySelector('.preview-content');
    if (!original)
        return;
    const clone = original.cloneNode(true);
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
            targetNodes[i].style.cssText = cssStr;
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
            const mjx = mjxs[i];
            mjx.removeAttribute("jax");
            mjx.removeAttribute("tabindex");
            mjx.removeAttribute("ctxtmenu_counter");
            const svg = mjx.querySelector('svg');
            if (svg) {
                const width = svg.getAttribute("width");
                const height = svg.getAttribute("height");
                svg.removeAttribute("width");
                svg.removeAttribute("height");
                if (width)
                    svg.style.width = width;
                if (height)
                    svg.style.height = height;
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
        const platNames = {
            wechat: '微信公众号', zhihu: '知乎', juejin: '掘金', csdn: 'CSDN',
            weibo: '微博', twitter: 'X (Twitter)', cnblogs: '博客园',
            segmentfault: '思否', '51cto': '51CTO', oschina: '开源中国'
        };
        const platName = platNames[platform] || platform;
        // Check if the Extension bridge is listening. If yes, pass raw payloads via IPC.
        // If not, it falls back instantly to the old behavior (just copying).
        if (isExtensionInstalled.value) {
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
        if (isExtensionInstalled.value) {
            showToast(`🚀 已存入剪贴板！正由 Octopus MD 扩展接管前往【${platName}】并尝试自动注入...`, "success");
        }
        else {
            showToast(`✅ 已入板！请直接去【${platName}】粘贴以完成发布。(推荐安装 Octopus MD 扩展实现全自动)`, "success");
        }
    }
    catch (e) {
        customAlert("获取剪贴板权限失败，请确保您在 HTTPS 环境下或检查浏览器设置。");
    }
    selection?.removeAllRanges();
    document.body.removeChild(clone);
};
const extractCookie = async (platform) => {
    if (!window.platformAPI?.extractAuthCookie) {
        customAlert("⛔ [原生专属] 一键截取登录态仅支持桌面客户端！SaaS Web 端受浏览器高危沙箱限制，无法拉起独立 Cookie 嗅探池。");
        return;
    }
    try {
        let c = '';
        if (platform === 'zhihu') {
            showToast("🚀 正在拉起极速沙箱拦截知乎 Cookie...完成登录后直接关闭窗口即可！", "info");
            c = await window.platformAPI.extractAuthCookie("https://zhuanlan.zhihu.com/", ".zhihu.com");
            if (c) {
                uploadConfig.value.zhihuCookie = c;
                showToast("✅ 免密提取成功", "success");
            }
        }
        else if (platform === 'juejin') {
            showToast("🚀 正在拉起极速沙箱拦截掘金 Cookie...完成登录后直接关闭窗口即可！", "info");
            c = await window.platformAPI.extractAuthCookie("https://juejin.cn/", ".juejin.cn");
            if (c) {
                uploadConfig.value.juejinCookie = c;
                showToast("✅ 免密提取成功", "success");
            }
        }
        else if (platform === 'csdn') {
            showToast("🚀 正在拉起极速沙箱拦截 CSDN Cookie...完成登录后直接关闭窗口即可！", "info");
            c = await window.platformAPI.extractAuthCookie("https://passport.csdn.net/login", ".csdn.net");
            if (c) {
                uploadConfig.value.csdnCookie = c;
                showToast("✅ 免密提取成功", "success");
            }
        }
    }
    catch (e) {
        customAlert("提取凭证失败：" + String(e));
    }
};
// Feature: Native Desktop One-Click WeChat Synchronizer
const syncWechat = async () => {
    if (!previewContainer.value)
        return;
    const original = previewContainer.value.querySelector('.preview-content');
    if (!original)
        return;
    const clone = original.cloneNode(true);
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
            targetNodes[i].style.cssText = cssStr;
        }
    }
    const mjxs = clone.getElementsByTagName('mjx-container');
    for (let i = 0; i < mjxs.length; i++) {
        const mjx = mjxs[i];
        mjx.removeAttribute("jax");
        mjx.removeAttribute("tabindex");
        mjx.removeAttribute("ctxtmenu_counter");
        const svg = mjx.querySelector('svg');
        if (svg) {
            const width = svg.getAttribute("width");
            const height = svg.getAttribute("height");
            svg.removeAttribute("width");
            svg.removeAttribute("height");
            if (width)
                svg.style.width = width;
            if (height)
                svg.style.height = height;
        }
    }
    clone.querySelectorAll('style').forEach(s => s.remove());
    let cloneHtml = clone.innerHTML;
    cloneHtml = cloneHtml.replace(/<mjx-container([^>]*?display="true"[^>]*?)>([\s\S]*?)<\/mjx-container>/g, "<section $1>$2</section>");
    cloneHtml = cloneHtml.replace(/<mjx-container([^>]*?)>([\s\S]*?)<\/mjx-container>/g, "<span $1>$2</span>");
    cloneHtml = cloneHtml.replace(/\s<span class="MathJax"/g, '&nbsp;<span class="MathJax"');
    cloneHtml = cloneHtml.replace(/svg><\/span>\s/g, "svg></span>&nbsp;");
    cloneHtml = cloneHtml.replace(/class="mjx-solid"/g, 'fill="none" stroke-width="70"');
    cloneHtml = cloneHtml.replace(/<mjx-assistive-mml[\s\S]*?<\/mjx-assistive-mml>/g, "");
    const title = content.value.split('\n')[0].replace(/^[#\s]+/, '').trim() || "Untitled Octopus Draft";
    try {
        showToast('🚀 正在由桌面级原生协议直连微信云下发...', 'success');
        const articleId = await syncToWechatDraft(cloneHtml, title, uploadConfig.value);
        showToast(`✅ 直连成功！已安全推流至微信草稿箱 (ID: ${articleId})`, "success");
        toggleMenu(null);
    }
    catch (error) {
        customAlert(`原生推流被拒：${error.message}`);
    }
};
const isExporting = ref(false);
const isExtensionInstalled = ref(false);
onMounted(() => {
    document.addEventListener('click', (e) => {
        isAiMenuOpen.value = false;
    });
    window.addEventListener('message', (event) => {
        if (event.source !== window)
            return;
        if (event.data && event.data.type === 'OCTOPUS_EXT_INSTALLED') {
            isExtensionInstalled.value = true;
            console.log('✅ Octopus MD Sync Extension detected: v' + event.data.version);
        }
    });
});
const printPdf = () => {
    window.setTimeout(() => window.print(), 100);
};
const viewMode = ref('pc');
const setViewMode = (mode) => {
    viewMode.value = mode;
    leftWidth.value = mode === 'mobile' ? 60 : 50;
};
const importMd = async () => {
    if (isDesktop.value && window.electronAPI && window.electronAPI.readFile) {
        try {
            // Dummy default for graceful fallback if user hasn't explicitly patched electronAPI yet
            const result = await window.electronAPI.readFile();
            if (result && result.content) {
                content.value = result.content;
                showToast("✅ 已成功载入本地 Markdown 文件", "success");
            }
        }
        catch (e) {
            customAlert("❌ 读取失败: " + e.message);
        }
    }
    else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md, .txt, .docx';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file)
                return;
            if (file.name.endsWith('.docx')) {
                if (window.mammoth) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const result = await window.mammoth.convertToHtml({ arrayBuffer });
                        let htmlStr = result.value;
                        if (window.TurndownService) {
                            const turndownService = new window.TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
                            content.value = turndownService.turndown(htmlStr);
                            showToast("✅ 已通过 Mammoth 引擎完美解析导入 Word (.docx) 排版！", "success");
                        }
                        else {
                            customAlert("缺少 Turndown 解析库，无法转换 DOM。");
                        }
                    }
                    catch (docxErr) {
                        customAlert("Word 文档解析失败: " + String(docxErr));
                    }
                }
                else {
                    customAlert("缺少 Mammoth DOCX 核心模块，请刷新页面检查 CDN 网络。");
                }
            }
            else {
                const reader = new FileReader();
                reader.onload = (e) => {
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
const exportFile = (type) => {
    let output = '';
    let filename = 'document.' + type;
    let mimeType = 'text/plain';
    if (type === 'md') {
        output = content.value;
    }
    else if (type === 'html') {
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
    }
    else if (type === 'json') {
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
    if (isDesktop.value && window.electronAPI && window.electronAPI.writeFile) {
        try {
            await window.electronAPI.writeFile('./export.md', content.value, 'utf-8');
            showToast("✅ 原生通道写入完毕，已保存为 export.md", "success");
        }
        catch (e) {
            customAlert("保存失败: " + e.message);
        }
    }
    else {
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
let syncEditorTimeout;
let syncPreviewTimeout;
let isSyncingEditor = false;
let isSyncingPreview = false;
const findHeadingElementInPreview = (text, level, container) => {
    const normalized = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const headings = container.querySelectorAll(`h1, h2, h3, h4, h5, h6`);
    for (let i = 0; i < headings.length; i++) {
        const el = headings[i];
        if (level && Number(el.tagName.charAt(1)) !== level)
            continue;
        const hText = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (hText === normalized || hText.includes(normalized) || normalized.includes(hText)) {
            return el;
        }
    }
    return null;
};
const executeSyncMath = (source, target, isSrcEditor) => {
    const sourceScrollable = source.scrollHeight - source.clientHeight;
    const targetScrollable = target.scrollHeight - target.clientHeight;
    if (sourceScrollable <= 0 || targetScrollable <= 0)
        return;
    // Utilize AST Semantic Interpolation if both containers and view are ready
    if (view.value && tocList.value.length > 0) {
        try {
            const anchors = [{ eTop: 0, pTop: 0 }];
            const doc = view.value.state.doc;
            tocList.value.forEach(item => {
                const el = findHeadingElementInPreview(item.text, item.level, isSrcEditor ? target : source);
                if (el) {
                    try {
                        const ePos = doc.line(item.line).from;
                        const eTop = view.value.lineBlockAt(ePos).top;
                        const pTop = Math.max(0, el.offsetTop - 40); // 40px visual margin
                        anchors.push({ eTop, pTop });
                    }
                    catch (e) { }
                }
            });
            anchors.push({ eTop: sourceScrollable + (isSrcEditor ? 0 : 0), pTop: targetScrollable }); // Absolute ends
            anchors.sort((a, b) => isSrcEditor ? a.eTop - b.eTop : a.pTop - b.pTop);
            const scrollVal = source.scrollTop;
            let prev = anchors[0];
            let next = anchors[anchors.length - 1];
            for (let i = 0; i < anchors.length; i++) {
                const val = isSrcEditor ? anchors[i].eTop : anchors[i].pTop;
                if (val > scrollVal) {
                    next = anchors[i];
                    prev = i > 0 ? anchors[i - 1] : anchors[0];
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
        }
        catch (e) {
            console.warn("Interpolative scrolling skipped", e);
        }
    }
    // Fallback to purely proportional mapping
    const percentage = source.scrollTop / sourceScrollable;
    target.scrollTop = percentage * targetScrollable;
};
const exportImage = async () => {
    if (!previewContainer.value)
        return;
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
        const contentNode = previewContainer.value.querySelector('.preview-content');
        if (!contentNode)
            throw new Error("无法定位预览区域内容");
        // Force wait for images to load or DOM to stabilize over a tick
        await new Promise(r => setTimeout(r, 100));
        const exportWidth = 850;
        // Add extra padding to scrollHeight to guarantee no clipping at the bottom
        const exportHeight = contentNode.scrollHeight + 80;
        const dataUrl = await htmlToImage.toPng(contentNode, {
            backgroundColor: 'var(--bg-preview)',
            pixelRatio: 2, // Retina resolution
            width: exportWidth,
            height: exportHeight,
            style: {
                transform: 'none',
                width: exportWidth + 'px',
                height: exportHeight + 'px',
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
        }
        else {
            const link = document.createElement('a');
            link.download = 'octopus-export.png';
            link.href = dataUrl;
            link.click();
            showToast("✅ 长图生成完毕并开始下载", "success");
        }
    }
    catch (e) {
        customAlert('长图生成失败，请重试:\n' + e.message);
    }
    finally {
        isExporting.value = false;
    }
};
// Resizable split pane logic
const leftWidth = ref(50);
const isDragging = ref(false);
const startDrag = (e) => {
    isDragging.value = true;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
};
const onDrag = (e) => {
    if (!isDragging.value)
        return;
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
let scrollTimeout;
const syncScroll = (source, target) => {
    if (isSyncing)
        return;
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
    const exts = [
        markdown(),
        EditorView.domEventHandlers({
            paste(event, view) {
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
            drop(event, view) {
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
const handleReady = (payload) => {
    view.value = payload.view;
    const cmScroll = payload.view.scrollDOM;
    const preview = previewContainer.value;
    if (!cmScroll || !preview)
        return;
    cmScroll.addEventListener('scroll', () => {
        // If the scroll was triggered programmatically by the preview pane
        if (isSyncingPreview)
            return;
        // Set lock indicating Editor is actively driving the scroll
        isSyncingEditor = true;
        clearTimeout(syncEditorTimeout);
        syncEditorTimeout = setTimeout(() => { isSyncingEditor = false; }, 50);
        // Process Editor -> Preview Semantic Translation
        executeSyncMath(cmScroll, preview, true);
        // Mobile Preview Scroll Sync: sync iPhone frame's inner wrapper
        if (viewMode.value === 'mobile') {
            const mobileWrapper = preview.querySelector('.preview-content-wrapper');
            if (mobileWrapper) {
                const srcPct = cmScroll.scrollTop / Math.max(1, cmScroll.scrollHeight - cmScroll.clientHeight);
                mobileWrapper.scrollTop = srcPct * (mobileWrapper.scrollHeight - mobileWrapper.clientHeight);
            }
        }
    });
    preview.addEventListener('scroll', () => {
        // If the scroll was triggered programmatically by the editor pane
        if (isSyncingEditor)
            return;
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
const selectedPlatforms = ref([]);
const togglePlatformSelection = (platform) => {
    const idx = selectedPlatforms.value.indexOf(platform);
    if (idx > -1) {
        selectedPlatforms.value.splice(idx, 1);
    }
    else {
        selectedPlatforms.value.push(platform);
    }
};
const platformLabels = {
    wechat: '微信公众号',
    zhihu: '知乎',
    juejin: '稀土掘金',
    csdn: 'CSDN',
    twitter: 'X (Twitter)',
    weibo: '微博'
};
const syncQueue = ref([]);
const distributeToSelectedPlatforms = async () => {
    if (selectedPlatforms.value.length === 0) {
        showToast('请至少选择一个分发平台', 'info');
        return;
    }
    if (isExtensionInstalled.value) {
        for (const platform of selectedPlatforms.value) {
            syncToPlatform(platform);
            await new Promise(r => setTimeout(r, 600));
        }
        toggleMenu('');
        showToast('一键分发指令已触发完成！', 'success');
    }
    else {
        // 降级模式：预先拷入基础剪贴板并直接全开所有窗口
        copyHtml('wechat');
        const urls = {
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
                if (!newWindow)
                    blockedPopups = true;
            }
        }
        toggleMenu('');
        if (blockedPopups) {
            showToast('⚠️ 浏览器弹窗拦截：为实现真正一键多发，请点击地址栏右侧图标“始终允许弹窗”！', 'error');
        }
        else {
            showToast('富文本已拷贝至剪贴板，平台窗口已打开就绪！', 'success');
        }
    }
};
const executeManualSync = (platform) => {
    syncToPlatform(platform);
    const q = syncQueue.value.find(item => item.platform === platform);
    if (q)
        q.status = 'done';
};
// ═══ Global Keyboard Shortcuts ═══
const handleGlobalKeydown = (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const alt = e.altKey;
    const key = e.key.toLowerCase();
    if (!ctrl)
        return;
    // Ctrl+key shortcuts (no Alt)
    if (!alt) {
        switch (key) {
            case 'b':
                e.preventDefault();
                insertFormat('**', '**');
                break;
            case 'i':
                e.preventDefault();
                insertFormat('*', '*');
                break;
            case 'd':
                e.preventDefault();
                insertFormat('~~', '~~');
                break;
            case 'k':
                e.preventDefault();
                insertFormat('[', '](https://)');
                break;
            case 'e':
                e.preventDefault();
                insertFormat('\`', '\`');
                break;
            case 'u':
                e.preventDefault();
                insertFormat('- ', '');
                break;
            case 'o':
                e.preventDefault();
                insertFormat('1. ', '');
                break;
            case 'q':
                e.preventDefault();
                insertFormat('> ', '');
                break;
            case 'h':
                e.preventDefault();
                insertFormat('\n---\n', '');
                break;
        }
    }
    // Ctrl+Alt+key shortcuts
    if (alt) {
        switch (key) {
            case 'c':
                e.preventDefault();
                insertFormat('\n\`\`\`\n', '\n\`\`\`\n');
                break;
            case 't':
                e.preventDefault();
                insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '');
                break;
            case 'i':
                e.preventDefault();
                insertFormat('![图片描述](', ') ');
                break;
            case 'd':
                e.preventDefault();
                toggleDiagrams();
                break;
            case 'f':
                e.preventDefault();
                formatMd();
                break;
        }
    }
};
onMounted(() => document.addEventListener('keydown', handleGlobalKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown));
const insertFormat = (prefix, suffix = '') => {
    if (!view.value)
        return;
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
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['format-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-item']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-group']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['has-submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['has-submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-status-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['format-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-content']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-item']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-item']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-level-2']} */ ;
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['is-dragging']} */ ;
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-select-group']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-select-group']} */ ;
/** @type {__VLS_StyleScopedClasses['css-customize-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-enabled']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['premium-select']} */ ;
/** @type {__VLS_StyleScopedClasses['toast-container']} */ ;
/** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['serif-font']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['s-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['s-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['smart-link-palette']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['smart-link-palette']} */ ;
/** @type {__VLS_StyleScopedClasses['smart-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['smart-btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['smart-btn-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['smart-locator-glass']} */ ;
/** @type {__VLS_StyleScopedClasses['locator-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['locator-nav-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['locator-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['locator-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['locator-counter-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-icon-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-icon-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-icon-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['blue']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-icon-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-tool-text']} */ ;
/** @type {__VLS_StyleScopedClasses['has-submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['has-submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['has-submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['submenu']} */ ;
/** @type {__VLS_StyleScopedClasses['fab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-header']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['iphone-frame']} */ ;
/** @type {__VLS_StyleScopedClasses['iphone-frame']} */ ;
/** @type {__VLS_StyleScopedClasses['iphone-frame']} */ ;
/** @type {__VLS_StyleScopedClasses['iphone-screen']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "octopus-layout" },
});
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ambient-glow" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['ambient-glow']} */ ;
if (__VLS_ctx.themeStyleContent) {
    const __VLS_0 = ('style');
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        id: "dynamic-theme",
    }));
    const __VLS_2 = __VLS_1({
        id: "dynamic-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    (__VLS_ctx.themeStyleContent);
    // @ts-ignore
    [themeStyleContent, themeStyleContent,];
    var __VLS_3;
}
if (__VLS_ctx.codeThemeStyleContent) {
    const __VLS_6 = ('style');
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        id: "dynamic-code-theme",
    }));
    const __VLS_8 = __VLS_7({
        id: "dynamic-code-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    (__VLS_ctx.codeThemeStyleContent);
    // @ts-ignore
    [codeThemeStyleContent, codeThemeStyleContent,];
    var __VLS_9;
}
if (__VLS_ctx.visualOverridesCss) {
    const __VLS_12 = ('style');
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        id: "dynamic-visual-theme",
    }));
    const __VLS_14 = __VLS_13({
        id: "dynamic-visual-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const { default: __VLS_17 } = __VLS_15.slots;
    (__VLS_ctx.visualOverridesCss);
    // @ts-ignore
    [visualOverridesCss, visualOverridesCss,];
    var __VLS_15;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "octopus-header v1-2-header flex w-full items-center justify-between" },
    ...{ style: ({
            height: '56px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
            zIndex: 200,
            padding: '0 16px'
        }) },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isZenMode) }, null, null);
/** @type {__VLS_StyleScopedClasses['octopus-header']} */ ;
/** @type {__VLS_StyleScopedClasses['v1-2-header']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-group" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['brand-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "material-symbols-outlined" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['material-symbols-outlined']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "classic-menus" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['classic-menus']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('file');
            // @ts-ignore
            [isZenMode, toggleMenu,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu dropdown-menu-large" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'file') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu-large']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.importMd) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exportFile('md');
            // @ts-ignore
            [activeMenu, importMd, exportFile,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exportFile('html');
            // @ts-ignore
            [exportFile,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exportFile('json');
            // @ts-ignore
            [exportFile,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.printPdf) },
    ...{ class: "dropdown-item" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isDesktop) }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.exportImage) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('format');
            // @ts-ignore
            [toggleMenu, printPdf, isDesktop, exportImage,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu dropdown-menu-large" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'format') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu-large']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('**', '**');
            // @ts-ignore
            [activeMenu, insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('*', '*');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('~~', '~~');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('[', '](https://)');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('`', '`');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n```\n', '\n```\n');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('<span style="color: red;">', '</span>');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('![图片描述](', ') ');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-item has-submenu" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['has-submenu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "submenu" },
});
/** @type {__VLS_StyleScopedClasses['submenu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('# ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('## ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('### ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('#### ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('##### ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('###### ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('- ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('1. ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('> ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n---\n', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('- [ ] ', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleLinkFootnote) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleReferences) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "check-icon" },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.showReferences ? '✅' : '　');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleDiagrams) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "check-icon" },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.showDiagrams ? '✅' : '　');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.formatMd) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showModal('字数与解析估算', `当前正文包含 ${(__VLS_ctx.content || '').length} 个字符数。预计阅读时间约为 ${Math.max(1, Math.ceil((__VLS_ctx.content || '').length / 300))} 分钟。`, false);
            // @ts-ignore
            [toggleLinkFootnote, toggleReferences, showReferences, toggleDiagrams, showDiagrams, formatMd, showModal, content, content,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('function');
            // @ts-ignore
            [toggleMenu,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu dropdown-menu-large" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'function') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu-large']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.convertClipboardHtmlToMd) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('{注音|Ruby语法}', '');
            // @ts-ignore
            [activeMenu, insertFormat, convertClipboardHtmlToMd,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n\n<section style="display:flex; padding:15px; border-radius:10px; background:#f8f9fa; border:1px solid #e9ecef; align-items:center; margin:20px 0;"><img src="https://api.dicebear.com/7.x/bottts/svg?seed=Octopus" style="width:60px; height:60px; border-radius:50%; margin-right:15px;"/><div><h3 style="margin:0 0 5px 0; color:#343a40;">这里是公众号名字</h3><p style="margin:0; font-size:13px; color:#6c757d;">欢迎关注我的公众号，每天分享最前沿硬核的极客技术与排版黑魔法！</p></div></section>\n\n', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('view');
            // @ts-ignore
            [toggleMenu,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu dropdown-menu-large" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'view') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu-large']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.viewMode = 'pc';
            // @ts-ignore
            [activeMenu, viewMode,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "check-icon" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.viewMode === 'pc' ? '■' : '　');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.viewMode = 'mobile';
            // @ts-ignore
            [viewMode, viewMode,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "check-icon" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.viewMode === 'mobile' ? '■' : '　');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.togglePreviewMode) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
(__VLS_ctx.isZenMode ? '退出沉浸模式' : '进入沉浸模式');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleMacCodeBlock) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
(__VLS_ctx.isMacCodeBlock ? '卸载' : '部署');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.loadDraftsHistory) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('settings');
            // @ts-ignore
            [isZenMode, toggleMenu, viewMode, togglePreviewMode, toggleMacCodeBlock, isMacCodeBlock, loadDraftsHistory,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu dropdown-menu-large" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'settings') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu-large']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isImageConfigVisible = true;
            __VLS_ctx.activeMenu = null;
            // @ts-ignore
            [activeMenu, activeMenu, isImageConfigVisible,];
        } },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.resetEditor) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('help');
            // @ts-ignore
            [toggleMenu, resetEditor,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu dropdown-menu-large" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'help') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-menu-large']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.loadTutorial) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.showAbout) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "shortcut" },
});
/** @type {__VLS_StyleScopedClasses['shortcut']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.handleFileSelected) },
    type: "file",
    ref: "fileInput",
    accept: "image/*",
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "actions" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "view-toggles-pill" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setViewMode('pc');
            // @ts-ignore
            [activeMenu, loadTutorial, showAbout, handleFileSelected, setViewMode,];
        } },
    ...{ class: "pill-btn" },
    ...{ class: ({ active: __VLS_ctx.viewMode === 'pc' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setViewMode('mobile');
            // @ts-ignore
            [viewMode, setViewMode,];
        } },
    ...{ class: "pill-btn" },
    ...{ class: ({ active: __VLS_ctx.viewMode === 'mobile' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isEditingTheme = !__VLS_ctx.isEditingTheme;
            __VLS_ctx.activeMenu = null;
            // @ts-ignore
            [activeMenu, viewMode, isEditingTheme, isEditingTheme,];
        } },
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "material-symbols-outlined" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['material-symbols-outlined']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onMousedown: (...[$event]) => {
            __VLS_ctx.isZenMode && !__VLS_ctx.isZenToolbarPinned ? __VLS_ctx.startZenDrag($event) : null;
            // @ts-ignore
            [isZenMode, isZenToolbarPinned, startZenDrag,];
        } },
    ...{ class: "formatting-toolbar" },
    ...{ class: ({ 'is-zen-floating': __VLS_ctx.isZenMode && !__VLS_ctx.isZenToolbarPinned }) },
    ...{ style: (__VLS_ctx.isZenMode && !__VLS_ctx.isZenToolbarPinned ? { left: __VLS_ctx.zenX + 'px', top: __VLS_ctx.zenY + 'px', position: 'fixed', zIndex: 2000, margin: 0, width: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', cursor: 'move', userSelect: 'none', borderRadius: '12px', padding: '0', flexDirection: 'column', background: 'var(--bg-panel)' } : (__VLS_ctx.isZenMode && __VLS_ctx.isZenToolbarPinned ? { position: 'static', width: '100%', margin: 0, borderRadius: 0, padding: 0, boxShadow: 'var(--shadow-subtle)', background: 'var(--bg-panel)' } : { padding: 0, height: 'auto', background: 'var(--bg-panel)' })) },
});
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['is-zen-floating']} */ ;
if (__VLS_ctx.isZenMode) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "zen-toolbar-handle" },
        ...{ style: {} },
        ...{ style: (__VLS_ctx.isZenToolbarPinned ? { cursor: 'default' } : {}) },
    });
    /** @type {__VLS_StyleScopedClasses['zen-toolbar-handle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        width: "14",
        height: "14",
        stroke: "currentColor",
        'stroke-width': "2",
        fill: "none",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "9",
        cy: "12",
        r: "1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "9",
        cy: "5",
        r: "1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "9",
        cy: "19",
        r: "1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "15",
        cy: "12",
        r: "1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "15",
        cy: "5",
        r: "1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "15",
        cy: "19",
        r: "1",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isZenMode))
                    return;
                __VLS_ctx.isZenToolbarPinned = !__VLS_ctx.isZenToolbarPinned;
                // @ts-ignore
                [isZenMode, isZenMode, isZenMode, isZenMode, isZenToolbarPinned, isZenToolbarPinned, isZenToolbarPinned, isZenToolbarPinned, isZenToolbarPinned, isZenToolbarPinned, zenX, zenY,];
            } },
        ...{ class: "icon-btn" },
        ...{ style: {} },
        title: (__VLS_ctx.isZenToolbarPinned ? '取消固定并允许悬浮' : '钉在网页顶部'),
    });
    /** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
    (__VLS_ctx.isZenToolbarPinned ? '📌' : '📍');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isZenMode))
                    return;
                __VLS_ctx.isZenToolbarExpanded = !__VLS_ctx.isZenToolbarExpanded;
                // @ts-ignore
                [isZenToolbarPinned, isZenToolbarPinned, isZenToolbarExpanded, isZenToolbarExpanded,];
            } },
        ...{ class: "icon-btn" },
        ...{ style: {} },
        title: "折叠/展开",
    });
    /** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
    (__VLS_ctx.isZenToolbarExpanded ? '一' : '＋');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.togglePreviewMode) },
        ...{ class: "icon-btn" },
        ...{ style: {} },
        title: "退出全屏",
    });
    /** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onMousedown: () => { } },
    ...{ class: "format-actions" },
    ...{ style: (__VLS_ctx.isZenMode ? { padding: '10px 16px', gap: '8px', cursor: 'default' } : {}) },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isZenMode || __VLS_ctx.isZenToolbarExpanded) }, null, null);
/** @type {__VLS_StyleScopedClasses['format-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showToc = !__VLS_ctx.showToc;
            // @ts-ignore
            [isZenMode, isZenMode, togglePreviewMode, isZenToolbarExpanded, isZenToolbarExpanded, showToc, showToc,];
        } },
    ...{ class: "icon-btn" },
    title: "侧边大纲导航",
    ...{ style: ({ color: __VLS_ctx.showToc ? 'var(--accent-color)' : '', background: __VLS_ctx.showToc ? 'rgba(56, 189, 248, 0.1)' : '' }) },
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "8",
    y1: "6",
    x2: "21",
    y2: "6",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "8",
    y1: "12",
    x2: "21",
    y2: "12",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "8",
    y1: "18",
    x2: "21",
    y2: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "3",
    y1: "6",
    x2: "3.01",
    y2: "6",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "3",
    y1: "12",
    x2: "3.01",
    y2: "12",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "3",
    y1: "18",
    x2: "3.01",
    y2: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toolbar-divider" },
});
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('~~', '~~');
            // @ts-ignore
            [insertFormat, showToc, showToc,];
        } },
    ...{ class: "icon-btn" },
    title: "删除线",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('**', '**');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "加粗",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('*', '*');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "倾斜",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.em, __VLS_intrinsics.em)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n```\n', '\n```\n');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "代码块",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2.5",
    'stroke-linecap': "round",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
    points: "4 8 10 12 4 16",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "12",
    y1: "18",
    x2: "20",
    y2: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('`', '`');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "行内代码",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
    points: "16 18 22 12 16 6",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
    points: "8 6 2 12 8 18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "14",
    y1: "4",
    x2: "10",
    y2: "20",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('[', '](https://)');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "链接",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n| 表头 | 表头 |\n| :--- | :--- |\n| 内容 | 内容 |\n', '');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "表格",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect, __VLS_intrinsics.rect)({
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2",
    ry: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "3",
    y1: "9",
    x2: "21",
    y2: "9",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "3",
    y1: "15",
    x2: "21",
    y2: "15",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "9",
    y1: "3",
    x2: "9",
    y2: "21",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "15",
    y1: "3",
    x2: "15",
    y2: "21",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.triggerImageUpload) },
    ...{ class: "icon-btn" },
    title: "上传/插入图片",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect, __VLS_intrinsics.rect)({
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2",
    ry: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
    cx: "8.5",
    cy: "8.5",
    r: "1.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
    points: "21 15 16 10 5 21",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n> ', '');
            // @ts-ignore
            [insertFormat, triggerImageUpload,];
        } },
    ...{ class: "icon-btn" },
    title: "引用",
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.formatMd) },
    ...{ class: "icon-btn" },
    title: "格式化排版",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "16",
    y1: "8",
    x2: "2",
    y2: "22",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "17.5",
    y1: "15",
    x2: "9",
    y2: "6.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toolbar-divider" },
});
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isImageConfigVisible = true;
            __VLS_ctx.activeMenu = null;
            // @ts-ignore
            [activeMenu, formatMd, isImageConfigVisible,];
        } },
    ...{ class: "icon-btn" },
    title: "配置服务器或图床",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
    points: "17 8 12 3 7 8",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleLinkFootnote) },
    ...{ class: "icon-btn" },
    title: "微信外链转引用",
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
let __VLS_18;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
    name: "slide-up",
}));
const __VLS_20 = __VLS_19({
    name: "slide-up",
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
const { default: __VLS_23 } = __VLS_21.slots;
if (!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "smart-link-palette" },
        ...{ class: ({ 'is-expanded': __VLS_ctx.isLinkRadarExpanded }) },
    });
    /** @type {__VLS_StyleScopedClasses['smart-link-palette']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-expanded']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning))
                    return;
                __VLS_ctx.isLinkRadarExpanded = !__VLS_ctx.isLinkRadarExpanded;
                // @ts-ignore
                [toggleLinkFootnote, userDismissedLinkRadar, enableLinkFootnote, hasExternalLinks, showLinkWarning, isLinkRadarExpanded, isLinkRadarExpanded, isLinkRadarExpanded,];
            } },
        ...{ class: "smart-link-header" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['smart-link-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "smart-title" },
    });
    /** @type {__VLS_StyleScopedClasses['smart-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "smart-icon-box pulse-warning" },
    });
    /** @type {__VLS_StyleScopedClasses['smart-icon-box']} */ ;
    /** @type {__VLS_StyleScopedClasses['pulse-warning']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        width: "14",
        height: "14",
        stroke: "currentColor",
        'stroke-width': "2.5",
        fill: "none",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
        cx: "12",
        cy: "12",
        r: "10",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
        x1: "12",
        y1: "8",
        x2: "12",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
        x1: "12",
        y1: "16",
        x2: "12.01",
        y2: "16",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "smart-badge badge-warn" },
    });
    /** @type {__VLS_StyleScopedClasses['smart-badge']} */ ;
    /** @type {__VLS_StyleScopedClasses['badge-warn']} */ ;
    (__VLS_ctx.externalLinks.length);
    (__VLS_ctx.isLinkRadarExpanded ? '收起' : '展开详情');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "smart-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['smart-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning))
                    return;
                __VLS_ctx.toggleLinkFootnote();
                __VLS_ctx.userDismissedLinkRadar = true;
                // @ts-ignore
                [toggleLinkFootnote, userDismissedLinkRadar, isLinkRadarExpanded, externalLinks,];
            } },
        ...{ class: "smart-btn-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['smart-btn-primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        width: "14",
        height: "14",
        stroke: "currentColor",
        'stroke-width': "2.5",
        fill: "none",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning))
                    return;
                __VLS_ctx.userDismissedLinkRadar = true;
                // @ts-ignore
                [userDismissedLinkRadar,];
            } },
        ...{ class: "smart-btn-icon" },
        title: "忽略警告不再提醒",
    });
    /** @type {__VLS_StyleScopedClasses['smart-btn-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        width: "16",
        height: "16",
        stroke: "currentColor",
        'stroke-width': "2",
        fill: "none",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
        x1: "18",
        y1: "6",
        x2: "6",
        y2: "18",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
        x1: "6",
        y1: "6",
        x2: "18",
        y2: "18",
    });
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        name: "slide-up",
    }));
    const __VLS_26 = __VLS_25({
        name: "slide-up",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const { default: __VLS_29 } = __VLS_27.slots;
    if (__VLS_ctx.externalLinks.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "smart-locator-glass" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isLinkRadarExpanded) }, null, null);
        /** @type {__VLS_StyleScopedClasses['smart-locator-glass']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning))
                        return;
                    if (!(__VLS_ctx.externalLinks.length > 0))
                        return;
                    __VLS_ctx.jumpToExtLine('current');
                    // @ts-ignore
                    [isLinkRadarExpanded, externalLinks, jumpToExtLine,];
                } },
            ...{ class: "locator-info-block" },
            title: "点击传送至源码处",
        });
        /** @type {__VLS_StyleScopedClasses['locator-info-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "locator-top-meta" },
        });
        /** @type {__VLS_StyleScopedClasses['locator-top-meta']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "locator-line-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['locator-line-tag']} */ ;
        (__VLS_ctx.externalLinks[__VLS_ctx.activeExtLinkIdx].line);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "locator-anchor-text" },
        });
        /** @type {__VLS_StyleScopedClasses['locator-anchor-text']} */ ;
        (__VLS_ctx.externalLinks[__VLS_ctx.activeExtLinkIdx].text);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "locator-url-track" },
        });
        /** @type {__VLS_StyleScopedClasses['locator-url-track']} */ ;
        (__VLS_ctx.externalLinks[__VLS_ctx.activeExtLinkIdx].url);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "locator-nav-controls" },
        });
        /** @type {__VLS_StyleScopedClasses['locator-nav-controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning))
                        return;
                    if (!(__VLS_ctx.externalLinks.length > 0))
                        return;
                    __VLS_ctx.jumpToExtLine('prev');
                    // @ts-ignore
                    [externalLinks, externalLinks, externalLinks, jumpToExtLine, activeExtLinkIdx, activeExtLinkIdx, activeExtLinkIdx,];
                } },
            ...{ class: "locator-nav-btn" },
            title: "上一个冲突项",
        });
        /** @type {__VLS_StyleScopedClasses['locator-nav-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            stroke: "currentColor",
            'stroke-width': "2.5",
            fill: "none",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
            points: "15 18 9 12 15 6",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "locator-counter-text" },
        });
        /** @type {__VLS_StyleScopedClasses['locator-counter-text']} */ ;
        (__VLS_ctx.activeExtLinkIdx + 1);
        (__VLS_ctx.externalLinks.length);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.userDismissedLinkRadar && !__VLS_ctx.enableLinkFootnote && __VLS_ctx.hasExternalLinks && __VLS_ctx.showLinkWarning))
                        return;
                    if (!(__VLS_ctx.externalLinks.length > 0))
                        return;
                    __VLS_ctx.jumpToExtLine('next');
                    // @ts-ignore
                    [externalLinks, jumpToExtLine, activeExtLinkIdx,];
                } },
            ...{ class: "locator-nav-btn" },
            title: "下一个冲突项",
        });
        /** @type {__VLS_StyleScopedClasses['locator-nav-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            stroke: "currentColor",
            'stroke-width': "2.5",
            fill: "none",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
            points: "9 18 15 12 9 6",
        });
    }
    // @ts-ignore
    [];
    var __VLS_27;
}
// @ts-ignore
[];
var __VLS_21;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "workspace" },
    ...{ class: ({ 'is-dragging': __VLS_ctx.isDragging }) },
    ...{ style: (__VLS_ctx.isZenMode && !__VLS_ctx.isZenToolbarPinned ? { height: '100vh', paddingTop: '0' } : {}) },
});
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['is-dragging']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-pane" },
    ...{ style: ({ width: __VLS_ctx.isEditingTheme ? '33.333%' : (__VLS_ctx.leftWidth + '%') }) },
});
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-main-area" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['editor-main-area']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toc-panel" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.showToc) }, null, null);
/** @type {__VLS_StyleScopedClasses['toc-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toc-header" },
});
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showToc = false;
            // @ts-ignore
            [isZenMode, isEditingTheme, isZenToolbarPinned, showToc, showToc, isDragging, leftWidth,];
        } },
    ...{ class: "icon-btn" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toc-content" },
});
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
for (const [item, idx] of __VLS_vFor((__VLS_ctx.tocList))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.scrollToLine(item.line);
                // @ts-ignore
                [tocList, scrollToLine,];
            } },
        key: (idx),
        ...{ class: "toc-item" },
        ...{ class: ('toc-level-' + item.level) },
    });
    /** @type {__VLS_StyleScopedClasses['toc-item']} */ ;
    (item.text);
    // @ts-ignore
    [];
}
if (__VLS_ctx.tocList.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "cm-wrapper" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['cm-wrapper']} */ ;
let __VLS_30;
/** @ts-ignore @type {typeof __VLS_components.Codemirror} */
Codemirror;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    ...{ 'onReady': {} },
    modelValue: (__VLS_ctx.content),
    placeholder: "Start writing...",
    ...{ style: ({ height: '100%', width: '100%', fontSize: '15px' }) },
    autofocus: (true),
    indentWithTab: (true),
    tabSize: (2),
    extensions: (__VLS_ctx.extensions),
}));
const __VLS_32 = __VLS_31({
    ...{ 'onReady': {} },
    modelValue: (__VLS_ctx.content),
    placeholder: "Start writing...",
    ...{ style: ({ height: '100%', width: '100%', fontSize: '15px' }) },
    autofocus: (true),
    indentWithTab: (true),
    tabSize: (2),
    extensions: (__VLS_ctx.extensions),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
let __VLS_35;
const __VLS_36 = ({ ready: {} },
    { onReady: (__VLS_ctx.handleReady) });
var __VLS_33;
var __VLS_34;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
(__VLS_ctx.content.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
(__VLS_ctx.content.split('\n').length);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
(Math.max(1, Math.ceil(__VLS_ctx.content.length / 300)));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onMousedown: (__VLS_ctx.startDrag) },
    ...{ class: "resizer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isEditingTheme) }, null, null);
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "resizer-handle" },
});
/** @type {__VLS_StyleScopedClasses['resizer-handle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.handlePreviewClick) },
    ...{ class: "preview-pane" },
    ...{ class: ({ 'is-mobile': __VLS_ctx.viewMode === 'mobile' }) },
    ref: "previewContainer",
    ...{ style: ({ width: __VLS_ctx.isEditingTheme ? '33.333%' : (100 - __VLS_ctx.leftWidth + '%'), position: 'relative' }) },
});
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
if (__VLS_ctx.themeStyleContent) {
    const __VLS_37 = ('style');
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        id: "markdown-theme",
    }));
    const __VLS_39 = __VLS_38({
        id: "markdown-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    const { default: __VLS_42 } = __VLS_40.slots;
    (__VLS_ctx.themeStyleContent);
    // @ts-ignore
    [themeStyleContent, themeStyleContent, content, content, content, content, viewMode, isEditingTheme, isEditingTheme, leftWidth, tocList, extensions, handleReady, startDrag, handlePreviewClick,];
    var __VLS_40;
}
if (__VLS_ctx.codeThemeStyleContent) {
    const __VLS_43 = ('style');
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
        id: "code-theme",
    }));
    const __VLS_45 = __VLS_44({
        id: "code-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    const { default: __VLS_48 } = __VLS_46.slots;
    (__VLS_ctx.codeThemeStyleContent);
    // @ts-ignore
    [codeThemeStyleContent, codeThemeStyleContent,];
    var __VLS_46;
}
if (__VLS_ctx.viewMode === 'mobile') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mobile-preview-pane" },
    });
    /** @type {__VLS_StyleScopedClasses['mobile-preview-pane']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "ambient-glow" },
    });
    /** @type {__VLS_StyleScopedClasses['ambient-glow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "iphone-scale-wrapper staggered-2" },
    });
    /** @type {__VLS_StyleScopedClasses['iphone-scale-wrapper']} */ ;
    /** @type {__VLS_StyleScopedClasses['staggered-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "iphone-frame" },
    });
    /** @type {__VLS_StyleScopedClasses['iphone-frame']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "iphone-screen" },
    });
    /** @type {__VLS_StyleScopedClasses['iphone-screen']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "ios-status-bar" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['ios-status-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "17",
        height: "11",
        viewBox: "0 0 17 11",
        fill: "currentColor",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M17 3.5C17 2.67157 16.3284 2 15.5 2C15.5 2 14 2 14 2V9C14 9 15.5 9 15.5 9C16.3284 9 17 8.32843 17 7.5V3.5Z",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "0.5",
        y: "0.5",
        width: "12",
        height: "10",
        rx: "2.5",
        stroke: "currentColor",
        fill: "transparent",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "2",
        y: "2",
        width: "9",
        height: "7",
        rx: "1",
        fill: "currentColor",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "preview-content-wrapper" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['preview-content-wrapper']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "preview-content" },
        ...{ class: (__VLS_ctx.extraCssClass) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.htmlOutput) }, null, null);
    /** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "preview-content" },
        ...{ class: (__VLS_ctx.extraCssClass) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.htmlOutput) }, null, null);
    /** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
    ...{ class: "fab-wrapper" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isZenMode && !__VLS_ctx.isEditingTheme) }, null, null);
/** @type {__VLS_StyleScopedClasses['fab-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: () => { } },
    ...{ class: "fab-container" },
    ...{ class: ({ 'is-open': __VLS_ctx.isAiMenuOpen }) },
});
/** @type {__VLS_StyleScopedClasses['fab-container']} */ ;
/** @type {__VLS_StyleScopedClasses['is-open']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "fab-menu" },
});
/** @type {__VLS_StyleScopedClasses['fab-menu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isAiMenuOpen = false;
            __VLS_ctx.openT2IPanel();
            // @ts-ignore
            [isZenMode, viewMode, isEditingTheme, extraCssClass, extraCssClass, htmlOutput, htmlOutput, isAiMenuOpen, isAiMenuOpen, openT2IPanel,];
        } },
    ...{ class: "fab-item" },
});
/** @type {__VLS_StyleScopedClasses['fab-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "fab-label" },
});
/** @type {__VLS_StyleScopedClasses['fab-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "fab-icon-wrapper pic-gen" },
});
/** @type {__VLS_StyleScopedClasses['fab-icon-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['pic-gen']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
    width: "18",
    height: "18",
    x: "3",
    y: "3",
    rx: "2",
    ry: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "9",
    cy: "9",
    r: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isAiMenuOpen = false;
            __VLS_ctx.openAIPanel();
            // @ts-ignore
            [isAiMenuOpen, openAIPanel,];
        } },
    ...{ class: "fab-item" },
});
/** @type {__VLS_StyleScopedClasses['fab-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "fab-label" },
});
/** @type {__VLS_StyleScopedClasses['fab-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "fab-icon-wrapper assistant" },
});
/** @type {__VLS_StyleScopedClasses['fab-icon-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M12 8V4H8",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
    width: "16",
    height: "12",
    x: "4",
    y: "8",
    rx: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M2 14h2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M20 14h2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M15 13v2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M9 13v2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isAiMenuOpen = !__VLS_ctx.isAiMenuOpen;
            // @ts-ignore
            [isAiMenuOpen, isAiMenuOpen,];
        } },
    ...{ class: "fab-btn ai-rotary-btn" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['fab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-rotary-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "action-icon material-symbols-outlined" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['action-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['material-symbols-outlined']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ai-tooltip" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['ai-tooltip']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('fabPublish');
            // @ts-ignore
            [toggleMenu,];
        } },
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: () => { } },
    ...{ class: "dropdown-menu" },
    ...{ style: {} },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'fabPublish') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
for (const [p] of __VLS_vFor((['wechat', 'zhihu', 'juejin', 'csdn']))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.togglePlatformSelection(p);
                // @ts-ignore
                [activeMenu, togglePlatformSelection,];
            } },
        key: (p),
        ...{ class: "brutalist-sync-btn" },
        ...{ style: ({
                padding: '12px', border: '2px solid', borderRadius: '12px', fontWeight: '700',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '4px',
                borderColor: __VLS_ctx.selectedPlatforms.includes(p) ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                background: __VLS_ctx.selectedPlatforms.includes(p) ? 'rgba(139, 90, 43, 0.08)' : 'transparent',
                color: __VLS_ctx.selectedPlatforms.includes(p) ? 'var(--primary)' : 'var(--text-muted)'
            }) },
    });
    /** @type {__VLS_StyleScopedClasses['brutalist-sync-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        src: (`https://cdn.simpleicons.org/${p}/${{ 'wechat': '07C160', 'zhihu': '0084FF', 'juejin': '1E80FF', 'csdn': 'FC5531' }[p]}`),
        ...{ style: ({ width: '28px', height: '28px', opacity: __VLS_ctx.selectedPlatforms.includes(p) ? 1 : 0.6, filter: __VLS_ctx.selectedPlatforms.includes(p) ? 'none' : 'grayscale(100%)', transition: 'all 0.2s' }) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ style: {} },
    });
    (__VLS_ctx.platformLabels[p]);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ style: {} },
        ...{ style: ({ opacity: __VLS_ctx.selectedPlatforms.includes(p) ? 1 : 0 }) },
    });
    // @ts-ignore
    [selectedPlatforms, selectedPlatforms, selectedPlatforms, selectedPlatforms, selectedPlatforms, selectedPlatforms, platformLabels,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isExtensionInstalled) }, null, null);
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
if (__VLS_ctx.selectedPlatforms.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.distributeToSelectedPlatforms) },
        ...{ class: "distribute-action-btn" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['distribute-action-btn']} */ ;
    (__VLS_ctx.selectedPlatforms.length);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('wechat');
            __VLS_ctx.toggleMenu(null);
            // @ts-ignore
            [toggleMenu, selectedPlatforms, selectedPlatforms, isExtensionInstalled, distributeToSelectedPlatforms, copyHtml,];
        } },
    ...{ class: "html-copy-btn" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['html-copy-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2.5",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect, __VLS_intrinsics.rect)({
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2",
    ry: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.exportImage();
            __VLS_ctx.toggleMenu(null);
            // @ts-ignore
            [toggleMenu, exportImage,];
        } },
    ...{ class: "html-copy-btn" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['html-copy-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "material-symbols-outlined" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['material-symbols-outlined']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "fab-btn" },
    ...{ class: ({ 'is-active': __VLS_ctx.activeMenu === 'fabPublish' }) },
    ...{ style: {} },
    onmouseover: "this.style.transform='scale(1.05)'",
    onmouseout: "this.style.transform='scale(1)'",
});
/** @type {__VLS_StyleScopedClasses['fab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "material-symbols-outlined" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['material-symbols-outlined']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-pane css-pane" },
    ...{ style: {} },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isEditingTheme && !__VLS_ctx.isZenMode) }, null, null);
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['css-pane']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isEditingTheme = false;
            // @ts-ignore
            [isZenMode, activeMenu, isEditingTheme, isEditingTheme,];
        } },
    ...{ style: {} },
    onmouseover: "this.style.background='rgba(0,0,0,0.08)'",
    onmouseout: "this.style.background='rgba(0,0,0,0.04)'",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-tabs" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['sidebar-tabs']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.dsTab = 'core';
            // @ts-ignore
            [dsTab,];
        } },
    ...{ class: "s-tab" },
    ...{ class: ({ active: __VLS_ctx.dsTab === 'core' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['s-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.dsTab = 'visual';
            // @ts-ignore
            [dsTab, dsTab,];
        } },
    ...{ class: "s-tab" },
    ...{ class: ({ active: __VLS_ctx.dsTab === 'visual' }) },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['s-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.dsTab = 'native';
            // @ts-ignore
            [dsTab, dsTab,];
        } },
    ...{ class: "s-tab" },
    ...{ class: ({ active: __VLS_ctx.dsTab === 'native' }) },
    ...{ style: {} },
    title: "底层强制覆盖编辑",
});
/** @type {__VLS_StyleScopedClasses['s-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.dsTab === 'core') }, null, null);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brutalist-config-group" },
});
/** @type {__VLS_StyleScopedClasses['brutalist-config-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
for (const [t, idx] of __VLS_vFor((__VLS_ctx.themes))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedTheme = t.id;
                // @ts-ignore
                [dsTab, dsTab, themes, selectedTheme,];
            } },
        key: (t.id),
        ...{ class: "theme-list-item" },
        ...{ class: ({ 'is-active': __VLS_ctx.selectedTheme === t.id }) },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['theme-list-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ style: {} },
        ...{ style: ({ color: __VLS_ctx.selectedTheme === t.id ? 'var(--primary)' : '' }) },
    });
    (String(idx + 1).padStart(2, '0'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ style: {} },
        ...{ style: ({ fontWeight: __VLS_ctx.selectedTheme === t.id ? '700' : '500', color: __VLS_ctx.selectedTheme === t.id ? 'var(--primary)' : '' }) },
    });
    (t.name.replace(/^\\d+\\.?\\s*/, ''));
    if (__VLS_ctx.selectedTheme === t.id) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "14",
            height: "14",
            stroke: "var(--primary)",
            fill: "none",
            'stroke-width': "3",
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
            points: "20 6 9 17 4 12",
        });
    }
    // @ts-ignore
    [selectedTheme, selectedTheme, selectedTheme, selectedTheme, selectedTheme,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brutalist-config-group" },
});
/** @type {__VLS_StyleScopedClasses['brutalist-config-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedCodeTheme),
    ...{ class: "panel-select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['panel-select']} */ ;
for (const [c] of __VLS_vFor((__VLS_ctx.codeThemes))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (c.id),
        value: (c.id),
    });
    (c.name);
    // @ts-ignore
    [selectedCodeTheme, codeThemes,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brutalist-config-group" },
});
/** @type {__VLS_StyleScopedClasses['brutalist-config-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.documentFontFamily),
    ...{ class: "panel-select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['panel-select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.optgroup, __VLS_intrinsics.optgroup)({
    label: "开源免授权区域",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "system-sans",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "system-serif",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "notosans",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "notoserif",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "lxgw",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "smiley",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "zcool",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "zcool_huangyou",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "mashanzheng",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "zhimangxing",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "longcang",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "fira",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "jetbrains",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.optgroup, __VLS_intrinsics.optgroup)({
    label: "⚠️ 商业版权/风险区",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "pingfang",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "yahei",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "helvetica",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "times",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.dsTab === 'visual') }, null, null);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "visual-section" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['visual-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "color",
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.primaryColor);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "text",
    value: (__VLS_ctx.visualTheme.primaryColor),
    placeholder: "#ff0080",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    placeholder: "字号(px) 如 15",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.baseFontSize);
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    placeholder: "行高 如 1.8",
    step: "0.1",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.lineHeight);
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "color",
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.baseColor);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "text",
    value: (__VLS_ctx.visualTheme.baseColor),
    placeholder: "#333333",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "visual-section" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['visual-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.visualTheme.headingAlign),
    ...{ class: "panel-select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['panel-select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "left",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "center",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    placeholder: "24",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.h1Size);
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    placeholder: "20",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.h2Size);
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    placeholder: "18",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.h3Size);
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "visual-section" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['visual-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    placeholder: "例如: 16",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.paragraphMargin);
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "color",
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.blockquoteColor);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "text",
    value: (__VLS_ctx.visualTheme.blockquoteColor),
    placeholder: "#cccccc",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "setting-item" },
});
/** @type {__VLS_StyleScopedClasses['setting-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "color",
    ...{ style: {} },
});
(__VLS_ctx.visualTheme.blockquoteBg);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "text",
    value: (__VLS_ctx.visualTheme.blockquoteBg),
    placeholder: "如 rgba(0,0,0,0.05)",
    ...{ class: "setting-input" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['setting-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.clearVisualTheme) },
    ...{ style: {} },
    onmouseover: "this.style.borderColor='rgba(239,68,68,0.3)';this.style.color='#ef4444'",
    onmouseout: "this.style.borderColor='rgba(0,0,0,0.08)';this.style.color='var(--text-muted)'",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
});
let __VLS_49;
/** @ts-ignore @type {typeof __VLS_components.Codemirror} */
Codemirror;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
    modelValue: (__VLS_ctx.themeStyleContent),
    extensions: ([__VLS_ctx.oneDark]),
    ...{ style: {} },
}));
const __VLS_51 = __VLS_50({
    modelValue: (__VLS_ctx.themeStyleContent),
    extensions: ([__VLS_ctx.oneDark]),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.dsTab === 'native') }, null, null);
let __VLS_54;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
    name: "fade",
}));
const __VLS_56 = __VLS_55({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
const { default: __VLS_59 } = __VLS_57.slots;
if (__VLS_ctx.isExporting) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "export-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['export-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "export-modal loading-modal" },
    });
    /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
    /** @type {__VLS_StyleScopedClasses['loading-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "spinner" },
    });
    /** @type {__VLS_StyleScopedClasses['spinner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
// @ts-ignore
[themeStyleContent, dsTab, dsTab, documentFontFamily, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, visualTheme, clearVisualTheme, oneDark, isExporting,];
var __VLS_57;
let __VLS_60;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
    name: "fade",
}));
const __VLS_62 = __VLS_61({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
const { default: __VLS_65 } = __VLS_63.slots;
if (__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                    return;
                __VLS_ctx.isImageConfigVisible = false;
                __VLS_ctx.isSyncModalVisible = false;
                __VLS_ctx.isVisualConfigVisible = false;
                __VLS_ctx.clsoeModal(false);
                // @ts-ignore
                [isImageConfigVisible, isImageConfigVisible, modalState, isSyncModalVisible, isSyncModalVisible, isVisualConfigVisible, isVisualConfigVisible, clsoeModal,];
            } },
        ...{ class: "export-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['export-overlay']} */ ;
    if (__VLS_ctx.modalState.visible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "export-modal custom-modal" },
        });
        /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
        /** @type {__VLS_StyleScopedClasses['custom-modal']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-modal-header" },
        });
        /** @type {__VLS_StyleScopedClasses['config-modal-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "config-modal-title" },
        });
        /** @type {__VLS_StyleScopedClasses['config-modal-title']} */ ;
        (__VLS_ctx.modalState.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ style: {} },
        });
        (__VLS_ctx.modalState.message);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "modal-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
        if (__VLS_ctx.modalState.isConfirm) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                            return;
                        if (!(__VLS_ctx.modalState.visible))
                            return;
                        if (!(__VLS_ctx.modalState.isConfirm))
                            return;
                        __VLS_ctx.clsoeModal(false);
                        // @ts-ignore
                        [modalState, modalState, modalState, modalState, clsoeModal,];
                    } },
                ...{ class: "btn btn-native" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['btn-native']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.modalState.visible))
                        return;
                    __VLS_ctx.clsoeModal(true);
                    // @ts-ignore
                    [clsoeModal,];
                } },
            ...{ class: "btn btn-primary" },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    }
    if (__VLS_ctx.isSyncModalVisible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "export-modal custom-modal sync-modal" },
        });
        /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
        /** @type {__VLS_StyleScopedClasses['custom-modal']} */ ;
        /** @type {__VLS_StyleScopedClasses['sync-modal']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-modal-header" },
        });
        /** @type {__VLS_StyleScopedClasses['config-modal-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "config-modal-title" },
        });
        /** @type {__VLS_StyleScopedClasses['config-modal-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
            points: "16 6 12 2 8 6",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            x1: "12",
            y1: "2",
            x2: "12",
            y2: "15",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.isSyncModalVisible = false;
                    // @ts-ignore
                    [isSyncModalVisible, isSyncModalVisible,];
                } },
            ...{ class: "config-close-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['config-close-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.kbd, __VLS_intrinsics.kbd)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sync-platform-grid" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-platform-grid']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.syncToPlatform('wechat');
                    // @ts-ignore
                    [syncToPlatform,];
                } },
            ...{ class: "sync-grid-btn wechat" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-grid-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['wechat']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "32",
            height: "32",
            fill: "currentColor",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M8.5 13.5c-3.5 0-6.5-2.5-6.5-5.5S5 2.5 8.5 2.5 15 5 15 8c0 3-3 5.5-6.5 5.5zm-1-7c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm6 11c3 0 5.5-2 5.5-4.5S19.5 9 16.5 9c-.5 0-1 .05-1.5.15.5 1 .85 2 .85 3.35 0 3-2.5 5.5-5.5 5.5-.85 0-1.65-.2-2.35-.5-.4 1.5-1.5 2.5-2.5 3 1 .5 2 1 3 1 2.5 0 4.5-2 4.5-4.5z",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.syncToPlatform('zhihu');
                    // @ts-ignore
                    [syncToPlatform,];
                } },
            ...{ class: "sync-grid-btn zhihu" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-grid-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['zhihu']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.syncToPlatform('juejin');
                    // @ts-ignore
                    [syncToPlatform,];
                } },
            ...{ class: "sync-grid-btn juejin" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-grid-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['juejin']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "32",
            height: "32",
            fill: "currentColor",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
            d: "M12 2l-3.3 2.7h6.6L12 2zm-5.7 4.7l-2.4 1.9 8.1 6.6 8.1-6.6-2.4-1.9-5.7 4.7-5.7-4.7zm0 2.2L1.8 12 12 20.3 22.2 12l-4.5-3.1L12 13.6 6.3 8.9z",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.syncToPlatform('twitter');
                    // @ts-ignore
                    [syncToPlatform,];
                } },
            ...{ class: "sync-grid-btn twitter" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-grid-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['twitter']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "32",
            height: "32",
            fill: "currentColor",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
            d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.syncToPlatform('weibo');
                    // @ts-ignore
                    [syncToPlatform,];
                } },
            ...{ class: "sync-grid-btn weibo" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-grid-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['weibo']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "32",
            height: "32",
            fill: "currentColor",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M20.1 9.8c-.8-.2-1.3-.3-1.3-.3 1.1-.6 1.7-1.4 1.5-2.4-.2-1.2-1.6-1.8-3.4-1.3l-1.3.4s.5-.6.5-1.1c.1-1.1-1-2.1-2.4-2-1.5.1-2.7 1.2-2.7 2.6v.5l-.8-.8C8.9 4 7 3.5 5.2 4.3 2 5.5.3 9.4 1.5 12.8c.8 2.3 2.7 4 4.8 4.7 4.5 1.5 9.7-.5 11.9-4.8.8-1.5.8-2.6.4-3.3zm-6.6 5.8c-2.3 2.1-6.1 1.7-8.5-.9-2.4-2.6-2.6-6.4-.3-8.5 2.3-2.1 6.1-1.7 8.5.9 2.4 2.6 2.6 6.4.3 8.5zm-1.8-4.4c-.6.9-1.9 1.4-3.1 1.2-1.2-.2-2-.9-2.3-1.8-.2-.7.1-1.3.6-1.5.5-.3 1.2-.2 1.8.2.9.7 1.2 1.7 1 2.3zm-.1-2.5c-.3.4-1 .6-1.6.4-.6-.2-1-.7-.9-1.2.1-.4.5-.5.9-.3.6.1 1 .5.9 1zm3.8 2.4c-.2 1.5-1.4 2.8-3.1 3.2-2.1.4-4.2-.3-5.2-1.8-.9-1.3-.8-3 0-4.3 1-1.5 3.3-2.2 5.3-1.4 1.7.7 2.6 2.3 2.4 3.9z",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isSyncModalVisible))
                        return;
                    __VLS_ctx.syncToPlatform('csdn');
                    // @ts-ignore
                    [syncToPlatform,];
                } },
            ...{ class: "sync-grid-btn csdn" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['sync-grid-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['csdn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-info-box" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['config-info-box']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.kbd, __VLS_intrinsics.kbd)({
            ...{ style: {} },
        });
    }
    if (__VLS_ctx.isImageConfigVisible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "export-modal custom-modal" },
        });
        /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
        /** @type {__VLS_StyleScopedClasses['custom-modal']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-modal-header" },
        });
        /** @type {__VLS_StyleScopedClasses['config-modal-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "config-modal-title" },
        });
        /** @type {__VLS_StyleScopedClasses['config-modal-title']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
            x: "3",
            y: "3",
            width: "18",
            height: "18",
            rx: "2",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
            cx: "8.5",
            cy: "8.5",
            r: "1.5",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
            points: "21 15 16 10 5 21",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isImageConfigVisible))
                        return;
                    __VLS_ctx.isImageConfigVisible = false;
                    // @ts-ignore
                    [isImageConfigVisible, isImageConfigVisible,];
                } },
            ...{ class: "config-close-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['config-close-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-section-card" },
        });
        /** @type {__VLS_StyleScopedClasses['config-section-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-section-header" },
        });
        /** @type {__VLS_StyleScopedClasses['config-section-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (__VLS_ctx.uploadConfig.provider),
            ...{ class: "config-select" },
        });
        /** @type {__VLS_StyleScopedClasses['config-select']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "base64",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "picgo",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "github",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "alioss",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "txcos",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "qiniu",
        });
        if (__VLS_ctx.uploadConfig.provider === 'github') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "config-sub-fields" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['config-sub-fields']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "hint" },
            });
            /** @type {__VLS_StyleScopedClasses['hint']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.githubRepo),
                type: "text",
                placeholder: "username/repo",
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "password",
                placeholder: "ghp_xxxxxxxxxxxxxxxxxxx",
                ...{ class: "config-input" },
            });
            (__VLS_ctx.uploadConfig.githubToken);
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "config-row" },
            });
            /** @type {__VLS_StyleScopedClasses['config-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "hint" },
            });
            /** @type {__VLS_StyleScopedClasses['hint']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.githubPath),
                type: "text",
                placeholder: "images/2026",
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "hint" },
            });
            /** @type {__VLS_StyleScopedClasses['hint']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.githubBranch),
                type: "text",
                placeholder: "main",
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
        }
        if (['alioss', 'txcos', 'qiniu'].includes(__VLS_ctx.uploadConfig.provider)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "config-sub-fields" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['config-sub-fields']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "config-row" },
            });
            /** @type {__VLS_StyleScopedClasses['config-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.accessKey),
                type: "text",
                placeholder: "AK...",
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "password",
                placeholder: "SK...",
                ...{ class: "config-input" },
            });
            (__VLS_ctx.uploadConfig.secretKey);
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "config-row" },
            });
            /** @type {__VLS_StyleScopedClasses['config-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.bucket),
                type: "text",
                placeholder: "my-bucket",
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.region),
                type: "text",
                placeholder: (__VLS_ctx.uploadConfig.provider === 'qiniu' ? 'z0' : (__VLS_ctx.uploadConfig.provider === 'alioss' ? 'oss-cn-hangzhou' : 'ap-guangzhou')),
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "config-field-label" },
            });
            /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "hint" },
            });
            /** @type {__VLS_StyleScopedClasses['hint']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.path),
                type: "text",
                placeholder: "blog/uploads/",
                ...{ class: "config-input" },
            });
            /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            if (__VLS_ctx.uploadConfig.provider === 'qiniu') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "config-field-label" },
                });
                /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "hint" },
                });
                /** @type {__VLS_StyleScopedClasses['hint']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    value: (__VLS_ctx.uploadConfig.domain),
                    type: "text",
                    placeholder: "https://cdn.example.com",
                    ...{ class: "config-input" },
                });
                /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
            }
        }
        if (__VLS_ctx.uploadConfig.provider === 'picgo') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "config-info-box" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['config-info-box']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-section-card" },
        });
        /** @type {__VLS_StyleScopedClasses['config-section-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-section-header" },
        });
        /** @type {__VLS_StyleScopedClasses['config-section-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-fields" },
        });
        /** @type {__VLS_StyleScopedClasses['config-fields']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "config-field-label" },
        });
        /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_ctx.uploadConfig.aiEndpoint),
            type: "text",
            placeholder: "https://proxy-ai.doocs.org/v1",
            ...{ class: "config-input" },
        });
        /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "config-field-label" },
        });
        /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            placeholder: "sk-...",
            ...{ class: "config-input" },
        });
        (__VLS_ctx.uploadConfig.aiKey);
        /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-row" },
        });
        /** @type {__VLS_StyleScopedClasses['config-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "config-field-label" },
        });
        /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_ctx.uploadConfig.aiModel),
            type: "text",
            placeholder: "Qwen/Qwen2.5-7B-Instruct",
            ...{ class: "config-input" },
        });
        /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "config-field-label" },
        });
        /** @type {__VLS_StyleScopedClasses['config-field-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_ctx.uploadConfig.aiImageModel),
            type: "text",
            placeholder: "Kwai-Kolors/Kolors",
            ...{ class: "config-input" },
        });
        /** @type {__VLS_StyleScopedClasses['config-input']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "modal-actions" },
        });
        /** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible || __VLS_ctx.isSyncModalVisible || __VLS_ctx.isVisualConfigVisible))
                        return;
                    if (!(__VLS_ctx.isImageConfigVisible))
                        return;
                    __VLS_ctx.isImageConfigVisible = false;
                    // @ts-ignore
                    [isImageConfigVisible, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig,];
                } },
            ...{ class: "btn-save-config" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-save-config']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_63;
let __VLS_66;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent1(__VLS_66, new __VLS_66({
    name: "slide-up",
}));
const __VLS_68 = __VLS_67({
    name: "slide-up",
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
const { default: __VLS_71 } = __VLS_69.slots;
if (__VLS_ctx.isAIAssistantVisible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "ai-drawer-panel" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['ai-drawer-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAIAssistantVisible))
                    return;
                __VLS_ctx.isAIAssistantVisible = false;
                // @ts-ignore
                [isAIAssistantVisible, isAIAssistantVisible,];
            } },
        ...{ class: "close-btn" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAIAssistantVisible))
                    return;
                __VLS_ctx.dispatchAICall('你是一个资深的公众号排版与润色小助手。请修正粗浅的错别字，并使用更高级、吸引人的自媒体口吻润色下文。', __VLS_ctx.content);
                // @ts-ignore
                [content, dispatchAICall,];
            } },
        ...{ class: "btn btn-secondary" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAIAssistantVisible))
                    return;
                __VLS_ctx.dispatchAICall('你是一个文档专家。请提取下文的逻辑大纲，使用嵌套 Markdown 列表紧凑返回。', __VLS_ctx.content);
                // @ts-ignore
                [content, dispatchAICall,];
            } },
        ...{ class: "btn btn-secondary" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAIAssistantVisible))
                    return;
                __VLS_ctx.dispatchAICall('作为资深双语专业译者，请把提供下来的段落流利且地道地翻译成英文。', __VLS_ctx.content);
                // @ts-ignore
                [content, dispatchAICall,];
            } },
        ...{ class: "btn btn-secondary" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAIAssistantVisible))
                    return;
                __VLS_ctx.dispatchAICall('根据内容，请帮我直接输出5个爆款且吸睛的自媒体文章标题供我备选。', __VLS_ctx.content);
                // @ts-ignore
                [content, dispatchAICall,];
            } },
        ...{ class: "btn btn-secondary" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.hr)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.aiPrompt),
        rows: "3",
        placeholder: "例如：帮我梳理三条关于开源生态系统的好处...",
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAIAssistantVisible))
                    return;
                __VLS_ctx.dispatchAICall('你是一个得力的自媒体全能创作助手。', __VLS_ctx.aiPrompt);
                // @ts-ignore
                [dispatchAICall, aiPrompt, aiPrompt,];
            } },
        ...{ class: "btn btn-primary" },
        disabled: (__VLS_ctx.isAILoading || !__VLS_ctx.aiPrompt),
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    if (__VLS_ctx.isAILoading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    if (__VLS_ctx.aiResponse) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ style: {} },
        });
        (__VLS_ctx.aiResponse);
        if (!__VLS_ctx.isAILoading) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isAIAssistantVisible))
                            return;
                        if (!(__VLS_ctx.aiResponse))
                            return;
                        if (!(!__VLS_ctx.isAILoading))
                            return;
                        __VLS_ctx.copyToClipboard(__VLS_ctx.aiResponse);
                        // @ts-ignore
                        [aiPrompt, isAILoading, isAILoading, isAILoading, aiResponse, aiResponse, aiResponse, copyToClipboard,];
                    } },
                ...{ class: "btn btn-secondary" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
        }
    }
}
// @ts-ignore
[];
var __VLS_69;
let __VLS_72;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
    name: "fade",
}));
const __VLS_74 = __VLS_73({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
const { default: __VLS_77 } = __VLS_75.slots;
if (__VLS_ctx.isAITextToImageVisible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAITextToImageVisible))
                    return;
                __VLS_ctx.isAITextToImageVisible = false;
                // @ts-ignore
                [isAITextToImageVisible, isAITextToImageVisible,];
            } },
        ...{ class: "export-overlay" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['export-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "export-modal custom-modal" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
    /** @type {__VLS_StyleScopedClasses['custom-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "config-modal-header" },
    });
    /** @type {__VLS_StyleScopedClasses['config-modal-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "config-modal-title" },
    });
    /** @type {__VLS_StyleScopedClasses['config-modal-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        width: "20",
        height: "20",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "3",
        y: "3",
        width: "18",
        height: "18",
        rx: "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "12",
        cy: "13",
        r: "4",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M5 3v4M19 3v4",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isAITextToImageVisible))
                    return;
                __VLS_ctx.isAITextToImageVisible = false;
                // @ts-ignore
                [isAITextToImageVisible,];
            } },
        ...{ class: "config-close-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['config-close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "modal-body" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        value: (__VLS_ctx.t2iPrompt),
        rows: "5",
        placeholder: "例如：赛博朋克深渊背景下，一只发光的粉红色八爪鱼正在敲击漂浮的机械键盘面板...",
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.dispatchT2ICall) },
        ...{ class: "btn btn-primary" },
        disabled: (__VLS_ctx.isT2ILoading || !__VLS_ctx.t2iPrompt),
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    if (__VLS_ctx.isT2ILoading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
}
// @ts-ignore
[t2iPrompt, t2iPrompt, dispatchT2ICall, isT2ILoading, isT2ILoading,];
var __VLS_75;
let __VLS_78;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_79 = __VLS_asFunctionalComponent1(__VLS_78, new __VLS_78({
    name: "fade",
}));
const __VLS_80 = __VLS_79({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_79));
const { default: __VLS_83 } = __VLS_81.slots;
if (__VLS_ctx.isHistoryVisible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isHistoryVisible))
                    return;
                __VLS_ctx.isHistoryVisible = false;
                // @ts-ignore
                [isHistoryVisible, isHistoryVisible,];
            } },
        ...{ class: "export-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['export-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "export-modal custom-modal" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
    /** @type {__VLS_StyleScopedClasses['custom-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "config-modal-header" },
    });
    /** @type {__VLS_StyleScopedClasses['config-modal-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "config-modal-title" },
    });
    /** @type {__VLS_StyleScopedClasses['config-modal-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        width: "20",
        height: "20",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "12",
        cy: "12",
        r: "10",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
        points: "12 6 12 12 16 14",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isHistoryVisible))
                    return;
                __VLS_ctx.isHistoryVisible = false;
                // @ts-ignore
                [isHistoryVisible,];
            } },
        ...{ class: "config-close-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['config-close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "modal-body" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ style: {} },
    });
    if (__VLS_ctx.savedDrafts.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ style: {} },
        });
    }
    for (const [draft, idx] of __VLS_vFor((__VLS_ctx.savedDrafts))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (idx),
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
            ...{ style: {} },
        });
        (draft.time);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ style: {} },
        });
        (draft.content.replace(/\n/g, ' '));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.isHistoryVisible))
                        return;
                    __VLS_ctx.restoreDraft(draft.content);
                    // @ts-ignore
                    [savedDrafts, savedDrafts, restoreDraft,];
                } },
            ...{ class: "btn btn-primary" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
var __VLS_81;
let __VLS_84;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent1(__VLS_84, new __VLS_84({
    name: "slide-up",
}));
const __VLS_86 = __VLS_85({
    name: "slide-up",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const { default: __VLS_89 } = __VLS_87.slots;
if (__VLS_ctx.toastState.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "toast-container" },
        ...{ class: ('toast-' + __VLS_ctx.toastState.type) },
    });
    /** @type {__VLS_StyleScopedClasses['toast-container']} */ ;
    (__VLS_ctx.toastState.message);
}
// @ts-ignore
[toastState, toastState, toastState,];
var __VLS_87;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
