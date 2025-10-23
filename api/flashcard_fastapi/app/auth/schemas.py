from pydantic import BaseModel, EmailStr

class RegisterDto(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginDto(BaseModel):
    email: EmailStr
    password: str

class StudentOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentOut
