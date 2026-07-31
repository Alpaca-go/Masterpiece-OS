# 九州美学空间图 v1.1 收尾验收

日期：2026-07-30
最终状态：`production_pass`
Provider / Model：Volcengine / `doubao-seedream-5-0-pro-260628`

## 结论

v1.1 限定的收尾任务已经完成，没有新增模板，也没有把 Golden Prompt 或九州美学视觉词硬编码到通用生产链路。

- B 组结果冻结为 `pass_with_residual_risk` 回归基线。
- Prompt Compiler 增加自然人物行为和平台功能关系，但只在任务证据/契约存在相应内容时编译。
- 正式交付采用 `Blank Identity Area + Post Composite`：Seedream 生成阶段不绘制 Logo 或文字，生成后仅使用用户确认的原始资产受控合成。
- 同一份自动 Prompt 连续实跑三次：2/3 强通过，3/3 保持核心方向，通过 v1.1 稳定性标准。

## Prompt 修正前后差异

| 项目 | B 组修正前 | v1.1 收尾后 |
|---|---|---|
| 人物行为 | 无明确人物使用状态 | 1–3 位自然中国成年人，仅作为尺度和使用证据；允许接待、等候、咨询、展示或合作交流；禁止摆拍、自拍、迎宾列队、注射、护理床和广告人像 |
| 平台关系 | 平台身份成立，但功能协同主要靠空间暗示 | 至少自然连接接待、咨询、能力展示、合作沟通、等候、后方专业区中的两类；禁止数据墙、零售货架、展会图文和诊疗场景 |
| Logo | 允许模型依据 identity reference 生成，存在近似重绘风险 | `post_composite` 模式要求干净正向留白，并明确禁止生成 Logo、品牌文字、英文或 slogan |
| Provider 引用 | B 请求 `referenceCount=1`，但任务快照把锁定 Logo ID 错记为 `reference_style` | 修复锁定 Logo ID 的语义角色映射；identity-reference 路径会发送 `identity_reference`。本次正式交付路径刻意为 `referenceCount=0`，消除模型重绘漂移 |
| 生产交付 | 生成图即最终图 | 成功生成图 + 用户显式确认 + 原始 Logo 可追溯裁切 + 受控位置合成 + SHA-256 审计 |

冻结文件：

- [B 组回归基线](./baseline-b-pass-with-residual-risk.json)
- [v1.1 生产回归基线](./production-baseline.json)
- [v1.1 自动 Prompt](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation-vnext/compilations/vnext-task-3ca27617-8b0d-4b9a-84f9-33852f005fb3/compiled-prompt.md>)

## 三次同 Prompt 稳定性实测

共同条件：

- Task：`vnext-task-3ca27617-8b0d-4b9a-84f9-33852f005fb3`
- Prompt version：`9759648a10d23223ce19c92ea7208742c261c99d80792f7240d117fb3a5771ea`
- Prompt SHA-256：`c849e207bcd4b8e6f170c1205c1c16321233f01b570b5e8ad1474673ad871711`
- 三次请求的模型、Prompt、Task Contract 相同；每次模型调用数均为 1，`referenceCount=0`。

| 样本 | Run | 耗时 | 结果 | 验收说明 |
|---|---|---:|---|---|
| 1 / 人物行为主验收 | `caff9043-c1fe-4a56-bc07-88264245356c` | 94,768 ms | strong pass | 3 人；前景自然等候/阅读，中景两人沟通，后景接待；人物不抢主体，尺度和使用关系明确 |
| 2 / 平台协同主验收 | `b2f2b8a2-3ea7-44eb-9847-ee38a91d0f74` | 84,728 ms | strong pass | 咨询交流、等候、接待及后方连接可识别；留白、半透明结构和白灰主体稳定 |
| 3 / 风险样本 | `9f63a824-260e-4f2d-9bca-9abacc6e0977` | 94,607 ms | partial pass | 核心色材和空间方向保持，但中央羽毛界面权重偏高，局部陈列略有零售感 |

实测图：

- [人物行为测试图 / 样本 1](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/caff9043-c1fe-4a56-bc07-88264245356c/images/image-01.png>)
- [平台协同测试图 / 样本 2](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/b2f2b8a2-3ea7-44eb-9847-ee38a91d0f74/images/image-01.png>)
- [稳定性风险样本 / 样本 3](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/9f63a824-260e-4f2d-9bca-9abacc6e0977/images/image-01.png>)

