# StudyBuddy

Upload a study file (PDF, DOCX, PPTX, TXT, JPG, PNG, WEBP) and get quiz questions, flashcards and notes. Everything runs in your browser: no server, no AI API. Works offline and can be installed as an app.

## Run it
- **Easiest (works offline when hosted):** deploy this folder to Vercel/Netlify/GitHub Pages (needs https). Open the site once online, then use the browser's Install button.
- **On your computer:** open a terminal in this folder and run `python3 -m http.server 8000`, then open http://localhost:8000 (offline mode and installing also work on localhost).
- Double-clicking `index.html` works for everything except installing and offline caching, and image reading (OCR) may not run from a file.

## Offline / install
- `sw.js` (service worker) saves the app and all libraries on the first visit.
- `manifest.webmanifest` + `icons/` make it installable.
- When you change any file listed in `CORE` in `sw.js`, or add new files, change `VERSION` at the top of `sw.js`.

## Changing the design
Styles come from `css/tailwind.css`, which is pre-built. If you add new Tailwind classes, rebuild it:
`cd tools && npm install && npm run build:css`

## Files
- index.html, manifest.webmanifest, sw.js
- css/tailwind.css (built), css/style.css (flashcards, dark mode)
- icons/ app icons
- vendor/ bundled libraries: PDF.js, Tesseract.js (+ English data), Mammoth, JSZip
- tools/ optional: rebuilds tailwind.css
- js/theme.js dark mode · helpers.js utilities · db.js IndexedDB · extract.js file reading · generate.js questions/flashcards/notes · state.js state, upload, delete · quiz.js · flashcards.js · edit.js · notes.js · typing.js · manual.js · share.js · views.js · main.js · pwa.js
