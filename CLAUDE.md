# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site of presentations and reports for Alianza Educación Rural / Comité de Cafeteros de Caldas, published to GitHub Pages from `main` (`alianzaeducacionrural/Presentacion`). There is **no build step, package manager, linter or test suite**: every page is hand-written HTML/CSS/JS opened directly in the browser. To preview, open an `index.html` (or serve the root with `python -m http.server`); fonts load from Google Fonts, so a network connection is needed for the intended typography.

Everything user-facing (UI copy, code comments, commit messages) is in Spanish. Keep it that way.

## Deployment

`.github/workflows/pages.yml` uploads the **whole repo root** as the Pages artifact on every push to `main` (no build). Consequences:

- Anything committed is public. `.gitignore` excludes `*.docx` (source documents) and `panama/.gitignore` also excludes `*.ppt`, `*.pptx`, `*.mp4` and `panama/design/`. Keep source/working files out of the tree that way rather than committing them.
- `.nojekyll` is required so files/folders are served as-is; don't remove it.
- Paths are relative and case-sensitive on Pages (Windows is not), and some folder names contain spaces/accents, so URL-encode them in `src`/`href` (`Img/Kit%20M%C3%B3dulos%20Primaria.jpg`).

## Layout: one folder per publication

The root `index.html` is the catalogue ("pliego de fichas"): each publication is an `<li data-buscar="…">` card linking to `./<folder>/`. **Publishing something new means adding a folder with its own `index.html` *and* duplicating a card in the root `index.html`** (also update the hard-coded count `4` in `#conteo` and the "Actualizado …" text; the script recomputes the count at runtime but the initial HTML is not derived). `data-buscar` holds accent-free lowercase keywords for the search box. The dashed "Añadir una presentación" card is `data-fija` and is excluded from counting/filtering.

Each publication is deliberately self-contained and has its own visual identity (different fonts, palettes, no shared CSS between them):

- `malteria/` — single-page informe; images referenced by relative path. It is **also a separate git repo** (`malteria/.git`, origin `alianzaeducacionrural/presentacionmalteria`) with its own Pages workflow; the root `.gitignore` excludes `malteria/.github/` so that workflow isn't replicated here. Commit changes for it from the correct repo.
- `collective-mining/` — single ~1.4 MB `index.html` with images inlined as base64 data URIs; the `.pptx`/`.jpg` beside it are sources.
- `panama/` — see below.
- `CEPE/` — the "Tablero Mural" of lessons learned. `CEPE/Logos/` holds shared images referenced as `../Logos/…` from the board's `index.html`, and the root catalogue links to `./CEPE/lecciones-agosto/`. **Moving that folder breaks both the catalogue link and the `../Logos/` paths**; check them after any move. The board's content lives in the page's `<script>` and has two views switched by the `.switch` buttons (deep-linkable with `#buenas-practicas`): `DATA` (7 axes → cards with `li`/`ra`/`la`/`rt` = lección identificada / respuesta adoptada / lección aprendida / retos para transferencia) and `PRACTICAS` (5 buenas prácticas with criteria `qd`/`sl`/`cf`/`df`/`rp`, transcribed from `Buena práctica 2.docx`). The header/legend/KPI blocks for each view are duplicated in the HTML with `data-view`; when a count changes, update the KPI, the switch badge and the `de 0N` labels. Source `.docx` files live alongside but are gitignored.

## `panama/` in detail

- `panama/index.html` is a 1280×720 slide deck (13 slides in `.deck`, scaled to the viewport by `fitStage`). Adding/removing a slide means updating `TOTAL` and `DARK_SLIDES` (indices of dark-background slides that switch the chrome to light) in the inline script. It is not linked to the tools below; they are opened by URL.
- `panama/herramientas/` holds two live-data web tools that share `shared/styles.css` (each page loads it as `../shared/styles.css?v=N`; **bump `N` in every HTML page when changing the CSS**, otherwise browsers serve the cached copy). Each page sets `<body data-tool="diagnostico|visitas">` and the CSS gives each tool its own full palette via that attribute.
  - `diagnostico/` — institutional self-diagnosis form + results dashboard. `visitas/` — advisory-visit form, "semáforo" dashboard and "compromisos" tracker.
  - Backend is a **Google Apps Script Web App per tool** (`Code.gs`, deployed as ANYONE_ANONYMOUS / run as deployer) writing to a Google Sheet. The front end talks to it via `GAS_URL` in each tool's `config.js`: `GET ?action=…` for reads, `POST` with a JSON body and `Content-Type: text/plain;charset=utf-8` (avoids a CORS preflight, which Apps Script can't answer). Responses are `{ok, data}` / `{ok:false, error}`. Dashboards poll every `REFRESH_INTERVAL_MS`.
  - `clasp` is configured per tool (`.clasp.json`, `.claspignore`): only `Code.gs` and `appsscript.json` are pushed to Apps Script; the HTML/JS is served by GitHub Pages. Changing `Code.gs` doesn't publish anything to the site, and changing the site doesn't update the script.
  - **Duplicated definitions that must be kept in sync by hand:** the indicator lists live in `Code.gs` (`INDICADORES`) *and* `config.js` (`INDICADORES_LOCAL`, offline fallback); the semáforo thresholds (<50 rojo, 50–74 amarillo, ≥75 verde) live in `Code.gs` (`semaforoDesdePct_`) *and* in the dashboard JS (`toneForPct`); the visit scoring (AA=2, AM=1, NA=0) and the sheet column headers are defined in `Code.gs`, whose `semaforo`/`compromisos` handlers read rows by column index (`r[7 + s]`, `r[10]`…). Reordering or adding columns in `headersVisitas_`/`headersCompromisos_` therefore breaks those handlers and any existing sheet.
  - `GAS_URL` values are the deployed `/exec` URLs (public by design); a new Apps Script *deployment* produces a new URL that must be pasted into `config.js`, whereas updating the existing deployment keeps it.
