import * as T from 'three';
import {createSurveySurfaces} from './survey-surfaces.js';
import {createTreeBatch} from './vegetation.js';
import {createUrbanBatch} from './urban-batch.js';
import {westGroundHeight} from './west-terrain.js';
import {yingxunParkBoundary,yingxunClearings,yingxunPonds,planYingxunPlanting} from './yingxun-park-data.js';

export function addYingxunGreenery(scene){
  const root=new T.Group();root.name='迎薰门公园绿化';scene.add(root);
  const surfaces=createSurveySurfaces(root),batch=createUrbanBatch(root,{ground:westGroundHeight}),trees=createTreeBatch(root,{ground:westGroundHeight,leafDensity:12,park:true});
  surfaces.polygon(yingxunParkBoundary,'#768060',.012,'ground',yingxunPonds);
  for(const p of yingxunClearings)surfaces.polygon(p.ring,p.name.includes('停车')?'#96998c':'#b6b3a2',.055,'paving');
  const plan=planYingxunPlanting();plan.trees.forEach((p,i)=>{
    trees.tree(p,i);
    // Dense crown masses match the park canopy in the public aerial photos;
    // fine leaves and branches remain at the edges rather than appearing bare.
    for(let j=0;j<5;j++){
      const a=j*2.4+i*.37,spread=j===4?0:p.crown*.21;
      batch.part('globe',['#738754','#82935e','#637e50','#8c9a64'][(i+j)%4],p.x+Math.cos(a)*spread,p.height*(j===4?.86:.72+(j%2)*.07),p.z+Math.sin(a)*spread,p.crown*.58,p.height*.38,p.crown*.56,a);
    }
  });plan.shrubs.forEach(p=>trees.shrub(p.x,p.z,p.width,p.height,.03));
  // A handful of benches at path nodes. There is no fence across the gate plaza.
  for(const [x,z,angle] of [[-41,849,.16],[-83,855,.16],[-275,883,.2],[-328,865,.2],[62,823,.15],[100,907,.15]]){
    batch.box('#807156',x,.48,z,2.3,.14,.65,angle);
    for(const k of [-.8,.8])batch.box('#696b60',x+k,.23,z,.12,.46,.5,angle);
    batch.box('#807156',x,.85,z-.29,2.3,.65,.1,angle);
  }
  surfaces.finish();batch.finish();trees.finish();
  root.userData={approximate:true,survey:'Amap satellite visual interpretation + existing OSM paths/water',treeCount:plan.trees.length,shrubCount:plan.shrubs.length};
  return root;
}
