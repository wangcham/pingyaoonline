import * as T from 'three';
import {createUrbanBatch} from './urban-batch.js';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {createTreeBatch} from './vegetation.js';

export const theaterStops = [
  {name:'又见平遥 · 入口广场',keywords:'又见平遥剧场 票务 售票 入口',address:'剧场南侧广场 · 外观按地图轮廓和公开照片建模',eye:[-1272,2.8,548],target:[-1250,8,505]},
  {name:'又见平遥 · 瓦顶与夯土墙',keywords:'又见平遥剧场 航拍 屋顶 瓦顶',address:'剧场外观 · 观察起伏瓦顶',eye:[-1311,33,541],target:[-1250,10,452]},
];

function theaterTexture(kind) {
  const canvas=document.createElement('canvas');
  canvas.width=256;
  canvas.height=256;
  const g=canvas.getContext('2d');
  const face=kind==='earth';
  g.fillStyle=face?'#b78350':'#454744';
  g.fillRect(0,0,256,256);
  let seed=123;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  if (face) {
    for(let y=0;y<256;y+=13+random()*9) {
      const edge=[];for(let x=0;x<=256;x+=4)edge.push([x,y+(random()-.5)*3]);
      g.beginPath();g.moveTo(0,y-4);for(const [x,z]of edge)g.lineTo(x,z);g.lineTo(256,y+7);g.lineTo(0,y+7);g.closePath();g.fillStyle='#72472b50';g.fill();
      g.beginPath();for(const [i,[x,z]]of edge.entries())i?g.lineTo(x,z-1):g.moveTo(x,z-1);g.strokeStyle='#efbb864c';g.lineWidth=2;g.stroke();
    }
    for(let i=0;i<4500;i++) {
      g.fillStyle=random()<.45?'#5f422e32':'#ead0aa28';
      g.fillRect(random()*256,random()*256,1+random()*3,1);
    }
  } else {
    for(let y=0;y<256;y+=16) {
      for(let x=-16;x<256;x+=24) {
        const shade=58+Math.floor(random()*21);
        const xx=x+(y%32?12:0);
        g.fillStyle=`rgb(${shade},${shade+2},${shade})`;
        g.fillRect(xx,y,23,15);
        g.fillStyle='#a6a08f7d';
        g.fillRect(xx+2,y,20,1.5);
        g.fillStyle='#1b1d1b7f';
        g.fillRect(xx+21,y,2,15);
      }
    }
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.anisotropy=8;
  return texture;
}

export function addTheater(scene, legacyBox, namedBoard) {
  const theater=new T.Group();
  theater.position.set(-1253,0,443.4);
  theater.rotation.y=.132;
  theater.name='又见平遥剧场细化';scene.add(theater);
  const batch=createUrbanBatch(theater),skin=createCommerceMaterials(theater),trees=createTreeBatch(theater,{leafDensity:20});
  const box=(group,color,...p)=>batch.box(color,...p);

  const earth=new T.MeshStandardMaterial({map:theaterTexture('earth'),side:T.DoubleSide,roughness:1});
  earth.bumpMap=earth.map;earth.bumpScale=.16;
  const tile=new T.MeshStandardMaterial({map:theaterTexture('tile'),side:T.DoubleSide,roughness:.82});
  tile.bumpMap=tile.map;tile.bumpScale=.065;
  function quad(a,b,c,d,material,scale=5) {
    const meshGeo=new T.BufferGeometry();
    meshGeo.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...d],3));
    const u=Math.hypot(...b.map((v,i)=>v-a[i]))/scale;
    const v=Math.hypot(...d.map((v,i)=>v-a[i]))/scale;
    const points=[a,b,c,d],horizontal=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))>Math.max(...points.map(p=>p[2]))-Math.min(...points.map(p=>p[2]))?0:2;
    meshGeo.setAttribute('uv',new T.Float32BufferAttribute(material===earth?points.flatMap(p=>[p[horizontal]/scale,p[1]/scale]):[0,0,u,0,u,v,0,v],2));
    meshGeo.setIndex([0,1,2,0,2,3]);
    meshGeo.computeVertexNormals();
    const mesh=new T.Mesh(meshGeo,material);
    mesh.receiveShadow=true;
    mesh.castShadow=true;
    theater.add(mesh);
  }

  // Angular loess walls and dark, overlapping roof planes fit the mapped theater footprint.
  box(theater,'#ac794e',0,1.9,0,83,3.8,133);
  const profiles=[
    {left:-43,right:-23,ridge:-33,a:3.8,b:6.05,c:4.1,front:65},
    {left:-27,right:-5,ridge:-18,a:4.1,b:8.15,c:4.4,front:61},
    {left:-10,right:16,ridge:0,a:4.4,b:6.75,c:4.4,front:68},
    {left:10,right:31,ridge:19,a:3.8,b:8.85,c:4.7,front:64},
    {left:24,right:43,ridge:34,a:4.7,b:6.4,c:3.8,front:60},
  ];
  for (const profile of profiles) {
    const {left,right,ridge,front,a,b,c}=profile;
    const back=-68;
    quad([left,a,front],[ridge,b,front-4],[ridge,b-.68,back],[left,a-.24,back],tile,3.3);
    quad([ridge,b,front-4],[right,c,front],[right,c-.24,back],[ridge,b-.68,back],tile,3.3);
    quad([left,4,front-.4],[right,4,front-.4],[right,c,front],[left,a,front],earth,6);
    quad([left,a,front],[ridge,b,front-4],[right,c,front],[right,c,front],earth,6);
    quad([left,3.5,back],[right,3.5,back],[right,c-.24,back],[left,a-.24,back],earth,6);
    quad([left,a-.24,back],[ridge,b-.68,back],[right,c-.24,back],[right,c-.24,back],earth,6);
    quad([left,3.5,front],[left,3.5,back],[left,a-.24,back],[left,a,front],earth,6);
    quad([right,3.5,back],[right,3.5,front],[right,c,front],[right,c-.24,back],earth,6);
  }

  // Entrance slots, ticket windows and the long textured public facade.
  const entries=[[-31,10,'检票口'],[-14,9,'检票口'],[2,10,'售票处'],[20,11,'票务处']];
  for(const [x,width,title] of entries) {
    box(theater,'#a16e43',x,2.05,69,width+1,4.1,3.3);
    box(theater,'#33322f',x,1.65,70.685,width,3.25,.08);
    box(theater,'#6a7775',x,1.7,70.737,width*.83,2.9,.06);
    box(theater,'#553f31',x,1.7,70.81,.13,3.05,.12);
    box(theater,'#4f4436',x,3.85,71,width+1.7,.3,1.24);
    namedBoard(theater,title,x,3.38,70.79,width*.7,.9,0,'#63462f');
    for(const side of [-1,1]){const u=x+side*(width/2+.25);quad([u-.25,0,70.66],[u+.25,0,70.66],[u+.25,4.1,70.66],[u-.25,4.1,70.66],earth,3.2);}
    quad([x-width/2-.5,3.3,70.66],[x+width/2+.5,3.3,70.66],[x+width/2+.5,4.1,70.66],[x-width/2-.5,4.1,70.66],earth,3.2);
  }
  // The facade uses the photo-referenced red seal below; no floating roof title.

  // OSM's separate southern building is 47.7 × 38.1 m, almost centred on
  // the main volume. The former 30 × 16 m eastern block was undersized.
  // Its low roof and entry treatment are photo/imagery interpretations.
  const ticket={x:3.2,z:123.4,width:47.7,depth:38.1};
  skin.box('stone','#a67c56',ticket.x,2.3,ticket.z,ticket.width,4.6,ticket.depth);
  box(theater,'#514c43',ticket.x,4.70,ticket.z,ticket.width+.35,.20,ticket.depth+.35);
  for(let i=0;i<8;i++){
    const x=ticket.x-ticket.width/2+2.3+i*6.1;
    box(theater,'#b1a28b',x,4.91,ticket.z,.24,.22,ticket.depth+.45);
    box(theater,'#797d72',x+.28,4.83,ticket.z,.18,.045,ticket.depth);
  }
  box(theater,'#58706c',ticket.x,1.85,104.25,21,2.65,.14);
  for(let i=-3;i<=3;i++)box(theater,'#c5b59a',ticket.x+i*3,1.85,104.15,.1,2.7,.14);
  box(theater,'#776b57',ticket.x,3.3,103.8,23,.18,1.5);
  namedBoard(theater,'又见平遥 · 售票中心',ticket.x,3.95,104.12,22,.8,Math.PI,'#684b34');

  // Plaza paving, seating and low lamps follow the public-side approach.
  skin.box('stone','#aaa396',-1,.06,89,99,.12,42);
  skin.box('paving','#c3b49e',0,.134,89,64,.035,42);
  for(let lane=-7;lane<=7;lane++) box(theater,'#ac9e8b',lane*4.55,.155,89,.035,.01,42);
  for(let row=0;row<10;row++) box(theater,'#ac9e8b',0,.156,69+row*4.5,64,.012,.035);
  for(const side of [-1,1]) {
    for(let i=0;i<3;i++) {
      const z=78+i*12;
      box(theater,'#b5aa95',side*37,.20,z,5.4,.4,5.8);
      box(theater,'#676e54',side*37,.42,z,4.9,.08,5.3);
      box(theater,'#786354',side*33,.49,z,2.1,.35,.58);
      box(theater,'#6c5943',side*44,.69,z+2,.22,1.38,.22);
      box(theater,'#e1cc9d',side*44,1.32,z+2,.24,.12,.24);
    }
  }
  // Full side walls carry the same layered earth material as the roof gables.
  for(const side of [-1,1])quad([side*41.53,.1,-66.5],[side*41.53,.1,66.5],[side*41.53,3.8,66.5],[side*41.53,3.8,-66.5],earth,3.2);
  quad([-41.5,0,66.51],[41.5,0,66.51],[41.5,3.8,66.51],[-41.5,3.8,66.51],earth,3.2);
  for(const side of [-1,1])skin.box('stone','#74644e',side*41.6,.35,0,.3,.65,133);
  // Public photo's corner: copper coping, layered earth and dark curved-tile
  // infill. This is a facade interpretation, not a surveyed entrance relocation.
  box(theater,'#aa7952',35.7,2.6,66.6,11.4,5.2,1.2);
  quad([30,0,67.21],[41.4,0,67.21],[41.4,5.2,67.21],[30,5.2,67.21],earth,3.2);
  box(theater,'#936b4e',35.7,5.25,66.9,11.7,.18,1.6);
  box(theater,'#bd895f',35.7,5.38,67.24,11.7,.08,.7);
  box(theater,'#292b28',29.25,2.55,67.13,1.35,4.85,.13);
  const slotGeo=new T.TorusGeometry(.15,.022,4,8,Math.PI),slotRows=[];
  for(let y=.22,row=0;y<4.9;y+=.16,row++)for(let x=28.7;x<29.9;x+=.30)slotRows.push([x+(row%2?.08:0),y,67.25]);
  const slotMesh=new T.InstancedMesh(slotGeo,new T.MeshStandardMaterial({color:'#54554c',roughness:.95}),slotRows.length),slotTransform=new T.Object3D();slotMesh.name='又见平遥墙面叠瓦缝';
  slotRows.forEach(([x,y,z],i)=>{slotTransform.position.set(x,y,z);slotTransform.updateMatrix();slotMesh.setMatrixAt(i,slotTransform.matrix);});slotMesh.castShadow=true;theater.add(slotMesh);
  const logoCanvas=document.createElement('canvas');logoCanvas.width=256;logoCanvas.height=384;const logoPen=logoCanvas.getContext('2d');logoPen.fillStyle='#ac3332';logoPen.fillRect(118,12,104,181);logoPen.font='bold 75px "Kaiti SC", KaiTi, serif';logoPen.fillStyle='#f4d9bf';logoPen.fillText('又',132,89);logoPen.fillText('见',132,170);logoPen.fillStyle='#302e29';logoPen.font='bold 138px "Kaiti SC", KaiTi, serif';logoPen.fillText('平',13,240);logoPen.fillText('遥',38,366);
  const logoMap=new T.CanvasTexture(logoCanvas);logoMap.colorSpace=T.SRGBColorSpace;const logo=new T.Mesh(new T.PlaneGeometry(1.9,2.85),new T.MeshStandardMaterial({map:logoMap,transparent:true,alphaTest:.1,roughness:.7}));logo.position.set(38.7,2.8,67.3);logo.name='又见平遥红印竖排标识';theater.add(logo);
  // Clay tile ends and ridges are actual repeated geometry at silhouette edges.
  const tileEnds=[],tileGeometry=new T.CylinderGeometry(.13,.13,.35,7,1,true,0,Math.PI),tileTransform=new T.Object3D();
  for(const p of profiles){
   for(let x=p.left+.15;x<p.right;x+=.34){const t=x<p.ridge?(x-p.left)/(p.ridge-p.left):(p.right-x)/(p.right-p.ridge),y=(x<p.ridge?p.a+(p.b-p.a)*t:p.c+(p.b-p.c)*t);tileEnds.push([x,y+.06,p.front-4*t]);}
   for(let z=-67;z<p.front-4;z+=.45)tileEnds.push([p.ridge,p.b-.68*(p.front-4-z)/(p.front+64)+.09,z]);
  }
  const tileMesh=new T.InstancedMesh(tileGeometry,new T.MeshStandardMaterial({color:'#50534c',roughness:.95}),tileEnds.length);tileMesh.name='又见平遥檐口筒瓦与脊瓦';
  tileEnds.forEach(([x,y,z],i)=>{tileTransform.position.set(x,y,z);tileTransform.rotation.set(Math.PI/2,0,0);tileTransform.updateMatrix();tileMesh.setMatrixAt(i,tileTransform.matrix);});tileMesh.castShadow=true;theater.add(tileMesh);
  // Layered buttresses and dark tile-filled vertical wall slots from Amap photo.
  for(const x of [-42,-36,35,42]){
   skin.box('stone','#ac7c54',x,2.0,69,.75,4.0,.95);
   for(let y=.3;y<3.9;y+=.25)box(theater,'#8b6549',x,y,69.51,.8,.025,.055);
  }
  for(const [x,width]of entries){
   for(const side of [-1,1]){box(theater,'#b7b8aa',x+side*width*.27,1.6,70.85,.055,2.8,.06);box(theater,'#c6c6b5',x+side*.16,1.35,70.92,.035,.48,.055);}
   // Three parallel approach rails leave each door centre open.
   for(const side of [-1,1])for(let z=74;z<=82;z+=2){box(theater,'#646c64',x+side*1.8,.6,z,.07,1.1,.07);if(z<82)box(theater,'#939a8f',x+side*1.8,1.1,z+1,.055,.055,2);}
   box(theater,'#50594e',x,.18,72,width*.75,.025,.6);
   for(let n=0;n<12;n++)box(theater,'#a6aa9b',x-width*.35+n*width*.064,.20,72,.035,.018,.53);
  }
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const z=78+i*12;trees.tree({x:side*37,z,height:5.4,crown:3.5,base:.46});
   for(let n=0;n<5;n++)box(theater,'#907052',side*33,.72,z-.25+n*.12,2.1,.07,.09);
   for(const dx of [-.8,.8])box(theater,'#535e53',side*33+dx,.4,z,.09,.55,.45);
  }
  for(const x of [-44,44]){box(theater,'#626a5f',x,.65,106,.65,1.1,.65);box(theater,'#a6aa95',x,1.24,106,.73,.08,.73);}
  const spotMaterial=new T.MeshStandardMaterial({color:'#ddd0ac',emissive:'#ffbd69',emissiveIntensity:0,roughness:.7}),spotGeo=new T.BoxGeometry(.32,.09,.2),spotPositions=[];
  for(let x=-39;x<=39;x+=6)spotPositions.push([x,.22,67.5]);
  const spots=new T.InstancedMesh(spotGeo,spotMaterial,spotPositions.length);spots.name='又见平遥墙脚照明';spotPositions.forEach(([x,y,z],i)=>{tileTransform.position.set(x,y,z);tileTransform.rotation.set(0,0,0);tileTransform.updateMatrix();spots.setMatrixAt(i,tileTransform.matrix);});theater.add(spots);
  batch.finish();trees.finish();const cladding=skin.finish();
  theater.userData.detailReview={checked:'2026-11-28',source:'https://www.amap.com/place/B0FFFYEU41',heightSource:'https://www.ju-cheng.com/hycase/dmtj/2018/0227/238.html',roofHeightEstimated:9,undergroundHeightReference:6,mainFootprint:[86,135],ticketFootprint:[ticket.width,ticket.depth],ticketCenter:[ticket.x,ticket.z],reference:'9 m above ground; 6 m underground is not added to the visible height. OSM main and southern footprints preserved; individual roof planes, facade and plaza facilities approximate.',tileEnds:tileEnds.length,entrances:entries.map(([u,w])=>({u,w,front:70.8,clearWidth:3.6}))};
  let released=false;
  return {root:theater,setNight(v){spotMaterial.emissiveIntensity=v?1.5:0;cladding.setNight(v);},dispose(){if(released)return;released=true;cladding.dispose();theater.removeFromParent();const gs=new Set(),ms=new Set(),maps=new Set();theater.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){ms.add(m);if(m.map)maps.add(m.map);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());theater.clear();}};

}
