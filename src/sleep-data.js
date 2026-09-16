import {nearCampFacility} from './camp-data.js';
export const SLEEP_PLACES={
  outdoor:{name:'露天',stamina:18,health:0},
  cave:{name:'洞穴',stamina:20,health:0},
  building:{name:'建筑内部',stamina:24,health:2},
  shelter:{name:'简易庇护所',stamina:30,health:4},
  fortified:{name:'加固庇护所',stamina:40,health:8},
};
export const SLEEP_LIMIT=720,WAKE_THRESHOLD=5;
export function sleepPlace(s){
  const map=s.player.local?s.locals[s.player.local.site]:null;
  // Regional camps have no local footprint yet: use them only on the region layer.
  if(!map){if(s.world.cells[`${s.player.x},${s.player.y}`].camp?.layout&&!nearCampFacility(s,'bed'))return 'outdoor';const level=s.world.cells[`${s.player.x},${s.player.y}`].camp?.level;return level===2?'fortified':level===1?'shelter':'outdoor';}
  if(map.grid[s.player.local.y][s.player.local.x]==='E')return 'outdoor';
  return map.kind==='field'?'outdoor':map.kind==='cave'?'cave':'building';
}
export function sleepMinutes(s,choice){
  if(choice==='dawn'){const remaining=(300-s.time%1440+1440)%1440;return remaining||1440;}
  return {'2h':120,'4h':240,'8h':480}[choice]??0;
}
export function validateSleep(s){
  const r=s.lastSleep;if(r===undefined)return;
  if(!r||Object.keys(r).length!==5||!Number.isInteger(r.start)||r.start<0||!Number.isInteger(r.end)||r.end> s.time||r.end<=r.start||!Number.isInteger(r.requested)||r.requested<1||r.requested>SLEEP_LIMIT||r.end-r.start>r.requested||(r.reason==='complete'&&r.end-r.start!==r.requested)||!Object.hasOwn(SLEEP_PLACES,r.place)||!['complete','needs','health'].includes(r.reason))throw Error('睡眠记录无效');
}
