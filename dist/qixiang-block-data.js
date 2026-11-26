import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {pointInRing,segments,projectOnSegment,createRingQuery} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {citySurfaceRoads} from './city-extension.js';

// C03-01 is a small, bounded work parcel, not the whole C03 planning region.
// Image interpretation: 1280x720, north up, zoom 19. No imagery is redistributed.
export const qixiangSurvey={id:'C03-01',name:'七号巷北侧 · 院落街坊',checked:'2026-11-26',imageryDate:null,
 center:[112.16373440475463,37.1994],zoom:19,viewport:[1280,720],
 sources:['https://www.amap.com/ssr/embed/view?lng=112.1647&lat=37.1984&zoom=18&maptype=satellite&platform=pc','https://www.amap.com/ssr/embed/view?lng=112.16373440475463&lat=37.1989554892591&zoom=19&maptype=satellite&platform=pc','https://www.amap.com/ssr/embed/view?lng=112.16373440475463&lat=37.1994&zoom=19&maptype=satellite&platform=pc'],
 accuracy:'巷道围合与屋顶组团按放大卫星图判读；户界、附房分割、层高和门口位置为近似。门窗、空调、车辆、晾衣和花盆为参考性街景构件，不是逐户实拍。',
 status:'detailed-model-awaiting-review',acceptance:'pending'};
export function qixiangImagePoint(u,v){
 const [lon,lat]=qixiangSurvey.center,size=256*2**qixiangSurvey.zoom,cy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
 return geographicToLocal([lon+(u-640)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-360)/size))))*180/Math.PI],'GCJ-02');
}
// Street-aligned image coordinates. The corners follow the block inside the
// northern perimeter lane and 七号巷; no translation to make the model fit.
const qixiangPixelOrigin=[151,348],qixiangPixelAngle=.176;
export function qixiangPoint(u,v){const c=Math.cos(qixiangPixelAngle),s=Math.sin(qixiangPixelAngle);return qixiangImagePoint(qixiangPixelOrigin[0]+u*c+v*s,qixiangPixelOrigin[1]-u*s+v*c);}
const qixiangO=qixiangPoint(0,0),qixiangE=qixiangPoint(100,0),qixiangS=qixiangPoint(0,100);
export const qixiangScale=Math.hypot(qixiangE[0]-qixiangO[0],qixiangE[1]-qixiangO[1])/100;
export const qixiangAngle=-Math.atan2(qixiangE[1]-qixiangO[1],qixiangE[0]-qixiangO[0]);
export const qixiangBoundary=[[0,0],[881,0],[881,304],[0,304]].map(p=>qixiangPoint(...p));
const qixiangBoundaryQuery=createRingQuery(qixiangBoundary);
export function isQixiangBlock(x,z,pad=0){return qixiangBoundaryQuery.contains(x,z,pad);}

