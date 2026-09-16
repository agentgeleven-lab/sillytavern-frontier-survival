export const CAMP_SIZE=15, CAMP_EXIT={x:7,y:14};
export const CAMP_SIZES=[15,19,23,27];
export const campSize=l=>l?.size??CAMP_SIZE;
export const campExit=l=>({x:7,y:campSize(l)-1});
export const FURNITURE={
 planter:{name:'种植箱',w:2,h:1,cost:{wood:4},minutes:30},garden:{name:'简易菜地',w:2,h:2,cost:{wood:3,stone:2},minutes:45},
 heater:{name:'简易暖炉',w:1,h:1,cost:{stone:4,components:4,parts:1},minutes:60},metalbench:{name:'金属工作台',w:2,h:1,cost:{wood:4,components:4,scrap:2},minutes:60},chair:{name:'椅子',w:1,h:1,cost:{wood:2,components:2},minutes:20},armchair:{name:'扶手椅',w:1,h:1,cost:{wood:3,cloth:3,components:4},minutes:45},bookshelf:{name:'书架',w:2,h:1,cost:{wood:4,components:3},minutes:45},radio:{name:'收音机',w:1,h:1,cost:{components:4,parts:2,electronics:2},minutes:60},
 rainCollector:{name:'雨水收集器',w:1,h:1,cost:{wood:4,cloth:2,scrap:1},minutes:60},purifier:{name:'净水设备',w:1,h:1,cost:{wood:4,scrap:3},minutes:60},
 roof:{name:'木屋顶',w:1,h:1,cost:{wood:2},minutes:10},floor:{name:'木地板',w:1,h:1,cost:{wood:1},minutes:5},wall:{name:'木墙',w:1,h:1,cost:{wood:2},minutes:15},door:{name:'木门',w:1,h:1,cost:{wood:2,scrap:1},minutes:15},
 box:{name:'储物箱',w:1,h:1,cost:{wood:3},minutes:20,capacity:50},bed:{name:'床铺',w:1,h:2,cost:{wood:3,cloth:3},minutes:60},cellar:{name:'地窖',w:2,h:2,cost:{wood:4,stone:6},minutes:120,capacity:200},bench:{name:'工作台',w:2,h:1,cost:{wood:4,scrap:2},minutes:60},stove:{name:'灶台',w:1,h:1,cost:{stone:4,scrap:1},minutes:60},smoker:{name:'熏架',w:2,h:1,cost:{wood:3,scrap:1},minutes:60}};
