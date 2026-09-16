import {phaseAt,daylightReaches,artificialLight,localSight} from './daylight.js';
const clamp=n=>Math.max(0,Math.min(100,n));
export const spiritValue=s=>s.stats.spirit??100;
export function changeSpirit(s,delta){s.stats.spirit=clamp(spiritValue(s)+delta);}
export function inDarkness(s,time,from=s.time){
 const p=s.player.local,m=p?s.locals[p.site]:null,phase=phaseAt(time),probe={...s,time};
 if(s.lighting?.active&&time>=from+s.lighting[s.lighting.active])probe.lighting={...s.lighting,active:null};
 if(m&&artificialLight(probe,m,p,p.x,p.y))return false;
 if(!m&&probe.lighting?.active&&probe.lighting[probe.lighting.active]>0)return false;
 if(m?.kind==='cave')return true;
 if(phase.local===2)return true;
 return !!(m&&!m.kind&&!daylightReaches(m,p.x,p.y));
}
export function advanceSpirit(s,from,awake){
 if(!awake)return;
 let dark=0;for(let t=from;t<s.time;t++)if(inDarkness(s,t,from))dark++;
 changeSpirit(s,-dark/60*2);
}
export function visibleDanger(s){
 const p=s.player.local,m=p?s.locals[p.site]:null;
 return !!m?.wildlife?.animals.some(a=>a.hp>0&&['wolf','boar'].includes(a.species)&&Math.abs(p.x-a.x)+Math.abs(p.y-a.y)<=3&&localSight(s,m,p,a.x,a.y));
}
