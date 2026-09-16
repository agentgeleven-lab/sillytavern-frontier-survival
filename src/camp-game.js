import {expansionPlan,expansionBags} from './camp-expansion.js';
import {batchPlan} from './camp-plans.js';
import * as E from './engine.js';
import {FURNITURE,campSize,campExit,simpleCamp,canUseCampObject,campAt,nearObject,nearCampFacility,campPath,placementError,revealCamp,campVisible} from './camp-data.js';
import {settleFood} from './provisions.js';
import {equipped} from './equipment-data.js';
import {lightState} from './lighting-data.js';
export const campBag=(camp,o)=>o.legacy?camp.storage:o.items;
export function ensureCamp(s){const c=campAt(s);E.assert(c,'请先建设庇护所');if(c.layout)return c.layout;settleFood(s,c.storage);c.layout={version:1,serial:10,seen:{},objects:[{id:'legacy',type:'box',x:5,y:12,rot:0,name:'旧储物箱',legacy:true}]};c.provisions.rate=1;const spots={bed:[3,3],cellar:[10,3],bench:[3,7],stove:[10,7],smoker:[10,10]};for(const[type,[x,y]]of Object.entries(spots))if(c.facilities?.[type])c.layout.objects.push({id:'old-'+type,type,x,y,rot:0,name:FURNITURE[type].name,...(FURNITURE[type].capacity?{items:{}}:{})});return c.layout;}
export const campStepMinutes=()=>0;
function target(s,p,near=true){const o=campAt(s).layout.objects.find(o=>o.id===p.id);E.assert(o,'家具不存在');E.assert(!near||canUseCampObject(s,o),'请先走到家具旁边');return o;}
export function campAction(s,action,p={}){
 if(action==='campSetMode'){E.assert(s.player.camp&&['map','simple'].includes(p.mode),'营地模式无效');s.campMode=p.mode;return;}
 E.assert(!s.ended,'角色已无法行动');
 if(action==='campEnter'){E.assert(!s.player.local&&!s.player.camp,'请先返回区域地图');ensureCamp(s);s.player.camp={...campExit(campAt(s).layout)};revealCamp(s);E.log(s,'进入庇护所营地。');return;}
 E.assert(s.player.camp&&campAt(s)?.layout,'请先进入营地');const camp=campAt(s),l=camp.layout;
 if(action==='campExpand'){const plan=expansionPlan(s);E.assert(plan,'营地已达到最大尺寸');E.assert(p.size===plan.to,'扩建预览已变化，请重新确认');E.assert(plan.enough,'扩建材料不足');for(const[id,q]of Object.entries(plan.cost)){let left=q;for(const bag of expansionBags(s)){const take=Math.min(left,bag[id]??0);if(take)bag[id]-=take;left-=take;}}E.tick(s,plan.minutes);if(s.ended){E.log(s,'扩建中健康耗尽，营地未扩大。');return;}l.size=plan.to;revealCamp(s);E.log(s,`营地扩建至 ${plan.to}×${plan.to}，家具与库存原位保留，入口向南延伸。`);return;}
 if(action==='campSelectBed'){const o=target(s,p);E.assert(o.type==='bed','这不是床铺');s.player.camp.bedId=o.id;return;}
 if(action==='campBatchPlace'){const plan=batchPlan(s,p.type,p.points);E.assert(plan.objects.length,'选区已经建成，无需重复建设');for(const[id,q]of Object.entries(plan.cost))E.assert((s.bag[id]??0)>=q,'批量建设材料不足');for(const[id,q]of Object.entries(plan.cost))s.bag[id]-=q;E.tick(s,plan.minutes);if(!s.ended){l.objects.push(...plan.objects);l.serial+=plan.objects.length;E.log(s,`批量建成 ${plan.objects.length} 格${FURNITURE[p.type].name}。`);}else E.log(s,'批量施工中健康耗尽，未完成。');return;}
 if(action==='campExit'){E.assert(simpleCamp(s)||s.player.camp.x===7&&s.player.camp.y===campSize(l)-1,'请先走到南侧入口');delete s.player.camp;E.log(s,'离开营地，返回区域地图。');return;}
 if(action==='campMove'){const to={x:Number(p.x),y:Number(p.y)};E.assert(campVisible(s,to.x,to.y),'目标超出营地范围');const path=campPath(l,s.player.camp,to);E.assert(path?.length,'这里不可到达');for(const next of path){s.player.camp=next;revealCamp(s);if(s.ended)break;}return;}
 if(action==='campAutoPlace'){E.assert(simpleCamp(s),'请切换简易模式');E.assert(Object.hasOwn(FURNITURE,p.type),'未知家具');for(let y=1;y<campSize(l)-1;y++)for(let x=1;x<campSize(l)-1;x++)for(const rot of [0,1]){if(!placementError(l,{type:p.type,x,y,rot,id:'preview'},s.player.camp)){campAction(s,'campPlace',{type:p.type,x,y,rot});return;}}throw Error('营地没有合适的空位，请切换地图模式整理布局');}
 if(action==='campPlace'||action==='campRelocate'){
  const old=action==='campRelocate'?target(s,p,false):null,type=old?.type??p.type;E.assert(Object.hasOwn(FURNITURE,type),'未知家具');const f=FURNITURE[type],o={...(old??{}),id:old?.id??'f'+(l.serial+1),type,x:Number(p.x),y:Number(p.y),rot:Number(p.rot),name:old?.name??f.name};
  E.assert(!old?.legacy||!Object.values(camp.storage).some(q=>q>0),'请先清空旧储物箱再搬动');E.assert(!old?.items||!Object.values(old.items).some(q=>q>0),'请先清空容器再搬动');
  const error=placementError(l,o,s.player.camp,old?.id);E.assert(!error,error);
  if(!old){if(type==='smoker')E.assert(l.objects.some(o=>o.type==='stove'),'先建设灶台');for(const[id,q]of Object.entries(f.cost))E.assert((s.bag[id]??0)>=q,'建设材料不足');for(const[id,q]of Object.entries(f.cost))s.bag[id]-=q;}
  E.tick(s,old?10:f.minutes);if(s.ended){E.log(s,'施工中健康耗尽，未完成。');return;}if(!old){l.serial++;if(f.capacity)o.items={};if(type==='door')o.open=false;l.objects.push(o);}else Object.assign(old,o);E.log(s,`${old?'搬动':'建成'}${o.name}。`);
 }else if(action==='campRemove'){
  const o=target(s,p);E.assert(!o.legacy,'旧储物箱保留以兼容原有存档，可以搬动');E.assert(!o.items||!Object.values(o.items).some(q=>q>0),'先清空容器再拆除');E.assert(!(o.type==='stove'&&l.objects.some(a=>a.type==='smoker')&&l.objects.filter(a=>a.type==='stove').length===1),'请先拆除熏架');E.tick(s,10);if(!s.ended){l.objects=l.objects.filter(a=>a.id!==o.id);if(s.player.camp.bedId===o.id)delete s.player.camp.bedId;}E.log(s,s.ended?'拆除中健康耗尽，家具仍保留。':'拆除完成，不返还材料。');
 }else if(action==='campDoor'){const o=target(s,p);E.assert(o.type==='door','这不是门');E.assert(!(s.player.camp.x===o.x&&s.player.camp.y===o.y),'请先离开门所在的格子');o.open=!o.open;E.tick(s,1);
 }else if(action==='campDeposit'||action==='campWithdraw'){
  const o=target(s,p),f=FURNITURE[o.type];E.assert(f.capacity,'这不是储物容器');const bag=campBag(camp,o),into=action==='campDeposit';
  if(into&&equipped(s)===p.item)E.assert((s.bag[p.item]??0)>1,'先卸下装备再存入');if(into&&['torch','flashlight'].includes(p.item)&&lightState(s)[p.item]>0)E.assert((s.bag[p.item]??0)>1,'请保留已装载的照明装备');E.transfer(into?s.bag:bag,into?bag:s.bag,p.item,1,into?(o.legacy?200:f.capacity):20,s);
 }else if(action==='campRename'){const o=target(s,p);E.assert(FURNITURE[o.type].capacity,'只能重命名容器');E.assert(typeof p.name==='string'&&p.name.trim().length>0&&p.name.trim().length<=40,'名称须为 1—40 字');o.name=p.name.trim();
 }else throw Error('未知营地操作');
 revealCamp(s);
}
