from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, SecurityScopes
from fastapi.security.http import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from app.core.config import settings
from app.db import get_db
from app.auth_user import (
    authenticate_user, create_access_token, get_current_active_user, 
    create_user, UserCreate, ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.models.user import User
from app.models.order import UserOrder, OrderItem, StockReservation
from app.models.stock import Stock
from app.models.canteen import Canteen

class StockReservationRequest(BaseModel):
    item_id: int
    quantity: int

router = APIRouter(tags=["user"])

@router.get("/test-token")
def test_token():
    """Test endpoint to verify token transmission"""
    try:
        auth_header = request.headers.get("authorization")
        print(f"Raw Authorization header: {auth_header}")
        print(f"Authorization header type: {type(auth_header)}")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            print(f"Extracted token: {token[:20]}...")
            return {"token_received": True, "token_length": len(token)}
        else:
            print("No Bearer token found in header")
            return {"token_received": False, "error": "No Bearer token"}
    except Exception as e:
        print(f"Error in test_token: {e}")
        return {"error": str(e)}

@router.post("/register", response_model=dict)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    try:
        user = create_user(db, user_data)
        return {
            "message": "User created successfully",
            "user_id": user.user_id,
            "username": user.username
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/token", response_model=dict)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return access token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id)}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/profile", response_model=dict)
def get_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile."""
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "created_at": current_user.created_at
    }

@router.get("/menu", response_model=dict)
def get_menu(canteen_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get available menu items with stock information."""
    query = db.query(Stock).filter(Stock.quantity > 0)
    
    # Filter by canteen if specified
    if canteen_id:
        query = query.filter(Stock.canteen_id == canteen_id)
    
    menu_items = query.all()
    
    menu = []
    for item in menu_items:
        menu.append({
            "item_id": item.item_id,
            "item_name": item.item_name,
            "price": float(item.price),
            "available_quantity": item.quantity,
            "canteen_id": item.canteen_id
        })
    
    return {"menu": menu}

@router.post("/reserve-stock", response_model=dict)
def reserve_stock(
    reservation_request: StockReservationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reserve stock for an order (handles concurrent requests)."""
    print(f"Stock reserve attempt by user: {current_user.username if current_user else 'No user'}")
    print(f"Reservation request: {reservation_request}")
    
    print(f"Authentication successful for user: {current_user.username}")
    
    # Check if item exists and has enough stock
    item = db.query(Stock).filter(Stock.item_id == reservation_request.item_id).first()
    if not item:
        print(f"Item not found: {reservation_request.item_id}")
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Calculate available stock (current stock - active reservations)
    active_reservations = db.query(StockReservation).filter(
        and_(
            StockReservation.item_id == reservation_request.item_id,
            StockReservation.status == 'active',
            StockReservation.expires_at > datetime.utcnow()
        )
    ).all()
    
    reserved_quantity = sum(res.quantity_reserved for res in active_reservations)
    available_stock = item.quantity - reserved_quantity
    
    if available_stock < reservation_request.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Only {available_stock} items available. Requested: {reservation_request.quantity}"
        )
    
    # Create reservation
    expires_at = datetime.utcnow() + timedelta(minutes=10)  # 10 minute reservation
    reservation = StockReservation(
        item_id=reservation_request.item_id,
        order_id=None,  # Will be set when order is created
        quantity_reserved=reservation_request.quantity,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        status='active'
    )
    
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    
    return {
        "reservation_id": reservation.reservation_id,
        "message": "Stock reserved successfully",
        "expires_at": reservation.expires_at
    }

@router.post("/orders", response_model=dict)
def create_order(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new order."""
    try:
        # Validate required fields
        required_fields = ['canteen_id', 'seat_number', 'show_time', 'theatre_name', 'items']
        for field in required_fields:
            if field not in order_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create order
        order = UserOrder(
            user_id=current_user.user_id,
            canteen_id=order_data['canteen_id'],
            seat_number=order_data['seat_number'],
            show_time=order_data['show_time'],
            theatre_name=order_data['theatre_name'],
            special_instructions=order_data.get('special_instructions'),
            order_status='pending'
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Add order items and confirm reservations
        total_amount = 0
        for item_data in order_data['items']:
            item_id = item_data['item_id']
            quantity = item_data['quantity']
            
            # Get item price
            item = db.query(Stock).filter(Stock.item_id == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
            
            # Create order item
            order_item = OrderItem(
                order_id=order.order_id,
                item_id=item_id,
                quantity=quantity,
                price_per_item=item.price,
                total_price=item.price * quantity
            )
            db.add(order_item)
            
            # Update stock reservation
            reservation = db.query(StockReservation).filter(
                and_(
                    StockReservation.item_id == item_id,
                    StockReservation.order_id.is_(None),
                    StockReservation.status == 'active'
                )
            ).first()
            
            if reservation:
                reservation.order_id = order.order_id
                reservation.status = 'confirmed'
            
            total_amount += item.price * quantity
        
        # Update order total
        order.total_amount = total_amount
        db.commit()
        
        return {
            "order_id": order.order_id,
            "message": "Order created successfully",
            "total_amount": float(total_amount)
        }
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Order creation failed: {str(e)}"
        )

@router.get("/orders", response_model=dict)
def get_user_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's orders."""
    query = db.query(UserOrder).filter(UserOrder.user_id == current_user.user_id)
    
    if status:
        query = query.filter(UserOrder.order_status == status)
    
    orders = query.order_by(UserOrder.created_at.desc()).all()
    
    result = []
    for order in orders:
        # Get order items
        items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
        
        order_data = {
            "order_id": order.order_id,
            "canteen_id": order.canteen_id,
            "seat_number": order.seat_number,
            "show_time": order.show_time,
            "theatre_name": order.theatre_name,
            "order_status": order.order_status,
            "total_amount": float(order.total_amount),
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "special_instructions": order.special_instructions,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "items": [
                {
                    "item_id": item.item_id,
                    "item_name": item.item.item_name if item.item else "Unknown",
                    "quantity": item.quantity,
                    "price_per_item": float(item.price_per_item),
                    "total_price": float(item.total_price),
                    "item_status": item.item_status
                }
                for item in items
            ]
        }
        result.append(order_data)
    
    return {"orders": result}

@router.get("/orders/{order_id}", response_model=dict)
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific order details."""
    order = db.query(UserOrder).filter(
        and_(
            UserOrder.order_id == order_id,
            UserOrder.user_id == current_user.user_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get order items
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    
    return {
        "order_id": order.order_id,
        "canteen_id": order.canteen_id,
        "seat_number": order.seat_number,
        "show_time": order.show_time,
        "theatre_name": order.theatre_name,
        "order_status": order.order_status,
        "total_amount": float(order.total_amount),
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "special_instructions": order.special_instructions,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": [
            {
                "item_id": item.item_id,
                "item_name": item.item.item_name if item.item else "Unknown",
                "quantity": item.quantity,
                "price_per_item": float(item.price_per_item),
                "total_price": float(item.total_price),
                "item_status": item.item_status
            }
            for item in items
        ]
    }

# Order deletion removed from user capabilities - admin only

# Order checkout removed from user capabilities - admin only
