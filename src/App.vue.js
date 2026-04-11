import { onErrorCaptured, ref, onMounted } from 'vue';
import Editor from './components/Editor.vue';
import './assets/css/theme-tokens.css';
const errorDetails = ref('');
const isDarkMode = ref(false);
const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
    }
    else {
        document.documentElement.classList.remove('dark');
    }
};
onMounted(() => {
    // Read preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDarkMode.value = true;
        document.documentElement.classList.add('dark');
    }
});
onErrorCaptured((err, instance, info) => {
    console.error("APP CAUGHT:", err);
    errorDetails.value = err.stack || String(err);
    return false;
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.errorDetails) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_ctx.errorDetails);
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.toggleTheme) },
        ...{ class: "global-theme-toggle" },
        title: (__VLS_ctx.isDarkMode ? '切换至亮色模式' : '切换至暗色模式'),
    });
    /** @type {__VLS_StyleScopedClasses['global-theme-toggle']} */ ;
    if (__VLS_ctx.isDarkMode) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            stroke: "currentColor",
            'stroke-width': "2",
            fill: "none",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.circle, __VLS_intrinsics.circle)({
            cx: "12",
            cy: "12",
            r: "5",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "12",
            y1: "1",
            x2: "12",
            y2: "3",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "12",
            y1: "21",
            x2: "12",
            y2: "23",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "4.22",
            y1: "4.22",
            x2: "5.64",
            y2: "5.64",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "18.36",
            y1: "18.36",
            x2: "19.78",
            y2: "19.78",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "1",
            y1: "12",
            x2: "3",
            y2: "12",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "21",
            y1: "12",
            x2: "23",
            y2: "12",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "4.22",
            y1: "19.78",
            x2: "5.64",
            y2: "18.36",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line, __VLS_intrinsics.line)({
            x1: "18.36",
            y1: "5.64",
            x2: "19.78",
            y2: "4.22",
        });
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            width: "20",
            height: "20",
            stroke: "currentColor",
            'stroke-width': "2",
            fill: "none",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
            d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
        });
    }
    const __VLS_0 = Editor;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
// @ts-ignore
[errorDetails, errorDetails, toggleTheme, isDarkMode, isDarkMode,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
