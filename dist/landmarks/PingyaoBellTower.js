import {createArchitecture} from './architecture.js';

// User-confirmed “bell tower” = 市楼 / 金井楼. No invented bell or clock face.
export function createPingyaoBellTower(materials) {
  const a=createArchitecture(materials);
  // Mapped base ≈ 8.6 × 10.9 m. Keep the north–south passage open.
  for(const x of [-3.05,3.05])a.box('brick',x,2.2,0,2.35,4.4,10.7);
  for(const x of [-3.5,3.5])for(const z of [-4.8,0,4.8])a.column(x,4.4,z,2.5,.24);
  a.box('wood',0,4.6,0,8.6,.4,10.7);
  a.roof(0,6.7,0,11.5,12.2,2.4,{mat:'green'});
  a.hall({w:7.5,d:8.4,h:3,base:7.6,bays:3,hip:true,wall:'red',mat:'green'});
  a.hall({w:6,d:6.6,h:2.5,base:12.1,bays:3,hip:true,wall:'red',mat:'green'});
  // Finish at 18.5 m including the central ridge ornament.
  a.column(0,16.63,0,1.87,.18,'gold');
  a.beam([-2.45,16.75,0],[2.45,16.75,0],.18,'gold',false);
  for(const z of [-4.3,4.3]) {
    a.box('gold',0,10.35,z,6,.12,.15);
    for(let x=-3.3;x<=3.3;x+=.55)a.box('wood',x,8.4,z,.1,1.2,.1,0,true);
  }
  return a.finish();
}
