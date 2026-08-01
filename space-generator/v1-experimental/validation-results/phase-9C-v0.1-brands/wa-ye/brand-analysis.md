# 蛙耶 (wa-ye) 品牌分析报告

**Generated**: 2026-08-01
**Source**: D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\ (9 张 reference 图)
**Method**: 实际 9 张 reference 图视觉证据 + 文本证据提取

---

## 0. 关键纠错

**现有 DNA (`test-cases/regression/projects/wa-ye.dna.json`) 把蛙耶 错标为「体育用品零售 / 运动品牌」** — 这是**错的**。

9 张 reference 图明确显示蛙耶 是 **「炭烧牛蛙 (charcoal-grilled bullfrog) 潮流餐饮品牌」**。证据：

- 图 1 主视觉大字「炭烧牛蛙」（黄色高亮在 "蛙耶" logo 旁）
- 图 2 logo 拆解：黄色色块明确标 "炭烧牛蛙"
- 图 5 菜牌：黑色铸铁锅装的炭烧牛蛙（菜品实拍）
- 图 8 / 9 实际店招 / 商场灯箱 + 桌号 A01（明确是餐饮）
- 图 6 / 7 周边是 T 恤 / 购物袋 / 外卖袋（典型餐饮周边）

> **结论**：空间生成上下文必须从「零售/产品陈列」改为「餐饮/炭烧牛蛙餐厅」。所有 architecture 决策（material / lighting / boundary / commercial reality）都需要按餐饮 / 街边店重写。

---

## 1. 品牌身份

| 字段 | 值 | 证据 |
| --- | --- | --- |
| 品牌名 | 蛙耶 | 所有图 logo 都明确写 "蛙耶" |
| 副标题 / 品类 | 炭烧牛蛙 | 图 1 / 2 / 5 黄色色块明确写 "炭烧牛蛙" |
| 品类 | 餐饮 - 中式炭烤 / 干锅 | 图 5 黑色铸铁锅装的炒牛蛙（与重庆鸡公煲 / 干锅类同） |
| 英文 / 标语 | WOW YEAH! | 图 1 / 4 / 5 logo 旁 |
| 核心 slogan | "蛙够大 肉才多" | 图 1 / 2 / 4 / 6 主标语 |
| 营销子标语 | "只吃肉 不长肉 / 好吃不怕胖 牛蛙我最棒 / 吃蛙耶 好吃到 哇~耶~" | 图 4 / 5 / 8 / 9 |
| 价格定位 | 中端 / 性价比（年轻客群） | 商场店 + 大份牛蛙 + "好吃不上瘾" 类语气 |
| 店面类型 | 商场店为主 (mall_store)，街边店为辅 | 图 8 / 9 商场中悬挂灯箱 + 实景店招 |

## 2. 4 大核心卖点 (来自图 3 icon 行)

1. **健美蛙 高蛋白**（健康价值主张）
2. **100% 活蛙 口感劲爆**（食材新鲜度）
3. **秘制配方 好吃上瘾**（口味成瘾性）
4. **MAX 蛙 够大肉才多**（分量大，主打满足感）

→ 营销叙事：**"大 / 鲜 / 劲 / 上瘾"** 四字锚点，跟 DNA 现存的 "vary / community_area" 等零售语境完全不匹配。

## 3. 视觉系统 (VI)

### 3.1 色卡 (图 3 明确给出色卡)

| 颜色 | HEX | 比例 | 用途 |
| --- | --- | --- | --- |
| 紫色 | `#4116B7` | 50% | 主导色（背景 / 灯箱 / 招牌） |
| 绿色 | `#56CE00` | 35% | 强调色（蛙 IP / T 恤 / 购物袋 / 灯带） |
| 黄色 | `#FFC000` | 15% | 点缀色（"炭烧牛蛙"高亮 / "OPENING" 强调） |

→ **撞色策略** 紫 + 绿 + 黄 是 Y2K / 街头潮流的典型高饱和组合，不是 JZMX 那种"低饱和医疗克制"，也不是 FTT 那种"暖红砖+木" 的烟火气。**这是品牌差异化的核心**。

### 3.2 字体

- 中文：**粗黑体 / 超粗 sans-serif** (类似 OPPO Sans Heavy / 阿里普惠体 Heavy)
- 英文：**WOW YEAH!** 圆体粗体
- 数字 / 数据感强：50% / 35% / 15% (色卡) / A01 (桌号)

