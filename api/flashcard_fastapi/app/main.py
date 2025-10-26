from fastapi import FastAPI
from .database import engine, Base
from .auth.router import router as auth_router
from .students.router import router as students_router
from .subjects.router import router as subjects_router
from .topics.router import router as topics_router
from .flashcards.router import router as flashcards_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Flashcards API")
# ✅ Add this section before you include routers or start the server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server (npm run dev)
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://flashcards-repo.onrender.com",
        "https://www.flashcards-repo.onrender.com"
    ],
    allow_credentials=True,         # allow cookies or auth headers
    allow_methods=["*"],            # allow all methods (GET, POST, etc.)
    allow_headers=["*"],            # allow all headers (Authorization, etc.)
    allow_origin_regex=r"https://.*\.onrender\.com$",
)
# DEV ONLY: create tables automatically (use Alembic for prod)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(students_router, prefix="/students", tags=["students"])
app.include_router(subjects_router, prefix="/subjects", tags=["subjects"])
app.include_router(topics_router, prefix="/topics", tags=["topics"])
app.include_router(flashcards_router, prefix="/flashcards", tags=["flashcards"])
# app/main.py

@app.get("/")
def health():
    return {"status": "ok"}

