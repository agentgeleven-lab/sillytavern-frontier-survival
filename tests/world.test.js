import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as W from '../src/world.js';
import {REGION_SIZES,BUILDING_SIZES,demoPlan} from '../src/layout.js';
import {RegionGameStore} from '../src/region-store.js';
import {validateEvents,applyEvents} from '../src/sync.js';

const game=(size='normal')=>{const spec=W.regionSpec({seed:'testing',atlas:{regions:{}}},0,0,size),raw=W.demoRegion(spec),s=E.newGame(raw,{mode:'demo',seed:'testing'});s.world=W.validateRegion(raw,spec);W.summarizeRegion(s);return s;};
test('all three region sizes generate and preserve site size classes',()=>{
  for(const[size,n]of Object.entries(REGION_SIZES)){const s=game(size);E.validateSave(s);assert.equal(Object.keys(s.world.cells).length,n*n);assert.equal(s.player.x,Math.floor(n/2));assert.deepEqual(Object.values(s.world.cells).filter(c=>c.site).map(c=>c.site.size).sort(),['large','normal','small']);}
});
test('different size neighbors share edge intent and reject broken boundary output',()=>{
  const s=game();s.atlas.regions={};const a=W.regionSpec(s,0,0,'small'),b=W.regionSpec(s,1,0,'large');assert.deepEqual(a.edges.east,b.edges.west);
  const bad=W.demoRegion(b);bad.terrain[10]='w'+bad.terrain[10].slice(1);assert.throws(()=>W.validateRegion(bad,b),/边界/);
  assert.throws(()=>W.validateRegion(W.demoRegion(a),b),/21/);
});
test('building plans stay below their own limit and exterior never becomes walkable floor',()=>{
  for(const[size,limit]of Object.entries(BUILDING_SIZES)){const map=E.validateLocal(demoPlan(size),size);assert(map.w<limit&&map.h<limit);assert.equal(map.grid[map.exit.y][map.exit.x],'E');}
  assert.throws(()=>E.validateLocal(demoPlan('large'),'small'),/尺寸/);
  const p={width:12,height:12,description:'L形',rooms:[{x:1,y:1,w:4,h:10},{x:5,y:7,w:6,h:4}],doors:[],windows:[],exit:{x:2,y:11},containers:[{x:2,y:2,name:'柜',kind:'柜'}]};
  const map=E.validateLocal(p,'small');assert.equal(map.grid[2][10],'_');assert.equal(E.tileAt(map,10,2),'_');assert.throws(()=>E.validateLocal({...p,containers:[{x:10,y:2,name:'柜',kind:'柜'}]},'small'),/地板/);
});
test('large building can use its full cap and rejects overlaps and disconnected rooms',()=>{
  const full={width:40,height:40,description:'仓库',rooms:[{x:1,y:1,w:38,h:38}],doors:[],windows:[],exit:{x:2,y:39},containers:[{x:2,y:2,name:'柜',kind:'柜'}]};assert.equal(E.validateLocal(full,'large').w,40);
  assert.throws(()=>E.validateLocal({...full,width:41},'large'));
  const p=demoPlan('normal');p.doors=[];assert.throws(()=>E.validateLocal(p),/封死/);
  const q=demoPlan('normal');q.containers.push(q.containers[0]);assert.throws(()=>E.validateLocal(q),/重叠/);
});
test('legacy game migrates without changing terrain, loot, camp or local position',()=>{
  const s=E.newGame(E.demoWorld('legacy'),{mode:'demo'});E.enter(s,E.demoLocal());s.locals[s.player.local.site].containers['2,2'].items={water:1};E.cell(s).camp={level:1,storage:{wood:3}};
  s.version=1;delete s.atlas;delete s.world.sizeClass;for(const c of Object.values(s.world.cells))if(c.site)delete c.site.size;
  const before=E.clone(s);E.validateSave(s);W.ensureGates(s);W.summarizeRegion(s);
  assert.deepEqual(s.player,before.player);assert.deepEqual(s.locals,before.locals);assert.deepEqual(E.cell(s).camp,E.cell(before).camp);assert.equal(s.atlas.x,0);assert.equal(s.world.size,9);
});
test('chat discoveries accept coordinates in large regions and remain local',()=>{
  const s=game('large'),target={isUser:true,text:'我发现了(19,19)的诊所'},raw={events:[{kind:'discovery',title:'诊所',detail:'旧诊所',quote:target.text,x:19,y:19}]};
  const events=validateEvents(raw,target,21);applyEvents(s,events,{id:'a',fingerprint:'1',target});assert.equal(E.cell(s,19,19).site.name,'诊所');assert.throws(()=>validateEvents(raw,target,9));
  const context=JSON.parse(E.knownContext(s));assert.deepEqual(context.worldPosition,{x:0,y:0});assert.equal(context.regionSize,21);
});
test('new regions inherit an existing neighbor border and off-center legacy entrance',()=>{
  const s=E.newGame(E.demoWorld('legacy'),{mode:'demo'});W.ensureGates(s);s.world.gates.north={x:3,y:0};E.cell(s,3,0).terrain='r';W.summarizeRegion(s);
  const spec=W.regionSpec(s,0,-1,'large');assert.equal(spec.gates.south.x,8);assert.equal(spec.boundaries['8,20'],'r');assert.equal(spec.edges.south.inherited,true);W.validateRegion(W.demoRegion(spec),spec);
});
test('invalid world summaries are rejected before rendering',()=>{
  const s=game();s.atlas.regions['0,0'].sizeClass='large';assert.throws(()=>E.validateSave(s),/摘要/);
});

