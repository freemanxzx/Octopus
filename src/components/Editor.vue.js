import { ref, onMounted, onUnmounted, watch, shallowRef, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import hljs from 'highlight.js';
// @ts-ignore
import * as htmlToImage from 'html-to-image';
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
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
        const cssObj = await import(`../assets/themes/${themeId}.css?raw`);
        themeStyleContent.value = cssObj.default || "";
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
const loadCodeTheme = async (themeId) => {
    try {
        const cssObj = await import(`highlight.js/styles/${themeId}.css?raw`);
        codeThemeStyleContent.value = cssObj.default || "";
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

## 4. 微信图文黑科技测试 (WeChat Black Magic)

在微信公众号生态中，外链总是会被无情拦截。但现在您可以直接写标准链接，比如探讨前沿技术的 [苹果官方设计与技术规范](https://developer.apple.com/design/ "Human Interface Guidelines")，以及深度的 [TypeScript 官方权威接口指南](https://www.typescriptlang.org/)。

*点击顶部菜单中的 \`[格式] -> [微信外链转脚注]\`，您会看到所有带超链接的文字旁边会自动升起极致优雅的蓝色数字上标，紧接着文章末尾会自动生成一条由高亮分割线隔开的【参考资料】深度摘要版块！这在过去的 Markdown2Html 原生文颜工具中备受大量推文作者的热烈追捧！*

---
✨ **测试结束**。以上排版在右侧的引擎中全部被严格遵守并在任何设备下稳定呈现。点按上方的「复制到微信」按钮，粘贴到公众号编辑后台体验终极无损穿透效果吧！
`);
const htmlOutput = ref('');
const previewContainer = ref(null);
// Setup MarkdownIt with Highlight.js
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang }).value;
            }
            catch (__) { }
        }
        return ''; // use external default escaping
    }
}).use(footnote);
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
             <strong style="color: #333;">${a.textContent.replace(`[${num}]`, '')}</strong>: 
             <span style="color:#64748b; word-break: break-all;">${a.href}</span>
           </li>`;
                }
            });
            refsHtml += '</ul></div>';
            if (showReferences.value) {
                rawHtml = doc.body.innerHTML + refsHtml;
            }
            else {
                rawHtml = doc.body.innerHTML;
            }
        }
    }
    htmlOutput.value = `<section id="nice" class="markdown-body" style="width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important;">${rawHtml}</section>`;
};
watch(content, updateHtml);
onMounted(updateHtml);
// Dropdown Menu Logic
const activeMenu = ref(null);
const toggleMenu = (menu) => {
    activeMenu.value = activeMenu.value === menu ? null : menu;
};
// File I/O Operations
const importMd = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
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
const viewMode = ref('pc');
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
        // Allow Vue to render the overlay
        await new Promise(r => setTimeout(r, 100));
        const contentNode = previewContainer.value.querySelector('.preview-content');
        if (!contentNode)
            throw new Error("无法定位预览区域内容");
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
const extensions = [markdown(), oneDark];
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
/** @type {__VLS_StyleScopedClasses['formatting-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
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
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['is-dragging']} */ ;
/** @type {__VLS_StyleScopedClasses['resizer']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
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
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
/** @type {__VLS_StyleScopedClasses['mac-code-enabled']} */ ;
/** @type {__VLS_StyleScopedClasses['copy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['copy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['copy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['copy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['copy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
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
    ...{ onClick: (__VLS_ctx.notImpl) },
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
            [toggleMenu, activeMenu, notImpl, resetEditor,];
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
            __VLS_ctx.insertFormat('~~', '~~');
            // @ts-ignore
            [activeMenu, insertFormat, notImpl, notImpl, showAbout,];
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
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.insertFormat('![图片描述](', ') ');
            // @ts-ignore
            [insertFormat,];
        } },
    ...{ class: "icon-btn" },
    title: "图片",
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
            [insertFormat,];
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
    ...{ class: "view-toggles" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['view-toggles']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.viewMode = 'pc';
            // @ts-ignore
            [formatMd, viewMode,];
        } },
    ...{ class: "btn-toggle" },
    ...{ class: ({ active: __VLS_ctx.viewMode === 'pc' }) },
});
/** @type {__VLS_StyleScopedClasses['btn-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
    stroke: "currentColor",
    'stroke-width': "2",
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
    ...{ class: "btn-toggle" },
    ...{ class: ({ active: __VLS_ctx.viewMode === 'mobile' }) },
});
/** @type {__VLS_StyleScopedClasses['btn-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    stroke: "currentColor",
    'stroke-width': "2",
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
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedCodeTheme),
    ...{ class: "theme-select inline-select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['theme-select']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-select']} */ ;
for (const [c] of __VLS_vFor((__VLS_ctx.codeThemes))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (c.id),
        value: (c.id),
    });
    (c.name);
    // @ts-ignore
    [viewMode, selectedCodeTheme, codeThemes,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.selectedTheme),
    ...{ class: "theme-select inline-select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['theme-select']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-select']} */ ;
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
    ...{ class: "btn btn-native" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-native']} */ ;
if (!__VLS_ctx.isEditingTheme) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "copy-group" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['copy-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('wechat');
            // @ts-ignore
            [toggleCSS, isEditingTheme, copyHtml,];
        } },
    ...{ class: "btn-copy wechat" },
});
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['wechat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "13",
    height: "13",
    stroke: "currentColor",
    'stroke-width': "2",
    fill: "none",
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('zhihu');
            // @ts-ignore
            [copyHtml,];
        } },
    ...{ class: "btn-copy zhihu" },
});
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['zhihu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.copyHtml('juejin');
            // @ts-ignore
            [copyHtml,];
        } },
    ...{ class: "btn-copy juejin" },
});
/** @type {__VLS_StyleScopedClasses['btn-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['juejin']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.exportImage) },
    ...{ class: "btn btn-primary" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    width: "14",
    height: "14",
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
let __VLS_12;
/** @ts-ignore @type {typeof __VLS_components.Codemirror} */
Codemirror;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    ...{ 'onReady': {} },
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
if (__VLS_ctx.customStyleContent) {
    const __VLS_19 = ('style');
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
        id: "custom-theme",
    }));
    const __VLS_21 = __VLS_20({
        id: "custom-theme",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    const { default: __VLS_24 } = __VLS_22.slots;
    (__VLS_ctx.customStyleContent);
    // @ts-ignore
    [exportImage, viewMode, isPreviewMode, isPreviewMode, isPreviewMode, isEditingTheme, isEditingTheme, isEditingTheme, isDragging, leftWidth, leftWidth, content, extensions, handleReady, startDrag, customStyleContent, customStyleContent,];
    var __VLS_22;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "preview-content" },
    ...{ class: (__VLS_ctx.extraCssClass) },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.htmlOutput) }, null, null);
/** @type {__VLS_StyleScopedClasses['preview-content']} */ ;
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
let __VLS_25;
/** @ts-ignore @type {typeof __VLS_components.Codemirror} */
Codemirror;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
    modelValue: (__VLS_ctx.customStyleContent),
    extensions: ([__VLS_ctx.oneDark]),
    ...{ style: {} },
}));
const __VLS_27 = __VLS_26({
    modelValue: (__VLS_ctx.customStyleContent),
    extensions: ([__VLS_ctx.oneDark]),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_30;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    name: "fade",
}));
const __VLS_32 = __VLS_31({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const { default: __VLS_35 } = __VLS_33.slots;
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
[isPreviewMode, isEditingTheme, customStyleContent, extraCssClass, htmlOutput, oneDark, isExporting,];
var __VLS_33;
let __VLS_36;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
    name: "fade",
}));
const __VLS_38 = __VLS_37({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const { default: __VLS_41 } = __VLS_39.slots;
if (__VLS_ctx.modalState.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "export-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['export-overlay']} */ ;
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
// @ts-ignore
[];
var __VLS_39;
let __VLS_42;
/** @ts-ignore @type {typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
transition;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
    name: "slide-up",
}));
const __VLS_44 = __VLS_43({
    name: "slide-up",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
const { default: __VLS_47 } = __VLS_45.slots;
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
var __VLS_45;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
