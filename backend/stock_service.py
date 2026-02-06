from datetime import datetime
from config import COLLECTIONS, LOW_STOCK_DEFAULT
from wb_client import get_stock

async def list_stock(channel="all", tab="instock", collection=None):
    fbs = await get_stock("fbs")
    fbo = await get_stock("fbo")

    result = []
    for col_key, col in COLLECTIONS.items():
        if collection and collection != col_key:
            continue

        for item in col.items:
            qty_fbs = fbs.get(item.vendor_code, 0)
            qty_fbo = fbo.get(item.vendor_code, 0)
            qty_all = qty_fbs + qty_fbo

            qty = qty_all if channel == "all" else qty_fbs if channel == "fbs" else qty_fbo
            low = item.low_stock or LOW_STOCK_DEFAULT

            status = "ok"
            if qty <= 0:
                status = "oos"
            elif qty <= low:
                status = "low"

            if tab == "instock" and qty <= 0:
                continue
            if tab == "oos" and qty > 0:
                continue
            if tab == "low" and status != "low":
                continue

            result.append({
                "vendor_code": item.vendor_code,
                "title": item.title,
                "qty": qty,
                "status": status,
                "low_threshold": low,
                "updated_at": datetime.utcnow().isoformat(),
                "qty_breakdown": {
                    "fbs": qty_fbs,
                    "fbo": qty_fbo,
                    "all": qty_all
                }
            })
    return result
