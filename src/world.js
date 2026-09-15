import {assert,key,hash,seeded,validateWorld,cell,flood,pathfind,tick,reveal,log,clone,validateSave} from './engine.js';
import {REGION_SIZES} from './layout.js';
export const DIRECTIONS={north:{dx:0,dy:-1,opposite:'south',name:'北'},east:{dx:1,dy:0,opposite:'west',name:'东'},south:{dx:0,dy:1,opposite:'north',name:'南'},west:{dx:-1,dy:0,opposite:'east',name:'西'}};
export const regionKey=s=>key(s.atlas.x,s.atlas.y);
export const regionData=s=>clone({world:s.world,locals:s.locals,clues:s.clues,sync:s.sync});
export function regionSize(seed,x,y){return ['small','normal','large'][parseInt(hash(`${seed}:size:${x},${y}`),36)%3];}
export function gatesFor(n){const m=Math.floor(n/2);return {north:{x:m,y:0},east:{x:n-1,y:m},south:{x:m,y:n-1},west:{x:0,y:m}};}

// Shared edge keys work for both neighbors, independent of which region is generated first.
export function regionSpec(s,x,y,size=regionSize(s.seed,x,y)){
  assert(Number.isSafeInteger(x)&&Number.isSafeInteger(y),'世界坐标超出数值精度');
  const n=REGION_SIZES[size];assert(n,'区域大小无效');
  const boundaries={},edges={},gates=gatesFor(n);
  for(const [side,d]of Object.entries(DIRECTIONS)){
    const pair=[key(x,y),key(x+d.dx,y+d.dy)].sort().join('|'),r=seeded(`${s.seed}:edge:${pair}`);
    const terrain=r()<.65?'f':'.',river=r()<.28;edges[side]={terrain,river,road:.5,riverAt:river ? .25 : null};
    const neighbor=s.atlas.regions[key(x+d.dx,y+d.dy)],border=neighbor?.borders?.[d.opposite],neighborGate=neighbor?.gates?.[d.opposite];
    if(border){
      if(neighborGate){const sourceIndex=side==='north'||side==='south'?neighborGate.x:neighborGate.y,index=Math.round(sourceIndex/(neighbor.size-1)*(n-1));gates[side]=side==='north'?{x:index,y:0}:side==='south'?{x:index,y:n-1}:side==='west'?{x:0,y:index}:{x:n-1,y:index};}
      else delete gates[side];
      edges[side]={...edges[side],inherited:true};
    }
    for(let i=0;i<n;i++){
      let t=i===0||i===n-1?'.':i===Math.floor(n/2)?'r':river&&i===Math.round((n-1)*.25)?'w':terrain;
      if(border&&i>0&&i<n-1)t=border[Math.round(i/(n-1)*(neighbor.size-1))];
      const a=side==='west'?0:side==='east'?n-1:i,b=side==='north'?0:side==='south'?n-1:i;
      if(gates[side]?.x===a&&gates[side]?.y===b)t='r';
      boundaries[key(a,b)]=t;
    }
  }
  const neighbors=Object.entries(DIRECTIONS).flatMap(([side,d])=>{const a=s.atlas.regions[key(x+d.dx,y+d.dy)];return a?[{side,name:a.name,size:a.size,terrain:a.terrain}]:[];});
  return {x,y,size,dimension:n,seed:`${s.seed}:region:${x},${y}`,boundaries,edges,gates,neighbors};
}
export function validateRegion(raw,spec){const world=validateWorld(raw,{size:spec.size,boundaries:spec.boundaries,gates:spec.gates});world.gates=spec.gates;world.edges=spec.edges;return world;}
export function summarizeRegion(s){
  const cells=Object.values(s.world.cells),counts={};for(const c of cells)counts[c.terrain]=(counts[c.terrain]??0)+1;
  const n=s.world.size,borders={};for(const side of Object.keys(DIRECTIONS))borders[side]=Array.from({length:n},(_,i)=>cell(s,side==='west'?0:side==='east'?n-1:i,side==='north'?0:side==='south'?n-1:i).terrain).join('');
  s.atlas.regions[regionKey(s)]={x:s.atlas.x,y:s.atlas.y,name:s.world.name,size:n,sizeClass:s.world.sizeClass??Object.keys(REGION_SIZES).find(k=>REGION_SIZES[k]===n),terrain:Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0],known:cells.filter(c=>c.known).length,total:cells.length,camps:cells.filter(c=>c.camp).map(c=>({x:c.x,y:c.y,level:c.camp.level})),clues:s.clues.filter(c=>!c.revoked).length,borders,gates:clone(s.world.gates??{})};
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
  const n=spec.dimension,m=Math.floor(n/2),r=seeded(spec.seed);
  const grid=Array.from({length:n},()=>Array.from({length:n},()=>r()<.6?'f':r()<.5?'.':'h'));
  for(let i=1;i<n-1;i++){grid[m][i]='r';grid[i][m]='r';}
  for(const[k,t]of Object.entries(spec.boundaries)){const[x,y]=k.split(',').map(Number);grid[y][x]=t;}
  for(const gate of Object.values(spec.gates)){let x=gate.x,y=gate.y;while(x!==m||y!==m){if(x!==m)x+=Math.sign(m-x);else y+=Math.sign(m-y);if(x>0&&y>0&&x<n-1&&y<n-1)grid[y][x]='r';}}
  return {name:`边境 ${spec.x},${spec.y}`,description:'道路穿过林地与丘陵，远处散布着旧建筑。',terrain:grid.map(row=>row.join('')),sites:[
    {x:m,y:m,name:'公路补给站',kind:'便利店',size:'normal',description:'旧公路旁仍可进入的补给站。'},
    {x:m-2,y:m-1,name:'林间小屋',kind:'小屋',size:'small',description:'藏在树林边的小屋。'},
    {x:m+2,y:m+1,name:'废弃仓库',kind:'仓库',size:'large',description:'宽阔的仓储建筑。'}]};
}
