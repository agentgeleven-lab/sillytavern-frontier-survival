export const NEIGHBORS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
export function touching(a,b,blocked=()=>false){
 if(!a||!b)return false;const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);if(Math.max(dx,dy)>1)return false;
 return !dx||!dy||(!blocked(a.x,b.y)&&!blocked(b.x,a.y));
}
export function doorTouch(a,b,blocked,wallAt){
 if(touching(a,b,blocked))return true;
 if(!a||!b||Math.abs(a.x-b.x)!==1||Math.abs(a.y-b.y)!==1)return false;
 const horizontal=wallAt(b.x-1,b.y)&&wallAt(b.x+1,b.y),vertical=wallAt(b.x,b.y-1)&&wallAt(b.x,b.y+1);
 // A straight door frame is allowed beside the reach; its actual approach side must be clear.
 return horizontal&&!vertical&&!blocked(b.x,a.y)||vertical&&!horizontal&&!blocked(a.x,b.y);
}
export function localTouch(map,a,b){if(!map)return false;const blocked=(x,y)=>{
 const t=map.grid[y]?.[x],c=map.containers?.[`${x},${y}`];return !(['.','E'].includes(t)||t==='+'&&map.doors?.[`${x},${y}`])||!!c&&!c.removed;
};return map.grid[b?.y]?.[b?.x]==='+'?doorTouch(a,b,blocked,(x,y)=>['#','+','=','E'].includes(map.grid[y]?.[x])):touching(a,b,blocked);}
export function contactDistance(map,a,b){if(!a||!b)return Infinity;const distance=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);return localTouch(map,a,b)?Math.min(1,distance):distance;}
