# 🚀 OctoPoster：文生图 Prompt 工程体系与产品功能规划

> **版本**: v2.0 · **最后更新**: 2026-04-18  
> **目标**: 以"一句话输入 → 设计师级套图输出"为产品愿景，系统性地构建 OctoPoster 的多模态图文生成能力。  
> **参考竞品**: PagePop · RedInk (红墨) · Canva Magic · 即梦 AI

---

## 一、文生图大模型 API 全景评估

在选型之前，必须理解不同模型的核心差异化能力。我们按**国际模型**和**国内模型**分别评估。

### 1.1 国际模型 API 对比

| 模型 | 厂商 | 核心优势 | 文字渲染 | 写实度 | API 定价 (约) | 最佳场景 |
|:---|:---|:---|:---:|:---:|:---:|:---|
| **Gemini 3 Pro** | Google | 原生多模态、中文理解极佳、文本嵌入图像能力强 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0.04/张 | 整体最优选：中文海报直出、带字渲染 |
| **Flux Pro** | Black Forest Labs | 极致写实、Prompt 服从性最强、人像质感顶尖 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ~$0.05/张 | 高级摄影、氛围感场景 |
| **Ideogram v3** | Ideogram | 行业最强字体渲染（字符级拼写精度） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0.04/张 | Logo 设计、带精确文案的营销物料 |
| **DALL-E 3** | OpenAI | 复杂语义理解、自动 Prompt 扩写、GPT-4 集成 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.04-$0.12/张 | 复杂描述场景、创意概念图 |
| **Stable Diffusion 3** | Stability AI | 开源可控、ControlNet/LoRA 微调、本地部署 | ⭐⭐ | ⭐⭐⭐⭐ | 自部署免费 | 需要像素级控制、定制风格的场景 |
| **Midjourney v6** | Midjourney | 艺术审美顶尖、画面构图无敌 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 无公开 API | 仅限灵感参考（无法程序化调用） |

### 1.2 国内模型 API 对比

| 模型 | 厂商 | 核心优势 | 中文理解 | 推荐场景 | 定价 |
|:---|:---|:---|:---:|:---|:---:|
| **通义万相** | 阿里巴巴 | 电商视觉能力极强，支持图像修复/相似图生成 | ⭐⭐⭐⭐⭐ | 电商营销素材、商品主图换背景 | 按量付费 |
| **豆包/即梦 (Seedream)** | 字节跳动 | 多模态联动（文→图→视频）、社交场景适配 | ⭐⭐⭐⭐⭐ | 短视频封面、社交配图、高频 C 端应用 | 按量付费 |
| **文心一格** | 百度 | 国风创作能力突出、合规性最高 | ⭐⭐⭐⭐⭐ | 艺术创作、文化 IP 设计、政企市场 | 按量付费 |
| **CogView (智谱清言)** | 智谱 AI | 科研配图精准、复杂逻辑语义稳定 | ⭐⭐⭐⭐ | 科研论文配图、技术文档插图 | 按量付费 |

### 1.3 OctoPoster 选型策略 (推荐)

```
Primary   :  Gemini 3 Pro        → 默认首选（中文海报直出 + 文字渲染 + 成本低）
Fallback  :  Flux Pro             → 高级摄影/氛围场景降级备选
Specialty :  Ideogram v3          → Logo/标题精确文字渲染专用
Domestic  :  通义万相 / 豆包即梦  → 国内用户合规 + 低延迟通道
```

> **核心原则**：走 API 聚合路线（API Aggregator），根据任务类型动态分发请求，避免 vendor lock-in。

---

## 二、小红书/自媒体高质量图文完整分类体系

基于 2025-2026 年小红书平台内容生态分析，我们将图文类型细分为 **8 大核心品类**。每个品类都有其特定的视觉语言和 Prompt 工程要求。

### 分类总览

| 编号 | 品类名称 | 内容定位 | 视觉风格关键词 |
|:---:|:---|:---|:---|
| 1 | 氛围摄影类 | 探店/旅游/美食/日常 | 电影打光、胶片色调、散景 |
| 2 | 商品展示类 | 好物带货/美妆/数码 | 白底/场景商拍、材质质感、留白 |
| 3 | 知识干货类 | 教程/工具推荐/书单 | 扁平图标、Notion UI、粘土 3D |
| 4 | 对比冲突类 | 测评/前后对比/避坑 | 拼图分割、对比色块、标注箭头 |
| 5 | 纯文字排版类 | 金句/观点/清单 | 大字号标题、渐变底纹、极简 |
| 6 | 艺术插画类 | 壁纸/治愈/星座 | 手绘风格、赛博朋克、吉卜力 |
| 7 | 人物穿搭类 | OOTD/街拍/妆容 | 全身/半身、杂志版面、打光 |
| 8 | 拼贴创意类 | 开箱/合集/九宫格 | 抠图拼贴、标签色块、边框 |

