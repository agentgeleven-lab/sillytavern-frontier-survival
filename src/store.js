import { clone, validateSave, assert } from './engine.js';
// Transactions commit only complete, validated state; rejected/late requests never mutate the live game.
export class GameStore {
  constructor(storage,namespace){this.storage=storage;this.namespace=namespace;this.scope='standalone';this.state=null;this.epoch=0;this.busy=false;this.controller=null;this.listeners=new Set();}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){for(const fn of this.listeners)fn(this.state);}
  key(){return `frontier-game:${this.namespace}:${this.scope}`;}
  switch(scope){this.controller?.abort();this.controller=null;this.busy=false;this.epoch++;this.scope=scope;this.state=null;const raw=this.storage.getItem(this.key());this.state=raw?validateSave(JSON.parse(raw)):null;this.notify();}
  cancel(){this.controller?.abort();this.controller=null;this.busy=false;this.epoch++;this.notify();}
  async run(fn,{create=false}={}){
    assert(!this.busy,'另一项操作正在进行');assert(create||this.state,'请先创建游戏');const baseline=this.storage.getItem(this.key());if(this.state){const stored=baseline?JSON.parse(baseline):null;assert(stored?.id===this.state.id&&stored?.revision===this.state.revision,'另一窗口已修改存档，请刷新后继续');}this.busy=true;const epoch=this.epoch,controller=new AbortController();this.controller=controller;const draft=this.state?clone(this.state):null;this.notify();
    try{const value=await fn(draft,controller.signal);assert(epoch===this.epoch&&!controller.signal.aborted,'聊天或游戏已切换，旧结果已丢弃');assert(this.storage.getItem(this.key())===baseline,'另一窗口已修改存档，当前操作未应用；请刷新后继续');const next=value??draft;validateSave(next);next.revision++;if(create&&baseline)this.storage.setItem(this.key()+':previous',baseline);this.storage.setItem(this.key(),JSON.stringify(next));this.state=next;this.notify();return next;}
    finally{if(epoch===this.epoch){this.busy=false;this.controller=null;this.notify();}}
  }
  export(){assert(this.state,'没有可导出的存档');return JSON.stringify(this.state,null,2);}
  async import(raw){assert(raw.length<3000000,'存档超过 3 MB');const next=validateSave(JSON.parse(raw));return this.run(()=>next,{create:true});}
}
