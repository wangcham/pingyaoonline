import {mapData} from './map-data.js';
import {makeGrid,segments,pointInRing} from './geography.js';

// Footprint tests include the complete rotated envelope, not just its centre.
// Grade-separated motorways/railways need elevation evidence and are excluded.
export function clearanceRect(x,z,w,d,angle=0,pad=0){
  const c=Math.cos(angle),s=Math.sin(angle);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{
    const u=a*(w/2+pad),v=b*(d/2+pad);return [x+u*c+v*s,z-u*s+v*c];
  });
}
export function clearancePolygonsOverlap(a,b){
  let al=Infinity,at=Infinity,ar=-Infinity,ab=-Infinity,bl=Infinity,bt=Infinity,br=-Infinity,bb=-Infinity;
  for(const p of a){al=Math.min(al,p[0]);at=Math.min(at,p[1]);ar=Math.max(ar,p[0]);ab=Math.max(ab,p[1]);}
  for(const p of b){bl=Math.min(bl,p[0]);bt=Math.min(bt,p[1]);br=Math.max(br,p[0]);bb=Math.max(bb,p[1]);}
  if(ar<bl||br<al||ab<bt||bb<at)return false;
  if(a.some(p=>pointInRing(...p,b))||b.some(p=>pointInRing(...p,a)))return true;
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let i=0;i<a.length;i++){const p=a[i],q=a[(i+1)%a.length];if(Math.hypot(q[0]-p[0],q[1]-p[1])<=.04)continue;
    for(let j=0;j<b.length;j++){const r=b[j],s=b[(j+1)%b.length];if(Math.hypot(s[0]-r[0],s[1]-r[1])<=.04)continue;
      if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)return true;
    }
  }return false;
}
export function createRoadClearance(roads=mapData.roads){
  const grid=makeGrid(80),types=new Set(['primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','living_street','unclassified','service']);
  for(const [type,width,name,points] of roads){
    if(!types.has(type))continue;
    for(const line of segments(points)){
      const {start:a,end:b,length}=line,angle=-Math.atan2(b[1]-a[1],b[0]-a[0]);
      const ring=clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,length,width,angle);
      const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),item={line,ring,width,name,type};
      grid.add(item,Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));
    }
  }
  function conflicts(ring){
    const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),candidates=new Set();
    for(let x=Math.floor(Math.min(...xs)/80)*80;x<=Math.max(...xs);x+=80)for(let z=Math.floor(Math.min(...zs)/80)*80;z<=Math.max(...zs);z+=80)for(const road of grid.at(x+.01,z+.01))candidates.add(road);
    return [...candidates].filter(road=>clearancePolygonsOverlap(ring,road.ring));
  }
  return {conflicts,clear:ring=>conflicts(ring).length===0};
}
export const buildingRoadClearance=createRoadClearance();
export function roadAdjustedFootprint(ring,center,margin=1.6){
  let result=ring.map(p=>[...p]);
  // Retain the original land-side edges. Only clip the approximate protruding
  // corner to the mapped road edge; do not move the road or the whole building.
  for(const {line,width} of buildingRoadClearance.conflicts(ring)){
    const a=line.start,b=line.end,dx=(b[0]-a[0])/line.length,dz=(b[1]-a[1])/line.length;
    let nx=-dz,nz=dx;if((center[0]-a[0])*nx+(center[1]-a[1])*nz<0){nx=-nx;nz=-nz;}
    const distance=p=>(p[0]-a[0])*nx+(p[1]-a[1])*nz-width/2-margin;
    if(distance(center)<=0)return null;
    const next=[];
    for(let i=0;i<result.length;i++){
      const p=result[i],q=result[(i+1)%result.length],pd=distance(p),qd=distance(q);
      if(pd>=0)next.push(p);
      if((pd>=0)!==(qd>=0)){const t=pd/(pd-qd);next.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
    }
    result=next;if(result.length<3)return null;
  }
  return result;
}
