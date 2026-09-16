import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as F from '../src/field.js';
import {lightingAction as act} from '../src/lighting.js';
import {fireRemaining,lightWarning} from '../src/lighting-data.js';
const game=()=>{const s=E.newGame(E.demoWorld(),{seed:'lights',mode:'demo'});s.time=1200;s.bag={wood:8,cloth:3,tool:1,scrap:4,fuel:1};return s;};
function field(s){F.enterField(s,F.demoField(s));const m=E.localMap(s);s.player.local.x=Math.floor(m.w/2);s.player.local.y=m.h-5;E.revealLocal(s);return m;}
test('torch crafting, pausing and exact expiry conserve items and burn only game minutes',()=>{
 const s=game();act(s,'craftLight','torch');assert.equal(s.time,1205);assert.equal(s.bag.wood,7);assert.equal(s.bag.cloth,2);assert.equal(s.bag.torch,1);
 act(s,'lightOn','torch');assert.equal(s.lighting.torch,90);E.knownContext(s);E.refreshSight(s);assert.equal(s.lighting.torch,90);E.tick(s,30);assert.equal(s.lighting.torch,60);act(s,'lightOff');E.tick(s,100);assert.equal(s.lighting.torch,60);act(s,'lightOn','torch');E.tick(s,60);assert.equal(s.bag.torch,0);assert.equal(s.lighting.active,null);assert.equal(s.lighting.torch,0);E.validateSave(s);
});
test('torch extends night and cave sight but never sees through a wall or closed door',()=>{
 const s=game(),m=field(s);s.bag.torch=1;const p=s.player.local,x=p.x,y=p.y-3;assert.equal(E.canSee(s,x,y),false);act(s,'lightOn','torch');assert(E.canSee(s,x,y));
 m.kind='cave';assert(E.canSee(s,x,y));m.grid[p.y-1]=m.grid[p.y-1].slice(0,x)+'+'+m.grid[p.y-1].slice(x+1);m.doors[E.key(x,p.y-1)]=false;assert.equal(E.canSee(s,x,y),false);m.doors[E.key(x,p.y-1)]=true;assert(E.canSee(s,x,y));E.tick(s,90);assert.equal(E.canSee(s,x,y),false);
});
test('flashlight direction, charge and switching do not mint fuel',()=>{
 const s=game();field(s);s.bag.flashlight=1;s.bag.battery=2;assert.throws(()=>act(s,'lightOn','flashlight'),/无电/);act(s,'reloadLight');assert.equal(s.bag.battery,1);assert.throws(()=>act(s,'reloadLight'));act(s,'lightOn','flashlight');const p=s.player.local;assert(E.canSee(s,p.x,p.y-3));act(s,'faceLight','south');assert.equal(E.canSee(s,p.x,p.y-3),false);assert.equal(s.lighting.flashlight,240);E.tick(s,239);assert.match(lightWarning(s,2),/抵达前/);assert.match(lightWarning(s,1),/抵达时/);act(s,'lightOff');E.tick(s,5);assert.equal(s.lighting.flashlight,1);act(s,'lightOn','flashlight');E.tick(s,1);assert.equal(s.bag.flashlight,1);assert.equal(s.lighting.active,null);act(s,'reloadLight');assert.equal(s.bag.battery,0);E.validateSave(s);
});
test('loaded devices cannot be deposited and reclaimed to duplicate charge',()=>{
 const s=game();E.cell(s).camp={level:1,storage:{}};s.bag.torch=1;act(s,'lightOn','torch');act(s,'lightOff');assert.throws(()=>E.campTransfer(s,'torch',true),/燃料/);s.bag.torch++;E.campTransfer(s,'torch',true);assert.equal(s.bag.torch,1);E.validateSave(s);
});
test('campfire persists, burns while away, pauses when extinguished and refuels without automatic relight',()=>{
 const s=game(),m=field(s),before=s.time;act(s,'fireBuild');assert.equal(s.time,before+10);assert.equal(fireRemaining(s,m.fire),120);assert(E.canSee(s,s.player.local.x,s.player.local.y-3));assert.throws(()=>act(s,'fireBuild'));
 E.tick(s,20);act(s,'fireToggle');assert.equal(fireRemaining(s,m.fire),100);E.tick(s,10);assert.equal(fireRemaining(s,m.fire),100);act(s,'fireToggle');s.player.local=null;E.tick(s,101);assert.equal(fireRemaining(s,m.fire),0);F.enterField(s,null);s.player.local.x=m.fire.x;s.player.local.y=m.fire.y;act(s,'fireFeed');assert.equal(m.fire.lit,false);assert.equal(fireRemaining(s,m.fire),60);act(s,'fireToggle');assert.equal(m.fire.lit,true);E.validateSave(s);assert.equal(fireRemaining(JSON.parse(JSON.stringify(s)),m.fire),60);
});
test('bad lighting imports fail closed and old saves need no new items or schema migration',()=>{
 const s=game();E.validateSave(s);assert.equal(s.lighting,undefined);s.lighting={active:'torch',torch:999,flashlight:0,facing:'north'};assert.throws(()=>E.validateSave(s),/剩余/);s.lighting.torch=30;assert.throws(()=>E.validateSave(s),/背包/);s.bag.torch=1;E.validateSave(s);s.lighting.facing='invalid';assert.throws(()=>E.validateSave(s),/方向/);
});
test('flashlight and battery recipes debit materials and campfires cannot be built indoors',()=>{
 const s=game();act(s,'craftLight','flashlight');act(s,'craftLight','battery');assert.equal(s.bag.tool,0);assert.equal(s.bag.scrap,1);assert.equal(s.bag.fuel,0);assert.equal(s.time,1230);E.enter(s,E.demoLocal());assert.throws(()=>act(s,'fireBuild'),/露天/);E.validateSave(s);
});
