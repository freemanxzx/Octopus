# OctoPoster 智能体技术深度调研与落地架构方案 (v5)

> 深度调研基准：2026-04-18 | 覆盖 2025-2026 全球主流 Agent 技术生态
>
> 前提：采用 API 调用方式接入大模型，不自建推理集群
>
> 核心原则：**Workflow-First (工作流优先)**，以速度和稳定性为第一目标

---

## 一、2026 全球 Agent 技术生态全景 (8 大平台/框架)

### 1.1 总览对比矩阵

| 框架 | 厂商 | 开源 | 语言 | 核心特点 | 沙箱 | 适用场景 |
|------|------|:----:|:----:|----------|:----:|----------|
| **Claude Agent SDK** | Anthropic | ✅ | Python | Tool Use + 结构化输出 + 原生安全 | ✅ 内建 | Workflow 安全调用 API |
| **OpenAI Agents SDK** | OpenAI | ✅ | Python | Handoffs + Guardrails + Tracing | ✅ 原生沙箱 | 多 Agent 委派协作 |
| **Dify** | LangGenius | ✅ | Python | 可视化编排 + RAG + AgentOps | ✅ DifySandbox | 企业低代码 Agent 平台 |
| **Coze (扣子)** | 字节跳动 | ✅ | Go | Skills 市场 + 长期规划 + Eino 运行时 | ✅ 容器化 | 全平台 Agent 开发 |
| **LangGraph** | LangChain | ✅ | Python | 图状态机 + Checkpoint + HITL | ❌ 需外部 | 精细控制的复杂工作流 |
| **CrewAI** | CrewAI | ✅ | Python | 角色分工 + 任务委派 | ❌ 需外部 | 快速多 Agent 原型 |
| **OpenClaw + Pi** | 社区/基金会 | ✅ MIT | TS/Rust | 极简核心 + 自扩展技能 + Double Loop | ⚠️ 进程级 | 本地个人智能体 |
| **Hermes Agent** | Nous Research | ✅ | Python | GOAP推理 + 自我学习 + 40+工具 + MCP | ⚠️ 进程级 | 自进化持久型 Agent |

---

## 二、各技术详细分析

### 2.1 Claude Agent SDK (Anthropic)

Anthropic 的 Agent SDK 对 OctoPoster 最有价值的是其 **Tool Use 体系和安全设计哲学**：

```
┌─────────────────────────────────────────────────────────┐
│  OctoPoster 采纳的 Claude 能力                           │
│                                                           │
│  ✅ Tool Use (函数调用)                                  │
│  · 结构化 Function Calling                               │
│  · JSON Schema 约束输入输出 (保证稳定性)                │
│  · 并行工具调用 (加速多步骤执行)                        │
│  · 强制工具选择 (确保 Workflow 按预设路径执行)           │
│                                                           │
│  ✅ Constitutional AI (安全)                              │
│  · 模型层面内置拒绝危险操作的"宪法"                     │
│  · 输出内容合规审查                                      │
│                                                           │
│  ✅ MCP 原生支持                                         │
│  · Anthropic 自己制定的工具连接协议                      │
│  · 标准化 Agent ↔ 工具的调用接口                        │
│                                                           │
│  ❌ Computer Use (不适用于 OctoPoster)                   │
│  · 我们通过 API 调用生成图片，不需要操控桌面软件        │
│  · 速度慢 (截屏→推理→点击循环)，不满足快速出图需求     │
└─────────────────────────────────────────────────────────┘
```

**适用于 OctoPoster 的场景**：
- Tool Use 结构化调用确保 Workflow 每步输出可预测
- JSON Schema 输出约束保证大纲/文案格式一致性
- 安全哲学参考，防止内容合规问题

---

### 2.2 OpenAI Agents SDK

OpenAI 从实验性 Swarm 进化到**生产级 Agents SDK**：

```
     ┌─────────────────────────────────────────┐
     │          OpenAI Agents SDK                │
     ├────────┬──────────┬──────────┬───────────┤
     │ Agents │ Handoffs │Guardrails│  Tracing  │
     │        │          │          │           │
     │ 定义   │ Agent间  │ 输入输出 │ 全链路    │
     │ 指令+  │ 实时委派 │ 实时校验 │ 可观测    │
     │ 工具集 │ 上下文   │ + 拦截   │ + 调试    │
     │        │ 无缝传递 │          │           │
     └────────┴──────────┴──────────┴───────────┘
```

