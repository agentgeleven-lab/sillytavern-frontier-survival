import * as E from './engine.js';
import {RESOURCES,initialResources,fieldConstraints,validateFieldMetadata} from './field-data.js';
export {RESOURCES,parcelSpec,fieldConstraints} from './field-data.js';
export function ensureResources(s){const c=E.cell(s);E.assert(c.terrain!=='w','水域不能步行进入');c.resources??=initialResources(s,c);return c.resources;}
export function validateField(raw,s,zone='field'){
  const c=E.cell(s),spec=fieldConstraints(s,c,zone),n=spec.dimension;
  E.assert(raw&&Array.isArray(raw.obstacles)&&raw.obstacles.length<=spec.maxObstacles&&Array.isArray(raw.resources)&&raw.resources.length===spec.resources.length,'地点需要 obstacles 和完整的 resources 列表');
  const grid=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>x===0||y===0||x===n-1||y===n-1?'#':'.'));
  for(const o of raw.obstacles){const x=E.int(o.x,1,n-2),y=E.int(o.y,1,n-2),w=E.int(o.w,1,4),h=E.int(o.h,1,4);E.assert(x+w<n&&y+h<n,'自然障碍超出地点边界');for(let b=y;b<y+h;b++)for(let a=x;a<x+w;a++)grid[b][a]='#';}
  grid[spec.exit.y][spec.exit.x]='E';
  const ids=new Set(),containers=raw.resources.map(o=>{const resource=spec.resources.find(n=>n.id===o.id);E.assert(resource&&!ids.has(o.id),'资源点标识未知或重复');ids.add(o.id);return {x:o.x,y:o.y,name:resource.name,kind:resource.kind};});
  const map=E.validateLocal({grid:grid.map(row=>row.join('')),containers,description:raw.description},spec.size);
  Object.assign(map,{kind:zone,owner:spec.owner,name:spec.name,portals:spec.portals});
  raw.resources.forEach(o=>Object.assign(map.containers[E.key(o.x,o.y)],{resourceId:o.id,searched:true}));
  // Validate against a temporary initialized ledger; API validation never modifies the live game.
  validateFieldMetadata(s,{...c,resources:c.resources??initialResources(s,c)},spec.id,map);return map;
}
export function demoField(s,zone='field'){
  const spec=fieldConstraints(s,E.cell(s),zone),n=spec.dimension;
  const resources=spec.resources.map((o,i)=>({id:o.id,x:Math.floor(n/2)-3+(i%4)*2,y:n-4-Math.floor(i/4)*2}));
  const obstacles=[{x:2,y:2,w:2,h:2},{x:n-4,y:3,w:2,h:3}];
  if(n>12)obstacles.push({x:3,y:7,w:3,h:2},{x:n-7,y:9,w:2,h:3},{x:8,y:5,w:2,h:2});
  return {description:zone==='cave'?'岩壁围成幽暗的洞室，碎石散落在通道两侧。':'空地与自然障碍之间留有小径，附近散布着可以收集的资源。',obstacles,resources};
}
export function enterField(s,raw,zone='field'){
  const c=E.cell(s),parent=s.player.local?E.clone(s.player.local):null;
  if(zone==='field')E.assert(!parent,'请先返回区域地图');
  else E.assert(c.poi?.kind==='cave'&&E.localMap(s)?.kind==='field'&&E.localMap(s).portals.some(p=>p.kind==='cave'&&p.x===parent.x&&p.y===parent.y),'请走到地块内的洞穴入口');
  const spec=fieldConstraints(s,c,zone);ensureResources(s);
  s.locals[spec.id]??=validateField(raw,s,zone);
  const map=s.locals[spec.id];s.player.local={site:spec.id,...map.exit,...(parent?{parent}:{})};E.tick(s,1);E.revealLocal(s);E.log(s,`进入${map.name}。`);
}
function collect(s,entries,minutes){
  const items={};for(const[n,q]of entries){E.assert(n.remaining>=q&&q>0,'资源已耗尽');const item=RESOURCES[n.kind].item;items[item]=(items[item]??0)+q;}
  E.assert(E.weight(s.bag)+E.weight(items)<=20,'背包空间不足，请先存放物品');
  for(const[n,q]of entries)n.remaining-=q;
  for(const[id,q]of Object.entries(items))s.bag[id]=(s.bag[id]??0)+q;
  const c=E.cell(s);c.surveyed=true;c.depleted=Object.values(c.resources.nodes).filter(n=>n.zone==='field').every(n=>n.remaining===0);
  E.tick(s,minutes);E.log(s,`收集${Object.entries(items).map(([id,q])=>`${E.ITEMS[id].name} ×${q}`).join('、')}。`);
}
export function quickGather(s){E.assert(!s.player.local,'请在区域地图快速搜集');const r=ensureResources(s),entries=Object.values(r.nodes).filter(n=>n.zone==='field'&&n.remaining>0).map(n=>[n,1]);E.assert(entries.length,'本地表层资源已耗尽');collect(s,entries,25);}
export function gather(s,x,y){const map=E.localMap(s),o=map?.containers[E.key(x,y)],n=E.cell(s).resources?.nodes[o?.resourceId];E.assert(map?.kind&&o&&n&&map.seen[E.key(x,y)]&&E.adjacent(s,x,y),'请先走到可见资源点旁');collect(s,[[n,1]],RESOURCES[n.kind].minutes);}
export function weave(s){E.assert((s.bag.fiber??0)>=3,'需要 3 份植物纤维');s.bag.fiber-=3;s.bag.cloth=(s.bag.cloth??0)+1;E.tick(s,15);E.log(s,'将 3 份植物纤维编织成 1 份布料。');}
