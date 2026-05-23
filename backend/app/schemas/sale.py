from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SaleBase(BaseModel):
    canteen_id: int
    item_id: int
    quantity_sold: int = Field(..., gt=0, description="Number of items sold")
    show_type: str = Field(default="morning", description="Show type: morning, matinee, first_show, second_show")

class SaleCreate(SaleBase):
    pass

class SaleUpdate(BaseModel):
    quantity_sold: Optional[int] = Field(None, gt=0)
    sale_date: Optional[datetime] = None
    show_type: Optional[str] = None

class SaleInDB(SaleBase):
    sale_id: int
    total_amount: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SaleRead(BaseModel):
    sale_id: int
    canteen_id: int
    item_id: int
    quantity_sold: int
    sale_date: datetime
    show_type: str

    class Config:
        from_attributes = True

# Alias for backward compatibility
Sale = SaleInDB