→ **拒绝衬线 / 拒绝手写 / 拒绝小字号**。**全部大字号 / 高对比 / 街头感**。

### 3.3 IP 角色

- 树蛙 (绿+橙) — **双手 YEAH 手势**（图 1 摆 pose）
- 简化几何风格（黑色粗描边 + 平涂色块）
- 戴运动鞋 / 穿橙色 hoodie / 紫色裤子（**Y2K 街头穿搭**）
- 衍生：logo 旁的蛙手 icon (图 2) / 4 大卖点的小蛙剪影 (图 3)

→ **这是蛙耶 的视觉锚点 (Anchor)**，比 logo 字本身更易记。空间里需要这个 IP 的物理呈现（墙绘 / 立牌 / 抱枕 / 菜单封面 / 桌贴）。

## 4. 空间类型识别 (从图 8 / 9 实景推断)

| 维度 | 推断 | 证据 |
| --- | --- | --- |
| 商业语境 | 商场餐饮区 (`mall_food_court` 或 `mall_store`) | 图 8 / 9 商场中庭，灯箱悬挂在商场天花 |
| 店面位置 | 商场餐饮楼层的中间或端头，邻铺共存 | 图 9 周边有其他餐厅（君予好鱼 / 牛肉面 / 杨铭宇等） |
| 店面外立面 | **白底 + 黑色/绿色大字 + 蛙 logo + 绿色 LED 灯带** (图 8 下半) | 店招白色基调，配 LED 灯带勾边 |
| 店前营销 | 紫色 / 绿色高饱和吊挂灯箱（带菜品图） | 图 8 / 9 天花悬吊 3-4 块灯箱 |
| 店内情境 | (图 9 看不到店内，但店招暗示有强烈霓虹/LED 元素) | 推断：店内大量 LED / 灯箱 / 灯带 |

→ **空间类型应改为**: `casual_dining_chain` 或 `mall_food_court` (而非 product_display)
→ **不是 product_display, 不是 retail**。是 **"以炭烧牛蛙为主菜的快休闲连锁餐饮"**。

## 5. 客群画像

| 维度 | 推断 | 证据 |
| --- | --- | --- |
| 年龄 | 18-30 岁 (90/00后 / Z 世代) | Y2K 视觉 / "YEAH" 手势 / 街头潮牌搭配 / 大字粗体 |
| 消费场景 | 朋友聚餐 / 情侣约会 / 拍照打卡 | 桌牌 A01 (拍照位) / 外卖袋 / 周边 T 恤 / 强视觉 |
| 消费心理 | 尝鲜 / 性价比 / 拍朋友圈 / 吃牛蛙这件事要"酷" | "好吃不上瘾" / "MAX 蛙够大" / "100% 活蛙" 等营销词 |
| 客单 | 中端（年轻白领 / 学生都消费得起） | 商场店定位 |

→ **不是「运动爱好者/装备升级」**。**是「爱打卡的年轻牛蛙食客」**。

## 6. 设计语言总结

| 维度 | 风格 | DNA 现存描述（错误） |
| --- | --- | --- |
| 空间调性 | Y2K 街头 / 潮玩 / 高饱和 | "raw_industrial_grid" / "spa_atmosphere"（错） |
| 边界 | 软硬混搭（店招硬边界 / 店内软装饰） | "hard boundary" / "elegant_lobby_seating"（错） |
| 材质 | 漆面 / 亚克力 / 不锈钢 / LED 灯箱 / 防水布 (T 恤周边) | "exposed_concrete / metal_grid / rubber_floor"（错） |
| 光 | 直射 + LED 灯带 + 高饱和彩色光（紫绿黄） | "direct_lighting"（对了一半） |
| 色彩 | **高饱和撞色 (紫绿黄)** 是核心签名 | (DNA 没有色卡描述) |
| 装饰 | **蛙 IP 大幅形象** + 营销文案大字号 + 桌号 / 周边 | "feather_like_flow / peacock"（错 — 是从 JZMX 复制的） |

## 7. 原 DNA 错误点 (逐条标注)

