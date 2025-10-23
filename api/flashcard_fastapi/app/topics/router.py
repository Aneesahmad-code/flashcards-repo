from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
try:
    # Pydantic v2
    from pydantic import BaseModel, Field
    from pydantic import ConfigDict  # type: ignore
    HAS_V2 = True
except Exception:  # Pydantic v1 fallback
    from pydantic import BaseModel, Field
    HAS_V2 = False

# ⬇️ Adjust these imports to your actual project structure
# e.g. from app.database import get_db
#      from app.topics import service as topic_service
from ..deps import get_db

class TopicCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Topic title")

    if not HAS_V2:
        class Config:
            extra = "ignore"  # ignore unexpected fields in body (pydantic v1)
    else:
        model_config = ConfigDict(extra="ignore")  # pydantic v2

class TopicOut(BaseModel):
    id: int
    title: str
    subjectId: int

    if not HAS_V2:
        class Config:
            orm_mode = True
    else:
        model_config = ConfigDict(from_attributes=True)

router = APIRouter()

# ---- Service Layer Adapter ---------------------------------------------------
# Replace these with your actual persistence calls.
# Keeping them thin helps you wire to your existing code quickly.

class TopicServicePort:
    """Port/adapter for your real topic service / CRUD layer."""

    def list_for_subject(self, db, *, student_id: int, subject_id: int) -> List[dict]:
        """
        Return a list of topics (as dict or ORM objects with .id/.title/.subjectId).
        Replace this stub with your real implementation.
        """
        raise NotImplementedError

    def create(self, db, *, student_id: int, subject_id: int, title: str) -> dict:
        """
        Create a topic and return it (as dict or ORM object).
        Replace this stub with your real implementation.
        """
        raise NotImplementedError

    def update_title(self, db, *, student_id: int, subject_id: int, topic_id: int, title: str) -> dict:
        """Update topic title and return updated topic."""
        raise NotImplementedError

    def delete(self, db, *, student_id: int, subject_id: int, topic_id: int) -> None:
        """Delete a topic; flashcards are removed via cascade."""
        raise NotImplementedError


# Inject your real implementation here
from . import service as _svc

class _RealTopicService(TopicServicePort):
    def list_for_subject(self, db, *, student_id: int, subject_id: int):
        return _svc.list_topics_for_student_subject(
            db, student_id=student_id, subject_id=subject_id
        )

    def create(self, db, *, student_id: int, subject_id: int, title: str):
        return _svc.create_topic_for_student_subject(
            db, student_id=student_id, subject_id=subject_id, title=title
        )

    def update_title(self, db, *, student_id: int, subject_id: int, topic_id: int, title: str):
        return _svc.update_topic_title_for_student_subject(
            db,
            student_id=student_id,
            subject_id=subject_id,
            topic_id=topic_id,
            title=title,
        )

    def delete(self, db, *, student_id: int, subject_id: int, topic_id: int) -> None:
        return _svc.delete_topic_for_student_subject(
            db, student_id=student_id, subject_id=subject_id, topic_id=topic_id
        )

topic_service: TopicServicePort = _RealTopicService()


# ---- Routes ------------------------------------------------------------------

@router.get(
    "/students/{student_id}/subjects/{subject_id}/topics",
    response_model=List[TopicOut],
    status_code=status.HTTP_200_OK,
)
def list_topics_for_subject(
    student_id: int,
    subject_id: int,
    db=Depends(get_db),
):
    """
    List all topics for a subject for a given student.
    Uses subject_id from the path (no subjectId in body).
    """
    try:
        rows = topic_service.list_for_subject(db, student_id=student_id, subject_id=subject_id)
        return rows
    except HTTPException:
        raise
    except RuntimeError as e:
        # Service not wired properly
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load topics: {e}")


@router.post(
    "/students/{student_id}/subjects/{subject_id}/topics",
    response_model=TopicOut,
    status_code=status.HTTP_201_CREATED,
)
def create_topic(student_id: int, subject_id: int, payload: TopicCreate, db=Depends(get_db)):
    # ✅ Important: we never access payload.subjectId — it doesn’t exist in TopicCreate
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")

    try:
        # call your real service to insert into DB
        created = topic_service.create(
            db,
            student_id=student_id,
            subject_id=subject_id,
            title=title
        )
        return created

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create topic: {e}")


# ---- New: Update & Delete ----------------------------------------------------

class TopicUpdate(BaseModel):
    title: str

    if not HAS_V2:
        class Config:
            extra = "ignore"
    else:
        model_config = ConfigDict(extra="ignore")


@router.patch(
    "/students/{student_id}/subjects/{subject_id}/topics/{topic_id}",
    response_model=TopicOut,
    status_code=status.HTTP_200_OK,
)
def update_topic(
    student_id: int,
    subject_id: int,
    topic_id: int,
    payload: TopicUpdate,
    db=Depends(get_db),
):
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")
    try:
        updated = topic_service.update_title(
            db,
            student_id=student_id,
            subject_id=subject_id,
            topic_id=topic_id,
            title=title,
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update topic: {e}")


@router.delete(
    "/students/{student_id}/subjects/{subject_id}/topics/{topic_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_topic(student_id: int, subject_id: int, topic_id: int, db=Depends(get_db)):
    try:
        topic_service.delete(db, student_id=student_id, subject_id=subject_id, topic_id=topic_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete topic: {e}")
    return None
