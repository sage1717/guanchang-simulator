// 官场模拟器 · 人物世界书同步脚本（独立模块）
// 职责：人物库(stat_data.人物库) <-> 聊天世界书条目 的双向维护
// 1) 开局确认时全量转写：稳定特质 -> 绿灯名字触发条目（撞名走 and_any 区分 + 候选合并条目）
// 2) 孤儿聊天世界书清理（删除聊天后残留的 Chat_Book_* 书）
// 桥：window.__npcLorebookSync = { syncNow, cleanup }
function __npcField(__v){
  if(__v==null)return'';
  const __t=String(__v).trim();
  return(__t===''||__t==='无')?'':__t
}
const __POS_WORDS=['书记','市长','县长','区长','镇长','局长','处长','科长','主任','部长','厅长','队长','所长','主席','秘书长','检察长','院长','校长'];
const __POS_ABBR={'局长':'局','处长':'处','科长':'科','部长':'部','厅长':'厅','院长':'院','校长':'校','队长':'队','所长':'所','检察长':'检'};
const __ORG_WORDS=['发改委','公安局','财政局','教育局','民政局','人社局','组织部','宣传部','统战部','纪委监委','监察委','检察院','法院','税务局','市场监管局','卫健委','住建局','交通局','农业农村局','商务局','文旅局','应急管理局','城管局','水利局','林业局','司法局','审计局','统计局','信访局','海关','街道办','县委','市委','省委','管委会','开发区'];
const __ORG_ABBR={'发改委':'发改','公安局':'公安','财政局':'财政','组织部':'组织','税务局':'税务','市场监管局':'市监','卫健委':'卫健','检察院':'检察','民政局':'民政','人社局':'人社'};
function __npcAliases(__name,__p){
  const __out=[];
  const __job=__npcField(__p&&__p.职务);
  if(__job&&__name){
    for(let __i=0;__i<__POS_WORDS.length;__i++){
      const __w=__POS_WORDS[__i];
      if(__job.indexOf(__w)!==-1){
        const __full=__name.charAt(0)+__w;
        if(__full!==__name&&__out.indexOf(__full)===-1)__out.push(__full);
        const __ab=__POS_ABBR[__w];
        if(__ab){
          const __short=__name.charAt(0)+__ab;
          if(__short!==__name&&__out.indexOf(__short)===-1)__out.push(__short)
        }
        break
      }
    }
  }
  return __out
}
function __npcOrgWords(__p){
  const __out=[];
  const __hay=(__npcField(__p&&__p.单位)+' '+__npcField(__p&&__p.职务)).trim();
  if(__hay){
    for(let __i=0;__i<__ORG_WORDS.length;__i++){
      const __w=__ORG_WORDS[__i];
      if(__hay.indexOf(__w)!==-1){
        if(__out.indexOf(__w)===-1)__out.push(__w);
        const __ab=__ORG_ABBR[__w];
        if(__ab&&__out.indexOf(__ab)===-1)__out.push(__ab);
        if(__out.length>=4)break
      }
    }
  }
  return __out
}
function __memberLine(__it){
  const __p=__it.__p||{};
  const __parts=[__it.__n];
  const __job=__npcField(__p.职务);
  if(__job)__parts.push(__job);
  const __org=__npcField(__p.单位);
  if(__org)__parts.push(__org);
  const __g=__p.官场关系;
  if(__g&&typeof __g==='object'&&__npcField(__g.关系类型))__parts.push('与主角：'+__npcField(__g.关系类型));
  return __parts.join('——')
}
function __buildNpcEntry(__name,__p,__keys,__filters,__logic){
  __p=__p&&typeof __p==='object'?__p:{};
  const __f=__npcField;
  const __head=[__name,__f(__p.性别),__p.年龄>0?String(__p.年龄)+'岁':'',__f(__p.体系)+(__f(__p.级别)?'·'+__f(__p.级别):''),__f(__p.职务)+(__f(__p.单位)?'（'+__f(__p.单位)+'）':''),__f(__p.派系)].filter(Boolean).join('｜');
  const __lines=['【开局时点人设锚点】本条目锁定该人物开局时的稳定特质，剧情中的动态变化以变量为准。',__f(__p.婚姻状态)?__head+'｜'+__f(__p.婚姻状态):__head];
  const __tags=Array.isArray(__p.角色标签)?__p.角色标签.map(__f).filter(Boolean):[];
  if(__tags.length)__lines.push('身份：'+__tags.join('、'));
  const __g=__p.官场关系;
  if(__g&&typeof __g==='object'){
    const __rel=__f(__g.关系类型)+(__f(__g.关系来源)?'（'+__f(__g.关系来源)+'）':'');
    if(__rel)__lines.push('与主角：'+__rel)
  }
  const __s=__p.绯色关系;
  if(__s&&typeof __s==='object'){
    const __bits=[];
    if(__f(__s.外貌))__bits.push('外貌：'+__f(__s.外貌));
    if(__f(__s.性格))__bits.push('性格：'+__f(__s.性格));
    const __stags=Array.isArray(__s.身份标签)?__s.身份标签.map(__f).filter(Boolean):[];
    if(__stags.length)__bits.push('标签：'+__stags.join('、'));
    const __phs=__s.性癖好&&typeof __s.性癖好==='object'?Object.keys(__s.性癖好).filter(__k=>__k&&__k!=='无'):[];
    if(__phs.length)__bits.push('癖好：'+__phs.join('、'));
    if(__bits.length)__lines.push('特质：'+__bits.join('；'))
  }
  const __c=__p.竞争关系;
  if(__c&&typeof __c==='object'&&__f(__c.竞争目标))__lines.push('竞争：'+__f(__c.竞争目标));
  const __k=__p.靠山关系;
  if(__k&&typeof __k==='object'){
    const __bits=[];
    if(__f(__k.紧密度))__bits.push(__f(__k.紧密度));
    if(__f(__k.提携内容))__bits.push('提携：'+__f(__k.提携内容));
    if(__bits.length)__lines.push('靠山：'+__bits.join('；'))
  }
  const __h=__p.家庭关系;
  if(__h&&typeof __h==='object'){
    const __bits=[];
    if(__f(__h.关系))__bits.push(__f(__h.关系));
    if(__f(__h.知悉内情))__bits.push('知悉：'+__f(__h.知悉内情));
    if(__bits.length)__lines.push('家庭：'+__bits.join('；'))
  }
  const __entry={comment:'【人物】'+__name,keys:__keys||[__name].concat(__npcAliases(__name,__p)),position:'after_character_definition',content:__lines.join('\n')};
  if(__filters&&__filters.length)__entry.filters=__filters;
  if(__logic)__entry.logic=__logic;
  return __entry
}
async function __cleanupOrphanChatLorebooks(){
  try{
    const __norm=__v=>String(__v==null?'':__v).replace(/\.jsonl$/i,'').replace(/[^a-z0-9]/gi,'_').replace(/_{2,}/g,'_').replace(/^_+|_+$/g,'');
    const __books=await getLorebooks();
    const __orphans=[];
    for(const __b of __books||[]){
      if(!__b)continue;
      if(__b.indexOf('Chat_Book_')===0)__orphans.push({__b,__pfx:'Chat_Book_'});
      else if(__b.indexOf('Chat Book ')===0)__orphans.push({__b,__pfx:'Chat Book '})
    }
    if(!__orphans.length)return;
    const __live=new Set();
    try{
      let __tok='';
      try{
        const __t=await fetch('/csrf-token');
        const __tj=await __t.json();
        __tok=(__tj&&__tj.token)||''
      }catch{}
      const __resp=await fetch('/api/chats/recent',{method:'POST',headers:{'Content-Type':'application/json',...( __tok?{'X-CSRF-Token':__tok}:{})},body:'{"pinned":[]}'});
      if(!__resp.ok)throw new Error('HTTP '+__resp.status);
      const __list=await __resp.json();
      (Array.isArray(__list)?__list:[]).forEach(__c=>{
        if(__c&&__c.file_name)__live.add(__norm(__c.file_name))
      })
    }catch(__e){
      console.warn('[官场模拟器] 获取聊天清单失败，跳过孤立世界书清理',__e);
      return
    }
    for(const __x of __orphans){
      if(!__live.has(__norm(__x.__b.slice(__x.__pfx.length)))){
        await deleteLorebook(__x.__b);
        console.info('[官场模拟器] 已清理孤立聊天世界书',__x.__b)
      }
    }
  }catch(__err){console.warn('[官场模拟器] 清理孤立聊天世界书失败',__err)}
}
async function __syncNpcsToChatLorebook(){
  try{
    const __mvu=(window.parent&&window.parent!==window?window.parent:window).Mvu||window.Mvu||(typeof globalThis!=='undefined'?globalThis.Mvu:null);
    if(!__mvu||typeof __mvu.getMvuData!=='function'){console.warn('[官场模拟器] MVU不可用，跳过开局人物写入世界书');return}
    const __res=await __mvu.getMvuData({type:'message',message_id:0});
    const __stat=(__res&&(__res.stat_data||__res.data&&__res.data.stat_data))||{};
    const __people=(__stat&&typeof __stat.人物库==='object'&&__stat.人物库)||{};
    const __self=__npcField(__stat&&__stat.个人档案&&__stat.个人档案.基本信息&&__stat.个人档案.基本信息.姓名);
    const __names=Object.keys(__people).filter(__n=>__n&&__n!=='无'&&__n!==__self);
    if(!__names.length){console.warn('[官场模拟器] 人物库为空，跳过开局人物写入世界书');return}
    await __cleanupOrphanChatLorebooks();
    const __book=await getOrCreateChatLorebook();
    const __existing=await getLorebookEntries(__book);
    const __oldUids=(__existing||[]).filter(__en=>(__en.comment||'').indexOf('【人物】')===0).map(__en=>__en.uid);
    if(__oldUids.length)await deleteLorebookEntries(__book,__oldUids);
    const __items=__names.map(__n=>({__n,__p:__people[__n],__aliases:__npcAliases(__n,__people[__n])}));
    const __aliasCount={};
    __items.forEach(__it=>{__it.__aliases.forEach(__a=>{__aliasCount[__a]=(__aliasCount[__a]||0)+1})});
    const __collided={};
    Object.keys(__aliasCount).forEach(__a=>{if(__aliasCount[__a]>=2)__collided[__a]=__items.filter(__it=>__it.__aliases.indexOf(__a)!==-1)});
    const __toWrite=[];
    __items.forEach(__it=>{
      const __own=__it.__aliases.filter(__a=>__collided[__a]);
      if(__own.length){
        const __filters=[__it.__n].concat(__npcOrgWords(__it.__p));
        const __u=__npcField(__it.__p.单位);
        if(__u&&__filters.indexOf(__u)===-1)__filters.push(__u);
        const __j=__npcField(__it.__p.职务);
        if(__j&&__filters.indexOf(__j)===-1)__filters.push(__j);
        __toWrite.push(__buildNpcEntry(__it.__n,__it.__p,[__it.__n].concat(__it.__aliases),__filters,'and_any'))
      }else{
        __toWrite.push(__buildNpcEntry(__it.__n,__it.__p))
      }
    });
    Object.keys(__collided).forEach(__a=>{
      const __isExt=Object.keys(__collided).some(__b=>__b!==__a&&__a.indexOf(__b)!==-1);
      if(__isExt)return;
      const __members=__collided[__a];
      const __lines=[__members.length+'位简称「'+__a+'」，指代对象按上下文判定：'];
      __members.forEach(__it=>{__lines.push(__memberLine(__it))});
      __lines.push('上下文无法判定时，可自然开口追问对方身份');
      __toWrite.push({comment:'【人物】'+__a,keys:[__a],position:'after_character_definition',content:__lines.join('\n')})
    });
    await createLorebookEntries(__book,__toWrite);
    console.info('[官场模拟器] 开局人物已写入世界书',__book,__names.length,'人',Object.keys(__collided).length,'组撞名简称')
  }catch(__err){
    console.error('[官场模拟器] 开局人物写入世界书失败',__err)
  }
}
window.__npcLorebookSync={syncNow:__syncNpcsToChatLorebook,cleanup:__cleanupOrphanChatLorebooks};
__cleanupOrphanChatLorebooks();
try{
  eventOn(tavern_events.CHAT_CHANGED,()=>{__cleanupOrphanChatLorebooks()})
}catch(__e){console.warn('[官场模拟器] 聊天切换清理挂载失败',__e)}
console.info('[官场模拟器] 人物世界书同步模块已就绪');
