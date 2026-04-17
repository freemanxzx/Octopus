# OctoPoster 智能体技术深度调研与落地架构方案

> 深度调研基准：2026-04-18 | 基于 2025-2026 业界最新进展
> 
> 前提：采用 API 调用方式接入大模型，不自建推理集群

---

## 一、2026 智能体核心技术全景

### 1.1 从 Prompt Engineering 到 Skill Engineering

2026 年，业界已从"写一段万能 Prompt"进化到**模块化技能工程 (Skill Engineering)**：

```
2024                              2026
─────                            ─────
"写一个1000字的Prompt"     →     Skills 目录化
 单体脆弱/难维护                  ├── SKILL.md (语义指令)
                                  ├── scripts/ (辅助脚本)
                                  └── resources/ (参考资源)
```

| 对比维度 | Prompt Engineering | Skill Engineering |
|----------|-------------------|-------------------|
| 复用性 | 每个场景重写 | 一次编写，跨 Agent 复用 |
| 可测试 | 无法单元测试 | 独立可测、可审计 |
| 扩展方式 | 堆砌更长 Prompt | 安装/卸载技能包 |
| 维护成本 | 极高 (Prompt 漂移) | 低 (版本化管理) |
| 发现机制 | 人工阅读 | 渐进式发现 (Progressive Discovery) |

### 1.2 三大标准协议栈

```
┌──────────────────────────────────────────────────────┐
│                    应用层                              │
├──────────────────────────────────────────────────────┤
│  A2A (Agent-to-Agent) — Google → Linux 基金会         │
│  · Agent Card 能力发现                                │
│  · 任务委派 + 异步长时操作                            │
│  · 基于 HTTP + JSON-RPC 2.0 + SSE                    │
├──────────────────────────────────────────────────────┤
│  MCP (Model Context Protocol) — Anthropic → 行业标准  │
│  · Agent ↔ 工具/数据 标准连接                         │
│  · 月下载量 1 亿+，OpenAI/Google/Microsoft 全面支持   │
│  · 工具渐进式发现 + Triggers + 原生流式返回           │
├──────────────────────────────────────────────────────┤
│  LLM 推理层 (Gemini / GPT / Claude API)              │
│  · 多模态 (文本+图片+视频)                            │
│  · Structured Output (JSON Schema 强约束)            │
│  · Function Calling / Tool Use                       │
└──────────────────────────────────────────────────────┘
```

### 1.3 Agent 核心控制循环 — OODA 模型

生产级 Agent 已不是线性流水线，而是**闭环控制循环**：

```
       ┌─────────────────────────────────────┐
       │                                     │
       ▼                                     │
 ┌──────────┐   ┌──────────┐   ┌──────────┐ │ ┌──────────┐
 │ Observe  │──▶│  Orient  │──▶│  Decide  │─┼▶│   Act    │
 │ (感知)   │   │ (推理)   │   │ (规划)   │ │ │ (执行)   │
 │          │   │          │   │          │ │ │          │
 │·读取环境 │   │·意图理解 │   │·选择工具 │ │ │·调用API  │
 │·用户输入 │   │·上下文   │   │·步骤排序 │ │ │·文件读写 │
 │·历史记忆 │   │·约束评估 │   │·回退策略 │ │ │·渲染图片 │
 └──────────┘   └──────────┘   └──────────┘ │ └────┬─────┘
       ▲                                     │      │
       │           ┌──────────┐              │      │
       │           │ Reflect  │◀─────────────┘      │
       │           │ (反思)   │                      │
       │           │          │                      │
       │           │·质量评估 │◀─────────────────────┘
       │           │·错误检测 │
       │           │·自我修正 │
       │           └────┬─────┘
       │                │
       │    ┌───────────▼───────────┐
       │    │ 质量达标？             │
       │    │  ├─ Yes → 返回结果    │
       │    │  └─ No  → 回到感知 ───┼──▶
       │    └───────────────────────┘
       └─────────────────────────────────
```

### 1.4 编排框架选型矩阵

