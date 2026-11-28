import {schoolLocal,schoolWorld,schoolClearance,schoolRoads} from './school-sites-data.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {pointInRing,segments,projectOnSegment} from './geography.js';

// Layout inside the already traced parcels. Amenities, fence sections and access
// connections are inferred, not additional surveyed footprints or named facilities.
export function planSchoolGroundDetails(survey,existing){
 const local=p=>{const dx=p[0]-survey.origin[0],dz=p[1]-survey.origin[1],c=Math.cos(survey.angle),s=Math.sin(survey.angle);return [dx*c-dz*s,dx*s+dz*c];};
 const parcels=[survey.boundary,...survey.contextBoundaries].map(r=>r.map(local));
 const buildings=survey.buildings.map(b=>({...b,ring:clearanceRect(b.u,b.v,b.w+.8,b.d+.8)}));
 const sports=existing.sports.map(p=>p.ring),occupied=existing.furniture.filter(p=>p.kind!=='entrance-paving').map(p=>p.ring);
 const tracedLanes=survey.lanes.map(l=>({...l,points:l.points.map(p=>schoolLocal(survey,p))}));
 const laneSegments=tracedLanes.flatMap(l=>segments(l.points).map(e=>({...e,width:l.width})));
 const laneRings=laneSegments.map(e=>clearanceRect((e.start[0]+e.end[0])/2,(e.start[1]+e.end[1])/2,e.length,e.width+.5,-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0])));
 const out={connections:[],entries:[],gates:[],gatePosts:[],fences:[],beds:[],planting:[],amenities:[],parking:[],sportsFences:[]};
 const exactGate=clearanceRect(...survey.gate,14,48,survey.facing);
 const conflicts=(r,others)=>others.some(p=>clearancePolygonsOverlap(r,p));
 function baseSafe(r,parcel=null){return r.every(p=>parcel?pointInRing(...p,parcel):parcels.some(b=>pointInRing(...p,b)))&&!conflicts(r,buildings.map(b=>b.ring))&&!conflicts(r,sports)&&schoolClearance.clear(r.map(p=>schoolWorld(survey,...p)));}
 const pathRing=(a,b,w)=>clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(a[0]-b[0],a[1]-b[1]),w,-Math.atan2(b[1]-a[1],b[0]-a[0]));
 function route(a,b,parcel,width=1.65){
  const options=[[a,b],[a,[a[0],b[1]],b],[a,[b[0],a[1]],b]];
  for(const points of options){const edges=segments(points),rings=edges.map(e=>pathRing(e.start,e.end,width));if(!rings.length||rings.some(r=>!baseSafe(r,parcel)||conflicts(r,occupied)))continue;return {points,rings,width};}
  return null;
 }
 // Connect actual model door locations, not arbitrary dots in vacant ground.
 for(const b of buildings){
  if(b.type==='shed')continue;
  const parcel=parcels.find(p=>pointInRing(b.u,b.v,p));if(!parcel)continue;
  for(const side of [1,-1]){
   if(side<0&&!b.neighbour)continue;
   for(const dx of b.w>65?[-b.w*.28,0,b.w*.28]:[0]){
    const a=[b.u+dx,b.v+side*(b.d/2+1.5)];
    const candidates=laneSegments.map(e=>{const hit=projectOnSegment(a,e);return {e,hit};}).filter(p=>p.hit.distance<60).sort((a,b)=>a.hit.distance-b.hit.distance);
    let connection=null;
    for(const {e,hit} of candidates){const dest=[e.start[0]+(e.end[0]-e.start[0])*hit.t,e.start[1]+(e.end[1]-e.start[1])*hit.t];connection=route(a,dest,parcel);if(connection)break;}
    if(!connection)continue;
    const entry={buildingId:b.id,u:b.u+dx,v:b.v+side*(b.d/2+.1),side,neighbour:b.neighbour};
    out.entries.push(entry);out.connections.push({...connection,buildingId:b.id});laneRings.push(...connection.rings);
   }
  }
 }
 // Infer access gaps from traced lane ends. Keep at least one vehicle-size gap
 // for every surrounding parcel; public-road alignment remains the source.
 parcels.forEach((parcel,index)=>{
  const edges=segments([...parcel,parcel[0]]),nearest=p=>edges.map(e=>({e,...projectOnSegment(p,e)})).sort((a,b)=>a.distance-b.distance)[0];
  const candidates=[];
  if(index===0)candidates.push({point:survey.gate,width:14,main:true});
  for(const lane of tracedLanes)for(const p of [lane.points[0],lane.points.at(-1)]){
   if(!pointInRing(...p,parcel)&&nearest(p).distance>5)continue;
   const edge=nearest(p);if(edge.distance<11)candidates.push({point:p,width:Math.max(6,lane.width+3)});
  }
  if(!candidates.length){
   const points=laneSegments.flatMap(e=>[e.start,e.end]).filter(p=>pointInRing(...p,parcel));
   const p=points.sort((a,b)=>nearest(a).distance-nearest(b).distance)[0];if(p)candidates.push({point:p,width:7});
  }
  if(!candidates.length){
   // Narrow roadside residential parcels may have no traced internal lane.
   // Find a building-free boundary gap facing the nearest mapped street.
   const roads=schoolRoads.flatMap(([,width,,points])=>segments(points.map(local)).map(e=>({...e,width}))),choices=[];
   for(const e of edges){const angle=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]);for(let t=4;t<e.length-3;t+=4){
    const p=[e.start[0]+(e.end[0]-e.start[0])*t/e.length,e.start[1]+(e.end[1]-e.start[1])*t/e.length],r=clearanceRect(...p,6.5,6,angle);
    if(conflicts(r,buildings.map(b=>b.ring)))continue;
    const distance=Math.min(...roads.map(road=>projectOnSegment(p,road).distance-road.width/2));choices.push({point:p,width:6.5,distance});
   }}
   choices.sort((a,b)=>a.distance-b.distance);if(choices.length)candidates.push(choices[0]);
  }
  for(const candidate of candidates){
   if(out.gates.filter(g=>g.parcel===index).length>=2)break;
   const hit=nearest(candidate.point),e=hit.e,point=[e.start[0]+(e.end[0]-e.start[0])*hit.t,e.start[1]+(e.end[1]-e.start[1])*hit.t],angle=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]);
   if(out.gates.some(g=>g.parcel===index&&Math.hypot(g.u-point[0],g.v-point[1])<candidate.width+3))continue;
   const gate={u:point[0],v:point[1],width:candidate.width,angle,parcel:index,main:!!candidate.main,ring:clearanceRect(...point,candidate.width,25,angle)};
   out.gates.push(gate);
   // Keep a pedestrian surface between an inset lane endpoint and its boundary gap.
   const edgeVector=[point[0]-candidate.point[0],point[1]-candidate.point[1]],length=Math.hypot(...edgeVector);
   if(length>2){const inner=[point[0]-edgeVector[0]/length*2,point[1]-edgeVector[1]/length*2],link=route(candidate.point,inner,parcel,2.2);if(link){out.connections.push({...link,gate:true});laneRings.push(...link.rings);}}
  }
 });
 const access=[exactGate,...out.gates.map(g=>g.ring)];
 for(const g of out.gates.filter(g=>g.parcel>0))for(const side of [-1,1]){
  const c=Math.cos(g.angle),sn=Math.sin(g.angle),parcel=parcels[g.parcel];
  for(const normal of [-1,1]){
   const u=g.u+c*side*(g.width/2+.6)+sn*normal*1.3,v=g.v-sn*side*(g.width/2+.6)+c*normal*1.3,ring=clearanceRect(u,v,.94,.94,g.angle);
   if(baseSafe(ring,parcel)&&!conflicts(ring,[...access,...laneRings,...occupied])){out.gatePosts.push({u,v,angle:g.angle,ring,parcel:g.parcel});break;}
  }
 }
 function free(r,parcel=null){return baseSafe(r,parcel)&&!conflicts(r,[...laneRings,...occupied,...access]);}
 // Continuous fence panels have stone plinths and posts. Long gaps are only
 // openings or mapped-road/building conflicts, never a blanket 54 m gate cutout.
 parcels.forEach((parcel,index)=>{
  const area=parcel.reduce((a,p,i)=>a+p[0]*parcel[(i+1)%parcel.length][1]-parcel[(i+1)%parcel.length][0]*p[1],0),inward=area>0?1:-1;
  for(const e of segments([...parcel,parcel[0]])){
   const dx=(e.end[0]-e.start[0])/e.length,dz=(e.end[1]-e.start[1])/e.length,nx=-dz*inward,nz=dx*inward,n=Math.ceil(e.length/2.4),length=e.length/n;
   for(let i=0;i<n;i++){
    const u=e.start[0]+dx*(i+.5)*length+nx*1.3,v=e.start[1]+dz*(i+.5)*length+nz*1.3,angle=-Math.atan2(dz,dx),ring=clearanceRect(u,v,length+.26,.62,angle);
    if(survey.id==='gutao'&&index===2)continue; // Open retail frontage; only residential compounds are fenced.
    if(!free(ring,parcel))continue;
    const p={u,v,length,angle,ring,parcel:index,height:index===0?2.25:1.9,style:index===0?'school':'residential'};
    out.fences.push(p);
   }
  }
 });
 occupied.push(...out.fences.map(p=>p.ring),...out.gatePosts.map(p=>p.ring));
 function reserve(kind,u,v,w,d,angle=0,extra={}){const ring=clearanceRect(u,v,w,d,angle);if(!free(ring))return null;const p={kind,u,v,w,d,angle,ring,...extra};occupied.push(ring);return p;}
 // Green strips belong to the building row. Larger courtyard islands leave
 // cross paths between cells, and never cover athletics or driveway surfaces.
 for(const b of buildings){
  if(b.type==='shed'||b.type==='commercial')continue;
  for(const side of [1,-1])for(let u=b.u-b.w/2+6;u<b.u+b.w/2-4;u+=12){
   const v=b.v+side*(b.d/2+8.5),p=reserve('garden',u,v,10,5.4,0,{residential:b.neighbour});if(p)out.beds.push(p);
  }
 }
 parcels.forEach((parcel,index)=>{
  const xs=parcel.map(p=>p[0]),zs=parcel.map(p=>p[1]);
  for(let v=Math.ceil(Math.min(...zs)/18)*18;v<Math.max(...zs);v+=18)for(let u=Math.ceil(Math.min(...xs)/22)*22;u<Math.max(...xs);u+=22){
   const r=clearanceRect(u,v,12,9);if(!free(r,parcel))continue;
   // Reserve every third clearing as a usable paved courtyard instead of lawn.
   if((Math.round(u/22)+Math.round(v/18))%3===0&&out.amenities.filter(p=>p.parcel===index).length<2){const p=reserve(index?'fitness':'study-court',u,v,12,9,0,{parcel:index});if(p)out.amenities.push(p);}
  }
 });
 // Plant the actual traced green polygons. Do not turn every unbuilt square of
 // campus into a repeating garden grid; forecourts retain usable open space.
 for(const region of survey.green){
  const ring=region.map(p=>schoolLocal(survey,p)),xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
  for(let v=Math.min(...zs)+3,row=0;v<Math.max(...zs)-2;v+=9,row++)for(let u=Math.min(...xs)+3+(row%2)*4;u<Math.max(...xs)-2;u+=10){
   const r=clearanceRect(u,v,3.8,3.8);if(!r.every(p=>pointInRing(...p,ring)))continue;
   const p=reserve('plant-cluster',u,v,3.8,3.8);if(p)out.planting.push(p);
  }
 }
 // Roadside parking and bike shelters stay wholly off traced circulation.
 for(const e of laneSegments){
  const dx=(e.end[0]-e.start[0])/e.length,dz=(e.end[1]-e.start[1])/e.length,angle=-Math.atan2(dz,dx);
  for(let distance=9;distance<e.length-5;distance+=19)for(const side of [-1,1]){
   const offset=e.width/2+3.7,u=e.start[0]+dx*distance-dz*side*offset,v=e.start[1]+dz*distance+dx*side*offset;
   const parcel=parcels.findIndex(p=>pointInRing(u,v,p));if(parcel<0)continue;
   const nearGate=out.gates.some(g=>Math.hypot(u-g.u,v-g.v)<36);
   const shelter=nearGate||Math.round(distance/19)%3===0;
   if(shelter&&out.amenities.filter(p=>p.kind==='cycle-shelter').length>=(survey.id==='vocational'?18:8))continue;
   if(!shelter&&out.parking.length>=(survey.id==='vocational'?40:12))continue;
   const p=reserve(shelter?'cycle-shelter':'parking',u,v,shelter?7.8:5.5,shelter?3.5:2.8,angle,{parcel});
   if(p)(shelter?out.amenities:out.parking).push(p);
  }
 }
 // Add furniture at a garden edge only if its complete footprint still fits.
 for(const [i,bed] of out.beds.entries()){
  for(const side of [-1,1]){
   if(out.amenities.filter(p=>p.kind==='bench').length>=(survey.id==='vocational'?36:16))break;
   const p=reserve('bench',bed.u+side*(bed.w/2+1.5),bed.v,2.2,1.1,Math.PI/2);if(p)out.amenities.push(p);
  }
  if(i%4===0){const p=reserve('garden-lamp',bed.u,bed.v+bed.d/2+1.2,.8,.8);if(p)out.amenities.push(p);}
 }
 for(const g of out.gates){const p=reserve('notice-board',g.u+Math.cos(g.angle)*(g.width/2+2.5),g.v-Math.sin(g.angle)*(g.width/2+2.5),2.2,1.1,g.angle);if(p)out.amenities.push(p);}
 // Sports enclosures sit outside court paint, with two 3.6 m gates.
 for(const sport of existing.sports.filter(p=>p.kind==='court')){
  const xs=sport.ring.map(p=>p[0]),zs=sport.ring.map(p=>p[1]),u=(Math.min(...xs)+Math.max(...xs))/2,v=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs)+2.2,d=Math.max(...zs)-Math.min(...zs)+2.2;
  const ring=clearanceRect(u,v,w,d);
  for(const [edgeIndex,e] of segments([...ring,ring[0]]).entries()){
   const n=Math.ceil(e.length/2.5),length=e.length/n,angle=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]);
   for(let i=0;i<n;i++){if(edgeIndex%2===0&&Math.abs((i+.5)*length-e.length/2)<2.5)continue;const x=e.start[0]+(e.end[0]-e.start[0])*(i+.5)/n,z=e.start[1]+(e.end[1]-e.start[1])*(i+.5)/n,r=clearanceRect(x,z,length+.14,.22,angle);if(!free(r))continue;out.sportsFences.push({u:x,v:z,length,angle,ring:r});}
  }
 }
 out.approximate=true;return out;
}
