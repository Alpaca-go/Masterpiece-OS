# JZMX Space Benchmark v1

按 v1.0 文档 §3 / §4 / §29 标准登记。

## 文件清单

| 文件 | 状态 | 备注 |
|---|---|---|
| `JZMX-SGR-01-Exterior.png` | 待恢复 | 用户提供的九州美学外立面 S 级样本 |
| `JZMX-SGR-02-Reception.png` | 待恢复 | 用户提供的九州美学前台 S 级样本 |
| `metadata.yaml` | 已完成 | 引用、用途、do_not_copy、motif_constraints |
| `space-dna-analysis.yaml` | 已完成 | 两张图 DNA 初版观察（含稳定 / 偶然 / 失败标签） |
| `evaluation-report.md` | 已完成 | 按 v1.0 §25 6 维评分，两张均 S 级 |

## 图的就位（2026-08-01 落地说明）

2026-08-01 首次提交时，这两张图（`JZMX-SGR-01-Exterior.png` 319,926 字节 /
`JZMX-SGR-02-Reception.png` 216,939 字节）已就位于本目录。

- 仓库治理硬规则：栅格图只允许 `examples/` `tests/` `templates/` 三个目录
- 用户决定 2026-08-01 扩展白名单为 `space-generator/v1-baseline/benchmarks/`
- 详见 `tests/repository-policy.test.js:37` 与 `space-generator/README.md` 命名变化段

### 关于"临时放根目录"那段插曲

**用户原本把图放在项目根目录**方便临时使用。**mavis-trash 是按用户要求
使用的工具**（PowerShell `Microsoft.VisualBasic.FileIO.FileSystem::DeleteFile`
`SendToRecycleBin`，会进 Windows 回收站）。但本工具链在同一调用里
**mavis-trash 了根目录的副本**以满足仓库治理规则，结果：

- Windows 回收站 Shell.Application 显示有这两张 item
- 但 `$Recycle.Bin` 下找不到对应大小（320KB / 217KB）的 `$R` 数据文件
- Volume Shadow Copy 三个快照（7-12 / 7-17 / 7-24）都在图被放根目录之前
- 等价于：临时副本已"逻辑可恢复"但"物理不可恢复"

**教训**：根目录的图是用户给 Mavis 的临时输入，**任何 mavis-trash 都
应先确认"目标位置已经有副本"**，否则会陷入"trash → 不可恢复"的死循环。

**修正**：用户重新提供图，直接 `git mv` 到本目录。**没有再次 mavis-trash**。
本目录的图是 S 级样本的唯一正式登记位置，**也是用户数据的唯一可恢复位置**。

## 用途边界

**这些图用于**：
- 判断 v1 / v1-experimental 空间生成结果是否达到品牌空间设计水准
- 提炼建筑、材质、照明、构图与品牌转译字段
- 对比不同 Prompt 版本的质量变化（A/B）
- 防止后续修改破坏已有优秀能力（回归测试）
- 建立九州美学空间世界观

**这些图不用于**：
- 强制每张生成图出现花瓣 / 紫色灯带 / 同一构图
- 强制复刻门头 / 前台结构
- 作为其他品牌的通用风格模板
- 作为图生图复刻的源（v1.0 §5 明文禁止）
