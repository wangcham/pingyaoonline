import {createCommerceMaterials,addCommerceMallSkin} from './local-commerce-materials.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';

// Traced commercial wings. Brand presence has sources; unit assignments remain estimated.
export function addOutletsDetail(s,masses,safeRing,records){
 const {box,glass}=s,skin=createCommerceMaterials(s.root),cladding=addCommerceMallSkin(s.root,masses.map(b=>({...b,color:'#c5b293',roofOffset:.22})));
 const report={shopfronts:[],furniture:[],upperShops:[],terraces:[],stairs:[],tenants:[],approximate:true,checked:'2026-11-28',source:'https://www.amap.com/place/B0K0TUX1YO',placementNote:'品牌及相对楼层参考相册，楼栋与铺位映射近似；不作为真实楼层导购。'};
 const occupied=[...records.parking.map(([u,v])=>clearanceRect(u,v,6,6)),...records.trees.map(([u,v])=>clearanceRect(u,v,3,3)),...records.green];
 const reserve=(kind,u,v,w,d,a=0)=>{const ring=clearanceRect(u,v,w,d,a);if(!safeRing(ring)||occupied.some(p=>clearancePolygonsOverlap(p,ring)))return false;occupied.push(ring);report.furniture.push({kind,u,v,ring});return true;};
 for(const b of masses)for(let face=0;face<4;face++){
  const a=face*Math.PI/2,c=Math.cos(a),sn=Math.sin(a),span=face%2?b.d:b.w,depth=face%2?b.w:b.d;
  const at=(fn,col,x,y,w,h,d,out=.45)=>fn(col,b.u+x*c+(depth/2+out)*sn,b.base+y,b.v-x*sn+(depth/2+out)*c,w,h,d,a);
  const pos=(x,out)=>[b.u+x*c+(depth/2+out)*sn,b.v-x*sn+(depth/2+out)*c];
  const bays=Math.max(1,Math.floor(span/7.5)),step=span/bays;
  for(let i=0;i<bays;i++){
   const x=-span/2+(i+.5)*step,[u,v]=pos(x,.85),w=step-.65;
   // Reject faces that are too close to another building, road or parcel edge.
   if(!safeRing(clearanceRect(u,v,w,.65,a),{lanes:false}))continue;
   report.shopfronts.push({building:b.id,face,bay:i,u,v});
   const trim=['#4e605b','#66574b','#5b626b'][i%3];
   at(box,'#293d42',x,2.02,w,3.7,.11,.46);at(glass,'#526e72',x,2.02,w-.2,3.45,.08,.54);
   for(const side of [-1,1]){at(box,'#bcbba9',x+side*w/2,2.03,.09,3.72,.14,.63);at(box,'#c6cbbb',x+side*.8,1.55,.05,2.95,.1,.65);at(box,'#c9cebf',x+side*.16,1.4,.04,.5,.08,.72);}
   at(box,trim,x,4.2,w+.25,.73,.17,.62);
   // Blank framed tenant fascias preserve the unverified shop identities.
   at(box,'#b7a887',x,4.62,w+.35,.09,.7,.83);
   at(box,'#e0d1ae',x,4.51,w*.72,.045,.3,.84);
   if(i%3===1){at(box,'#a6997a',x,3.65,w+.25,.12,1.25,1.03);for(let rib=-w/2;rib<w/2;rib+=.6)at(box,'#c5b99b',x+rib,3.74,.05,.07,1.2,1.03);}
   // Display plinths and simple garment silhouettes stay behind the frame and
   // away from the central double doors. They add depth to opaque shop windows.
   for(const side of [-1,1])if(w>5){
    const dx=x+side*w*.34;at(box,'#aea58b',dx,.38,1.2,.45,.35,.61);at(box,'#c4b8a0',dx,1.12,.40,1.0,.12,.62);at(box,trim,dx,1.75,.68,.75,.15,.63);at(box,trim,dx,2.08,1.0,.14,.15,.63);
   }
   const [pu,pv]=pos(x+w*.42,1.25);if(i%3===0&&reserve('planter',pu,pv,1.7,.75,a)){
    skin.box('stone','#847d6c',pu,s.ground(pu,pv)+.55,pv,1.6,.7,.7,a);
    for(const dx of [-.5,0,.5])s.part('globe','#647b4e',pu+dx*c,s.ground(pu,pv)+1.0,pv-dx*sn,.65,.65,.65);
   }
  }
  // Window sills, rainwater pipes, roof copings and vented service covers.
  for(const side of [-1,1]){const x=side*(span/2-.5);at(box,'#aaa99a',x,b.h/2,.10,b.h,.1,.27);for(let y=1;y<b.h;y+=3.9)at(box,'#777e73',x,y,.19,.065,.18,.28);}
  for(let floor=1;floor<b.levels;floor++)for(let x=-span/2+3;x<span/2-1;x+=4.5)at(box,'#ded8c5',x,floor*4.15+.36,3.1,.13,.34,.35);
 }
 // Photo-referenced layered retail: shop glazing, bronze louvers and projecting
 // cornices continue above the ground floor. Hotel floors remain hotel windows.
 for(const b of masses.filter(b=>b.type==='commercial'))for(let face=0;face<4;face++){
  const a=face*Math.PI/2,c=Math.cos(a),sn=Math.sin(a),span=face%2?b.d:b.w,dep=face%2?b.w:b.d;
  const point=(x,out)=>[b.u+x*c+(dep/2+out)*sn,b.v-x*sn+(dep/2+out)*c];
  const at=(fn,col,x,y,w,h,d,out=.75)=>{const[u,v]=point(x,out);fn(col,u,b.base+y,v,w,h,d,a);};
  const inner=(b.id.endsWith('-west')&&face===1)||(b.id.endsWith('-east')&&face===3)||(b.id==='outlets-south-link'&&face===2);
  let stairX=null;
  if(inner)for(let x=-span/2+7;x<span/2-6;x+=9){const[u,v]=point(x,3.55);if(reserve('stairs',u,v,12,5.6,a)){stairX=x;break;}}
  const bays=Math.max(1,Math.floor(span/7.5)),step=span/bays;
  for(let floor=1;floor<b.levels;floor++)for(let i=0;i<bays;i++){
   const x=-span/2+(i+.5)*step,[u,v]=point(x,.85),w=step-.65,y=floor*4.15;
   if(!safeRing(clearanceRect(u,v,w,.65,a),{lanes:false}))continue;
   report.upperShops.push({building:b.id,floor:floor+1,u,v,base:b.base+y,face});
   at(box,'#303f42',x,y+1.76,w,3.25,.15);at(glass,'#52717c',x,y+1.74,w-.22,3.0,.10,.86);
   for(const dx of [-w/2,0,w/2])at(box,'#b3bdb6',x+dx,y+1.74,.07,3.1,.12,.95);
   at(box,'#7b5140',x-w/2+.5,y+1.8,.75,3.15,.24,1.02);
   for(let ly=.4;ly<3.25;ly+=.20)at(box,'#b48c66',x-w/2+.5,y+ly,.73,.065,.30,1.1);
   at(box,['#3c4440','#70594a','#b6aa95','#53626b'][(i+floor)%4],x,y+3.5,w,.44,.16,1.0);at(box,'#e0d1b4',x,y+.1,step,.22,.65,.85);
   // Double-door handles and shelf rails distinguish an upper shop from a window.
   for(const side of [-1,1])at(box,'#c8c8b9',x+side*.15,y+1.25,.045,.48,.07,1.04);
   if(i%3===0)for(const sy of [.65,1.15,1.65]){at(box,'#b9a98c',x-w*.3,y+sy,1.2,.06,.24,1.02);for(const dx of [-.4,0,.4])at(box,'#d0c7b2',x-w*.3+dx,y+sy+.12,.27,.19,.16,1.04);}
   for(const side of [-1,1]){at(box,'#9d8a73',x+side*w*.32,y+.40,1.15,.5,.25,.97);at(box,i%2?'#b5b5a2':'#8c6456',x+side*w*.32,y+1.3,.65,1.2,.15,.99);}
   if(inner&&stairX!==null&&floor<=2){
    const[tu,tv]=point(x,2.05),ring=clearanceRect(tu,tv,step,2.65,a);
    if(safeRing(ring,{lanes:false})){
     report.terraces.push({building:b.id,floor:floor+1,ring,y:b.base+y});
     at(skin.box.bind(null,'paving'),'#b4aea0',x,y-.08,step,.22,2.65,2.05);
     // Leave openings for both ends of the switchback stair landings.
     for(let dx=-step/2+.35;dx<step/2;dx+=.65){const xx=x+dx;if(Math.abs(Math.abs(xx-stairX)-4.8)<1.1)continue;at(box,'#494a43',xx,y+.59,.045,1.1,.045,3.36);at(box,'#6e6556',xx,y+1.16,.67,.06,.065,3.36);}
    }
   }
  }
  if(stairX!==null){
   // Columns carry the outside landings; feet remain in the reserved stair bay.
   for(const side of [-1,1])at(box,'#72766d',stairX+side*4.7,4.1,.20,8.2,.20,5.5);
   for(let floor=0;floor<Math.min(2,b.levels-1);floor++){
    const y=floor*4.15,dir=floor%2?-1:1;
    for(let j=0;j<24;j++){
     const x=stairX+dir*(-3.8+j*.33),h=(j+1)*4.15/24;
     at(box,'#989b93',x,y+h-.09,.35,.18,2.4,4.55);at(box,'#e1d7bd',x,y+h+.013,.34,.022,2.35,4.55);
     for(const off of [3.38,5.72]){at(box,'#5b625b',x,y+h+.53,.045,1.05,.045,off);at(box,'#b6b5a4',x,y+h+1.07,.40,.065,.065,off);}
    }
    for(const side of [-1,1])at(box,'#b3b4a6',stairX+side*4.7,y+(side===dir?4.15:0)-.09,1.6,.20,5.15,3.16);
    report.stairs.push({building:b.id,from:floor+1,to:floor+2,rise:4.15,treads:24});
   }
  }
 }
 // Each sourced brand receives an actual shop bay, with category-specific goods
 // and a clear double doorway. No people or human-shaped display mannequins.
 const brandSource='https://outletscn.com/news/outlets-news/pingyaoshangteaolai9-30/';
 const taken=[];
 function tenant(b,face,floor,x,w,name,color,kind,photo=false){
  const angle=face*Math.PI/2,c=Math.cos(angle),sn=Math.sin(angle),dep=face%2?b.w:b.d,y0=b.base+floor*4.15;
  const at=(fn,col,dx,y,ww,hh,dd,out=1.12)=>fn(col,b.u+(x+dx)*c+(dep/2+out)*sn,y0+y,b.v-(x+dx)*sn+(dep/2+out)*c,ww,hh,dd,angle);
  const u=b.u+x*c+(dep/2+1.35)*sn,v=b.v-x*sn+(dep/2+1.35)*c;
  // Below the next floor slab, and in front of the existing short rain canopy.
  at(box,color,0,3.46,w,.66,.18,1.73);
  const label=s.sign(name,u+sn*.49,y0+3.46,v+c*.49,w*.90,.49,angle,color,kind==='beauty'?'#473b35':'#f3edda');label.name='奥莱品牌店招-'+name;
  at(glass,kind==='beauty'?'#8a8c85':'#3e5152',0,1.90,w-.20,3.2,.10,.82);
  for(const edge of [-1,1]){
   at(box,kind==='bags'?'#ba9b63':'#b9bcb1',edge*w/2,1.91,.09,3.65,.15,1.02);
   at(box,'#aeb5ab',edge*.84,1.7,.055,3.2,.08,1.12);at(box,'#d8c9a5',edge*.15,1.35,.04,.45,.07,1.18);
  }
  at(box,'#d6c4a0',0,3.78,w,.055,.22,1.1);
  for(const side of [-1,1]){
   const dx=side*w*.33,displayW=Math.min(1.7,w*.24);
   at(box,kind==='beauty'?'#d2c2ac':'#9c8b6d',dx,.42,displayW,.32,.22,1.00);
   if(kind==='sports'||kind==='shoes'){
    for(const sy of [.85,1.4,1.95]){
     at(box,'#a8a794',dx,sy,displayW,.065,.23,1.04);
     for(const k of [-1,0,1]){at(box,k===0?'#ddd6be':'#777e79',dx+k*displayW*.29,sy+.12,.30,.19,.13,1.10);at(box,'#d7d1c0',dx+k*displayW*.29+.05,sy+.035,.40,.055,.15,1.12);}
    }
   }else if(kind==='bags'){
    for(const sy of [.9,1.8]){at(box,'#bb9c67',dx,sy,displayW,.06,.24,1.04);for(const k of [-1,1]){at(box,k>0?'#98734f':'#3c4140',dx+k*.37,sy+.27,.42,.45,.15,1.11);at(box,'#b99c68',dx+k*.37,sy+.54,.24,.035,.05,1.11);for(const hand of [-1,1])at(box,'#b99c68',dx+k*.37+hand*.12,sy+.49,.035,.13,.05,1.11);}}
   }else if(kind==='beauty'){
    for(const sy of [.85,1.35,1.85,2.35]){at(box,'#c2b5a1',dx,sy,displayW,.055,.22,1.03);for(let k=0;k<6;k++)at(box,['#d5b8b3','#bdab7c','#eee0c6'][k%3],dx-displayW*.4+k*displayW*.16,sy+.15,.12,.25,.10,1.11);}
   }else if(kind==='dining'){
    at(box,'#8a6749',dx,.92,displayW,.25,.3,1.05);at(box,'#d3b47c',dx,1.12,displayW*.85,.06,.21,1.09);
    for(const k of [-1,0,1]){at(box,'#e2d0a8',dx+k*.40,1.27,.20,.26,.13,1.12);at(box,'#b84d36',dx+k*.4,1.34,.22,.06,.14,1.13);}
   }else{
    // Hanging garments have visible rails and hangers, rather than heads/legs.
    at(box,'#b6b5a7',dx,2.55,displayW,.055,.08,1.06);
    for(const k of [-1,0,1]){const xx=dx+k*displayW*.29;at(box,'#b6b5a7',xx,2.44,.035,.21,.05,1.06);at(box,['#ba9d83','#536c71','#b9b9a4'][k+1],xx,1.91,.35,.82,.13,1.11);at(box,'#b3a58e',xx,2.23,.48,.11,.12,1.11);}
   }
  }
  taken.push({building:b.id,face,floor,x,w});
  report.tenants.push({name,building:b.id,face,floor:floor+1,u,v,w,kind,placementEstimated:true,source:photo?'https://www.amap.com/place/B0K0TUX1YO':brandSource});
 }
 for(const[id,face,floor,name,color,kind]of [['outlets-middle-west',0,0,'必胜客','#9e3029','dining'],['outlets-middle-west',0,1,'Kirakira Beauty','#d7c9b5','beauty'],['outlets-middle-east',2,0,'MCM','#263a32','bags']]){
  const b=masses.find(b=>b.id===id);tenant(b,face,floor,0,Math.min(13,b.w-2),name,color,kind,true);
 }
 const brands=[['NIKE','#272c2b','sports'],['ADIDAS','#313937','sports'],['PINKO','#574b4d','bags'],['LACOSTE','#315446','clothes'],['TOMMY','#354353','clothes'],['CK','#353735','clothes'],['波司登','#81433a','clothes'],['斯凯奇','#364c63','shoes'],['I.T','#333734','clothes'],['AIGLE','#435443','clothes'],['雅格狮丹','#655744','clothes'],['丹尼爱特','#716459','bags']];
 const candidates=report.shopfronts.map(p=>{const b=masses.find(b=>b.id===p.building),span=p.face%2?b.d:b.w,step=span/Math.max(1,Math.floor(span/7.5));return {...p,b,x:-span/2+(p.bay+.5)*step,w:step-.65,inner:(b.id.endsWith('-west')&&p.face===1)||(b.id.endsWith('-east')&&p.face===3)||(b.id==='outlets-south-link'&&p.face===2)};}).filter(p=>p.b.type==='commercial').sort((a,b)=>Number(b.inner)-Number(a.inner)||a.bay-b.bay);
 for(const [name,color,kind]of brands){const p=candidates.find(p=>!taken.some(t=>t.building===p.building&&t.face===p.face&&t.floor===0&&Math.abs(t.x-p.x)<(t.w+p.w)/2+.3)&&!report.furniture.some(f=>f.kind==='stairs'&&clearancePolygonsOverlap(f.ring,clearanceRect(p.u+Math.sin(p.face*Math.PI/2)*1.6,p.v+Math.cos(p.face*Math.PI/2)*1.6,2.3,3.6,p.face*Math.PI/2))));if(!p)continue;tenant(p.b,p.face,0,p.x,p.w,name,color,kind);}
 // Perimeter details reuse the reviewed parking/planting positions.
 for(const [i,[u,v]]of records.parking.entries()){
  if(i%3===0&&reserve('parking-stop',u,v+3.5,1.5,.3)){const y=s.ground(u,v+3.5);box('#51564e',u,y+.33,v+3.5,1.4,.16,.22);for(const dx of [-.45,.45])box('#d6b34e',u+dx,y+.42,v+3.5,.24,.02,.24);}
 }
 for(const [i,[u,v]]of records.trees.entries()){
  if(i%4===0&&reserve('directory',u+3.4,v,1.5,.7)){const y=s.ground(u+3.4,v);box('#514d44',u+3.4,y+1.7,v,1.3,3.1,.24);s.sign('品牌导览',u+3.4,y+2.85,v+.14,1.15,.28,0,'#514d44','#f5e9d0');const brands=['MCM · PINKO · I.T','LACOSTE · TOMMY · CK','NIKE · ADIDAS','波司登 · 斯凯奇','Kirakira · 必胜客'];brands.forEach((t,k)=>s.sign(t,u+3.4,y+2.35-k*.32,v+.14,1.16,.19,0,'#514d44','#e9dfcb'));}
  if(i%2===0&&reserve('shrub-bed',u-3.2,v,2.4,1.3)){const y=s.ground(u-3.2,v);skin.box('stone','#9b9585',u-3.2,y+.35,v,2.3,.45,1.2);for(let j=0;j<5;j++)s.part('globe',j%2?'#738154':'#597152',u-4+j*.4,y+.72,v,.70,.65,.90);}
 }
 // Seats along planted edges and slim litter bins, never in the central lanes.
 for(const [i,p] of records.trees.entries()){
  const [u,v]=p;
  for(const side of [-1,1])if(reserve('bench',u+side*3.2,v,2.3,1.1)){
   const x=u+side*3.2,y=s.ground(x,v);for(const dx of [-.85,.85])box('#526159',x+dx,y+.5,v,.1,.6,.6);
   for(let j=0;j<4;j++)box('#8f7959',x,y+.76,v-.25+j*.16,2.15,.08,.12);box('#8f7959',x,y+1.05,v-.32,2.15,.4,.09);break;
  }
  if(i%3===0&&reserve('bin',u,v+2.2,.8,.8)){const y=s.ground(u,v+2.2);box('#687366',u,y+.7,v+2.2,.6,1,.6);box('#b3b8a8',u,y+1.24,v+2.2,.68,.08,.68);box('#35483e',u,y+1.04,v+2.51,.36,.1,.03);}
 }
 s.root.userData.outletsDetails=report;
 report.brandSource='https://xiaofei.tom.com/202610/4682420493.html';
 report.brandDirectoryPlacementVerified=false;
 const surfaces=skin.finish();return {dispose(){surfaces.dispose();cladding.dispose();}};
}
