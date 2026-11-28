import * as T from 'three';
import {createUrbanBatch} from './urban-batch.js';
import {createSurveySurfaces} from './survey-surfaces.js';
import {createTreeBatch} from './vegetation.js';
import {guchengStationSurvey,regionalRoadClear} from './regional-survey.js';
import {localToGeographic} from './landmarks/coordinates.js';
import {addGuchengStationDetails} from './gucheng-station-details.js';
import {createCommerceMaterials} from './local-commerce-materials.js';

export function addGuchengStation(scene){
 const p=guchengStationSurvey,root=new T.Group();root.name='平遥古城站';scene.add(root);
 const batch=createUrbanBatch(root),surfaces=createSurveySurfaces(root),trees=createTreeBatch(root,{leafDensity:12,park:true}),c=Math.cos(p.angle),s=Math.sin(p.angle);
 const world=(u,v)=>[p.center[0]+u*c+v*s,p.center[1]-u*s+v*c];
 function box(color,u,y,v,w,h,d){const [x,z]=world(u,v);batch.box(color,x,y,z,w,h,d,p.angle);}
 // Raised forecourt and broad steps face the real circular square (northwest).
 box('#a5a194',0,1.9,0,118,3.8,41);
 box('#b9b5a7',0,3.82,-27,117,.22,14);
 box('#b9aa92',0,8.5,0,113,9.4,37);
 box('#7b5141',0,9.2,-18.6,63,9.5,.25);
 for(const u of [-40,40])box('#c5b39a',u,10.25,-9,13,12.8,22);
 const tileCanvas=document.createElement('canvas');tileCanvas.width=256;tileCanvas.height=128;const tileContext=tileCanvas.getContext('2d');tileContext.fillStyle='#92958d';tileContext.fillRect(0,0,256,128);tileContext.strokeStyle='#626a62';tileContext.lineWidth=2;
 for(let x=0;x<256;x+=16){tileContext.beginPath();tileContext.moveTo(x,0);tileContext.lineTo(x,128);tileContext.stroke();}tileContext.strokeStyle='#a8aaa0';tileContext.lineWidth=1;for(let y=0;y<128;y+=16){tileContext.beginPath();tileContext.moveTo(0,y);tileContext.lineTo(256,y);tileContext.stroke();}
 const roofMap=new T.CanvasTexture(tileCanvas);roofMap.colorSpace=T.SRGBColorSpace;roofMap.wrapS=roofMap.wrapT=T.RepeatWrapping;roofMap.repeat.set(32,10);roofMap.anisotropy=4;
 const stationRoofMaterial=new T.MeshStandardMaterial({color:'#d0c8b5',map:roofMap,bumpMap:roofMap,bumpScale:.045,roughness:.94,side:T.DoubleSide});
 // Separate hipped tile roof mesh, not a rectangular cap.
 function roof(u,v,width,depth,y,rise){
  const x=width/2,z=depth/2,r=width*.36;
  const pts=[[-x,0,-z],[x,0,-z],[x,0,z],[-x,0,z],[-r,rise,0],[r,rise,0]],faces=[[0,1,5],[0,5,4],[1,2,5],[2,3,4],[2,4,5],[3,0,4]];
  const vertices=faces.flatMap(f=>f.flatMap(i=>pts[i])),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>[(pts[i][0]+x)/width,(pts[i][2]+z)/depth])),2));g.computeVertexNormals();
  const mesh=new T.Mesh(g,stationRoofMaterial),[wx,wz]=world(u,v);mesh.position.set(wx,y,wz);mesh.rotation.y=p.angle;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  box('#68645b',u,y-.16,v,width+.6,.3,depth+.6);box('#555b57',u,y+rise+.06,v,width*.72,.18,.25);
 }
 roof(0,0,117,41,13.5,2.7);roof(0,-16,73,14,13.6,2.2);
 for(const u of [-40,40])box('#807360',u,16.75,-9,13.6,.28,22.5);
 // Deep glass bays, concrete mullions, and the entrance canopy visible in photos.
 const glassMaterial=new T.MeshStandardMaterial({color:'#536b78',roughness:.28,metalness:.18,emissive:'#e2c18a',emissiveIntensity:0});
 const glass=[],transform=new T.Object3D();
 for(let u=-29;u<=29;u+=5)for(const y of [5.4,8.4,11.6])glass.push({u,y,v:-18.82,w:3.7,h:y===5.4?2.4:1.1});
 for(const u of [-50,50])for(const y of [6.3,10.2])glass.push({u,y,v:-18.8,w:7.4,h:2.1});
 const panes=new T.InstancedMesh(new T.BoxGeometry(1,1,1),glassMaterial,glass.length);
 glass.forEach((q,i)=>{const [x,z]=world(q.u,q.v);transform.position.set(x,q.y,z);transform.rotation.set(0,p.angle,0);transform.scale.set(q.w,q.h,.08);transform.updateMatrix();panes.setMatrixAt(i,transform.matrix);});panes.computeBoundingSphere();root.add(panes);
 for(let u=-32;u<=32;u+=5)box('#887760',u,8.2,-18.95,.22,9,.22);
 box('#8f897d',0,7.2,-23,22,.3,8);for(const u of [-10,10])box('#8f897d',u,5.5,-26,.25,3.4,.25);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,128);ctx.font='bold 94px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#863e33';ctx.fillText('平 遥 古 城 站',512,66);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(26,3.2),new T.MeshStandardMaterial({map,transparent:true,alphaTest:.35,side:T.DoubleSide,roughness:.9}));const [sx,sz]=world(0,-1);sign.position.set(sx,18.5,sz);sign.rotation.y=p.angle+Math.PI;root.add(sign);
 const circle=Array.from({length:80},(_,i)=>[p.plaza[0]+Math.cos(i*Math.PI/40)*98,p.plaza[1]+Math.sin(i*Math.PI/40)*105]);surfaces.polygon(circle,'#b4afa3',.065,'paving');
 // This is the observed paved square, not a new round building at the POI.
 // Two low plaza light masts, decorative shades kept opaque.
 for(const u of [-47,47]){box('#b4b7ac',u,6,-56,.45,12,.45);for(const off of [-1.8,0,1.8])box('#ded7b5',u+off,12,-56,1.1,.55,1.1);}
 surfaces.finish();trees.finish();batch.finish();
 // Photo-visible stone piers, red-brown central facade and Chinese-knot motifs.
 const skin=createCommerceMaterials(root,{chunkSize:180});
 for(const u of [-40,40]){
  const [x,z]=world(u,-20.08);skin.box('plaster','#c9b49c',x,10.25,z,13,12.8,.08,p.angle);
  for(const k of [-1,1])box('#ac8f75',u+k*6.3,10.25,-20.2,.16,12.8,.16);
  const knot=document.createElement('canvas');knot.width=128;knot.height=256;const kc=knot.getContext('2d');kc.clearRect(0,0,128,256);kc.strokeStyle='#8b3e43';kc.lineWidth=6;kc.beginPath();kc.moveTo(64,20);kc.lineTo(103,70);kc.lineTo(64,120);kc.lineTo(25,70);kc.closePath();kc.stroke();kc.beginPath();kc.moveTo(64,36);kc.lineTo(88,70);kc.lineTo(64,104);kc.lineTo(40,70);kc.closePath();kc.stroke();for(const xx of [52,64,76]){kc.beginPath();kc.moveTo(xx,108);kc.lineTo(xx,225);kc.stroke();}
  const km=new T.CanvasTexture(knot);km.colorSpace=T.SRGBColorSpace;const ornament=new T.Mesh(new T.PlaneGeometry(3,5.2),new T.MeshStandardMaterial({map:km,transparent:true,alphaTest:.5,side:T.DoubleSide}));const [xx,zz]=world(u,-20.16);ornament.position.set(xx,11,zz);ornament.rotation.y=p.angle+Math.PI;root.add(ornament);
 }
 const facadeSkin=skin.finish(),details=addGuchengStationDetails(root);
 sign.material.emissive.set('#ed5441');sign.material.emissiveMap=map;
 root.userData.buildingRecord={name:'平遥古城站',x:p.center[0],z:p.center[1],w:p.width,d:p.depth,angle:p.angle,height:16.9,levels:2,buildingType:'station',heightClass:'public-hall',heightSource:'photo-and-satellite-estimate',confidence:.4,estimated:true,coordinate:localToGeographic(p.center),crs:'WGS84',footprintSource:p.footprintSource,appearanceSource:p.appearanceSource,note:p.note+' 建筑最高屋面约16.9米，站名牌单独高出屋面；不将站房挑高换算为普通住宅层数。'};
 return {root,setNight(night){glassMaterial.emissiveIntensity=night?.28:0;sign.material.emissiveIntensity=night?1.4:0;details.setNight(night);facadeSkin.setNight(night);},update:details.update};
}
