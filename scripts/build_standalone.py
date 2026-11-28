"""Build the shareable HTML from the same files used by the local preview."""
import re
import subprocess
import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'


def inline_module(name):
    source = (dist / name).read_text(encoding='utf-8')
    source = re.sub(r'^import .+;\n', '', source, flags=re.MULTILINE)
    source = re.sub(r'^export (?=(?:async )?function\b|const )', '', source, flags=re.MULTILINE)
    return source


def safe_script(source):
    # Map names are external strings. Keep them inside the script element.
    return re.sub(r'</script', lambda match: r'<\/' + match[0][2:], source, flags=re.IGNORECASE)


page = (dist / 'index.html').read_text(encoding='utf-8')
style = (dist / 'style.css').read_text(encoding='utf-8')
sources = inline_module('sources.js')
modules = ['map-data.js', 'city-extension-data.js', 'city-extension.js', 'geography.js', 'landmarks/coordinates.js', 'road-clearance.js', 'school-sites-data.js', 'qixiang-block-data.js', 'city-survey-progress.js', 'city-plan-data.js', 'city-plan.js', 'pingyao-school-data.js', 'civic-sites-data.js', 'west-neighbourhood-data.js', 'west-sites-data.js', 'render-stability.js', 'flight-pointer.js', 'west-building-height-data.js', 'building-heights.js', 'west-elevation.js', 'west-block-data.js', 'west-terrain.js', 'survey-surfaces.js', 'paving.js', 'urban-batch.js', 'road-adjusted-commercial.js', 'west-road-layout.js', 'vegetation.js', 'pingyao-school.js', 'modern-site.js', 'school-appearance.js', 'school-sites.js', 'civic-sites.js', 'west-neighbourhood.js', 'tiansen.js', 'pingyao-third-school.js', 'west-green-survey.js', 'yufeng-block.js', 'junction-jewelry.js', 'west-district.js', 'west-link-survey.js', 'yingxun-park-data.js', 'west-link-district.js', 'south-city-survey.js', 'south-city.js', 'yingxun-greenery.js', 'shuncheng.js', 'west-corridor.js', 'theater.js', 'west-greenery.js', 'west-block-layout.js', 'west-blocks.js', 'west-experience.js', 'street-detail.js', 'landmarks/survey.js', 'landmarks/data.js', 'old-town-layout.js', 'old-town.js', 'landmarks/architecture.js', 'landmarks/PingyaoCityWall.js', 'landmarks/PingyaoBellTower.js', 'landmarks/Rishengchang.js', 'landmarks/PingyaoCountyYamen.js', 'landmarks/PingyaoConfucianTemple.js', 'landmarks/LandmarkManager.js', 'regional-survey-data.js', 'regional-survey.js', 'regional-districts.js', 'gucheng-station.js', 'qixiang-block.js', 'model.js', 'sky.js', 'city.js']
modules[modules.index('school-sites.js'):modules.index('school-sites.js')]=['local-commerce-materials.js','school-ground-layout.js','school-ground-details.js']
modules.insert(modules.index('pingyao-school.js'), 'pingyao-school-details.js')
modules.insert(modules.index('school-sites-data.js'), 'gutao-shops-data.js')
modules.insert(modules.index('school-sites-data.js'), 'moat-data.js')
modules.insert(modules.index('west-sites-data.js'), 'tiansen-life-data.js')
modules.insert(modules.index('model.js'), 'moat.js')
modules.insert(modules.index('moat.js'), 'small-south-bridge.js')
modules.insert(modules.index('street-detail.js'), 'yingxun-waterfront.js')
modules.insert(modules.index('street-detail.js'), 'ring-commerce.js')
modules.insert(modules.index('street-detail.js'), 'gucheng-station-data.js')
modules.insert(modules.index('gucheng-station.js'), 'gucheng-station-details.js')
modules.insert(modules.index('school-sites.js'), 'gutao-shopfronts.js')
modules.insert(modules.index('street-detail.js'), 'second-school.js')
modules[modules.index('tiansen.js'):modules.index('tiansen.js')]=['street-scooters.js','tiansen-street-details.js','tiansen-street-life.js']
modules.insert(modules.index('civic-sites.js'), 'outlets-detail.js')
modules.insert(modules.index('civic-sites.js'), 'outlets-context.js')
modules.insert(modules.index('city.js'), 'fullscreen.js')
modules.insert(modules.index('old-town-layout.js'), 'old-town-streets-data.js')
modules.insert(modules.index('model.js'), 'old-town-streets.js')
modules.insert(modules.index('west-corridor.js'), 'jinglin-shop.js')
modules.insert(modules.index('west-block-data.js'), 'jinglin-context-data.js')
modules.insert(modules.index('street-detail.js'), 'jinglin-context.js')
# street-detail initializes streetStops immediately. Its old-town data and the
# landmark survey it reads must already exist in the flattened standalone scope.
street_data_dependencies = ['landmarks/survey.js', 'landmarks/data.js', 'old-town-streets-data.js']
for name in street_data_dependencies:
    modules.remove(name)
modules[modules.index('street-detail.js'):modules.index('street-detail.js')] = street_data_dependencies
app = "import('three').then(async T => {\n" + '\n'.join(map(inline_module, modules)) + '\n})'
# Local preview serves the pinned MIT library from dist/vendor. The shareable
# HTML embeds the same modules as data URLs, so file:// needs no CDN or fetch.
def module_url(source):
    return 'data:text/javascript;base64,' + base64.b64encode(source.encode('utf-8')).decode('ascii')
core = (dist / 'vendor/three.core.min.js').read_text(encoding='utf-8')
three = (dist / 'vendor/three.module.min.js').read_text(encoding='utf-8').replace('./three.core.min.js', 'three/core')
import_map = json.dumps({'imports': {'three': module_url(three), 'three/core': module_url(core)}}, separators=(',', ':'))
page = re.sub(r'<script type="importmap">.*?</script>', lambda _: '<script type="importmap">' + import_map + '</script>', page, count=1, flags=re.DOTALL)
license_text = (dist / 'vendor/THREE-LICENSE.txt').read_text(encoding='utf-8').replace('--', '- -')
page = page.replace('</head>', '<!-- Bundled Three.js 0.180.0\n' + license_text + '\n-->\n</head>')
page = page.replace('<link rel="stylesheet" href="./style.css">', '<style>\n' + style + '</style>')
page = page.replace('<script type="module" src="./sources.js"></script>',
                    '<script type="module">\n' + safe_script(sources) + '</script>')
page = page.replace("import('./city.js')", safe_script(app))
for code in re.findall(r'<script type="module">(.*?)</script>', page, re.DOTALL):
    subprocess.run(['node', '--input-type=module', '--check'], input=code, text=True, check=True)
(root / '平遥online.html').write_text(page, encoding='utf-8')
