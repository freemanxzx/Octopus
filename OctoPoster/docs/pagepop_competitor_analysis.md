# PagePop 竞品深度调研与 OctoPoster 演进指南

> 调研日期：2026-04-17

## 1. PagePop (pagepop.cn / pagepop.ai) 核心价值主张
PagePop 是一款"零门槛"的 **AI 驱动一站式内容创作与智能排版平台**。
**核心理念**："输入文字/想法，输出商业级设计"。
**目标用户**：小红书博主、电商卖家、自媒体运营等需要极速、高频产出高质量图文的用户。

---

## 2. PagePop 核心功能拆解 (User Flow / Features)

1. **AI 图文生成 (Text/Image-to-Poster)**
   - **智能文案生成**：输入一个主题、上传一张草图或一段杂乱的笔记，平台会利用 LLM 自动梳理逻辑，生成符合小红书网感特性的爆款文案（包含主标题、副标题、内容列表、口语化描述和 Emoji）。
   - **多模态图文解析**：将枯燥的长文档甚至图片自动解析为图文的各个图层（标题区、配图区、正文区）。

2. **跨平台一键自适应排版 (Auto-Layout Canvas)**
   - 包含海量高质量设计模板。
   - **动态尺寸适配**：设计好的海报或卡片可以一键从"小红书 3:4"秒切至"微信公众号配图 16:9"或"朋友圈 1:1"，排版在切换时能做到**智能流式布局**，而非简单的强行拉伸。

3. **AI 智能图像处理内嵌**
   - **无痕去字/修图 (Inpainting)**：内置 AI 模型（如基于 Segment Anything 与 SD Inpainting 的结合），可一键抹除商品背景或原图文字。
   - **自然语言修图**：支持通过对话或指令（如"把背景改成海滩"、"字体换成更活泼的粉色"）实时修改画布内的元素。

4. **即用的轻量化编辑器 (Web Canvas Editor)**
   - 相比于传统重型 PS，提供一个轻量化的拖拽编辑器界面，用户在 AI 生成初稿后，可以手动微调文字模块、替换底图、修改透明度等。

---

## 3. 彻底缕清：PagePop 技术路线反推

PagePop 的系统架构可以高度概括为 **三个核心引擎的串联**，这也是市场上顶尖 AI 视觉工具的核心流派：

### 3.1 意图与协议生成引擎 (LLM Protocol Planner)
当用户输入"做一张草莓蛋糕的小红书封面"时：
- 后台调用的并不是画图 API，而是调用经过特殊 Prompt 甚至 Fine-Tuned 的大语言模型。
- **技术实现**：大模型执行类似于 `CreatiPoster` 论文中的逻辑，将用户的自然语言需求转译为一个严格的 **JSON 协议表**（包含了图层、文本内容、坐标、推荐颜色集、视觉层级先后关系等）。

### 3.2 动态套版与自动布局算法 (Auto-Layout Engine)
从 JSON 协议到视觉呈现的桥梁。
- **技术实现**：并非从零生成图片像素。系统拥有庞大的**结构化组件库/模板库**（如 Vue/React 封装的背景组件、标题组件、卡片组件）。JSON 协议会与这些模板发生绑定（Data Binding）。为了实现尺寸一键切换，大概率使用了**流式约束布局（类似 Flexbox 映射到 Canvas 坐标）** 或响应式 SVG/HTML2Canvas 渲染。

### 3.3 前端画布渲染与编辑引擎 (Frontend Canvas Editor)
用户能够在浏览器里顺滑修改内容。
- **技术栈推断**：**React/Vue3 + Fabric.js (或底层 Canvas 2D API)**。
- 只有使用类似于 `yft-design` 或 `vue-fabric-editor` 这种基于 JSON 可逆向渲染画布的框架，才能完美承接后端大模型吐出的 JSON 数据，将其变为前端可交互的图层（Layers）。

---

## 4. OctoPoster 现有架构概述

| 层 | 技术 | 说明 |
|---|------|------|
| 后端 | Go (Gin) | OutlineService → ContentService → ImageService (2-phase cover+content, SSE, 15-concurrent) |
| 前端 | Vue3 + Vite + TS + Pinia | 7 views: Home/App/Outline/Generate/Result/History/Settings |
| 生成器 | OpenAI Images API | `/v1/images/generations` (b64_json), 支持风格参考图 |
| 配置 | YAML (text_providers / image_providers) | 热加载、多 Provider 切换 |

### 当前限制（vs PagePop 差距）
- ❌ 仅支持主题文字输入，不支持 URL/文档导入
- ❌ 固定 3:4 比例，无多平台尺寸切换
- ❌ 纯 AI 生图，无模板系统
- ❌ 无 Canvas 编辑器，不可二次编辑
- ❌ 无 AI 图像处理（去文字/去背景）
