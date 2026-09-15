import test from 'node:test';
import assert from 'node:assert/strict';
import {readTerrain} from '../src/terrain-input.js';
import {demoWorld,validateWorld,TERRAINS,clone} from '../src/engine.js';
const allowed=Object.keys(TERRAINS);
test('format-only model variations retain every cell and coordinate',()=>{
 const raw=demoWorld('format'),expected=validateWorld(raw);
 for(const format of [r=>r.split('').join(' '),r=>r.split('').join(', '),r=>r.split(''),r=>r.toUpperCase(),r=>r.replaceAll('f','ｆ').replaceAll('.','．')]){
  const changed=clone(raw);changed.terrain=changed.terrain.map(format);assert.deepEqual(validateWorld(changed),expected);
 }
});
test('wrong row lengths are reported together without padding or truncation',()=>{
 const rows=Array(9).fill('.........');rows[1]='........';rows[5]='..........';const before=clone(rows);
 assert.throws(()=>readTerrain(rows,9,allowed),e=>e.message.includes('第 2 行：需要 9 格，实际 8 格')&&e.message.includes('第 6 行：需要 9 格，实际 10 格'));assert.deepEqual(rows,before);
});
test('unsupported glyphs report row and column rather than becoming default grass',()=>{
 const rows=Array(9).fill('.........');rows[2]='...🌲.....';assert.throws(()=>readTerrain(rows,9,allowed),/第 3 行.*4列=.*🌲/);
 rows[2]='...x.....';assert.throws(()=>readTerrain(rows,9,allowed),/4列=.*x/);
});
test('array shape and malformed separators cannot shift coordinates silently',()=>{
 assert.throws(()=>readTerrain(Array(8).fill('.........'),9,allowed),/实际收到 8/);
 const rows=Array(9).fill('.........');rows[0]=['ff',...Array(8).fill('.')];assert.throws(()=>readTerrain(rows,9,allowed),/每格必须是单个/);
 rows[0]='f,,f,f,f,f,f,f,f,f';assert.throws(()=>readTerrain(rows,9,allowed),/不支持/);
});
test('valid formatting does not bypass fixed boundaries or map connectivity',()=>{
 const raw=demoWorld('bound');raw.terrain=raw.terrain.map(r=>r.split('').join(' '));assert.throws(()=>validateWorld(raw,{size:'small',boundaries:{'0,0':'w'}}),/边界/);
});
