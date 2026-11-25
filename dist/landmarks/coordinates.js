// Same tangent-plane approximation as scripts/import_osm.py. One scene unit = 1 m.
export const LANDMARK_ORIGIN = Object.freeze([112.1815, 37.204]);
export function wgs84ToGcj02(lon, lat) {
  if (lon < 72.004 || lon > 137.8347 || lat < .8293 || lat > 55.8271) return [lon, lat];
  const x=lon-105, y=lat-35, pi=Math.PI;
  let a=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));
  let b=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));
  const common=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
  a+=common+(20*Math.sin(y*pi)+40*Math.sin(y*pi/3))*2/3+(160*Math.sin(y*pi/12)+320*Math.sin(y*pi/30))*2/3;
  b+=common+(20*Math.sin(x*pi)+40*Math.sin(x*pi/3))*2/3+(150*Math.sin(x*pi/12)+300*Math.sin(x*pi/30))*2/3;
  const rad=lat*pi/180, magic=1-.006693421622965943*Math.sin(rad)**2, root=Math.sqrt(magic);
  return [lon+b*180/(6378245/root*Math.cos(rad)*pi),lat+a*180/(6378245*(1-.006693421622965943)/(magic*root)*pi)];
}
export function gcj02ToWgs84(lon,lat) {
  let x=lon,y=lat;
  for(let i=0;i<8;i++) {
    const [gx,gy]=wgs84ToGcj02(x,y), dx=gx-lon,dy=gy-lat;
    x-=dx;y-=dy;
    if(Math.max(Math.abs(dx),Math.abs(dy))<1e-9) break;
  }
  return [x,y];
}
export function geographicToLocal(coordinate, crs='WGS84') {
  if(!['WGS84','GCJ-02'].includes(crs)) throw new Error(`Unsupported coordinate system: ${crs}`);
  if(!Array.isArray(coordinate)||coordinate.length!==2||!coordinate.every(Number.isFinite)) throw new Error('Expected [longitude, latitude]');
  const [lon,lat]=crs==='GCJ-02'?gcj02ToWgs84(...coordinate):coordinate;
  return [(lon-LANDMARK_ORIGIN[0])*111320*Math.cos(LANDMARK_ORIGIN[1]*Math.PI/180),(LANDMARK_ORIGIN[1]-lat)*111320];
}
export function localToGeographic([x,z]) {
  return [LANDMARK_ORIGIN[0]+x/(111320*Math.cos(LANDMARK_ORIGIN[1]*Math.PI/180)),LANDMARK_ORIGIN[1]-z/111320];
}
