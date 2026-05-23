from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class Stock(Base):
    __tablename__ = "stock"
    item_id = Column(Integer, primary_key=True)
    item_name = Column(String(100), nullable=False)
    canteen_id = Column(Integer, ForeignKey("canteens.canteen_id"), nullable=False, index=True)
    price = Column(Numeric(10,2), nullable=False)
    quantity = Column(Integer, default=0)

    canteen = relationship("Canteen")