---

### 品类 1：🌟 氛围摄影类 (Cinematic Vibe Photography)

**适用场景**：情感笔记、旅游打卡、探店美食、日常 Vlog 封面、咖啡/甜品。

**视觉特征**：
- 影视级打光（丁达尔效应、逆光、Golden Hour）
- 浅景深散景（Bokeh f/1.4）
- 胶片模拟滤镜（富士 Provia / 柯达 Portra / VSCO）
- 温暖色调或冷调电影感

**Prompt 公式**：
```
[主体内容描述] + [镜头焦段/光圈] + [灯光类型/方向] + [胶片/色调风格] + [画质修饰词]
```

**黄金 Prompt 模板**：
```
A professional food photograph of a beautifully crafted latte art coffee cup on a wooden 
table by a rain-streaked café window. Shot on Canon 50mm f/1.4 lens with shallow depth of 
field and creamy bokeh background. Warm golden hour backlighting with soft Tyndall effect 
light rays. Fujifilm Provia film simulation with rich, saturated colors and subtle film 
grain. 8K resolution, award-winning photography, editorial quality.

Composition: Subject positioned on the right third, leaving generous negative space on the 
left side for text overlay.
```

**每个 Provider 的特殊适配**：
- **Gemini**：直接用中文描述即可，它的中文理解极强。可追加 `"请确保画面左侧留出大面积空白区域"`
- **Flux Pro**：前置主体描述，30-80 词最佳；避免关键词堆砌，用自然语言
- **DALL-E 3**：可写完整段落式描述，它会自动扩写优化

---

### 品类 2：🛍️ 商品展示类 (Commercial Product Photography)

**适用场景**：好物分享、口红试色、数码评测、穿搭推荐、护肤品。

**视觉特征**：
- 主体绝对清晰锐利（100mm 微距）
- 高级质感衬托物（大理石/水波纹/丝绸/自然光斑）
- 影棚级三点布光（Key + Fill + Rim）
- **大面积留白**（为 Canvas 排版预留）

**Prompt 公式**：
```
[商品主体+材质细节] + [场景/衬托背景] + [影棚灯光设置] + [构图/留白指令] + [商业摄影修饰]
```

**黄金 Prompt 模板**：
```
A high-end commercial product photograph of a luxury red lipstick tube standing upright on 
a polished white Carrara marble surface with subtle rippling water reflections. Three-point 
studio lighting: soft key light from the upper left, gentle fill light to reduce harsh 
shadows, and a precise rim light highlighting the metallic gold cap edge. 

The lipstick casing has a brushed matte metallic texture with embossed branding. Shot on 
100mm macro lens at f/2.8, with ultra-sharp focus on the product and a smooth, clean 
gradient background fading to pure white.

Composition: Product positioned in the lower-right quadrant. The upper-left 60% of the 
frame is intentionally left as clean negative space — ideal for overlaying modern sans-serif 
typography. Minimalist, editorial, Vogue magazine quality.
```

**留白控制关键词库**：
```
- "generous negative space on [top/left/right] for text overlay"
- "subject positioned off-center using rule-of-thirds"
- "minimalist composition with large empty area"
- "clean, uncluttered background fading to solid white/cream"
- "ample breathing room around the subject"
```

---

### 品类 3：📊 知识干货类 (Infographic / Notion UI Style)

**适用场景**：学习干货、效率工具盘点、书单推荐、技能清单、APP 推荐。

**视觉特征**：
- 3D 粘土风格（Claymorphism）或扁平矢量图标
- Notion / iOS 设计系统质感
- 极简纯色/莫兰迪色渐变底纹
- 等距视角（Isometric）

**Prompt 公式**：
```
[核心图标/元素] + [3D/扁平风格派系] + [UI/UX质感描述] + [纯色/渐变背景] + [留白指令]
```

