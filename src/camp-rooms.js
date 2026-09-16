import {campAt,tiles,canUseCampObject} from './camp-data.js';
const k=(x,y)=>`${x},${y}`,dirs=[[1,0],[-1,0],[0,1],[0,-1]],cache=new WeakMap();
export function campRooms(l){
 const signature=l.objects.filter(o=>['wall','door','roof'].includes(o.type)).map(o=>`${o.type}:${o.x},${o.y}:${o.open}`).join('|'),old=cache.get(l);if(old?.signature===signature)return old.value;
 const blocked=new Set(),roofs=new Set(),opened=[];for(const o of l.objects){if(o.type==='roof')roofs.add(k(o.x,o.y));if(o.type==='wall'||o.type==='door'&&!o.open)blocked.add(k(o.x,o.y));if(o.type==='door'&&o.open)opened.push({x:o.x,y:o.y});}
 const seen=new Set(),byTile={},regions=[];
 for(let y=1;y<14;y++)for(let x=1;x<14;x++){const key=k(x,y);if(seen.has(key)||blocked.has(key))continue;const points=[{x,y}],region={id:regions.length+1,points,closed:true,roofed:0,holes:[],openDoors:[]};seen.add(key);
  for(let i=0;i<points.length;i++){const p=points[i],pk=k(p.x,p.y);byTile[pk]=region;if(roofs.has(pk))region.roofed++;else region.holes.push(p);if(p.x===1||p.y===1||p.x===13||p.y===13)region.closed=false;for(const[dx,dy]of dirs){const a=p.x+dx,b=p.y+dy,key=k(a,b);if(a>=1&&b>=1&&a<=13&&b<=13&&!seen.has(key)&&!blocked.has(key)){seen.add(key);points.push({x:a,y:b});}}}
  region.complete=region.closed&&region.roofed===points.length;region.openDoors=opened.filter(p=>byTile[k(p.x,p.y)]===region);regions.push(region);
 }
 const value={regions,byTile,roofs};cache.set(l,{signature,value});return value;
}
export function coverAt(l,points){const r=campRooms(l),regions=points.map(p=>r.byTile[k(p.x,p.y)]),covered=points.every(p=>r.roofs.has(k(p.x,p.y))),complete=covered&&regions.every(a=>a?.complete&&a===regions[0]);return {kind:complete?'room':covered?'covered':'outdoor',label:complete?'封闭室内':covered?'有顶 · 漏风':'露天 / 屋顶缺口',region:regions[0]??null,covered};}
export function campBed(s){if(!s.player.camp)return null;const c=campAt(s);if(!c?.layout)return null;const beds=c.layout.objects.filter(o=>o.type==='bed'&&canUseCampObject(s,o)).map(o=>({bed:o,...coverAt(c.layout,tiles(o))}));return beds.find(b=>b.bed.id===s.player.camp.bedId)??beds.sort((a,b)=>({room:2,covered:1,outdoor:0}[b.kind]-{room:2,covered:1,outdoor:0}[a.kind]))[0]??null;}
export function campRestCover(s){if(!s.player.camp)return null;return s.campMode==='simple'?(campBed(s)??coverAt(campAt(s).layout,[s.player.camp])):coverAt(campAt(s).layout,[s.player.camp]);}
