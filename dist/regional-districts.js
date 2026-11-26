import * as T from 'three';
import {addSurveyDistrict,createSurveyDistrictSteps,resolveSurveyBuildingRecord} from './west-link-district.js';
import {createUrbanBatch} from './urban-batch.js';
import {westGroundHeight} from './west-terrain.js';
import {createRegionalLayout,regionalFrames,regionalOpenGround,regionalAlleys,regionalSurvey,regionalFrameContains,regionalSurfaceOwner,regionalReserved,regionalRoadClear,regionalDetailClear,regionalImagePoint,regionalNames,regionalInRoof} from './regional-survey.js';
import {citySurfaceRoads} from './city-extension.js';

export function addRegionalDistricts(scene,{progressive=false}={}){
 const layout=createRegionalLayout(),groups=[],farGeometry=new T.IcosahedronGeometry(.5,1),farMaterial=new T.MeshStandardMaterial({color:'#70815b',roughness:1});
 let night=false,nextUpdate=0,active=null;
 const status={total:0,ready:0,failed:0};
 function disposeProxy(proxy){const geometries=new Set(),materials=new Set();proxy.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});proxy.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 function shell(roofs,root){
  const batch=createUrbanBatch(root,{chunkSize:500}),records=[];
  for(const p of roofs){
   const r=resolveSurveyBuildingRecord(p,false),{x,z,w,d,angle,kind}=p,h=r.height-(kind==='shed'?1.1:.55),base=Math.max(...p.ring.map(v=>westGroundHeight(...v)))+.08,c=Math.cos(angle),s=Math.sin(angle);
   records.push(r);const box=(color,u,y,v,ww,hh,dd)=>batch.box(color,x+u*c+v*s,base+y,z-u*s+v*c,ww,hh,dd,angle);
   const paint=p.wallColor??(kind==='residential'?'#b7b4a3':kind==='public'?'#c8b991':kind==='shed'?'#b2b4a7':['#b9b1a0','#b9ae9a','#c0bba8'][p.id.length%3]);
   box('#88867a',0,-.08,0,w+.2,.4,d+.2);box(paint,0,h/2,0,w,h,d);
   if(kind==='shed')batch.part('roof',p.roofColor,x,base+h,z,w,1.1,d,angle);
   else{box(p.roofColor,0,h+.08,0,w+.22,.16,d+.22);for(const side of [-1,1]){box('#aaa99a',0,h+.35,side*(d/2-.08),w,.45,.16);box('#aaa99a',side*(w/2-.08),h+.35,0,.16,.45,d);}if(w>30&&r.floors>2)box('#aaa99b',w*.22,h+.5,-d*.18,3.3,.8,2.4);}
  }
  const proxy=batch.finish();proxy.name='建筑主体 · 细节准备中';root.userData.heightRecords=records;return proxy;
 }
 function install(g,d){
  const trees=d.root.userData.planting,far=new T.InstancedMesh(farGeometry,farMaterial,trees.length),transform=new T.Object3D();
  trees.forEach((p,i)=>{transform.position.set(p.x,westGroundHeight(p.x,p.z)+(p.base??0)+p.height*.72,p.z);transform.scale.set(p.crown,p.height*.56,p.crown);transform.rotation.set(0,i*2.4,0);transform.updateMatrix();far.setMatrixAt(i,transform.matrix);});far.computeBoundingSphere();far.name='远景树冠';far.visible=false;d.root.add(far);
  if(g.proxy){disposeProxy(g.proxy);g.proxy=null;delete d.root.userData.heightRecords;g.root.add(d.root);}
  Object.assign(g,{detail:d,far,treeRoot:d.treeRoot,near:true,state:'ready',iterator:null,staging:null});d.setNight(night);status.ready++;
 }
 for(const frame of regionalFrames){
  const roofs=layout.roofs.filter(p=>p.renderFrame===frame.id),ground=regionalOpenGround.filter(p=>p.frame===frame.id);
  if(!roofs.length&&!ground.length)continue;
  const contains=(x,z,pad=0)=>regionalFrameContains(frame.id,x,z,pad)&&regionalSurfaceOwner(x,z)===frame.id;
  const config={name:`全城街坊 · ${regionalNames[frame.id]}`,layout:()=>({roofs,omitted:layout.omitted.filter(p=>p.id.startsWith(`regional-${frame.id}-`))}),survey:regionalSurvey,openGround:ground,alleys:regionalAlleys,contains,roadClear:regionalRoadClear,reserved:regionalReserved,useRaster:false,roads:citySurfaceRoads,treeSpacing:55,treeSeparation:22,chunkSize:500,fieldTextureOnly:true,courtyardWalls:true,streetFurniture:true,detailClear:regionalDetailClear,isOccupied:regionalInRoof};
  const g={config,center:regionalImagePoint(frame.id,640,360),state:'pending',iterator:null,proxy:null};
  if(progressive){g.root=new T.Group();g.root.name=config.name;scene.add(g.root);g.root.userData.survey=regionalSurvey;g.proxy=shell(roofs,g.root);}
  else{const d=addSurveyDistrict(scene,config);g.root=d.root;install(g,d);}
  groups.push(g);
 }
 status.total=groups.length;
 function distance(g,camera){return Math.hypot(camera.position.x-g.center[0],camera.position.z-g.center[1],camera.position.y);}
 return {groups,status,setNight(value){night=value;groups.forEach(g=>g.detail?.setNight(value));},retryFailed(){
  for(const g of groups)if(g.state==='failed'){g.state='pending';status.failed--;}
 },update(camera,now){
  let changed=false;
  if(progressive&&status.ready+status.failed<status.total){
   if(!active){active=groups.filter(g=>g.state==='pending').sort((a,b)=>distance(a,camera)-distance(b,camera))[0]??null;
    if(active){active.state='building';active.staging=new T.Group();active.iterator=createSurveyDistrictSteps(active.staging,active.config);}}
   if(active){const end=performance.now()+3;
    try{do{const result=active.iterator.next();if(result.done){install(active,result.value);changed=true;active=null;break;}}while(performance.now()<end);}
    catch(error){console.error('街区细节加载失败',active.config.name,error);active.state='failed';status.failed++;active.iterator=null;if(active.staging)disposeProxy(active.staging);active.staging=null;active=null;}
   }
  }
  if(now>=nextUpdate){nextUpdate=now+250;
   for(const g of groups){if(!g.detail)continue;const d=distance(g,camera),near=g.near?d<1900:d<1500;
    if(near===g.near)continue;g.near=near;g.treeRoot.visible=near;g.far.visible=!near;changed=true;
   }
  }
  return changed;
 }};
}
