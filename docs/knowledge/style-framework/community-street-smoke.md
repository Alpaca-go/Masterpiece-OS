# 社区底商 · 烟火气（community-street-smoke）

状态：**草案。** 机器可读副本：`packages/visual-workflow/src/knowledge/style-presets.js`。改这里时同步改那里。

## 一句话气质

街坊每天来一趟的小馆：暖黄偏暗、暗部保住、有人有锅有蒸汽，红砖旧木黄铜为主材，品牌色只做点缀。

## 适用 / 不适用

- **适用**：社区或街边底商；正餐、粉面、小吃；晚餐为主；客单中低；层高允许吊灯与木构；排烟允许开放明档。
- **不适用（相邻气质）**：商场店、日间快餐、外卖为主的档口、需要明亮效率的即取即走场景、高端宴请。
  - 快取/快餐 → 见 [mall-quick-service](mall-quick-service.md)
  - 老火锅/重口夜宵 → 参考 [辣三俏](../restaurant-cases/lasanqiao-charcoal-hotpot.md)（暗、红、布灯笼）
  - 中高端家常菜 → 参考 [和谷记](../restaurant-cases/shangshanruoshui-heguji.md)（白桌布、包厢、深绿黄铜）

## 杠杆取值（对齐 styleControls）

| 轴 | 取值 | 说明 |
|---|---|---|
| `lighting` | `warm_dim` | 暖黄偏暗、保留暗部；桌面与明档要可读 |
| `density` | `dense` | 人、锅具、蒸汽、备餐台；动线仍要通 |
| `materials` | `brick_wood` | 红砖/赤陶/深旧木/黄铜；不做亮面不锈钢当主材 |
| `brandColorArea` | `accent` | 品牌色只在字标、菜单、器皿 |
| `tradition` | `balanced` | 传统作结构（木构、厝角），不作戏服（脸谱/灯笼阵） |
| `props` | `lived_in` | 食材筐、蒸笼、碗碟；不发明素材里没有的 |
| `shot` | `designer_choice` | 由表单的镜头/构图决定，不在此重复 |
| `textDensity` | `moderate` | `minimal` 会连密度一起削弱（实测过） |
| `priceDisplay` | `none` | 默认不出数字价格 |

## 反漂移信号（出现就是跑偏）

| 信号（Prompt 内的英文词） | 为什么是跑偏 |
|---|---|
| `white wall` | 白墙 + 均匀明亮是商场快餐的第一信号 |
| `evenly lit` / `even lighting` / `uniform lighting` | 均匀明亮把暗部全提亮；烟火气靠明暗差 |
| `cool white` / `5000k` / `6000k` / `daylight white` | 冷白光把暖材料打冷，变办公楼食堂 |
| `metal exhaust hood` / `stainless steel hood` | 设备抢品牌位置；烟罩应收进木构 |
| `curtain wall` / `glass curtain` | 商场旗舰语言，会把街边小馆做成商场店 |
| `menu wall` / `wall of text panels` | 密度被换成文字；密度应由人与物件承担 |
| `empty room` / `no people` / `vacant` | 没有人、没有蒸汽，只是装修 |
| `glossy floor` / `polished tiles` | 亮面地砖 + 白墙 = 展厅感 |

## 边界与成立前提

- 街面可见、层高允许木构与吊灯；排烟允许开放明档。
- 客群接受"旧、暗、挤"；做清汤/家庭/商务场景不成立。
- 布、纸、竹都是吸味材料，必须有强排烟与可拆洗方案。
- 暖黄不等于昏暗：柜台、菜单、桌面必须可读。

## 证据

- [冯烫烫 · 已验收 v8](../restaurant-cases/ftt-feng-tang-tang.md)：分析原文的默认提案是「浅色木 + 黑色不锈钢 + 3500K 明亮」，人工覆盖为「红砖 + 深色旧木 + 赤陶 + 铜器 + 暖黄偏暗」；v8 验收。
- [candidate-rules.md](../restaurant-cases/candidate-rules.md)：潮牛帮对照（暖光 + 密度 + 烟罩收进木构），蛙耶反例（注入诱发道具幻觉，改用 guardrail 后消失）。
- 反漂移清单里的"冷白光/白墙/均匀明亮"来自 v1 的实际失败；"菜单墙"来自 `lived-in-detail` 与 `textDensity` 两组对照。

## 待补

- 只有冯烫烫一个自有验收项目，轴取值仍属草案；需要第二个自有社区店做"默认 vs 套用气质"的对照。
- 缺"该有的没出现"的检查（例如画面里必须有蒸汽/备餐动作，现在预检查不了缺项）。
- `lighting` 的"多暗算对"没有量化口径，目前只能靠人工验收。
