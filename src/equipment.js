import {craftMinutes} from './shelter-data.js';
import * as E from './engine.js';
import {GEAR,equipped} from './equipment-data.js';
export function equipmentAction(s,action,item){
 E.assert(!s.ended,'角色已无法行动');
 if(action==='craftGear'){
  E.assert(Object.hasOwn(GEAR,item),'未知装备配方');const r=GEAR[item],next={...s.bag};
  for(const[id,q]of Object.entries(r.cost)){E.assert((next[id]??0)>=q,`缺少${E.ITEMS[id].name}，需要 ${q} 份`);next[id]-=q;}
  next[item]=(next[item]??0)+(r.qty??1);E.assert(E.weight(next)<=20,'背包空间不足');
  for(const[id,q]of Object.entries(r.cost))s.bag[id]-=q;E.tick(s,craftMinutes(s,r.minutes));
  if(!s.ended){s.bag[item]=(s.bag[item]??0)+(r.qty??1);E.log(s,`制作${r.name} ×${r.qty??1}，尚未自动装备。`);}else E.log(s,'制作中健康耗尽，材料已消耗，未获得成品。');return;
 }
 if(action==='equipWeapon'){
  E.assert(['none','tool','stoneknife','woodspear','stonespear','bow'].includes(item),'未知装备');E.assert(item==='none'||(s.bag[item]??0)>0,'背包中没有这件装备');
  s.equipment??={weapon:null,stance:'walk'};s.equipment.weapon=item==='none'?null:item;E.log(s,`当前武器：${equipped(s)?E.ITEMS[item].name:'徒手'}。`);
 }else if(action==='stance'){
  E.assert(['walk','sneak'].includes(item),'未知行动姿态');s.equipment??={weapon:equipped(s),stance:'walk'};s.equipment.stance=item;E.log(s,item==='sneak'?'进入潜行姿态：地点内每格两分钟，降低动物察觉距离。':'恢复普通行走：地点内每格一分钟。');
 }else throw Error('未知装备操作');
}
