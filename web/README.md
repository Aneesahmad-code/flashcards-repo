# Flashcard Pro — Refactor Package

## How to use
1. Make a backup of your current project.
2. Replace your files with the ones from this zip.
   - Keep your existing `index.css` (or copy it here if you want).
3. Ensure your FastAPI is running and CORS allows your frontend origin.
4. Open `index.html` in a dev server (or via VSCode Live Server).

## Notes
- The code expects these endpoints:
  - GET/POST subjects: `/subjects/students/{student_id}/subjects`
  - GET/POST topics for a subject: `/topics/students/{student_id}/subjects/{subject_id}/topics`
- Clicking **Open** on a subject reveals the Topics card, fetches the list, and allows creating a new topic.