const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
class MemoryRepository{
  heads=new Map();regions=new Map();fail=false;
  async load(k){return E.clone(this.heads.get(k)??null);}
  async loadRegion(k,id,coord){return E.clone(this.regions.get(JSON.stringify([k,id,coord]))??null);}
  async commit(k,baseline,s,regions,{signal}={}){assert(!signal?.aborted);if(this.fail)throw Error('quota');const old=this.heads.get(k);assert.equal(old?`${old.id}:${old.revision}`:null,baseline,'stale');for(const[coord,data]of regions)this.regions.set(JSON.stringify([k,s.id,coord]),E.clone(data));this.heads.set(k,E.clone(s));}
  async export(k){const s=await this.load(k),regions={};for(const coord of Object.keys(s.atlas.regions))regions[coord]=await this.loadRegion(k,s.id,coord);return {format:'frontier-world',version:2,state:s,regions};}
}
async function travel(store,x,y,size){return store.run(async(s,signal,tx)=>{
  const plan=W.travelPlan(s,x,y),from=W.regionKey(s);let data=await tx.loadRegion(s,x,y);
  if(!data){const spec=W.regionSpec(s,x,y,size);data={world:W.validateRegion(W.demoRegion(spec),spec),locals:{},clues:[],sync:{}};}
  tx.stageRegion(from,W.installRegion(s,x,y,data,plan));
});}
test('region store writes touched regions and restores searched loot and camps on return',async()=>{
  const repo=new MemoryRepository(),store=new RegionGameStore(memory(),'u',repo);await store.switch('chat');await store.run(()=>game('small'),{create:true});
  await store.run(s=>{E.enter(s,demoPlan('normal'));const map=E.localMap(s);map.containers['2,2'].searched=true;map.containers['2,2'].items={water:1};s.player.local=null;E.cell(s).camp={level:1,storage:{wood:3}};});
  await travel(store,-1,0,'large');assert.equal(store.state.world.size,21);assert.equal(store.state.player.x,20);assert.equal(repo.regions.size,2);
  await travel(store,0,0,'normal');assert.equal(store.state.world.size,9);assert.equal(store.state.locals['site-4-4'].containers['2,2'].items.water,1);assert.equal(E.cell(store.state,4,4).camp.storage.wood,3);assert.equal(repo.regions.size,2);
  const reloaded=new RegionGameStore(memory(),'u',repo);await reloaded.switch('chat');assert.deepEqual(reloaded.state,store.state);
  const exported=await store.export(),restored=new RegionGameStore(memory(),'u',repo);await restored.switch('import');await restored.import(exported);assert.equal(Object.keys(restored.state.atlas.regions).length,2);await travel(restored,-1,0,'small');assert.equal(restored.state.world.size,21);
});
test('storage failure and cancelled generation do not apply travel or overwrite another chat',async()=>{
  const repo=new MemoryRepository(),store=new RegionGameStore(memory(),'u',repo);await store.switch('a');await store.run(()=>game(),{create:true});const before=await store.export();
  repo.fail=true;await assert.rejects(travel(store,1,0,'large'),/quota/);repo.fail=false;assert.equal(await store.export(),before);assert.equal(store.state.atlas.x,0);
  let done;const pending=store.run(async s=>{await new Promise(r=>done=r);s.bag.water=99;});await store.switch('b');done();await assert.rejects(pending);assert.equal(store.state,null);await store.switch('a');assert.equal(store.state.bag.water,2);
});
test('region storage migration preserves legacy original and cross-window writes fail closed',async()=>{
  const mem=memory(),repo=new MemoryRepository(),a=new RegionGameStore(mem,'u',repo);const legacy=game('small');legacy.version=1;delete legacy.atlas;const original=JSON.stringify(legacy);mem.setItem(a.key(),original);await a.switch('standalone');assert.equal(mem.getItem(a.key()),original);
  const b=new RegionGameStore(mem,'u',repo);await b.switch('standalone');await a.run(s=>{s.bag.water++;});await assert.rejects(b.run(s=>{s.bag.food++;}),/stale/);assert.equal((await repo.load(a.key())).bag.water,3);
});
