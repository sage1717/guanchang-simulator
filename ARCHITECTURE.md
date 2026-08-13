# 绯色官途 · 原卡架构笔记（二创基线）

> 来源 A：`绯色官途.json`（独立世界书导出）SHA-256 8d261060a84e472a...（471,052 B）
> 来源 B：`绯色官途.png`（完整角色卡）SHA-256 e0ba9c922a3cea3a...（1,368,387 B）
> PNG 双 payload `chara`/`ccv3` 完全一致（解码后 sha256 8618fc3a410ccdb2，250,961 B），无冲突
> 快照：`_ref/`（39 条目逐条 md + MANIFEST.txt + decoded/card_chara.json，只读参考）

## 0b. 完整卡结构（PNG）

角色卡壳极简，内容全在扩展里：

| 字段 | 值 |
|---|---|
| name / description / personality / scenario | 绯色官途 / 全空 |
| first_mes | `[初始化完成]` + `<StatusPlaceHolderImpl/>`（占位符→regex 换状态栏 UI） |
| alternate_greetings[0] | 8.7K 完整演示回合（含剧情正文+选项+摘要+tucao+JSON Patch 示例） |
| character_book | 内嵌同一份 39 条目世界书 |
| extensions.world | 绑定外部世界书「绯色官途」 |
| extensions.depth_prompt | 空 prompt，冗余 |
| extensions.tavern_helper | 2 个脚本（MVU-BETA + 变量验证） |
| extensions.regex_scripts | 3 个正则 |

### 脚本（tavern_helper.scripts）

1. **MVU-BETA**：`import '.../MagicalAstrogy/MagVarUpdate@beta/artifact/bundle.js'`——MVU 运行时，@beta 旧版分支
2. **变量验证**（scarlet/index.js，HymnStudio/card_rs 仓库）：自定义 MVU 更新/初始化助手
   - `data.apiConfig`：`http://localhost:1234/v1`（LM Studio 本地 API）——**画蛇添足的过时配置**：enableExtraModelParsing=false + useMainApi=true 时根本不读它，纯冗余
   - `promptConfig.customSystemPrompt`：变量更新助手指令（禁审查 meta + 三条执行铁律 + <UpdateVariable> 输出格式）
   - `startupSystemPrompt/startupUserPrompt`：变量初始化助手指令（[mvu_start] 流程，只增不改）
   - `contextExtractTags`: content,progress,Phone；`contextExcludeTags`: options,tucao,thinking
   - `promptFilterPatterns`: 状态栏占位符 + `<xx>.*?</xx>`
   - `maxChatHistory`: 2；sendPreset: false

### 正则（regex_scripts，3 个）

1. **去除变量更新**：`/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gm` → 空（markdown+prompt 都删）
2. **状态栏**：`<StatusPlaceHolderImpl/>` → iframe 加载 `scarlet/index.html`（仅显示层，prompt 不注入）
3. **对 AI 隐藏状态栏**：同占位符 → 空（仅 prompt 层）

### 运行流程（初始化 + 每轮）

- 开局：first_mes 占位符 → regex 显示状态栏 UI；[mvu_start] 条目触发初始化 → 更新模型按 startupSystemPrompt 输出 JSON Patch 全量初始化 → MVU 写入 stat_data
- 每轮：主模型产出剧情 + 结尾 <UpdateVariable> 块 → regex 0 从显示删除 → 更新模型按 customSystemPrompt 读 <past_observe> 剧情增量 → 输出新 JSON Patch → MVU 应用 → 状态栏 UI 从 stat_data 实时渲染

### 技术栈判定（更新）

Tavern Helper + **MVU（MagVarUpdate @beta）** + 自定义 scarlet.js 更新脚本 + 外部 scarlet UI（状态栏 index.html）+ 外部世界书。**不是 MVU Zod 运行时方案**——世界书 36 条目的「变量zod」只是给 LLM 看的 schema 说明文本，无运行时注册。

### 过时/画蛇添足点（完整卡，二创清理清单）

1. `apiConfig`（localhost:1234 LM Studio）——冗余，useMainApi 下不生效，删除
2. MVU-BETA @beta 分支——换正式版（Phillip 环境已有 MVU 4.8.19）
3. alternate_greetings[0] 内含作者 AI（「小此」）的 thinking 草稿、创作指令、tucao 吐槽——元信息泄漏，正式卡需清洗
4. depth_prompt 空配置——冗余
5. 外部远程依赖：scarlet/index.js + index.html（GitHub 仓库加载）
6. 世界书 36「变量zod」为伪 zod（LLM 参考文本）
7. 政治气候表止于 2025、示例主角谢知非为演示人设

## 0. 文件形态

