import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {pointInRing,segments,projectOnSegment,createRingQuery} from './geography.js';
import {civicSiteSurveys} from './civic-sites-data.js';
import {xinhuaBookstoreSurvey,tiansenLifeStops} from './tiansen-life-data.js';

// Visual traces, NOT cadastral footprints. Amap imagery viewed 2026-11-26.
// Tiansen is registered to the OSM roundabout, not the indoor-parking POI.
// Screen coordinates below are deliberately retained to make the interpretation auditable.
const tiansenImageOrigin=[1029,488],tiansenMapOrigin=[-1440,870],siteImageMetres=50/77;
export function tiansenImagePoint(u,v){return [tiansenMapOrigin[0]+(u-tiansenImageOrigin[0])*siteImageMetres,tiansenMapOrigin[1]+(v-tiansenImageOrigin[1])*siteImageMetres];}
const thirdSchoolPoi=geographicToLocal([112.165337,37.188991],'GCJ-02');
export function thirdSchoolImagePoint(u,v){return [thirdSchoolPoi[0]+(u-903)*siteImageMetres,thirdSchoolPoi[1]+(v-366)*siteImageMetres];}
export function siteToWorld(site,u,v){const c=Math.cos(site.angle),s=Math.sin(site.angle);return [site.origin[0]+u*c+v*s,site.origin[1]-u*s+v*c];}
export function worldToSite(site,x,z){const c=Math.cos(site.angle),s=Math.sin(site.angle),dx=x-site.origin[0],dz=z-site.origin[1];return [dx*c-dz*s,dx*s+dz*c];}
function siteTrace(point,points){return points.map(p=>point(...p));}
export const tiansenSurvey={
  id:'tiansen',name:'田森汇',origin:tiansenImagePoint(900,351),angle:.078,
  boundary:siteTrace(tiansenImagePoint,[[803,224],[971,211],[984,486],[825,507]]),
  // Immediately adjacent residential rows and alleys, not a county-wide fill.
  contextBoundary:siteTrace(tiansenImagePoint,[[490,201],[975,192],[991,484],[500,547]]),
  source:'https://www.amap.com/place/B0FFGA5I8Y',checked:'2026-11-26',imageryDate:null,
  accuracy:'位置按高德卫星图与 OSM 转盘配准，位于顺城路西侧、转盘西北。轮廓和周边住宅为人工判读，约有 10–20 米定位误差；层高、立面分格、停车位和铺装细部近似。',
};
export const thirdSchoolSurvey={
  id:'pingyao-third-school',name:'平遥三中',origin:thirdSchoolPoi,angle:.145,
  coordinate:[112.165337,37.188991],crs:'GCJ-02',
  gateCoordinate:[112.165798,37.188222],gateCrs:'GCJ-02',
  boundary:siteTrace(thirdSchoolImagePoint,[[800,228],[918,190],[924,209],[961,205],[1006,506],[842,526]]),
  source:'https://www.amap.com/place/B01620NIOB',gateSource:'https://www.amap.com/place/B0FFG4FWPG',
  checked:'2026-11-26',imageryDate:null,
  accuracy:'校址和东南门采用高德 GCJ-02 点位统一转换；边界、楼群、北部运动场按卫星图判读，约有 10–20 米轮廓误差。浅黄墙与砖红竖线参考校园照片；楼高、用途划分、门窗和铺装近似。相册中误收的平遥中学校门照片未采用。',
};
thirdSchoolSurvey.contextBoundary=thirdSchoolSurvey.boundary;
export const westSiteSurveys=[tiansenSurvey,thirdSchoolSurvey,...civicSiteSurveys];
// Open roadside strips checked against Amap satellite on 2026-11-27. They are
// pedestrian/two-wheeler space, not parcels for generated isolated houses.
export const tiansenStreetAprons=[
 [[-1483,699],[-1468,697],[-1446,850],[-1472,859]],
 [[-1444,670],[-1425,668],[-1399,836],[-1420,840]],
];
export const westSiteProtectedRings=[...westSiteSurveys.map(s=>s.contextBoundary),...tiansenStreetAprons,xinhuaBookstoreSurvey.contextBoundary];
const westSiteEdges=westSiteProtectedRings.map(r=>segments([...r,r[0]]));
const westSiteQueries=westSiteProtectedRings.map(createRingQuery);
export function isWestSiteParcel(x,z,radius=0){return westSiteQueries.some(q=>q.contains(x,z,radius+1,true));}
export function westSiteIntersectsRing(ring){
  if(ring.some(p=>isWestSiteParcel(...p)))return true;
  if(westSiteProtectedRings.some(site=>site.some(p=>pointInRing(...p,ring))))return true;
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  return segments([...ring,ring[0]]).some(({start:a,end:b})=>westSiteEdges.flat().some(({start:c,end:d})=>
    cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0));
}
function siteImageBuilding(site,point,[id,u,v,w,d,levels,type='public',color='#d2bc82']){
  const [x,z]=point(u,v),[lx,lz]=worldToSite(site,x,z);
  return {id,u:lx,v:lz,w:w*siteImageMetres,d:d*siteImageMetres,levels,type,color,
    coordinate:localToGeographic([x,z]),crs:'WGS84',footprintEstimated:true,footprintSource:site.source};
}
export const tiansenBuildings=[
  ['main',895,329,132,160,4,'commercial','#b7aa8b'],
  ['link',906,410,129,17,3,'commercial','#b7aa8b'],
  // Southern edge reduced by 3 m along the local depth to clear Shangxiguan.
  // Northern edge remains attached to the connector; no whole-site translation.
  ['south',910.82,446.7,127,61.38,3,'commercial','#b9ac91'],
].map(row=>siteImageBuilding(tiansenSurvey,tiansenImagePoint,row));
export const tiansenNeighbours=[
  ['west-north',626,242,77,25,2,'residential','#c2b7a3'],
  ['west-1',619,286,91,25,5,'residential','#b6b6a9'],
  ['west-2',742,284,101,23,5,'residential','#b5b5a6'],
  ['west-3',609,340,102,28,5,'residential','#b6b6a9'],
  ['west-4',743,333,114,28,5,'residential','#b5b5a6'],
  ['west-5',535,343,42,28,4,'residential','#bdb5a0'],
  ['west-6',743,405,127,29,5,'residential','#b5b5a6'],
  ['west-7',570,414,135,31,4,'residential','#c5b49e'],
  ['west-shops',637,492,266,22,1,'commercial','#b6afa0'],
].map(row=>siteImageBuilding(tiansenSurvey,tiansenImagePoint,row));
export const thirdSchoolBuildings=[
  ['north',905,298,118,30,4],
  ['west',857,371,43,85,4],
  ['east',964,361,28,70,4],
  ['middle',918,347,65,24,3],
  ['south',900,435,127,39,4],
  ['southeast',969,428,40,35,2],
  ['east-link',944,393,22,61,3],
  ['northwest-annex',826,310,24,36,1,'public','#c4c5b6'],
  ['west-annex',828,351,12,26,1,'public','#c4c5b6'],
].map(row=>siteImageBuilding(thirdSchoolSurvey,thirdSchoolImagePoint,row));
const thirdSchoolGateWorld=geographicToLocal(thirdSchoolSurvey.gateCoordinate,'GCJ-02');
export const thirdSchoolGate=worldToSite(thirdSchoolSurvey,...thirdSchoolGateWorld);
function siteStop(name,keywords,address,eye,target){return {name,keywords,address,eye,target};}
export const westSiteStops=[
  siteStop('田森汇 · 顺城路立面','田森 玺悦汇 漫乐城 商场 城市生活公园 快乐购 快乐购超市 B1 负一层','顺城路西侧、上西关街转盘西北侧',[-1433,7,792],[-1493,9,779]),
  siteStop('田森汇 · 街区全景','田森 周边 鹿泉花园 永安小区 南门 停车场','商场及西侧相邻住宅，按卫星图近似描绘',[-1388,195,1010],[-1585,0,778]),
  siteStop('平遥三中 · 东南门','平遥县第三中学校 三中 校门 学校 曙光西街177号','曙光西街177号 · 东南门',
    [thirdSchoolGateWorld[0]+4,2.7,thirdSchoolGateWorld[1]+23],[thirdSchoolGateWorld[0],4.2,thirdSchoolGateWorld[1]]),
  siteStop('平遥三中 · 校园全景','三中 校园 操场 运动场 教学楼','北部运动场、南部楼群，内部布局与高度近似',
    [thirdSchoolPoi[0]+125,190,thirdSchoolPoi[1]+225],[thirdSchoolPoi[0],0,thirdSchoolPoi[1]-15]),
  ...tiansenLifeStops,
];
export const westSiteRecords=[tiansenSurvey,thirdSchoolSurvey].map((s,i)=>{
  const position=i?thirdSchoolGateWorld:s.origin,eye=westSiteStops[i*2].eye;
  return {id:s.id,name:s.name,position,coordinate:localToGeographic(position),crs:'WGS84',scale:1,height:i?6:18,
    view:[eye[0]-position[0],eye[1],eye[2]-position[1]],approximate:true,accuracy:s.accuracy,
    description:i?'平遥县第三中学校，位于曙光西街177号。校园东南侧临街入口，北部运动场，内部楼群和庭院按卫星图判读。':'顺城路西侧的商业综合体，高德现标注为田森·玺悦汇（平遥店），出入口也标注漫乐城。模型表现东侧沿街立面、南入口和西侧相邻住宅。',
    sources:[s.source,...(s.gateSource?[s.gateSource]:['https://www.openstreetmap.org/'])]};
});
