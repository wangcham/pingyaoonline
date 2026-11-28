"""Query the existing project's Amap service for Gutao gate-front businesses.
Reads AMAP_WEB_SERVICE_KEY from the environment or .env.local; no key is exported.
Map POIs are candidates, not evidence of exact storefront order or appearance.
"""
import json
import getpass
import sys
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent


def map_key():
    if os.environ.get('AMAP_WEB_SERVICE_KEY'):
        return os.environ['AMAP_WEB_SERVICE_KEY']
    for path in [ROOT / '.env.local', ROOT / '.env']:
        if not path.is_file():
            continue
        for line in path.read_text().splitlines():
            name, separator, value = line.strip().removeprefix('export ').partition('=')
            if separator and name.strip() in ('AMAP_WEB_SERVICE_KEY', 'AMAP_KEY', 'GAODE_API_KEY'):
                return value.strip().strip('\"\'')
    return None


def main():
    key = map_key()
    if not key and sys.stdin.isatty():
        key = getpass.getpass("Amap Key (hidden): ")
    if not key:
        raise SystemExit('未读到地图 Key：请在项目 .env.local 配置 AMAP_WEB_SERVICE_KEY；未发送请求。')
    rows = {}
    pages = 0
    for page in range(1, 9):
        params = dict(key=key, location='112.16240,37.19255', radius=250,
                      types='050000|060000|070000|080000|100000|140000|160100|160300', sortrule='distance',
                      page_size=25, page_num=page, show_fields='navi,photos')
        try:
            with urlopen('https://restapi.amap.com/v5/place/around?' + urlencode(params), timeout=25) as response:
                data = json.load(response)
        except Exception as exc:
            # URL-bearing exceptions are intentionally not printed.
            raise SystemExit(f'地图请求失败：{type(exc).__name__}；未覆盖已有数据。') from None
        if data.get('status') != '1':
            raise SystemExit(f'高德返回错误代码 {data.get("infocode", "unknown")}；未覆盖已有数据。')
        pois = data.get('pois', [])
        for poi in pois:
            rows[poi['id']] = {k: poi.get(k) for k in ('id', 'name', 'address', 'location', 'typecode', 'parent', 'navi', 'photos')}
        pages += 1
        if len(pois) < 25:
            break
    result = dict(provider='Amap Web Service v5/place/around', crs='GCJ-02',
                  center=[112.16240, 37.19255], radius=250, pages=pages,
                  note='仅候选商户；须按临街位置、共享入口和卫星楼体审核，不能直接当作门面顺序。', pois=list(rows.values()))
    target = ROOT / 'data/gutao-shop-pois.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'已保存 {len(rows)} 个候选商户，使用 {pages} 次请求；不包含 Key。')


if __name__ == '__main__':
    main()