**黄金 Prompt 模板**：
```
A clean, modern infographic illustration featuring three stacked hardcover books and an iPad 
displaying a colorful app interface. Rendered in 3D clay-morphism style (Claymorphism) with 
soft, rounded edges and matte surfaces. Isometric perspective view.

Each object has a subtle frosted glass texture with gentle ambient occlusion shadows. The 
color palette uses harmonious Morandi tones (dusty rose, sage green, warm beige). Background 
is a smooth, pure light gray (#F5F5F5) gradient, perfectly clean with no distracting elements.

The objects are clustered in the center-bottom area, leaving the upper 50% completely empty 
for headline text placement. Notion-style UI aesthetic, minimal, professional.
```

---

### 品类 4：⚔️ 对比冲突类 (Comparison & Contrast)

**适用场景**：产品测评、装修前后、健身变化、买家秀 vs 卖家秀、避坑指南。

**视觉特征**：
- 画面分割（左右对比 / 上下对比）
- 强烈反差（色温/风格/新旧）
- 标注元素（箭头、圆圈、叉号、勾号）
- 高辨识度的分栏底色

**Prompt 公式**：
```
[左右/上下分屏描述] + [对比主体A vs B] + [色调反差] + [标注风格] + [整体构图]
```

**黄金 Prompt 模板**：
```
A split-screen comparison image divided vertically in the middle. 

Left side: A cluttered, messy desk with poor lighting, scattered papers, and an old monitor — 
warm yellowish tungsten cast, slightly blurry, chaotic atmosphere. Labeled "BEFORE" in bold 
red sans-serif text at the top.

Right side: The same desk completely reorganized — clean, minimalist setup with a sleek 
ultrawide monitor, cable management, succulent plant, and soft natural window light. Cool, 
fresh blue-white tones. Labeled "AFTER" in bold green sans-serif text at the top.

A thin white vertical divider line separates both halves. Photorealistic style, editorial 
quality, high contrast between both sides to emphasize the dramatic transformation.
```

---

### 品类 5：💬 纯文字排版类 (Typography-First Cards)

**适用场景**：金句语录、观点输出、清单盘点、情绪文案。

**视觉特征**：
- 文字是主体（大标题 + 正文排版）
- 渐变或纹理底纹
- 无需复杂图像元素
- 依赖字体设计感 + 色彩搭配

**Prompt 公式**：
```
[纹理/渐变底纹描述] + [文字区域留白指令] + [排版风格参考] + [色调情绪]
```

**黄金 Prompt 模板**：
```
A minimalist background texture for typography overlay. Soft gradient transitioning from 
warm peach (#FFDAB9) at the top-left corner to a gentle lavender (#E6E6FA) at the 
bottom-right. Subtle paper grain texture with very fine noise.

The entire image is intentionally left as a clean canvas with NO objects, NO text, and NO 
illustrations — designed purely as a backdrop for overlaying large Chinese typography in a 
design tool. Aspect ratio 3:4, high resolution, soothing and premium feel.
```

> **注意**：此类图片的文字不依赖大模型渲染，而是完全交给 Fabric.js Canvas 排版引擎。大模型只负责生成高质量的**底纹背景**。

---

### 品类 6：🎨 艺术插画类 (Creative Illustration)

**适用场景**：治愈系睡前故事、星座解析、动漫壁纸、诗词配图、情感绘本。

**视觉特征**：
- 强烈的画师风格辨识度
- 色彩情绪化（暖色治愈系 / 冷色赛博系）
- 手绘笔触或数字绘画质感

**风格子类与专用 Prompt 关键词**：

| 子风格 | Prompt 关键词 |
|:---|:---|
| 吉卜力治愈 | `Studio Ghibli style, Hayao Miyazaki, hand-painted watercolor, pastel palette, warm nostalgic` |
| 新海诚唯美 | `Makoto Shinkai style, dramatic sky, volumetric clouds, lens flare, ultra-detailed background` |
| 赛博朋克 | `Cyberpunk neon, rain-soaked streets, holographic signage, noir atmosphere, magenta and cyan lighting` |
| 中国水墨 | `Traditional Chinese ink wash painting, xuan paper texture, flowing brush strokes, mountain mist, minimalist` |
| 扁平矢量 | `Flat vector illustration, geometric shapes, bold outlines, vibrant solid colors, Dribbble style` |
| 复古海报 | `Vintage retro poster, Art Deco, distressed texture, muted earth tones, 1960s advertising style` |

