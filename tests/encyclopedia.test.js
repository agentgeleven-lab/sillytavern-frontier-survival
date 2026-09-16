import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {articles,encyclopediaHTML,encyclopediaResults,CATEGORIES} from '../src/encyclopedia.js';
test('mixed terrain route estimate equals movement settlement across a phase',()=>{
 const s=E.newGame(E.demoWorld(),{mode:'demo'});s.time=1010;E.cell(s,5,4).terrain='h';E.cell(s,6,4).terrain='.';const path=E.regionPath(s,6,4),minutes=E.routeMinutes(s,path);assert.equal(minutes,18);E.move(s,6,4);assert.equal(s.time,1028);assert.match(E.formatTime(s.time),/黄昏 · 17:08/);assert.equal(E.routeMinutes(s,null),0);
});
test('local movement uses one minute per step independently of region terrain',()=>{
 const s=E.newGame(E.demoWorld(),{mode:'demo'});E.cell(s).terrain='h';E.enter(s,E.demoLocal());const path=E.localPath(s,4,10),minutes=E.routeMinutes(s,path),before=s.time;assert.equal(minutes,1);E.move(s,4,10);assert.equal(s.time-before,minutes);
});
test('encyclopedia categories and search exclude unrelated articles and handle no results',()=>{
 assert(articles().every(a=>CATEGORIES.includes(a.category)));const result=encyclopediaResults('地图与移动','山地');assert.match(result,/30 分钟/);assert.doesNotMatch(result,/编织/);assert.match(encyclopediaResults('时间与视野','窗户'),/洞穴与室内采光/);assert.match(encyclopediaResults('全部','不存在的知识'),/没有找到/);assert.ok(!encyclopediaHTML('全部','"><script>alert(1)</script>').includes('<script>'));
});
