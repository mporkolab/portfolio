# DESIGN.md

## Thesis
The portfolio as a high-speed, hyper-legible transit corridor: the visitor reads the concourse sign, picks a destination, and reaches the work without friction.

## Visual Language
**World:** Terminal Wayfinding — Deep Blue signage

The `challenger-wayfinding` mock's structure is kept in full (overhead sign bar, illuminated panels, arrows, tab-like header with clock), but the signage colour is deep blue instead of yellow.

### Palette (all values are CSS variables — change the sign colour in one place)
- `--sign` `#002b49` — deep blue: the overhead sign bar and every primary destination panel.
- `--sign-hover` `#00395f` — hover/focus state of a panel.
- `--sign-ink` `#ffffff` — type and arrows on the sign.
- `--panel` `#f4f1ea` — the illuminated light-box panels (Current Work, Featured Project).
- `--panel-ink` `#0a0a0a` — type inside the light boxes.
- `--frame` `#111318` — the physical housing: header tab, bezels, struts.
- `--ground` `#0d1117` — concrete/terminal ground behind the board.

`--sign` is the single dial: recolouring the whole signage system to yellow, red or green is one variable edit.

### Typography
- **Face:** Inter. Uppercase, tight tracking, black weight for destinations.
- **Scale:** destination titles are the largest thing on the page (`clamp` from ~2rem mobile to ~5.5rem desktop); sub-labels are small, wide-tracked, all caps.

### Layout
Airport board, top to bottom:

1. **Header tab (frame black):** `P. MARTIN | PORTFOLIO` left, `EN | HU` switch and live `HH:MM GMT` clock right.
2. **Overhead sign bar (deep blue), three destinations** — exactly the mock's arrangement:
   `PROFILE ↓` (who · experience · skills) · `PROJECTS ↓` (case studies) · `CONTACT ↗`
3. **Light-box row:**
   - Left, wide: **CURRENT WORK** — one selectable project, currently `edortech.hu`, with thumbnail, one-line role and an arrow into its case study.
   - Right, narrow: **FEATURED PROJECT** — `FOOTBALL PREDICTOR`, mock imagery, labelled **IN DEVELOPMENT**.
4. **Bottom gate row (replaces "ALL WORKS"):** two deep-blue panels, `GITHUB ↗` and `LINKEDIN ↗`.
   *Rationale:* the overhead sign stays reserved for the three site destinations; outbound links sit one level down, as secondary gates.

### Perspective
The board carries a slight side-on tilt as in the mock — a CSS `perspective` + `rotateY` of a few degrees on the sign bar, with the housing catching a light gradient. Dropped below `md`, and under `prefers-reduced-motion` the tilt is static rather than animated.

### Motion
- Whole panels are hit areas; hover lifts to `--sign-hover` and translates the arrow along its own axis (↓ down, ↗ up-right).
- Header clock ticks each minute.
- Focus-visible draws a thick `--sign-ink` outline inside the panel — keyboard users see the same bands.

## Structure
- `/` (English, default) and `/hu/` (full Hungarian). Manual `EN | HU` switch in the header tab; no browser-language redirect.
- Pages per language: home, `about`, `projects`, `projects/edortech`, `projects/football-predictor`, `contact`.
- Contact is direct links only — email, LinkedIn, GitHub as large panels. No form, no backend.

## Constraints
- No invented metrics, testimonials, logos, or dates. The football predictor is always labelled in development.
- Static Astro output, self-hosted; no managed-platform features.
