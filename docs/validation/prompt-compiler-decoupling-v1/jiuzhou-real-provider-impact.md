# 九州美学去耦合后真实生图影响记录

日期：2026-07-30

## 运行条件

- 复用项目：九州美学 `f67ac606-5b60-4cc9-9955-5aa43ecbab16`
- 复用既有 Visual Decision Packet，不重跑分析
- Compiler：`vnext-prompt-compiler 3.3.0`
- Provider：Volcengine
- Model：`doubao-seedream-5-0-pro-260628`
- 模型调用：1 次
- 终态：`succeeded`
- 用时：103,869 ms
- Prompt：6,106 字符，12/12 必需模块完整，0 冲突，16 组九州回溯信号无缺失
- 生成 Run：`a51b821a-f7f0-4941-9430-8dce9402b1b3`

## 产物

- Prompt：`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-f67ac606\image-generation-vnext\compilations\vnext-task-66267f25-b129-4626-bd30-c82e12fc65a2\compiled-prompt.md`
- 图片：`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-f67ac606\image-generation\a51b821a-f7f0-4941-9430-8dce9402b1b3\images\image-01.png`

## 与 Golden 成功图的视觉对照

保留项：

- 白灰基底、紫色品牌点缀、半透明材料和羽毛曲线仍然稳定。
- 输出是完整的接待空间，而不是 VI 展示板或拼贴。
- 材料透射、空间进深、接待台和咨询界面的表现可信。

退化项：

- 没有人物、咨询或合作行为，空间的平台协同属性无法从画面中成立。
- 右侧产品陈列使结果更接近消费型医美门店。
- 羽毛仍然形成大尺度主导性构件，未完全遵守“分散转译、禁止巨型装置”。
- 功能关系主要停留在接待、等候和玻璃咨询间，没有呈现成功图中的复合使用与人物尺度。

## 根因判断

Compiler 的关键词行业注入已经移除，静态门禁仍为零违规。此次退化来自两处结构化输入：

1. 既有 Packet 的 `functionalRelationships` 和 `peopleBehavior` 为空；去除公共注入后，Compiler 按设计不再替项目补写人物和平台协同。
2. 既有 Packet 的 `brandIntegration` 与 `sceneProgram` 仍明确包含产品展示柜、治疗/恢复区等旧分析决策，因此这些内容仍会合法进入 Prompt。

结论：去耦合本身有效，但历史 Packet 需要重新分析或人工修订为当前结构化字段，才能在不恢复行业硬编码的前提下保持 Golden 图的平台协同表现。

## 运行中发现并修复的兼容问题

旧的已完成项目在 `promptSourceObject` 已存在时，没有继续迁移其 Visual Decision Packet。读取后缺少 `sceneProgram`，首次编译以 `VISUAL_DECISION_PACKET_INSUFFICIENT` 正确阻断，未调用模型。

读取迁移现已改为始终执行：

- 旧 `functionalExperience` 仅做结构重命名，迁移到 `sceneProgram`。
- 不增加行业、项目或九州专属内容。
- 新增持久化旧 Packet 的读取回归测试。
