import {weapon,cuttingTool,bowChance} from './equipment-data.js';
import {changeSpirit} from './spirit.js';
import * as E from './engine.js';
import {SPECIES,killAnimal} from './wildlife.js';
import {randomAt} from './environment.js';
import {fireRemaining} from './lighting-data.js';
import {RETALIATION,SCARE_CHANCE,HUNT_ACTIONS,corpseAge,corpseFreshness} from './hunting-data.js';
export function selectedAnimal(s,id){const m=E.localMap(s),a=m?.wildlife?.animals.find(a=>a.id===id);E.assert(a&&E.canSee(s,a.x,a.y),'目标已不在当前视野内，请重新选择');return {m,a,distance:Math.abs(s.player.local.x-a.x)+Math.abs(s.player.local.y-a.y)};}
export function cookingReady(s){const m=E.localMap(s),f=m?.fire,p=s.player.local;return !!(f&&p&&Math.abs(p.x-f.x)+Math.abs(p.y-f.y)<=1&&f.lit&&fireRemaining(s,f)>=10);}
function enoughWeight(s,id){E.assert(E.weight(s.bag)+E.ITEMS[id].weight<=20,'背包空间不足，请先存放物品');}
export function huntingAction(s,action,id){
 E.assert(!s.ended&&s.stats.health>0,'角色已无法行动');
 if(action==='approachAnimal'){const {a,distance}=selectedAnimal(s,id);E.assert(distance>1,'已经在目标旁');const path=E.approachPath(s,a.x,a.y);E.assert(path?.length,'没有可通行的已知路线');const end=path.at(-1);E.move(s,end.x,end.y);E.log(s,'已向目标原位置靠近；动物可能移动，请重新确认位置。');return;}
 const rule=HUNT_ACTIONS[action];E.assert(rule,'未知狩猎操作');E.assert(s.stats.stamina>=rule.stamina,'体力不足');
 if(action==='cookMeat'||action==='processHide'){
  const cook=action==='cookMeat',source=cook?'rawmeat':'hide',result=cook?'cookedmeat':'cloth';
  E.assert((s.bag[source]??0)>0,`缺少${E.ITEMS[source].name}`);
  E.assert(cook?cookingReady(s):cuttingTool(s),cook?'请靠近燃烧中的营火，燃料需至少 10 分钟':'加工皮料需要工具');
  E.assert(E.weight(s.bag)-E.ITEMS[source].weight+E.ITEMS[result].weight<=20,'背包空间不足');
  s.bag[source]--;E.tick(s,rule.minutes,0);if(!s.ended){s.bag[result]=(s.bag[result]??0)+1;E.log(s,cook?'烤熟一份生肉，可食用恢复 30 饱食。':'加工一份皮料，得到一份布料。');}else E.log(s,'加工中健康耗尽，材料已消耗，未获得成品。');return;
 }
 const {m,a,distance}=selectedAnimal(s,id),name=SPECIES[a.species].name,w=weapon(s);
 const shooting=action==='shootAnimal';
 if(shooting){E.assert(w.id==='bow','请先装备弓');E.assert((s.bag.arrow??0)>0,'没有箭矢');}
 if(action==='attackAnimal')E.assert(w.id!=='bow','弓需要使用射击操作');
 E.assert(distance<=(action==='scareAnimal'?3:(shooting||action==='attackAnimal')?w.range:1),action==='scareAnimal'?'请靠近到三格内':(shooting||action==='attackAnimal')?'目标超出武器射程':'请先走到目标所在格或相邻格');
 if(action==='inspectAnimal'){
  a.examinedAt=s.time;
  const info=a.hp>0?`健康 ${a.hp}/${SPECIES[a.species].hp}，${a.state==='flee'?'正在逃跑':'注意保持距离'}`:`${corpseFreshness(s,a)}，可用生肉 ${corpseAge(s,a)<720?a.meat:0}、皮料 ${a.hide??0}；附近可见活体 ${m.wildlife.animals.filter(b=>b.hp>0&&E.canSee(s,b.x,b.y)).length} 只`;
  E.log(s,`检查${name}：${info}（检查时记录）。`);E.tick(s,1,0);return;
 }
 if(action==='attackAnimal'||shooting||action==='scareAnimal'){
  E.assert(a.hp>0,'这只动物已经死亡');const attack=action==='attackAnimal'||shooting,damage=w.damage;
  const roll=randomAt(`${s.seed}:${a.id}:${action}`,s.time,shooting?0:s.revision),success=shooting?roll<bowChance(s,distance):attack||roll<SCARE_CHANCE[a.species];
  if(shooting)s.bag.arrow--;
  s.stats.stamina-=rule.stamina;
  if(attack&&success){a.hp=Math.max(0,a.hp-damage);if(!a.hp)killAnimal(m,a,s.time);}
  if(a.hp>0&&(success||shooting)){a.fear={x:s.player.local.x,y:s.player.local.y,until:s.time+5};a.state='flee';}
  const counter=a.hp>0&&distance<=1&&(attack?roll<.5:!success)?RETALIATION[a.species]:0;
  E.log(s,attack?`${w.name}攻击${name}，${success?`造成 ${damage} 点伤害${a.hp?'。':'，动物死亡。'}`:'未命中，箭矢已消耗。'}`:`驱赶${name}${success?'成功，动物尝试逃离。':'失败，未能持续驱离动物。'}`);
  E.tick(s,rule.minutes,0);
  if(counter){changeSpirit(s,-counter*.5);s.stats.health=Math.max(0,s.stats.health-counter);s.ended=s.stats.health<=0;E.log(s,`${name}在接触中反击，损失 ${counter} 点健康、${counter*.5} 点精神${s.ended?'，角色已无法行动':''}。`);}return;
 }
 E.assert(a.hp===0,'只能处理动物尸体');
 if(action==='clearAnimal'){s.stats.stamina-=rule.stamina;m.wildlife.animals=m.wildlife.animals.filter(b=>b.id!==id);E.tick(s,rule.minutes,0);E.log(s,`清理${name}遗骸，未取出的物资一并丢弃。`);return;}
 E.assert(['butcherAnimal','skinAnimal'].includes(action),'未知尸体操作');E.assert(a.examinedAt!==undefined,'请先检查尸体');E.assert(cuttingTool(s),'分割和剥皮需要工具');
 const meat=action==='butcherAnimal',resource=meat?'meat':'hide',item=meat?'rawmeat':'hide';
 E.assert((a[resource]??0)>0,'这部分资源已经耗尽');E.assert(corpseAge(s,a)+rule.minutes<(meat?720:1440),meat?'尸体即将或已经腐败，不能割取可用生肉':'尸体即将腐解，来不及剥皮');enoughWeight(s,item);
 // Reserve only this portion; predators may consume the rest during the work.
 a[resource]--;s.stats.stamina-=rule.stamina;E.tick(s,rule.minutes,0);
 if(!s.ended){s.bag[item]=(s.bag[item]??0)+1;E.log(s,`从${name}遗骸取得${E.ITEMS[item].name} ×1。`);}else E.log(s,'处理中健康耗尽，未取得预留的材料。');
}
