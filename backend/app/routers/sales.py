from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.db import get_db
from app.schemas.sale import SaleCreate, SaleRead
from app.models.sale import Sale
from app.models.stock import Stock
from app.models.canteen import Canteen  # Add this import
from app.auth import get_current_user

router = APIRouter()

class SaleItemCreate(BaseModel):
    item_id: int
    quantity_sold: int
    # Removed price as it will come from stock

class MultiSaleCreate(BaseModel):
    canteen_id: int
    show_type: str
    items: list[SaleItemCreate]

@router.post("/", response_model=list[SaleRead])
def create_sale(payload: MultiSaleCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    try:
        print(f"Received sale payload: {payload}")
        return _process_sale_items(payload, db)
    except HTTPException as http_exc:
        print(f"HTTP Exception in create_sale: {http_exc.detail}")
        db.rollback()
        raise
    except Exception as e:
        print(f"Error creating sale: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing sale: {str(e)}"
        )

def _process_sale_items(payload: MultiSaleCreate, db: Session):
    sales = []
    
    try:
        for item in payload.items:
            # Get stock with lock to prevent race conditions
            stock = db.query(Stock).filter(
                Stock.item_id == item.item_id,
                Stock.canteen_id == payload.canteen_id
            ).with_for_update().first()
            
            if not stock:
                raise HTTPException(status_code=400, detail=f"Item {item.item_id} not found in canteen {payload.canteen_id}")
                
            if stock.quantity < item.quantity_sold:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient stock for item {item.item_id}. Available: {stock.quantity}, Requested: {item.quantity_sold}"
                )
            
            # Update stock
            stock.quantity -= item.quantity_sold
            
            # Create sale record
            sale = Sale(
                canteen_id=payload.canteen_id,
                item_id=item.item_id,
                quantity_sold=item.quantity_sold,
                show_type=payload.show_type
            )
            
            db.add(sale)
            db.flush()  # Flush to get the sale_id
            
            # Add to the list of sales to return
            sales.append(sale)
        
        # Commit the transaction
        db.commit()
        
        # Return the list of created sales
        return sales
        
    except Exception as e:
        db.rollback()
        raise

@router.get("/", response_model=list[SaleRead])
def list_sales(canteen_id: int | None = None, db: Session = Depends(get_db), current=Depends(get_current_user)):
    q = db.query(Sale)
    if canteen_id:
        q = q.filter(Sale.canteen_id == canteen_id)
    return q.order_by(Sale.sale_date.desc()).all()