**四大核心原语**：

| 原语 | 功能 | 生产价值 |
|------|------|----------|
| **Agent** | 定义角色 + 指令 + 工具集 | 模块化专家 |
| **Handoff** | Agent 间实时委派 + 上下文传递 | 多 Agent 协作无缝衔接 |
| **Guardrail** | 输入/输出实时校验，异常拦截 | 防护栏 (防注入/越界) |
| **Tracing** | 全链路追踪 (LLM调用/工具/Handoff) | 调试+审计 |

**2026 年新增能力**：
- **原生沙箱 (Native Sandboxing)**：2026 年 4 月新增，Agent 代码执行环境隔离
- **Responses API**：替代旧 Assistants API，更适合 Agent 场景
- **持久化**：需配合 Dapr/Diagrid 等外部框架实现断点续跑

**适用于 OctoPoster 的场景**：
- 多 Agent Handoff 编排 (解析Agent → 创作Agent → 文案Agent)
- Guardrails 保护关键操作

---

### 2.3 OpenClaw + Pi-mono

OpenClaw（前身 Clawdbot）是 2025 年末爆火的开源个人 Agent 框架，**Pi-mono 是其核心引擎**：

```
┌──────────────────────────────────────────────────────┐
│                    OpenClaw                            │
│  "Always-on Personal AI Agent Daemon"                 │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  Pi-mono Agent Core                             │   │
│  │  · 极简核心: 仅 4-5 个基础工具                  │   │
│  │    (Read / Write / Edit / Bash / WebSearch)     │   │
│  │  · Double Loop 运行时:                          │   │
│  │    Inner Loop: 单轮推理 + 工具执行              │   │
│  │    Outer Loop: 多轮跟进 + 方向修正              │   │
│  │  · 自扩展: Agent 自己编写新 Skills              │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  Gateway 层                                     │   │
│  │  · 消息渠道: WhatsApp/Telegram/Discord/Slack   │   │
│  │  · 文件系统: 本地文件读写                       │   │
│  │  · Shell: 终端命令执行                          │   │
│  │  · Web: 浏览器自动化                            │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  pi-ai: 统一 LLM 抽象层                        │   │
│  │  · 支持 OpenAI / Anthropic / Gemini / 本地模型  │   │
│  │  · SSE 流式响应                                 │   │
│  │  · Structured Output                            │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Pi-mono 核心架构**：

| 包名 | 功能 |
|------|------|
| `pi-ai` | 统一多 Provider LLM API 抽象 |
| `pi-agent-core` | Agent 运行时 + Double Loop 编排 |
| `pi-coding-agent` | 交互式编码 Agent CLI |
| `pi-mom` | Slack 机器人/自主 Agent 实例 |
| `pi-tui` | 终端 UI 差分渲染库 |
| `pi-web-ui` | Web 聊天界面组件 |
| `pi-pods` | vLLM 部署管理 CLI |

**核心设计理念**：
- **极简主义**：核心只提供 Read/Write/Edit/Bash 4 个工具
- **自扩展**：Agent 自己编写新 Skills (存为 `.agents/skills/xxx.md`)
- **Rust 重写**：高性能 `pi-agent-rs` 用 Tokio/Axum 异步栈

**安全考量**：
- OpenClaw 授予 Agent 本地文件 + Shell 权限，**安全风险较高**
- 企业版需额外加固 (审计日志 + 权限白名单 + 沙箱)

**适用于 OctoPoster 的场景**：
- `pi-ai` 的统一 LLM 抽象层可参考用于我们的多 Provider 路由
- Skills 自扩展理念可借鉴 (Agent 自动学习新的创作模式)

---

### 2.4 Hermes Agent (Nous Research)

Hermes Agent 是 2026 年最受关注的**自进化智能体框架**：

```
┌──────────────────────────────────────────────────────┐
│              Hermes Agent Framework                    │
│  "Learn Once, Execute Forever"                        │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  自进化闭环 (GOAP)                            │     │
│  │                                                │     │
│  │  Observe → Plan → Act → Reflect → Learn       │     │
│  │     │                                  │       │     │
│  │     │    ┌──────────────────────────┐   │       │     │
│  │     └───▶│  Persistent Skill Memory │◀──┘       │     │
│  │          │  · 成功模式记忆           │           │     │
│  │          │  · 失败原因记忆           │           │     │
│  │          │  · 工具偏好记忆           │           │     │
│  │          └──────────────────────────┘           │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  内建工具集 (40+)                              │     │
│  │  · 文件操作    · 终端命令    · Web 搜索        │     │
│  │  · 代码分析    · 数据处理    · API 调用        │     │
│  │  · MCP 协议桥接 (扩展任意生态工具)             │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  多级持久化记忆                                │     │
│  │  · 短期: 会话上下文                            │     │
│  │  · 长期: 用户偏好 + 任务历史 (向量数据库)      │     │
│  │  · 元认知: 自我能力评估 + 策略调优             │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

