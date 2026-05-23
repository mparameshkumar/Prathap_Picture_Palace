from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas.user import UserCreate, UserRead
from app.models.user import User
from app.auth import get_current_user, get_password_hash

router = APIRouter()

@router.post("/", response_model=UserRead)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=payload.username, password_hash=get_password_hash(payload.password), role=payload.role or "staff")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db), current=Depends(get_current_user)):
    return db.query(User).all()

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}
