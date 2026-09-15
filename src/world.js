import {environmentAt,habitatFor,noise,NATURAL_POINTS,BIOMES,LAND_USE} from './environment.js';
import {assert,key,hash,seeded,validateWorld,cell,flood,pathfind,tick,reveal,log,clone,validateSave} from './engine.js';
import {REGION_SIZES} from './layout.js';
export const DIRECTIONS={north:{dx:0,dy:-1,opposite:'south',name:'北'},east:{dx:1,dy:0,opposite:'west',name:'东'},south:{dx:0,dy:1,opposite:'north',name:'南'},west:{dx:-1,dy:0,opposite:'east',name:'西'}};
export const regionKey=s=>key(s.atlas.x,s.atlas.y);
export const regionData=s=>clone({world:s.world,locals:s.locals,clues:s.clues,sync:s.sync});
export function regionSize(seed,x,y){return ['small','normal','large'][parseInt(hash(`${seed}:size:${x},${y}`),36)%3];}
export function fixedRegionSpec(s,x,y){return regionSpec(s,x,y,s.atlas.regions[key(x,y)]?.sizeClass??regionSize(s.seed,x,y));}
export function gatesFor(n){const m=Math.floor(n/2);return {north:{x:m,y:0},east:{x:n-1,y:m},south:{x:m,y:n-1},west:{x:0,y:m}};}