export const campAt=s=>s.world.cells[`${s.player.x},${s.player.y}`]?.camp;
export const footprint=o=>{const f=FURNITURE[o.type];return {w:o.rot?f.h:f.w,h:o.rot?f.w:f.h};};
export function tiles(o){const {w,h}=footprint(o);return Array.from({length:w*h},(_,i)=>({x:o.x+i%w,y:o.y+Math.floor(i/w)}));}
export const campLayer=type=>['floor','roof'].includes(type)?type:'solid';
export const objectAt=(l,x,y)=>l.objects.find(o=>!['floor','roof'].includes(o.type)&&tiles(o).some(p=>p.x===x&&p.y===y))??l.objects.find(o=>o.type==='floor'&&tiles(o).some(p=>p.x===x&&p.y===y));
export const nearObject=(p,o)=>!!p&&tiles(o).some(t=>Math.abs(p.x-t.x)+Math.abs(p.y-t.y)<=1);
export const simpleCamp=s=>s.campMode==='simple'&&!!s.player.camp;
export const canUseCampObject=(s,o)=>!!s.player.camp&&(simpleCamp(s)||nearObject(s.player.camp,o));
export const nearCampFacility=(s,type)=>!!s.player.camp&&!!campAt(s)?.layout?.objects.some(o=>o.type===type&&canUseCampObject(s,o));
export function passable(l,x,y,doors=false){const n=campSize(l);if(x<0||y<0||x>=n||y>=n||(!x||!y||x===n-1||y===n-1)&&!(x===7&&y===n-1))return false;const o=objectAt(l,x,y);return !o||o.type==='floor'||o.type==='door'&&(o.open||doors);}
export function campPath(l,from,to,doors=false){if(!passable(l,to.x,to.y,doors))return null;const q=[{...from,path:[]}],seen=new Set([`${from.x},${from.y}`]);for(let i=0;i<q.length;i++){const p=q[i];if(p.x===to.x&&p.y===to.y)return p.path;for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=`${x},${y}`;if(!seen.has(k)&&passable(l,x,y,doors)){seen.add(k);q.push({x,y,path:[...p.path,{x,y}]});}}}return null;}
export const campVisible=(s,x,y)=>!!s.player.camp&&Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<campSize(campAt(s)?.layout)&&y<campSize(campAt(s)?.layout);
export function revealCamp(s){const l=campAt(s)?.layout;if(!s.player.camp||!l)return;for(let y=0;y<campSize(l);y++)for(let x=0;x<campSize(l);x++)if(campVisible(s,x,y))l.seen[`${x},${y}`]=true;}
export function placementError(l,o,player,ignore=null){
 if(!Object.hasOwn(FURNITURE,o.type)||!Number.isInteger(o.x)||!Number.isInteger(o.y)||![0,1].includes(o.rot))return '家具参数无效';
 const ts=tiles(o);if(ts.some(p=>p.x<1||p.y<1||p.x>campSize(l)-2||p.y>campSize(l)-2||p.x===7&&p.y===campSize(l)-2))return '超出营地范围或占用了入口';
 if(ts.some(p=>p.x===player?.x&&p.y===player?.y)&&!['floor','roof'].includes(o.type)&&!(o.type==='door'&&o.open))return '不能放在人物脚下';
 if(l.objects.some(a=>a.id!==ignore&&campLayer(a.type)===campLayer(o.type)&&tiles(a).some(p=>ts.some(t=>t.x===p.x&&t.y===p.y))))return '与已有家具重叠';
 const next={...l,objects:[...l.objects.filter(a=>a.id!==ignore),o]};
 if(player&&!campPath(next,player,campExit(l),true))return '不能堵住人物返回入口的路线';
 for(const a of next.objects.filter(a=>!['wall','floor','roof','door'].includes(a.type)))if(!tiles(a).some(t=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>campPath(next,campExit(l),{x:t.x+dx,y:t.y+dy},true)!==null)))return '请给家具留出可到达的使用位置';
 return '';
}
export function validateCamps(s,inventory){const check=(v,m)=>{if(!v)throw Error(m);};check(s.campMode===undefined||['map','simple'].includes(s.campMode),'营地模式无效');for(const c of Object.values(s.world.cells)){const l=c.camp?.layout;if(!l)continue;check(CAMP_SIZES.includes(campSize(l)),'营地尺寸无效');check(l.version===1&&Number.isInteger(l.serial)&&l.serial>=0&&Array.isArray(l.objects)&&l.objects.length<=3*(campSize(l)-2)**2&&l.seen&&typeof l.seen==='object','营地布局无效');const ids=new Set();let legacy=0;for(const o of l.objects){check(o&&typeof o.id==='string'&&o.id.length<80&&/^[a-zA-Z0-9-]+$/.test(o.id)&&!ids.has(o.id)&&Object.hasOwn(FURNITURE,o.type)&&[0,1].includes(o.rot)&&Number.isInteger(o.x)&&Number.isInteger(o.y),'营地家具无效');ids.add(o.id);check(!placementError(l,o,null,o.id),'营地家具位置无效');check(typeof o.name==='string'&&o.name.length<=40,'家具名称无效');if(o.type==='door')check(typeof o.open==='boolean','门状态无效');if(o.legacy){legacy++;check(o.type==='box','旧仓库绑定无效');}if(FURNITURE[o.type].capacity&&!o.legacy)inventory(o.items);else check(o.items===undefined,'非容器不能保存物品');}
 check(legacy===1,'旧仓库箱缺失或重复');for(const k of Object.keys(l.seen))check(/^\d{1,2},\d{1,2}$/.test(k)&&k.split(',').every(v=>Number(v)<campSize(l))&&l.seen[k]===true,'营地视野无效');
 }if(s.player.camp){check(!s.player.local&&campAt(s)?.layout,'营地人物位置无效');const p=s.player.camp;check(Number.isInteger(p.x)&&Number.isInteger(p.y)&&passable(campAt(s).layout,p.x,p.y),'营地人物位于障碍内');if(p.bedId!==undefined)check(typeof p.bedId==='string'&&campAt(s).layout.objects.some(o=>o.id===p.bedId&&o.type==='bed'),'选定床铺无效');}}
