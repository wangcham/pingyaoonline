import * as T from 'three';

// Shared geometries and instanced colors keep thousands of courtyards inexpensive.
export function createUrbanBatch(scene,{paving=null,ground=()=>0}={}) {
  const shape=new T.Shape();shape.moveTo(-.5,0);shape.lineTo(-.4,.08);shape.lineTo(0,1);shape.lineTo(.4,.08);shape.lineTo(.5,0);shape.closePath();
  const roof=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});roof.translate(0,0,-.5);roof.rotateY(Math.PI/2);
  const geometries={box:new T.BoxGeometry(1,1,1),roof,globe:new T.IcosahedronGeometry(.5,1),stem:new T.CylinderGeometry(.42,.5,1,7)};
  const batches=new Map();
  function part(kind,color,x,y,z,w,h,d,angle=0){
    const key=kind==='paving'?'paving':kind;
    if(!batches.has(key))batches.set(key,[]);
    batches.get(key).push({color,x,y,z,w,h,d,angle});
  }
  const box=(...args)=>part('box',...args);
  return {part,box,finish(){
    const root=new T.Group(),transform=new T.Object3D(),color=new T.Color();root.name='街区实例化建筑';
    for(const [kind,items] of batches){
      const mat=kind==='paving'?paving:new T.MeshStandardMaterial({color:'#ffffff',roughness:kind==='roof'?.94:.9});
      const mesh=new T.InstancedMesh(geometries[kind==='paving'?'box':kind],mat,items.length);
      items.forEach((p,i)=>{
        transform.position.set(p.x,p.y+ground(p.x,p.z),p.z);transform.scale.set(p.w,p.h,p.d);transform.rotation.set(0,p.angle,0);transform.updateMatrix();
        mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,color.set(p.color));
      });
      mesh.castShadow=kind!=='paving';mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
    }
    scene.add(root);return root;
  }};
}
