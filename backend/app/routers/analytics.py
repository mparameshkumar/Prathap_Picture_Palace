from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from app.db import get_db
from app.models.sale import Sale
from app.models.stock import Stock
from app.models.order import UserOrder
from app.models.canteen import Canteen
from app.auth import get_current_user

router = APIRouter()

@router.get("/analytics")
def get_analytics(
    canteen_id: int,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get comprehensive analytics for a canteen"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Verify canteen exists
        canteen = db.query(Canteen).filter(Canteen.canteen_id == canteen_id).first()
        if not canteen:
            raise HTTPException(status_code=404, detail="Canteen not found")
        
        # Get orders in date range
        orders = db.query(UserOrder).filter(
            and_(
                UserOrder.canteen_id == canteen_id,
                UserOrder.created_at >= start_date,
                UserOrder.created_at <= end_date
            )
        ).all()
        
        # Get sales data in date range
        sales_query = db.query(
            Sale,
            Stock.item_name,
            Stock.price
        ).join(
            Stock, and_(
                Stock.item_id == Sale.item_id,
                Stock.canteen_id == Sale.canteen_id
            )
        ).filter(
            and_(
                Sale.canteen_id == canteen_id,
                Sale.sale_date >= start_date.date(),
                Sale.sale_date <= end_date.date()
            )
        )
        
        sales_data = sales_query.all()
        
        # Calculate metrics
        total_orders = len(orders)
        paid_orders = len([order for order in orders if order.payment_status == 'paid'])
        total_revenue = sum(order.total_amount for order in orders if order.payment_status == 'paid')
        average_order_value = total_revenue / paid_orders if paid_orders > 0 else 0
        
        # Orders by status
        orders_by_status = {}
        for order in orders:
            status = order.order_status
            if status not in orders_by_status:
                orders_by_status[status] = 0
            orders_by_status[status] += 1
        
        # Top selling items
        item_sales = {}
        for sale, item_name, price in sales_data:
            if item_name not in item_sales:
                item_sales[item_name] = {
                    "quantity_sold": 0,
                    "revenue": 0
                }
            item_sales[item_name]["quantity_sold"] += sale.quantity_sold
            item_sales[item_name]["revenue"] += float(price * sale.quantity_sold)
        
        # Sort by revenue and get top 10
        top_selling_items = sorted(
            item_sales.values(),
            key=lambda x: x["revenue"],
            reverse=True
        )[:10]
        
        # Get daily revenue and orders trend
        daily_trend = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            
            # Get orders for this specific date
            daily_orders = db.query(UserOrder).filter(
                and_(
                    UserOrder.canteen_id == canteen_id,
                    func.date(UserOrder.created_at) == date.date()
                )
            ).all()
            
            # Get sales for this specific date
            daily_sales = db.query(
                Sale,
                Stock.price
            ).join(
                Stock, and_(
                    Stock.item_id == Sale.item_id,
                    Stock.canteen_id == Sale.canteen_id
                )
            ).filter(
                and_(
                    Sale.canteen_id == canteen_id,
                    func.date(Sale.sale_date) == date.date()
                )
            ).all()
            
            # Calculate daily metrics
            paid_daily_orders = len([order for order in daily_orders if order.payment_status == 'paid'])
            daily_revenue = sum(order.total_amount for order in daily_orders if order.payment_status == 'paid')
            daily_sales_revenue = sum(float(price * sale.quantity_sold) for sale, price in daily_sales)
            
            # Use the higher of orders revenue or sales revenue
            total_daily_revenue = max(daily_revenue, daily_sales_revenue)
            
            daily_trend.append({
                "date": date.strftime('%b %d'),
                "revenue": total_daily_revenue,
                "orders": paid_daily_orders
            })
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "summary": {
                "total_orders": total_orders,
                "paid_orders": paid_orders,
                "total_revenue": float(total_revenue),
                "average_order_value": float(average_order_value)
            },
            "orders_by_status": orders_by_status,
            "top_selling_items": top_selling_items,
            "daily_trend": daily_trend
        }
        
    except Exception as e:
        print(f"Error in get_analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching analytics: {str(e)}"
        )

