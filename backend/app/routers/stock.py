import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional

from app.db import get_db
from app.schemas.stock import StockCreate, StockUpdate, StockRead
from app.models.stock import Stock
from app.auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Stock service is running"}

@router.post("/", response_model=StockRead, status_code=status.HTTP_201_CREATED)
def create_stock(
    payload: StockCreate, 
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info(f"Creating new stock item for canteen_id: {payload.canteen_id}")
        
        # Create new stock item
        stock_item = Stock(**payload.dict())
        db.add(stock_item)
        db.commit()
        db.refresh(stock_item)
        
        logger.info(f"Created new stock item: {stock_item.id}")
        return stock_item
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while creating stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating stock item"
        )
    except Exception as e:
        logger.error(f"Unexpected error in create_stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.get("/", response_model=List[StockRead])
def list_stock(
    canteen_id: Optional[int] = None, 
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info(f"Fetching stock items for canteen_id: {canteen_id}")
        
        query = db.query(Stock)
        if canteen_id is not None:
            query = query.filter(Stock.canteen_id == canteen_id)
            
        stock_items = query.offset(skip).limit(limit).all()
        logger.info(f"Found {len(stock_items)} stock items")
        
        return stock_items
        
    except SQLAlchemyError as e:
        error_msg = f"Database error while fetching stock: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching stock items"
        )
    except Exception as e:
        error_msg = f"Unexpected error in list_stock: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.patch("/{item_id}", response_model=StockRead)
def update_stock(
    item_id: int, 
    payload: StockUpdate, 
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info(f"Updating stock item with ID: {item_id}")
        
        stock_item = db.query(Stock).get(item_id)
        if not stock_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with ID {item_id} not found"
            )
            
        # Update only the fields that were provided in the payload
        update_data = payload.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(stock_item, field, value)
            
        db.commit()
        db.refresh(stock_item)
        
        logger.info(f"Updated stock item with ID: {item_id}")
        return stock_item
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while updating stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating stock item"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_stock(
    item_id: int, 
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info(f"Deleting stock item with ID: {item_id}")
        
        stock_item = db.query(Stock).get(item_id)
        if not stock_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with ID {item_id} not found"
            )
            
        db.delete(stock_item)
        db.commit()
        
        logger.info(f"Deleted stock item with ID: {item_id}")
        return {
            "status": "success", 
            "message": f"Stock item with ID {item_id} deleted"
        }
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while deleting stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting stock item"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in delete_stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )
