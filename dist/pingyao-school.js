import * as T from 'three';
import {schoolBuildings,schoolLocalBoundary,schoolToWorld,schoolAngle,pingyaoSchoolSurvey,schoolEntrance} from './pingyao-school-data.js';
import {createTreeBatch} from './vegetation.js';
import {resolveBuildingHeight} from './building-heights.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {schoolTexture} from './school-appearance.js';
import {addPingyaoCampusDetails} from './pingyao-school-details.js';

// A self-contained, metre-scale campus. Repeated façade parts share instanced
// meshes. No satellite tiles or third-party photographs are bundled as textures.
export function addPingyaoSchool(scene){
  const root=new T.Group();root.name='山西省平遥中学';
  const [ox,oz]=schoolToWorld(0,0);root.position.set(ox,0,oz);root.rotation.y=schoolAngle;
  root.userData.survey=pingyaoSchoolSurvey;scene.add(root);
  const materials={},textures=[],geometries=new Set(),parts=new Map(),lightParts=[];
  const skin=createCommerceMaterials(root,{chunkSize:1000});
  let seed=47281;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function texture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const ctx=canvas.getContext('2d');
    const colors={paving:'#b5b3ad',road:'#777a7b',grass:'#7b8866',stone:'#747879',brick:'#ae7271'};
    ctx.fillStyle=colors[kind];ctx.fillRect(0,0,512,512);
    for(let i=0;i<6500;i++){
      const light=random()>.5;ctx.fillStyle=light?'rgba(255,255,255,.075)':'rgba(25,28,29,.09)';
      ctx.fillRect(random()*512,random()*512,kind==='stone'?2.8:1.5,kind==='stone'?2.8:1.5);
    }
    if(kind==='stone'){
      ctx.fillStyle='#454c4e';ctx.fillRect(0,0,512,512);
      for(let i=0;i<5200;i++){
        const x=random()*512,y=random()*512,r=1+random()*3;
        ctx.fillStyle=['#d8dcd7','#adb4b2','#293335','#edf0e8'][i%4];
        ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y-r*.7);ctx.lineTo(x+r,y+r*.3);ctx.lineTo(x+r*.2,y+r);ctx.closePath();ctx.fill();
      }
    }
    if(kind==='paving'||kind==='brick'){
      const h=kind==='paving'?128:32,w=kind==='paving'?256:64;
      ctx.strokeStyle=kind==='paving'?'#898d8c':'#9e7370';ctx.lineWidth=kind==='paving'?1.8:1;
      for(let y=0,row=0;y<512;y+=h,row++)for(let x=-w;x<512+w;x+=w)ctx.strokeRect(x+(row%2?w/2:0),y,w,h);
    }
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;textures.push(map);return map;
  }
  materials.solid=new T.MeshStandardMaterial({color:'#ffffff',roughness:.84});
  materials.glass=new T.MeshStandardMaterial({color:'#879caa',metalness:.28,roughness:.27});
  materials.paving=new T.MeshStandardMaterial({map:texture('paving'),roughness:.92});
  materials.road=new T.MeshStandardMaterial({map:texture('road'),roughness:.96});
  materials.grass=new T.MeshStandardMaterial({map:texture('grass'),roughness:1});
  materials.stone=new T.MeshStandardMaterial({map:texture('stone'),roughness:.95});
  materials.glow=new T.MeshStandardMaterial({color:'#e3dbc7',emissive:'#ffcd85',emissiveIntensity:0,roughness:.6});
  materials.silver=new T.MeshStandardMaterial({color:'#c1c4c0',metalness:.72,roughness:.33});
  for(const kind of ['paving','road','grass']){materials[kind].bumpMap=materials[kind].map;materials[kind].bumpScale=kind==='road'?.025:.018;}
  function mesh(geometry,material,name=''){
    geometries.add(geometry);const m=new T.Mesh(geometry,typeof material==='string'?materials[material]:material);
    m.name=name;m.receiveShadow=true;m.castShadow=true;root.add(m);return m;
  }
  function part(kind,color,u,y,v,w,h,d,angle=0){
    const key=['stem','crown'].includes(kind)?kind:'box';const mat=['stem','crown'].includes(kind)?'solid':kind;
    const id=key+':'+mat;if(!parts.has(id))parts.set(id,{key,mat,items:[]});
    parts.get(id).items.push({color,u,y,v,w,h,d,angle});
  }
  const box=(color,...p)=>part('solid',color,...p);
  const glow=(...p)=>part('glow','#ffffff',...p);
  function polygon(points,material,y=.22,name=''){
    const shape=new T.Shape(points.map(([u,v])=>new T.Vector2(u,-v)));
    const geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position,uv=geo.attributes.uv;
    // A 2.4 m texture tile contains 4 rows of 1.2 x 0.6 m paving slabs.
    for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/2.4,pos.getZ(i)/2.4);
    const m=mesh(geo,material,name);m.position.y=y;m.castShadow=false;m.userData.schoolSurface=material;return m;
  }
  function rect(u,v,w,d,material,y=.22,name=''){
    return polygon([[u-w/2,v-d/2],[u+w/2,v-d/2],[u+w/2,v+d/2],[u-w/2,v+d/2]],material,y,name);
  }
  function strip(points,width,material,y=.19,smooth=false,name=''){
    const curve=new T.CatmullRomCurve3(points.map(([u,v])=>new T.Vector3(u,0,v)));
    const line=smooth?curve.getPoints(Math.max(20,points.length*10)):points.map(([u,v])=>new T.Vector3(u,0,v));
    const positions=[],uvs=[],indices=[];
    line.forEach((p,i)=>{
      const prev=line[Math.max(0,i-1)],next=line[Math.min(line.length-1,i+1)],dir=next.clone().sub(prev).normalize();
      // Identical world-space texture coordinates at junctions prevent competing
      // coplanar road patches from showing different patterns when the view moves.
      for(const side of [-1,1]){const u=p.x-dir.z*width*.5*side,v=p.z+dir.x*width*.5*side;positions.push(u,y,v);uvs.push(u/2.4,v/2.4);}
      if(i){const a=(i-1)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    });
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
    const m=mesh(geo,material,name);m.castShadow=false;m.userData.schoolSurface=material;return m;
  }
  function line(a,b,width=.12,color='#e9e6db',y=.27){
    const dx=b[0]-a[0],dz=b[1]-a[1];box(color,(a[0]+b[0])/2,y,(a[1]+b[1])/2,Math.hypot(dx,dz),.025,width,-Math.atan2(dz,dx));
  }
  function textBoard(text,u,y,v,w,h,{background='#d5d5cf',ink='#524342',angle=0,font='STKaiti, KaiTi, serif',lit=false}={}){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
    const ctx=canvas.getContext('2d');if(background){ctx.fillStyle=background;ctx.fillRect(0,0,1024,192);}
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold 112px ${font}`;ctx.fillText(text,512,101,976);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.push(map);
    const mat=new T.MeshStandardMaterial({map,transparent:!background,alphaTest:background?0:.12,roughness:.75,emissive:'#ffce8a',emissiveMap:map,emissiveIntensity:0});
    materials['sign-'+Object.keys(materials).length]=mat;if(lit)lightParts.push(mat);
    const m=mesh(new T.PlaneGeometry(w,h),mat,text);m.position.set(u,y,v);m.rotation.y=angle;m.castShadow=false;return m;
  }

  polygon(schoolLocalBoundary,'grass',.07,'OSM 校园边界地面');
  // Open courts, paved courtyards and paths are separate zones, not one slab.
  rect(243,218,104,65,'paving',.18,'东部浅灰硬质活动场');
  for(let u=197;u<294;u+=16)line([u,188],[u,248],.48,'#929792',.215);
  line([191,218],[295,218],.6,'#929792',.215);
  rect(179,361,112,94,'paving',.20,'教学区浅灰方格广场');
  for(let u=128;u<233;u+=12)line([u,315],[u,407],.22,'#9a9c96',.235);
  for(let v=320;v<406;v+=12)line([124,v],[235,v],.22,'#9a9c96',.235);
  rect(224,52,157,92,'paving',.14,'北部楼群院落');
  rect(126,51,31,93,'paving',.14,'运动场北侧停车场');
  rect(23,326,32,132,'paving',.14,'西侧硬质活动区');
  rect(79,550,140,60,'paving',.14,'南侧楼群铺装');
  rect(177,550,54,56,'paving',.23,'东南门外侧步行前区');
  rect(283,492,30,42,'paving',.16,'东南入口铺装');
  strip([[13,16],[13,234],[13,255],[13,493]],8,'road',.19,false,'西侧校内通路');
  strip([[163,0],[163,95],[163,237],[173,249],[203,252],[221,270],[233,300],[237,319]],8,'road',.19,true,'中部弧形校道');
  strip([[302,0],[302,184],[302,307],[302,516.5],[212,516.5]],8,'road',.19,false,'北门至东南门校道');
  strip(schoolEntrance.approach,8,'road',.19,false,'东南门连续入口通道');
  strip([[15,252],[163,252],[302,252]],6,'road',.19);
  strip([[46,278],[46,345],[54,365],[59,380],[59,395],[64,408],[91,418],[118,453],[158,467],[220,458],[240,455],[246,440],[252,421],[302,421]],7,'road',.19,true,'教学楼外环校道');
  strip([[15,502],[73,502],[115,507],[181,509],[212,509]],7,'road',.19);
  strip([[72,92],[163,92],[302,92]],6,'road',.19);
  // Southern garden has an oval plaza and paths visible from above.
  const oval=Array.from({length:64},(_,i)=>{const a=i*Math.PI/32;return [175+Math.cos(a)*24,484+Math.sin(a)*17];});
  polygon(oval,'paving',.22,'南部椭圆景观广场');
  strip([[175,467],[175,451]],10,'paving',.23);
  strip([[175,501],[175,509]],7,'paving',.23);
  strip([[151,484],[81,484],[81,414]],3,'paving',.23);
  strip([[199,484],[225,484],[225,508]],3,'paving',.23);
  for(const radius of [5,10,15]){
    const p=Array.from({length:65},(_,i)=>[175+Math.cos(i*Math.PI/32)*radius,484+Math.sin(i*Math.PI/32)*radius*.7]);
    strip(p,.3,'stone',.25);
  }

  // Capsule-shaped athletics track, rather than an ellipse or rectangular field.
  function stadium(r,straight=44){
    const points=[];for(let i=0;i<=40;i++){const a=Math.PI+i*Math.PI/40;points.push([65+r*Math.cos(a),139-straight+r*Math.sin(a)]);}
    for(let i=0;i<=40;i++){const a=i*Math.PI/40;points.push([65+r*Math.cos(a),139+straight+r*Math.sin(a)]);}return points;
  }
  materials.track=new T.MeshStandardMaterial({color:'#a36558',roughness:.97});
  materials.turf=new T.MeshStandardMaterial({color:'#567e63',roughness:1});
  for(const [key,kind] of [['track','rubber'],['turf','turf']]){const map=schoolTexture(kind);textures.push(map);materials[key].map=map;materials[key].bumpMap=map;materials[key].bumpScale=.015;}
  polygon(stadium(48),'track',.20,'西北侧田径跑道');
  polygon(stadium(38),'turf',.24,'足球场与弧形内场');
  for(let lane=0;lane<=8;lane++)strip([...stadium(38+lane*1.18),stadium(38+lane*1.18)[0]],.085,'paving',.27);
  for(let v=94;v<185;v+=9)box('#5f8768',65,.26,v,62,.02,4.5);
  for(const x of [33,97])line([x,87],[x,191]);
  for(const v of [87,139,191])line([33,v],[97,v]);
  const circle=Array.from({length:65},(_,i)=>[65+Math.cos(i*Math.PI/32)*9.15,139+Math.sin(i*Math.PI/32)*9.15]);strip(circle,.12,'paving',.29);
  for(const end of [-1,1]){
    const v=139+end*52;line([45,v],[45,v-end*16]);line([85,v],[85,v-end*16]);line([45,v-end*16],[85,v-end*16]);
    for(const u of [61.34,68.66]){box('#dadbd2',u,1.47,v,.13,2.44,.13);box('#d5d7ce',u,1.47,v+end*2,.1,2.44,.1);}
    box('#dadbd2',65,2.71,v,7.45,.13,.13);
    for(let u=61.34;u<=68.67;u+=.45)box('#a1aca3',u,1.47,v+end*2,.025,2.44,.025);
    for(let h=.3;h<2.7;h+=.4)box('#a1aca3',65,h,v+end*2,7.32,.025,.025);
  }
  materials.court=new T.MeshStandardMaterial({color:'#668f9e',roughness:.92});
  materials.courtInner=new T.MeshStandardMaterial({color:'#668675',roughness:.92});
  rect(139,165,38,106,'court',.22,'田径场东侧蓝绿球场');
  for(let k=0;k<3;k++){
    const v=128+k*34;rect(139,v,28,15,'courtInner',.25);
    for(const x of [125,153])line([x,v-7.5],[x,v+7.5]);
    for(const z of [v-7.5,v+7.5])line([125,z],[153,z]);line([139,v-7.5],[139,v+7.5]);
    const c=Array.from({length:33},(_,i)=>[139+Math.cos(i*Math.PI/16)*1.8,v+Math.sin(i*Math.PI/16)*1.8]);strip(c,.10,'paving',.29);
    for(const side of [-1,1]){
      const u=139+side*15;part('stem','#d6d9cf',u,1.9,v,.1,3.4,.1);box('#dfe3dc',u-side,3.32,v,.1,1.05,1.8);
      const hoop=mesh(new T.TorusGeometry(.23,.025,5,16),'solid');hoop.material=materials.solid;hoop.rotation.x=Math.PI/2;hoop.position.set(u-side*1.3,3.05,v);
    }
  }
  for(let i=0;i<3;i++)rect(146+i*31,411,28,13,'court',.22,'教学区南侧蓝色场地');

  const heightRecords=[];
  for(const b of schoolBuildings){
    const [x,z]=schoolToWorld(b.u,b.v);
    const heightInfo=resolveBuildingHeight({x,z,buildingType:'public',levels:b.levels,storeyHeight:3.55,source:b.levelsSource});
    heightInfo.confidence=b.confidence;
    const h=heightInfo.height,base=.27,c=Math.cos(b.angle),s=Math.sin(b.angle);
    const p=(du,dv)=>[b.u+du*c+dv*s,b.v-du*s+dv*c];
    function block(color,du,y,dv,w,hh,d,kind='solid'){
      const [u,v]=p(du,dv);part(kind,color,u,y+base,v,w,hh,d,b.angle);
    }
    heightRecords.push({...heightInfo,id:b.id,name:`平遥中学 · ${b.name}`,x,z,w:b.w,d:b.d,angle:schoolAngle+b.angle,footprintSource:b.footprintSource,levelsSource:b.levelsSource});
    block('#898783',0,.25,0,b.w+.4,.5,b.d+.4);
    block(b.color,0,h/2+.4,0,b.w,h,b.d);
    skin.box('brick',b.color,b.u,base+h/2+.4,b.v,b.w+.025,h,b.d+.025,b.angle);
    skin.box('stone','#63686a',b.u,base+.53,b.v,b.w+.43,1.05,b.d+.43,b.angle);
    block('#e5e4dc',0,h+.6,0,b.w+.5,.8,b.d+.5);
    block(b.roof==='blue'?'#5e829f':'#7e8280',0,h+1.05,0,b.w-.7,.11,b.d-.7);
    // White coping, floor bands, repeated piers, recessed blue-grey glazing.
    for(const side of [-1,1]){
      const facade=side*(b.d/2+.09);
      for(let floor=0;floor<b.levels;floor++){
        const y=2.25+floor*3.55;
        block('#d9d9d3',0,y-1.37,facade,b.w,.22,.18);
        const count=Math.max(2,Math.floor((b.w-2)/4.6)),step=(b.w-2)/count;
        for(let col=0;col<count;col++){
          const du=-b.w/2+1+step*(col+.5),ww=step*.76;
          block('#ecece5',du,y,facade,ww+ .2,2,.14);
          block('#ffffff',du,y,facade+side*.10,ww,1.78,.10,'glass');
          for(const off of [-ww/6,ww/6])block('#e7e9e4',du+off,y,facade+side*.17,.07,1.83,.06);
          block('#dde1dc',du,y+.28,facade+side*.18,ww,.065,.06);
          block('#e0dfd5',du,y-1.08,facade+side*.24,ww+.36,.15,.48);
          if((col+floor)%5===1)block('#d4ccb7',du-ww*.32,y,facade+side*.16,ww*.22,1.66,.025);
        }
      }
      for(let du=-b.w/2;du<=b.w/2+.1;du+=b.w/Math.max(2,Math.round(b.w/9)))block('#d6d6ce',du,h/2+.5,facade+.14*side,.30,h,.28);
      // Recessed entrance with a canopy and shallow steps on each long façade.
      block('#424f54',0,1.65,facade+side*.2,3.5,2.7,.15);
      block('#e1ded3',0,3.2,facade+side*1.1,5.2,.27,2.5);
      for(let i=0;i<3;i++)block('#b8b8b1',0,.08+i*.08,facade+side*(1.8-i*.32),4.3,.16,1.4-i*.32);
      block('#d5dedb',0,1.65,facade+side*.31,.065,2.65,.06);
      for(const off of [-.22,.22])block('#b7c0bc',off,1.45,facade+side*.38,.05,.48,.07);
      for(const du of [-b.w/2+1,b.w/2-1]){
        block('#b2b4aa',du,h/2+.5,facade+side*.36,.12,h,.12);
        for(let y=1;y<h;y+=3.55)block('#787e75',du,y,facade+side*.36,.23,.07,.2);
      }
    }
    for(const side of [-1,1])for(let floor=0;floor<b.levels;floor++){
      const face=side*(b.w/2+.09),y=2.25+floor*3.55;
      // A long connecting wing exposes its side to the courtyard. Repeating a
      // single end-wall window here used to leave a 100 m blank brick facade.
      const count=Math.max(1,Math.floor((b.d-2)/4.6)),step=(b.d-2)/count,ww=step*.76;
      block('#d9d9d3',face,y-1.37,0,.18,.22,b.d);
      for(let col=0;col<count;col++){
        const dv=-b.d/2+1+step*(col+.5);
        block('#ecece5',face,y,dv,.14,2,ww+.2);
        block('#ffffff',face+side*.1,y,dv,.1,1.78,ww,'glass');
        for(const off of [-ww/6,ww/6])block('#e7e9e4',face+side*.17,y,dv+off,.06,1.83,.07);
        block('#dde1dc',face+side*.18,y+.28,dv,.06,.065,ww);
        block('#e0dfd5',face+side*.24,y-1.08,dv,.48,.15,ww+.36);
      }
    }
    if(b.roof==='metal'||b.roof==='blue')for(let u=-b.w/2+.5;u<b.w/2;u+=1.4)block(b.roof==='blue'?'#6d91af':'#d5d8d3',u,h+1.13,0,.14,.10,b.d-.8);
    if(b.roof==='flat'){
      skin.box('roof','#747b78',b.u,base+h+1.065,b.v,b.w-.8,.12,b.d-.8,b.angle);
      for(let du=-b.w/2+5;du<b.w/2-3;du+=13){block('#a8aaa0',du,h+1.4,-b.d*.22,.7,.6,.7);block('#d3d2c7',du,h+1.75,-b.d*.22,1,.12,1);}
    }
    if(b.id.startsWith('front-')){
      for(const side of [-1,1])block('#fff1ce',side*(b.w/2-.4),h/2+.5,b.d/2+.37,.075,h,.075,'glow');
      block('#fff1ce',0,h+.74,b.d/2+.37,b.w,.08,.08,'glow');
      // 2024 completed lighting scheme: horizontal cornices and tall vertical
      // bays, with much darker glass between them, not uniformly bright walls.
      for(let floor=1;floor<=b.levels;floor++)block('#ffdf9a',0,floor*3.55-.14,b.d/2+.45,b.w-.45,.07,.08,'glow');
      for(let u=-b.w/2+1;u<b.w/2;u+=8.5)block('#ffe6b2',u,h/2+.5,b.d/2+.43,.065,h,.08,'glow');
      if(b.id==='front-center')for(const side of [-1,1]){
       block('#66655d',side*12,h/2+1.0,b.d/2+.50,2.1,h+1.2,.58);
       for(const dx of [-1.12,1.12])block('#e4e1d2',side*12+dx,h/2+1,b.d/2+.82,.12,h+1.3,.12);
       block('#ffe4a4',side*12-1.20,h/2+1,b.d/2+.91,.075,h+1.3,.075,'glow');
       block('#d5d0bc',side*12,h+1.7,b.d/2+.5,3,.45,1.2);
      }

    }
  }
  root.userData.heightRecords=heightRecords;

  // The 2026-07 campus photo shows ashlar wall panels, a dark plinth and exposed
  // silver ventilation ducts. Apply this construction language to service ends;
  // the photo does not establish the museum's map footprint, so no new named building.
  for(const id of ['central-hall','east-service-2']){
   const b=schoolBuildings.find(p=>p.id===id),u=b.u+b.w/2+.52,v=b.v-b.d*.26;
   skin.box('metal','#a9afad',u,5.3,v,.55,9.4,.58);
   for(let y=1;y<10;y+=.6)box('#6e7776',u+.30,y,v,.05,.04,.62);
   skin.box('metal','#bdc2bb',u-.65,9.8,v,1.8,.65,.65);
   for(let z=b.v-5;z<b.v+5;z+=1.1)skin.box('stone','#bab9b3',u-.25,.7,z,.18,1.1,1.05);
  }
  root.userData.photoReview={checked:'2026-11-27',recentPhotoDate:'2026-07-07',recentSource:'https://www.sxie.edu.cn/xny/info/1022/3635.htm',lightingSource:'https://www.sohu.com/a/799102701_121123761',lightingDate:'2024-08-01',features:['dark stone plinth','silver exterior ducts','science-building piers and cornice lighting','paired outside stairs','concentric sculpture platform','faceted metal sphere'],estimated:true,museumLocationVerified:false};


  // Photo-referenced curved white name wall and the red-and-white entrance façade.
  const wallShape=new T.Shape();wallShape.moveTo(-16,0);wallShape.lineTo(12,0);wallShape.quadraticCurveTo(16,.2,16,4.5);wallShape.lineTo(16,5.8);wallShape.lineTo(-16,5.8);wallShape.closePath();
  const [wallU,wallV]=schoolEntrance.wall;
  const wall=mesh(new T.ExtrudeGeometry(wallShape,{depth:.85,bevelEnabled:true,bevelSize:.12,bevelThickness:.1,bevelSegments:2,steps:1}),'solid','白色弧角校名景墙');wall.position.set(wallU,.35,wallV);
  // Instance color cannot tint a standalone shared material, so use its own stone-white material.
  materials.nameWall=new T.MeshStandardMaterial({color:'#d7d7d1',roughness:.82});wall.material=materials.nameWall;
  box('#a3a8a3',wallU,.28,wallV+.6,33,.36,2.6);
  box('#ebece5',wallU,6.26,wallV+.35,32.4,.18,1.2);
  textBoard('山西省平遥中学',wallU,3.5,wallV+.98,27.5,2.45,{lit:true});
  textBoard('科 技 楼',178,14.1,444.0,16,1.0,{background:'#a67463',ink:'#c43732',lit:true});
  textBoard('平 遥 中 学',213,17.35,445.0,25,1.6,{background:null,ink:'#bd3d3d',lit:true});
  textBoard('中 国 百 强',144,17.35,444.5,24,1.6,{background:null,ink:'#bd3d3d',lit:true});
  for(let u=134;u<=155;u+=7)box('#acaaa3',u,16.2,444.4,.09,1.5,.09);
  for(let u=202;u<=224;u+=7)box('#acaaa3',u,16.2,444.9,.09,1.5,.09);
  for(const [u,v,w]of [[144,444.4,24],[213,444.9,25]])box('#878d89',u,16.98,v,w,.065,.09);
  // Long open portico alongside the west block, visible to the left in the photo.
  for(let v=403;v<482;v+=9){box('#e0ded5',58,2.25,v,.34,4,.34);box('#a66660',58,4.3,v,5.8,.24,.22);}
  box('#a3655e',58,4.47,442,5.7,.18,79);
  // The dated lighting photo shows a split metal silhouette on concentric
  // stone platforms. Place it in the existing oval court; the exact form is approximate.
  const red=new T.MeshStandardMaterial({color:'#8e3338',metalness:.38,roughness:.48});materials.sculpture=red;
  for(const [r,y,h]of [[8.8,.35,.20],[5.4,.57,.22]]){const plinth=mesh(new T.CylinderGeometry(r,r,h,64),'paving','科技楼前圆形石材台阶');plinth.position.set(175,y,484);}
  skin.box('stone','#555d5a',175,1.15,484,4.6,.95,3.2);
  const left=new T.Shape();left.moveTo(-.7,0);left.bezierCurveTo(-2.5,2,-.6,3.2,-2.2,4.7);left.lineTo(-3.25,6);left.quadraticCurveTo(-1.85,5.9,-2.3,6.6);left.lineTo(-3.4,7.2);left.quadraticCurveTo(-1.9,7.1,-2.6,7.9);left.lineTo(-3.2,9.6);left.bezierCurveTo(-1.3,8.2,-1.9,6.5,-.7,5.5);left.bezierCurveTo(1.6,4.1,.6,2.4,.2,0);left.closePath();
  for(const [x,y,rx,ry]of [[-.45,4.1,.62,.55],[-1.55,6.1,.26,.17],[-1.85,7.2,.26,.17],[-2.25,8.2,.23,.16]]){const hole=new T.Path();hole.absellipse(x,y,rx,ry,0,Math.PI*2,true);left.holes.push(hole);}
  const right=new T.Shape();right.moveTo(.25,0);right.bezierCurveTo(2.2,1.5,.2,3,1.4,4.2);right.bezierCurveTo(3.4,5.1,3.4,7.4,3.1,9.6);right.bezierCurveTo(5.2,7.4,3.9,5.3,2.7,3.8);right.bezierCurveTo(1.4,2.1,2.5,.9,1.25,0);right.closePath();
  for(const shape of [left,right]){const sculpture=mesh(new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSize:.06,bevelThickness:.05,bevelSegments:1,steps:1}),red,'科技楼前抽象雕塑（照片近似）');sculpture.position.set(175,1.63,484);}
  for(let i=0;i<7;i++)box('#c6c8c1',178,.34+i*.19,445.9-i*.45,19,.25,1.4);
  // Paired external stairs ascend to the science building's first upper floor.
  for(const u of [154,202]){
   for(let i=0;i<14;i++){const y=.27+(i+1)*.255;skin.box('stone','#b0b4b1',u,y/2,453-i*.48,3.1,y,.5);}
   for(const side of [-1,1])for(let i=0;i<14;i++){
    const v=453-i*.48,y=.27+(i+1)*.255;
    box('#e1e2d9',u+side*1.68,y+.56,v,.17,1.1,.5);glow(u+side*1.79,y+1.12,v,.07,.07,.52);
   }
   skin.box('stone','#b8bbb1',u,3.87,445.9,3.55,.25,1.1);
  }
  materials.dome=new T.MeshStandardMaterial({color:'#b2ad92',metalness:.75,roughness:.3,flatShading:true});
  const globe=mesh(new T.IcosahedronGeometry(4.3,2),materials.dome,'主楼屋顶金属球体');globe.position.set(178,20.3,431);
  for(let i=0;i<8;i++){
    const ring=mesh(new T.TorusGeometry(4.32,.025,4,40),'solid');ring.rotation.y=i*Math.PI/8;ring.position.copy(globe.position);
  }
  for(const lat of [-.65,-.32,0,.32,.65]){
    const ring=mesh(new T.TorusGeometry(4.32*Math.sqrt(1-lat*lat),.025,4,40),'solid');ring.rotation.x=Math.PI/2;ring.position.set(178,20.3+4.32*lat,431);
  }
  box('#d9d9cf',178,15.9,431,8.9,1,8.9);
  // Lightweight open mast, offset from the sphere as in the supplied reference.
  for(let y=16;y<33;y+=2){
    const spread=(34-y)*.07;
    for(const side of [-1,1])box('#a5adac',187+spread*side,y+1,430,.09,2,.09);
    box('#a5adac',187,y,430,spread*2,.08,.08);
  }
  for(const {u,v,year,angle} of schoolEntrance.historyWalls){
    // Low red sandstone panel with a projecting speckled-stone seat and end fin.
    // The bases face the street, while the two rows remain visibly separate.
    const c=Math.cos(angle),s=Math.sin(angle),at=(du,dv)=>[u+du*c+dv*s,v-du*s+dv*c];
    function plaquePart(kind,color,du,y,dv,w,h,d){const [x,z]=at(du,dv);part(kind,color,x,y,z,w,h,d,angle);}
    plaquePart('stone','#ffffff',-.5,.55,.85,4.7,.60,1.35);
    plaquePart('solid','#bd8b76',0,1.22,0,4.9,1.80,.30);
    plaquePart('solid','#ae7965',2.42,1.30,.16,.26,2,.65);
    const [tx,tz]=at(-1,.17);
    if(year)textBoard(year,tx,1.68,tz,2.1,.56,{background:'#bd8b76',ink:'#743f31',font:'serif',angle,lit:true});
    for(let k=0;k<4;k++)plaquePart('solid','#a47863',-.15,1.22-k*.13,.17,3.55-k*.22,.025,.02);
  }
  // Gate and guardhouse belong at the outer entrance, beyond the oval garden.
  const [gateU,gateV]=schoolEntrance.gate;
  box('#ae7271',gateU-11,1.9,gateV,6,3.4,4);box('#e1e2d9',gateU-11,3.7,gateV,6.4,.25,4.4);
  part('glass','#ffffff',gateU-11,2.15,gateV+2.06,4.8,1.5,.1);
  for(let i=0;i<9;i++)box('#afb8b5',gateU-8+i*.14,1.18,gateV,.07,1.8,.6);
  // The photo shows waist-height silver entrance barriers with blue infill,
  // not a masonry-backed fence spanning the entire public frontage.
  for(const [start,end,v] of schoolEntrance.barriers){
    const count=Math.ceil((end-start)/3.4),length=(end-start)/count;
    for(let i=0;i<count;i++){
      const u=start+(i+.5)*length;
      for(const du of [-length/2,length/2]){
        box('#cbd1cd',u+du,.86,v,.075,1.25,.075);
        box('#969f9c',u+du,.3,v,.35,.12,.65);
      }
      for(const y of [.48,1.42])box('#d8dcd6',u,y,v,length,.075,.075);
      box('#e1e5dc',u,.94,v,length-.20,.75,.10);
      box('#2476a4',u,.94,v+.062,length-.48,.52,.025);
      // Blank pale bands suggest the photographed information boards; no
      // invented slogans, seals or institutional logos are transcribed.
      for(let k=0;k<2;k++)box('#e5eef0',u,.99-k*.14,v+.082,length-.94,.055,.014);
    }
  }
  // Open curb along the history garden, with a pedestrian gap at its east end.
  for(let v=530;v<577;v+=1.2)box('#b5b9b1',200,.31,v,1.16,.36,.28,Math.PI/2);
  for(let k=0;k<3;k++){
    const u=192+k*2.5;part('stem','#c6ccc5',u,7.3,449,.09,14,.09);box('#a4aaa4',u,.45,449,1,.5,1);
  }
  box('#bd3c36',193.15,12.8,449,2.2,1.4,.045);

  // Keep the simplified perimeter only behind the entrance frontage. A mapped
  // land-use boundary must not create an enclosing fence across the public apron.
  const openings=[[300,0,10],[175,0,10],[214,520,12],[212,580,10],[107,580,8]];
  for(let i=0;i<schoolLocalBoundary.length-1;i++){
    const a=schoolLocalBoundary[i],b=schoolLocalBoundary[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/2.8);
    for(let j=0;j<n;j++){
      const u=a[0]+(b[0]-a[0])*(j+.5)/n,v=a[1]+(b[1]-a[1])*(j+.5)/n;
      if(v>=518)continue;
      if(openings.some(([x,z,r])=>Math.hypot(u-x,v-z)<r))continue;
      const yaw=-Math.atan2(b[1]-a[1],b[0]-a[0]);
      skin.box('stone','#918e86',u,.5,v,len/n,.65,.38,yaw);box('#c0c2b8',u,1.7,v,.22,2,.45,yaw);
      box('#d3d2c5',u,.87,v,len/n,.12,.5,yaw);
      for(const y of [1,2.35])box('#52615c',u,y,v,len/n,.06,.06,yaw);
      for(const off of [-.9,-.45,0,.45,.9])box('#52615c',u+off*Math.cos(yaw),1.65,v-off*Math.sin(yaw),.045,1.35,.045,yaw);
    }
  }
  // Tree rows are registered to the visible landscape strips; species approximate.
  const trees=createTreeBatch(root,{leafDensity:16,park:true});let treeCount=0;
  function tree(u,v,h=7.2,crown=4.2){
    if(schoolBuildings.some(b=>{const du=u-b.u,dv=v-b.v,c=Math.cos(b.angle),s=Math.sin(b.angle);return Math.abs(du*c-dv*s)<b.w/2+crown*.45&&Math.abs(du*s+dv*c)<b.d/2+crown*.45;}))return;
    trees.tree({x:u,z:v,height:h,crown,base:.14});treeCount++;
    for(let k=0;k<5;k++){
      const a=k*2.4+u*.13,spread=k===4?0:crown*.18;
      part('crown',['#657b4f','#738556','#5d754c'][k%3],u+Math.cos(a)*spread,.14+h*(k===4?.87:.74),v+Math.sin(a)*spread,crown*.56,crown*.48,crown*.54,a);
    }
  }
  for(let v=100;v<250;v+=14)tree(170,v);
  for(let v=285;v<405;v+=15){tree(55,v);tree(123,v);tree(236,v);}
  for(let u=199;u<299;u+=14){tree(u,181);tree(u,256);}
  for(let v=20;v<505;v+=24)tree(295,v,7.8,4.4);
  for(let u=129;u<232;u+=14)tree(u,309,7.4,4.6);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;tree(175+Math.cos(a)*31,484+Math.sin(a)*23,6.2,3.6);}
  for(const v of [533,547,561])tree(151,v,6.8,3.2);
  for(const [u,v] of [[82,464],[81,443],[76,422],[252,278],[278,280],[270,302],[209,285],[141,275],[137,297],[63,509],[95,512]])tree(u,v,7.7,5.2);
  for(const [u,v,w,d] of [[265,273,45,3],[279,303,3,21],[78,445,3,60],[249,463,4,39],[222,496,3,17]]){
    box('#687957',u,.42,v,w,.62,d);
    for(let i=0;i<Math.max(w,d);i+=4)trees.shrub(u+(w>d?i-w/2:0),v+(d>=w?i-d/2:0),1.5,.6,.15);
  }
  addPingyaoCampusDetails({root,skin,box,part,line,trees,tree});
  trees.finish();root.userData.treeCount=treeCount;
  const lamps=[];
  for(const [u,v] of [[181,476],[204,466],[129,465],[112,486],[198,509],[204,534],[218,558],[237,325],[237,395],[123,324],[123,392],[163,264],[175,209],[175,138],[302,56],[302,255]]){
    part('stem','#596563',u,3.1,v,.13,5.9,.13);box('#626f69',u,6.08,v,.85,.13,.85);glow(u,5.96,v,.67,.09,.67);lamps.push([u,5.8,v]);
    box('#aaa9a0',u,.4,v,.45,.55,.45);
  }
  // Benches, drains and planter rims stay off the main pedestrian axis.
  for(const [u,v] of [[144,485],[206,485],[125,400],[232,400],[199,264],[271,264]]){
    for(const side of [-1,1])box('#5d6963',u+side*.9,.45,v,.12,.62,.6);
    for(let i=0;i<4;i++)box('#89745b',u,.72,v-.28+i*.18,2.3,.10,.12);
  }
  for(let u=129;u<231;u+=17){box('#666d68',u,.245,408,1.6,.025,.28);for(let i=0;i<7;i++)box('#91958c',u-.67+i*.2,.265,408,.045,.025,.25);}

  const boxGeometry=new T.BoxGeometry(1,1,1),stemGeometry=new T.CylinderGeometry(.42,.5,1,8),crownGeometry=new T.IcosahedronGeometry(.5,1);
  geometries.add(boxGeometry);geometries.add(stemGeometry);geometries.add(crownGeometry);const transform=new T.Object3D(),color=new T.Color();
  for(const {key,mat,items} of parts.values()){
    const m=new T.InstancedMesh(key==='stem'?stemGeometry:key==='crown'?crownGeometry:boxGeometry,materials[mat],items.length);
    m.name='平遥中学实例化构件 · '+mat;
    items.forEach((p,i)=>{transform.position.set(p.u,p.y,p.v);transform.rotation.set(0,p.angle,0);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();m.setMatrixAt(i,transform.matrix);m.setColorAt(i,color.set(p.color));});
    m.castShadow=mat!=='glow';m.receiveShadow=true;m.computeBoundingSphere();root.add(m);
  }
  const detailSkin=skin.finish();
  detailSkin.meshes.forEach(m=>m.name=m.name.replace('生活街区材质','平遥中学校园材质'));
  const points=Array.from({length:3},()=>{const p=new T.PointLight('#ffda9d',0,24,2);p.castShadow=false;p.visible=false;root.add(p);return p;});
  let night=false,lastUpdate=-Infinity,disposed=false;
  return {root,setNight(value){
    night=value;detailSkin.setNight(value);materials.glow.emissiveIntensity=value?2.2:0;lightParts.forEach(m=>m.emissiveIntensity=value?.8:0);
    if(!value)points.forEach(p=>{p.visible=false;p.intensity=0;});lastUpdate=-Infinity;
  },update(camera,now){
    if(disposed||now-lastUpdate<250)return;lastUpdate=now;
    const local=root.worldToLocal(camera.position.clone());
    const nearest=night&&local.y<75?lamps.map(p=>({p,d:Math.hypot(p[0]-local.x,p[2]-local.z)})).filter(p=>p.d<50).sort((a,b)=>a.d-b.d).slice(0,3):[];
    points.forEach((light,i)=>{light.visible=!!nearest[i];light.intensity=nearest[i]?24:0;if(nearest[i])light.position.fromArray(nearest[i].p);});
  },dispose(){
    if(disposed)return;disposed=true;root.removeFromParent();detailSkin.dispose();
    root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material])materials[mat.uuid]=mat;});
    geometries.forEach(g=>g.dispose());new Set(Object.values(materials)).forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();
  }};
}
