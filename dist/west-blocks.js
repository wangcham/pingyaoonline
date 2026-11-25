import * as T from 'three';
import {resolveBuildingHeight} from './building-heights.js';
import {createUrbanBatch} from './urban-batch.js';
import {westGroundHeight} from './west-terrain.js';
import {createWestBlockLayout,westBlockWorld} from './west-block-layout.js';
import {mapData} from './map-data.js';
import {pointInRing} from './geography.js';

export function addWestBlocks(scene,layout=createWestBlockLayout()){
  const batch=createUrbanBatch(scene);
  let buildings=0;const heightRecords=[];
  for(const p of layout.plots){
    const wall=['#b7b4a8','#c3b9a7','#a9ada8','#b8ab9b'][p.variant%4];
    const corners=[[-p.w/2,-p.d/2],[p.w/2,-p.d/2],[p.w/2,p.d/2],[-p.w/2,p.d/2]].map(([x,z])=>westBlockWorld(p.x+x,p.z+z));
    const heights=corners.map(([x,z])=>westGroundHeight(x,z)),base=Math.max(...heights)+.06,low=Math.min(...heights)-.15;
    const local=(x,z)=>westBlockWorld(p.x+x,p.z+z);
    function box(color,x,y,z,w,h,d,rotation=0,kind='box'){
      const [px,pz]=local(x,z);batch.part(kind,color,px,y+base,pz,w,h,d,p.angle+rotation);
    }
    function house(x,z,w,d,floors=1,rotation=0,sheet=false){
      buildings++;
      const [px,pz]=local(x,z),record=resolveBuildingHeight({x:px,z:pz,w,d,angle:p.angle+rotation,fallbackFloors:floors,buildingType:sheet?'industrial':'residential'});
      const h=record.height;floors=record.floors;const storey=(h-.35)/floors;
      heightRecords.push({id:`west-interior-${buildings}`,x:px,z:pz,w,d,angle:p.angle+rotation,...record,footprintSource:'inferred-parcel',footprintEstimated:true});
      box(wall,x,h/2,z,w,h,d,rotation);
      const c=Math.cos(rotation),s=Math.sin(rotation);
      const at=(dx,dz)=>[x+dx*c+dz*s,z-dx*s+dz*c];
      const detail=(color,dx,y,dz,ww,hh,dd)=>{const [px,pz]=at(dx,dz);box(color,px,y,pz,ww,hh,dd,rotation);};
      // Ordinary concrete low-rise buildings, with flat slabs and parapets.
      detail(sheet?'#526d7a':'#8a8d88',0,h+.14,0,w+.22,.28,d+.22);
      for(const side of [-1,1]){
        detail('#aaa99e',0,h+.47,side*(d/2-.1),w,.48,.2);
        detail('#aaa99e',side*(w/2-.1),h+.47,0,.2,.48,d);
      }
      if(sheet)for(let dx=-w/2+.5;dx<w/2;dx+=.9)detail('#697e86',dx,h+.30,0,.045,.035,d-.4);
      else if(p.variant%3===0&&w>10)detail('#b1b0a4',-w*.22,h+.75,-d*.18,2.4,1.1,1.8);
      for(let floor=0;floor<floors;floor++)for(let off=-w/2+1.5;off<w/2-1;off+=3.1){
        const xx=x+off*c+(d/2+.06)*s,zz=z-off*s+(d/2+.06)*c;
        box('#ddd9c9',xx,1.65+floor*storey,zz,1.65,1.55,.12,rotation);
        detail('#536a73',off,1.65+floor*storey,d/2+.14,1.4,1.3,.08);
        if(p.kind==='residential'&&floor>0&&Math.abs(off)<1.6){
          detail('#aaa99e',off,.76+floor*storey,d/2+.44,2.1,.15,.8);
          detail('#71807d',off,1.23+floor*storey,d/2+.8,2.0,.8,.045);
        }
      }
      detail('#4b6063',0,1.2,d/2+.14,1.3,2.4,.16);
      detail('#8b908b',0,2.55,d/2+.35,1.8,.13,.7);
      if(floors>1){detail('#c9c8ba',w*.28,3.7,d/2+.3,.8,.5,.45);detail('#747f7b',w*.28,3.7,d/2+.54,.55,.3,.04);}
    }
    // Solid foundations fill small terrain differences, rather than floating slabs.
    box('#85857a',0,(low-base)/2,0,p.w,base-low,p.d);
    box('#a2a196',0,.025,0,p.w,.05,p.d);
    if(p.kind==='residential'){
      house(0,-p.d*.25,p.w-1,10,3+p.variant%2,0,false);
      house(0,p.d*.34,p.w-3,5,1,Math.PI,false);
    }else if(p.kind==='workshop'){
      house(0,-p.d*.26,p.w-1,11,1,0,true);
      house(0,p.d*.26,p.w-1,11,1,Math.PI,true);
    }else{
      // Two deep rectangular houses with a service yard, not a four-sided ancient compound.
      house(0,-p.d*.265,p.w-1,p.d*.43,1+p.variant%3,0,false);
      house(0,p.d*.265,p.w-2,p.d*.43,1+(p.variant+1)%2,Math.PI,false);
    }
    for(const side of [-1,1]){
      box('#a0a196',side*p.w/2,.65,0,.22,1.3,p.d);
    }
    box('#575d53',p.w*.25,.45,p.d*.14,.75,.9,.65);
  }
  const root=batch.finish();root.name='下西关街两侧内部街坊（近似）';
  const vertices=[];
  for(const {a,b,width} of layout.laneSegments){
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;
    const corners=[[-1,a],[-1,b],[1,b],[1,a]].map(([side,[x,z]])=>{
      const px=x+nx*side*width/2,pz=z+nz*side*width/2;return [px,westGroundHeight(px,pz)+.09,pz];
    });
    for(const k of [0,1,2,0,2,3])vertices.push(...corners[k]);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const lanes=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#929389',roughness:1,side:T.DoubleSide}));lanes.name='街坊内部连接巷道';lanes.receiveShadow=true;root.add(lanes);
  root.userData={approximate:true,style:'modern-mixed-height',pitchedRoofs:0,plots:layout.plots.length,buildings,heightRecords,laneSegments:layout.laneSegments.length};return root;
}

export function addSchoolInterior(scene){
  const batch=createUrbanBatch(scene),root=new T.Group();root.name='二中操场与附属楼（近似）';scene.add(root);
  const heightRecords=[];
  // East-side family/dormitory rows visible on the satellite image, inside the OSM envelope.
  for(const [i,z] of [199,229,259].entries()){
    const x=-1693+i*3,w=48,d=11,h=12.6,base=westGroundHeight(x,z);
    if(![[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].every(([dx,dz])=>pointInRing(x+dx,z+dz,mapData.campus)))continue;
    heightRecords.push({id:`school-annex-${i}`,name:'二中附属楼（近似）',x,z,w,d,height:h,levels:4,buildingType:'residential',heightSource:'image-and-type-estimate',confidence:.3,estimated:true,footprintEstimated:true});
    batch.box('#aaa08e',x,base+h/2,z,w,h,d);
    batch.box('#686f6a',x,base+h+.16,z,w+.4,.32,d+.4);
    for(const side of [-1,1])for(let floor=0;floor<4;floor++)for(let dx=-21;dx<=21;dx+=3.5){
      batch.box('#52696c',x+dx,base+1.8+floor*3.05,z+side*(d/2+.06),1.8,1.45,.14);
      batch.box('#c1baaa',x+dx,base+1.0+floor*3.05,z+side*(d/2+.17),2.1,.14,.3);
    }
  }
  root.add(batch.finish());
  function trackBand(outerX,outerZ,innerX,innerZ,color,lift){
    const vertices=[],indices=[],cx=-1772,cz=252;
    for(let i=0;i<=80;i++){
      const t=i*Math.PI/40;
      for(const [rx,rz] of [[outerX,outerZ],[innerX,innerZ]]){
        const dx=Math.cos(t)*rx,dz=Math.sin(t)*rz,x=cx+dx*Math.cos(.108)+dz*Math.sin(.108),z=cz-dx*Math.sin(.108)+dz*Math.cos(.108);
        vertices.push(x,westGroundHeight(x,z)+lift,z);
      }
      if(i){const j=i*2;indices.push(j-2,j-1,j,j-1,j+1,j);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}));mesh.receiveShadow=true;root.add(mesh);
  }
  trackBand(42,23,36,17,'#927768',.085);
  trackBand(36,17,0,0,'#929b88',.085);
  for(let k=0;k<4;k++)trackBand(41-k*1.4,22-k*1.4,40.92-k*1.4,21.92-k*1.4,'#c2bb9d',.092);
  root.userData={approximate:true,heightRecords};return root;
}
