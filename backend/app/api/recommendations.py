from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.services.recommendation_service import find_alternative_buses

router = APIRouter()

@router.get("/alternatives")
def get_alternatives(
    stop_id: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can request alternative buses")
        
    return find_alternative_buses(db, current_user.id, stop_id)
