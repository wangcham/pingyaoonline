import * as T from 'three';
import {createPavingMaterial} from '../paving.js';

// Geometry and materials belong to one manager; release them together on dispose.
export function createHeritageMaterials() {
  function pattern(kind) {
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const c=canvas.getContext('2d');
    c.fillStyle=kind==='brick'?'#555958':'#42494a';c.fillRect(0,0,256,256);
    for(let row=0;row<8;row++) for(let col=-1;col<5;col++) {
      const v=kind==='brick'?100+(row*13+col*17+39)%25:70+(row*7+col*11+29)%16;
      c.fillStyle=`rgb(${v},${v+2},${v+1})`;
      c.fillRect(col*64+(row%2)*32+1,row*32+1,62,29);
    }
    const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;
    return texture;
  }
  const brickTexture=pattern('brick'),tileTexture=pattern('tile');
  const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.9,...extra});
  return {
    brick:material('#aeb0a9',{map:brickTexture,bumpMap:brickTexture,bumpScale:.035}),
    stone:material('#9d9e95'),paving:createPavingMaterial('yard'),wood:material('#594037'),red:material('#713c30'),
    dark:material('#292e2c'),tile:material('#a8aca9',{map:tileTexture,bumpMap:tileTexture,bumpScale:.025}),
    green:material('#547369',{roughness:.55}),gold:material('#b8994f',{roughness:.6}),
    plaster:material('#c2bbab'),water:material('#507b77',{roughness:.3}),
  };
}

