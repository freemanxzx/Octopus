# OctoPoster 技术架构文档

> 版本：v0.1.0 | 更新日期：2026-04-18

---

## 一、系统概述

OctoPoster 是一款 **AI 驱动的小红书/社交媒体图文内容一站式生成平台**。用户通过自然语言输入主题、粘贴文章链接、或上传文档，系统自动完成大纲推理、图文并发渲染、爆款文案输出与画布精修的全流程闭环。

## 二、整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                       Vue 3 Frontend (SPA)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │HomeView  │ │AppView   │ │Generate  │ │ResultView│ ...     │
│  │(落地页)  │ │(工作台)  │ │View(渲染)│ │(交付室)  │        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       └────────────┴────────────┴───────┬────┘              │
│                                         │ Pinia Store        │
│  ┌─────────────────────────────────────┐│                    │
│  │ api/index.ts (Fetch + SSE Client)   ││                    │
│  └─────────────────┬───────────────────┘│                    │
└────────────────────┼────────────────────┼────────────────────┘
                     │ HTTP / SSE          │
┌────────────────────┼────────────────────┼────────────────────┐
│                    │  Gin HTTP Server    │                    │
│  ┌─────────────────▼───────────────────┐│                    │
│  │   handler/ (路由层)                 ││                    │
│  │   ├─ handler.go       主路由注册    ││                    │
│  │   ├─ config_handler.go 配置管理     ││                    │
│  │   ├─ history_handler.go 历史记录    ││                    │
│  │   └─ user_handler.go   用户信息     ││                    │
│  └─────────────────┬───────────────────┘│                    │
│  ┌─────────────────▼───────────────────┐│                    │
│  │   middleware/                        ││                    │
│  │   └─ auth.go (JWT 鉴权 + 开发旁路) ││                    │
│  └─────────────────┬───────────────────┘│                    │
│  ┌─────────────────▼───────────────────┐│                    │
│  │   service/ (核心业务层)             ││                    │
│  │   ├─ outline.go         大纲推理    ││                    │
│  │   ├─ content.go         文案生成    ││                    │
│  │   ├─ image.go           图片并发生成││                    │
│  │   ├─ image_processing.go AI后处理   ││                    │
│  │   ├─ template_service.go 模板渲染   ││                    │
│  │   ├─ extractor.go       URL/文档提取││                    │
│  │   ├─ history.go         归档管理    ││                    │
│  │   ├─ credits.go         积分系统    ││                    │
│  │   └─ moderation.go      内容审核    ││                    │
│  └─────────────────┬───────────────────┘│                    │
│  ┌─────────────────▼───────────────────┐│                    │
│  │   llm/client.go (统一 LLM 接口)    ││                    │
│  │   generator/openai_images.go (图片) ││                    │
│  └─────────────────┬───────────────────┘│                    │
│                    │                     │                    │
│                    ▼                     │                    │
│         ┌─────────────────────┐          │                    │
│         │ config/config.go    │          │                    │
│         │ (YAML 多 Provider)  │          │                    │
│         └─────────────────────┘          │                    │
│  Go Backend (Gin + Chromedp)             │                    │
└──────────────────────────────────────────┴────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │  External AI Services          │
    │  ├─ Gemini API (文本+图片)     │
    │  ├─ OpenAI Compatible API      │
    │  └─ 可扩展更多 Provider        │
    └────────────────────────────────┘
```

## 三、技术栈明细

### 3.1 前端层

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue 3** | 3.x | 响应式 SPA 框架 (Composition API + `<script setup>`) |
| **Vite** | 8.x | 极速构建工具，支持 HMR 与 Tree-shaking |
| **TypeScript** | 5.x | 全局类型安全 |
| **Pinia** | 最新 | 状态管理 (auth + generator 双 Store) |
| **Vue Router** | 4.x | SPA 路由 + 导航守卫鉴权 |
| **Fabric.js** | 6.x | Canvas 画布编辑器 (图层/文字/形状/2x导出) |
| **Inter** | 9权重 | Google Fonts 专业无衬线字体 |

### 3.2 后端层

| 技术 | 用途 |
|------|------|
| **Go 1.21+** | 高并发后端语言 |
| **Gin** | 轻量级 HTTP 框架 |
| **Gin-CORS** | 跨域中间件 |
| **Chromedp** | 无头 Chrome 控制 (模板→图片渲染) |
| **SSE (Server-Sent Events)** | 实时流式推送生成进度 |
| **JWT** | Token 鉴权中间件 |
| **YAML** | 多 Provider 配置文件 (`text_providers.yaml`, `image_providers.yaml`) |

### 3.3 AI/ML 服务层

| 能力 | 实现方式 |
|------|----------|
| **文本推理** | Gemini 2.0 Flash / GPT-4o (OpenAI Compatible) |
| **图片生成** | Gemini 3 Pro Image Preview / 可扩展 |
| **AI 去文字** | 多模态 LLM 指令 (image+prompt → image) |
| **AI 去背景** | 多模态 LLM 指令 |
| **AI 换背景 (Inpainting)** | 多模态 LLM + Prompt |

## 四、核心数据流

### 4.1 主流程：从输入到产出

```
用户输入 (主题/URL/文档)
    │
    ▼
ExtractorService (URL解析 / 文档读取)
    │
    ▼
OutlineService + LLM Client
    │  Prompt → Gemini → JSON 大纲
    ▼
前端 OutlineView (大纲预览与编辑)
    │
    ▼
ImageService.GenerateImages()  ← SSE 流式推送
    │  并发 goroutine × N页
    │  每页: Prompt → Gemini Image → PNG
    ▼
GenerateView (实时进度) → ResultView (成果画廊)
    │
    ▼ (可选)
