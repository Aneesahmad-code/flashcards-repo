# FastAPI Skeleton for Flashcards (NestJS → FastAPI)

This is a skeleton FastAPI project that mirrors your NestJS modules:
- `auth` (working example: register + login)
- `students` (stub)
- `subjects` (stub)
- `topics` (stub)
- `flashcards` (stub)

## Quickstart

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Visit docs at: http://127.0.0.1:8000/docs

## Environment

Copy `.env.example` to `.env`. Defaults work out-of-the-box (SQLite):

```env
SECRET_KEY=change_me
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./app.db
```

## Structure

```
fastapi-api/
├─ app/
│  ├─ main.py
│  ├─ config.py
│  ├─ database.py
│  ├─ deps.py
│  ├─ security.py
│  ├─ models.py
│  ├─ auth/
│  │  ├─ router.py     # /auth/register, /auth/login (working)
│  │  ├─ schemas.py
│  │  └─ service.py
│  ├─ students/        # stubs to fill in as you translate
│  │  ├─ router.py
│  │  ├─ schemas.py
│  │  └─ service.py
│  ├─ subjects/
│  ├─ topics/
│  └─ flashcards/
├─ tests/
│  └─ test_auth.py
├─ requirements.txt
├─ .env.example
└─ .vscode/
   ├─ launch.json
   └─ tasks.json
```

## Notes

- Keep DTO field names identical to your NestJS DTOs to minimize client changes.
- Add routers to `app.main` as you translate each module.
- Replace the SQLite URL in `.env` with your real DB when ready.
