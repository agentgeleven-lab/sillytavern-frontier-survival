import test from 'node:test';import assert from 'node:assert/strict';
import {localTouch,touching,contactDistance} from '../src/interaction.js';
import * as E from '../src/engine.js';import {nearObject} from '../src/camp-data.js';
test('diagonal contact needs both corner-side cells to be clear',()=>{
 const m={grid:['.....','.....','.....','.....','.....'],doors:{},containers:{}};
 assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),true);m.grid[1]='..#..';assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),false);
 m.grid[1]='..+..';assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),false);m.doors['2,1']=true;assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),true);
 m.containers['1,2']={};assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),false);m.containers['1,2'].removed=true;assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),true);
 assert.equal(contactDistance(m,{x:1,y:1},{x:2,y:2}),1);assert.equal(contactDistance(m,{x:1,y:1},{x:4,y:3}),5);
});
test('container actions and approach routing use diagonal contact while movement stays cardinal',()=>{
 const s=E.newGame(E.demoWorld(),{mode:'demo'});E.enter(s,E.demoLocal());const m=E.localMap(s);s.player.local.x=3;s.player.local.y=3;E.refreshSight(s);
 assert.equal(E.adjacent(s,2,2),true);assert.deepEqual(E.approachPath(s,2,2),[]);const c=m.containers['2,2'];c.searched=true;c.items={wood:1};const before=s.bag.wood??0;E.take(s,2,2,'wood');assert.equal(s.bag.wood,before+1);
 const path=E.localPath(s,4,4);let prev=s.player.local;for(const next of path){assert.equal(Math.abs(prev.x-next.x)+Math.abs(prev.y-next.y),1);prev=next;}
 m.grid[2]=m.grid[2].slice(0,3)+'#'+m.grid[2].slice(4);assert.equal(E.adjacent(s,2,2),false);
});
test('camp furniture supports diagonal use and does not reach through a wall corner',()=>{
 const o={type:'box',x:3,y:3,rot:0},p={x:2,y:2},l={objects:[o]};assert.ok(nearObject(p,o,l));l.objects.push({type:'wall',x:3,y:2,rot:0});assert.equal(nearObject(p,o,l),false);assert.equal(touching(p,{x:4,y:4}),false);
});
test('a diagonal door can be reached beside its frame but not through a blocked approach',()=>{
 const m={grid:['.....','.....','##+##','.....','.....'],doors:{},containers:{}};
 assert.ok(localTouch(m,{x:1,y:1},{x:2,y:2}));m.containers['2,1']={};assert.equal(localTouch(m,{x:1,y:1},{x:2,y:2}),false);
 const door={type:'door',x:2,y:2,rot:0},l={objects:[door,{type:'wall',x:1,y:2,rot:0},{type:'wall',x:3,y:2,rot:0}]};assert.ok(nearObject({x:1,y:1},door,l));
});
