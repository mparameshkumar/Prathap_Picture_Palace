from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CanteenBase(BaseModel):
    name: str
    location: Optional[str] = None
    is_active: bool = True

class CanteenCreate(CanteenBase):
    pass

class CanteenUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

class CanteenInDB(CanteenBase):
    canteen_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CanteenRead(CanteenBase):
    canteen_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# Alias for backward compatibility
Canteen = CanteenInDB
