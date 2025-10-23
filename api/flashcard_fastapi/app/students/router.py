from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import get_db
from .schemas import StudentCreate, StudentUpdate, StudentOut
from .service import create_student, get_student, list_students, update_student, delete_student

router = APIRouter()

@router.post("", response_model=StudentOut)
def create(payload: StudentCreate, db: Session = Depends(get_db)):
    return create_student(db, payload)

@router.get("", response_model=list[StudentOut])
def list_(db: Session = Depends(get_db)):
    return list_students(db)

@router.get("/{student_id}", response_model=StudentOut)
def get(student_id: int, db: Session = Depends(get_db)):
    student = get_student(db, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    return student

@router.patch("/{student_id}", response_model=StudentOut)
def patch(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = get_student(db, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    return update_student(db, student, payload)

@router.delete("/{student_id}", status_code=204)
def delete(student_id: int, db: Session = Depends(get_db)):
    student = get_student(db, student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    delete_student(db, student)