**黄金 Prompt 模板 (以新海诚风为例)**：
```
A breathtaking anime-style illustration of a young girl standing on a grassy hilltop, gazing 
at a sky filled with enormous, glowing jellyfish floating among the stars. 

Makoto Shinkai inspired style with ultra-detailed background painting. The sky transitions 
from deep indigo at the top to warm twilight orange at the horizon. Soft bioluminescent glow 
emanates from each jellyfish in cool cyan and violet hues. 

The girl's silhouette is small against the vast cosmic landscape, evoking a sense of wonder 
and solitude. Gentle wind ripples through the grass. 2D hand-drawn anime aesthetic, cinematic 
wide-angle composition, 4K resolution, emotionally moving, healing (治愈系).
```

---

### 品类 7：👗 人物穿搭类 (Fashion / OOTD / Portrait)

**适用场景**：OOTD 穿搭日记、街拍、妆容教程、发型推荐。

**视觉特征**：
- 全身或半身构图
- 杂志级打光（侧光/蝴蝶光/环形光）
- 干净的城市/室内背景
- 高级色调后期

**Prompt 公式**：
```
[人物描述+服装细节] + [姿势/角度] + [背景环境] + [灯光方案] + [杂志风格修饰]
```

**黄金 Prompt 模板**：
```
A full-body fashion editorial photograph of a young Asian woman wearing an oversized camel 
cashmere coat over a white turtleneck and wide-leg cream trousers. She stands naturally on 
a quiet European cobblestone street lined with autumn trees.

Shot on 85mm lens at f/2.0, creating a beautiful bokeh background. Soft overcast natural 
lighting providing even, flattering illumination with no harsh shadows. The color palette 
is warm and muted — camel, ivory, and sage tones.

Composition: Full body centered, with the subject's head at the upper third line. Clean 
negative space above and on both sides. Editorial, Harper's Bazaar quality, effortlessly 
elegant.
```

---

### 品类 8：🧩 拼贴创意类 (Collage / Grid Layout)

**适用场景**：开箱合集、多品推荐、九宫格排版、工具合集。

**视觉特征**：
- 多元素有序排列（九宫格/2×2/3列）
- 统一的背景底色
- 每个元素有小标签/编号
- Flat Lay 风格（俯拍桌面）

**Prompt 公式**：
```
[多物品俯拍排列] + [背景材质] + [排列方式] + [统一色调] + [标注/标签风格]
```

**黄金 Prompt 模板**：
```
A professional flat lay photograph shot from directly above. Nine carefully arranged skincare 
products (serums, creams, toners in minimalist packaging) are laid out in a 3x3 grid pattern 
on a soft blush pink linen fabric background.

Each product is evenly spaced with consistent gaps between items. Soft, diffused overhead 
studio lighting with minimal shadows. The overall color scheme is cohesive — white, pink, 
and rose gold tones.

Clean, editorial, Marie Claire beauty spread aesthetic. Shot on medium format camera, 
tack-sharp focus across entire frame (f/11), high resolution. Small numbered labels (1-9) 
in a clean sans-serif font appear next to each product.
```

---

## 三、Prompt 工程核心规范 (跨模型通用)

无论使用哪家 API，以下 5 条铁律能显著提升出图质量。

### 规范 1：自然语言优于关键词堆砌

```diff
- ❌ "coffee, cafe, beautiful, 4k, 8k, trending on ArtStation, bokeh, HDR, masterpiece"
+ ✅ "A warm, inviting photograph of a latte art coffee cup sitting on a wooden café 
+     table, with soft golden afternoon light streaming through a rain-streaked window. 
+     Shot on 50mm lens, shallow depth of field, Fujifilm color science."
```

### 规范 2：前置主体，后置修饰

模型对 Prompt 开头的信息权重更高。务必将**核心主体和动作**放在第一句。

```
✅ "A luxury red lipstick tube standing upright on marble..." (主体先行)
❌ "A beautiful, high-quality, professional... lipstick..." (修饰词淹没主体)
```

### 规范 3：用引号括住需要精确渲染的文字

```
✅ 'The headline "URBAN EXPLORER" is rendered in bold white sans-serif font...'
❌ 'The headline says urban explorer...'
```

### 规范 4：强制留白指令 (Typography-Safe Zone)

**每一次调用 Image API 前，务必追加以下「留白指令」之一**（根据风格选择）：

| 留白模式 | 追加 Prompt |
|:---|:---|
| **上方留白** | `"Leave the top 30% of the image as clean negative space for headline text."` |
| **左侧留白** | `"Subject positioned on the right third, leaving the left 60% as empty space."` |
| **全身留白** | `"Minimalist composition with ample breathing room around the subject."` |
| **底部留白** | `"Subject in the upper area, bottom 25% fades to a solid color for caption bar."` |

