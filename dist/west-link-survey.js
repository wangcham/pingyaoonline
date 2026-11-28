import {schoolSiteIntersects} from './school-sites-data.js';
import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {pointInRing,segments,projectOnSegment,createRingQuery,makeGrid} from './geography.js';
import {mapData} from './map-data.js';
import {westSiteIntersectsRing} from './west-sites-data.js';
import {isWestDistrictParcel} from './west-district.js';
import {subtractQixiangBlock,qixiangStops} from './qixiang-block-data.js';
import {clearancePolygonsOverlap} from './road-clearance.js';

// Amap's documented /ssr/embed/view, 1280 × 720 CSS px, north-up zoom 17.
// Only hand-interpreted vectors are stored. No imagery or API credentials.
// Registration references: physical roundabout (north/middle), Yong'an × Liugen
// road centre (south), small southern park circle (gate). Errors remain possible.
export const westLinkFrames={
  north:{center:[112.16718590763058,37.19880200134825],shift:[0,8]},
  middle:{center:[112.16662292194026,37.1947582499323],shift:[2.26,11.61]},
  south:{center:[112.16639742187213,37.19053409620401],shift:[-1.23,.82]},
  gate:{center:[112.18721028522057,37.19723656004611],shift:[2.16,6.9]},
  smallSouth:{center:[112.1775,37.1957],shift:[-.21,-1.52]},
};
export function westLinkImagePoint(frame,u,v){
  const {center:[lon,lat],shift}=westLinkFrames[frame],size=256*2**17;
  const cy=(1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2;
  const p=geographicToLocal([lon+(u-640)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-360)/size))))*180/Math.PI],'GCJ-02');
  return [p[0]+shift[0],p[1]+shift[1]];
}
export const westLinkSurvey={checked:'2026-11-26',imageryDate:null,crs:'WGS84',
  sources:Object.entries(westLinkFrames).map(([id,{center:[lng,lat]}])=>({id,url:`https://www.amap.com/ssr/embed/view?lng=${lng}&lat=${lat}&zoom=17&maptype=satellite&platform=pc`})),
  attribution:'卫星图人工判读：高德 / DigitalGlobe & SpaceView；道路辅助：© OpenStreetMap contributors (ODbL)',
  accuracy:'屋顶、连排楼体、巷道和开敞地按卫星图手工描绘，并对照 OSM 道路配准。逐户分界、用途、层高、立面、单株树位及铺装均为近似，不能视为实测或当前影像。',
};
// Between the two schools, east to the west pavement of Shuncheng Road.
// Existing campuses, malls, traced blocks and roads take precedence.
export const westLinkBoundary=[[-2455,480],[-1507,480],[-1459,858],[-1420,895],[-1328,1760],[-1820,1856],[-2285,1928],[-2455,1675]];
const westLinkBoundaryQuery=createRingQuery(westLinkBoundary);
export function isWestLinkStudy(x,z,radius=0){return westLinkBoundaryQuery.contains(x,z,radius);}
// [image centre x,y, roof width,depth, estimated floors, roof class, spatial type]
// Each entry corresponds to a visible roof or connected roof row. There is no
// random parcel fill; small roof-row divisions are not claimed as surveyed houses.
const northLinkRoofs=[
  [187,215,78,12,2],[194,239,80,12,1],[198,263,78,12,2],[204,289,80,13,1],[212,314,81,13,2],[218,340,83,12,1],
  [292,207,81,12,1],[298,232,83,12,2],[302,258,80,12,1],[306,284,78,13,2],[312,308,82,13,1],[318,331,83,12,2],
  [390,213,65,13,2],[396,241,68,12,1],[398,267,68,12,2],[405,293,66,12,1],[410,318,67,13,2],
  [198,385,90,14,1],[202,409,89,13,2],[210,435,92,14,1],
  [294,375,83,13,2],[300,398,84,12,1],[304,422,87,12,2],
  [388,358,72,12,2],[394,382,73,12,1],[400,408,74,12,2],
  [115,500,116,13,1],[119,524,116,13,2],[122,548,118,13,1],[127,571,117,13,2],[131,595,118,13,1],[138,619,113,13,2],[145,644,108,13,1],[150,666,111,13,1],
  [237,489,74,13,2],[241,513,76,13,1],[245,538,75,13,2],[249,563,77,13,1],[255,589,78,13,2],[261,613,80,13,1],[268,638,80,13,2],[273,661,79,13,1],
  [354,457,88,13,2],[358,483,88,13,2],[364,510,89,14,2],[368,535,88,13,1],[373,562,89,13,2],[378,587,88,13,2],[388,618,75,13,1],
  [447,532,36,15,4,0,'residential'],[451,564,38,15,4,0,'residential'],[454,593,40,15,4,0,'residential'],
  [520,273,60,22,1,1,'shed'],[526,308,62,17,1,1,'shed'],[527,342,61,24,1,2,'commercial'],
  [611,254,91,18,1,1,'shed'],[619,292,85,17,1,1,'shed'],[625,333,76,26,1,1,'shed'],
  [707,266,70,29,2,1,'shed'],[704,321,48,20,1,1,'shed'],[766,335,48,31,1,0,'shed'],
  [845,242,67,15,2],[850,267,71,15,2],[855,297,73,15,1],[854,327,74,16,2],
  [938,282,31,39,2,1,'commercial'],[920,354,75,18,1],
];
const middleLinkRoofs=[
  [45,281,82,18,4,0,'residential'],[53,330,86,18,4,0,'residential'],
  [202,267,82,13,2],[207,292,83,13,1],[211,317,86,13,2],[219,344,85,13,1],[223,371,87,13,2],[226,396,87,13,2],[233,423,84,15,2],
  [320,252,99,13,2],[325,276,102,13,1],[329,300,102,13,2],[334,325,101,13,2],[337,350,101,13,1],[343,374,100,13,2],[348,399,100,13,2],[352,423,100,13,1],[356,447,96,13,2],
  [433,234,80,13,2],[437,258,80,13,1],[442,281,82,13,2],[452,325,87,13,2],[457,350,87,13,1],[461,376,84,13,2],[465,399,82,13,2],[471,423,82,13,1],
  [532,220,80,14,2],[536,246,78,13,1],[540,271,78,13,2],[541,310,77,13,2],[544,336,78,13,1],[548,360,77,13,2],[551,385,79,13,2],[558,411,78,13,1],
  [654,184,75,19,1,2,'commercial'],[659,212,76,13,2],[663,238,75,13,1],[667,264,76,13,2],
  [639,303,70,13,2],[642,326,71,13,1],[646,352,70,13,2],[650,376,72,13,1],[654,402,74,13,2],[660,427,72,13,2],[664,451,74,13,1],[669,476,72,13,2],
  [747,183,51,15,2],[751,209,52,15,1],[755,234,54,14,2],[757,281,65,13,2],[762,306,65,13,1],[766,331,67,13,2],[770,357,66,13,2],[776,382,67,13,1],
  [846,278,96,15,2],[852,308,96,16,2],[860,342,96,16,2],
  [835,181,65,20,6,0,'residential'],[909,174,64,20,6,0,'residential'],[991,162,78,20,6,0,'residential'],
  [838,217,65,20,6,0,'residential'],[911,210,64,20,6,0,'residential'],[995,200,76,20,6,0,'residential'],
  [1005,236,77,20,6,0,'residential'],[1008,277,80,20,6,0,'residential'],
  [920,331,62,20,6,0,'residential'],[923,368,64,20,6,0,'residential'],
  [1026,326,81,20,6,0,'residential'],[1031,367,82,20,6,0,'residential'],[1038,405,87,20,6,0,'residential'],
  [852,382,64,17,5,0,'residential'],[864,420,68,17,5,0,'residential'],[876,456,67,17,5,0,'residential'],[950,445,67,17,5,0,'residential'],[1022,435,66,17,5,0,'residential'],
  [1082,190,44,18,3,0,'commercial'],[1086,220,43,18,3,0,'commercial'],[1094,274,40,18,3,0,'commercial'],
  [1086,312,33,18,2],[1093,350,35,18,3],[1104,394,32,18,3],
  [678,507,77,18,4,0,'residential'],[685,546,76,18,4,0,'residential'],[730,490,70,17,2,2],[735,522,67,16,2,2],
  [99,535,114,25,3,1,'public'],[174,556,30,86,4,0,'public'],[250,606,102,20,4,0,'public'],[381,581,24,70,4,0,'public'],
  [481,459,154,22,4,0,'public'],[571,501,25,62,4,0,'public'],[477,552,100,20,4,0,'public'],[486,590,95,17,2,0,'public'],
];
const southLinkRoofs=[
  [741,118,68,18,1,1,'shed'],[748,150,72,18,1,1,'shed'],[758,185,71,18,1,1,'shed'],
  [833,101,79,20,1,1,'shed'],[840,135,79,20,1,1,'shed'],[849,169,79,20,1,1,'shed'],[857,202,77,18,1,1,'shed'],
  [922,83,73,20,1,1,'shed'],[930,117,72,20,1,1,'shed'],[940,151,72,20,1,1,'shed'],[869,233,190,20,1,1,'shed'],
  [726,200,24,77,2,0,'commercial'],[1120,161,112,31,2,1,'public'],
  [753,334,64,23,6,0,'residential'],[770,416,68,22,6,0,'residential'],
  [840,317,58,18,6,0,'residential'],[846,348,57,18,6,0,'residential'],[852,379,57,18,6,0,'residential'],[858,411,58,18,6,0,'residential'],[865,443,59,18,6,0,'residential'],
  [903,287,52,18,6,0,'residential'],[910,319,54,18,6,0,'residential'],[916,350,53,18,6,0,'residential'],[921,381,55,18,6,0,'residential'],[927,414,53,18,6,0,'residential'],
  [970,251,58,18,6,0,'residential'],[979,285,57,18,6,0,'residential'],[987,319,58,18,6,0,'residential'],[994,355,58,18,6,0,'residential'],[1001,389,58,18,6,0,'residential'],[1008,426,58,18,6,0,'residential'],
  [1040,232,55,18,6,0,'residential'],[1048,267,57,18,6,0,'residential'],[1054,303,56,18,6,0,'residential'],[1062,339,56,18,6,0,'residential'],[1069,377,57,18,6,0,'residential'],[1076,414,56,18,6,0,'residential'],
  [1121,290,72,15,2],[1127,315,72,14,1],[1133,342,73,15,2],[1140,366,74,14,2],[1145,394,75,14,1],[1150,420,77,14,2],
  [779,467,65,18,6,0,'residential'],[785,501,65,18,6,0,'residential'],[793,537,66,18,6,0,'residential'],[804,575,68,19,6,0,'residential'],
  [861,482,57,18,6,0,'residential'],[868,515,57,18,6,0,'residential'],[874,550,58,18,6,0,'residential'],[883,584,58,18,6,0,'residential'],
  [931,464,52,18,6,0,'residential'],[938,498,52,18,6,0,'residential'],[945,533,52,18,6,0,'residential'],
  [1002,464,56,18,6,0,'residential'],[1009,498,57,18,6,0,'residential'],[1015,531,57,18,6,0,'residential'],[1022,566,58,18,6,0,'residential'],
  [1090,454,67,14,2],[1095,479,67,14,1],[1100,506,68,14,2],[1106,533,68,14,2],[1112,558,68,14,1],
  [1165,460,67,15,2],[1170,486,68,15,2],[1175,513,68,15,3],
  [625,405,65,23,10,0,'residential'],[633,450,65,23,10,2,'residential'],[642,530,65,23,12,0,'residential'],[653,586,66,23,12,0,'residential'],
  [324,493,105,19,3,0,'public'],[286,554,25,80,3,0,'public'],[333,615,90,18,3,0,'public'],[420,510,78,22,1,1,'shed'],[452,618,76,24,2,1,'public'],
  [65,540,83,20,10,0,'residential'],[80,595,82,20,10,0,'residential'],[100,651,88,20,10,0,'residential'],
];
const linkRoofColors=['#6e746a','#52718c','#93665b'];
export const westLinkRoofs=[...Object.entries({north:northLinkRoofs,middle:middleLinkRoofs,south:southLinkRoofs}).flatMap(([frame,rows])=>rows.map(([u,v,w,d,levels,roof=0,kind='lowrise'],index)=>{
  const [x,z]=westLinkImagePoint(frame,u,v),px=westLinkImagePoint(frame,u+w/2,v),pz=westLinkImagePoint(frame,u,v+d/2);
  return {id:`link-${frame}-${index}`,x,z,w:2*Math.hypot(px[0]-x,px[1]-z),d:2*Math.hypot(pz[0]-x,pz[1]-z),angle:.15,
    levels,kind,roofColor:linkRoofColors[roof],frame,coordinate:localToGeographic([x,z]),crs:'WGS84',estimated:true,footprintEstimated:true,
    footprintSource:westLinkSurvey.sources.find(s=>s.id===frame).url};
}))];
export function linkRoofRing(p,pad=0){const c=Math.cos(p.angle),s=Math.sin(p.angle);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const u=a*(p.w/2+pad),v=b*(p.d/2+pad);return [p.x+u*c+v*s,p.z-u*s+v*c];});}
export function westLinkRingsIntersect(a,b){
  return clearancePolygonsOverlap(a,b);
}
function linkPolygon(frame,pixels){return pixels.map(p=>westLinkImagePoint(frame,...p));}
export const westLinkOpenGround=[
  {id:'third-north-fields',kind:'field',color:'#8c8b6b',ring:linkPolygon('south',[[28,211],[637,112],[676,311],[375,426],[173,465]])},
  {id:'third-west-vacant',kind:'soil',color:'#ae9b7d',ring:linkPolygon('south',[[410,535],[472,524],[489,594],[423,606]])},
  {id:'middle-north-sports',kind:'sports',color:'#6c846d',ring:linkPolygon('middle',[[38,461],[145,411],[188,476],[93,521]])},
  {id:'middle-south-sports',kind:'sports',color:'#678268',ring:linkPolygon('middle',[[222,514],[343,489],[360,561],[236,583]])},
  {id:'middle-school-yard',kind:'paving',color:'#b4ad98',ring:linkPolygon('middle',[[410,493],[553,477],[563,532],[433,543]])},
  {id:'southwest-court',kind:'sports',color:'#6f8576',ring:linkPolygon('south',[[306,525],[348,518],[358,569],[316,577]])},
  {id:'liugen-east-green',kind:'green',color:'#74815d',ring:linkPolygon('middle',[[787,482],[1111,431],[1122,488],[802,547]])},
  {id:'market-east-green',kind:'green',color:'#75805e',ring:linkPolygon('south',[[1023,57],[1172,32],[1185,94],[1050,142]])},
];
// Secondary lanes visible behind frontages; main streets retain OSM alignment.
export const westLinkAlleys=[
  ['north',[[169,209],[219,675]],3.6],['north',[[266,208],[305,663]],3.2],['north',[[343,199],[413,637]],3.4],
  ['north',[[141,365],[443,326]],4.2],['north',[[156,455],[459,413]],4],['north',[[219,552],[480,511]],3.4],
  ['north',[[545,236],[556,389]],4.6],['north',[[600,215],[618,385]],4],['north',[[791,194],[815,386]],4],
  ['middle',[[373,202],[418,458]],3.2],['middle',[[477,195],[520,434]],3.4],['middle',[[169,336],[590,275]],3.2],
  ['middle',[[219,435],[576,378]],3],['middle',[[714,160],[767,548]],4],['middle',[[613,286],[962,243]],4.5],
  ['middle',[[813,395],[830,432],[1087,391]],3.6],['middle',[[894,309],[917,447]],4],['middle',[[963,255],[994,434]],4],
  ['south',[[789,80],[817,226]],4.5],['south',[[871,66],[900,192]],4.5],['south',[[957,52],[982,155]],4.5],
  ['south',[[796,297],[838,601]],4],['south',[[868,270],[916,583]],4],['south',[[936,247],[982,568]],4],
  ['south',[[1012,220],[1066,555]],4],['south',[[1090,256],[1141,544]],3.5],['south',[[757,449],[1186,385]],4.5],
  ['south',[[774,558],[1180,493]],4],
].map(([frame,pixels,width])=>({points:linkPolygon(frame,pixels),width,estimated:true}));
const westLinkRoadEdges=mapData.roads.flatMap(([type,width,name,points])=>segments(points).map(line=>{
  const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length,pad=width/2+1.7;
  const ring=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([along,side])=>{
    const p=along<0?line.start:line.end;return [p[0]-dz*side*pad,p[1]+dx*side*pad];
  });return {line,width,type,name,ring};
}));
const westLinkRoadGrid=makeGrid(80);
for(const item of westLinkRoadEdges){const {line,width}=item,pad=width/2+41;westLinkRoadGrid.add(item,Math.min(line.start[0],line.end[0])-pad,Math.min(line.start[1],line.end[1])-pad,Math.max(line.start[0],line.end[0])+pad,Math.max(line.start[1],line.end[1])+pad);}
export function westLinkRoadClear(x,z,radius=0){return !(radius<=40?westLinkRoadGrid.at(x,z):westLinkRoadEdges).some(({line,width})=>projectOnSegment([x,z],line).distance<width/2+radius+1);}
function linkRoadPieces(p){return splitSurveyRoof(p,westLinkRoadEdges);}
const surveyRoadBounds=new WeakMap();
export function splitSurveyRoof(p,edges){
  // Roof rows are connected homes, not indivisible surveyed buildings. Where
  // image interpretation meets a mapped lane, retain the roofs on either side
  // instead of moving the lane or deleting the entire row.
  if(!['lowrise','shed'].includes(p.kind))return [p];
  const original=linkRoofRing(p),xs=original.map(v=>v[0]),zs=original.map(v=>v[1]),bounds=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
  let pieces=[p];
  for(const edge of edges){
    let edgeBounds=surveyRoadBounds.get(edge);
    if(!edgeBounds){const xs=edge.ring.map(v=>v[0]),zs=edge.ring.map(v=>v[1]);edgeBounds=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];surveyRoadBounds.set(edge,edgeBounds);}
    if(edgeBounds[2]<bounds[0]||edgeBounds[0]>bounds[2]||edgeBounds[3]<bounds[1]||edgeBounds[1]>bounds[3])continue;
    pieces=pieces.flatMap(q=>{
      const ring=linkRoofRing(q);if(!westLinkRingsIntersect(ring,edge.ring))return [q];
      const c=Math.cos(q.angle),s=Math.sin(q.angle),local=([x,z])=>[(x-q.x)*c-(z-q.z)*s,(x-q.x)*s+(z-q.z)*c];
      const a=local(edge.line.start),b=local(edge.line.end),delta=b.map((v,i)=>v-a[i]);
      const cut=Math.abs(delta[0])>Math.abs(delta[1])?1:0,other=1-cut,half=[q.w/2,q.d/2],pad=edge.width/2+2.1;
      let lo=0,hi=1;
      if(Math.abs(delta[other])>.0001){const ts=[(-half[other]-pad-a[other])/delta[other],(half[other]+pad-a[other])/delta[other]];lo=Math.max(lo,Math.min(...ts));hi=Math.min(hi,Math.max(...ts));}
      if(lo>hi)return [q];
      const cuts=[a[cut]+delta[cut]*lo,a[cut]+delta[cut]*hi],low=Math.min(...cuts)-pad,high=Math.max(...cuts)+pad;
      return [[-half[cut],Math.max(-half[cut],low)],[Math.min(half[cut],high),half[cut]]].flatMap(([l,r],i)=>{
        if(r-l<(cut===0?8:6))return [];
        const u=cut===0?(l+r)/2:0,v=cut===1?(l+r)/2:0,x=q.x+u*c+v*s,z=q.z-u*s+v*c;
        return [{...q,id:q.id+`-part${i}`,x,z,w:cut===0?r-l:q.w,d:cut===1?r-l:q.d,coordinate:localToGeographic([x,z]),roadTrimmed:true}];
      });
    });
    if(!pieces.length)break;
  }
  return pieces;
}
let westLinkLayoutCache;
export function createWestLinkLayout(){
  if(westLinkLayoutCache)return westLinkLayoutCache;
  const accepted=[],omitted=[];
  for(const p of westLinkRoofs){
    // Each frame has a nonoverlapping strip of authority; do not double roofs.
    if(p.frame==='north'&&(p.z<480||p.z>=910)||p.frame==='middle'&&(p.z<910||p.z>=1400)||p.frame==='south'&&p.z<1400&&p.kind!=='shed')continue;
    const parts=linkRoadPieces(p).flatMap(subtractQixiangBlock);if(!parts.length)omitted.push(p.id);
    for(const piece of parts){
    const p=piece,ring=linkRoofRing(p),samples=[...ring,[p.x,p.z]];
    if(!samples.every(([x,z])=>isWestLinkStudy(x,z)&&x>mapData.bounds[0]+4)||schoolSiteIntersects(ring)||westSiteIntersectsRing(ring)||isWestDistrictParcel(p.x,p.z)||
      westLinkOpenGround.some(g=>westLinkRingsIntersect(ring,g.ring))||
      !samples.every(([x,z])=>westLinkRoadClear(x,z,.7))||westLinkRoadEdges.some(e=>westLinkRingsIntersect(ring,e.ring))){omitted.push(p.id);continue;}
    // Shared rows are separate from each other, even across frame boundaries.
    if(accepted.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(p.w,p.d)/2+Math.hypot(q.w,q.d)/2&&
      westLinkRingsIntersect(q.ring,ring))){omitted.push(p.id);continue;}
    accepted.push({...p,ring});
    }
  }
  westLinkLayoutCache={roofs:accepted,omitted};return westLinkLayoutCache;
}
export const westLinkStops=[
  ...qixiangStops,
  {name:'二中至三中 · 街坊全景',keywords:'二中 三中 永安北路 内部 街坊 卫星',address:'永安北路、上西关街、柳根街、曙光西街之间 · 影像判读近似',eye:[-2100,390,1700],target:[-1880,0,1030]},
  {name:'永安北路 · 内部街巷',keywords:'二中 三中 永安 路 后街',address:'上西关街以南，沿实际道路连接住宅与低层街坊',eye:[-1921,2.3,1230],target:[-1939,3,1125]},
  {name:'柳根街 · 南侧街区',keywords:'柳根 三中 曙光 农田 市场',address:'保留影像中的农田、市场长屋顶与住宅区',eye:[-2010,130,1460],target:[-1760,0,1510]},
  {name:'迎薰门 · 绿化步道',keywords:'南门 迎熏门 迎薰门 公园 绿化 树木',address:'迎薰门外公园，保留园路、水池与广场',eye:[-52,3,760],target:[-70,15,625]},
];
