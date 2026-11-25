import * as T from 'three';
import {westGroundHeight} from './west-terrain.js';
import {createUrbanBatch} from './urban-batch.js';

// Address/corner checked in Amap's public POI pages and their facade photos.
// Facade dimensions remain illustrative, attached to the existing building envelope.
export const junctionJewelry=[
  {name:'平遥黄金珠宝城（仙蔓珠宝店）',host:'万人商厦',corner:'西南角',address:'顺城北路与下西关街交叉口西南20米',
    source:'https://www.amap.com/place/B0FFK8EB3L',eye:[-1520,3.2,118],target:[-1534,4,137]},
  {name:'周大生（平遥旗舰店）',host:'陶源丰新天地',corner:'东南角',address:'下西关街与顺城路交叉口东南角',
    source:'https://www.amap.com/place/B0FFFVTKP9',eye:[-1513,3.2,106],target:[-1499,3.5,120]},
];
export const jewelryStops=junctionJewelry.map(p=>({name:p.name,keywords:'金店 珠宝 黄金 顺城路 下西关街 路口 '+p.corner,
  address:p.address+' · 门面尺寸近似',eye:p.eye,target:p.target}));

export function addJunctionJewelry(scene,plot,_box,namedBoard){
  const record=junctionJewelry.find(p=>p.host===plot.name);if(!record)return;
  const group=new T.Group();group.name=record.name;group.position.set(plot.x,westGroundHeight(plot.x,plot.z),plot.z);
  group.userData={...record,approximate:true};scene.add(group);
  const details=createUrbanBatch(group);
  const gold=plot.name==='万人商厦',side=gold?1:-1;
  const edgeX=side*plot.w/2,edgeZ=-plot.d/2;
  const dark=gold?'#3d3731':'#61544b',metal=gold?'#b69a55':'#a08a66',glass='#596f73';
  // Two adjoining facades wrap around the same host building, never a detached box.
  function face(cx,cz,width,yaw,label){
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    const add=(color,x,y,z,w,h,d)=>details.box(color,cx+x*cos+z*sin,y,cz-x*sin+z*cos,w,h,d,yaw);
    add(dark,0,2.6,.09,width,5.2,.18);
    add(glass,0,1.8,.22,width-.35,3.35,.12);
    for(let x=-width/2+.18;x<=width/2;x+=2.8){
      add(metal,x,1.8,.32,.10,3.5,.10);
      add('#c5b17e',x,3.68,.33,.12,.10,.12);
    }
    add(metal,0,.16,.34,width,.3,.38);
    add(dark,0,4.26,.29,width,1.02,.36);
    add(metal,0,4.83,.4,width,.09,.17);
    add(metal,0,3.72,.4,width,.09,.17);
    // Reflections and warm display counters are opaque, avoiding transparency sorting.
    for(let x=-width/2+1.5;x<width/2-1;x+=3.2){
      add('#b49a67',x,.92,.30,2.35,.65,.14);
      add('#d8cfb1',x,1.28,.32,2.35,.08,.16);
    }
    if(gold)for(let x=-width/2+.3;x<width/2;x+=.58)add(metal,x,5.49,.25,.13,1.2,.22);
    const textDepth=.49;
    namedBoard(group,label,cx+sin*textDepth,4.25,cz+cos*textDepth,width*.91,.75,yaw,dark,gold?'#e6c66b':'#c67b75');
    // Main glazed doorway, with a continuous lintel instead of a gap in the street wall.
    add('#273335',0,1.56,.36,2.6,2.96,.12);
    for(const x of [-.65,.65])add('#78918c',x,1.56,.43,1.19,2.74,.06);
    for(const x of [-.12,.12])add(metal,x,1.5,.49,.035,.45,.035);
  }
  const frontWidth=gold?plot.w:22,sideWidth=gold?30:18;
  face(gold?0:edgeX+frontWidth/2,edgeZ,frontWidth,Math.PI,gold?'平遥黄金珠宝城':'周大生');
  face(edgeX,edgeZ+sideWidth/2,sideWidth,side*Math.PI/2,gold?'老庙黄金 · 六福珠宝':'周大生 CHOW TAI SENG');
  // Gold vertical corner strips and a continuous cap, as seen in the shop photo.
  details.box(metal,edgeX+side*.12,2.9,edgeZ-.12,.27,5.8,.27);
  details.finish();
  return group;
}
