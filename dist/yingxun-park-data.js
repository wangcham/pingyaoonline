import {mapData} from './map-data.js';
import {pointInRing,segments,projectOnSegment,createRingQuery} from './geography.js';
import {westLinkImagePoint} from './west-link-survey.js';

const yingxunTrace=pixels=>pixels.map(p=>westLinkImagePoint('gate',...p));
const originalYingxunBoundary=yingxunTrace([[69,443],[96,390],[155,346],[218,321],[316,328],[392,295],[419,236],[476,221],[571,218],[612,204],[650,202],[666,213],[736,202],[801,253],[846,258],[925,226],[1028,200],[1210,166],[1240,375],[1185,394],[1050,419],[991,439],[820,476],[650,510],[491,544],[320,579],[106,618],[41,630]]);
const smallSouthTrace=pixels=>pixels.map(p=>westLinkImagePoint('smallSouth',...p));
// Extend the same park surface west to the actual street beside the southwest
// corner. One outline and one planting plan prevent overlapping grass/trees.
export const yingxunParkBoundary=[
  ...smallSouthTrace([[528,399],[572,381],[629,363],[684,344],[748,323],[792,314],[830,318],[862,342],[884,351],[915,347],[951,322],[978,290],[989,258],[998,234],[1005,214],[1018,191]]),
  ...originalYingxunBoundary.slice(2,26),
  ...smallSouthTrace([[1010,427],[800,465],[549,509]]),
];
export const smallSouthGateStop={name:'B02 小南门 · 城墙绿带',keywords:'小南门 南城墙 西南角 康宁路 绿化 B02',
  address:'小南门至西南角连续绿带 · 影像判读近似',eye:[-603,3.1,940],target:[-600,4,841]};
const yingxunBoundaryQuery=createRingQuery(yingxunParkBoundary);
export function isYingxunPark(x,z,radius=0){return yingxunBoundaryQuery.contains(x,z,radius);}
function parkCircle(u,v,r,n=64){return yingxunTrace(Array.from({length:n},(_,i)=>[u+Math.cos(i*2*Math.PI/n)*r,v+Math.sin(i*2*Math.PI/n)*r]));}
export const yingxunClearings=[
  {name:'城门前广场',ring:yingxunTrace([[568,221],[650,214],[738,203],[727,232],[686,258],[645,267],[604,250]])},
  {name:'东侧圆形广场',ring:parkCircle(1030,289,49)},
  {name:'西侧休憩广场',ring:parkCircle(308,422,22)},
  {name:'南侧圆形节点',ring:parkCircle(699,433,19)},
  {name:'小南门停车硬地',ring:smallSouthTrace([[1014,291],[1053,286],[1068,365],[1027,377]])},
];
export const yingxunPonds=mapData.areas.filter(([kind,ring])=>kind==='water'&&ring.some(p=>pointInRing(...p,yingxunParkBoundary))).map(([,ring])=>ring);
const yingxunClearingQueries=yingxunClearings.map(p=>createRingQuery(p.ring)),yingxunPondQueries=yingxunPonds.map(createRingQuery),yingxunWallQuery=createRingQuery(mapData.wall);
const yingxunBounds=[Math.min(...yingxunParkBoundary.map(p=>p[0])),Math.min(...yingxunParkBoundary.map(p=>p[1])),Math.max(...yingxunParkBoundary.map(p=>p[0])),Math.max(...yingxunParkBoundary.map(p=>p[1]))];
export const yingxunParkPaths=[...mapData.roads.map(([type,width,,points])=>({type,width,points})),...mapData.water.map(([width,points])=>({type:'water',width,points}))]
  .flatMap(({type,width,points})=>segments(points).map(line=>({line,width,type})))
  .filter(({line:{start:a,end:b},width})=>Math.max(a[0],b[0])+width>=yingxunBounds[0]&&Math.min(a[0],b[0])-width<=yingxunBounds[2]&&Math.max(a[1],b[1])+width>=yingxunBounds[1]&&Math.min(a[1],b[1])-width<=yingxunBounds[3]);
export function canPlantYingxun(x,z,clearance=3){
  if(!yingxunBoundaryQuery.contains(x,z)||yingxunWallQuery.contains(x,z))return false;
  if(yingxunClearingQueries.some(q=>q.contains(x,z,clearance)))return false;
  if(yingxunPondQueries.some(q=>q.contains(x,z,clearance)))return false;
  if(yingxunParkPaths.some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+clearance))return false;
  // Keep the actual gate opening and its approach visible and walkable.
  if(Math.abs(x+71.5)<20&&z<720)return false;
  return !mapData.buildings.some(([, ,ring])=>pointInRing(x,z,ring));
}
let yingxunPlantingCache;
export function planYingxunPlanting(){
  if(yingxunPlantingCache)return yingxunPlantingCache;
  const trees=[],shrubs=[],xs=yingxunParkBoundary.map(p=>p[0]),zs=yingxunParkBoundary.map(p=>p[1]);
  // Deterministic density approximation within image-observed green land only.
  // Trunks are not surveyed tree positions. No camera-dependent regeneration.
  for(let z=Math.min(...zs)+8;z<Math.max(...zs);z+=17)for(let x=Math.min(...xs)+8;x<Math.max(...xs);x+=17){
    const hash=(Math.imul(Math.round(x),73856093)^Math.imul(Math.round(z),19349663))>>>0;
    const px=x+(hash%11-5)*.65,pz=z+((hash>>>4)%11-5)*.65;
    if(!canPlantYingxun(px,pz,3.2))continue;
    trees.push({x:px,z:pz,height:6.2+hash%24/10,crown:5.8+hash%17/10,base:.04,estimated:true});
    if(hash%5===0&&canPlantYingxun(px+4,pz+3,2))shrubs.push({x:px+4,z:pz+3,width:2.3,height:.8});
  }
  yingxunPlantingCache={trees,shrubs};return yingxunPlantingCache;
}
