import {isJinglinContext,jinglinContext,jinglinContextWorld} from './jinglin-context-data.js';
import * as T from 'three';
import {addJinglinShop} from './jinglin-shop.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {schoolGroundMaterial} from './school-appearance.js';
import {resolveBuildingHeight} from './building-heights.js';
import {mapData} from './map-data.js';
import {addWestRoadSurface,westGroundHeight,westRoadSurfaceHeight} from './west-terrain.js';
import {isWestDistrictParcel} from './west-district.js';
import {makeGrid, pointInRing, projectOnSegment, sample, segments} from './geography.js';
import {shunchengCarriageways} from './west-road-layout.js';
import {westBlockAlleys,westBlockZones} from './west-block-data.js';
import {isShunchengParcel} from './shuncheng.js';
import {westSiteIntersectsRing} from './west-sites-data.js';
import {clearanceRect} from './road-clearance.js';

const westRoads = mapData.roads.filter(([, ,name, points]) =>
  (name === '下西关街' || name === '上西关街' || name === '顺城北路' || name === '郑孝燮路') &&
  points.some(([x,z]) => x > -2090 && x < -1070 && z > 0 && z < 920));
const corridor = [
  ...westRoads.filter(([, ,name])=>name!=='下西关街').flatMap(([, ,name,path])=>segments(path).map(line=>({line,name}))),
  ...segments(mapData.lowerWestRoad).map(line=>({line,name:'下西关街'})),
];

function inWestStudy(x,z) {
  return x > -2075 && x < -1075 && z >= 28 && z < 920;
}

export function isWestFrontage(x,z,radius) {
  return inWestStudy(x,z) && corridor.some(({line})=>projectOnSegment([x,z],line).distance<25+radius);
}

// Manually reviewed frontage references. Positions and appearance remain illustrative.
const namedWestShops = [
  {name:'景林江米油糕',x:-1888,side:1,width:4.6,style:1,address:'平遥二中北门西侧',food:true},
  {name:'美利达自行车',x:-2044,side:-1,width:10,style:2,address:'永安街种子公司对面'},
  {name:'正泰电器',x:-2019,side:-1,width:9,style:4,address:'西关大街旧建设局一带'},
  {name:'成成过油肉',x:-1976,side:-1,width:10,style:1,address:'环建巷路口西北'},
  {name:'遥来香美食广场',x:-1988,side:1,width:15,style:3,address:'西关大街182号'},
  {name:'景上川菜馆',x:-1908,side:-1,width:10,style:1,address:'平遥二中北门以西'},
  {name:'晓亮书店',x:-1766,side:1,width:8,style:0,address:'下西关街与环建巷交叉口东200米'},
  {name:'鲜活香超市',x:-1853,side:-1,width:10,style:0,address:'平遥二中北门旁'},
  {name:'十凤牛肉丸子面',x:-1800,side:-1,width:10,style:1,address:'古陶镇人民政府南门附近'},
  {name:'马俊兰州牛肉面',x:-1785,side:-1,width:10,style:3,address:'西关大街棉麻公司东侧'},
  {name:'耿龙超市',x:-1774,side:-1,width:8,style:0,address:'古陶镇人民政府南门旁'},
  {name:'广聚源面食店',x:-1723,side:-1,width:10,style:3,address:'下西关街古陶镇政府旁'},
  {name:'爱心干洗',x:-1693,side:1,width:8,style:2,address:'平遥二中北门以东'},
  {name:'惠折扣二中店',x:-1686,side:-1,width:10,style:0,address:'平遥二中家属院对面'},
  {name:'平遥木槿花艺设计店',x:-1648,side:-1,width:10,style:0,address:'下西关街财源巷1号'},
  {name:'玩家国度电竞馆',x:-1563,side:1,width:9,style:2,address:'顺城北路交叉口西南'},
  {name:'书亦烧仙草',x:-1396,side:1,width:8,style:0,address:'古陶运腾市场北门旁'},
  {name:'蜜雪冰城',x:-1385,side:1,width:9,style:1,address:'古陶运腾市场旁'},
  {name:'茶百道',x:-1380,side:-1,width:8,style:2,address:'顺城北路交叉口以东'},
  {name:'库迪咖啡',x:-1365,side:-1,width:9,style:4,address:'下西关街49号'},
  {name:'1点点',x:-1349,side:-1,width:8,style:0,address:'西关大街53号'},
  {name:'禾木点心局',x:-1245,side:-1,width:9,style:3,address:'郑孝燮路交叉口西侧'},
];

