from pydantic import BaseModel
from decimal import Decimal

class StockBase(BaseModel):
    item_name: str
    canteen_id: int
    price: Decimal
    quantity: int

class StockCreate(StockBase):
    pass

class StockUpdate(BaseModel):
    item_name: str | None = None
    price: Decimal | None = None
    quantity: int | None = None

class StockRead(StockBase):
    item_id: int

    class Config:
        from_attributes = True
