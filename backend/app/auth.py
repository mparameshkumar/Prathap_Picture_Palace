from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from fastapi.security.http import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.core.config import settings
from app.db import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Manual Bearer token authentication
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        print(f"Auth attempt with token: {token[:20] if token else 'No token'}...")
        print(f"Raw credentials: {credentials}")
        print(f"Credentials type: {type(credentials)}")
        print(f"Credentials scheme: {credentials.scheme}")
        print(f"Token from credentials: {token}")
        
        if not token:
            print("No token provided in credentials")
            raise credentials_exception
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: str = payload.get("sub")
        print(f"Decoded sub: {sub}")
        if sub is None:
            raise credentials_exception
    except jwt.PyJWTError as e:
        print(f"JWT decode error: {str(e)}")
        raise credentials_exception

    # Try to parse as integer user_id first, fallback to username
    user = None
    try:
        user_id = int(sub)
        user = db.query(User).filter(User.user_id == user_id).first()
    except (ValueError, TypeError):
        # If not an integer, treat as username
        user = db.query(User).filter(User.username == sub).first()
    if user is None:
        raise credentials_exception
    return user
