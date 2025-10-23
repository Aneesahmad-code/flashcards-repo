from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import bcrypt
from .schemas import RegisterDto, LoginDto
from ..models import Student

def register(dto: RegisterDto, db: Session) -> Student:
    hashed = bcrypt.hashpw(dto.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    student = Student(name=dto.name, email=dto.email, password=hashed)
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(student)
    return student

def verify_login(dto: LoginDto, db: Session) -> Student | None:
    s = db.query(Student).filter(Student.email == dto.email).first()
    if not s:
        return None
    if not bcrypt.checkpw(dto.password.encode('utf-8'), s.password.encode('utf-8')):
        return None
    return s
