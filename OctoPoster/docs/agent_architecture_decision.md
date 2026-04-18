# OctoPoster Agent 最终架构决策

> 2026-04-18 最终定案
>
> 核心原则：采用**成熟先进**的 Agent 框架，避免后续反复重构

---

## 一、为什么不用 Go 原生实现，也不一定要 Dify

| 方案 | 问题 |
|------|------|
| Go 原生 if/else 编排 | Agent 技术迭代飞快，手写编排无法跟上，后续必须重构 |
| Dify 全套平台 | 太重 (6 容器/16GB)，引入 Python 栈，当前阶段杀鸡用牛刀 |
| 纯 LangGraph Python | 增加跨语言维护成本，Go 后端调 Python 微服务增加链路复杂度 |

**真正需要的是**：一个 **Go 原生的、成熟的 Agent 框架**，既能做 Workflow，又能做 Agent，还能跟上 MCP/A2A 等标准演进。

---

## 二、最终推荐：Eino (字节跳动 CloudWeGo)

### 2.1 Eino 是什么

**Eino** (`github.com/cloudwego/eino`) 是字节跳动从 Coze 生产环境中提取并开源的 **Go 原生 AI Agent 框架**。

```
Eino = Go 版 LangGraph + LangChain 的合体
     = Coze 的核心引擎，经过亿级用户验证
     = 完美适配 OctoPoster 的 Go 技术栈
```

### 2.2 为什么选 Eino

| 维度 | Eino | LangGraph | Dify | Go 原生 |
|------|:----:|:---------:|:----:|:-------:|
| **语言** | ✅ Go | ❌ Python | ❌ Python | ✅ Go |
| **零新依赖** | ✅ go get 即用 | ❌ 需 Python 容器 | ❌ 需 6 容器 | ✅ |
| **Workflow 模式** | ✅ Chain/Graph/Workflow | ✅ | ✅ | ⚠️ 需自建 |
| **Agent 模式** | ✅ ReAct Agent 内建 | ✅ | ✅ | ❌ 无 |
| **流式处理** | ✅ 自动 Stream 管理 | ✅ | ✅ | ⚠️ 需手写 |
| **类型安全** | ✅ 编译时检查 | ❌ 运行时 | ❌ | ✅ |
| **MCP 支持** | ✅ | ✅ | ✅ | ❌ 需自建 |
| **可观测性** | ✅ Tracing/Metrics | ✅ LangSmith | ✅ 内建 | ❌ 需自建 |
| **HITL 人工介入** | ✅ Interrupt/Resume | ✅ | ✅ | ❌ 需自建 |
| **生产验证** | ✅ 字节跳动 Coze 亿级用户 | ✅ | ✅ | ❌ |

### 2.3 Eino 核心能力

```
┌────────────────────────────────────────────────────────────────┐
│                    Eino Framework                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  组件层 (可替换/可扩展)                                  │    │
│  │  · ChatModel  — OpenAI/Claude/Gemini/Ark/Ollama         │    │
│  │  · Tool       — 函数调用 (MCP 兼容)                     │    │
│  │  · Retriever  — 向量检索 (RAG)                          │    │
│  │  · Embedding  — 文本向量化                               │    │
│  │  · Document   — 文档加载/解析                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  编排层 (三种模式)                                       │    │
│  │                                                           │    │
│  │  Chain     — 顺序执行 (A → B → C)     ← 大纲/文案生成   │    │
│  │  Graph     — 图编排 (含循环/分支)       ← 质量审查循环   │    │
│  │  Workflow   — DAG + 字段映射            ← 并行图片生成   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Agent 层                                                │    │
│  │                                                           │    │
│  │  ChatModelAgent (ReAct)                                  │    │
│  │  · 自动推理循环 (Reason → Act → Observe)                 │    │
│  │  · 工具自主选择                                           │    │
│  │  · Interrupt/Resume (人工介入)                            │    │
│  │  · Multi-Agent 编排                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  DevOps 层                                               │    │
│  │  · Tracing (全链路追踪)                                   │    │
│  │  · Metrics (性能监控)                                     │    │
│  │  · Evaluation (质量评估)                                  │    │
│  │  · Visual Debugger (可视化调试)                           │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

### 2.4 自动流式处理 — Eino 的杀手级特性

OctoPoster 的核心体验是 **SSE 流式推送进度**。Eino 原生支持：

```go
// Eino 自动处理 Stream 转换：
// 非流式组件和流式组件可以自由衔接
// 框架自动做 Stream 拼接/拆分/复制

