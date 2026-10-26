# StudyBuddy

Upload a study file (PDF, DOCX, PPTX, TXT, JPG, PNG, WEBP) and get quiz questions, flashcards and notes. Everything runs in your browser; no server, no AI API.

## Run it
1. Unzip the folder (keep the structure below).
2. Double-click `index.html`. An internet connection is needed to load the libraries (Tailwind, PDF.js, Tesseract.js, Mammoth, JSZip).
3. Optional: serve it with `python3 -m http.server` and open http://localhost:8000

## Deploy
Upload the whole folder to any static host (Vercel, Netlify, GitHub Pages). `index.html` must be at the root.

## Files
- index.html        page layout + script tags (loaded in this order)
- css/style.css     flashcard flip + print styles
- js/theme.js       dark mode toggle (remembers your choice)
- js/helpers.js     small utilities (escape, shuffle, toast, download)
- js/db.js          IndexedDB storage
- js/extract.js     text extraction (PDF, OCR, DOCX, PPTX, TXT)
- js/generate.js    question / flashcard / notes generation (no AI)
- js/state.js       app state, upload flow, delete/clear actions
- js/quiz.js        quiz logic and screens
- js/flashcards.js  flashcard logic and screens
- js/manual.js      create a quiz without a file
- js/share.js       share quizzes by link or file, import shared quizzes
- js/typing.js      typing quiz (type the answer from memory)
- js/edit.js        edit questions, answers and flashcards
- js/notes.js       notes view and exports (TXT, JSON, CSV, print)
- js/views.js       pages and sidebar rendering
- js/main.js        startup
