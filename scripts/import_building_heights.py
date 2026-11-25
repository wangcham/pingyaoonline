"""Crop GBA.Height to the western study area; requires rasterio and numpy.
Usage: python import_building_heights.py source.tif
The source is WGS84/UTM, NOT GCJ-02 and NOT a terrain elevation model.
"""
import sys,json,math,hashlib
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import transform
from rasterio.windows import Window
root=Path(__file__).resolve().parent.parent
origin=(112.1815,37.204)
west,north,step,cols,rows=-2110,-260,3,351,371
xx,zz=np.meshgrid(west+np.arange(cols)*step,north+np.arange(rows)*step)
lons=origin[0]+xx.ravel()/(111320*math.cos(math.radians(origin[1])))
lats=origin[1]-zz.ravel()/111320
with rasterio.open(sys.argv[1]) as src:
    eastings,northings=transform('EPSG:4326',src.crs,lons.tolist(),lats.tolist())
    rr,cc=rasterio.transform.rowcol(src.transform,eastings,northings)
    rr,cc=np.asarray(rr),np.asarray(cc)
    window=Window(int(cc.min()),int(rr.min()),int(cc.max()-cc.min()+1),int(rr.max()-rr.min()+1))
    crop=src.read(1,window=window)
    if crop.size!=window.width*window.height or not np.isfinite(crop).all():raise ValueError('Invalid raster coverage')
    profile=src.profile.copy();profile.update(width=int(window.width),height=int(window.height),transform=src.window_transform(window),compress='deflate')
    dest=root/'data/gba-west-height.tif'
    with rasterio.open(dest,'w',**profile) as out:out.write(crop,1)
    values=crop[rr-int(window.row_off),cc-int(window.col_off)]
    values=np.where(values<0,-1,np.rint(values*10)).astype(int).reshape(rows,cols)
meta={'dataset':'GlobalBuildingAtlas GBA.Height','authors':'Zhu, Chen, Zhang, Shi and Wang (2025)','source':'https://doi.org/10.14459/2025mp1782307','license':'CC BY-NC 4.0','licenseUrl':'https://creativecommons.org/licenses/by-nc/4.0/','imageryYears':[2018,2019],'retrieved':'2026-11-25','tile':'Height/asiaeast/e110_n40_e115_n35/112.0_37.2_112.2_37.0_sr_ss.tif','note':'Used the valid UTM raster overlap north of nominal tile edge; heights are remote-sensing estimates, not surveyed floors. Local grid nearest samples at 3 m, quantized to 0.1 m; -1 means no data.','cropSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'originWgs84':origin,'x':west,'z':north,'step':step,'cols':cols,'rows':rows,'maxMeters':float(values.max()/10)}
(root/'data/building-height-provenance.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
js='// Generated from GBA.Height; CC BY-NC 4.0. See data/building-height-provenance.json.\nexport const westBuildingHeightGrid='+json.dumps({k:meta[k] for k in ['x','z','step','cols','rows']},separators=(',',':'))[:-1]+',"values":[\n'+',\n'.join(json.dumps(r.tolist(),separators=(',',':')) for r in values)+']};\n'
(root/'dist/west-building-height-data.js').write_text(js)
print(json.dumps({'samples':int(values.size),'maximumMeters':meta['maxMeters'],'cropBytes':dest.stat().st_size}))