graph.AddNode("outline", outlineGenerator)     // 输出: 文本
graph.AddNode("render", imageRenderer)          // 输出: Stream<Image>
graph.AddNode("review", qualityReviewer)        // 输入: Image, 输出: Score

// Eino 自动处理:
// · 非流式 → 流式 (boxing)
// · 多流合并 (merging)
// · 流复制给多个下游 (copying)
```

---

## 三、OctoPoster + Eino 集成架构

```
┌────────────────────────────────────────────────────────────────┐
│                      用户层                                      │
│  Vue 3 Frontend (创作界面 + SSE 实时进度)                        │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼─────────────────────────────────────┐
│                OctoPoster Go Backend                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  现有业务层 (handler / service / middleware)              │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                          │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │                                                           │   │
│  │  意图路由器 (Eino Routing)                                │   │
│  │                                                           │   │
│  │  用户输入明确 ──→ Eino Workflow/Chain (确定性)            │   │
│  │  用户输入模糊 ──→ Eino ReAct Agent (灵活性)              │   │
│  │                                                           │   │
│  └──────┬───────────────────────────────────┬───────────────┘   │
│         │                                   │                    │
│  ┌──────▼───────────┐           ┌───────────▼──────────────┐   │
│  │  Eino Workflows   │           │  Eino ReAct Agent        │   │
│  │                    │           │                           │   │
│  │  Chain: 大纲生成   │           │  tools = [                │   │
│  │  Chain: 文案生成   │           │    run_outline_chain,     │   │
│  │  Workflow: 并行渲染│           │    run_image_workflow,    │   │
│  │  Graph: 质量循环   │           │    run_copy_chain,        │   │
│  │  Chain: 修图路由   │           │    run_retouch_chain,     │   │
│  │                    │           │    search_knowledge,      │   │
│  │                    │           │    ask_user,              │   │
│  │                    │           │  ]                        │   │
│  │                    │           │                           │   │
│  │   快速 (3-10秒)    │           │  Agent 引用 Workflow      │   │
│  │   可预测/稳定      │           │  作为工具 ← 关键设计!     │   │
│  └────────────────────┘           └──────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Eino Tool 注册 (MCP 兼容)                                │   │
│  │                                                            │   │
│  │  · generate_outline  → 对接现有 service.GenerateOutline   │   │
│  │  · generate_images   → 对接现有 service.GenerateImages    │   │
│  │  · generate_copy     → 对接现有 service.GenerateCopy      │   │
│  │  · render_template   → 对接现有 Chromedp 渲染             │   │
│  │  · remove_text       → 对接现有 service.RemoveText        │   │
│  │  · remove_bg         → 对接现有 service.RemoveBG          │   │
│  │  · replace_bg        → 对接现有 service.ReplaceBG         │   │
│  │  · extract_url       → 对接现有 service.ExtractURL        │   │
│  │                                                            │   │
│  │  全部注册为 MCP 标准工具 → 框架可换，工具不用重写          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Eino DevOps                                              │   │
│  │  · Tracing: 每步调用追踪 (LLM/Tool/Agent)                │   │
│  │  · Metrics: Token 消耗 / 延迟 / 成功率                    │   │
│  │  · Guardrails: Token 预算 / 超时 / 费用上限               │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 四、核心代码示例

### 4.1 Workflow 模式 — 大纲生成 (Chain)

```go
import (
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/model"
)

func buildOutlineChain() *compose.Chain {
    chain := compose.NewChain()

    // Step 1: 构建 Prompt
    chain.AppendChatTemplate(outlinePromptTemplate)

    // Step 2: 调用 LLM (Structured Output)
    chain.AppendChatModel(geminiFlash, &model.Config{
        ResponseFormat: jsonSchemaOutline, // JSON Schema 约束输出
    })

    // Step 3: 解析并校验
    chain.AppendLambda(validateOutline)

    return chain
}

// 使用:
outline, err := outlineChain.Invoke(ctx, map[string]any{
    "topic": "护肤品测评",
    "platform": "xiaohongshu",
})
```

### 4.2 Workflow 模式 — 并行图片生成 (Workflow)

```go
func buildImageWorkflow() *compose.Workflow {
    wf := compose.NewWorkflow()

    // 每页并行生成 (Eino 自动管理并发)
    for i, page := range outline.Pages {
        wf.AddNode(fmt.Sprintf("page_%d", i), renderPageNode)
    }

    // 所有页完成后 → 质量审查
    wf.AddNode("review", qualityReviewNode)
    wf.AddEdge("page_*", "review") // 自动扇入

    return wf
}
```

