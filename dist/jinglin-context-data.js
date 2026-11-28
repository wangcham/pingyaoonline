// Amap Jinglin B0FFFY2Y9H / Chengxi tax office B01620N94L, plus user-confirmed
// order facing the shop: glazed frontage, small lane, tax office. Metre extents
// are estimates; the user corrected the frontage to one bay adjoining Jinglin,
// immediately followed by the lane. This supersedes the inferred five-bay row.
export const jinglinContext={x:-1888,z:148.38276617072015,yaw:-3.033247478907204,
 glass:{u:4.08,v:0,w:3.56,d:6},lane:{u:7.66,v:-25,w:3.2,d:57},
 tax:{u:33.16,v:-5.5,w:41.3,d:17,h:13.2,levels:4}};
export function jinglinContextWorld(u,v){const {x,z,yaw}=jinglinContext,c=Math.cos(yaw),s=Math.sin(yaw);return [x+u*c+v*s,z-u*s+v*c];}
export function jinglinContextLocal(x,z){const p=jinglinContext,c=Math.cos(p.yaw),s=Math.sin(p.yaw),dx=x-p.x,dz=z-p.z;return [dx*c-dz*s,dx*s+dz*c];}
export const jinglinContextRing=[[2.31,3.8],[70,3.8],[70,-55],[2.31,-55]].map(p=>jinglinContextWorld(...p));
export function isJinglinContext(x,z,radius=0){const [u,v]=jinglinContextLocal(x,z);return u+radius>2.31&&u-radius<70&&v+radius>-55&&v-radius<3.8;}