**核心差异化**：
- **自我学习**：成功执行的工具调用模式被蒸馏为持久化 Skill
- **GOAP (Goal Oriented Action Planning)**：目标导向规划，不同于简单 ReAct
- **元认知**：Agent 评估自身能力边界，知道"什么做不了"
- **MCP 原生支持**：可直接桥接 MCP 生态的所有工具

**适用于 OctoPoster 的场景**：
- "用得越多越聪明"——学习用户的创作偏好和风格
- GOAP 规划适合"一句话生成一切"的复杂目标分解

---

### 2.5 Dify / Coze / LangGraph / CrewAI (前版已详述)

| 框架 | 核心能力一句话 |
|------|---------------|
| **Dify** | 开源可视化 Agent 平台，内建 RAG + 沙箱 + AgentOps，Docker 自部署 |
| **Coze** | 字节跳动 Go 后端 Agent 平台，Skills 市场 + Vibe Coding + Eino 运行时 |
| **LangGraph** | 最精细的图状态机编排，Postgres 检查点，原生反思循环 |
| **CrewAI** | 最快的多 Agent 角色委派原型框架 |

---

## 三、沙箱生态全面对比

### 3.1 各框架沙箱能力矩阵

| 框架 | 内建沙箱 | 沙箱类型 | 隔离级别 | 需外部补充 |
|------|:--------:|----------|:--------:|:----------:|
| **Claude SDK** | ✅ | Docker/VM (官方推荐) | ★★★★ | 否 |
| **OpenAI Agents SDK** | ✅ | 原生 Sandbox (2026.4) | ★★★★ | 否 |
| **Dify** | ✅ | DifySandbox (seccomp) | ★★★ | 否 |
| **Coze** | ✅ | 容器化 Worker | ★★★ | 否 |
| **LangGraph** | ❌ | — | — | 需 E2B / Docker |
| **CrewAI** | ❌ | — | — | 需 E2B / Docker |
| **OpenClaw/Pi** | ⚠️ | 进程级 | ★★ | 企业版需加固 |
| **Hermes Agent** | ⚠️ | 进程级 | ★★ | 生产需 Docker |

### 3.2 外部沙箱选型

当框架本身不提供沙箱时，需搭配外部沙箱平台：

| 平台 | 隔离技术 | 冷启动 | 适用场景 | 开源 |
|------|----------|:------:|----------|:----:|
| **E2B** | Firecracker MicroVM | ~150ms | 不可信代码/一次性任务 | ✅ |
| **Daytona** | Docker 容器 | ~90ms | 持久化开发环境 | ✅ |
| **Modal** | gVisor 容器 | ~100ms | 批量 GPU 计算 | ❌ |
| **Cloudflare Workers** | V8 Isolate | ~5ms | 轻量级边缘计算 | ❌ |

### 3.3 OctoPoster 沙箱需求决策