- 顶层仅两个 key：`entries`（39 条）、`originalData`（含完整 entries 拷贝 + name=绯色官途）
- 全部条目：`constant=true` + `selective=true`，key 均为空（纯常驻注入，不走关键词触发）
- 插入策略分两段：
  - order 0~254（条目 0-24）：position=0 depth=4（@D 按顺序插在系统提示开头）
  - order 300~1000（条目 25-48）：position=4 depth=0（@IR 递归插入，贴近输出）
- 路由标记在条目标题（comment 字段）：`[mvu_plot]` / `[mvu_update]` / `[mvu_start]` / `[initvar]`（旧式，已禁用）

## 1. 条目标记协议（Tavern Helper MVU 路由）

- `[mvu_plot]`：叙事/世界观/演绎指令 → plot 侧（主模型）
- `[mvu_update]`：变量更新规则/输出契约 → update 侧（更新模型 pass）
- `[mvu_start]`：开局初始化指令（开局后进初始化流程）
- 分割线条目（0/5/19/25/32）带三标记，纯视觉分隔

## 2. 内容分层（9 层）

| 层 | 条目 | 内容 |
|---|---|---|
| 底层协议 | 0-4 | 沙盒模式、交互范式（权色一体、黑箱铁律）、美学纲领（权力=春药）、知识注入（公务员制度） |
| 基础架构 | 5-11 | 时代设定 2000~2025、政治气候四段表、权力核心（常委会/政治局）、官阶天梯 T1-T6、派系山头、官场女性 |
| DLC 风味包 | 12-18 | 职务兼任、会议生态、文书系统、组织人事、监督三剑 |
| 核心交互 | 19-24 | 晋升处分规则、官言官语、人情关系、政治斗争、权力暗面（绯色交互/乱伦/性暴行） |
| 动态演绎 | 25-30 | 合理性检查、时间规则、NPC 生成与回收、叙事引擎（六大模块）、旧简化版（禁用） |
| 数值系统 | 32, 39 | 官场能力十维、阶梯评价 T0-T4、动态演化 |
| 变量协议 | 33-36, 47 | zod schema、更新规则、输出格式（42 示例）、初始化指南、状态快照宏 |
| 旧初始化 | 48 | `[initvar]` 旧式初始化模板（禁用，勿开启） |

## 3. 叙事引擎六大模块（条目 29）

1. MODULE_DynamicHistory：宏观历史铁律（不可逆）vs 微观蝴蝶效应；破锚 → 推演 IF 线（原主转任/冷藏/死敌化）
2. MODULE_causality：顺势判定、破锚行为（摘桃子/斩马谡/神预言）、修正推演反馈（内参/小道传闻）
3. MODULE_Opportunity：A 主动呈递 / B 圈内传闻（需钻营转化）/ C 遥不可及
4. MODULE_Corruption：投名状机制（晋升前夜/危机时刻触发，四级交易类型库，接受=机遇+地雷，拒绝=清白+边缘化）
5. MODULE_Breakthrough：技术官僚线 / 孤臣线 / 掀桌子
6. MODULE_Filter：禁止上帝视角、数据感官化、心理隔离、未来信息悖论（政治正确+KPI 导向才有效）

## 4. NPC 协议（条目 28）

- 历史重合律：涉及真实职位/地名强制调用真实人物（姓名/履历/结局），避嫌无效化（沉浸感核心）
- 原创填充律：仅历史空白处生成，禁网红名/小说名，符合年代感
- 生态：内卷（NPC 也在跑部钱进）、连带清洗、遗产结算（权力真空/政治地雷/人亡政息）
- 生命周期：年龄到线/政治事故/身体崩溃 → 触发回收；宿敌同步成长、下属投喂/打压

## 5. 变量系统（MVU Zod，核心资产）

### 5.1 Schema（条目 36）
- 顶层 12 块：时空舆情 / 当前场景 / 人物库 / 关系索引 / 个人档案 / 派系图谱 / 绯色履历 / 个人资产 / 暗账 / 机遇与危机
- 人物 Schema：统一 12 基础字段 + 6 可选扩展模块（官场关系/绯色关系/竞争关系/靠山关系/家庭关系/子女）
- 中文键名 + `prefault` + `_.clamp` 变换；百分比 0-100、年份 2000-2100
- 自动逻辑（transform）：
  - 政治气候由年份自动计算（2000-12 狂飙 / 13-17 雷霆 / 18-22 大考 / 23+ 存量），不可手动改
  - 人情债 `已偿还=true` 自动清除
  - 人物 `状态=落马` 自动从人物库移除
  - 绯色关系 `关系阶段=彻底终结` 且无其他标签时自动清理

### 5.2 更新规则（条目 33）
- 逐字段 type/ref/check 规范；核心 ref 值域：好感度±(3~10) 重大±(15~30)、信任度背叛-20~-50、忠诚度仅对下属有效、能力值 80 上限需重大危机突破、单次变化≤±10
- 关系索引与角色标签强制同步；任职履历 record ID 用职务名；待办事项 ID 用描述性名称

