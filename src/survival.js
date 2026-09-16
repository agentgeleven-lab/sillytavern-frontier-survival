import {timeFrozen} from './developer-data.js';
import * as E from './engine.js';
import {FACILITIES,currentCamp,hasFacility} from './shelter-data.js';
import {settleFood,consumeFood,gainFood,FOOD_LIFE,discardSpoiled,freshQty,foodBatches} from './provisions.js';
import {injuryState} from './injury-data.js';
export function survivalAction(s,action,item){
 E.assert(!s.ended,'角色已无法行动');const camp=currentCamp(s);
 if(action==='buildFacility'){
  E.assert(camp&&Object.hasOwn(FACILITIES,item),'请在区域地图的营地建设');const r=FACILITIES[item];E.assert(!camp.facilities?.[item],'设施已经建成');E.assert(!r.requires||camp.facilities?.[r.requires],'请先建设灶台');
  for(const[id,q]of Object.entries(r.cost))E.assert((s.bag[id]??0)>=q,`缺少${E.ITEMS[id].name}，需要 ${q}`);
  for(const[id,q]of Object.entries(r.cost))s.bag[id]-=q;E.tick(s,r.minutes);if(s.ended){E.log(s,'建设中健康耗尽，设施未完成。');return;}
  settleFood(s,camp.storage);camp.facilities??={};camp.facilities[item]=true;camp.provisions.rate=camp.facilities.cellar?.25:1;E.log(s,`建成${r.name}：${r.description}`);return;
 }
 if(action==='campCook'||action==='smokeMeat'){
  const smoke=action==='smokeMeat',minutes=smoke?120:15,wood=smoke?2:1,id=smoke?'smokedmeat':'cookedmeat';E.assert(hasFacility(s,'stove')&&(!smoke||hasFacility(s,'smoker')),'请在建有对应设施的营地加工');E.assert((s.bag.wood??0)>=wood,'木材不足');E.assert(freshQty(s,'rawmeat',s.bag,timeFrozen(s)?0:minutes)>0,'没有足够新鲜的生肉');E.assert(E.weight(s.bag)-E.ITEMS.rawmeat.weight-wood+E.ITEMS[id].weight<=20,'背包空间不足');
  const life=consumeFood(s,s.bag,'rawmeat',1,timeFrozen(s)?0:minutes);s.bag.wood-=wood;E.tick(s,minutes,0);if(!s.ended){gainFood(s,s.bag,id,1,FOOD_LIFE[id]*(life-(timeFrozen(s)?0:minutes))/FOOD_LIFE.rawmeat);E.log(s,smoke?'完成一份熏肉，保存期限继承原料的新鲜比例。':'完成一份熟肉，保存期限继承原料的新鲜比例。');}return;
 }
 if(action==='discardFood'){E.assert(item==='bag'||item==='camp'&&camp,'请选择背包或当前营地');const bag=item==='camp'?camp.storage:s.bag;E.assert(foodBatches(s,bag).some(b=>!b.life),'没有腐败食物');const n=discardSpoiled(s,bag);E.log(s,`丢弃 ${n} 份腐败食物。`);return;}
 const w=injuryState(s);E.assert(['bandage','treatInfection'].includes(action),'未知生存操作');
 if(action==='bandage'){
  E.assert(w.bleeding>0,'没有需要止血的伤口');E.assert((s.bag.cloth??0)>0,'需要一份布料');s.bag.cloth--;E.tick(s,5,0);if(!s.ended){s.injuries.bleeding=0;s.injuries.exposure=0;E.log(s,'已包扎止血；创伤与既有感染仍需休养、治疗。');}
 }else{
  E.assert(w.infection>0||w.trauma>0||w.bleeding>0,'没有需要处理的伤势');E.assert((s.bag.medicine??0)>0,'需要一份医疗用品');s.bag.medicine--;E.tick(s,10,0);if(!s.ended){Object.assign(s.injuries,{bleeding:0,infection:0,exposure:0,trauma:Math.max(0,w.trauma-20)});s.stats.health=Math.min(100,s.stats.health+10);E.log(s,'医疗处理完成：止血、清除感染、创伤降低 20，健康恢复 10。');}
 }
}