```
问题: OctoPoster 的 Agent 需要什么级别的沙箱？

分析:
├── 当前阶段 (单用户/小团队)
│   ├── LLM 调用: 纯 API，无需沙箱
│   ├── Agent 工具: 受控，只调用自有服务，防护栏够用
│   ├── Chromedp: 进程级隔离 + 超时
│   └─── 结论: 采用 Dify 内建沙箱即可 ✅
│
├── 扩展阶段 (多用户 SaaS)
│   ├── 多租户数据隔离: 需要容器化
│   ├── 并发 Chromedp: 需要 Docker Worker 池
│   └─── 结论: Docker 容器化 ✅
│
└── 开放阶段 (插件市场/用户自定义代码)
    ├── 执行不可信第三方代码: 必须硬件级隔离
    └─── 结论: E2B Firecracker MicroVM ✅
```

---

## 四、推荐落地方案

### 4.1 技术选型决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| **Agent 平台底座** | **Dify** (Docker 自部署) | 开源、可视化编排、内建 RAG/沙箱/AgentOps |
| **复杂编排** | **LangGraph** (Python 微服务) | 反思循环、图状态机、Postgres 检查点 |
| **多 Agent 委派** | 参考 **OpenAI Agents SDK** 的 Handoff 模式 | 在 Dify/LangGraph 中实现 Agent 间委派 |
| **自学习能力** | 参考 **Hermes Agent** 的 Skill Memory | 记忆成功的创作模式，越用越智能 |
| **LLM 抽象层** | 参考 **Pi-mono** 的 `pi-ai` 设计 | 统一多 Provider API 封装 |
| **沙箱** | **Dify 内建** + Docker Chromedp + 防护栏 | 分层防护 |
| **安全最佳实践** | 参考 **Claude SDK** 的安全哲学 | Human Confirmation + 工具白名单 |

### 4.2 各框架技术采纳策略

```
                    直接集成                参考借鉴
                    ────────              ──────────
Dify           ──── ✅ 作为 Agent 平台底座
LangGraph      ──── ✅ 复杂编排微服务

OpenAI SDK     ────────────────── ✅ Handoff/Guardrails 模式
Claude SDK     ────────────────── ✅ 安全哲学 + Tool Use 结构化输出
Hermes         ────────────────── ✅ 自学习 Skill Memory
Pi-mono        ────────────────── ✅ 极简工具集/LLM 抽象层
Coze           ────────────────── ✅ Skills 市场概念
OpenClaw       ────────────────── ✅ 本地化 Agent 守护进程模式
```

### 4.3 混合架构图

```
┌────────────────────────────────────────────────────────────────────┐
│                          用户层                                     │
│   Vue 3 Frontend (Agent Studio 对话界面 + 可视化进度)               │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────▼─────────────────────────────────────┐
│                   Go Backend (API Gateway)                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  现有业务层                                                  │   │
│  │  · 用户鉴权 · 积分系统 · 历史归档 · Chromedp 渲染池         │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │  Agent Router (智能路由)                                     │   │
│  │                                                               │   │
│  │  借鉴 OpenAI Handoff 模式:                                   │   │
│  │  · 简单任务 → Dify Workflow API                              │   │
│  │  · 复杂任务 → LangGraph Agent Service                       │   │
│  │  · 每次路由决策记录到 Tracing (借鉴 OpenAI Tracing)          │   │
│  │                                                               │   │
│  │  借鉴 Claude 安全哲学:                                       │   │
│  │  · 敏感操作前 Human Confirmation                             │   │
│  │  · 工具调用白名单 + JSON Schema 严格校验                    │   │
│  │  · Token 预算上限 / 费用上限                                 │   │
│  └──────────┬───────────────────────────────┬──────────────────┘   │
└─────────────┼───────────────────────────────┼──────────────────────┘
              │                               │
    ┌─────────▼──────────┐        ┌───────────▼───────────────┐
    │   Dify Platform     │        │  LangGraph Agent Service   │
    │   (Docker 自部署)    │        │  (Python FastAPI 微服务)    │
    │                      │        │                             │
    │  · Workflow 编排     │        │  · 图状态机编排             │
    │  · Agent ReAct       │        │  · 反思循环 (Reflection)    │
    │  · RAG 知识库        │        │  · Postgres 检查点          │
    │  · DifySandbox       │        │  · Multi-Agent SubGraph    │
    │  · Plugin 生态       │        │                             │
    │                      │        │  借鉴 Hermes 自学习:        │
    │  OctoPoster 工具     │        │  · Skill Memory 持久化      │
    │  (OpenAPI Plugin)    │        │  · 成功模式蒸馏             │
    │                      │        │  · GOAP 目标规划            │
    └──────────────────────┘        └─────────────────────────────┘
              │                               │
              └───────────┬───────────────────┘
                          │
    ┌─────────────────────▼──────────────────────────────────────┐
    │                   沙箱层                                    │
    │                                                              │
    │  Layer 1: Dify 内建沙箱 (seccomp + namespace)              │
    │  · Workflow 中 Code 节点的代码执行隔离                      │
    │                                                              │
    │  Layer 2: 防护栏 Guardrails (借鉴 OpenAI + Claude)          │
    │  · 工具白名单 · 参数校验 · Token 预算 · 超时 · 审计日志    │
    │                                                              │
    │  Layer 3: Chromedp Docker Worker 池                         │
    │  · 每渲染一个容器隔离 · 内存上限 1GB · 无外网              │
    │                                                              │
    │  Layer 4 (未来): E2B MicroVM (第三方插件执行)               │
    │  · Firecracker 硬件级隔离 · ~150ms 冷启 · 一次性环境       │
    └──────────────────────────────────────────────────────────────┘
```

