import { ref, onMounted, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
// @ts-ignore
import * as htmlToImage from 'html-to-image';
const isDesktop = !!window.electronAPI;
const isWechatAvailable = !!window.wechatAPI;
const content = ref('# Hello SaaS!\n\nThis is the Universal Markdown Engine. Let\'s cite something [wiki](https://wikipedia.org "Wiki Article").');
const htmlOutput = ref('');
const previewContainer = ref(null);
const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
    .use(footnote);
const updateHtml = () => {
    htmlOutput.value = md.render(content.value);
};
watch(content, () => {
    updateHtml();
});
onMounted(() => {
    updateHtml();
});
const exportImage = async () => {
    if (!previewContainer.value)
        return;
    try {
        const dataUrl = await htmlToImage.toPng(previewContainer.value);
        // Universal Adapter Branching!
        // @ts-ignore
        if (window.electronAPI) {
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            // @ts-ignore
            await window.electronAPI.writeFile('./export.png', base64Data, 'base64');
            alert("✅ Saved natively to export.png via Electron!");
        }
        else {
            const link = document.createElement('a');
            link.download = 'article-export.png';
            link.href = dataUrl;
            link.click();
            alert("✅ Saved to browser downloads folder!");
        }
    }
    catch (e) {
        alert('Error exporting: ' + e.message);
    }
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-layout" },
});
/** @type {__VLS_StyleScopedClasses['editor-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toolbar" },
});
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.exportImage) },
});
if (__VLS_ctx.isDesktop) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "native-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['native-btn']} */ ;
}
if (__VLS_ctx.isWechatAvailable) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "native-btn wechat-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['native-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['wechat-btn']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "split-pane" },
});
/** @type {__VLS_StyleScopedClasses['split-pane']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    value: (__VLS_ctx.content),
    ...{ class: "raw-markdown" },
    placeholder: "Write markdown here...",
});
/** @type {__VLS_StyleScopedClasses['raw-markdown']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "preview-pane" },
    ref: "previewContainer",
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.htmlOutput) }, null, null);
/** @type {__VLS_StyleScopedClasses['preview-pane']} */ ;
// @ts-ignore
[exportImage, isDesktop, isWechatAvailable, content, htmlOutput,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
