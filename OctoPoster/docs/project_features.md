# OctoPoster 项目功能清单

> **最后更新**: 2026-04-18  
> **项目描述**: AI 驱动的跨平台图文内容创作工作室，聚合多模态大模型、智能排版引擎、专业级 Fabric.js 画布和 Eino Agent 框架，一站式搞定小红书、公众号、朋友圈等全平台爆款图文。

---

## 1. 系统架构概览

```
┌────────────────────────── 前端 (Vue 3 + Pinia) ──────────────────────────┐
│  HomeView · AppView · OutlineView · GenerateView · ResultView           │
│  HistoryView · SettingsView · CanvasEditor · LoginModal                 │
│  API SDK (api/index.ts) ─── 30+ HTTP/SSE 端点                           │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ HTTP / SSE
┌────────────────────────────────▼─────────────────────────────────────────┐
│                           Gin REST API                                  │
│  handler.go  · agent_handler.go · config_handler.go · history_handler   │
│  user_handler.go · middleware/auth.go                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                     Eino Agent Engine                                    │
│  engine.go · router.go · provider.go · creative_agent.go                │
│  tools.go (7 InferTools) · workflows.go (4 Chains) · tracing.go        │
├─────────────────────────────────────────────────────────────────────────┤
│                       Service Layer                                     │
│  outline · content · image · image_processing · extractor               │
│  template_service · canvas_builder · canvas_templates · credits         │
│  history · moderation                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                       Config + Model                                    │
│  config.go (YAML multi-provider) · model/canvas.go (JSON 画布协议)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 后端功能模块

### 2.1 API 路由总览

| 路径 | 方法 | 认证 | 说明 |
|:---|:---:|:---:|:---|
| `/api/health` | GET | ✗ | 健康检查 |
| `/api/images/:taskId/:filename` | GET | ✗ | 静态图片文件服务 |
| `/api/outline` | POST | ✓ | 根据主题词生成小红书图文大纲（支持附图） |
| `/api/outline/from-url` | POST | ✓ | 从 URL 导入文章并生成大纲 |
| `/api/outline/from-doc` | POST | ✓ | 上传文档（TXT/Markdown）生成大纲 |
| `/api/content` | POST | ✓ | 根据主题 + 大纲生成文案（标题/正文/标签） |
| `/api/generate` | POST | ✓ | SSE 流式并发渲染全部海报图片 |
| `/api/retry` | POST | ✓ | 重试单页失败的图片生成 |
| `/api/regenerate` | POST | ✓ | 重新生成指定页面图片 |
| `/api/templates` | GET | ✓ | 列出所有可用 HTML 海报模板 |
| `/api/render-template` | POST | ✓ | 使用指定 HTML 模板 + 数据渲染海报 |
| `/api/image/remove-text` | POST | ✓ | AI 去除图片中的文字/水印 |
| `/api/image/remove-bg` | POST | ✓ | AI 智能抠图 / 去背景 |
| `/api/image/replace-bg` | POST | ✓ | AI 替换图片背景 |
| `/api/config` | GET | ✓ | 获取当前 Provider 配置 |
| `/api/config` | POST | ✓ | 保存 Provider 配置 |
| `/api/config/test` | POST | ✓ | 测试 Provider API 连通性 |
| `/api/user/profile` | GET | ✓ | 获取用户信息 + 积分 |
| `/api/history/*` | * | ✓ | 历史任务 CRUD (list/detail/delete) |
| `/api/agent/chat` | POST | ✗ | AI Agent 自然语言对话 |
| `/api/agent/tools` | GET | ✗ | 列出所有已注册 Eino 工具 |
| `/api/agent/pipeline` | POST | ✗ | SSE 全流程一键生成 Pipeline |
| `/api/agent/stats` | GET | ✗ | Agent 引擎运行统计 |
| `/api/agent/canvas-command` | POST | ✗ | 画布直接指令 (去背景/智能重排) |

---

### 2.2 Service 层 (11 个服务)

| 服务 | 文件 | 核心功能 |
|:---|:---|:---|
| **OutlineService** | `outline.go` | 调用 LLM 生成结构化大纲（Topic → JSON Pages），支持纯文本或图片补充输入 |
| **ContentService** | `content.go` | 调用 LLM 生成文案三件套：爆款标题组、正文 Copywriting、话题标签 |
| **ImageService** | `image.go` | 使用图片 Provider（Gemini/OpenAI/Ideogram 等）并发生成海报图片，支持 SSE 流式进度推送 |
| **ImageProcessingService** | `image_processing.go` | 三大视觉 AI 处理能力：去水印、去背景、换背景 |
| **ExtractorService** | `extractor.go` | 从网页 URL 提取正文内容（支持公众号、博客、新闻等），使用自定义 User-Agent 绕过 WAF |
| **TemplateService** | `template_service.go` | 管理和渲染 HTML 海报模板（Chromedp 无头浏览器截图） |
| **CanvasBuilder** | `canvas_builder.go` | 将大纲结果映射为 CanvasDocument JSON 结构 |
| **CanvasTemplateRegistry** | `canvas_templates.go` | 原型注册表：提供 Cover / Listicle / Default 三种 JSON 布局模板 |
| **CreditService** | `credits.go` | 用户积分管理（消费/余额/充值） |
| **HistoryService** | `history.go` | 任务历史记录持久化（写入磁盘 JSON），支持列表、详情和删除 |
| **ModerationService** | `moderation.go` | 内容安全审核 / 违禁词检测 |

---

### 2.3 Eino Agent 引擎 (8 个核心文件)

#### 2.3.1 运行时架构

```
用户消息
  │
  ▼
Router (意图分类)
  ├─ IntentWorkflow ──▶ WorkflowExecutor ──▶ Service 层
  └─ IntentAgent ─────▶ CreativeAgent (ReAct) ──▶ ToolRegistry ──▶ Service 层
```

#### 2.3.2 核心组件

| 组件 | 文件 | 功能 |
|:---|:---|:---|
| **Engine** | `engine.go` | 顶层入口，管理 Provider / Tools / Workflows / Router / Sessions / Tracer |
| **Provider** | `provider.go` | Eino ChatModel 连接管理（支持 OpenAI 兼容 API），多 Provider 降级 |
| **Router** | `router.go` | 基于规则的意图分类器（零 LLM 调用），4 类路由规则：URL → outline_from_url、大纲关键词 → outline、文案关键词 → content、一键关键词 → pipeline，其余 → Agent |
| **WorkflowExecutor** | `workflows.go` | 4 个确定性 Workflow Chain：OutlineChain / CopyChain / OutlineFromURLChain / FullPipeline |
| **CreativeAgent** | `creative_agent.go` | 基于 Eino 的 ReAct 自主推理 Agent，可自动调用工具链 |
| **ToolRegistry** | `tools.go` | 7 个已注册 InferTool，详见下表 |
| **SessionManager** | `engine.go` | 基于 `sync.Map` 的多用户并发会话隔离 |
| **Tracer** | `tracing.go` | 滚动缓冲追踪器，记录最近 N 条 Agent 执行事件 |

#### 2.3.3 已注册 Eino 工具 (7 个)

| 工具名 | 绑定 Service | 说明 |
|:---|:---|:---|
| `generate_outline` | OutlineService | 从主题生成结构化大纲 |
| `generate_outline_from_url` | ExtractorService + OutlineService | 从 URL 提取文章并生成大纲 |
| `generate_content` | ContentService | 生成标题 / 文案 / 标签 |
| `extract_url` | ExtractorService | 从网页抓取正文 |
| `remove_text_from_image` | ImageProcessingService | 去除图片中的文字水印 |
| `remove_background` | ImageProcessingService | 智能抠图 / 去背景 |
| `replace_background` | ImageProcessingService | 替换图片背景 |

#### 2.3.4 Workflow Chain (4 条)

| Workflow | 流程 | 特点 |
|:---|:---|:---|
| **OutlineChain** | Topic → Prompt → ChatModel → JSON Parse → 校验 | 结构化输出 |
| **CopyChain** | Topic + Outline → Prompt → ChatModel → 标题/文案/标签 | 文案三件套 |
| **OutlineFromURLChain** | URL → ExtractorService → OutlineChain | URL 导入流 |
| **FullPipeline** | Outline → (Content ∥ Canvas) → Images → Review | 并行流 + SSE 事件 |

---

### 2.4 Canvas JSON 协议

```go
CanvasDocument → []*CanvasPage → []*CanvasLayer
```

| 字段 | 功能 |
|:---|:---|
| `CanvasDocument` | 顶层文档：ID、标题、宽高比 (3:4/16:9/1:1)、基础分辨率、背景色 |
| `CanvasPage` | 单页海报：页码、子图层列表 |
| `CanvasLayer` | 视觉元素：类型 (text/image/shape)、位置/尺寸、文本内容、图片 URL、样式 (Fill/Opacity/FontSize/FontWeight/TextAlign) |

---

### 2.5 配置管理

| 功能 | 详情 |
|:---|:---|
| **Multi-Provider 架构** | 支持同时配置多个 LLM / 图片 Provider（Gemini、OpenAI、DeepSeek、Ideogram 等），可独立切换 Active Provider |
| **YAML 持久化** | `text_providers.yaml` + `image_providers.yaml` 独立存储 |
| **热重载** | 通过 `/api/config` POST 保存后即时生效，Agent Engine 自动 ReloadModels |
| **连通性测试** | `/api/config/test` 发送测试请求验证 API Key 和 Base URL 有效性 |

---

## 3. 前端功能模块

### 3.1 页面路由 (7 个 View)

| 路由 | 视图 | 功能描述 |
|:---|:---|:---|
| `/` | `HomeView.vue` | 品牌着陆页：7 段式高端设计，含 Hero 打字机交互、无限轮播、核心能力卡片、4 步工作流、数据面板、CTA 行动区、页脚 |
| `/app` | `AppView.vue` | 主创作台：输入主题 → 智能推荐 → 选择风格/平台 → 一键启动生成流程 |
| `/outline` | `OutlineView.vue` | 大纲编辑：查看/编辑 AI 生成的结构化大纲，确认后推进至图片生成 |
| `/generate` | `GenerateView.vue` | 图片生成：SSE 实时进度条，单页重试/重新生成，全部完成后跳转结果 |
| `/result` | `ResultView.vue` | 结果展示 + 画布编辑：查看全部生成海报、集成 Fabric.js CanvasEditor 深度编辑 |
| `/history` | `HistoryView.vue` | 历史任务列表：按时间倒序展示所有历史创作，支持查看详情和删除 |
| `/settings` | `SettingsView.vue` | 系统设置：文字/图片 Provider 双栏配置界面、API Key 管理、模型参数 |

### 3.2 核心组件

| 组件 | 功能 |
|:---|:---|
| **CanvasEditor.vue** | 基于 Fabric.js 的像素级画布编辑器：JSON 反序列化渲染多图层、拖放操作、图层选中编辑、内置 Magic AI 工具栏（去背景按钮）、Smart Relayout 一键智能重排 |
| **ContentDisplay.vue** | 文案展示组件：标题列表、正文 Copywriting、标签 Tag 列表 |
| **LoginModal.vue** | 登录/注册弹窗：JWT Token 认证 |

### 3.3 状态管理 (Pinia Stores)

| Store | 字段 | 功能 |
|:---|:---|:---|
| **useAuthStore** | token, user, credits | JWT 认证状态、用户信息、积分余额、登录/登出 |
| **useGeneratorStore** | topic, outline, style, platform, pages, canvasDoc, taskId, imageUrls, errors, pageStatus, titles, copywriting, tags | 全局创作状态管理：从主题输入到最终文案/图片的完整生命周期 |

### 3.4 API SDK (`api/index.ts`)

前端封装了 20+ 个 API 调用函数，涵盖：

- **大纲生成**: `generateOutline()` / `generateOutlineFromURL()` / `generateOutlineFromDoc()`
- **文案生成**: `generateContent()`
- **图片生成**: `generateImages()` (SSE) / `retryImage()` / `regenerateImage()`
- **模板管理**: `listTemplates()` / `renderTemplate()`
- **图片处理**: `removeTextFromImage()` / `removeBackground()` / `replaceBackground()`
- **配置管理**: `getConfig()` / `saveConfig()` / `testConnection()`
- **AI Agent**: `agentChat()` / `agentListTools()` / `agentRunPipeline()` (SSE) / `agentStats()` / `agentCanvasCommand()`
- **历史记录**: `listHistory()` / `getHistoryDetail()` / `deleteHistory()`
- **用户**: `getUserProfile()`

---

## 4. 内容创作完整流程

```
用户输入主题/URL/文档
         │
         ▼
  ┌─ Step 1: 大纲生成 ─┐
  │  OutlineService     │
  │  → 结构化 Pages[]   │
  └─────────┬──────────┘
            │
            ▼
  ┌─ Step 2: 文案生成 ─┐
  │  ContentService     │
  │  → 标题 + 正文 + 标签│
  └─────────┬──────────┘
            │
            ▼
  ┌─ Step 3: 海报渲染 ─┐
  │  ImageService       │
  │  → HTML模板 渲染     │
  │  → 并发 N 页 SSE    │
  └─────────┬──────────┘
            │
            ▼
  ┌─ Step 4: 画布精修 ─┐
  │  CanvasEditor       │
  │  → Fabric.js 拖放   │
  │  → Magic AI 工具    │
  │  → Smart Relayout   │
  └─────────┬──────────┘
            │
            ▼
        导出成片
```

---

## 5. 技术栈总结

| 层级 | 技术 |
|:---|:---|
| **后端框架** | Go + Gin |
| **AI 框架** | CloudWeGo Eino (Workflow + ReAct Agent) |
| **LLM Provider** | OpenAI 兼容 API (Gemini / OpenAI / DeepSeek / 月之暗面 等) |
| **图片生成** | Gemini Imagen / OpenAI DALL-E / Ideogram |
| **图片处理** | Pixian (去背景) / 自建 API (去文字/换背景) |
| **前端框架** | Vue 3 + Pinia + Vue Router |
| **画布引擎** | Fabric.js |
| **模板渲染** | Chromedp (无头浏览器 HTML → Screenshot) |
| **样式体系** | Vanilla CSS Design System (Light Mode Premium) |
| **字体** | Inter (Google Fonts) |
| **部署** | Docker Compose / 独立二进制 |

---

## 6. 目录结构

```
OctoPoster/
├── cmd/server/              # 服务入口 main.go
├── internal/
│   ├── agent/               # Eino Agent 引擎
│   │   ├── engine.go        #   顶层 Engine (Provider+Tools+Workflows+Router+Sessions)
│   │   ├── provider.go      #   LLM ChatModel 连接管理
│   │   ├── router.go        #   意图分类器 (Workflow vs Agent)
│   │   ├── workflows.go     #   4 个确定性 Workflow Chain
│   │   ├── creative_agent.go#   ReAct 自主推理 Agent
│   │   ├── tools.go         #   7 个 InferTool 注册
│   │   ├── tracing.go       #   滚动缓冲追踪器
│   │   └── agent_test.go    #   并发安全测试
│   ├── config/config.go     # YAML 多 Provider 配置
│   ├── handler/
│   │   ├── handler.go       #   路由注册 + 核心 Handler
│   │   ├── agent_handler.go #   Agent API (chat/tools/pipeline/canvas-command)
│   │   ├── config_handler.go#   配置 CRUD API
│   │   ├── history_handler.go#  历史记录 API
│   │   └── user_handler.go  #   用户 API
│   ├── middleware/           # JWT 认证中间件
│   ├── model/canvas.go      # Canvas JSON 协议定义
│   ├── service/             # 11 个业务 Service
│   ├── generator/           # ImageGenerator 接口 + OpenAI Adapter
│   ├── llm/                 # 旧版 HTTP LLM Client (保留兼容)
│   └── util/                # 通用工具函数
├── web/src/
│   ├── views/               # 7 个页面组件
│   ├── components/          # CanvasEditor / ContentDisplay / LoginModal
│   ├── stores/              # auth.ts + generator.ts (Pinia)
│   ├── api/index.ts         # 前端 API SDK
│   ├── router/index.ts      # Vue Router 配置
│   ├── style.css            # 全局设计系统 (Light Mode)
│   └── App.vue              # 应用外壳
├── prompts/                 # LLM Prompt 模板
├── templates/               # HTML 海报模板
├── data/                    # 运行时数据 (任务图片/历史)
├── docs/                    # 项目文档
├── Dockerfile               # Docker 镜像构建
└── docker-compose.yml       # 编排配置
```

---

## 7. 已知边界 & 后续方向

| 项目 | 状态 |
|:---|:---|
| 🔐 JWT 认证 | 已实现，前端 + 中间件全链路 |
| 💰 积分系统 | 已实现 CreditService，但充值通道未对接 |
| 📦 Docker 部署 | Dockerfile + docker-compose.yml 已就绪 |
| 🧪 并发测试 | 4 个 Agent 并发安全测试通过 |
| 🎨 画布编辑器 | Fabric.js 基础版已就绪，高级功能（分组图层、撤销重做）待拓展 |
| 🌍 多语言 | 当前仅支持中文界面 |
| 📊 数据分析 | 暂未实现用户行为分析 / 创作数据统计 |
| 🔄 模板市场 | CanvasTemplateRegistry 支持 3 种原型，待持续扩充 |
