from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.models.stop import Stop

router = APIRouter()

@router.get("/")
def get_stops(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    stops = db.query(Stop).filter(Stop.college_id == current_user.college_id, Stop.is_active == True).all()
    return stops
