export const REGION_SIZES = {small:9,normal:15,large:21};
export const BUILDING_SIZES = {small:12,normal:24,large:40};
export const SIZE_NAMES = {small:'小',normal:'普通',large:'大'};
const check=(ok,message)=>{if(!ok)throw Error(message);};
const coordinate=(v,max)=>{check(Number.isInteger(v)&&v>=0&&v<max,'建筑坐标越界');return v;};

// Room rectangles describe interior floor; walls and exterior void are drawn by the engine.
export function rasterizeLayout(plan,size='normal') {
  const limit=BUILDING_SIZES[size];check(limit,'建筑大小等级无效');
  const w=plan.width,h=plan.height;
  check(Number.isInteger(w)&&Number.isInteger(h)&&w>=5&&h>=5&&w<=limit&&h<=limit,`建筑尺寸不得超过 ${limit}×${limit}`);
  check(Array.isArray(plan.rooms)&&plan.rooms.length>=1&&plan.rooms.length<=30,'建筑需要 1–30 个房间范围');
  const grid=Array.from({length:h},()=>Array(w).fill('_'));
  for(const room of plan.rooms){
    const x=coordinate(room.x,w),y=coordinate(room.y,h),rw=room.w,rh=room.h;
    check(x>=1&&y>=1&&Number.isInteger(rw)&&Number.isInteger(rh)&&rw>=1&&rh>=1&&x+rw<w&&y+rh<h,'房间必须在画布边界内留出一格墙壁');
    for(let b=y;b<y+rh;b++)for(let a=x;a<x+rw;a++)grid[b][a]='.';
  }
  const floor=grid.map(row=>row.slice());
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(floor[y][x]==='.')
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(grid[y+dy]?.[x+dx]==='_')grid[y+dy][x+dx]='#';
  const used=new Set();
  const feature=(p,t)=>{
    const x=coordinate(p.x,w),y=coordinate(p.y,h),k=`${x},${y}`;
    check(grid[y][x]==='#'&&!used.has(k),'门窗或出口必须位于不同的墙格上');used.add(k);
    if(t==='+')check((grid[y]?.[x-1]==='.'&&grid[y]?.[x+1]==='.')||(grid[y-1]?.[x]==='.'&&grid[y+1]?.[x]==='.'),'内部门必须连接墙壁两侧的地板');
    grid[y][x]=t;
  };
  check(Array.isArray(plan.doors)&&plan.doors.length<=60&&Array.isArray(plan.windows)&&plan.windows.length<=100,'门窗列表无效');
  plan.doors.forEach(p=>feature(p,'+'));plan.windows.forEach(p=>feature(p,'='));
  check(plan.exit&&typeof plan.exit==='object','建筑缺少出口');feature(plan.exit,'E');
  return {grid:grid.map(row=>row.join('')),containers:plan.containers,description:plan.description};
}

export function demoPlan(size='normal') {
  const dimensions={small:[9,8],normal:[18,14],large:[32,24]},[width,height]=dimensions[size];
  const split=Math.floor(width/2),doorY=Math.floor(height/2);
  return {width,height,description:'前厅与后室由一扇门连接，周围有可搜索的储物柜。',
    rooms:[{x:1,y:1,w:split-1,h:height-2},{x:split+1,y:1,w:width-split-2,h:height-2}],
    doors:[{x:split,y:doorY}],windows:[{x:2,y:0}],exit:{x:2,y:height-1},
    containers:[{x:2,y:2,name:'旧工具柜',kind:'柜子'},{x:width-3,y:2,name:'食品货架',kind:'货架'}]};
}
