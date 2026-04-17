# OctoPoster 智能体技术调研与架构方案

> 深度调研时间：2026-04-18 | 基于 2025-2026 业界最新进展

---

## 一、2026 全球智能体技术全景

### 1.1 行业从"对话"进入"执行"时代

2026 年的 AI 智能体已经从简单的 Chatbot 演进为**自主执行型代理 (Autonomous Agent)**。核心变化：

| 维度 | 2024 | 2026 |
|------|------|------|
| **交互模式** | 单轮/多轮对话 | 长时自主工作流（跨小时/天） |
| **工具使用** | 硬编码 Function Calling | MCP 标准协议，动态发现工具 |
| **多 Agent 协作** | 实验阶段 | A2A 协议生产级落地 |
| **视觉能力** | 图片理解 | Computer Use (操控桌面/浏览器) |
| **状态管理** | 对话历史 | 结构化状态机 + 检查点持久化 |
| **容错** | 失败即终止 | 断点续跑 + 自动重试 + 人工介入 |

### 1.2 三大标准协议

#### MCP — Model Context Protocol (Anthropic → 行业标准)
- **定位**：Agent ↔ 工具/数据 的标准连接协议
- **现状**：月下载量突破 1 亿次，被 Anthropic、OpenAI、Google、Microsoft 全面支持
- **核心能力**：
  - 客户端-服务端架构，Agent 通过 JSON-RPC 调用工具
  - 工具渐进式发现 (Progressive Discovery)，避免上下文窗口溢出
  - 支持 Triggers（Webhook 式主动推送）、原生流式返回
  - 企业级鉴权 (OAuth 2.0 / mTLS)

#### A2A — Agent-to-Agent Protocol (Google → Linux 基金会)
- **定位**：Agent ↔ Agent 的对等通信协议
- **核心机制**：
  - **Agent Card**：标准化 JSON 元数据，描述 Agent 能力、输入输出、鉴权方式
  - 基于 HTTP + JSON-RPC 2.0 + SSE（与我们现有 SSE 管线天然兼容）
  - 支持任务委派、异步长时操作、进度流式报告

#### 三层协议栈关系
```
┌─────────────────────────────────────────┐
│         应用层 (OctoPoster)              │
├─────────────────────────────────────────┤
│   A2A: Agent ↔ Agent 协作通信            │
│   (规划 Agent 委派任务给渲染 Agent)       │
├─────────────────────────────────────────┤
│   MCP: Agent ↔ 工具/数据 连接            │
│   (Agent 调用 Chromedp / LLM / 文件系统) │
├─────────────────────────────────────────┤
│   LLM: 多模态推理引擎                    │
│   (Gemini / GPT / Claude)               │
└─────────────────────────────────────────┘
```

### 1.3 主流多 Agent 编排框架

| 框架 | 适用场景 | 核心特点 | 语言 |
|------|----------|----------|:----:|
| **LangGraph** | 生产级复杂工作流 | 图状态机 + 检查点 + HITL | Python |
| **CrewAI** | 角色分工型团队 | 声明式角色定义 + 任务委派 | Python |
| **AutoGen** | 会话式多 Agent | 灵活交互模式 (辩论/层级) | Python |
| **Anthropic SDK** | 极简 Agent 循环 | 原生 Tool Use + Computer Use | Python |
| **OpenAI Agents SDK** | OpenAI 生态 | Swarm-like 多 Agent 路由 | Python |

---

## 二、OctoPoster 应采用的智能体架构

### 2.1 为什么 OctoPoster 需要智能体

当前 OctoPoster 的每个功能（大纲推理、图片生成、文案写作、图像后处理）都是**独立的、线性调用 LLM 的服务**。但竞品 PagePop 的核心竞争力在于"一句话生成一切"——这背后本质上是一个**多步骤、多能力协调的 Agent 工作流**。

```
用户说："帮我把这篇护肤文章做成小红书图文"
   │
   │ 当前 OctoPoster：用户需手动操作 5+ 步
   │ ①提取URL ②生成大纲 ③选模板 ④生成图片 ⑤写文案
   │
   │ Agent 化 OctoPoster：一句话 → 全自动
   │ 规划 Agent 自动编排上述 5 步 + 异常重试 + 质量评估
   └──────────────────────────────────────────
```

### 2.2 推荐架构：Multi-Agent Orchestration + MCP