@router.get("/analytics/daily")
def analytics_daily(canteen_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = (
        db.query(
            func.date(Sale.sale_date).label("date"), 
            func.sum(Sale.quantity_sold).label("qty"),
            func.sum(Sale.quantity_sold * Stock.price).label("total_amount")
        )
        .join(Stock, and_(
            Stock.item_id == Sale.item_id,
            Stock.canteen_id == Sale.canteen_id
        ))
        .filter(Sale.canteen_id == canteen_id)
        .group_by(func.date(Sale.sale_date))
        .order_by(func.date(Sale.sale_date))
        .all()
    )
    return [{
        "date": str(r.date), 
        "quantity": int(r.qty),
        "total_amount": float(r.total_amount) if r.total_amount is not None else 0.0
    } for r in rows]

@router.get("/analytics/monthly")
def analytics_monthly(canteen_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = (
        db.query(
            func.date_trunc('month', Sale.sale_date).label("month"), 
            func.sum(Sale.quantity_sold).label("qty"),
            func.sum(Sale.quantity_sold * Stock.price).label("total_amount")
        )
        .join(Stock, and_(
            Stock.item_id == Sale.item_id,
            Stock.canteen_id == Sale.canteen_id
        ))
        .filter(Sale.canteen_id == canteen_id)
        .group_by(func.date_trunc('month', Sale.sale_date))
        .order_by(func.date_trunc('month', Sale.sale_date))
        .all()
    )
    return [{
        "month": r.month.strftime('%Y-%m'), 
        "quantity": int(r.qty),
        "total_amount": float(r.total_amount) if r.total_amount is not None else 0.0
    } for r in rows]

@router.get("/analytics/weekly-heatmap")
def analytics_weekly_heatmap(canteen_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = (
        db.query(
            func.extract('dow', Sale.sale_date).label('dow'), 
            func.sum(Sale.quantity_sold).label('qty'),
            func.sum(Sale.quantity_sold * Stock.price).label('total_amount')
        )
        .join(Stock, and_(
            Stock.item_id == Sale.item_id,
            Stock.canteen_id == Sale.canteen_id
        ))
        .filter(Sale.canteen_id == canteen_id)
        .group_by(func.extract('dow', Sale.sale_date))
        .order_by(func.extract('dow', Sale.sale_date))
        .all()
    )
    return [{
        "weekday": int(r.dow), 
        "quantity": int(r.qty),
        "total_amount": float(r.total_amount) if r.total_amount is not None else 0.0
    } for r in rows]

class SalesHistoryResponse(BaseModel):
    sale_date: str
    show_type: str
    total_amount: float

@router.get("/history", response_model=List[SalesHistoryResponse])
def get_sales_history(
    canteen_id: int,
    sale_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    try:
        # Verify canteen exists
        canteen = db.query(Canteen).get(canteen_id)
        if not canteen:
            raise HTTPException(status_code=404, detail="Canteen not found")
            
        # Join with stock table to get the price
        query = db.query(
            func.date(Sale.sale_date).label('sale_date'),
            Sale.show_type,
            func.sum(Sale.quantity_sold * Stock.price).label('total_amount')
        ).join(
            Stock, 
            and_(
                Stock.item_id == Sale.item_id,
                Stock.canteen_id == Sale.canteen_id
            )
        ).filter(Sale.canteen_id == canteen_id)
            
        if sale_date:
            query = query.filter(func.date(Sale.sale_date) == sale_date)
        
        rows = (
            query.group_by(func.date(Sale.sale_date), Sale.show_type)
            .order_by(func.date(Sale.sale_date).desc())
            .all()
        )
        
        # Format the response, handling NULL show_type
        result = []
        for row in rows:
            # Ensure show_type is a string, default to empty string if None
            show_type = str(row.show_type) if row.show_type is not None else ""
            result.append({
                "sale_date": str(row.sale_date) if row.sale_date else None,
                "show_type": show_type,
                "total_amount": float(row.total_amount) if row.total_amount is not None else 0.0
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in get_sales_history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching sales history: {str(e)}"
        )

class DailySaleResponse(BaseModel):
    sl_no: int
    item_name: str
    price: float
    quantity_sold: int
    total_cost: float
    show_type: str

@router.get("/daily-sales", response_model=List[Dict[str, Any]])
def get_daily_sales(
    canteen_id: int,
    sale_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    try:
        # Use today's date if no date is provided
        if sale_date is None:
            sale_date = datetime.now().date()
            
        # Verify canteen exists
        canteen = db.query(Canteen).get(canteen_id)
        if not canteen:
            raise HTTPException(status_code=404, detail="Canteen not found")
        
        # Query to get sales data with item details
        sales = (
            db.query(
                Sale,
                Stock.item_name,
                Stock.price
            )
            .join(Stock, and_(
                Stock.item_id == Sale.item_id,
                Stock.canteen_id == Sale.canteen_id
            ))
            .filter(
                Sale.canteen_id == canteen_id,
                func.date(Sale.sale_date) == sale_date
            )
            .order_by(Sale.sale_date.desc())
            .all()
        )
        
        # Format the response
        result = []
        for idx, (sale, item_name, price) in enumerate(sales, 1):
            result.append({
                "sl_no": idx,
                "sale_date": sale.sale_date.strftime('%Y-%m-%d') if sale.sale_date else sale_date.strftime('%Y-%m-%d'),
                "item_name": item_name,
                "price": float(price) if price is not None else 0.0,
                "quantity_sold": sale.quantity_sold,
                "total_cost": float(price * sale.quantity_sold) if price is not None else 0.0,
                "show_type": sale.show_type or ""
            })
            
        return result
        
    except Exception as e:
        print(f"Error in get_daily_sales: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching daily sales: {str(e)}"
        )

# Revenue Statistics Endpoints
class RevenueStatsResponse(BaseModel):
    total_revenue: float
    total_orders: int
    avg_order_value: float
    peak_hours: Dict[str, float]

@router.get("/revenue-stats", response_model=RevenueStatsResponse)
def get_revenue_stats(
    days: int = 1,
    canteen_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days-1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Base query
        query = db.query(Sale).join(Stock, and_(
            Stock.item_id == Sale.item_id,
            Stock.canteen_id == Sale.canteen_id
        ))
        
        if canteen_id:
            query = query.filter(Sale.canteen_id == canteen_id)
        
        query = query.filter(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        
        # Get sales data
        sales = query.all()
        
        # Calculate revenue and orders
        total_revenue = 0
        hourly_sales = {}
        
        for sale in sales:
            revenue = float(sale.quantity_sold * sale.item.price)
            total_revenue += revenue
            
            # Group by hour
            hour = sale.sale_date.hour
            hour_key = f"{hour:02d}:00"
            if hour_key not in hourly_sales:
                hourly_sales[hour_key] = 0
            hourly_sales[hour_key] += revenue
        
        # Calculate total orders (group by sale_date and show_type)
        orders_query = db.query(
            func.date(Sale.sale_date),
            Sale.show_type,
            func.count(func.distinct(Sale.sale_id)).label('order_count')
        )
        
        if canteen_id:
            orders_query = orders_query.filter(Sale.canteen_id == canteen_id)
        
        orders_query = orders_query.filter(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        orders_query = orders_query.group_by(func.date(Sale.sale_date), Sale.show_type)
        
        total_orders = sum(row.order_count for row in orders_query.all())
        
        # Calculate average order value
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Find peak hours (top 3 hours)
        sorted_hours = sorted(hourly_sales.items(), key=lambda x: x[1], reverse=True)[:3]
        peak_hours = {hour: revenue for hour, revenue in sorted_hours}
        
        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "avg_order_value": avg_order_value,
            "peak_hours": peak_hours
        }
        
    except Exception as e:
        print(f"Error in get_revenue_stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching revenue stats: {str(e)}"
        )

# Top Selling Items Endpoints
class TopSellingItemResponse(BaseModel):
    item_name: str
    total_quantity: int
    total_revenue: float
    avg_price: float

@router.get("/sales-report", response_model=List[Dict[str, Any]])
def get_sales_report(
    canteen_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    show_type: Optional[str] = None,
    item_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    try:
        # Set default date range if not provided
        if date_from is None:
            date_from = datetime.now().date()
        if date_to is None:
            date_to = datetime.now().date()
            
        # Verify canteen exists
        canteen = db.query(Canteen).get(canteen_id)
        if not canteen:
            raise HTTPException(status_code=404, detail="Canteen not found")
        
        # Base query to get sales data with item details
        query = db.query(
            Sale,
            Stock.item_name,
            Stock.price
        ).join(Stock, and_(
            Stock.item_id == Sale.item_id,
            Stock.canteen_id == Sale.canteen_id
        )).filter(
            Sale.canteen_id == canteen_id,
            func.date(Sale.sale_date) >= date_from,
            func.date(Sale.sale_date) <= date_to
        )
        
        # Apply additional filters
        if show_type and show_type != "all":
            query = query.filter(Sale.show_type == show_type)
            
        if item_name and item_name != "all":
            query = query.filter(Stock.item_name.ilike(f"%{item_name}%"))
        
        # Order by sale date descending
        sales = query.order_by(Sale.sale_date.desc()).all()
        
        # Format the response
        result = []
        for idx, (sale, item_name, price) in enumerate(sales, 1):
            result.append({
                "sl_no": idx,
                "sale_date": sale.sale_date.strftime('%Y-%m-%d') if sale.sale_date else date_from.strftime('%Y-%m-%d'),
                "item_name": item_name,
                "price": float(price) if price is not None else 0.0,
                "quantity_sold": sale.quantity_sold,
                "total_cost": float(price * sale.quantity_sold) if price is not None else 0.0,
                "show_type": sale.show_type or ""
            })
            
        return result
        
    except Exception as e:
        print(f"Error in get_sales_report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching sales report: {str(e)}"
        )

@router.get("/top-selling-items", response_model=List[TopSellingItemResponse])
def get_top_selling_items(
    days: int = 7,
    limit: int = 5,
    canteen_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days-1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Query to get top selling items
        query = db.query(
            Stock.item_name,
            func.sum(Sale.quantity_sold).label('total_quantity'),
            func.sum(Sale.quantity_sold * Stock.price).label('total_revenue'),
            func.avg(Stock.price).label('avg_price')
        ).join(Stock, and_(
            Stock.item_id == Sale.item_id,
            Stock.canteen_id == Sale.canteen_id
        ))
        
        if canteen_id:
            query = query.filter(Sale.canteen_id == canteen_id)
        
        query = query.filter(Sale.sale_date >= start_date, Sale.sale_date <= end_date)
        query = query.group_by(Stock.item_name, Stock.item_id)
        query = query.order_by(func.sum(Sale.quantity_sold).desc())
        query = query.limit(limit)
        
        results = query.all()
        
        return [
            {
                "item_name": row.item_name,
                "total_quantity": int(row.total_quantity),
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_price": float(row.avg_price) if row.avg_price else 0.0
            }
            for row in results
        ]
        
    except Exception as e:
        print(f"Error in get_top_selling_items: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching top selling items: {str(e)}"
        )
