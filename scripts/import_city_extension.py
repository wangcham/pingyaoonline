"""Add OSM roads beyond the original export, preserving existing tuned geometry.
Usage: python3 scripts/import_city_extension.py NEW.xml BASE.xml [BASE2.xml ...]
No private service credentials or satellite rasters are embedded.
"""
import json, math, sys, xml.etree.ElementTree as ET
from pathlib import Path
ORIGIN=(112.1815,37.204)
WIDTH={'trunk':10,'primary':10,'secondary':9,'tertiary':7,'residential':5.5,'living_street':4,'pedestrian':5,'unclassified':5,'footway':2,'path':1.6,'steps':1.6,'service':3.5,'motorway':12,'primary_link':5,'secondary_link':5,'trunk_link':5,'tertiary_link':4,'cycleway':2}
def project(n):return [round((float(n.get('lon'))-ORIGIN[0])*111320*math.cos(math.radians(ORIGIN[1])),1),round((ORIGIN[1]-float(n.get('lat')))*111320,1)]
def tags(w):return {t.get('k'):t.get('v') for t in w.findall('tag')}
def main():
 r=ET.parse(sys.argv[1]).getroot();old=set()
 for f in sys.argv[2:]:old.update(w.get('id') for w in ET.parse(f).getroot().findall('way'))
 nodes={n.get('id'):project(n) for n in r.findall('node')};roads=[];rail=[];water=[];metadata=[]
 for w in r.findall('way'):
  if w.get('id') in old:continue
  t=tags(w);pts=[nodes.get(n.get('ref')) for n in w.findall('nd')]
  if len(pts)<2 or None in pts:continue
  h=t.get('highway');name=t.get('name:zh',t.get('name',''))
  if h in WIDTH and t.get('area')!='yes':
   # Absolute layer/bridge evidence is retained; grade-separated structures
   # are not projected as surface-road building exclusion bands.
   width=WIDTH[h];source='type-estimate'
   try:
    measured=float(t.get('width','').removesuffix(' m'))
    if 1<=measured<=60:width=measured;source='OSM:width'
   except ValueError:pass
   roads.append([h,width,name,pts]);metadata.append({'id':'osm-way-'+w.get('id'),'widthSource':source,'bridge':t.get('bridge'),'tunnel':t.get('tunnel'),'layer':t.get('layer'),'version':w.get('version')})
  if t.get('railway')=='rail':rail.append(pts)
  if t.get('waterway') in ('river','canal') and pts[0]!=pts[-1]:water.append([7 if t['waterway']=='river' else 3,pts])
 data={'source':'https://www.openstreetmap.org/copyright','retrieved':'2026-11-26','crs':'WGS84','roads':roads,'roadMetadata':metadata,'rail':rail,'water':water}
 out=Path(__file__).resolve().parent.parent/'dist/city-extension-data.js'
 out.write_text('export const cityExtensionData='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
 print(json.dumps({k:len(data[k]) for k in ['roads','rail','water']}))
if __name__=='__main__':main()
