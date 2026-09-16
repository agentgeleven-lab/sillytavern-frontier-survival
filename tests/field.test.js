import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as F from '../src/field.js';
import {initialResources} from '../src/field-data.js';
import {demoPlan} from '../src/layout.js';
import {applyEvents} from '../src/sync.js';
const game=(terrain='f',seed='field-test')=>{const s=E.newGame(E.demoWorld(),{seed,mode:'demo'});Object.assign(E.cell(s),{site:null,terrain,name:'探索地块'});s.bag={};return s;};
const fullyReveal=s=>{const m=E.localMap(s);for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)m.seen[E.key(x,y)]=true;};
const walkTo=(s,x,y)=>{const path=E.localPath(s,x,y);assert.ok(path);if(path.length)E.move(s,x,y);};
const exit=s=>{fullyReveal(s);walkTo(s,E.localMap(s).exit.x,E.localMap(s).exit.y);E.leave(s);};
test('all land terrains have deterministic parcel sizes and valid enterable resource maps',()=>{
  const sizes=new Set();for(const t of Object.keys(E.TERRAINS).filter(t=>t!=='w'))for(let i=0;i<9;i++){
    const s=game(t,`terrain-${i}`),a=F.parcelSpec(s,E.cell(s));sizes.add(a.size);assert.deepEqual(a,F.parcelSpec(E.clone(s),E.cell(s)));
    F.enterField(s,F.demoField(s));assert.equal(E.localMap(s).w,a.dimension);E.validateSave(s);
  }assert.equal(sizes.size,3);
});
test('quick gathering before generation and precise gathering share quantities and do not refill on reentry',()=>{
  const s=game(),original=initialResources(s,E.cell(s));F.quickGather(s);
  for(const[id,n]of Object.entries(E.cell(s).resources.nodes))assert.equal(n.remaining,original.nodes[id].remaining-1);
  F.enterField(s,F.demoField(s));fullyReveal(s);const map=E.localMap(s),o=Object.values(map.containers).find(o=>E.cell(s).resources.nodes[o.resourceId].remaining>0),n=E.cell(s).resources.nodes[o.resourceId],before=n.remaining;
  const path=E.approachPath(s,o.x,o.y);if(path.length)E.move(s,path.at(-1).x,path.at(-1).y);F.gather(s,o.x,o.y);assert.equal(n.remaining,before-1);
  const layout=JSON.stringify(map);exit(s);F.enterField(s,null);assert.equal(E.cell(s).resources.nodes[o.resourceId].remaining,before-1);assert.deepEqual(E.localMap(s).grid,JSON.parse(layout).grid);
  exit(s);s.bag={};delete s.provisions;while(!E.cell(s).depleted)F.quickGather(s);assert.throws(()=>F.quickGather(s),/耗尽/);F.enterField(s,null);assert.ok(Object.values(E.cell(s).resources.nodes).every(n=>n.remaining===0));E.validateSave(s);
});
test('legacy depleted ground stays depleted when first entering its local map',()=>{
  const s=game();E.cell(s).depleted=true;F.enterField(s,F.demoField(s));assert.ok(Object.values(E.cell(s).resources.nodes).every(n=>n.remaining===0));E.validateSave(s);
});
test('model cannot add or omit nodes, overlap them, block a portal or seal the exit',()=>{
  const s=game();E.cell(s).site={id:'test-building',name:'旧屋',kind:'小屋',description:'旧屋',size:'small'};
  const raw=F.demoField(s);let bad=E.clone(raw);bad.resources[0].id='invented';assert.throws(()=>F.validateField(bad,s),/标识/);
  bad=E.clone(raw);bad.resources.pop();assert.throws(()=>F.validateField(bad,s),/列表/);
  bad=E.clone(raw);Object.assign(bad.resources[1],{x:bad.resources[0].x,y:bad.resources[0].y});assert.throws(()=>F.validateField(bad,s),/重叠/);
  const spec=F.fieldConstraints(s,E.cell(s));bad=E.clone(raw);bad.obstacles.push({x:spec.portals[0].x,y:3,w:1,h:1});assert.throws(()=>F.validateField(bad,s),/入口/);
  bad=E.clone(raw);bad.obstacles.push({x:spec.exit.x,y:spec.exit.y-1,w:1,h:1});assert.throws(()=>F.validateField(bad,s),/封死/);
});
test('building and cave return to their parent entrances; cave resources are excluded from quick gather',()=>{
  for(const kind of ['building','cave']){
    const s=game();if(kind==='building')E.cell(s).site={id:'nested-house',name:'旧屋',kind:'小屋',description:'旧屋',size:'small'};else E.cell(s).poi={id:'cave-mouth',kind:'cave',name:'洞口',description:'通往地下'};
    F.quickGather(s);const caveBefore=Object.entries(E.cell(s).resources.nodes).filter(([,n])=>n.zone==='cave').map(([id,n])=>[id,n.remaining]);
    if(kind==='cave')for(const[id,n]of caveBefore)assert.equal(n,initialResources(s,E.cell(s)).nodes[id].total);
    F.enterField(s,F.demoField(s));fullyReveal(s);const portal=E.localMap(s).portals[0];walkTo(s,portal.x,portal.y);const parent=E.clone(s.player.local);
    if(kind==='cave')F.enterField(s,F.demoField(s,'cave'),'cave');else E.enter(s,demoPlan('small'));
    E.validateSave(s);E.validateSave(JSON.parse(JSON.stringify(s)));E.leave(s);assert.deepEqual(s.player.local,parent);E.validateSave(s);
  }
});
test('save validation rejects minted resources, missing nodes and forged parents',()=>{
  const s=game();F.enterField(s,F.demoField(s));let bad=E.clone(s);Object.values(E.cell(bad).resources.nodes)[0].remaining=999;assert.throws(()=>E.validateSave(bad),/资源/);
  bad=E.clone(s);delete E.localMap(bad).containers[Object.keys(E.localMap(bad).containers)[0]];assert.throws(()=>E.validateSave(bad),/资源点/);
  bad=E.clone(s);bad.player.x++;assert.throws(()=>E.validateSave(bad),/所属地块/);
  bad=E.clone(s);bad.player.local.parent={site:'missing',x:1,y:1};assert.throws(()=>E.validateSave(bad),/返回地块/);
});
test('capacity failure does not deduct resources or time, crafting conserves materials',()=>{
  const s=game();F.ensureResources(s);s.bag={wood:20};const before=JSON.stringify(s);assert.throws(()=>F.quickGather(s),/空间/);assert.equal(JSON.stringify(s),before);
  s.bag={fiber:3};F.weave(s);assert.deepEqual(s.bag,{fiber:0,cloth:1});assert.throws(()=>F.weave(s),/3/);
});
test('hidden resource quantities stay out of chat and visible depleted nodes stay explicit',()=>{
  const s=game();F.ensureResources(s);assert.deepEqual(JSON.parse(E.knownContext(s)).visibleResources,[]);F.enterField(s,F.demoField(s));const m=E.localMap(s);m.seen={};assert.deepEqual(JSON.parse(E.knownContext(s)).visibleResources,[]);
  const o=Object.values(m.containers)[0];s.player.local.x=o.x;s.player.local.y=o.y+1;m.seen[E.key(o.x,o.y)]=true;E.cell(s).resources.nodes[o.resourceId].remaining=0;const known=JSON.parse(E.knownContext(s));assert.equal(known.visibleResources.length,1);assert.equal(known.visibleResources[0].remaining,0);assert.deepEqual(known.visibleObjects,[]);
});
test('chat discovery retains a clue without invalidating an already generated parcel',()=>{
  const s=game();F.enterField(s,F.demoField(s));const before=JSON.stringify(s.locals);
  applyEvents(s,[{kind:'discovery',title:'旧屋',detail:'这里发现旧屋',quote:'这里发现旧屋',x:4,y:4}],{id:'field-discovery',fingerprint:'one',target:{text:'这里发现旧屋',isUser:true},name:'玩家'});
  assert.ok(s.clues.at(-1).conflict);assert.equal(JSON.stringify(s.locals),before);E.validateSave(s);
});
