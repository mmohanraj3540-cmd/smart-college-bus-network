from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    regular_bus_id: Optional[int] = None
    selected_stop_id: Optional[int] = None

class StudentCreate(StudentBase):
    password: str
    college_id: int

class StudentOut(StudentBase):
    id: int
    college_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
