import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as F from '../src/field.js';
import {SPECIES,ensureWildlife,advanceWildlife,observeWildlife,knownWildlife,speciesPool,validateWildlife} from '../src/wildlife.js';
import {sleep,sleepPreview} from '../src/sleep.js';
function game(){const s=E.newGame(E.demoWorld(),{seed:'fauna',mode:'demo'});E.cell(s).terrain='f';s.time=1080;F.enterField(s,F.demoField(s));return s;}
function arena(){const s=game(),m=E.localMap(s);m.w=21;m.h=21;m.grid=Array.from({length:21},(_,y)=>Array.from({length:21},(_,x)=>!x||!y||x===20||y===20?'#':'.').join(''));m.containers={};m.portals=[];m.wildlife.animals=[];m.wildlife.tracks=[];m.wildlife.observations=[];s.player.local.x=18;s.player.local.y=18;return [s,m];}
function animal(m,id,species,x,y){const a={id,species,x,y,hp:SPECIES[species].hp,stamina:100,hunger:70,credit:0,state:'wander',born:1000,deadAt:null,meat:0,target:null};m.wildlife.animals.push(a);return a;}
function advance(s,n=1,awake=true){const start=s.time;s.time+=n;advanceWildlife(s,start,awake);}
test('generation is seeded, environment bound, capped and initialized once',()=>{
 const a=game(),b=game(),m=E.localMap(a);assert.deepEqual(m.wildlife,E.localMap(b).wildlife);const before=E.clone(m.wildlife);ensureWildlife(a,m);assert.deepEqual(m.wildlife,before);assert(m.wildlife.animals.length<=m.wildlife.cap);assert(m.wildlife.animals.every(x=>speciesPool(a,m).includes(x.species)));E.validateSave(a);assert.deepEqual(speciesPool(a,{kind:'cave'}),['bat']);
});
test('fractional speed accumulates and movement cannot exceed the per-minute sprint budget',()=>{
 const [s,m]=arena(),rabbit=animal(m,'rabbit','rabbit',8,8);advance(s);assert.equal(rabbit.credit,.5);advance(s);assert.equal(rabbit.credit,0);
 const wolf=animal(m,'wolf','wolf',rabbit.x-2,rabbit.y),start={...rabbit};advance(s);assert(Math.abs(start.x-rabbit.x)+Math.abs(start.y-rabbit.y)<=4);assert.equal(rabbit.state,'flee');assert(wolf.stamina<100);assert(rabbit.stamina<100);
});
test('predators catch trapped prey, consume a finite carcass and never revive the victim',()=>{
 const [s,m]=arena();m.grid[1]='#..##################';m.grid[2]='#####################';const rabbit=animal(m,'rabbit','rabbit',1,1),wolf=animal(m,'wolf','wolf',2,1);advance(s,4);assert.equal(rabbit.hp,0);assert.equal(rabbit.state,'dead');assert(rabbit.meat<3);assert.equal(m.wildlife.deaths,1);assert(wolf.hunger<70);advance(s,10);assert.equal(rabbit.hp,0);assert.equal(m.wildlife.deaths,1);
});
test('walls block detection and animals cannot move into obstacles or resource cells',()=>{
 const [s,m]=arena();for(let y=1;y<20;y++)m.grid[y]=m.grid[y].slice(0,5)+'#'+m.grid[y].slice(6);const rabbit=animal(m,'r','rabbit',4,5),wolf=animal(m,'w','wolf',6,5);advance(s);assert.notEqual(rabbit.state,'flee');assert.notEqual(wolf.state,'hunt');assert(rabbit.x<5&&wolf.x>5);m.containers['3,5']={};advance(s,10);for(const a of m.wildlife.animals)assert(m.grid[a.y][a.x]==='.'&&!m.containers[E.key(a.x,a.y)]);
});
test('visible observations are remembered without exposing hidden live positions',()=>{
 const [s,m]=arena();s.time=1200;m.wildlife.time=s.time;m.wildlife.check=Math.floor(s.time/180);s.player.local.x=10;s.player.local.y=10;const a=animal(m,'r','rabbit',11,10);observeWildlife(s);assert.equal(knownWildlife(s).visible.length,1);a.x=17;assert.equal(knownWildlife(s).visible.length,0);assert.equal(knownWildlife(s).memory[0].x,11);assert(!JSON.stringify(knownWildlife(s)).includes('"x":17'));
});
test('batched and minute-wise simulation produce the same ecology',()=>{
 const a=game(),b=E.clone(a);advance(a,40);for(let i=0;i<40;i++)advance(b);assert.deepEqual(E.localMap(a).wildlife,E.localMap(b).wildlife);assert.deepEqual(a.world.ecology,b.world.ecology);
});
test('migration and dawn stock recovery are bounded; idle reads cannot reroll arrivals',()=>{
 const s=game(),m=E.localMap(s);s.world.ecology.fauna.stock.rabbit=0;advance(s,1440,false);assert(s.world.ecology.fauna.stock.rabbit<=1);assert(m.wildlife.animals.filter(a=>a.hp>0).length<=m.wildlife.cap);const before=E.clone(m.wildlife);knownWildlife(s);advance(s,0);assert.deepEqual(m.wildlife,before);E.validateSave(s);
});
test('away catch-up is bounded and preserves unique identities through reentry',()=>{
 const s=game(),m=E.localMap(s),p=E.clone(s.player.local),serial=s.world.ecology.fauna.serial;s.player.local=null;s.time+=30*1440;s.player.local=p;advance(s);assert(s.world.ecology.fauna.serial<=serial+2);assert.equal(m.wildlife.time,s.time);assert.equal(m.wildlife.check,Math.floor(s.time/180));E.validateSave(s);
});
test('sleep preview cannot alter wildlife and actual overnight simulation validates',()=>{
 const s=game();s.stats={health:100,food:100,water:100,stamina:10};const original=E.clone(s);const preview=sleepPreview(s,'8h');assert.deepEqual(s,original);sleep(s,'8h');assert.deepEqual(s.stats,preview.after);E.validateSave(s);assert.deepEqual(E.validateSave(JSON.parse(JSON.stringify(s))).locals,s.locals);
});
test('save rejects forged positions, duplicate identities and invalid stocks',()=>{
 const s=game(),m=E.localMap(s);const a=m.wildlife.animals[0],old=a.x;a.x=0;assert.throws(()=>validateWildlife(s),/生物/);a.x=old;const c=E.clone(a);m.wildlife.animals.push(c);assert.throws(()=>validateWildlife(s),/生物/);m.wildlife.animals.pop();s.world.ecology.fauna.stock.wolf=999;assert.throws(()=>validateWildlife(s),/生物/);
});
