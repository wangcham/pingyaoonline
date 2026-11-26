import * as T from 'three';
import {createSurveySurfaces} from './survey-surfaces.js';
import {createTreeBatch} from './vegetation.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {qixiangSurvey,qixiangCourts,qixiangSolids,qixiangBoundary,qixiangLaneSurfaces,qixiangRoofColors,qixiangSolidClear,qixiangPublicClear,qixiangPoint} from './qixiang-block-data.js';

// One bounded residential block, with opaque geometry and shared materials.
// Roofs and walls remain visible at all distances; only small props have LOD.
export function addQixiangBlock(scene){
 const root=new T.Group();root.name='C03-01 七号巷北侧精细院落';scene.add(root);
 const architecture=new T.Group(),smallDetails=new T.Group();root.add(architecture,smallDetails);
 const surfaces=createSurveySurfaces(architecture),trees=createTreeBatch(smallDetails,{leafDensity:24,park:true});
 const geo={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(.5,.5,1,10),wheel:new T.TorusGeometry(.32,.047,6,14),sphere:new T.IcosahedronGeometry(.5,1)};
 const groups=new Map(),nightMaterials=[],details=[],wallRecords=[],gateRecords=[],textureMaps=[];
 const color=new T.Color(),vertex=new T.Vector3(),uv=new T.Vector2(),matrix=new T.Matrix4(),rotation=new T.Matrix4();
 function texture(kind){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#d0cec5';ctx.fillRect(0,0,256,256);
  if(kind==='brick'){
   ctx.fillStyle='#9e9e96';ctx.fillRect(0,0,256,256);
   for(let row=0;row<16;row++)for(let col=-1;col<8;col++){
    const x=col*36+(row%2)*18,y=row*16,n=173+((row*13+col*7)%27);
    ctx.fillStyle=`rgb(${n+5},${n+4},${n})`;ctx.fillRect(x+1,y+1,34,14);
    ctx.fillStyle='#ffffff18';ctx.fillRect(x+2,y+2,32,1);
   }
  }else if(kind==='tile'){
   ctx.fillStyle='#8b9087';ctx.fillRect(0,0,256,256);
   for(let x=0;x<256;x+=16){ctx.fillStyle='#4c564c';ctx.fillRect(x,0,2,256);ctx.fillStyle='#b8bcb1';ctx.fillRect(x+3,0,2,256);}
   ctx.fillStyle='#555b5166';for(let y=0;y<256;y+=28)ctx.fillRect(0,y,256,2);
  }else if(kind==='sheet'){
   ctx.fillStyle='#c2cbcb';ctx.fillRect(0,0,256,256);for(let x=0;x<256;x+=16){ctx.fillStyle='#748185';ctx.fillRect(x,0,2,256);ctx.fillStyle='#e2e5e3';ctx.fillRect(x+3,0,3,256);}
  }else if(kind==='solar'){
   ctx.fillStyle='#253b4b';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#a9b5b7';for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=48)ctx.strokeRect(x+1,y+1,46,30);
  }
  for(let i=0;i<950;i++){ctx.fillStyle=i%2?'#ffffff0c':'#0000000a';ctx.fillRect(i*71%256,(i*43+Math.floor(i/13))%256,1,1);}
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;textureMaps.push(t);return t;
 }
 const mats={};
 for(const kind of ['brick','tile','sheet','solar']){const map=texture(kind);mats[kind]=new T.MeshStandardMaterial({map,vertexColors:true,bumpMap:map,bumpScale:kind==='brick'?.028:.018,roughness:kind==='sheet'?.55:.9,side:T.DoubleSide});}
 for(const kind of ['stone','paint','metal','rubber','leaf','glass','litglass'])mats[kind]=new T.MeshStandardMaterial({vertexColors:true,roughness:kind.includes('glass')?.35:kind==='metal'?.57:.91,metalness:kind==='metal'?.2:0,side:T.DoubleSide});
 mats.litglass.emissive=new T.Color('#e9be79');nightMaterials.push(mats.litglass);
 const lampMaterial=new T.MeshStandardMaterial({vertexColors:true,color:'#f2e7bb',emissive:'#f3c97c',emissiveIntensity:0,roughness:.65});mats.lamp=lampMaterial;
 function append(g,kind,paint,x,y,z,w=1,h=1,d=1,yaw=0,rx=0,rz=0,fine=false){
  const key=(fine?'detail:':'body:')+kind;if(!groups.has(key))groups.set(key,{positions:[],uv:[],colors:[],indices:[],kind,fine});
  const b=groups.get(key),base=b.positions.length/3,p=g.attributes.position,tex=g.attributes.uv,norm=g.attributes.normal;
  matrix.makeRotationY(yaw);rotation.makeRotationFromEuler(new T.Euler(rx,0,rz));matrix.multiply(rotation);matrix.scale(new T.Vector3(w,h,d));matrix.setPosition(x,y,z);color.set(paint);
  for(let i=0;i<p.count;i++){
   vertex.fromBufferAttribute(p,i).applyMatrix4(matrix);b.positions.push(vertex.x,vertex.y,vertex.z);b.colors.push(color.r,color.g,color.b);
   uv.set(tex?.getX(i)??0,tex?.getY(i)??0);
   if(kind==='brick'&&norm){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));uv.x*=nx>.5?d/1.6:w/1.6;uv.y*=ny>.5?d/1.6:h/1.6;}
   b.uv.push(uv.x,uv.y);
  }
  const indices=g.index?.array??Array.from({length:p.count},(_,i)=>i);for(const i of indices)b.indices.push(base+i);
 }
 function local(q,kind,paint,u,y,v,w,h,d,extraYaw=0,rx=0,fine=false,shape='box'){
  const c=Math.cos(q.angle),s=Math.sin(q.angle);append(geo[shape],kind,paint,q.x+u*c+v*s,y,q.z-u*s+v*c,w,h,d,q.angle+extraYaw,rx,0,fine);
 }
 function rod(q,kind,paint,a,b,radius=.035,fine=true){
  const c=Math.cos(q.angle),s=Math.sin(q.angle),world=p=>new T.Vector3(q.x+p[0]*c+p[2]*s,p[1],q.z-p[0]*s+p[2]*c),from=world(a),to=world(b),delta=to.clone().sub(from),g=geo.cylinder.clone();
  const m=new T.Matrix4().compose(from.add(to).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()),new T.Vector3(radius*2,delta.length(),radius*2));g.applyMatrix4(m);append(g,kind,paint,0,0,0,1,1,1,0,0,0,fine);g.dispose();
 }
 function pitchedRoof(p,base,rise){
  const w=p.w+.48,d=p.d+.4,x=w/2,z=d/2;
  const a=[[-x,0,-z],[x,0,-z],[-x,rise,0],[x,rise,0],[-x,0,z],[x,0,z]],faces=[[0,1,3],[0,3,2],[2,3,5],[2,5,4],[0,2,4],[1,5,3]],vertices=[],uvs=[];
  for(const face of faces)for(const i of face){vertices.push(...a[i]);uvs.push((a[i][0]+x)/2.4,(a[i][2]+z)/2.4);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();
  append(g,p.roof==='blue'?'sheet':'tile',qixiangRoofColors[p.roof],p.x,base,p.z,1,1,1,p.angle);g.dispose();
  local(p,'stone','#686c64',0,base+rise+.07,0,w,.14,.2);
  for(const side of [-1,1]){local(p,'metal','#777a70',0,base-.07,side*(d/2+.02),w,.13,.12);}
 }
 surfaces.polygon(qixiangBoundary,'#a6a18f',.052,'ground');
 for(const q of qixiangCourts)surfaces.polygon(q.ring,q.layout===0?'#b7b1a2':q.layout===1?'#a9a69b':'#beb7a6',.10,q.layout===1?'ground':'courtyard');
 // No repeated flat layer on top of OSM roads. Internal passages get textured
 // surfaces and flush drain covers; drivable perimeter roads remain original.
 for(const lane of qixiangLaneSurfaces)surfaces.polygon(lane.ring,lane.kind==='passage'?'#999a8e':'#8f928a',.125,lane.kind==='passage'?'courtyard':'asphalt');
 for(const p of qixiangSolids){
  const h=p.levels*3.05,base=.15,roofRise=p.roof==='blue'?.34:.8,owner=qixiangCourts.find(q=>q.id===p.parent),id=owner.band*10+owner.row*2+owner.half;
  local(p,'brick',p.roof==='light'?'#b8b2a4':'#9d9b8e',0,base+h/2,0,p.w,h,p.d);
  local(p,'stone','#85877e',0,.32,0,p.w+.08,.34,p.d+.08);
  if(p.roof==='light'){
   local(p,'stone','#bcb8a9',0,base+h+.12,0,p.w+.18,.24,p.d+.18);
   for(const side of [-1,1]){local(p,'stone','#ada99a',0,base+h+.42,side*(p.d/2-.09),p.w,.45,.18);local(p,'stone','#ada99a',side*(p.w/2-.09),base+h+.42,0,.18,.45,p.d);}
  }else pitchedRoof(p,base+h,roofRise);
  // Exposed gable/rainwater stack: actual thin geometry, no painted black line.
  for(const side of [-1,1])local(p,'metal','#92968b',side*(p.w/2-.2),h/2+.15,p.d/2+.12,.075,h,.075,0,0,true);
  for(let floor=0;floor<p.levels;floor++)for(let face=0;face<4;face++){
   const span=face%2?p.d:p.w,depth=face%2?p.w:p.d,a=face*Math.PI/2,ca=Math.cos(a),sa=Math.sin(a),n=Math.max(1,Math.floor(span/3));
   for(let i=0;i<n;i++){
    const off=(i+.5)*span/n-span/2;if(face===0&&floor===0&&Math.abs(off-owner.gateOffset)<1.35&&p.role==='main')continue;
    const u=off*ca+(depth/2+.045)*sa,v=-off*sa+(depth/2+.045)*ca,ww=Math.min(1.65,span/n*.63),hh=p.role==='annex'?.7:1.32,y=.15+floor*3.05+1.8;
    local(p,'stone','#d0cbbd',u,y,v,ww+.18,hh+.18,.09,a);
    local(p,(id+i+floor)%4===0?'litglass':'glass','#61737a',u+sa*.06,y,v+ca*.06,ww,hh,.045,a);
    local(p,'paint','#ccc9bd',u+sa*.09,y,v+ca*.09,.045,hh,.055,a,0,true);
    local(p,'stone','#b0b0a2',u,y-hh/2-.1,v,ww+.24,.12,.25,a);
    if(p.role==='main'&&floor===0)for(const k of [-.5,0,.5])local(p,'metal','#777d74',u+k*ww*ca+sa*.16,y,v-k*ww*sa+ca*.16,.024,hh,.024,a,0,true);
   }
  }
  if(p.role==='main'){
   const doorX=owner.gateOffset;
   local(p,'stone','#aaa598',doorX,1.29,p.d/2+.035,1.25,2.3,.1);
   local(p,'paint',id%2?'#5f6d69':'#746354',doorX,1.25,p.d/2+.11,1.05,2.17,.13);
   local(p,'glass','#758383',doorX,1.71,p.d/2+.19,.79,.6,.035);
   local(p,'metal','#b8b9a7',doorX+.35,1.10,p.d/2+.2,.045,.21,.035,0,0,true);
   local(p,'stone','#a8a597',doorX,.19,p.d/2+.30,1.55,.14,.6);
   local(p,'sheet','#8e9690',doorX,2.52,p.d/2+.35,1.7,.09,.8,0,.10);
   local(p,'paint','#a7ada6',p.w/2-1.15,2.45,p.d/2+.27,.85,.55,.45,0,0,true);
   local(p,'metal','#626d69',p.w/2-1.15,2.45,p.d/2+.51,.36,.36,.045,0,Math.PI/2,true,'cylinder');
   for(const off of [-.27,.27])local(p,'metal','#7b8177',p.w/2-1.15+off,2.09,p.d/2+.3,.05,.12,.45,0,0,true);
   // Domestic solar water heaters occur on selected roofs, with a tank and
   // sloping collector. They are reference details, not measured installations.
   if(id%3===0&&p.levels===1){
    const y=base+h+roofRise+.25,u=p.w*.22;
    local(p,'solar','#b0c0c4',u,y+.35,-.5,1.7,.06,1.65,0,.38,true);
    // The cylindrical tank axis lies along the ridge.
    rod(p,'metal','#d0d3ca',[u-.9,y+.78,-1.25],[u+.9,y+.78,-1.25],.22);
    for(const side of [-1,1])rod(p,'metal','#707b78',[u+side*.65,y-.15,.15],[u+side*.65,y+.78,-1.25],.035);
   }
  }
 }
 function freeProp(q,u,v,w,d,kind,build){
  const c=Math.cos(q.angle),s=Math.sin(q.angle),x=q.x+u*c+v*s,z=q.z-u*s+v*c,ring=clearanceRect(x,z,w,d,q.angle,.08);
  if(Math.abs(u)+w/2>q.w/2-.45||Math.abs(v)+d/2>q.d/2-.45||!qixiangSolidClear(ring)||!qixiangPublicClear(ring))return false;
  // Preserve the passage from the gate to the front door, plus other props.
  if(Math.abs(u-q.gateOffset)<w/2+.7||details.some(p=>p.parent===q.id&&clearancePolygonsOverlap(p.ring,ring)))return false;
  details.push({parent:q.id,kind,x,z,w,d,ring,estimated:true});build();return true;
 }
 for(const q of qixiangCourts){
  const front=q.d/2-.14,gate=q.gateOffset,gap=2.15,wallH=1.9,id=q.band*10+q.row*2+q.half;
  for(const side of [-1,1]){
   local(q,'brick','#99998d',side*(q.w/2-.13),wallH/2+.12,0,.25,wallH,q.d);
   local(q,'stone','#858a80',side*(q.w/2-.13),wallH+.19,0,.32,.14,q.d);
  }
  local(q,'brick','#99998d',0,wallH/2+.12,-q.d/2+.13,q.w,wallH,.25);
  for(const [a,b] of [[-q.w/2,gate-gap/2],[gate+gap/2,q.w/2]]){local(q,'brick','#99998d',(a+b)/2,wallH/2+.12,front,b-a,wallH,.27);local(q,'stone','#858a80',(a+b)/2,wallH+.19,front,b-a,.14,.34);}
  for(const side of [-1,1])local(q,'brick','#9c9b8d',gate+side*(gap/2+.14),1.25,front,.32,2.25,.40);
  // Open gates leave the entry navigable and make the yard readable at eye level.
  for(const side of [-1,1]){
   const u=gate+side*(gap/2-.10),v=front-.5;
   local(q,'paint',id%3===0?'#78614f':id%3===1?'#536e66':'#64717b',u,1.07,v,.075,1.85,.96,side*.12);
   for(let k=-.35;k<.4;k+=.16)local(q,'metal','#89918a',u,1.07,v+k,.085,1.7,.025,side*.12,0,true);
  }
  local(q,'stone','#acaa9b',gate,2.48,front,2.85,.24,.75);
  local(q,'tile','#737b6c',gate,2.65,front,3.02,.1,.88);
  local(q,'lamp','#f4e4b6',gate+gap/2+.36,2.0,front-.28,.18,.22,.15,0,0,true);
  local(q,'paint','#9caa9d',gate-gap/2-.3,1.35,front-.16,.26,.35,.13,0,0,true);
  const c=Math.cos(q.angle),s=Math.sin(q.angle),world=(u,v)=>[q.x+u*c+v*s,q.z-u*s+v*c];
  const path=[world(gate,-q.d/2+5.35),world(gate,q.d/2)];surfaces.strip(...path,1.25,'#bfbdb0',.113,'courtyard');
  local(q,'stone','#92978b',0,.125,front-.30,q.w-.6,.035,.15);
  local(q,'metal','#626e63',gate,.145,front-.30,1.5,.024,.2,0,0,true);
  for(let k=-.6;k<=.6;k+=.12)local(q,'metal','#a2a89a',gate+k,.161,front-.30,.025,.01,.18,0,0,true);
  gateRecords.push({parent:q.id,center:world(gate,front),width:gap-.30,openingWidth:gap,open:true,doorRoute:path});wallRecords.push({parent:q.id,ring:q.ring,height:wallH});
  const side=q.wing==='west'?1:-1,freeU=side*q.w*.27,freeV=q.d*.03;
  // A visible canopy in the western roof band takes precedence over props.
  // Other yards receive small pots rather than arbitrary full-size trees.
  if(q.hasCanopy){const u=side*q.w*.23,v=.65;freeProp(q,u,v,2.5,2.5,'yard-tree',()=>{const [x,z]=world(u,v);trees.tree({x,z,height:3.8,crown:2.15,base:.12},id);});}
  // Benches, planters and parked two-wheelers stay within private yards.
  freeProp(q,freeU,freeV,1.75,.68,'bench',()=>{
   for(let slat=-2;slat<=2;slat++)local(q,'paint','#8f7961',freeU,.52,freeV+slat*.09,1.65,.065,.065,0,0,true);
   for(const off of [-.62,.62])local(q,'metal','#596962',freeU+off,.31,freeV,.055,.4,.53,0,0,true);
  });
  freeProp(q,freeU,1.65,.7,.7,'planter',()=>{
   local(q,'stone','#a18d74',freeU,.38,1.65,.55,.5,.55,0,0,true,'cylinder');
   local(q,'leaf','#657d58',freeU,.88,1.65,.72,.85,.66,0,0,true,'sphere');
  });
  const bikeU=-side*q.w*.12,bikeV=q.d*.22;
  freeProp(q,bikeU,bikeV,2,.75,id%2?'bicycle':'scooter',()=>{
   for(const off of [-.62,.62])local(q,'rubber','#434c45',bikeU+off,.43,bikeV,1,1,1,0,0,true,'wheel');
   if(id%2){
    const a=[bikeU-.62,.43,bikeV],b=[bikeU,.88,bikeV],d=[bikeU+.62,.43,bikeV],e=[bikeU+.3,1.04,bikeV];
    for(const [p,r] of [[a,b],[b,d],[a,d],[b,e],[e,d]])rod(q,'metal','#70858a',p,r,.025);
    local(q,'rubber','#484f49',bikeU,.97,bikeV,.35,.075,.2,0,0,true);
    rod(q,'metal','#a0a89c',e,[bikeU+.3,1.2,bikeV],.025);rod(q,'metal','#a0a89c',[bikeU+.3,1.2,bikeV-.24],[bikeU+.3,1.2,bikeV+.24],.025);
   }else{
    local(q,'paint',id%3?'#7b8b89':'#b49b87',bikeU,.63,bikeV,1.15,.32,.45,0,0,true);
    local(q,'rubber','#47524e',bikeU-.18,.89,bikeV,.78,.12,.48,0,0,true);
    local(q,'paint','#82928b',bikeU+.49,.94,bikeV,.15,.75,.46,0,-.15,true);
    rod(q,'metal','#a4ada2',[bikeU+.49,1.33,bikeV-.28],[bikeU+.49,1.33,bikeV+.28],.025);
   }
  });
  const nearGateU=gate+side*2.05,nearGateV=q.d/2-.65;
  freeProp(q,nearGateU,nearGateV,.5,.5,'bin',()=>{local(q,'paint','#6d7f6a',nearGateU,.47,nearGateV,.42,.7,.42,0,0,true);local(q,'paint','#596d5c',nearGateU,.84,nearGateV,.46,.08,.46,0,0,true);});
  if(id%3===1){const u=-side*q.w*.10,v=.7;freeProp(q,u,v,2.4,.65,'drying-rack',()=>{
   for(const off of [-1,1])rod(q,'metal','#88968c',[u+off,.12,v],[u+off,1.9,v],.022);
   rod(q,'metal','#89958e',[u-1,1.9,v],[u+1,1.9,v],.012);
   for(const [off,col] of [[-.55,'#b5b8a8'],[.10,'#8e9d9e'],[.65,'#b0a89b']])local(q,'paint',col,u+off,1.52,v,.38,.65,.022,0,0,true);
  });}
 }
 // Covers and rain grilles sit flush in the passage. Wall-mounted lights avoid
 // narrowing the already small lanes with rows of decorative poles or trees.
 for(const u of [146,307.5,452,599.5,746])for(const v of [63,187,304]){
  const [x,z]=qixiangPoint(u,v),q={x,z,angle:qixiangCourts[0]?.angle??0};
  if(!qixiangSolidClear(clearanceRect(x,z,.55,.55,q.angle)))continue;
  local(q,'metal','#717a70',0,.14,0,.55,.024,.55,0,0,true);
  for(let k=-.2;k<=.2;k+=.08)local(q,'rubber','#515e54',k,.154,0,.025,.008,.4,0,0,true);
 }
 for(const b of groups.values()){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.colors,3));g.setIndex(b.indices);g.computeVertexNormals();g.computeBoundingSphere();
  const m=new T.Mesh(g,mats[b.kind]);m.name=`七号巷-${b.fine?'生活细节':'建筑'}-${b.kind}`;m.castShadow=!['glass','litglass','lamp'].includes(b.kind);m.receiveShadow=true;(b.fine?smallDetails:architecture).add(m);
 }
 Object.values(geo).forEach(g=>g.dispose());surfaces.finish();trees.finish();
 root.userData={survey:qixiangSurvey,heightRecords:qixiangSolids,approximate:true,courtyardRecords:qixiangCourts,wallRecords,gateRecords,detailRecords:details};
 const center=qixiangPoint(440,150);let near=true;
 return {root,setNight(value){nightMaterials.forEach(m=>{m.emissiveIntensity=value?.32:0;});lampMaterial.emissiveIntensity=value?1.7:0;},update(camera){
  const distance=Math.hypot(camera.position.x-center[0],camera.position.z-center[1],camera.position.y),visible=near?distance<520:distance<400;
  if(visible!==near){near=visible;smallDetails.visible=near;return true;}return false;
 }};
}
