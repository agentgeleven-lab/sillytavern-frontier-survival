import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as F from '../src/field.js';
import {sleep,sleepPreview} from '../src/sleep.js';
import {sleepMinutes,sleepPlace,SLEEP_PLACES} from '../src/sleep-data.js';
import {sleepPanel} from '../src/sleep-view.js';
import {lightingAction} from '../src/lighting.js';
import {fireRemaining} from '../src/lighting-data.js';
const game=()=>{const s=E.newGame(E.demoWorld(),{mode:'demo',seed:'sleep'});s.time=1260;s.stats={health:70,food:80,water:80,stamina:10};return s;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('sleep to dawn uses next 05:00, crosses midnight and caps long daytime waits',()=>{
 const s=game();assert.equal(sleepMinutes(s,'dawn'),480);const r=sleep(s,'dawn');assert.equal(r.end,1740);assert.match(E.formatTime(s.time),/第 2 天 · 清晨 · 05:00/);close(s.stats.food,68);close(s.stats.water,58.4);assert.equal(sleepMinutes(s,'dawn'),1440);assert.throws(()=>sleep(s,'dawn'),/12 小时/);s.time=1440+299;assert.equal(sleepMinutes(s,'dawn'),1);sleep(s,'dawn');assert.equal(s.time,1740);
});
test('preview is read only and matches exact settlement, including rainy outdoor minutes',()=>{
 const s=game(),original=E.clone(s),p=sleepPreview(s,'8h',false);assert.deepEqual(s,original);const r=sleep(s,'8h',false);assert.deepEqual(r.after,p.after);assert.equal(r.end,p.end);assert.equal(r.rainMinutes,p.rainMinutes);assert.equal(s.lastSleep.reason,'complete');assert.equal(s.stats.health,70);E.validateSave(s);
});
test('low food or water wakes player early without automatic supplies or starvation damage',()=>{
 for(const stat of ['food','water']){const s=game();s.stats[stat]=6;const bag=E.clone(s.bag),p=sleepPreview(s,'8h');assert.equal(p.reason,'needs');assert(p.end-p.start<480);sleep(s,'8h');assert.equal(s.lastSleep.reason,'needs');assert(s.stats[stat]<=5&&s.stats[stat]>4.9);assert.equal(s.stats.health,70);assert.deepEqual(s.bag,bag);assert.equal(s.time,p.end);const before=E.clone(s);assert.throws(()=>sleep(s,'2h'),/先补给/);assert.deepEqual(s,before);}
});
test('shelter, indoor, cave and entrance rules use actual location instead of map selection',()=>{
 const s=game();assert.equal(sleepPlace(s),'outdoor');E.cell(s).camp={level:1,storage:{}};assert.equal(sleepPlace(s),'shelter');E.cell(s).camp.level=2;assert.equal(sleepPlace(s),'fortified');E.enter(s,E.demoLocal());assert.equal(sleepPlace(s),'outdoor');s.player.local.y--;assert.equal(sleepPlace(s),'building');const m=E.localMap(s);m.kind='cave';assert.equal(sleepPlace(s),'cave');m.kind='field';assert.equal(sleepPlace(s),'outdoor');
});
test('sheltered recovery obeys hourly rates, needs threshold and stat caps',()=>{
 const s=game();E.cell(s).camp={level:1,storage:{}};sleep(s,'2h');close(s.stats.stamina,70);close(s.stats.health,78);const t=game();E.cell(t).camp={level:2,storage:{}};sleep(t,'8h');assert.equal(t.stats.stamina,100);assert.equal(t.stats.health,100);const low=game();E.cell(low).camp={level:2,storage:{}};low.stats.food=20;sleep(low,'2h');assert.equal(low.stats.health,70);
});
test('sleep closes handheld lights by default while leaving campfires burning',()=>{
 const s=game();s.seed='lights';F.enterField(s,F.demoField(s));const map=E.localMap(s);s.player.local.x=Math.floor(map.w/2);s.player.local.y=map.h-5;s.bag.wood=4;s.bag.torch=1;lightingAction(s,'fireBuild');lightingAction(s,'lightOn','torch');const p=sleepPreview(s,'2h');assert(p.warnings.some(w=>w.includes('营火')));sleep(s,'2h');assert.equal(s.lighting.active,null);assert.equal(s.lighting.torch,90);assert.equal(s.bag.torch,1);assert.equal(fireRemaining(s,map.fire),0);E.validateSave(s);
});
test('optional active torch burns out during sleep at its exact game minute',()=>{
 const s=game();s.bag.torch=1;lightingAction(s,'lightOn','torch');const start=s.time;assert(sleepPreview(s,'2h',false).warnings.some(w=>w.includes('火把')));sleep(s,'2h',false);assert.equal(s.bag.torch,0);assert.equal(s.lighting.active,null);assert.equal(s.log.find(e=>e.text.includes('已经燃尽')).time,start+90);
});
test('sleep does not reveal intermediate daylight; visibility refreshes only on waking',()=>{
 const s=game();s.time=600;s.stats={health:100,food:100,water:100,stamina:100};for(const c of Object.values(s.world.cells))c.known=false;sleep(s,'8h');assert.equal(s.time,1080);assert.equal(E.cell(s,6,4).known,false);assert.equal(E.cell(s,5,4).known,true);
});
test('invalid choices, dead characters and bad records are rejected; old saves remain valid',()=>{
 const s=game();E.validateSave(s);const original=E.clone(s);for(const c of ['0h','100h','unknown'])assert.throws(()=>sleep(s,c));assert.throws(()=>sleep(s,'2h','false'));assert.deepEqual(s,original);s.ended=true;assert.throws(()=>sleep(s,'2h'),/无法行动/);s.ended=false;sleep(s,'2h');const record=E.clone(s.lastSleep);s.lastSleep.end=s.time+1;assert.throws(()=>E.validateSave(s),/睡眠/);s.lastSleep=record;E.validateSave(s);const restored=JSON.parse(JSON.stringify(s));E.validateSave(restored);assert.deepEqual(restored.lastSleep,record);assert.deepEqual(JSON.parse(E.knownContext(restored)).lastSleep,record);
});
test('sleep panel offers dawn limits, blocked states, exact previews and last sleep report',()=>{
 const s=game();assert.match(sleepPanel(s),/预计醒来/);assert.equal(Object.keys(SLEEP_PLACES).length,5);s.time=480;assert.match(sleepPanel(s),/value="dawn"\s+disabled/);s.stats.water=1;assert.match(sleepPanel(s),/data-action="sleep" disabled/);s.stats.water=80;sleep(s,'2h');assert.match(sleepPanel(s),/上次睡眠/);
});
test('short rest cannot heal a character after starvation has ended the game',()=>{
 const s=game();s.stats.health=1;s.stats.water=0;E.cell(s).camp={level:2,storage:{}};E.rest(s);assert.equal(s.stats.health,0);assert.equal(s.ended,true);
});
