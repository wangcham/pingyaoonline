import {createModernSite} from './modern-site.js';
import {thirdSchoolSurvey,thirdSchoolBuildings,thirdSchoolGate,thirdSchoolImagePoint,westSiteRecords} from './west-sites-data.js';

export function addPingyaoThirdSchool(scene){
  const s=createModernSite(scene,thirdSchoolSurvey),{box,glass,line,pad,sign,trees}=s;
  const image=(u,v)=>s.local(thirdSchoolImagePoint(u,v));
  const boundary=thirdSchoolSurvey.boundary.map(s.local);
  s.surface(boundary,'#b1afa1',.16);
  // Photos support the palette, not a measured level count for every roof.
  for(const p of thirdSchoolBuildings)s.building(p);
  // North sports area is a small east/west oval, not a full-size 400 m stadium.
  const [tu,tv]=image(882,249),outer=[44,21.5];
  function oval(rx,rz){return Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return [tu+Math.cos(a)*rx,tv+Math.sin(a)*rz];});}
  s.surface(oval(...outer),'#956b62',.24,'rubber');
  s.surface(oval(38.8,16.3),'#6c8c81',.28,'rubber');
  for(let n=0;n<4;n++){
    const points=oval(outer[0]-n*1.15-.4,outer[1]-n*1.15-.4);
    for(let i=0;i<points.length;i++)line('#d6cbb6',points[i],points[(i+1)%points.length],.07,.018,.29);
  }
  // Court lines follow the visible hard-court center; fine markings are inferred.
  for(const courtU of [tu-15,tu+15]){
    const w=24,d=14;pad(courtU,tv,w,d,'#74988f',.31,'rubber');
    const corners=[[courtU-w/2,tv-d/2],[courtU+w/2,tv-d/2],[courtU+w/2,tv+d/2],[courtU-w/2,tv+d/2]];
    for(let i=0;i<4;i++)line('#e1ded0',corners[i],corners[(i+1)%4],.08,.018,.35);
    line('#e1ded0',[courtU,tv-d/2],[courtU,tv+d/2],.08,.018,.35);
    const circle=Array.from({length:32},(_,i)=>[courtU+Math.cos(i*Math.PI/16)*1.8,tv+Math.sin(i*Math.PI/16)*1.8]);
    for(let i=0;i<32;i++)line('#e1ded0',circle[i],circle[(i+1)%32],.07,.018,.35);
    for(const side of [-1,1]){
      box('#58796d',courtU+side*12.8,1.65,tv,.15,3.1,.15);
      box('#d5d7c7',courtU+side*11.2,3.15,tv,.12,1.05,1.8);
      box('#7f4d3e',courtU+side*10.8,2.85,tv,.6,.08,.6);
    }
  }
  // School circulation is inside the site. Do not extend a lane across Shuguang Road.
  const [gu,gv]=thirdSchoolGate,base=s.ground(gu,gv);
  const southLane=image(864,466),northLane=image(820,299);
  const paths=[[[gu,gv+13],[gu,gv-12],5.5],[[gu,gv-12],image(992,434),image(986,395),image(976,326),image(970,287),2.4],
    [[gu,gv-8],southLane,5.5],[southLane,northLane,3],[northLane,image(952,283),3]];
  const walkSegments=[];
  for(const path of paths){const width=path.at(-1);for(let i=0;i<path.length-2;i++){
    const a=path[i],b=path[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length),nx=-(b[1]-a[1])/length,nz=(b[0]-a[0])/length;
    for(let j=0;j<n;j++){
      const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],q=[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n];
      const corners=[p,q].flatMap(([u,v])=>[-1,1].map(k=>[u+nx*k*width/2,v+nz*k*width/2]));
      if(corners.some(([u,v])=>thirdSchoolBuildings.some(b=>Math.abs(u-b.u)<b.w/2+.25&&Math.abs(v-b.v)<b.d/2+.25)))continue;
      line('#9a9d96',p,q,width,.055,.22);walkSegments.push({p,q,width});
    }
  }}
  s.root.userData.walkSegments=walkSegments;
  // Light grey forecourt with muted red edge strips visible in the campus photograph.
  pad(gu-31,gv+3,75,17,'#b7b3a6',.235);
  for(let u=gu-67;u<gu-5;u+=3.1)line('#d9d4c5',[u,gv+1],[u,gv+7],.09,.018,.28);
  const entranceWidth=15;
  for(const side of [-1,1])box('#b7b19c',gu+side*(entranceWidth/2+.75),base+2.8,gv,1.5,5.6,1.8);
  box('#acae9e',gu,base+5.85,gv,19,1.0,2.2);
  box('#b5b497',gu,base+7.05,gv,19,1.4,.45);
  sign('平 遥 三 中',gu,base+7.07,gv+.25,17.4,1.25,0,'#c4bf94','#8b4444');
  // Sliding gate is retracted, leaving the real entrance passage open.
  for(let u=gu+6.5;u<gu+8;u+=.22)box('#767c76',u,base+.95,gv+.4,.055,1.9,.065);
  box('#aaa897',gu+12,base+1.55,gv-1,6.3,3.1,5);
  glass('#50666a',gu+12,base+1.85,gv+1.56,4.7,1.5,.1);
  box('#bfc1b3',gu+12,base+3.22,gv-1,6.6,.24,5.3);
  sign('门卫',gu+12,base+2.83,gv+1.66,1.4,.42,0,'#b8b4a4','#60473c');
  // Boundary fence is a low masonry base with narrow metal rails; east/south
  // entry opening is explicitly cut rather than hidden behind a continuous wall.
  const approachClear=(u,v)=>Math.abs(u-gu)<entranceWidth/2+1&&v>gv-3;
  for(let j=0;j<boundary.length;j++){
    const a=boundary[j],b=boundary[(j+1)%boundary.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/1.5);
    for(let i=0;i<count;i++){
      const p=[a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count],q=[a[0]+(b[0]-a[0])*(i+1)/count,a[1]+(b[1]-a[1])*(i+1)/count];
      if(approachClear(...p)||approachClear(...q))continue;
      line('#9a9788',p,q,.24,.4,.45);line('#69746c',p,q,.07,.08,1.95);
      const u=(p[0]+q[0])/2,v=(p[1]+q[1])/2;box('#69746c',u,s.ground(u,v)+1.28,v,.055,1.4,.055);
    }
  }
  for(const [px,py] of [[893,321],[918,318],[944,319],[903,377],[921,384],[878,397],[816,335],[824,390],[840,481],[865,493],[890,492],[920,486],[986,405],[977,303]]){
    const [u,v]=image(px,py);pad(u,v,4,3.2,'#687d5b',.29,'soil');trees.tree({x:u,z:v,height:6.2,crown:4.5,base:.32});
    for(const side of [-1,1])box('#a06e63',u,s.ground(u,v)+.34,v+side*1.7,4.3,.25,.22);
  }
  // Bicycle shelter and racks near the south forecourt, outside the entry path.
  pad(gu-34,gv-2,27,4,'#999b91',.30);
  for(let u=gu-46;u<gu-21;u+=2.7){box('#7d6356',u,base+1.28,gv-3.5,.08,2.5,.08);box('#8f534c',u,base+.65,gv-1.3,.07,.65,1.25);}
  box('#6e8181',gu-34,base+2.63,gv-2,27,.12,4.4);
  for(const p of [[gu-9,gv+5],[gu+20,gv-16],image(818,309),image(970,390)])s.lamp(...p,5);
  s.root.userData.entrance={position:[gu,gv],clearWidth:entranceWidth,coordinate:thirdSchoolSurvey.gateCoordinate,crs:'GCJ-02'};
  const controller=s.finish();controller.record=westSiteRecords[1];return controller;
}
