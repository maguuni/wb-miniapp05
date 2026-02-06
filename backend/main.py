from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path

from stock_service import list_stock
from production_service import build_production_plan
from config import COLLECTIONS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "miniapp_static"

@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/app.js")
async def js():
    return FileResponse(STATIC_DIR / "app.js")

@app.get("/styles.css")
async def css():
    return FileResponse(STATIC_DIR / "styles.css")

@app.get("/api/collections")
async def collections():
    return [{"key": k, "name": v.name} for k, v in COLLECTIONS.items()]

@app.get("/api/stock")
async def stock(channel="all", tab="instock", collection=None):
    return {"rows": await list_stock(channel, tab, collection)}

@app.post("/api/production/plan")
async def production(collection_key: str):
    return await build_production_plan(collection_key)
