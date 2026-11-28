import {mapData} from './map-data.js';
import {segments,projectOnSegment,makeGrid,createRingQuery} from './geography.js';

// Local metres, WGS84. Retain mapped south/east reaches; missing reaches are
// interpreted from Esri World Imagery, checked against the existing wall.
// Imagery capture date and surveyed bank/planting dimensions are not available.
export const moatEvidence={checked:'2026-11-28',estimated:true,
  sources:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer','https://www.openstreetmap.org/copyright','https://www.sohu.com/a/454312350_208685'],
  note:'南、西南和东侧中段沿用 OSM 河线；北侧及城门连接段按卫星图与城墙位置近似补齐。河宽、岸高、树位与桥栏为景观表达，非测绘数据。'};
const moatNorth=[[-1253.8,-519.9],[-596.7,-667],[-587.5,-669.5],[-590.6,-691.3],[-581.4,-705.3],[-563.1,-709.2],[-535,-705],[-524,-686],[165.3,-843.5],[174.5,-846],[175.5,-856.3],[187.8,-856.3],[191.8,-843.5],[200,-837.1]];
const moatWest=[moatNorth[0],[-1270,-512],[-1272,-492],[-1202,23],[-1210,36],[-1212,80],[-1197,96],[-1168,100],mapData.water[1][1][0]];
const moatEast=[moatNorth.at(-1),[255,-780],[283,-709],[362,-260],[375,-253],[384,-202],[367,-190],...mapData.water[3][1],[468,358],[489,366],[500,424],[480,444],mapData.water[1][1].at(-1)];
export const moatReaches=[
  {id:'west',name:'西门外',width:4.4,points:moatWest},
  {id:'south',name:'南门与西南城墙',width:5.2,points:mapData.water[1][1]},
  {id:'east',name:'东门外',width:4.2,points:[...moatEast].reverse()},
  {id:'north',name:'北门外',width:4.0,points:[...moatNorth].reverse()},
];
const moatGrid=makeGrid(40),moatRoadGrid=makeGrid(40);
export const moatSegments=moatReaches.flatMap(reach=>segments(reach.points).map(line=>({...line,width:reach.width,reach:reach.id})));
for(const line of moatSegments)moatGrid.add(line,Math.min(line.start[0],line.end[0])-25,Math.min(line.start[1],line.end[1])-25,Math.max(line.start[0],line.end[0])+25,Math.max(line.start[1],line.end[1])+25);
const moatRoads=mapData.roads.flatMap(([type,width,name,points])=>segments(points).map(line=>({...line,type,width,name})));
for(const r of moatRoads)moatRoadGrid.add(r,Math.min(r.start[0],r.end[0])-18,Math.min(r.start[1],r.end[1])-18,Math.max(r.start[0],r.end[0])+18,Math.max(r.start[1],r.end[1])+18);
const moatWallQuery=createRingQuery(mapData.wall),moatBuildings=mapData.buildings.map(([,,ring])=>createRingQuery(ring));
export function isMoatCorridor(x,z,pad=0){return moatGrid.at(x,z).some(l=>projectOnSegment([x,z],l).distance<l.width/2+12+pad);}
export function moatRoadClear(x,z,pad=0){return !moatRoadGrid.at(x,z).some(l=>projectOnSegment([x,z],l).distance<l.width/2+pad);}
export function moatPlantClear(x,z,radius=2){
  return !moatWallQuery.contains(x,z,5+radius)&&moatRoadClear(x,z,radius+.6)
    &&!moatBuildings.some(q=>q.contains(x,z,radius))
    &&!moatGrid.at(x,z).some(l=>projectOnSegment([x,z],l).distance<l.width/2+1.1+radius);
}
// Bridges follow existing roads crossing the channel, including footpaths.
// Parallel bank walks are not mistaken for crossings.
export function planMoatBridges(){
  const bridges=[];
  for(const river of moatSegments)for(const road of moatRoads){
    const a=river.start,b=river.end,c=road.start,d=road.end;
    const rx=b[0]-a[0],rz=b[1]-a[1],sx=d[0]-c[0],sz=d[1]-c[1],cross=rx*sz-rz*sx;
    const sine=Math.abs(cross)/(river.length*road.length);if(sine<.4)continue;
    const t=((c[0]-a[0])*sz-(c[1]-a[1])*sx)/cross,u=((c[0]-a[0])*rz-(c[1]-a[1])*rx)/cross;
    if(t<0||t>1||u<0||u>1)continue;
    const x=a[0]+rx*t,z=a[1]+rz*t;if(bridges.some(p=>Math.hypot(x-p.x,z-p.z)<10))continue;
    const culvert=!['footway','pedestrian'].includes(road.type)&&!['下西关街','上东关街','下东关街','康宁路'].includes(road.name);
    bridges.push({x,z,dx:sx/road.length,dz:sz/road.length,width:Math.max(3.2,road.width),length:(river.width+4)/sine+3,road:road.name||road.type,culvert,smallSouth:road.name==='康宁路'&&z>800&&z<1000,estimated:true});
  }
  return bridges;
}
export function planMoatLandscape(){
  const trees=[],shrubs=[],furniture=[],bridges=planMoatBridges();
  for(const line of moatSegments){
    const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
    for(let t=6;t<line.length;t+=13){
      const cx=line.start[0]+dx*t,cz=line.start[1]+dz*t;
      for(const side of [-1,1]){
        const offset=side*(line.width/2+(side===1?8:4.8));
        const x=cx-dz*offset,z=cz+dx*offset;
        if(!moatPlantClear(x,z,2.5)||bridges.some(b=>Math.hypot(x-b.x,z-b.z)<b.width/2+8)||trees.some(p=>Math.hypot(p.x-x,p.z-z)<9))continue;
        const variation=(Math.round(x*7+z*11)>>>0)%7;
        trees.push({x,z,height:5.8+variation*.28,crown:3.7+variation*.12,base:.08,reach:line.reach});
        const bx=x+dx*4,bz=z+dz*4;
        if(moatPlantClear(bx,bz,1.1))shrubs.push({x:bx,z:bz,width:2.2,height:.6+variation*.03});
      }
      if(Math.floor(t/13)%4===1){
        const offset=line.width/2+6.1,x=cx-dz*offset,z=cz+dx*offset;
        if(moatPlantClear(x,z,1.5)&&!bridges.some(b=>Math.hypot(x-b.x,z-b.z)<b.width/2+8)&&!furniture.some(p=>Math.hypot(x-p.x,z-p.z)<27))furniture.push({x,z,angle:-Math.atan2(dz,dx),dx,dz});
      }
    }
  }
  return {trees,shrubs,furniture,bridges};
}
export const moatStops=[
  {name:'南门外围 · 护城河与绿化',keywords:'南门 迎薰门 护城河 城门桥 绿化',eye:[-111,8,732],target:[-75,5,655]},
  {name:'北门外围 · 护城河与绿化',keywords:'北门 拱极门 护城河 桥 绿化',eye:[-527,7,-747],target:[-549,5,-670]},
  {name:'下西门外围 · 河岸步道',keywords:'西门 下西门 凤仪门 护城河 绿化',eye:[-1245,7,121],target:[-1180,4,65]},
  {name:'上西门外围 · 护城河与绿化',keywords:'西门 上西门 永定门 护城河',eye:[-1150,7,849],target:[-1080,5,819]},
  {name:'下东门外围 · 河岸绿带',keywords:'东门 下东门 亲翰门 护城河 绿化',eye:[418,7,-178],target:[350,5,-220]},
  {name:'上东门外围 · 护城河与绿化',keywords:'东门 上东门 泰和门 太和门 护城河',eye:[535,7,445],target:[467,5,400]},
].map(p=>({...p,address:'城墙外围河岸与绿带 · 沿地图和卫星图近似细化'}));
