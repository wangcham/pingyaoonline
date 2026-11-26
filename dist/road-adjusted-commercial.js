import * as T from 'three';
import {clearanceRect,roadAdjustedFootprint} from './road-clearance.js';
import {createUrbanBatch} from './urban-batch.js';
import {resolveBuildingHeight} from './building-heights.js';
import {westGroundHeight} from './west-terrain.js';

export function addRoadAdjustedCommercial(scene,p,namedBoard){
  const footprint=roadAdjustedFootprint(clearanceRect(p.x,p.z,p.w,p.d),[p.x,p.z]);if(!footprint)return null;
  const root=new T.Group();root.name=p.name;root.position.set(p.x,westGroundHeight(p.x,p.z),p.z);scene.add(root);
  const ring=footprint.map(([x,z])=>[x-p.x,z-p.z]),batch=createUrbanBatch(root),h=5.2+(p.floors-1)*3.35;
  const shape=new T.Shape(ring.map(([x,z])=>new T.Vector2(x,-z)));
  const body=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});body.rotateX(-Math.PI/2);
  const wall=new T.Mesh(body,new T.MeshStandardMaterial({color:p.facade,roughness:.87}));wall.castShadow=wall.receiveShadow=true;root.add(wall);
  const roof=new T.ShapeGeometry(shape);roof.rotateX(-Math.PI/2);roof.translate(0,h+.06,0);
  const top=new T.Mesh(roof,new T.MeshStandardMaterial({color:'#7d817b',roughness:.94}));top.receiveShadow=true;root.add(top);
  const faces=ring.map((a,i)=>{
    const b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    return {x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,length,nx:(b[1]-a[1])/length,nz:-(b[0]-a[0])/length};
  });
  const front=faces.reduce((a,b)=>b.nx*Math.sin(p.face)+b.nz*Math.cos(p.face)>a.nx*Math.sin(p.face)+a.nz*Math.cos(p.face)?b:a);
  for(const f of faces){
    const angle=Math.atan2(f.nx,f.nz),at=(color,u,y,w,hh,d,offset=.09)=>batch.box(color,f.x+u*f.nz+f.nx*offset,y,f.z-u*f.nx+f.nz*offset,w,hh,d,angle);
    at(p.trim,0,h+.3,f.length,.46,.2,0);
    for(let floor=0;floor<p.floors;floor++){
      const base=floor===0?0:5.2+(floor-1)*3.35,storey=floor===0?5.2:3.35;
      const bays=Math.max(1,Math.floor(f.length/4.5)),spacing=f.length/bays;
      at('#b7b7ad',0,base+.12,f.length,.18,.16);
      for(let i=0;i<bays;i++){
        const u=(i+.5)*spacing-f.length/2,ww=Math.min(2.55,spacing*.66),y=base+storey*.54;
        if(f===front&&floor===0&&i===Math.floor(bays/2)){
          at('#46565e',u,1.55,2.5,3.1,.16,.12);at('#8d9998',u,1.55,.07,3.1,.12,.24);
          at(p.trim,u,3.4,3.1,.18,.95,.45);at('#a7a69b',u,.15,3,.3,.9,.48);
        }else{
          at('#cac9bb',u,y,ww+.14,1.88,.13);at(p.glass,u,y,ww,1.72,.09,.2);at('#a7b0a8',u,y,.065,1.72,.08,.26);
        }
      }
    }
  }
  const faceAngle=Math.atan2(front.nx,front.nz);
  namedBoard(root,p.name,front.x+front.nx*.29,h-1.3,front.z+front.nz*.29,Math.min(16,front.length*.8),1.2,faceAngle,p.trim);
  for(const [i,name] of (p.groundShops??[]).entries()){
    const bay=front.length/p.groundShops.length,u=(i+.5)*bay-front.length/2;
    namedBoard(root,name,front.x+u*front.nz+front.nx*.31,3.95,front.z-u*front.nx+front.nz*.31,Math.min(15,bay*.85),.7,faceAngle,p.trim);
  }
  batch.finish();
  root.userData.buildingRecord={...resolveBuildingHeight({x:p.x,z:p.z,w:p.w,d:p.d,fallbackFloors:p.floors,estimatedHeight:h,buildingType:p.name.includes('酒店')?'hotel':'office'}),
    id:`commercial-${p.name}`,name:p.name,x:p.x,z:p.z,w:p.w,d:p.d,angle:0,footprint,originalFootprint:clearanceRect(p.x,p.z,p.w,p.d),
    estimated:true,footprintEstimated:true,footprintSource:'AMap-POI-and-image-estimate; OSM-road-edge-clipped',
    correction:'保留原定位与背街边界，将侵入路面的示意转角收至地图路缘；真实外轮廓仍待逐栋核对。'};
  return root;
}
