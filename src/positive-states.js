import {stomachLevel} from './water-data.js';
// Durations use game minutes; old saves may omit benefits entirely.
export const BENEFITS={satisfied:{name:'饱腹满足',duration:240,effect:'休息与睡眠的体力恢复 +15%；每小时精神 +1'},rested:{name:'充分休息',duration:360,effect:'普通行动的基础体力消耗 -10%'}};
export function activeBenefits(s){return Object.entries(BENEFITS).filter(([id])=>(s.benefits?.[id]??0)>s.time).map(([id,r])=>({id,...r,remaining:s.benefits[id]-s.time}));}
export function benefitMinutes(s,id,from,to){return Math.max(0,Math.min(to,s.benefits?.[id]??from)-from);}
export function grantBenefit(s,id){s.benefits??={};s.benefits[id]=s.time+BENEFITS[id].duration;}
export function mealBenefit(s,id,before){if(['cookedmeat','smokedmeat'].includes(id)&&before<80&&s.stats.food>=80){grantBenefit(s,'satisfied');return true;}return false;}
export function sleepBenefit(s,r){if(!stomachLevel(s)&&r.reason==='complete'&&r.end-r.start>=360&&['covered','building','shelter','fortified'].includes(r.place)&&s.stats.stamina>=80&&s.stats.food>20&&s.stats.water>20&&!s.injuries?.bleeding&&!s.injuries?.infection){grantBenefit(s,'rested');return true;}return false;}
export function recoveryBonus(s,from,to,rate){return rate*.15*benefitMinutes(s,'satisfied',from,to)/60;}
export function advanceBenefits(s,from){const n=benefitMinutes(s,'satisfied',from,s.time);if(n)s.stats.spirit=Math.min(100,(s.stats.spirit??100)+n/60);if(s.benefits)for(const[id,end]of Object.entries(s.benefits))if(end<=s.time)delete s.benefits[id];}
export function validateBenefits(s){if(s.benefits===undefined)return;if(!s.benefits||typeof s.benefits!=='object'||Array.isArray(s.benefits))throw Error('正面状态无效');for(const[id,end]of Object.entries(s.benefits))if(!Object.hasOwn(BENEFITS,id)||!Number.isSafeInteger(end)||end<0||end>s.time+BENEFITS[id].duration)throw Error('正面状态期限无效');}
export function benefitsPanel(s){const rows=activeBenefits(s);return `<section class="fs-survival-panel fs-benefits"><h3>身体状况 · 正面状态</h3>${rows.map(r=>`<p><b>${r.name}</b> · 剩余 ${r.remaining} 分钟<br><small>${r.effect}</small></p>`).join('')||'<p>当前没有正面状态。</p>'}<p class="fs-muted">饱腹满足：饱食低于 80 时吃熟肉或熏肉，达到 80，持续 4 小时。充分休息：在有遮蔽处完整睡够 6 小时，醒来体力至少 80、饱食水分高于 20，且没有出血或感染，持续 6 小时。同名状态只刷新，不叠加；继续吃撑不会延长满足。状态不治疗伤势，仅随游戏时间变化。</p></section>`;}
