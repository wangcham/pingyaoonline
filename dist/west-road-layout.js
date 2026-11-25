import {mapData} from './map-data.js';
import {segments,projectOnSegment,sample} from './geography.js';

export const shunchengCarriageways=mapData.shunchengWays.flatMap(segments);
export function nearestShuncheng(point){
  return shunchengCarriageways.map(line=>({line,...projectOnSegment(point,line)}))
    .reduce((a,b)=>a.distance<b.distance?a:b);
}
// End the inferred access at the asphalt edge, not at the main-road centerline.
const accessInside=[-1538,36],nearAccess=nearestShuncheng(accessInside);
const accessProjection=sample(nearAccess.line,nearAccess.t);
const accessNormal=accessInside.map((v,i)=>(v-accessProjection[i])/nearAccess.distance);
export const yufengAccessEdge=accessProjection.map((v,i)=>v+accessNormal[i]*4.8);
export const yufengAccessOpening={line:nearAccess.line,center:yufengAccessEdge,halfWidth:4};
export function atYufengAccess(x,z){
  const {line,center,halfWidth}=yufengAccessOpening;
  const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
  return Math.abs((x-center[0])*dx+(z-center[1])*dz)<halfWidth
    && Math.abs((x-center[0])*dz-(z-center[1])*dx)<4.5;
}
