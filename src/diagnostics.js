const VERSION='0.21.0',LIMIT=30,MAX_TEXT=60000;
const secretField=/api.?key|authorization|password|secret|token|cookie/i;
export function sanitize(value,secrets=[]){
  const variants=secrets.filter(s=>typeof s==='string'&&s).flatMap(s=>{const values=[s,JSON.stringify(s).slice(1,-1)];try{values.push(encodeURIComponent(s));}catch{}return values;}).sort((a,b)=>b.length-a.length);
  const clean=s=>{for(const secret of variants)s=s.split(secret).join('[已隐藏密钥]');return s.replace(/Bearer\s+[^\s"',}]+/gi,'Bearer [已隐藏]').replace(/((?:api[_-]?key|password|secret|access_token)\s*["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi,'$1[已隐藏]');};
  function walk(v,depth=0){if(depth>15)return '[层级过深，已省略]';if(typeof v==='string'){const s=clean(v);return s.length>MAX_TEXT?s.slice(0,MAX_TEXT)+'\n[内容超过60000字符，已截断]':s;}if(Array.isArray(v))return v.slice(0,500).map(x=>walk(x,depth+1));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).slice(0,1000).map(([k,x])=>[k,secretField.test(k)?'[已隐藏]':walk(x,depth+1)]));return v;}
  return walk(value);
}
export function createDiagnostics(storage,namespace){
  const key=`frontier-diagnostics:${namespace}`,listeners=new Set(),secrets=new Set();let records=[],warning='';
  try{const saved=JSON.parse(storage.getItem(key)??'[]');if(Array.isArray(saved))records=saved.filter(r=>r&&typeof r.id==='string').slice(-LIMIT).map(r=>({...sanitize(r),status:r.status==='requesting'?'interrupted':r.status}));}catch{warning='上次诊断记录无法读取，本次将重新记录。';}
  function publish(){while(records.length>LIMIT||JSON.stringify(records).length>1500000){if(records.length<=1)break;records.shift();}try{storage.setItem(key,JSON.stringify(records));}catch{warning='诊断记录无法写入本机存储，当前页面仍可查看和导出。';}for(const fn of listeners)try{fn();}catch{}}
  function update(id,patch){const r=records.find(r=>r.id===id);if(!r)return;Object.assign(r,sanitize(patch,[...secrets]),{elapsedMs:Date.now()-r.startedAt,updatedAt:Date.now()});publish();}
  return {
    list:()=>structuredClone(records).reverse(),warning:()=>warning,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    begin(kind,payload,config={},meta={}){
      if(config.apiKey)secrets.add(config.apiKey);
      let endpointOrigin=null;try{endpointOrigin=new URL(config.baseUrl).origin;}catch{}
      const id=crypto.randomUUID(),request=Object.fromEntries(['constraints','action','site','size','maxWidth','maxHeight'].filter(k=>payload?.[k]!==undefined).map(k=>[k,payload[k]]));
      const r=sanitize({id,kind,startedAt:Date.now(),elapsedMs:0,status:'requesting',model:config.model??'',endpointOrigin,timeout:config.timeout??0,outputLimit:config.maxTokens??null,...meta,request},[...secrets]);records.push(r);publish();return id;
    },
    update,
    trace(id,event){update(id,event);},
    error(message,scope){const previous=records.at(-1),safe=sanitize(String(message),[...secrets]);if(previous?.scope===scope&&previous.error===safe&&Date.now()-(previous.updatedAt??previous.startedAt)<3000){update(previous.id,{actionFailed:true});return;}const id=this.begin('operation',{}, {},{scope});update(id,{status:'error',error:safe});},
    clear(){records=[];warning='';publish();},
    export(id){const chosen=id?records.filter(r=>r.id===id):records;return JSON.stringify({format:'frontier-error-report',version:1,pluginVersion:VERSION,exportedAt:new Date().toISOString(),note:'本地诊断；不含请求头、API配置、角色卡背景或聊天请求正文。模型返回可能含剧情信息。较长响应会标记截断。',records:sanitize(chosen,[...secrets])},null,2);},
  };
}
// One entry per attempt. A repair keeps the same group and stores its own response.
export async function diagnosedRequest({diagnostics,kind,payload,config,scope,signal,request,validator,onRepair}){
  const group=crypto.randomUUID();let input=payload;
  for(let attempt=1;attempt<=(validator?2:1);attempt++){
    const id=diagnostics.begin(kind,input,config,{scope,group,attempt});let raw;
    try{raw=await request(input,event=>diagnostics.trace(id,event));}
    catch(e){diagnostics.update(id,{status:signal?.aborted?'cancelled':'error',error:e.message});throw e;}
    if(!validator){diagnostics.update(id,{status:'received'});return raw;}
    try{validator(raw);diagnostics.update(id,{status:'validated'});return raw;}
    catch(e){diagnostics.update(id,{status:'invalid',error:e.message});if(attempt===2||signal?.aborted)throw e;onRepair?.();input={...payload,correction:{error:e.message,previous:raw}};}
  }
}
