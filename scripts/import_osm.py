"""Convert a local OSM XML export into compact local-meter map geometry."""
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ORIGIN = (112.1815, 37.204)
BOUNDS = [-2470, -2500, 2470, 4020]
WALL_WAYS = ('87994740', '1213225809', '1213225807')
GATES = {
    '2482491796': ('东', '亲翰门'),
    '2495017559': ('北', '拱极门'),
    '2495017560': ('西', '凤仪门'),
    '2495017561': ('南', '迎薰门'),
    '2495017562': ('西', '永定门'),
    '2495017563': ('东', '泰和门'),
}
WIDTHS = {
    'trunk': 10, 'primary': 10, 'secondary': 9, 'tertiary': 7,
    'residential': 5.5, 'living_street': 4, 'pedestrian': 5,
    'unclassified': 5, 'footway': 2, 'path': 1.6, 'steps': 1.6,
    'service': 3.5, 'motorway': 12, 'primary_link': 5,
    'tertiary_link': 4, 'cycleway': 2,
}
# Road names confirmed separately in local gazetteer and route references.
SHUNCHENG_WAYS = ('25102341', '749951317', '421602232', '749951298')
ROAD_NAMES = dict.fromkeys(SHUNCHENG_WAYS[:2], '顺城北路')
ROAD_NAMES.update(dict.fromkeys(SHUNCHENG_WAYS[2:], '顺城南路'))
ROAD_NAMES.update(dict.fromkeys(('28605934','734385947'), '上西关街'))
ROAD_NAMES.update({'240524882': '下西关街', '421602220': '顺城路 × 上西关街'})



def project(lon, lat):
    return [
        round((lon - ORIGIN[0]) * 111320 * math.cos(math.radians(ORIGIN[1])), 1),
        round((ORIGIN[1] - lat) * 111320, 1),
    ]


def tags(element):
    return {tag.attrib['k']: tag.attrib['v'] for tag in element.findall('tag')}


def main(source, destination, *supplementary):
    roots = [ET.parse(path).getroot() for path in (source,*supplementary)]
    root = ET.Element('osm')
    entities = {}
    for tile in roots:
        for entity in tile:
            if entity.tag in ('node','way') and entity.attrib.get('id'):
                entities[entity.tag,entity.attrib['id']] = entity
    root.extend(entities.values())
    nodes = {
        n.attrib['id']: project(float(n.attrib['lon']), float(n.attrib['lat']))
        for n in root.findall('node')
    }
    data = dict(bounds=BOUNDS, roads=[], areas=[], buildings=[], rail=[], water=[], campus=[], roundabout=[], theaterGreen=[], yongdingPark=[])
    paths = {}
    for way in root.findall('way'):
        points = [nodes.get(n.attrib['ref']) for n in way.findall('nd')]
        if len(points) < 2 or None in points:
            continue
        paths[way.attrib['id']] = points
        attributes = tags(way)
        road = attributes.get('highway')
        name = attributes.get('name:zh', attributes.get('name', '')) or ROAD_NAMES.get(way.attrib['id'], '')
        if road in WIDTHS:
            data['roads'].append([road, WIDTHS[road], name, points])
        if attributes.get('railway') == 'rail':
            data['rail'].append(points)
        if attributes.get('waterway') in ('river', 'canal') and points[0] != points[-1]:
            data['water'].append([7 if attributes['waterway'] == 'river' else 3, points])
        if points[0] != points[-1] or len(points) < 4:
            continue
        ring = points[:-1]
        if way.attrib['id'] == '1126035033':
            data['campus'] = ring
        if way.attrib['id'] == '792912478':
            data['theaterGreen'] = ring
        if way.attrib['id'] == '1313450267':
            data['yongdingPark'] = ring
        if way.attrib['id'] == '421602220':
            data['roundabout'] = ring
        if 'building' in attributes and attributes['building'] != 'no':
            def positive_tag(value, units=False):
                match = re.fullmatch(r'(\d+(?:\.\d+)?)\s*(m|ft)?', str(value or '').strip())
                if not match or (match[2] and not units):
                    return None
                number = float(match[1]) * (.3048 if match[2] == 'ft' else 1)
                return number if math.isfinite(number) and number > 0 else None
            measured = positive_tag(attributes.get('height'), True)
            levels = positive_tag(attributes.get('building:levels'))
            height = measured if measured is not None else (levels or 2) * 3.2
            metadata = {'id': 'osm-way-' + way.attrib['id'], 'buildingType': attributes.get('building', 'unknown'),
                        'height': height, 'levels': levels or max(1, round(height / 3.2)),
                        'osmHeight': attributes.get('height'), 'osmLevels': attributes.get('building:levels'),
                        'heightSource': 'OSM:height' if measured is not None else 'OSM:building:levels' if levels else 'type-estimate',
                        'confidence': .85 if measured is not None else .8 if levels else .25,
                        'estimated': measured is None, 'footprintSource': 'OSM', 'footprintEstimated': False}
            data['buildings'].append([name, height, ring, metadata])
        if attributes.get('natural') == 'water' or 'water' in attributes:
            data['areas'].append(['water', ring])
        elif attributes.get('leisure') == 'park' or attributes.get('landuse') == 'forest':
            data['areas'].append(['park', ring])

    wall = []
    for identifier in WALL_WAYS:
        part = paths[identifier]
        if wall:
            assert wall[-1] == part[0], identifier
        wall.extend(part if not wall else part[1:])
    assert wall[0] == wall[-1]
    data['wall'] = wall
    # Keep both connected ways even where OSM omits the street name on the eastern portion.
    data['shunchengWays'] = [paths[identifier] for identifier in SHUNCHENG_WAYS]
    data['lowerWestRoad'] = paths['749951367'] + paths['240524882'][1:]
    data['lowerWestInnerGate'] = nodes['2495017560']
    data['gates'] = [[direction, name, nodes[identifier]]
                     for identifier, (direction, name) in GATES.items()]
    Path(destination).write_text(
        '// © OpenStreetMap contributors (ODbL). See README.md.\n'
        'export const mapData = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8',
    )
    print({key: len(data[key]) for key in ('roads','wall','gates','buildings','areas','rail','water')})


if __name__ == '__main__':
    main(*sys.argv[1:])
