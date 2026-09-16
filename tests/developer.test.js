import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {developerAction as act} from '../src/developer.js';
import {DEV_STATS,devValue,applyDevLocks} from '../src/developer-data.js';
import {freshQty,foodBatches,gainFood} from '../src/provisions.js';
import {sleep,sleepPreview} from '../src/sleep.js';
import {GameStore} from '../src/store.js';
import {inflictWound} from '../src/injury-data.js';
import {developerPanel} from '../src/developer-view.js';
const game=()=>E.newGame(E.demoWorld(),{mode:'demo'});
const values=s=>Object.fromEntries(Object.keys(DEV_STATS).map(id=>[id,devValue(s,id)]));
test('developer tools default off and grants validate before mutation',()=>{
 const s=game(),before=E.clone(s);assert.throws(()=>act(s,'devGrant',{item:'wood',qty:1}),/开启/);assert.deepEqual(s,before);act(s,'devToggle');const on=E.clone(s);for(const p of [{item:'bad',qty:1},{item:'wood',qty:-1},{item:'wood',qty:1.5},{item:'wood',qty:10001}])assert.throws(()=>act(s,'devGrant',p));assert.deepEqual(s,on);act(s,'devGrant',{item:'wood',qty:100});assert(s.bag.wood>100);assert(E.weight(s.bag)>20);E.validateSave(s);
});
test('food grants create separate fresh lots without renewing old food',()=>{
 const s=game();gainFood(s,s.bag,'rawmeat',1,1);E.tick(s,2,0);act(s,'devToggle');act(s,'devGrant',{item:'rawmeat',qty:3});assert.equal(freshQty(s,'rawmeat'),3);assert.equal(s.bag.rawmeat,4);assert(foodBatches(s).some(b=>b.id==='rawmeat'&&b.life===0));E.validateSave(s);
});
test('frozen time stops food, light and injury clocks, rejects sleep without mutation',()=>{
 const s=game();act(s,'devToggle');act(s,'devStats',{...values(s),timeLocked:true});s.bag.torch=1;s.lighting={active:'torch',torch:60,flashlight:0,facing:'north'};gainFood(s,s.bag,'rawmeat',1);inflictWound(s,6);const before=E.clone(s);E.tick(s,60);assert.deepEqual(s,before);assert.equal(E.routeMinutes(s,E.regionPath(s,4,3)),0);E.move(s,4,3);assert.equal(s.time,before.time);assert.equal(s.player.y,3);const after=E.clone(s);assert.throws(()=>sleep(s,'2h'),/冻结/);assert.deepEqual(s,after);assert(sleepPreview(s).error.includes('冻结'));E.validateSave(s);
});
test('locked needs and health survive time, starvation and bleeding, while unlocked values change',()=>{
 const s=game();act(s,'devToggle');act(s,'devStats',{...values(s),health:1,water:0,food:0,stamina:55,lock_health:true,lock_stamina:true,lock_water:true});inflictWound(s,8);E.tick(s,600);assert.equal(s.stats.health,1);assert.equal(s.stats.stamina,55);assert.equal(s.stats.water,0);assert.equal(s.ended,false);assert(s.injuries.infection>0);E.validateSave(s);
});
test('injury locks prevent new wounds and sleep preserves locked recovery targets',()=>{
 const s=game();act(s,'devToggle');act(s,'devStats',{...values(s),stamina:50,spirit:60,lock_stamina:true,lock_spirit:true,lock_trauma:true,lock_bleeding:true,lock_infection:true});inflictWound(s,8);assert.equal(s.injuries.trauma,0);assert.equal(s.injuries.bleeding,0);const p=sleepPreview(s,'2h');sleep(s,'2h');assert.equal(s.stats.stamina,50);assert.equal(s.stats.spirit,60);assert.equal(p.after.stamina,50);E.validateSave(s);
});
test('developer recovery revives player and updates locked targets; disabling releases locks',()=>{
 const s=game();act(s,'devToggle');act(s,'devStats',{...values(s),health:0,lock_health:true,timeLocked:true});assert(s.ended);act(s,'devRestore');assert(!s.ended);assert.equal(s.developer.locks.health,100);act(s,'devToggle');assert.deepEqual(s.developer,{enabled:false,timeLocked:false,locks:{}});const t=s.time;E.tick(s,60);assert.equal(s.time,t+60);assert(s.stats.food<100);
});
test('invalid stat forms and forged locks fail closed; mode is saved with each game',()=>{
 const s=game();act(s,'devToggle');const before=E.clone(s);assert.throws(()=>act(s,'devStats',{...values(s),health:NaN}));assert.throws(()=>act(s,'devStats',{...values(s),bleeding:.2}));assert.deepEqual(s,before);s.developer.locks.bad=3;assert.throws(()=>E.validateSave(s),/开发者/);delete s.developer.locks.bad;assert(developerPanel(s).includes('添加到背包'));assert(!game().developer);E.validateSave(E.clone(s));
});
test('transaction locks restore direct item usage changes and failed writes leave state unchanged',async()=>{
 const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)},store=new GameStore(storage,'dev');store.switch('a');await store.run(()=>game(),{create:true});await store.run(s=>{act(s,'devToggle');act(s,'devStats',{...values(s),food:40,lock_food:true});});await store.run(s=>{E.useItem(s,'food');});assert.equal(store.state.stats.food,40);const before=E.clone(store.state);storage.setItem=()=>{throw Error('disk');};await assert.rejects(store.run(s=>{act(s,'devGrant',{item:'wood',qty:10});}),/disk/);assert.deepEqual(store.state,before);store.switch('b');assert.equal(store.state,null);
});

test('frozen cooking consumes ingredients without aging nearly spoiled food',async()=>{
 const {survivalAction}=await import('../src/survival.js');const s=game();s.bag={wood:3};E.cell(s).camp={level:1,storage:{},facilities:{stove:true,smoker:true}};gainFood(s,s.bag,'rawmeat',2,1);act(s,'devToggle');act(s,'devStats',{...values(s),timeLocked:true});const t=s.time;survivalAction(s,'smokeMeat');survivalAction(s,'campCook');assert.equal(s.time,t);assert.equal(s.bag.wood,0);assert.equal(s.bag.rawmeat,0);assert.equal(foodBatches(s).find(b=>b.id==='smokedmeat').life,14);assert.equal(foodBatches(s).find(b=>b.id==='cookedmeat').life,2);E.validateSave(s);
});

test('frozen exploration initializes wildlife once without advancing animal simulation',async()=>{
 const F=await import('../src/field.js');const s=game();E.cell(s).terrain='f';act(s,'devToggle');act(s,'devStats',{...values(s),timeLocked:true});const t=s.time;F.enterField(s,F.demoField(s));const m=E.localMap(s);assert(m.wildlife);const before=E.clone(m.wildlife);E.tick(s,180);assert.equal(s.time,t);assert.deepEqual(m.wildlife,before);E.validateSave(s);
});
