import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {createRingQuery} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {citySurfaceRoads} from './city-extension.js';

// Human traces of the publicly viewed 1280 × 720 north-up Amap satellite views.
// Keep screen coordinates and projection together; POIs are anchors, not footprints.
export const civicSiteFrames={
 hospital:{center:[112.152735,37.189202],zoom:18},
 outlets:{center:[112.157031,37.184356],zoom:17},
 government:{center:[112.156317,37.192035],zoom:19},
 ziyuechen:{center:[112.155441,37.193396],zoom:18},
};
export function civicImagePoint(id,u,v){
 const {center:[lon,lat],zoom}=civicSiteFrames[id],size=256*2**zoom,cy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
 return geographicToLocal([lon+(u-640)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-360)/size))))*180/Math.PI],'GCJ-02');
}
export function civicLocal(s,p){const [x,z]=civicImagePoint(s.id,...p),dx=x-s.origin[0],dz=z-s.origin[1],c=Math.cos(s.angle),sn=Math.sin(s.angle);return [dx*c-dz*sn,dx*sn+dz*c];}
export function civicWorld(s,u,v){const c=Math.cos(s.angle),sn=Math.sin(s.angle);return [s.origin[0]+u*c+v*sn,s.origin[1]-u*sn+v*c];}
const civicRawSites=[
 {id:'hospital',name:'平遥县人民医院新院区',poi:'B0FFHTX6L6',angle:.36,kind:'hospital',
  boundaryPixels:[[390,158],[726,87],[771,166],[900,488],[548,642],[410,354],[367,231]],gatePixels:[882,437],gateFacing:Math.PI/2,
  description:'柳根西街与汇通路交叉口西南的新院区。北部住院高楼、门诊医技楼群、西侧停车区及东侧入口分别建模。',
  appearanceNote:'浅灰米白墙面和横向玻璃窗带参考高德地点照片。住院楼资料可确认至少有 13 层，本版取 15 层估算，范围 13–17 层；其余体块按影像与照片估计。',
  sources:['https://www.sohu.com/a/882414581_121118853','https://static.sse.com.cn/disclosure/bond/announcement/local/c/3475705813634901.pdf'],
  // id, screen centre, width/depth in screen pixels, estimated levels, role.
  buildings:[['north-annex',559,173,95,32,4,'office'],['west-annex',441,258,96,37,3,'public'],['inpatient',713,229,122,62,15,'hospital'],['medical-west',600,305,75,107,4,'hospital'],['medical-link',664,343,115,31,4,'hospital'],['outpatient',769,355,63,146,4,'hospital'],['south-west',653,442,110,49,4,'hospital'],['south-annex',746,504,122,34,2,'public'],['canteen',829,453,46,28,2,'public']],
  lanes:[{width:7,points:[[470,157],[516,330],[590,510],[641,589],[880,480],[804,270],[748,133],[470,157]]},{width:6,points:[[446,365],[532,605]]},{width:6,points:[[498,346],[581,590]]},{width:8,points:[[894,437],[870,423],[841,409],[816,387]]},{width:6,points:[[782,306],[808,326],[856,309]]}],
  parking:[[[461,382],[506,493]],[[478,366],[521,477]],[[506,519],[540,603]],[[529,503],[563,585]],[[420,329],[486,310]]],
  green:[[[477,163],[506,233],[537,222],[511,151]],[[550,211],[626,181],[642,221],[565,248]],[[652,550],[673,575],[867,492],[854,471]]],
  trees:[[473,365],[481,389],[490,415],[500,441],[511,470],[529,524],[540,548],[551,574],[681,567],[713,554],[747,541],[780,527],[815,513],[843,500],[495,194],[508,223],[527,276]],
 },
 {id:'outlets',name:'尚特奥特莱斯',poi:'B0K0TUX1YO',angle:.22,kind:'outlets',
  boundaryPixels:[[508,151],[575,123],[676,273],[726,380],[761,469],[785,526],[757,571],[619,596],[566,435],[546,327],[526,227]],gatePixels:[690,320],gateFacing:Math.PI/2,
  description:'曙光西街88号的尚特奥特莱斯。连续商业楼、开放内街与广场按卫星屋顶位置建模，米黄色窗带、深色首层和跨街门头参考公开相册。',
  appearanceNote:'卫星图仍可见施工阶段场地，影像日期未知；立面参考 2026-11-26 可见相册。采用已可见的东侧商业组团，西侧未完工住宅不虚构为已建成商场。建筑高度、门头尺寸和店铺分户均估算，未核实品牌不上招牌。',
  sources:[],
  buildings:[['north',552,187,48,47,6,'hotel'],['north-west',559,263,30,95,4,'commercial'],['north-east',622,264,30,89,4,'commercial'],['middle-west',611,349,65,45,3,'commercial'],['middle-east',690,359,27,54,4,'commercial'],['south-west',613,441,35,72,3,'commercial'],['south-east',700,429,36,77,4,'commercial'],['south-link',664,493,100,30,3,'commercial'],['south-front',686,546,107,29,3,'commercial']],
  lanes:[{width:8,points:[[579,215],[589,287],[609,317],[640,393],[656,459],[675,477],[694,525]]},{width:10,points:[[559,407],[639,389],[714,373]]},{width:9,points:[[607,319],[654,308],[692,319]]},{width:7,points:[[616,584],[739,553],[755,526]]}],
  parking:[[[626,583],[725,560]],[[575,438],[601,558]]],
  green:[[[643,397],[660,395],[671,449],[657,450]],[[723,453],[736,449],[750,495],[738,500]],[[566,342],[577,342],[587,375],[577,378]]],
  trees:[[585,227],[593,268],[602,302],[629,329],[650,326],[672,325],[633,411],[645,447],[667,471],[702,515],[728,534],[648,566],[685,556]],
 },
 {id:'government',name:'平遥县政务大厅',poi:'B0FFGRNCQT',angle:.17,kind:'government',
  boundaryPixels:[[310,115],[909,14],[1006,617],[409,716]],gatePixels:[732,652],gateFacing:0,
  description:'柳根西街的政务服务院区，位于紫悦宸南侧。北部主楼、院内绿地、南侧停车前庭和临街出入口分开表现。',
  appearanceNote:'院区边界、蓝色屋面和广场分区按 19 级卫星图判读。未获得清晰正面照片，墙面暂用浅灰米色；主楼 6 层及立面、门窗、坡道均为待校核估算，不将南侧 POI 当作主楼中心。',
  sources:['https://jz.bendibao.com/wangdian/dian/5229050.shtm'],
  buildings:[['main',641,189,362,81,6,'office'],['roof-core',611,150,182,60,1,'roof'],['west-service',381,205,80,40,2,'public']],
  lanes:[{width:6,points:[[351,132],[400,559],[968,458],[891,55]]},{width:7,points:[[406,684],[978,584]]},{width:6,points:[[643,596],[619,451],[615,368],[750,302],[896,302]]}],
  parking:[[[449,612],[932,527]],[[458,665],[945,578]],[[435,492],[602,465]],[[815,345],[843,463]],[[899,329],[925,448]]],
  green:[[[359,282],[532,252],[540,304],[394,363]],[[425,398],[562,374],[568,412],[432,438]],[[769,245],[851,228],[879,281],[799,307]]],
  trees:[[381,318],[411,311],[442,303],[473,297],[506,289],[786,264],[809,259],[835,255],[856,273],[427,636],[470,628],[518,618],[566,610],[614,601],[662,594],[710,585],[758,578],[806,568],[854,560],[899,551],[949,542]],
 },
 {id:'ziyuechen',name:'紫悦宸',poi:'B0FFKR097X',angle:.18,kind:'residential',aliases:'紫悦城 紫悦晨 小区',
  boundaryPixels:[[395,178],[738,130],[850,393],[879,465],[932,456],[943,503],[465,583]],gatePixels:[936,477],gateFacing:Math.PI/2,
  description:'政务大厅北侧、兴平家园西侧的紫悦宸小区。12 处住宅楼体、楼间通道、东门及院内绿化独立建模。搜索“紫悦城”也可找到。',
  appearanceNote:'楼体位置按卫星图，深灰棕墙面、浅色窗框及平屋顶参考高德实景照片。照片可辨约 6 层住宅，本版逐栋暂按 6 层估算（5–7 层待核）；树种、单元门及生活设施为示意。',
  sources:[],
  buildings:[['1',523,207,140,39,6,'residential'],['2',668,177,127,37,6,'residential'],['3',525,293,141,40,6,'residential'],['4',695,257,137,39,6,'residential'],['5',553,381,167,40,6,'residential'],['6',729,335,148,40,6,'residential'],['7',506,467,90,38,6,'residential'],['8',621,446,104,38,6,'residential'],['9',769,410,151,39,6,'residential'],['10',543,550,130,37,6,'residential'],['11',690,509,108,37,6,'residential'],['12',808,484,112,37,6,'residential']],
  lanes:[{width:5.5,points:[[410,187],[474,565],[914,487],[908,470]]},{width:5,points:[[600,184],[641,341],[681,466],[694,527]]},{width:5,points:[[433,250],[746,195]]},{width:5,points:[[448,340],[783,282]]},{width:5,points:[[462,427],[826,363]]},{width:5,points:[[478,510],[874,437],[901,474],[937,477]]}],
  parking:[[[443,255],[574,232]],[[629,222],[727,203]],[[485,523],[589,504]],[[715,475],[823,456]]],
  green:[[[460,335],[578,314],[580,326],[462,347]],[[641,300],[746,281],[748,293],[643,312]],[[484,421],[615,398],[617,410],[486,433]],[[680,378],[798,357],[800,369],[682,390]],[[510,486],[549,479],[551,491],[512,498]],[[715,451],[811,434],[813,446],[717,463]]],
  trees:[[473,329],[501,324],[532,319],[561,313],[658,293],[689,287],[722,281],[506,434],[537,429],[568,424],[600,418],[697,372],[730,366],[766,359],[728,451],[765,444],[799,438],[604,233],[614,278],[636,362]],
 },
];
// These local trunk roads are surface roads in citySurfaceRoads, not bridges.
// Include G207 / Huitong Road as well as ordinary streets in the clearance test.
export const civicPublicRoads=citySurfaceRoads.filter(([t])=>!['service','footway','path','pedestrian','steps','cycleway'].includes(t)).map(r=>['trunk','trunk_link'].includes(r[0])?['primary',...r.slice(1)]:r);
const civicBoundaryClearance=createRoadClearance(civicPublicRoads);
function civicClipBoundary(ring,center){
 let result=ring;
 for(const {line,width} of civicBoundaryClearance.conflicts(ring)){
  const [a,b]=[line.start,line.end],dx=(b[0]-a[0])/line.length,dz=(b[1]-a[1])/line.length;let nx=-dz,nz=dx;
  if((center[0]-a[0])*nx+(center[1]-a[1])*nz<0){nx=-nx;nz=-nz;}
  const distance=p=>(p[0]-a[0])*nx+(p[1]-a[1])*nz-width/2-.6,next=[];
  if(distance(center)<=0)throw Error('Site centre conflicts with mapped public road');
  for(let i=0;i<result.length;i++){const p=result[i],q=result[(i+1)%result.length],pd=distance(p),qd=distance(q);if(pd>=0)next.push(p);if((pd>=0)!==(qd>=0)){const t=pd/(pd-qd);next.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
  result=next;
 }return result;
}
export const civicSiteSurveys=civicRawSites.map(raw=>{
 const frame=civicSiteFrames[raw.id],origin=civicImagePoint(raw.id,640,360),s={...raw,origin,coordinate:frame.center,crs:'GCJ-02',checked:'2026-11-26',imageryDate:null,source:`https://www.amap.com/place/${raw.poi}`,satelliteSource:`https://www.amap.com/ssr/embed/view?lng=${frame.center[0]}&lat=${frame.center[1]}&zoom=${frame.zoom}&maptype=satellite&platform=pc`};
 s.imageBoundary=raw.boundaryPixels.map(p=>civicImagePoint(raw.id,...p));s.boundary=civicClipBoundary(s.imageBoundary,origin);s.boundarySource='satellite-trace-with-OSM-public-road-clearance';s.contextBoundary=s.boundary;s.gate=civicLocal(s,s.gatePixels);
 s.accuracy='卫星图人工判读，非测绘轮廓。影像拍摄日期未知，屋顶视差及配准约有 5–15 米误差；楼高、设施与铺装单砖均包含估算。'+s.appearanceNote;
 const metres=Math.hypot(...civicImagePoint(raw.id,641,360).map((v,i)=>v-origin[i]));
 s.buildings=raw.buildings.map(([id,px,py,pw,pd,levels,type])=>{
  const [u,v]=civicLocal(s,[px,py]),[x,z]=civicWorld(s,u,v),w=pw*metres,d=pd*metres;
  return {id,u,v,x,z,w,d,angle:s.angle,levels,type,pixels:[px,py,pw,pd],ring:clearanceRect(x,z,w,d,s.angle),estimated:true,footprintSource:s.satelliteSource,footprintEstimated:true,levelsEstimateRange:id==='inpatient'?[13,17]:[Math.max(1,levels-1),levels+1],heightSource:raw.kind==='government'?'satellite-morphology-estimate':'satellite-and-photo-level-estimate',confidence:raw.kind==='government'?.25:.4};
 });
 return s;
});
// Context around the outlet is owned separately from its retail footprints.
// Satellite foundations + Amap Yaodu Ruifu exterior photographs; dates/heights
// and current parking boundaries are approximate, not cadastral measurements.
export const outletsContextSurvey=(()=>{
 const mall=civicSiteSurveys.find(s=>s.id==='outlets');
 const boundary=civicClipBoundary([[180,215],[500,125],[575,123],[785,526],[757,605],[275,680]].map(p=>civicImagePoint('outlets',...p)),mall.origin);
 const towers=[[325,274],[450,249],[285,394],[445,374],[345,524],[525,524],[305,604],[495,584]].map(([x,y],i)=>{
  const[u,v]=civicLocal(mall,[x,y]);return{id:`residential-${i}`,u,v,w:i%2?48:54,d:19,levels:i%3===0?15:16,type:'residential',name:'遥都瑞府周边住宅（轮廓近似）',heightSource:'Amap-residential-photo-level-estimate',confidence:.35};
 });
 return {...mall,id:'outlets-context',name:'奥莱周边 · 住宅与停车场',boundary,contextBoundary:boundary,towers,estimated:true};
})();
civicSiteSurveys.find(s=>s.id==='outlets').contextBoundary=outletsContextSurvey.boundary;
outletsContextSurvey.accuracy='周边住宅外观参考高德遥都瑞府相册及奥莱开业照片；卫星图仍含施工状态，住宅轮廓、层数、停车场与电动车区边界均含估算。';
const civicBoundaryQueries=civicSiteSurveys.map(s=>createRingQuery(s.contextBoundary));
export function isCivicSite(x,z,pad=0){return civicBoundaryQueries.some(q=>q.contains(x,z,pad));}
export function civicSiteIntersects(ring){return civicSiteSurveys.some(s=>clearancePolygonsOverlap(ring,s.contextBoundary));}
export const civicSiteRecords=civicSiteSurveys.map(s=>{
 const position=civicWorld(s,...s.gate),front=s.angle+s.gateFacing;
 return {id:s.id,name:s.name,position,coordinate:localToGeographic(position),crs:'WGS84',scale:1,height:7,
  view:[Math.sin(front)*35,5,Math.cos(front)*35],approximate:true,accuracy:s.accuracy,description:s.description,sources:[s.source,s.satelliteSource,...s.sources]};
});
export const civicDetailBlocks=civicSiteSurveys.map((s,i)=>({id:`C04-0${i+1}`,siteId:s.id,name:s.name,region:'C04',boundary:s.boundary,buildings:s.buildings.filter(b=>b.type!=='roof').length,checked:s.checked,sources:[s.source,s.satelliteSource,...s.sources],accuracy:s.accuracy,survey:'partial',acceptance:'pending-user-review'}));
export const civicSiteStops=civicSiteSurveys.flatMap((s,i)=>{
 const r=civicSiteRecords[i];return [{name:`${s.name} · 入口`,keywords:`${s.name} ${s.aliases??''} ${s.kind==='outlets'?'奥莱':''} 街景`,address:s.description,eye:[r.position[0]+r.view[0],r.view[1],r.position[1]+r.view[2]],target:[r.position[0],4,r.position[1]]},
 {name:`${s.name} · 全景`,keywords:`${s.name} ${s.aliases??''} 院内 停车 绿化 楼群`,address:s.accuracy,eye:[s.origin[0]+160,240,s.origin[1]+230],target:[s.origin[0],0,s.origin[1]]}];
});
const outletsRetailSurvey=civicSiteSurveys.find(s=>s.id==='outlets');
const outletsRetailEye=civicWorld(outletsRetailSurvey,-25,-65),outletsRetailTarget=civicWorld(outletsRetailSurvey,-40,-90);
civicSiteStops.push({name:'尚特奥特莱斯 · 品牌内街',keywords:'奥莱 奥特莱斯 商店 店铺 品牌 NIKE 耐克 ADIDAS 阿迪达斯 PINKO MCM LACOSTE TOMMY CK 波司登 斯凯奇',address:'尚特奥特莱斯 · 商业内街',eye:[outletsRetailEye[0],2.4,outletsRetailEye[1]],target:[outletsRetailTarget[0],3.1,outletsRetailTarget[1]]});