| DNA 字段 | 现值 (错) | 应改为 |
| --- | --- | --- |
| `project.industry` | "体育用品零售 / 运动品牌" | "餐饮 / 炭烧牛蛙 / 潮流快餐" |
| `project.category` | "retail" | "restaurant" |
| `project.audience` | ["运动爱好者", "年轻消费者", "装备升级需求"] | ["18-30 岁年轻食客", "打卡 / 拍照 / 尝鲜 / 性价比", "朋友聚餐 / 情侣约会"] |
| `project.brandPositioning` | ["活力", "街头", "功能", "社群"] | ["潮流", "Y2K", "高性价比", "打卡"] |
| `sceneDefinition.sceneType` | "product_display" | "casual_dining" (或 "restaurant_dining") |
| `sceneDefinition.sceneSubtype` | "sporting_goods_floor" | "casual_dining_mall" 或 "charcoal_grill_specialty" |
| `architectureDna.spatialConcept.primary` | "raw_industrial_grid" | "y2k_street_market" / "pop_casual_dining" |
| `architectureDna.geometry.dominant` | ["exposed_concrete", "metal_grid", "open_floor"] | ["lacquered_panel", "acrylic_lighting", "stainless_steel_display"] |
| `architectureDna.boundaryLanguage.enclosure` | "hard" | "soft_to_medium" (店内软 / 店招硬) |
| `functionalDna.customerFlow` | "unclear / unclear / unreadable" (占位) | "entry -> order counter -> seating (40-80 seat) -> optional pickup window" |
| `brandSpaceDna.brandSpirit` | futuristic 0.5 / premium 0.5 | playful 0.7 / youthful 0.7 / energetic 0.8 / cool 0.6 |
| `brandSpaceDna.motifFamily` | "feather_like_flow" | "cartoon_frog_gesture" / "wow_yeah_hand_pose" |
| `brandSpaceDna.literalAssetUsage` | "peacock / flower_sculpture" | "frog IP / 'WOW YEAH' 手势 / 营销大字 / 桌号 / 周边视觉" |
| `materialDna.primaryMaterials` | exposed_concrete / metal_grid / rubber_floor | lacquered_panel / acrylic_lightbox / stainless_steel / printed_graphics |
| `materialDna.accentMaterials` | neon_signage_tube (对) | led_strip / rgb_color_light / printed_poster |
| `materialDna.finish.tactileQuality` | "industrial" | "lacquered" / "printed" / "bright" |
| `lightingDna.brandLight.hueFamily` | "neon_brand_color" | "brand_purple_#4116B7 + brand_green_#56CE00 + brand_yellow_#FFC000" |
| `compositionDna.focalHierarchy.primary` | "product_wall_with_brand_mural" | "brand_logo_wall + 蛙 IP 大幅形象 + 招牌菜灯箱" |
| `negativeConstraints.prohibit` | "white_curved_walls / spa / hospital / fine_dining" (从 JZMX 复制) | "传统中式中餐包间 / 怀旧风 / 民俗 / 婚礼主题 / 高端日式" 等 (基于餐饮语境) |

---

## 8. 空间生成方向建议 (per Phase 9C prompt compiler 视角)

如果重新跑 Phase 9C，**4 个 JSON 文件应这样写**：

### 8.1 spatial-intent.json (Phase 9A.1) - 5 字段

```json
{
  "primaryEmotion": "让 18-30 岁年轻食客在商场餐饮区被高饱和撞色 + 蛙 IP + WOW YEAH 视觉吸引, 在拍照打卡中进入, 在炭烧牛蛙大份量的满足感中结束, 留下可以发朋友圈的视觉记忆",
  "userJourney": "商场路过被紫色/绿色/黄色撞色灯箱吸引 → 看到蛙 IP 手势和 '蛙够大 肉才多' slogan 确认品牌 → 看菜单灯箱确认招牌菜 → 进店点单 → 拍照打卡桌号 → 上菜时黑色铸铁锅炭烧牛蛙触发 '好吃到哇~耶~' 体验 → 离开时带走 T 恤/外卖袋/购物袋周边",
  "spaceRole": "空间作为'高饱和潮流餐饮容器', 把炭烧牛蛙的食材能量 + 蛙 IP 街头气质 + 商场餐饮的高可见度三者结合, 让 '吃蛙' 这件事变得'酷'而不只是 '饱'",
  "designLogic": "通过 紫色 50% + 绿色 35% + 黄色 15% 高饱和撞色 + 蛙 IP 反复出现 (logo / 墙绘 / 桌贴 / 周边) + LED 灯带勾边 + 大字粗黑体 slogan, 让 '炭烧牛蛙' 的烟火气被翻译为'潮酷打卡'而不是'传统中餐'",
  "architecturalReason": "需要 漆面+亚克力+LED 灯带 + 高饱和色光 + 蛙 IP 形象墙 + 招牌菜灯箱 五者协同, 让 '炭烧牛蛙 + 潮流' 变成可被感知的空间语言, 而不是 '传统中餐 + 烟火气'"
}
```

