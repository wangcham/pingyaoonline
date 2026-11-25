import {createOldTownLayout,townWorld} from './old-town-layout.js';
import {createUrbanBatch} from './urban-batch.js';
import {createPavingMaterial} from './paving.js';

export function addOldTownCourtyards(scene,plots=createOldTownLayout()){
  const a=createUrbanBatch(scene,{paving:createPavingMaterial('yard')});
  const bricks=['#777a76','#82837b','#6f7472','#8a8980'],roofs=['#41494a','#4a5151','#515655'];
  for(const p of plots){
    const wall=bricks[p.variant%bricks.length],tile=roofs[p.variant%roofs.length];
    function box(color,x,y,z,w,h,d,rotation=0){const [px,pz]=townWorld(p.x+x,p.z+z);a.box(color,px,y,pz,w,h,d,p.angle+rotation);}
    function room(x,z,w,d,h,rotation=0,frontage=false){
      const [px,pz]=townWorld(p.x+x,p.z+z),angle=p.angle+rotation;
      a.box(wall,px,h/2+.2,pz,w,h,d,angle);
      a.part('roof',tile,px,h+.25,pz,w+.7,1.55,d+.8,angle);
      a.box('#626765',px,h+1.85,pz,w+.5,.16,.15,angle);
      for(const t of [-.3,0,.3]){
        const xx=x+w*t*Math.cos(rotation)+(d/2+.04)*Math.sin(rotation),zz=z-w*t*Math.sin(rotation)+(d/2+.04)*Math.cos(rotation);
        box('#403a32',xx,h*.46,zz,w*.18,h*.63,.12,rotation);
        box('#747367',xx,h*.58,zz,w*.18,.07,.17,rotation);
      }
      if(frontage){
        const zz=z+d/2+.4;box('#483b30',x,h-.3,zz,w*.75,.55,.2);
        box('#665d4d',x,.18,zz,w+.2,.3,.65);
      }
    }
    const [x,z]=p.world;a.part('paving','#ffffff',x,.03,z,p.w,.06,p.d,p.angle);
    room(0,-p.d/2+3.4,p.w-1,6,4.4+p.variant*.13);
    for(const side of [-1,1])room(side*(p.w/2-2.4),0,p.d-14,4.1,3.8,side*Math.PI/2);
    const wing=(p.w-3.2)/2;
    for(const side of [-1,1])room(side*(1.6+wing/2),p.d/2-2.6,wing-1,4.2,3.7,0,true);
    // Boundary walls and an open entrance form a real void instead of a solid block.
    for(const side of [-1,1]){
      box(wall,side*p.w/2,1.25,0,.35,2.5,p.d);
      box('#505957',side*p.w/2,2.55,0,.5,.14,p.d);
      box(wall,side*(p.w/4+.8),1.25,p.d/2,(p.w-3.2)/2,2.5,.35);
    }
    box('#534239',0,2.8,p.d/2,3.5,.3,.6);
    if(p.variant%3===0){
      box('#777974',0,.24,0,2,.48,1.2);
      box('#605445',-p.w/2+4,.35,3,1.6,.7,.8);
    }
  }
  const group=a.finish();group.name='古城内部连续院落（布局示意）';group.userData.courtyardCount=plots.length;
  group.userData.approximate=true;return {group,plots};
}
