# Hatho-ki-vaani[README.md](https://github.com/user-attachments/files/33268114/README.md)
# Hatho Ki Vaani — हाथों की वाणी

**Your hands. Your voice.** A single-page sign-language-to-caption-and-voice prototype with local webcam hand tracking, a sign library, multilingual UI, a two-thumbs-up speak command, and a server-side ElevenLabs proxy.

> **Important limitation:** this project ships in `USE_DEMO_MODE = true`. The prediction words are simulated examples, not real sign recognition and not suitable for safety-critical communication. The included pictures for ASL letters/numbers are generic original hand illustrations clearly labelled **illustration only**; they are not ASL signs. Other sign pictures, approved how-to descriptions, and real sign videos need to be supplied and checked by qualified ISL/ASL contributors. Do not use the current placeholder descriptions as a learning authority.

## Run locally

1. Unzip the project.
2. Open the folder in VS Code and run it with the **Live Server** extension, or serve the folder with any static HTTP server. Camera access generally requires `localhost` or HTTPS; opening `index.html` as a `file://` URL will prevent some browser features from working.
3. Click **Start camera**, allow access, and keep your hands in frame. The first visit shows a short tutorial. Press **T** while the page is focused to simulate the hands-free double-thumbs-up command in demo mode.
4. Change ISL/ASL, the interface language, meaning language, theme, voice selection, confidence threshold and other preferences in the interface.

External CDN resources are used for MediaPipe Tasks Vision, TensorFlow.js and Google Fonts. A network connection is required for the first model/runtime load. The browser camera feed is not sent by this code to a server.

## Google Drive pictures and videos

The shared source folder configured in the UI is:

<https://drive.google.com/drive/folders/1U-Pr4r1-cupgNOOq9NH_uTsQnPSVEKco>

The folder is linked in the Library and footer. Its file listing was not accessible from the build environment, so its files have **not** been imported automatically. Download or export only assets you have permission to reuse, then place local copies into this project. Predictable paths make it easy to replace them:

- Alphabet: `images/isl/alphabet/a.webp`, `images/asl/alphabet/a.webp`, etc.
- Numbers: `images/{isl|asl}/numbers/0.webp` … `9.webp`
- Words: `images/{isl|asl}/words/hello.webp`, `thank-you.webp`, etc.
- Sentences: `images/{isl|asl}/sentences/how-are-you.webp`, etc.
- Videos: keep a matching `.mp4` next to the image or change that entry's `video` property in `sign-data.js` to the local video path.

The library checks the matching path and shows an **Image coming soon** placeholder if it is missing. It uses lazy-loaded images and descriptive alt text. For entries with videos, the detail panel displays an HTML video player. Do not replace an entry with an unverified gesture photo/video and present it as official; record the contributor/source and verify the sign variant before publishing.

To add your own how-to MP4, set `HOW_TO_VIDEO_URL` in `app.js` to a direct MP4 URL. For a YouTube URL, the app uses a privacy-enhanced YouTube embed; use YouTube's own caption settings there. For a direct MP4, the subtitle dropdown switches `subtitles/{lang}.vtt` (English, Hindi, Spanish, French, Portuguese, Arabic, Chinese and Bengali). The shipped VTT files are empty starting templates.

## Real sign recognition models

1. Train/export TensorFlow.js **LayersModel** classifiers with the same landmark order and normalisation used in `app.js`.
2. Add `models/asl/model.json` plus any weight shards. Expected input shape: `[1, 30, 63]` (30 frames × 21 points × x/y/z).
3. Add `models/isl/model.json` plus any weight shards. Expected input shape: `[1, 30, 126]` (30 frames × 42 points × x/y/z). When only one hand is visible, the second ISL hand slot is zero-padded.
4. Put output labels in the exact output-class order in `models/asl/labels.json` and `models/isl/labels.json`.
5. Set `USE_DEMO_MODE = false` at the top of `app.js`. That is the one-line switch. The sample label JSON files are illustrative defaults and must be replaced to match your model's classes.

Landmarks are centred on each wrist and scaled by the maximum wrist-relative point distance. The rolling window keeps the last 30 frames, inference is attempted every third frame, and a sign is accepted after five consecutive above-threshold predictions (default 80%). Repeats are suppressed while the accepted label remains unchanged and unlocked when hands leave the frame. These are prototype heuristics; test across devices, signers, camera orientations and regional variants before relying on them.

