import {randomAt,sceneryName} from './environment.js';
export const RESOURCES={herb:{name:'野生草药',item:'herb',art:'reeds',minutes:8},vegetables:{name:'可食野菜',item:'vegetables',art:'reeds',minutes:6},grain:{name:'残留谷物',item:'grain',art:'reeds',minutes:8},berries:{name:'浆果灌木',item:'berries',art:'berries',minutes:6},deadwood:{name:'倒木与枯枝',item:'wood',art:'grove',minutes:8},stone:{name:'松散石块',item:'stone',art:'stone',minutes:8},fiber:{name:'纤维植物',item:'fiber',art:'reeds',minutes:6}};
const check=(v,m)=>{if(!v)throw Error(m);};
export function parcelSpec(s,c,zone='field'){
  const seed=`${s.seed}:parcel:${s.atlas.x},${s.atlas.y}:${c.x},${c.y}:${zone}`;
  const size=['small','normal','large'][Math.floor(randomAt(seed,0,0)*3)],dimension={small:11,normal:19,large:29}[size];
  return {id:`${zone}-${c.x}-${c.y}`,size,dimension,zone,seed,owner:{x:c.x,y:c.y},name:zone==='cave'?`${c.name} · 洞穴深处`:`${c.name} · 周边地块`,terrain:c.terrain,scenery:sceneryName(s.world.environment)};
}
export function initialResources(s,c,version=3){
  const nodes={};
  for(const zone of ['field',...(c.poi?.kind==='cave'?['cave']:[])]){
    const spec=parcelSpec(s,c,zone);
    const kinds=version>=2&&zone==='field'&&c.terrain==='a'?['vegetables','grain','grain','fiber','stone']:version>=2&&zone==='field'&&['.','f','m'].includes(c.terrain)?['berries','deadwood','fiber','stone','vegetables']:zone==='cave'?['stone','stone','stone']:['h','s','n','u','r'].includes(c.terrain)?['stone','stone','deadwood']:['berries','deadwood','fiber','stone','deadwood'];
    if(version>=3&&zone==='field'&&['.','f','m','a'].includes(c.terrain))kinds.push('herb');
    kinds.forEach((kind,i)=>{const total=1+Math.floor(randomAt(spec.seed,i,17)*3);nodes[`${zone}-${i}`]={kind,zone,total,remaining:c.depleted&&zone==='field'?0:total};});
  }
  return {version,nodes};
}
export function validateResources(s,c){
  if(!c.resources)return;
  const r=c.resources,expected=initialResources(s,c,r.version);
  check([1,2,3].includes(r.version)&&r.nodes&&Object.keys(r.nodes).length===Object.keys(expected.nodes).length,'资源记录不完整');
  for(const[id,e]of Object.entries(expected.nodes)){const n=r.nodes[id];check(n&&n.kind===e.kind&&n.zone===e.zone&&n.total===e.total&&Number.isInteger(n.remaining)&&n.remaining>=0&&n.remaining<=n.total,'资源数量或类型无效');}
  check(c.depleted===Object.values(r.nodes).filter(n=>n.zone==='field').every(n=>n.remaining===0),'快速搜集与资源点记录不一致');
}
export function fieldConstraints(s,c,zone='field'){
  const spec=parcelSpec(s,c,zone),nodes=c.resources?.nodes??initialResources(s,c).nodes;
  const portals=zone==='field'?[...(c.site?[{kind:'building',x:Math.floor(spec.dimension/2),y:3}]:[]),...(c.poi?.kind==='cave'?[{kind:'cave',x:Math.floor(spec.dimension/2),y:3}]:[])]:[];
  return {...spec,exit:{x:Math.floor(spec.dimension/2),y:spec.dimension-1},portals,resources:Object.entries(nodes).filter(([,n])=>n.zone===zone).map(([id,n])=>({id,kind:n.kind,name:RESOURCES[n.kind].name})),maxObstacles:40};
}
export function validateFieldMetadata(s,c,id,map){
  check(['field','cave'].includes(map.kind)&&c&&c.terrain!=='w'&&(map.kind!=='cave'||c.poi?.kind==='cave'),'地点类型或所属地块无效');
  const spec=fieldConstraints(s,c,map.kind);
  check(c.resources&&id===spec.id&&map.owner?.x===c.x&&map.owner?.y===c.y&&map.size===spec.size&&map.w===spec.dimension&&map.h===spec.dimension,'地点规模或归属不一致');
  check(map.exit.x===spec.exit.x&&map.exit.y===spec.exit.y&&JSON.stringify(map.portals)===JSON.stringify(spec.portals),'地点出入口不一致');
  check(map.grid.every(row=>/^[.#E]+$/.test(row)),'自然地图包含未支持的地形');
  const objects=Object.values(map.containers);
  check(objects.length===spec.resources.length&&new Set(objects.map(n=>n.resourceId)).size===objects.length,'资源点重复或缺失');
  for(const o of objects)check(spec.resources.some(n=>n.id===o.resourceId&&n.name===o.name&&n.kind===o.kind)&&o.searched===true&&Object.keys(o.items).length===0,'资源点与物资记录不匹配');
  for(const p of spec.portals)check(map.grid[p.y]?.[p.x]==='.'&&!map.containers[`${p.x},${p.y}`],'建筑或洞穴入口被阻挡');
}