function shopView(shop) {
  const road=segments(mapData.lowerWestRoad).find(({start,end})=>shop.x>=start[0]&&shop.x<=end[0]);
  const t=(shop.x-road.start[0])/(road.end[0]-road.start[0]);
  const [,z]=sample(road,t);
  return {x:shop.x,z:z+shop.side*12,roadZ:z,yaw:shop.side>0?Math.PI:0};
}

// Partition continuous street-facing rows, instead of scattering detached shop boxes.
// Store names are approximate references; only roads/known entrances split a row.
let westFrontageCache;
export function planWestFrontages(){
  if(westFrontageCache)return westFrontageCache;
  const rows=[],units=[],otherRoads=mapData.roads.filter(([, ,name])=>name!=='下西关街')
    .flatMap(([,width,,path])=>segments(path).map(line=>({line,width})));
  const alleyEdges=westBlockAlleys.flatMap(segments);
  function clear(x,z,side){
    if(isWestDistrictParcel(x,z,0)||pointInRing(x,z,mapData.campus)||pointInRing(x,z,mapData.wall))return false;
    if(side===1&&x>-1871&&x<-1845)return false;
    if(mapData.buildings.some(([,,ring])=>pointInRing(x,z,ring)))return false;
    if(otherRoads.some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+1.2))return false;
    if(shunchengCarriageways.some(line=>projectOnSegment([x,z],line).distance<8.1))return false;
    if(alleyEdges.some(line=>projectOnSegment([x,z],line).distance<3.1))return false;
    return x<-1235;
  }
  for(const line of segments(mapData.lowerWestRoad)){
    const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
    const steps=Math.ceil(line.length),step=line.length/steps;
    for(const side of [-1,1]){
      const point=(along,offset=12)=>{
        const [x,z]=sample(line,along/line.length);return [x-dz*side*offset,z+dx*side*offset];
      };
      let start=null;
      const finish=end=>{
        if(start===null||end-start<4){start=null;return;}
        const id=rows.length,row={id,line,side,start,end,depth:6};rows.push(row);
        const anchors=namedWestShops.filter(shop=>shop.side===side&&shop.x>=Math.min(...[point(start)[0],point(end)[0]])&&shop.x<=Math.max(...[point(start)[0],point(end)[0]]))
          .map(shop=>({shop,along:(shop.x-line.start[0]+dz*side*12)/dx})).sort((a,b)=>a.along-b.along);
        const spans=[];let cursor=start;
        function fill(to){
          const n=Math.max(1,Math.round((to-cursor)/8)),w=(to-cursor)/n;
          if(w>.2)for(let i=0;i<n;i++)spans.push({a:cursor+i*w,b:cursor+(i+1)*w});
          cursor=to;
        }
        for(const {shop,along} of anchors){
          let a=Math.max(cursor,along-shop.width/2),b=Math.min(end,along+shop.width/2);
          if(b-a<3)continue;
          // Jinglin shares an exact edge with its custom window bay. Absorbing
          // a short remainder here widens its tiled wall into that glazing.
          if(a-cursor<3&&!shop.food)a=cursor;else fill(a);
          if(end-b<3&&!shop.food)b=end;
          spans.push({a,b,shop});cursor=b;
        }
        if(cursor<end)fill(end);
        for(const [i,{a,b,shop}] of spans.entries()){
          const [x,z]=point((a+b)/2);
          units.push({row:id,x,z,width:b-a,depth:6,yaw:Math.atan2(dz*side,-dx*side),side,shop,variant:shop?.style??(id+i)%5,
            left:point(a),right:point(b)});
        }
        start=null;
      };
      for(let i=0;i<steps;i++){
        const a=i*step,b=(i+1)*step;
        const valid=[a,(a+b)/2,b].every(d=>[9,15].every(offset=>clear(...point(d,offset),side)));
        if(valid){if(start===null)start=a;}else finish(a);
      }
      finish(line.length);
    }
  }
  // Keep surveyed shop anchors fixed while splitting generic rows around the
  // custom glazed frontage, lane and tax-office parcel.
  const byRow=new Map(rows.map(row=>[row.id,units.filter(p=>p.row===row.id)]));
  const kept=units.filter(p=>p.shop?.food||!isJinglinContext(p.x,p.z)),remaining=new Set(kept),clippedRows=[];
  for(const row of rows){
    let run=[];
    const flush=()=>{
      if(!run.length)return;
      const along=point=>((point[0]-row.line.start[0])*(row.line.end[0]-row.line.start[0])+(point[1]-row.line.start[1])*(row.line.end[1]-row.line.start[1]))/row.line.length;
      const id=clippedRows.length;clippedRows.push({...row,id,start:along(run[0].left),end:along(run.at(-1).right)});
      run.forEach(p=>p.row=id);run=[];
    };
    for(const unit of byRow.get(row.id)){if(remaining.has(unit))run.push(unit);else flush();}
    flush();
  }
  westFrontageCache={rows:clippedRows,units:kept};return westFrontageCache;
}

