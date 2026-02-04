import asyncio
import httpx
# Hardcode your credentials temporarily just to get the IDs
REFRESH_TOKEN = "YOUR_REFRESH_TOKEN_HERE" 
CLIENT_ID = "YOUR_CLIENT_KEY_HERE"
CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"

async def get_accounts():
    # 1. Get Access Token
    auth_url = "https://signin.tradestation.com/oauth/token"
    data = {
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": REFRESH_TOKEN
    }
    
    async with httpx.AsyncClient() as client:
        print("1. Fetching Access Token...")
        resp = await client.post(auth_url, data=data)
        if resp.status_code != 200:
            print(f"❌ Auth Failed: {resp.text}")
            return
        
        token = resp.json()['access_token']
        print("✅ Access Token Acquired.")

        # 2. Query Accounts (SIM Environment)
        # Note: We query the SIM API specifically
        base_url = "https://sim-api.tradestation.com/v3"
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"2. Fetching Accounts from {base_url}...")
        resp = await client.get(f"{base_url}/brokerage/accounts", headers=headers)
        
        if resp.status_code == 200:
            accounts = resp.json()['Accounts']
            print("\n AVAILABLE SIM ACCOUNTS:")
            for acc in accounts:
                print(f"   - ID: {acc['AccountID']} | Type: {acc['AccountType']} | Currency: {acc['Currency']}")
        else:
            print(f"❌ Account Fetch Failed: {resp.text}")

if __name__ == "__main__":
    asyncio.run(get_accounts())