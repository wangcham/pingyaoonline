import * as T from 'three';
import {resolveBuildingHeight} from './building-heights.js';
import {mapData} from './map-data.js';
import {pointInRing,segments,projectOnSegment,createRingQuery} from './geography.js';
import {westGroundHeight} from './west-terrain.js';
import {createUrbanBatch} from './urban-batch.js';
import {createPavingMaterial} from './paving.js';
import {yufengAccessEdge,nearestShuncheng} from './west-road-layout.js';
import {stationStreetIntersects} from './shuncheng.js';
import {clearanceRect} from './road-clearance.js';

// Surrounding block is inferred from the existing commercial anchors, not a cadastral survey.
export const yufengBlockBoundary=[[-1628,-140],[-1497,-140],[-1497,-38],[-1518,-38],[-1518,34],[-1530,90],[-1546,90],[-1546,36],[-1600,36],[-1640,-70]];
export const yufengLanes=[
  [yufengAccessEdge,[-1538,36],[-1538,-65],[-1538,-128]],
  [[-1609,-65],[-1585,-65],[-1538,-65],[-1505,-65]],
  [[-1609,-124],[-1560,-124],[-1505,-124]],
  [[-1589,-124],[-1589,-65]],
];
export const yufengStops=[
  {name:'宇峰写字楼 · 楼后街巷',keywords:'宇锋 宇峰 写字楼 内部 后街 后巷 街景',address:'楼后通道、两侧门脸与楼间院落 · 布局近似',eye:[-1538,2.1,38],target:[-1538,2.8,-38]},
  {name:'宇峰写字楼 · 北侧街坊',keywords:'宇锋 宇峰 写字楼 里面 北侧 支巷',address:'北侧支巷、低层商住楼与小院 · 布局近似',eye:[-1589,2.1,-68],target:[-1589,3,-111]},
];
const yufengBoundaryQuery=createRingQuery(yufengBlockBoundary);
export function isYufengBlock(x,z,radius=0){return yufengBoundaryQuery.contains(x,z,radius+1);}
export function addYufengBlock(scene,namedBoard){
  const heightRecords=[];
  const a=createUrbanBatch(scene,{paving:createPavingMaterial('yard'),ground:westGroundHeight});
  const laneBuffers=new Map();
  function laneStrip(p,q,lo,hi,lift,color){
    if(!laneBuffers.has(color))laneBuffers.set(color,[]);
    const vertices=laneBuffers.get(color),length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const nx=-(q[1]-p[1])/length,nz=(q[0]-p[0])/length,steps=Math.ceil(length/1.5);
    function vertex(t,offset){
      const x=p[0]+(q[0]-p[0])*t+nx*offset,z=p[1]+(q[1]-p[1])*t+nz*offset;
      const distance=nearestShuncheng([x,z]).distance;
      // A flush, continuous ramp across the lowered pavement at the access mouth.
      const blend=Math.min(1,Math.max(0,(distance-4.8)/6));
      return [x,westGroundHeight(x,z)+.121+(lift-.121)*blend,z];
    }
    for(let i=0;i<steps;i++){
      const v=[vertex(i/steps,lo),vertex((i+1)/steps,lo),vertex((i+1)/steps,hi),vertex(i/steps,hi)];
      if(stationStreetIntersects(v.map(p=>[p[0],p[2]])))continue;
      for(const k of [0,1,2,0,2,3])vertices.push(...v[k]);
    }
  }
  for(const lane of yufengLanes)for(const {start,end} of segments(lane)){
    laneStrip(start,end,-2.6,2.6,.12,'#777b79');
    for(const side of [-1,1]){
      laneStrip(start,end,side*2.6,side*3.8,.24,'#a0a097');
    }
  }
  const laneRoot=new T.Group();laneRoot.name='宇峰支路贴地连接';
  for(const [color,vertices] of laneBuffers){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.95,side:T.DoubleSide}));
    mesh.receiveShadow=true;laneRoot.add(mesh);
  }
  function building(x,z,w,d,floors,angle,index){
    if(stationStreetIntersects(clearanceRect(x,z,w,d,angle,1.2)))return;
    const heightRecord=resolveBuildingHeight({x,z,w,d,angle,fallbackFloors:floors,buildingType:'residential'});floors=heightRecord.floors;
    heightRecords.push({id:`yufeng-rear-${index}`,x,z,w,d,angle,...heightRecord,footprintSource:'inferred-parcel',footprintEstimated:true});
    const h=heightRecord.height,wall=['#a6a59a','#94978f','#b0a595'][index%3];
    const local=(xx,zz)=>[x+xx*Math.cos(angle)+zz*Math.sin(angle),z-xx*Math.sin(angle)+zz*Math.cos(angle)];
    function box(color,xx,y,zz,ww,hh,dd){const [px,pz]=local(xx,zz);a.box(color,px,y,pz,ww,hh,dd,angle);}
    box(wall,0,h/2,0,w,h,d);box('#555c5b',0,h+.17,0,w+.5,.34,d+.5);
    for(const side of [-1,1]){
      box('#a4a59b',0,h+.48,side*(d/2-.1),w,.42,.2);
      box('#a4a59b',side*(w/2-.1),h+.48,0,.2,.42,d);
    }
    for(let f=1;f<floors;f++)for(let xx=-w/2+2;xx<w/2-1;xx+=3.7){
      box('#465e64',xx,3.7+(f-.5)*3,d/2+.05,2.3,1.55,.13);
      box('#c4c1b6',xx,3.7+(f-.5)*3,d/2+.15,.08,1.6,.1);
    }
    for(let xx=-w/2+2.1;xx<w/2-1;xx+=4.4){
      box('#394746',xx,1.45,d/2+.07,3.5,2.7,.15);
      box(index%2?'#655a4b':'#657779',xx,1.45,d/2+.2,3.2,2.5,.12);
      box('#b5b2a4',xx,1.45,d/2+.3,.09,2.65,.09);
      box('#55544e',xx,3,d/2+.2,3.8,.48,.3);
      box(index%2?'#75685b':'#4c6869',xx,2.78,d/2+.8,3.8,.12,1.5);
      if(index%3===0)for(let sy=.4;sy<2.7;sy+=.25)box('#8b8c80',xx,sy,d/2+.31,3.2,.04,.08);
    }
    for(let f=1;f<floors;f++){
      box('#bcb9a9',-w*.3,3.6+(f-.5)*3,d/2+.36,.9,.55,.5);
      box('#515b58',-w*.3,3.6+(f-.5)*3,d/2+.63,.65,.3,.05);
    }
    box('#9c9d92',0,.13,d/2+.55,w+.4,.26,1.1);
  }
  // Existing office/mall footprints are kept; this fills the rear lane and northern block.
  const houses=[
    [-1524,-20,14,10,2,-Math.PI/2],[-1524,0,14,10,1,-Math.PI/2],[-1524,20,14,10,2,-Math.PI/2],
    [-1572,-85,23,12,2,0],[-1548,-85,18,12,3,0],[-1518,-85,19,12,2,0],
    [-1572,-111,23,11,1,Math.PI],[-1548,-111,18,11,2,Math.PI],[-1518,-111,19,11,1,Math.PI],
    [-1603,-96,29,11,2,Math.PI/2],
  ];
  houses.forEach((p,i)=>building(...p,i));
  // Small shared yards behind the northern shop rows, with gates and service details.
  for(const x of [-1572,-1548,-1518]){
    if(stationStreetIntersects(clearanceRect(x,-98,21,14)))continue;
    a.part('paving','#ffffff',x,.04,-98,19,.08,12);
    for(const dx of [-10,10])a.box('#797d76',x+dx,1.1,-98,.3,2.2,14);
    a.box('#76614e',x-4,.45,-98,2,.9,1.1);
  }
  for(const [x,z] of [[-1542,29],[-1534,-42],[-1584,-70],[-1534,-117]]){
    a.box('#4f5956',x,2.4,z,.13,4.8,.13);a.box('#d7cfaa',x,4.8,z,.45,.15,.7);
    a.box('#546456',x+1,.45,z,.55,.9,.55);
  }
  for(let z=-35;z<33;z+=13){
    a.box('#a7a89b',-1541,.37,z,.22,.7,.22);
    a.box('#555c5c',-1540.8,.21,z+1.3,.4,.05,.7);
  }
  for(let z=-115;z<-73;z+=11){
    a.box('#484f50',-1585,.35,z,.65,.4,1.5);
    for(const dz of [-.5,.5])a.part('globe','#272e30',-1585,.25,z+dz,.38,.45,.38);
    a.box('#626c67',-1585,.7,z,.4,.22,.75);
  }
  const group=a.finish();group.name='宇峰写字楼周边街巷（示意）';group.userData={approximate:true,heightRecords};
  group.add(laneRoot);
  // Directional marker describes the modeled destination, not an invented tenant.
  namedBoard(scene,'宇峰写字楼',-1538,2.8+westGroundHeight(-1538,32),32,3.2,.6,Math.PI,'#465653');
  return group;
}
