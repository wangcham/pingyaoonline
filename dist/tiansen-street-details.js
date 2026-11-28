import * as T from 'three';
import {createSurveySurfaces} from './survey-surfaces.js';
import {schoolTexture,schoolSurfaceScale} from './school-appearance.js';
import {addParkedScooters} from './street-scooters.js';
import {tiansenStreetAprons,tiansenSurvey,siteToWorld,worldToSite} from './west-sites-data.js';
import {clearanceRect,clearancePolygonsOverlap} from './road-clearance.js';
import {schoolClearance} from './school-sites-data.js';
import {pointInRing} from './geography.js';

export function addTiansenStreetDetails(s,masses,entrance,treePositions){
 const streetGround=createSurveySurfaces(s.root,{ground:s.ground,textureFactory:schoolTexture,tileScale:schoolSurfaceScale});
 const [eu,ev]=entrance,footprints=masses.map(b=>clearanceRect(b.u,b.v,b.w,b.d,0,.45));
 const aprons=tiansenStreetAprons.map(r=>r.map(p=>worldToSite(tiansenSurvey,...p))),placements=[],paving=[];
 const entrancePass=clearanceRect(eu+5,ev,14,24),treeRings=treePositions.map(p=>clearanceRect(...p,2.7,2.7));
 function safe(r){return ![...footprints,entrancePass,...treeRings].some(p=>clearancePolygonsOverlap(p,r))&&schoolClearance.clear(r.map(p=>siteToWorld(tiansenSurvey,...p)));}
 // Existing facade is retained; this narrow band supplies real parking rather
 // than inferred houses. Exact scooter counts/colors are illustrative.
 for(let v=-67;v<76;v+=1.2){
  const u=eu+9.3,a=Math.PI/2,r=clearanceRect(u,v,1,2.0,a);
  if(!safe(r))continue;
  placements.push({u,v,angle:a,side:'mall',ring:r});
 }
 for(let z=688;z<821;z+=1.3){
  const t=(z-670)/170,x=-1433+24*t,[u,v]=worldToSite(tiansenSurvey,x,z),a=-Math.PI/2+.13,r=clearanceRect(u,v,1,2,a);
  if(!r.every(p=>pointInRing(...p,aprons[1]))||!safe(r))continue;
  placements.push({u,v,angle:a,side:'opposite',ring:r});
 }
 // Per-slot paving clips at the public carriageway and reserves an entry gap.
 for(const [i,p] of placements.entries()){
  const r=clearanceRect(p.u,p.v,1.13,2.35,p.angle);if(!safe(r))continue;
  streetGround.polygon(r,'#a9aaa0',.255,'paving');paving.push(r);
  if(i%3!==2){const c=Math.cos(p.angle),sn=Math.sin(p.angle);s.line('#e0d9be',[p.u-.55*c-1.05*sn,p.v+.55*sn-1.05*c],[p.u-.55*c+1.05*sn,p.v+.55*sn+1.05*c],.055,.016,.29);}
 }
 const groundController=streetGround.finish();
 const scooters=addParkedScooters(s.root,placements,s.ground);
 // Façade reference: red open lattice on the south corner rather than dots.
 const south=masses[2],u=south.u+south.w/2-9,v=south.v+south.d/2+1.6;
 for(let x=-8.3;x<8.4;x+=.9)for(let y=8.6;y<14.9;y+=.9){
  s.box('#a34d51',u+x,south.base+y,v,.72,.055,.09);s.box('#a34d51',u+x-.34,south.base+y+.32,v,.055,.65,.09);
  s.box('#bd6c69',u+x+.15,south.base+y+.32,v+.015,.40,.045,.08);s.box('#bd6c69',u+x+.33,south.base+y+.53,v+.015,.045,.42,.08);
 }
 for(let z=south.v+south.d/2-11.1;z<south.v+south.d/2+1.2;z+=.9)for(let y=8.6;y<14.9;y+=.9){s.box('#a34d51',south.u+south.w/2+.12,south.base+y,z,.09,.055,.72);s.box('#a34d51',south.u+south.w/2+.12,south.base+y+.32,z-.34,.09,.65,.055);}
 // Bronze frame and white edge trims visible around the large entrance screen.
 for(const dv of [-5.55,5.55])s.box('#adb2a4',eu+.93,masses[0].base+13.7,ev+dv,.17,7.9,.18);
 for(const y of [9.83,17.57])s.box('#adb2a4',eu+.93,masses[0].base+y,ev,.17,.18,11.25);
 // Sloping canopy ribs. A real three-dimensional frame replaces a flat slab.
 const frameGeo=new T.CylinderGeometry(.055,.055,1,6),frameMat=new T.MeshStandardMaterial({color:'#394944',roughness:.7}),ribs=[];
 const canopyGeo=new T.BoxGeometry(Math.hypot(4.7,1.15),.12,14),canopyMat=new T.MeshStandardMaterial({color:'#647d80',roughness:.31,metalness:.28}),canopy=new T.Mesh(canopyGeo,canopyMat);canopy.position.set(eu+3.15,masses[0].base+5.125,ev);canopy.rotation.z=-Math.atan2(1.15,4.7);canopy.receiveShadow=canopy.castShadow=true;s.root.add(canopy);
 for(const dv of [-6.6,-4.4,-2.2,0,2.2,4.4,6.6]){
  const a=new T.Vector3(eu+.8,masses[0].base+5.7,ev+dv),b=new T.Vector3(eu+5.5,masses[0].base+4.55,ev+dv),m=new T.Mesh(frameGeo,frameMat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());m.scale.y=a.distanceTo(b);m.castShadow=true;s.root.add(m);ribs.push(m);
 }
 s.root.userData.streetParking={source:'user-confirmed two-wheeler use; Amap satellite/POI photos checked 2026-11-27',estimated:true,placements,paving,entrancePass};
 let released=false;
 return {dispose(){if(released)return;released=true;groundController.dispose();scooters.dispose();ribs.forEach(m=>m.removeFromParent());frameGeo.dispose();frameMat.dispose();canopy.removeFromParent();canopyGeo.dispose();canopyMat.dispose();}};
}
