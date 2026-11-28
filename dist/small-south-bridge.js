import * as T from 'three';
import {createCommerceMaterials} from './local-commerce-materials.js';
import {createUrbanBatch} from './urban-batch.js';
import {westGroundHeight} from './west-terrain.js';

export function addSmallSouthBridge(parent,b){
 const root=new T.Group();root.name='小南门石桥';parent.add(root);
 const stone=createCommerceMaterials(root),parts=createUrbanBatch(root),nx=-b.dz,nz=b.dx,yaw=-Math.atan2(b.dz,b.dx);
 const at=(u,y,v)=>{const x=b.x+b.dx*u+nx*v,z=b.z+b.dz*u+nz*v;return [x,westGroundHeight(x,z)+y,z];};
 const deck=u=>.27+.55*Math.max(0,1-(2*u/b.length)**2),under=u=>-.06+.55*Math.max(0,1-(2*u/b.length)**2);
 const span=b.length/2,steps=28;
 for(let i=0;i<steps;i++){
  const a=-span+b.length*i/steps,c=-span+b.length*(i+1)/steps;
  stone.quad('stone','#c2c2af',[at(a,deck(a),-b.width/2),at(c,deck(c),-b.width/2),at(c,deck(c),b.width/2),at(a,deck(a),b.width/2)]);
  for(const side of [-1,1]){
   const v=side*b.width/2;
   stone.quad('stone','#b3b6a4',[at(a,under(a),v),at(c,under(c),v),at(c,deck(c),v),at(a,deck(a),v)]);
   // Joint lines follow the shallow arch, instead of a solid rectangular slab.
   stone.quad('stone','#818c7e',[at(a,under(a),v+side*.008),at(a+.025,under(a+.025),v+side*.008),at(a+.025,deck(a+.025),v+side*.008),at(a,deck(a),v+side*.008)]);
  }
  stone.quad('stone','#919c8b',[at(a,under(a),-b.width/2),at(c,under(c),-b.width/2),at(c,under(c),b.width/2),at(a,under(a),b.width/2)]);
 }
 const count=Math.ceil(b.length/1.8);
 for(const side of [-1,1])for(let i=0;i<=count;i++){
  const u=-span+b.length*i/count,y=deck(u),v=side*(b.width/2+.12);
  parts.box('#c8c9b6',...at(u,y+.56,v),.28,1.12,.28,yaw);
  parts.box('#dedcca',...at(u,y+1.17,v),.37,.14,.37,yaw);
  if(i===count)continue;
  const end=-span+b.length*(i+1)/count,mid=(u+end)/2;
  for(const [lo,hi,color] of [[.12,.42,'#bec2ae'],[.82,.94,'#d1d0bd']])for(const offset of [-.1,.1]){
   stone.quad('stone',color,[at(u,deck(u)+lo,v+offset),at(end,deck(end)+lo,v+offset),at(end,deck(end)+hi,v+offset),at(u,deck(u)+hi,v+offset)]);
  }
  // Open upper balustrade with a restrained diamond relief on the lower panel.
  parts.box('#c6c9b4',...at(mid,deck(mid)+.62,v),.12,.43,.16,yaw);
  parts.part('globe','#aab19d',...at(mid,deck(mid)+.29,v+side*.105),.3,.14,.025,yaw);
 }
 // Low masonry abutments sit on the banks; neither approach has a barrier.
 for(const side of [-1,1])for(const edge of [-1,1])parts.box('#a8ae9b',...at(side*(span-.55),.05,edge*(b.width/2+.1)),1.1,.4,.75,yaw);
 parts.finish();stone.finish();root.userData={...b,deckRise:.55,style:'photo-referenced approximation',people:0};return root;
}