判定：强通过率 `2/3`，核心方向保持率 `3/3`。没有出现旧 A 组的原木办公、茶空间、高饱和紫色或单一巨型紫色羽毛失败方向。

## Logo 资产真实性与后合成

B 组旧请求确实携带了资产，但仅能证明模型收到参考，不能证明最终像素来自原始 Logo；同时旧任务快照的资产角色为 `reference_style`，因此 v1.1 将 B 的 `logoAssetAccuracy` 保持为历史待验，不倒推为通过。

本轮正式路径的可核验事实：

- Project asset ID：`e6b766fd-d25a-41b4-a78f-b5d547eca93f`
- 原文件：`九州美学视觉方案-11.png`
- 确认来源：`user_confirmed`
- Logo 来源 SHA-256：`cdf8f6087c6ffbe7bdc3458374bcb1f45d9e2f005f6fb0af8c1a76b20603d270`
- 原图裁切：`left=970, top=365, width=510, height=285`
- 输出位置：`x=0.72, y=0.41, width=0.10`
- 输出 SHA-256：`39187256247c7153a39b0ebcc915737655afa09636a5edaf99649b2db9e0f579`
- 审计记录：[logo-post-composite.json](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/caff9043-c1fe-4a56-bc07-88264245356c/logo-post-composite.json>)
- 交付测试图：[真实 Logo 后合成图](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/caff9043-c1fe-4a56-bc07-88264245356c/images/image-01.post-composite.png>)

该路径保留 Logo 源像素，不让生成模型设计、改字或重绘 Logo。当前实现是可审计的二维受控合成，不伪称自动完成墙面透视变形或三维材质融合。

## `production_pass` 最终验收表

| # | 标准 | 结果 | 证据 |
|---:|---|---:|---|
| 1 | 明确属于九州美学 | pass | 白灰半透明体系、分散羽毛曲线及真实 Logo 交付 |
| 2 | 高端医美全链生态平台 | pass | Task Contract 与接待、咨询/沟通、等候、后方连接共同表达 |
| 3 | 东方生命美学、医疗专业、未来材料并存 | pass | 三次均保持克制曲线、精密节点和半透明材料 |
| 4 | 羽毛语言进入多个空间界面 | pass | 顶面、隔断、墙面和滤光界面共同承载 |
| 5 | 白、暖灰、矿物灰、半透明材质为主体 | pass | 三个样本均成立 |
| 6 | 紫色仅作克制强调 | pass | 结构收边、软装与 Logo 小面积使用 |
| 7 | 光线、材料、尺度和动线可信 | pass | 单一透视、前中后景、真实人物尺度及连续通路 |
| 8 | 至少一种自然人物行为 | pass | 样本 1 等候/阅读及沟通；样本 2 咨询交流 |
| 9 | 至少两类平台功能关系 | pass | 接待 + 等候 + 咨询/沟通 + 后方连接 |
| 10 | 不像错误空间类型 | pass | 2/3 强通过；风险样本仅局部陈列略偏零售，未改变核心类型 |
| 11 | Logo 来源可追溯 | pass | asset ID、项目相对路径、确认来源、裁切和 SHA 全部落盘 |
| 12 | 正式交付使用真实 Logo | pass | 后合成直接采用确认资产像素 |
| 13 | 无随机文字、错误英文和虚构 slogan | pass | Seedream 阶段禁止全部文字；后贴内容仅来自确认 Logo |
| 14 | 同 Prompt 三次至少两次稳定通过 | pass | strong pass 2/3，核心方向 3/3 |
| 15 | 不依赖复制 Golden Prompt | pass | Prompt 由 Visual Decision Packet / Task Contract 自动编译 |
| 16 | 非九州项目不继承专属语言 | pass | 规则由当前任务证据触发；既有餐饮、节庆反过拟合回归继续通过 |

## 保留风险

样本 3 表明随机生成仍可能提高羽毛界面权重或产生轻微零售陈列感。因此 `production_pass` 表示链路满足 v1.1 的 2/3 生产门槛，不表示每次随机生成都无需人工选片。正式交付仍应保留多样本选择和 Logo 后合成步骤。
