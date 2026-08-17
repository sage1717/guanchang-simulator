# [mvu_update] 变量输出格式 (别关)

<变量输出格式>
  task:
    - 每轮只根据本轮剧情和[全局变量快照]判断变化。
    - 未满足变量更新规则中check的字段保持原值；没有字段变化时输出空数组，不得为凑更新而编造事件。
    - 回复只能包含一个完整的UpdateVariable块，不要输出剧情、解释、Markdown代码块或块外文字。

  analysis:
    - 使用英文，不超过80词。
    - 只写三项：实际经过时间；是否允许剧烈变化及依据；本轮触发的字段路径与原因。
    - 不复述变量快照，不展开与更新无关的推理。

  protocol:
    name: MVU JSONPatch子集
    allowed_ops: replace | add | remove
    rules:
      - JSONPatch块内必须是可被JSON.parse直接解析的数组；不得含注释、省略号、尾逗号或未替换的占位符。
      - replace只用于[全局变量快照]中已经存在的路径。目标不存在时，改用add创建对应字段或记录。
      - add只用于新建动态record键、创建尚不存在的可选模块，或用/-向数组末尾追加元素。父容器必须已存在；同一批次需要建父级时，先写父级操作。
      - remove只用于快照中已经存在的动态record、可选模块或已核对索引的数组元素。固定Schema字段不得删除。
      - 多个操作按依赖顺序排列。不得重复写同一路径，不得输出新值与旧值完全相同的replace。
      - 所有value必须符合变量Zod Schema中的类型。字符串用双引号并按JSON规则转义；数字、布尔值、数组和对象使用对应JSON类型。

  path_rules:
    - 路径以/开头，层级用/分隔，字段名必须与Schema完全一致。
    - 顶层只能是：时空舆情、当前场景、人物库、关系索引、个人档案、派系图谱、绯色履历、个人资产、暗账、机遇与危机。
    - 动态record键必须来自当前快照或本轮明确新建的记录。新键使用可辨识的完整姓名、事项名、项目名或记录名。
    - 人物库record键必须是姓+名的完整姓名, 通常2至4个汉字; value.姓名与record键完全相同. 职务、姓氏简称和昵称写入职务或关系描述, 不作为人物键.
    - 新建动态键不得包含ASCII句点.或斜杠/，否则后续路径无法稳定寻址。键和值中的双引号和反斜杠必须按JSON规则转义。
    - 数组追加使用/-。按索引删除前必须核对当前快照；索引不确定时，replace整个数组为去重后的正确结果。

  schema_transforms:
    - 时空舆情.政治气候由当前日期.年自动计算，不得直接写入。
    - 暗账.人情债中的记录写入已偿还=true后会由Schema清除。
    - 人物落马、离任或绯色关系终结不会自动删除人物记录。应更新状态、标签和关系索引；只有剧情明确需要删除整条人物记录时才使用remove。

  linked_updates:
    - 时间或地点推进：检查当前日期、当前时间、当前地点；场景切换时同时检查场景类型、场景速写、气氛基调、在场人物和潜在议题。
    - 在场人物只记录实际同处现场者。电话、短信、微信联系人不因远程交流加入列表。
    - 新增人物：剧情只给出职务、姓氏简称或昵称时, 先生成符合年代与身份的完整化名; 再以该完整姓名向人物库一次add完整人物对象，并按角色标签同步关系索引。关系标签变化时，人物库.角色标签、对应关系模块和关系索引必须一致。
    - 绯色关系终结：更新关系阶段和相关标签；需要存档时add绯色履历，并同步把柄、风险和关系索引。人物仍承担其他角色时保留人物记录。
    - 职务变动：同步人物或个人档案中的现任职务、级别和任职时间；主角调任时补全上一段任职履历。
    - 处分发生或解除：同步处分记录与晋升状态。是否冻结、冻结原因和预计解除必须互相一致。
    - 派系人物失势或关系变化：同步人物状态、派系图谱、个人档案.政治生态及相关机遇或危机。
    - 资产或暗账变化：同步金额与对应房产、白手套、把柄、人情债等记录；只记录本轮已经发生的交易或暴露。
    - 机遇、危机和待办事项：出现时add，内容变化时replace，完成、失效或化解时remove。截止时间必须与当前日期一致。
    - 靠山、竞争对手、绯色对象、核心嫡系、政治宿敌五个列表都是完整姓名的去重集合；同名已存在时不得再次追加。

  operation_templates:
    replace_existing_scalar: |-
      { "op": "replace", "path": "/时空舆情/当前时间", "value": "${HH:MM}" }
    replace_whole_array: |-
      { "op": "replace", "path": "/当前场景/在场人物", "value": ["${实际到场人物的完整姓名}"] }
    append_unique_array_item: |-
      { "op": "add", "path": "/关系索引/核心嫡系列表/-", "value": "${人物完整姓名}" }
    add_complete_person_record: |-
      { "op": "add", "path": "/人物库/${人物完整姓名}", "value": { "姓名": "${人物完整姓名}", "性别": "${男或女}", "年龄": 0, "体系": "${体系}", "级别": "${级别}", "职务": "${职务}", "单位": "${现实单位}", "派系": "${派系或无}", "状态": "${状态}", "婚姻状态": "${婚姻状态}", "好感度": 0, "信任度": 0, "忠诚度": 0, "当前状态": "${当前状态}", "角色标签": ["${标签}"] } }
    add_dynamic_record: |-
      { "op": "add", "path": "/机遇与危机/待办事项/${事项名}", "value": { "事项": "${事项}", "紧急程度": "${紧急程度}", "截止时间": "${截止时间}", "关联人物": ["${人物完整姓名}"] } }
    remove_existing_record: |-
      { "op": "remove", "path": "/机遇与危机/待办事项/${已完成事项名}" }

  output_template: |-
    <UpdateVariable>
    <Analysis>
    - Time passed: ${actual elapsed time}.
    - Dramatic updates allowed: ${Yes or No; brief basis}.
    - Triggered paths: ${paths and reasons, or None}.
    </Analysis>
    <JSONPatch>
    [
      { "op": "replace", "path": "/${existing/path}", "value": "${typed new value}" }
    ]
    </JSONPatch>
    </UpdateVariable>

  no_change_output: |-
    <UpdateVariable>
    <Analysis>
    - Time passed: ${actual elapsed time}.
    - Dramatic updates allowed: No; no qualifying event occurred.
    - Triggered paths: None.
    </Analysis>
    <JSONPatch>
    []
    </JSONPatch>
    </UpdateVariable>
</变量输出格式>
