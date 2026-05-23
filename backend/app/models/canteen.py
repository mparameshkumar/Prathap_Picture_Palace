from sqlalchemy import Column, Integer, String
from app.db import Base

class Canteen(Base):
    __tablename__ = "canteens"
    canteen_id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