```
┌────────────────────────────────────────────────────────────┐
│                    OctoPoster Agent System                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Orchestrator Agent (协调者)               │   │
│  │  · 理解用户意图                                       │   │
│  │  · 分解任务为子步骤                                   │   │
│  │  · 分发给专家 Agent                                   │   │
│  │  · 汇总结果 + 质量把关                                │   │
│  └───────┬──────────┬──────────┬──────────┬─────────────┘   │
│          │          │          │          │                   │
│    ┌─────▼────┐┌────▼────┐┌───▼────┐┌────▼─────┐           │
│    │ 内容解析 ││ 视觉创作 ││ 文案写作 ││ 后处理    │           │
│    │ Agent    ││ Agent    ││ Agent   ││ Agent    │           │
│    │          ││          ││         ││          │           │
│    │·URL 抓取 ││·大纲→图片││·爆款标题││·去文字   │           │
│    │·文档解析 ││·模板渲染 ││·正文文案││·去/换背景│           │
│    │·主题提取 ││·风格适配 ││·标签推荐││·画质增强 │           │
│    └─────┬────┘└────┬────┘└───┬────┘└────┬─────┘           │
│          │          │          │          │                   │
│    ┌─────▼──────────▼──────────▼──────────▼─────────────┐   │
│    │                MCP Tool Layer                        │   │
│    │  · LLM Tool (文本推理/多模态图片生成)               │   │
│    │  · Chromedp Tool (HTML→图片渲染)                     │   │
│    │  · FileSystem Tool (读取/保存图片)                   │   │
│    │  · URL Extractor Tool (网页抓取)                     │   │
│    │  · Canvas Tool (Fabric.js 画布操作)                  │   │
│    └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 2.3 四个专家 Agent 职责定义

| Agent | 职责 | 输入 | 输出 | MCP 工具 |
|-------|------|------|------|----------|
| **内容解析 Agent** | 理解并提取源素材 | URL/文档/主题词 | 结构化内容摘要 | `url_extractor`, `doc_parser`, `llm_text` |
| **视觉创作 Agent** | 生成高质量图片 | 大纲 + 风格 + 尺寸 | N 张 PNG | `llm_image`, `chromedp_render`, `file_save` |
| **文案写作 Agent** | 输出爆款文案和标签 | 主题 + 大纲 | 标题/正文/标签 | `llm_text` |
| **后处理 Agent** | 图片精修与增强 | 原始图片 + 指令 | 处理后图片 | `llm_multimodal`, `image_process` |

### 2.4 技术选型推荐

考虑到 OctoPoster 是 **Go 后端**，我们不应引入 Python 框架 (LangGraph/CrewAI) 带来的混合技术栈复杂度。推荐如下方案：

| 层次 | 推荐选型 | 理由 |
|------|----------|------|
| **Agent 编排** | **Go 原生实现** (轻量级状态机) | OctoPoster 已有 Go 并发基座，无需引入 Python |
| **工具协议** | **MCP (Go SDK)** | 2026 行业标准，统一工具调用接口 |
| **Agent 通信** | **A2A 兼容 (SSE + JSON-RPC)** | 与现有 SSE 管线天然兼容 |
| **推理引擎** | **Gemini / GPT / Claude (多 Provider)** | 已有 `llm/client.go` 统一封装 |
| **状态持久化** | **SQLite/BoltDB** | 轻量级，单文件部署 |

---

## 三、实施路线图

### Phase 1：Agent 基础设施 (1-2 周)

```go
// internal/agent/orchestrator.go — 核心状态机

type AgentState struct {
    TaskID      string
    Status      string   // planning | executing | reviewing | done | error
    Steps       []Step
    CurrentStep int
    Context     map[string]interface{}
    CreatedAt   time.Time
}

