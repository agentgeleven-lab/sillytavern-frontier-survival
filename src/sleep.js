import * as E from './engine.js';
import {SLEEP_PLACES,SLEEP_LIMIT,WAKE_THRESHOLD,sleepPlace,sleepMinutes} from './sleep-data.js';
import {lightState,lightWarning,fireRemaining} from './lighting-data.js';
export const WAKE_REASONS={complete:'按计划醒来',needs:'饥渴过低，提前醒来补给',health:'健康耗尽，无法继续睡眠'};
function check(s,choice,turnOff){
  E.assert(!s.ended&&s.stats.health>0,'角色已无法行动');
  const minutes=sleepMinutes(s,choice);
  E.assert(minutes>0&&minutes<=SLEEP_LIMIT,'每次最多睡 12 小时；距离清晨过久时，请选择固定时长');
  E.assert(typeof turnOff==='boolean','照明选项无效');
  E.assert(s.stats.food>WAKE_THRESHOLD&&s.stats.water>WAKE_THRESHOLD,'饱食和水分需要高于 5，请先补给再睡');
  return minutes;
}
function settle(s,minutes,turnOff){
  const start=s.time,place=sleepPlace(s),rates=SLEEP_PLACES[place],before={...s.stats};
  if(turnOff&&s.lighting)s.lighting.active=null;
  let rainMinutes=0,reason='complete';
  for(let i=0;i<minutes;i++){
    const rain=place==='outdoor'&&s.weather==='小雨';if(rain)rainMinutes++;
    // Sleeping does not reveal passing daylight; only refresh visibility on waking.
    E.tick(s,1,0,false);
    if(s.ended){reason='health';break;}
    s.stats.stamina=Math.min(100,s.stats.stamina+rates.stamina/60*(rain?.5:1));
    if(s.stats.food>20&&s.stats.water>20)s.stats.health=Math.min(100,s.stats.health+rates.health/60);
    if(s.stats.food<=WAKE_THRESHOLD||s.stats.water<=WAKE_THRESHOLD){reason='needs';break;}
  }
  return {start,end:s.time,requested:minutes,place,reason,before,after:{...s.stats},rainMinutes};
}
export function sleepPreview(s,choice='8h',turnOff=true){
  try{
    const minutes=check(s,choice,turnOff),draft=E.clone(s),report=settle(draft,minutes,turnOff),warnings=[];
    if(report.reason!=='complete')warnings.push(WAKE_REASONS[report.reason]);
    if(report.rainMinutes)warnings.push(`露天小雨 ${report.rainMinutes} 分钟，该段体力恢复减半`);
    if(!turnOff){const warning=lightWarning(s,report.end-report.start);if(warning)warnings.push(warning.replace(/抵达/g,'醒来'));}
    const fire=E.localMap(s)?.fire;if(fire?.lit&&fireRemaining(s,fire)>0&&fireRemaining(s,fire)<=report.end-report.start)warnings.push('当地营火将在醒来前或醒来时燃尽');
    return {...report,warnings,activeLight:lightState(s).active,error:null};
  }catch(e){return {error:e.message};}
}
export function sleep(s,choice='8h',turnOff=true){
  const minutes=check(s,choice,turnOff),r=settle(s,minutes,turnOff);
  s.lastSleep={start:r.start,end:r.end,requested:r.requested,place:r.place,reason:r.reason};
  E.refreshSight(s);
  E.log(s,`在${SLEEP_PLACES[r.place].name}睡了 ${r.end-r.start} 分钟，${WAKE_REASONS[r.reason]}。体力 ${Math.round(r.before.stamina)} → ${Math.round(r.after.stamina)}，饱食 ${Math.round(r.after.food)}，水分 ${Math.round(r.after.water)}。${turnOff?'睡前已关闭随身照明。':''}`);
  return r;
}