| 框架 | 控制粒度 | 状态管理 | 人工介入 | 语言 | 适用场景 |
|------|:--------:|:--------:|:--------:|:----:|----------|
| **LangGraph** | ★★★★★ | 图状态机 + 检查点 | 原生 HITL | Python | 复杂有状态工作流 |
| **CrewAI** | ★★★☆☆ | 声明式 | 有限 | Python | 快速原型/角色分工 |
| **AutoGen** | ★★★★☆ | 会话式 | 灵活 | Python | 研究/多 Agent 辩论 |
| **Go 原生实现** | ★★★★★ | 自定义 | 完全自主 | Go | 高性能/单二进制 |

> **OctoPoster 选型结论**：因后端为 Go 技术栈，且需要单二进制分发，采用 **Go 原生状态机** 实现 Agent 编排，参考 LangGraph 的图状态机设计理念。

---

## 二、OctoPoster Agent 系统详细架构

### 2.1 五层架构总览

```
═══════════════════════════════════════════════════════════════
Layer 5: 用户交互层 (Vue 3 Frontend)
├── 对话式 Agent Studio  — 自然语言输入
├── 工作流可视化         — 实时步骤追踪
└── 人工介入节点         — 编辑/确认/驳回
═══════════════════════════════════════════════════════════════
Layer 4: Agent 编排层 (Go Orchestrator)
├── Orchestrator         — 意图路由 + 任务分解
├── Plan-and-Execute     — 多步骤规划器
├── Reflection Loop      — 质量自评 + 自修正
└── State Machine        — 检查点 + 断点续跑
═══════════════════════════════════════════════════════════════
Layer 3: 专家 Agent 层 (Go Agent Workers)
├── ContentParser Agent  — 内容解析
├── VisualCreator Agent  — 视觉创作
├── CopyWriter Agent     — 文案写作
├── PostProcessor Agent  — 图像后处理
└── QualityReviewer Agent— 质量审查 (NEW)
═══════════════════════════════════════════════════════════════
Layer 2: Skills + MCP 工具层
├── Skills Registry      — 技能注册表
├── MCP Tool Server      — 标准化工具接口
└── Tool Discovery       — 渐进式能力发现
═══════════════════════════════════════════════════════════════
Layer 1: 基础设施层
├── LLM API Gateway      — 多 Provider 路由/降级/限流
├── Chromedp Pool         — 无头浏览器池
├── File Storage          — 图片/文档存储
└── State Store           — SQLite 状态持久化
═══════════════════════════════════════════════════════════════
```

### 2.2 Skills 技能系统设计

Skills 是 Agent 能力的**最小可组合单元**，每个 Skill 封装一个领域专精：

```
skills/
├── content_extraction/
│   ├── SKILL.md            # 技能描述 + 调用指南
│   ├── scripts/
│   │   └── extract.go      # URL/文档提取实现
│   └── resources/
│       └── selectors.yaml  # 主流平台 CSS 选择器
│
├── outline_generation/
│   ├── SKILL.md
│   └── resources/
│       └── prompt_templates/
│           ├── xhs_outline.txt    # 小红书大纲 Prompt
│           ├── gzh_outline.txt    # 公众号大纲 Prompt
│           └── ecom_outline.txt   # 电商大纲 Prompt
│
├── visual_rendering/
│   ├── SKILL.md
│   ├── scripts/
│   │   ├── ai_render.go           # AI 原创出图
│   │   └── template_render.go     # Chromedp 模板渲染
│   └── resources/
│       └── style_guides/
│           ├── minimal.yaml       # 极简风格参数
│           ├── illustration.yaml  # 插画风格参数
│           └── photography.yaml   # 摄影风格参数
│
├── copywriting/
│   ├── SKILL.md
│   └── resources/
│       └── prompt_templates/
│           ├── viral_title.txt    # 爆款标题 Prompt
│           └── body_copy.txt      # 种草文案 Prompt
│
├── image_processing/
│   ├── SKILL.md
│   └── scripts/
│       ├── remove_text.go
│       ├── remove_bg.go
│       └── replace_bg.go
│
└── quality_review/
    ├── SKILL.md
    └── resources/
        └── review_criteria.yaml   # 质量评估标准
```