### 5.3 输出格式（条目 34）
- `<UpdateVariable><Analysis>(英文≤80词，三行：时间流逝/是否允许剧烈更新/逐变量分析)<JSONPatch>(RFC 6902 仅 replace/add/remove)</UpdateVariable>`
- 42 个示例覆盖：时空舆情、场景管理、人物库、绯色关系（建立/进展/癖好/恶化/终结迁移履历）、能力与晋升、处分冻结、派系、暗账、机遇危机、项目资产、综合场景
- 注意事项：中文路径直接使用不 URL 编码、一次更新合并相关变化、大时间跃迁可剧烈更新、数组删除从后往前、政治气候不可手动操作

### 5.4 初始化指南（条目 35）
- 开局流程：收到[当前世界变量]+[用户设定人设] → 演绎人设（含能力值/开局态势/绯色对象群）→ 在回复末尾输出 JSON Patch 全量初始化（日期/场景/人物库 add/能力/机遇危机）
- 内置完整演示示例：谢知非（2006 江苏纪委，正处，空降兵，苏北专案），含 11+ 人物与 5 位绯色对象完整 add patch

### 5.5 状态快照（条目 47）
- `{{get_message_variable::stat_data}}` 投影宏（MVU 变量投影，更新模型读取当前状态）

## 6. 已知过时/问题点（二创时处理）

- 条目 48 `[initvar]` 旧式初始化：已禁用，标记"别开启"，属历史遗留
- 条目 30 演绎简化版：禁用，且注释要求开启时关闭 301~304（301=合理性检查 302=时间规则 303=NPC 304=叙事引擎）
- 条目 12/18 标题同为"官场核心风味包DLC-开始"（18 应为结束/分隔，标题疑似笔误）
- 示例文案中"谢知非"为演示人设，非卡本身固定主角；二创需替换
- 政治气候表止于 2023 后（存量博弈）；世界观锚定 2000-2025，当前现实已 2026
- 用户明确：原卡自带的额外 API 配置属画蛇添足，忽略（本世界书文件未含，可能位于原完整卡其他部分）
- 条目 id 不连续（缺 31/37/38/40-46），为历史删除残留，不影响运行

## 8. 架构升级（2026-08-13，内容冻结）

工程结构：`source/`（card.json 卡壳 + regex.json + scripts/ + worldbook/ 39 条 + ui/statusbar.html）+ `build/assemble.py` → `dist/card.json` + `dist/绯色官途.png`（原图壳嵌入 chara+ccv3，双 payload roundtrip 校验）。git 管理。

| 项 | 原卡 | 升级后 |
|---|---|---|
| MVU 运行时 | `MagVarUpdate@beta` | `MagVarUpdate/artifact/bundle.js` 正式版 |
| 变量验证脚本 | 远程 import `HymnStudio/card_rs/scarlet/index.js` | 内嵌 `source/scripts/scarlet_core.js`（去 klona → 内联 JSON clone；registerMvuSchema 保留） |
| apiConfig | localhost:1234 LM Studio（不生效，画蛇添足） | 删除 |
| 状态栏/开局页 | 远程 `$('body').load(scarlet/index.html)`（1.2MB，**游戏界面框架本体：开局创建页+主界面+状态栏一体**） | **恢复原样，远程加载保留**（重写版已废弃删除） |
| depth_prompt | 空配置（冗余） | 移除 |
| 双 payload | chara/ccv3 一致 | 保持一致（roundtrip 断言） |
| 世界书 | 39 条 | 内容零差异（逐条 byte 对比） |

验证：11 项装配断言全 PASS（spec v3 / 39 条目 / 2 脚本 / 3 正则 / 无 apiConfig / 无 klona / 无 @beta / 无 depth_prompt / UI 内嵌 / world 保留 / first_mes 保留）+ PNG payload roundtrip。

已知保留项：`world` 外绑（与内嵌 character_book 并存，内容同源，后续内容改动需同步两处或改装配源）；registerMvuSchema 仍走 testingcf CDN（运行时必需，B1 建议的 cdn.jsdelivr.net 主镜像可后续加 fallback）；`enableExtraModelParsing=false` 单模型模式维持原行为；alternate_greetings[0] 内元信息（thinking/tucao）按内容冻结未动，后续二创时清洗。

待真机验证：ST 导入 dist PNG → 新聊天 → 初始化/更新/状态栏渲染。

- 运行依赖：ST + Tavern Helper（MVU 路由）+ MVU Zod 运行时（registerMvuSchema，中文键名）
- 变量存储：`stat_data`（message variable，投影宏 get_message_variable）
- 无独立前端 UI、无正则、无 helper script 条目（纯世界书方案）
- 双模型路由：`[mvu_plot]` → 主模型，`[mvu_update]` → 更新模型（或同模型双 pass）
