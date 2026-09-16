import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {phaseAt,daylightReaches} from '../src/daylight.js';
const game=()=>E.newGame(E.demoWorld(),{mode:'demo'});
function room(s,kind='field'){
 const n=15,grid=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>x===0||y===0||x===n-1||y===n-1?'#':'.').join(''));
 const map={kind,w:n,h:n,grid,doors:{},seen:{},containers:{},exit:{x:7,y:14}};s.locals.test=map;s.player.local={site:'test',x:7,y:7};return map;
}
test('phase boundaries and midnight derive from the same clock',()=>{
 for(const[t,id]of [[0,'deepNight'],[299,'deepNight'],[300,'dawn'],[480,'morning'],[720,'afternoon'],[1020,'dusk'],[1140,'night'],[1440,'deepNight']])assert.equal(phaseAt(t).id,id);
 assert.equal(phaseAt(1130).remaining,10);assert.match(E.formatTime(1440),/第 2 天 · 深夜/);
});
test('day reveals 5x5, night reveals 3x3 and never erases explored memory',()=>{
 const s=game();assert.equal(Object.values(s.world.cells).filter(c=>c.known).length,25);s.time=1140;E.refreshSight(s);assert.ok(E.cell(s,6,4).known);assert.equal(E.canSee(s,6,4),false);
 for(const c of Object.values(s.world.cells))c.known=false;E.refreshSight(s);assert.equal(Object.values(s.world.cells).filter(c=>c.known).length,9);
});
test('rest and long actions refresh visibility when time crosses a phase',()=>{
 const s=game();s.time=470;for(const c of Object.values(s.world.cells))c.known=false;E.refreshSight(s);assert.equal(Object.values(s.world.cells).filter(c=>c.known).length,9);E.tick(s,10);assert.equal(Object.values(s.world.cells).filter(c=>c.known).length,25);
 const m=room(s);s.time=1139;E.revealLocal(s);assert(E.canSee(s,10,7));E.tick(s,2);assert.equal(E.canSee(s,10,7),false);assert(m.seen['10,7']);
});
test('outdoor phase radii and underground darkness apply without obstacles',()=>{
 const s=game(),m=room(s);for(const[t,r]of [[360,4],[600,8],[800,8],[1050,4],[1200,2],[100,2]]){s.time=t;assert(E.canSee(s,7,7-r>0?7-r:1));assert.equal(E.canSee(s,10,7),r>=3);}
 m.kind='cave';s.time=720;assert(E.canSee(s,9,7));assert.equal(E.canSee(s,10,7),false);
});
test('windowless rooms remain dark; windows illuminate only unobstructed rooms',()=>{
 const s=game(),m=room(s);delete m.kind;s.time=720;assert.equal(E.canSee(s,10,7),false);m.grid[7]='='+m.grid[7].slice(1);s.player.local={site:'test',x:4,y:7};assert(daylightReaches(m,7,7));assert(E.canSee(s,7,7));
 m.grid=m.grid.map((row,y)=>y===0||y===14?row:row.slice(0,5)+(y===7?'+':'#')+row.slice(6));m.doors['5,7']=false;assert.equal(E.canSee(s,7,7),false);m.doors['5,7']=true;assert(E.canSee(s,7,7));s.time=1140;assert.equal(E.canSee(s,7,7),false);
});
test('known but out-of-sight resources and containers are not exposed as current observations',()=>{
 const s=game(),m=room(s);s.time=1200;m.containers['10,7']={name:'远处柜子',x:10,y:7,searched:true,items:{food:4}};m.seen['10,7']=true;delete m.kind;
 assert.deepEqual(JSON.parse(E.knownContext(s)).visibleObjects,[]);s.player.local.x=9;assert.equal(JSON.parse(E.knownContext(s)).visibleObjects[0].items.food,4);
 m.kind='field';m.containers['10,7']={name:'浆果',x:10,y:7,resourceId:'field-0',kind:'berries'};E.cell(s).resources={nodes:{'field-0':{remaining:2}}};s.player.local.x=7;assert.deepEqual(JSON.parse(E.knownContext(s)).visibleResources,[]);
});
