import {changeSpirit,visibleDanger} from './spirit.js';
import {stealth} from './equipment-data.js';
import {HARVEST,corpseAge,corpseFreshness} from './hunting-data.js';
import {randomAt,habitatFor} from './environment.js';
import {sightLine,localSight,phaseAt} from './daylight.js';
export const SPECIES={
 rabbit:{name:'野兔',speed:1.5,run:4,sight:5,hp:2,prey:[],active:'twilight',color:'#ac9670'},
 deer:{name:'鹿',speed:2,run:4,sight:6,hp:5,prey:[],active:'day',color:'#a7794f'},
 boar:{name:'野猪',speed:1,run:2,sight:4,hp:8,prey:[],active:'twilight',color:'#716859'},
 fox:{name:'狐狸',speed:1.5,run:3,sight:6,hp:4,prey:['rabbit','rat'],active:'night',color:'#bf794e'},
 wolf:{name:'狼',speed:2,run:3,sight:7,hp:7,prey:['rabbit','deer','boar','rat'],active:'twilight',color:'#718078'},
 rat:{name:'鼠',speed:1,run:2,sight:4,hp:1,prey:[],active:'night',color:'#8f8575'},
 bat:{name:'蝙蝠',speed:1,run:3,sight:5,hp:1,prey:[],active:'night',color:'#69657a'},
};
export const BEHAVIORS={rest:'休息',graze:'觅食',wander:'游荡',flee:'逃跑',hunt:'追猎',search:'搜索',eat:'进食',dead:'尸体'};
const directions=[[1,0],[0,1],[-1,0],[0,-1]],k=(x,y)=>`${x},${y}`,dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),clamp=n=>Math.max(0,Math.min(100,n));
const seed=(s,m)=>`${s.seed}:${s.atlas.x},${s.atlas.y}:${m.owner.x},${m.owner.y}:${m.kind}`;
const random=(s,m,id,t)=>randomAt(seed(s,m)+':'+id,t,19);
const pass=(m,x,y)=>m.grid[y]?.[x]==='.'&&!m.containers[k(x,y)]&&!m.portals.some(p=>p.x===x&&p.y===y);
export function speciesPool(s,m){
 if(m.kind==='cave')return ['bat'];
 const e=s.world.environment,c=s.world.cells[k(m.owner.x,m.owner.y)];
 if(['city','industrial','suburb','town'].includes(e?.landUse)||['u','r'].includes(c.terrain))return ['rat','rabbit','fox'];
 const biome=e?.biome??({f:'forest',h:'mountain',s:'desert',n:'tundra',m:'wetland'}[c.terrain]??'grassland');
 return {forest:['rabbit','deer','boar','fox','wolf'],rainforest:['rat','boar'],grassland:['rabbit','deer','fox','wolf'],mountain:['rabbit','deer','wolf'],wetland:['rat','boar','fox'],coast:['rat','rabbit','fox'],desert:['rat','rabbit','fox'],tundra:['rabbit','deer','wolf']}[biome];
}
const day=t=>Math.floor((t-300)/1440);
function reserve(s,t){
 s.world.ecology??=habitatFor(s.world.environment??{biome:'forest',climate:'温带',moisture:50,landUse:'wilderness'});
 const e=s.world.ecology;e.fauna??={version:1,day:day(t),serial:0,stock:Object.fromEntries(Object.keys(SPECIES).map(id=>[id,SPECIES[id].prey.length?4:12]))};
 const f=e.fauna,elapsed=Math.max(0,day(t)-f.day);
 if(elapsed){for(const id of Object.keys(SPECIES))f.stock[id]=Math.min(SPECIES[id].prey.length?4:12,f.stock[id]+elapsed*(SPECIES[id].prey.length?.25:1));f.day=day(t);}return f;
}
export function killAnimal(m,a,t){if(a.deadAt!==null)return;a.hp=0;a.state='dead';a.deadAt=t;a.meat=HARVEST[a.species].meat;a.hide=HARVEST[a.species].hide;a.target=null;delete a.fear;delete a.examinedAt;m.wildlife.deaths++;track(m,a,t,'remains');}
function track(m,a,t,type){m.wildlife.tracks.push({x:a.x,y:a.y,species:a.species,time:t,type});m.wildlife.tracks=m.wildlife.tracks.slice(-24);}
function spawn(s,m,t,species){
 const w=m.wildlife,f=reserve(s,t),live=w.animals.filter(a=>a.hp>0),pred=SPECIES[species].prey;
 if(live.length>=w.cap||f.stock[species]<1||pred.length&&(live.some(a=>SPECIES[a.species].prey.length)||live.filter(a=>pred.includes(a.species)).length<2))return false;
 const p=s.player.local?.site&&s.locals[s.player.local.site]===m?s.player.local:null,candidates=[];
 for(let y=1;y<m.h-1;y++)for(let x=1;x<m.w-1;x++)if((x===1||y===1||x===m.w-2||y===m.h-2)&&pass(m,x,y)&&!w.animals.some(a=>a.x===x&&a.y===y)&&(!p||dist(p,{x,y})>=4))candidates.push({x,y});
 if(!candidates.length)return false;
 const pos=candidates[Math.floor(random(s,m,'spawn:'+f.serial,t)*candidates.length)];
 f.stock[species]--;const a={id:`${s.atlas.x},${s.atlas.y}:${++f.serial}`,species,...pos,hp:SPECIES[species].hp,stamina:100,hunger:55,credit:0,state:'wander',born:t,deadAt:null,meat:0,target:null};w.animals.push(a);track(m,a,t,'footprint');return true;
}
export function ensureWildlife(s,m,t=s.time){
 if(m?.shore||!m?.kind||!m.owner||m.wildlife)return;
 reserve(s,t);m.wildlife={version:1,time:t,check:Math.floor(t/180),cap:{small:4,normal:6,large:8}[m.size],animals:[],tracks:[],observations:[],deaths:0,departures:0};
 const pool=speciesPool(s,m),herb=pool.filter(id=>!SPECIES[id].prey.length);
 for(let i=0;i<3;i++)spawn(s,m,t,herb[Math.floor(random(s,m,'initial:'+i,t)*herb.length)]);
 const pred=pool.filter(id=>SPECIES[id].prey.length);if(pred.length&&random(s,m,'predator',t)<.5)spawn(s,m,t,pred[Math.floor(random(s,m,'kind',t)*pred.length)]);
}
function canDetect(m,a,b){return sightLine(m,a,b.x,b.y,SPECIES[a.species].sight);}
function active(id,t){const phase=phaseAt(t).id,v=SPECIES[id].active;return v==='day'?['dawn','morning','afternoon','dusk'].includes(phase):v==='night'?['night','deepNight'].includes(phase):!['morning','afternoon'].includes(phase);}
function nextStep(m,a,target,occupied){
 const queue=[{x:a.x,y:a.y,first:null}],seen=new Set([k(a.x,a.y)]);
 for(let i=0;i<queue.length&&i<1000;i++){const p=queue[i];if(dist(p,target)<=1)return p.first;for(const[dx,dy]of directions){const x=p.x+dx,y=p.y+dy,key=k(x,y);if(!seen.has(key)&&pass(m,x,y)&&!occupied(x,y)){seen.add(key);queue.push({x,y,first:p.first??{x,y}});}}}return null;
}
function minute(s,m,t,awake){
 const w=m.wildlife,p=awake&&s.player.local&&s.locals[s.player.local.site]===m?s.player.local:null;
 if(p&&visibleDanger({...s,time:t}))changeSpirit(s,-2/60);
 for(const a of w.animals)if(a.hp>0){a.hunger=clamp(a.hunger+.06);a.stamina=clamp(a.stamina+.4);}
 // Four shared slices allow fractional speeds without giving fast animals an uninterrupted turn.
 for(let slice=0;slice<4;slice++){
 const order=w.animals.slice();if((t+slice)%2)order.reverse();
 for(const a of order){if(a.hp<=0)continue;const def=SPECIES[a.species],others=w.animals.filter(b=>b.id!==a.id&&b.hp>0),danger=others.filter(b=>SPECIES[b.species].prey.includes(a.species)&&canDetect(m,a,b)).sort((x,y)=>dist(a,x)-dist(a,y))[0],playerThreat=p&&dist(a,p)<= (stealth(s)?1:def.prey.length?2:4)&&canDetect(m,a,p)?p:null,threat=danger??(a.fear&&a.fear.until>=t?a.fear:null)??playerThreat;
 let goal=null,running=false;
 if(threat){a.state='flee';running=a.stamina>5;a.target=null;goal=threat;}
 else{
 const corpse=w.animals.find(b=>b.hp===0&&t-b.deadAt<720&&b.meat>0&&def.prey.includes(b.species)&&canDetect(m,a,b));
 if(corpse&&a.hunger>5){a.state='eat';goal=corpse;}
 else if(def.prey.length&&a.hunger>=40&&a.stamina>10){
 const prey=others.filter(b=>def.prey.includes(b.species)&&canDetect(m,a,b)).sort((x,y)=>dist(a,x)-dist(a,y))[0];
 if(prey){a.target={id:prey.id,x:prey.x,y:prey.y,until:t+6};a.state='hunt';goal=prey;running=true;}
 else if(a.target&&a.target.until>=t&&dist(a,a.target)>1){a.state='search';goal=a.target;}
 else{a.target=null;a.state=active(a.species,t)?'wander':'rest';}
 }else{a.target=null;a.state=active(a.species,t)?def.prey.length?'wander':'graze':'rest';}
 }
 if(a.state==='rest'){a.stamina=clamp(a.stamina+.4);continue;}
 if(a.state==='graze')a.hunger=clamp(a.hunger-.15);
 a.credit=Math.min(4,a.credit+(running?def.run:def.speed)/4);if(a.credit<1)continue;a.credit--;
 if(goal&&a.state==='eat'&&dist(a,goal)<=1){goal.meat=Math.max(0,goal.meat-1);a.hunger=clamp(a.hunger-35);continue;}
 if(goal&&a.state==='hunt'&&dist(a,goal)<=1){goal.hp=Math.max(0,goal.hp-1);a.stamina=clamp(a.stamina-2);if(!goal.hp){killAnimal(m,goal,t);a.state='eat';}continue;}
 const occupied=(x,y)=>w.animals.some(b=>b.id!==a.id&&b.x===x&&b.y===y)||(s.player.local&&s.locals[s.player.local.site]===m&&s.player.local.x===x&&s.player.local.y===y);
 let step=null;
 if(a.state==='flee'){step=directions.map(([dx,dy])=>({x:a.x+dx,y:a.y+dy})).filter(q=>pass(m,q.x,q.y)&&!occupied(q.x,q.y)).sort((u,v)=>dist(v,goal)-dist(u,goal))[0];if(step&&dist(step,goal)<dist(a,goal))step=null;}
 else if(goal)step=nextStep(m,a,goal,occupied);
 else if(random(s,m,a.id+':move:'+slice,t)<.55){const dirs=directions.slice(),offset=Math.floor(random(s,m,a.id+':dir:'+slice,t)*4);for(let i=0;i<4;i++){const [dx,dy]=dirs[(i+offset)%4];if(pass(m,a.x+dx,a.y+dy)&&!occupied(a.x+dx,a.y+dy)){step={x:a.x+dx,y:a.y+dy};break;}}}
 if(step){a.x=step.x;a.y=step.y;if(running)a.stamina=clamp(a.stamina-2);if(t%10===0&&slice===0)track(m,a,t,'footprint');}
 }
 }
 w.animals=w.animals.filter(a=>a.hp>0||t-a.deadAt<1440);
 w.tracks=w.tracks.filter(a=>t-a.time<=240);
}
function migration(s,m,bucket){
 const w=m.wildlife,t=bucket*180;reserve(s,t);
 const pool=speciesPool(s,m),id=pool[Math.floor(random(s,m,'migration-kind',bucket)*pool.length)];
 if(random(s,m,'migration',bucket)<.55&&active(id,t))spawn(s,m,t,id);
}
export function advanceWildlife(s,start,awake=true){
 const m=s.player.local?s.locals[s.player.local.site]:null;if(m?.shore||!m?.kind||!m.owner)return;
 ensureWildlife(s,m,start);const w=m.wildlife;
 // Away maps retain individuals. Simulate at most the last hour, and at most two arrivals.
 if(w.time<start){const elapsed=start-w.time;reserve(s,start);if(elapsed>=180){for(const a of w.animals)if(a.hp>0&&random(s,m,a.id+':depart',Math.floor(start/180))<Math.min(.65,elapsed/2880)){a.hp=0;a.deadAt=start-1440;w.departures++;}w.animals=w.animals.filter(a=>a.hp>0||start-a.deadAt<1440);}
 for(let t=Math.max(w.time,start-60)+1;t<=start;t++)minute(s,m,t,false);
 for(let b=Math.max(w.check+1,Math.floor(start/180)-1);b<=Math.floor(start/180);b++)migration(s,m,b);
 w.time=start;w.check=Math.floor(start/180);
 }
 for(let t=w.time+1;t<=s.time;t++){reserve(s,t);minute(s,m,t,awake);if(Math.floor(t/180)>w.check){w.check=Math.floor(t/180);migration(s,m,w.check);}}
 w.time=s.time;
}
export function observeWildlife(s){
 const m=s.player.local?s.locals[s.player.local.site]:null;if(!m?.wildlife)return;
 const w=m.wildlife;
 for(const a of w.animals)if(localSight(s,m,s.player.local,a.x,a.y)){const old=w.observations.find(o=>o.id===a.id);const o={id:a.id,species:a.species,x:a.x,y:a.y,time:s.time,state:a.state};if(old)Object.assign(old,o);else w.observations.push(o);}
 w.observations=w.observations.filter(o=>s.time-o.time<=1440).slice(-16);
}
export function knownWildlife(s){
 const m=s.player.local?s.locals[s.player.local.site]:null,w=m?.wildlife;
 if(!w)return {visible:[],tracks:[],memory:Object.values(s.locals).filter(m=>m.kind&&m.wildlife).flatMap(m=>m.wildlife.observations.filter(o=>s.time-o.time<=1440).map(o=>({...o,name:SPECIES[o.species].name,regionX:m.owner.x,regionY:m.owner.y,note:'历史观察，去向未确认'}))).slice(-16)};
 const visible=w.animals.filter(a=>localSight(s,m,s.player.local,a.x,a.y)).map(a=>({id:a.id,species:a.species,name:SPECIES[a.species].name,x:a.x,y:a.y,state:BEHAVIORS[a.state],speed:SPECIES[a.species].speed,run:SPECIES[a.species].run,alive:a.hp>0,condition:a.hp<SPECIES[a.species].hp?'受伤':'未见明显伤势',...(a.examinedAt!==undefined?{examinedAt:a.examinedAt,hp:a.hp,meat:a.hp===0&&corpseAge(s,a)<720?a.meat:0,hide:a.hp===0?(a.hide??0):0,freshness:a.hp===0?corpseFreshness(s,a):null}:{})}));
 return {visible,tracks:w.tracks.filter(a=>s.time-a.time<=240&&localSight(s,m,s.player.local,a.x,a.y)).map(a=>({...a,name:SPECIES[a.species].name})),memory:w.observations.filter(o=>s.time-o.time<=1440&&!visible.some(a=>a.id===o.id)).map(o=>({...o,name:SPECIES[o.species].name}))};
}
export function validateWildlife(s){
 const ok=(v)=>{if(!v)throw Error('生物存档无效');},integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const f=s.world.ecology?.fauna;
 if(f){ok(f.version===1&&integer(f.day,-1,Math.floor(s.time/1440))&&integer(f.serial,0,1e9)&&f.stock&&Object.keys(f.stock).length===Object.keys(SPECIES).length);for(const id of Object.keys(SPECIES))ok(Number.isFinite(f.stock[id])&&f.stock[id]>=0&&f.stock[id]<=(SPECIES[id].prey.length?4:12));}
 const ids=new Set();
 for(const m of Object.values(s.locals)){const w=m.wildlife;if(!w)continue;ok(f&&['field','cave'].includes(m.kind)&&w.version===1&&w.cap==={small:4,normal:6,large:8}[m.size]&&integer(w.time,0,s.time)&&integer(w.check,0,Math.floor(w.time/180))&&w.check===Math.floor(w.time/180)&&integer(w.deaths,0,1e9)&&integer(w.departures,0,1e9)&&Array.isArray(w.animals)&&w.animals.length<=40&&w.animals.filter(a=>a.hp>0).length<=w.cap&&Array.isArray(w.tracks)&&w.tracks.length<=24&&Array.isArray(w.observations)&&w.observations.length<=16);
 const occupied=new Set();for(const a of w.animals){ok(typeof a.id==='string'&&a.id.length<100&&!ids.has(a.id)&&a.id.startsWith(`${s.atlas.x},${s.atlas.y}:`)&&integer(Number(a.id.split(':')[1]),1,f.serial)&&Object.hasOwn(SPECIES,a.species)&&speciesPool(s,m).includes(a.species)&&integer(a.x,1,m.w-2)&&integer(a.y,1,m.h-2)&&pass(m,a.x,a.y)&&!occupied.has(k(a.x,a.y)));ids.add(a.id);occupied.add(k(a.x,a.y));ok(integer(a.hp,0,SPECIES[a.species].hp)&&Number.isFinite(a.stamina)&&a.stamina>=0&&a.stamina<=100&&Number.isFinite(a.hunger)&&a.hunger>=0&&a.hunger<=100&&Number.isFinite(a.credit)&&a.credit>=0&&a.credit<=4&&Object.hasOwn(BEHAVIORS,a.state)&&integer(a.born,0,w.time)&&integer(a.meat,0,3));ok(a.hp===0?a.state==='dead'&&integer(a.deadAt,a.born,w.time):a.deadAt===null&&a.state!=='dead');if(a.hide!==undefined)ok(integer(a.hide,0,HARVEST[a.species].hide));if(a.examinedAt!==undefined)ok(integer(a.examinedAt,0,s.time));if(a.fear)ok(integer(a.fear.x,0,m.w-1)&&integer(a.fear.y,0,m.h-1)&&integer(a.fear.until,0,w.time+5));if(a.target)ok(typeof a.target.id==='string'&&a.target.id.length<100&&integer(a.target.x,1,m.w-2)&&integer(a.target.y,1,m.h-2)&&integer(a.target.until,0,w.time+6));}
 for(const a of [...w.tracks,...w.observations])ok(Object.hasOwn(SPECIES,a.species)&&integer(a.x,1,m.w-2)&&integer(a.y,1,m.h-2)&&integer(a.time,0,s.time));for(const o of w.observations)ok(typeof o.id==='string'&&o.id.length<100&&Object.hasOwn(BEHAVIORS,o.state));for(const tr of w.tracks)ok(['footprint','remains'].includes(tr.type));
 }
}
