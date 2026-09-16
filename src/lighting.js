import * as E from './engine.js';
import {LIGHTS,LIGHT_RECIPES,lightState,fireRemaining,DIRECTIONS} from './lighting-data.js';
export function lightingAction(s,action,item){
 E.assert(!s.ended,'角色已无法行动');
 if(action==='craftLight'){
  const recipe=LIGHT_RECIPES[item];E.assert(recipe,'未知照明配方');for(const[id,q]of Object.entries(recipe.cost))E.assert((s.bag[id]??0)>=q,`缺少${E.ITEMS[id].name}，需要 ${q} 份`);
  const next={...s.bag};for(const[id,q]of Object.entries(recipe.cost))next[id]-=q;next[item]=(next[item]??0)+1;E.assert(E.weight(next)<=20,'背包空间不足');s.bag=next;E.tick(s,recipe.minutes);E.log(s,`${recipe.name}完成。`);return;
 }
 s.lighting??={...lightState(s)};const l=s.lighting;
 if(action==='lightOn'){
  E.assert(['torch','flashlight'].includes(item)&&(s.bag[item]??0)>0,'背包中没有这件照明装备');
  if(item==='torch'&&!l.torch)l.torch=LIGHTS.torch.duration;
  E.assert(l[item]>0,'手电无电，请先装入电池');l.active=item;E.log(s,`开启${LIGHTS[item].name}。`);
 }else if(action==='lightOff'){E.assert(l.active,'没有开启的照明装备');l.active=null;E.log(s,'关闭随身照明，保留剩余燃料或电量。');}
 else if(action==='reloadLight'){E.assert((s.bag.flashlight??0)>0&&(s.bag.battery??0)>0&&l.flashlight===0,'需要手电和电池，且当前电量已经耗尽');s.bag.battery--;l.flashlight=LIGHTS.flashlight.duration;E.log(s,'装入一份电池，手电可照明 240 分钟。');}
 else if(action==='faceLight'){E.assert(Object.hasOwn(DIRECTIONS,item),'未知朝向');l.facing=item;}
 else if(['fireBuild','fireFeed','fireToggle'].includes(action)){
  const map=E.localMap(s),p=s.player.local;E.assert(map?.kind==='field','请进入露天地块操作营火');
  if(action==='fireBuild'){
   E.assert(!map.fire,'本地块已有火堆');E.assert(map.grid[p.y][p.x]==='.'&&!map.containers[E.key(p.x,p.y)]&&!map.portals.some(a=>a.x===p.x&&a.y===p.y),'请在没有物件或入口的地面生火');E.assert((s.bag.wood??0)>=2,'需要 2 份木材');s.bag.wood-=2;E.tick(s,10);map.fire={x:p.x,y:p.y,remaining:120,updatedAt:s.time,lit:true};E.log(s,'搭起营火，燃料可持续 120 分钟。');
  }else{
   const f=map.fire;E.assert(f&&Math.abs(p.x-f.x)+Math.abs(p.y-f.y)<=1,'请走到火堆旁');const remaining=fireRemaining(s,f);
   if(action==='fireFeed'){E.assert((s.bag.wood??0)>0&&remaining+60<=LIGHTS.fire.max,'需要木材，且燃料不能超过 480 分钟');s.bag.wood--;f.lit=f.lit&&remaining>0;f.remaining=remaining+60;f.updatedAt=s.time;E.log(s,'添入木材，增加 60 分钟燃料。');}
   else{E.assert(remaining>0,'火堆没有燃料，请先添柴');f.remaining=remaining;f.updatedAt=s.time;f.lit=!(f.lit&&remaining>0);E.log(s,f.lit?'点燃营火。':'熄灭营火，保留剩余木料。');}
  }
 }else throw Error('未知照明操作');
 E.refreshSight(s);
}
