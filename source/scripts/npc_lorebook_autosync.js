// 官场模拟器 · 人物世界书自动同步（独立插件）
// 职责：变量快照更新后，自动把聊天世界书【人物】条目的过时字段刷新为最新值。
// 独立原则：不 import、不依赖 scarlet_core 任何函数；所有异常吞掉只 warn，绝不阻塞其他脚本。
// 触发：MVU 变量每次应用时 emit SINGLE_VARIABLE_UPDATED → debounce 800ms → 同步一次。
// 数据流：getVariables({type:'chat'}).stat_data.人物库 → 对比聊天世界书条目 → 仅 content 有差异才写。
// 边界：只更新已存在且人物库中仍存在的【人物】条目；不新增、不删除、不改 keys/filters；撞名候选条目（comment=【人物】+简称）自动跳过。

const __pf = v => (v == null || v === '' || v === '无') ? '' : String(v).trim();

const __POS_WORDS = ['书记','市长','县长','区长','镇长','局长','处长','科长','主任','部长','厅长','队长','所长','主席','秘书长','检察长','院长','校长'];
const __POS_ABBR = {'局长':'局','处长':'处','科长':'科','部长':'部','厅长':'厅','院长':'院','校长':'校','队长':'队','所长':'所','检察长':'检'};
const __ORG_WORDS = ['发改委','公安局','财政局','教育局','民政局','人社局','组织部','宣传部','统战部','纪委监委','监察委','检察院','法院','税务局','市场监管局','卫健委','住建局','交通局','农业农村局','商务局','文旅局','应急管理局','城管局','水利局','林业局','司法局','审计局','统计局','信访局','海关','街道办','县委','市委','省委','管委会','开发区'];
const __ORG_ABBR = {'发改委':'发改','公安局':'公安','财政局':'财政','组织部':'组织','税务局':'税务','市场监管局':'市监','卫健委':'卫健','检察院':'检察','民政局':'民政','人社局':'人社'};

// 与开局写入字段完全一致（稳定特质版：无数值、无动态位）
function __buildSyncContent(__name, __p) {
  __p = __p && typeof __p === 'object' ? __p : {};
  const __f = __pf;
  const __head = [__name, __f(__p.性别), __p.年龄 > 0 ? String(__p.年龄) + '岁' : '', __f(__p.体系) + (__f(__p.级别) ? '·' + __f(__p.级别) : ''), __f(__p.职务) + (__f(__p.单位) ? '（' + __f(__p.单位) + '）' : ''), __f(__p.派系)].filter(Boolean).join('｜');
  const __lines = ['【人设锚点·变量同步】本条目由变量快照自动同步，与当前变量一致，动态变化以变量为准。', __f(__p.婚姻状态) ? __head + '｜' + __f(__p.婚姻状态) : __head];
  const __tags = Array.isArray(__p.角色标签) ? __p.角色标签.map(__f).filter(Boolean) : [];
  if (__tags.length) __lines.push('身份：' + __tags.join('、'));
  const __g = __p.官场关系;
  if (__g && typeof __g === 'object') {
    const __rel = __f(__g.关系类型) + (__f(__g.关系来源) ? '（' + __f(__g.关系来源) + '）' : '');
    if (__rel) __lines.push('与主角：' + __rel);
  }
  const __s = __p.绯色关系;
  if (__s && typeof __s === 'object') {
    const __bits = [];
    if (__f(__s.外貌)) __bits.push('外貌：' + __f(__s.外貌));
    if (__f(__s.性格)) __bits.push('性格：' + __f(__s.性格));
    const __stags = Array.isArray(__s.身份标签) ? __s.身份标签.map(__f).filter(Boolean) : [];
    if (__stags.length) __bits.push('标签：' + __stags.join('、'));
    const __phs = __s.性癖好 && typeof __s.性癖好 === 'object' ? Object.keys(__s.性癖好).filter(k => k && k !== '无') : [];
    if (__phs.length) __bits.push('癖好：' + __phs.join('、'));
    if (__bits.length) __lines.push('特质：' + __bits.join('；'));
  }
  const __c = __p.竞争关系;
  if (__c && typeof __c === 'object' && __f(__c.竞争目标)) __lines.push('竞争：' + __f(__c.竞争目标));
  const __k = __p.靠山关系;
  if (__k && typeof __k === 'object') {
    const __bits = [];
    if (__f(__k.紧密度)) __bits.push(__f(__k.紧密度));
    if (__f(__k.提携内容)) __bits.push('提携：' + __f(__k.提携内容));
    if (__bits.length) __lines.push('靠山：' + __bits.join('；'));
  }
  const __h = __p.家庭关系;
  if (__h && typeof __h === 'object') {
    const __bits = [];
    if (__f(__h.关系)) __bits.push(__f(__h.关系));
    if (__f(__h.知悉内情)) __bits.push('知悉：' + __f(__h.知悉内情));
    if (__bits.length) __lines.push('家庭：' + __bits.join('；'));
  }
  return __lines.join('\n');
}

async function __syncOnce() {
  try {
    const __chatVars = getVariables({ type: 'chat' });
    const __stat = __chatVars && __chatVars.stat_data;
    const __people = __stat && typeof __stat.人物库 === 'object' ? __stat.人物库 : {};
    const __names = Object.keys(__people).filter(n => n && n !== '无');
    if (!__names.length) return;
    const __book = await getChatLorebook();
    if (!__book) return;
    const __entries = await getLorebookEntries(__book);
    if (!__entries || !__entries.length) return;
    const __updates = [];
    for (const __en of __entries) {
      if (!__en || typeof __en.uid !== 'number' && typeof __en.uid !== 'string') continue;
      const __c = String(__en.comment || '');
      if (__c.indexOf('【人物】') !== 0) continue;
      const __name = __c.slice(4).trim();
      if (!__name || !__people[__name]) continue;
      const __content = __buildSyncContent(__name, __people[__name]);
      if (__en.content !== __content) __updates.push({ uid: __en.uid, content: __content });
    }
    if (__updates.length) {
      await setLorebookEntries(__book, __updates);
      console.info('[官场模拟器] 人物世界书已同步', __updates.length, '条');
    }
  } catch (__e) {
    console.warn('[官场模拟器] 人物世界书自动同步失败', __e);
  }
}

let __debounceTimer = null;
function __debouncedSync() {
  if (__debounceTimer) clearTimeout(__debounceTimer);
  __debounceTimer = setTimeout(() => { __debounceTimer = null; __syncOnce(); }, 800);
}

(async function __initAutosync() {
  try {
    await waitGlobalInitialized('Mvu');
    const __Mvu = (window.parent && window.parent !== window ? window.parent : window).Mvu || window.Mvu || (typeof globalThis !== 'undefined' ? globalThis.Mvu : null);
    if (!__Mvu || !__Mvu.events || !__Mvu.events.SINGLE_VARIABLE_UPDATED) {
      console.warn('[官场模拟器] MVU 事件不可用，人物世界书自动同步未启用');
      return;
    }
    eventOn(__Mvu.events.SINGLE_VARIABLE_UPDATED, __debouncedSync);
    window.__npcLorebookAutosync = { syncNow: __syncOnce };
    console.info('[官场模拟器] 人物世界书自动同步已就绪');
  } catch (__e) {
    console.warn('[官场模拟器] 人物世界书自动同步初始化失败', __e);
  }
})();
