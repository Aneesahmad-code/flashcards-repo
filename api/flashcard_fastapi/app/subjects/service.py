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


def update_subject_title_for_student(
    db: Session, *, student_id: int, subject_id: int, title: str
) -> Subject:
    """Update a subject's title if it belongs to the student.

    Raises ValueError if the subject is not found for the student.
    """
    s = get_subject_owned_by_student(db, student_id=student_id, subject_id=subject_id)
    if not s:
        raise ValueError("Subject not found for this student")
    s.title = title
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def delete_subject_for_student(db: Session, *, student_id: int, subject_id: int) -> None:
    """Delete a subject owned by the student.

    Topics and flashcards are deleted via ORM cascade configured on the model.
    Raises ValueError if the subject is not found for the student.
    """
    s = get_subject_owned_by_student(db, student_id=student_id, subject_id=subject_id)
    if not s:
        raise ValueError("Subject not found for this student")
    db.delete(s)
    db.commit()
