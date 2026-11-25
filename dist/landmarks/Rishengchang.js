import {createArchitecture} from './architecture.js';

export function createRishengchang(materials) {
  const a=createArchitecture(materials);a.courtyard(46,66,3);
  // Main three-court axis, north-facing street facade; narrower subsidiary courts.
  for(const [z,h] of [[-28,6.4],[-8,4.4],[12,5.8],[28,4.8]])a.hall({x:-3,z,w:19,d:6,h,bays:5,yaw:Math.PI});
  for(const z of [-18,2,21])for(const side of [-1,1])a.hall({x:-3+side*8,z,w:10,d:3.7,h:3.5,bays:3,yaw:side*Math.PI/2});
  for(const side of [-1,1])for(const z of [-24,-7,10,26])a.hall({x:side*18,z,w:11,d:5,h:3.5,bays:3});
  a.box('wood',-3,4.4,-31.4,5,1.1,.15);
  return a.finish();
}