### 规范 5：迭代式精修 (Conversational Editing)

对于支持多轮对话的模型（如 Gemini），不要期望一次完美。采用迭代策略：

```
Round 1: 生成基础画面 → 检查主体、构图、色调
Round 2: "请将背景颜色调整为更暖的奶油色" → 微调色彩
Round 3: "将文字 'HELLO' 的字体改为更圆润的无衬线体" → 精修文字
```

---

## 四、OctoPoster 产品功能规划 (2.0 Roadmap)

基于上述分类和 Prompt 工程体系，以下是 OctoPoster 从"MVP 生图"升级为"风格驱动智能生产线"的完整功能规划。

### Phase 1：🎨 前端「风格选择引擎」

**目标**：取代手动输入 Prompt，让用户通过可视化卡片选择生图风格。

**改动文件**：`AppView.vue` / `GenerateView.vue` / `generator.ts`

**具体实现**：
1. 在创作台的主题输入区域下方，新增一个**风格选择面板**
2. 展示 8 张风格预览卡片（对应 8 大品类），每张卡片包含：
   - 风格名称 + 图标
   - 一句话描述
   - 预览缩略图（可用 AI 预生成）
3. 用户选中后，`generator.ts` 中存储 `styleId: string`，调用 API 时传递给后端

**风格预设列表**：

| StyleID | 名称 | 图标 | 最佳 Provider |
|:---|:---|:---:|:---|
| `cinematic` | 氛围摄影 | 📷 | Flux Pro / Gemini |
| `commercial` | 商品展示 | 🛍️ | Gemini / 通义万相 |
| `infographic` | 知识干货 | 📊 | Gemini / DALL-E 3 |
| `comparison` | 对比冲突 | ⚔️ | DALL-E 3 / Gemini |
| `typography` | 纯文字排版 | 💬 | Gemini (仅底纹) |
| `illustration` | 艺术插画 | 🎨 | Gemini / Flux |
| `fashion` | 人物穿搭 | 👗 | Flux Pro |
| `collage` | 拼贴创意 | 🧩 | DALL-E 3 / Gemini |

---

### Phase 2：🧠 后端「Prompt 增程引擎」(Prompt Augmentation Pipeline)

**目标**：无论用户输入多简单的词，系统都能自动将其扩写为顶级 Prompt。

**改动文件**：`internal/agent/workflows.go` / 新建 `internal/service/prompt_augmentor.go`

**流水线架构**：
```
用户主题 ("做个咖啡探店教程")
      ↓
Step 1: 大纲生成 (OutlineService)
      ↓ pages[].content
Step 2: Prompt Augmentor ← styleId
      ↓ 注入风格模板 + 留白指令 + 画质修饰
Step 3: 调用 Image API (按 styleId 选最优 Provider)
      ↓
Step 4: Canvas 组装 (按 styleId 匹配排版模板)
```

**Prompt Augmentor 核心逻辑**：
```go
func AugmentPrompt(pageContent string, styleID string) string {
    // 1. 加载风格预设模板
    template := styleTemplates[styleID]
    
    // 2. 用 LLM 将用户的短描述扩写为该风格的专业 Prompt
    augmented := llmRewrite(pageContent, template.SystemPrompt)
    
    // 3. 强制追加留白指令
    augmented += "\n" + template.NegativeSpaceDirective
    
    // 4. 强制追加画质基线
    augmented += "\n" + template.QualityBaseline
    
    return augmented
}
```

**每个风格预设的 System Prompt 骨架**：
```yaml
cinematic:
  system_prompt: |
    你是一位世界级的摄影导演。请将以下内容描述转化为一段电影级摄影场景的详细英文 
    Prompt。必须包含：具体镜头焦段、景深参数、灯光类型和方向、胶片色彩风格、
    以及画面情绪氛围。
  negative_space: "Subject positioned off-center. Leave at least 30% negative space for text."
  quality_baseline: "8K, photorealistic, award-winning photography, editorial quality."

commercial:
  system_prompt: |
    你是一位顶级商业摄影师。请将以下商品描述转化为一段极简高级商拍的详细英文 
    Prompt。必须包含：商品材质细节、背景衬托物材质、三点布光方案、以及专业的
    构图留白指令。
  negative_space: "Upper-left 60% must be clean negative space for typography overlay."
  quality_baseline: "100mm macro, f/2.8, studio lighting, commercial editorial."
```

---

### Phase 3：🔗 Canvas 模板与风格的强制绑定

