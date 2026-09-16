import {cell,weight} from './engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 overview:'<path d="M8 48 32 12 56 48Z M32 12V48 M23 48 32 32 41 48"/>',
 storage:'<rect x="10" y="22" width="44" height="30" rx="3"/><path d="M10 32H54 M28 28H36V38H28Z M14 22 20 12H44L50 22"/>',
 bed:'<rect x="12" y="10" width="40" height="46" rx="3"/><path d="M12 26H52 M18 16H46V26 M12 44H52"/>',
 cellar:'<path d="M8 24 32 10 56 24 32 40Z M8 24V42L32 56 56 42V24 M32 40V56 M20 18 44 32 M32 12 52 24"/>',
 bench:'<path d="M8 24H56V34H8Z M14 34V54 M50 34V54 M18 24V12H32 M38 12 50 24 M40 10 48 10"/>',
 stove:'<rect x="14" y="24" width="36" height="32" rx="3"/><path d="M14 32H50 M24 48Q20 40 32 36Q44 44 38 48Z M24 18Q18 12 26 6 M40 18Q34 12 42 6"/>',
 smoker:'<path d="M12 56 20 10H44L52 56 M16 30H48 M24 30V44 M32 30V48 M40 30V44 M20 56H44"/>'};
export function campScene(s,selected='overview'){
 const c=cell(s),camp=c.camp;
 const nodes=[['overview',camp?.level===2?'加固庇护所':'主帐篷',!!camp],['storage','储物箱',!!camp],['bed','床铺',!!camp?.facilities?.bed],['cellar','地窖',!!camp?.facilities?.cellar],['bench','工作台',!!camp?.facilities?.bench],['stove','灶台',!!camp?.facilities?.stove],['smoker','熏架',!!camp?.facilities?.smoker]];
 return `<section class="fs-camp-land"><header><div><small class="fs-kicker">YOUR SHELTER</small><h2>${esc(c.name)} · ${camp?'营地':'待建营地'}</h2></div><span>${camp?`等级 ${camp.level} · ${Object.keys(camp.facilities??{}).length} / 5 设施`:'尚未建设'}</span></header><p>${s.player.local?'你在地点内部，请返回区域地图后管理营地。':'点击场景中的设施，查看用途、建设或使用。查看不消耗时间。'}</p><div class="fs-camp-scene" aria-label="庇护所设施俯视图"><span class="fs-camp-path" aria-hidden="true"></span>${nodes.map(([id,label,built])=>`<button type="button" data-action="campView" data-view="${id}" class="fs-camp-node fs-camp-${id} ${built?'is-built':'is-planned'} ${selected===id?'is-selected':''}" aria-pressed="${selected===id}"><svg viewBox="0 0 64 64" aria-hidden="true">${icons[id]}</svg><b>${label}</b><small>${built?'已建成':'待建设'}</small></button>`).join('')}<span class="fs-camp-entry">入口 / 区域 ${s.player.x}, ${s.player.y}</span></div><footer><span>实线：已建成</span><span>虚线：规划位置</span><span>仓库存量 ${camp?weight(camp.storage).toFixed(1):'0.0'} kg · 与背包独立</span></footer></section>`;
}
export function campTabs(selected){return `<nav class="fs-camp-tabs" aria-label="庇护所功能">${[['overview','营地概览'],['storage','营地仓库'],['sleep','休息与睡眠']].map(([id,name])=>`<button type="button" data-action="campView" data-view="${id}" aria-pressed="${selected===id}">${name}</button>`).join('')}</nav>`;}
