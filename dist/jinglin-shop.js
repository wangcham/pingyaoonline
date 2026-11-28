import * as T from 'three';
import {createCommerceMaterials} from './local-commerce-materials.js';

// Amap B0FFFY2Y9H: brown/silver sign, raised blue shutter, white tiled wall,
// outward-opening brown glass doors, aluminium partition, tray rack and fan.
// User-confirmed layout: fryer on entry left; cakes and matching wall labels on right.
// Dimensions and equipment shapes remain estimates from the three photos.
export function addJinglinShop(parent,{x,z,yaw,width,depth,base}){
 const root=new T.Group();root.name='景林江米油糕 · 照片细化门店';root.position.set(x,base,z);root.rotation.y=yaw;parent.add(root);
 const front=depth/2,skin=createCommerceMaterials(root,{chunkSize:20}),batches=new Map(),materials=new Map(),geometries=new Map();
 const transform=new T.Object3D(),tint=new T.Color(),textures=[],signs=[],detail=new T.Group();detail.name='景林门店近景细节';root.add(detail);
 function mat(key,color,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.82,...extra});materials.set(key,m);return m;}
 mat('paint','#ffffff');mat('metal','#d0d0be',{metalness:.65,roughness:.36});mat('darkMetal','#6b6558',{metalness:.5,roughness:.43});
 mat('glass','#93a9a2',{transparent:true,opacity:.24,roughness:.22,metalness:.15,depthWrite:false,side:T.DoubleSide});
 mat('frosted','#87948b',{roughness:.63});mat('blue','#123f79',{metalness:.25,roughness:.4});mat('wood','#87704a');
 mat('light','#ede4c6',{emissive:'#ffe1a3',emissiveIntensity:.15});
 geometries.set('box',new T.BoxGeometry(1,1,1));geometries.set('sphere',new T.SphereGeometry(.5,16,10));geometries.set('cylinder',new T.CylinderGeometry(.5,.5,1,16));
 geometries.set('ring',new T.TorusGeometry(.5,.012,5,40));
 function part(kind,key,color,px,py,pz,w,h,d,rotation=[0,0,0],fine=false){
  const id=`${kind}|${key}|${fine}`;if(!batches.has(id))batches.set(id,[]);
  transform.position.set(px,py,pz);transform.scale.set(w,h,d);transform.rotation.set(...rotation,'YXZ');transform.updateMatrix();
  batches.get(id).push({matrix:transform.matrix.clone(),color});
 }
 const box=(key,color,px,py,pz,w,h,d,fine=false)=>part('box',key,color,px,py,pz,w,h,d,[0,0,0],fine);
 function rod(a,b,r,key='metal',color='#ffffff',fine=true){
  const dir=new T.Vector3(...b).sub(new T.Vector3(...a));transform.position.set(...a.map((v,i)=>(v+b[i])/2));transform.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());transform.scale.set(r*2,dir.length(),r*2);transform.updateMatrix();
  const id=`cylinder|${key}|${fine}`;if(!batches.has(id))batches.set(id,[]);batches.get(id).push({matrix:transform.matrix.clone(),color});
 }
 function panel(kind,color,px,py,pz,w,h,d){skin.box(kind,color,px,py,pz,w,h,d);}
 function label(text,px,py,pz,w,h,{bg=null,ink='#eeeeea',vertical=false,silver=false}={}){
  const canvas=document.createElement('canvas');canvas.width=silver?1536:512;canvas.height=vertical?1024:256;const c=canvas.getContext('2d');
  c.clearRect(0,0,canvas.width,canvas.height);
  if(bg){c.fillStyle=bg;c.fillRect(0,0,canvas.width,canvas.height);}
  c.textAlign='center';c.textBaseline='middle';c.font=`bold ${vertical?104:silver?192:100}px "STKaiti","KaiTi","Songti SC",serif`;
  const draw=()=>{if(vertical)[...text].forEach((ch,i)=>c.fillText(ch,256,85+i*(850/Math.max(1,text.length-1)),440));else c.fillText(text,canvas.width/2,canvas.height*.54,canvas.width*.94);};
  if(silver){c.strokeStyle='#4c4a43';c.lineWidth=9;c.strokeText(text,768,138,1440);c.shadowColor='#292722';c.shadowBlur=5;c.shadowOffsetX=5;c.shadowOffsetY=9;const g=c.createLinearGradient(0,20,0,225);g.addColorStop(0,'#fffdf4');g.addColorStop(.42,'#cacfcf');g.addColorStop(.6,'#f5f4eb');g.addColorStop(1,'#939a9c');c.fillStyle=g;}else c.fillStyle=ink;
  draw();const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;textures.push(map);
  const material=new T.MeshStandardMaterial({map,transparent:!bg,alphaTest:bg?0:.12,roughness:silver?.35:.85,metalness:silver?.42:0,emissive:'#fff1d6',emissiveMap:map,emissiveIntensity:0,side:T.DoubleSide});signs.push(material);
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);mesh.position.set(px,py,pz);mesh.name=text;root.add(mesh);return mesh;
 }
 // Open building shell. The entrance is a genuine hole, not a glass sticker on a box.
 const opening=2.6,wallH=4.45;
 panel('plaster','#c8c6b8',0,wallH/2,-depth/2+.12,width,wallH,.24);
 for(const side of [-1,1])panel('plaster','#d4d2c7',side*(width/2-.1),wallH/2,0,.2,wallH,depth);
 panel('stone','#c6c2b2',0,.045,0,width,.09,depth);
 panel('plaster','#b4b1a5',0,4.4,0,width,.18,depth);
 for(const side of [-1,1]){
  const span=(width-opening)/2;
  box('paint','#d3d4c7',side*(opening/2+span/2),1.6,front,span,3.2,.22);
  for(let y=.45;y<3.2;y+=.46)box('paint','#9d9e94',side*(opening/2+span/2),y,front+.116,span,.012,.012,true);
  box('paint','#b0afa0',side*(opening/2+span*.65),1.6,front+.12,.012,3.15,.014,true);
 }
 box('paint','#b4b2a1',0,3.05,front,width,.35,.24);
 // Weathered concrete doorstep and discrete tile joints, without a tall floating plinth.
 panel('stone','#92948a',0,.08,front+.33,width,.16,.86);
 panel('stone','#b9b9a9',0,.16,front+.11,2.75,.11,.46);
 for(let u=-2;u<2;u+=.42)box('paint','#797f74',u,.165,front+.55,.015,.012,.35,true);
 // Broad taupe sign cassette with panel seams, metal trims and screw heads.
 box('paint','#82715f',0,3.8,front+.04,width,1.18,.23);
 for(const y of [3.19,4.42])box('metal','#ededdf',0,y,front+.16,width+.04,.055,.13);
 for(const u of [-width*.31,width*.31]){box('paint','#4d4c41',u,3.8,front+.162,.014,1.15,.018,true);for(const y of [3.3,4.28])part('sphere','metal','#c6c8bb',u,y,front+.19,.035,.035,.015,[0,0,0],true);}
 label('景林江米油糕',0,3.79,front+.205,width*.88,.71,{silver:true});
 // Raised corrugated blue shutter and its guide rails, as in the exterior photo.
 box('blue','#ffffff',0,2.96,front+.19,opening+.1,.46,.23);
 for(let y=2.76;y<3.18;y+=.035)box('blue',Math.round(y*100)%2?'#6b8da9':'#c0cfcb',0,y,front+.317,opening+.06,.012,.025,true);
 for(const side of [-1,1]){box('darkMetal','#d6c09d',side*1.335,1.45,front+.16,.065,2.7,.09);box('darkMetal','#4f493c',side*1.3,1.46,front+.22,.045,2.66,.09);}
 // Fixed upper transom, side lights, open lower doors and visible handles / hinges.
 for(const u of [-1.3,-.63,.1,.74,1.3])box('darkMetal','#b5a88b',u,2.35,front+.19,.055,.77,.09);
 for(const y of [.22,1.96,2.73])box('darkMetal','#c5b393',0,y,front+.2,opening,.065,.11);
 for(const u of [-.96,-.27,.42,1.02])box('glass','#e4e9dd',u,2.35,front+.17,.58,.68,.02);
 for(const side of [-1,1]){
  box('glass','#d5dfd5',side*1.1,1.08,front+.18,.35,1.65,.02);
  box('darkMetal','#a18d6f',side*.9,1.09,front+.2,.055,1.75,.1);
  const angle=side*.98,hinge=side*.89,leaf=.82,center=hinge-side*leaf/2*Math.cos(angle),zz=front+.24+Math.abs(leaf/2*Math.sin(angle));
  part('box','glass','#dfe5d8',center,1.09,zz,leaf-.08,1.65,.018,[0,angle,0]);
  for(const sign of [-1,1]){
   const u=sign*leaf/2;part('box','darkMetal','#9d8469',center+u*Math.cos(angle),1.09,zz-u*Math.sin(angle),.055,1.78,.09,[0,angle,0]);
   part('box','darkMetal','#ae967a',center,1.09+sign*.88,zz,leaf,.06,.09,[0,angle,0]);
  }
  const handleX=center-side*.25*Math.cos(angle),handleZ=zz+side*.25*Math.sin(angle)+.06;
  rod([handleX,.93,handleZ],[handleX,1.28,handleZ],.018);for(const y of [.93,1.28])rod([handleX,y,handleZ],[handleX,y,handleZ-.08],.012);
  for(const y of [.52,1.6])box('metal','#c5c8bf',hinge,y,front+.22,.075,.11,.1,true);
 }
 // Aluminium partition at the rear: ribbed lower sheets and cloudy upper glass.
 const partition=front-2.65;
 for(const u of [-1.6,-.55,.55,1.65])box('metal','#deded5',u,1.45,partition,.055,2.8,.09);
 for(const y of [.12,1.05,2.22,2.85])box('metal','#e7e8db',0,y,partition,3.35,.055,.1);
 for(const u of [-1.05,0,1.1]){
  box('frosted','#bbc0ae',u,1.64,partition-.02,1,1.08,.035);
  box('metal','#c9c9bc',u,.57,partition,1,.89,.035);
  for(let j=-5;j<=5;j++)box('metal','#8f9c97',u+j*.082,.57,partition+.024,.012,.85,.016,true);
 }
 label('加工重地 闲人免进',.62,1.42,partition+.06,.75,.52,{bg:'#9f2420',ink:'#edd05d'});
 label('油糕加工',.62,.94,partition+.062,.7,.25,{bg:'#d8cfb9',ink:'#3b362e'});
 // Pale ceramic floor, tiled preparation walls and lower wood-grain wainscot.
 for(let y=.45;y<2.9;y+=.44)box('paint','#aaa99d',width/2-.212,y,front-1.4,.015,.012,2.5,true);
 for(let v=front-2.6;v<front-.1;v+=.6)box('paint','#b7b8ac',width/2-.212,1.65,v,.015,2.5,.012,true);
 const left=-width/2+.15;
 for(let y=.45;y<2.6;y+=.44)box('paint','#aaa99d',left+.065,y,front-1.36,.02,.012,2.4,true);
 box('wood','#c7a36c',left+.035,.59,front-1.25,.055,1.08,2.45);
 for(let k=0;k<50;k++)box('wood',k%3?'#c2a982':'#7d5c37',left+.067,.59,front-2.4+k*.046,.012,1.03,.012,true);
 // Shelf, compact fan and its protective wire grille; no animated expensive lights.
 box('wood','#be935e',-.85,2.06,front-1.04,1.4,.07,.46);
 for(const u of [-1.4,-.35])rod([u,1.67,front-1.25],[u,2.01,front-.84],.025,'wood','#b48d58');
 box('paint','#a83129',-1.05,2.13,front-1.02,.48,.08,.29);box('paint','#d9dbcc',-1.05,2.37,front-1.07,.08,.47,.08);
 const fc=[-1.05,2.65,front-.98];
 part('cylinder','darkMetal','#777c74',...fc,.19,.11,.19,[Math.PI/2,0,0],true);
 for(const radius of [.21,.36,.54])part('ring','metal','#eeeeea',fc[0],fc[1],fc[2]+.075,radius,radius,1,[0,0,0],true);
 for(let i=0;i<24;i++){const angle=i*Math.PI/12;rod([fc[0],fc[1],fc[2]+.09],[fc[0]+Math.cos(angle)*.27,fc[1]+Math.sin(angle)*.27,fc[2]+.06],.0035,'metal','#f2f2e8');}
 for(let i=0;i<4;i++){const angle=i*Math.PI/2;part('sphere','metal','#cfd3ce',fc[0]+Math.cos(angle)*.12,fc[1]+Math.sin(angle)*.12,fc[2],.16,.28,.018,[0,0,angle-.45],true);}
 box('paint','#b39a6e',-.2,2.23,front-1.03,.42,.3,.34,true);box('paint','#bed0c3',-.2,2.4,front-1.03,.46,.045,.38,true);
 // Entry-right wall: each flavour label sits directly above its own tray.
 const flavours=[
  {name:'黄米枣泥豆沙馅',z:front-.66,tint:'#e9bc73'},
  {name:'白糖芝麻花生馅',z:front-1.36,tint:'#fff1ce'},
  {name:'红豆馅',z:front-2.06,tint:'#f5d6a2'},
 ];
 for(const flavour of flavours){
  const strip=label(flavour.name,width/2-.23,1.94,flavour.z,.19,.82,{bg:'#a32c23',ink:'#f1d479',vertical:true});
  strip.rotation.y=-Math.PI/2;
 }
 // Metal display rack with angle-section legs, shelves and perforations.
 const rackX=1.66,rackZ=front-1.35,rackW=.85,rackD=2.16;
 for(const side of [-1,1])for(const end of [-1,1]){
  const u=rackX+side*rackW/2,v=rackZ+end*rackD/2;
  box('metal','#e7e7d8',u,.54,v,.035,1.02,.035);
  for(let j=0;j<9;j++)box('darkMetal','#665e50',u,.13+j*.095,v+.022,.014,.025,.006,true);
 }
 for(const y of [.16,.58,1.02]){box('metal','#a9b2a8',rackX,y,rackZ,rackW,.035,rackD);for(const side of [-1,1])box('metal','#e0e0d2',rackX,y-.035,rackZ+side*rackD/2,rackW,.08,.03);}
 // Three separate open trays below the labels, with folded metal rims.
 const trayY=1.09;
 for(const flavour of flavours){
  const v=flavour.z;
  box('metal','#bbc3bc',rackX,trayY,v,.78,.025,.62);
  for(const side of [-1,1]){
   box('metal','#aab7b0',rackX+side*.39,trayY+.07,v,.018,.15,.64);
   box('metal','#b4bdb3',rackX,trayY+.07,v+side*.31,.8,.15,.018);
   rod([rackX-.39,trayY+.15,v+side*.31],[rackX+.39,trayY+.15,v+side*.31],.009);
  }
 }
 // Entry-left frying station: recessed round oil pan in a steel worktop.
 const fryerX=-1.48,fryerZ=front-1.42;
 box('metal','#9ca39a',fryerX,.51,fryerZ,1.15,.87,1.08);
 box('metal','#dedfd3',fryerX,.97,fryerZ,1.22,.055,1.15);
 for(const side of [-1,1])for(const end of [-1,1])box('darkMetal','#68695c',fryerX+side*.48,.12,fryerZ+end*.44,.065,.24,.065);
 for(const side of [-1,1]){
  part('cylinder','darkMetal','#484b43',fryerX+side*.31,.76,fryerZ+.555,.09,.035,.09,[Math.PI/2,0,0],true);
  box('metal','#ced1c6',fryerX+side*.29,.48,fryerZ+.549,.51,.39,.025);
  box('darkMetal','#858b80',fryerX+side*.19,.49,fryerZ+.575,.025,.15,.025,true);
 }
 const panPoints=[[0,-.2],[.24,-.2],[.34,-.15],[.41,-.06],[.46,.02],[.475,.045]].map(([r,y])=>new T.Vector2(r,y));
 geometries.set('pan',new T.LatheGeometry(panPoints,40));
 mat('pan','#393930',{metalness:.65,roughness:.38,side:T.DoubleSide});
 part('pan','pan','#ffffff',fryerX,1.05,fryerZ,1,1,1);
 part('ring','metal','#aaa894',fryerX,1.095,fryerZ,.94,.94,1,[Math.PI/2,0,0]);
 mat('oil','#9a5a17',{metalness:.15,roughness:.24});
 part('cylinder','oil','#ffffff',fryerX,1.052,fryerZ,.85,.012,.85);
 for(const side of [-1,1])part('ring','darkMetal','#d6c6a4',fryerX+side*.53,1.075,fryerZ,.18,.13,.7,[Math.PI/2,0,0],true);
 // A wire skimmer rests on the pan rim; its handle points toward the worktop edge.
 const skimmerX=fryerX-.19,skimmerZ=fryerZ+.07;
 part('ring','metal','#eddfbd',skimmerX,1.12,skimmerZ,.29,.29,1,[Math.PI/2,0,0],true);
 for(let i=-3;i<=3;i++){
  const offset=i*.035,half=Math.sqrt(.14*.14-offset*offset);
  rod([skimmerX-half,1.12,skimmerZ+offset],[skimmerX+half,1.12,skimmerZ+offset],.0025);
  rod([skimmerX+offset,1.12,skimmerZ-half],[skimmerX+offset,1.12,skimmerZ+half],.0025);
 }
 rod([skimmerX,1.12,skimmerZ+.14],[skimmerX,1.15,skimmerZ+.55],.012);
 rod([skimmerX,1.15,skimmerZ+.47],[skimmerX,1.16,skimmerZ+.66],.025,'wood','#bd925e');
 // Golden irregular discs with authored blister/grain texture and subtle colour variation.
 const cakeCanvas=document.createElement('canvas');cakeCanvas.width=cakeCanvas.height=256;const cc=cakeCanvas.getContext('2d');let seed=433;
 const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 cc.fillStyle='#dba04c';cc.fillRect(0,0,256,256);
 for(let i=0;i<4200;i++){cc.fillStyle=['#eac681','#bc702b','#f4dba0','#ce8b40'][i%4];cc.beginPath();cc.ellipse(rnd()*256,rnd()*256,1+rnd()*2,.6+rnd()*1.6,rnd()*Math.PI,0,Math.PI*2);cc.fill();}
 const cakeMap=new T.CanvasTexture(cakeCanvas);cakeMap.colorSpace=T.SRGBColorSpace;cakeMap.anisotropy=4;textures.push(cakeMap);
 mat('cake','#ffffff',{map:cakeMap,bumpMap:cakeMap,bumpScale:.012,roughness:.67});
 const cakeGeo=new T.SphereGeometry(.5,20,12),cp=cakeGeo.attributes.position;
 for(let i=0;i<cp.count;i++){const px=cp.getX(i),py=cp.getY(i),pz=cp.getZ(i),variation=1+.045*Math.sin(px*43+pz*31)*Math.cos(py*37);cp.setXYZ(i,px*variation,py*(1+.035*Math.sin(px*39)),pz*variation);}cakeGeo.computeVertexNormals();geometries.set('cake',cakeGeo);
 for(const flavour of flavours)for(let i=0;i<12;i++){
  const row=Math.floor(i/4),col=i%4;
  part('cake','cake',flavour.tint,rackX-.28+col*.18+(rnd()-.5)*.025,trayY+.078,flavour.z-.21+row*.2,.17+rnd()*.02,.095+rnd()*.025,.175,[rnd()*.2,rnd()*3,rnd()*.18],true);
 }
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3;
  part('cake','cake','#fff5cf',fryerX+Math.cos(a)*.23,1.063,fryerZ+Math.sin(a)*.23,.18,.065,.18,[0,a,0],true);
  for(let j=0;j<8;j++){const angle=j*Math.PI/4;part('sphere','oil','#ffde95',fryerX+Math.cos(a)*.23+Math.cos(angle)*.1,1.072,fryerZ+Math.sin(a)*.23+Math.sin(angle)*.1,.018,.009,.018,[0,0,0],true);}
 }
 // Photo-visible chair, dustpan and wiring; entry clutter removed at user request.
 const chairX=-1.85,chairZ=front+.44;
 box('paint','#c7c8b8',chairX,.45,chairZ,.39,.065,.36);
 for(const side of [-1,1])for(const end of [-1,1])box('paint','#acae9c',chairX+side*.15,.23,chairZ+end*.14,.045,.42,.045);
 for(const side of [-1,1])box('paint','#d4d4c6',chairX+side*.16,.69,chairZ-.14,.045,.49,.045);
 for(const u of [-.1,0,.1])box('paint','#d4d4c6',chairX+u,.76,chairZ-.14,.025,.26,.03,true);
 box('paint','#c4c7b8',chairX,.9,chairZ-.14,.39,.055,.04);
 box('darkMetal','#8f968b',-2.12,.105,front+.39,.24,.035,.27,true);rod([-2.12,.13,front+.31],[-2.12,.91,front+.21],.013);
 box('paint','#eff0df',-1.77,2.42,front+.19,.16,.2,.14,true);part('sphere','darkMetal','#343e39',-1.77,2.42,front+.275,.07,.07,.03,[0,0,0],true);
 rod([-1.77,2.51,front+.18],[-1.77,2.8,front+.17],.009,'paint','#4b4e43');rod([-1.77,2.8,front+.17],[-1.32,2.8,front+.17],.009,'paint','#4b4e43');
 box('light','#ffffff',0,2.99,front-1.2,1.2,.045,.12);box('metal','#c8c9bb',0,3.035,front-1.2,1.3,.055,.2);
 const surfaceControl=skin.finish();
 for(const [id,items]of batches){const [kind,key,fine]=id.split('|'),mesh=new T.InstancedMesh(geometries.get(kind),materials.get(key),items.length);items.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,tint.set(p.color));});mesh.name=`景林-${key}-${kind}`;mesh.castShadow=key!=='glass'&&key!=='light';mesh.receiveShadow=true;mesh.computeBoundingSphere();(fine==='true'?detail:root).add(mesh);}
 root.userData.jinglinDetails={photoBased:true,estimatedDimensions:true,openingWidth:opening,cakes:39,layoutSource:'user-confirmed-entry-left-fryer-right-cakes',fryer:[fryerX,1.05,fryerZ],displays:flavours.map(f=>({name:f.name,tray:[rackX,trayY,f.z],label:[width/2-.23,1.94,f.z]})),features:['taupe-silver-sign','blue-shutter','white-wall-tiles','open-glass-doors','frosted-partition','tray-rack','wire-fan','flavour-labels','left-fryer','matched-right-trays','chair','dustpan']};
 const cameraLocal=new T.Vector3();
 return {root,setNight(value){surfaceControl.setNight(value);materials.get('light').emissiveIntensity=value?1.8:.15;signs.forEach(m=>m.emissiveIntensity=value?.12:0);},update(camera){cameraLocal.copy(camera.position);root.worldToLocal(cameraLocal);detail.visible=cameraLocal.length()<110;},dispose(){root.removeFromParent();surfaceControl.dispose();const geos=new Set(geometries.values()),mats=new Set([...materials.values(),...signs]);root.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
