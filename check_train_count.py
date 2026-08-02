import urllib.request, json
req = urllib.request.Request('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', data=b'grant_type=client_credentials&client_id=M11507108-c58329e5-3f1e-426a&client_secret=4e74f084-927b-4f1e-9a37-4afa29696271')
token = json.loads(urllib.request.urlopen(req).read()).get('access_token')

req_ty = urllib.request.Request('https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TYMC?%24format=JSON', headers={'Authorization': 'Bearer ' + token})
data_ty = json.loads(urllib.request.urlopen(req_ty).read())

req_trtc = urllib.request.Request('https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?%24top=300&%24format=JSON', headers={'Authorization': 'Bearer ' + token})
data_trtc = json.loads(urllib.request.urlopen(req_trtc).read())

print("TYMC items:", len(data_ty))
print("TRTC items:", len(data_trtc))
