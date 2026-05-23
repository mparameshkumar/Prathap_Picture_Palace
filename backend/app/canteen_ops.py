from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from app.db import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.order import UserOrder, OrderItem, StockReservation
from app.models.stock import Stock
from app.models.canteen import Canteen
from app.models.sale import Sale

router = APIRouter(tags=["canteen-operations"])

def get_canteen_staff(current_user: User = Depends(get_current_user)):
    """Check if user is canteen staff."""
    if current_user.role not in ['staff', 'admin']:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for canteen operations"
        )
    return current_user

@router.get("/dashboard", response_model=dict)
def get_canteen_dashboard(
    canteen_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_canteen_staff)
):
    """Get canteen operations dashboard data."""
    # Get pending orders
    pending_orders = db.query(UserOrder).filter(
        and_(
            UserOrder.canteen_id == canteen_id,
            UserOrder.order_status.in_(['pending', 'confirmed'])
        )
    ).order_by(UserOrder.created_at.asc()).all()
    
    # Get today's orders
    today = datetime.utcnow().date()
    today_orders = db.query(UserOrder).filter(
        and_(
            UserOrder.canteen_id == canteen_id,
            func.date(UserOrder.created_at) == today
        )
    ).all()
    
    # Get active reservations
    active_reservations = db.query(StockReservation).filter(
        and_(
            StockReservation.expires_at > datetime.utcnow(),
            StockReservation.status == 'active'
        )
    ).all()
    
    # Calculate stats
    total_orders_today = len(today_orders)
    pending_count = len(pending_orders)
    total_revenue_today = sum(order.total_amount for order in today_orders if order.payment_status == 'paid')
    
    # Prepare order details
    orders_data = []
    for order in pending_orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
        
        order_data = {
            "order_id": order.order_id,
            "user_id": order.user_id,
            "seat_number": order.seat_number,
            "show_time": order.show_time,
            "theatre_name": order.theatre_name,
            "order_status": order.order_status,
            "total_amount": float(order.total_amount),
            "payment_status": order.payment_status,
            "special_instructions": order.special_instructions,
            "created_at": order.created_at,
            "items": [
                {
                    "item_id": item.item_id,
                    "item_name": item.item.item_name if item.item else "Unknown",
                    "quantity": item.quantity,
                    "total_price": float(item.total_price),
                    "item_status": item.item_status
                }
                for item in items
            ]
        }
        orders_data.append(order_data)
    
    return {
        "stats": {
            "total_orders_today": total_orders_today,
            "pending_orders": pending_count,
            "active_reservations": len(active_reservations),
            "total_revenue_today": float(total_revenue_today)
        },
        "pending_orders": orders_data,
        "active_reservations": [
            {
                "reservation_id": res.reservation_id,
                "item_id": res.item_id,
                "quantity_reserved": res.quantity_reserved,
                "reserved_at": res.reserved_at,
                "expires_at": res.expires_at
            }
            for res in active_reservations
        ]
    }

