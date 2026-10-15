from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DriverBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    license_number: Optional[str] = None

class DriverCreate(DriverBase):
    password: str
    college_id: int

class DriverOut(DriverBase):
    id: int
    college_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
