from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Text, Enum, ForeignKey
import enum
from typing import List, Optional
from .database import Base

# Prisma enum: SchoolLevel { Primary Middle Higher }
class SchoolLevelEnum(str, enum.Enum):
    Primary = "Primary"
    Middle = "Middle"
    Higher = "Higher"

# ---- Student (Prisma model Student) ----
class Student(Base):
    __tablename__ = "Student"  # exact Prisma table name

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password: Mapped[str] = mapped_column(String)
    school: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    level: Mapped[Optional[SchoolLevelEnum]] = mapped_column(
        Enum(SchoolLevelEnum, name="SchoolLevel", native_enum=False), nullable=True
    )

    subjects: Mapped[List["Subject"]] = relationship(back_populates="student", cascade="all,delete")

# ---- Subject (Prisma model Subject) ----
class Subject(Base):
    __tablename__ = "Subject"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String)

    studentId: Mapped[int] = mapped_column(ForeignKey("Student.id"))
    student: Mapped["Student"] = relationship(back_populates="subjects")

    topics: Mapped[List["Topic"]] = relationship(back_populates="subject", cascade="all,delete")

# ---- Topic (Prisma model Topic) ----
class Topic(Base):
    __tablename__ = "Topic"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String)

    subjectId: Mapped[int] = mapped_column(ForeignKey("Subject.id"))
    subject: Mapped["Subject"] = relationship(back_populates="topics")

    flashcards: Mapped[List["Flashcard"]] = relationship(back_populates="topic", cascade="all,delete")

# ---- Flashcard (Prisma model Flashcard) ----
class Flashcard(Base):
    __tablename__ = "Flashcard"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[str] = mapped_column(Text)

    topicId: Mapped[int] = mapped_column(ForeignKey("Topic.id"))
    topic: Mapped["Topic"] = relationship(back_populates="flashcards")
