import {lightState,fireRemaining,LIGHTS,DIRECTIONS} from './lighting-data.js';
// Minutes are authoritative; phases and sight are derived, never saved as a second clock.
export const PHASES=[
  {id:'deepNight',name:'深夜',start:0,end:300,region:1,local:2},
  {id:'dawn',name:'清晨',start:300,end:480,region:1,local:4},
  {id:'morning',name:'上午',start:480,end:720,region:2,local:8},
  {id:'afternoon',name:'午后',start:720,end:1020,region:2,local:8},
  {id:'dusk',name:'黄昏',start:1020,end:1140,region:1,local:4},
  {id:'night',name:'夜晚',start:1140,end:1440,region:1,local:2},
];
export function phaseAt(time){const minute=((time%1440)+1440)%1440;const phase=PHASES.find(p=>minute>=p.start&&minute<p.end);return {...phase,remaining:phase.end-minute};}
export function sightLine(map,from,x,y,radius=8){
  if(!Number.isInteger(x)||!Number.isInteger(y)||!map.grid[y]?.[x])return false;
  const steps=Math.max(Math.abs(x-from.x),Math.abs(y-from.y));if(steps>radius)return false;
  for(let i=1;i<steps;i++){const a=Math.round(from.x+(x-from.x)*i/steps),b=Math.round(from.y+(y-from.y)*i/steps),t=map.grid[b]?.[a];if(!t||t==='#'||t==='_'||(t==='+'&&!map.doors[`${a},${b}`]))return false;}return true;
}
export function daylightReaches(map,x,y){
  // Windows illuminate up to eight tiles; the external entrance admits light up to four.
  // Closed doors and walls split rooms, so one window cannot light an entire building.
  for(let b=Math.max(0,y-8);b<=Math.min(map.h-1,y+8);b++)for(let a=Math.max(0,x-8);a<=Math.min(map.w-1,x+8);a++){
    const t=map.grid[b][a];if((t==='='||t==='E')&&sightLine(map,{x:a,y:b},x,y,t==='E'?4:8))return true;
  }return false;
}
export function localSight(s,map,from,x,y){
  if(sightLine(map,from,x,y,8)&&artificialLight(s,map,from,x,y))return true;
  const radius=map.kind==='cave'?2:phaseAt(s.time).local;
  if(!sightLine(map,from,x,y,radius))return false;
  if(map.kind==='field'||map.kind==='cave'||radius===2)return true;
  return Math.max(Math.abs(x-from.x),Math.abs(y-from.y))<=2||daylightReaches(map,x,y);
}
export function artificialLight(s,map,from,x,y){
 const l=lightState(s),dx=x-from.x,dy=y-from.y;
 if(l.active&&l[l.active]>0&&sightLine(map,from,x,y,LIGHTS[l.active].radius)){
  if(l.active==='torch')return true;
  const [a,b]=DIRECTIONS[l.facing],forward=dx*a+dy*b,side=Math.abs(dx*b-dy*a);if(forward>=0&&side<=forward)return true;
 }
 const f=map.fire;return !!(f?.lit&&fireRemaining(s,f)>0&&sightLine(map,f,x,y,LIGHTS.fire.radius));
}