**SKILL.md 示例** (`outline_generation/SKILL.md`)：

```yaml
---
name: outline_generation
version: "1.0"
description: "将文本内容智能切分为 6-12 页小红书图文大纲"
requires_tools:
  - llm_text
  - llm_structured_output
input_schema:
  topic: string
  source_text: string (optional)
  platform: enum[xhs, gzh, ecom, moments]
output_schema:
  outline: string
  pages: array<Page>
---

# 大纲生成技能

## 执行流程
1. 如果提供了 source_text，先进行摘要提炼
2. 根据 platform 选择对应的 prompt_template
3. 调用 LLM 生成结构化大纲 (JSON Schema 约束输出)
4. 校验页数范围 [6, 12]，超出则自动裁剪/合并
5. 返回 Page 数组，每页包含 content、type、emoji

## 质量要求
- 封面页必须包含吸引力标题
- 每页内容不超过 200 字
- 总结页需包含行动号召 (CTA)
```

### 2.3 Quality Reviewer Agent (质量反思循环)

这是区别于竞品的**核心创新点**。竞品生成内容后直接输出，OctoPoster 增加自动质检环节：

```
视觉创作 Agent 输出 N 张图片
         │
         ▼
┌─────────────────────────────────┐
│   Quality Reviewer Agent         │
│                                   │
│   检查维度：                      │
│   ├── 1. 图文一致性 (主题匹配)   │
│   ├── 2. 视觉质量 (分辨率/清晰) │
│   ├── 3. 文字内容 (排版/错别字)  │
│   ├── 4. 风格统一性             │
│   └── 5. 合规审查 (敏感内容)     │
│                                   │
│   评分: 0-100                     │
│   ├── ≥ 80 → PASS (通过)         │
│   ├── 60-79 → 下发后处理指令     │
│   └── < 60 → 触发重新生成        │
└─────────────────┬───────────────┘
                  │
          ┌───────┼───────┐
          ▼       ▼       ▼
        PASS   ENHANCE  REGEN
         │       │       │
         │       ▼       ▼
         │   PostProcessor  VisualCreator
         │   (精修)          (重跑)
         │       │           │
         │       └─────┬─────┘
         │             ▼
         │      再次进入 Reviewer
         │        (最多3轮)
         ▼
       最终输出
```

### 2.4 LLM API Gateway 设计

API 模式下的关键组件——**智能路由/降级/限流网关**：

```go
// internal/llm/gateway.go

type LLMGateway struct {
    providers  []Provider      // 多个 API Provider
    strategy   LoadBalancer    // round-robin | priority | cost-optimal
    cache      SemanticCache   // 语义缓存 (减少重复调用)
    limiter    RateLimiter     // 每 Provider 独立限流
    fallback   FallbackChain   // 降级链
    metrics    MetricsCollector // 调用计量
}

// Provider 配置示例
providers:
  - name: gemini_primary
    model: gemini-2.5-flash
    base_url: https://generativelanguage.googleapis.com
    rpm_limit: 60       # 每分钟请求限制
    priority: 1
    capabilities: [text, vision, image_gen]
    
  - name: gemini_fallback
    model: gemini-2.0-flash
    base_url: https://generativelanguage.googleapis.com
    rpm_limit: 30
    priority: 2
    capabilities: [text, vision]
    
  - name: openai_backup
    model: gpt-4o
    base_url: https://api.openai.com/v1
    rpm_limit: 20
    priority: 3
    capabilities: [text, vision]
```

**关键能力**：

| 能力 | 说明 |
|------|------|
| **智能路由** | 根据任务类型 (text / vision / image_gen) 自动选择最廉价可用 Provider |
| **自动降级** | Primary 429 (限流) → 自动切 Fallback → 再切 Backup |
| **语义缓存** | 相似 Prompt 命中缓存直接返回，节省 30-50% API 费用 |
| **限流控制** | 每 Provider 独立 RPM/TPM 窗口，防止超额 |
| **调用计量** | 按 Provider / 模型 / Agent 维度记录 token 消耗和费用 |
| **重试策略** | 指数退避 + 抖动 (Exponential Backoff with Jitter) |

