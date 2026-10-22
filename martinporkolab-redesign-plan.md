# martinporkolab.hu — „Departures” redesign: implementációs terv

> Ezt a tervet Claude Code-nak szánom. A cél a meglévő Astro oldal **vizuális újratervezése** a „reptéri indulási tábla / split-flap” koncepció alapján. **Funkció, útvonal, tartalomforrás nem változik** — csak a megjelenés és a hozzá tartozó komponensek.

---

## 0. Mielőtt bármit módosítasz

1. Térképezd fel a repót, és írd le röviden (válaszban, nem fájlba):
   - az oldalak/route-ok listáját (`src/pages/**`), a layout(ok)at és a közös komponenseket (header, footer, nyelvváltó, óra);
   - honnan jön a projekt-tartalom (CMS — pl. Directus / Ghost-szerű `/content/images/...` képek — vagy content collection), és milyen mezők érhetők el egy projekten (title, slug, status, cover, excerpt, body, tags, live URL…);
   - hogyan működik az i18n (EN alap, `/hu/...` prefix), és hol vannak a fordított szövegek;
   - hogyan működik most a kapcsolati űrlap (hová küld, milyen validáció van);
   - a jelenlegi stílusrendszert (Tailwind? sima CSS? CSS változók?).
2. Hozz létre egy `redesign/departures` branchet. Ne commitolj a main-re.
3. Ha valami a tervben ütközik a meglévő kóddal, **a meglévő viselkedés nyer**, és jelezd nekem.

## 1. Ami NEM változhat (kemény korlátok)

- **Útvonalak:** `/`, `/about`, `/projects`, `/projects/[slug]`, `/contact`, és ugyanezek `/hu/` prefixszel. Ne nevezz át, ne töröld egyiket sem.
- **Tartalomforrás:** a projektek adatlekérése (CMS/collection) változatlan marad. Új mezőt ne követelj meg. Ha egy új mező hasznos lenne, legyen opcionális, fallbackkel.
- **Kapcsolati űrlap:** ugyanaz a backend/endpoint, ugyanazok a mezők (Name, Email, Message), ugyanaz a validáció. Csak a megjelenés és a sikeres küldés utáni visszajelzés változik.
- **SEO:** minden `<head>` meta (title, description, canonical, og:*, twitter:*, hreflang/alternate, robots) marad. A `theme-color` frissülhet `#0B0B0C`-re.
- **View Transitions** (Astro) maradjon bekapcsolva.
- **Linkek:** GitHub `https://github.com/mporkolab`, LinkedIn `https://www.linkedin.com/in/martin-porkolab/`, Edortech élő oldal `https://edortech.hu`.
- **Élő budapesti óra** (`BUD hh:mm`, `Europe/Budapest` időzóna) és az **EN/HU váltó** minden oldalon.

## 2. Design tokenek

Tedd őket egy helyre (pl. `src/styles/tokens.css` CSS változóként, és ha Tailwind van, a `theme.extend`-be is).

### Színek

| Token | Érték | Használat |
|---|---|---|
| `--bg` | `#0B0B0C` | oldal háttér |
| `--surface` | `#111113` | táblák, kártyák sötét felülete |
| `--surface-2` | `#1C1C20` | aktív nav háttér, flap felső fele |
| `--flap-bottom` | `#17171A` | flap alsó fele |
| `--flap-split` | `#050506` | flap középvonal |
| `--line` | `#2A2A2E` | elválasztók, keretek |
| `--line-2` | `#3A3A3F` | gombkeretek |
| `--text` | `#EDE8DC` | fő szöveg sötéten |
| `--text-2` | `#DCD7CB` / `#C9C4B8` | törzsszöveg / másodlagos |
| `--muted` | `#8F8B82` | címkék (≥4.5:1 a `--bg`-n) |
| `--amber` | `#FFB000` | akcentus, kapukódok, CTA |
| `--green` | `#4ADE80` | „LIVE” státusz sötéten |
| `--paper` | `#EDE8DC` | beszállókártya / útlevél papír |
| `--paper-2` | `#E2DCCD` / `#DCD6C7` | input háttér / képhelyőrző papíron |
| `--ink` | `#141414` | szöveg papíron |
| `--ink-muted` | `#5A564E` | címkék papíron |
| `--ink-line` | `#A8A295` | szaggatott vonalak papíron |
| `--green-ink` | `#146B33` | „Live” papíron |
| Pecsétszínek | `#1F4E99`, `#B3261E`, `#146B33`, `#6B3FA0` | csak a Profile pecsétjeihez |

