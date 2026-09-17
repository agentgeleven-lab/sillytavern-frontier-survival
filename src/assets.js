import {ATLASES,SPRITES} from './asset-data.js';
const images=new Map(),listeners=new Set();
let queued=false;
function changed(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;for(const fn of listeners)fn();});}
export const assetURL=sheet=>new URL(`../assets/map/${ATLASES[sheet].file}`,import.meta.url).href;
function imageFor(sheet){
 if(images.has(sheet))return images.get(sheet);
 if(typeof Image==='undefined')return null;
 const image=new Image(),entry={image,status:'loading'};images.set(sheet,entry);
 image.onload=()=>{entry.status='ready';changed();};image.onerror=()=>{entry.status='error';changed();};image.src=assetURL(sheet);return entry;
}
export function onAssetsChanged(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function preloadAssets(){Object.keys(ATLASES).forEach(imageFor);}
export function assetStatus(){return Object.fromEntries(Object.keys(ATLASES).map(k=>[k,images.get(k)?.status??'idle']));}
export function drawSprite(g,name,x=0,y=0,w=1,h=1,{fill=false,alpha=1}={}){
 const s=SPRITES[name];if(!s)return false;const a=imageFor(s.atlas);if(a?.status!=='ready')return false;
 const[sx,sy,sw,sh]=s.rect,scale=Math.min(w/sw,h/sh),dw=fill?w:sw*scale,dh=fill?h:sh*scale;
 g.save();g.globalAlpha*=alpha;g.imageSmoothingEnabled=true;g.drawImage(a.image,sx,sy,sw,sh,x+(w-dw)/2,y+(h-dh)/2,dw,dh);g.restore();return true;
}
export function spriteSVG(name,w=40,h=40,{fill=false}={}){
 const s=SPRITES[name];if(!s||imageFor(s.atlas)?.status!=='ready')return '';const a=ATLASES[s.atlas];
 const sw=s.rect[2],sh=s.rect[3],scale=Math.min(w/sw,h/sh),dw=fill?w:sw*scale,dh=fill?h:sh*scale;
 // Match viewport aspect to the source crop: SVG meet letterboxing exposes adjacent atlas cells.
 return `<svg x="${(w-dw)/2}" y="${(h-dh)/2}" width="${dw}" height="${dh}" viewBox="${s.rect.join(' ')}" preserveAspectRatio="none" overflow="hidden" aria-hidden="true"><image href="${assetURL(s.atlas)}" width="${a.width}" height="${a.height}"/></svg>`;
}
export const resourceSprite=n=>n.remaining?({deadwood:'log',stone:'stones',fiber:'reeds'}[n.kind]??n.kind):({berries:'berriesEmpty',deadwood:'stump',stone:'stonesEmpty',fiber:'reedsEmpty',grain:'reedsEmpty',vegetables:'herbEmpty',herb:'herbEmpty'}[n.kind]);
export function containerSprite(c){const suffix=!c.searched?'Closed':Object.values(c.items??{}).some(q=>q>0)?'Open':'Empty';if(/货架|架子|搁架/.test(c.kind))return suffix==='Empty'?'shelfEmpty':'shelfFull';if(/床/.test(c.kind))return 'bed';if(/椅/.test(c.kind))return 'chair';if(/桌/.test(c.kind))return 'table';return (/柜/.test(c.kind)?'cabinet':'crate')+suffix;}
export function buildingSprite(site){const text=`${site?.name??''} ${site?.kind??''}`;for(const[pattern,id]of [[/医院|诊所|医务/,'clinic'],[/工厂|电厂|工业/,'factory'],[/仓库|库房/,'warehouse'],[/商店|超市|商铺/,'shop'],[/废墟|坍塌/,'ruins'],[/公寓|办公|住宅楼/,'apartment'],[/谷仓|粮仓/,'barn'],[/温室/,'greenhouse'],[/车库|汽修/,'garage'],[/农舍|农场|农村/,'farmhouse'],[/林场|护林/,'ranger']])if(pattern.test(text))return id;return site?.size==='large'?'warehouse':site?.size==='normal'?'farmhouse':'cabin';}
export const trapSprite=t=>t.type+(t.checked?'Spent':'');
export const fireSprite=(fire,remaining)=>fire?.lit&&remaining>0?'fireLit':remaining>0?'fireUnlit':'fireAsh';