---

## 五、从各框架中"偷师"的关键技术

### 5.1 从 OpenAI Agents SDK 偷师 — Guardrails + Tracing

```python
# 借鉴 OpenAI 的 Guardrail 模式，在 OctoPoster 中实现

# Guardrail: 输入合规检查
class ContentModerationGuardrail:
    """拦截违规内容，在 Agent 执行前生效"""
    async def check(self, input: str) -> GuardrailResult:
        # 调用内容审核 API
        if contains_sensitive(input):
            return GuardrailResult.BLOCK("内容违规")
        return GuardrailResult.PASS

# Guardrail: 工具调用预算
class BudgetGuardrail:
    """限制 Agent 单次执行的 Token/费用上限"""
    max_tokens: int = 50000
    max_cost_rmb: float = 5.0

# Tracing: 全链路追踪
class AgentTracer:
    """记录每个 Agent 步骤的完整信息"""
    def trace_llm_call(self, model, prompt, response, tokens, cost)
    def trace_tool_call(self, tool_name, input, output, duration)
    def trace_handoff(self, from_agent, to_agent, context)
```

### 5.2 从 Hermes Agent 偷师 — Skill Memory 自学习

```python
# 借鉴 Hermes 的自我学习机制

class SkillMemory:
    """Agent 越用越聪明的核心"""
    
    def record_success(self, task_type, steps, quality_score):
        """记录成功完成的任务模式"""
        pattern = {
            "task_type": task_type,     # "护肤笔记" / "产品测评" / ...
            "steps": steps,              # 实际执行的步骤序列
            "quality_score": quality_score,
            "provider_used": "gemini-flash",
            "style": "photography",
            "times_used": 1
        }
        self.db.upsert(pattern)
    
    def suggest_approach(self, new_task):
        """基于历史成功模式推荐最佳方案"""
        similar = self.db.similarity_search(new_task)
        return similar[0] if similar else None
```

### 5.3 从 Pi-mono 偷师 — 极简工具集 + Double Loop

```
Pi 的设计哲学: "Agent 只需 4 个基础工具就能完成所有事"

OctoPoster 类比:
┌─────────────────────────────────────────────────┐
│  基础工具集 (必需)                                │
│  · generate_outline  — 大纲推理                  │
│  · generate_images   — 图片生成                  │
│  · generate_copy     — 文案写作                  │
│  · render_template   — 模板渲染                  │
├─────────────────────────────────────────────────┤
│  扩展工具集 (Agent 可按需调用)                    │
│  · extract_url       — URL 提取                 │
│  · remove_text       — 去文字                   │
│  · remove_bg         — 去背景                   │
│  · replace_bg        — 换背景                   │
│  · ... 未来更多                                  │
├─────────────────────────────────────────────────┤
│  Double Loop 借鉴:                               │
│  Inner Loop: 单步执行 (调一个工具 + 验证结果)     │
│  Outer Loop: 整体审视 (质量达标？需要修正？)      │
└─────────────────────────────────────────────────┘
```

