# Octopus MD 图像处理与渲染引架构

## 1. 核心特性概述

Octopus MD 在图像交互上采用了“无阻塞”与“所见即所得”的双轨核心设计，主要包含以下两大功能模块：

1. **极致多线程图像压缩 (Background Compression)** 
2. **交互式无缝二次裁剪弹窗 (Interactive Image Cropping)**

---

## 2. 极致多线程图像压缩 (Web Worker Pipeline)

### 2.1 解决的痛点
在传统的 Markdown 编辑器中，如果用户通过快捷键（Ctrl+V）或拖拽上传一张数十兆（MB）的超清原图，因为 JavaScript 运行在单线程主线中，使用 Canvas 进行本地重新取样（Resampling）时会导致整个浏览器的 UI 渲染引擎冻结，用户此时敲击键盘或滚动页面将产生明显的卡顿死机感。

### 2.2 核心技术栈
- **核心库**: `browser-image-compression`
- **运行层**: `Web Worker` 异步线程池

### 2.3 工作流程 (Workflow)
在 `src/utils/uploader.ts` 的上传执行入口中，加入了基于 Web Worker 的 `compressImage` 拦截器：
1. **智能分发**：当检测到图片体积小于 `500KB` 或是 `GIF` 动图格式时，零计算放行，直接通过，最大限度节省 CPU 开销并防止动图掉帧。
2. **离屏运算**：将臃肿的 File 对象跨线程传进 Web Worker。
3. **分辨率约束**：将最高画幅长宽智能压缩限制在 `1920px` 级别（最主流的横版或竖排高清安全尺寸屏宽）。
4. **二分降解**：目标产出体积被锁定在最高 `500KB`（`maxSizeMB: 0.5`）。算法会在后台高速二分画质以逼近该目标，一旦完成直接推向后续的 `PicGo` / `GitHub` / `COS` 图床上传池。

---

## 3. 交互式二次裁剪弹窗 (Interactive Image Cropping)

### 3.1 解决的痛点
以往作者想要微调文章内容中的截图或网络配图，需要在本地打开外部图片编辑器（Photoshop 等），裁剪后再重新回到编辑器上传、再更新链接。

### 3.2 核心技术栈
- **核心库**: `cropper.js` (稳定版 v1.6.x)
- **组件化**: `CropperModal.vue` 暗色玻璃态全屏模态框

### 3.3 破壳联动设计
此模块打破了 CodeMirror (输入域) 与 HTML Preview (渲染域) 之间的数据壁垒：
1. **渲染层侦听**：直接在右侧 Markdown 的底层预览容器（`.preview-pane`）附加事件代理（Event Delegation）。
2. **精准捕获**：当用户在右侧文章预览流内点击任意非 Data-URI Base64 格式的图片（`<img>`）时，拦截默认交互并获取它的远端真实 `src`。
3. **沙盒编辑器呼出**：瞬间打开独立包裹的 `CropperModal.vue`。用户可以通过顶尖的裁剪组件自由选择：向左/右旋转、智能等比裁剪（1:1、16:9）、亦或是鼠标拖拽出自由画幅。
4. **原子化热替换**：点击“确认裁剪并替换”后，系统：
   - A. 以 `high` 平滑算法捕获当前的画布（Canvas），转换为高清 PNG Blob。
   - B. 以静默异步调用当前用户配置的全局图床 `uploadImage` API。
   - C. 上传拿到全新的 URL 链接后，针对左侧 CodeMirror 的响应式 `content.value` 值执行精准 `replace(oldUrl, newUrl)` 字符串正则级替换更新。

### 3.4 API 回退安全性
在进行重度图床二次上传更新替换时，设计了容灾 Fallback：
系统会首先尝试获取 `localStorage` 中的 `octopus-img` 的全局上传配置文件。若用户未做定制化处理，上传器会默认安全降维到使用 `PicGo` 做网关重试传输。如果一切失败，会弹出 `showToast` 防止用户数据假死崩溃。
