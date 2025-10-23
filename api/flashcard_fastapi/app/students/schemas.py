from pydantic import BaseModel, EmailStr

class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class StudentUpdate(BaseModel):
    name: str | None = None

class StudentOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    class Config:
        from_attributes = True

