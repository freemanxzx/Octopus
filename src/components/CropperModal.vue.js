import { ref, watch, nextTick, onUnmounted } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
const props = defineProps();
const emit = defineEmits();
const imageRef = ref(null);
const cropper = ref(null);
const isSaving = ref(false);
const initCropper = () => {
    if (cropper.value) {
        cropper.value.destroy();
    }
    if (imageRef.value) {
        cropper.value = new Cropper(imageRef.value, {
            viewMode: 1,
            dragMode: 'crop',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    }
};
watch(() => props.isOpen, async (newVal) => {
    if (newVal) {
        await nextTick(); // Wait for DOM to render img
        // Initialize cropper after a tiny delay specifically for large images to be decoded by the browser
        setTimeout(initCropper, 100);
    }
    else {
        if (cropper.value) {
            cropper.value.destroy();
            cropper.value = null;
        }
    }
});
onUnmounted(() => {
    if (cropper.value) {
        cropper.value.destroy();
    }
});
const closeModal = () => {
    if (isSaving.value)
        return;
    emit('close');
};
const handleSave = () => {
    if (!cropper.value || isSaving.value)
        return;
    isSaving.value = true;
    cropper.value.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    }).toBlob((blob) => {
        isSaving.value = false;
        if (blob) {
            // Create a unique filename for the cropped result
            const filename = `cropped-${Date.now()}.png`;
            const file = new File([blob], filename, { type: 'image/png' });
            emit('save', file);
        }
        else {
            alert("裁剪提取失败");
        }
    }, 'image/png', 1);
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cropper-header']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['cropper-body']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
if (__VLS_ctx.isOpen) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "cropper-overlay" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-overlay']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-modal" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-header" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "icon-btn close-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['icon-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M18 6L6 18M6 6l12 12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-body" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-container-wrapper" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-container-wrapper']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        ref: "imageRef",
        src: (__VLS_ctx.imageUrl),
        alt: "Target Image",
        ...{ style: {} },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-footer" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-tools" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-tools']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.cropper?.rotate(-90);
                // @ts-ignore
                [isOpen, closeModal, closeModal, imageUrl, cropper,];
            } },
        ...{ class: "tool-btn" },
        title: "向左旋转",
    });
    /** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M3 3v5h5",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.cropper?.rotate(90);
                // @ts-ignore
                [cropper,];
            } },
        ...{ class: "tool-btn" },
        title: "向右旋转",
    });
    /** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path, __VLS_intrinsics.path)({
        d: "M21 3v5h-5",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tool-divider" },
    });
    /** @type {__VLS_StyleScopedClasses['tool-divider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.cropper?.setAspectRatio(1);
                // @ts-ignore
                [cropper,];
            } },
        ...{ class: "tool-btn" },
        title: "1:1 方形",
    });
    /** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.cropper?.setAspectRatio(16 / 9);
                // @ts-ignore
                [cropper,];
            } },
        ...{ class: "tool-btn" },
        title: "16:9 宽屏",
    });
    /** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isOpen))
                    return;
                __VLS_ctx.cropper?.setAspectRatio(NaN);
                // @ts-ignore
                [cropper,];
            } },
        ...{ class: "tool-btn" },
        title: "自由裁剪",
    });
    /** @type {__VLS_StyleScopedClasses['tool-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cropper-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['cropper-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "btn btn-secondary" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleSave) },
        ...{ class: "btn btn-primary" },
        disabled: (__VLS_ctx.isSaving),
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    if (__VLS_ctx.isSaving) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "loading-spinner" },
        });
        /** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
    }
    (__VLS_ctx.isSaving ? '保存中...' : '确认裁剪并替换');
}
// @ts-ignore
[closeModal, handleSave, isSaving, isSaving, isSaving,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
