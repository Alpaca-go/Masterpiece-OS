# 商场 / 街面 · 快取快餐（mall-quick-service）

状态：**草案（无自有验收背书）。** 机器可读副本：`packages/visual-workflow/src/knowledge/style-presets.js`。改这里时同步改那里。

> 说明：这张卡完全来自第三方案例观察，按知识库规则**不能当结论**，只能作为"选风格的起点"。它的作用是对照 `community-street-smoke`：同一套系统里，快取品类不该被画成老店。

## 一句话气质

明亮、干净、效率优先：门头一眼看懂卖什么，品牌色可以放大，文字少，座位轻，不做旧也不做暗。

## 适用 / 不适用

- **适用**：商场或街面快餐、粉面、冒菜、卤味档口；午市为主；即取即走、翻台快；有标准化物料系统。
- **不适用（相邻气质）**：正餐、宴请、需要久坐或包间、以氛围为卖点的社区小馆。
  - 社区烟火气 → 见 [community-street-smoke](community-street-smoke.md)
  - 牛肉零售 + 轻餐 → 参考 [大山牛夫](../restaurant-cases/dashanniufu-beef-market.md)
  - 连锁卤味档口 → 参考 [良卤有品](../restaurant-cases/lianglu-youpin-hot-braise.md)

## 杠杆取值（对齐 styleControls）

| 轴 | 取值 | 说明 |
|---|---|---|
| `lighting` | `bright` | 明亮可读；不做暗场 |
| `density` | `balanced` | 桌距紧但要留出取餐动线 |
| `materials` | `mixed` | 浅木/金属/白瓷砖混合，不追求年代感 |
| `brandColorArea` | `half` | 品牌色可以放大到门头与物料 |
| `tradition` | `modern` | 不做仿旧 |
| `props` | `lived_in` | 少量真实食物与餐具，但不堆生活杂物 |
| `shot` | `designer_choice` | 由表单决定 |
| `textDensity` | `minimal` | 文字只留门头与一块菜单屏 |
| `priceDisplay` | `none` | 默认不出数字价格（真实菜单才 `real_menu`） |

## 反漂移信号（出现就是跑偏）

| 信号（Prompt 内的英文词） | 为什么是跑偏 |
|---|---|
| `warm dim` / `dimly lit` / `low light level` | 快餐要可读；压暗像打烊或酒馆 |
| `aged wood` / `weathered wood` | 旧木会把快餐拉成老店 |
| `red brick` | 红砖是社区烟火气的材料语言，用错业态 |
| `tavern` / `speakeasy` / `pub-like` | 酒馆氛围降低日间可读性 |
| `carpet` / `carpeted` | 不适合高频清洁与推车动线 |

## 边界与成立前提

- 商场或街面、午市为主、即取即走；有标准化物料与供应链。
- 客单低、靠出杯量；堂食座位只是补充。
- 需要稳定供电与网络支撑电子菜单屏；否则保留墙面菜单备份。

## 证据

- [嘿！有家小冒菜](../restaurant-cases/hei-youjia-maocai.md)：白底橙字灯箱 + 长条高桌 + 裸露天棚 + 橙色地砖；`warm-low-light` 在这里是**反例**（快餐不需要压暗）。
- [良卤有品 · 热卤社](../restaurant-cases/lianglu-youpin-hot-braise.md)：橙色包边 + 悬吊木格栅 + 前场冷柜 + 高脚桌；菜单统一标价。
- [大茶饭 · 招牌巷子粉铺](../restaurant-cases/dachafan-powder-shop.md)：**边界样本**——小面积但走老招牌气质，说明"面积小"不等于"必须快取"。

## 待补

- 没有任何自有验收项目支撑，轴取值是"从第三方案例归纳的猜测"，第一次真实使用后必须回填结果。
- `brandColorArea: half` 是观察值，不是验证值：良卤/冒菜把橙色用到大面积，但和谷记（中高端）反着来——面积与客单的关系尚未验证。
- 缺"外卖/外带比例"这一维度对取值的影响（本卡假设外带占比高）。
