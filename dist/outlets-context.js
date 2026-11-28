import {createModernSite} from './modern-site.js';
import {outletsContextSurvey,civicSiteSurveys,civicWorld,civicLocal,civicPublicRoads} from './civic-sites-data.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {pointInRing,segments} from './geography.js';
import {schoolSurfaceScale} from './school-appearance.js';
import {addParkedScooters} from './street-scooters.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {schoolTexture} from './school-appearance.js';

export function addOutletsContext(scene){
 const survey=outletsContextSurvey,mall=civicSiteSurveys.find(s=>s.id==='outlets'),s=createModernSite(scene,survey),{box,glass,line}=s;
 const paving=createSurveySurfaces(s.root,{ground:s.ground,textureFactory:schoolTexture,tileScale:schoolSurfaceScale});
 const pad=(u,v,w,d,col,y,kind='paving')=>paving.polygon(clearanceRect(u,v,w,d),col,y,kind);
 const boundary=survey.boundary.map(s.local),mallRing=mall.boundary.map(s.local),roadClear=createRoadClearance(civicPublicRoads),buildings=[],occupied=[],report={estimated:true,checked:'2026-11-28',parking:[],scooters:[],gardens:[],fences:[],towers:[],sources:['https://www.amap.com/place/B0LBYHSLTE','https://www.amap.com/place/B0K0TUX1YO','https://xiaofei.tom.com/202610/4397107340.html'],note:'住宅外观参考实景，轮廓、楼层及停车区划线近似；不将报道1200个车位当作实测地面车位。'};
 function clear(r,extra=[]){return r.every(p=>pointInRing(...p,boundary))&&!clearancePolygonsOverlap(r,mallRing)&&roadClear.clear(r.map(p=>civicWorld(survey,...p)))&&![...buildings,...extra].some(p=>clearancePolygonsOverlap(r,p));}
 const parkingBands=[[-270,-220,-160,45],[-240,145,-85,190]],driveRings=[];
 for(const[l,t,r,b]of parkingBands)for(let v=t+11.5;v<b;v+=17)driveRings.push(clearanceRect((l+r)/2,v,r-l,6));
 // Tile the adjoining ground so no wide surface overwrites the mall or a road.
 const xs=boundary.map(p=>p[0]),zs=boundary.map(p=>p[1]);
 for(let u=Math.min(...xs)+4;u<Math.max(...xs);u+=8)for(let v=Math.min(...zs)+4;v<Math.max(...zs);v+=8){const r=clearanceRect(u,v,8,8),parking=parkingBands.some(([l,t,r,b])=>u>l&&u<r&&v>t&&v<b);if(clear(r))pad(u,v,8,8,parking?'#696e6b':'#aaa89a',.12,parking?'asphalt':'paving');}
 for(const p of survey.towers){const ring=clearanceRect(p.u,p.v,p.w,p.d,0,1.5);if(!clear(ring))continue;const b=s.building({...p,color:'#bdbcb1',trimColor:'#dedcc9',glassColor:'#526a79',roofColor:'#535451'},{photoLevels:true});buildings.push(ring);report.towers.push({...b,ring});
  for(const side of [-1,1]){
   box('#5e5d5b',b.u,b.base+b.h-4.5,b.v+side*(b.d/2+.26),b.w,9,.25);
   for(let x=-b.w/2+3;x<b.w/2;x+=7){
    box('#e4e0cf',b.u+x,b.base+(b.h-9)/2,b.v+side*(b.d/2+.54),.45,b.h-9,.65);
    for(let f=1;f<b.levels;f++){glass('#526d7b',b.u+x+2.5,b.base+f*3.05+1.2,b.v+side*(b.d/2+.75),3.6,1.75,.15);box('#d2d1c4',b.u+x+2.5,b.base+f*3.05+.20,b.v+side*(b.d/2+.90),4,.16,.5);}
   }
   box('#393f3d',b.u,b.base+b.h+.7,b.v+side*b.d/2,b.w+1.5,.3,1.6);
  }
 }
 // Two outside parking bands. Six metre gaps between rows are driving aisles.
 for(const [left,top,right,bottom]of parkingBands)for(let v=top+3;v<bottom-3;v+=17)for(let u=left+2;u<right-2;u+=2.8){
  const ring=clearanceRect(u,v,2.65,5.2);if(!clear(ring,occupied))continue;
  occupied.push(ring);report.parking.push({u,v,ring});pad(u,v,2.8,5.8,'#696e6b',.19,'asphalt');
  for(const du of [-1.3,1.3])line('#e1ddc9',[u+du,v-2.5],[u+du,v+2.5],.075,.018,.23);
  const y=s.ground(u,v);box('#555b54',u,y+.30,v-2.1,1.5,.15,.22);
  if(report.parking.length%4===0)continue;
  const col=['#d0d0c5','#737f83','#51616b','#927569','#afb7b3'][report.parking.length%5];
  box(col,u,y+.72,v,1.85,.78,4.4);box('#40555e',u,y+1.25,v-.1,1.65,.65,2.35);box(col,u,y+1.60,v-.1,1.7,.12,2.4);
  for(const dx of [-.94,.94])for(const dz of [-1.4,1.4])box('#2f3635',u+dx,y+.38,v+dz,.19,.55,.58);
  for(const dx of [-.62,.62]){box('#e6debb',u+dx,y+.78,v+2.22,.38,.18,.04);box('#963d38',u+dx,y+.78,v-2.22,.35,.16,.04);}
 }
 // Preserve an open route around the retail block; scooters occupy small bays,
 // not a continuous wall across a gate. Each placement clears towers and roads.
 for(const [left,top,right,bottom]of [[-100,-170,-72,-65],[-105,110,-62,130],[-65,218,40,225]])for(let u=left;u<right;u+=1.15)for(let v=top;v<bottom;v+=9){
  const ring=clearanceRect(u,v,1.0,2.0);if(!clear(ring,occupied))continue;
  occupied.push(ring);report.scooters.push({u,v,angle:0,ring});
 }
 const bikes=addParkedScooters(s.root,report.scooters,s.ground);
 // Courtyard islands, benches, lamps and waist-high rails, with walking gaps.
 for(let u=-380;u<-75;u+=23)for(let v=-150;v<190;v+=36){
  const w=u<-270?16:10,d=u<-270?14:7,ring=clearanceRect(u,v,w,d);if(!clear(ring,[...occupied,...driveRings]))continue;occupied.push(ring);report.gardens.push(ring);pad(u,v,w,d,'#738364',.20,'grass');
  s.trees.tree({x:u,z:v,height:5.5,crown:3.7});const y=s.ground(u,v);for(const side of [-1,1])box('#a6a394',u,y+.26,v+side*d/2,w,.24,.25);
  box('#77705b',u+3,y+.65,v,2.1,.15,.65);for(const dx of [-.8,.8])box('#4f5c52',u+3+dx,y+.35,v,.10,.55,.6);s.lamp(u-3,v,4.3);
 }
 for(const e of segments([...boundary,boundary[0]])){
  const n=Math.ceil(e.length/2.8),a=-Math.atan2(e.end[1]-e.start[1],e.end[0]-e.start[0]);
  for(let i=0;i<n;i++){if(i%17<4)continue;let u=e.start[0]+(e.end[0]-e.start[0])*(i+.5)/n,v=e.start[1]+(e.end[1]-e.start[1])*(i+.5)/n;const du=-200-u,dv=-v,len=Math.hypot(du,dv);u+=du/len*3;v+=dv/len*3;const r=clearanceRect(u,v,2.5,.4,a);if(!clear(r,[...occupied,...driveRings]))continue;report.fences.push(r);const y=s.ground(u,v);box('#8f9185',u,y+.80,v,.16,1.6,.16);for(const h of [.35,1.4])box('#59635b',u,y+h,v,2.5,.07,.07,a);for(let dx=-1;dx<=1;dx+=.33)box('#59635b',u+dx*Math.cos(a),y+.88,v-dx*Math.sin(a),.035,1.05,.035);}
 }
 report.driveRings=driveRings;s.root.userData.outletsContext=report;
 const surfaces=paving.finish(),controller=s.finish(),release=controller.dispose,setNight=controller.setNight;
 const lamps=s.root.children.filter(o=>o.isPointLight);let disposed=false,night=false;
 controller.setNight=value=>{night=value;setNight(value);lamps.forEach((l,i)=>l.visible=value&&i<6);};
 controller.update=camera=>{const near=lamps.map(l=>{const[x,z]=civicWorld(survey,l.position.x,l.position.z);return{l,d:Math.hypot(camera.position.x-x,camera.position.z-z)};}).filter(p=>p.d<85).sort((a,b)=>a.d-b.d).slice(0,6);const visible=new Set(near.map(p=>p.l));lamps.forEach(l=>l.visible=night&&visible.has(l));};
 controller.dispose=()=>{if(disposed)return;disposed=true;bikes.dispose();surfaces.dispose();release();};return controller;
}