### 8.2 spatial-reality.json (Phase 9B.1) - 8 字段

```json
{
  "spaceType": "casual_dining_chain_specialty",
  "commercialScale": "80-150 sqm 商场餐饮店面, 30-50 seat, 翻台率 2-3 轮 / 晚, 主打炭烧牛蛙 1 个核心菜 + 6-8 个配菜",
  "requiredZones": ["点单 counter", "堂食 seating_area (40-60 seat)", "出餐 pass", "招牌菜灯箱 menu_lightbox", "蛙 IP 形象墙 logo_wall", "拍照打卡位 photo_spot", "洗手间 access"],
  "operationLogic": "visible open kitchen (明档) + 黑色铸铁锅炭烧 + 高峰期 staff 6-10 人 + 商场中庭悬挂灯箱做高可见度 marketing",
  "userFlow": "商场中庭 -> 灯箱吸引 -> 门口点单 counter -> 堂食 seating -> 上炭烧牛蛙 -> 拍照 -> 离开 (可外带)",
  "privacyRequirement": "mostly open dining, 桌椅间距 ≥ 0.8m staff 通行, 无 enclosed private room, 偶有 1-2 个 semi-private booth 4-6 人",
  "materialReality": "漆面金属板 (lacquered metal panel) + 亚克力灯箱 (acrylic lightbox) + LED 灯带 (LED strip) + 不锈钢台面 (stainless steel counter) + 防水布周边 (printed tote / T 恤). 不可出现: 传统红木 / 中式屏风 / 民俗装饰 / 婚礼主题 / 高端日式枯山水 / 怀旧风",
  "forbiddenSpatialTypes": ["fine dining (无桌布 / 无水晶灯)", "传统中餐包间 (无红木屏风)", "高端日式 (无枯山水 / 无原木格栅)", "怀旧国风 (无 80 年代感)", "婚礼主题 (无大红 / 无喜字)", "spa / 医美 / 医院 (无白墙曲线 / 无 SPA 灯)", "现代艺术馆 (白盒+雕塑)"]
}
```

### 8.3 architecture-preservation.json (Phase 9B.2) - 3 字段

```json
{
  "enabled": true,
  "weight": 0.6,
  "protectedElements": [
    "spatial_signature (高饱和撞色 + 蛙 IP 反复出现 + 商场中庭灯箱可见度)",
    "material_expression (漆面 / 亚克力灯箱 / LED 灯带, 不要原木/石材/水磨石)",
    "lighting_behavior (直射 + 高饱和彩色光 紫绿黄, 不要 warm_ambient_soft)"
  ]
}
```

---

## 9. 结论

1. **现有 wa-ye.dna.json 严重错位**：是从「体育用品零售」框架套的，9 张 reference 图全部反驳。
2. **数据缺失不是因为 4 文件不全**，是 **dna.json 本身就是错的**。补 spatial-intent / spatial-reality / architecture-preservation 之前必须先修 dna。
3. **建议下一步**:
   - (a) 重写 `test-cases/regression/projects/wa-ye.dna.json` 反映炭烧牛蛙真实身份
   - (b) 新建 `field-schema/examples/wa-ye.spatial-intent.json` (用 §8.1 草案)
   - (c) 新建 `spatial-reality/examples/wa-ye.spatial-reality.json` (用 §8.2 草案)
   - (d) 新建 `architecture-preservation/examples/wa-ye.architecture-preservation.json` (用 §8.3 草案)
   - (e) 然后用 Phase 9C 16 块 prompt 重新跑 1 张 16:9 (跟 FTT / YJLF 一致模式)

## 10. Reference 来源

- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-26.png (137KB) — 主视觉
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-27.png (160KB) — Logo 拆解
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-28.png (121KB) — 色卡 + 4 icon
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-29.png (223KB) — 营销文案矩阵 + 桌号
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-30.png (873KB) — 菜牌
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-31.png (585KB) — 周边 T 恤 + 外卖袋
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-32.png (1.1MB) — 周边购物袋 + 桌牌
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-33.png (1.6MB) — **实景店招 + 商场灯箱**
- D:\Masterpiece-OS\projects\蛙耶\蛙耶原视觉方案\未标题-1-34.png (1.6MB) — **实景空间 (商场餐饮区)**
