from sqlalchemy.orm import Session
from ..models import Student
from .schemas import StudentCreate, StudentUpdate
from ..security import hash_password

def create_student(db: Session, data: StudentCreate) -> Student:
    student = Student(
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

def get_student(db: Session, sid: int) -> Student | None:
    return db.get(Student, sid)

def list_students(db: Session, limit: int = 50, offset: int = 0):
    return db.query(Student).offset(offset).limit(limit).all()

def update_student(db: Session, student: Student, data: StudentUpdate) -> Student:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student

def delete_student(db: Session, student: Student) -> None:
    db.delete(student)
    db.commit()

