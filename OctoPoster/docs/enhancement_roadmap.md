# OctoPoster × PagePop 竞品对标功能增强路线图

> 创建日期：2026-04-17

## 分阶段实施路线图

### 阶段一：智能输入源扩展（当前最大短板）
**目标**：从"只能手动输入主题" → "支持多种智能输入"

**改动清单**：
- `[NEW] internal/service/extractor.go` - URL 正文提取 + 文档解析
- `[NEW] prompts/smart_outline_prompt.txt` - 长文 → 可视化排版大纲 prompt
- `[MODIFY] internal/handler/handler.go` - 新增 `/api/outline/from-url` 和 `/api/outline/from-doc`
- `[MODIFY] internal/service/outline.go` - 增加 sourceText 参数支持
- `[MODIFY] web/src/views/AppView.vue` - 输入区增加 Tab: 主题/URL/文档

---

### 阶段二：多尺寸自适应输出
**目标**：一套内容，多平台尺寸一键切换

**改动清单**：
- `[MODIFY] internal/service/image.go` - 动态 targetRatio 参数
- `[MODIFY] internal/generator/openai_images.go` - aspect_ratio 动态传入
- `[MODIFY] web/src/views/AppView.vue` - 目标平台选择 UI
- `[MODIFY] web/src/views/GenerateView.vue` - 预览卡片自适应比例

---

### 阶段三：模板系统与结构化渲染
**目标**：从"纯 AI 图片生成" → "模板 + AI 内容填充"双模引擎

**改动清单**：
- `[NEW] templates/` - HTML 模板目录 (5-10 套)
- `[NEW] internal/service/template_service.go` - chromedp 渲染
- `[MODIFY] internal/handler/handler.go` - `/api/templates` + `/api/render-template`
- `[MODIFY] web/src/views/AppView.vue` - 模板画廊 UI

---

### 阶段四：前端画布编辑器（中期目标）
**目标**：引入 Fabric.js 画布编辑器，AI 生成后可手动微调

**改动清单**：
- `[NEW] web/src/components/CanvasEditor.vue` - Fabric.js 画布组件
- `[MODIFY] web/src/views/ResultView.vue` - 图片编辑按钮
- `[MODIFY] web/package.json` - 新增 fabric 依赖

---

### 阶段五：AI 图像处理能力（远期目标）
**目标**：对标 PagePop 的智能修图/去文字/背景替换

**改动清单**：
- `[NEW] internal/service/image_processing.go` - 去文字/去背景/换背景
- `[MODIFY] internal/handler/handler.go` - `/api/image/remove-text` 等端点
- `[MODIFY] web/src/components/CanvasEditor.vue` - AI 工具栏

---

## 实施优先级

| 阶段 | 核心价值 | 复杂度 | 预估工期 | 依赖 |
|------|---------|--------|---------|------|
| **一：智能输入源** | ⭐⭐⭐⭐⭐ 最大差距 | 中 | 2-3 天 | 无 |
| **二：多尺寸输出** | ⭐⭐⭐⭐ 多平台刚需 | 低 | 1 天 | 无 |
| **三：模板系统** | ⭐⭐⭐⭐ 质量飞跃 | 中高 | 3-5 天 | chromedp |
| **四：画布编辑器** | ⭐⭐⭐ 体验质变 | 高 | 5-8 天 | Fabric.js |
| **五：AI 图像处理** | ⭐⭐ 差异化 | 中 | 2-3 天 | 外部 API |
