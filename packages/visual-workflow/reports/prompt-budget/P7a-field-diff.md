# P7a 完整字段差异

基于P7已确认记录，不回退P6。六字段以职责分工去重，其余字段逐值冻结；来源说明只更新本轮授权。

## structureLanguage

344 → 114 字符。删除重复五节点枚举、坐席与私密界面详述，分别由网络/可见/关系承载；结构字段只保留入口退让、厅宽顶面与珠光建筑连接。

合并后承载位置：functionalNetwork、compositionRequirements。

修改前：

~~~text
接待主厅：入口及开放公共到达区直接展开为完整横向主厅；完整前台为主要服务锚点，成组候客与其横向相连，单个半开放面询在主厅边缘，后续私密服务入口受屏蔽。
接待主厅：入口框景退让公共到达视廊，左前景开放地面连续通向前台与候客；建筑界面提供远近层次而不压缩厅宽，视线越过入口直接读出主厅，不以新实体巨墙替代围合。
接待主厅：一套珠光半透明曲面与侧向建筑界面连续连接，局部延伸至上部边界，并以通透转折界定候客至面询的服务递进；完整主曲面、少量辅助薄层、薄边与层间深度共同组织空间节奏，中央及前台上方顶面完整。
接待主厅：边缘面询以短段局部透光界面保护隐私；一张可从两侧就坐的独立工作台分开操作侧与顾客侧，两椅隔台面对面、各有进出，显示屏转向双方；私密入口的错位遮挡仅在面询之后，不延伸进到达视廊。
~~~

修改后：

~~~text
接待主厅：入口框景退让，左前景开放地面与视廊直接展开横向主厅；建筑界面提供纵深而不以巨墙压缩厅宽，中央及前台顶面完整。
接待主厅：单套珠光曲面连续连接侧向建筑与局部上部边界，以通透转折界定候客至面询的递进，局部收束并让出主通行。
~~~

## functionalNetwork

818 → 247 字符。四行合成单条完整服务拓扑；前台正面/员工侧、候客家具、相向席位细节不在网络重复，均由可见要求完整保留。

合并后承载位置：visibleRequirements、functionalRelationships。

修改前：

~~~text
Reception: arrival reveals the complete reception as the primary service anchor; service front, staff worktop, staff access and visitor approach are readable at credible scale.
Reception: the complete counter and grouped waiting area connect laterally across the open hall, with generous circulation rather than a narrow central corridor.
Reception: one complete sofa and armchair group faces small tables for sitting and conversation, with space to approach, sit and circulate around the group, understandable without people.
Reception: reception and waiting lead to one edge skin/aesthetic advisory node: one freestanding worktop separates the consultant equipment-operation side from the guest side; one chair on each side faces the other across the table, with clear access and a display turned for shared viewing.
~~~

修改后：

~~~text
Reception: open arrival leads directly to the complete reception counter, linked laterally to grouped waiting in the same hall; both lead to one semi-open skin/facial aesthetics advisory node at the hall edge, then screened private service access.
~~~

## functionalRelationships

566 → 338 字符。删除第二次到达→接待→候客→面询枚举；保留可用面积、通行、短边界、共看、面询之后的错位隐私与治疗不入镜。

合并后承载位置：functionalNetwork、visibleRequirements。

修改前：

~~~text
Reception: open arrival leads directly to the complete counter; reception and grouped waiting connect laterally in the same hall, then lead to one edge advisory workstation; each node retains usable space and circulation stays clear of art and furniture.
Reception: a short translucent boundary protects advisory privacy while both opposing seats and the shared display remain readable; beyond this node an offset solid return screens onward private care access, leaving the arrival sightline open; treatment activity, care beds and private interiors stay off frame.
~~~

修改后：

~~~text
Reception: each node retains usable space and clear circulation; a short translucent advisory boundary protects privacy while the opposing seats and shared screen remain readable; an offset return only beyond this node screens private access without blocking arrival; treatment activity and care beds and private interiors stay off frame.
~~~

## visibleRequirements

1813 → 1459 字符。前台、候客、标识承载面三行原样；面询保留独立工作台两侧一椅、朝向与转屏共看，短边界移至关系；开放厅与艺术连续连接移至结构，局部禁项和深度品质继续保留。屏幕抽象/无个人信息含义由non-identifying及既有图示类型保留。

合并后承载位置：structureLanguage、functionalRelationships。

修改前：

