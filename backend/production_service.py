from config import COLLECTIONS
from stock_service import list_stock

async def build_production_plan(collection_key: str):
    col = COLLECTIONS.get(collection_key)
    if not col:
        return {"error": "collection_not_found"}

    stock = await list_stock(channel="all", tab="instock", collection=collection_key)

    text = [
        f"Заявка на производство — {col.name}",
        f"Срок производства: {col.lead_time_days} дней",
        ""
    ]

    for item in col.items:
        current = next((x["qty"] for x in stock if x["vendor_code"] == item.vendor_code), 0)
        need = max(0, item.target_stock - current)
        if need > 0:
            text.append(f"{item.vendor_code} — {item.title} → произвести {need}")

    return {"request_text": "\n".join(text)}
