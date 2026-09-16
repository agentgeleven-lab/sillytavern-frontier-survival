import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as W from '../src/world.js';
import {environmentAt,noise,BIOMES,LAND_USE} from '../src/environment.js';
import {applyEvents,revokeClue} from '../src/sync.js';
const state=(seed='testing')=>({seed,theme:'waste',atlas:{regions:{}}});
const spec=(x=0,y=0)=>W.fixedRegionSpec(state(),x,y);
function game(){const p=spec(),raw=W.demoRegion(p),s=E.newGame(raw,{seed:'testing',mode:'demo'});s.world=W.validateRegion(raw,p);E.reveal(s);W.summarizeRegion(s);return s;}

test('fixed size and geography are independent of exploration order',()=>{
 const s=state();const a=W.fixedRegionSpec(s,-11,6);W.fixedRegionSpec(s,4,-6);assert.deepEqual(W.fixedRegionSpec(s,-11,6),a);assert.deepEqual(environmentAt('testing',4,2),environmentAt('testing',4,2));
 s.atlas.regions['-11,6']={sizeClass:'small'};assert.equal(W.fixedRegionSpec(s,-11,6).dimension,9);
 assert(Math.abs(noise('terrain',4,7)-noise('terrain',4.001,7))<.001);
});
test('large sampled world is predominantly natural with all settlement and biome types',()=>{
 const uses=new Set(),biomes=new Set();let natural=0,total=0,same=0;
 for(let y=-70;y<=70;y++)for(let x=-70;x<=70;x++){const e=environmentAt('testing',x,y);uses.add(e.landUse);biomes.add(e.biome);total++;natural+=e.landUse==='wilderness';same+=e.biome===environmentAt('testing',x+1,y).biome;}
 assert(natural/total>.8);assert(natural/total<.99);assert(same/total>.75);assert.deepEqual([...uses].sort(),Object.keys(LAND_USE).sort());assert.deepEqual([...biomes].sort(),Object.keys(BIOMES).sort());
});
test('natural region supports exploration with zero buildings and no interior artificial terrain',()=>{
 const p=spec(),raw=W.demoRegion(p),world=W.validateRegion(raw,p);assert.equal(p.environment.landUse,'wilderness');assert.equal(raw.sites.length,0);assert(raw.points.length>=2);
 for(const c of Object.values(world.cells))if(c.x>0&&c.y>0&&c.x<world.size-1&&c.y<world.size-1)assert(!'rau'.includes(c.terrain));
 const bad=E.clone(raw);const c=raw.points[0];bad.sites=[{...c,size:'small',kind:'house'}];bad.points=bad.points.slice(1);assert.throws(()=>W.validateRegion(bad,p),/建筑数量/);
});
test('all generated environments and region sizes pass geometry and environmental validation',()=>{
 for(let y=-25;y<=25;y+=5)for(let x=-25;x<=25;x+=5){const p=spec(x,y),raw=W.demoRegion(p);W.validateRegion(raw,p);assert(raw.sites.length>=p.environment.buildingRange[0]);assert(raw.sites.length<=p.environment.buildingRange[1]);}
});
test('natural location collisions, invalid habitat and artificial terrain are rejected',()=>{
 const p=spec(),raw=W.demoRegion(p),bad=E.clone(raw);bad.points.push({...bad.points[0]});assert.throws(()=>W.validateRegion(bad,p),/重叠/);
 const wrong=E.clone(raw);wrong.points[0].kind='reeds';assert.throws(()=>W.validateRegion(wrong,p),/生态/);
 const urban=E.clone(raw),m=Math.floor(p.dimension/2);urban.terrain[m]=urban.terrain[m].slice(0,m)+'u'+urban.terrain[m].slice(m+1);assert.throws(()=>W.validateRegion(urban,p),/地形/);
 const s=game();s.world.ecology.entities.enemy={id:'enemy'};assert.throws(()=>E.validateSave(s),/尚不支持生物/);
});
test('fog-safe world thumbnails and chat context exclude hidden natural locations',()=>{
 const s=game(),hidden=Object.values(s.world.cells).find(c=>!c.known);hidden.poi={id:'secret',kind:'cave',name:'SECRET_CAVE',description:'HIDDEN'};hidden.name='SECRET_CAVE';W.summarizeRegion(s);
 const a=s.atlas.regions['0,0'];assert.equal(a.thumbnail.join('').replaceAll('?','').length,25);assert(!a.landmarks.some(p=>p.x===hidden.x&&p.y===hidden.y));assert(!E.knownContext(s).includes('SECRET_CAVE'));
 assert.equal(JSON.parse(E.knownContext(s)).environment.biome,s.world.environment.biome);
});
test('natural resources collect once and regional persistence includes habitat and depletion',()=>{
 const s=game(),c=E.cell(s);c.poi={id:'berries',kind:'berries',name:'野果丛',description:'野果'};const food=s.bag.food;E.survey(s,W.naturalLoot(c));assert.equal(s.bag.food,food+1);assert.throws(()=>E.survey(s,W.naturalLoot(c)),/耗尽/);
 const data=W.regionData(s);assert.deepEqual(data.world.ecology,s.world.ecology);assert.equal(data.world.cells[E.key(c.x,c.y)].depleted,true);assert.deepEqual(data.world.environment,s.world.environment);E.validateSave(E.clone(s));
});
test('malformed thumbnail imports are rejected before canvas rendering',()=>{const s=game();s.atlas.regions['0,0'].thumbnail=['?'];assert.throws(()=>E.validateSave(s),/缩略图/);});
test('chat discoveries preserve natural landmarks and do not turn them into buildings',()=>{
 const s=game(),c=Object.values(s.world.cells).find(c=>c.poi&&!c.visited);c.known=false;const target={isUser:true,text:`我发现了(${c.x},${c.y})的${c.name}`},event={kind:'discovery',title:c.name,detail:'看到了这里',quote:target.text,x:c.x,y:c.y};
 applyEvents(s,[event],{id:'natural',fingerprint:'1',target});assert(c.known);assert.equal(c.site,null);assert(c.poi);revokeClue(s,s.clues.at(-1).id);assert.equal(c.known,false);assert(c.poi);
 applyEvents(s,[{...event,title:'仓库'}],{id:'conflict',fingerprint:'1',target});assert(s.clues.at(-1).conflict);assert.equal(c.site,null);
 const known=JSON.parse(E.knownContext(s));assert(!('buildingRange' in known.environment));assert(!('allowedPoints' in known.environment));
});
