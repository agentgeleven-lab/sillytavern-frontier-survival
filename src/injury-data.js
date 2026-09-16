export const injuryState=s=>s.injuries??{trauma:0,bleeding:0,infection:0,exposure:0};
export function inflictWound(s,damage){if(damage<2)return;const w=s.injuries??={...injuryState(s)};w.trauma=Math.min(100,w.trauma+damage*2);w.bleeding=Math.min(3,w.bleeding+(damage>=6?2:1));}
export const injuryEffort=s=>1+injuryState(s).trauma/100;
export const injuryDelay=s=>injuryState(s).trauma>=30?1:0;
export function advanceInjuries(s,minutes){
 if(!s.injuries)return;const w=s.injuries;
 for(let i=0;i<minutes&&s.stats.health>0;i++){
  if(w.bleeding>0){w.exposure++;if(w.exposure>=360){w.exposure=0;w.infection=Math.min(3,w.infection+1);}}
  s.stats.health=Math.max(0,s.stats.health-w.bleeding*.01-w.infection*.005);
 }
}
export function healWounds(s,minutes,bed=false){if(!s.injuries)return;const w=s.injuries;if(!w.bleeding&&!w.infection&&s.stats.food>20&&s.stats.water>20)w.trauma=Math.max(0,w.trauma-minutes/60*(bed?4:2));}
export function validateInjuries(s){if(s.injuries===undefined)return;const w=s.injuries;if(!w||!Number.isFinite(w.trauma)||w.trauma<0||w.trauma>100||![w.bleeding,w.infection].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||!Number.isInteger(w.exposure)||w.exposure<0||w.exposure>=360)throw Error('伤势记录无效');}
