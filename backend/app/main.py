from fastapi import FastAPI, Request, Response, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.routing import APIRoute
from typing import Callable

# Import settings first
from app.core.config import settings

# Import database and models
from app.db import Base, engine, SessionLocal
from app.models import user, canteen, stock, sale, order  # Import all models to ensure they're registered with SQLAlchemy
from app.auth import get_password_hash

# Import routers
from app.routers import auth, users, canteens, stock, sales, analytics
from app.user_routes import router as user_router
from app.canteen_ops import router as canteen_ops_router

app = FastAPI(title=settings.APP_NAME)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # Get the origin from the request
    origin = request.headers.get('origin', 'http://localhost:8081')
    
    # Handle OPTIONS method for CORS preflight
    if request.method == "OPTIONS":
        response = Response(
            status_code=status.HTTP_200_OK,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "600",
            }
        )
        return response
    
    # Process the request and catch any errors
    try:
        response = await call_next(request)
    except Exception as e:
        # Log the error
        print(f"Error processing request: {str(e)}")
        # Create an error response with CORS headers
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    
    # Always add CORS headers to the response
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    return response

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(auth.router, prefix="/api/admin", tags=["admin"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(canteens.router, prefix="/api/canteens", tags=["canteens"])
app.include_router(stock.router, prefix="/api/stock", tags=["stock"])
app.include_router(sales.router, prefix="/api/sales", tags=["sales"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(user_router, prefix="/user", tags=["user"])
app.include_router(canteen_ops_router, prefix="/canteen-ops", tags=["canteen-operations"])

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.on_event("startup")
def on_startup():
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed defaults if missing
    db = SessionLocal()
    try:
        if not db.query(user.User).filter(user.User.username == "admin").first():
            u = user.User(username="admin", password_hash=get_password_hash("admin123"), role="admin")
            db.add(u)
        if db.query(canteen.Canteen).count() == 0:
            db.add_all([
                canteen.Canteen(name="Prathap Delux"),
                canteen.Canteen(name="Prathap Non-Delux"),
                canteen.Canteen(name="Mini Prathap"),
            ])
        db.commit()
    finally:
        db.close()