@router.get("/analytics/daily")
def get_daily_analytics(
    canteen_id: int,
    date: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get analytics for a specific date"""
    try:
        # Parse date
        target_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        # Verify canteen exists
        canteen = db.query(Canteen).filter(Canteen.canteen_id == canteen_id).first()
        if not canteen:
            raise HTTPException(status_code=404, detail="Canteen not found")
        
        # Get orders for the date
        orders = db.query(UserOrder).filter(
            and_(
                UserOrder.canteen_id == canteen_id,
                func.date(UserOrder.created_at) == target_date
            )
        ).all()
        
        # Get sales for the date
        sales_query = db.query(
            Sale,
            Stock.item_name,
            Stock.price
        ).join(
            Stock, and_(
                Stock.item_id == Sale.item_id,
                Stock.canteen_id == Sale.canteen_id
            )
        ).filter(
            and_(
                Sale.canteen_id == canteen_id,
                func.date(Sale.sale_date) == target_date
            )
        )
        
        sales_data = sales_query.all()
        
        # Calculate daily metrics
        total_orders = len(orders)
        paid_orders = len([order for order in orders if order.payment_status == 'paid'])
        total_revenue = sum(order.total_amount for order in orders if order.payment_status == 'paid')
        
        # Format sales data
        formatted_sales = []
        for idx, (sale, item_name, price) in enumerate(sales_data, 1):
            formatted_sales.append({
                "sl_no": idx,
                "item_name": item_name,
                "price": float(price) if price is not None else 0.0,
                "quantity_sold": sale.quantity_sold,
                "total_cost": float(price * sale.quantity_sold) if price is not None else 0.0,
                "show_type": sale.show_type or ""
            })
        
        return {
            "date": date,
            "summary": {
                "total_orders": total_orders,
                "paid_orders": paid_orders,
                "total_revenue": float(total_revenue),
                "average_order_value": float(total_revenue / paid_orders) if paid_orders > 0 else 0
            },
            "sales": formatted_sales
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        print(f"Error in get_daily_analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching daily analytics: {str(e)}"
        )

@router.get("/analytics/performance")
def get_performance_metrics(
    canteen_id: int,
    days: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get performance metrics and trends"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Verify canteen exists
        canteen = db.query(Canteen).filter(Canteen.canteen_id == canteen_id).first()
        if not canteen:
            raise HTTPException(status_code=404, detail="Canteen not found")
        
        # Get hourly order distribution
        hourly_orders = db.query(
            extract('hour', UserOrder.created_at).label('hour'),
            func.count(UserOrder.order_id).label('order_count')
        ).filter(
            and_(
                UserOrder.canteen_id == canteen_id,
                UserOrder.created_at >= start_date,
                UserOrder.created_at <= end_date
            )
        ).group_by(extract('hour', UserOrder.created_at)).all()
        
        # Get show type distribution
        show_type_sales = db.query(
            Sale.show_type,
            func.sum(Sale.quantity_sold).label('total_quantity'),
            func.sum(Sale.quantity_sold * Stock.price).label('total_revenue')
        ).join(
            Stock, and_(
                Stock.item_id == Sale.item_id,
                Stock.canteen_id == Sale.canteen_id
            )
        ).filter(
            and_(
                Sale.canteen_id == canteen_id,
                Sale.sale_date >= start_date.date(),
                Sale.sale_date <= end_date.date()
            )
        ).group_by(Sale.show_type).all()
        
        # Get weekly pattern
        weekly_pattern = db.query(
            extract('dow', UserOrder.created_at).label('day_of_week'),
            func.count(UserOrder.order_id).label('order_count')
        ).filter(
            and_(
                UserOrder.canteen_id == canteen_id,
                UserOrder.created_at >= start_date,
                UserOrder.created_at <= end_date
            )
        ).group_by(extract('dow', UserOrder.created_at)).all()
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "hourly_distribution": [
                {"hour": int(row.hour), "orders": int(row.order_count)}
                for row in hourly_orders
            ],
            "show_type_performance": [
                {
                    "show_type": row.show_type or "unknown",
                    "quantity_sold": int(row.total_quantity),
                    "revenue": float(row.total_revenue)
                }
                for row in show_type_sales
            ],
            "weekly_pattern": [
                {"day_of_week": int(row.day_of_week), "orders": int(row.order_count)}
                for row in weekly_pattern
            ]
        }
        
    except Exception as e:
        print(f"Error in get_performance_metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching performance metrics: {str(e)}"
        )
