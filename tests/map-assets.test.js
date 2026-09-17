import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ATLASES,SPRITES} from '../src/asset-data.js';
import {assetURL,containerSprite,resourceSprite,buildingSprite,trapSprite,fireSprite,drawSprite,spriteSVG} from '../src/assets.js';
import {wallMask,wallRects,openingAxis,validateOpenings,wallSVG} from '../src/wall-art.js';
import {demoPlan,rasterizeLayout} from '../src/layout.js';
import {FURNITURE} from '../src/camp-data.js';
import {SPECIES} from '../src/wildlife.js';
import {validateLocal} from '../src/engine.js';
import {newGame,demoWorld,cell} from '../src/engine.js';
import {campAction} from '../src/camp-game.js';
import {campInterior} from '../src/camp-map-view.js';

test('every sprite rectangle fits the actual packaged PNG, not an assumed square',()=>{
 for(const[id,a]of Object.entries(ATLASES)){const b=readFileSync(new URL(assetURL(id)));assert.equal(b.toString('ascii',1,4),'PNG');assert.equal(b.readUInt32BE(16),a.width);assert.equal(b.readUInt32BE(20),a.height);}
 for(const s of Object.values(SPRITES)){const a=ATLASES[s.atlas],[x,y,w,h]=s.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=a.width&&y+h<=a.height);}
});
test('all camp facilities, living animals and remains have art or structural renderers',()=>{
 for(const id of Object.keys(FURNITURE))assert.ok(['wall','door'].includes(id)||SPRITES[{box:'crateClosed',floor:'wood'}[id]??id],id);
 for(const id of Object.keys(SPECIES)){assert.ok(SPRITES[id]);assert.ok(SPRITES[id+'Dead']);}
 assert.equal(drawSprite({},'pine'),false);assert.equal(spriteSVG('pine'),'');
});
test('state sprites follow actual resources, searched loot and fire, not random art',()=>{
 assert.equal(resourceSprite({kind:'herb',remaining:2}),'herb');assert.equal(resourceSprite({kind:'herb',remaining:0}),'herbEmpty');
 for(const kind of ['berries','deadwood','stone','fiber','grain','vegetables','herb'])for(const remaining of [0,1])assert.ok(SPRITES[resourceSprite({kind,remaining})]);
 assert.equal(containerSprite({kind:'柜子',searched:false}),'cabinetClosed');assert.equal(containerSprite({kind:'柜子',searched:true,items:{wood:1}}),'cabinetOpen');assert.equal(containerSprite({kind:'柜子',searched:true,items:{wood:0}}),'cabinetEmpty');
 assert.equal(trapSprite({type:'snare',checked:true}),'snareSpent');assert.equal(fireSprite({lit:true},3),'fireLit');assert.equal(fireSprite({lit:false},3),'fireUnlit');assert.equal(fireSprite({lit:false},0),'fireAsh');assert.equal(buildingSprite({name:'社区诊所'}),'clinic');
});
for(let mask=0;mask<16;mask++)test(`wall topology ${mask} connects exactly the specified cardinal arms`,()=>{
 const at=(x,y)=>x===1&&y===1?'#':x===1&&y===0&&mask&1||x===2&&y===1&&mask&2||x===1&&y===2&&mask&4||x===0&&y===1&&mask&8?'#':'.';
 assert.equal(wallMask(at,1,1),mask);const rs=wallRects(mask),reaches=(side)=>rs.some(([x,y,w,h])=>side===1?y===0:side===2?x+w===1:side===4?y+h===1:x===0);
 for(const side of [1,2,4,8])assert.equal(reaches(side),!!(mask&side));assert.equal(rs.length,1+[1,2,4,8].filter(bit=>mask&bit).length);
});
test('doors and windows use wall direction; open door frame survives rotation',()=>{
 const h=['.....','##+##','.....'],v=['.#.','.+.','.#.'];
 assert.equal(openingAxis((x,y)=>h[y]?.[x],2,1),'horizontal');assert.equal(openingAxis((x,y)=>v[y]?.[x],1,1),'vertical');
 assert.match(wallSVG((x,y)=>v[y]?.[x],1,1,{open:true}),/rotate\(90\)/);assert.match(wallSVG((x,y)=>v[y]?.[x],1,1,{open:false}),/circle/);
 validateOpenings(h);validateOpenings(v);validateOpenings(['#####','#...#','E...#','#...#','##=##']);
});
test('generation rejects corner, T, cross openings and furniture in the doorway',()=>{
 for(const grid of [['.#.','.+#','...'],['.#.','#+#','...'],['.#.','#+#','.#.']])assert.throws(()=>validateOpenings(grid),/直墙段/);
 assert.throws(()=>validateOpenings(['.....','##+##','.....'],[{x:2,y:0}]),/无家具阻挡/);
 for(const size of ['small','normal','large'])assert.doesNotThrow(()=>validateLocal(demoPlan(size),size));
});
test('legacy saved windows remain readable while newly generated invalid windows are rejected',()=>{
 const raw=rasterizeLayout(demoPlan('small'),'small');raw.grid[0]='='+raw.grid[0].slice(1);
 assert.throws(()=>validateLocal(raw,'small'),/直墙段/);assert.doesNotThrow(()=>validateLocal(raw,'small',true));
});
test('failed image requests use fallback and are not retried on every map redraw',async()=>{
 const previous=globalThis.Image;let requests=0,notifications=0;
 globalThis.Image=class{set src(value){requests++;queueMicrotask(()=>this.onerror());}};
 try{const a=await import('../src/assets.js?failure-test');const stop=a.onAssetsChanged(()=>notifications++);a.preloadAssets();await Promise.resolve();await Promise.resolve();
  assert.equal(requests,8);assert.equal(notifications,1);assert.ok(Object.values(a.assetStatus()).every(v=>v==='error'));
  for(let i=0;i<20;i++){assert.equal(a.drawSprite({},'pine'),false);assert.equal(a.spriteSVG('bed'),'');}assert.equal(requests,8);stop();
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
test('SVG crops use matching viewport aspect to prevent adjacent sprites leaking into letterboxes',async()=>{
 const previous=globalThis.Image;globalThis.Image=class{set src(value){queueMicrotask(()=>this.onload());}};
 try{const a=await import('../src/assets.js?svg-test');a.preloadAssets();await Promise.resolve();
  const html=a.spriteSVG('metalbench',80,40),w=Number(html.match(/width="([\d.]+)"/)[1]),h=Number(html.match(/height="([\d.]+)"/)[1]);
  assert.ok(Math.abs(w/h-SPRITES.metalbench.rect[2]/SPRITES.metalbench.rect[3])<1e-10);assert.match(html,/preserveAspectRatio="none" overflow="hidden"/);assert.ok(w<=80&&h<=40);
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
test('camp tile hit regions contain only their cell rectangle, never the oversized atlas image',async()=>{
 const previous=globalThis.Image;globalThis.Image=class{set src(value){queueMicrotask(()=>this.onload());}};
 try{const a=await import('../src/assets.js');a.preloadAssets();await Promise.resolve();const s=newGame(demoWorld(),{mode:'demo'});cell(s).camp={level:1,storage:{},facilities:{}};campAction(s,'campEnter');
  const html=campInterior(s,{mode:'walk',type:'box',zoom:1}),hits=[...html.matchAll(/<g data-camp-tile="true"[^>]*>(.*?)<\/g>/g)];assert.equal(hits.length,225);
  for(const hit of hits){assert.match(hit[1],/^<rect /);assert.doesNotMatch(hit[1],/<image|<svg/);}assert.match(html,/<image href=/);
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
