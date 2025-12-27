# app/flashcards/router.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..deps import get_db
from .schemas import FlashcardCreate, FlashcardOut, GenerateFlashcardsRequest
from .service import (
    create_flashcard,
    create_flashcards_bulk,
    list_flashcards_for_topic,
    _topic_owned_by_student,
    delete_flashcard_for_topic,
)
from ..ai.gemini import generate_flashcards as gemini_generate
from ..ai.gemini import generate_flashcards_with_image as gemini_generate_with_image

router = APIRouter()

# --- existing simple CRUD (keep yours) ---
@router.post("/topics/{topic_id}/flashcards", response_model=FlashcardOut)
def create(payload: FlashcardCreate, topic_id: int, db: Session = Depends(get_db)):
    if payload.topicId and payload.topicId != topic_id:
        raise HTTPException(400, "topicId in body must match path")
    return create_flashcard(db, value=payload.value, topicId=topic_id)

@router.get("/topics/{topic_id}/flashcards", response_model=list[FlashcardOut])
def list_for_topic(topic_id: int, db: Session = Depends(get_db)):
    return list_flashcards_for_topic(db, topic_id=topic_id)

# --- NEW: student-scoped AI generation & save ---
@router.post("/students/{student_id}/topics/{topic_id}/flashcards:generate", response_model=list[FlashcardOut])
def generate_and_save_flashcards(student_id: int, topic_id: int, body: GenerateFlashcardsRequest, db: Session = Depends(get_db)):
    owned = _topic_owned_by_student(db, student_id=student_id, topic_id=topic_id)
    if not owned:
        raise HTTPException(404, "Topic not found for this student")
    topic, subject = owned

    # Call Gemini
    pairs = gemini_generate(
        subject_title=subject.title,
        topic_title=topic.title,
        topic_area=body.topicArea,
        count=body.count,
    )
    if not pairs:
        raise HTTPException(502, "AI did not return any usable flashcards")

    # Convert to "Term: Definition" values
    values = [f"{term}: {definition}" for term, definition in pairs]

    # Save to DB
    created = create_flashcards_bulk(db, values=values, topicId=topic_id)
    return created


# --- NEW: student-scoped AI generation with optional image (multipart) ---
@router.post("/students/{student_id}/topics/{topic_id}/flashcards:generate-media", response_model=list[FlashcardOut])
async def generate_and_save_flashcards_media(
    student_id: int,
    topic_id: int,
    topicArea: str = Form(..., description="Text prompt/topic details (required)"),
    count: int = Form(default=10),
    image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    owned = _topic_owned_by_student(db, student_id=student_id, topic_id=topic_id)
    if not owned:
        raise HTTPException(404, "Topic not found for this student")
    topic, subject = owned

    # Validate required text prompt
    if not (topicArea and topicArea.strip()):
        raise HTTPException(400, "topicArea (text prompt) is required")

    # If image provided, validate and use it; otherwise fall back to text-only
    if image is not None:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(400, "Only image uploads are supported")
        data = await image.read()
        if not data:
            raise HTTPException(400, "Uploaded image is empty")
        pairs = gemini_generate_with_image(
            subject_title=subject.title,
            topic_title=topic.title,
            topic_area=topicArea,
            count=count,
            image_bytes=data,
            image_mime=image.content_type,
        )
    else:
        pairs = gemini_generate(
            subject_title=subject.title,
            topic_title=topic.title,
            topic_area=topicArea,
            count=count,
        )
    if not pairs:
        raise HTTPException(502, "AI did not return any usable flashcards")

    values = [f"{term}: {definition}" for term, definition in pairs]
    created = create_flashcards_bulk(db, values=values, topicId=topic_id)
    return created


# --- NEW: delete one flashcard (topic-scoped) ---
@router.delete("/topics/{topic_id}/flashcards/{flashcard_id}", status_code=204)
def delete_one_flashcard(topic_id: int, flashcard_id: int, db: Session = Depends(get_db)):
    try:
        delete_flashcard_for_topic(db, topic_id=topic_id, flashcard_id=flashcard_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return None
