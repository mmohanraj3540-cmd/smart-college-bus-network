from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.database import get_db
from app.models.student import Student
from app.models.driver import Driver
# Admin model isn't strictly defined, maybe college acts as admin or we have an Admin model. For now we use role claim.

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id: int = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = None
    if role == "STUDENT":
        user = db.query(Student).filter(Student.id == user_id).first()
    elif role == "DRIVER":
        user = db.query(Driver).filter(Driver.id == user_id).first()
    elif role == "ADMIN":
        class DummyAdmin:
            id = 999
            college_id = 1
            role = "ADMIN"
        user = DummyAdmin()
    
    if user is None:
        raise credentials_exception
        
    # We can attach role to user object dynamically to avoid creating a shared base user model just for this
    user.role = role
    return user

def get_current_student(current_user = Depends(get_current_user)):
    if getattr(current_user, "role", "") != "STUDENT":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def get_current_driver(current_user = Depends(get_current_user)):
    if getattr(current_user, "role", "") != "DRIVER":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
