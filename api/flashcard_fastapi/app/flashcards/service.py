# app/flashcards/service.py
from sqlalchemy.orm import Session
from ..models import Flashcard, Topic, Subject

def _topic_owned_by_student(db: Session, *, student_id: int, topic_id: int) -> tuple[Topic, Subject] | None:
    q = (
        db.query(Topic, Subject)
        .join(Subject, Topic.subjectId == Subject.id)
        .filter(Topic.id == topic_id, Subject.studentId == student_id)
    )
    row = q.first()
    return row  # (Topic, Subject) or None

def create_flashcard(db: Session, *, value: str, topicId: int) -> Flashcard:
    f = Flashcard(value=value, topicId=topicId)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

def create_flashcards_bulk(db: Session, *, values: list[str], topicId: int) -> list[Flashcard]:
    objs = [Flashcard(value=v, topicId=topicId) for v in values]
    db.add_all(objs)
    db.commit()
    for o in objs:
        db.refresh(o)
    return objs

def list_flashcards_for_topic(db: Session, *, topic_id: int) -> list[Flashcard]:
    return db.query(Flashcard).filter(Flashcard.topicId == topic_id).order_by(Flashcard.id.asc()).all()