---

## 三、沙箱与隔离技术分析

### 3.1 OctoPoster 是否需要沙箱？

| 场景 | 是否需要沙箱 | 理由 |
|------|:------------:|------|
| LLM API 调用 | ❌ | 纯 HTTP 请求，无安全风险 |
| Chromedp 模板渲染 | ⚠️ 建议隔离 | 渲染外部 HTML 可能含恶意脚本 |
| Agent 执行任意代码 | ✅ 必须隔离 | 未来支持用户自定义脚本 |
| 图片文件处理 | ❌ | 二进制处理，无执行风险 |

### 3.2 推荐方案：轻量级进程隔离 (当前阶段)

OctoPoster 暂不需要 E2B/Daytona 等重型沙箱。推荐分阶段实施：

**阶段一 (当前)：Chromedp 进程级隔离**
```go
// Chromedp 安全配置
chromedp.Flag("--no-sandbox", true)
chromedp.Flag("--disable-gpu", true)
chromedp.Flag("--disable-dev-shm-usage", true)
chromedp.Flag("--disable-web-security", false)  // 保持安全策略
chromedp.Flag("--disable-extensions", true)

// 超时 + 资源限制
ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
```

**阶段二 (扩展时)：Docker 容器化**
```yaml
# docker-compose.yml — Chromedp Worker 池
services:
  chromedp-worker:
    image: chromedp/headless-shell:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:size=256M
    networks:
      - internal
    # 无外网访问
```

**阶段三 (企业级)：MicroVM 隔离**
- 当支持用户自定义脚本/插件时，采用 E2B Firecracker 微虚拟机
- 每个用户会话一个隔离 VM，~150ms 冷启动

### 3.3 技术对比

| 方案 | 隔离级别 | 性能开销 | 适用阶段 |
|------|:--------:|:--------:|:--------:|
| 进程隔离 (当前) | ★★☆ | 极低 | MVP / 单用户 |
| Docker 容器 | ★★★ | 低 (~90ms) | 多用户 SaaS |
| MicroVM (E2B) | ★★★★★ | 中 (~150ms) | 企业级 / 插件生态 |

---

## 四、硬件资源分析 (API 模式)

### 4.1 架构前提

> ⚠️ **我们不自建推理集群**。所有 LLM 推理通过 API 调用完成 (Gemini / GPT / Claude)。
> 服务端仅承担：Agent 编排 + Chromedp 渲染 + 文件存储 + 状态管理。

### 4.2 资源消耗分析

| 组件 | 单实例资源 | 并发 10 用户 | 并发 100 用户 |
|------|-----------|:------------:|:-------------:|
| **Go 后端** (Agent 编排) | ~50MB RAM, <1% CPU | ~200MB | ~500MB |
| **Chromedp** (无头 Chrome) | **~500MB RAM/实例** | **5GB** | **需要容器池** |
| **SQLite** (状态存储) | ~10MB | ~50MB | 迁移至 PostgreSQL |
| **文件存储** (图片/Skill) | 根据内容量 | 10GB SSD | 100GB+ SSD |
| **网络带宽** (API 调用) | ~1Mbps | ~10Mbps | ~50Mbps |

### 4.3 推荐服务器配置

#### 开发/个人使用 (1-5 并发用户)

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| CPU | 4 核 | Go 协程 + 3 个 Chromedp 实例 |
| 内存 | **8GB** | Go (500MB) + Chromedp×3 (1.5GB) + 系统 |
| 存储 | 50GB SSD | 图片输出 + Skills + 状态数据 |
| 网络 | 10Mbps | API 调用 + 用户访问 |
| GPU | **不需要** | API 模式无本地推理 |
| 成本 | ~¥50/月 (云服务器) | 轻量应用服务器即可 |

