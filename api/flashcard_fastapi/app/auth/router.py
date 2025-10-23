from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..deps import get_db
from ..models import Student
from ..security import hash_password, verify_password, create_access_token
from .schemas import RegisterDto, LoginDto, StudentOut, LoginResponse

router = APIRouter()

@router.post("/register", response_model=StudentOut)
def register(payload: RegisterDto, db: Session = Depends(get_db)):
    exists = db.query(Student).filter(Student.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    student = Student(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
    )
    db.add(student)
    db.commit()          # <<--- REQUIRED
    db.refresh(student)  # <<--- to return id
    return student

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginDto, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == payload.email).first()
    if not student or not verify_password(payload.password, student.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(student.id)
    return LoginResponse(access_token=token, student=student)
