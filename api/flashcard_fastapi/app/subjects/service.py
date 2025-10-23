from sqlalchemy.orm import Session
from ..models import Subject, Student

def create_subject_for_student(db: Session, *, student_id: int, title: str) -> Subject:
    # ensure student exists
    if not db.get(Student, student_id):
        raise ValueError("Student not found")
    s = Subject(title=title, studentId=student_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

def list_subjects_for_student(db: Session, *, student_id: int) -> list[Subject]:
    return (
        db.query(Subject)
        .filter(Subject.studentId == student_id)
        .order_by(Subject.id.asc())
        .all()
    )

def get_subject_owned_by_student(db: Session, *, student_id: int, subject_id: int) -> Subject | None:
    return (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.studentId == student_id)
        .first()
    )

