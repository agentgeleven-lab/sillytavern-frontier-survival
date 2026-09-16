import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as F from '../src/field.js';
import {equipmentAction as gear} from '../src/equipment.js';
import {weapon,bowChance} from '../src/equipment-data.js';
import {huntingAction as hunt} from '../src/hunting.js';
import {lightingAction} from '../src/lighting.js';
import {sleep,sleepPreview} from '../src/sleep.js';
import {randomAt} from '../src/environment.js';
import {killAnimal} from '../src/wildlife.js';
import {visibleDanger,inDarkness} from '../src/spirit.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function game(){const s=E.newGame(E.demoWorld(),{seed:'fauna',mode:'demo'});E.cell(s).terrain='f';s.time=600;s.stats.spirit=70;return s;}
function local(){const s=game();F.enterField(s,F.demoField(s));const m=E.localMap(s),a=m.wildlife.animals[0];Object.assign(a,{species:'boar',hp:8,x:5,y:5,hunger:0});m.wildlife.animals=[a];s.player.local.x=5;s.player.local.y=7;E.refreshSight(s);return {s,m,a};}
test('craft, equip and camp storage conserve quantities; equipped last item cannot be deposited',()=>{
 const s=game();s.bag={stone:3,fiber:5,wood:5};let t=s.time;gear(s,'craftGear','stoneknife');assert.equal(s.time,t+10);assert.equal(s.bag.stone,2);assert.equal(s.bag.stoneknife,1);assert.equal(weapon(s).id,null);gear(s,'equipWeapon','stoneknife');assert.equal(weapon(s).damage,2);E.cell(s).camp={level:1,storage:{}};const before=E.clone(s);assert.throws(()=>E.campTransfer(s,'stoneknife',true),/卸下/);assert.deepEqual(s,before);gear(s,'equipWeapon','none');E.campTransfer(s,'stoneknife',true);E.campTransfer(s,'stoneknife',false);assert.equal(s.bag.stoneknife,1);assert.equal(weapon(s).id,null);gear(s,'craftGear','arrow');assert.equal(s.bag.arrow,4);E.validateSave(s);
});
test('failed crafting and equipping do not spend resources or time, death produces no completed gear',()=>{
 const s=game(),before=E.clone(s);assert.throws(()=>gear(s,'craftGear','bow'),/缺少/);assert.throws(()=>gear(s,'equipWeapon','bow'),/没有/);assert.deepEqual(s,before);s.bag={wood:2,stone:1,fiber:3};s.stats.health=1;s.stats.water=0;gear(s,'craftGear','bow');assert(s.ended);assert(!s.bag.bow);assert.equal(s.bag.wood,0);
});
test('spear reaches two tiles without contact retaliation; unequipped weapons do not boost damage',()=>{
 const {s,a}=local();s.bag.stonespear=1;const before=E.clone(s);assert.throws(()=>hunt(s,'attackAnimal',a.id),/射程/);assert.deepEqual(s,before);gear(s,'equipWeapon','stonespear');const hp=s.stats.health;hunt(s,'attackAnimal',a.id);assert.equal(a.hp,4);assert.equal(s.stats.health,hp);E.validateSave(s);
});
test('bow hits and misses consume exactly one arrow; revision changes do not reroll',()=>{
 for(const hit of [true,false]){const {s,a}=local();s.bag.bow=1;s.bag.arrow=2;gear(s,'equipWeapon','bow');while((randomAt(`${s.seed}:${a.id}:shootAnimal`,s.time,0)<bowChance(s,2))!==hit)s.time++;const copied=E.clone(s);copied.revision+=10;hunt(s,'shootAnimal',a.id);hunt(copied,'shootAnimal',a.id);assert.equal(a.hp,hit?5:8);assert.equal(E.localMap(copied).wildlife.animals[0].hp,a.hp);assert.equal(s.bag.arrow,1);assert.equal(s.time,copied.time);E.validateSave(s);}
});
test('no ammo, wrong weapon, hidden target and excess range reject before spending',()=>{
 const {s,m,a}=local();let before=E.clone(s);assert.throws(()=>hunt(s,'shootAnimal',a.id),/装备弓/);assert.deepEqual(s,before);s.bag.bow=1;gear(s,'equipWeapon','bow');before=E.clone(s);assert.throws(()=>hunt(s,'shootAnimal',a.id),/箭矢/);assert.deepEqual(s,before);s.bag.arrow=1;m.grid[6]=m.grid[6].substring(0,5)+'#'+m.grid[6].substring(6);before=E.clone(s);assert.throws(()=>hunt(s,'shootAnimal',a.id),/视野/);assert.deepEqual(s,before);
});
test('stone knife replaces generic tool for corpse processing',()=>{
 const {s,m,a}=local();s.bag={stoneknife:1};a.x=5;a.y=6;killAnimal(m,a,s.time);hunt(s,'inspectAnimal',a.id);hunt(s,'butcherAnimal',a.id);hunt(s,'skinAnimal',a.id);hunt(s,'processHide');assert.equal(s.bag.rawmeat,1);assert.equal(s.bag.cloth,1);assert.equal(s.bag.stoneknife,1);E.validateSave(s);
});
test('stealth doubles local path time, preserves legacy weapon, and changes actual detection',()=>{
 const {s,m,a}=local();a.species='rabbit';a.hp=2;a.x=5;a.y=4;const normal=E.clone(s);gear(s,'stance','sneak');assert.equal(weapon(s).id,'tool');const path=E.localPath(s,5,8),t=s.time;assert.equal(E.routeMinutes(s,path),path.length*2);E.move(s,5,8);assert.equal(s.time-t,path.length*2);E.tick(normal,1);assert.notDeepEqual([E.localMap(normal).wildlife.animals[0].x,E.localMap(normal).wildlife.animals[0].y],[5,4]);assert.deepEqual([a.x,a.y],[5,4]);E.validateSave(s);
});
test('darkness follows daylight boundary and exact handheld expiry; sleeping suppresses darkness',()=>{
 const s=game();s.time=1130;s.stats.spirit=70;E.tick(s,30,0);close(s.stats.spirit,70-20/30);s.time=1200;s.bag.torch=1;s.lighting={active:'torch',torch:30,flashlight:0,facing:'north'};s.stats.spirit=70;E.tick(s,60,0);close(s.stats.spirit,69);assert.equal(s.bag.torch,0);const before=E.clone(s);const preview=sleepPreview(s,'2h',true);assert.deepEqual(s,before);sleep(s,'2h',true);close(s.stats.spirit,preview.after.spirit);assert(s.stats.spirit>before.stats.spirit);
});
test('sleep in a shelter restores spirit by actual duration; early wake restores only elapsed time',()=>{
 const s=game();E.cell(s).camp={level:1,storage:{}};s.stats.spirit=20;s.stats.water=90;s.stats.food=90;sleep(s,'2h');close(s.stats.spirit,32);s.stats.water=5.1;const start=s.time,spirit=s.stats.spirit;sleep(s,'8h');assert(s.time-start<10);close(s.stats.spirit,spirit+(s.time-start)*.1);
});
test('low spirit affects base movement stamina and aim, never directly ends game; old saves and bad values validate',()=>{
 const s=game();s.stats.spirit=0;const before=s.stats.stamina;E.tick(s,10);close(s.stats.stamina,before-1.125);assert(!s.ended);assert.equal(bowChance(s,2),.8);delete s.stats.spirit;E.validateSave(s);assert.equal(JSON.parse(E.knownContext(s)).status.spirit,100);s.stats.spirit=101;assert.throws(()=>E.validateSave(s),/精神/);s.stats.spirit=50;s.equipment={weapon:'bow',stance:'walk'};assert.throws(()=>E.validateSave(s),/装备/);
});
test('crafting a flashlight removes consumed equipped tool without duplicating equipment',()=>{
 const s=game();gear(s,'equipWeapon','tool');s.bag.scrap=2;lightingAction(s,'craftLight','flashlight');assert.equal(s.bag.tool,0);assert.equal(weapon(s).id,null);E.validateSave(s);
});
test('danger drains spirit only for visible close animals and sleeping remains exempt',()=>{
 const {s,m,a}=local();gear(s,'stance','sneak');assert(visibleDanger(s));const before=s.stats.spirit;E.tick(s,1,0);close(s.stats.spirit,before-2/60);m.grid[6]=m.grid[6].slice(0,5)+'#'+m.grid[6].slice(6);assert(!visibleDanger(s));const hidden=s.stats.spirit;E.tick(s,1,0);close(s.stats.spirit,hidden);
});
test('caves, windowless rooms and campfire expiry obey darkness rules',()=>{
 const {s,m}=local();m.wildlife.animals=[];m.kind='cave';assert(inDarkness(s,s.time));m.fire={x:5,y:7,lit:true,remaining:10,updatedAt:s.time};assert(!inDarkness(s,s.time));assert(inDarkness(s,s.time+10));delete m.kind;delete m.fire;m.grid=m.grid.map(row=>row.replaceAll("E","#").replaceAll("=","#"));assert(inDarkness(s,s.time));
});
test('animal retaliation also costs spirit without exposing hidden actors',()=>{
 const {s,a}=local();s.player.local.y=6;while(randomAt(`${s.seed}:${a.id}:attackAnimal`,s.time,s.revision)>=.5)s.revision++;const before=s.stats.spirit;hunt(s,'attackAnimal',a.id);assert.equal(s.stats.health,92);assert(s.stats.spirit<=before-4);
});
