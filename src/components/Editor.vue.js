import { ref, onMounted, onUnmounted, watch, shallowRef, computed } from 'vue';
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
// Static raw CSS imports to bypass Vite dynamic loader sandbox and CDN blocks
import githubCss from 'highlight.js/styles/github.css?raw';
import vs2015Css from 'highlight.js/styles/vs2015.css?raw';
import atomOneDarkCss from 'highlight.js/styles/atom-one-dark.css?raw';
import atomOneLightCss from 'highlight.js/styles/atom-one-light.css?raw';
import monokaiCss from 'highlight.js/styles/monokai.css?raw';
import draculaCss from 'highlight.js/styles/base16/dracula.css?raw';
const codeThemeMap = {
    'github': githubCss,
    'vs2015': vs2015Css,
    'atom-one-dark': atomOneDarkCss,
    'atom-one-light': atomOneLightCss,
    'monokai': monokaiCss,
    'dracula': draculaCss
};
const isDesktop = ref(!!window.electronAPI);
const isWechatAvailable = ref(!!window.wechatAPI);
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
    { id: 'github', name: '代码: Github' },
    { id: 'vs2015', name: '代码: VS 2015' },
    { id: 'atom-one-dark', name: '代码: Atom Dark' },
    { id: 'atom-one-light', name: '代码: Atom Light' },
    { id: 'monokai', name: '代码: Monokai' },
    { id: 'dracula', name: '代码: Dracula' }
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
const customStyleContent = ref("");
const toggleCSS = () => {
    isEditingTheme.value = !isEditingTheme.value;
    if (isEditingTheme.value) {
        customStyleContent.value = themeStyleContent.value;
        showToast("已提取当前主题源码进入自定义编辑模式", "success");
    }
    else {
        customStyleContent.value = "";
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
watch(content, (newVal) => {
    const lines = newVal.split('\n');
    const items = [];
    let inCodeBlock = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock)
            continue;
        const match = line.match(/^(#{1,2})\s+(.+)$/);
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
    .use(markdownItImageFlow);
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
// Replace standard alerts
const customAlert = (msg) => showModal("提示", msg, false);
const customConfirm = (msg) => showModal("确认操作", msg, true);
// Image Upload State
const isImageConfigVisible = ref(false);
const uploadConfig = ref((() => {
    try {
        const saved = localStorage.getItem('octopus-upload-config');
        return saved ? JSON.parse(saved) : { provider: 'base64' };
    }
    catch {
        return { provider: 'base64' };
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
                    refsHtml += `<span id="fn${num}" class="footnote-item"><span class="footnote-num">[${num}] </span><p><span class="footnote-word">${a.textContent.replace(`[${num}]`, '')}</span>: <em>${a.href}</em></p></span>\n`;
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
    const serifStyle = useSerifFont.value ? "font-family: Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif !important;" : "";
    htmlOutput.value = `<section id="nice" class="markdown-body ${useSerifFont.value ? 'use-serif' : ''}" style="width: 100% !important; max-width: none !important; ${serifStyle}">${rawHtml}</section>`;
};
watch([content, isMacCodeBlock, useSerifFont, enableLinkFootnote, showReferences, showDiagrams], updateHtml);
onMounted(updateHtml);
// Dropdown Menu Logic
const activeMenu = ref(null);
const toggleMenu = (menu) => {
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
const closeMenu = (e) => {
    if (!e.target.closest('.menu-item')) {
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
    }
    else {
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
    if (isMacCodeBlock.value)
        classes.push('mac-code-enabled');
    if (useSerifFont.value)
        classes.push('serif-font');
    return classes.join(' ');
});
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
        document.execCommand('copy');
        const platName = platform === 'wechat' ? '微信' : (platform === 'zhihu' ? '知乎' : '掘金');
        showToast(`✅ CSS深度内联成功！已专门适配【${platName}】并复制，可以直接去粘贴了！`, "success");
    }
    catch (e) {
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
const viewMode = ref('mobile');
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
        input.accept = '.md, .txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = (e) => {
                content.value = e.target.result;
                showToast("✅ SaaS云通道：成功解析导入 Markdown 文档", "success");
            };
            reader.readAsText(file);
        };
        input.click();
    }
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
    isPreviewMode.value = !isPreviewMode.value;
    showToast(isPreviewMode.value ? "已进入沉浸预览模式" : "已退出沉浸预览模式", "success");
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
        // Only trigger if mouse is hovering this pane
        if (preview.matches(':hover') || isSyncing)
            return;
        syncScroll(cmScroll, preview);
    });
    preview.addEventListener('scroll', () => {
        // Only trigger if mouse is hovering this pane
        if (cmScroll.matches(':hover') || isSyncing)
            return;
        syncScroll(preview, cmScroll);
    });
};
// Formatting Toolbar Logic
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
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-group']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['octopus-status-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['cm-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-content']} */ ;
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
/** @type {__VLS_StyleScopedClasses['btn-icon-text']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary-filled']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['wechat']} */ ;
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['zhihu']} */ ;
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['juejin']} */ ;
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['serif-font']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-block']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "octopus-layout" },
});
/** @type {__VLS_StyleScopedClasses['octopus-layout']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "octopus-header system-menu-bar" },
});
/** @type {__VLS_StyleScopedClasses['octopus-header']} */ ;
/** @type {__VLS_StyleScopedClasses['system-menu-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-group" },
});
/** @type {__VLS_StyleScopedClasses['brand-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "logo" },
});
/** @type {__VLS_StyleScopedClasses['logo']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "classic-menus" },
});
/** @type {__VLS_StyleScopedClasses['classic-menus']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('file');
            // @ts-ignore
            [toggleMenu,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'file') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.importMd) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.exportMd) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.exportHtmlFile) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.printPdf) },
    ...{ class: "dropdown-item" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isDesktop) }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.exportImage) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('format');
            // @ts-ignore
            [toggleMenu, activeMenu, importMd, exportMd, exportHtmlFile, printPdf, isDesktop, exportImage,];
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
            __VLS_ctx.insertFormat('~~', '~~');
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
            __VLS_ctx.insertFormat('**', '**');
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
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
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
    ...{ onClick: (__VLS_ctx.toggleSerif) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "check-icon" },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.useSerifFont ? '✅' : '　');
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
            __VLS_ctx.toggleMenu('function');
            // @ts-ignore
            [toggleMenu, toggleSerif, useSerifFont, toggleLinkFootnote, toggleReferences, showReferences, toggleDiagrams, showDiagrams, formatMd,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'function') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.notImpl) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.notImpl) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('view');
            // @ts-ignore
            [toggleMenu, activeMenu, notImpl, notImpl,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'view') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
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
    ...{ class: "check-icon" },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.viewMode === 'pc' ? '✅' : '　');
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
    ...{ class: "check-icon" },
});
/** @type {__VLS_StyleScopedClasses['check-icon']} */ ;
(__VLS_ctx.viewMode === 'mobile' ? '✅' : '　');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.togglePreviewMode) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
(__VLS_ctx.isPreviewMode ? '关闭预览模式' : '开启沉浸全屏');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleMacCodeBlock) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
(__VLS_ctx.isMacCodeBlock ? '关闭' : '开启');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleMenu('settings');
            // @ts-ignore
            [toggleMenu, viewMode, togglePreviewMode, isPreviewMode, toggleMacCodeBlock, isMacCodeBlock,];
        } },
    ...{ class: "menu-item" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-menu" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'settings') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dropdown-divider" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.resetEditor) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
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
    ...{ class: "dropdown-menu" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeMenu === 'help') }, null, null);
/** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.notImpl) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.notImpl) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.showAbout) },
    ...{ class: "dropdown-item" },
});
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "actions" },
});
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "view-toggles-pill" },
});
/** @type {__VLS_StyleScopedClasses['view-toggles-pill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.viewMode = 'pc';
            // @ts-ignore
            [activeMenu, notImpl, notImpl, viewMode, showAbout,];
        } },
    ...{ class: "pill-btn" },
    ...{ class: ({ active: __VLS_ctx.viewMode === 'pc' }) },
});
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    stroke: "currentColor",
    'stroke-width': "2.5",
    fill: "none",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect, __VLS_intrinsics.rect)({
    x: "2",
    y: "3",
    width: "20",
    height: "14",
    rx: "2",
    ry: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "8",
    y1: "21",
    x2: "16",
    y2: "21",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "12",
    y1: "17",
    x2: "12",
    y2: "21",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.viewMode = 'mobile';
            // @ts-ignore
            [viewMode, viewMode,];
        } },
    ...{ class: "pill-btn" },
    ...{ class: ({ active: __VLS_ctx.viewMode === 'mobile' }) },
});
/** @type {__VLS_StyleScopedClasses['pill-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    'stroke-width': "2.5",
    fill: "none",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect, __VLS_intrinsics.rect)({
    x: "5",
    y: "2",
    width: "14",
    height: "20",
    rx: "2",
    ry: "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "12",
    y1: "18",
    x2: "12.01",
    y2: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "octopus-header formatting-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['octopus-header']} */ ;
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "format-actions" },
});
/** @type {__VLS_StyleScopedClasses['format-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showToc = !__VLS_ctx.showToc;
            // @ts-ignore
            [viewMode, showToc, showToc,];
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
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.handleFileSelected) },
    type: "file",
    ref: "fileInput",
    accept: "image/*",
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('\n> ', '');
            // @ts-ignore
            [insertFormat, triggerImageUpload, handleFileSelected,];
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
    ...{ class: "actions" },
});
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "control-group" },
});
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "premium-select-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['premium-select-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedCodeTheme),
    ...{ class: "premium-select" },
});
/** @type {__VLS_StyleScopedClasses['premium-select']} */ ;
for (const [c] of __VLS_vFor((__VLS_ctx.codeThemes))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (c.id),
        value: (c.id),
    });
    (c.name);
    // @ts-ignore
    [formatMd, selectedCodeTheme, codeThemes,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "premium-select-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['premium-select-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedTheme),
    ...{ class: "premium-select" },
});
/** @type {__VLS_StyleScopedClasses['premium-select']} */ ;
for (const [t] of __VLS_vFor((__VLS_ctx.themes))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (t.id),
        value: (t.id),
    });
    (t.name);
    // @ts-ignore
    [selectedTheme, themes,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleCSS) },
    ...{ class: "btn-icon-text" },
    ...{ style: {} },
    title: (__VLS_ctx.isEditingTheme ? '关闭自定义CSS' : '配置自定义CSS样式'),
});
/** @type {__VLS_StyleScopedClasses['btn-icon-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    fill: "none",
    'stroke-width': "2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
    cx: "12",
    cy: "12",
    r: "3",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "workspace" },
    ...{ class: ({ 'is-dragging': __VLS_ctx.isDragging }) },
});
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['is-dragging']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-pane" },
    ...{ style: ({ width: __VLS_ctx.isEditingTheme ? '33.333%' : (__VLS_ctx.leftWidth + '%') }) },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isPreviewMode) }, null, null);
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
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
            [isPreviewMode, showToc, showToc, toggleCSS, isEditingTheme, isEditingTheme, isDragging, leftWidth,];
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
});
/** @type {__VLS_StyleScopedClasses['cm-wrapper']} */ ;
let __VLS_12;
/** @ts-ignore @type {typeof __VLS_components.Codemirror} */
Codemirror;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    ...{ 'onReady': {} },
    ...{ 'onFocus': {} },
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.content),
    placeholder: "Start writing...",
    ...{ style: ({ height: '100%', width: '100%', fontSize: '15px' }) },
    autofocus: (true),
    indentWithTab: (true),
    tabSize: (2),
    extensions: (__VLS_ctx.extensions),
}));
const __VLS_14 = __VLS_13({
    ...{ 'onReady': {} },
    ...{ 'onFocus': {} },
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.content),
    placeholder: "Start writing...",
    ...{ style: ({ height: '100%', width: '100%', fontSize: '15px' }) },
    autofocus: (true),
    indentWithTab: (true),
    tabSize: (2),
    extensions: (__VLS_ctx.extensions),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_17;
const __VLS_18 = ({ ready: {} },
    { onReady: (__VLS_ctx.handleReady) });
const __VLS_19 = ({ focus: {} },
    { onFocus: (...[$event]) => {
            __VLS_ctx.showToc = false;
            // @ts-ignore
            [showToc, tocList, content, extensions, handleReady,];
        } });
const __VLS_20 = ({ change: {} },
    { onChange: (...[$event]) => {
            __VLS_ctx.showToc = false;
            // @ts-ignore
            [showToc,];
        } });
var __VLS_15;
var __VLS_16;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onMousedown: (__VLS_ctx.startDrag) },
    ...{ class: "resizer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isPreviewMode && !__VLS_ctx.isEditingTheme) }, null, null);
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "resizer-handle" },
});
/** @type {__VLS_StyleScopedClasses['resizer-handle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "preview-pane" },
    ...{ class: ({ 'is-mobile': __VLS_ctx.viewMode === 'mobile' }) },
    ref: "previewContainer",
    ...{ style: ({ width: __VLS_ctx.isPreviewMode ? '100%' : (__VLS_ctx.isEditingTheme ? '33.333%' : (100 - __VLS_ctx.leftWidth + '%')) }) },
});
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['is-mobile']} */ ;
if (__VLS_ctx.themeStyleContent && !__VLS_ctx.isEditingTheme) {
    const __VLS_21 = ('style');
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        id: "markdown-theme",
    }));
    const __VLS_23 = __VLS_22({
        id: "markdown-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    const { default: __VLS_26 } = __VLS_24.slots;
    (__VLS_ctx.themeStyleContent);
    // @ts-ignore
    [themeStyleContent, themeStyleContent, viewMode, isPreviewMode, isPreviewMode, isEditingTheme, isEditingTheme, isEditingTheme, leftWidth, startDrag,];
    var __VLS_24;
}
if (__VLS_ctx.codeThemeStyleContent) {
    const __VLS_27 = ('style');
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
        id: "code-theme",
    }));
    const __VLS_29 = __VLS_28({
        id: "code-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    const { default: __VLS_32 } = __VLS_30.slots;
    (__VLS_ctx.codeThemeStyleContent);
    // @ts-ignore
    [codeThemeStyleContent, codeThemeStyleContent,];
    var __VLS_30;
}
if (__VLS_ctx.customStyleContent && __VLS_ctx.isEditingTheme) {
    const __VLS_33 = ('style');
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
        id: "custom-theme",
    }));
    const __VLS_35 = __VLS_34({
        id: "custom-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    const { default: __VLS_38 } = __VLS_36.slots;
    (__VLS_ctx.customStyleContent);
    // @ts-ignore
    [isEditingTheme, customStyleContent, customStyleContent,];
    var __VLS_36;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "preview-content" },
    ...{ class: (__VLS_ctx.extraCssClass) },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.htmlOutput) }, null, null);
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "floating-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['floating-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('wechat');
            // @ts-ignore
            [extraCssClass, htmlOutput, copyHtml,];
        } },
    ...{ class: "float-btn wechat" },
    title: "发往 微信公众号",
});
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['wechat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "22",
    height: "22",
    fill: "currentColor",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M8.5 13.5c-3.5 0-6.5-2.5-6.5-5.5S5 2.5 8.5 2.5 15 5 15 8c0 3-3 5.5-6.5 5.5zm-1-7c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm6 11c3 0 5.5-2 5.5-4.5S19.5 9 16.5 9c-.5 0-1 .05-1.5.15.5 1 .85 2 .85 3.35 0 3-2.5 5.5-5.5 5.5-.85 0-1.65-.2-2.35-.5-.4 1.5-1.5 2.5-2.5 3 1 .5 2 1 3 1 2.5 0 4.5-2 4.5-4.5z",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('zhihu');
            // @ts-ignore
            [copyHtml,];
        } },
    ...{ class: "float-btn zhihu" },
    title: "发往 知乎平台",
});
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['zhihu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('juejin');
            // @ts-ignore
            [copyHtml,];
        } },
    ...{ class: "float-btn juejin" },
    title: "发往 稀土掘金",
});
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['juejin']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "20",
    height: "20",
    fill: "currentColor",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M12 2l-3.3 2.7h6.6L12 2zm-5.7 4.7l-2.4 1.9 8.1 6.6 8.1-6.6-2.4-1.9-5.7 4.7-5.7-4.7zm0 2.2L1.8 12 12 20.3 22.2 12l-4.5-3.1L12 13.6 6.3 8.9z",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "float-divider" },
});
/** @type {__VLS_StyleScopedClasses['float-divider']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.exportImage) },
    ...{ class: "float-btn export" },
    title: "保存为 超清长图",
});
/** @type {__VLS_StyleScopedClasses['float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['export']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "20",
    height: "20",
    stroke: "currentColor",
    'stroke-width': "2",
    fill: "none",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
    points: "7 10 12 15 17 10",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-pane css-pane" },
    ...{ style: {} },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isEditingTheme && !__VLS_ctx.isPreviewMode) }, null, null);
/** @type {__VLS_StyleScopedClasses['editor-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['css-pane']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ style: {} },
});
let __VLS_39;
/** @ts-ignore @type {typeof __VLS_components.Codemirror} */
Codemirror;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
    modelValue: (__VLS_ctx.customStyleContent),
    extensions: ([__VLS_ctx.oneDark]),
    ...{ style: {} },
}));
const __VLS_41 = __VLS_40({
    modelValue: (__VLS_ctx.customStyleContent),
    extensions: ([__VLS_ctx.oneDark]),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
let __VLS_44;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    name: "fade",
}));
const __VLS_46 = __VLS_45({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const { default: __VLS_49 } = __VLS_47.slots;
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
[exportImage, isPreviewMode, isEditingTheme, customStyleContent, oneDark, isExporting,];
var __VLS_47;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    name: "fade",
}));
const __VLS_52 = __VLS_51({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
const { default: __VLS_55 } = __VLS_53.slots;
if (__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible))
                    return;
                __VLS_ctx.isImageConfigVisible = false;
                __VLS_ctx.clsoeModal(false);
                // @ts-ignore
                [isImageConfigVisible, isImageConfigVisible, modalState, clsoeModal,];
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
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ style: {} },
        });
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
                        if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible))
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
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible))
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
    if (__VLS_ctx.isImageConfigVisible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "export-modal custom-modal" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['export-modal']} */ ;
        /** @type {__VLS_StyleScopedClasses['custom-modal']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ style: {} },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (__VLS_ctx.uploadConfig.provider),
            ...{ style: {} },
        });
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
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.githubRepo),
                type: "text",
                placeholder: "username/repo",
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "password",
                placeholder: "ghp_xxxxxxxxxxxxxxxxxxx",
                ...{ style: {} },
            });
            (__VLS_ctx.uploadConfig.githubToken);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.githubPath),
                type: "text",
                placeholder: "images/2026",
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.githubBranch),
                type: "text",
                placeholder: "main",
                ...{ style: {} },
            });
        }
        if (['alioss', 'txcos', 'qiniu'].includes(__VLS_ctx.uploadConfig.provider)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.accessKey),
                type: "text",
                placeholder: "AccessKey ID",
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "password",
                placeholder: "AccessKey Secret",
                ...{ style: {} },
            });
            (__VLS_ctx.uploadConfig.secretKey);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.bucket),
                type: "text",
                placeholder: "Bucket 名称",
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.region),
                type: "text",
                placeholder: (__VLS_ctx.uploadConfig.provider === 'qiniu' ? 'z0' : (__VLS_ctx.uploadConfig.provider === 'alioss' ? 'oss-cn-hangzhou' : 'ap-guangzhou')),
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                value: (__VLS_ctx.uploadConfig.path),
                type: "text",
                placeholder: "blog/uploads/",
                ...{ style: {} },
            });
            if (__VLS_ctx.uploadConfig.provider === 'qiniu') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ style: {} },
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    value: (__VLS_ctx.uploadConfig.domain),
                    type: "text",
                    placeholder: "https://cdn.example.com",
                    ...{ style: {} },
                });
            }
        }
        if (__VLS_ctx.uploadConfig.provider === 'picgo') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ style: {} },
            });
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "modal-actions" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.modalState.visible || __VLS_ctx.isImageConfigVisible))
                        return;
                    if (!(__VLS_ctx.isImageConfigVisible))
                        return;
                    __VLS_ctx.isImageConfigVisible = false;
                    // @ts-ignore
                    [isImageConfigVisible, isImageConfigVisible, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig, uploadConfig,];
                } },
            ...{ class: "btn btn-primary" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    }
}
// @ts-ignore
[];
var __VLS_53;
let __VLS_56;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
    name: "slide-up",
}));
const __VLS_58 = __VLS_57({
    name: "slide-up",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const { default: __VLS_61 } = __VLS_59.slots;
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
var __VLS_59;
__VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
    ...{ class: "octopus-status-bar" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.isPreviewMode) }, null, null);
/** @type {__VLS_StyleScopedClasses['octopus-status-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-left" },
});
/** @type {__VLS_StyleScopedClasses['status-left']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-item" },
});
/** @type {__VLS_StyleScopedClasses['status-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
    ...{ style: {} },
});
(__VLS_ctx.wordCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-item" },
});
/** @type {__VLS_StyleScopedClasses['status-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({
    ...{ style: {} },
});
(__VLS_ctx.lineCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-right" },
});
/** @type {__VLS_StyleScopedClasses['status-right']} */ ;
if (__VLS_ctx.isDesktop) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "status-item" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['status-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        ...{ style: {} },
        viewBox: "0 0 24 24",
        width: "14",
        height: "14",
        stroke: "currentColor",
        'stroke-width': "2",
        fill: "none",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M22 11.08V12a10 10 0 1 1-5.93-9.14",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.polyline, __VLS_intrinsics.polyline)({
        points: "22 4 12 14.01 9 11.01",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "status-item" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['status-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        ...{ style: {} },
        viewBox: "0 0 24 24",
        width: "14",
        height: "14",
        stroke: "currentColor",
        'stroke-width': "2",
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
}
// @ts-ignore
[isDesktop, isPreviewMode, wordCount, lineCount,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