const jinglinStreetView=(u,y,v)=>{const [x,z]=jinglinContextWorld(u,v);return [x,y,z];};
export const westStops = [
  {name:'景林周边 · 小路与地税局',keywords:'景林 玻璃店面 地税局 城西税务所 巷口',address:'下西关街 · 景林右侧巷口',eye:jinglinStreetView(jinglinContext.lane.u+3,3.2,15),target:jinglinStreetView(jinglinContext.lane.u+12,4,0)},
  {name:'下西关街沿街店面',keywords:'西关大街 西关 门面 商铺',address:'永安北路口至郑孝燮路 · 未核实的铺面留空匾',eye:[-1980,2,145],target:[-1935,2.5,141]},
  {name:'下西门 · 凤仪门',keywords:'西门 下西门外 凤凰门 凤仪门 西大街',address:'由南向外门进瓮城，再折向内门',eye:[-1183,2.1,115],target:[-1175,3.1,82.5]},
  {name:'郑孝燮路',keywords:'西城墙 护城路',address:'沿西城墙连接下西门和又见平遥',eye:[-1161,2.1,289],target:[-1146,3,375]},
  ...namedWestShops.map(shop=>{
    const {x,z,roadZ}=shopView(shop);
    if(shop.food)return {name:shop.name,keywords:'景林 江米油糕 炸糕 二中 小吃',address:shop.address,eye:[x,1.75,roadZ+3.5],target:[x,2.1,z-shop.side*3]};
    return {name:shop.name,keywords:'下西关街商户',address:shop.address+' · 门脸示意',
      eye:[x,2.1,roadZ-shop.side*4],target:[x,2.9,z-shop.side*3.5]};
  }),

];

