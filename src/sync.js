import { assert, text, int, hash, cell, log } from './engine.js';
export function messageIdentity(m,index){return hash(`${m?.send_date??''}|${index}|${m?.name??''}|${!!m?.is_user}`);}
export function messageFingerprint(m){return hash(`${m?.mes??''}|${m?.swipe_id??0}`);}
export function validateEvents(raw,target,size=9){
  assert(raw&&Array.isArray(raw.events)&&raw.events.length<=4,'聊天同步结果无效');
  return raw.events.map(e=>{
    assert(['rumor','discovery'].includes(e.kind),'不支持的同步事件');
    const quote=text(e.quote,1200);assert(quote.length>1&&target.text.includes(quote),'同步证据不在原消息中');
    const title=text(e.title,80),detail=text(e.detail,800);assert(title&&detail,'线索缺少内容');
    assert((e.x===null&&e.y===null)||(Number.isInteger(e.x)&&Number.isInteger(e.y)),'线索坐标无效');
    return {kind:e.kind==='discovery'&&target.isUser?'discovery':'rumor',title,detail,quote,x:e.x===null?null:int(e.x,0,size-1),y:e.y===null?null:int(e.y,0,size-1)};
  });
}
function canPlace(e,target,s){
  if(e.x===null||!cell(s,e.x,e.y))return false;
  const known=Object.values(s.world.cells).find(c=>c.known&&(c.site?.name===e.title||c.poi?.name===e.title));
  if(known)return known.x===e.x&&known.y===e.y;
  const normalized=target.text.replace(/[（(]\s*/g,'(').replace(/\s*[）)]/g,')').replace(/，/g,',').replace(/\s/g,'');
  if(normalized.includes(`(${e.x},${e.y})`))return true;
  return /这里|此处|眼前/.test(e.quote)&&e.x===s.player.x&&e.y===s.player.y;
}
export function applyEvents(s,events,{id,fingerprint,target,name}){
  if(s.sync[id]?.fingerprint===fingerprint)return;
  revokeSource(s,id);
  s.sync[id]={fingerprint,at:Date.now()};
  events.forEach((e,i)=>{
    const clue={...e,id:`${id}:${fingerprint}:${i}`,source:id,sourceName:name||'聊天',revoked:false,appliedSite:null};
    if(!canPlace(e,target,s)) {clue.x=null;clue.y=null;}
    if(clue.kind==='discovery'&&clue.x!==null){
      const c=cell(s,clue.x,clue.y);
      if(c.terrain==='w'||(c.site&&c.site.name!==clue.title)||(c.poi&&c.poi.name!==clue.title)){clue.conflict='与已有地形或地点冲突，保留为待核对记录';}
      else if(!c.site&&!c.poi&&s.locals[`field-${c.x}-${c.y}`]){clue.conflict='此地块已经实地生成，保留为待核对线索，不改写原有布局';}
      else if(!c.site&&!c.poi){
        // Record former visibility so source removal can retract an unvisited discovery.
        clue.previous={known:c.known,name:c.name};
        c.site={id:`chat-${clue.id}`,name:clue.title,kind:'待探索地点',size:'normal',description:clue.detail,origin:clue.id};c.name=clue.title;c.known=true;clue.appliedSite=c.site.id;
      }
      else {clue.previous={known:c.known};c.known=true;}
    }
    s.clues.push(clue);log(s,`${clue.kind==='rumor'?'新增线索':'记录发现'}：${clue.title}${clue.conflict?'（待核对）':clue.x===null?'（待定位）':''}。`);
  });
}
export function revokeClue(s,id){const clue=s.clues.find(c=>c.id===id);if(!clue||clue.revoked)return;clue.revoked=true;
  const support=s.clues.find(c=>!c.revoked&&c.kind==='discovery'&&c.x===clue.x&&c.y===clue.y&&c.title===clue.title);
  if(support&&clue.kind==='discovery'){if(clue.appliedSite){support.appliedSite=clue.appliedSite;support.previous=clue.previous;}else if(clue.previous?.known===false)support.previous=clue.previous;return;}
  if(clue.appliedSite){const c=cell(s,clue.x,clue.y);if(c?.site?.id===clue.appliedSite){if(!c.visited&&!s.locals[c.site.id]&&!c.camp){c.site=null;c.name=clue.previous?.name??'待探索区域';c.known=!!clue.previous?.known;}else clue.retained='此地点已实际探索，保留游戏事实。';}}
  else if(clue.kind==='discovery'&&clue.previous?.known===false&&clue.x!==null){const c=cell(s,clue.x,clue.y);if(c&&!c.visited&&!s.locals[c.site?.id]&&!c.camp)c.known=false;}
}
export function revokeSource(s,id){for(const c of s.clues.filter(c=>c.source===id&&!c.revoked))revokeClue(s,c.id);}
export function reconcileSources(s,messages){const current=new Map(messages.map((m,i)=>[messageIdentity(m,i),messageFingerprint(m)]));let changed=false;for(const[id,entry]of Object.entries(s.sync)){if(current.get(id)!==entry.fingerprint){revokeSource(s,id);delete s.sync[id];changed=true;}}return changed;}
export function manualClue(s,{title,detail,x=null,y=null}){const id=`manual-${Date.now()}`;s.clues.push({id,source:id,sourceName:'手动笔记',kind:'rumor',title:text(title,80),detail:text(detail,800),x:x===null?null:int(x,0,s.world.size-1),y:y===null?null:int(y,0,s.world.size-1),revoked:false});log(s,`记录线索：${title}。`);}
