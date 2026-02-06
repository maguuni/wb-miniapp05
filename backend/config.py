from dataclasses import dataclass
from typing import Dict, List, Optional

LOW_STOCK_DEFAULT = 5

@dataclass(frozen=True)
class Item:
    vendor_code: str
    title: str
    low_stock: Optional[int] = None
    target_stock: int = 20

@dataclass(frozen=True)
class Collection:
    name: str
    lead_time_days: int
    items: List[Item]

COLLECTIONS: Dict[str, Collection] = {
    "classic": Collection(
        name="Classic",
        lead_time_days=21,
        items=[
            Item("GP-CL-001", "Classic 120x200", low_stock=7, target_stock=30),
            Item("GP-CL-002", "Classic 160x230", target_stock=20),
        ],
    ),
    "modern": Collection(
        name="Modern",
        lead_time_days=30,
        items=[
            Item("GP-MD-010", "Modern 200x300", low_stock=3, target_stock=10),
            Item("GP-MD-011", "Modern 240x340", target_stock=8),
        ],
    ),
}
from dataclasses import dataclass
from typing import Dict, List, Optional

LOW_STOCK_DEFAULT = 5

@dataclass(frozen=True)
class Item:
    vendor_code: str
    title: str
    low_stock: Optional[int] = None
    target_stock: int = 20

@dataclass(frozen=True)
class Collection:
    name: str
    lead_time_days: int
    items: List[Item]

COLLECTIONS: Dict[str, Collection] = {
    "classic": Collection(
        name="Classic",
        lead_time_days=21,
        items=[
            Item("GP-CL-001", "Classic 120x200", low_stock=7, target_stock=30),
            Item("GP-CL-002", "Classic 160x230", target_stock=20),
        ],
    ),
    "modern": Collection(
        name="Modern",
        lead_time_days=30,
        items=[
            Item("GP-MD-010", "Modern 200x300", low_stock=3, target_stock=10),
            Item("GP-MD-011", "Modern 240x340", target_stock=8),
        ],
    ),
}
