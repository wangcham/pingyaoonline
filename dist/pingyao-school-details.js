import {schoolBuildings,schoolLocalBoundary} from './pingyao-school-data.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {pointInRing,projectOnSegment} from './geography.js';

// Furniture and landscaping are authored approximations inside the existing
// traced campus. Never treat them as newly surveyed buildings or named places.
export function addPingyaoCampusDetails({root,skin,box,part,line,trees}){
 const details={approximate:true,paths:[],gardens:[],facilities:[],sportsFences:[]};
 const buildings=schoolBuildings.map(b=>clearanceRect(b.u,b.v,b.w,b.d,b.angle,.3));
 const sports=[clearanceRect(65,139,97,185),clearanceRect(139,165,38,106),clearanceRect(177,411,92,13)];
 const roads=[],roadAxes=[];
 for(const m of root.children.filter(o=>o.userData.schoolSurface==='road')){
  const p=m.geometry.attributes.position;
  for(let i=0;i<p.count-2;i+=2){
   const a=[(p.getX(i)+p.getX(i+1))/2,(p.getZ(i)+p.getZ(i+1))/2],b=[(p.getX(i+2)+p.getX(i+3))/2,(p.getZ(i+2)+p.getZ(i+3))/2];
   roads.push([i,i+1,i+3,i+2].map(j=>[p.getX(j),p.getZ(j)]));
   roadAxes.push({start:a,end:b,length:Math.hypot(a[0]-b[0],a[1]-b[1])});
  }
 }
 const overlaps=(ring,others)=>others.some(p=>clearancePolygonsOverlap(ring,p));
 const inside=ring=>ring.every(p=>pointInRing(...p,schoolLocalBoundary));
 function ground(ring,kind='paving',color='#bcb8a9',y=.255){
  skin.quad(kind,color,ring.map(([u,v])=>[u,y,v]),ring.map(([u,v])=>[u/1.2,v/1.2]));
 }
 const pathRing=(a,b,w)=>clearanceRect((a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(a[0]-b[0],a[1]-b[1]),w,-Math.atan2(b[1]-a[1],b[0]-a[0]));
 // Connect actual doorway landings to an existing lane or paved court. Whole
 // strip envelopes are checked against rotated buildings and playing fields.
 const courts=[[179,361,112,94],[224,52,157,92],[79,550,140,60],[243,218,104,65],[177,550,54,56],[175,454,10,7]];
 for(const b of schoolBuildings){
  if(b.id.includes('link')||b.roof==='metal')continue;
  for(const side of [-1,1]){
   const c=Math.cos(b.angle),s=Math.sin(b.angle),start=[b.u+side*(b.d/2+1.9)*s,b.v+side*(b.d/2+1.9)*c];
   const candidates=roadAxes.map(edge=>{const {t}=projectOnSegment(start,edge);return [edge.start[0]+(edge.end[0]-edge.start[0])*t,edge.start[1]+(edge.end[1]-edge.start[1])*t];});
   for(const [u,v,w,d] of courts)candidates.push([Math.max(u-w/2+1,Math.min(u+w/2-1,start[0])),Math.max(v-d/2+1,Math.min(v+d/2-1,start[1]))]);
   candidates.sort((a,b)=>Math.hypot(a[0]-start[0],a[1]-start[1])-Math.hypot(b[0]-start[0],b[1]-start[1]));
   let route;
   for(const end of candidates){
    if(Math.hypot(end[0]-start[0],end[1]-start[1])>55)continue;
    // Already paved doors still get a short, distinct stone landing.
    const target=Math.hypot(end[0]-start[0],end[1]-start[1])<1?[start[0]+s*side*1.5,start[1]+c*side*1.5]:end;
    for(const points of [[start,target],[start,[start[0],target[1]],target],[start,[target[0],start[1]],target]]){
     const rings=points.slice(1).map((p,i)=>pathRing(points[i],p,2)).filter(r=>Math.hypot(r[0][0]-r[1][0],r[0][1]-r[1][1])>.2);
     if(rings.length&&rings.every(r=>inside(r)&&!overlaps(r,[...buildings,...sports]))){route={building:b.id,side,points,rings};break;}
    }
    if(route)break;
   }
   if(!route)continue;details.paths.push(route);route.rings.forEach(r=>ground(r,'paving','#bcb9aa',.278));
  }
 }
 const occupied=details.paths.flatMap(p=>p.rings);
 function reserve(kind,u,v,w,d,extra={}){
  const ring=clearanceRect(u,v,w,d,extra.angle??0);
  if(!inside(ring)||overlaps(ring,[...buildings,...sports,...roads,...occupied]))return null;
  const item={kind,u,v,w,d,ring,...extra};occupied.push(ring);return item;
 }
 function bench(u,v,angle=0){
  const c=Math.cos(angle),s=Math.sin(angle),put=(col,x,y,z,w,h,d)=>box(col,u+x*c+z*s,y,v-x*s+z*c,w,h,d,angle);
  for(const x of [-.85,.85]){put('#4f5f5a',x,.51,0,.1,.58,.6);put('#4f5f5a',x,.9,-.29,.08,.8,.08);}
  for(let j=0;j<4;j++)put('#977c59',0,.76,-.24+j*.16,2.1,.09,.13);
  for(let j=0;j<3;j++)put('#977c59',0,1.0+j*.14,-.31,2.1,.10,.07);
 }
 // Paired beds leave each teaching-building entrance and its connecting walk
 // open. Placement follows the spaces between wings, not a site-wide grid.
 const beds=[
  [207,49,17,8],[232,49,13,8],[257,49,13,8],[285,49,17,8],
  [72,320,13,6],[100,320,12,6],[73,365,14,9],[104,365,12,9],
  [255,362,11,9],[285,362,12,9],[133,337,12,13],[223,338,11,13],
  [134,383,12,15],[222,381,11,16],[151,325,12,6],[205,325,12,6],
  [268,282,18,12],[282,472,15,18],[92,474,12,7],[123,483,14,7],
  [35,515,23,8],[107,518,22,7],[35,564,22,12],
 ];
 for(const [u,v,w,d] of beds){
  const item=reserve('garden',u,v,w,d);if(!item)continue;details.gardens.push(item);
  ground(item.ring,'stone','#9e9d8a',.28);ground(clearanceRect(u,v,w-.5,d-.5),'ground','#656f47',.31);
  for(const side of [-1,1]){
   box('#b6b2a1',u,.42,v+side*(d/2-.14),w,.26,.28);
   box('#b6b2a1',u+side*(w/2-.14),.42,v,.28,.26,d);
  }
  for(let x=-w/2+1.2;x<w/2-1;x+=1.6)for(const side of [-1,1]){
   const z=v+side*(d/2-1.1);trees.shrub(u+x,z,1.35,.7,.29);
   part('crown',side<0?'#586d43':'#71834f',u+x,.65,z,1.55,.7,1.1,x*.2);
  }
  // Warm flowering accents stay sparse; the school retains its red/white palette.
  for(let i=0;i<5;i++)box(i%2?'#adad71':'#af8c92',u-w*.25+i*w*.12,.5,v,.24,.16,.25);
 }
 for(const [u,v] of [[146,344],[212,350],[145,375],[210,391],[199,231],[282,237],[205,49],[285,48],[22,274],[35,387],[115,481]]){
  const item=reserve('bench',u,v,2.5,1.2);if(!item)continue;bench(u,v);details.facilities.push(item);
 }
 // Small shaded study pockets and table-tennis stations on the existing eastern
 // paved activity area. Their exact furnishings are an explicit approximation.
 for(const [u,v] of [[209,206],[275,206]]){
  const item=reserve('pergola',u,v,10,7);if(!item)continue;details.facilities.push(item);ground(item.ring,'paving','#b2ac98');
  for(const x of [-4,4])for(const z of [-2.5,2.5])box('#736954',u+x,1.9,v+z,.22,3.3,.22);
  for(const z of [-2.5,2.5])box('#81735d',u,3.6,v+z,9.3,.24,.18);
  for(let x=-4.5;x<=4.5;x+=.5)box('#968367',u+x,3.8,v,.18,.2,6.5);
  bench(u-2.5,v,Math.PI/2);bench(u+2.5,v,-Math.PI/2);
 }
 for(const [u,v] of [[227,202],[243,202],[259,235],[242,235]]){
  const item=reserve('table-tennis',u,v,6,5);if(!item)continue;details.facilities.push(item);
  for(const x of [-1,1])for(const z of [-.5,.5])box('#626e66',u+x,.65,v+z,.07,.75,.07);
  box('#487d8b',u,1.04,v,2.74,.09,1.525);
  for(const z of [-.745,.745])box('#eee9d9',u,1.09,v+z,2.7,.014,.022);
  for(const x of [-1.35,0,1.35])box('#eee9d9',u+x,1.09,v,.022,.014,1.5);
  for(const z of [-.82,.82])box('#c6cbbd',u,1.18,v+z,.035,.22,.035);
  for(let z=-.8;z<=.8;z+=.1)box('#c8d2c8',u,1.2,v+z,.012,.15,.012);
  for(const y of [1.12,1.19,1.27])box('#d2d6c8',u,y,v,.015,.012,1.64);
 }
 function wheel(u,v){
  for(let i=0;i<16;i++){
   const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
   // Thin individual spokes and tire segments in the bicycle's vertical plane.
   const y=.64+Math.sin((a+b)/2)*.32,z=v+Math.cos((a+b)/2)*.32;
   // Axis-aligned microsegments are cheap and retain a round silhouette.
   box('#3f4845',u,y,z,.055,Math.abs(Math.sin(b)-Math.sin(a))*.32+.03,Math.abs(Math.cos(b)-Math.cos(a))*.32+.03);
  }
 }
 for(const [u,v,w] of [[28,290,12],[28,320,12],[28,350,12],[124,23,12],[124,68,12]]){
  const item=reserve('cycle-shelter',u,v,w,4.8);if(!item)continue;details.facilities.push(item);ground(item.ring,'paving','#aaa99b');
  for(const x of [-w/2+.4,w/2-.4])for(const z of [-1.7,1.7])box('#66736d',u+x,1.65,v+z,.13,2.8,.13);
  skin.box('roof','#7e9390',u,3.13,v,w,.14,4.6);
  for(let x=-w/2+.3;x<w/2;x+=.7)box('#bac5b9',u+x,3.23,v,.06,.04,4.5);
  for(let i=0;i<9;i++){
   const x=u-w/2+1+i*1.15;box('#8c9890',x,.55,v+1.65,.045,.55,.05);box('#8c9890',x,.83,v+1.55,.045,.05,.25);
   if(i%4===3)continue;
   wheel(x,v-.65);wheel(x,v+.65);
   box(i%2?'#847765':'#506c75',x,.78,v,.06,.06,1.3);
   box('#747e76',x,1.02,v-.45,.06,.65,.06);box('#37433d',x,1.22,v+.2,.22,.08,.32);
   box('#747e76',x,1.06,v+.2,.055,.28,.055);box('#747e76',x,1.36,v-.45,.5,.05,.05);
  }
 }
 // Court backstops have mesh openings and two clear pedestrian gates; they are
 // separate from the athletics track and don't enclose the main school apron.
 for(const [a,b] of [[[118,110],[158,110]],[[118,220],[158,220]],[[159,110],[159,156]],[[159,161],[159,220]]]){
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),yaw=-Math.atan2(b[1]-a[1],b[0]-a[0]),n=Math.ceil(length/2.5);
  for(let i=0;i<n;i++){
   const u=a[0]+(b[0]-a[0])*(i+.5)/n,v=a[1]+(b[1]-a[1])*(i+.5)/n,w=length/n;
   const item=reserve('sports-fence',u,v,w,.15,{angle:yaw});if(!item)continue;details.sportsFences.push(item);
   const c=Math.cos(yaw),s=Math.sin(yaw);
   box('#496d60',u,2.12,v,.08,3.7,.08,yaw);
   for(let y=.4;y<4;y+=.24)box('#77968a',u,y,v,w,.014,.014,yaw);
   for(let x=-w/2+.12;x<w/2;x+=.24)box('#77968a',u+x*c,2.12,v-x*s,.014,3.5,.014,yaw);
   box('#496d60',u,3.94,v,w,.07,.07,yaw);
  }
 }
 for(const [u,v] of [[194,324],[219,372],[135,395],[268,229],[194,197],[28,375],[289,267]]){
  const item=reserve('garden-lamp',u,v,.7,.7);if(!item)continue;details.facilities.push(item);
  part('stem','#58655d',u,1.65,v,.12,2.8,.12);box('#9a9e8e',u,.45,v,.42,.3,.42);
  part('glow','#e3dac3',u,3.04,v,.4,.35,.4);box('#647567',u,3.27,v,.65,.11,.65);
 }
 for(const [u,v] of [[231,307],[196,254],[24,257],[292,418],[125,398]]){
  const item=reserve('bin',u,v,1.4,.8);if(!item)continue;details.facilities.push(item);
  for(const side of [-1,1]){box(side<0?'#617a72':'#767c6e',u+side*.32,.8,v,.53,1.02,.56);box('#c0c3b4',u+side*.32,1.36,v,.58,.1,.61);box('#354740',u+side*.32,1.17,v+.29,.37,.11,.025);}
 }
 // Grates and paving edges have actual relief rather than painted blocks.
 for(const p of details.paths){const [u,v]=p.points[0];for(let i=0;i<8;i++)box('#66736d',u-.7+i*.2,.292,v,.06,.028,.25);}
 root.userData.campusDetails=details;
 root.userData.campusDetailAccuracy='楼间连通步道与庭院设施为既有校园边界内的设计近似；不代表已核实的校内设施位置。';
}
