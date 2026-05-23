from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class Sale(Base):
    __tablename__ = "sales"
    sale_id = Column(Integer, primary_key=True)
    canteen_id = Column(Integer, ForeignKey("canteens.canteen_id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("stock.item_id"), nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    sale_date = Column(DateTime(timezone=True), server_default=func.now())
    show_type = Column(String(20), nullable=False, server_default='morning')  # morning, matinee, first, second

    item = relationship("Stock")
    canteen = relationship("Canteen")