@router.get("/orders", response_model=dict)
def get_all_orders(
    canteen_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_canteen_staff)
):
    """Get all orders for a canteen with filtering."""
    # If canteen_id is provided, filter by it. Admins can see all orders if not provided.
    if canteen_id:
        query = db.query(UserOrder).filter(UserOrder.canteen_id == canteen_id)
    else:
        # Only allow admins to see all orders without canteen_id filter
        if current_user.role != 'admin':
            raise HTTPException(
                status_code=400,
                detail="canteen_id is required for staff users"
            )
        query = db.query(UserOrder)
    
    # Apply filters
    if status:
        query = query.filter(UserOrder.order_status == status)
    
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(UserOrder.created_at >= date_from_obj)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format")
    
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(UserOrder.created_at <= date_to_obj)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format")
    
    orders = query.order_by(UserOrder.created_at.desc()).all()
    
    result = []
    for order in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
        
        order_data = {
            "order_id": order.order_id,
            "user_id": order.user_id,
            "username": order.user.username if order.user else "Unknown",
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

@router.put("/orders/{order_id}/status", response_model=dict)
def update_order_status(
    order_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_canteen_staff)
):
    """Update order status (for canteen operations)."""
    order = db.query(UserOrder).filter(UserOrder.order_id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate status
    new_status = status_update.get('status')
    valid_statuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
    
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Update order status
    order.order_status = new_status
    order.updated_at = datetime.utcnow()
    
    # Update items status if order is being prepared or ready
    if new_status in ['preparing', 'ready']:
        items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        for item in items:
            item.item_status = new_status
    
    db.commit()
    
    return {
        "message": f"Order status updated to {new_status}",
        "order_id": order.order_id,
        "new_status": new_status
    }

@router.put("/orders/{order_id}/item-status", response_model=dict)
def update_item_status(
    order_id: int,
    item_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_canteen_staff)
):
    """Update specific item status in an order."""
    order = db.query(UserOrder).filter(UserOrder.order_id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    item_id = item_update.get('item_id')
    new_status = item_update.get('status')
    valid_statuses = ['pending', 'confirmed', 'preparing', 'ready']
    
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Update item status
    order_item = db.query(OrderItem).filter(
        and_(
            OrderItem.order_id == order_id,
            OrderItem.item_id == item_id
        )
    ).first()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    order_item.item_status = new_status
    db.commit()
    
    return {
        "message": f"Item status updated to {new_status}",
        "order_id": order_id,
        "item_id": item_id,
        "new_status": new_status
    }

@router.get("/stock-alerts", response_model=dict)
def get_stock_alerts(
    canteen_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_canteen_staff)
):
    """Get stock alerts for low quantity items."""
    # Get items with low stock (less than 5)
    low_stock_items = db.query(Stock).filter(
        and_(
            Stock.canteen_id == canteen_id,
            Stock.quantity < 5
        )
    ).all()
    
    # Get items with high reservation activity
    active_reservations = db.query(StockReservation).filter(
        and_(
            StockReservation.expires_at > datetime.utcnow(),
            StockReservation.status == 'active'
        )
    ).all()
    
    # Group reservations by item
    reservation_counts = {}
    for res in active_reservations:
        if res.item_id not in reservation_counts:
            reservation_counts[res.item_id] = 0
        reservation_counts[res.item_id] += res.quantity_reserved
    
    # Get items with high demand
    high_demand_items = []
    for item_id, reserved_qty in reservation_counts.items():
        item = db.query(Stock).filter(Stock.item_id == item_id).first()
        if item and reserved_qty >= item.quantity * 0.8:  # 80% reserved
            high_demand_items.append({
                "item_id": item.item_id,
                "item_name": item.item_name,
                "total_stock": item.quantity,
                "reserved_quantity": reserved_qty,
                "available_quantity": item.quantity - reserved_qty
            })
    
    return {
        "low_stock_items": [
            {
                "item_id": item.item_id,
                "item_name": item.item_name,
                "current_quantity": item.quantity,
                "status": "Low Stock"
            }
            for item in low_stock_items
        ],
        "high_demand_items": high_demand_items
    }

@router.get("/admin/orders")
def get_all_orders_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders for admin dashboard."""
    # Check if user is admin
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    
    orders = db.query(UserOrder).order_by(UserOrder.created_at.desc()).all()
    
    order_list = []
    for order in orders:
        # Get order items
        items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
        
        item_list = []
        for item in items:
            stock_item = db.query(Stock).filter(Stock.item_id == item.item_id).first()
            item_list.append({
                "item_id": item.item_id,
                "item_name": stock_item.item_name if stock_item else "Unknown",
                "quantity": item.quantity,
                "price": float(item.price),
                "item_status": item.item_status
            })
        
        order_list.append({
            "order_id": order.order_id,
            "user_id": order.user_id,
            "canteen_id": order.canteen_id,
            "seat_number": order.seat_number,
            "show_time": order.show_time,
            "theatre_name": order.theatre_name,
            "order_status": order.order_status,
            "total_amount": float(order.total_amount),
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "special_instructions": order.special_instructions,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "items": item_list
        })
    
    return {"orders": order_list}

@router.post("/orders/{order_id}/checkout", response_model=dict)
def admin_checkout_order(
    order_id: int,
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin checkout an order with payment."""
    # Check if user is admin
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    
    order = db.query(UserOrder).filter(UserOrder.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    try:
        # Validate payment data
        if 'payment_method' not in payment_data:
            raise HTTPException(status_code=400, detail="Payment method required")
        
        payment_method = payment_data['payment_method']
        if payment_method not in ['cash', 'upi', 'card']:
            raise HTTPException(status_code=400, detail="Invalid payment method")
        
        # Update order with payment info
        order.payment_method = payment_method
        order.payment_status = 'paid'
        order.order_status = 'completed'
        order.updated_at = datetime.utcnow()
        
        # Get order items and create sales records
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        
        for item in order_items:
            # Update stock
            stock_item = db.query(Stock).filter(Stock.item_id == item.item_id).first()
            if stock_item:
                stock_item.quantity -= item.quantity
                
                # Determine show type from show_time
                show_type = 'morning'  # default
                if order.show_time:
                    show_time_str = order.show_time.lower()
                    if 'matinee' in show_time_str:
                        show_type = 'matinee'
                    elif 'first' in show_time_str:
                        show_type = 'first'
                    elif 'second' in show_time_str:
                        show_type = 'second'
                    elif 'morning' in show_time_str:
                        show_type = 'morning'
                
                # Create sales record
                sale = Sale(
                    canteen_id=order.canteen_id,
                    item_id=item.item_id,
                    quantity_sold=item.quantity,
                    show_type=show_type
                )
                db.add(sale)
            
            # Update order item status
            item.item_status = 'ready'
        
        # Update reservations status
        reservations = db.query(StockReservation).filter(
            and_(
                StockReservation.order_id == order_id,
                StockReservation.status == 'confirmed'
            )
        ).all()
        
        for reservation in reservations:
            reservation.status = 'confirmed'
        
        db.commit()
        
        return {
            "message": "Order checked out successfully",
            "order_id": order.order_id,
            "total_amount": float(order.total_amount),
            "payment_method": payment_method
        }
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Checkout failed: {str(e)}"
        )