Csak sötét téma van; ez maga a koncepció. Nem kell világos mód.

### Tipográfia (Google Fonts, `display=swap`, preconnect)

- **Big Shoulders Display** 500/700/900 — címsorok, flap-betűk, nagy repülőtér-kódok (BUD, EDT).
- **IBM Plex Mono** 400/500/600 — minden más (törzsszöveg, címkék, gombok).
- Címkék: 12–13px, `letter-spacing: 0.12em`, `text-transform: uppercase`.
- Törzsszöveg: 16–19px, `line-height: 1.6–1.7`, max ~64ch.
- Ha a projekt self-hostolja a fontokat (pl. `@fontsource`), azt használd a Google helyett.

### Egyéb

- Max tartalomszélesség `1280px`, oldalsó padding `clamp(16px, 4vw, 48px)`.
- Radius: flap 3px (nagy flap: `clamp(3px, 0.5vw, 8px)`), tábla 6px, kártya/útlevél 14–18px.
- Fókusz: `outline: 2px solid var(--amber); outline-offset: 3px` minden linken, gombon, inputon.
- Érintési cél minimum 44px magas.

## 3. Komponensek

Hozd létre ezeket a `src/components/departures/` mappába (vagy a repó konvenciója szerint). A logika **vanilla TS + kis inline `<script>`**; ne húzz be React/Vue-t csak ehhez.

### `SplitFlap.astro`
A kulcskomponens: egy szöveget betűnként „flap” cellákban jelenít meg.
- Propok: `text: string`, `size: 'xl' | 'lg' | 'md' | 'sm'`, `color?: 'text' | 'amber' | 'green'`, `length?: number` (jobbról szóközzel kipótolva), `delay?: number` (ms), `as?: 'h1' | 'span' | 'div'`.
- Cella kinézete: `background: linear-gradient(var(--surface-2) 0 49%, var(--flap-split) 49% 51%, var(--flap-bottom) 51%)`, középre igazított betű.
- Méretek: `xl` = hero név (`width: clamp(34px, 9.4vw, 128px); aspect-ratio: .76; font-size: clamp(30px, 8.4vw, 116px)`, Big Shoulders 900); `lg` = oldalcímek (~7.6vw / max 104px); `md` = táblasor (30×42px, 24px); `sm` = óra / státusz (22×32px, 18px).
- **Animáció:** betöltéskor minden nem-szóköz karakter pörög véletlen `A–Z0–9` karakterek között, és balról jobbra, karakterenként ~60–70 ms eltolással beáll a végleges betűre. A teljes animáció legyen 2 s alatt. Egy `requestAnimationFrame` vagy `setInterval(45ms)` ciklus elég oldalanként; ne cellánként indíts külön timert.
- **Akadálymentesség:** a konténer kapjon `aria-label`-t a teljes szöveggel, a cellák `aria-hidden="true"`. SSR-ben a **végleges szöveg** renderelődjön (JS nélkül is olvasható legyen, és ne villanjon szemét).
- `prefers-reduced-motion: reduce` esetén nincs animáció.
- Ékezetes betűk (Á, É, Ö, Ő, Ü, Ű) a végleges szövegben működjenek.
- A nyelvváltás oldalbetöltéssel jár, így az animáció magától újraindul. A View Transitions miatt az `astro:page-load` eseményre is indítsd.

### `FlapBoard.astro`
Indulási tábla, soronként egy kattintható linkkel.
- Propok: `title`, `columns: string[]`, `rows: { href, cells: { text, length, color? }[], ariaLabel }[]`.
- Sötét `--surface` konténer, `border: 1px solid var(--line)`, padding 20px. Fejléc-sor `--muted` címkékkel. Minden sor egy `<a>`, háttér `--bg`, jobb szélen borostyánszínű `→`.
- A sorok egymás után, késleltetve „pörögjenek be” (sor index × ~270 ms).
- Mobilon a tábla **vízszintesen görgethető dobozban** van (`overflow-x: auto`, a belső min-szélesség ~1040px). Az oldal maga ne görögjön vízszintesen.

