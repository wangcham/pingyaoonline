import {createArchitecture} from './architecture.js';

export function createPingyaoConfucianTemple(materials) {
  const a=createArchitecture(materials);a.courtyard(48,221,7);
  a.hall({z:99,w:17,d:5,h:4,open:true,bays:3,hip:true});
  a.box('stone',0,.22,79,19,.4,13);a.box('water',0,.44,79,17,.06,11);
  a.box('stone',0,.7,79,3,.4,14);
  for(const x of [-1.7,1.7])for(let z=73;z<86;z+=2)a.column(x,.6,z,1,.1,'stone',true);
  a.hall({z:56,w:25,d:9,h:5,bays:5,hip:true});
  // Five-bay, deep single-eave Dacheng hall; restrained early timber proportions.
  a.hall({z:14,w:25,d:23,h:6.2,base:1.2,bays:5,hip:true});
  a.box('stone',0,.48,34,20,.96,14);
  for(const side of [-1,1]) {
    a.hall({x:side*19,z:31,w:30,d:6,h:3.6,bays:7,yaw:side*Math.PI/2});
    a.hall({x:side*19,z:-44,w:30,d:6,h:3.6,bays:7,yaw:side*Math.PI/2});
  }
  a.hall({z:-27,w:24,d:11,h:5,bays:5});
  a.hall({z:-61,w:9,d:8,h:4,open:true,bays:3,hip:true});
  a.hall({z:-96,w:23,d:10,h:4.2,bays:5});
  a.hall({z:-96,w:19,d:8,h:3.3,base:7.5,bays:3,hip:true});
  for(const side of [-1,1])a.box('plaster',side*15,1.8,91,5,3.6,.6);
  return a.finish();
}
