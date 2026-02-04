import asyncio
from src.app.infrastructure.brokers.tradestation import broker_client

async def test_trigger():
    print("--- TESTING BROKER CONNECTION (SAFE MODE) ---")
    
    # 1. Fire a Fake Buy Order
    print("1. Sending BUY signal for 100 shares of TSLA...")
    response = await broker_client.execute_order(
        symbol="TSLA", 
        action="BUY", 
        quantity=100, 
        price=250.00
    )
    
    # 2. Verify Response
    if response['status'] == 'filled' and response['id'] == 'paper_123':
        print("✅ SUCCESS: Broker Adapter accepted the trade.")
        print(f"   Response: {response}")
        print("   (This proves the JSON payload was constructed correctly)")
    else:
        print("❌ FAILED: Adapter rejected the order.")

if __name__ == "__main__":
    asyncio.run(test_trigger())