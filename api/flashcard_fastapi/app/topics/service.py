from sqlalchemy.orm import Session
from ..models import Topic, Subject

def _subject_owned(db: Session, *, student_id: int, subject_id: int) -> Subject | None:
    return db.query(Subject).filter(Subject.id == subject_id, Subject.studentId == student_id).first()

def create_topic_for_student_subject(db: Session, *, student_id: int, subject_id: int, title: str) -> Topic:
    if not _subject_owned(db, student_id=student_id, subject_id=subject_id):
        raise ValueError("Subject not found for this student")
    t = Topic(title=title, subjectId=subject_id)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

def list_topics_for_student_subject(db: Session, *, student_id: int, subject_id: int) -> list[Topic]:
    if not _subject_owned(db, student_id=student_id, subject_id=subject_id):
        raise ValueError("Subject not found for this student")
    return (
        db.query(Topic)
        .filter(Topic.subjectId == subject_id)
        .order_by(Topic.id.asc())
        .all()
    )

def list_all_topics_for_student(db: Session, *, student_id: int) -> list[Topic]:
    # via join on Subject to enforce ownership
    return (
        db.query(Topic)
        .join(Subject, Topic.subjectId == Subject.id)
        .filter(Subject.studentId == student_id)
        .order_by(Topic.id.asc())
        .all()
    )

def get_topic_for_student(db: Session, *, student_id: int, topic_id: int) -> Topic | None:
    return (
        db.query(Topic)
        .join(Subject, Topic.subjectId == Subject.id)
        .filter(Topic.id == topic_id, Subject.studentId == student_id)
        .first()
    )

