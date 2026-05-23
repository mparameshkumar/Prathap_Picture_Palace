from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class UserOrder(Base):
    __tablename__ = "user_orders"
    order_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    canteen_id = Column(Integer, ForeignKey("canteens.canteen_id"), nullable=False, index=True)
    seat_number = Column(String(10), nullable=False)
    show_time = Column(String(20), nullable=False)  # morning, matinee, first_show, second_show, special
    theatre_name = Column(String(50), nullable=False)  # Prathap Deluxe, Mini Prathap, etc.
    order_status = Column(String(20), nullable=False, default='pending', index=True)
    total_amount = Column(Numeric(10,2), nullable=False, default=0)
    payment_method = Column(String(20))  # cash, upi, card
    payment_status = Column(String(20), default='pending', index=True)
    special_instructions = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="orders")
    canteen = relationship("Canteen")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    reservations = relationship("StockReservation", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("user_orders.order_id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("stock.item_id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    price_per_item = Column(Numeric(10,2), nullable=False)
    total_price = Column(Numeric(10,2), nullable=False)
    item_status = Column(String(20), default='pending')  # pending, confirmed, preparing, ready
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    order = relationship("UserOrder", back_populates="order_items")
    item = relationship("Stock")

class StockReservation(Base):
    __tablename__ = "stock_reservations"
    reservation_id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("stock.item_id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("user_orders.order_id"), nullable=True, index=True)
    quantity_reserved = Column(Integer, nullable=False)
    reserved_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), default='active', index=True)  # active, confirmed, expired, cancelled
    
    # Relationships
    item = relationship("Stock")
    order = relationship("UserOrder", back_populates="reservations")

class Show(Base):
    __tablename__ = "shows"
    show_id = Column(Integer, primary_key=True, index=True)
    theatre_name = Column(String(50), nullable=False)
    show_time = Column(String(20), nullable=False)
    show_date = Column(Date, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
