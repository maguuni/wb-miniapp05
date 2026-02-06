TEST_STOCK = {
    "fbs": {
        "GP-CL-001": 12,
        "GP-CL-002": 0,
        "GP-MD-010": 2,
        "GP-MD-011": 9,
    },
    "fbo": {
        "GP-CL-001": 4,
        "GP-CL-002": 6,
        "GP-MD-010": 0,
        "GP-MD-011": 1,
    }
}

async def get_stock(channel: str) -> dict:
    return TEST_STOCK.get(channel, {})
