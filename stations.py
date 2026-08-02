import urllib.request
import json
import urllib.parse

query = '[out:json];node["railway"="station"]["network"~"淡海輕軌"];out;'
url = 'https://overpass-api.de/api/interpreter?data=' + urllib.parse.quote(query)

try:
    req = urllib.request.urlopen(url)
    data = json.loads(req.read())
    for e in data['elements']:
        name = e.get('tags', {}).get('name', 'Unknown')
        name_en = e.get('tags', {}).get('name:en', 'Unknown')
        ref = e.get('tags', {}).get('ref', 'Unknown')
        print(f'"{ref}": {{ "name": "{name}", "nameEn": "{name_en}", "lat": {e["lat"]}, "lng": {e["lon"]}, "shape": "circle", "lines": ["V"] }},')
except Exception as e:
    print('Error:', e)
