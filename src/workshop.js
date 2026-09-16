import {worn} from './durable-data.js';
import * as E from './engine.js';
import {campAt,canUseCampObject} from './camp-data.js';
import {hasFacility} from './shelter-data.js';
import {WORKSHOP_RECIPES,UPGRADE_COSTS,benchLevel,usableBench} from './workshop-data.js';
import {heaterFuel,heaterHeat} from './temperature.js';
import {coverAt} from './camp-rooms.js';
import {tiles} from './camp-data.js';
import {timeFrozen} from './developer-data.js';
function spend(s,cost){for(const[id,q]of Object.entries(cost))E.assert((s.bag[id]??0)>=q,`缺少${E.ITEMS[id].name} ${q}`);for(const[id,q]of Object.entries(cost))s.bag[id]-=q;}
export function workshopAction(s,action,p={}){E.assert(!s.ended,'角色已无法行动');if(action==='wearCoat'){E.assert((s.bag.warmcoat??0)>0,'背包没有保暖外套');s.thermal??={wet:0,cold:0,heat:0,coat:false};const active=worn(s).torso==='warmcoat';if(s.wardrobe){if(active)delete s.wardrobe.torso;else s.wardrobe.torso='warmcoat';s.thermal.coat=false;}else s.thermal.coat=!s.thermal.coat;return;}
 if(action==='workshopCraft'){const r=WORKSHOP_RECIPES[p.recipe];E.assert(r,'未知加工配方');E.assert(usableBench(s,r.level),'请使用对应等级工作台');E.assert(!r.metal||hasFacility(s,'metalbench'),'还需要可使用的金属工作台');E.assert(E.weight(s.bag)-E.weight(r.cost)+E.weight(r.output)<=20,'背包空间不足');spend(s,r.cost);E.tick(s,r.minutes,0);if(!s.ended){for(const[id,q]of Object.entries(r.output))s.bag[id]=(s.bag[id]??0)+q;E.log(s,`完成${r.name}。`);}return;}
 E.assert(s.player.camp,'请进入营地');const l=campAt(s).layout,o=l.objects.find(a=>a.id===p.id);E.assert(o&&canUseCampObject(s,o),'请靠近该家具或切换简易模式');
 if(action==='upgradeBench'){E.assert(o.type==='bench'&&benchLevel(o)<3,'工作台已满级或类型不符');const next=benchLevel(o)+1;E.assert(p.level===next,'升级预览已变化');spend(s,UPGRADE_COSTS[next]);E.tick(s,60*next,0);if(!s.ended){o.workshopLevel=next;E.log(s,`工作台升级到 ${next} 级。`);}return;}
 if(action==='heaterFeed'||action==='heaterToggle'){E.assert(o.type==='heater','这不是暖炉');const complete=coverAt(l,tiles(o)).kind==='room',fuel=heaterFuel(o,s.time),heat=heaterHeat(o,s.time,complete);o.heater={fuel,heat,at:s.time,lit:!!o.heater?.lit&&fuel>0};if(action==='heaterFeed'){E.assert(fuel<=420,'暖炉最多储存 8 小时燃料');spend(s,{fuel:1});o.heater.fuel+=60;}else{E.assert(!o.heater.lit?fuel>0:true,'请先添加燃料');o.heater.lit=!o.heater.lit;}E.log(s,action==='heaterFeed'?'暖炉添加燃料 1，增加 60 分钟。':o.heater.lit?'点燃暖炉。':'关闭暖炉，剩余燃料保留。');return;}
 if(action==='relaxFurniture'){E.assert(['chair','armchair','bookshelf','radio'].includes(o.type),'家具不能用于休闲');E.assert(!timeFrozen(s),'请解除时间冻结再休闲');E.assert((s.relaxUntil??0)<=s.time,'刚休闲过，稍后再进行');if(o.type==='bookshelf')E.assert((s.bag.book??0)>0,'阅读需要背包里有书籍（不消耗）');if(o.type==='radio')spend(s,{battery:1});const gain={chair:3,armchair:5,bookshelf:8,radio:8}[o.type];E.tick(s,30,0);if(!s.ended){s.stats.spirit=Math.min(100,(s.stats.spirit??100)+gain);s.stats.stamina=Math.min(100,s.stats.stamina+5);s.relaxUntil=s.time+180;o.relaxAt=s.time;E.log(s,`使用${o.name}休闲：精神 +${gain}，体力 +5；所有休闲家具共享 3 小时间隔。`);}return;}throw Error('未知家具操作');}
