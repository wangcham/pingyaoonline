import {jinglinContextRing} from './jinglin-context-data.js';
import {westSiteProtectedRings} from './west-sites-data.js';
import {westLinkBoundary} from './west-link-survey.js';
import {mapData} from './map-data.js';
import {makeGrid,pointInRing,segments,projectOnSegment,sample,createRingQuery} from './geography.js';
import {commercialPlots} from './west-district.js';
import {yufengBlockBoundary} from './yufeng-block.js';
import {planWestFrontages} from './west-corridor.js';
import {westBlockZones,westBlockAlleys,schoolImageryArea,gateImageryArea,schoolImageryRoofs,schoolImageryGround} from './west-block-data.js';
import {surveyedWestPark} from './west-green-survey.js';
import {stationStreetRings} from './shuncheng.js';

const blockAngle=.108,blockCos=Math.cos(blockAngle),blockSin=Math.sin(blockAngle);
const imageryAreas=[schoolImageryArea,gateImageryArea];
const westStudyRings=[...westBlockZones.map(({ring})=>ring),...imageryAreas];
const westBlockQueries=westStudyRings.map(createRingQuery);
export function westBlockWorld(x,z){return [x*blockCos+z*blockSin,-x*blockSin+z*blockCos];}
export function westBlockLocal(x,z){return [x*blockCos-z*blockSin,x*blockSin+z*blockCos];}
function blockSegmentHits(a,b,x,z,w,d){
  let lo=0,hi=1;
  for(const [axis,center,half] of [[0,x,w],[1,z,d]]){
    const start=a[axis]-center,delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-8){if(Math.abs(start)>half)return false;continue;}
    const u=(-half-start)/delta,v=(half-start)/delta;
    lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;
  }
  return true;
}
function blockRect(x,z,w,d){return [[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];}
export function westBlockProtectedRings(){
  return [jinglinContextRing,westLinkBoundary,...westSiteProtectedRings,mapData.campus,mapData.wall,yufengBlockBoundary,surveyedWestPark,...stationStreetRings,...mapData.areas.map(([,r])=>r),...mapData.buildings.map(([,,r])=>r),
    ...commercialPlots.map(p=>blockRect(p.x,p.z,p.w+5,p.d+6)),
    blockRect(-1452.5,93,110,46), // existing shopping-center forecourt
    blockRect(-1253,443.4,112,168),blockRect(-1253,545,110,56), // theater eaves/plaza
    ...planWestFrontages().units.map(p=>{
      const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
      const setback=p.x>=-1894?5:0;
      return blockRect(0,-setback/2,p.width+.4,p.depth+2+setback).map(([x,z])=>[p.x+x*c+z*s,p.z-x*s+z*c]);
    })];
}
let westBlockLayoutCache;
export function createWestBlockLayout(){
  if(westBlockLayoutCache)return westBlockLayoutCache;
  const obstacles=makeGrid(48),zones=westBlockZones.map(p=>({...p,local:p.ring.map(v=>westBlockLocal(...v))}));
  const protectedRings=westBlockProtectedRings(),plots=[];
  function index(item,points,pad=0){
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
    obstacles.add(item,Math.min(...xs)-pad-25,Math.min(...zs)-pad-25,Math.max(...xs)+pad+25,Math.max(...zs)+pad+25);
  }
  for(const ring of protectedRings){const polygon=ring.map(p=>westBlockLocal(...p));index({polygon},polygon);}
  const paths=[...mapData.roads.map(([,width,,points])=>({points,pad:width/2+2})),
    ...mapData.shunchengWays.map(points=>({points,pad:9})),...mapData.rail.map(points=>({points,pad:25})),
    ...mapData.water.map(([width,points])=>({points,pad:width/2+2}))];
  for(const {points,pad} of paths)for(const e of segments(points)){
    const a=westBlockLocal(...e.start),b=westBlockLocal(...e.end);index({a,b,pad},[a,b],pad);
  }
  function isBlocked(x,z,hw,hd,corners){
    return obstacles.at(x,z).some(item=>{
      if(item.a)return blockSegmentHits(item.a,item.b,x,z,hw+item.pad,hd+item.pad);
      return corners.some(p=>pointInRing(...p,item.polygon))||pointInRing(x,z,item.polygon)||
        segments([...item.polygon,item.polygon[0]]).some(e=>blockSegmentHits(e.start,e.end,x,z,hw,hd));
    });
  }
  for(const {ring} of schoolImageryGround){
    const polygon=ring.map(p=>westBlockLocal(...p));index({polygon},polygon);
  }
  for(const roof of schoolImageryRoofs){
    const [x,z]=westBlockLocal(...roof.center),{w,d}=roof;
    const corners=blockRect(x,z,w,d);
    if(isBlocked(x,z,w/2,d/2,corners))continue;
    plots.push({...roof,x,z,world:roof.center,angle:blockAngle,variant:plots.length%13,kind:'imagery'});
    index({polygon:corners},corners);
  }
  for(const ring of imageryAreas){
    const polygon=ring.map(p=>westBlockLocal(...p));index({polygon},polygon);
  }
  for(const path of westBlockAlleys)for(const edge of segments(path)){
    const a=westBlockLocal(...edge.start),b=westBlockLocal(...edge.end);
    index({a,b,pad:3.1},[a,b],3.1);
  }
  for(const zone of zones){
    const xs=zone.local.map(p=>p[0]),zs=zone.local.map(p=>p[1]);
    const sizes=[[32,36,29,32],[20,25,17,21],[16,21,13,17]];
    for(const [sx,sz,w,d] of sizes){
      for(let z=Math.floor(Math.min(...zs)/sz)*sz;z<Math.max(...zs);z+=sz)for(let x=Math.floor(Math.min(...xs)/sx)*sx;x<Math.max(...xs);x+=sx){
        const hw=w/2+.65,hd=d/2+.65,corners=blockRect(x,z,hw*2,hd*2);
        if(!corners.every(p=>pointInRing(...p,zone.local)))continue;
        if(isBlocked(x,z,hw,hd,corners))continue;
        const hash=(Math.imul(x,73856093)^Math.imul(z,19349663))>>>0;
        plots.push({x,z,w,d,world:westBlockWorld(x,z),angle:blockAngle,zone:zone.id,variant:hash%13,kind:w>20&&hash%4===0?'residential':w>20&&hash%7===0?'workshop':'lowrise'});
        index({polygon:corners},corners);
      }
    }
  }
  // Draw only the portions outside known buildings, campus, parks and main carriageways.
  const laneSegments=[];
  const roads=[...mapData.roads.filter(([, ,name])=>name!=='下西关街').flatMap(([,width,,points])=>segments(points).map(line=>({line,pad:width/2+.4}))),
    ...segments(mapData.lowerWestRoad).map(line=>({line,pad:7.6})),...mapData.shunchengWays.flatMap(points=>segments(points).map(line=>({line,pad:4.85})))];
  const laneBlocked=protectedRings.slice(0,protectedRings.length-planWestFrontages().units.length);
  for(const path of westBlockAlleys)for(const line of segments(path)){
    const count=Math.ceil(line.length/1.5),nx=-(line.end[1]-line.start[1])/line.length,nz=(line.end[0]-line.start[0])/line.length;
    for(let i=0;i<count;i++){
      const a=sample(line,i/count),b=sample(line,(i+1)/count);
      const corners=[a,b].flatMap(([x,z])=>[-1,1].map(side=>[x+nx*side*2.35,z+nz*side*2.35]));
      if(!corners.every(([x,z])=>westBlockZones.some(zone=>pointInRing(x,z,zone.ring))&&!imageryAreas.some(r=>pointInRing(x,z,r))&&!laneBlocked.some(r=>pointInRing(x,z,r))&&!roads.some(({line,pad})=>projectOnSegment([x,z],line).distance<pad)))continue;
      laneSegments.push({a,b,width:4.7});
    }
  }
  westBlockLayoutCache={plots,laneSegments,protectedRings};return westBlockLayoutCache;
}
export function isWestInteriorStudy(x,z,radius=0){
  return westBlockQueries.some(q=>q.contains(x,z,radius));
}
