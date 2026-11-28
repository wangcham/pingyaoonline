import {gutaoShops} from './gutao-shops-data.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {schoolWorld,schoolClearance} from './school-sites-data.js';

// POI-backed identities, photo-backed palettes where available. Facade subdivision
// is illustrative: map POIs alone cannot establish exact lease boundaries.
export function addGutaoShopfronts(s,survey,b,p,surfaces){
 const section=p.section??'central',named=gutaoShops.filter(q=>q.section===section),front=b.v+b.d/2;
 const report=s.root.userData.gutaoShops??={named:[],anonymous:[],aprons:[],checked:'2026-11-27',placementEstimated:true};
 const {box,glass,sign}=s,at=(fn,col,x,y,z,w,h,d)=>fn(col,x,b.base+y,front+z,w,h,d);
 const bays=named.filter(q=>!q.upper).map(q=>({...q}));
 const occupied=bays.map(q=>[q.u-q.w/2-.25,q.u+q.w/2+.25]).sort((a,b)=>a[0]-b[0]);
 let cursor=b.u-b.w/2+.2;
 for(const [start,end] of [...occupied,[b.u+b.w/2-.2,b.u+b.w/2]]){
  const gap=start-cursor;if(gap>1.6){const n=Math.ceil(gap/6);for(let i=0;i<n;i++)bays.push({u:cursor+(i+.5)*gap/n,w:gap/n-.15,role:'unknown',tone:['#65776c','#9a7f68','#737c85'][i%3]});}cursor=Math.max(cursor,end);
 }
 for(const q of bays){
  const x=q.u,w=q.w-.2,tone=q.tone,door=x+w*.29,display=x-w*.22;
  const ink=q.role==='optics'?'#234877':q.role==='print'?'#e9cb64':q.id==='B0HULU5DP8'?'#4b504b':'#f2e9d3';
  at(box,'#d7cbbb',x,1.65,.22,w,3.3,.22);
  at(box,'#273b3c',x,1.6,.37,w-.25,2.9,.12);
  at(glass,'#526e70',x,1.6,.46,w-.45,2.75,.08);
  for(const dx of [-w/2+.15,w*.1,w/2-.15])at(box,'#3b4845',x+dx,1.6,.55,.075,2.95,.13);
  at(box,'#c3b8a1',x,.16,.55,w,.16,.95);
  at(box,tone,x,3.35,.47,w,1.05,.24);
  at(box,'#d7c9ae',x,3.91,.56,w+.1,.08,.5);
  at(box,'#6d6253',x-w/2,3.1,.12,.25,6.2,.3);
  // Two tall clear panes at the right form an entrance; displays stay to the left.
  at(box,'#bec5ba',door,1.6,.57,.045,2.8,.08);
  for(const dx of [-.11,.11])at(box,'#d7d9cd',door+dx,1.36,.66,.032,.44,.06);
  for(const side of [-1,1]){at(box,'#48534b',x+side*w*.35,3.93,.7,.05,.2,.35);at(box,'#d9cfad',x+side*w*.35,3.96,.85,.32,.07,.26);}
  if(q.name){const label=sign(q.name,x,b.base+3.35,front+.64,w-.35,.9,0,tone,ink);label.name=`古陶商铺门头-${q.id}`;label.userData.poi=q.id;report.named.push({...q,building:p.id,front,door,display});}
  else report.anonymous.push({u:x,w,building:p.id});
  // Texture-backed paver apron, drainage grate and inset door mat.
  const apron=clearanceRect(x,front+2,w,3);
  if(schoolClearance.clear(apron.map(a=>schoolWorld(survey,...a)))&&!survey.buildings.some(o=>o.id!==p.id&&clearancePolygonsOverlap(apron,clearanceRect(o.u,o.v,o.w,o.d)))){
   surfaces.polygon(apron,'#c0b29c',.265,'paving');report.aprons.push(apron);
   if(section!=='central'&&bays.indexOf(q)%3===0){
    const px=x-w/2+.45,pz=front+2.75,y=s.ground(px,pz);
    box('#626f63',px,y+2.55,pz,.075,4.6,.075);box('#b8b6a1',px,y+.36,pz,.4,.4,.4);box('#546052',px+.26,y+4.9,pz,.65,.10,.15);glass('#ded5b2',px+.53,y+4.85,pz,.35,.08,.22);
   }
   if(section!=='central'&&bays.indexOf(q)%3===1&&w>5){
    const px=x-w/2+.65,pz=front+2.5,y=s.ground(px,pz);
    box('#9c8c73',px,y+.5,pz,1,.7,.8);for(const dx of [-.3,0,.3])s.part('globe','#697e52',px+dx,y+1.02,pz,.6,.7,.65);
   }
   for(const off of [-w/2,w/2])at(box,'#8a8272',x+off,.29,2,.055,.03,3);
   at(box,'#595e54',door,.31,.94,Math.min(1.3,w*.3),.035,.5);
   at(box,'#535e58',x-w*.36,.29,3.1,.8,.05,.28);
   for(let n=0;n<6;n++)at(box,'#a5a99a',x-w*.36-.32+n*.13,.32,3.1,.03,.018,.25);
  }
  // Distinct fitted display contents; shallow cases sit inside the window frame.
  if(['stationery','grocer','pet','print','education','tiles'].includes(q.role)){
   const shelfW=Math.min(w*.48,4.4);
   for(const y of [.75,1.4,2.05]){
    at(box,'#a18b65',display,y,.57,shelfW,.07,.25);
    for(let n=0;n<8;n++)at(box,['#a85949','#739a91','#ccad56','#748ba4','#ded2b2'][n%5],display-shelfW/2+(n+.5)*shelfW/8,y+.21,.58,shelfW/10,.34,.13);
   }
   if(q.role==='pet'){at(box,'#997746',display,.55,.63,1.6,.55,.32);at(box,'#d6c393',display,1.2,.65,.5,.4,.26);}
   if(q.role==='print'){at(box,'#babfb7',display,1.15,.65,1.1,.65,.22);at(box,'#e6e2d1',display,1.5,.66,.8,.07,.25);for(const dx of [-w*.34,w*.34])s.part('globe','#ae3e2f',x+dx,b.base+2.77,front+.76,.4,.5,.35);}
  }else if(['food','bakery'].includes(q.role)){
   at(box,'#947858',display,.75,.62,w*.45,1.0,.3);at(glass,'#92aaa4',display,1.5,.65,w*.44,.65,.15);
   for(let n=0;n<5;n++)s.part('globe','#d7b573',display-w*.18+n*w*.09,b.base+1.3,front+.77,.32,.2,.22);
   at(box,'#3d4842',x-w*.43,1.65,.65,.48,1.3,.08);
   for(let n=0;n<6;n++)at(box,'#c8bc92',x-w*.43,1.2+n*.16,.71,.35,.025,.02);
   at(box,tone,x,2.81,.97,w,.10,1.1);for(let dx=-w/2+.2;dx<w/2;dx+=.65)at(box,'#d1b891',x+dx,2.87,.98,.22,.025,1.06);
  }else if(['beauty','salon','optics','jewelry'].includes(q.role)){
   for(let n=0;n<3;n++){const px=display+(n-1)*w*.15;at(box,'#c3b9a4',px,.8,.62,w*.12,.85,.25);at(glass,'#b4c4b8',px,1.8,.6,w*.12,1.1,.06);at(box,tone,px,1.2,.69,.3,.3,.17);}
  }else if(q.role==='bank'){at(box,'#b4baaf',display,1.3,.6,.85,1.65,.2);at(box,'#344c53',display,1.6,.73,.55,.45,.05);at(box,'#d5d1ba',display,1.1,.74,.55,.12,.06);}
  // Air-conditioning casings with horizontal vents; consistent upper wall rhythm.
  at(box,'#c9c8b9',x-w*.35,4.0,.29,.72,.52,.42);
  for(let n=0;n<5;n++)at(box,'#7e867c',x-w*.35,3.83+n*.075,.52,.59,.022,.02);
 }
 for(const q of named.filter(q=>q.upper)){
  const y=q.id==='B0H09UKBT3'?8.9:6.8;
  at(box,q.tone,q.u,y,.46,q.w,1.05,.18);
  const label=sign(q.name,q.u,b.base+y,front+.59,q.w-.3,.9,0,q.tone,'#eee5cf');label.name=`古陶商铺门头-${q.id}`;label.userData.poi=q.id;
  report.named.push({...q,building:p.id,front,signHeight:y});
 }
 s.root.userData.schoolGateShopBays=(s.root.userData.schoolGateShopBays??0)+bays.length;
}
