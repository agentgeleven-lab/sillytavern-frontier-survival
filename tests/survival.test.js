import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {survivalAction as act} from '../src/survival.js';
import {prepareFood,gainFood,consumeFood,freshQty,foodBatches,FOOD_LIFE,settleFood} from '../src/provisions.js';
import {inflictWound,injuryState} from '../src/injury-data.js';
import {sleep,sleepPreview} from '../src/sleep.js';
import {equipmentAction} from '../src/equipment.js';
import {craftMinutes} from '../src/shelter-data.js';
import {regionData} from '../src/world.js';
import {foodPanel,injuryPanel,facilityPanel} from '../src/survival-view.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function game(){const s=E.newGame(E.demoWorld(),{mode:'demo',seed:'food-test'});s.bag={water:2,food:2,tool:1};s.stats.food=s.stats.water=100;return s;}
function camp(){const s=game();E.cell(s).camp={level:1,storage:{}};return s;}
test('food batches age independently and eating consumes earliest usable portion',()=>{
 const s=game();s.bag={};gainFood(s,s.bag,'cookedmeat',1,60);gainFood(s,s.bag,'cookedmeat',1,300);E.tick(s,70,0);assert.equal(freshQty(s,'cookedmeat'),1);E.useItem(s,'cookedmeat');assert.equal(s.bag.cookedmeat,1);const before=E.clone(s);assert.throws(()=>E.useItem(s,'cookedmeat'),/新鲜/);assert.deepEqual(s,before);assert(foodPanel(s).includes('腐败 1'));act(s,'discardFood','bag');assert.equal(s.bag.cookedmeat,0);E.validateSave(s);
});
test('camp transfer retains freshness and cellar applies only while food is stored',()=>{
 const s=camp(),c=E.cell(s).camp;c.facilities={cellar:true};gainFood(s,s.bag,'rawmeat',1,600);E.campTransfer(s,'rawmeat',true);E.tick(s,120,0);close(foodBatches(s,c.storage).find(b=>b.id==='rawmeat').life,570);E.campTransfer(s,'rawmeat',false);E.tick(s,60,0);close(foodBatches(s).find(b=>b.id==='rawmeat').life,510);E.campTransfer(s,'rawmeat',true);E.campTransfer(s,'rawmeat',false);close(foodBatches(s).find(b=>b.id==='rawmeat').life,510);E.validateSave(s);
});
test('stored food ages through region unload/reload without a freshness reset',()=>{
 const s=camp();gainFood(s,E.cell(s).camp.storage,'rawmeat',1,500);prepareFood(s);const saved=regionData(s);s.world=E.validateWorld(E.demoWorld('elsewhere'));s.locals={};E.tick(s,200,0);s.world=saved.world;s.locals=saved.locals;close(foodBatches(s,E.cell(s).camp.storage).find(b=>b.id==='rawmeat').life,300);E.validateSave(s);
});
test('legacy food starts once and remote legacy stores use the same migration clock',()=>{
 const s=camp();E.cell(s).camp.storage.rawmeat=1;prepareFood(s);const epoch=s.foodSince;delete E.cell(s).camp.provisions;E.tick(s,200,0);prepareFood(s);assert.equal(s.foodSince,epoch);close(foodBatches(s,E.cell(s).camp.storage)[0].life,520);const read=E.validateSave(E.clone(s));prepareFood(read);assert.deepEqual(foodBatches(read),foodBatches(s));
});
test('cellar construction does not retroactively preserve elapsed food life',()=>{
 const s=camp(),c=E.cell(s).camp;gainFood(s,c.storage,'rawmeat',1,600);s.bag.wood=4;s.bag.stone=6;act(s,'buildFacility','cellar');close(foodBatches(s,c.storage)[0].life,480);E.tick(s,120,0);close(foodBatches(s,c.storage)[0].life,450);assert(c.facilities.cellar);const before=E.clone(s);assert.throws(()=>act(s,'buildFacility','cellar'),/已经/);assert.deepEqual(s,before);E.validateSave(s);
});
test('facility failures do not debit resources; death during construction does not finish a facility',()=>{
 const s=camp();s.bag.wood=8;s.bag.scrap=2;const before=E.clone(s);assert.throws(()=>act(s,'buildFacility','smoker'),/灶台/);assert.deepEqual(s,before);s.stats.health=.1;s.stats.water=0;act(s,'buildFacility','bench');assert(s.ended);assert(!E.cell(s).camp.facilities?.bench);
});
test('stove and smoker debit fuel, produce finite food and preserve input quality',()=>{
 const s=camp();E.cell(s).camp.facilities={stove:true,smoker:true};s.bag.wood=5;gainFood(s,s.bag,'rawmeat',1,600);const t=s.time;act(s,'smokeMeat');assert.equal(s.time,t+120);assert.equal(s.bag.wood,3);assert.equal(s.bag.rawmeat,0);assert.equal(s.bag.smokedmeat,1);close(foodBatches(s).find(b=>b.id==='smokedmeat').life,10080*480/720);E.useItem(s,'smokedmeat');assert.equal(s.bag.smokedmeat,0);gainFood(s,s.bag,'rawmeat',1,200);act(s,'campCook');assert.equal(s.bag.wood,2);assert.equal(s.bag.cookedmeat,1);E.validateSave(s);
});
test('spoiled and almost spoiled meat cannot be made fresh by cooking',()=>{
 const s=camp();E.cell(s).camp.facilities={stove:true,smoker:true};s.bag.wood=4;gainFood(s,s.bag,'rawmeat',1,100);const before=E.clone(s);assert.throws(()=>act(s,'smokeMeat'),/新鲜/);assert.deepEqual(s,before);E.tick(s,100,0);const rotten=E.clone(s);assert.throws(()=>act(s,'campCook'),/新鲜/);assert.deepEqual(s,rotten);assert.throws(()=>E.useItem(s,'rawmeat'),/可用/);
});
test('workbench affects actual crafting time only in the regional camp',()=>{
 const s=camp();E.cell(s).camp.facilities={bench:true};s.bag.wood=2;s.bag.fiber=3;const t=s.time;assert.equal(craftMinutes(s,30),23);equipmentAction(s,'craftGear','bow');assert.equal(s.time,t+23);assert.equal(s.bag.bow,1);E.enter(s,E.demoLocal());assert.equal(craftMinutes(s,30),30);assert.throws(()=>act(s,'campCook'),/营地/);E.validateSave(s);
});
test('bed improves actual sleep and wound recovery and preview remains read only',()=>{
 const s=camp();E.cell(s).camp.facilities={bed:true};s.stats.stamina=10;s.stats.spirit=20;s.injuries={trauma:40,bleeding:0,infection:0,exposure:0};const before=E.clone(s),p=sleepPreview(s,'2h');assert.deepEqual(s,before);sleep(s,'2h');close(s.stats.stamina,82);close(s.stats.spirit,36);close(s.injuries.trauma,32);close(p.after.health,s.stats.health);E.validateSave(s);
});
test('untreated bleeding progresses to infection, bandaging stops bleeding but retains infection',()=>{
 const s=game();s.bag.cloth=1;inflictWound(s,6);assert.equal(s.injuries.bleeding,2);E.tick(s,360,0);assert.equal(s.injuries.infection,1);assert(s.stats.health<100);act(s,'bandage');assert.equal(s.injuries.bleeding,0);assert.equal(s.injuries.infection,1);assert.equal(s.bag.cloth,0);assert.equal(s.injuries.exposure,0);E.validateSave(s);
});
test('medical treatment costs one medicine, clears infection, reduces trauma and cannot resurrect',()=>{
 const s=game();s.bag.medicine=2;s.injuries={trauma:50,bleeding:2,infection:2,exposure:0};const old=E.clone(s);assert.throws(()=>E.useItem(s,'medicine'),/伤势/);assert.deepEqual(s,old);act(s,'treatInfection');assert.equal(s.bag.medicine,1);assert.deepEqual(s.injuries,{trauma:30,bleeding:0,infection:0,exposure:0});s.stats.health=.001;inflictWound(s,6);act(s,'treatInfection');assert(s.ended);assert.equal(s.stats.health,0);assert(s.injuries.bleeding>0);assert.equal(s.bag.medicine,0);
});
test('injury movement estimate equals settlement and sleep bleeding can be fatal',()=>{
 const s=game();s.injuries={trauma:40,bleeding:0,infection:0,exposure:0};const path=E.regionPath(s,4,3),minutes=E.routeMinutes(s,path),t=s.time;assert.equal(minutes,7);E.move(s,4,3);assert.equal(s.time-t,minutes);s.injuries.bleeding=3;s.stats.health=.04;const p=sleepPreview(s,'2h');assert.equal(p.reason,'health');sleep(s,'2h');assert(s.ended);assert.equal(s.stats.health,0);
});
test('bad food batches, missing quantities, forged facilities and invalid wounds are rejected',()=>{
 const s=camp();prepareFood(s);for(const mutate of [x=>x.provisions.batches[0].qty++,x=>x.provisions.batches[0].life=1e9,x=>x.provisions.time=x.time+1,x=>E.cell(x).camp.facilities={smoker:true},x=>x.injuries={trauma:1,bleeding:4,infection:0,exposure:0}]){const bad=E.clone(s);mutate(bad);assert.throws(()=>E.validateSave(bad));}assert(injuryPanel(s).includes('包扎止血'));assert(facilityPanel(s).includes('储藏地窖'));assert(JSON.parse(E.knownContext(s)).provisions.length>0);
});
test('searched container food keeps its age when taken instead of resetting at pickup',()=>{
 const s=game();E.enter(s,E.demoLocal());s.player.local.x=2;s.player.local.y=3;E.searchContainer(s,2,2,{items:[{id:'cookedmeat',qty:1}],description:'一份熟肉'});const c=E.localMap(s).containers['2,2'];E.tick(s,60,0);const life=foodBatches(s,c.items)[0].life;E.take(s,2,2,'cookedmeat');close(foodBatches(s).find(b=>b.id==='cookedmeat').life,life);assert.equal(c.items.cookedmeat,0);E.validateSave(s);
});
test('discarding no spoiled food is a no-op failure and ordinary medicine cannot revive a dead player',()=>{
 const s=game(),before=E.clone(s);assert.throws(()=>act(s,'discardFood','bag'),/没有腐败/);assert.deepEqual(s,before);s.bag.medicine=1;s.stats.health=0;s.ended=true;assert.throws(()=>E.useItem(s,'medicine'),/无法行动/);assert.equal(s.bag.medicine,1);assert.equal(s.stats.health,0);
});
