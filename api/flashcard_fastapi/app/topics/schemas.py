# app/topics/schema.py
from typing import Optional

# Support both Pydantic v1 and v2 without changing the rest of your code.
try:
    # Pydantic v2
    from pydantic import BaseModel, Field, AliasChoices
    from pydantic import ConfigDict  # type: ignore
    _PD_V2 = True
except Exception:  # Pydantic v1 fallback
    from pydantic import BaseModel, Field  # type: ignore
    _PD_V2 = False


# ---------- Request model ----------

class TopicCreate(BaseModel):
    title: str

    # Ignore unexpected fields (e.g. someone sends subjectId in the body)
    if _PD_V2:
        model_config = ConfigDict(extra="ignore")
    else:
        class Config:
            extra = "ignore"


# ---------- Response model ----------

if _PD_V2:
    # Pydantic v2 version
    class TopicOut(BaseModel):
        id: int
        title: str
        # Read from `subject_id` (ORM/db attribute), output as `subjectId`
        subjectId: int = Field(
            validation_alias=AliasChoices("subject_id", "subjectId"),
            serialization_alias="subjectId",
        )

        # from_attributes lets us return ORM objects; populate_by_name is handy
        model_config = ConfigDict(from_attributes=True, populate_by_name=True)

else:
    # Pydantic v1 version
    class TopicOut(BaseModel):
        id: int
        title: str
        # Accepts data from `subject_id` (ORM/db) and serializes as `subjectId`
        subjectId: int = Field(..., alias="subject_id")

        class Config:
            orm_mode = True
            allow_population_by_field_name = True
            # FastAPI defaults to response_model_by_alias=True, so alias is used


