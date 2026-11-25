import * as T from 'three';

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
    for(let y=0;y<256;y+=9+random()*15) {
      g.fillStyle=random()<.5?'#774a2d30':'#ecc08932';
      g.fillRect(0,y,256,3+random()*8);
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

export function addTheater(scene, box, namedBoard) {
  const theater=new T.Group();
  theater.position.set(-1253,0,443.4);
  theater.rotation.y=.132;
  scene.add(theater);

  const earth=new T.MeshStandardMaterial({map:theaterTexture('earth'),side:T.DoubleSide,roughness:1});
  const tile=new T.MeshStandardMaterial({map:theaterTexture('tile'),side:T.DoubleSide,roughness:.82});
  function quad(a,b,c,d,material,scale=5) {
    const meshGeo=new T.BufferGeometry();
    meshGeo.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...d],3));
    const u=Math.hypot(...b.map((v,i)=>v-a[i]))/scale;
    const v=Math.hypot(...d.map((v,i)=>v-a[i]))/scale;
    meshGeo.setAttribute('uv',new T.Float32BufferAttribute([0,0,u,0,u,v,0,v],2));
    meshGeo.setIndex([0,1,2,0,2,3]);
    meshGeo.computeVertexNormals();
    const mesh=new T.Mesh(meshGeo,material);
    mesh.receiveShadow=true;
    mesh.castShadow=true;
    theater.add(mesh);
  }

  // Angular loess walls and dark, overlapping roof planes fit the mapped theater footprint.
  box(theater,'#ac794e',0,4.7,0,83,9.4,133);
  const profiles=[
    {left:-43,right:-23,ridge:-33,a:10,b:17,c:11,front:65},
    {left:-27,right:-5,ridge:-18,a:11,b:23,c:12,front:61},
    {left:-10,right:16,ridge:0,a:12,b:19,c:12,front:68},
    {left:10,right:31,ridge:19,a:10,b:25,c:13,front:64},
    {left:24,right:43,ridge:34,a:13,b:18,c:10,front:60},
  ];
  for (const {left,right,ridge,a,b,c,front} of profiles) {
    const back=-68;
    quad([left,a,front],[ridge,b,front-4],[ridge,b-1.7,back],[left,a-.6,back],tile,3.3);
    quad([ridge,b,front-4],[right,c,front],[right,c-.6,back],[ridge,b-1.7,back],tile,3.3);
    quad([left,4,front-.4],[right,4,front-.4],[right,c,front],[left,a,front],earth,6);
    quad([left,a,front],[ridge,b,front-4],[right,c,front],[right,c,front],earth,6);
    quad([left,8,back],[right,8,back],[right,c-.6,back],[left,a-.6,back],earth,6);
    quad([left,a-.6,back],[ridge,b-1.7,back],[right,c-.6,back],[right,c-.6,back],earth,6);
    quad([left,8,front],[left,8,back],[left,a-.6,back],[left,a,front],earth,6);
    quad([right,8,back],[right,8,front],[right,c,front],[right,c-.6,back],earth,6);
  }

  // Entrance slots, ticket windows and the long textured public facade.
  const entries=[[-31,10,'检票口'],[-14,9,'检票口'],[2,10,'售票处'],[20,11,'票务处']];
  for(const [x,width,title] of entries) {
    box(theater,'#a16e43',x,3.27,69,width+1,6.55,3.3);
    box(theater,'#33322f',x,2.28,70.685,width,4.55,.08);
    box(theater,'#6a7775',x,2.18,70.737,width*.83,3.7,.06);
    box(theater,'#553f31',x,2.45,70.81,.13,3.9,.12);
    box(theater,'#4f4436',x,4.78,71,width+1.7,.3,1.24);
    namedBoard(theater,title,x,5.55,70.69,width*.7,.9,0,'#63462f');
  }
  const textCanvas=document.createElement('canvas');
  textCanvas.width=1024;
  textCanvas.height=256;
  const pen=textCanvas.getContext('2d');
  pen.font='bold 150px "Kaiti SC", KaiTi, serif';
  pen.textBaseline='middle';
  pen.fillStyle='#432e24';
  pen.fillText('又见平遥',45,130,845);
  pen.fillStyle='#9b3227';
  pen.fillRect(890,83,77,91);
  pen.fillStyle='#ffe6c0';
  pen.font='bold 36px serif';
  pen.fillText('平遥',892,129,74);
  const marqueeTexture=new T.CanvasTexture(textCanvas);
  marqueeTexture.colorSpace=T.SRGBColorSpace;
  const marquee=new T.Mesh(new T.PlaneGeometry(24,6),new T.MeshBasicMaterial({
    map:marqueeTexture,transparent:true,toneMapped:false,depthWrite:false,
  }));
  marquee.position.set(23,8.35,69.2);
  theater.add(marquee);

  // The separate mapped ticket building is recessed on the east side of the approach.
  box(theater,'#a67c56',35,2.65,117,30,5.3,16);
  box(theater,'#514c43',35,5.38,117,31,.28,17);
  box(theater,'#58706c',35,1.85,108.92,16,2.65,.14);
  namedBoard(theater,'又见平遥 · 售票中心',35,4.10,108.82,23,1.0,Math.PI,'#684b34');

  // Plaza paving, seating and low lamps follow the public-side approach.
  box(theater,'#aaa396',-1,.06,89,99,.12,42);
  box(theater,'#c3b49e',0,.134,89,64,.035,42);
  for(let lane=-7;lane<=7;lane++) box(theater,'#ac9e8b',lane*4.55,.155,89,.035,.01,42);
  for(let row=0;row<10;row++) box(theater,'#ac9e8b',0,.156,69+row*4.5,64,.012,.035);
  for(const side of [-1,1]) {
    for(let i=0;i<3;i++) {
      const z=78+i*12;
      box(theater,'#b5aa95',side*37,.20,z,5.4,.4,5.8);
      box(theater,'#676e54',side*37,.42,z,4.9,.08,5.3);
      box(theater,'#786354',side*33,.49,z,2.1,.35,.58);
      box(theater,'#6c5943',side*31,.69,z+2,.22,1.38,.22);
      box(theater,'#e1cc9d',side*31,1.32,z+2,.24,.12,.24);
    }
  }
}
