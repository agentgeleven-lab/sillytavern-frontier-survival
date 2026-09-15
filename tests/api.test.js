import test from 'node:test';
import assert from 'node:assert/strict';
import {apiSettings,DEFAULT_API,modelsEndpoint,requestModels} from '../src/api.js';
const config={...DEFAULT_API,baseUrl:'https://example.com/v1',model:'model-a',apiKey:'test-session-secret'};
function memory(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}

test('legacy configuration migrates with opted-in key and removes obsolete storage',()=>{
  const s=memory();s.setItem('frontier-api:u',JSON.stringify({...config,rememberKey:true,apiKey:undefined}));s.setItem('frontier-api:u:secret','test-remembered-secret');
  const api=apiSettings(s,'u');assert.equal(api.get().apiKey,'test-remembered-secret');assert.equal(api.list()[0].name,'默认方案');
  assert.equal(s.getItem('frontier-api:u:secret'),null);assert.equal(s.getItem('frontier-api:u'),null);
  assert.deepEqual(apiSettings(s,'u').get(),api.get());
});
test('profiles switch independently, restore selection, and keep session-only keys off disk',()=>{
  const s=memory(),api=apiSettings(s,'u');api.save(config,'接口 A');const a=api.activeId();
  const b=api.create('接口 B',{...config,model:'model-b',apiKey:'test-other-secret',rememberKey:true});
  api.select(a);assert.equal(api.get().model,'model-a');assert.equal(api.get().apiKey,'test-session-secret');
  assert.ok(!JSON.stringify([...s.data]).includes('test-session-secret'));
  const reload=apiSettings(s,'u');assert.equal(reload.activeId(),a);assert.equal(reload.get().apiKey,'');
  reload.select(b);assert.equal(reload.get().apiKey,'test-other-secret');assert.equal(reload.get().model,'model-b');
  reload.save({...reload.get(),rememberKey:false});assert.ok(!JSON.stringify([...s.data]).includes('test-other-secret'));
  reload.remove(b);assert.equal(reload.activeId(),a);assert.throws(()=>reload.remove(a),/至少/);
});
test('duplicate names and failed storage writes do not change the active profile',()=>{
  const s=memory(),api=apiSettings(s,'u');api.save(config,'接口 A');assert.throws(()=>api.create('接口 A'),/同名/);
  const before=api.get();s.setItem=()=>{throw Error('quota');};assert.throws(()=>api.save({...config,model:'other'}),/quota/);assert.deepEqual(api.get(),before);
});
test('models URL preserves provider prefix and handles complete chat endpoint',()=>{
  assert.equal(modelsEndpoint('https://example.com'), 'https://example.com/v1/models');
  assert.equal(modelsEndpoint('https://example.com/proxy/v1/chat/completions/'),'https://example.com/proxy/v1/models');
  assert.throws(()=>modelsEndpoint('https://example.com/v1?key=secret'));
});
test('model fetch works without a selected model and normalizes duplicate IDs',async()=>{
  const ids=await requestModels({...config,model:''},{fetchImpl:async(url,options)=>{
    assert.equal(url,'https://example.com/v1/models');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer test-session-secret');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);
    return {ok:true,text:async()=>JSON.stringify({data:[{id:'z'},{id:'a'},{id:'z'},{id:null},{}]})};
  }});assert.deepEqual(ids,['a','z']);
});
test('model fetch explains unsupported, invalid and empty responses',async()=>{
  for(const response of [{ok:false,status:404},{ok:true,text:async()=>'<html>'},{ok:true,text:async()=>'{}'},{ok:true,text:async()=>' {"data":[]}'}]){
    await assert.rejects(requestModels(config,{fetchImpl:async()=>response}),/模型|JSON/);
  }
});
test('cancelled late model responses cannot be applied',async()=>{
  const controller=new AbortController();await assert.rejects(requestModels(config,{signal:controller.signal,fetchImpl:async()=>{controller.abort();return {ok:true,text:async()=>' {"data":[{"id":"late"}]}'};}}),/取消/);
});