ContentService → 爆款文案 + 标签
CanvasEditor → Fabric.js 精修
ImageProcessing → AI去字/去背景/换背景
```

### 4.2 SSE 实时通信协议

```
event: progress
data: {"index": 0, "status": "generating"}

event: complete
data: {"index": 0, "image_url": "/api/images/task_xxx/0.png"}

event: error
data: {"index": 1, "message": "生成失败: rate limit"}
```

### 4.3 模板渲染管线

```
前端选择模板 + 填入插槽数据
    │
    ▼
POST /api/render-template
    │
    ▼
TemplateService:
  1. 加载 HTML 模板文件
  2. 注入数据到模板 slots
  3. Chromedp 启动无头 Chrome
  4. 渲染 HTML → 截图 PNG
  5. 保存到 history/{taskId}/
    │
    ▼
返回图片 URL
```

## 五、目录结构

```
OctoPoster/
├── cmd/server/main.go           # 应用入口
├── internal/
│   ├── config/config.go         # YAML 配置加载
│   ├── generator/
│   │   ├── interface.go         # 图片生成器接口
│   │   └── openai_images.go     # OpenAI 图片实现
│   ├── handler/
│   │   ├── handler.go           # 主路由 (27个API端点)
│   │   ├── config_handler.go    # 配置 CRUD
│   │   ├── history_handler.go   # 历史 CRUD + 搜索
│   │   └── user_handler.go      # 用户信息
│   ├── llm/client.go            # 统一 LLM 调用封装
│   ├── middleware/auth.go       # JWT 鉴权
│   ├── service/
│   │   ├── outline.go           # 大纲推理
│   │   ├── content.go           # 文案生成
│   │   ├── image.go             # 图片并发生成
│   │   ├── image_processing.go  # AI 后处理
│   │   ├── template_service.go  # Chromedp 模板渲染
│   │   ├── extractor.go         # URL/文档提取
│   │   ├── history.go           # 历史归档
│   │   ├── credits.go           # 积分管理
│   │   └── moderation.go        # 内容审核
│   └── util/image_compress.go   # 图片压缩
├── web/                         # Vue 3 前端
│   └── src/
│       ├── api/index.ts         # 320行 API客户端 (20+接口)
│       ├── stores/              # Pinia状态管理
│       ├── views/               # 7个视图页面
│       ├── components/          # CanvasEditor + ContentDisplay
│       └── style.css            # 全局设计系统 (30+ Token)
├── prompts/                     # LLM Prompt 模板
├── templates/                   # HTML渲染模板
├── history/                     # 图片输出目录
└── data/                        # 持久化数据
```

## 六、API 端点清单

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|:----:|
| GET | `/api/health` | 健康检查 | ✗ |
| GET | `/api/images/:taskId/:filename` | 图片静态服务 | ✗ |
| POST | `/api/outline` | 主题→大纲 | ✓ |
| POST | `/api/outline/from-url` | URL→大纲 | ✓ |
| POST | `/api/outline/from-doc` | 文档→大纲 | ✓ |
| POST | `/api/content` | 文案+标签生成 | ✓ |
| POST | `/api/generate` | 图片并发生成 (SSE) | ✓ |
| POST | `/api/retry` | 单页重试 | ✓ |
| POST | `/api/regenerate` | 单页重生成 | ✓ |
| GET | `/api/templates` | 模板列表 | ✓ |
| POST | `/api/render-template` | 模板渲染 | ✓ |
| POST | `/api/image/remove-text` | AI去文字 | ✓ |
| POST | `/api/image/remove-bg` | AI去背景 | ✓ |
| POST | `/api/image/replace-bg` | AI换背景 | ✓ |
| GET | `/api/config` | 读取配置 | ✓ |
| POST | `/api/config` | 保存配置 | ✓ |
| POST | `/api/config/test` | 测试API连接 | ✓ |
| GET | `/api/user/profile` | 用户信息 | ✓ |
| GET | `/api/history` | 历史列表 | ✓ |
| GET | `/api/history/:id` | 历史详情 | ✓ |
| POST | `/api/history` | 创建记录 | ✓ |
| PUT | `/api/history/:id` | 更新记录 | ✓ |
| DELETE | `/api/history/:id` | 删除记录 | ✓ |
| GET | `/api/history/search` | 搜索 | ✓ |
| GET | `/api/history/stats` | 统计 | ✓ |
| POST | `/api/history/scan-all` | 批量同步 | ✓ |
| GET | `/api/history/:id/download` | 打包下载 | ✓ |

## 七、关键设计决策

### 7.1 为什么选 Go + Gin？
- **性能**：Go 的 goroutine 模型天然适配多页图片并发生成场景
- **部署**：单二进制分发，无需 Node.js / Python 运行时
- **SSE**：Gin 原生支持 `http.Flusher`，实现流式推送

### 7.2 为什么用 Chromedp 而非纯前端渲染？
- **精度**：无头 Chrome 保证 CSS 渲染 1:1 还原设计稿
- **安全**：模板渲染在服务端完成，防止客户端篡改
- **批量**：可在服务端批量渲染，不消耗用户浏览器资源

### 7.3 为什么前后端分离但同进程部署？
- 开发阶段用 `npm run dev` 独立启动前端
- 生产阶段用 `npm run build → web/dist/` 由 Go 的 `r.Static()` 托管
- **零额外部署成本**：一个二进制即完整服务

### 7.4 积分系统设计
- 基于 JSON 文件的轻量级积分存储 (`data/credits.json`)
- 操作成本：大纲生成 5 积分，图片生成 2 积分/页，模板渲染 3 积分
- 开发者模式自动授予 9999 积分