### 4.3 Agent 模式 — 对话式创作 (ReAct)

```go
import "github.com/cloudwego/eino/flow/agent"

func buildCreativeAgent() *agent.ChatModelAgent {
    return agent.NewChatModelAgent(geminiFlash, &agent.Config{
        SystemPrompt: "你是 OctoPoster 创作助手...",
        Tools: []tool.Tool{
            // Agent 可以调用已定义的 Workflow 作为工具!
            outlineChainTool,    // 大纲生成 Chain
            imageWorkflowTool,   // 图片并行 Workflow
            copyChainTool,       // 文案生成 Chain
            retouchChainTool,    // 修图 Chain
            knowledgeRetriever,  // RAG 检索
            askUserTool,         // 中断询问用户
        },
        MaxSteps: 10,            // 防止无限循环
    })
}

// 使用 (处理模糊需求):
stream, err := agent.Stream(ctx, []*schema.Message{
    {Role: "user", Content: "帮我做个护肤系列，要高级感"},
})
// Agent 自动推理:
// 1. 我需要先了解具体需求 → 调用 askUser
// 2. 用户说"8页，极简风" → 调用 outlineChain
// 3. 大纲OK → 调用 imageWorkflow
// 4. 图片OK → 调用 copyChain
// 5. 全部完成，输出给用户
```

### 4.4 质量审查循环 (Graph 含循环)

```go
func buildQualityGraph() *compose.Graph {
    g := compose.NewGraph()

    g.AddNode("generate", generateNode)
    g.AddNode("review", reviewNode)
    g.AddNode("fix", fixNode)

    g.AddEdge("generate", "review")

    // 条件分支: 审查通过 → 结束, 不通过 → 修正 → 再审查
    g.AddConditionalEdge("review", func(state State) string {
        if state.Score >= 80 || state.Retries >= 3 {
            return "end"
        }
        return "fix"
    }, map[string]string{
        "fix": "fix",
        "end": compose.END,
    })

    g.AddEdge("fix", "review") // 循环

    return g
}
```

---

## 五、MCP 标准化 — 未来不怕框架更换

**关键未来保障**：将所有 OctoPoster 工具注册为 MCP 标准

```go
// internal/mcp/server.go
// OctoPoster 暴露的 MCP Tools

mcpServer := mcp.NewServer("octoposter", "1.0.0")

mcpServer.RegisterTool("generate_outline", mcp.ToolDef{
    Description: "根据主题生成小红书图文大纲",
    InputSchema: outlineInputSchema,
    Handler:     service.GenerateOutline,
})

mcpServer.RegisterTool("generate_images", mcp.ToolDef{
    Description: "并发生成多张图片",
    InputSchema: imagesInputSchema,
    Handler:     service.GenerateImages,
})

// ... 注册所有工具
```

**好处**：
- 即使未来换框架 (Eino → LangChainGo → 下一代)，**工具层不用重写**
- OctoPoster 可作为 MCP Server 被外部 Agent (Claude/GPT) 直接调用
- 符合 2026 行业标准

---

## 六、与之前 8 大框架的关系

```
    直接集成                        参考借鉴
    ────────                       ────────
✅ Eino          ← Go 原生 Agent 框架 (主引擎)
✅ MCP           ← 工具标准化协议 (未来保障)

参考 LangGraph   ← Graph 编排 + 反思循环模式
参考 OpenAI SDK  ← Guardrails + Tracing 设计
参考 Claude SDK  ← 安全哲学 + Structured Output
参考 Hermes      ← Skill Memory 自学习 (未来)
参考 Pi-mono     ← 极简工具集理念
参考 Coze        ← Skills 市场 (Eino 本就源自 Coze)

备选 Dify        ← 未来需要 RAG/可视化编排/团队协作时引入
备选 LangGraph   ← 未来需要超复杂 Python 生态能力时引入
```

---

## 七、实施路线图

| 阶段 | 时间 | 内容 |
|:----:|:----:|------|
| **P0** | 1周 | `go get` Eino + 注册现有 Service 为 Eino Tool + 简单 Chain 测试 |
| **P1** | 2周 | 5 个核心 Workflow (Chain/Workflow/Graph) + SSE 流式 |
| **P2** | 1周 | ReAct Agent (对话式创作) + Workflow 作为 Agent 工具 |
| **P3** | 1周 | MCP Server 标准化 + Tracing/Metrics |
| **P4** | 2周 | 质量审查循环 (Graph) + Guardrails + 知识库 |
