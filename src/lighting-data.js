export const LIGHTS={torch:{name:'火把',radius:4,duration:90},flashlight:{name:'手电',radius:6,duration:240},fire:{name:'营火',radius:5,duration:60,max:480}};
export const LIGHT_RECIPES={torch:{name:'制作火把',cost:{wood:1,cloth:1},minutes:5},flashlight:{name:'组装手电',cost:{tool:1,scrap:2},minutes:20},battery:{name:'制作简易电池',cost:{scrap:1,fuel:1},minutes:10}};
export const DIRECTIONS={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
export function lightState(s){return s.lighting??{active:null,torch:0,flashlight:0,facing:'north'};}
export function fireRemaining(s,fire){return fire?Math.max(0,fire.remaining-(fire.lit?Math.max(0,s.time-fire.updatedAt):0)):0;}
export function lightWarning(s,minutes){const l=lightState(s);return l.active&&minutes>=l[l.active]?`${LIGHTS[l.active].name}剩余 ${l[l.active]} 分钟，${minutes===l[l.active]?'抵达时':'抵达前'}将耗尽；熄灭后视野会缩小。`:'';}
export function burnPortable(s,minutes){const l=s.lighting;if(!l?.active)return null;const id=l.active;l[id]=Math.max(0,l[id]-minutes);if(l[id]===0){l.active=null;if(id==='torch')s.bag.torch--;return `${LIGHTS[id].name}${id==='torch'?'已经燃尽':'电量耗尽'}，照明已关闭。`;}return null;}
export function validateLighting(s){
 const check=(v,m)=>{if(!v)throw Error(m);},l=s.lighting;
 if(l){check(l.active===null||['torch','flashlight'].includes(l.active),'照明装备状态无效');check(Object.hasOwn(DIRECTIONS,l.facing),'手电方向无效');for(const id of ['torch','flashlight']){check(Number.isInteger(l[id])&&l[id]>=0&&l[id]<=LIGHTS[id].duration,'照明剩余时间无效');if(l[id]>0)check((s.bag[id]??0)>0,'已装载照明装备不在背包中');}if(l.active)check(l[l.active]>0,'照明已耗尽却仍开启');}
 for(const map of Object.values(s.locals)){const f=map.fire;if(!f)continue;check(map.kind==='field'&&Number.isInteger(f.x)&&Number.isInteger(f.y)&&f.x>=1&&f.y>=1&&f.x<map.w-1&&f.y<map.h-1&&map.grid[f.y]?.[f.x]==='.'&&!map.containers[`${f.x},${f.y}`]&&!map.portals.some(p=>p.x===f.x&&p.y===f.y),'营火位置无效');check(typeof f.lit==='boolean'&&Number.isInteger(f.remaining)&&f.remaining>=0&&f.remaining<=LIGHTS.fire.max&&Number.isInteger(f.updatedAt)&&f.updatedAt>=0&&f.updatedAt<=s.time,'营火燃料记录无效');}
}
