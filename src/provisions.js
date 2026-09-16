import {FOODS} from './food-data.js';
// Quantities remain in the existing inventory. Batches account for every perishable unit.
export const FOOD_LIFE=Object.fromEntries(Object.entries(FOODS).map(([id,r])=>[id,r.life]));
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function holders(s){return [{holder:s,bag:s.bag,rate:1},...Object.values(s.locals).flatMap(m=>(m.encounters?.actors??[]).map(a=>({holder:a,bag:a.bag,rate:1}))),...Object.values(s.world.cells).filter(c=>c.camp).map(c=>({holder:c.camp,bag:c.camp.storage,rate:!c.camp.layout&&c.camp.facilities?.cellar?.25:1})),...Object.values(s.world.cells).flatMap(c=>(c.camp?.layout?.objects??[]).filter(o=>o.items).map(o=>({holder:o,bag:o.items,rate:o.type==='cellar'?.25:1}))),...Object.values(s.locals).flatMap(m=>Object.values(m.containers).filter(c=>c.searched&&!c.resourceId).map(c=>({holder:c,bag:c.items,rate:1})))];}
function entry(s,bag){const e=holders(s).find(e=>e.bag===bag);check(e,'找不到食物所在物品栏');return e;}
export function initializeFood(s,e,time=s.foodSince??s.time){
 if(e.holder.provisions)return e.holder.provisions;
 return e.holder.provisions={time,rate:e.rate,batches:Object.entries(FOOD_LIFE).filter(([id])=>e.bag[id]>0).map(([id,life])=>({id,qty:e.bag[id],life}))};
}
export function prepareFood(s){s.foodSince??=s.time;for(const e of holders(s))initializeFood(s,e);}
export function foodBatches(s,bag=s.bag){const e=entry(s,bag),p=e.holder.provisions??{time:s.foodSince??s.time,rate:e.rate,batches:Object.entries(FOOD_LIFE).filter(([id])=>bag[id]>0).map(([id,life])=>({id,qty:bag[id],life}))};return p.batches.map(b=>({...b,life:Math.max(0,b.life-(s.time-p.time)*p.rate)}));}
export function settleFood(s,bag){const e=entry(s,bag),batches=foodBatches(s,bag);e.holder.provisions={time:s.time,rate:e.rate,batches};return e.holder.provisions;}
export function freshQty(s,id,bag=s.bag,minutes=0){return foodBatches(s,bag).filter(b=>b.id===id&&b.life>minutes).reduce((n,b)=>n+b.qty,0);}
function merge(p,b){const existing=p.batches.find(a=>a.id===b.id&&Math.abs(a.life-b.life)<1e-8);if(existing)existing.qty+=b.qty;else p.batches.push({...b});}
export function gainFood(s,bag,id,qty,life=FOOD_LIFE[id]){
 if(Object.hasOwn(FOOD_LIFE,id)){const p=settleFood(s,bag);check(Number.isFinite(life)&&life>0&&life<=FOOD_LIFE[id],'食物新鲜度无效');merge(p,{id,qty,life});}
 bag[id]=(bag[id]??0)+qty;
}
export function consumeFood(s,bag,id,qty=1,minutes=0){
 check(freshQty(s,id,bag,minutes)>=qty,'没有能保持新鲜至操作完成的食物');const p=settleFood(s,bag);let left=qty,life=FOOD_LIFE[id];
 for(const b of p.batches.filter(b=>b.id===id&&b.life>minutes).sort((a,b)=>a.life-b.life)){const n=Math.min(left,b.qty);if(n){b.qty-=n;left-=n;life=Math.min(life,b.life);}if(!left)break;}
 p.batches=p.batches.filter(b=>b.qty);bag[id]-=qty;return life;
}
export function transferFood(s,from,to,id,qty){
 if(!Object.hasOwn(FOOD_LIFE,id)){from[id]-=qty;to[id]=(to[id]??0)+qty;return;}
 const a=settleFood(s,from),b=settleFood(s,to);let left=qty;
 for(const lot of a.batches.filter(b=>b.id===id).sort((x,y)=>x.life-y.life)){const n=Math.min(left,lot.qty);if(n){merge(b,{...lot,qty:n});lot.qty-=n;left-=n;}if(!left)break;}
 check(!left,'食物批次数量不一致');a.batches=a.batches.filter(b=>b.qty);from[id]-=qty;to[id]=(to[id]??0)+qty;
}
export function discardSpoiled(s,bag=s.bag){const p=settleFood(s,bag);let count=0;for(const b of p.batches)if(!b.life){bag[b.id]-=b.qty;count+=b.qty;}p.batches=p.batches.filter(b=>b.life>0);return count;}
export function validateFood(s){
 if(s.foodSince!==undefined)check(Number.isInteger(s.foodSince)&&s.foodSince>=0&&s.foodSince<=s.time,'食物计时起点无效');
 for(const e of holders(s)){const p=e.holder.provisions;if(p===undefined)continue;check(p&&Number.isInteger(p.time)&&p.time>=0&&p.time<=s.time&&[1,.25].includes(p.rate)&&p.rate===e.rate&&Array.isArray(p.batches)&&p.batches.length<=40000,'食物保存记录无效');const counts={};
  for(const b of p.batches){check(b&&Object.hasOwn(FOOD_LIFE,b.id)&&Number.isInteger(b.qty)&&b.qty>0&&b.qty<=10000&&Number.isFinite(b.life)&&b.life>=0&&b.life<=FOOD_LIFE[b.id],'食物批次无效');counts[b.id]=(counts[b.id]??0)+b.qty;}
  for(const id of Object.keys(FOOD_LIFE))check((counts[id]??0)===(e.bag[id]??0),'食物批次与物品数量不一致');
 }
}
