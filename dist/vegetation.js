import * as T from 'three';

// Geometry leaves, not transparent cards: no alpha sorting or coplanar billboards.
// Every tree shares these meshes; seeded variation remains stable between views.
export function createTreeBatch(scene,{ground=()=>0,leafDensity=48,park=false,chunkSize=0}={}) {
  let state=47831;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  function leafCluster(seed) {
    state=seed;
    const positions=[],colors=[];
    const rotation=new T.Quaternion(),axis=new T.Vector3(),p=new T.Vector3();
    for(let i=0;i<leafDensity;i++) {
      const az=random()*Math.PI*2,vertical=random()*2-1,r=.62*Math.cbrt(random());
      const spread=Math.sqrt(1-vertical*vertical);
      const center=new T.Vector3(Math.cos(az)*spread*r,vertical*r*.8,Math.sin(az)*spread*r);
      rotation.setFromEuler(new T.Euler(random()*2.4,random()*6.28,random()*3));
      const length=.18+random()*.12,width=length*(.36+random()*.13);
      const vertices=[[0,0,.018],[-width/2,0,0],[0,length*.55,0],[width/2,0,0],[0,-length*.45,0]];
      const shade=new T.Color().setHSL(.24+random()*.055,.25+random()*.18,.24+random()*.15);
      for(const index of [0,1,2,0,2,3,0,3,4,0,4,1]) {
        axis.fromArray(vertices[index]);p.copy(axis).applyQuaternion(rotation).add(center);
        positions.push(p.x,p.y,p.z);colors.push(shade.r,shade.g,shade.b);
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.computeVertexNormals();return geometry;
  }
  const stemGeometry=new T.CylinderGeometry(.62,1,1,9,1);
  const barkColors=[],barkPosition=stemGeometry.attributes.position;
  for(let i=0;i<barkPosition.count;i++) {
    const tone=.7+.3*Math.abs(Math.sin(Math.atan2(barkPosition.getZ(i),barkPosition.getX(i))*17+barkPosition.getY(i)*3));
    const color=new T.Color('#746855').multiplyScalar(tone);
    barkColors.push(color.r,color.g,color.b);
  }
  stemGeometry.setAttribute('color',new T.Float32BufferAttribute(barkColors,3));
  const geometries=[stemGeometry,leafCluster(63391),leafCluster(9127)],items=[[],[],[]];
  const up=new T.Vector3(0,1,0),transform=new T.Object3D();
  let treeCount=0,shrubCount=0;
  function branch(from,to,radius) {
    const a=new T.Vector3(...from),b=new T.Vector3(...to),direction=b.clone().sub(a);
    transform.position.copy(a).add(b).multiplyScalar(.5);
    transform.quaternion.setFromUnitVectors(up,direction.clone().normalize());
    transform.scale.set(radius,direction.length(),radius);transform.updateMatrix();
    items[0].push({matrix:transform.matrix.clone(),color:'#ffffff'});
  }
  function leaves(x,y,z,size,variant) {
    transform.position.set(x,y,z);transform.rotation.set(random()*.8,random()*Math.PI*2,random()*.7);
    transform.scale.set(size*(.85+random()*.25),size,size*(.8+random()*.3));transform.updateMatrix();
    items[1+variant%2].push({matrix:transform.matrix.clone(),color:['#e3e8ce','#c8d6be','#f0edcf'][variant%3]});
  }
  function tree({x,z,height=7,crown=4,base=.42},index=treeCount) {
    state=(Math.round(x*97+z*791)+index*2357)>>>0;
    const y=ground(x,z)+base,phase=random()*Math.PI*2;
    const leanX=(random()-.5)*.23,leanZ=(random()-.5)*.23;
    const fork=[x+leanX,y+height*.43,z+leanZ];
    branch([x,y,z],fork,.16+height*.006);
    branch(fork,[x+leanX*2,y+height*.78,z+leanZ*2],.11);
    // A raised, irregular deciduous crown with visible branching and sky gaps.
    for(let j=0;j<(park?6:8);j++) {
      const theta=phase+j*2.39996,reach=crown*(.22+random()*.095);
      const start=[fork[0],y+height*(.39+j*.026),fork[2]];
      const tip=[x+Math.cos(theta)*reach,y+height*(.65+random()*.18),z+Math.sin(theta)*reach];
      const elbow=start.map((v,k)=>v+(tip[k]-v)*.57);
      branch(start,elbow,.085-j*.004);branch(elbow,tip,.046);
      for(let k=0;k<(park?2:3);k++) {
        const spread=theta+(k-1)*.9,offset=crown*(.055+random()*.04);
        const end=[tip[0]+Math.cos(spread)*offset,tip[1]+(random()-.25)*height*.13,tip[2]+Math.sin(spread)*offset];
        branch(elbow,end,.022);
        leaves(...end,crown*(.22+random()*.04),index+j+k);
      }
    }
    for(let j=0;j<(park?4:7);j++) {
      const theta=phase+j*2.4,r=crown*.12;
      leaves(x+Math.cos(theta)*r,y+height*(.81+random()*.1),z+Math.sin(theta)*r,crown*.24,index+j);
    }
    treeCount++;
  }
  function shrub(x,z,width=1,height=.65,base=.48) {
    const y=ground(x,z)+base;
    for(let i=0;i<5;i++) {
      const theta=i*2.4,r=width*.22;
      const px=x+Math.cos(theta)*r,pz=z+Math.sin(theta)*r;
      branch([x,y,z],[px,y+height*.7,pz],.015);
      leaves(px,y+height*.58,pz,height*.85,i);
    }
    shrubCount++;
  }
  return {tree,shrub,finish(){
    const root=new T.Group();root.name='实例化分枝阔叶树与灌木';
    items.forEach((entries,kind)=>{
      if(!entries.length){geometries[kind].dispose();return;}
      const material=new T.MeshStandardMaterial({vertexColors:true,roughness:kind? .88:1,side:kind?T.DoubleSide:T.FrontSide});
      const chunks=new Map();for(const p of entries){const m=p.matrix.elements,key=chunkSize?`${Math.floor(m[12]/chunkSize)}:${Math.floor(m[14]/chunkSize)}`:'all';if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
      for(const [chunkId,chunk] of chunks){
      const mesh=new T.InstancedMesh(geometries[kind],material,chunk.length),color=new T.Color();
      chunk.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,color.set(p.color));});
      if(chunkSize)mesh.userData.chunkId=chunkId;
      mesh.name=kind?'不透明几何叶簇':'渐细树干与分枝';
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
      }
    });
    root.userData={treeCount,shrubCount};scene.add(root);return root;
  }};
}
