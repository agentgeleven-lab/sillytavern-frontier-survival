import * as E from './engine.js';
import {gainFood} from './provisions.js';
import {DEV_STATS,devValue,devEnabled,setDevValue,applyDevLocks,timeFrozen} from './developer-data.js';
export function developerAction(s,action,p={}){
 if(action==='devToggle'){s.developer={enabled:!devEnabled(s),timeLocked:false,locks:{}};E.log(s,s.developer.enabled?'开发者模式已开启。':'开发者模式已关闭，所有锁定已解除。');return;}
 E.assert(devEnabled(s),'请先开启开发者模式');
 if(action==='devGrant'){
  E.assert(Object.hasOwn(E.ITEMS,p.item),'未知物品');const qty=Number(p.qty);E.assert(Number.isInteger(qty)&&qty>=1&&qty<=10000,'数量需要是 1—10000 的整数');E.assert((s.bag[p.item]??0)+qty<=10000,'同类物品最多 10000 份');gainFood(s,s.bag,p.item,qty);E.log(s,`开发者发放：${E.ITEMS[p.item].name} ×${qty}。`);
 }else if(action==='devStats'){
  const values={};for(const id of Object.keys(DEV_STATS)){const raw=p[id]??(['wet','cold','heat'].includes(id)?devValue(s,id):undefined);E.assert(raw!==undefined&&String(raw).trim()!=='','请填写所有数值');const value=Number(raw),small=['bleeding','infection'].includes(id);E.assert(Number.isFinite(value)&&value>=0&&value<=(small?3:100)&&(!small||Number.isInteger(value)),`${DEV_STATS[id]}数值超出范围`);values[id]=value;}
  const locks={};for(const[id,value]of Object.entries(values)){setDevValue(s,id,value);if(p['lock_'+id]===true||p['lock_'+id]==='on')locks[id]=value;}
  s.developer.locks=locks;s.developer.timeLocked=p.timeLocked===true||p.timeLocked==='on';s.ended=s.stats.health<=0;E.log(s,'开发者已应用数值与锁定设置。');
 }else if(action==='devRestore'||action==='devClearWounds'){
  const values=action==='devRestore'?{health:100,food:100,water:100,stamina:100,spirit:100,wet:0,cold:0,heat:0,trauma:0,bleeding:0,infection:0}:{trauma:0,bleeding:0,infection:0};for(const[id,value]of Object.entries(values)){setDevValue(s,id,value);if(Object.hasOwn(s.developer.locks,id))s.developer.locks[id]=value;}s.ended=s.stats.health<=0;E.log(s,action==='devRestore'?'开发者已恢复全部状态并清除伤势。':'开发者已清除伤势。');
 }else if(action==='devAdvance'){
  E.assert(!timeFrozen(s),'请先解除时间冻结');const minutes=Number(p.minutes);E.assert(Number.isInteger(minutes)&&minutes>=1&&minutes<=10080,'推进时间须为 1—10080 分钟');E.tick(s,minutes,0);E.log(s,`开发者推进了 ${minutes} 分钟，生存规则照常结算。`);
 }else throw Error('未知开发者操作');
 applyDevLocks(s);E.refreshSight(s);
}
