// Coordinate-based geography is fixed before a model supplies local details.
export const BIOMES={forest:'森林',grassland:'草原',wetland:'湿地',mountain:'山地',coast:'海岸',desert:'荒漠',tundra:'寒原',rainforest:'雨林'};
export const LAND_USE={wilderness:'无人荒野',rural:'农村',town:'小镇',suburb:'城市郊区',city:'城市',industrial:'工业区'};
export const NATURAL_POINTS={clearing:'林间空地',spring:'泉眼',berries:'野果丛',cave:'岩洞',overlook:'观景岩台',driftwood:'漂流木滩',reeds:'芦苇丛',grove:'枯木林'};
export function randomAt(seed,x,y){let h=2166136261;for(const c of `${seed}:${x},${y}`)h=Math.imul(h^c.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}
export function noise(seed,x,y,scale=8){const ax=Math.floor(x/scale),ay=Math.floor(y/scale),u=x/scale-ax,v=y/scale-ay,s=u*u*(3-2*u),t=v*v*(3-2*v),a=randomAt(seed,ax,ay),b=randomAt(seed,ax+1,ay),c=randomAt(seed,ax,ay+1),d=randomAt(seed,ax+1,ay+1);return (a+(b-a)*s)*(1-t)+(c+(d-c)*s)*t;}
export function environmentAt(seed,x,y,theme='waste'){
  const heat=noise(seed+':heat',x,y,24),moisture=noise(seed+':rain',x,y,11),height=noise(seed+':height',x,y,9);
  const climate=heat<.25?'寒冷':heat>.7?(moisture<.4?'干旱':'热带'):'温带';
  const biome=height>.77?'mountain':height<.2?'coast':climate==='寒冷'?'tundra':climate==='干旱'?'desert':climate==='热带'?'rainforest':moisture>.7?'wetland':moisture>.43?'forest':'grassland';
  // Sparse anchors produce a settlement core, outskirts and rural fringe.
  let landUse='wilderness',distance=Infinity,anchor=null;
  const mx=Math.floor(x/16),my=Math.floor(y/16);
  for(let j=my-1;j<=my+1;j++)for(let i=mx-1;i<=mx+1;i++){
    if(randomAt(seed+':occupied',i,j)>(theme==='wild'?.45:.85))continue;
    const cx=i*16+3+Math.floor(randomAt(seed+':cx',i,j)*10),cy=j*16+3+Math.floor(randomAt(seed+':cy',i,j)*10),d=Math.hypot(x-cx,y-cy);
    if(d<distance){distance=d;anchor={x:cx,y:cy,urban:randomAt(seed+':urban',i,j)>.5};}
  }
  if(anchor&&height>=.2&&height<=.77){
    if(distance<1)landUse=anchor.urban?'city':'town';
    else if(distance<2)landUse=anchor.urban?(randomAt(seed+':industry',x,y)<.22?'industrial':'suburb'):'rural';
    else if(distance<3.4)landUse='rural';
  }
  const natural=landUse==='wilderness',condition=natural?'自然演替':theme==='wild'?'留存聚落':randomAt(seed+':condition',x,y)<.65?'废弃':'破损';
  const baseTerrain={forest:'f',rainforest:'f',grassland:'.',wetland:'m',mountain:'h',coast:'s',desert:'s',tundra:'n'}[biome];
  const allowedPoints={forest:['grove','berries','clearing'],rainforest:['grove','spring','clearing'],grassland:['berries','clearing','spring'],wetland:['reeds','grove','spring'],mountain:['cave','overlook','spring'],coast:['driftwood','overlook','spring'],desert:['cave','overlook','spring'],tundra:['grove','overlook','cave']}[biome];
  const allowedTerrains={forest:'f.hwm',rainforest:'f.wmh',grassland:'.fhwm',wetland:'mw.f',mountain:'h.fw',coast:'sw.fh',desert:'sh.w',tundra:'nhw.'}[biome]+(natural?'':'rau');
  return {version:1,climate,biome,landUse,condition,baseTerrain,allowedTerrains,moisture:Math.round(moisture*100),elevation:Math.round(height*100),buildingRange:{wilderness:[0,0],rural:[1,4],town:[4,8],suburb:[4,9],city:[8,16],industrial:[3,7]}[landUse],allowedPoints};
}
export const environmentLabel=e=>e?`${e.climate} · ${BIOMES[e.biome]} · ${LAND_USE[e.landUse]}`:'原有区域';
export const knownEnvironment=e=>e?{climate:e.climate,biome:e.biome,landUse:e.landUse,condition:e.condition}:null;
export function habitatFor(e){return {version:1,habitat:{biome:e.biome,climate:e.climate,waterAvailability:e.moisture,humanDisturbance:e.landUse==='wilderness'?'low':'high'},entities:{}};}
export function validateEnvironment(e){if(!e||e.version!==1||!Object.hasOwn(BIOMES,e.biome)||!Object.hasOwn(LAND_USE,e.landUse)||!['寒冷','干旱','热带','温带'].includes(e.climate))throw Error('环境资料无效');}
export function validateEcology(e){if(!e||e.version!==1||!e.habitat||!Object.hasOwn(BIOMES,e.habitat.biome)||!e.entities||Array.isArray(e.entities))throw Error('栖息地资料无效');if(Object.keys(e.entities).length)throw Error('当前版本尚不支持生物实体');}
