import {randomAt,sceneryOf} from './environment.js';
const palettes={taiga:['#829d8c','#294f46','#638577'],broadleaf:['#93a578','#416442','#77975d'],jungle:['#65886b','#254e3c','#508451'],coldmeadow:['#b3bb99','#758b75','#d4d7b9'],meadow:['#adb77f','#6d8b56','#d3c78a'],hills:['#ada787','#777f60','#cec5a0'],crags:['#aaa494','#757d7b','#b7b09c'],alpine:['#bac7c5','#738c90','#edf0dc'],snowfield:['#d5ded4','#8da79b','#f1f0dd']};
function poly(g,p,c){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=c;g.fill();}
function oval(g,x,y,rx,ry,c){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=c;g.fill();}
export function sceneryTree(g,x,y,size,e,snow=false){const style=sceneryOf(e),p=palettes[style]??palettes.broadleaf;g.save();g.translate(x,y);g.scale(size,size);oval(g,.04,.15,.18,.07,'#263d3033');g.fillStyle='#79644a';g.fillRect(-.02,-.02,.04,.22);
 if(style==='taiga'||['alpine','snowfield','coldmeadow'].includes(style)||snow){poly(g,[[0,-.36],[-.16,.09],[.16,.09]],p[1]);poly(g,[[0,-.36],[-.16,.09],[-.02,.04]],p[2]);poly(g,[[0,-.45],[-.115,-.12],[.12,-.12]],snow?'#ecedde':p[1]);}
 else {oval(g,.015,-.13,.21,style==='jungle'?.17:.2,p[1]);oval(g,-.085,-.2,.16,.14,p[2]);oval(g,.09,-.25,.15,.13,p[2]);oval(g,-.01,-.29,.13,.1,style==='jungle'?'#83a268':'#a0b67a');if(style==='jungle'){g.strokeStyle='#9aac73';g.lineWidth=.018;g.beginPath();g.moveTo(.17,-.14);g.quadraticCurveTo(.3,.12,.12,.15);g.stroke();}}
 g.restore();}
// The tile code remains the collision/terrain authority. Scenery only changes art.
export function scenicTerrain(g,t,x,y,seed,neighbor,e){if(!['f','h','n','.'].includes(t))return false;const style=sceneryOf(e),p=palettes[style]??palettes.meadow,r=i=>randomAt(seed+':art',x*31+i,y*29-i);g.fillStyle=t==='n'?palettes.snowfield[0]:t==='h'?(palettes[style]??palettes.crags)[0]:p[0];g.fillRect(0,0,1,1);
 // Edges soften towards known neighboring clearings without revealing hidden tiles.
 if(t==='f')for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(neighbor?.(x+dx,y+dy)==='.'){const grad=g.createLinearGradient(dx===1?1:0,dy===1?1:0,dx===1?.68:dx===-1?.32:0,dy===1?.68:dy===-1?.32:0);grad.addColorStop(0,'#c7c89a99');grad.addColorStop(1,'#c7c89a00');g.fillStyle=grad;g.fillRect(dx===1?.68:0,dy===1?.68:0,dx?.32:1,dy?.32:1);}
 for(let i=0;i<10;i++){const a=r(i),b=r(i+15);g.strokeStyle=t==='n'?'#a5bab355':'#4f694a40';g.lineWidth=.012;g.beginPath();g.moveTo(a,b);g.lineTo(a+.025,b-.04);g.stroke();}
 if(t==='f'){const dense=style==='jungle'?7:5;for(let i=0;i<dense;i++)sceneryTree(g,.13+r(i)*.75,.38+r(i+6)*.5,.45+r(i+12)*.4,e);}
 if(t==='n'){for(let i=0;i<3;i++)oval(g,r(i),r(i+4),.2,.075,'#f1f2e477');if(r(9)>.6)sceneryTree(g,.6,.6,.65,{scenery:'taiga'},true);}
 if(t==='.'){if(style==='coldmeadow')for(let i=0;i<3;i++)oval(g,r(i),r(i+3),.12,.05,'#e6e6ce88');else for(let i=0;i<4;i++)oval(g,r(i),r(i+5),.013,.015,i%2?'#e6d79c':'#c8d8b0');}
 if(t==='h'){
  if(style==='hills'){g.fillStyle='#a9ae88';g.fillRect(0,0,1,1);for(let level=y-1;level<=y+2;level++){const curve=u=>level-y+.18*Math.sin((x+u)*1.45+level*.85);g.beginPath();g.moveTo(0,curve(0));for(let i=1;i<=16;i++)g.lineTo(i/16,curve(i/16));g.lineTo(1,curve(1)+.16);for(let i=16;i>=0;i--)g.lineTo(i/16,curve(i/16)+.16);g.closePath();g.fillStyle='#6c805630';g.fill();g.beginPath();g.moveTo(0,curve(0));for(let i=1;i<=16;i++)g.lineTo(i/16,curve(i/16));g.strokeStyle='#d7d5aa';g.lineWidth=.026;g.stroke();}}
  else {const mountain=style==='alpine'?palettes.alpine:palettes.crags,west=neighbor?.(x-1,y)==='h',east=neighbor?.(x+1,y)==='h',peak=.28+r(3)*.32;poly(g,[[0,west?.45:.86],[peak,.16],[1,east?.45:.9],[1,1],[0,1]],mountain[1]);poly(g,[[0,west?.45:.86],[peak,.16],[peak+.09,.72],[.27,1],[0,1]],mountain[2]);poly(g,[[peak,.16],[peak+.09,.72],[1,east?.45:.9]],'#65787488');if(style==='alpine')poly(g,[[peak,.16],[peak-.19,.47],[peak-.06,.4],[peak+.05,.5],[peak+.18,.43]],'#f4f3e5');g.strokeStyle='#505e5a77';g.lineWidth=.018;g.beginPath();g.moveTo(peak+.13,.57);g.lineTo(.83,.87);g.stroke();}
 }
 return true;}
