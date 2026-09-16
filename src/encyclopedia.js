import {ITEMS,RECIPES} from './engine.js';
import {PHASES} from './daylight.js';
import {RESOURCES} from './field-data.js';
export const CATEGORIES=['全部','地图与移动','时间与视野','采集与物品','生存与建设','存档与聊天'];
export function articles(){return [
  ['地图与移动','地图层级与大小','世界地图中的每格是一个区域，首次进入生成，返回读取原图。区域大小预先确定：小 9×9、普通 15×15、大 21×21。普通陆地可以进入周边地块，地块大小为 11×11、19×19、29×29。建筑大小上限为 12×12、24×24、40×40，实际可小于上限。洞穴与建筑可从地块入口进入，离开后返回原入口。'],
  ['地图与移动','移动耗时与路线','上下左右逐格移动，不走斜线。区域走入普通地形每格 6 分钟，山地每格 12 分钟，水域不能步行通过。地块、建筑和洞穴每格 1 分钟。移动沿已知的可通行路线；“走近”只走到物件旁，不自动搜索或采集。例：3 格普通地形＋1 格山地＝30 分钟。显示的预计耗时对应实际采用的路线，不保证是所有路线中耗时最短的一条。'],
  ['地图与移动','跨区旅行与出入口','世界地图只能前往上下左右相邻区域。旅行耗时＝走到当前区域出口的时间＋30 分钟。旅行会探索沿途地形，视野随途中时间变化。身在地点内部时，先逐层返回区域再旅行。进入或离开一个地点各耗时 1 分钟，开关门耗时 1 分钟。'],
  ['时间与视野','一天的六个时段',PHASES.map(p=>`${p.name}：${clock(p.start)}—${clock(p.end)}；区域发现半径 ${p.region} 格，局部最大视距 ${p.local} 格。`).join('\n')+'\n时段共用游戏分钟时钟，不限制行动次数。查看地图、选择目标、翻阅百科和等待 API 都不推进时间。'],
  ['时间与视野','当前视野与地图记忆','区域两格半径是以角色为中心的 5×5 范围，一格半径为 3×3。已探索地点超出视野后显示为暗色记忆，不会重新变成未知。可以沿记住的路线走动；远处资源余量要走近才重新确认。墙壁、岩壁和关上的门继续阻挡视线。'],
  ['时间与视野','洞穴与室内采光','洞穴全天只能看清两格。室内两格以外还需要自然采光：窗户最多向无遮挡位置提供八格采光，外部入口最多四格；仍受当前时段最大视距限制。无采光房间不会因外面是白天而整体变亮。当前尚无手电、火把和营火照明功能。'],
  ['采集与物品','快速搜集与资源点','区域快速搜集耗时 25 分钟，每次从各个仍有余量的地表资源点各取一份。它与小地图逐点采集共用同一份余量。先快速搜集再进入地块也不会重复生成物资。采尽后保留痕迹，不因重进或读档刷新。洞穴深处资源需要亲自进入采集。'],
  ['采集与物品','资源种类与采集耗时',Object.values(RESOURCES).map(r=>`${r.name} → ${ITEMS[r.item].name}，每份 ${r.minutes} 分钟。`).join('\n')+'\n采集前需走到资源点旁，负重不足时整次采集不结算。浆果暂按食品处理；资源生长、采矿工具和石料建设配方尚未加入。'],
  ['采集与物品','柜子、物资与负重','站到容器旁搜索，耗时 10 分钟。搜索只进行一次，物资先留在容器中，再点击拿取；拿取目前不额外消耗游戏时间。背包最多 20 kg，营地储藏最多 200 kg。\n'+Object.values(ITEMS).map(i=>`${i.name}：每份 ${i.weight} kg`).join('；')+'。'],
  ['生存与建设','饥渴、体力与补给','每过一分钟消耗 0.025 饱食和 0.045 水分，普通活动还消耗 0.09 体力。饥渴或体力降到零可能继续损失健康。食品恢复 30 饱食，饮用水恢复 30 水分，医疗用品恢复 25 健康，上限均为 100。使用补给目前不额外消耗时间。天然水不会自动变成饮用水，净水功能尚未加入。'],
  ['生存与建设','休息与庇护所',Object.values(RECIPES).map(r=>`${r.name}：${Object.entries(r.cost).map(([id,q])=>`${ITEMS[id].name} ${q} 份`).join('＋')}；${r.minutes} 分钟。`).join('\n')+'\n在区域地图上建设，营地随地块保存。每次休息 60 分钟，基础恢复 15 体力；在区域营地休息，每级额外恢复 12 体力。饱食、水分都超过 20 时，每级营地还恢复 4 健康。休息仍会消耗饥渴。存入和取出物资目前不额外耗时。'],
  ['生存与建设','纤维编织与当前范围','背包中可用 3 份植物纤维，花 15 分钟编织 1 份布料，用于现有庇护所配方。当前工具、燃料、石料可以携带和储藏，但尚无完整的工具使用、燃烧或采矿系统。生物活动、战斗、复杂合成和资源恢复仍未加入。'],
  ['存档与聊天','保存、失败与取消','每段聊天独立保存。区域按需读取，导出存档会包含全部已生成区域；导入会替换当前游戏。API 生成失败、取消或存储失败不会结算该行动。存档位于本机浏览器或宿主中，清理应用数据或更换来源可能使原存档不可用，请定期导出。'],
  ['存档与聊天','角色卡、上下文与错误报告','角色卡提供背景资料；游戏操作通过插件及独立 API 进行。聊天可提取地点发现和传闻，但不会直接赠送物资、造成伤害或完成建设。发送消息时提供已知现场，隐藏物件不作为当前观察注入。遇到生成错误，可进入“诊断与调试”查看返回及导出报告；报告不会自动上传。'],
].map(([category,title,body])=>({category,title,body}));}
const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function encyclopediaResults(category='全部',query=''){
 const q=query.trim().toLocaleLowerCase(),matches=articles().filter(a=>(category==='全部'||a.category===category)&&`${a.title} ${a.body}`.toLocaleLowerCase().includes(q));
 return `<p class="fs-muted">${matches.length} 条知识 · 当前版本规则</p><div class="fs-guide-grid">${matches.map(a=>`<article class="fs-card"><small class="fs-kicker">${esc(a.category)}</small><h2>${esc(a.title)}</h2><p class="fs-guide-copy">${esc(a.body)}</p></article>`).join('')||'<p>没有找到相关知识，试试“山地”“夜晚”或“采集”。</p>'}</div>`;
}
export function encyclopediaHTML(category='全部',query=''){return `<section class="fs-card fs-guide-tools"><small class="fs-kicker">FIELD GUIDE</small><h2>生存百科</h2><p>查阅规则不消耗游戏时间，也不会调用模型。</p><div class="fs-row"><label>知识分类<select data-guide-category>${CATEGORIES.map(c=>`<option ${c===category?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label>搜索知识<input data-guide-search type="search" value="${esc(query)}" placeholder="移动、山地、视野、资源……"></label></div></section><div class="fs-guide-results">${encyclopediaResults(category,query)}</div>`;}
