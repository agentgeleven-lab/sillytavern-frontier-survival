import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as F from '../src/field.js';
import {huntingAction as act,cookingReady} from '../src/hunting.js';
import {killAnimal,knownWildlife} from '../src/wildlife.js';
import {randomAt} from '../src/environment.js';
import {lightingAction} from '../src/lighting.js';
import {fireRemaining} from '../src/lighting-data.js';
import {wildlifeActions} from '../src/wildlife-view.js';
function game(species='rabbit',hp=2){const s=E.newGame(E.demoWorld(),{seed:'fauna',mode:'demo'});E.cell(s).terrain='f';s.time=600;s.stats={health:100,food:90,water:90,stamina:100};F.enterField(s,F.demoField(s));const m=E.localMap(s),a=m.wildlife.animals[0];Object.assign(a,{species,hp,x:5,y:5});m.wildlife.animals=[a];s.player.local.x=5;s.player.local.y=6;E.refreshSight(s);s.stats.stamina=100;return {s,m,a};}
function corpse(){const g=game();killAnimal(g.m,g.a,g.s.time);return g;}
test('tool melee creates one finite corpse and full harvest/cook/hide loop conserves materials',()=>{
 const {s,m,a}=game(),start=s.time;act(s,'attackAnimal',a.id);assert.equal(a.hp,0);assert.equal(a.meat,1);assert.equal(a.hide,1);assert.equal(m.wildlife.deaths,1);assert.equal(s.time,start+1);assert.equal(s.stats.stamina,94);assert.throws(()=>act(s,'butcherAnimal',a.id),/检查/);act(s,'inspectAnimal',a.id);act(s,'butcherAnimal',a.id);assert.equal(s.bag.rawmeat,1);assert.equal(a.meat,0);assert.throws(()=>act(s,'butcherAnimal',a.id),/耗尽/);act(s,'skinAnimal',a.id);assert.equal(s.bag.hide,1);assert.equal(a.hide,0);assert.throws(()=>act(s,'skinAnimal',a.id),/耗尽/);
 const cloth=s.bag.cloth;act(s,'processHide');assert.equal(s.bag.cloth,cloth+1);assert.equal(s.bag.hide,0);lightingAction(s,'fireBuild');const fuel=fireRemaining(s,m.fire);act(s,'cookMeat');assert.equal(s.bag.rawmeat,0);assert.equal(s.bag.cookedmeat,1);assert.equal(fireRemaining(s,m.fire),fuel-10);E.useItem(s,'cookedmeat');assert.equal(s.bag.cookedmeat,0);assert.equal(s.stats.food,100);assert.equal(s.bag.tool,1);E.validateSave(s);
});
test('surviving animal can retaliate and lethal retaliation ends play without resurrection',()=>{
 for(const health of [100,1]){const {s,a}=game('boar',8);s.stats.health=health;while(randomAt(`${s.seed}:${a.id}:attackAnimal`,s.time,s.revision)>=.5)s.revision++;act(s,'attackAnimal',a.id);assert.equal(a.hp,5);assert.equal(s.stats.health,Math.max(0,health-8));assert.equal(s.ended,health===1);assert(a.fear);E.validateSave(s);if(s.ended)assert.throws(()=>act(s,'attackAnimal',a.id),/无法行动/);}
});
test('scaring validates distance and stamina, success persists a bounded flee impulse',()=>{
 const {s,a}=game();while(randomAt(`${s.seed}:${a.id}:scareAnimal`,s.time,s.revision)>=.95)s.revision++;act(s,'scareAnimal',a.id);assert.equal(s.stats.stamina,97);assert(a.fear.until>=s.time);assert.equal(a.state,'flee');E.validateSave(s);const snapshot=E.clone(s);s.stats.stamina=0;assert.throws(()=>act(s,'scareAnimal',a.id),/体力/);s.stats.stamina=snapshot.stats.stamina;assert.deepEqual(s,snapshot);
});
test('target ID, visibility and range are checked before consuming any resources',()=>{
 const {s,a}=game(),before=E.clone(s);assert.throws(()=>act(s,'attackAnimal','missing'),/视野/);assert.deepEqual(s,before);a.x=9;a.y=9;const far=E.clone(s);assert.throws(()=>act(s,'attackAnimal',a.id));assert.deepEqual(s,far);s.bag.rawmeat=1;assert.throws(()=>E.useItem(s,'rawmeat'),/可用/);
});
test('butchery rejects full bags, no tools, exhausted resources and impending decay atomically',()=>{
 const {s,a}=corpse();act(s,'inspectAnimal',a.id);s.bag={wood:20,tool:1};let before=E.clone(s);assert.throws(()=>act(s,'butcherAnimal',a.id),/空间/);assert.deepEqual(s,before);s.bag={};before=E.clone(s);assert.throws(()=>act(s,'skinAnimal',a.id),/工具/);assert.deepEqual(s,before);s.bag={tool:1};s.time=a.deadAt+716;before=E.clone(s);assert.throws(()=>act(s,'butcherAnimal',a.id),/腐败/);assert.deepEqual(s,before);
});
test('predators and players debit the same meat, while hide remains independent',()=>{
 const {s,m,a}=corpse();a.meat=2;a.examinedAt=s.time;const wolf={...E.clone(a),id:`0,0:${++s.world.ecology.fauna.serial}`,species:'wolf',hp:7,x:5,y:4,state:'wander',meat:0,hide:0,deadAt:null,hunger:35};m.wildlife.animals.push(wolf);s.player.local.y=6;E.tick(s,1,0,false);assert.equal(a.meat,1);act(s,'butcherAnimal',a.id);assert.equal(s.bag.rawmeat,1);assert.equal(a.meat,0);assert.equal(a.hide,1);assert(wolf.hunger<35);E.validateSave(s);
});
test('old corpses retain meat but cannot mint hide; clear removes remaining resources',()=>{
 const {s,m,a}=corpse();delete a.hide;a.meat=2;E.validateSave(s);act(s,'inspectAnimal',a.id);assert.throws(()=>act(s,'skinAnimal',a.id),/耗尽/);const before=E.clone(s.bag),time=s.time;act(s,'clearAnimal',a.id);assert.equal(s.time,time+3);assert(!m.wildlife.animals.some(b=>b.id===a.id));assert.deepEqual(s.bag,before);assert.throws(()=>act(s,'clearAnimal',a.id),/视野/);E.validateSave(s);
});
test('cooking requires proximity and ten minutes of fuel; processing only uses owned materials',()=>{
 const {s,m}=game();s.bag.rawmeat=1;assert.equal(cookingReady(s),false);const before=E.clone(s);assert.throws(()=>act(s,'cookMeat'),/营火/);assert.deepEqual(s,before);lightingAction(s,'fireBuild');m.fire.remaining=9;assert.throws(()=>act(s,'cookMeat'),/燃料/);m.fire.remaining=10;act(s,'cookMeat');assert.equal(fireRemaining(s,m.fire),0);assert.equal(s.bag.cookedmeat,1);assert.throws(()=>act(s,'processHide'),/皮料/);
});
test('inspection, corpse portions and fear survive serialization; hidden state is not exposed',()=>{
 const {s,a}=corpse();act(s,'inspectAnimal',a.id);act(s,'butcherAnimal',a.id);const read=E.validateSave(JSON.parse(JSON.stringify(s)));assert.equal(E.localMap(read).wildlife.animals[0].meat,0);assert.equal(E.localMap(read).wildlife.animals[0].hide,1);assert.equal(knownWildlife(read).visible[0].hide,1);assert.match(wildlifeActions(read,a.id),/剥取/);E.localMap(read).wildlife.animals[0].hide=99;assert.throws(()=>E.validateSave(read),/生物/);
});
