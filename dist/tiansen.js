import {addTiansenStreetDetails} from './tiansen-street-details.js';
import {addTiansenStreetLife,addTiansenBookstore} from './tiansen-street-life.js';
import {createModernSite} from './modern-site.js';
import {addCommerceMallSkin} from './local-commerce-materials.js';
import {schoolGroundMaterial,schoolSurfaceScale} from './school-appearance.js';
import {tiansenSurvey,tiansenBuildings,tiansenNeighbours,tiansenImagePoint,westSiteRecords} from './west-sites-data.js';

export function addTiansen(scene){
  const s=createModernSite(scene,tiansenSurvey,{surfaceMaterialFactory:(color,kind)=>schoolGroundMaterial(color,kind==='pavers'?'paving':kind),surfaceScale:schoolSurfaceScale}),{box,glass,line,sign,pad,trees}=s;
  // Adjacent homes are context, not part of the mall's clickable identity.
  const context=createModernSite(scene,{...tiansenSurvey,id:'tiansen-context',name:'田森西侧住宅街坊'});
  const image=(u,v)=>s.local(tiansenImagePoint(u,v));
  context.surface(tiansenSurvey.contextBoundary.map(s.local),'#9d9b8b',.14);
  s.surface(tiansenSurvey.boundary.map(s.local),'#aba99c',.19);
  const masses=tiansenBuildings.map(p=>s.building(p,{windows:false,photoLevels:true}));
  const skin=addCommerceMallSkin(s.root,masses);
  for(const p of tiansenNeighbours)context.building(p);
  // Continuous retail elevations face Shuncheng Road (east) and Shangxiguan (south).
  for(const p of masses){
    const {u,v,w,d,h,base}=p;
    for(const face of [0,Math.PI/2]){
      const front=face?w/2:d/2;
      // For east elevations the horizontal span is the building's north/south length.
      const length=face?d:w,c=Math.cos(face),sn=Math.sin(face);
      const at=(fn,col,off,y,ww,hh,dd,out=.12)=>fn(col,u+off*c+(front+out)*sn,base+y,v-off*sn+(front+out)*c,ww,hh,dd,face);
      at(glass,'#3f5358',0,2.35,length-1,4.35,.18);
      at(box,'#e0d8bf',0,4.85,length+.1,.85,.45,.3);
      for(let x=-length/2+2;x<length/2;x+=4.5){
        at(box,'#bfb79d',x,2.35,.34,4.5,.5,.3);
        at(box,'#bdc6c2',x+1.5,2.35,.06,4.1,.1,.29);
        at(box,'#806953',x,4.2,3.7,.55,.12,.43);
      }
      for(let y=6;y+2.4<h-.4;y+=3.6){
        at(box,'#ccc0a4',0,y,length,.45,.32,.18);
        for(let x=-length/2+3;x<length/2-1;x+=7.3)at(glass,'#596d70',x,y+1.35,3.8,2.1,.12);
      }
      at(box,'#a59d85',0,h-.3,length+.25,.6,.4,.2);
    }
  }
  const front=masses[0],south=masses[2];
  // Burgundy perforated corner volume, buff lower façade and olive/plum entrance tower.
  box('#8a474b',south.u+south.w/2-9,south.base+11.9,south.v+south.d/2-5,18,7,13);
  for(let x=-7;x<=7;x+=1)for(let y=9.2;y<14.7;y+=.85)box('#b18a81',south.u+south.w/2-9+x,south.base+y,south.v+south.d/2+1.54,.17,.17,.05);
  const eu=front.u+front.w/2+.4,ev=front.v-25,eb=front.base;
  box('#8a8570',eu-2,eb+9.5,ev,5,19,14);
  for(let k=0;k<7;k++)box(k%3===0?'#856777':'#b1ad6d',eu+.58,eb+9.5,ev-6+k*2,.24,18.8,1.8);
  box('#323c3e',eu+.77,eb+13.7,ev,.2,7.6,11);
  // Steel-framed entrance canopy; all geometry opaque to avoid sorting flashes.
  for(const dv of [-6.6,-2.2,2.2,6.6])box('#384446',eu+5.5,eb+2.25,ev+dv,.14,4.5,.14);
  for(let i=0;i<3;i++)box('#9a998d',eu+1.5+i*.45,eb-.08-i*.04,ev,.8,.18-i*.03,13.5);
  sign('田森汇',eu+.99,eb+7.4,ev,12,1.65,Math.PI/2,'#b3ad7e','#694443');
  // Recessed-looking glazed entrance on the existing tower face. The canopy's
  // central aisle reaches these double doors instead of ending at blank cladding.
  box('#2f4143',eu+.81,eb+1.82,ev,.13,3.45,6.4);
  glass('#57747b',eu+.91,eb+1.85,ev,.07,3.15,6.1);
  for(const dv of [-3.05,-1.52,0,1.52,3.05])box('#b9c3b8',eu+.98,eb+1.85,ev+dv,.09,3.2,.065);
  for(const dv of [-.16,.16])box('#d1d4c8',eu+1.05,eb+1.42,ev+dv,.06,.5,.04);
  sign('田森汇 · 城市生活公园',south.u,south.base+5.9,south.v+south.d/2+.38,34,1.5,0,'#c9bea3','#734d45');
  // User confirmed 快乐购 occupies B1 in Tiansen. Use the existing shared east
  // entrance; the exterior sign's placement/style is approximate, not a new mall.
  box('#8d4236',eu+5.85,eb+4.30,ev,.16,1.05,13.4);
  const supermarketSign=sign('快乐购超市 · B1',eu+5.97,eb+4.30,ev,12.7,.9,Math.PI/2,'#8d4236','#f3e6cd');supermarketSign.name='快乐购超市-B1门头';
  box('#8d4236',eu+.95,eb+2.1,ev-8.3,.15,2.7,1.4);
  sign('B1 ↓',eu+1.04,eb+2.55,ev-8.3,1.2,.7,Math.PI/2,'#8d4236','#f3e6cd');
  sign('快乐购',eu+1.04,eb+1.65,ev-8.3,1.2,.45,Math.PI/2,'#8d4236','#f3e6cd');
  // Nested trolley frames alongside the entrance; the central door aisle stays open.
  const cartU=eu+1.9,cartV=ev+10.5,cartBase=s.ground(cartU,cartV);
  for(let i=0;i<4;i++){
    const v=cartV+i*.42;
    for(const du of [-.35,.35]){box('#acb4ad',cartU+du,cartBase+.65,v,.035,.65,.035);box('#acb4ad',cartU+du,cartBase+.98,v,.035,.04,.8);}
    for(const dv of [-.38,.38])box('#acb4ad',cartU,cartBase+.98,v+dv,.72,.04,.04);
    for(let j=-2;j<=2;j++)box('#9ca99f',cartU+j*.14,cartBase+.77,v-.37,.018,.38,.018);
    box('#8d4236',cartU,cartBase+1.13,v-.48,.7,.055,.06);
    for(const du of [-.32,.32])for(const dv of [-.3,.3])s.part('globe','#37433b',cartU+du,cartBase+.29,v+dv,.12,.18,.18);
  }
  s.root.userData.supermarket={name:'快乐购超市',floor:'B1',locationSource:'user-confirmed Tiansen basement, 2026-11-27',exteriorPlacementEstimated:true,entrance:[eu,ev],cartBay:[cartU,cartV,2,3]};

  // Roof plant and raised atrium, kept inside the roof outline.
  glass('#8c9b97',front.u+9,front.base+front.h+.9,front.v,7,1.1,65);
  for(let v=front.v-27;v<=front.v+27;v+=4)box('#bdc2b7',front.u+9,front.base+front.h+1.48,v,7,.08,.09);
  for(let k=0;k<5;k++){box('#a2a69f',front.u-23+k*8,front.base+front.h+.65,front.v-35,3.6,1,2.4);box('#626d6b',front.u-23+k*8,front.base+front.h+1.19,front.v-35,2.8,.09,1.8);}
  // Trace the north side street, west service alley and residential access lanes.
  const paths=[[[490,218],[801,215],[988,202],6],[[804,226],[824,493],4.5],[[501,377],[804,373],4],[[678,223],[684,478],4],[[499,531],[821,498],5]];
  for(const path of paths){const width=path.at(-1);for(let i=0;i<path.length-2;i++)line('#747976',image(...path[i]),image(...path[i+1]),width,.07,.235);}
  for(const [px,py] of [[986,252],[990,302],[992,352],[996,402],[968,489],[894,501],[838,508],[790,315],[691,367],[577,373],[698,447],[779,441]]){
    const [u,v]=image(px,py);pad(u,v,2.2,2.2,'#677859',.26,'soil');trees.tree({x:u,z:v,height:6.8,crown:4.8,base:.28});
  }
  for(const p of [[990,277],[996,378],[958,496],[850,508]]){
    const [u,v]=image(...p),y=s.ground(u,v);s.lamp(u,v);
    box('#526458',u,y+5.42,v,1.6,.09,.1);
    for(const du of [-.72,0,.72]){box('#526458',u+du,y+5.58+(du===0?.35:0),v,.07,.35,.07);s.part('globe','#e8ddbc',u+du,y+5.88+(du===0?.35:0),v,.38,.42,.38);}
  }
  const streetTreePositions=[[986,252],[990,302],[992,352],[996,402],[968,489],[894,501],[838,508]].map(p=>image(...p));
  const streetDetails=addTiansenStreetDetails(s,masses,[eu,ev],streetTreePositions);
  addTiansenStreetLife(s,masses,[eu,ev],streetTreePositions);
  const bookstore=addTiansenBookstore(scene);
  const controller=s.finish(),surroundings=context.finish();
  return {root:controller.root,record:westSiteRecords[0],
    setNight(value){controller.setNight(value);surroundings.setNight(value);bookstore.setNight(value);},
    update(camera){controller.update(camera);surroundings.update(camera);bookstore.update(camera);},
    dispose(){streetDetails.dispose();skin.dispose();controller.dispose();surroundings.dispose();bookstore.dispose();}};
}
