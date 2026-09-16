import {setBodyValue} from './body-data.js';
export const DEV_STATS={health:'健康',food:'饱食',water:'水分',stamina:'体力',spirit:'精神',trauma:'创伤',bleeding:'出血',infection:'感染',wet:'淋湿',cold:'受冷',heat:'过热'};
export const devEnabled=s=>s?.developer?.enabled===true;
export const timeFrozen=s=>devEnabled(s)&&s.developer.timeLocked;
export const devValue=(s,id)=>['wet','cold','heat'].includes(id)?s.thermal?.[id]??0:['trauma','bleeding','infection'].includes(id)?s.injuries?.[id]??0:s.stats[id]??100;
export function setDevValue(s,id,value){if(['wet','cold','heat'].includes(id)){s.thermal??={wet:0,cold:0,heat:0,coat:false};s.thermal[id]=value;}else if(['trauma','bleeding','infection'].includes(id)){s.injuries??={trauma:0,bleeding:0,infection:0,exposure:0};s.injuries[id]=value;setBodyValue(s,id,value);if(id==='bleeding'&&!value)s.injuries.exposure=0;}else s.stats[id]=value;}
export function applyDevLocks(s){if(!devEnabled(s))return;for(const[id,value]of Object.entries(s.developer.locks))setDevValue(s,id,value);s.ended=s.stats.health<=0;}
export function validateDeveloper(s){const d=s.developer;if(d===undefined)return;const check=(v)=>{if(!v)throw Error('开发者设置无效');};check(d&&typeof d.enabled==='boolean'&&typeof d.timeLocked==='boolean'&&d.locks&&typeof d.locks==='object'&&!Array.isArray(d.locks));for(const[id,value]of Object.entries(d.locks))check(Object.hasOwn(DEV_STATS,id)&&Number.isFinite(value)&&value>=0&&value<=(['bleeding','infection'].includes(id)?3:100)&&(!['bleeding','infection'].includes(id)||Number.isInteger(value)));}