#### 小团队 SaaS (10-50 并发用户)

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| CPU | 8 核 | Agent 编排 + Chromedp Worker 池 |
| 内存 | **16-32GB** | Chromedp 池 (5-10 实例) 是主消耗 |
| 存储 | 200GB SSD | 历史图片 + 模板库 |
| 网络 | 50Mbps | API 并发调用 |
| GPU | **不需要** | |
| 数据库 | PostgreSQL | 替代 SQLite 应对并发 |
| 成本 | ~¥200-500/月 | |

#### 规模化商业 (100+ 并发用户)

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| CPU | 16 核+ | 多节点负载均衡 |
| 内存 | **64GB+** | Chromedp 容器池 + Agent 状态 |
| 存储 | 1TB+ SSD + OSS | 图片上对象存储 (S3/OSS) |
| 架构 | Docker Swarm / K8s | Chromedp Worker 水平扩展 |
| 缓存 | Redis | 语义缓存 + 会话管理 |
| 成本 | ~¥2000+/月 | |

### 4.4 API 费用估算

| 操作 | 每次消耗 (Token) | 参考模型 | 单次费用 (估算) |
|------|:---------------:|----------|:---------------:|
| 大纲生成 | ~3,000 | Gemini Flash | ¥0.01 |
| 文案生成 | ~2,000 | Gemini Flash | ¥0.007 |
| 图片生成 (AI原创) | 多模态 | Gemini Image | ¥0.05-0.15/张 |
| 质量审查 | ~1,500 | Gemini Flash | ¥0.005 |
| 整套图文 (8张) | — | 综合 | **¥0.5-1.5** |

> **关键洞察**：API 模式下 **LLM 费用极低** (一套完整 8 页图文不到 2 元)。真正的成本瓶颈在 **Chromedp 内存** 和 **运维**，而非 AI 推理。

### 4.5 性能优化策略

| 策略 | 效果 | 实现难度 |
|------|------|:--------:|
| **语义缓存** — 相似请求命中缓存 | 节省 30-50% API 费用 | ★★☆ |
| **HTTP-first 抓取** — 仅 JS 重页用 Chromedp | 减少 30% 渲染服务器负载 | ★☆☆ |
| **Chromedp 连接池** — 复用 browser 实例 | 减少冷启动开销 | ★★☆ |
| **异步任务队列** — Go channel/Redis Queue | 削峰填谷，稳定响应 | ★★★ |
| **CDN 静态加速** — 图片上 CDN | 减少服务端带宽压力 | ★☆☆ |

---

## 五、Agent 编排核心代码架构

### 5.1 Go 状态机实现

```go
// internal/agent/types.go

type TaskPhase string
const (
    PhasePlanning    TaskPhase = "planning"
    PhaseExecuting   TaskPhase = "executing"
    PhaseReflecting  TaskPhase = "reflecting"
    PhaseCompleted   TaskPhase = "completed"
    PhaseFailed      TaskPhase = "failed"
)

type AgentTask struct {
    ID          string                 `json:"id"`
    UserPrompt  string                 `json:"user_prompt"`
    Phase       TaskPhase              `json:"phase"`
    Plan        []TaskStep             `json:"plan"`
    CurrentStep int                    `json:"current_step"`
    Context     map[string]interface{} `json:"context"`
    Results     map[string]interface{} `json:"results"`
    Retries     int                    `json:"retries"`
    MaxRetries  int                    `json:"max_retries"`
    CreatedAt   time.Time              `json:"created_at"`
}

type TaskStep struct {
    ID          string      `json:"id"`
    AgentName   string      `json:"agent_name"`   // "content_parser" | "visual_creator" | ...
    SkillName   string      `json:"skill_name"`    // "outline_generation" | "ai_render" | ...
    Input       interface{} `json:"input"`
    Output      interface{} `json:"output"`
    Status      string      `json:"status"`        // pending | running | done | error
    Error       string      `json:"error,omitempty"`
    Score       int         `json:"score"`         // 质量评分 0-100
    StartedAt   *time.Time  `json:"started_at"`
    CompletedAt *time.Time  `json:"completed_at"`
}
```

