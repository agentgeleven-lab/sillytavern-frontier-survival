import {DURABLE} from './durable-data.js';
import {limbPenalty} from './body-data.js';
export const GEAR={
 stoneknife:{name:'石刀',weight:.4,damage:2,range:1,cost:{stone:1,fiber:1},minutes:10},
 woodspear:{name:'木矛',weight:1.2,damage:3,range:2,cost:{wood:2,fiber:1},minutes:15},
 stonespear:{name:'石矛',weight:1.6,damage:4,range:2,cost:{wood:2,stone:1,fiber:2},minutes:25},
 bow:{name:'简易弓',weight:.8,damage:3,range:6,cost:{wood:2,fiber:3},minutes:30},
 arrow:{name:'箭矢',weight:.1,cost:{wood:1,stone:1,fiber:1},minutes:10,qty:4},
};
export const equipped=s=>s.equipment===undefined?((s.bag.tool??0)>0?'tool':null):s.equipment.weapon;
export const stealth=s=>s.equipment?.stance==='sneak';
export function weapon(s){const item=equipped(s),id=DURABLE[item]?.base??item;return id?{id,item,...(id==='tool'?{name:'工具',damage:3,range:1}:GEAR[id])}:{id:null,item:null,name:'徒手',damage:1,range:1};}
export const cuttingTool=s=>Object.entries(s.bag).some(([id,q])=>q>0&&DURABLE[id]?.condition>0&&['tool','stoneknife'].includes(DURABLE[id].base));

export function bowChance(s,d){return Math.max(.4,Math.min(.95,.9-Math.max(0,d-2)*.1+(stealth(s)?.1:0)-((s.stats.spirit??100)<25?.1:0)-limbPenalty(s).arms*.002));}
export function validateEquipment(s){
 if(s.equipment===undefined)return;
 const e=s.equipment;if(!e||!['walk','sneak'].includes(e.stance)||!(e.weapon===null||DURABLE[e.weapon]?.weapon&&DURABLE[e.weapon].condition>0)||(e.weapon&&(s.bag[e.weapon]??0)<1))throw Error('装备与背包不一致');
}
