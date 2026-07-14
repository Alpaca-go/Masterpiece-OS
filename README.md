# Design Factory OS

Design Factory OS v3.0 是一个以 **Creative Reasoning（设计推理）** 为核心的品牌视觉分析与图片规划工具。它不再把更多评审步骤当作默认流程，而是先建立品牌视觉 DNA，再生成可以直接交给 Chat 使用的图片任务包。

默认工作流：

```text
Brand Lock
→ Benchmark Analysis
→ Creative Reasoning
→ Image Planning
→ Chat 生图任务包
```

Creative Reasoning 负责输出品牌定位、关键词、气质、视觉 DNA、摄影语言、创意方向与 Design Risks。它不是 Prompt，也不是图片清单，而是所有新增图片共同继承的设计意图。

## 环境

- Node.js 20 或更高版本
- 无第三方运行依赖，无需 `npm install`

## 快速开始

将项目放入 `projects/<项目名称>/`，然后执行：

```bash
npm run analyze -- --project "我的品牌" --online
```

系统会安全创建 `input/` 与 `outputs/`，把项目根目录素材整理到 `input/`，不覆盖同名文件，也不打散子目录。

### Fast Mode（默认）

只执行高质量设计沟通所需的核心链路：

```bash
npm run analyze -- --project "我的品牌"
```

输出：

- `01-项目分析报告.md`
- `02-Chat生图任务包.md`

### Review Mode（可选）

需要 Knowledge Review、Design Review 和成长记录时执行：

```bash
npm run analyze -- --project "我的品牌" --mode review
```

或使用快捷参数：

```bash
npm run analyze -- --project "我的品牌" --review
```

额外输出：

- `03-Knowledge-Review.md`
- `04-Design-Review.md`

### Research Mode（开发）

用于知识研究和系统维护：

```bash
npm run analyze -- --project "我的品牌" --mode research
```

Research Mode 仍然只读正式 Knowledge，不会自动修改 Rule、Prompt、Template，也不会执行 Git 操作。

三种模式都不会新增第五份 Markdown。`--debug` 仅用于额外输出结构化 JSON。

## 逐张视觉核验

Creative Reasoning 不能把文件名、OCR、尺寸或元数据当作画面事实。高质量项目应先实际查看全部图片，然后在 `design-factory.json` 记录核验状态与视觉结论：

```json
{
  "visualInspection": {
    "verified": true,
    "inspectedImageCount": 12,
    "inspectedImages": ["01.png", "02.png"],
    "findings": [
      "主视觉均采用左文右图结构",
      "产品摄影使用暖色侧逆光和真实接触阴影"
    ]
  }
}
```

只有 `verified=true` 且核验数量覆盖全部图片时，报告才显示视觉核验已闭环；否则构图、留白、摄影和工艺等无法确认的信息会明确保留“待确认”。

## Creative Reasoning 配置

项目负责人可以把实际视觉分析写入配置，优先级高于通用回退：

```json
{
  "creativeReasoning": {
    "positioning": {
      "summary": "当代东方生活方式品牌",
      "evidence": ["来自包装、空间和社交传播画面"]
    },
    "keywords": [
      { "keyword": "克制", "reason": "画面元素少且留白稳定" }
    ],
    "temperament": {
      "summary": "温和、理性、高级",
      "evidence": ["低饱和色彩与稳定网格"]
    },
    "visualDNA": {
      "color": "深红为主、米白为底",
      "composition": "单一 Hero 主体与清晰信息层级",
      "whitespace": "保留稳定呼吸区",
      "photography": "柔和侧光、真实阴影",
      "packaging": "不得改变已确认盒型",
      "craft": "使用无涂布纸与压凹",
      "mustKeep": ["品牌主色", "授权 Logo"],
      "mustAvoid": ["霓虹渐变", "虚构包装结构"]
    },
    "photographyLanguage": {
      "lighting": "柔和侧光",
      "lens": "50mm 平视",
      "materials": "真实纸张和木材",
      "atmosphere": "安静、温暖"
    },
    "creativeDirection": "用克制留白和真实材质表达当代东方感。",
    "designRisks": [
      {
        "problem": "Hero 主体容易过小",
        "reason": "留白比例较高",
        "prevention": "确保主体承担第一视觉"
      }
    ]
  }
}
```

完整空模板见 `templates/design-factory.json`。

## Chat 生图任务包

v3.0 任务包分为两层：

1. `品牌设计意图`：Brand Lock、定位、关键词、视觉 DNA、摄影语言、创意方向、必须保留与禁止出现。
2. `图片任务`：PKG、VI、Poster 等执行卡，默认完整继承第一层约束。

因此不需要在每张任务中重新分析或重复解释品牌。

## 安全边界

- 未确认品牌事实不会被包装成确定结论。
- Fast Mode 不读取 Approved Knowledge，不运行 Design Review，也不写成长历史。
- Review/Research Mode 对 `knowledge/approved/` 始终只读。
- 引擎不会自动修改 Knowledge、Rule、Prompt 或 Template。
- 引擎不会执行 Git Commit 或 Push。
- 真实 `projects/` 内容和 `history/reviews/` 记录由 Git 忽略。

## 开发与测试

```bash
npm test
npm run test:regression
```

测试覆盖 Creative Reasoning、视觉核验状态、两层任务包、Fast/Review/Research 模式、四份文件上限、Knowledge 只读边界、项目初始化和三个匿名回归项目。

更多说明见 [使用手册](docs/使用手册.md)、[架构说明](docs/架构说明.md)、[项目自动初始化](docs/项目自动初始化.md) 与 [GitHub 文件管理规范](docs/GitHub文件管理规范.md)。