## Voice setup — Vercel

1. Set `ELEVENLABS_API_KEY` in the Vercel project's Environment Variables. **Never add it to browser code or commit it.**
2. Set `VOICE_MALE_ID` and `VOICE_FEMALE_ID` in `app.js` to your chosen ElevenLabs voice IDs.
3. Deploy. The frontend sends `{ text, voiceId }` to `/api/speak`; the API function calls ElevenLabs and returns audio bytes. If it is unavailable or voice IDs remain placeholders, the app falls back to `SpeechSynthesis` on the user's device.
4. The proxy limits text length and validates the voice ID, but a public launch should also add IP/user rate limiting and provider usage monitoring. Do not expose the endpoint publicly without abuse controls.

The browser fallback can select a likely matching system voice by name when available, but browser speech APIs do not guarantee that a voice is truly male/female or available in every language.

## Voice setup — Netlify equivalent

The included `netlify/functions/speak.js` performs the same proxy job, and `netlify.toml` rewrites `/api/speak` to that function. Add `ELEVENLABS_API_KEY` as a Netlify environment variable and set the same voice IDs in `app.js`. Add production rate limiting before public launch.

## Add or edit library entries

Edit `sign-data.js`. `SIGN_LIBRARY` is structured as `SIGN_LIBRARY = { asl: { alphabet, numbers, words, sentences }, isl: { alphabet, numbers, words, sentences } }`. Every entry stores an `id`, `category`, multilingual `labels`, multilingual `description`, `image` path and optional `video`. The eight supported language codes are `en`, `hi`, `es`, `fr`, `pt`, `ar`, `zh` and `bn`. Update all eight labels and descriptions when adding entries. The `description` text is intentionally a verification placeholder right now; replace it with contributor-reviewed handshape, position and movement instructions before publication.

## Translation API hook

Caption translation is a clearly marked integration hook. Set `TRANSLATION_API_URL` in `app.js` to your own HTTPS endpoint that accepts a JSON request `{ "text": "…", "targetLanguage": "hi" }` and returns `{ "translation": "…" }`. No translation server or third-party API key is included; the app warns rather than pretending that a translation succeeded.

## Colour variables

The palette is managed in `style.css` with CSS custom properties, including:

- Light: `--bg #FFF8F3`, `--surface #FFFFFF`, `--surface-soft #F6F0FF`, `--primary #8E7CC3`, `--primary-soft #D9CFF7`, `--accent-pink #F7C6D9`, `--accent-peach #FFD6C0`, `--accent-mint #C4EAD8`, `--accent-sky #C5E0F7`, `--text #3B3552`, `--text-muted #716982`, `--border #EBE4F5`, `--success #24794F`, `--danger #A93F56`.
- Dark: `--bg #1E1B2E`, `--surface #2A2640`, `--surface-soft #342F4E`, `--primary #C9B8FF`, `--primary-soft #4A4270`, `--accent-pink #E8A9C4`, `--accent-peach #F0B99C`, `--accent-mint #8FD1B3`, `--accent-sky #8FBFE6`, `--text #F3EEFF`, `--text-muted #C0B7D6`, `--border #494264`, `--success #8FD9B5`, `--danger #F0A3B0`.

The app supports Light/Dark/System, localStorage preferences, responsive layout, keyboard navigation, large touch targets, focus outlines, RTL layout for Arabic and reduced-motion preferences.

## Project contents

- `index.html` — single-page UI and accessible dialogs
- `style.css` — responsive pastel design and light/dark themes
- `app.js` — webcam, MediaPipe, classifier integration, gesture, voice, tutorial and UI logic
- `sign-data.js` — bilingual/multilingual library data
- `logo.svg` — original gradient hand and sound-wave logo
- `api/speak.js` — Vercel ElevenLabs proxy
- `netlify/functions/speak.js` and `netlify.toml` — Netlify equivalent
- `locales/*.json` — eight interface languages
- `models/{asl,isl}/labels.json` and `models/README.md` — model wiring instructions; no fake weights included
- `images/` — generic ASL alphabet/number illustrations and paths for contributor assets
- `subtitles/*.vtt` — empty subtitle-track templates
