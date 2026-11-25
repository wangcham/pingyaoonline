"""Extract a smoothed longitudinal profile from one Copernicus GLO-30 tile."""
import json
import math
import sys
import struct
import zlib
from functools import lru_cache
from pathlib import Path
from statistics import median

from PIL import Image

from import_osm import ORIGIN, project
import xml.etree.ElementTree as ET

SAMPLE_STEP = 25

def build_profile(tile_path, osm_path):
    with Image.open(tile_path) as tile:
        sx, sy, _ = tile.tag_v2[33550]
        _, _, _, lon0, lat0, _ = tile.tag_v2[33922]
        width, height = tile.tag_v2[322], tile.tag_v2[323]
        across = math.ceil(tile.width/width)
        if tile.tag_v2[259] != 8 or tile.tag_v2[317] != 3 or tile.mode != 'F':
            raise ValueError('Expected a Deflate/predictor-3 Copernicus Float32 COG')

        @lru_cache
        def tile_bytes(index):
            with open(tile_path,'rb') as source:
                source.seek(tile.tag_v2[324][index])
                return zlib.decompress(source.read(tile.tag_v2[325][index]))

        @lru_cache
        def row_bytes(index,row_index):
            stride = width*4
            row = bytearray(tile_bytes(index)[row_index*stride:(row_index+1)*stride])
            for i in range(1,len(row)):
                row[i]=(row[i]+row[i-1]) % 256
            return row

        def raster(x,y):
            row=row_bytes(y//height*across+x//width,y%height)
            return struct.unpack('>f',bytes(row[x%width+i*width] for i in range(4)))[0]
        root = ET.parse(osm_path).getroot()
        nodes = {
            n.attrib['id']: project(float(n.attrib['lon']), float(n.attrib['lat']))
            for n in root.findall('node')
        }
        ways = {w.attrib['id']: w for w in root.findall('way')}
        path = [[nodes[nd.attrib['ref']] for nd in ways[way].findall('nd')]
                for way in ('749951367', '240524882')]
        points = path[0] + path[1][1:]
        samples = []
        for x in range(-2070, -1204, SAMPLE_STEP):
            (ax, az), (bx, bz) = next(
                (a, b) for a, b in zip(points, points[1:]) if a[0] - 2 <= x <= b[0]
            )
            z = az + (bz - az) * (x - ax)/(bx-ax)
            lon = ORIGIN[0] + x/(111320 * math.cos(math.radians(ORIGIN[1])))
            lat = ORIGIN[1] - z/111320
            rx, ry = round((lon-lon0)/sx), round((lat0-lat)/sy)
            # The source is a surface model. Favor low neighboring samples over roof pixels.
            values = sorted(raster(rx+dx, ry+dy) for dx in (-1,0,1) for dy in (-1,0,1))
            samples.append(values[2])
        medians = [median(samples[max(0, i-2):i+3]) for i in range(len(samples))]
        elevations = [sum(medians[max(0, i-3):i+4])/len(medians[max(0, i-3):i+4])
                      for i in range(len(medians))]
    return [[-2070 + i*SAMPLE_STEP, round(level, 2)] for i, level in enumerate(elevations)]

if __name__ == '__main__':
    profile = build_profile(*sys.argv[1:3])
    destination = Path(sys.argv[3])
    destination.write_text('// Smoothed street-scale approximation from Copernicus GLO-30.\n'
                           'export const westElevation = ' + json.dumps(profile) + ';\n', encoding='utf-8')
    print(f'{len(profile)} samples; {min(h for x,h in profile):.2f}–{max(h for x,h in profile):.2f} m')
