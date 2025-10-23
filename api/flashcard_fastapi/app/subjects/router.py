from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..deps import get_db
from .schemas import SubjectCreate, SubjectOut, SubjectUpdate
from .service import (
    create_subject_for_student,
    list_subjects_for_student,
    get_subject_owned_by_student,
    update_subject_title_for_student,
    delete_subject_for_student,
)

router = APIRouter()


@router.post(
    "/students/{student_id}/subjects",
    response_model=SubjectOut,
    status_code=status.HTTP_201_CREATED,
)
def create_subject(student_id: int, payload: SubjectCreate, db: Session = Depends(get_db)):
    try:
        subject = create_subject_for_student(db, student_id=student_id, title=payload.title)
        # Explicit mapping so response validation passes even if ORM uses camelCase
        return SubjectOut(
            id=subject.id,
            title=subject.title,
            student_id=getattr(subject, "student_id", getattr(subject, "studentId"))
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get(
    "/students/{student_id}/subjects",
    response_model=list[SubjectOut],
    status_code=status.HTTP_200_OK,
)
def list_subjects(student_id: int, db: Session = Depends(get_db)):
    subjects = list_subjects_for_student(db, student_id=student_id)
    # Map each ORM object to the response model
    return [
        SubjectOut(
            id=s.id,
            title=s.title,
            student_id=getattr(s, "student_id", getattr(s, "studentId"))
        )
        for s in subjects
    ]

@router.get(
    "/students/{student_id}/subjects/{subject_id}",
    response_model=SubjectOut,
    status_code=status.HTTP_200_OK,
)
def get_subject(student_id: int, subject_id: int, db: Session = Depends(get_db)):
    s = get_subject_owned_by_student(db, student_id=student_id, subject_id=subject_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found for this student")
    return SubjectOut(
        id=s.id,
        title=s.title,
        student_id=getattr(s, "student_id", getattr(s, "studentId"))
    )


@router.patch(
    "/students/{student_id}/subjects/{subject_id}",
    response_model=SubjectOut,
    status_code=status.HTTP_200_OK,
)
def update_subject(
    student_id: int,
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
):
    try:
        s = update_subject_title_for_student(
            db, student_id=student_id, subject_id=subject_id, title=payload.title
        )
        return SubjectOut(
            id=s.id,
            title=s.title,
            student_id=getattr(s, "student_id", getattr(s, "studentId"))
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete(
    "/students/{student_id}/subjects/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_subject(student_id: int, subject_id: int, db: Session = Depends(get_db)):
    try:
        delete_subject_for_student(db, student_id=student_id, subject_id=subject_id)
    except ValueError as e:
        # Not found for this student
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return None