### 5.4 Workflow 执行速度优化策略

用户核心诉求是**快速、稳定**获得图片/文档。以下策略确保 Workflow 尽可能快：

```
速度优化分层:
┌──────────────────────────────────────────────────────┐
│ Layer 1: LLM 调用优化                                 │
│ · 选最快模型 (Gemini Flash 优先，毫秒级响应)          │
│ · Structured Output 避免二次解析 (JSON Schema 直出)   │
│ · 语义缓存 — 相似请求命中缓存，跳过 LLM 调用          │
│ · 并行调用 — 大纲+文案同步生成 (互不依赖)             │
├──────────────────────────────────────────────────────┤
│ Layer 2: 渲染优化                                     │
│ · Chromedp 连接池 — 复用 browser 实例，免冷启动       │
│ · N 页并发渲染 — goroutine 池化执行                   │
│ · HTTP-first 抓取 — 仅 JS 重页才用 Chromedp           │
├──────────────────────────────────────────────────────┤
│ Layer 3: 架构优化                                     │
│ · SSE 流式推送 — 每完成一页立即推给前端显示            │
│ · 异步任务队列 — 高峰时排队不阻塞                     │
│ · CDN 图片分发 — 生成后直接上 CDN                     │
└──────────────────────────────────────────────────────┘

理想耗时基线 (8 页小红书图文):
┌───────────────┬──────────┬──────────┐
│ 步骤          │ 当前耗时  │ 优化目标  │
├───────────────┼──────────┼──────────┤
│ 大纲生成      │ 2-3s     │ 1-2s     │
│ 图片渲染 ×8  │ 15-20s   │ 5-8s     │
│ 文案生成      │ 2-3s     │ 1-2s     │
│ 质量检查      │ —        │ 1s       │
├───────────────┼──────────┼──────────┤
│ 总计          │ ~25s     │ ~10s     │
└───────────────┴──────────┴──────────┘
```

---

## 六、硬件资源需求 (含 Dify 全套)

| 规模 | 配置 | GPU | 月费 |
|------|------|:---:|:----:|
| 个人 (1-5人) | 4核 / **16GB** / 100GB SSD | ❌ | ~¥100 |
| 团队 (10-50人) | 8核 / **32GB** / 200GB SSD | ❌ | ~¥500-800 |
| 商业 (100+人) | K8s 3×(8核/32GB) | ❌ | ~¥3000+ |

> **重点**：API 模式不需要 GPU。内存瓶颈在 Dify (2-4GB) 和 Chromedp (~500MB/实例)。

---

## 七、实施路线图

| 阶段 | 时间 | 内容 | 参考框架 |
|:----:|:----:|------|----------|
| **P0** | 1周 | Dify Docker 部署 + OctoPoster 注册为 Plugin | Dify |
| **P1** | 2周 | 核心 Workflow (全流程/修图/文案) + RAG 知识库 | Dify + Hermes |
| **P2** | 2周 | LangGraph 反思循环 + Skill Memory 自学习 | LangGraph + Hermes |
| **P3** | 1周 | 前端 Agent Studio + Guardrails + Tracing | OpenAI SDK + Claude |
| **P4** | 2周 | Docker 化 Chromedp 池 + AgentOps 监控 | Dify + E2B |

---

## 八、总结

本方案**不造轮子**，而是站在巨人肩上，从 8 大成熟框架中各取所长:

| 借鉴来源 | 采用的能力 |
|----------|-----------|
| **Dify** | Agent 平台底座 (直接集成) |
| **LangGraph** | 复杂编排引擎 (直接集成) |
| **OpenAI Agents SDK** | Handoff 多 Agent 委派 + Guardrails 防护 + Tracing 追踪 |
| **Claude Agent SDK** | 安全哲学 + Tool Use 结构化输出 + JSON Schema 约束 |
| **Hermes Agent** | 自学习 Skill Memory + GOAP 目标规划 |
| **Pi-mono (OpenClaw)** | 极简工具集设计 + Double Loop 运行时 |
| **Coze** | Skills 市场理念 + Go 后端参考 |
| **CrewAI** | 角色分工模式参考 |