**目标**：不同风格的底图应自动搭配不同的排版 UI 模板，避免"底图复杂 + 文字看不清"的问题。

**改动文件**：`internal/service/canvas_templates.go`

**风格 → 排版映射规则**：

| 风格 | Canvas 排版策略 |
|:---|:---|
| `cinematic` / `fashion` | 毛玻璃卡片遮罩层 (Glassmorphism overlay) + 白色文字 |
| `commercial` | 纯文字直排（大黑体），无遮罩（底图已留白） |
| `infographic` / `collage` | 色块标签式排版，每个元素配小色块标题 |
| `comparison` | 左右分栏标注式排版，对比标签 |
| `typography` | 全画面文字排版，底图仅为底纹 |
| `illustration` | 底部半透半栏 + 叠加白色标题 |

---

### Phase 4：🎰 单图精修 "灵感转盘" (In-Canvas Re-roll)

**目标**：15 张图只有某张不满意时，一键切换风格重绘，无需重做整套。

**改动文件**：`CanvasEditor.vue` / `agent_handler.go`

**用户流程**：
1. 在画布编辑器中选中某页
2. 点击工具条新增的 **"🎲 换个氛围"** 按钮
3. 弹出风格快选面板（可选择其他风格方案，或"随机"）
4. 后端仅对该页走一次 Prompt Augmentor → Image API 重绘
5. 新图片通过 WebSocket 推送，Fabric.js 热替换背景 Src

---

### Phase 5：📊 智能 Provider 路由

**目标**：不是所有风格都适合同一个 API。系统应根据风格自动选择最擅长的模型。

**改动文件**：`internal/agent/provider.go`

**路由规则矩阵**：

| 条件 | 选择的 Provider |
|:---|:---|
| 封面图 + 需要精确中文大标题 | Gemini 3 Pro / Ideogram v3 |
| 内页 + 高质量氛围摄影 | Flux Pro |
| 内页 + 3D 图标/扁平插画 | DALL-E 3 / Gemini |
| 需要商品抠图后换背景 | 通义万相 |
| 用户明确指定国内通道 | 豆包即梦 / 文心一格 |

---

### Phase 6：🗂️ Prompt 模板市场 (未来)

**目标**：允许用户/社区贡献和共享高质量 Prompt 模板。

**概念设计**：
- 每个模板包含：风格预览图 + System Prompt + 留白指令 + 推荐 Provider
- 支持用户收藏、评分、Fork 修改
- 后台按热度/评分排序推荐

---

## 五、实施优先级与里程碑

| 阶段 | 功能 | 预计工作量 | 价值 |
|:---:|:---|:---:|:---:|
| **P0** | Phase 1：前端风格选择面板 | 2-3 天 | ⭐⭐⭐⭐⭐ |
| **P0** | Phase 2：Prompt 增程引擎 | 3-4 天 | ⭐⭐⭐⭐⭐ |
| **P1** | Phase 3：Canvas 模板绑定 | 2 天 | ⭐⭐⭐⭐ |
| **P1** | Phase 4：单图灵感转盘 | 1-2 天 | ⭐⭐⭐⭐ |
| **P2** | Phase 5：智能 Provider 路由 | 2 天 | ⭐⭐⭐ |
| **P3** | Phase 6：Prompt 模板市场 | 5+ 天 | ⭐⭐⭐ |

---

## 六、附录：API 接入参考

### Gemini 3 Pro Image Generation
```bash
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent
Authorization: Bearer ${API_KEY}
Content-Type: application/json

{
  "contents": [{"parts": [{"text": "YOUR_PROMPT_HERE"}]}],
  "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
}
```

### Flux Pro (via fal.ai)
```bash
POST https://fal.run/fal-ai/flux-pro
Authorization: Key ${FAL_API_KEY}

{"prompt": "YOUR_PROMPT_HERE", "image_size": "portrait_4_3", "num_images": 1}
```

### Ideogram v3
```bash
POST https://api.ideogram.ai/generate
Api-Key: ${IDEOGRAM_KEY}

{"image_request": {"prompt": "YOUR_PROMPT_HERE", "model": "V_3", "aspect_ratio": "ASPECT_3_4"}}
```

### 通义万相 (via DashScope)
```bash
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
Authorization: Bearer ${DASHSCOPE_KEY}

{"model": "wanx-v1", "input": {"prompt": "YOUR_PROMPT_HERE"}, "parameters": {"n": 1, "size": "768*1024"}}
```
