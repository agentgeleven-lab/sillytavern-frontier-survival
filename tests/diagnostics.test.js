import test from 'node:test';import assert from 'node:assert/strict';
import {createDiagnostics,diagnosedRequest} from '../src/diagnostics.js';
import {diagnosticsHTML} from '../src/diagnostics-view.js';
import {requestJSON,DEFAULT_API} from '../src/api.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const config={...DEFAULT_API,baseUrl:'https://example.test/v1',model:'fixture',apiKey:'sk-secret-fixture'};
test('invalid first attempt and repair keep separate linked responses and errors',async()=>{
 const d=createDiagnostics(memory(),'a');let calls=0;
 const result=await diagnosedRequest({diagnostics:d,kind:'world',payload:{constraints:{dimension:9}},config,scope:'chat',request:async(input,trace)=>{calls++;trace({httpStatus:200,modelText:JSON.stringify({valid:calls===2})});if(calls===2)assert.equal(input.correction.error,'row 2');return {valid:calls===2};},validator:r=>{if(!r.valid)throw Error('row 2');}});
 assert(result.valid);const rows=d.list();assert.equal(rows.length,2);assert.equal(rows[0].group,rows[1].group);assert.equal(rows[0].status,'validated');assert.equal(rows[1].status,'invalid');assert.equal(rows[1].error,'row 2');assert(rows[1].modelText.includes('false'));
});
test('credentials, background and chat request body stay out of persisted reports',()=>{
 const mem=memory(),d=createDiagnostics(mem,'a'),id=d.begin('world',{background:'PRIVATE_BACKGROUND',target:{text:'PRIVATE_CHAT'},known:{recent:['PRIVATE_HISTORY']},constraints:{dimension:9}},config);
 d.trace(id,{response:'echo sk-secret-fixture Authorization: Bearer abcdef',apiKey:config.apiKey});d.update(id,{status:'invalid',error:'sk-secret-fixture failed'});
 for(const text of [d.export(),mem.getItem('frontier-diagnostics:a')])for(const secret of ['sk-secret-fixture','abcdef','PRIVATE_BACKGROUND','PRIVATE_CHAT','PRIVATE_HISTORY'])assert(!text.includes(secret));
});
test('bounded logs survive reload, interrupted requests are marked, clear removes records',()=>{
 const mem=memory(),d=createDiagnostics(mem,'a');for(let i=0;i<40;i++){const id=d.begin('world',{},config);d.trace(id,{response:'x'.repeat(70000)});}
 assert(d.list().length<=30);assert(d.export().includes('已截断'));assert(mem.getItem('frontier-diagnostics:a').length<=1500000);const restored=createDiagnostics(mem,'a');assert.equal(restored.list()[0].status,'interrupted');restored.clear();assert.equal(createDiagnostics(mem,'a').list().length,0);
});
test('diagnostic storage and subscribers cannot fail a successful request',async()=>{
 const d=createDiagnostics({getItem:()=>null,setItem:()=>{throw Error('quota');}},'a');d.subscribe(()=>{throw Error('render');});const r=await diagnosedRequest({diagnostics:d,kind:'world',payload:{},config,request:async()=>({ok:true})});assert(r.ok);assert(d.warning());
});
test('cancelled operations retain cancellation and do not request a repair',async()=>{
 const d=createDiagnostics(memory(),'a'),controller=new AbortController();controller.abort();await assert.rejects(diagnosedRequest({diagnostics:d,kind:'world',payload:{},config,signal:controller.signal,request:async()=>{throw Error('cancelled');}}));assert.equal(d.list()[0].status,'cancelled');
});
test('malformed API and truncated model responses remain available in diagnostics',async()=>{
 for(const body of ['not json',JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"terrain":['}}]})]){
  const d=createDiagnostics(memory(),'a');await assert.rejects(diagnosedRequest({diagnostics:d,kind:'world',payload:{},config,request:(_,onTrace)=>requestJSON(config,'prompt',{}, {onTrace,fetchImpl:async()=>({ok:true,status:200,text:async()=>body})})}));assert.equal(d.list()[0].response,body);assert.equal(d.list()[0].status,'error');
 }
});
test('HTTP error bodies are recorded and trace failures never change API results',async()=>{
 const d=createDiagnostics(memory(),'a');await assert.rejects(diagnosedRequest({diagnostics:d,kind:'world',payload:{},config,request:(_,onTrace)=>requestJSON(config,'prompt',{}, {onTrace,fetchImpl:async()=>({ok:false,status:429,text:async()=>'rate limited'})})}));assert.equal(d.list()[0].httpStatus,429);assert.equal(d.list()[0].response,'rate limited');
 const r=await requestJSON(config,'p',{}, {onTrace:()=>{throw Error('logger');},fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify({choices:[{message:{content:'{"ok":true}'}}]})})});assert(r.ok);
});
test('model HTML and raw errors render as text; filters and report selection work',()=>{
 const d=createDiagnostics(memory(),'a'),id=d.begin('world',{},config,{scope:'a'});d.update(id,{status:'invalid',modelText:'<img src=x onerror=alert(1)>',error:'<script>bad</script>'});const html=diagnosticsHTML({diagnostics:d,scope:'a',filter:'errors'});assert(html.includes('&lt;img'));assert(!html.includes('<script>'));assert.equal(JSON.parse(d.export(id)).records.length,1);assert(diagnosticsHTML({diagnostics:d,scope:'b',filter:'current'}).includes('尚无符合条件'));
});
test('an action failure attaches to the matching request instead of hiding its model response',()=>{
 const d=createDiagnostics(memory(),'a'),id=d.begin('world',{},config,{scope:'a'});d.update(id,{status:'invalid',error:'bad row',modelText:'map'});d.error('bad row','a');assert.equal(d.list().length,1);assert(d.list()[0].actionFailed);assert.equal(d.list()[0].modelText,'map');
});
test('JSON-escaped and URL-encoded credential echoes are removed before storage',()=>{
 const mem=memory(),d=createDiagnostics(mem,'a'),key='test"credential/a+b';const id=d.begin('world',{}, {...config,apiKey:key});d.trace(id,{response:JSON.stringify({echo:key})+' '+encodeURIComponent(key)});const saved=mem.getItem('frontier-diagnostics:a');assert(!saved.includes('credential'));assert(!d.export().includes('credential'));
});
