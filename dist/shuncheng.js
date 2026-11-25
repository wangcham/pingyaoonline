import * as T from 'three';
import {mapData} from './map-data.js';
import {sample, segments} from './geography.js';
import {westGroundHeight} from './west-terrain.js';
import {atYufengAccess} from './west-road-layout.js';

const junctions = [
  {name:'中都街 × 顺城北路',x:-1721,z:-195,bearing:-.66,type:'station',width:19,
    note:'站前斜接路口 · 平遥站和站前广场',look:[-1757,3,-250]},
  {name:'下西关街 × 顺城北路',x:-1523,z:96,bearing:-.126,type:'mall',width:12,
    note:'陶源丰新天地、宇峰购物广场和万人商厦',eye:[-1540,8,105],look:[-1470,8,99]},
  {name:'顺城北路 · 西侧支路口',x:-1469,z:662,bearing:-.026,type:'branch',width:6,
    note:'仅西侧接入 · 路名待核实'},
  {name:'上西关街 × 顺城路转盘',x:-1440,z:870,bearing:-.11,type:'roundabout',width:7,
    note:'环形入口和中央绿岛 · 通往上西门与永安路',eye:[-1467,12,911],look:[-1431,3,861]},
  {name:'柳根街 × 顺城南路',x:-1396,z:1220,bearing:-.183,type:'garden',width:20,
    note:'柳根街双向车道、街角绿地与住宅街区'},
  {name:'顺城南路 · 柳根街南侧支路',x:-1386,z:1303,bearing:-.25,type:'local',width:6,
    note:'东西侧社区支路 · 路名待核实'},
  {name:'顺城南路 · 曙光街北侧支路',x:-1370,z:1440,bearing:-.16,type:'branch',width:5.5,
    note:'东侧短接住宅道路 · 路名待核实'},
  {name:'曙光街 × 顺城南路',x:-1331,z:1764,bearing:-.16,type:'hotel',width:16,
    note:'多车道交叉口 · 附近有全季酒店及南城派出所'},
  {name:'顺城南路 · 曙光街南侧支路',x:-1312,z:1898,bearing:-.18,type:'branch',width:5.5,
    note:'东侧接入社区支路 · 路名待核实'},
  {name:'顺城南路 · 双林大道北侧支路',x:-1276,z:2152,bearing:.42,type:'local',width:5,
    note:'东侧斜接，随后进入双林大道大路口 · 路名待核实'},
  {name:'双林大道 × 顺城南路',x:-1267,z:2215,bearing:-.19,type:'boulevard',width:32,
    note:'全线最宽的东西向干道之一 · 双幅车道和较长的过街距离'},
  {name:'艺苑街方向 × 顺城南路',x:-1173,z:2711,bearing:-.191,type:'outer',width:21,
    note:'城南宽路口 · 艺苑街方向，地图原始路段未标名'},
  {name:'顺城南路 · 南段支路',x:-995,z:3596,bearing:-.19,type:'local',width:5.5,
    note:'城南低密度路段 · 东侧接入支路，路名待核实'},
  {name:'顺城南路南端',x:-938,z:3877,bearing:0,type:'end',width:0,
    note:'本次公开路网的南端 · 道路两侧以低密度建筑为主'},
];

const scRoads = mapData.shunchengWays.map(path=>path[0][1]<path.at(-1)[1]?path:[...path].reverse());
const scSegments = scRoads.map(segments);

export const shunchengStops = junctions.map(junction=>{
  const {name,x,z,note,look,eye,type}=junction;
  const scale=type==='boulevard'?1.6:1;
  const eyeZ=type==='end'?z-42:z+34*scale;
  const routes=eyeZ<855?scSegments.slice(0,2):scSegments.slice(2);
  const laneXs=routes.map(lines=>roadAt(lines,eyeZ)).filter(v=>v!==null);
  const laneX=laneXs.length?Math.min(...laneXs):x-15;
  return {name,keywords:'顺城路全线 顺城路路口',address:note+' · 街景细节示意',
    eye:eye??[laneX,6.8*scale,eyeZ],target:look??[x+2,1.4,z+(type==='end'?0:-8)]};
});
const footprints = [
  {x:-1773,z:-247,w:73,d:27,h:11,base:'#bfb9a3',accent:'#7d6757',name:'平遥站',kind:'station'},
  {x:-1399,z:1708,w:42,d:37,h:25,base:'#c5b49c',accent:'#5c594d',name:'全季酒店',kind:'hotel'},
  {x:-1270,z:1804,w:46,d:32,h:14,base:'#bbbbad',accent:'#355777',name:'南城派出所',kind:'hotel'},
];
const landscapeParcels=[
  {x:-1350,z:1169,w:60,d:51}, {x:-1458,z:1258,w:58,d:45},
  {x:-1206,z:2272,w:57,d:46}, {x:-1329,z:2247,w:62,d:42},
  {x:-1126,z:2748,w:68,d:48},
];

