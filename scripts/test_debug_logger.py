#!/usr/bin/env python3
import time
import requests
import datetime

CLIENT_ID = "M11507108-c58329e5-3f1e-426a"
CLIENT_SECRET = "4e74f084-927b-4f1e-9a37-4afa29696271"

AUTH_URL = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
API_URL = "https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?$top=300&$format=JSON"

def get_token():
    try:
        data = {
            'grant_type': 'client_credentials',
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET
        }
        res = requests.post(AUTH_URL, data=data, timeout=5)
        if res.status_code == 200:
            return res.json().get('access_token')
    except Exception as e:
        print(f"Auth error: {e}")
    return None

def fetch_live_data(token):
    try:
        headers = {'Authorization': f'Bearer {token}'}
        res = requests.get(API_URL, headers=headers, timeout=5)
        if res.status_code == 200:
            return res.json()
        elif res.status_code == 401:
            return "401"
    except Exception as e:
        print(f"API error: {e}")
    return None

def main():
    token = get_token()
    if not token:
        print("Failed to get TDX API token.")
        return

    while True:
        data = fetch_live_data(token)
        if data == "401":
            token = get_token()
            data = fetch_live_data(token)

        if data and isinstance(data, list):
            # Filter Red Line (R)
            r_trains = [item for item in data if item.get('LineID') in ['R', 'R22A'] or item.get('LineNo') in ['R', 'R22A']]
            
            now_str = datetime.datetime.now().strftime("%H:%M:%S")
            print("\033[2J\033[H", end="") # Clear screen
            print("\033[41m\033[37m\033[1m [DebugLogger] 淡水信義線 (R Line) TDX 實時列車監控終端 \033[0m")
            print(f"\033[36m🕒 系統時間: {now_str} | 在線列車數: {len(r_trains)}\033[0m\n")
            print(f"{'列車 ID':<10} | {'行駛方向':<25} | {'當前位置':<25} | {'資料狀態':<15} | {'時間戳記'}")
            print("-" * 110)
            
            for t in r_trains:
                train_id = t.get('TrainNo', 'Unknown')
                dir_val = t.get('Direction', 0)
                dest = t.get('DestinationStaionName', {}).get('Zh_tw', t.get('TripHeadSign', 'Unknown'))
                
                direction = f"往 {dest} (Dir: {dir_val})"
                station = t.get('StationName', {}).get('Zh_tw', t.get('StationID', 'Unknown'))
                status_cd = t.get('TrainStatus', 0)
                
                if status_cd == 1:
                    loc = f"停靠於 [{station}]"
                elif status_cd == 2:
                    loc = f"將抵達 [{station}]"
                else:
                    loc = f"前往 [{station}]"
                    
                print(f"{train_id:<10} | {direction:<25} | {loc:<25} | {'🟢 TDX 實時':<15} | {now_str}")
                
            print("-" * 110)
            print("Press Ctrl+C to exit. Refreshing every 60 seconds...")
            
        time.sleep(60)

if __name__ == "__main__":
    main()