type Step struct {
    Agent   string   // "content_parser" | "visual_creator" | "copywriter" | "post_processor"
    Action  string   // "extract_url" | "generate_images" | "write_copy" | ...
    Input   interface{}
    Output  interface{}
    Status  string
    Error   string
    Retries int
}
```

**具体任务**：
- [ ] 定义 `Agent` 接口 (Plan / Execute / Review)
- [ ] 实现 `Orchestrator` 状态机 (任务分解 + 调度 + 重试)
- [ ] 将现有 `service/` 包装为 MCP Tool
- [ ] 添加 SSE 流式推送 Agent 执行进度

### Phase 2：MCP 工具层 (1 周)

```
OctoPoster MCP Server 暴露的 Tools:
├── octoposter/extract_url      — 提取URL内容
├── octoposter/extract_doc      — 解析上传文档
├── octoposter/generate_outline — 大纲推理
├── octoposter/generate_images  — 并发图片生成
├── octoposter/render_template  — 模板渲染
├── octoposter/generate_copy    — 文案+标签生成
├── octoposter/remove_text      — AI去文字
├── octoposter/remove_bg        — AI去背景
├── octoposter/replace_bg       — AI换背景
└── octoposter/save_file        — 保存文件
```

**具体任务**：
- [ ] 实现 Go MCP Server (JSON-RPC 2.0 over stdio/HTTP)
- [ ] 将每个 `service/*` 注册为 MCP Tool
- [ ] 编写 Tool Schema (输入/输出 JSON Schema)
- [ ] 实现 Tool 渐进式发现 (避免上下文溢出)

### Phase 3：智能工作流 (2 周)

**"一句话生成一切"工作流示例**：

```
用户: "把这篇文章做成小红书图文 https://mp.weixin.qq.com/s/xxx"
  │
  ▼ Orchestrator Agent
  │
  ├─ Step 1: 内容解析 Agent
  │   └─ Tool: extract_url → 获得文章全文
  │   └─ Tool: llm_text → 提取主题/关键段落
  │
  ├─ Step 2: 视觉创作 Agent (并发)
  │   └─ Tool: generate_outline → 6-12页大纲
  │   └─ Tool: generate_images × N → N张图片
  │   └─ Review: 检查每张图质量，低质量自动重试
  │
  ├─ Step 3: 文案写作 Agent
  │   └─ Tool: generate_copy → 标题/正文/标签
  │
  ├─ Step 4: 质量审查
  │   └─ Orchestrator 汇总所有输出
  │   └─ 检查图文一致性/尺寸/风格
  │   └─ 必要时触发后处理 Agent 修复
  │
  └─ 输出: 完整图片集 + 配套文案 + 标签
```

### Phase 4：前端 Agent 对话界面 (1 周)

**将 AppView 升级为对话式 Agent 界面**：

```
┌─────────────────────────────────────────────────┐
│  OctoPoster Agent Studio                         │
├─────────────────────────────────────────────────┤
│ 🐙 你好！我是 OctoPoster 智能助手。              │
│    告诉我你想创作什么，我会自动完成全流程。        │
│                                                   │
│ 👤 帮我把这篇文章做成小红书图文                    │
│    https://mp.weixin.qq.com/s/xxx                │
│                                                   │
│ 🐙 正在处理...                                   │
│    ├─ ✅ 已提取文章内容 (2,300字)                 │
│    ├─ ✅ 已生成 8 页大纲                          │
│    ├─ 🔄 正在渲染第 3/8 页...                     │
│    │   [================>        ] 37%            │
│    ├─ ⏳ 等待文案生成...                          │
│    └─ ⏳ 等待质量审查...                          │
│                                                   │
│ ┌───────────────────────────────────────────────┐│
│ │ 在这里输入你的创作需求...            🚀 发送  ││
│ └───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## 四、与竞品的技术差异化分析

| 维度 | PagePop/DesignKit | OctoPoster Agent 版 |
|------|-------------------|---------------------|
| **Agent 架构** | 封闭式内部管线 | 开放式 MCP + A2A 标准协议 |
| **可扩展性** | 新能力需厂商开发 | 任何人可编写新 MCP Tool |
| **模型绑定** | 绑定单一供应商 | 多 Provider 热切换 |
| **部署方式** | 仅 SaaS 云服务 | 可私有化、纯本地运行 |
| **工具调用** | 私有 API | MCP 标准 (可桥接任何工具) |
| **Agent 间通信** | 私有协议 | A2A 标准 (可与第三方 Agent 互联) |
| **自定义工作流** | 不支持 | 用户可自编排 Agent 步骤 |

### 核心技术先进性

1. **MCP 标准化**：OctoPoster 将是国内首批采用 MCP 标准的 AI 创作平台，工具层可与整个 MCP 生态互联
2. **A2A 兼容**：Agent Card 机制让 OctoPoster 的能力可被外部 Agent 发现和调用
3. **Go 原生 Agent**：避免 Python 技术栈的部署复杂度，保持单二进制分发优势
4. **SSE 天然兼容**：现有 SSE 管线无需改造即可支持 A2A 的流式通信

---

## 五、结论与建议

### 立即可做
1. **定义 Agent 接口层** — 在 `internal/agent/` 下创建 Orchestrator + 4 个专家 Agent
2. **包装现有 Service 为 MCP Tool** — 零破坏性改造，渐进式引入
3. **前端添加对话式入口** — 在 AppView 中增加自然语言输入框

### 中期目标
4. **实现"一句话生成一切"** — 端到端 Agent 工作流
5. **添加质量审查循环** — Agent 自动评估输出质量并重试
6. **MCP Server 化** — 让 OctoPoster 本身成为一个 MCP Server，可被其他 AI 应用调用

### 长期愿景
7. **Agent 市场** — 支持第三方开发者贡献专家 Agent (SEO Agent、品牌 Agent、翻译 Agent)
8. **A2A 互联** — OctoPoster Agent 可与外部 Agent 生态互操作
9. **Computer Use 集成** — Agent 自动操控 Figma/PS 等设计软件完成高级编辑
