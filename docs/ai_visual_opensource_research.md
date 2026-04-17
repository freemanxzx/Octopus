# AI 架构与视觉自动化开源生态深度调研报告

本调研报告针对市面上主流的商业 AI 视觉自动化平台（如 **PagePop**、**可赞 AI (Kezign)** 和 **爱设计 (PicDoc)**）的底层架构，从 GitHub 上挖掘并整理了核心功能高度对应的开源解决方案。

这些系统的核心架构无非是：**"大语言模型 (LLM) 进行内容生成与排版推理 + 前端 Canvas/SVG 渲染引擎 + 可视化组件库封装"**。依据实现路径和业务目标，我们将其分为三大主干分类进行深度剖析。

---

## 1. 类似 PagePop：AI 海报、多图层布局与小红书图文生成

PagePop 主打基于文本输入快速生成小红书图文、营销海报和电商图床。这类工具既需要前端有一套类似 Canva 的画布框架，也需要后台有 AI 排版和文案生成的配合。

### 1.1 纯前端排版引擎与画布基座 (Canvas Editors)
这类项目提供了极其成熟的"拖拽式图文设计"前端核心，是构建自研版 PagePop 的必选技术底座：
*   **[poster-design](https://github.com/palxiao/poster-design)**
    *   **核心优势**：直接对标"稿定设计"和 Canva 的开源海报编辑器。支持拖拽、图层管理、模板套用，且自带了基于 Puppeteer 的无头浏览器服务端出图方案，非常适合做电商与公众号海报的底层引擎。
*   **[yft-design (快图设计)](https://github.com/dromara/yft-design)**
    *   **核心优势**：国内极度完善的开源替代品。基于 Vue3 + Fabric.js。支持复杂图层、PSD/PDF 解析、支持多种组件（文字、二维码、形状、素材）。如果自己做带界面的 AI 海报工具，它的稳定性极高。
*   **[vue-fabric-editor](https://github.com/nihaojob/vue-fabric-editor)**
    *   **核心优势**：极致插件化，社区活跃。提供了完整的左侧组件区、中间画布和右侧属性区。二次开发极其友好，可以直接通过 JSON 数据进行画面反向渲染（这正是 AI 控制排版的关键对接点）。
*   **[fast-poster](https://github.com/psoho/fast-poster)**
    *   **核心优势**：极具工程实践价值。通过简单的 Web 拖拽预设好元素占位符，一键生成后端调用代码（支持 Java/Python/Go），最适合进行高并发、批量的自动化营销海报生成任务。
*   **[Canvaco](https://github.com/aiurda/canvaco)** 🆕
    *   **核心优势**：极简的 Figma/Miro 风格画布克隆。基于 Fabric.js 实现实时协作与对象操控，演示了实际可用的多人协同画布场景（拖拽、缩放、图层），适合作为协作式设计工具的技术参考。
*   **[AI-Graphic-Designer](https://github.com/abdur75648/AI-Graphic-Designer)** 🆕
    *   **核心优势**：展示了"LLM + Canvas"深度对接的完整范式。利用 OpenAI API 生成创意 Prompt，通过 Playwright 自动化调用 Midjourney 生成图像素材，最终使用 Fabric.js 在画布上进行动态文字叠加与排版。整条链路打通了从创意到成品的全流程。

### 1.2 针对小红书与图文生成的 AI 自动化管线
如果不需要复杂的全功能 Canvas，只希望实现"输入长文本或干货，全自动排版出符合小红书调性的图文卡片"：
*   **[XHS-TextCard](https://github.com/geekfoxcharlie/XHS-TextCard)**
    *   **核心优势**：专攻小红书智能文字卡片生成。直接将 Markdown 解析渲染为极简风、杂志风、备忘录风的小红书切图。纯前端处理不涉隐私，并且支持长文智能分页匹配与防盗水印。
*   **[Madopic](https://github.com/xiaolinbaba/Madopic)**
    *   **核心优势**：独特的长文海报排版转化器。不仅支持图文混排，更强的是能原生渲染数学公式（KaTeX）、数据图表（ECharts）和高亮代码块，是"知识型、干货型"图文在多平台分发的开源神器。
*   **[xiaohongshu-text-layout](https://github.com/NowhereMan-in-Galaxy/xiaohongshu-text-layout)**
    *   **核心优势**：轻巧的文本排版防吞图工具。能够将纯文案按照社交媒体平台的阅读偏好和尺寸，极速裁剪、渲染并输出为高逼格卡片组。
*   **[xhs-image-mcp](https://github.com/dthinkr/xhs-image-mcp)** 🆕
    *   **核心优势**：基于 MCP（模型上下文协议）的小红书图文卡片生成服务器。支持 4 种主题（minimal/elegant/warm/dark）、3 种比例（3:4/1:1/4:3）、Markdown 直读、使用浏览器实际测量的智能自动分页（告别字数估算溢出）。可直接与 Claude Desktop / Claude Code 集成。设置 Gemini API Key 后自动启用 AI 封面生成，第一页自动为封面横幅预留空间。`npm install -g xhs-image-mcp` 即装即用。
*   **[baoyu-skills (宝玉小红书技能)](https://github.com/JimLiu/baoyu-skills)** 🆕
    *   **核心优势**：内含 `baoyu-xhs-images` 技能模块，可将任意内容拆分为 1–10 张卡通风格的图片卡片系列。自带排版/风格系统，主打轻量化、趣味性的图文输出，适合与 AI Agent 的 Skill 体系集成。
*   **大模型生成结合类 (如 [Autoxhs](https://github.com/Gikiman/Autoxhs) / [Xiaohongshu-Generator](https://github.com/shaozheng0503/Xiaohongshu-Content-Generator))**
    *   **核心优势**：主打工作流闭环。系统在后端调取 LLM 生成爆款文案和 Emoji，随后利用生图 API（DALL-E 或 稳定扩散）生成背景元素，最后通过 Python 脚本实现文图合成拼装，全无人工干预。Xiaohongshu-Content-Generator 提供丰富的视觉定制（圆角、emoji 自动插入、角标/水印）和批量导出功能，特别适合将已有博客文章二次分发至小红书。

### 1.3 前沿的 LLM 海报自动排版与布局算法 (多图层结构生成)
商业级产品的技术痛点在于：AI 是如何知道某段文字应该在海报左上角或是右下角？如何让 AI 直接吐出多图层画布（Canvas）可用的 JSON 数据？以下前沿算法正致力于解决大模型"读懂版式"的问题：
*   **[PosterMaker](https://poster-maker.github.io/)** (CVPR 2025) 🆕
    *   **核心优势**：由阿里妈妈创意团队支持的端到端生成框架，专攻**带文字的高质量商品海报生成**。其核心突破在于解决了 AI 生成海报时"文字渲染不准确"（特别是复杂中文本）的痛点，创新性地使用字符级视觉特征作为控制信号。采用双阶段训练策略，将文字渲染（TextRenderNet）与背景生成（SceneGenNet）解耦，并引入主体保真度反馈学习，确保商品在生成场景中不发生形变。
*   **[CreatiPoster](https://github.com/graphic-design-ai/creatiposter)** (arXiv 2506.10890) 🆕
    *   **核心优势**：**当前最值得关注的多图层可编辑海报生成系统**。采用双模型流水线：**协议模型 (Protocol Model)** 基于 RGBA 多模态大模型，将用户输入（自然语言/素材/混合）解析为严格的 JSON 协议，定义每一图层的布局、层级、样式与内容；**背景模型 (Background Model)** 则条件式合成与前景图层和谐统一的背景。支持多种交互模式（纯 Prompt、纯素材、混合输入）、画布编辑、响应式缩放、文字叠加、多语言适配、甚至 **动态海报 (Animated Poster)** 生成。输出完全可编辑的分层 PSD 级结构，真正实现了"AI 生成 ≠ 一张死图"。
*   **[PosterCopilot](https://github.com/JiazheWei/PosterCopilot)** 与 **[PosterCraft](https://github.com/ephemeral182/PosterCraft)** (ICLR 2026/学术界前沿)
    *   **核心优势**：极具深度的开源框架。专门解决 LLM 生成海报时"文字不对齐"、"背景与文字冲突"的问题。采用大视觉模型（LMM）进行多轮排版推理，输出完全解耦的图层坐标，提供从零生成到局部可控编辑的全体验。PosterCraft (MeiGen-AI 维护) 特别聚焦精确文字渲染、艺术融合和风格和谐的统一框架。
*   **[PosterLLaVA](https://github.com/posterllava/PosterLLaVA)** 与 **[Graphist](https://github.com/graphic-design-ai/graphist)**
    *   **核心优势**：原生基于多模态大模型进行布局推理。它将布局信息严格编码为结构化文本（JSON）。你只需给模型输入一堆无序的文本和素材需求，模型即可输出包含**坐标、尺寸、图层顺序**的完美层级排版数据文件，前端拿到 JSON 即可直接上屏渲染。Graphist 开创性地提出了**层级布局生成 (Hierarchical Layout Generation, HLG)** 任务，将布局生成视为序列生成问题来确定正确的图层排序与空间排列。
*   **[PosterO](https://github.com/theKinsley/PosterO-CVPR2025)** (CVPR 2025) 🆕
    *   **核心优势**：使用**布局树 (Layout Tree)** 结构使 LLM 能够进行通用化的、内容感知的布局生成。相比传统的平坦坐标列表，布局树天然编码了元素间的嵌套与层级关系，使模型输出的结构更符合真实设计逻辑。CVPR 2025 顶会论文背书，代表了该领域的最新学术前沿。
*   **[LayoutGPT](https://github.com/weixi-feng/LayoutGPT)** (NeurIPS) 🆕
    *   **核心优势**：将 LLM 作为**视觉规划器 (Visual Planner)**。通过将布局信息编码为类 CSS 的样式表语言，配合上下文内视觉示例（In-Context Visual Demonstrations），使 LLM 无需微调即可为 2D 图像和 3D 场景生成合理布局。这是一种真正意义上的零样本布局生成范式。
*   **[LayoutPrompter](https://github.com/microsoft/LayoutGeneration)** (微软出品) 🆕
    *   **核心优势**：微软官方布局生成研究集合。LayoutPrompter 利用 LLM 的上下文学习 (In-Context Learning) 能力，将布局生成视为序列生成任务。无需训练专用模型，仅通过精心设计的 Prompt 和少量示例即可激发 LLM 的设计能力。该仓库统一收录了 LayoutPrompter、LayoutDiffusion 等多种布局生成方法的官方实现。
*   **[Paper2Poster](https://github.com/Paper2Poster/Paper2Poster)** (NeurIPS 2025) 🆕
    *   **核心优势**：专门将长文档（学术论文 PDF）自动转化为结构化学术海报的多智能体系统。核心是名为 **PosterAgent** 的自上而下、视觉在环 (Visual-in-the-Loop) 多 Agent 流水线（Parser → Planner → Painter-Commenter）。从 `paper.pdf` 直出可编辑的 `poster.pptx`。NeurIPS 2025 Dataset & Benchmark Track 收录。支持 YAML 自定义样式、会议/机构 Logo 自动检索、并行分节生成加速。

### 1.4 深度融合：大模型驱动的小红书海报/封面全链路项目
这类项目完全贴合"大模型 + 海报渲染 + 小红书场景"的铁三角，开箱可用，甚至直接打通了自动发布的终极闭环：
*   **[RedInk 红墨](https://github.com/HisMax/RedInk)** (强烈推荐 🔥) 
    *   **核心优势**：**当前最完整的一站式小红书图文 AI 生成器**。输入一句话或一个主题，即自动生成包含封面图、6-9 页分段式文案、话题标签的完整笔记结构。技术栈融合 Gemini 3 进行文案生成 + Nano Banana Pro 进行高质量、风格统一的图像生成。支持每页自定义描述、参考图片学习账号风格、不满意的页面单独重绘。默认 15 张图片并发生成，效率极高。提供 Docker 一键部署，Web UI 配置 API Key 即可使用。CC BY-NC-SA 4.0 协议，积极维护中（最新 v1.4.2, 2026-03）。
*   **[xhs-autopilot](https://github.com/Jinsong-Zhou/xhs-autopilot)** (全流程 Agent) 🆕
    *   **核心优势**：基于 AI Agent（通过 Claude Code Skills 驱动）接管小红书内容创作的各个步骤。功能涵盖：竞品调研、爆款模式分析（提取标题/结构/标签）、智能写作、封面生成（支持 Pillow 批量与 HTML+Playwright 截图 高清方案）以及利用小红书 MCP 进行一键或定时发布。
*   **[MimicThem](https://github.com/zhanchey/MimicThem)** 🆕
    *   **核心优势**：**一键复刻爆款人物图文**。用户输入任意小红书爆款链接，系统自动反推图片提示词，利用 Seedream 大模型生成新图片，再扩展生成 N 张变体图片，并同步生成诗意文案。主推 "模仿学习" 的工作流，完美规避直接搬运原图的风险。
*   **[xiaohongshu-poster-generator (小红书星座海报生成器)](https://github.com/wensia/xiaohongshu-poster-generator)** 🆕
    *   **核心优势**：专精特定垂类（如星座）的深度自动化系统。基于 Claude Code + MCP 构建。它的流水线十分惊艳：集成飞书拉取数据，自动抓取低粉高互动爆文，AI 分析提取复用技巧，生成海报后通过 XHS MCP 自动发布，甚至还能智能生成并执行评论回复。
*   **[xiaohongshu-ai-toolkit](https://github.com/aihes/xiaohongshu-ai-toolkit)** 🆕
    *   **核心优势**：**自带商业化生态的开源项目**。主打将枯燥的学术论文 (arXiv) 智能分析并转化为小红书易传播的总结文案与高质量封面图。系统不仅生成内容，还内置了 Supabase 用户认证与积分消费体系，是学习 AI 产品独立开发 (Indie Hacking) 的绝佳开源案例。
*   **[xhs_automate](https://github.com/formero009/xhs_automate)** 🆕
    *   **核心优势**：**ComfyUI 工作流深度集成**。专门为重度 AI 制图玩家打造，提供可视化的 ComfyUI 工作流与 GPT 参数的联合管理界面。实现图像生成能力与文案生成能力的无缝集成，并直连发布平台。
*   **[GudongCover](https://github.com/maoruibin/GudongCover)**
    *   **核心优势**：专门为"小红书封面大字报"打造的开源 LLM 封面生成器。底座融合了 Google Gemini，只需输入原始文章或素材链接，大模型会自动提炼出高点击率的"主标题 + 副标题"，并直接排版输出具有强烈视觉冲击力的小红书 3:4 封面海报。
*   **[xiaohongshu (YYH211)](https://github.com/YYH211/xiaohongshu)**
    *   **核心优势**：基于最新的 MCP（模型上下文协议）架构构建的智能体 Web 应用。它把大模型找图、大语言模型润色小红书爆款文案、封面拼图打包成了一条全自动的工作流系统，做到了名副其实的"AI 自动化流水线"。

### 1.5 学术资源索引与综合导航 🆕
对于希望深入跟踪该领域前沿论文与代码的研究者：
*   **[Awesome-Layout-Generators](https://github.com/JosephKJ/Awesome-Layout-Generators)**
    *   **核心优势**：精心策划的布局生成领域学术论文与开源代码库合集，涵盖海报、传单、杂志、UI 界面等多种布局类型的生成方法。持续追踪顶会最新进展。
*   **[Awesome-Layout-Generation](https://github.com/wd1511/Awesome-Layout-Generation)** / **[huapohen 版](https://github.com/huapohen/Awesome-Layout-Generation)**
    *   **核心优势**：另外两个活跃维护的布局生成 Awesome List。分别从不同角度整理了该领域的论文、数据集、评估指标和代码仓库，互为补充。

---

## 2. 类似 Kezign (可赞 AI)：长文档解析转 AI 智能 PPT

Kezign 将 Word、PDF 之类的文本输入转化为 PPT 或者大纲汇演。技术核心在于将长文本提取为 JSON 呈现树，再映射到底层幻灯片版式库。

*   **[PPT Master (原 AiPPT)](https://github.com/veasion/AiPPT)**
    *   **核心优势**：一套非常成熟的商用级开源产品。支持输入 Prompt 或 Markdown 文本，它会先调用 LLM 输出结构化的大纲 JSON 数据，再匹配其内置的 Vue 模板，最后通过 PptxGenJS 或类似技术导出"完全不带水印且所有元素均可编辑"的 `.pptx` 原生文件。
*   **[Presenton](https://github.com/Presenton/Presenton)**
    *   **核心优势**：完全开源的 AI 演示文稿生成平台。不仅包含了前端 UI，还包含后台 API 接入逻辑，支持自带 API Key (OpenAI, Anthropic) 甚至是完全本地部署无隐私担忧的 Ollama 大模型。
*   **[Slidev](https://github.com/slidevjs/slidev)** (开发者的最优解)
    *   **核心优势**：本质上这是一个将 Markdown 转为超炫酷幻灯片的渲染引擎。如果让大模型（如 DeepSeek）生成特定格式的 Markdown 代码，配合 Slidev，就能在一秒内渲染出全动态格式的数据化汇报。

---

## 3. 类似 PicDoc：AI 文本转信息图、图表与脑图

PicDoc 主打将数据干货或想法转化为脑图、序列图及信息展示图卡。

### 3.1 专门用于图表可视化的 LLM 引擎
*   **[LIDA (微软开源)](https://github.com/microsoft/lida)**
    *   **核心优势**：目前此赛道的最强系统框架。只需给系统喂入一份数据源，LIDA 会自动理解数据语义，并生成数据处理代码、最终调用 ECharts 或 D3 等产生美观的可视化图表，且支持纠错和评价。
*   **[VMind (字节跳动底层支持开源)](https://github.com/VisActor/VMind)**
    *   **核心优势**：基于 LLM 计算数据上下文意图，自动生成非常炫酷的统计图表以及动态的图表加载动画。

### 3.2 自然语言转架构图与思维导图
*   **[DeepDiagram](https://github.com/twwch/DeepDiagram)** 与 **[Text2Diagram](https://github.com/bhaskatripathi/Text2Diagram)**
    *   **核心优势**：此类平台将自然语言解析为逻辑图谱语言（最典型的是利用大模型直接写 Mermaid.js 甚至 PlantUML 表达）。前端接到代码后，利用开源库 [Markmap](https://github.com/markmap/markmap) （专精思维导图渲染）或者 `mermaid.js` 瞬间将其变现为可视化图形。

### 3.3 企业级大屏与复杂报表可视化 (可视化上限)
当图表需求叠加至"全屏报表"时，以下开源大屏编辑器可以充当绝佳的基础座标：
*   **[DataRoom](https://github.com/gcpaas/DataRoom)** (Spring Boot+Vue) / **[OpenDataV](https://github.com/AnsGoo/openDataV)** (纯前端)
    *   **核心优势**：它们本身是重度的拖拽可视化低代码平台，内置了几百种酷炫图表。若在这个基础上赋予上述的"AI 分析引擎"去控制后台数据传输，即可打造企业内部的极品 AI 看板工具。

---

## 附录：本次调研更新日志

| 日期 | 新增/更新项目 | 所属分类 |
|------|-------------|---------|
| 2026-04-17 | RedInk、xhs-image-mcp、baoyu-skills | 1.2 / 1.4 小红书图文生成 |
| 2026-04-17 | xhs-autopilot、MimicThem、xiaohongshu-poster-generator、xiaohongshu-ai-toolkit、xhs_automate | 1.4 全链路工作流 |
| 2026-04-17 | PosterMaker (CVPR 2025/阿里妈妈)、CreatiPoster (arXiv) | 1.3 多图层布局算法 |
| 2026-04-17 | PosterO (CVPR 2025)、LayoutGPT (NeurIPS)、LayoutPrompter (微软) | 1.3 多图层布局算法 |
| 2026-04-17 | Paper2Poster (NeurIPS 2025) | 1.3 多图层布局算法 |
| 2026-04-17 | Canvaco、AI-Graphic-Designer | 1.1 前端画布引擎 |
| 2026-04-17 | Awesome-Layout-Generators / Generation (×3) | 1.5 学术资源索引 |

---
**💡 总结**：对于国内这类主打轻量化视觉呈现的企业应用，它们绝大多数都不是"造轮子"，而是巧妙结合了开源界的 **Canvas 排版库 (Fabric.js)** + **幻灯片协议生成库 (PptxGen)** + **LLM 意图解析 API**。以上提到的项目，足以复原目前市面上该赛道的绝大部分产品闭环。

2026-04-17 更新后，本报告第一大类（AI 海报、多图层布局与小红书图文生成）已从原有 **12 个项目扩展至 31 个项目**，新增覆盖了：
- 🔬 **学术前沿**：PosterMaker、CreatiPoster、PosterO、LayoutGPT、LayoutPrompter、Paper2Poster 等顶会论文级布局生成系统
- 🛠️ **全链路 Agent**：xhs-autopilot、MimicThem、xhs_automate、xiaohongshu-poster-generator 等高度综合的自动化系统
- 🛠️ **工程实践**：RedInk、xhs-image-mcp 等开箱即用的小红书工具
- 🎯 **MCP 生态**：xhs-image-mcp、baoyu-skills 等与 AI Agent 原生集成的工具链
- 📚 **学术索引**：3 个 Awesome List 帮助持续追踪领域进展
