import {isWestNeighbourhood,westNeighbourIntersects} from './west-neighbourhood-data.js';
import {regionalSurveyNotes} from './regional-survey-data.js';
import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {mapData} from './map-data.js';
import {citySurfaceRoads} from './city-extension.js';
import {cityExtensionData} from './city-extension-data.js';
import {pointInRing,segments,projectOnSegment,makeGrid,createRingQuery} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {cityPlanScope} from './city-plan-data.js';
import {isSouthCityStudy} from './south-city-survey.js';
import {isWestLinkStudy,splitSurveyRoof} from './west-link-survey.js';
import {isWestInteriorStudy} from './west-block-layout.js';
import {isStreetDetailParcel} from './street-detail.js';
import {isPingyaoSchoolParcel} from './pingyao-school-data.js';
import {isWestSiteParcel} from './west-sites-data.js';
import {civicSiteIntersects} from './civic-sites-data.js';
import {isYingxunPark} from './yingxun-park-data.js';

export const regionalFrames=regionalSurveyNotes.frames;
const regionalFrameLookup=new Map(regionalFrames.map(f=>[f.id,f]));
export function regionalImagePoint(id,u,v){
 const {center:[lon,lat],zoom}=regionalFrameLookup.get(id),size=256*2**zoom,cy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
 return geographicToLocal([lon+(u-640)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-360)/size))))*180/Math.PI],'GCJ-02');
}
// The public POI is the forecourt, NOT the station building centre.
// Detailed roof position was read at zoom 17 (742,570); map below is zoom 16.
export const guchengStationSurvey={center:regionalImagePoint('gucheng-station',691,465),plaza:regionalImagePoint('gucheng-station',643,374),angle:.50,width:116,depth:39,height:17,estimated:true,
 footprintSource:'https://www.amap.com/ssr/embed/view?lng=112.148933&lat=37.157199&zoom=17&maptype=satellite&platform=pc',
 appearanceSource:'https://m.thepaper.cn/newsDetail_forward_33565391',
 note:'站房位置按卫星屋顶核对，外观参考中国铁路官方政务号照片；尺度、高程、台阶和立面细部为近似。'};
export function isGuchengStationParcel(x,z,pad=0){const p=guchengStationSurvey,dx=x-p.center[0],dz=z-p.center[1],c=Math.cos(p.angle),s=Math.sin(p.angle);return Math.abs(dx*c-dz*s)<80+pad&&Math.abs(dx*s+dz*c)<55+pad||Math.hypot(x-p.plaza[0],z-p.plaza[1])<113+pad;}
const regionalWallQuery=createRingQuery(mapData.wall);
export function regionalReserved(x,z,pad=0){
 return isWestNeighbourhood(x,z,pad)||isGuchengStationParcel(x,z,pad)||regionalWallQuery.contains(x,z)||isPingyaoSchoolParcel(x,z,pad)||isWestSiteParcel(x,z,pad)||isYingxunPark(x,z,pad)||isSouthCityStudy(x,z,pad)||isWestLinkStudy(x,z,pad)||isWestInteriorStudy(x,z,pad)||isStreetDetailParcel(x,z,pad);
}
export const regionalSurvey={checked:'2026-11-26',imageryDate:null,crs:'WGS84',sources:regionalFrames,
 attribution:'卫星影像人工判读：高德 / DigitalGlobe & SpaceView；道路：© OpenStreetMap contributors (ODbL)',
 accuracy:'逐段屋顶与重复屋顶组团人工判读；组团内户界、立面、层数、单株树位和地砖均为估算。重复屋顶插值为 observed-row-pattern-estimate，非逐栋测绘。高层层数有估算范围。未将全城标为精确复原。'};
const regionalPalette={field:'#8b9169',soil:'#a99c83',paving:'#aeaca0',green:'#788768',sports:'#728b73'};
const regionalRawGround=regionalSurveyNotes.ground.map((p,i)=>({...p,id:`regional-open-${i}`,ring:p.points.map(v=>regionalImagePoint(p.frame,...v)),color:regionalPalette[p.kind]}));
const regionalCentres=regionalFrames.map(f=>({id:f.id,p:regionalImagePoint(f.id,640,360)}));
const regionalCentreLookup=new Map(regionalCentres.map(f=>[f.id,f.p]));
function regionalHalfPlane(ring,nx,nz,k){const out=[];for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],a=k-p[0]*nx-p[1]*nz,b=k-q[0]*nx-q[1]*nz;if(a>=0)out.push(p);if((a>=0)!==(b>=0)){const t=a/(a-b);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return out;}
function regionalOwnedRing(frame,ring){const a=regionalCentres.find(f=>f.id===frame).p;let r=ring;for(const f of regionalCentres){if(f.id===frame)continue;const b=f.p,nx=b[0]-a[0],nz=b[1]-a[1],k=(b[0]*b[0]+b[1]*b[1]-a[0]*a[0]-a[1]*a[1])/2;r=regionalHalfPlane(r,nx,nz,k);if(r.length<3)return [];}return r;}
const regionalGroundCandidates=regionalRawGround.map(g=>({...g,ring:regionalOwnedRing(g.frame,g.ring)})).filter(g=>g.ring.length>=3&&!westNeighbourIntersects(g.ring)&&!civicSiteIntersects(g.ring)&&!g.ring.some(p=>regionalReserved(...p,1)));
export const regionalOpenGround=[];for(const g of regionalGroundCandidates)if(!regionalOpenGround.some(o=>clearancePolygonsOverlap(g.ring,o.ring)))regionalOpenGround.push(g);
export function regionalSurfaceOwner(x,z){let best=null,distance=Infinity;for(const f of regionalCentres){const d=(x-f.p[0])**2+(z-f.p[1])**2;if(d<distance){distance=d;best=f.id;}}return best;}
export const regionalAlleys=regionalSurveyNotes.lanes.map((p,i)=>({...p,id:`regional-lane-${i}`,points:p.points.map(v=>regionalImagePoint(p.frame,...v)),estimated:true}));
export const regionalClearanceRoads=[...citySurfaceRoads,...regionalAlleys.map(p=>['service',p.width,'影像判读内部通道',p.points]),...mapData.water.map(([w,p])=>['service',w+4,'水体避让',p]),...[...mapData.rail,...cityExtensionData.rail].map(p=>['service',7,'铁路避让',p])];
const regionalRoadList=regionalClearanceRoads;
const regionalClearance=createRoadClearance(regionalRoadList.map(r=>['motorway','motorway_link','trunk','trunk_link','footway','path','pedestrian','steps','cycleway'].includes(r[0])?['primary',...r.slice(1)]:r)),regionalRoadGrid=makeGrid(80),regionalOccupied=makeGrid(80);
const regionalRoadEdges=regionalRoadList.flatMap(([type,width,name,points])=>segments(points).map(line=>({line,width,type,name,ring:clearanceRect((line.start[0]+line.end[0])/2,(line.start[1]+line.end[1])/2,line.length,width+3.4,-Math.atan2(line.end[1]-line.start[1],line.end[0]-line.start[0]))})));
const regionalPublicEdges=citySurfaceRoads.flatMap(([,width,,p])=>segments(p).map(line=>({line,width})));
for(const item of regionalPublicEdges){const {line,width}=item,pad=width/2+25;regionalRoadGrid.add(item,Math.min(line.start[0],line.end[0])-pad,Math.min(line.start[1],line.end[1])-pad,Math.max(line.start[0],line.end[0])+pad,Math.max(line.start[1],line.end[1])+pad);}
export function regionalRoadClear(x,z,radius=0){return !regionalRoadGrid.at(x,z).some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+radius+1);}
let regionalLayoutCache;
export function createRegionalLayout(){
 if(regionalLayoutCache)return regionalLayoutCache;
 const roofs=[],omitted=[],raw=[...regionalSurveyNotes.roofs];
 for(const r of regionalSurveyNotes.runs)for(let i=0;i<r.count;i++)raw.push({...r,u:r.u+r.du*i,v:r.v+r.dv*i});
 const frames=regionalFrameLookup;
 for(const [index,p] of raw.entries()){
  const [x,z]=regionalImagePoint(p.frame,p.u,p.v),a=regionalImagePoint(p.frame,p.u+p.w/2,p.v),b=regionalImagePoint(p.frame,p.u,p.v+p.d/2);
  const item={...p,id:`regional-${p.frame}-${index}`,x,z,w:Math.hypot(a[0]-x,a[1]-z)*2,d:Math.hypot(b[0]-x,b[1]-z)*2,coordinate:localToGeographic([x,z]),crs:'WGS84',estimated:true,footprintEstimated:true,footprintSource:frames.get(p.frame).url,levelsEstimateRange:p.levels>=10?[Math.max(8,p.levels-3),p.levels+4]:[Math.max(1,p.levels-1),p.levels+1]};
  if(!pointInRing(x,z,cityPlanScope.boundary)||regionalReserved(x,z,2)){omitted.push({id:item.id,reason:'existing-or-scope'});continue;}
  const nearby=regionalRoadEdges.filter(e=>Math.max(e.line.start[0],e.line.end[0])+e.width+item.w+item.d>x&&Math.min(e.line.start[0],e.line.end[0])-e.width-item.w-item.d<x&&Math.max(e.line.start[1],e.line.end[1])+e.width+item.w+item.d>z&&Math.min(e.line.start[1],e.line.end[1])-e.width-item.w-item.d<z);
  const pieces=splitSurveyRoof(item,nearby);if(!pieces.length)omitted.push({id:item.id,reason:'road'});
  for(const q of pieces){
   q.ring=clearanceRect(q.x,q.z,q.w,q.d,q.angle);const envelope=clearanceRect(q.x,q.z,q.w,q.d,q.angle,1.5),xs=envelope.map(v=>v[0]),zs=envelope.map(v=>v[1]);
   const others=new Set();for(let xx=Math.floor(Math.min(...xs)/80)*80;xx<=Math.max(...xs);xx+=80)for(let zz=Math.floor(Math.min(...zs)/80)*80;zz<=Math.max(...zs);zz+=80)regionalOccupied.at(xx+.1,zz+.1).forEach(o=>others.add(o));
   const why=westNeighbourIntersects(envelope)||civicSiteIntersects(envelope)||!envelope.every(v=>pointInRing(...v,cityPlanScope.boundary)&&!regionalReserved(...v,1.5))?'existing-or-scope':!regionalClearance.clear(envelope)?'road':regionalRawGround.some(g=>clearancePolygonsOverlap(envelope,g.ring))?'open-ground':[...others].some(o=>clearancePolygonsOverlap(envelope,o.ring))?'overlap':null;
   if(why){omitted.push({id:q.id,reason:why});continue;}
   q.renderFrame=regionalSurfaceOwner(q.x,q.z);roofs.push(q);regionalOccupied.add(q,Math.min(...xs)-8,Math.min(...zs)-8,Math.max(...xs)+8,Math.max(...zs)+8);
  }
 }
 return regionalLayoutCache={roofs,omitted};
}
// Suppress generic roadside masses only where actual replacement geometry exists.
// The whole satellite frame must not erase old models in untraced gaps.
export function isRegionalBuilding(x,z,pad=0){return regionalInRoof(x,z,pad+2);}
export function regionalInRoof(x,z,pad=0){createRegionalLayout();return regionalOccupied.at(x,z).some(p=>{const c=Math.cos(p.angle),s=Math.sin(p.angle),dx=x-p.x,dz=z-p.z;return Math.abs(dx*c-dz*s)<p.w/2+pad&&Math.abs(dx*s+dz*c)<p.d/2+pad;});}
export function regionalFrameContains(id,x,z,pad=0){const p=regionalCentreLookup.get(id),scale=regionalFrameLookup.get(id).zoom===17?1:2;return Math.abs(x-p[0])<610*scale+pad&&Math.abs(z-p[1])<340*scale+pad&&!regionalReserved(x,z,pad);}
export const regionalNames={'west-rail':'平遥站西侧','north-villages':'北城村居','north-gate':'北门外','northeast':'平遥中学北侧','east-gate':'东关街坊','hospital-west':'人民医院与西城新区','west-north':'西城北片','southwest':'西南住宅街坊','southeast':'南城东片','station-link':'古城站连接段','gucheng-station':'平遥古城站','northwest-edge':'西北村居','south-seam':'南城东南接缝'};
export const regionalStops=regionalFrames.map(f=>{const [x,z]=regionalImagePoint(f.id,640,360);return {name:`${regionalNames[f.id]} · 街坊全景`,keywords:`${regionalNames[f.id]} 扩建 全城 街坊 平房 多层 高楼`,address:'按影像判读的街坊 · 建筑轮廓和高度包含估算',eye:[x,230,z+260],target:[x,0,z]};});
regionalStops.push({name:'平遥古城站 · 站前广场',keywords:'高铁 站房 古城站 广场',address:'站房位于广场南侧 · 尺度与细部近似',eye:[guchengStationSurvey.plaza[0],3,guchengStationSurvey.plaza[1]],target:[guchengStationSurvey.center[0],12,guchengStationSurvey.center[1]]});
export function isRegionalSurveyArea(x,z,pad=0){const id=regionalSurfaceOwner(x,z);return regionalFrameContains(id,x,z,pad);}

export function regionalDetailClear(ring){
 if(!regionalClearance.clear(ring)||regionalRawGround.some(g=>clearancePolygonsOverlap(ring,g.ring)))return false;
 const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),items=new Set();
 for(let x=Math.floor(Math.min(...xs)/80)*80;x<=Math.max(...xs);x+=80)for(let z=Math.floor(Math.min(...zs)/80)*80;z<=Math.max(...zs);z+=80)regionalOccupied.at(x+.1,z+.1).forEach(p=>items.add(p));
 return ![...items].some(p=>clearancePolygonsOverlap(ring,p.ring));
}
