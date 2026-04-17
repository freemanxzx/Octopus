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
    const __VLS_0 = Editor;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    var __VLS_5 = {};
    var __VLS_3;
}
// @ts-ignore
[errorDetails, errorDetails,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