### 5.2 Orchestrator 编排流程

```go
// internal/agent/orchestrator.go

func (o *Orchestrator) Execute(ctx context.Context, userPrompt string) (<-chan SSEEvent, error) {
    events := make(chan SSEEvent, 100)
    
    go func() {
        defer close(events)
        
        // Phase 1: PLANNING — LLM 分解任务
        task := o.planTask(ctx, userPrompt)
        events <- SSEEvent{"plan", task.Plan}
        
        // Phase 2: EXECUTING — 按步骤执行
        for i, step := range task.Plan {
            task.CurrentStep = i
            task.Phase = PhaseExecuting
            events <- SSEEvent{"step_start", step}
            
            // 加载对应 Skill + 执行
            result, err := o.executeStep(ctx, step)
            if err != nil {
                // 重试逻辑
                if task.Retries < task.MaxRetries {
                    task.Retries++
                    i-- // 重试当前步骤
                    continue
                }
                task.Phase = PhaseFailed
                events <- SSEEvent{"error", err.Error()}
                return
            }
            
            step.Output = result
            step.Status = "done"
            events <- SSEEvent{"step_done", step}
        }
        
        // Phase 3: REFLECTING — 质量审查
        task.Phase = PhaseReflecting
        score := o.qualityReview(ctx, task)
        events <- SSEEvent{"review", score}
        
        if score < 60 && task.Retries < task.MaxRetries {
            // 触发修复循环
            task.Retries++
            o.patchAndRetry(ctx, task, events)
        }
        
        // Phase 4: COMPLETED
        task.Phase = PhaseCompleted
        events <- SSEEvent{"complete", task.Results}
    }()
    
    return events, nil
}
```

---

## 六、实施路线图 (修订版)

### Phase 0：基础升级 (1 周)
- [ ] LLM Gateway — 多 Provider 路由 + 自动降级 + 语义缓存
- [ ] Structured Output — 所有 LLM 调用启用 JSON Schema 约束
- [ ] Chromedp 连接池 — 复用 browser 实例

### Phase 1：Skills 系统 (1 周)
- [ ] `skills/` 目录结构 + SKILL.md 规范
- [ ] Skills Registry — 加载 / 发现 / 注入
- [ ] 将现有 5 个 Service 重构为 Skill 包

### Phase 2：Agent 核心 (2 周)
- [ ] Agent 接口定义 + 5 个专家 Agent 实现
- [ ] Orchestrator 状态机 (Plan → Execute → Reflect)
- [ ] Quality Reviewer 质量审查循环
- [ ] SQLite 状态持久化 + 断点续跑

### Phase 3：MCP + 前端 (1 周)
- [ ] MCP Tool Server (暴露 10+ 工具)
- [ ] 前端对话式 Agent Studio 界面
- [ ] SSE 实时步骤追踪 UI

### Phase 4：生产化 (2 周)
- [ ] Docker 化 Chromedp Worker 池
- [ ] API 费用计量仪表盘
- [ ] Agent 执行日志 + 可观测性
- [ ] Chromedp 进程级安全隔离

---

## 七、技术先进性总结

| 维度 | PagePop/DesignKit | OctoPoster Agent |
|------|-------------------|-------------------|
| **Agent 架构** | 单体管线 | OODA 闭环 + 质量反思循环 |
| **Skills** | 硬编码能力 | 模块化 SKILL.md + 渐进发现 |
| **工具协议** | 私有 API | MCP 标准 (可桥接任何生态) |
| **Agent 通信** | 不支持 | A2A 兼容 (可与第三方互联) |
| **质量保障** | 生成即输出 | QA Agent 自动审查 + 3轮修正 |
| **模型绑定** | 单一供应商 | 多 Provider Gateway 智能路由 |
| **部署方式** | 仅云端 | 单二进制 / Docker / K8s |
| **硬件要求** | 重型 GPU 集群 | **8GB 内存即可运行** (API 模式) |
| **扩展方式** | 厂商闭源 | 开放 Skill 包 + MCP 工具市场 |
