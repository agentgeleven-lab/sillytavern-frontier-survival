// Only formatting is normalized. Never pad, truncate or replace terrain cells.
export function readTerrain(rows,size,allowed){
  if(!Array.isArray(rows)||rows.length!==size)throw Error(`区域地图需要 ${size} 行地形，实际收到 ${Array.isArray(rows)?rows.length:'非数组'}。`);
  const errors=[],result=rows.map((row,y)=>{
    const normalize=t=>t.normalize('NFKC').toLowerCase();
    let chars;
    if(Array.isArray(row)){
      if(!row.every(t=>typeof t==='string'&&[...normalize(t).trim()].length===1)){errors.push(`第 ${y+1} 行：数组中的每格必须是单个地形字符`);return '';}
      chars=row.map(t=>normalize(t).trim());
    }else if(typeof row==='string'){
      const cleaned=normalize(row).trim();
      // Commas are accepted only as separators between single-character cells.
      chars=cleaned.includes(',')&&cleaned.split(',').every(t=>[...t.trim()].length===1)?cleaned.split(',').map(t=>t.trim()):[...cleaned.replace(/\s/g,'')];
    }else{errors.push(`第 ${y+1} 行：需要字符串或单字符数组`);return '';}
    if(chars.length!==size)errors.push(`第 ${y+1} 行：需要 ${size} 格，实际 ${chars.length} 格`);
    const bad=chars.flatMap((c,x)=>allowed.includes(c)?[]:[`${x+1}列=${JSON.stringify(c)}`]);
    if(bad.length)errors.push(`第 ${y+1} 行：不支持的地形字符（${bad.slice(0,4).join('，')}）`);
    return chars.join('');
  });
  if(errors.length)throw Error(`区域地图格式不正确（${size}×${size}）：${errors.slice(0,4).join('；')}${errors.length>4?`；另有 ${errors.length-4} 项错误`:''}。允许字符：${allowed.join(' ')}。未生成新区域，原存档不变。`);
  return result;
}
