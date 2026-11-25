import {createArchitecture} from './architecture.js';
import {surveyFrame} from './data.js';

export function createPingyaoCountyYamen(materials,record) {
  const a=createArchitecture(materials);a.courtyard(110,203,7);
  const toLocal=([x,z])=>{x-=record.position[0];z-=record.position[1];return [x*Math.cos(record.rotation)-z*Math.sin(record.rotation),x*Math.sin(record.rotation)+z*Math.cos(record.rotation)];};
  // Reuse the mapped main hall centroid instead of snapping it to an arbitrary new axis.
  const hall=surveyFrame('yamenHall'),[hx,hz]=toLocal(hall.center);
  a.hall({x:hx,z:hz,w:45,d:12,h:6.2,base:1.1,bays:7,hip:false});
  for(const [z,w,d,h] of [[96,22,8,4.5],[65,22,9,5.2],[-20,28,12,5.5],[-53,25,12,5.5],[-88,22,10,5]])a.hall({x:hx,z,w,d,h,bays:5});
  a.hall({x:hx,z:-88,w:18,d:8,h:3.5,base:8.4,bays:3,hip:true});
  // Six courtyard divisions along the administrative axis.
  for(const z of [81,-4,-38,-71])for(const side of [-1,1]) {
    if(z===81&&side===-1)continue;
    a.hall({x:hx+side*24,z,w:23,d:6,h:3.7,bays:5,yaw:side*Math.PI/2});
  }
  for(const side of [-1,1])for(const z of [72,24,-25,-73]) {
    if(z===72&&side===-1)continue;
    a.hall({x:side*43,z,w:16,d:8,h:4,bays:3});
  }
  // Existing prison outline supplies its real center; other annex spacing is approximate.
  const [px,pz]=toLocal(surveyFrame('yamenPrison').center);a.hall({x:px,z:pz,w:36,d:7,h:3.5,bays:7});
  for(const key of ['yamenEast','yamenWest']) {
    const [x,z]=toLocal(surveyFrame(key).center);a.hall({x,z,w:36,d:8,h:3.7,bays:7,yaw:Math.PI/2});
  }
  return a.finish();
}
