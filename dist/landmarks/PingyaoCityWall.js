import * as T from 'three';
import {mapData} from '../map-data.js';
import {locateGates,passageCut,sample} from '../geography.js';
import {createArchitecture} from './architecture.js';

export function createPingyaoCityWall(materials) {
  const a=createArchitecture(materials),{wall,gates}=locateGates(mapData);
  const southPortal={center:[-1175,82.5],normal:[0,1],cutSize:[5.4,8]};
  const cuts=[...gates.filter(g=>g.name!=='凤仪门'),southPortal];
  // Survey already traces the projecting bastions: do not add a second, invented spacing.
  for(const line of wall) {
    let from=0;
    const intervals=cuts.map(g=>passageCut(line,g)).filter(Boolean).sort((a,b)=>a[0]-b[0]);
    function section(start,end) {
      if(end-start<1e-5)return;
      const p=sample(line,start),q=sample(line,end),len=line.length*(end-start),angle=-Math.atan2(q[1]-p[1],q[0]-p[0]);
      const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;
      // Battered masonry profile, continuous walkway and separate inner/outer parapets.
      const shape=new T.Shape();shape.moveTo(-4,0);shape.lineTo(4,0);shape.lineTo(3,10.5);shape.lineTo(-3,10.5);shape.closePath();
      const geo=new T.ExtrudeGeometry(shape,{depth:len+.25,bevelEnabled:false});
      geo.translate(0,0,-(len+.25)/2);a.add(geo,'brick',[x,0,z],[1,1,1],angle+Math.PI/2);geo.dispose();
      a.box('stone',x,10.55,z,len+.25,.22,6.4,angle);
      const point=(t,offset)=>[p[0]+(q[0]-p[0])*t-Math.sin(-angle)*offset,p[1]+(q[1]-p[1])*t+Math.cos(angle)*offset];
      for(const side of [-1,1]) {
        const [px,pz]=point(.5,side*2.85);a.box('brick',px,11,pz,len+.25,.85,.6,angle);
        for(let d=1;d<len;d+=3.1) {
          const [cx,cz]=point(d/len,side*2.85);a.box('brick',cx,11.9,cz,1.5,.95,.68,angle);
          a.box('stone',cx,12.4,cz,1.65,.15,.8,angle,true);
        }
      }
    }
    for(const [lo,hi] of intervals){section(from,lo);from=Math.max(from,hi);}section(from,1);
  }
  function arch(x,z,angle,scale=1) {
    const s=new T.Shape();s.moveTo(-9,0);s.lineTo(-4.3,0);s.lineTo(-4.3,3);
    s.absarc(0,3,4.3,Math.PI,0,true);s.lineTo(4.3,0);s.lineTo(9,0);s.lineTo(9,10.7);s.lineTo(-9,10.7);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:8,bevelEnabled:false});g.translate(0,0,-4);
    a.add(g,'brick',[x,0,z],[scale,scale,1],angle);g.dispose();
  }
  for(const gate of gates) {
    const {center:[x,z],angle}=gate;
    arch(x,z,angle);
    a.hall({x,z,w:17,d:10,h:4.3,base:10.7,hip:true,bays:5,yaw:angle});
    a.hall({x,z,w:12,d:7,h:3.6,base:17.7,hip:true,bays:3,yaw:angle});
    if(gate.name==='凤仪门')arch(...southPortal.center,.126,.78);
  }
  // Four corner positions follow surveyed changes of wall direction. Forms are approximate.
  for(const [x,z] of [[-1234,-480],[-1018,999],[476,604],[177,-833]]) {
    a.box('brick',x,5.3,z,12,10.6,12);
    a.hall({x,z,w:10,d:10,h:3.8,base:10.6,hip:true,bays:3});
    a.hall({x,z,w:6,d:6,h:2.6,base:16,hip:true,bays:3});
  }
  return a.finish();
}
