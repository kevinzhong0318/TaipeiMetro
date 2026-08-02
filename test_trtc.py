import requests

URL_AUTH = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
CLIENT_ID = 'M11507108-c58329e5-3f1e-426a'
CLIENT_SECRET = '4e74f084-927b-4f1e-9a37-4afa29696271'

r = requests.post(URL_AUTH, data={'grant_type': 'client_credentials', 'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET})
token = r.json().get('access_token')

headers = {'Authorization': f'Bearer {token}'}
r = requests.get('https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?%24format=JSON', headers=headers)
data = r.json()

keys = set()
for item in data:
    keys.update(item.keys())

print("TRTC Keys:", keys)
