import * as T from 'three';

// Instanced parked electric scooters, metre scale. Parking rows are authored
// separately so this helper cannot place a vehicle across an entrance or road.
export function addParkedScooters(root,placements,ground=()=>0){
 const geometries={box:new T.BoxGeometry(1,1,1),wheel:new T.TorusGeometry(.22,.055,5,12),hub:new T.CylinderGeometry(.13,.13,.07,10)};
 const parts={box:[],wheel:[],hub:[]},mat=new T.MeshStandardMaterial({vertexColors:false,roughness:.74,metalness:.12});
 function piece(kind,col,p,x,y,z,w,h,d,pitch=0){const c=Math.cos(p.angle),sn=Math.sin(p.angle);parts[kind].push({col,x:p.u+x*c+z*sn,y:ground(p.u,p.v)+y,z:p.v-x*sn+z*c,w,h,d,a:p.angle,pitch});}
 for(const [i,p]of placements.entries()){
  const color=['#7a9299','#ab5c51','#d1c9b5','#4b565c','#73856c','#adb2b1'][i%6];
  for(const z of [-.55,.55]){piece('wheel','#303638',p,0,.29,z,1,1,1);piece('hub','#acb6b1',p,0,.29,z,1,1,1);}
  piece('box','#35433e',p,0,.4,0,.44,.13,1.35);
  piece('box',color,p,0,.53,-.37,.53,.38,.53);piece('box','#343e3b',p,0,.82,-.30,.55,.13,.67);
  piece('box',color,p,0,.67,.45,.47,.71,.19,-.22);piece('box','#b5bbb0',p,0,1.08,.42,.055,.43,.055);
  piece('box','#414b47',p,0,1.27,.39,.73,.055,.07);
  for(const side of [-1,1]){piece('box','#535f58',p,side*.31,1.40,.39,.025,.26,.025);piece('box','#bbc5bf',p,side*.36,1.54,.39,.16,.1,.055);}
  piece('box','#ded9b7',p,0,1.02,.58,.25,.14,.055);piece('box','#9e4232',p,0,.61,-.69,.28,.09,.045);
  piece('box','#4d5e56',p,0,1.0,.48,.45,.31,.03); // shallow front basket
  for(const z of [.42,.68])piece('box','#4d5e56',p,0,.97,z,.45,.035,.035);
  for(const side of [-1,1])piece('box','#4d5e56',p,side*.21,.97,.55,.025,.28,.28);
 }
 const m=new T.Object3D(),col=new T.Color(),meshes=[];
 for(const [kind,items]of Object.entries(parts)){
  const mesh=new T.InstancedMesh(geometries[kind],mat,items.length);mesh.name=`沿街电动车-${kind}`;
  items.forEach((p,i)=>{m.position.set(p.x,p.y,p.z);m.rotation.set(kind==='hub'?0:p.pitch,kind==='wheel'?p.a+Math.PI/2:p.a,kind==='hub'?Math.PI/2:0,'YXZ');m.scale.set(p.w,p.h,p.d);m.updateMatrix();mesh.setMatrixAt(i,m.matrix);mesh.setColorAt(i,col.set(p.col));});mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);
 }
 return {meshes,dispose(){meshes.forEach(m=>m.removeFromParent());Object.values(geometries).forEach(g=>g.dispose());mat.dispose();}};
}