// Six visible roof/yard bands. Each band has separately noted row extents and
// roof colors; pair divisions below are inferred household-scale modelling.
// [left,right, [[top,bottom,roof pair,second floor?],...]] in aligned image px.
const qixiangBands=[
 [7,139,[[7,58,'red,gray'],[66,119,'blue,gray'],[127,182,'light,red'],[190,244,'gray,light'],[252,298,'gray,gray']]],
 [153,300,[[5,60,'light,gray'],[68,121,'gray,gray'],[129,183,'light,gray'],[191,245,'gray,gray'],[253,298,'blue,gray']]],
 [315,445,[[6,60,'gray,gray'],[68,122,'gray,gray'],[130,184,'gray,gray'],[192,245,'gray,gray'],[253,298,'light,gray',2]]],
 [459,592,[[5,59,'blue,gray'],[67,120,'gray,gray'],[128,181,'gray,gray'],[191,243,'gray,gray'],[251,298,'blue,blue']]],
 [607,739,[[6,59,'gray,light'],[67,121,'light,gray',2],[129,183,'light,gray'],[191,245,'gray,gray'],[253,298,'gray,gray']]],
 [753,874,[[6,60,'gray,light'],[68,122,'gray,gray'],[130,184,'gray,gray'],[192,245,'gray,gray'],[253,298,'gray,gray']]],
];
export const qixiangRoofColors={gray:'#77786e',blue:'#587486',light:'#bbb7a4',red:'#936256'};
const qixiangPublicClearance=createRoadClearance(citySurfaceRoads.map(r=>['footway','path','pedestrian','cycleway','steps','trunk','motorway'].includes(r[0])?['primary',...r.slice(1)]:r));
export const qixiangCourts=[],qixiangOmitted=[];
for(const [band,[left,right,rows]] of qixiangBands.entries())for(const [row,[top,bottom,colors,upper]] of rows.entries()){
 const mid=(left+right)/2;
 for(const half of [0,1]){
  const l=half?mid+.55:left,r=half?right:mid-.55,w=(r-l)*qixiangScale,d=(bottom-top)*qixiangScale;
  const [x,z]=qixiangPoint((l+r)/2,(top+bottom)/2),ring=clearanceRect(x,z,w,d,qixiangAngle);
  const q={id:`C03-01-${band+1}-${row+1}-${half+1}`,band,row,half,x,z,w,d,angle:qixiangAngle,ring,
   levels:upper&&half===0?2:1,roof:colors.split(',')[half],wing:half?'east':'west',
   layout:(band+row+half)%3,gateOffset:half?-w*.03:w*.03,hasCanopy:band===0&&row===2&&half===1,
   coordinate:localToGeographic([x,z]),crs:'WGS84',estimated:true,footprintSource:qixiangSurvey.sources[2],footprintMethod:'satellite-roof-band-with-inferred-household-division'};
  if(!qixiangPublicClearance.clear(ring)){qixiangOmitted.push({...q,reason:'mapped-road-envelope'});continue;}
  qixiangCourts.push(q);
 }
}
// Explicit longitudinal access passages and narrow cross passages connect each
// south-facing courtyard gate to the perimeter. These are not invented shops.
export const qixiangLanes=[
 ...[146,307.5,452,599.5,746].map(u=>({points:[qixiangPoint(u,-12),qixiangPoint(u,317)],width:2.4,kind:'access'})),
 ...[63,124,187,248].map(v=>({points:[qixiangPoint(-10,v),qixiangPoint(892,v)],width:1.15,kind:'passage'})),
 {points:[qixiangPoint(-11,-12),qixiangPoint(892,-12)],width:3.5,kind:'perimeter'},
 {points:[qixiangPoint(-11,317),qixiangPoint(892,317)],width:4,kind:'perimeter'},
 {points:[qixiangPoint(-11,-12),qixiangPoint(-11,317)],width:3,kind:'perimeter'},
 {points:[qixiangPoint(892,-12),qixiangPoint(892,317)],width:3,kind:'perimeter'},
];
// Non-overlapping lane polygons: a junction owns one surface, not two coplanar
// asphalt/paving strips. Also subtract existing mapped carriageways exactly.
function qixiangPolygonArea(ring){return Math.abs(ring.reduce((a,p,i)=>{const q=ring[(i+1)%ring.length];return a+p[0]*q[1]-p[1]*q[0];},0))/2;}
function qixiangSubtract(subject,clip){
 if(!clearancePolygonsOverlap(subject,clip))return [subject];
 const winding=Math.sign(clip.reduce((a,p,i)=>{const q=clip[(i+1)%clip.length];return a+p[0]*q[1]-p[1]*q[0];},0)),out=[];let rest=subject;
 for(let e=0;e<clip.length&&rest.length>=3;e++){
  const a=clip[e],b=clip[(e+1)%clip.length],distance=p=>winding*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
  function half(inside){const result=[];for(let i=0;i<rest.length;i++){const p=rest[i],q=rest[(i+1)%rest.length],pd=distance(p)*(inside?1:-1),qd=distance(q)*(inside?1:-1);if(pd>=0)result.push(p);if((pd>=0)!==(qd>=0)){const t=pd/(pd-qd);result.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return result;}
  const outside=half(false),inside=half(true);if(outside.length>=3&&qixiangPolygonArea(outside)>.001)out.push(outside);rest=inside;
 }
 return out;
}
export const qixiangLaneSurfaces=[];
const qixiangPreviousLaneRings=[];
for(const lane of qixiangLanes){
 const [a,b]=lane.points,dx=b[0]-a[0],dz=b[1]-a[1],ring=clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(dx,dz),lane.width,-Math.atan2(dz,dx));
 const obstacles=[...qixiangPreviousLaneRings,...qixiangPublicClearance.conflicts(ring).map(r=>r.ring)];let pieces=[ring];
 for(const obstacle of obstacles)pieces=pieces.flatMap(p=>qixiangSubtract(p,obstacle));
 qixiangLaneSurfaces.push(...pieces.map(ring=>({ring,kind:lane.kind})));qixiangPreviousLaneRings.push(ring);
}
export const qixiangSolids=[];
// Geometry envelopes used by both renderer and audit. Walls, doors and props
// are kept inside the admitted yard. Eaves have a reserved 0.35 m margin.
for(const q of qixiangCourts){
 const mainD=Math.min(4.7,q.d*.40),c=Math.cos(q.angle),s=Math.sin(q.angle);
 function part(role,u,v,w,d,levels,roof){const x=q.x+u*c+v*s,z=q.z-u*s+v*c;
  qixiangSolids.push({id:q.id+'-'+role,parent:q.id,role,x,z,w,d,angle:q.angle,levels,height:levels*3.05+.8,roof,
   ring:clearanceRect(x,z,w,d,q.angle,.32),buildingType:'residential',heightSource:'satellite-morphology-estimate',confidence:.3,estimated:true,coordinate:localToGeographic([x,z]),crs:'WGS84',footprintSource:q.footprintSource});}
 part('main',0,-q.d/2+mainD/2+.4,q.w-.8,mainD,q.levels,q.roof);
 const wingD=Math.max(2.4,q.d-mainD-3.82),wingW=Math.min(2.8,q.w*.22),side=q.wing==='west'?-1:1;
 part('wing',side*(q.w/2-wingW/2-.4),-q.d/2+mainD+wingD/2+1.12,wingW,wingD,1,q.layout===1?'blue':q.roof);
 if(q.layout!==2&&q.d>11.5){const annW=q.w*.34;part('annex',-side*(q.w/2-annW/2-.4),q.d/2-1.6,annW,2.3,1,q.layout===1?'light':'gray');}
}
export function qixiangPublicClear(ring){return qixiangPublicClearance.clear(ring);}
export function qixiangSolidClear(ring){return !qixiangSolids.some(p=>clearancePolygonsOverlap(ring,p.ring));}

// Subtract only the focused parcel from old approximate roof rows. Keep the
// remaining ends, instead of removing a whole row beyond the work boundary.
export function subtractQixiangBlock(p){
 if(!clearancePolygonsOverlap(clearanceRect(p.x,p.z,p.w,p.d,p.angle),qixiangBoundary))return [p];
 const c=Math.cos(p.angle),s=Math.sin(p.angle),local=qixiangBoundary.map(([x,z])=>[(x-p.x)*c-(z-p.z)*s,(x-p.x)*s+(z-p.z)*c]);
 const l=Math.max(-p.w/2,Math.min(...local.map(v=>v[0]))-.5),r=Math.min(p.w/2,Math.max(...local.map(v=>v[0]))+.5),t=Math.max(-p.d/2,Math.min(...local.map(v=>v[1]))-.5),b=Math.min(p.d/2,Math.max(...local.map(v=>v[1]))+.5);
 return [[-p.w/2,l,-p.d/2,p.d/2],[r,p.w/2,-p.d/2,p.d/2],[l,r,-p.d/2,t],[l,r,b,p.d/2]].flatMap(([a,b,c0,d],i)=>{
  if(b-a<4||d-c0<3)return [];
  const u=(a+b)/2,v=(c0+d)/2,x=p.x+u*c+v*s,z=p.z-u*s+v*c;
  return [{...p,id:p.id+'-outside-detail-'+i,x,z,w:b-a,d:d-c0,coordinate:localToGeographic([x,z])}];
 });
}
const qixiangVisit=qixiangPoint(452,317),qixiangLook=qixiangPoint(452,187),qixiangCenter=qixiangPoint(440,150);
export const qixiangStops=[
 {name:'C03-01 七号巷北侧 · 院落入口',keywords:'精细区块 七号巷 内部 院落 后街 细节 C03-01',address:'七号巷北侧居住街坊 · 院落与生活细节近似',eye:[qixiangVisit[0],2.1,qixiangVisit[1]],target:[qixiangLook[0],2,qixiangLook[1]]},
 {name:'C03-01 七号巷北侧 · 整块俯瞰',keywords:'精细区块 七号巷 内部 全景 C03-01',address:'约 210 × 72 米工作区 · 不代表整个 C03 完成',eye:[qixiangCenter[0],110,qixiangCenter[1]+105],target:[qixiangCenter[0],0,qixiangCenter[1]]},
];
