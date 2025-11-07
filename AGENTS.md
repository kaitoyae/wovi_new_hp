# Repository Guidelines

## Project Structure & Module Organization
- 全ての回答は日本語でお願いします。
- Root HTML entries (`index.html`, `company.html`, `news.html`) each mount shared UI via `<script src="components/*.js">`.
- Shared scripts live in `components/` (`navigation.js`, `header.js`, `footer.js`, `background.js`, `noteFeed.js`). Keep browser globals wrapped in IIFEs and expose only the minimum (e.g., `window.WOVI_NAV`).
- Global styling belongs in `styles/global.css`; page-specific tweaks should stay inline within the relevant HTML to avoid regressions.
- Static assets (logos, hero imagery) reside under `images/`. Favor referencing existing files before adding new ones.

## Build, Test, and Development Commands
- This site is static; no build step is required. Serve locally with any simple HTTP server to avoid CORS issues, e.g.:
  - `npx serve .`
  - `python3 -m http.server 5500`
- When testing Three.js and note feed fetching, ensure the server is started from the repo root so relative paths resolve correctly.

## Coding Style & Naming Conventions
- HTML/CSS use four-space indentation; keep attribute ordering semantic (id/class first, then data-*, style).
- JavaScript favors `const`/`let`, small helper functions, and descriptive camelCase. Shared modules export via the `window` namespace only when necessary.
- CSS classes follow Tailwind-style utility naming for inline markup plus a small set of custom classes in `global.css`. Keep the file ASCII-only and comment sparingly for non-obvious logic.

## Testing Guidelines
- No automated test suite; rely on manual smoke tests:
  1. Load each HTML page via the local server.
  2. Confirm the header/footer nav, background animation, and (where present) note feed render without console errors.
  3. Trigger key interactions (mobile menu toggle, contact form mailto, hero CTA links).
- Document any manual test matrix in PR descriptions if changes affect multiple pages.

## Commit & Pull Request Guidelines
- Commit messages in the history are short and imperative (“Adjust cache headers…”, “Update copy…”). Follow that style; keep subject lines under ~60 chars.
- Each PR should summarize the change, list impacted pages/components, attach screenshots or screen recordings for visual updates, and mention any manual verification steps (e.g., “Tested on http://localhost:5500/news.html”).