### `SiteHeader.astro`
- Bal oldalon logó: borostyán „PM” négyzet (40×40, Big Shoulders 900) + „PORKOLÁB MARTIN” felirat, link a főoldalra.
- Középen nav, három „kapu”: `A1 Profile`, `A2 Projects`, `A3 Contact` (HU: Profil / Projektek / Kapcsolat). A kapukód egy kis címke: inaktívan borostyán keret, aktívan teli borostyán. Az aktív link `aria-current="page"`, háttere `--surface-2`, alul 2px borostyán csík (`box-shadow: inset 0 -2px 0`).
- Jobb oldalon az óra (`SplitFlap size="sm"` borostyánnal, percenként frissül) és a `LangToggle`.
- Mobilon a sorok tördelődnek (`flex-wrap`), nincs hamburger.
- A főoldalon a nav helyett „● Terminal open” státusz látszik, mert ott a tábla maga a navigáció. Ha ez bonyolítja a layoutot, maradhat a nav.

### `LangToggle.astro`
Két gomb/link (EN | HU) keretes csoportban. Az aktív teli borostyán, sötét szöveggel. A meglévő i18n útvonal-logikát használd (a jelenlegi oldal megfelelőjére vigyen). Valódi `<a href>` legyen, `aria-current` / `aria-pressed` jelöléssel.

### `BoardingPass.astro`
Papír kártya (`--paper`, `--ink`, radius 14px, `overflow: hidden`).
- Felül borostyán sáv: `BOARDING PASS · {flightCode}` és a típus (Client work / Personal product).
- Opcionális borítókép (16:9).
- Útvonal: `BUD → {iata}` nagy Big Shoulders 900 betűkkel, köztük vékony nyíl SVG.
- Cím, rövid leírás, szaggatott elválasztó, `dl` mezők (STACK, STATUS ● Live zölden).
- Lábléc: fekete CTA gomb („Read the case study →”) és dekoratív vonalkód (`repeating-linear-gradient`, `aria-hidden`).
- Változat `variant="wide"` (főoldal kiemelt projekt): kétoszlopos, jobb oldalt **tépőfül** (`border-left: 2px dashed var(--ink-line)`), benne logóhely, vonalkód és az élő oldal linkje.

### `Passport.astro` + `Stamp.astro` (csak Profile)
Lásd a 4.2 pontot.

### `NextGate.astro`
Teljes szélességű sötét sáv az oldal alján. Bal oldalon `--muted` címke („Next gate”, „Next flight”), jobb oldalon nagy felirat (kapukód borostyánnal + oldalnév + `→`). Link.

### `SiteFooter.astro`
`© 2026 Porkoláb Martin · BUD`, a „Connecting flights” / „Csatlakozások” címke, valamint a GitHub ↗ és LinkedIn ↗ linkek.

## 4. Oldalak

Minden oldal alapja: `--bg` háttér, `SiteHeader`, tartalom, `SiteFooter`. Felül egy „morzsasor” (bal oldalon `← Departures` / `← All projects` vissza-link `--muted` színnel, jobb oldalon `Gate A1 · Passport control` stb. borostyánnal), alatta a `SplitFlap size="lg"` oldalcím borostyánban.

### 4.1 Főoldal `/` — „Departures”
1. Címke: repülő ikon (inline stroke SVG) + `DEPARTURES · BUD`, jobbra az óra flapekben.
2. Hero: `PORKOLÁB` (szövegszín) és `MARTIN` (borostyán) két sorban, `SplitFlap size="xl"`. Szemantikusan **egy** `<h1 aria-label="Porkoláb Martin">`.
3. Tagline (max 46ch): EN „Computer science student at ELTE, Budapest. I design and build websites end to end — from concept to deploy.” / HU „Programtervező informatikus hallgató az ELTE-n. Weboldalakat tervezek és építek a koncepciótól az élesítésig.”
4. `FlapBoard`, címe „Departure board — choose your gate”. Oszlopok: Gate | Destination | Remarks | Status.
   - `A1 | PROFILE | WHO I AM | BOARDING` (borostyán) → `/about`
   - `A2 | PROJECTS | {n} CASE STUDIES | {n} LIVE` (zöld) → `/projects` (az `n` a projektek számából jön)
   - `A3 | CONTACT | JOB / FREELANCE | OPEN` → `/contact`
   - HU: `PROFIL | KI VAGYOK | BESZÁLLÁS`, `PROJEKTEK | {n} ESETTANULMÁNY | {n} ÉLŐ`, `KAPCSOLAT | MUNKA / MEGBÍZÁS | NYITVA`.
