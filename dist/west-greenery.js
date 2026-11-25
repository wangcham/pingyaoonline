import {mapData} from './map-data.js';
import {segments,sample,projectOnSegment,pointInRing} from './geography.js';
import {westGroundHeight} from './west-terrain.js';
import {isWestDistrictParcel} from './west-district.js';
import {createUrbanBatch} from './urban-batch.js';
import {createTreeBatch} from './vegetation.js';
import {westGreenSurvey} from './west-green-survey.js';
import {westBlockAlleys} from './west-block-data.js';

export const westGreeneryEvidence={
  status:'approximate',
  route:'现有 OpenStreetMap 下西关街道路；从下西门外至景林江米油糕附近',
  imagery:'Esri 请求返回 HTTP 403；随后已在高德网页查看卫星影像，核对连续铺房及路口建筑关系。道路边有树带，但未逐株测绘树位，树种及花池仍为示意。',
  survey:westGreenSurvey,
  source:'https://www.openstreetmap.org/way/792912478',
};
const greenRoute=segments(mapData.lowerWestRoad);
const greenJunctions=[-1959.6,-1527.5,-1206.8];
const greenEntrances=[{x:-1888,half:8},{x:-1858,half:16},{x:-1450,half:14}];
const greenAlleyEdges=westBlockAlleys.flatMap(segments);
function greenBayClear(x,z,margin=0){
  return !greenJunctions.some(k=>Math.abs(x-k)<24+margin)
    && !greenAlleyEdges.some(line=>projectOnSegment([x,z],line).distance<3.7+margin)
    && !greenEntrances.some(e=>Math.abs(x-e.x)<e.half+margin)
    && !isWestDistrictParcel(x,z,1+margin)
    && !mapData.buildings.some(([,,ring])=>pointInRing(x,z,ring)||segments([...ring,ring[0]]).some(edge=>projectOnSegment([x,z],edge).distance<1.3+margin));
}
export function isWestGreenCorridor(x,z){
  return x>=-1910&&x<=-1190&&greenRoute.some(s=>projectOnSegment([x,z],s).distance<15);
}
export function planWestGreenery(){
  const trees=[],beds=[];
  // Repeated bays describe streetscape character, not a claim of surveyed tree positions.
  for(const s of greenRoute){
    const dx=(s.end[0]-s.start[0])/s.length,dz=(s.end[1]-s.start[1])/s.length;
    for(let along=5;along<s.length-3;along+=13.5){
      const [cx,cz]=sample(s,along/s.length);
      if(cx<-1910||cx>-1237||greenJunctions.some(x=>Math.abs(cx-x)<24)||greenEntrances.some(e=>Math.abs(cx-e.x)<e.half))continue;
      for(const side of [-1,1]){
        const x=cx-dz*side*6.25,z=cz+dx*side*6.25;
        if(!greenBayClear(x,z))continue;
        // Do not place a second bay where adjoining route segments meet.
        if(trees.some(p=>Math.hypot(p.x-x,p.z-z)<9))continue;
        const variant=trees.length%5;
        trees.push({x,z,angle:-Math.atan2(dz,dx),side,height:6.2+variant*.28,crown:3.6+variant*.17});
        const bx=x+dx*3.6,bz=z+dz*3.6;
        if(variant%2===0&&greenBayClear(bx,bz,1.2))beds.push({x:bx,z:bz,angle:-Math.atan2(dz,dx),length:2.1,width:.85});
      }
    }
  }
  return {trees,beds};
}
export function addWestGreenery(scene){
  const plan=planWestGreenery(),a=createUrbanBatch(scene,{ground:westGroundHeight});
  const vegetation=createTreeBatch(scene,{ground:westGroundHeight});
  function planter(x,z,w,d,angle){
    a.box('#747c72',x,.32,z,w,.18,d,angle);
    a.box('#585349',x,.43,z,w-.16,.06,d-.16,angle);
    for(const side of [-1,1]){
      a.box('#a2a294',x+Math.cos(angle)*side*w/2,.48,z-Math.sin(angle)*side*w/2,.12,.25,d,angle);
      a.box('#a2a294',x+Math.sin(angle)*side*d/2,.48,z+Math.cos(angle)*side*d/2,w,.25,.12,angle);
    }
  }
  for(const [i,p] of plan.trees.entries()){
    const {x,z,angle}=p;
    planter(x,z,1.35,1.05,angle);
    vegetation.tree(p,i);
    for(const side of [-1,1])a.part('stem','#73684e',x+side*.42,1.2,z,.07,1.7,.07);
    a.box('#69604d',x,1.9,z,1.05,.09,.08);
  }
  for(const p of plan.beds){
    planter(p.x,p.z,p.length,p.width,p.angle);
    for(const shift of [-.65,0,.65]){
      const x=p.x+shift*Math.cos(p.angle),z=p.z-shift*Math.sin(p.angle);
      vegetation.shrub(x,z,.85,.62);
    }
  }
  // Small movable planters at the two sides of the school forecourt, away from its gate.
  for(const [x,z] of [[-1876,149],[-1840,145]]){
    planter(x,z,2.6,1.1,0);
    for(const dx of [-.8,0,.8])vegetation.shrub(x+dx,z,1,.8);
  }
  const group=a.finish();group.name='下西关街至景林江米油糕绿化（位置近似）';
  group.add(vegetation.finish());
  group.userData={approximate:true,treeCount:plan.trees.length,bedCount:plan.beds.length+2,evidence:westGreeneryEvidence};
  return group;
}