// Shared edge keys work for both neighbors, independent of which region is generated first.
export function regionSpec(s,x,y,size=regionSize(s.seed,x,y)){
  assert(Number.isSafeInteger(x)&&Number.isSafeInteger(y),'世界坐标超出数值精度');
  const n=REGION_SIZES[size];assert(n,'区域大小无效');
  const environment=environmentAt(s.seed,x,y,s.theme),boundaries={},edges={},gates=gatesFor(n);
  for(const [side,d]of Object.entries(DIRECTIONS)){
    const pair=[key(x,y),key(x+d.dx,y+d.dy)].sort().join('|'),r=seeded(`${s.seed}:edge:${pair}`);
    const shared=environmentAt(s.seed,x+d.dx/2,y+d.dy/2,s.theme),other=environmentAt(s.seed,x+d.dx,y+d.dy,s.theme);
    const terrain=shared.baseTerrain,river=r()<.18&&shared.moisture>45,road=environment.landUse!=='wilderness'&&other.landUse!=='wilderness';edges[side]={terrain,river,road:road?.5:null,riverAt:river?.25:null};
    const neighbor=s.atlas.regions[key(x+d.dx,y+d.dy)],border=neighbor?.borders?.[d.opposite],neighborGate=neighbor?.gates?.[d.opposite];
    if(border){
      if(neighborGate){const sourceIndex=side==='north'||side==='south'?neighborGate.x:neighborGate.y,index=Math.round(sourceIndex/(neighbor.size-1)*(n-1));gates[side]=side==='north'?{x:index,y:0}:side==='south'?{x:index,y:n-1}:side==='west'?{x:0,y:index}:{x:n-1,y:index};}
      else delete gates[side];
      edges[side]={...edges[side],inherited:true};
    }
    for(let i=0;i<n;i++){
      let t=i===0||i===n-1?'.':i===Math.floor(n/2)?(road?'r':terrain):river&&i===Math.round((n-1)*.25)?'w':terrain;
      if(border&&i>0&&i<n-1)t=border[Math.round(i/(n-1)*(neighbor.size-1))];
      const a=side==='west'?0:side==='east'?n-1:i,b=side==='north'?0:side==='south'?n-1:i;
      if(gates[side]?.x===a&&gates[side]?.y===b&&t==='w')t=terrain;
      boundaries[key(a,b)]=t;
    }
  }
  const neighbors=Object.entries(DIRECTIONS).flatMap(([side,d])=>{const a=s.atlas.regions[key(x+d.dx,y+d.dy)];return a?[{side,name:a.name,size:a.size,terrain:a.terrain}]:[];});
  return {x,y,size,dimension:n,environment,seed:`${s.seed}:region:${x},${y}`,boundaries,edges,gates,neighbors};
}
export function validateRegion(raw,spec){
  const world=validateWorld(raw,{size:spec.size,boundaries:spec.boundaries,gates:spec.gates}),e=spec.environment;
  assert(raw.sites.length>=e.buildingRange[0]&&raw.sites.length<=e.buildingRange[1],'建筑数量不符合既定聚落类型');
  assert(Array.isArray(raw.points)&&raw.points.length>=2,'区域需要至少两个自然探索地点');
  for(const point of raw.points)assert(e.allowedPoints.includes(point.kind),'自然地点不符合当前生态');
  for(const c of Object.values(world.cells))if(!Object.hasOwn(spec.boundaries,key(c.x,c.y)))assert(e.allowedTerrains.includes(c.terrain),'内部地形不符合既定自然环境');
  world.gates=clone(spec.gates);world.edges=clone(spec.edges);world.environment=clone(e);world.ecology=habitatFor(e);return world;
}
export function summarizeRegion(s){
  const cells=Object.values(s.world.cells),counts={};for(const c of cells)counts[c.terrain]=(counts[c.terrain]??0)+1;
  const n=s.world.size,borders={};for(const side of Object.keys(DIRECTIONS))borders[side]=Array.from({length:n},(_,i)=>cell(s,side==='west'?0:side==='east'?n-1:i,side==='north'?0:side==='south'?n-1:i).terrain).join('');
  s.atlas.regions[regionKey(s)]={x:s.atlas.x,y:s.atlas.y,name:s.world.name,size:n,sizeClass:s.world.sizeClass??Object.keys(REGION_SIZES).find(k=>REGION_SIZES[k]===n),terrain:Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0],known:cells.filter(c=>c.known).length,total:cells.length,camps:cells.filter(c=>c.camp).map(c=>({x:c.x,y:c.y,level:c.camp.level})),clues:s.clues.filter(c=>!c.revoked).length,environment:clone(s.world.environment??null),thumbnail:Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>{const c=cell(s,x,y);return c.known?c.terrain:'?';}).join('')),landmarks:cells.filter(c=>c.known&&(c.site||c.poi||c.camp)).map(c=>({x:c.x,y:c.y,kind:c.camp?'camp':c.site?'building':c.poi.kind})),borders,gates:clone(s.world.gates??{})};
}
export function ensureGates(s){
  if(s.world.gates)return;
  // Legacy regions keep every cell intact. Only reachable land on their existing edge is used.
  const reachable=flood(s.player,(x,y)=>cell(s,x,y)&&cell(s,x,y).terrain!=='w'),n=s.world.size,m=(n-1)/2;
  s.world.gates={};
  for(const side of Object.keys(DIRECTIONS)){
    const candidates=Object.values(s.world.cells).filter(c=>reachable.has(key(c.x,c.y))&&(side==='north'?c.y===0:side==='south'?c.y===n-1:side==='west'?c.x===0:c.x===n-1));
    candidates.sort((a,b)=>(Math.abs(a.x-m)+Math.abs(a.y-m))-(Math.abs(b.x-m)+Math.abs(b.y-m)));
    if(candidates[0])s.world.gates[side]={x:candidates[0].x,y:candidates[0].y};
  }
}
export function travelPlan(s,x,y){
  assert(!s.player.local,'请先走到建筑出口并离开建筑');assert(!s.ended,'本局角色已无法行动');
  const side=Object.keys(DIRECTIONS).find(k=>s.atlas.x+DIRECTIONS[k].dx===x&&s.atlas.y+DIRECTIONS[k].dy===y);
  assert(side,'每次只能前往上下左右相邻区域');ensureGates(s);
  const exit=s.world.gates[side];assert(exit,'旧区域这一侧没有可达出口，请从其他方向探索');
  const path=pathfind(s.player,exit,(a,b)=>cell(s,a,b)&&cell(s,a,b).terrain!=='w');assert(path,'无法抵达区域出口');
  const minutes=30+path.reduce((n,p)=>n+(cell(s,p.x,p.y).terrain==='h'?12:6),0);
  return {side,path,minutes};
}
export function installRegion(s,x,y,data,plan){
  // All travel mutations happen on a transaction draft, after generation/validation succeeded.
  for(const p of plan.path){s.player.x=p.x;s.player.y=p.y;reveal(s);}
  summarizeRegion(s);
  const old=regionData(s);
  tick(s,plan.minutes);assert(!s.ended,'当前补给或健康不足以完成旅行，未结算');
  s.atlas.x=x;s.atlas.y=y;Object.assign(s,clone(data));
  const opposite=DIRECTIONS[plan.side].opposite;
  if(!s.world.gates){const center=Math.floor(s.world.size/2);s.player={x:center,y:center,local:null};ensureGates(s);}
  const entry=s.world.gates[opposite];assert(entry,'目标区域缺少可达的返回入口');
  s.player={...entry,local:null};reveal(s);summarizeRegion(s);
  log(s,`旅行 ${plan.minutes} 分钟，抵达世界 (${x},${y}) 的${s.world.name}。`);
  validateSave(s);return old;
}
export function demoRegion(spec){
  const n=spec.dimension,m=Math.floor(n/2),r=seeded(spec.seed),e=spec.environment,settled=e.landUse!=='wilderness';
  const grid=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>{
    const v=noise(spec.seed,x,y,4);
    if(e.biome==='wetland')return v>.62?'w':v>.4?'m':'.';
    if(e.biome==='mountain')return v>.27?'h':'.';
    if(e.biome==='forest'||e.biome==='rainforest')return v<.75?'f':'.';
    if(e.biome==='grassland')return v>.7?'f':'.';
    if(e.biome==='coast')return x>n*.73?'w':v>.4?'s':'.';
    return e.baseTerrain;
  }));
  if(settled)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++)if(grid[y][x]!=='w'){
    if(e.landUse==='rural'){if(Math.abs(x-m)<n*.3&&Math.abs(y-m)<n*.3)grid[y][x]='a';}
    else grid[y][x]=x%4===m%4||y%4===m%4?'r':'u';
  }
  for(const[k,t]of Object.entries(spec.boundaries)){const[x,y]=k.split(',').map(Number);grid[y][x]=t;}
  grid[m][m]=settled?'r':e.baseTerrain;
  for(const gate of Object.values(spec.gates)){let x=gate.x,y=gate.y;while(x!==m||y!==m){if(x!==m)x+=Math.sign(m-x);else y+=Math.sign(m-y);if(x>0&&y>0&&x<n-1&&y<n-1&&(settled||grid[y][x]==='w'))grid[y][x]=settled?'r':e.baseTerrain;}}
  const connected=flood({x:m,y:m},(x,y)=>grid[y]?.[x]&&grid[y][x]!=='w');
  const sites=[],points=[],occupied=new Set();
  const candidates=[{x:m,y:m},...Array.from({length:(n-2)*(n-2)},(_,i)=>({x:1+i%(n-2),y:1+Math.floor(i/(n-2))}))];
  // Deterministic Fisher-Yates; avoid comparator randomness and generation-order drift.
  for(let i=candidates.length-1;i>1;i--){const j=1+Math.floor(r()*i);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  const count=e.buildingRange[0]+Math.floor(r()*(e.buildingRange[1]-e.buildingRange[0]+1));
  const names=e.landUse==='rural'?['农舍','谷仓','磨坊','牧场仓房']:e.landUse==='industrial'?['厂房','仓储楼','值班室','维修车间']:['街角商店','住宅','旧仓库','诊所','车库','办公楼'];
  for(const c of candidates){if(sites.length>=count)break;if(!connected.has(key(c.x,c.y))||occupied.has(key(c.x,c.y)))continue;const i=sites.length;sites.push({...c,name:names[i%names.length]+(i>=names.length?` ${i+1}`:''),kind:names[i%names.length],size:i===0?'normal':i%3===1?'small':'large',description:`${e.condition}的${names[i%names.length]}，沿道路留有入口。`});occupied.add(key(c.x,c.y));}
  for(const c of candidates){if(points.length>=Math.max(3,Math.floor(n/3)))break;if(!connected.has(key(c.x,c.y))||occupied.has(key(c.x,c.y)))continue;const kind=e.allowedPoints[points.length%e.allowedPoints.length];points.push({...c,kind,name:NATURAL_POINTS[kind],description:`${BIOMES[e.biome]}中的${NATURAL_POINTS[kind]}。可以靠近调查，寻找自然材料或补给。`});occupied.add(key(c.x,c.y));}
  return {name:`${BIOMES[e.biome]}${settled?LAND_USE[e.landUse]:'边境'} ${spec.x},${spec.y}`,description:`${e.climate}的${BIOMES[e.biome]}。${settled?'聚落与周围自然环境相接。':'这里没有人类建筑，沿自然地势寻找落脚点与资源。'}`,terrain:grid.map(row=>row.join('')),sites,points};
}
export function naturalLoot(c){
  const kind=c.poi?.kind;
  if(c.site)return {description:'从遗留物中整理出木料和布料。',items:[{id:'wood',qty:2},{id:'cloth',qty:1}]};
  if(kind==='berries')return {description:'辨认并采集了一份可食用野果。',items:[{id:'food',qty:1}]};
  if(kind==='spring')return {description:'泉水仍需处理，当前没有获得可直接使用的饮用水。',items:[]};
  if(['grove','driftwood'].includes(kind)||c.terrain==='f')return {description:'收集了两份适合搭建的干木料。',items:[{id:'wood',qty:2}]};
  if(kind==='reeds')return {description:'整理芦苇纤维，得到一份可替代布料的编织材料。',items:[{id:'cloth',qty:1}]};
  if(kind==='clearing')return {description:'收拢落枝并整理植物纤维，得到一份木料和一份可替代布料的编织材料。',items:[{id:'wood',qty:1},{id:'cloth',qty:1}]};
  return {description:'调查了周围地势，暂时没有发现可收取的资源。',items:[]};
}