5. „Now boarding — featured project”: `BoardingPass variant="wide"` a kiemelt projekttel (most: Edortech, `BUD → EDT`, FLIGHT EDT-01, GATE A2, STACK, STATUS). Kiemeltnek a CMS-ben jelölt projektet vedd; ha nincs ilyen jelölés, az elsőt.

### 4.2 Profile `/about` — „Passport control”
1. **Útlevél adatoldal** (papír, radius 18px, nagyon halvány guilloche-minta: `repeating-radial-gradient(circle at 85% 30%, transparent 0 18px, rgba(20,20,20,.04) 18px 19px)`).
   - Fekete fejléc-sáv: `PASSPORT · ÚTLEVÉL` és `Type P · HUN · No. PM-0001`.
   - Bal oldalt a portré (3:4, a meglévő `me.avif`) alatta kék, dőlt „P. Martin” aláírással.
   - Jobb oldalt `dl` rács (`auto-fit, minmax(220px, 1fr)`): Surname **PORKOLÁB** és Given names **MARTIN** nagy Big Shoulders betűkkel; Occupation, Base (ELTE IK · Budapest), Qualification, Languages, Authority („Terminal authority — staff access”), Status („● Open to work & freelance” zölden).
   - Alul MRZ-sor (monospace, `letter-spacing: .18em`, `white-space: nowrap; overflow: hidden`, `aria-hidden`): `P<HUNPORKOLAB<<MARTIN<<<…` és egy második sor. A mostani oldalon is van ilyen, az onnan átvehető.
2. **Kinyitott útlevél-oldalpár** (papír, két oszlop, köztük szaggatott „hajtás”):
   - Bal oldal: „Holder’s statement” címke. Az első bio-mondat nagy Big Shoulders betűkkel, utána a meglévő bio-bekezdések. Szaggatott vonal alatt „OFF DUTY — video games, hobby projects, sports…”.
   - Jobb oldal: „Visas & stamps”, négy pecsét (`Stamp.astro`). Mindegyik `border: 4px double {szín}`, felváltva kör/ellipszis és lekerekített téglalap alakban, enyhén elforgatva (-6°, 4°, -3°, 7°), háromsoros szöveggel:
     - `ADMITTED / ELTE IK / Faculty of Informatics` (kék)
     - `CERTIFIED / Dev & Test / Technician` (piros)
     - `FAST TRACK / Quick learner / Adapts fast` (zöld)
     - `APPROVED / 100% / Gives his very best` (lila)
     - HU: `FELVÉVE / ELTE IK / Informatikai Kar`, `OKLEVÉL / Fejlesztő / és tesztelő technikus`, `GYORSSÁV / Gyors tanuló / Hamar alkalmazkodik`, `JÓVÁHAGYVA / 100% / Mindig a legjobbat`.
3. `NextGate` → A2 Projects.

A bio szövegek a meglévő EN/HU tartalomból jönnek. Ha valamelyik nyelv hiányzik, jelezd.

### 4.3 Projects `/projects`
1. Cím `PROJECTS` / `PROJEKTEK`, alatta a meglévő intro mondat.
2. `FlapBoard`, címe „Scheduled departures”. Oszlopok: Flight | Destination | Type | Status.
   - Projektenként egy sor: flight code = a slug első 3 betűje nagybetűvel + `-` + kétjegyű sorszám (pl. `EDT-01`, `FBP-02`). Ha a CMS-ben van erre mező, azt használd. Destination = cím nagybetűvel, 14 karakterre vágva. Type = Client work / Personal. Status = `LIVE` zölden; más státusz borostyánnal.
   - Utolsó sor mindig: `TBA-0n | NEXT PROJECT | Your project? | SCHEDULED` (borostyán, 75% opacitás) → `/contact`. HU: `KÖVETKEZŐ | A te projekted? | TERVEZETT`.
