"""Build the shareable HTML from the same files used by the local preview."""
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'


def inline_module(name):
    source = (dist / name).read_text(encoding='utf-8')
    source = re.sub(r'^import .+;\n', '', source, flags=re.MULTILINE)
    source = re.sub(r'^export (?=function |const )', '', source, flags=re.MULTILINE)
    return source


def safe_script(source):
    # Map names are external strings. Keep them inside the script element.
    return re.sub(r'</script', lambda match: r'<\/' + match[0][2:], source, flags=re.IGNORECASE)


page = (dist / 'index.html').read_text(encoding='utf-8')
style = (dist / 'style.css').read_text(encoding='utf-8')
sources = inline_module('sources.js')
modules = ['map-data.js', 'geography.js', 'landmarks/coordinates.js', 'pingyao-school-data.js', 'render-stability.js', 'flight-pointer.js', 'west-building-height-data.js', 'building-heights.js', 'west-elevation.js', 'west-block-data.js', 'west-terrain.js', 'paving.js', 'urban-batch.js', 'west-road-layout.js', 'vegetation.js', 'pingyao-school.js', 'west-green-survey.js', 'yufeng-block.js', 'junction-jewelry.js', 'west-district.js', 'shuncheng.js', 'west-corridor.js', 'theater.js', 'west-greenery.js', 'west-block-layout.js', 'west-blocks.js', 'west-experience.js', 'street-detail.js', 'landmarks/survey.js', 'landmarks/data.js', 'old-town-layout.js', 'old-town.js', 'landmarks/architecture.js', 'landmarks/PingyaoCityWall.js', 'landmarks/PingyaoBellTower.js', 'landmarks/Rishengchang.js', 'landmarks/PingyaoCountyYamen.js', 'landmarks/PingyaoConfucianTemple.js', 'landmarks/LandmarkManager.js', 'model.js', 'sky.js', 'city.js']
app = "import('three').then(T => {\n" + '\n'.join(map(inline_module, modules)) + '\n})'
page = page.replace('<link rel="stylesheet" href="./style.css">', '<style>\n' + style + '</style>')
page = page.replace('<script type="module" src="./sources.js"></script>',
                    '<script type="module">\n' + safe_script(sources) + '</script>')
page = page.replace("import('./city.js')", safe_script(app))
for code in re.findall(r'<script type="module">(.*?)</script>', page, re.DOTALL):
    subprocess.run(['node', '--input-type=module', '--check'], input=code, text=True, check=True)
(root / '平遥online.html').write_text(page, encoding='utf-8')
