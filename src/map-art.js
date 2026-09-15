import {TERRAINS,key,cell,localMap,visible} from './engine.js';
import {RESOURCES} from './field-data.js';
import {randomAt} from './environment.js';

const colors={'.':'#a6af81',f:'#7e956d',r:'#9fa47e',w:'#6d9a9d',h:'#a39a82',s:'#c9ba90',n:'#c3d0c1',m:'#8eaa89',a:'#b5aa75',u:'#aaa591'};
function path(g,points,fill,stroke){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(fill){g.closePath();g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}}
function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function tree(g,x,y,k=1,snow=false){g.save();g.translate(x,y);g.scale(k,k);ellipse(g,.035,.115,.15,.065,'#354b3833');g.fillStyle='#716a4c';g.fillRect(-.013,.02,.026,.15);path(g,[[0,-.22],[-.13,.04],[.13,.04]],snow?'#76958a':'#3d654d');path(g,[[0,-.3],[-.105,-.06],[.105,-.06]],snow?'#e1e5ce':'#597e59');path(g,[[0,-.3],[0,-.07],[-.105,-.06]],snow?'#b9d0bf':'#739066');g.restore();}
function rock(g,x,y,k=1){g.save();g.translate(x,y);g.scale(k,k);path(g,[[-.2,.1],[-.12,-.08],[.04,-.15],[.18,-.01],[.24,.12]],'#7a7e71');path(g,[[-.12,-.08],[.04,-.15],[.02,.08],[-.2,.1]],'#bfc1a3');g.restore();}
function roof(g,large=false){g.lineWidth=.018;g.lineCap='butt';ellipse(g,.55,.63,.36,.23,'#3c433b33');g.fillStyle='#d2c3a0';g.fillRect(.21,.34,.59,.38);path(g,[[.12,.38],[.5,.14],[.88,.38],[.5,.61]],large?'#879a91':'#ad7758','#5f6957');path(g,[[.12,.38],[.5,.14],[.5,.61]],large?'#697f79':'#916447');g.strokeStyle='#f0d8a366';for(let i=0;i<3;i++){g.beginPath();g.moveTo(.24+i*.09,.32-i*.06);g.lineTo(.5+i*.09,.48-i*.06);g.stroke();}g.fillStyle='#4a5747';g.fillRect(.59,.6,.11,.14);g.fillStyle='#807254';g.fillRect(.65,.17,.07,.16);}
function pointArt(g,kind){g.lineWidth=.02;
  if(kind==='cave'||kind==='overlook'){rock(g,.5,.51,1.8);if(kind==='cave')ellipse(g,.54,.63,.14,.12,'#344b41');}
  else if(kind==='spring'){ellipse(g,.5,.52,.31,.21,'#c6ceb0');ellipse(g,.5,.52,.24,.14,'#71a9ac');g.strokeStyle='#d2e7ce';g.beginPath();g.ellipse(.5,.51,.14,.07,0,0,Math.PI*2);g.stroke();}
  else if(kind==='grove'||kind==='driftwood'){g.strokeStyle='#78684d';g.lineWidth=.075;g.beginPath();g.moveTo(.22,.68);g.lineTo(.72,.33);g.moveTo(.49,.49);g.lineTo(.45,.28);g.stroke();}
  else if(kind==='berries'){for(const [x,y]of [[.3,.56],[.5,.42],[.7,.54]]){ellipse(g,x,y,.15,.13,'#547a51');ellipse(g,x+.03,y-.04,.025,.025,'#b77963');ellipse(g,x-.055,y,.025,.025,'#b77963');}}
  else if(kind==='reeds'){g.strokeStyle='#686e41';g.lineWidth=.018;for(let i=0;i<7;i++){const x=.2+i*.09;g.beginPath();g.moveTo(x,.8);g.lineTo(x-.03,.28+(i%3)*.08);g.stroke();g.fillStyle='#9b8653';g.fillRect(x-.055,.21+(i%3)*.08,.05,.14);}}
  else {ellipse(g,.5,.52,.32,.24,'#c0c49b');g.strokeStyle='#8c9c6c';g.beginPath();g.ellipse(.5,.52,.26,.18,0,0,Math.PI*2);g.stroke();}
}
function camp(g){g.lineWidth=.02;path(g,[[.27,.78],[.54,.3],[.91,.78]],'#ddc38b','#817451');path(g,[[.54,.3],[.66,.78],[.91,.78]],'#b78d61');path(g,[[.4,.78],[.54,.48],[.61,.78]],'#5d694f');}
function terrain(g,t,x,y,seed,neighbor){
  g.fillStyle=colors[t]??colors['.'];g.fillRect(0,0,1,1);g.lineWidth=.012;
  const r=i=>randomAt(seed,x*17+i,y*19-i);
  // Quiet grain, stable across redraws. No downloaded art or emoji glyphs.
  for(let i=0;i<8;i++){g.fillStyle=i%2?'#f2e7bf18':'#314c3320';g.fillRect(r(i),r(i+12),.02+r(i+20)*.065,.014);}
  if(t==='f'||t==='n'){for(let i=0;i<(t==='f'?5:2);i++)tree(g,.14+r(i)*.72,.3+r(i+5)*.53,.5+r(i+10)*.4,t==='n');}
  if(t==='h'){for(let i=0;i<3;i++){g.strokeStyle='#cec5a06b';g.beginPath();g.ellipse(.5,.5,.23+i*.09,.13+i*.08,-.4,0,Math.PI*2);g.stroke();}rock(g,.45,.48,1.4);rock(g,.77,.73,.7);}
  if(t==='w'){g.strokeStyle='#bed4bc88';for(let i=0;i<3;i++){g.beginPath();g.moveTo(.1,.25+i*.26);g.bezierCurveTo(.4,.16+i*.26,.6,.34+i*.26,.89,.25+i*.26);g.stroke();}}
  if(t==='s'){g.strokeStyle='#e9d7aa88';for(let i=0;i<3;i++){g.beginPath();g.ellipse(.3,.5+i*.18,.65,.22,-.3,Math.PI,Math.PI*2);g.stroke();}}
  if(t==='m')pointArt(g,'reeds');
  if(t==='a'){g.strokeStyle='#827b4f';g.lineWidth=.026;for(let i=0;i<6;i++){g.beginPath();g.moveTo(.1+i*.15,.05);g.lineTo(.06+i*.15,.95);g.stroke();}g.strokeStyle='#cebe84';g.lineWidth=.012;g.strokeRect(.05,.04,.89,.92);}
  if(t==='u'){g.strokeStyle='#cac2a066';g.strokeRect(.13,.13,.74,.74);}
  if(t==='r'){
    const ends=[[0,-1,.5,0],[1,0,1,.5],[0,1,.5,1],[-1,0,0,.5]].filter(([dx,dy])=>neighbor?.(x+dx,y+dy)==='r');
    g.lineCap='round';for(const [width,color]of [[.46,'#74765f'],[.36,'#c6b992']]){g.strokeStyle=color;g.lineWidth=width;g.beginPath();for(const[,,a,b]of ends){g.moveTo(.5,.5);g.lineTo(a,b);}if(!ends.length){g.moveTo(.4,.5);g.lineTo(.6,.5);}g.stroke();}
  }
}
function fog(g,x,y,seed){g.fillStyle='#d1d0bb';g.fillRect(0,0,1,1);g.strokeStyle='#969d7d20';g.lineWidth=.008;for(let i=0;i<3;i++){g.beginPath();g.moveTo(0,.15+i*.32);g.bezierCurveTo(.25,.03+i*.32,.62,.3+i*.32,1,.15+i*.32);g.stroke();}g.fillStyle='#74816a33';if(randomAt(seed,x,y)>.6)g.fillRect(.48,.48,.024,.024);}
function indoor(g,map,x,y){const t=map.grid[y][x];g.fillStyle=t==='_'?'#d1d0bb':'#c4b38e';g.fillRect(0,0,1,1);g.lineWidth=.016;if(t==='_')return;
  g.strokeStyle='#927c5a55';for(let i=0;i<4;i++){g.beginPath();g.moveTo(0,i*.25);g.lineTo(1,i*.25);g.moveTo((i%2)*.45+.2,i*.25);g.lineTo((i%2)*.45+.2,(i+1)*.25);g.stroke();}
  if(t==='#'||t==='='){g.fillStyle='#707968';g.fillRect(0,0,1,1);g.fillStyle='#afac91';g.fillRect(.04,.03,.92,.68);g.strokeStyle='#777d6680';g.strokeRect(.04,.03,.92,.68);g.beginPath();g.moveTo(.5,.03);g.lineTo(.5,.36);g.moveTo(0,.36);g.lineTo(1,.36);g.stroke();}
  if(t==='='){g.fillStyle='#729d9f';g.fillRect(.13,.19,.74,.35);g.strokeStyle='#dde1c3';g.strokeRect(.13,.19,.74,.35);g.beginPath();g.moveTo(.5,.19);g.lineTo(.5,.54);g.stroke();}
  if(t==='+'){g.fillStyle='#886c48';if(map.doors[key(x,y)]){g.fillRect(.04,.06,.09,.75);g.strokeStyle='#7d795a';g.setLineDash([.05,.04]);g.beginPath();g.arc(.08,.06,.76,0,Math.PI/2);g.stroke();g.setLineDash([]);}else{g.fillRect(.06,.39,.88,.2);g.fillStyle='#b3a079';g.fillRect(.1,.4,.8,.05);ellipse(g,.78,.51,.025,.025,'#e9cb77');}}
  if(t==='E'){g.fillStyle='#71947c';g.fillRect(.08,.08,.84,.84);path(g,[[.5,.16],[.23,.48],[.41,.48],[.41,.77],[.59,.77],[.59,.48],[.77,.48]],'#e6e7c3');}
  const c=map.containers[key(x,y)];if(c){g.fillStyle='#4d503d44';g.fillRect(.19,.24,.74,.68);g.fillStyle=c.searched?'#968565':'#9f7850';g.fillRect(.12,.12,.72,.7);g.strokeStyle='#dcc095';g.strokeRect(.16,.16,.64,.62);if(/箱/.test(c.kind)){path(g,[[.2,.23],[.76,.71]],null,'#d7b788');path(g,[[.76,.23],[.2,.71]],null,'#d7b788');}else{for(const i of [.35,.58]){g.beginPath();g.moveTo(.16,i);g.lineTo(.79,i);g.stroke();g.fillStyle='#e3cc97';g.fillRect(.4,i+.07,.17,.028);}}}
}
function outdoor(g,s,map,x,y){
  const c=cell(s),t=map.grid[y][x],cave=map.kind==='cave';
  // Ground and obstacles have separate visual roles: walkable forest is a clearing, not a tree icon.
  terrain(g,cave?'u':['f','m'].includes(c.terrain)?'.':c.terrain,x,y,s.seed);
  if(cave){g.fillStyle='#4b514d88';g.fillRect(0,0,1,1);}
  if(t==='#'){if(!cave&&['f','.','m','a'].includes(c.terrain)){g.fillStyle='#69805b';g.fillRect(0,0,1,1);tree(g,.35,.58,1.3);tree(g,.72,.65,1.1);}else{g.fillStyle=cave?'#424c46':'#918c74';g.fillRect(0,0,1,1);rock(g,.48,.52,2);rock(g,.78,.79,.8);}}
  if(t==='E'){g.fillStyle='#d4c69c';g.fillRect(.12,.12,.76,.76);path(g,[[.5,.8],[.22,.48],[.41,.48],[.41,.2],[.59,.2],[.59,.48],[.78,.48]],'#46674f');if(!cave&&c.camp)camp(g);}
  for(const p of map.portals)if(p.x===x&&p.y===y){if(p.kind==='cave')pointArt(g,'cave');else roof(g,c.site?.size==='large');}
  const o=map.containers[key(x,y)];if(o){const n=c.resources.nodes[o.resourceId];g.save();if(!n.remaining)g.globalAlpha=.32;const art=RESOURCES[n.kind].art;if(art==='stone')rock(g,.5,.52,1.7);else pointArt(g,art);g.restore();if(!n.remaining){g.strokeStyle='#6b705c';g.lineWidth=.035;g.beginPath();g.moveTo(.28,.72);g.lineTo(.72,.28);g.stroke();}}
}
function prepare(canvas){const b=canvas.parentElement.getBoundingClientRect();if(b.width<1||b.height<1)return null;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);canvas.style.width=b.width+'px';canvas.style.height=b.height+'px';const g=canvas.getContext('2d');g.scale(dpr,dpr);g.fillStyle='#e2deca';g.fillRect(0,0,b.width,b.height);return {g,b};}
function marker(g,x,y,r){ellipse(g,x,y,r*1.2,r*1.2,'#fff0c2');ellipse(g,x,y,r,r,'#385c49');path(g,[[x,y-r*.65],[x-r*.5,y+r*.5],[x,y+r*.17],[x+r*.5,y+r*.5]],'#f5e7b5');}
export function paintMap(canvas,s,{pan,selection,mapLevel}){
  const v=prepare(canvas);if(!v)return null;const {g,b}=v,map=mapLevel==='building'?localMap(s):null,w=map?.w??s.world.size,h=map?.h??s.world.size,p=map?s.player.local:s.player,unit=(pan.fit?Math.min((b.width-48)/w,(b.height-48)/h):48)*pan.zoom,ox=b.width/2-(pan.fit?w/2:p.x+.5)*unit+pan.x,oy=b.height/2-(pan.fit?h/2:p.y+.5)*unit+pan.y;
  const neighbor=(x,y)=>cell(s,x,y)?.known?cell(s,x,y).terrain:null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    g.save();g.translate(ox+x*unit,oy+y*unit);g.scale(unit,unit);g.beginPath();g.rect(0,0,1,1);g.clip();const c=map?null:cell(s,x,y),known=map?map.seen[key(x,y)]:c.known;
    if(!known)fog(g,x,y,s.seed);else if(map){if(map.kind)outdoor(g,s,map,x,y);else indoor(g,map,x,y);if(!visible(map,s.player.local,x,y)){g.fillStyle='#47584366';g.fillRect(0,0,1,1);}}
    else {terrain(g,c.terrain,x,y,s.seed,neighbor);if(c.site)roof(g,c.site.size==='large');else if(c.poi)pointArt(g,c.poi.kind);if(c.camp)camp(g);}
    g.strokeStyle='#59694d12';g.lineWidth=.008;g.strokeRect(0,0,1,1);
    if(!map&&s.clues.some(c=>!c.revoked&&c.x===x&&c.y===y))ellipse(g,.84,.16,.07,.07,'#b68b42');
    if(selection?.x===x&&selection?.y===y){g.strokeStyle='#f8edc6';g.lineWidth=.07;g.strokeRect(.045,.045,.91,.91);g.strokeStyle='#58764f';g.lineWidth=.025;g.strokeRect(.045,.045,.91,.91);}g.restore();
  }
  marker(g,ox+(p.x+.5)*unit,oy+(p.y+.5)*unit,Math.max(5,unit*.15));
  g.fillStyle='#66765c';g.font='10px monospace';g.textAlign='center';for(let x=0;x<w;x++)g.fillText(String(x),ox+(x+.5)*unit,oy-8);for(let y=0;y<h;y++)g.fillText(String(y),ox-13,oy+(y+.55)*unit);
  return {unit,ox,oy};
}
export function paintAtlas(canvas,s,{pan,selection}){
  const v=prepare(canvas);if(!v)return null;const {g,b}=v,unit=150*pan.zoom,ox=b.width/2-(s.atlas.x+.5)*unit+pan.x,oy=b.height/2-(s.atlas.y+.5)*unit+pan.y;
  for(let y=Math.floor(-oy/unit);y<Math.ceil((b.height-oy)/unit);y++)for(let x=Math.floor(-ox/unit);x<Math.ceil((b.width-ox)/unit);x++){
    const a=s.atlas.regions[key(x,y)],px=ox+x*unit,py=oy+y*unit,here=x===s.atlas.x&&y===s.atlas.y,selected=selection?.x===x&&selection?.y===y;
    g.save();g.beginPath();g.rect(px+3,py+3,unit-6,unit-6);g.clip();
    if(a){const n=a.thumbnail?.length??5,u=unit/n;for(let j=0;j<n;j++)for(let i=0;i<n;i++){g.save();g.translate(px+i*u,py+j*u);g.scale(u,u);const t=a.thumbnail?.[j]?.[i]??a.terrain;if(t==='?')fog(g,i,j,s.seed);else terrain(g,t,i,j,`${s.seed}:${x},${y}`,(cx,cy)=>a.thumbnail?.[cy]?.[cx]);g.restore();}
      for(const p of a.landmarks??[]){g.save();g.translate(px+p.x*unit/a.size,py+p.y*unit/a.size);g.scale(unit/a.size,unit/a.size);if(p.kind==='building')roof(g);else if(p.kind==='camp')camp(g);else pointArt(g,p.kind);g.restore();}
      g.fillStyle='#304d3fdd';g.fillRect(px,py+unit-31,unit,31);g.fillStyle='#f0e7c7';g.font=`${Math.min(13,unit*.095)}px sans-serif`;g.textAlign='center';g.fillText(a.name,px+unit/2,py+unit-12,unit-16);
    }else{g.save();g.translate(px,py);g.scale(unit,unit);fog(g,x,y,s.seed);g.restore();if(selected){g.fillStyle='#68795e';g.font='12px sans-serif';g.textAlign='center';g.fillText('未知疆域',px+unit/2,py+unit*.45);g.font='11px monospace';g.fillText(`${x}, ${y}`,px+unit/2,py+unit*.62);}}
    g.restore();g.strokeStyle=here?'#5c7653':selected?'#b19255':'#87957444';g.lineWidth=here?3:selected?2:1;g.strokeRect(px+3,py+3,unit-6,unit-6);if(here)marker(g,px+unit*.5,py+unit*.46,9);
  }
  g.fillStyle='#5d7058';g.font='12px serif';g.textAlign='right';g.fillText('N ↑',b.width-18,26);
  return {unit,ox,oy};
}
