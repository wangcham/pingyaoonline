import {landmarkSurvey} from './survey.js';
import {geographicToLocal, localToGeographic} from './coordinates.js';
import {pointInRing, segments, projectOnSegment} from '../geography.js';

export function surveyFrame(key) {
  const ring=landmarkSurvey[key].ring.map(p=>geographicToLocal(p));
  const center=ring.reduce((a,p)=>[a[0]+p[0]/ring.length,a[1]+p[1]/ring.length],[0,0]);
  return {ring,center};
}
const towerFrame=surveyFrame('tower'), rscFrame=surveyFrame('rishengchang'), templeFrame=surveyFrame('temple');
// The temple's chamfered south-east corner makes a vertex average biased south.
// Use the oriented bounds center to keep the reconstructed axis inside the mapped site.
const templeAxes=templeFrame.ring.map(([x,z])=>[x*Math.cos(.188)-z*Math.sin(.188),x*Math.sin(.188)+z*Math.cos(.188)]);
const templeMid=[0,1].map(i=>(Math.min(...templeAxes.map(p=>p[i]))+Math.max(...templeAxes.map(p=>p[i])))/2);
templeFrame.center=[templeMid[0]*Math.cos(.188)+templeMid[1]*Math.sin(.188),-templeMid[0]*Math.sin(.188)+templeMid[1]*Math.cos(.188)];
// County envelope is an explicitly inferred 112 × 205 m parcel; hall and POI remain fixed.
const yamenAnchor=geographicToLocal(landmarkSurvey.yamenPOI.coordinate);
const yamenCenter=[yamenAnchor[0]-7,yamenAnchor[1]-29];
export function orientedParcel(center,width,depth,rotation) {
  return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([x,z])=>[
    center[0]+x*Math.cos(rotation)+z*Math.sin(rotation),center[1]-x*Math.sin(rotation)+z*Math.cos(rotation)]);
}
const heritageReference='https://chiculture.org.hk/sc/china-five-thousand-years/3460';
export const landmarkRecords=[
  {id:'wall',name:'平遥古城墙',coordinate:localToGeographic([-71.5,622.7]),rotation:0,height:30,
    description:'沿现有 OSM 不规则城墙走向建模，保留南墙曲折、六座城门及瓮城关系。城台、城楼、垛口和角楼为近似复原。',
    accuracy:'城墙走向：OSM；墙体截面、门洞、角楼：近似',sources:['https://www.openstreetmap.org/way/87994740','https://www.openstreetmap.org/way/1213225809','https://www.openstreetmap.org/way/1213225807'],view:[-260,660,1530]},
  {id:'tower',name:'市楼（金井楼）',coordinate:localToGeographic(towerFrame.center),rotation:.205,height:18.5,ring:towerFrame.ring,
    description:'南大街上的过街楼，保留南北通道、三重檐、木柱与黄绿琉璃屋面。整体高度参考公开资料约 18.5 米，细部为近似复原。',
    accuracy:'位置与基底：OSM 建筑轮廓；屋顶、斗拱：近似',sources:[landmarkSurvey.tower.osm,heritageReference],view:[35,26,62]},
  {id:'rishengchang',name:'日昇昌票号',coordinate:localToGeographic(rscFrame.center),rotation:.164,height:12,ring:rscFrame.ring,
    description:'西大街南侧的晋商票号旧址。主院坐南朝北，采用三进院落，配以临街铺面、柜房、中厅、后厅和侧院。',
    accuracy:'地块：OSM 文保边界；内部布局、尺寸与立面：近似',sources:[landmarkSurvey.rishengchang.osm,'https://chiculture.org.hk/en/node/3463','https://bkso.baidu.com/item/日昇昌旧址/12766253'],view:[-8,50,-92]},
  {id:'yamen',name:'平遥县衙',coordinate:localToGeographic(yamenCenter),rotation:.17,height:17,ring:orientedParcel(yamenCenter,112,205,.17),
    description:'衙门街北侧的县衙建筑群，沿中轴表现大门、仪门、亲民堂、二堂、内宅和大仙楼，并配置两侧公廨院落。亲民堂使用 OSM 独立轮廓定位。',
    accuracy:'POI 与亲民堂等四处建筑：OSM；总边界及其余院落：推定',sources:[landmarkSurvey.yamenPOI.osm,landmarkSurvey.yamenHall.osm,'https://bkso.baidu.com/item/平遥县衙博物馆/4023172'],view:[100,160,235]},
  {id:'temple',name:'平遥文庙',coordinate:localToGeographic(templeFrame.center),rotation:.188,height:17,ring:templeFrame.ring,
    description:'古城东南部的文庙，以棂星门、泮池、大成门、五开间大成殿及后部院落表现南北中轴。大成殿采用单檐歇山屋面和深出檐。',
    accuracy:'地块：OSM 文保边界；殿宇位置、屋面及院落间距：近似',sources:[landmarkSurvey.temple.osm,'https://zh.wikipedia.org/wiki/平遥文庙',heritageReference],view:[85,150,240]},
].map(record=>({...record,crs:'WGS84',scale:1,approximate:true,position:geographicToLocal(record.coordinate)}));

export function isLandmarkParcel(x,z,radius=0) {
  return landmarkRecords.some(({ring})=>ring && (pointInRing(x,z,ring)||segments([...ring,ring[0]]).some(edge=>projectOnSegment([x,z],edge).distance<radius+1.5)));
}
