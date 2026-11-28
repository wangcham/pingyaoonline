import {geographicToLocal,localToGeographic} from './landmarks/coordinates.js';
import {createRingQuery,pointInRing} from './geography.js';
import {clearanceRect,clearancePolygonsOverlap,createRoadClearance} from './road-clearance.js';
import {citySurfaceRoads} from './city-extension.js';
import {gutaoRetailExtensions} from './gutao-shops-data.js';

// North-up Amap satellite views. Each frame retains its viewport (default 1280 × 720);
// elevations, uses, façade and furniture details are estimates, never API facts.
export const schoolRawSites=[{
 id:'vocational',name:'平遥县职业中学',mapName:'平遥现代工程技术学校',poi:'B0FFH6GVWF',center:[112.182252,37.179053],zoom:17,angle:.17,
 address:'春蕾路与艺苑东街交叉口东南侧',gate:[545,132],facing:Math.PI,
 boundary:[[409,148],[763,86],[839,598],[495,656]],
 context:[[[213,215],[372,191],[443,590],[276,618],[240,445],[207,355]]],
 palette:['#bcb5a5','#9f6f5f','#d6ceba'],
 appearance:'校名墙照片可见灰砖、白色校名；楼群屋顶、轴线花园、西侧住宅与南部运动场按卫星图判读。具体楼层和各楼用途为估算。',
 buildings:[['北西楼',476,176,79,33,4],['北东楼',639,146,70,34,4],['西一楼',495,246,75,30,4],['西二楼',507,312,72,28,4],['西三楼',515,359,73,29,4],['西南楼',520,419,65,32,4],['东一楼',671,285,56,29,4],['东二楼',679,326,54,25,4],['东三楼',684,371,59,28,4],['东南楼',706,552,79,30,3],['东侧长楼',762,397,25,163,4],['蓝顶附房',793,558,46,32,1,'shed'],['庭院北翼',664,206,51,15,3],['庭院南翼',674,261,52,10,3],['庭院东翼',702,235,11,30,3]],
 neighbours:[['住宅1',266,241,68,20,6],['住宅2',330,231,55,19,6],['住宅3',274,284,67,20,6],['住宅4',338,274,57,20,6],['住宅5',258,351,70,20,6],['住宅6',279,322,61,18,6],['住宅7',343,316,53,20,6],['住宅8',282,388,68,20,6],['住宅9',353,378,55,20,6],['住宅10',283,425,73,20,6],['住宅12',360,457,69,23,6],['住宅13',369,503,66,22,6],['住宅14',375,545,70,20,6],['住宅16',290,510,61,20,6],['住宅17',302,566,61,20,6]],
 lanes:[{width:5,points:[[545,132],[527,164],[554,385],[567,408]]},{width:5,points:[[545,132],[700,106],[776,580],[686,595],[671,497]]},{width:4,points:[[439,220],[479,458],[557,438]]},{width:4,points:[[555,398],[699,423],[746,412]]},{width:4,points:[[235,223],[269,447],[410,423],[438,585],[279,613]]},{width:3,points:[[316,237],[345,436],[372,590]]}],
 green:[[[555,297],[623,300],[650,388],[586,407]],[[704,441],[735,440],[748,492],[700,491]],[[539,181],[596,167],[612,214],[557,225]]],
 track:[607,518,100,183],courts:[[520,491,25,40],[526,544,25,40],[533,591,25,40]],
 trees:[[449,205],[457,247],[464,289],[472,335],[482,387],[492,445],[717,176],[725,217],[735,273],[745,325],[763,493],[764,538],[590,329],[607,351],[624,381],[564,192],[584,186],[704,462],[724,473],[254,265],[285,308],[307,408],[377,404],[309,470],[395,564]],
},{
 id:'experimental',name:'平遥实验中学',mapName:'平遥县实验初级中学校',poi:'B01620NJTM',center:[112.180627,37.191704],zoom:18,viewport:[662,731],angle:.12,
 address:'曙光路51号',gate:[568,349],facing:Math.PI/2,
 boundary:[[126,278],[489,222],[506,303],[578,295],[590,416],[454,436],[457,479],[153,512]],
 context:[[[86,272],[123,270],[149,510],[100,518]],[[182,521],[536,477],[562,684],[215,730]],[[83,27],[268,0],[300,218],[109,252]]],
 palette:['#b36f62','#ddd7c7','#af685c'],appearance:'地点照片可见浅色石材校门、红色窗框、砖红教学楼；按影像区分西侧教学组团、东北横向跑道和东南球场。层数为估算。',
 buildings:[['西北教学楼',180,302,92,32,4],['中部北段',262,319,31,82,5],['中部南段',278,419,33,102,5],['西侧楼',168,391,24,84,4],['西南教学楼',201,463,92,34,4],['南附房',229,497,44,19,1,'shed']],
 neighbours:[['西侧住宅北',110,307,23,43,5],['西侧住宅中',117,401,25,46,5],['西侧住宅南',125,482,25,41,5],['南侧东楼',443,529,166,32,4],['南侧西楼',278,553,77,36,3],['南侧中楼',290,631,84,28,3],['南侧低楼',470,683,169,27,2],['北坊1',158,45,118,16,1,'shed'],['北坊2',163,85,125,17,1,'shed'],['北坊3',170,129,126,17,1,'shed'],['北坊4',175,177,129,18,1,'shed'],['北坊5',180,219,130,16,1,'shed']],
 lanes:[{width:4,points:[[568,349],[520,355],[307,381]]},{width:3,points:[[291,278],[310,482],[443,468],[447,417],[516,407],[509,336]]},{width:3,points:[[143,327],[152,475],[235,484],[239,371],[233,333]]},{width:4,points:[[348,502],[360,586],[553,562]]},{width:3,points:[[204,528],[222,696],[540,651]]},{width:2,points:[[113,72],[274,49],[296,215]]}],
 green:[[[316,348],[486,326],[490,345],[320,369]],[[323,463],[430,446],[431,466],[325,482]],[[181,337],[222,332],[230,406],[186,413]]],
 track:[397,287,181,92],courts:[[338,416,27,65],[374,412,27,65],[410,405,27,65],[463,391,65,28]],
 trees:[[319,355],[347,351],[378,347],[410,344],[447,338],[480,335],[325,472],[356,468],[390,462],[421,458],[196,351],[209,390],[191,428],[514,367],[535,361],[542,397],[363,607],[402,598],[453,587],[497,578]],
},
{
 id:'gutao',name:'古陶一中',mapName:'平遥古陶一中',poi:'B0FFG4ESTC',center:[112.161997,37.193068],zoom:18,viewport:[662,731],angle:.18,
 address:'柳根西街61号',gate:[244,475],facing:0,
 boundary:[[57,323],[296,246],[626,220],[655,390],[309,451],[311,479],[121,502],[72,488]],
 context:[[[309,37],[490,8],[527,178],[337,212]],[[321,455],[655,397],[662,475],[378,530],[321,540]]],
 palette:['#b66f62','#b36b5d','#c1826e'],appearance:'高德照片可见砖红色五层教学楼、白色窗框、中央蓝色竖向立面及校名前景石；西部楼群与东部横向运动场独立建模。其他楼高和内部用途为估算。',
 buildings:[['南教学主楼',212,413,170,44,5],['东教学楼',272,311,38,97,5],['北蓝顶楼',157,326,118,31,2,'shed'],['西蓝顶附楼',81,432,27,73,1,'shed'],['西北附房',71,351,22,27,1,'shed']],
 neighbours:[['平安里北楼',412,61,167,29,6],['平安里中楼',423,112,164,29,6],['平安里南楼',434,163,162,28,6],['柳根街商铺',478,443,260,26,2,'commercial']],
 lanes:[{width:5,points:[[244,475],[242,452],[119,475],[99,378],[243,352]]},{width:4,points:[[308,446],[313,369],[299,255]]},{width:4,points:[[321,442],[639,387],[610,243],[320,287]]},{width:4,points:[[345,200],[331,137],[317,43]]},{width:4,points:[[336,90],[496,63],[521,178]]},{width:5,points:[[332,493],[639,441]]}],
 green:[[[129,458],[219,446],[223,467],[132,482]],[[329,426],[618,374],[621,388],[332,441]],[[346,192],[503,166],[506,180],[349,207]]],
 track:[501,335,256,146],courts:[[335,325,29,65]],
 trees:[[144,468],[173,461],[201,458],[277,459],[308,420],[305,385],[301,349],[298,271],[337,432],[376,427],[416,418],[457,412],[499,404],[540,397],[582,389],[354,191],[392,187],[427,180],[462,175],[496,170],[351,503],[389,496],[428,489],[467,480],[507,472],[546,465],[586,456]],
}
];
export function schoolImagePoint(s,u,v){const [lon,lat]=s.center,size=256*2**s.zoom,cy=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;return geographicToLocal([lon+(u-(s.viewport?.[0]??1280)/2)*360/size,Math.atan(Math.sinh(Math.PI*(1-2*(cy+(v-(s.viewport?.[1]??720)/2)/size))))*180/Math.PI],'GCJ-02');}
export function schoolWorld(s,u,v){const c=Math.cos(s.angle),sn=Math.sin(s.angle);return [s.origin[0]+u*c+v*sn,s.origin[1]-u*sn+v*c];}
export function schoolLocal(s,p){const [x,z]=schoolImagePoint(s,...p),dx=x-s.origin[0],dz=z-s.origin[1],c=Math.cos(s.angle),sn=Math.sin(s.angle);return [dx*c-dz*sn,dx*sn+dz*c];}
export const schoolRoads=citySurfaceRoads.filter(([t])=>!['footway','path','pedestrian','steps','cycleway','service'].includes(t)).map(r=>['trunk','trunk_link'].includes(r[0])?['primary',...r.slice(1)]:r);
export const schoolClearance=createRoadClearance(schoolRoads);
export const schoolSites=schoolRawSites.map(raw=>{
 const s={...raw,origin:schoolImagePoint(raw,(raw.viewport?.[0]??1280)/2,(raw.viewport?.[1]??720)/2),source:`https://www.amap.com/place/${raw.poi}`,satelliteSource:`https://www.amap.com/ssr/embed/view?lng=${raw.center[0]}&lat=${raw.center[1]}&zoom=${raw.zoom}&maptype=satellite&platform=pc`,checked:'2026-11-27',imageryDate:null};
 s.accuracy='高德卫星影像人工判读；影像日期未知，轮廓约有5–15米配准误差。高度、门窗、设施和树位含估算，非实测。'+s.appearance;
 s.boundary=raw.boundary.map(p=>schoolImagePoint(s,...p));s.contextBoundaries=raw.context.map(r=>r.map(p=>schoolImagePoint(s,...p)));s.protectedRings=[s.boundary,...s.contextBoundaries];s.contextBoundary=s.boundary;s.gate=schoolLocal(s,raw.gate);
 const m=Math.hypot(...schoolImagePoint(s,(s.viewport?.[0]??1280)/2+1,(s.viewport?.[1]??720)/2).map((v,i)=>v-s.origin[i]));s.metresPerPixel=m;s.rejected=[];
 s.buildings=[...raw.buildings.map(b=>[b,false]),...raw.neighbours.map(b=>[b,true])].flatMap(([b,neighbour],i)=>{
  const [name,px,py,pw,pd,levels,type]=b,[u,v]=schoolLocal(s,[px,py]),[x,z]=schoolWorld(s,u,v),w=pw*m,d=pd*m,ring=clearanceRect(x,z,w,d,s.angle,1);
  if(!schoolClearance.clear(ring)){s.rejected.push({name,reason:'public-road',pixels:b});return [];}
  return [{id:`b${i}`,name,u,v,x,z,w,d,levels,type:type??(neighbour?'residential':'public'),neighbour,ring,angle:s.angle,estimated:true,footprintEstimated:true,footprintSource:s.satelliteSource,heightSource:raw.id==='gutao'&&name==='南教学主楼'?'satellite-and-facade-photo-estimate':'satellite-morphology-estimate',confidence:raw.id==='gutao'&&name==='南教学主楼'?.5:.3,levelsEstimateRange:[Math.max(1,levels-1),levels+1],pixels:b}];
 });
 if(s.id==='gutao')for(const p of gutaoRetailExtensions){
  const [x,z]=schoolWorld(s,p.u,p.v),ring=clearanceRect(x,z,p.w,p.d,s.angle,1);
  if(!schoolClearance.clear(ring)){s.rejected.push({name:p.name,reason:'public-road'});continue;}
  s.buildings.push({...p,x,z,ring,angle:s.angle,type:'commercial',neighbour:true,estimated:true,footprintEstimated:true,footprintSource:'Amap POI row alignment; depth and bay boundaries estimated',heightSource:'nearby-facade-photo-estimate',confidence:.25,levelsEstimateRange:[2,3]});
  s.protectedRings.push(clearanceRect(x,z,p.w+2,p.d+8,s.angle));
 }
 // Preserve traced overhanging annexes at the working-boundary edge too.
 for(const b of s.buildings)if(!b.ring.every(p=>s.protectedRings.some(r=>pointInRing(...p,r))))s.protectedRings.push(clearanceRect(b.x,b.z,b.w,b.d,s.angle,2));
 return s;
});
const schoolQueries=schoolSites.flatMap(s=>s.protectedRings.map(createRingQuery));
export function isSchoolSite(x,z,pad=0){return schoolQueries.some(q=>q.contains(x,z,pad));}
export function schoolSiteIntersects(ring){return schoolSites.some(s=>s.protectedRings.some(r=>clearancePolygonsOverlap(ring,r)));}
export const schoolSiteRecords=schoolSites.map(s=>{const p=schoolWorld(s,...s.gate),a=s.angle+s.facing;return {id:s.id,name:s.name,position:p,coordinate:localToGeographic(p),crs:'WGS84',scale:1,height:6,view:[Math.sin(a)*30,4,Math.cos(a)*30],approximate:true,accuracy:s.accuracy,description:`${s.mapName}，${s.address}。校园与邻近街坊分别按影像建模。`,sources:[s.source,s.satelliteSource]};});
export const schoolSiteStops=schoolSites.flatMap((s,i)=>{const r=schoolSiteRecords[i];return [{name:`${s.name} · 校门`,keywords:`${s.name} ${s.mapName} 校园 学校`,address:s.address,eye:[r.position[0]+r.view[0],4,r.position[1]+r.view[2]],target:[r.position[0],3,r.position[1]],},{name:`${s.name} · 校园与周边全景`,keywords:`${s.name} ${s.mapName} 周边 街坊 操场`,address:s.accuracy,eye:[s.origin[0]+170,280,s.origin[1]+270],target:[s.origin[0],0,s.origin[1]]}].map((p,j)=>j?p:{...p,target:[r.position[0],3,r.position[1]]});});
export const schoolDetailBlocks=schoolSites.map(s=>({id:`school-${s.id}`,name:s.name,boundary:s.boundary,context:s.contextBoundaries,buildings:s.buildings.length,checked:s.checked,survey:'partial',acceptance:'pending-user-review',sources:[s.source,s.satelliteSource],accuracy:s.accuracy}));