~~~text
A complete reception counter recognizable from the oblique entrance as the primary service anchor; service front, staff worktop, small office equipment and visitor approach are readable at credible scale
One complete sofa and armchair waiting group with small tables, usable seating and conversation space, warm neutral upholstery and light timber details, with circulation clear around it
One edge semi-open skin/facial aesthetics advisory node: one freestanding worktop between consultant and guest, one chair at its equipment-operation side and one at its opposite side, seat fronts facing each other across the worktop; both can view a turned display. The light screen shows non-identifying abstract skin surface texture, facial contour zones or aesthetic proportion diagrams, without skull, brain, organs, cross-sections, CT/MRI, readable text, numbers, diagnoses, personal images or outcome promises; a short local translucent boundary protects privacy
Open public arrival and a direct view into the broad complete hall, with continuous access to reception and waiting; the left foreground stays open, without a new blocking solid wall, circular glass room, cylindrical display or ring pendant; no extra facial-analysis advertising screen at reception
One continuous pearlescent architectural system joins a side interface to a local upper junction and articulates the waiting-to-advisory boundary with see-through depth, fine edges and few thin layers; its architectural role is readable in depth, not a flat wall applique, ordinary glass screen, shell wall, cross-hall ribbon or giant enclosing arch
One small flat clean unlettered identity surface on an architectural interface, outside the main circulation and unobstructed; small operational carriers remain subordinate to the complete functional areas
~~~

修改后：

~~~text
A complete reception counter recognizable from the oblique entrance as the primary service anchor; service front, staff worktop, small office equipment and visitor approach are readable at credible scale
One complete sofa and armchair waiting group with small tables, usable seating and conversation space, warm neutral upholstery and light timber details, with circulation clear around it
One edge advisory workstation: a freestanding professional worktop separates consultant equipment-operation side and guest side, one accessible chair on each side, seat fronts facing each other across the table; a turned display permits shared viewing, even with empty seats. The light screen shows non-identifying skin surface texture, facial contour zones or aesthetic proportion diagrams; no skull, brain, organs, cross-sections, CT/MRI, text, numbers, diagnoses, personal images or outcome promises
Open left foreground: no blocking wall, circular glass room, cylindrical display or ring pendant; no facial-analysis advertising screen at reception
One connected pearlescent system with a complete main curve, few thin layers, fine edges and see-through depth; no flat wall applique, ordinary glass screen, shell wall, cross-hall ribbon or giant enclosing arch
One small flat clean unlettered identity surface on an architectural interface, outside the main circulation and unobstructed; small operational carriers remain subordinate to the complete functional areas
~~~

## artisticFocus

101 → 58 字符。删除重复侧界面/上部边界和中央顶面要求，保留组织节奏、主辅曲面、薄边留缝深度及非墙饰；弱紫虹彩与材质光学原字段冻结。

合并后承载位置：structureLanguage、compositionRequirements、materialEntries。

修改前：

~~~text
接待区：单套珠光曲面连续连接侧向建筑与局部上部边界，用透景转折组织候客至面询的空间节奏；主曲面和少量辅助薄层具有真实层间深度、薄边与留缝，局部收束而非扁平墙饰，主厅中央及前台上方保留完整顶面与开敞尺度。
~~~

修改后：

~~~text
接待区：珠光建筑曲面以连接与透景转折组织空间节奏；完整主曲面与少量辅助薄层保留薄边、留缝、真实层间深度，不退化墙饰。
~~~

## compositionRequirements

357 → 127 字符。四行压成摄影主次与可用尺度两行；入口退让、珠光连接/边界、座椅关系、私密错位均在各自字段保留，不在构图重复展开；候客可坐可绕行由原可见项保留。

合并后承载位置：structureLanguage、functionalNetwork、functionalRelationships、visibleRequirements。

修改前：

~~~text
从入口斜向观察完整、横向舒展的商业接待主厅，视觉层级为完整主厅、明确接待服务锚点、成组候客、边缘专业面询节点、受屏蔽的私密服务转场；前台服务正面、员工工作侧和访客接近区域同时清楚可读。
本镜头一套珠光曲面以连续建筑连接及透景转折参与局部功能边界，主曲面与少量薄层在侧界面附近收束；中央和前台顶面完整，面询仅短段隐私边界，不形成跨厅飘带或巨型拱框。
入口框景退让，左前景开放到达视廊直接展开完整主厅，建筑层次不形成挡住厅宽的大墙；前台与候客横向相连且各有使用空间，边缘面询一台分隔两侧，操作椅与顾客椅隔台相向、共看转向显示器，私密遮挡留在其后。
成组沙发、扶手椅及轻桌可坐、可等候、可绕行，不形成临窗茶席主景；保持正常建筑摄影透视、可信人体尺度和必要功能面积，以空间位置及视线建立前台权重，错位实体界面屏蔽私密转场。
~~~

修改后：

~~~text
入口斜向建筑摄影：完整开阔主厅为先，前台为主要服务锚点，候客次之，面询位于边缘，私密转场从属；前台正面、员工侧及访客接近面可读。
保持正常透视与可信人体尺度，各节点可使用、可通行；沙发单椅小桌成组，不形成茶席、走廊或酒店大堂，不靠重复家具或营销架补功能。
~~~
