# app/flashcards/schemas.py
from pydantic import BaseModel

class FlashcardCreate(BaseModel):
    value: str
    topicId: int

class FlashcardOut(BaseModel):
    id: int
    value: str
    topicId: int

    class Config:
        from_attributes = True


# For the AI generate endpoint body:
from pydantic import Field
class GenerateFlashcardsRequest(BaseModel):
    topicArea: str | None = Field(default=None)
    count: int = Field(default=10, ge=1, le=50)