3. „Boarding passes”: rács (`repeat(auto-fit, minmax(min(100%, 460px), 1fr))`, gap 24px), projektenként egy `BoardingPass`. Az IATA-szerű kód a flight code első 3 betűje.
4. `NextGate` → A3 Contact.

### 4.4 Esettanulmány `/projects/[slug]` — „Flight log”
1. Morzsasor: `← All projects`, jobbra `FLIGHT LOG · EDT-01 ● LIVE`.
2. Cím: a projekt neve `SplitFlap size="lg"` szövegszínnel. Alatta a projekt rövid leírása.
3. **Útvonal-sáv** (papír): bal oldalt borostyán blokk `FROM BUD → TO EDT`, jobb oldalt `dl`: Type, Role, Stack, Focus. Csak a CMS-ben létező mezőket mutasd; ami hiányzik, azt hagyd el, ne találj ki értéket.
4. Hero kép (16:8, sötét keret).
5. **Repülési szakaszok:** a body-t a `<h2>` címsorok mentén bontsd szekciókra. A szekciók sorban a következő címkéket kapják: `1 Check-in`, `2 Takeoff`, `3 Cruise`, `4 Landing` (HU: Check-in, Felszállás, Utazómagasság, Leszállás). Ha 4-nél több szekció van, a többi „In flight” / „Repülés közben” lesz. Minden szekció kétoszlopos: bal oldalt a kis flap-szám + szakaszcímke borostyánnal és a h2 nagy Big Shoulders betűkkel; jobb oldalt (szaggatott bal kerettel) a tartalom.
   - **Ha a body-ban nincs `<h2>`** (a mostani Edortech-tartalom ilyen): az egész body egyetlen „Check-in” szekció legyen, és a végén jöjjön egy automatikus „Landing” szekció a „Visit the live site ↗” gombbal. Ne próbáld meg heurisztikusan felbontani.
   - A body-ban lévő képek teljes szélességűek, sötét kerettel.
6. A végén az élő oldal gomb (ha van live URL), és `NextGate` „Next flight · {következő projekt flight code-ja}” a következő projektre (körbeérve).

### 4.5 Contact `/contact` — „Check-in desk”
1. Morzsasor jobb oldalt: villogó zöld pont + `Gate A3 · Check-in desk open`. Cím `CONTACT` / `KAPCSOLAT`.
2. Két oszlop (mobilon egymás alatt):
   - Bal: a meglévő intro szöveg. „Other routes” alatt két sötét sáv-link: `GH  GITHUB  mporkolab ↗` és `LI  LINKEDIN  martin-porkolab ↗`. Alul `Local time hh:mm · Budapest (CET)`.
   - Jobb: **check-in jegy** (papír). Borostyán fejléc: `CHECK-IN · Desk A3`. A meglévő űrlap mezői: a label bal oldalán a mező neve (Name / Email / Message), jobb oldalán halvány „reptéri” alcím (Passenger / For the reply / Purpose of travel; HU: Utas / A válaszhoz / Az utazás célja). Input stílus: `--paper-2` háttér, csak alsó 2px `--ink` keret, 52px magas. Szaggatott vonal alatt fekete „Send message →” gomb + dekoratív vonalkód.
3. **Sikeres küldés után** (a meglévő success állapotba kötve) a jegy tartalma erre cserélődik:
   - `SplitFlap` zöld `CHECKED IN` / `BECSEKKOLVA` animációval;
   - `dl`: Passenger = a beírt név nagybetűvel, Destination = `P. MARTIN`, Reply = „As soon as possible”;
   - köszönő mondat és „Send another” gomb;
   - `role="status"` az élő régión.
4. Hiba esetén a meglévő hibakezelés maradjon, csak stílusban illeszkedjen (piros `#B3261E` szöveg a papíron).

## 5. Fordítások

