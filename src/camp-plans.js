import {campSize,FURNITURE,campAt,placementError} from './camp-data.js';
export function strokeTiles(start,end,shape='line',size=15){
 const valid=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=1&&p.y>=1&&p.x<=size-2&&p.y<=size-2;if(!valid(start)||!valid(end))throw Error('请选择营地内部的起点与终点');
 const out=[];if(shape==='rect'){for(let y=Math.min(start.y,end.y);y<=Math.max(start.y,end.y);y++)for(let x=Math.min(start.x,end.x);x<=Math.max(start.x,end.x);x++)out.push({x,y});}
 else if(shape==='line'){const rawX=end.x-start.x,rawY=end.y-start.y,dx=Math.abs(rawX)>=Math.abs(rawY)?rawX:0,dy=Math.abs(rawX)>=Math.abs(rawY)?0:rawY,n=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=n;i++){const t=n?i/n:0;out.push({x:Math.round(start.x+dx*t),y:Math.round(start.y+dy*t)});}}else throw Error('未知批量形状');return out;
}
export function batchPlan(s,type,points){
 if(!['floor','wall','roof'].includes(type)||!Array.isArray(points)||points.length<1||points.length>625)throw Error('批量建设仅支持地板、墙和屋顶，最多 625 格');
 const l=campAt(s)?.layout;if(!s.player.camp||!l)throw Error('请先进入营地');const draft={...l,objects:[...l.objects]},seen=new Set(),objects=[];let skipped=0;
 for(const p of points){if(!p||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<1||p.y<1||p.x>campSize(l)-2||p.y>campSize(l)-2)throw Error('批量位置超出营地');const key=`${p.x},${p.y}`;if(seen.has(key))continue;seen.add(key);if(l.objects.some(o=>o.type===type&&o.x===p.x&&o.y===p.y)){skipped++;continue;}const o={id:'f'+(l.serial+objects.length+1),type,x:p.x,y:p.y,rot:0,name:FURNITURE[type].name};const error=placementError(draft,o,s.player.camp);if(error)throw Error(`${p.x},${p.y}：${error}`);draft.objects.push(o);objects.push(o);}
 const f=FURNITURE[type];return {objects,skipped,minutes:objects.length*f.minutes,cost:Object.fromEntries(Object.entries(f.cost).map(([id,q])=>[id,q*objects.length]))};
}
