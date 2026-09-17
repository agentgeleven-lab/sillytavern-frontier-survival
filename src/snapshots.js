import {assert} from './engine.js';
export const MANUAL_SLOTS=['manual-1','manual-2','manual-3','manual-4','manual-5'];
export const AUTO_SLOTS=['auto-1','auto-2','auto-3'];
export const SNAPSHOT_SLOTS=[...MANUAL_SLOTS,...AUTO_SLOTS,'before-load'];
const read=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
export async function worldBundle(tx,scope,h){
 assert(h,'没有可保存的游戏');const pairs=await Promise.all(Object.keys(h.atlas.regions).map(async coord=>[coord,await read(tx.objectStore('regions').get([scope,h.id,coord]))]));
 assert(pairs.every(([,r])=>r),'部分区域存档缺失，未覆盖存档槽');const regions=Object.fromEntries(pairs);
 return {format:'frontier-world',version:2,state:{...h,...regions[`${h.atlas.x},${h.atlas.y}`]},regions};
}
export function snapshotRecord(slot,name,bundle){const s=bundle.state;return {slot,name,token:crypto.randomUUID(),savedAt:Date.now(),time:s.time,gameId:s.id,revision:s.revision,region:s.world.name,worldPosition:{x:s.atlas.x,y:s.atlas.y},regions:Object.keys(bundle.regions).length,health:s.stats.health,bundle};}
export async function checkpointCommit(tx,scope,previous,next,{replace,checkpoint}={}){
 const slots=tx.objectStore('snapshots');
 // Backup the complete old world before any region is overwritten by a replacement.
 if(replace&&previous)slots.put(snapshotRecord('before-load','读取 / 替换前备份',await worldBundle(tx,scope,previous)),[scope,'before-load']);
 if(checkpoint){assert(MANUAL_SLOTS.includes(checkpoint.slot),'手动存档槽无效');assert(typeof checkpoint.name==='string'&&checkpoint.name.trim().length<=40,'存档名称最长 40 字');
  const old=await read(slots.get([scope,checkpoint.slot]));assert((old?.token??null)===(checkpoint.expectedToken??null),'这个存档槽已被另一窗口修改，请刷新列表后重试');
 }
 return async()=>{
  const clock=await read(slots.get([scope,'clock'])),auto=!clock||clock.gameId!==next.id||clock.coord!==`${next.atlas.x},${next.atlas.y}`||next.time-clock.time>=30;
  if(!auto&&!checkpoint)return;
  const bundle=await worldBundle(tx,scope,next);
  if(checkpoint)slots.put(snapshotRecord(checkpoint.slot,checkpoint.name.trim()||'手动存档',bundle),[scope,checkpoint.slot]);
  if(auto){const index=((clock?.index??-1)+1)%AUTO_SLOTS.length,slot=AUTO_SLOTS[index];slots.put(snapshotRecord(slot,'自动存档',bundle),[scope,slot]);slots.put({gameId:next.id,coord:`${next.atlas.x},${next.atlas.y}`,time:next.time,index},[scope,'clock']);}
 };
}