Minden új UI-szöveget (címkék, táblasorok, pecsétek, szakaszcímkék, alcímek) a meglévő i18n rendszerbe tegyél, EN és HU kulccsal. A tartalmi szövegeket (bio, projektleírások) ne írd újra: azok a jelenlegi forrásból jönnek.

## 6. Mozgás és teljesítmény

- JS csak három dologhoz kell: a flap-animációhoz, az órához és az űrlap állapotához. Ne legyen kliens-oldali framework island, ha nem muszáj.
- A flap-animáció oldalanként egyszer fut le. `prefers-reduced-motion` esetén nincs animáció.
- Villogó LED-ek: CSS `@keyframes`, `prefers-reduced-motion` esetén álló.
- Képek: a meglévő képoptimalizálás (Astro `<Image>`, webp/avif) maradjon. A borítókép `loading="lazy"`, kivéve a hero képet.
- A Lighthouse Performance és Accessibility értéke ne legyen rosszabb a mostaninál. Mérd le előtte és utána is.

## 7. Akadálymentesség

- Minden flap-szöveghez legyen `aria-label`, a cellák `aria-hidden`.
- A dekoratív SVG-k, vonalkódok, MRZ és képhelyőrzők `aria-hidden="true"`.
- Kontraszt: a fenti színpárok 4.5:1 felett vannak; új színt csak ellenőrizve vegyél fel.
- Az űrlapon valódi `<label for>`, a hibák `aria-describedby`-jal kötve.
- Billentyűzettel minden elérhető, a fókusz látható (borostyán outline).

## 8. Reszponzivitás

- 360px szélességen ne legyen vízszintes oldalgörgetés. Csak a `FlapBoard` belső doboza görgethet.
- A hero és az oldalcím flapjei `vw`-alapú méretekkel skálázódnak, és mobilon is kiférnek.
- A kétoszlopos blokkok (`flex-wrap` és `flex-basis`) mobilon egymás alá kerülnek.

## 9. Lépések (külön commitokban)

1. Tokenek, fontok, globális stílus, `SiteHeader`, `SiteFooter`, `LangToggle`.
2. `SplitFlap` + óra, animációval és reduced-motion támogatással.
3. `FlapBoard`, `BoardingPass`, `NextGate`.
4. Főoldal.
5. Projects lista.
6. Esettanulmány sablon (h2-bontás + fallback).
7. Profile (`Passport`, `Stamp`).
8. Contact (stílus + success állapot).
9. HU fordítások ellenőrzése minden oldalon.
10. Takarítás: a régi, már nem használt stílusok és komponensek törlése. **Csak akkor törölj, ha biztosan sehol nincs rá hivatkozás.**

Minden lépés után futtasd a buildet (`npm run build` vagy a repó parancsa) és a meglévő teszteket/lintet.

## 10. Átvételi lista

- [ ] Mind a 10 útvonal (5 EN + 5 HU) betölt, a tartalom ugyanaz, mint most.
- [ ] Az EN/HU váltó minden oldalon a megfelelő párra visz.
- [ ] Az óra a budapesti időt mutatja, és percenként frissül.
- [ ] A flap-animáció lefut, reduced-motion mellett nem. JS nélkül a végleges szöveg látszik.
- [ ] A főoldali tábla és a projektlista a CMS adataiból generálódik. Egy új projekt felvétele után automatikusan megjelenik, kóddal nem kell hozzányúlni.
- [ ] Az esettanulmány h2 nélkül is rendben néz ki (Edortech).
- [ ] A kapcsolati űrlap ténylegesen elküld, a success és a hiba állapot is a jegyen jelenik meg.
- [ ] A meta tagek változatlanok (kivéve a `theme-color`-t).
- [ ] 360px, 768px és 1440px szélességen nincs vízszintes oldalgörgetés vagy kilógó elem.
- [ ] A build hibátlan, a Lighthouse nem romlott.

## 11. Nyitott kérdések (kérdezz rá, mielőtt döntesz)

- Van-e a CMS-ben „featured” jelölés, flight code / IATA mező, „type” (client/personal) mező? Ha nincs, a fenti fallbackeket használd, és jelezd, ha felvennéd őket.
- Football Predictor: hiányzik a rövid leírás és a stack. Ne találd ki; ha üres, a mező ne jelenjen meg.
