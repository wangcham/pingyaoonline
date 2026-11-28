"""Refresh school POIs via the official Amap Web Service (key kept server-side).
Usage: AMAP_WEB_SERVICE_KEY=... python3 scripts/fetch_school_pois.py
This does not infer footprints or heights from POI centres, or modify models.
"""
import json
from fetch_gutao_shops import map_key
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


def main():
    key = map_key()
    if not key:
        raise SystemExit('缺少 AMAP_WEB_SERVICE_KEY；未请求接口。请在本地环境配置，不要写入前端或提交密钥。')
    queries = ['平遥现代工程技术学校', '平遥县实验初级中学校', '平遥古陶一中']
    result = []
    for query in queries:
        params = urlencode(dict(key=key, keywords=query, city='140728', citylimit='true', extensions='all', offset=10, page=1, output='JSON'))
        try:
            with urlopen('https://restapi.amap.com/v3/place/text?' + params, timeout=25) as response:
                data = json.load(response)
        except Exception:
            # urllib exception strings may include the full URL and its key.
            raise SystemExit(f'{query}：高德请求失败；未覆盖现有数据。') from None
        if data.get('status') != '1':
            raise SystemExit(f'{query}：高德返回错误代码 {data.get("infocode", "unknown")}；未覆盖现有数据。')
        pois = [{k: p.get(k) for k in ('id', 'name', 'address', 'location', 'type', 'adcode')} for p in data.get('pois', [])]
        result.append(dict(query=query, crs='GCJ-02', pois=pois))
    target = Path(__file__).resolve().parent.parent / 'data' / 'school-pois-amap.json'
    target.write_text(json.dumps(dict(provider='Amap Web Service v3/place/text', results=result), ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'已保存 {len(result)} 组查询；候选需核对，未自动搬移建筑。')


if __name__ == '__main__':
    main()
