from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.database import engine, Base
from app.models import *

# Routers
from app.api import auth, recommendations, locations, buses, routes, stops, trips
from app.websocket import endpoints as websocket_endpoints

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(locations.router, prefix="/api/trips", tags=["locations"])
app.include_router(buses.router, prefix="/api/buses", tags=["buses"])
app.include_router(routes.router, prefix="/api/routes", tags=["routes"])
app.include_router(stops.router, prefix="/api/stops", tags=["stops"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
from app.api import admin
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(websocket_endpoints.router, tags=["websocket"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart College Bus Network API"}

