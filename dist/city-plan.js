import {westNeighbourDetailBlocks} from './west-neighbourhood-data.js';
import {citySurveyProgress} from './city-survey-progress.js';
import {citySurfaceRoads,cityExperienceBounds} from './city-extension.js';
import {cityPlanScope,cityPlanGroups,cityPlanRegions,cityPlanAnchors,cityPlanTiles,cityPlanStatusText} from './city-plan-data.js';
import {mapData} from './map-data.js';
import {qixiangSurvey,qixiangBoundary,qixiangCourts,qixiangSolids} from './qixiang-block-data.js';
import {civicDetailBlocks} from './civic-sites-data.js';

export function drawCityPlan(canvas,selected='all'){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=48,scale=Math.min((w-pad*2)/9000,(h-pad*2)/9000);
  const xy=([x,z])=>[pad+(x+5000)*scale,pad+(z+2500)*scale];
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#152024';ctx.fillRect(0,0,w,h);
  ctx.save();ctx.beginPath();ctx.rect(pad,pad,9000*scale,9000*scale);ctx.clip();
  for(const tile of cityPlanTiles){
    const [x,z,r,b]=tile.boundsLocal,[px,py]=xy([x,z]);
    const primary=tile.regions[0],group=cityPlanGroups.find(g=>g.id===primary[0]);
    ctx.globalAlpha=(selected==='all'||tile.regions.includes(selected)) ? .46 : .1;ctx.fillStyle=group.color;
    ctx.fillRect(px,py,(r-x)*scale-1,(b-z)*scale-1);
  }
  ctx.globalAlpha=1;
  function path(points,color,width,dash=[]){
    ctx.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
  }
  for(const [type,, ,points] of citySurfaceRoads)if(!['path','footway','steps'].includes(type))path(points,'#bdc9c044',.7);
  for(const points of mapData.rail)path(points,'#a0b2bd',1,[3,3]);
  path([...cityPlanScope.boundary,cityPlanScope.boundary[0]],'#e1ece4',1.6);
  path(mapData.wall,'#ffe2a5',3);
  if(selected==='all'||selected==='C03')path([...qixiangBoundary,qixiangBoundary[0]],'#fff4c4',3);
  if(selected==='all'||selected==='C04')for(const block of [...civicDetailBlocks,...westNeighbourDetailBlocks])path([...block.boundary,block.boundary[0]],'#b5e8ee',2);
  const [l,t,r,b]=cityExperienceBounds;path([[l,t],[r,t],[r,b],[l,b],[l,t]],'#e4e7dc',1,[7,5]);
  ctx.font='600 13px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const region of cityPlanRegions){
    if(selected!=='all'&&region.id!==selected)continue;
    const [x,y]=xy(region.anchor),group=cityPlanGroups.find(g=>g.id===region.id[0]);
    ctx.fillStyle='#172125';ctx.fillRect(x-21,y-11,42,22);ctx.strokeStyle=group.color;ctx.strokeRect(x-21,y-11,42,22);ctx.fillStyle='#f2f2e7';ctx.fillText(region.id,x,y);
  }
  ctx.font='12px "PingFang SC",sans-serif';ctx.textAlign='left';
  for(const a of cityPlanAnchors){const [x,y]=xy(a.position);ctx.fillStyle='#ffe1a1';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.fillText(a.name,x+6,y+15);}
  ctx.restore();ctx.font='12px "PingFang SC",sans-serif';ctx.textAlign='left';
  ctx.fillStyle='#e9ede4';ctx.fillText('北 ↑',w-70,24);ctx.fillText('500 m / 格 · 分区示意，非卫星底图',20,h-14);
  ctx.fillStyle='#b9c6bd';ctx.fillText('虚线：当前三维地图边界',20,22);
  return {xy,scale,pad};
}
export function attachCityPlanUI({pause,visitSmallSouth,visitQixiang,visitCivic,visitNeighbour}){
  const get=id=>document.getElementById(id),dialog=get('city-plan-dialog'),canvas=get('city-plan-map'),list=get('city-plan-list'),detail=get('city-plan-detail');
  let selected='all';
  function refresh(){
    drawCityPlan(canvas,selected);list.replaceChildren();
    for(const region of cityPlanRegions){
      const row=document.createElement('button');row.type='button';row.setAttribute('aria-pressed',String(selected===region.id));
      const strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=`${region.id} ${region.name}`;
      small.textContent=region.id==='C03'?`${cityPlanStatusText[region.status]} · 七号巷北侧已单独细化，待验收`:`${cityPlanStatusText[region.status]} · 扩建楼体 ${citySurveyProgress.regions[region.id]?.buildings??0} 段，细节待完善`;
      row.append(strong,small);row.addEventListener('click',()=>{selected=region.id;refresh();});list.append(row);
    }
    detail.replaceChildren();
    const region=cityPlanRegions.find(r=>r.id===selected),intro=document.createElement('p');
    intro.textContent=region?`${region.id} ${region.scope}。验收：待实景与用户检查。`:`共 25 个片区、${cityPlanTiles.length} 个固定核对格。覆盖数量不代表细节完成，当前按完整子区块逐一完善房屋、院落、通路和生活设施。`;
    detail.append(intro);
    if(selected==='all'||selected==='C04')for(const [i,block] of civicDetailBlocks.entries()){
      const note=document.createElement('p'),visit=document.createElement('button');note.textContent=`${block.id} ${block.name}：${block.buildings} 处楼体与院内道路、绿化、设施已单独细化；高度及细节含估算，待用户验收。`;
      visit.type='button';visit.textContent=`查看${block.name}`;visit.addEventListener('click',()=>{dialog.close();visitCivic?.(i);});detail.append(note,visit);
    }
    if(selected==='all'||selected==='C04')for(const [i,block] of westNeighbourDetailBlocks.entries()){
      const note=document.createElement('p'),visit=document.createElement('button');note.textContent=`${block.id} ${block.name}：${block.buildings} 处楼体，含沿街底商、内部通道与绿化；卫星判读及估算，待验收。`;
      visit.type='button';visit.textContent=`查看${block.name}`;visit.addEventListener('click',()=>{dialog.close();visitNeighbour?.(i);});detail.append(note,visit);
    }
    if(selected==='all'||selected==='C03'){
      const note=document.createElement('p'),visit=document.createElement('button');
      note.textContent=`${qixiangSurvey.id} 七号巷北侧：本次按完整街坊细化 ${qixiangCourts.length} 个院落建模单元、${qixiangSolids.length} 段主房及附房。其他街坊尚未达到同样细节，验收待确认。`;
      visit.type='button';visit.textContent='查看七号巷精细区块';visit.addEventListener('click',()=>{dialog.close();visitQixiang();});detail.append(note,visit);
    }
    const tiles=region?cityPlanTiles.filter(t=>t.regions.includes(region.id)):[];
    for(const tile of tiles){const a=document.createElement('a');a.href=tile.satelliteURL;a.target='_blank';a.rel='noopener';a.textContent=`${tile.id} · ${citySurveyProgress.tiles[tile.id]?'已有 '+citySurveyProgress.tiles[tile.id]+' 段楼体，待校核':'待逐格核对'} ↗`;detail.append(a);}
    get('city-plan-visit').hidden=selected!=='B02';
  }
  get('city-plan-open').disabled=false;
  get('city-plan-open').addEventListener('click',()=>{pause();refresh();dialog.showModal();});
  get('city-plan-all').addEventListener('click',()=>{selected='all';refresh();});
  get('city-plan-visit').addEventListener('click',()=>{dialog.close();visitSmallSouth();});
  get('city-plan-export').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({scope:cityPlanScope,regions:cityPlanRegions,tiles:cityPlanTiles,anchors:cityPlanAnchors,detailedBlocks:[{...qixiangSurvey,boundary:qixiangBoundary,courts:qixiangCourts.length,buildings:qixiangSolids.length},...civicDetailBlocks,...westNeighbourDetailBlocks]},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='平遥全城分区清单.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  return {refresh};
}
