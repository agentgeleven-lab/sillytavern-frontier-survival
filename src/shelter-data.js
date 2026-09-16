import {nearCampFacility} from './camp-data.js';
export const FACILITIES={
 bed:{name:'床铺',cost:{wood:3,cloth:3},minutes:60,description:'在营地睡眠每小时额外恢复 6 体力、2 精神；伤口休养速度加倍。'},
 cellar:{name:'储藏地窖',cost:{wood:4,stone:6},minutes:120,description:'营地储藏食物按四分之一速度变质；只影响建成后的时间。'},
 bench:{name:'工作台',cost:{wood:4,scrap:2},minutes:60,description:'在营地制作武器与箭矢耗时减少 25%，材料不变。'},
 stove:{name:'灶台',cost:{stone:4,scrap:1},minutes:60,description:'消耗一份木材烤一份生肉；建设熏架后可制作熏肉。'},
 smoker:{name:'熏架',cost:{wood:3,scrap:1},minutes:60,requires:'stove',description:'配合灶台，用两份木材将一份生肉熏制为便携熏肉。'},
};
export const currentCamp=s=>!s.player.local?s.world.cells[`${s.player.x},${s.player.y}`]?.camp:null;
export const hasFacility=(s,id)=>currentCamp(s)?.layout?nearCampFacility(s,id):!!currentCamp(s)?.facilities?.[id];
export const craftMinutes=(s,minutes)=>hasFacility(s,'bench')?Math.ceil(minutes*.75):minutes;
export function validateFacilities(s){for(const c of Object.values(s.world.cells))if(c.camp?.facilities!==undefined){const f=c.camp.facilities;if(!f||Array.isArray(f)||Object.entries(f).some(([id,v])=>!Object.hasOwn(FACILITIES,id)||v!==true)||f.smoker&&!f.stove)throw Error('庇护所设施无效');}}
