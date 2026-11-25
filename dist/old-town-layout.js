import {mapData} from './map-data.js';
import {landmarkRecords} from './landmarks/data.js';
import {makeGrid,pointInRing,segments} from './geography.js';

const townAngle=.19,tc=Math.cos(townAngle),ts=Math.sin(townAngle);
export function townWorld(x,z){return [x*tc+z*ts,-x*ts+z*tc];}
export function townLocal(x,z){return [x*tc-z*ts,x*ts+z*tc];}
function segmentHitsRectangle(a,b,cx,cz,hw,hd){
  let lo=0,hi=1;
  for(const [axis,center,extent] of [[0,cx,hw],[1,cz,hd]]) {
    const start=a[axis]-center,delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-8){if(Math.abs(start)>extent)return false;continue;}
    const p=(-extent-start)/delta,q=(extent-start)/delta;
    lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return false;
  }
  return true;
}
export function createOldTownLayout(){
  const grid=makeGrid(64),boundary=mapData.wall.map(p=>townLocal(...p));
  function index(item,points,pad=0){
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
    grid.add(item,Math.min(...xs)-pad-32,Math.min(...zs)-pad-32,Math.max(...xs)+pad+32,Math.max(...zs)+pad+32);
  }
  const barriers=[...mapData.roads.map(([,width,,points])=>({points,pad:width/2+1.3})),...mapData.water.map(([width,points])=>({points,pad:width/2+2})),{points:mapData.wall,pad:9}];
  for(const {points,pad} of barriers)for(const line of segments(points)){
    const a=townLocal(...line.start),b=townLocal(...line.end);index({a,b,pad},[a,b],pad);
  }
  const exclusions=[...mapData.areas.map(([,ring])=>ring),...mapData.buildings.map(([,,ring])=>ring),...landmarkRecords.filter(r=>r.ring).map(r=>r.ring),...mapData.gates.map(([,,[x,z]])=>[[x-27,z-27],[x+27,z-27],[x+27,z+27],[x-27,z+27]])];
  for(const ring of exclusions){const polygon=ring.map(p=>townLocal(...p));index({polygon},polygon);}
  const xs=boundary.map(p=>p[0]),zs=boundary.map(p=>p[1]);const plots=[];
  for(const [sx,sz,width,depth] of [[25,34,22,30],[17,25,14,21]]) {
  for(let z=Math.floor(Math.min(...zs)/sz)*sz;z<Math.max(...zs);z+=sz)for(let x=Math.floor(Math.min(...xs)/sx)*sx;x<Math.max(...xs);x+=sx){
    const hash=Math.abs(Math.imul(Math.round(x),73856093)^Math.imul(Math.round(z),19349663));
    const w=width-(hash%3)*.35,d=depth-(hash%5)*.25,hw=w/2+.7,hd=d/2+.7;
    const corners=[[x-hw,z-hd],[x+hw,z-hd],[x+hw,z+hd],[x-hw,z+hd]];
    if(!corners.every(p=>pointInRing(...p,boundary)))continue;
    if(grid.at(x,z).some(item=>{
      if(item.a)return segmentHitsRectangle(item.a,item.b,x,z,hw+item.pad,hd+item.pad);
      const poly=item.polygon;
      return corners.some(p=>pointInRing(...p,poly))||pointInRing(x,z,poly)||segments([...poly,poly[0]]).some(e=>segmentHitsRectangle(e.start,e.end,x,z,hw+1.5,hd+1.5));
    }))continue;
    plots.push({x,z,w,d,angle:townAngle,variant:hash%7,world:townWorld(x,z)});
    index({polygon:corners},corners);
  }
  }
  return plots;
}
