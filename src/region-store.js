import {applyDevLocks,validateDeveloper} from './developer-data.js';
import {prepareFood} from './provisions.js';
import {assert,clone,validateSave,refreshSight} from './engine.js';
import {regionKey,regionData,summarizeRegion,ensureGates} from './world.js';

const revision=s=>s?`${s.id}:${s.revision}`:null;
const header=s=>{const h=clone(s);for(const k of ['world','locals','clues','sync'])delete h[k];return h;};
const read=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const finished=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??Error('存档事务已取消'));tx.onerror=()=>{};});

export class RegionRepository {
  constructor(factory=globalThis.indexedDB){assert(factory,'当前宿主不支持 IndexedDB 分区存档');this.db=new Promise((resolve,reject)=>{const r=factory.open('frontier-regions',1);r.onupgradeneeded=()=>{r.result.createObjectStore('heads');r.result.createObjectStore('regions');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('存档数据库被旧页面占用，请关闭其他酒馆页面后重试'));});}
  async load(scope){const db=await this.db,tx=db.transaction(['heads','regions'],'readonly'),done=finished(tx);try{const h=await read(tx.objectStore('heads').get(scope));const data=h?await read(tx.objectStore('regions').get([scope,h.id,`${h.atlas.x},${h.atlas.y}`])):null;await done;if(!h)return null;assert(data,'当前区域存档缺失');return {...h,...data};}catch(e){await done.catch(()=>{});throw e;}}
  async loadRegion(scope,id,coord){const db=await this.db,tx=db.transaction('regions','readonly'),done=finished(tx);const data=await read(tx.objectStore('regions').get([scope,id,coord]));await done;return data??null;}
  async commit(scope,baseline,s,regions,{signal,replace=false}={}){
    const db=await this.db;assert(!signal?.aborted,'操作已取消');
    const tx=db.transaction(['heads','regions'],'readwrite'),done=finished(tx),abort=()=>{try{tx.abort();}catch{}};
    signal?.addEventListener('abort',abort,{once:true});
    try{
      const heads=tx.objectStore('heads'),previous=await read(heads.get(scope));
      assert(revision(previous)===baseline,'另一窗口已修改存档，请刷新后继续');assert(!signal?.aborted,'操作已取消');
      if(replace&&previous)heads.put(previous,scope+':previous');
      for(const[coord,data]of regions)tx.objectStore('regions').put(data,[scope,s.id,coord]);
      heads.put(header(s),scope);await done;
    }catch(e){abort();await done.catch(()=>{});throw e;}finally{signal?.removeEventListener('abort',abort);}
  }
  async export(scope){
    const db=await this.db,tx=db.transaction(['heads','regions'],'readonly'),done=finished(tx);
    try{const h=await read(tx.objectStore('heads').get(scope));assert(h,'没有可导出的存档');
      const entries=await Promise.all(Object.keys(h.atlas.regions).map(async coord=>[coord,await read(tx.objectStore('regions').get([scope,h.id,coord]))]));
      await done;const regions=Object.fromEntries(entries);assert(entries.every(([,v])=>v),'部分区域存档缺失');
      return {format:'frontier-world',version:2,state:{...h,...regions[`${h.atlas.x},${h.atlas.y}`]},regions};
    }catch(e){await done.catch(()=>{});throw e;}
  }
}

export class RegionGameStore {
  constructor(storage,namespace,repository=new RegionRepository()){
    this.storage=storage;this.namespace=namespace;this.repository=repository;this.scope='standalone';this.state=null;this.baseline=null;this.epoch=0;this.busy=false;this.loading=false;this.controller=null;this.listeners=new Set();
  }
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){for(const fn of this.listeners)fn(this.state);}
  key(){return `frontier-game:${this.namespace}:${this.scope}`;}
  async switch(scope){
    this.controller?.abort();this.controller=null;this.busy=false;this.loading=true;const epoch=++this.epoch;this.scope=scope;this.state=null;this.baseline=null;const k=this.key();this.notify();
    try{
      let s=await this.repository.load(k);
      if(!s){const legacy=this.storage.getItem(k);if(legacy){s=validateSave(JSON.parse(legacy));ensureGates(s);summarizeRegion(s);if(epoch!==this.epoch)return;await this.repository.commit(k,null,s,new Map([[regionKey(s),regionData(s)]]));}}
      if(epoch!==this.epoch)return;this.state=s?validateSave(s):null;if(this.state){prepareFood(this.state);refreshSight(this.state);summarizeRegion(this.state);}this.baseline=revision(s);
    }finally{if(epoch===this.epoch){this.loading=false;this.notify();}}
  }
  cancel(){this.controller?.abort();this.controller=null;this.busy=false;this.epoch++;this.notify();}
  async run(fn,{create=false,regions:imported}={}){
    assert(!this.loading,'存档正在读取，请稍候');assert(!this.busy,'另一项操作正在进行');assert(create||this.state,'请先创建游戏');
    this.busy=true;const epoch=this.epoch,k=this.key(),baseline=this.baseline,controller=new AbortController();this.controller=controller;const draft=this.state?clone(this.state):null,staged=new Map(imported?Object.entries(imported):[]);this.notify();
    try{
      if(draft)prepareFood(draft);
      const value=await fn(draft,controller.signal,{loadRegion:(s,x,y)=>this.repository.loadRegion(k,s.id,`${x},${y}`),stageRegion:(coord,data)=>staged.set(coord,clone(data))});
      assert(epoch===this.epoch&&!controller.signal.aborted,'聊天或游戏已切换，旧结果已丢弃');
      const next=value??draft;validateDeveloper(next);applyDevLocks(next);validateSave(next);prepareFood(next);refreshSight(next);ensureGates(next);summarizeRegion(next);next.revision++;staged.set(regionKey(next),regionData(next));
      await this.repository.commit(k,baseline,next,staged,{signal:controller.signal,replace:create});
      // A switch during the database commit must not install the old chat into the current UI.
      if(epoch===this.epoch){this.state=next;this.baseline=revision(next);this.notify();}return next;
    }finally{if(epoch===this.epoch){this.busy=false;this.controller=null;this.notify();}}
  }
  async export(){assert(this.state,'没有可导出的存档');return JSON.stringify(await this.repository.export(this.key()),null,2);}
  async import(raw){
    const data=JSON.parse(raw);let s,regions={};
    if(data.format==='frontier-world'){
      assert(data.version===2&&data.regions&&typeof data.regions==='object','世界存档格式无效');s=validateSave(data.state);
      const coords=Object.keys(s.atlas.regions);assert(coords.length===Object.keys(data.regions).length&&coords.every(k=>Object.hasOwn(data.regions,k)),'区域索引不完整');
      for(const[coord,region]of Object.entries(data.regions)){
        const [x,y]=coord.split(',').map(Number);assert(coord===`${x},${y}`&&Number.isSafeInteger(x)&&Number.isSafeInteger(y),'区域坐标无效');
        const n=region.world?.size,probe={...clone(s),...clone(region),atlas:{...clone(s.atlas),x,y},player:{x:Math.floor(n/2),y:Math.floor(n/2),local:null}};
        validateSave(probe);regions[coord]=regionData(probe);
      }
      assert(JSON.stringify(regionData(s))===JSON.stringify(regions[regionKey(s)]),'当前区域与索引内容不一致');
    }else{s=validateSave(data);assert(Object.keys(s.atlas.regions).length<=1,'多区域存档必须使用完整世界导出');}
    s.id=crypto.randomUUID();return this.run(()=>s,{create:true,regions});
  }
}