@router.delete("/orders/{order_id}", response_model=dict)
def admin_delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin delete an order."""
    # Check if user is admin
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    
    order = db.query(UserOrder).filter(UserOrder.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    # Cancel reservations
    reservations = db.query(StockReservation).filter(
        StockReservation.order_id == order_id
    ).all()
    
    for reservation in reservations:
        reservation.status = 'cancelled'
    
    # Update order status
    order.order_status = 'cancelled'
    
    db.commit()
    
    return {"message": "Order deleted successfully"}

@router.post("/orders/{order_id}/cancel", response_model=dict)
def admin_cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin cancel an order (change status to cancelled)."""
    # Check if user is admin
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )
    
    order = db.query(UserOrder).filter(UserOrder.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    # Cancel reservations
    reservations = db.query(StockReservation).filter(
        StockReservation.order_id == order_id
    ).all()
    
    for reservation in reservations:
        reservation.status = 'cancelled'
    
    # Update order status
    order.order_status = 'cancelled'
    order.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Order cancelled successfully"}

@router.get("/analytics", response_model=dict)
def get_canteen_analytics(
    canteen_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_canteen_staff)
):
    """Get analytics for the canteen."""
    # Date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get orders in date range
    orders = db.query(UserOrder).filter(
        and_(
            UserOrder.canteen_id == canteen_id,
            UserOrder.created_at >= start_date,
            UserOrder.created_at <= end_date
        )
    ).all()
    
    # Calculate metrics
    total_orders = len(orders)
    total_revenue = sum(order.total_amount for order in orders if order.payment_status == 'paid')
    paid_orders = len([order for order in orders if order.payment_status == 'paid'])
    
    # Orders by status
    status_counts = {}
    for order in orders:
        status = order.order_status
        if status not in status_counts:
            status_counts[status] = 0
        status_counts[status] += 1
    
    # Top selling items
    order_items = db.query(OrderItem).join(UserOrder).filter(
        and_(
            UserOrder.canteen_id == canteen_id,
            UserOrder.created_at >= start_date,
            UserOrder.created_at <= end_date
        )
    ).all()
    
    item_sales = {}
    for item in order_items:
        if item.item_id not in item_sales:
            item_sales[item.item_id] = {
                "item_name": item.item.item_name if item.item else "Unknown",
                "quantity_sold": 0,
                "revenue": 0
            }
        item_sales[item.item_id]["quantity_sold"] += item.quantity
        item_sales[item.item_id]["revenue"] += float(item.total_price)
    
    # Sort by revenue
    top_items = sorted(item_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
            "days": days
        },
        "summary": {
            "total_orders": total_orders,
            "paid_orders": paid_orders,
            "total_revenue": float(total_revenue),
            "average_order_value": float(total_revenue / paid_orders) if paid_orders > 0 else 0
        },
        "orders_by_status": status_counts,
        "top_selling_items": top_items
    }