// Merge static parts by material and detail level: hundreds of rafters cost one draw call.
export function createArchitecture(materials) {
  const root=new T.Group(),detail=new T.Group();root.add(detail);
  const buckets=new Map(),boxGeo=new T.BoxGeometry(1,1,1),columnGeo=new T.CylinderGeometry(.46,.5,1,10);
  const transform=new T.Object3D();
  function add(geometry,material,position=[0,0,0],scale=[1,1,1],yaw=0,fine=false) {
    transform.position.set(...position);transform.scale.set(...scale);transform.rotation.set(0,yaw,0);transform.updateMatrix();
    const geo=geometry.index?geometry.toNonIndexed():geometry.clone();geo.applyMatrix4(transform.matrix);
    const key=material+':'+fine;
    if(!buckets.has(key)) buckets.set(key,{material,fine,position:[],normal:[],uv:[]});
    const b=buckets.get(key),p=geo.attributes.position,n=geo.attributes.normal;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
      b.position.push(x,y,z);b.normal.push(nx,ny,nz);
      // Meter-scaled UVs avoid stretching bricks along the long wall segments.
      b.uv.push((Math.abs(nx)>.7?z:x)/2,(Math.abs(ny)>.7?z:y)/1);
    }
    geo.dispose();
  }
  function box(mat,x,y,z,w,h,d,yaw=0,fine=false){add(boxGeo,mat,[x,y,z],[w,h,d],yaw,fine);}
  function column(x,y,z,height,radius=.22,mat='red',fine=false){add(columnGeo,mat,[x,y+height/2,z],[radius*2,height,radius*2],0,fine);}
  function beam(a,b,width,mat='wood',fine=true) {
    const direction=new T.Vector3(...b).sub(new T.Vector3(...a)),len=direction.length();
    if(len<.001)return;
    const g=new T.CylinderGeometry(width/2,width/2,len,4);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));
    add(g,mat,a.map((v,i)=>(v+b[i])/2),[1,1,1],0,fine);g.dispose();
  }
  function roof(x,y,z,w,d,h,{hip=true,mat='tile',yaw=0}={}) {
    const pos=[],tri=(a,b,c)=>pos.push(...a,...b,...c);
    const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
    const ridge=w*(hip?.31:.5),shoulderZ=hip?d*.24:0,shoulderY=hip?h*.48:h;
    const sides=hip?4:2;
    // Curved lower planes and gently lifted corners. Upper gables remain distinct.
    for(let side=0;side<sides;side++) {
      const front=side<2,sign=side%2?1:-1;
      const p=(u,t)=>{
        const half=front?w/2:d/2,top=front?ridge:shoulderZ;
        const along=(half+(top-half)*t)*u;
        const across=(front?d/2:w/2)+((front?shoulderZ:ridge)-(front?d/2:w/2))*t;
        const yy=shoulderY*(.5*t+.5*t*t)+.25*Math.abs(u)**8*(1-t)**3;
        return front?[along,yy,sign*across]:[sign*across,yy,along];
      };
      for(let j=0;j<8;j++)for(let i=0;i<16;i++) quad(p(i/8-1,j/8),p((i+1)/8-1,j/8),p((i+1)/8-1,(j+1)/8),p(i/8-1,(j+1)/8));
      // Raised tile rolls along the roof fall; omitted at distant LOD.
      for(let u=-.96;u<1;u+=Math.max(.065,1.4/(front?w:d)))for(let j=0;j<3;j++) {
        const rotate=v=>[x+v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw),y+v[1]+.04,z-v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw)];
        beam(rotate(p(u,j/3)),rotate(p(u,(j+1)/3)),.065,mat,true);
      }
    }
    if(hip) {
      for(const s of [-1,1])quad([-ridge,shoulderY,s*shoulderZ],[ridge,shoulderY,s*shoulderZ],[ridge,h,0],[-ridge,h,0]);
      for(const s of [-1,1])tri([s*ridge,shoulderY,-shoulderZ],[s*ridge,h,0],[s*ridge,shoulderY,shoulderZ]);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    // Roof shells are intentionally double-sided; profiles have open undersides.
    add(geo,mat,[x,y,z],[1,1,1],yaw);geo.dispose();
    const rp=(xx,yy,zz)=>[x+xx*Math.cos(yaw)+zz*Math.sin(yaw),y+yy,z-xx*Math.sin(yaw)+zz*Math.cos(yaw)];
    beam(rp(-ridge,h+.1,0),rp(ridge,h+.1,0),.27,mat,false);
    for(const s of [-1,1]) {
      beam(rp(s*ridge,h+.1,0),rp(s*(ridge+.35),h+.65,0),.23,mat,false);
      for(const side of [-1,1])beam(rp(s*w/2,.24,side*d/2),rp(s*ridge,shoulderY,side*shoulderZ),.18,mat,false);
    }
  }
  function hall({x=0,z=0,w=18,d=10,h=5,base=.55,bays=5,hip=false,open=false,yaw=0,mat='tile',wall='brick'}={}) {
    const local=(xx,zz)=>[x+xx*Math.cos(yaw)+zz*Math.sin(yaw),z-xx*Math.sin(yaw)+zz*Math.cos(yaw)];
    const block=(m,xx,yy,zz,ww,hh,dd,fine=false)=>{const [px,pz]=local(xx,zz);box(m,px,yy,pz,ww,hh,dd,yaw,fine);};
    const pedestal=base>2?.2:Math.min(base,1.2);
    block(base>2?'wood':'stone',0,base-pedestal/2,0,w+.9,pedestal,d+.9);
    if(!open){
      block(wall,0,base+h/2,-d/2+.2,w,h,.4);
      for(const s of [-1,1])block(wall,s*(w/2-.2),base+h/2,0,.4,h,d);
      block(wall,0,base+.45,0,w,.9,d*.76);
    }
    for(let i=0;i<=bays;i++)for(const s of [-1,1]) {
      const xx=-w/2+i*w/bays,[px,pz]=local(xx,s*d/2);
      column(px,base,pz,h,.22);
      block('stone',xx,base+.15,s*d/2,.64,.3,.64,true);
      for(let level=0;level<3;level++) {
        block('wood',xx,base+h-.6+level*.2,s*d/2,.45+level*.38,.15,.6+level*.3,true);
        block('red',xx,base+h-.5+level*.2,s*d/2,.23,.2,.28,true);
      }
    }
    for(const s of [-1,1])block('red',0,base+h-.2,s*d/2,w+.4,.38,.35);
    if(!open)for(let i=0;i<bays;i++) {
      const xx=-w/2+(i+.5)*w/bays,ww=w/bays-.55;
      block('wood',xx,base+h*.45,d*.32,ww,h*.7,.14);
      block('dark',xx,base+h*.59,d*.32+.08,ww-.18,h*.38,.05);
      for(let k=0;k<5;k++)block('wood',xx+(k-2)*(ww-.2)/5,base+h*.59,d*.32+.12,.065,h*.38,.065,true);
      for(let k=0;k<3;k++)block('wood',xx,base+h*.43+k*h*.15,d*.32+.12,ww-.15,.055,.065,true);
    }
    for(let xx=-w/2;xx<w/2;xx+=.65)block('wood',xx,base+h,0,.1,.13,d+1.5,true);
    roof(x,base+h+.12,z,w+2,d+2,Math.min(4,d*.29),{hip,mat,yaw});
    if(base<=1.5)for(let step=0;step<3;step++)block('stone',0,base*(step+1)/6,d/2+1-step*.25,w*.36,base/3,1.5-step*.3);
  }
  function courtyard(w,d,opening=4) {
    box('paving',0,.045,0,w,.09,d);
    for(const s of [-1,1]) {
      box('brick',s*w/2,1.7,0,.6,3.4,d);
      box('tile',s*w/2,3.48,0,.85,.22,d+.5);
      const width=(w-opening)/2;
      for(const side of [-1,1])box('brick',side*(opening/2+width/2),1.7,s*d/2,width,3.4,.6);
    }
  }
  function finish() {
    for(const {material,fine,position,normal,uv} of buckets.values()) {
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(position,3));
      g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      g.computeBoundingSphere();
      const mesh=new T.Mesh(g,materials[material]);mesh.castShadow=!['paving','water'].includes(material);mesh.receiveShadow=true;
      (fine?detail:root).add(mesh);
    }
    boxGeo.dispose();columnGeo.dispose();buckets.clear();
    root.userData.detail=detail;return root;
  }
  return {box,column,beam,roof,hall,courtyard,add,finish};
}
