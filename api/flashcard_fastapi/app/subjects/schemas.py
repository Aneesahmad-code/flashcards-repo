from pydantic import BaseModel

class SubjectCreate(BaseModel):
    """
    Request model used when creating a new subject for a student.
    The student_id is provided via the URL path, not in the body.
    """
    title: str

class SubjectUpdate(BaseModel):
    """
    Request model for updating a subject's title.
    """
    title: str


class SubjectOut(BaseModel):
    """
    Response model returned when retrieving or listing subjects.
    Includes the subject's id, title, and owning student's id.
    """
    id: int
    title: str
    student_id: int  # keep snake_case to match database column and ORM field names

    class Config:
        from_attributes = True  # enables ORM → Pydantic conversion
