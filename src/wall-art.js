import {drawSprite} from './assets.js';
export const DIRECTIONS=[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]];
const structure=t=>['#','+','=','E'].includes(t);
export const wallMask=(at,x,y)=>DIRECTIONS.reduce((m,[dx,dy,bit])=>m|(structure(at(x+dx,y+dy))?bit:0),0);
// Axis names describe the wall span; passage is perpendicular to that span.
export function openingAxis(at,x,y,fallback='horizontal'){
 const m=wallMask(at,x,y),h=(m&10)===10,v=(m&5)===5;
 if(h&&!v)return 'horizontal';if(v&&!h)return 'vertical';
 const floor=t=>t==='.'||t==='E';
 if(floor(at(x,y-1))&&floor(at(x,y+1)))return 'horizontal';
 if(floor(at(x-1,y))&&floor(at(x+1,y)))return 'vertical';
 return (m&10)&&!(m&5)?'horizontal':(m&5)&&!(m&10)?'vertical':fallback;
}
export function validateOpenings(grid,containers=[]){
 const at=(x,y)=>grid[y]?.[x],occupied=new Set(containers.map(c=>`${c.x},${c.y}`));
 for(let y=0;y<grid.length;y++)for(let x=0;x<grid[y].length;x++){
  const t=at(x,y);if(t!=='+'&&t!=='=')continue;
  const m=wallMask(at,x,y);
  if(m!==5&&m!==10)throw Error(`门窗 (${x},${y}) 必须位于直墙段，不能放在墙角、丁字或十字交叉点`);
  if(t==='+')for(const[dx,dy]of m===10?[[0,-1],[0,1]]:[[-1,0],[1,0]])
   if(at(x+dx,y+dy)!=='.'||occupied.has(`${x+dx},${y+dy}`))throw Error(`门 (${x},${y}) 两侧需要无家具阻挡的通行地板`);
 }
}
// One compound fill: neighboring arm edges meet at exactly 0/1 without seams.
export function wallRects(mask){return [[.32,.32,.36,.36],...(mask&1?[[.32,0,.36,.32]]:[]),...(mask&2?[[.68,.32,.32,.36]]:[]),...(mask&4?[[.32,.68,.36,.32]]:[]),...(mask&8?[[0,.32,.32,.36]]:[])];}
export function drawWall(g,at,x,y,{tile=at(x,y),open=false,wood=false,fallback='horizontal'}={}){
 g.save();g.lineWidth=.018;
 if(tile==='#'){
  g.beginPath();for(const r of wallRects(wallMask(at,x,y)))g.rect(...r);g.clip();
  g.fillStyle=wood?'#9b805a':'#90917f';g.fillRect(0,0,1,1);drawSprite(g,wood?'wood':'brick',0,0,1,1,{fill:true,alpha:.65});
 }else{
  if(openingAxis(at,x,y,fallback)==='vertical'){g.translate(1,0);g.rotate(Math.PI/2);}
  g.fillStyle=wood?'#9b805a':'#90917f';g.fillRect(0,.32,.18,.36);g.fillRect(.82,.32,.18,.36);
  g.strokeStyle='#615f4c';g.strokeRect(.14,.3,.055,.4);g.strokeRect(.805,.3,.055,.4);
  if(tile==='='){g.fillStyle='#87b5b8';g.fillRect(.195,.4,.61,.2);g.strokeStyle='#e7e8cf';g.strokeRect(.195,.4,.61,.2);g.beginPath();g.moveTo(.5,.4);g.lineTo(.5,.6);g.stroke();}
  else if(open){g.fillStyle='#9d774e';g.fillRect(.195,.48,.08,.49);g.strokeStyle='#8d886b';g.setLineDash([.035,.03]);g.beginPath();g.arc(.195,.48,.61,0,Math.PI/2);g.stroke();}
  else{g.fillStyle='#9d774e';g.fillRect(.195,.43,.61,.14);g.fillStyle='#c6ac7b';g.fillRect(.23,.44,.54,.03);g.fillStyle='#e8cf84';g.fillRect(.71,.51,.035,.025);}
 }g.restore();
}
export function wallSVG(at,x,y,{tile=at(x,y),open=false,fallback='horizontal'}={}){
 if(tile==='#')return `<svg width="40" height="40" viewBox="0 0 1 1" aria-hidden="true"><path fill="#a38a60" d="${wallRects(wallMask(at,x,y)).map(([x,y,w,h])=>`M${x} ${y}h${w}v${h}h-${w}Z`).join(' ')}"/></svg>`;
 const vertical=openingAxis(at,x,y,fallback)==='vertical';return `<svg width="40" height="40" viewBox="0 0 1 1" aria-hidden="true"><g transform="${vertical?'translate(1 0) rotate(90)':''}"><path d="M0 .32H.18V.68H0ZM.82 .32H1V.68H.82Z" fill="#a38a60"/><path d="M.16 .3V.7M.84 .3V.7" stroke="#5f5c48" stroke-width=".05"/><rect x=".2" y="${open?.48:.43}" width="${open?.08:.6}" height="${open?.49:.14}" fill="#946c42"/>${open?'<path d="M.8 .48A.6 .6 0 0 1 .2 1" fill="none" stroke="#8d886b" stroke-width=".015" stroke-dasharray=".04 .03"/>':'<circle cx=".72" cy=".52" r=".025" fill="#eacf85"/>'}</g></svg>`;
}
