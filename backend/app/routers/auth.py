from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.auth import verify_password, create_access_token

router = APIRouter()

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        print(f"Login attempt for user: {form_data.username}")
        user = db.query(User).filter(User.username == form_data.username).first()
        
        if not user:
            print(f"User not found: {form_data.username}")
            raise HTTPException(status_code=400, detail="User not found")
        
        # Debug password verification
        print(f"Input password: {form_data.password}")
        print(f"Stored hash: {user.password_hash}")
        print(f"Verification result: {verify_password(form_data.password, user.password_hash)}")
        
        if not verify_password(form_data.password, user.password_hash):
            print(f"Password verification failed for user: {form_data.username}")
            raise HTTPException(status_code=400, detail="Incorrect username or password")
        
        print(f"User found: {user.username}, role: {user.role}")
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is inactive")
        
        token = create_access_token({"sub": user.username})
        print(f"Token created successfully for user: {user.username}")
        
        # Return user info for frontend routing
        return {
            "access_token": token, 
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
