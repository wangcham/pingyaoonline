import {mapData} from './map-data.js';
import {segments,projectOnSegment,pointInRing} from './geography.js';
import {geographicToLocal} from './landmarks/coordinates.js';
import {landmarkRecords,orientedParcel} from './landmarks/data.js';
import {buildingRoadClearance,clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';

// POI anchors use GCJ-02 conversion once. Facades and temple dimensions remain
// photo-based approximations; ordinary trade boards do not assert real tenants.
export const oldTownStreetRoutes=mapData.roads.filter(r=>['南大街','衙门街','书院街'].includes(r[2]));
export const wuTemple={name:'武庙',position:geographicToLocal([112.180893,37.198661],'GCJ-02'),angle:.24,w:28,d:98};
wuTemple.ring=orientedParcel(wuTemple.position,wuTemple.w,wuTemple.d,wuTemple.angle);
const oldStreetLines=oldTownStreetRoutes.flatMap(([,width,name,path])=>segments(path).map(line=>({line,width,name})));
const oldProtectedRings=landmarkRecords.filter(p=>p.ring).map(p=>p.ring);
const oldMappedRings=mapData.buildings.map(b=>b[2]).filter(r=>!clearancePolygonsOverlap(r,wuTemple.ring));
export const oldTownFrontages=[];
for(const {line,width,name} of oldStreetLines){
 const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
 for(let distance=5.2;distance<line.length-4;distance+=9.2)for(const side of [-1,1]){
  const variant=(Math.round(distance)+oldTownFrontages.length*3)%7,w=8.35,d=name==='南大街'?9.3:7.8,offset=width/2+2.1+d/2;
  const x=line.start[0]+dx*distance-dz*offset*side,z=line.start[1]+dz*distance+dx*offset*side,angle=-Math.atan2(dz,dx)+(side>0?Math.PI:0);
  const ring=clearanceRect(x,z,w+.7,d+2.1,angle);
  if(!ring.every(p=>pointInRing(...p,mapData.wall))||!buildingRoadClearance.clear(ring))continue;
  if([...oldProtectedRings,wuTemple.ring,...oldMappedRings,...oldTownFrontages.map(p=>p.ring)].some(r=>clearancePolygonsOverlap(ring,r)))continue;
  oldTownFrontages.push({x,z,w,d,angle,variant,street:name,ring,height:variant===2||variant===5?6.3:4.05+(variant%3)*.28});
 }
}
export function oldTownDetailIntersects(ring){return [wuTemple.ring,...oldTownFrontages.map(p=>p.ring)].some(r=>clearancePolygonsOverlap(ring,r));}
export function isOldTownDetailParcel(x,z,radius=0){
 return [wuTemple.ring,...oldTownFrontages.map(p=>p.ring)].some(r=>pointInRing(x,z,r)||segments([...r,r[0]]).some(e=>projectOnSegment([x,z],e).distance<radius+.6));
}
export const oldTownDetailStops=[
 {name:'明清街 · 南大街',keywords:'明清一条街 南大街 木门面 灯笼',address:'南大街 · 道路来自地图，门面细节按实景近似',eye:[-171,1.85,254],target:[-192,3.4,165]},
 {name:'县衙 · 衙门街',keywords:'县衙 衙门街 县署',address:'县衙门前 · 灰瓦木构、石阶与沿街店面',eye:[-428,1.85,389],target:[-441,3.2,363]},
 {name:'武庙 · 书院街',keywords:'武庙 关帝庙 书院街',address:'书院街51号 · 高德 POI 定位，建筑尺寸近似',eye:[-615,1.85,727],target:[-619,4.2,705]},
];
