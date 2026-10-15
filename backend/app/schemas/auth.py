from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class LoginData(BaseModel):
    email: str
    password: str
    role: str # STUDENT, DRIVER, ADMIN
