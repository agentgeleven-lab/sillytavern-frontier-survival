import {MATERIALS,validateWorkshop} from './workshop-data.js';
import {advanceTemperature,thermalSnapshot,thermalRecovery,validateTemperature} from './temperature.js';
import {validateShore,advanceStomach,waterRecovery,settleRain,validateWater,waterDepth,stomachLevel} from './water-data.js';
import {benefitMinutes,mealBenefit,recoveryBonus,advanceBenefits,validateBenefits,activeBenefits} from './positive-states.js';
import {campRestCover,campRooms} from './camp-rooms.js';
import {validateCamps,revealCamp} from './camp-data.js';
import {applyDevLocks,timeFrozen,validateDeveloper,devEnabled} from './developer-data.js';
import {prepareFood,gainFood,consumeFood,transferFood,validateFood,FOOD_LIFE,foodBatches} from './provisions.js';
import {advanceInjuries,validateInjuries,injuryEffort,injuryDelay,injuryState,healWounds} from './injury-data.js';
import {validateFacilities,hasFacility} from './shelter-data.js';
import {GEAR,equipped,stealth,validateEquipment} from './equipment-data.js';
import {advanceSpirit} from './spirit.js';
import {ensureWildlife,advanceWildlife,observeWildlife,knownWildlife,validateWildlife} from './wildlife.js';
import {validateSleep} from './sleep-data.js';
import {burnPortable,validateLighting,lightState,fireRemaining} from './lighting-data.js';
import {phaseAt,sightLine,localSight} from './daylight.js';
export {phaseAt} from './daylight.js';
import {validateResources,validateFieldMetadata,RESOURCES} from './field-data.js';
import {NATURAL_POINTS,validateEnvironment,validateEcology,knownEnvironment} from './environment.js';
import {readTerrain} from './terrain-input.js';
import { REGION_SIZES, BUILDING_SIZES, rasterizeLayout } from './layout.js';
// The game state is the authority. Model output is input data, never executable code.
export const VERSION = 2;
export const TERRAINS = { '.': ['草地', '#54664b'], f: ['林地', '#344d41'], r: ['道路', '#77746a'], w: ['水域', '#365d68'], h: ['山地', '#887f69'], s:['沙地','#b9ad83'], n:['寒原','#b7c8bc'], m:['沼泽','#687e65'], a:['农田','#a6a06a'], u:['街区','#9b9685'] };
export const ITEMS = {
  ...MATERIALS,
  ...Object.fromEntries(Object.entries(GEAR).map(([id,r])=>[id,{name:r.name,weight:r.weight}])),
  smokedmeat:{name:'熏肉',weight:.3},rawmeat:{name:'生肉',weight:.5},cookedmeat:{name:'熟肉',weight:.3},hide:{name:'皮料',weight:.3},
  torch:{name:'火把',weight:.5},flashlight:{name:'手电',weight:.4},battery:{name:'电池',weight:.1},
  stone: {name:'石料',weight:1}, fiber:{name:'植物纤维',weight:.2},
  wood: { name: '木材', weight: 1 }, cloth: { name: '布料', weight: .2 }, scrap: { name: '金属零件', weight: .5 },
  dirtywater:{name:'污水',weight:.5},waterfilter:{name:'净水滤芯',weight:.2},
  water: { name: '饮用水', weight: .5 }, food: { name: '食品', weight: .3 }, medicine: { name: '医疗用品', weight: .1 },
  tool: { name: '工具', weight: 1.5 }, fuel: { name: '燃料', weight: .5 },
};
export const RECIPES = {
  shelter: { name: '简易庇护所', cost: { wood: 4, cloth: 2 }, minutes: 90, description: '遮风避雨；解锁营地储藏和较好的休息恢复。' },
  upgrade: { name: '加固庇护所', cost: { wood: 6, scrap: 3 }, minutes: 150, description: '增加防护，进一步改善休息。' },
};
export const clone = value => structuredClone(value);
export const key = (x, y) => `${x},${y}`;
export const assert = (test, message) => { if (!test) throw Error(message); };
export function text(value, max = 500) { assert(typeof value === 'string' && value.length <= max, '返回的文字字段无效或过长'); return value.trim(); }
export function int(value, min, max) { assert(Number.isInteger(value) && value >= min && value <= max, '返回的数值超出允许范围'); return value; }
export function hash(value) { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(36); }
export function seeded(seed) { let n = parseInt(hash(seed), 36); return () => { n |= 0; n = n + 0x6D2B79F5 | 0; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function log(s, message) { s.log.push({ id: `${s.revision}-${s.log.length}`, time: s.time, text: String(message).slice(0, 1500) }); s.log = s.log.slice(-120); }
export function cell(s, x = s.player.x, y = s.player.y) { return s.world.cells[key(x, y)]; }
export function reveal(s) { const radius=phaseAt(s.time).region;for (let y = s.player.y - radius; y <= s.player.y + radius; y++) for (let x = s.player.x - radius; x <= s.player.x + radius; x++) { const c = cell(s, x, y); if (c) c.known = true; } cell(s).visited = true; }
export function validateWorld(raw, options = {}) {
  const n=options.size?REGION_SIZES[options.size]:raw?.terrain?.length;
  assert(Object.values(REGION_SIZES).includes(n),'区域尺寸必须为 9、15 或 21');
  const center=Math.floor(n/2);
  const terrainRows=readTerrain(raw?.terrain,n,Object.keys(TERRAINS));
  const cells = {};
  terrainRows.forEach((row, y) => {
    [...row].forEach((terrain, x) => { cells[key(x, y)] = { x, y, terrain, name: TERRAINS[terrain][0], known: false, visited: false, surveyed: false, depleted: false, site: null, poi: null, camp: null }; });
  });
  assert(cells[key(center,center)].terrain !== 'w', '起点不能位于水中');
  assert(Array.isArray(raw.sites) && raw.sites.length <= n*2, '建筑数量不合法');
  for (const site of raw.sites) {
    const c = cells[key(int(site.x, 0, n-1), int(site.y, 0, n-1))];
    assert(c.terrain !== 'w' && !c.site, '建筑重叠或位于水中');
    c.site = { id: `site-${c.x}-${c.y}`, name: text(site.name, 70), kind: text(site.kind, 50), description: text(site.description, 400), size: site.size??'normal', origin: 'world' };
    assert(Object.hasOwn(BUILDING_SIZES,c.site.size),'建筑大小等级无效'); assert(c.site.name, '建筑需要名称'); c.name = c.site.name;
  }
  assert(raw.points===undefined||(Array.isArray(raw.points)&&raw.points.length<=n*2),'自然地点数量无效');
  for(const point of raw.points??[]){
    const c=cells[key(int(point.x,0,n-1),int(point.y,0,n-1))];
    assert(c.terrain!=='w'&&!c.site&&!c.poi,'自然地点重叠或位于水中');assert(Object.hasOwn(NATURAL_POINTS,point.kind),'自然地点类型无效');
    c.poi={id:`point-${c.x}-${c.y}`,kind:point.kind,name:text(point.name,70),description:text(point.description,400)};assert(c.poi.name,'自然地点需要名称');c.name=c.poi.name;
  }
  const connected = flood({ x: center, y: center }, (x, y) => !!cells[key(x, y)] && cells[key(x, y)].terrain !== 'w');
  assert(Object.values(cells).filter(c=>c.site||c.poi).every(c=>connected.has(key(c.x,c.y))), '地点必须能够从起点抵达');
  if(options.boundaries)for(const [k,t]of Object.entries(options.boundaries))assert(cells[k]?.terrain===t,'相邻区域边界未衔接：'+k);
  if(options.gates)for(const gate of Object.values(options.gates))assert(connected.has(key(gate.x,gate.y)),'区域出入口必须连通起点');
  return { name: text(raw.name, 80), description: text(raw.description, 1000), size: n, sizeClass:Object.keys(REGION_SIZES).find(k=>REGION_SIZES[k]===n), cells };
}
export function newGame(raw, { background = '', seed = 'frontier', mode = 'api', theme = 'waste' } = {}) {
  const s = { version: VERSION, id: globalThis.crypto.randomUUID(), revision: 0, seed, mode, theme, background: text(background, 30000),
    world: validateWorld(raw), atlas:{x:0,y:0,regions:{}}, player: { x: Math.floor(raw.terrain.length/2), y: Math.floor(raw.terrain.length/2), local: null }, time: 480, weather: '晴',
    stats: { health: 100, food: 85, water: 85, stamina: 100, spirit:100 }, bag: { water: 2, food: 2, tool: 1, wood: 2, cloth: 1 },
    locals: {}, clues: [], sync: {}, log: [], ended: false };
  s.weather=['晴','多云','小雨','多云'][parseInt(hash(s.seed+Math.floor(s.time/240)),36)%4];reveal(s); log(s, mode === 'demo' ? '离线演示：使用固定示例内容，不调用模型。' : '独立游戏已创建。地图、资源与行动在插件中结算。'); return s;
}
export function flood(start, passable) {
  const seen = new Set([key(start.x, start.y)]), q = [start];
  for (let i = 0; i < q.length && i < 2000; i++) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const x=q[i].x+dx, y=q[i].y+dy, k=key(x,y);
    if (!seen.has(k) && passable(x,y)) { seen.add(k); q.push({x,y}); }
  } return seen;
}
export function pathfind(start, end, passable) {
  const q=[start], prev=new Map([[key(start.x,start.y),null]]);
  for(let i=0;i<q.length&&i<2000;i++) {
    const p=q[i]; if(p.x===end.x&&p.y===end.y) { const path=[]; let k=key(p.x,p.y); while(prev.get(k)!==null) { const [x,y]=k.split(',').map(Number); path.unshift({x,y}); k=prev.get(k); } return path; }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {const x=p.x+dx,y=p.y+dy,k=key(x,y); if(!prev.has(k)&&passable(x,y)){prev.set(k,key(p.x,p.y));q.push({x,y});}}
  } return null;
}
export function tick(s, minutes, effort = 1, updateSight = true, thermalMode = 'normal') {
  applyDevLocks(s);assert(!s.ended, '本局角色已无法行动，请读取存档或开始新游戏');
  if(timeFrozen(s)){ensureWildlife(s,localMap(s));return;}prepareFood(s);const previousTime=s.time;s.time += minutes;advanceInjuries(s,minutes);advanceSpirit(s,previousTime,updateSight);advanceWildlife(s,previousTime,updateSight);const exhausted=burnPortable(s,minutes);if(exhausted)log(s,exhausted);
  s.stats.food = Math.max(0, s.stats.food-minutes*.025);
  s.stats.water = Math.max(0,s.stats.water-minutes*.045);
  s.stats.stamina = Math.max(0,s.stats.stamina-(minutes-.1*benefitMinutes(s,'rested',previousTime,s.time))*.09*effort*injuryEffort(s)*((s.stats.spirit??100)<25?1.25:1));
  if(s.stats.food===0||s.stats.water===0) s.stats.health=Math.max(0,s.stats.health-minutes*.12);
  if(s.stats.stamina===0&&effort>0) s.stats.health=Math.max(0,s.stats.health-minutes*.035);
  s.weather=['晴','多云','小雨','多云'][parseInt(hash(s.seed+Math.floor(s.time/240)),36)%4];
  advanceTemperature(s,previousTime,effort,thermalMode);advanceStomach(s,previousTime);settleRain(s,previousTime);advanceBenefits(s,previousTime);applyDevLocks(s);s.ended=s.stats.health<=0;if(updateSight){refreshSight(s);revealCamp(s);}
}
export function weight(bag) { return Object.entries(bag).reduce((n,[id,qty])=>n+(ITEMS[id]?.weight??0)*qty,0); }
export function validateLoot(raw) {
  assert(raw&&Array.isArray(raw.items)&&raw.items.length<=8,'战利品结构无效');
  const items={}; for(const item of raw.items){assert(Object.hasOwn(ITEMS,item.id),'模型返回了未支持的物品类型');assert(!Object.hasOwn(items,item.id),'物品类型重复');items[item.id]=int(item.qty,1,5);}
  return {items,description:text(raw.description,1000)};
}
export function validateLocal(raw, size='normal') {
  const limit=BUILDING_SIZES[size];assert(limit,'建筑大小等级无效');
  if(raw?.rooms)raw=rasterizeLayout(raw,size);
  assert(raw&&Array.isArray(raw.grid)&&raw.grid.length>=5&&raw.grid.length<=limit,`建筑高度必须为 5–${limit}`);
  const grid=raw.grid.map(row=>text(row,limit)),w=grid[0].length,h=grid.length;
  assert(w>=5&&w<=limit&&grid.every(row=>row.length===w&&/^[.#+=E_]+$/.test(row)),'局部地图行宽或地形符号不合法');
  const exits=[],doors={};
  grid.forEach((row,y)=>[...row].forEach((tile,x)=>{if(tile==='E')exits.push({x,y});if(tile==='+')doors[key(x,y)]=false;if(x===0||y===0||x===w-1||y===h-1)assert('_#=E'.includes(tile),'局部地图边缘必须封闭，出口使用 E');}));
  assert(exits.length===1,'第一版局部地图需要且只允许一个区域出入口');
  const start=exits[0];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if('.+'.includes(grid[y][x]))for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])assert(grid[y+dy]?.[x+dx]&&grid[y+dy][x+dx]!=='_','室内地板不能直接通向建筑外部');assert(start.x===0||start.y===0||start.x===w-1||start.y===h-1,'区域出口必须位于地图边缘');
  assert(Array.isArray(raw.containers)&&raw.containers.length>=1&&raw.containers.length<=60,'需要 1–60 个可搜索容器');
  const occupied=new Set(),containers={};
  raw.containers.forEach((c,i)=>{const x=int(c.x,1,w-2),y=int(c.y,1,h-2),k=key(x,y);assert(grid[y][x]==='.'&&!occupied.has(k),'容器必须位于不重叠的地板上');occupied.add(k);containers[k]={id:`container-${i}`,x,y,name:text(c.name,60),kind:text(c.kind,50),searched:false,items:{}};});
  const seen=flood(start,(x,y)=>x>=0&&y>=0&&x<w&&y<h&&'.+E'.includes(grid[y][x])&&!occupied.has(key(x,y)));
  grid.forEach((row,y)=>[...row].forEach((t,x)=>{if('.+E'.includes(t)&&!occupied.has(key(x,y)))assert(seen.has(key(x,y)),'房间或通道被封死，请重新生成');}));
  for(const c of Object.values(containers))assert([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(key(c.x+dx,c.y+dy))),'柜子没有可接近的搜索位置');
  return {w,h,size,grid,doors,containers,exit:start,seen:{},description:text(raw.description,1200)};
}
export function localMap(s) { return s.player.local ? s.locals[s.player.local.site] : null; }
export function tileAt(map,x,y){return map.grid[y]?.[x]??'#';}
export function visible(map, from, x, y, radius=8) {return sightLine(map,from,x,y,radius);}
export function regionVisible(s,x,y){return !s.player.local&&Math.max(Math.abs(x-s.player.x),Math.abs(y-s.player.y))<=phaseAt(s.time).region&&!!cell(s,x,y);}
export function canSee(s,x,y){const map=localMap(s);return map?localSight(s,map,s.player.local,x,y):!s.player.local&&Math.max(Math.abs(x-s.player.x),Math.abs(y-s.player.y))<=phaseAt(s.time).region&&!!cell(s,x,y);}
export function refreshSight(s){if(s.player.local)revealLocal(s);else reveal(s);observeWildlife(s);}
export function revealLocal(s) {const map=localMap(s);if(!map)return;for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)if(canSee(s,x,y))map.seen[key(x,y)]=true;}
export function enter(s, raw) {
  const parent=s.player.local?clone(s.player.local):null;assert(!parent||(localMap(s)?.kind==='field'&&localMap(s).portals.some(p=>p.kind==='building'&&p.x===parent.x&&p.y===parent.y)),'请走到地块内的建筑入口');const c=cell(s);assert(c.site,'此处没有可进入建筑');
  if(!s.locals[c.site.id]){assert(raw,'需要先生成建筑布局');s.locals[c.site.id]=validateLocal(raw,c.site.size??'normal');}
  const map=s.locals[c.site.id];s.player.local={site:c.site.id,...map.exit,...(parent?{parent}:{})};tick(s,1);revealLocal(s);log(s,`进入${c.site.name}。`);
}
export function localPath(s,x,y) {const map=localMap(s);if(!map)return null;return pathfind(s.player.local,{x,y},(a,b)=>map.seen[key(a,b)]&&'.+E'.includes(tileAt(map,a,b))&&(tileAt(map,a,b)!=='+'||map.doors[key(a,b)])&&!map.containers[key(a,b)]);}
export function approachPath(s,x,y){const map=localMap(s);if(!map||!map.seen[key(x,y)])return null;return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>localPath(s,x+dx,y+dy)).filter(p=>p!==null).sort((a,b)=>a.length-b.length)[0]??null;}
export function regionPath(s,x,y) {return pathfind(s.player,{x,y},(a,b)=>{const c=cell(s,a,b);return c?.known&&c.terrain!=='w';});}
export function stepMinutes(s,x,y,local=!!s.player.local){if(timeFrozen(s))return 0;return (local?(stealth(s)?2:1):cell(s,x,y).terrain==='h'?12:6)+injuryDelay(s);}
export function routeMinutes(s,path){return path?.length?path.reduce((sum,p)=>sum+stepMinutes(s,p.x,p.y),0):0;}
export function move(s,x,y) {
  assert(Number.isInteger(x)&&Number.isInteger(y),'目标坐标无效');
  const p=s.player.local, path=p?localPath(s,x,y):regionPath(s,x,y);
  assert(path&&path.length,'没有可通行的已知路线');
  for(const step of path){if(s.ended)break;if(p){if(s.lighting)s.lighting.facing=step.x>p.x?'east':step.x<p.x?'west':step.y>p.y?'south':'north';p.x=step.x;p.y=step.y;tick(s,stepMinutes(s,step.x,step.y));revealLocal(s);}else{s.player.x=step.x;s.player.y=step.y;tick(s,stepMinutes(s,step.x,step.y));reveal(s);}}
  log(s,p?`移动到地点位置 ${p.x},${p.y}。`:`抵达${cell(s).name}（${s.player.x},${s.player.y}）。`);
}
export function adjacent(s,x,y) {const p=s.player.local;return p&&Math.abs(p.x-x)+Math.abs(p.y-y)===1;}
export function door(s,x,y) {const map=localMap(s),k=key(x,y);assert(map&&Object.hasOwn(map.doors,k)&&adjacent(s,x,y),'请先走到门的相邻位置');map.doors[k]=!map.doors[k];tick(s,1);revealLocal(s);log(s,map.doors[k]?'打开了门。':'关上了门。');}
export function leave(s){const map=localMap(s);assert(map&&s.player.local.x===map.exit.x&&s.player.local.y===map.exit.y,'需要先走到区域出入口');tick(s,1);s.player.local=s.player.local.parent??null;refreshSight(s);log(s,s.player.local?'返回周边地块。':'返回区域地图。');}
export function searchContainer(s,x,y,raw){const c=localMap(s)?.containers[key(x,y)];assert(c&&!c.resourceId&&adjacent(s,x,y),'请先走到容器的相邻位置');assert(!c.searched,'该容器已经搜索过');const loot=validateLoot(raw);c.searched=true;c.items={};for(const[id,q]of Object.entries(loot.items))gainFood(s,c.items,id,q);c.description=loot.description;tick(s,10);log(s,`搜索${c.name}：${loot.description}`);}
export function take(s,x,y,id,qty=1){const c=localMap(s)?.containers[key(x,y)];assert(c?.searched&&!c.resourceId&&adjacent(s,x,y),'需要在已搜索的容器旁');transfer(c.items,s.bag,id,qty,20,s);log(s,`拿取${ITEMS[id].name} ×${qty}。`);}
export function transfer(from,to,id,qty,limit=20,s=null){assert(Object.hasOwn(ITEMS,id)&&Number.isInteger(qty)&&qty>0&&(from[id]??0)>=qty,'物品数量不足');assert(weight(to)+ITEMS[id].weight*qty<=limit,'背包负重超过 20 kg');if(s)transferFood(s,from,to,id,qty);else {from[id]-=qty;to[id]=(to[id]??0)+qty;}}
export function useItem(s,id){assert(!s.ended&&s.stats.health>0,'角色已无法行动');assert((s.bag[id]??0)>0&&['water','food','medicine','cookedmeat','smokedmeat'].includes(id),'没有可用的消耗品');assert(id!=='medicine'||!Object.values(injuryState(s)).some(v=>v>0),'存在伤势，请使用伤势面板的医疗处理');const foodBefore=s.stats.food;if(Object.hasOwn(FOOD_LIFE,id))consumeFood(s,s.bag,id);else s.bag[id]--;const stat={smokedmeat:'food',water:'water',food:'food',cookedmeat:'food',medicine:'health'}[id];s.stats[stat]=Math.min(100,s.stats[stat]+(id==='medicine'?25:30));if(mealBenefit(s,id,foodBefore))log(s,'获得饱腹满足：持续 4 小时。');log(s,`使用${ITEMS[id].name}。`);}
export function campTransfer(s,id,toCamp){const c=cell(s);assert(c.camp&&!s.player.local&&!c.camp.layout,'请进入营地并在储物箱旁存取');if(toCamp&&equipped(s)===id)assert((s.bag[id]??0)>1,'请先卸下这件武器再存入营地');if(toCamp&&['torch','flashlight'].includes(id)&&lightState(s)[id]>0)assert((s.bag[id]??0)>1,'这件装备仍装有燃料或电量，请保留在背包中');transfer(toCamp?s.bag:c.camp.storage,toCamp?c.camp.storage:s.bag,id,1,toCamp?200:20,s);log(s,`${toCamp?'存入营地':'从营地取出'}${ITEMS[id].name}。`);}
export function build(s,recipe){assert(Object.hasOwn(RECIPES,recipe)&&!s.player.local,'请在区域地图上选择建设');const c=cell(s),r=RECIPES[recipe];assert(c.terrain!== 'w','不能在水中建设');assert(recipe==='shelter'?!c.camp:c.camp?.level===1,'当前营地不符合建设条件');for(const [id,q]of Object.entries(r.cost))assert((s.bag[id]??0)>=q,`缺少${ITEMS[id].name}，需要 ${q}`);for(const[id,q]of Object.entries(r.cost))s.bag[id]-=q;tick(s,r.minutes);if(s.ended){log(s,'建设中健康耗尽，庇护所未完成。');return;}c.camp??={level:0,storage:{}};c.camp.level++;log(s,`完成${r.name}。`);}
export function rest(s){if(s.player.camp&&cell(s).camp?.layout){const cover=campRestCover(s),level=cover.kind==='room'?cell(s).camp.level:0,rate=level?15+level*12:cover.covered?21:15,health=level?level*4:cover.covered?2:0;for(let i=0;i<60;i++){const rain=!cover.covered&&s.weather==='小雨';const recovery=waterRecovery(s)*thermalRecovery(s),bonus=timeFrozen(s)?0:recoveryBonus(s,s.time,s.time+1,rate)*(rain?.5:1);tick(s,1,0,false);if(s.ended)break;s.stats.stamina=Math.min(100,s.stats.stamina+(rate/60*(rain?.5:1)+bonus)*recovery);if(s.stats.food>20&&s.stats.water>20)s.stats.health=Math.min(100,s.stats.health+health/60);healWounds(s,1,hasFacility(s,'bed'));applyDevLocks(s);}log(s,`休息一小时：${cover.label}。`);return;}const level=!s.player.local&&(!cell(s).camp?.layout||s.player.camp)?cell(s).camp?.level??0:0;const recovery=waterRecovery(s,60)*thermalRecovery(s),bonus=timeFrozen(s)?0:recoveryBonus(s,s.time,s.time+60,15+level*12);tick(s,60,0);if(s.ended){log(s,'休息中健康耗尽，无法继续恢复。');return;}healWounds(s,60,hasFacility(s,'bed'));s.stats.stamina=Math.min(100,s.stats.stamina+(15+level*12+bonus)*recovery);if(level&&s.stats.food>20&&s.stats.water>20)s.stats.health=Math.min(100,s.stats.health+level*4);log(s,`休息一小时${level?'，庇护所改善了恢复效果':''}。`);}
export function survey(s,raw){assert(!s.player.local,'请在区域地图探索');const c=cell(s);assert(!c.depleted,'本格的首轮可采集资源已耗尽');assert(!c.resources,'本格应通过共享资源记录采集');const loot=validateLoot(raw);assert(weight(s.bag)+weight(loot.items)<=20,'背包空间不足，请先存放物品');for(const[id,q]of Object.entries(loot.items))gainFood(s,s.bag,id,q);c.surveyed=true;c.depleted=true;tick(s,25);log(s,`探索${c.name}：${loot.description}`);}
export function knownContext(s){if(!s)return '';const c=cell(s),map=localMap(s);return JSON.stringify({world:s.world.name,campPosition:s.player.camp??null,developerMode:devEnabled(s),worldPosition:{x:s.atlas?.x??0,y:s.atlas?.y??0},regionSize:s.world.size,environment:knownEnvironment(s.world.environment),time:formatTime(s.time),lastSleep:s.lastSleep??null,wildlife:knownWildlife(s),lighting:{...lightState(s),fire:map?.fire?{x:map.fire.x,y:map.fire.y,lit:map.fire.lit&&fireRemaining(s,map.fire)>0,remaining:fireRemaining(s,map.fire)}:null},phase:phaseAt(s.time).name,sight:{region:phaseAt(s.time).region,local:map?(map.kind==='cave'?2:phaseAt(s.time).local):null,note:'无采光且无照明时仅两格；火把四格、手电前方六格、营火五格，均受遮挡；地图记忆不等于实时视野'},weather:s.weather,position:{x:s.player.x,y:s.player.y,location:c.name,localKind:map?.kind??(map?'building':null),localName:map?.name??c.site?.name??null,roomPosition:s.player.local?{x:s.player.local.x,y:s.player.local.y}:null},equipment:{weapon:equipped(s),stance:stealth(s)?'sneak':'walk'},status:Object.fromEntries(Object.entries({...s.stats,spirit:s.stats.spirit??100}).map(([k,v])=>[k,Math.round(v*10)/10])),inventory:s.bag,provisions:foodBatches(s),injuries:injuryState(s),positiveStates:activeBenefits(s),temperature:{...thermalSnapshot(s),body:s.thermal??null},waterHealth:{severity:stomachLevel(s),remaining:Math.max(0,(s.waterHealth?.until??0)-s.time)},camp:c.camp,campProtection:c.camp?.layout?{enclosed:campRooms(c.camp.layout).regions.filter(r=>r.closed).length,complete:campRooms(c.camp.layout).regions.filter(r=>r.complete).length,current:campRestCover(s)?.label??'未进入营地'}:null,campFood:c.camp?foodBatches(s,c.camp.storage):[],nearby:Object.values(s.world.cells).filter(c=>c.known&&Math.abs(c.x-s.player.x)<=2&&Math.abs(c.y-s.player.y)<=2).map(c=>({x:c.x,y:c.y,name:c.name,visible:regionVisible(s,c.x,c.y),visited:c.visited,waterDepth:waterDepth(s,c),naturalPoint:c.poi?.kind??null})),visibleResources:map?.kind&&!map.shore?Object.values(map.containers).filter(o=>map.seen[key(o.x,o.y)]&&canSee(s,o.x,o.y)).map(o=>({name:o.name,x:o.x,y:o.y,remaining:c.resources.nodes[o.resourceId].remaining,item:RESOURCES[o.kind].item})):[],visibleObjects:map&&!map.kind?Object.values(map.containers).filter(c=>map.seen[key(c.x,c.y)]&&canSee(s,c.x,c.y)).map(c=>({name:c.name,x:c.x,y:c.y,searched:c.searched,...(c.searched?{items:c.items}:{})})):[],clues:s.clues.filter(c=>!c.revoked).slice(-10).map(c=>({kind:c.kind,title:c.title,detail:c.detail,x:c.x,y:c.y,source:c.sourceName})),recent:s.log.slice(-5).map(e=>e.text)});}
export function formatTime(t){return `第 ${Math.floor(t/1440)+1} 天 · ${phaseAt(t).name} · ${String(Math.floor(t%1440/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
export function validateSave(s){
  if(s?.version===1){s.version=2;s.atlas={x:0,y:0,regions:{}};s.world.sizeClass='small';for(const c of Object.values(s.world.cells))if(c.site)c.site.size??='normal';}
  const inspect=(v,depth=0)=>{assert(depth<20,'存档嵌套过深');if(v&&typeof v==='object')for(const[k,n]of Object.entries(v)){assert(!['__proto__','constructor','prototype'].includes(k),'存档包含非法字段');inspect(n,depth+1);}};inspect(s);
  const inventory=bag=>{assert(bag&&typeof bag==='object'&&!Array.isArray(bag),'物品栏无效');for(const[id,qty]of Object.entries(bag)){assert(Object.hasOwn(ITEMS,id),'未知物品');int(qty,0,10000);}};
  assert(s&&s.version===VERSION&&typeof s.id==='string'&&s.id.length<100&&Object.values(REGION_SIZES).includes(s.world?.size),'存档格式或版本不支持');
  assert(['api','demo'].includes(s.mode)&&typeof s.background==='string'&&s.background.length<=30000,'存档设置无效');text(s.seed,100);text(s.theme,40);text(s.world.name,80);text(s.world.description,1000);
  assert(Object.keys(s.world.cells??{}).length===s.world.size**2&&Array.isArray(s.log)&&s.log.length<=120&&Array.isArray(s.clues)&&s.clues.length<=2000&&s.sync&&s.locals,'存档结构损坏');
  const n=s.world.size;int(s.player.x,0,n-1);int(s.player.y,0,n-1);assert(s.atlas&&Number.isSafeInteger(s.atlas.x)&&Number.isSafeInteger(s.atlas.y)&&s.atlas.regions&&typeof s.atlas.regions==='object','世界坐标无效');int(s.time,0,1e9);int(s.revision,0,1e9);
  for(const name of ['health','food','water','stamina'])assert(Number.isFinite(s.stats[name])&&s.stats[name]>=0&&s.stats[name]<=100,'角色数值无效');inventory(s.bag);validateBenefits(s);
  const regionSizes=Object.values(REGION_SIZES);
  assert(!Array.isArray(s.atlas.regions),'世界索引无效');
  for(const [coord,a]of Object.entries(s.atlas.regions)){
    assert(a&&Number.isSafeInteger(a.x)&&Number.isSafeInteger(a.y)&&coord===key(a.x,a.y),'世界区域索引坐标无效');
    assert(regionSizes.includes(a.size)&&REGION_SIZES[a.sizeClass]===a.size&&a.total===a.size*a.size&&Object.hasOwn(TERRAINS,a.terrain),'世界区域摘要无效');
    text(a.name,80);int(a.known,0,a.total);assert(Array.isArray(a.camps)&&a.camps.length<=a.total,'营地摘要无效');
    if(a.environment)validateEnvironment(a.environment);
    if(a.thumbnail)assert(Array.isArray(a.thumbnail)&&a.thumbnail.length===a.size&&a.thumbnail.every(row=>typeof row==='string'&&row.length===a.size&&[...row].every(t=>t==='?'||Object.hasOwn(TERRAINS,t))),'地图缩略图无效');
    if(a.landmarks){assert(Array.isArray(a.landmarks)&&a.landmarks.length<=a.total,'地点缩略图无效');for(const p of a.landmarks){int(p.x,0,a.size-1);int(p.y,0,a.size-1);assert(['camp','building',...Object.keys(NATURAL_POINTS)].includes(p.kind),'地点缩略图类型无效');}}
    for(const camp of a.camps){int(camp.x,0,a.size-1);int(camp.y,0,a.size-1);int(camp.level,1,2);}
    if(a.borders)for(const side of ['north','east','south','west'])assert(typeof a.borders[side]==='string'&&a.borders[side].length===a.size&&[...a.borders[side]].every(t=>Object.hasOwn(TERRAINS,t)),'区域边界摘要无效');
  }
  const active=s.atlas.regions[key(s.atlas.x,s.atlas.y)];if(active)assert(active.size===n,'当前区域与世界索引尺寸不一致');
  if(s.world.gates)for(const [side,gate]of Object.entries(s.world.gates)){
    int(gate.x,0,n-1);int(gate.y,0,n-1);assert(side==='north'?gate.y===0:side==='south'?gate.y===n-1:side==='west'?gate.x===0:side==='east'?gate.x===n-1:false,'区域出口方向无效');assert(cell(s,gate.x,gate.y)?.terrain!=='w','区域出口不能位于水中');
  }
  const siteIds=new Set();
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const c=cell(s,x,y);assert(c&&c.x===x&&c.y===y&&Object.hasOwn(TERRAINS,c.terrain),'地图格子无效');text(c.name,80);if(c.site){text(c.site.id,200);text(c.site.name,80);text(c.site.description,1000);assert(Object.hasOwn(BUILDING_SIZES,c.site.size??'normal'),'建筑大小无效');assert(!siteIds.has(c.site.id),'建筑标识重复');siteIds.add(c.site.id);}if(c.camp){int(c.camp.level,1,2);inventory(c.camp.storage);}validateResources(s,c);}
  assert(Object.keys(s.locals).length<=n*n*7,'局部地图过多');
  for(const[id,map]of Object.entries(s.locals)){
    assert((map.kind||siteIds.has(id))&&map.seen&&map.doors&&map.containers,'局部地图缺少对应地点或状态');
    if(map.shore)validateShore(s,id,map);else if(map.kind)validateFieldMetadata(s,cell(s,map.owner?.x,map.owner?.y),id,map);
    const checked=validateLocal({description:map.description,grid:map.grid,containers:Object.values(map.containers)},map.kind?map.size:Object.values(s.world.cells).find(c=>c.site?.id===id).site.size??'normal');
    assert(map.w===checked.w&&map.h===checked.h&&map.exit.x===checked.exit.x&&map.exit.y===checked.exit.y,'局部地图尺寸不一致');
    assert(Object.keys(map.doors).length===Object.keys(checked.doors).length,'门状态不完整');
    for(const[k,open]of Object.entries(map.doors))assert(Object.hasOwn(checked.doors,k)&&typeof open==='boolean','门状态无效');
    for(const[k,c]of Object.entries(map.containers)){assert(k===key(c.x,c.y)&&typeof c.searched==='boolean','容器状态无效');inventory(c.items);}
    for(const[k,v]of Object.entries(map.seen)){const parts=k.split(',').map(Number);assert(parts.length===2&&Number.isInteger(parts[0])&&Number.isInteger(parts[1])&&parts[0]>=0&&parts[1]>=0&&parts[0]<map.w&&parts[1]<map.h&&v===true,'视野记录无效');}
  }
  assert(cell(s).terrain!=='w','玩家位置无效');if(s.player.local){const map=localMap(s);assert(map&&Array.isArray(map.grid),'室内位置丢失');int(s.player.local.x,0,map.w-1);int(s.player.local.y,0,map.h-1);const k=key(s.player.local.x,s.player.local.y),t=tileAt(map,s.player.local.x,s.player.local.y);assert('.+E'.includes(t)&&!map.containers[k]&&(t!=='+'||map.doors[k]),'玩家不能位于障碍物内');const owner=map.kind?cell(s,map.owner.x,map.owner.y):Object.values(s.world.cells).find(c=>c.site?.id===s.player.local.site);assert(owner===cell(s),'玩家与地点所属地块不一致');const parent=s.player.local.parent;if(parent){const outer=s.locals[parent.site];assert(map.kind!=='field'&&!parent.parent&&outer?.kind==='field'&&outer.owner.x===s.player.x&&outer.owner.y===s.player.y&&outer.portals.some(p=>p.kind===(map.kind==='cave'?'cave':'building')&&p.x===parent.x&&p.y===parent.y),'返回地块的位置无效');}else assert(map.kind!=='cave','洞穴缺少返回地块的位置');}
  for(const e of s.log){text(e.text,1500);int(e.time,0,1e9);}for(const c of s.clues){text(c.id,200);text(c.title,80);text(c.detail,800);assert(['rumor','discovery'].includes(c.kind),'线索类型无效');assert((c.x===null&&c.y===null)||(Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.x<n&&c.y>=0&&c.y<n),'线索坐标无效');}
  if(s.world.environment)validateEnvironment(s.world.environment);
  if(s.world.ecology)validateEcology(s.world.ecology);
  for(const c of Object.values(s.world.cells))if(c.poi){assert(c.terrain!=='w'&&Object.hasOwn(NATURAL_POINTS,c.poi.kind),'自然地点存档无效');text(c.poi.id,100);text(c.poi.name,70);text(c.poi.description,400);}
  assert(s.stats.spirit===undefined||(Number.isFinite(s.stats.spirit)&&s.stats.spirit>=0&&s.stats.spirit<=100),'精神值无效');validateTemperature(s);validateWorkshop(s);validateWater(s);validateDeveloper(s);validateCamps(s,inventory);validateFood(s);validateFacilities(s);validateInjuries(s);validateEquipment(s);validateLighting(s);validateSleep(s);validateWildlife(s);return s;
}
export function demoWorld(seed='demo'){const r=seeded(seed);const terrain=Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>x===7?'w':y===4||x===4?'r':r()<.6?'f':'.').join(''));return {name:'雾松边境',description:'沿旧公路散布的建筑与林地。河流将东侧荒地与旧聚落分开。',terrain,sites:[{x:4,y:4,name:'公路补给站',kind:'便利店',description:'铁皮招牌在风中轻响。落满灰尘的货架后面，有一扇通往仓库的门。'},{x:3,y:2,name:'废弃林务所',kind:'小屋',description:'林务所的屋顶仍然完好。'},{x:5,y:6,name:'旧维修间',kind:'车间',description:'修理设备和零件散落在屋内。'}]};}
export function demoLocal(){return {description:'柜台与货架围出营业区。东侧的门通向后仓。',grid:['################',' #........#.....#'.trim(),'#........#.....#','#........#.....#','#........+.....#','#........#.....#','#........#.....#','#........#######','#..............#','#..............#','#..............#','####E###########'],containers:[{x:2,y:2,name:'食品货架',kind:'货架'},{x:6,y:3,name:'旧工具柜',kind:'柜子'},{x:12,y:2,name:'后仓物资箱',kind:'箱子'},{x:11,y:5,name:'医疗储物柜',kind:'柜子'}]};}
export function demoLoot(kind){if(kind==='survey')return {items:[{id:'wood',qty:3},{id:'cloth',qty:1}],description:'收集到可用的干木料和遗弃的帆布。'};if(kind?.includes('医疗'))return {items:[{id:'medicine',qty:2}],description:'密封盒里有两份完好的医疗用品。'};return {items:[{id:'water',qty:2},{id:'food',qty:1},{id:'cloth',qty:2},{id:'book',qty:1},{id:'scrap',qty:1}],description:'清理灰尘后，找到饮用水、食品、布料、一本书与金属零件。'};}