export function isShunchengParcel(x,z,radius) {
  return [...footprints,...landscapeParcels].some(p=>
    Math.abs(p.x-x)<p.w/2+radius+3&&Math.abs(p.z-z)<p.d/2+radius+3);
}

function roadAt(lines,z) {
  const line=lines.find(s=>z>=s.start[1]&&z<=s.end[1]);
  if(!line) return null;
  const t=(z-line.start[1])/(line.end[1]-line.start[1]);
  return sample(line,t)[0];
}

export function addShuncheng(scene,box,namedBoard) {
  const buffers=new Map();
  const dashed='#e0d6bb';
  const crossPaint='#dfddd0';
  const asphalt='#666b70';
  const turf='#7b8d59';
  const shoulder='#b3aca0';
  function quad(color,verts) {
    if(!buffers.has(color)) buffers.set(color,{pos:[],index:[]});
    const {pos,index}=buffers.get(color);
    const start=pos.length/3;
    pos.push(...verts.flatMap(([x,y,z])=>[x,y+westGroundHeight(x,z),z]));
    index.push(start,start+1,start+2,start,start+2,start+3);
  }
  function floorStrip(color,x,z,w,d,y,angle=0) {
    const c=Math.cos(angle),s=Math.sin(angle);
    quad(color,[[-w,-d],[w,-d],[w,d],[-w,d]].map(([a,b])=>[x+(a*c+b*s)/2,y,z+(-a*s+b*c)/2]));
  }
  const nearJunction=(z,margin=15)=>junctions.some(k=>Math.abs(k.z-z)<margin+
    (k.type==='boulevard'?13:k.type==='station'?9:0));

  for(const [index,path] of scRoads.entries()) {
    const outer=index===0||index===3?-1:1;
    let station=0;
    for(const line of segments(path)) {
      const dx=(line.end[0]-line.start[0])/line.length,dz=(line.end[1]-line.start[1])/line.length;
      const angle=-Math.atan2(dz,dx);
      const strip=(color,a,b,start,end,y)=>{
        const A=sample(line,start/line.length),B=sample(line,end/line.length);
        const offset=([x,z],d)=>[x+dz*d,y,z-dx*d];
        quad(color,[offset(A,a),offset(B,a),offset(B,b),offset(A,b)]);
      };
      const step=line.length/Math.ceil(line.length/1.5);
      for(let d=0;d<line.length-1e-6;d+=step) {
        const to=Math.min(line.length,d+step);
        strip(asphalt,-4.8,4.8,d,to,.121);
        const [x,z]=sample(line,(d+to)/2/line.length);
        if(!nearJunction(z,11)&&!atYufengAccess(x+dz*outer*5,z-dx*outer*5)) {
          strip(shoulder,outer*4.8,outer*7.8,d,to,.195);
          strip('#c7c0af',outer*4.78,outer*5.03,d,to,.21);
        }
      }
      for(let d=(12-station%12)%12;d<line.length;d+=12) {
        const [x,z]=sample(line,(d+2.1)/line.length);
        if(d+4.2>line.length||nearJunction(z,12))continue;
        for(const offset of [-1.6,1.6]) strip(dashed,offset-.05,offset+.05,d,d+4.2,.134);
        if(((station+d)%48)<3) {
          const ox=x+dz*outer*6.85,oz=z-dx*outer*6.85;
          const base=westGroundHeight(ox,oz);
          box(scene,'#4f5556',ox,base+3.25,oz,.13,6.5,.13);
          box(scene,'#4f5556',ox-dz*outer*.65,base+6.42,oz+dx*outer*.65,1.42,.13,.11,angle+Math.PI/2);
          box(scene,'#e3dbbf',ox-dz*outer*1.3,base+6.35,oz+dx*outer*1.3,.36,.14,.26);
        }
      }
      station+=line.length;
    }
  }

  for (let z=-182;z<3860;z+=8) {
    if(nearJunction(z,18))continue;
    const pair=z<855?scSegments.slice(0,2):scSegments.slice(2);
    const a=roadAt(pair[0],z),b=roadAt(pair[1],z);
    const an=roadAt(pair[0],z+8),bn=roadAt(pair[1],z+8);
    if([a,b,an,bn].some(x=>x===null))continue;
    const lo=Math.min(a,b)+4.88,hi=Math.max(a,b)-4.88;
    const lo2=Math.min(an,bn)+4.88,hi2=Math.max(an,bn)-4.88;
    if(Math.min(hi-lo,hi2-lo2)<.35) continue;
    quad(turf,[[lo,.16,z],[lo2,.16,z+8],[hi2,.16,z+8],[hi,.16,z]]);
    if(z%40===18 && hi-lo>1.2) box(scene,'#7a8b59',(lo+hi)/2,.24,z+4,hi-lo,.32,3.3);
  }

  function zebra(x,z,bearing,count) {
    for(let i=0;i<count;i++) {
      const t=(i-(count-1)/2)*.67;
      floorStrip(crossPaint,x+Math.cos(bearing)*t,z+Math.sin(bearing)*t,.3,3.5,.184,-bearing);
    }
  }

  function trafficPole(x,z,face,arm) {
    const y=westGroundHeight(x,z);
    box(scene,'#575c58',x,y+3.1,z,.18,6.2,.18);
    const dx=Math.cos(face),dz=Math.sin(face);
    box(scene,'#686d66',x+dx*arm/2,y+6.02,z+dz*arm/2,arm,.12,.12,-face);
    const hx=x+dx*(arm-.35),hz=z+dz*(arm-.35);
    box(scene,'#242a29',hx,y+5.71,hz,.32,.82,.23,-face);
    for(const [dy,color] of [[.23,'#b75b42'],[0,'#ad843f'],[-.23,'#597b58']]) {
      box(scene,color,hx,y+5.72+dy,hz-.130,.12,.13,.025);
      box(scene,color,hx,y+5.72+dy,hz+.130,.12,.13,.025);
    }
  }

  for(const item of junctions) {
    const {x,z,type,bearing,width,name}=item;
    if(type==='roundabout') continue;
    if(['local','branch','end'].includes(type)) {
      if(type!=='end') floorStrip('#888d85',x+9,z,5.7,5.8,.145,-bearing);
      continue;
    }
    const controls=type==='boulevard'?19:type==='station'?12:10;
    // Keep the curb and median out of the shared, map-connected intersection.
    floorStrip(asphalt,x,z,20.8,Math.max(8,width-3),.155,-bearing);
    zebra(x,z-width/2-2.7,bearing,24);
    zebra(x,z+width/2+2.7,bearing,24);
    if(type!=='station') {
      zebra(x-12,z,Math.PI/2+bearing,Math.floor(Math.min(width,30)/.67));
      zebra(x+12,z,Math.PI/2+bearing,Math.floor(Math.min(width,30)/.67));
    }
    trafficPole(x-13,z-controls,0,type==='boulevard'?10:6.5);
    trafficPole(x+13,z+controls,Math.PI,type==='boulevard'?10:6.5);
    const y=westGroundHeight(x-14,z+controls);
    box(scene,'#596457',x-14,y+2,z+controls,.11,4,.11);
    const short=name.split(' × ')[0];
    namedBoard(scene,short,x-14,y+3.8,z+controls,6.8,.84,0,'#2b585b');
    namedBoard(scene,short,x-14,y+3.8,z+controls,6.8,.84,Math.PI,'#2b585b');
  }

  for(const {x,z,w,d} of landscapeParcels) {
    floorStrip('#8a995f',x,z,w,d,.02);
    floorStrip('#b6ad91',x,z,w-8,3,.052,-.17);
    for(let j=0;j<4;j++) {
      const tx=x+(j-1.5)*w*.18,tz=z+Math.cos(j*2.4)*d*.23;
      box(scene,'#69583b',tx,2.15,tz,.4,4.3,.4);
      const ball=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:j%2?'#63804d':'#789052',roughness:1}));
      ball.position.set(tx,4.55,tz);
      ball.scale.set(2.25,2.4,2.22);
      scene.add(ball);
    }
  }

  const stationCenter=footprints[0];
  floorStrip('#ada89b',stationCenter.x,stationCenter.z+29,80,36,.097,-.23);
  for(let i=-2;i<=2;i++) floorStrip('#d4cbbb',stationCenter.x+i*15,stationCenter.z+28,.10,25,.105,-.23);

  for(const {x,z,w,d,h,base,accent,name,kind} of footprints) {
    const root=new T.Group();
    root.position.set(x,westGroundHeight(x,z),z);
    root.rotation.y=kind==='station'?.19:0;
    scene.add(root);
    box(root,base,0,h/2,0,w,h,d);
    box(root,accent,0,h+.22,0,w+.7,.48,d+.6);
    box(root,accent,0,3.8,d/2+.7,w*.72,.32,2.05);
    for(let i=0;i<Math.floor(w/5);i++) {
      const dx=(i-(Math.floor(w/5)-1)/2)*4.5;
      for(let y=2.3;y<h-1;y+=3.4) {
        box(root,'#556a73',dx,y,d/2+.07,2.85,2.05,.14);
        box(root,'#cfc9b9',dx,y,d/2+.15,.12,2.07,.025);
      }
    }
    namedBoard(root,name,0,kind==='station'?6.7:h-1.55,d/2+.18,Math.min(16,w*.57),1.5,0,accent);
  }
  for(const [color,{pos,index}] of buffers) {
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.93,side:T.DoubleSide}));
    mesh.receiveShadow=true;
    scene.add(mesh);
  }
}