export function addWestFrontages(scene,namedBoard) {
  let jinglin;
  const heightRecords=[],apronVertices=[],apronColors=[],roundDetails=[];
  const frontageRoot=new T.Group();frontageRoot.name='下西关街连续商铺';scene.add(frontageRoot);
  const masonry=createCommerceMaterials(frontageRoot),commerceDetails=[];
  const roadGrid = makeGrid(55);
  for (const [,width,,points] of mapData.roads) {
    for (const line of segments(points)) {
      const [ax,az]=line.start, [bx,bz]=line.end;
      roadGrid.add({line,width},Math.min(ax,bx)-26,Math.min(az,bz)-26,Math.max(ax,bx)+26,Math.max(az,bz)+26);
    }
  }

  const groups = new Map();
  const unit = new T.BoxGeometry(1,1,1);
  const matrix = new T.Object3D();
  function detailBox(color,x,y,z,w,h,d,yaw=0,pitch=0) {
    if (!groups.has(color)) groups.set(color,[]);
    matrix.position.set(x,y+westGroundHeight(x,z),z);
    matrix.rotation.set(pitch,yaw,0,'YXZ');
    matrix.scale.set(w,h,d);
    matrix.updateMatrix();
    groups.get(color).push(matrix.matrix.clone());
  }
  function localKit(x,z,theta,base=westGroundHeight(x,z)) {
    const sin=Math.sin(theta),cos=Math.cos(theta);
    return (color,lx,y,lz,w,h,d,pitch=0)=>{
      const px=x+cos*lx+sin*lz,pz=z-sin*lx+cos*lz;
      detailBox(color,px,y+base-westGroundHeight(px,pz),pz,w,h,d,theta,pitch);
    };
  }

  let seed=5901;
  const rnd = ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const placed=makeGrid(45);
  const protectedParcels = [...mapData.areas.map(([,ring])=>ring),...mapData.buildings.map(([, ,ring])=>ring),mapData.wall];
  const blocked = [
    [-1888,150,10],[-1858,156,19],[-1383,812,36],[-1440,870,23],
    [-1238,435,76],[-1259,538,62],[-1154,62,59],[-1102,831,40],
  ];
  for(const shop of namedWestShops) {
    const {x,z}=shopView(shop);
    blocked.push([x,z,shop.width*.55+2]);
  }
  const wallSide = x => x > -1230;
  function available(x,z,radius) {
    if (isJinglinContext(x,z,radius) || !inWestStudy(x,z) || isWestDistrictParcel(x,z,radius) || pointInRing(x,z,mapData.campus)) return false;
    if (blocked.some(([px,pz,r])=>Math.hypot(x-px,z-pz)<r+radius)) return false;
    if (protectedParcels.some(ring=>pointInRing(x,z,ring))) return false;
    if (placed.at(x,z).some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+radius+.25)) return false;
    return !roadGrid.at(x,z).some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+radius+.8);
  }

  const palettes = [
    {wall:'#d4c2a1',band:'#325653',trim:'#ddd6b7',glass:'#59716b',metal:'#50685c'},
    {wall:'#8f7160',band:'#723e35',trim:'#c4a48b',glass:'#41554e',metal:'#56443e'},
    {wall:'#c4c0ad',band:'#56657a',trim:'#dedbd0',glass:'#536c76',metal:'#546369'},
    {wall:'#aa9782',band:'#635040',trim:'#ebd4ab',glass:'#635d4c',metal:'#766857'},
    {wall:'#aaa495',band:'#48544e',trim:'#cac1a5',glass:'#52645a',metal:'#6c7167'},
  ];
  function buildUnit(x,z,theta,width,depth,variant,connected=false,buildingRecord=null,shop=null) {
    const c=Math.cos(theta),s=Math.sin(theta);
    const cornerHeights=[-1,1].flatMap(a=>[-1,1].map(b=>westGroundHeight(x+c*a*width/2+s*b*depth/2,z-s*a*width/2+c*b*depth/2)));
    const base=Math.max(...cornerHeights)+.025,low=Math.min(...cornerHeights)-.12;
    const add = localKit(x,z,theta,base);
    const p = palettes[variant];
    const fallbackFloors=variant===0||variant===3?2:variant===2?3:1;
    const record=buildingRecord??resolveBuildingHeight({x,z,w:width,d:depth,angle:theta,fallbackFloors,buildingType:'commercial'});
    const levels=record.levels,roof=record.height,storey=(roof-.35)/levels;
    if(shop?.food){
      jinglin=addJinglinShop(frontageRoot,{x,z,yaw:theta,width,depth,base});
      commerceDetails.push({name:shop.name,role:'breakfast',position:[x,z],estimated:true,photoBased:true,doorOffset:0,displayDepth:0});
      return base;
    }
    add('#8e8a7f',0,(low-base)/2,0,width,base-low,depth);
    const front = depth*.5;
    add(p.wall,0,roof/2,0,width,roof,depth);
    const point=(u,y,v)=>[x+u*c+v*s,base+y,z-u*s+v*c];
    const panel=(kind,color,u,y,v,w,h)=>masonry.quad(kind,color,[point(u-w/2,y-h/2,v),point(u+w/2,y-h/2,v),point(u+w/2,y+h/2,v),point(u-w/2,y+h/2,v)]);
    // Material seams use real metre UVs; windows and signs project beyond the wall.
    panel(variant===1?'brick':variant===3?'stone':'plaster',p.wall,0,roof/2,front+.012,width,roof);
    panel('stone','#807c72',0,.23,front+.025,width,.46);
    masonry.quad('roof','#85877d',[point(-width/2,roof+.166,depth/2),point(width/2,roof+.166,depth/2),point(width/2,roof+.166,-depth/2),point(-width/2,roof+.166,-depth/2)]);
    for(const side of [-1,1])masonry.quad(variant===1?'brick':'plaster',p.wall,[point(side*(width/2+.005),0,-depth/2),point(side*(width/2+.005),0,depth/2),point(side*(width/2+.005),roof,depth/2),point(side*(width/2+.005),roof,-depth/2)]);
    add(p.trim,0,roof+.04,0,width+(connected?0:.28),.24,depth+.25);
    add('#a7a090',0,.11,front+.25,width+(connected?0:.3),.21,1.1);
    add(p.band,0,3.18,front+.07,width*.96,.85,.13);

    if (variant===4&&!shop) {
      // Closed metal shutter with thin horizontal joints.
      add('#7e8579',0,1.33,front+.095,width*.79,2.38,.18);
      for(let i=0;i<24;i++) add('#495b54',0,.22+i*.095,front+.195,width*.77,.014,.035);
    } else {
      const glassWidth=width*(variant===1?.39:.69);
      add('#343e38',-width*.09,1.35,front+.085,glassWidth+.14,2.42,.18);
      add(p.glass,-width*.09,1.35,front+.19,glassWidth,2.2,.06);
      add(p.trim,width*.30,1.32,front+.113,1.12,2.44,.15);
      add(p.glass,width*.30,1.32,front+.204,.89,2.23,.05);
      add(p.trim,-width*.12,1.33,front+.24,.08,2.2,.06);
      for(const side of [-1,1])add('#c4c8bf',width*.30+side*.35,1.35,front+.26,.028,.46,.055);
      add('#393c36',-width*.09,.21,front+.23,glassWidth+.15,.08,.23);
      add(p.trim,-width*.09,.28,front+.26,glassWidth+.22,.11,.35);
      if(variant===1 || variant===3) {
        add(p.band,0,2.69,front+.63,width,0.09,1.37,.13);
        add('#a29878',0,2.56,front+1.30,width,.22,.065);
      }
      if(variant===3) {
        add('#65503a',-width*.28,.63,front+.61,width*.23,1.02,.66);
        add(p.trim,-width*.28,1.15,front+.61,width*.27,.12,.76);
        add('#7e6c4e',width*.36,.5,front+.82,.48,.9,.35);
      }
    }
    for(let level=1;level<levels;level++) {
      const y=storey*level+1.18;
      for(const bx of [-width*.27,0,width*.27]) {
        add(p.trim,bx,y,front+.08,width*.18,1.34,.13);
        add(p.glass,bx,y,front+.16,width*.15,1.14,.05);
        add('#c9c9ba',bx,y,front+.21,.045,1.14,.05);
        add('#555b53',bx,y-.72,front+.15,width*.2,.07,.18);
        add(p.trim,bx,y-.66,front+.21,width*.21,.1,.35);
      }
      if(variant===2) add(p.metal,0,y-.75,front+.45,width*.76,.21,.81);
    }
    if(levels>1){
      add(p.metal,width*.24,roof+.48,-depth*.21,.9,.9,.8);
      add('#c6c3b5',-width*.32,4.1,front+.35,.85,.55,.45);
      add('#697370',-width*.32,4.1,front+.59,.6,.35,.035);
    }
    for(const side of [-1,1])add(p.trim,0,roof+.38,side*(depth/2-.12),width,.45,.22);
    // Small service details stay attached to the facade, clear of the doorway.
    add('#626e68',-width*.46,roof/2,front+.13,.065,roof,.09);
    add('#4c5552',-width*.46,.18,front+.21,.13,.15,.23);
    add('#686d62',width*.42,2.3,front+.16,.34,.47,.16);
    add('#4f5750',width*.42,2.3,front+.25,.24,.32,.025);
    for(const u of [-width*.36,width*.36]){
      add('#3f4944',u,3.76,front+.26,.07,.3,.42);
      add('#575f57',u,3.83,front+.43,.35,.12,.3);
      add('#d9ccb2',u,3.765,front+.43,.27,.035,.24);
    }
    if(shop){
      const role=/超市|折扣/.test(shop.name)?'grocer':/面食|面$|川菜|过油肉|美食/.test(shop.name)?'eatery':/油糕/.test(shop.name)?'breakfast':/书店/.test(shop.name)?'bookshop':/冰城|烧仙草|茶百道|咖啡|1点点/.test(shop.name)?'drinks':/点心|烘焙/.test(shop.name)?'bakery':/花艺/.test(shop.name)?'florist':/自行车/.test(shop.name)?'bikes':'retail';
      commerceDetails.push({name:shop.name,role,position:[x,z],estimated:true,doorOffset:width*.30,displayDepth:.8});
      // Business-specific details remain within the 0.8 m frontage apron.
      const round=(color,u,y,v,w,h,d)=>{const p=point(u,y,v);matrix.position.set(...p);matrix.rotation.set(0,theta,0);matrix.scale.set(w,h,d);matrix.updateMatrix();roundDetails.push({matrix:matrix.matrix.clone(),color});};
      if(['eatery','breakfast','bakery','drinks'].includes(role)){
        const awningWidth=width*.68,center=-width*.1;
        for(let j=0;j<10;j++)add(j%2?p.band:'#c9bea3',center+(j-4.5)*awningWidth/10,2.73,front+.70,awningWidth/10,.08,1.15,.1);
        add(p.band,center,2.6,front+1.26,awningWidth,.22,.07);
        add('#727a70',-width*.38,roof+.65,depth*.17,.55,1.1,.55);
        add('#a3a99b',-width*.38,roof+1.25,depth*.17,.88,.12,.8);
      }
      if(role==='drinks'){
        add('#b9ae93',-width*.23,.66,front+.48,2.05,1.12,.55);add('#d2cdb9',-width*.23,1.25,front+.48,2.15,.08,.62);
        add('#485951',-width*.36,1.61,front+.35,.48,.65,.35);add('#b9b9a5',-width*.36,1.65,front+.55,.29,.4,.025);
        for(let j=0;j<5;j++){const u=-width*.18+(j-2)*.21;round(j%2?'#d2c5a3':'#aebca1',u,1.43,front+.48,.15,.28,.15);round('#e5dbc1',u,1.58,front+.48,.18,.03,.18);add('#8c8e72',u+.025,1.69,front+.48,.015,.20,.015);}
      }else if(role==='bakery'||role==='breakfast'){
        for(let i=0;i<3;i++){round('#ae8c5d',-width*.24,.65+i*.2,front+.48,.7,.16,.7);round('#d3b583',-width*.24,.75+i*.2,front+.48,.74,.04,.74);}
        add('#7e7057',-width*.42,1.15,front+.31,.65,1.5,.07);for(let j=0;j<5;j++)add('#d5c5a3',-width*.42,1.65-j*.2,front+.36,.5,.025,.02);
      }else if(role==='florist'){
        for(let j=0;j<4;j++){const u=-width*.3+j*.48;round('#957561',u,.38,front+.48,.35,.55,.35);for(let k=0;k<3;k++){add('#587755',u+(k-1)*.10,.9,front+.48,.035,.65,.04);round(['#c0a18b','#b4808b','#acb37f'][j%3],u+(k-1)*.1,1.22,front+.48,.14,.13,.14);}}
      }
      // Recessed display to the left; the door at +0.30 * width stays unobstructed.
      if(role==='grocer'){
        for(let row=0;row<3;row++){
          add('#5c6c50',-width*.24,.34+row*.37,front+.42,Math.min(2.1,width*.3),.22,.55);
          for(let j=0;j<6;j++)add(['#8ca24b','#cba447','#bb7149'][row],-width*.24+(j-2.5)*.27,.48+row*.37,front+.43,.23,.16,.27);
        }
      }else if(role==='eatery'){
        add('#8a8b7d',-width*.22,.52,front+.40,1.45,.9,.55);
        add('#c4c7b9',-width*.22,1.0,front+.40,1.52,.06,.61);
        for(const u of [-.37,0,.37]){add('#e3dfcc',-width*.22+u,1.08,front+.4,.25,.10,.25);add('#665342',-width*.22+u,1.14,front+.4,.18,.025,.18);}
        add('#504a3d',-width*.42,.95,front+.28,.65,1.45,.08);
        for(let j=0;j<5;j++)add('#c8c1a9',-width*.42,1.4-j*.18,front+.325,.43,.025,.015);
      }else if(role==='bookshop'){
        for(let row=0;row<3;row++){add('#796750',-width*.22,.35+row*.42,front+.32,1.65,.08,.36);for(let j=0;j<9;j++)add(['#738b8b','#ba825c','#c5c0a0'][j%3],-width*.22+(j-4)*.16,.55+row*.42,front+.32,.12,.32,.27);}
      }
    }
    return base;
  }

  for(const {line,name} of corridor) {
    if(name==='下西关街')continue;
    if (line.length<15 || (name==='顺城北路' && line.length>500)) continue;
    const dx=(line.end[0]-line.start[0])/line.length;
    const dz=(line.end[1]-line.start[1])/line.length;
    for(let d=6;d<line.length-4;d+=9+rnd()*2.9) {
      const [cx,cz]=sample(line,d/line.length);
      if(!inWestStudy(cx,cz)) continue;
      for(const side of [-1,1]) {
        const width=6.2+rnd()*4.2, depth=5.2+rnd()*3.3;
        const radius=Math.hypot(width,depth)*.5;
        const offset=11.8+rnd()*1.2;
        const x=cx-dz*side*offset, z=cz+dx*side*offset;
        if(westBlockZones.some(zone=>pointInRing(x,z,zone.ring)))continue;
        if(isShunchengParcel(x,z,radius))continue;
        if (name==='郑孝燮路'&&wallSide(x)) continue;
        if (!available(x,z,radius)) continue;
        const yaw=Math.atan2(dz*side,-dx*side);
        if(westSiteIntersectsRing(clearanceRect(x,z,width,depth,yaw,1.2)))continue;
        placed.add({x,z,radius},x-radius-10,z-radius-10,x+radius+10,z+radius+10);
        const variant=Math.floor(rnd()*palettes.length),record=resolveBuildingHeight({x,z,w:width,d:depth,angle:yaw,fallbackFloors:variant===0||variant===3?2:variant===2?3:1,buildingType:'commercial'});
        buildUnit(x,z,yaw,width,depth,variant,false,record);
        heightRecords.push({...record,id:`west-road-infill-${heightRecords.length}`,x,z,w:width,d:depth,angle:yaw,footprintSource:'inferred-road-frontage',footprintEstimated:true});
      }
      if (name==='下西关街'&&d%31<12) {
        const add=localKit(cx-dz*5.35,cz+dx*5.35,Math.atan2(-dz,dx));
        add('#515b54',0,2.6,0,.12,5.2,.12);
        add('#515b54',0,5.14,-.46,.12,.12,.98);
        add('#dbd7be',0,5.06,-.88,.35,.13,.44);
      }
    }
  }
  const frontagePlan=planWestFrontages();
  for(const unit of frontagePlan.units){
    const {x,z,yaw,width,depth,variant,shop}=unit;
    const fallbackFloors=variant===0||variant===3?2:variant===2?3:1;
    const levels=x>=-1894?1:undefined;
    const record=resolveBuildingHeight({x,z,w:width,d:depth,angle:yaw,levels,fallbackFloors,buildingType:'commercial',
      source:levels?'single-storey-frontage-reference':null});
    if(shop?.food){record.height=4.5;record.heightSource='门头照片比例估算';}
    const base=buildUnit(x,z,yaw,width,depth,variant,true,record,shop);
    unit.base=base;unit.buildingRecord={id:`west-shop-${unit.row}-${heightRecords.length}`,name:shop?.name||'沿街商铺（未核实名称）',x,z,w:width,d:depth,angle:yaw,...record,footprintSource:'image-reviewed-connected-frontage',footprintEstimated:true};
    heightRecords.push(unit.buildingRecord);
    // Paved apron slopes from the door platform down to the existing sidewalk.
    const c=Math.cos(yaw),s=Math.sin(yaw),corners=[];
    for(const [dx,dz] of [[-width/2,depth/2+.8],[width/2,depth/2+.8],[width/2,depth/2+1.6],[-width/2,depth/2+1.6]]){
      const px=x+dx*c+dz*s,pz=z-dx*s+dz*c;
      corners.push([px,dz<depth/2+1?base+.225:westRoadSurfaceHeight(px,pz)+.012,pz]);
    }
    for(const k of [0,1,2,0,2,3]){apronVertices.push(...corners[k]);const v=.62+(unit.row%3)*.025;apronColors.push(v,v,v*.98);}

    if(!shop||shop.food)continue;
    const front=depth/2+.15;
    namedBoard(scene,shop.name,x+Math.sin(yaw)*front,3.18+base,z+Math.cos(yaw)*front,width*.92,.73,yaw,palettes[variant].band);

  }

  const materialControl=masonry.finish();
  if(roundDetails.length){
    const props=new T.InstancedMesh(new T.CylinderGeometry(.5,.46,1,12),new T.MeshStandardMaterial({roughness:.72}),roundDetails.length),tint=new T.Color();
    roundDetails.forEach((p,i)=>{props.setMatrixAt(i,p.matrix);props.setColorAt(i,tint.set(p.color));});props.castShadow=props.receiveShadow=true;props.name='饮品杯、蒸笼与花盆';frontageRoot.add(props);
  }
  frontageRoot.userData={heightRecords,estimated:true,commerceDetails,materialBatches:materialControl.meshes.length};
  const apron=new T.BufferGeometry();apron.setAttribute('position',new T.Float32BufferAttribute(apronVertices,3));apron.setAttribute('color',new T.Float32BufferAttribute(apronColors,3));apron.computeVertexNormals();
  const apronUV=[];for(let i=0;i<apronVertices.length;i+=3)apronUV.push(apronVertices[i]/1.2,apronVertices[i+2]/1.2);apron.setAttribute('uv',new T.Float32BufferAttribute(apronUV,2));
  const apronMaterial=schoolGroundMaterial('#ffffff','paving');apronMaterial.vertexColors=true;
  const apronMesh=new T.Mesh(apron,apronMaterial);apronMesh.name='商铺门前坡面铺装';apronMesh.receiveShadow=true;frontageRoot.add(apronMesh);
  addWestRoadSurface(scene);
  const glassColors=new Set(palettes.map(p=>p.glass));
  for (const [color,transforms] of groups) {
    const glass=glassColors.has(color);
    const mesh = new T.InstancedMesh(unit,new T.MeshStandardMaterial({color,roughness:glass?.26:.88,metalness:glass?.12:0}),transforms.length);
    transforms.forEach((transform,index)=>mesh.setMatrixAt(index,transform));
    mesh.receiveShadow=true;mesh.castShadow=true;
    frontageRoot.add(mesh);
  }
  return {setNight:value=>jinglin?.setNight(value),update:camera=>jinglin?.update(camera),dispose:()=>jinglin?.dispose()};
}
