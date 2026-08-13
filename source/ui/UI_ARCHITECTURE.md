# Scarlet UI 拆解研究报告（index.html）

> 来源：`_ref/remote/index.html`（1,178,010 chars，远程依赖 `HymnStudio/card_rs/scarlet/index.html`）
> 去混淆产物：`_ref/remote/index.deobf.js`（985KB，字符串解密版）
> 去混淆工具：`build/deobfuscate.js`（javascript-obfuscator 字符串数组解密）

## 1. 技术栈判定

- **Vue 3**（h() 渲染、defineStore、createApp、nextTick、onMounted——Composition API，运行时渲染无 SFC 编译）
- **Pinia**（状态管理，storeToRef 使用）
- **webpack 打包**（o = __webpack_require__，l = 模块缓存，a = 模块定义表；5 个字符串数组、多层解密器，混淆深度高）
- **Font Awesome 6.5.1**（远程 CDN 图标）
- **klona**（深拷贝）
- 宿主 API：`eventOn`(20)、`toastr`(56)、`getVariables`(4)、`replaceVariables`(5)、`window.ScarletMvu` 桥（scarlet_core.js 导出）

## 2. 页面/功能模块（821 个 CSS 类佐证）

### A. 开局创建页（启动层）
- 创建人物：从零开始创建 / 模板选择 / 返回选择模板
- 开局背景描述输入 → 自动生成（"根据背景描述自动生成"）
- 封面：上传绯色封面、图片上传弹窗、裁剪框/裁剪弹窗/裁剪工具（cropper 体系）、宽高比预设（aspect-ratio-presets）
- 头像：上传角色头像、头像区域、canvas 绘制（fillRect/canvas 上下文）、头像缓存管理（清除头像缓存/确认弹窗）
- 确认开局弹窗（confirmStartup）、开局说明区域
- 布局模式：开局模式（中间居中）vs 正常模式（左侧显示/中间显示）

### B. 主界面（游戏层）
- 状态栏（status-bar、mini-stat、stat-item、danger-bar/危险度仪表）
- 人物库卡片视图（char-grid、char-card、core-char 核心角色、card-trend 动向、card-tags-side）
- 能力雷达图（ability-radar、axis-line、data-point——canvas 雷达）
- 数值面板（数值面板、ability-card、ability-tooltip、favor-bar 好感度条）
- 资产暗账页（assets-secrets-page：房产/座驾/白手套/把柄/地雷/人情债 debts-section）
- 人物详情 Drawer（drawer-container、contact-info 通联、emotion-tag 情绪、danger-section）

### C. 编辑层
- 交互式编辑表单（character-form、form-header、editor-section）
- 代码视图编辑（code-editor）与视图切换（视图切换/切换到代码视图编辑）
- 数组编辑器（array-editor、array-item）、枚举选择器（enum-select）、滑块字段（slider-field）
- 命令列表（command-item、cmd-path/cmd-type/cmd-value/cmd-errors——JSON Patch 命令可视化）
- 校验错误面板（error-counter、error-field、error-path、current-error、btn-next-error 跳转下一个错误）

### D. 设置与数据
- 界面设置、API 配置、自定义 API 配置、额外模型解析开关（启用额外模型解析）、MVU 重试解析按钮
- 导入/导出（导入弹窗、导出）、加载数据成功/失败、MVU 保存数据、变量更新同步前端
- 解析预览（getPromptPreview）、模型列表（fetchModels）、世界书列表（fetchLorebooks）
- 确认弹窗体系：生成拦截确认（生成拦截确认弹窗）、取消发送确认、清除缓存确认、变量更新确认

## 3. 数据流（ScarletMvu 桥）

UI 与卡运行时通过 `window.ScarletMvu` 全局桥通信（scarlet_core.js 导出，同时挂 window 和 window.parent）：

| 方向 | API | 用途 |
|---|---|---|
| UI→运行时 | `getSettings/saveSettings` | 读写脚本设置（脚本变量） |
| UI→运行时 | `retryParsing/abortParsing` | 重试/中断额外模型解析 |
| UI→运行时 | `confirmUpdate/confirmStartup` | 确认变量更新/确认开局 |
| UI→运行时 | `generateStartupVariables` | 触发开局变量生成 |
| UI→运行时 | `getCurrentMessageId/isAtStartupLayer` | 楼层定位（开局层判断） |
| UI→运行时 | `fetchModels/fetchLorebooks/getPromptPreview` | 设置页数据源 |
| UI→运行时 | `getPendingConfirmation/getLastStartupDescription` | 轮询状态 |
| 运行时→UI | `eventOn(事件)` + 事件对象 q | CONFIRM_UPDATE、SETTINGS_CHANGED、PARSING_ABORTED 等事件推送 |
| 数据 | `getVariables/replaceVariables({type:'script', script_id})` | 设置持久化 |
| 数据 | `Mvu.getMvuData({type:'message'})` | stat_data 读取 |

## 4. 重写建议（"变成我们自己的东西"）

### 方案 A：本地化内嵌（保守）
- 原 HTML 下载到 `source/ui/scarlet/index.html`（本地副本），装配时状态栏正则改为内嵌（```html 块）或本地文件
- 卡体积 +1.2MB；仍是混淆代码，不可维护；font-awesome 仍远程
- 优点：零功能风险，立即摆脱 HymnStudio 仓库依赖

### 方案 B：重写（彻底）
- 基于本报告功能清单 + stat_data 契约 + ScarletMvu 桥，用原生 JS/Vue3 CDN 重写：
  1. 开局创建页（表单+封面上传裁剪+头像+确认开局）
  2. 状态栏/数值面板（含能力雷达）
  3. 人物卡片/Drawer 编辑（含数组/枚举/滑块控件）
  4. 设置面板（API/额外模型/导入导出）
- 优点：完全自有、可维护、可扩展（二创时加功能方便）
- 成本：工作量大（估计 3-6K 行），需多轮迭代 + 真机验收

### 方案 C：混合
- 先方案 A 保住功能（立即可用），同时按 B 逐步重写模块，验收一个替换一个

> 风险提示：混淆代码里 vue-router 类页面切换逻辑复杂（characters-page/assets-secrets-page 等 page 类），重写时按页拆分、逐页验收最稳。
