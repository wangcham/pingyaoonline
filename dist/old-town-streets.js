import * as T from 'three';
import {oldTownFrontages,oldTownStreetRoutes,wuTemple} from './old-town-streets-data.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {createUrbanBatch} from './urban-batch.js';
import {createPavingMaterial} from './paving.js';
import {createArchitecture,createHeritageMaterials} from './landmarks/architecture.js';
import {landmarkRecords,surveyFrame} from './landmarks/data.js';
import {segments} from './geography.js';
import {stableDetailVisibility} from './render-stability.js';

export function addOldTownStreetDetails(scene){
 const root=new T.Group();root.name='古城实景参考街巷';scene.add(root);
 const shell=createCommerceMaterials(root,{chunkSize:120}),fineRoot=new T.Group();root.add(fineRoot);
 const skin=createCommerceMaterials(fineRoot,{chunkSize:100}),a=createUrbanBatch(fineRoot,{chunkSize:100}),lanternBatch=createUrbanBatch(fineRoot,{chunkSize:100});
 const pavement=createUrbanBatch(root,{paving:createPavingMaterial(),chunkSize:120});
 const labelRows=[],lampMaterials=[],controllers=[],heritageMaterials=createHeritageMaterials();
 const report={approximate:true,frontages:oldTownFrontages.length,streets:{},latticePanels:0,lanterns:0,drains:0,mingqingDisplays:[],hangingBoards:0,awnings:0,people:0};
 function at(p,u,y,v){const c=Math.cos(p.angle),s=Math.sin(p.angle);return [p.x+u*c+v*s,y,p.z-u*s+v*c];}
 function block(batch,p,kind,color,u,y,v,w,h,d){batch.box(kind,color,...at(p,u,y,v),w,h,d,p.angle);}
 function timber(p,color,u,y,v,w,h,d){a.box(color,...at(p,u,y,v),w,h,d,p.angle);}
 function board(p,text,u,y,v,w,h,bg='#302a24',ink='#d4b575'){
  labelRows.push({text,position:at(p,u,y,v),angle:p.angle,w,h,bg,ink});
  timber(p,'#4a3528',u,y,v-.09,w+.14,h+.13,.12);
 }
 function lantern(p,u,y,v,yellow=false){
  const color=yellow?'#dfab32':'#aa3022';
  lanternBatch.part('globe',color,...at(p,u,y,v),.53,.71,.53,p.angle);
  for(const dy of [-.34,.34])timber(p,'#c09a4a',u,y+dy,v,.29,.065,.29);
  timber(p,'#604531',u,y+.59,v,.035,.48,.035);timber(p,'#bb7634',u,y-.58,v,.055,.42,.055);
  block(skin,p,'lamp',color,u,y,v+.255,.15,.42,.03);report.lanterns++;
 }
 function lattice(p,u,y,v,w,h){
  timber(p,'#282922',u,y,v,w,h,.09);
  for(const side of [-1,1]){timber(p,'#775c45',u+side*w/2,y,v+.055,.075,h+.12,.09);timber(p,'#8d7152',u,y+side*h/2,v+.06,w,.075,.1);}
  for(let x=-w/2+.16;x<w/2;x+=.23)timber(p,'#775b40',u+x,y,v+.065,.035,h,.05);
  for(let dy=-h/2+.16;dy<h/2;dy+=.25)timber(p,'#806448',u,y+dy,v+.07,w,.035,.05);
  timber(p,'#aea28b',u,y-h/2-.12,v+.12,w+.2,.12,.32);report.latticePanels++;
 }
 const trades=['平遥牛肉','推光漆器','手工布鞋','山西陈醋','传统面食','茶','客栈'];
 function mingqingShop(p){
  const front=p.d/2,v=p.variant,palette=['#a66b4e','#813a31','#456b76','#b79961','#8f493d','#536959','#ac7454'];
  // All goods remain within the existing 1.05 m shop apron. The centre door is
  // kept open; the mapped street, historic roofs and landmark parcels are intact.
  for(const side of [-1,1]){
   const u=side*2.65,w=2.25,z=front+.61;
   report.mingqingDisplays.push({x:at(p,u,0,z)[0],z:at(p,u,0,z)[2],w,d:.68,angle:p.angle,trade:trades[v],street:p.street});
   block(skin,p,'glass','#7d7660',u,1.82,front+.29,w,2.27,.045);
   timber(p,'#74543b',u,.56,z,w,.86,.66);timber(p,'#b99b6f',u,1.02,z,w+.08,.09,.70);
   // Select shopfronts have short canvas awnings and scalloped valances.
   if(v!==1&&v!==5){
    skin.quad('fabric',palette[v],[[-w/2,3.15,.23],[w/2,3.15,.23],[w/2,2.94,.98],[-w/2,2.94,.98]].map(([x,y,d])=>at(p,u+x,y,front+d)));
    for(let j=0;j<9;j++)timber(p,palette[v],u-w/2+(j+.5)*w/9,2.88,front+.98,w/9-.018,.16,.035);
    report.awnings++;
   }
   if(v===0){
    // Food counter: glass cover, trays and packets; no invented shop identity.
    block(skin,p,'glass','#728c87',u,1.39,z+.30,w-.12,.67,.035);
    for(let j=0;j<7;j++){const x=u-.9+j*.29;timber(p,'#b39163',x,1.15,z,.25,.055,.46);a.part('globe',j%2?'#a66f42':'#7e4c32',...at(p,x,1.31,z),.23,.18,.34);timber(p,'#c5ad73',x,1.63,front+.36,.22,.32,.075);}
    board(p,'平遥特产',u,2.35,front+.35,1.65,.35,'#6b3929','#e6c997');
   }else if(v===1){
    for(let row=0;row<3;row++){
     const y=1.15+row*.48;timber(p,'#9b8057',u,y,front+.52,w-.15,.07,.40);
     for(let j=0;j<3;j++){const x=u-.72+j*.72;timber(p,(row+j)%2?'#7b2824':'#292c27',x,y+.17,front+.56,.53,.27,.29);timber(p,'#bb9b58',x,y+.19,front+.715,.46,.027,.018);timber(p,'#c3a45c',x,y+.30,front+.56,.55,.035,.31);}
    }
   }else if(v===2){
    timber(p,'#7b6246',u,2.64,front+.47,w-.05,.055,.07);
    for(let j=0;j<6;j++){const x=u-.9+j*.36;timber(p,'#a89b7b',x,2.51,front+.47,.035,.25,.035);block(skin,p,'fabric',['#8d404e','#a49a68','#536f90','#c296a5','#8872a0','#bf8054'][j],x,1.98,front+.50,.29,.97,.05);timber(p,'#d3b984',x,1.61,front+.54,.22,.045,.035);}
    for(let j=0;j<4;j++){const x=u-.8+j*.52;timber(p,j%2?'#913b42':'#333c3e',x,1.16,z,.38,.17,.22);timber(p,'#d0b17c',x,1.08,z,.43,.04,.24);}
   }else if(v===3){
    for(let j=0;j<4;j++){const x=u-.82+j*.55;a.part('globe',j%2?'#73543b':'#4d4437',...at(p,x,1.4,z),.46,.65,.43);a.part('stem','#ad8759',...at(p,x,1.75,z),.25,.075,.25);board(p,'醋',x,1.39,z+.224,.20,.22,'#b9a16a','#48392a');}
    board(p,'山西老陈醋',u,2.35,front+.34,1.85,.36,'#b59c64','#43392c');
   }else if(v===4){
    for(const dx of [-.67,0,.67])for(let k=0;k<3;k++){a.part('stem','#ad8754',...at(p,u+dx,1.16+k*.17,z),.55,.16,.55);a.part('stem','#d1b77e',...at(p,u+dx,1.24+k*.17,z),.56,.027,.56);}
    for(let j=0;j<4;j++)a.part('globe','#dbc7a2',...at(p,u-.85+j*.53,1.08,z+.25),.23,.12,.22);
    board(p,'手工面食',u,2.35,front+.34,1.75,.37,'#9f8055','#302b22');
   }else if(v===5){
    for(const y of [1.17,1.68,2.19]){timber(p,'#9b8057',u,y,front+.51,w-.15,.065,.38);for(let j=0;j<6;j++){const x=u-.92+j*.36;a.part('stem',j%2?'#596e5a':'#b79b65',...at(p,x,y+.17,front+.53),.23,.27,.23);a.part('stem','#c5b589',...at(p,x,y+.32,front+.53),.25,.035,.25);}}
   }else{
    // Travel keepsakes, framed paper cuts and small baskets below the inn sign.
    for(let j=0;j<4;j++){const x=u-.83+j*.54;timber(p,'#6d4934',x,1.58,front+.48,.43,.60,.07);timber(p,'#dcc292',x,1.58,front+.525,.35,.52,.025);timber(p,'#9d3932',x,1.58,front+.545,.22,.30,.018);a.part('stem','#b79966',...at(p,x,1.16,z),.38,.23,.32);}
   }
   // A few displayed folding fans add recognizable craft silhouettes.
   if(side===-1&&(v===1||v===2||v===6))for(const dx of [-.65,.65]){
    const cy=2.62,r=.39;for(let k=0;k<7;k++){const aa=k*Math.PI/7,bb=(k+1)*Math.PI/7;skin.quad('fabric',k%2?'#b85b64':'#d0b37d',[[u+dx,cy,front+.35],[u+dx+r*Math.cos(aa),cy+r*Math.sin(aa),front+.35],[u+dx+r*Math.cos(bb),cy+r*Math.sin(bb),front+.35],[u+dx,cy,front+.35]].map(q=>at(p,...q)));}
    timber(p,'#a48050',u+dx,cy-.12,front+.35,.04,.28,.035);
   }
  }
  const text=['牛肉','漆器','布艺','陈醋','面食','茶','客栈'][v],u=p.w/2-.62,position=at(p,u,2.63,front+.65),angle=p.angle+Math.PI/2;
  a.box('#755334',...at(p,u,3.62,front+.50),.08,.08,1.0,p.angle);
  a.box('#755334',...position,.68,1.84,.06,angle);
  labelRows.push({text,position:[position[0]+Math.sin(angle)*.04,position[1],position[2]+Math.cos(angle)*.04],angle,w:.60,h:1.72,bg:v%2?'#bba774':'#713c2d',ink:v%2?'#40382c':'#e2c391',vertical:true});report.hangingBoards++;
  if(p.height>5)for(const side of [-1,1]){
   const u=side*p.w*.39,z=front+.67;block(skin,p,'lamp','#b59862',u,4.88,z,.30,.50,.30);
   for(const dx of [-.20,.20])for(const dz of [-.20,.20])timber(p,'#643e2c',u+dx,4.88,z+dz,.045,.68,.045);
   for(const dy of [-.35,.35])timber(p,'#865238',u,4.88+dy,z,.50,.09,.50);report.lanterns++;
  }
 }
 for(const p of oldTownFrontages){
  const {w,d,height:h,variant:v}=p,front=d/2,wood=['#5b4031','#654433','#493b32','#724839'][v%4];
  report.streets[p.street]=(report.streets[p.street]??0)+1;
  block(shell,p,'brick',['#8a8980','#777e7b','#99958a','#85857d'][v%4],0,h/2+.22,0,w,h,d);
  block(shell,p,'stone','#676b67',0,.4,0,w+.05,.7,d+.05);
  // Recessed dark shop interior, separate door leaves, transoms and stone thresholds.
  timber(p,'#242720',0,1.64,front+.03,w-.85,2.72,.06);
  for(const u of [-w/2+.28,0,w/2-.28])timber(p,wood,u,1.82,front+.19,.16,3.35,.22);
  for(const side of [-1,1]){
   lattice(p,side*w*.3,2.05,front+.13,1.65,1.3);
   timber(p,wood,side*w*.3,.82,front+.15,1.68,.95,.18);
   timber(p,'#957c5c',side*w*.3,.82,front+.255,1.37,.65,.035);
   timber(p,'#463c2c',side*.94,1.5,front+.3,.16,2.6,.62);
  }
  block(skin,p,'stone','#9d9c8f',0,.22,front+.55,w-.35,.22,1.05);
  block(skin,p,'stone','#c0b7a2',0,.36,front+.22,1.8,.13,.55);
  timber(p,wood,0,3.16,front+.22,w-.4,.2,.34);
  board(p,trades[v],0,3.65,front+.35,w*.67,.62,v%3===0?'#594536':'#292e2b');
  // Painted beam panels and exposed rafter tails below projecting gray tile eaves.
  for(let u=-w/2+.45;u<w/2;u+=.56){
   timber(p,'#504132',u,h-.06,front+.25,.085,.13,1.4);
   block(skin,p,'stone','#99978a',u,h+.13,front+.7,.23,.11,.3);
  }
  for(let u=-w/2+.7;u<w/2;u+=1.15){
   timber(p,'#465e54',u,h-.43,front+.2,.87,.3,.12);
   timber(p,'#b4a67a',u,h-.43,front+.27,.65,.055,.035);
  }
  for(const side of [-1,1])lantern(p,side*w*.36,2.96,front+.68);
  if(h>5){for(const u of [-2.6,0,2.6])lattice(p,u,4.97,front+.08,1.85,1.25);timber(p,wood,0,4.13,front+.23,w,.19,.26);}
  // Roof planes have independent metre-scaled tile UVs and actual raised tile rolls.
  const roofY=h+.25,roofH=1.45,half=d/2+.65;
  for(const side of [-1,1]){
   const pts=[[-w/2-.3,roofY,side*half],[w/2+.3,roofY,side*half],[w/2+.3,roofY+roofH,0],[-w/2-.3,roofY+roofH,0]].map(q=>at(p,...q));
   shell.quad('roof','#777b74',pts);
   for(let u=-w/2;u<=w/2;u+=.28)for(let step=0;step<4;step++){
    const t=(step+.5)/4;timber(p,step%2?'#666d68':'#74796e',u,roofY+roofH*t+.045,side*half*(1-t),.065,.075,half/4+.045);
   }
  }
  timber(p,'#68706a',0,roofY+roofH+.1,0,w+.7,.2,.28);
  for(const side of [-1,1])timber(p,'#59625c',side*w/2,roofY+roofH+.3,0,.18,.5,.25);
  // Small street-side displays stay on the apron, clear of the road and doorway.
  const u=v%2?-2.7:2.7;
  if(p.street==='南大街')mingqingShop(p);
  else if(v%3===0){
   timber(p,'#6d5035',u,.55,front+.65,1.7,.85,.65);timber(p,'#b8a07b',u,1.02,front+.65,1.8,.09,.7);
   for(let j=0;j<6;j++){const bx=u-.65+j*.25;timber(p,['#a34e27','#d0b374','#64764d'][j%3],bx,1.23,front+.65,.16,.34,.24);}
  }else if(v%3===1){
   block(skin,p,'stone','#777765',u,.4,front+.58,.6,.6,.62);
   a.part('globe','#67744b',...at(p,u,.9,front+.58),.82,.7,.8);
  }else{
   timber(p,'#776049',u,.52,front+.57,1.25,.12,.5);
   for(const side of [-1,1])timber(p,'#514439',u+side*.46,.28,front+.57,.11,.46,.38);
  }
 }
 // Real jointed paving continues along the mapped polylines; thin gutter channels
 // and intermittent grates replace the former featureless road margins.
 for(const [,width,name,path] of oldTownStreetRoutes)for(const line of segments(path)){
  const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length,angle=-Math.atan2(dz,dx);
  pavement.part('paving','#d2cec1',(line.start[0]+line.end[0])/2,.164,(line.start[1]+line.end[1])/2,line.length,.025,width,angle);
  for(const side of [-1,1])for(let t=.55;t<line.length-.5;t+=1.1){
   const x=line.start[0]+dx*t-dz*side*(width/2-.18),z=line.start[1]+dz*t+dx*side*(width/2-.18);
   a.box('#737970',x,.185,z,1.075,.065,.24,angle);
   if(Math.round(t*10)%33===6){
    a.box('#333c37',x,.224,z,.65,.02,.28,angle);
    for(let j=-3;j<=3;j++)a.box('#7d847b',x+dx*j*.08,.242,z+dz*j*.08,.025,.025,.28,angle);
    report.drains++;
   }
  }
 }
 // Yamen: dress the existing mapped entrance, retaining its open central bay.
 const yr=landmarkRecords.find(r=>r.id==='yamen'),hc=surveyFrame('yamenHall').center;
 const hx=(hc[0]-yr.position[0])*Math.cos(yr.rotation)-(hc[1]-yr.position[1])*Math.sin(yr.rotation);
 const yp={x:yr.position[0],z:yr.position[1],angle:yr.rotation};
 board(yp,'平遙縣署',hx,4.22,100.8,6.1,1.13,'#242a2b','#d8ad48');
 for(const side of [-1,1]){
  lantern(yp,hx+side*4.2,3.52,101.05);
  for(let u=3.3;u<10.2;u+=.4)timber(yp,'#4f4035',hx+side*u,1.75,100.7,.1,2.5,.12);
  timber(yp,'#5d4839',hx+side*6.8,2.7,100.7,6.8,.14,.18);
  block(skin,yp,'stone','#aaa596',hx+side*8.7,.55,101.3,1.1,.9,1.05);
  a.part('globe','#a4a293',...at(yp,hx+side*8.7,1.24,101.3),.76,1.05,.76);
  a.part('globe','#b4b1a2',...at(yp,hx+side*8.7,1.87,101.5),.65,.65,.65);
 }
 // Repaired Wu Temple gate: three stepped glazed roofs, dark timber posts,
 // blue/green painted brackets and yellow lanterns, as visible in the 2022 photos.
 const wp={x:wuTemple.position[0],z:wuTemple.position[1],angle:wuTemple.angle},wa=createArchitecture(heritageMaterials);
 wa.courtyard(26,96,5.5);
 for(const z of [25,-5,-33])wa.hall({z,w:20,d:10,h:5.2,bays:5,hip:true,mat:'green',wall:'red'});
 for(const side of [-1,1])for(const z of [13,-21])wa.hall({x:side*10.2,z,w:18,d:4.5,h:3.4,bays:5,yaw:Math.PI/2});
 for(const [x,y,w]of [[0,6,6.6],[-6,4.6,5.7],[6,4.6,5.7]]){
  wa.roof(x,y,45,w,4.4,1.55,{mat:'green',hip:true});
  for(const side of [-1,1]){wa.column(x+side*(w/2-.5),.35,46.2,y-.35,.21,'wood');wa.box('stone',x+side*(w/2-.5),.35,46.2,.7,.6,.7);}
  for(let u=x-w/2+.6;u<x+w/2;u+=.62)for(let tier=0;tier<3;tier++){
   const [xx,yy,zz]=at(wp,u,y-.15-tier*.22,46.7);
   a.box(tier%2?'#467d85':'#36576d',xx,yy,zz,.65-tier*.12,.12,.6,wp.angle);
  }
 }
 const templeRoot=wa.finish();templeRoot.name='武庙 · 实景参考建筑';templeRoot.position.set(wp.x,0,wp.z);templeRoot.rotation.y=wp.angle;root.add(templeRoot);
 board(wp,'威靈震疊',0,4.8,47,5.2,.9,'#294d6c','#e1bf6a');
 board(wp,'平遥武庙',-7.2,2,47,2.3,.65,'#514535','#dfc27f');
 for(const side of [-1,1]){lantern(wp,side*1.8,4.05,47,true);for(let u=4;u<8.4;u+=.34)timber(wp,'#554c40',side*u,1.65,47,.1,2.6,.14);}
 // One sign atlas and one merged mesh per spatial cell, never one texture per shop.
 const atlas=document.createElement('canvas');atlas.width=2048;atlas.height=2048;const ctx=atlas.getContext('2d');
 const labelKey=p=>`${p.text}|${p.bg}|${p.ink}|${p.vertical?'v':'h'}`;
 const unique=[...new Set(labelRows.map(labelKey))],columns=4,cellW=512,cellH=128;
 if(unique.length>64)throw new Error('Ancient-street sign atlas capacity exceeded');
 unique.forEach((key,i)=>{const [text,bg,ink,orientation]=key.split('|'),x=i%columns*cellW,y=Math.floor(i/columns)*cellH;ctx.fillStyle=bg;ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.strokeRect(x+9,y+9,494,110);ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
  if(orientation==='v'){ctx.save();ctx.translate(x,y);ctx.scale(12,1);ctx.font='bold 32px "Songti SC",serif';[...text].forEach((ch,j)=>ctx.fillText(ch,256/12,128*(j+1)/(text.length+1)));ctx.restore();}
  else{ctx.font='bold 64px "Songti SC",serif';ctx.fillText(text,x+256,y+66,470);}
 });
 const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const signMaterial=new T.MeshStandardMaterial({map:texture,roughness:.8,emissive:'#f5d8a1',emissiveMap:texture,emissiveIntensity:0,side:T.DoubleSide});lampMaterials.push(signMaterial);
 const labels=new Map();
 for(const p of labelRows){
  const index=unique.indexOf(labelKey(p)),x=index%columns/4,y=Math.floor(index/columns)/16;
  const key=`${Math.floor(p.position[0]/100)}:${Math.floor(p.position[2]/100)}`;if(!labels.has(key))labels.set(key,{p:[],uv:[]});const b=labels.get(key),c=Math.cos(p.angle),s=Math.sin(p.angle);
  const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[p.position[0]+u*p.w/2*c,p.position[1]+v*p.h/2,p.position[2]-u*p.w/2*s]);
  const uv=[[x,1-y-1/16],[x+1/4,1-y-1/16],[x+1/4,1-y],[x,1-y]];
  for(const i of [0,1,2,0,2,3]){b.p.push(...points[i]);b.uv.push(...uv[i]);}
 }
 for(const b of labels.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.Mesh(g,signMaterial);mesh.name='古城木匾文字';fineRoot.add(mesh);}
 controllers.push(shell.finish(),skin.finish());a.finish();pavement.finish();
 const lanternGroup=lanternBatch.finish();lanternGroup.name='古城发光灯笼';
 for(const mesh of lanternGroup.children){mesh.material.emissive.set('#ff5c27');mesh.material.emissiveIntensity=0;lampMaterials.push(mesh.material);}
 root.userData.streetDetailReport=report;
 const fineMeshes=[];fineRoot.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingSphere();fineMeshes.push(o);}});
 const center=new T.Vector3();
 return {root,report,setNight(value){controllers.forEach(c=>c.setNight(value));lampMaterials.forEach(m=>m.emissiveIntensity=value?.48:0);},
  update(camera){let changed=false;for(const m of fineMeshes){const sphere=m.isInstancedMesh?m.boundingSphere:m.geometry.boundingSphere;center.copy(sphere.center).applyMatrix4(m.matrixWorld);const distance=camera.position.distanceTo(center)-sphere.radius,visible=stableDetailVisibility(m.visible,distance,150,190);if(visible!==m.visible){m.visible=visible;changed=true;}}const detail=templeRoot.userData.detail,visible=stableDetailVisibility(detail.visible,camera.position.distanceTo(templeRoot.position),220,260);if(visible!==detail.visible){detail.visible=visible;changed=true;}return changed;},
  dispose(){const geos=new Set(),mats=new Set(),maps=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});Object.values(heritageMaterials).forEach(m=>mats.add(m));for(const m of mats){for(const k of ['map','bumpMap','emissiveMap'])if(m[k])maps.add(m[k]);m.dispose();}maps.forEach(t=>t.dispose());geos.forEach(g=>g.dispose());root.removeFromParent();},
 };
}
