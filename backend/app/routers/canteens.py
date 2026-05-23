import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List

from app.db import get_db
from app.schemas.canteen import CanteenCreate, CanteenRead
from datetime import datetime
from app.models.canteen import Canteen
from app.auth import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Canteen service is running"}

@router.post("/", response_model=CanteenRead, status_code=status.HTTP_201_CREATED)
def create_canteen(
    payload: CanteenCreate, 
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info(f"Creating new canteen: {payload.name}")
        # Check if canteen with same name exists
        existing_canteen = db.query(Canteen).filter(
            Canteen.name.ilike(payload.name.strip())
        ).first()
        
        if existing_canteen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Canteen with name '{payload.name}' already exists"
            )
            
        # Create new canteen with current timestamp
        canteen = Canteen(
            name=payload.name.strip(),
            created_at=datetime.utcnow()
        )
        db.add(canteen)
        db.commit()
        db.refresh(canteen)
        
        # Ensure created_at is set
        if not canteen.created_at:
            canteen.created_at = datetime.utcnow()
            db.commit()
            db.refresh(canteen)
        
        logger.info(f"Created new canteen: {canteen.name} (ID: {canteen.id})")
        return canteen
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while creating canteen: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating canteen"
        )
    except Exception as e:
        logger.error(f"Unexpected error in create_canteen: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.get("/", response_model=List[CanteenRead])
def list_canteens(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info("Fetching list of canteens")
        canteens = db.query(Canteen).offset(skip).limit(limit).all()
        logger.info(f"Found {len(canteens)} canteens")
        return canteens
        
    except SQLAlchemyError as e:
        error_msg = f"Database error while fetching canteens: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching canteens"
        )
    except Exception as e:
        error_msg = f"Unexpected error in list_canteens: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.delete("/{canteen_id}", status_code=status.HTTP_200_OK)
def delete_canteen(
    canteen_id: int, 
    db: Session = Depends(get_db), 
    current=Depends(get_current_user)
):
    try:
        logger.info(f"Attempting to delete canteen with ID: {canteen_id}")
        canteen = db.query(Canteen).get(canteen_id)
        
        if not canteen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Canteen with ID {canteen_id} not found"
            )
            
        db.delete(canteen)
        db.commit()
        
        logger.info(f"Successfully deleted canteen with ID: {canteen_id}")
        return {"status": "success", "message": f"Canteen with ID {canteen_id} deleted"}
        
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while deleting canteen: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting canteen"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in delete_canteen: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )
