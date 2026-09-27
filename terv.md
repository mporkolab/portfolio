# Directus CMS a martinporkolab.hu-hoz — Tervezet

Sep 26, 2026 · @Martin

> **Állapot: megépült.** Az integráció működik, a projektek a CMS-ből jelennek
> meg. A megvalósítás négy ponton tér el ettől a tervezettől — a részletek az
> „Eltérések a tervtől" szakaszban, a lépésenkénti leírás alább a szándékot
> dokumentálja. A működtetés napi tudnivalói: `cms/README.md`.

## Cél és áttekintés

A martinporkolab.hu (Astro, homelabon futtatva, Cloudflare Tunnel-en kiközvetítve) projekt-szekcióját jelenleg kódmódosítással kell bővíteni új projekt hozzáadásakor. A cél egy olyan headless CMS bevezetése, amivel a projektek (cím, státusz, leírás, thumbnail kép, link) egy admin felületen szerkeszthetők, **git commit nélkül**, a meglévő infrastruktúrán (self-hosted, Cloudflare mögött).

**Választott megoldás: Directus**

- Nyílt forráskódú, Postgres-alapú headless CMS, saját admin UI-val
- Docker konténerként fut a homelabon, a többi self-hosted szolgáltatás mellett
- Az Astro build folyamat az ő API-jából húzza le a projekt-adatokat — a tartalom teljesen elválik a kódtól

**Fő komponensek:**

1. Directus konténer (Docker Compose) + Postgres adatbázis
2. Cloudflare Tunnel route a Directus admin felülethez (pl. `cms.martinporkolab.hu`)
3. `Projects` collection séma a Directusban
4. Astro oldal módosítása, hogy build időben lekérje a projekteket a Directus REST API-ból
5. Automatikus rebuild trigger (webhook + lokális script) minden Directus-mentéskor

## 1. lépés — Directus telepítése Docker Compose-szal

Hozz létre egy `directus/` mappát a homelab szerveren, benne a következő `docker-compose.yml` fájllal:

```yaml
services:
  directus-db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - ./data/db:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: <erős-jelszó>
      POSTGRES_DB: directus

  directus:
    image: directus/directus:latest
    restart: unless-stopped
    ports:
      - "8055:8055"
    volumes:
      - ./data/uploads:/directus/uploads
    depends_on:
      - directus-db
    environment:
      KEY: <random-uuid>
      SECRET: <random-secret>
      DB_CLIENT: pg
      DB_HOST: directus-db
      DB_PORT: 5432
      DB_DATABASE: directus
      DB_USER: directus
      DB_PASSWORD: <erős-jelszó>
      ADMIN_EMAIL: <email-cím>
      ADMIN_PASSWORD: <admin-jelszó>
      PUBLIC_URL: https://cms.martinporkolab.hu
```

Indítás:

```bash
docker compose up -d
```

Ellenőrzés: `http://<szerver-ip>:8055` böngészőből elérhető, és be lehet lépni az `ADMIN_EMAIL` / `ADMIN_PASSWORD` párossal.

## 2. lépés — Kiközvetítés Cloudflare Tunnel-en keresztül

Ha már fut Cloudflare Tunnel a homelabon (pl. `cloudflared` a fő oldalhoz), egészítsd ki a tunnel konfigurációját egy új ingress szabállyal:

```yaml
ingress:
  - hostname: cms.martinporkolab.hu
    service: http://localhost:8055
  - hostname: martinporkolab.hu
    service: http://localhost:<astro-port>
  - service: http_status:404
```

Utána a Cloudflare DNS-ben adj hozzá egy CNAME rekordot `cms` névvel, ami a tunnel azonosítóra mutat (ha a `cloudflared tunnel route dns` parancsot használod, ez automatikusan megtörténik).

Ha Cosmos Cloud-ot használsz a reverse proxy / tunnel kezelésére, ott is felvehető ugyanígy egy új szolgáltatásként, subdomainhez rendelve.

**Fontos:** az admin felületet érdemes Cloudflare Access mögé tenni (Zero Trust → Access → Application), hogy ne legyen nyilvánosan bárki számára bejelentkezhető — csak a te e-mail címed/fiókod engedélyezett legyen rá.

## 3. lépés — Projects collection adatmodell

A Directus admin felületén (Settings → Data Model) hozz létre egy `projects` collection-t az alábbi mezőkkel:

| Mező | Típus | Megjegyzés |
| --- | --- | --- |
| `title` | String | Projekt neve (pl. "EDORTECH.HU") |
| `slug` | String (unique) | URL-barát azonosító, case study oldalhoz |
| `status` | Select (dropdown) | Opciók: `live`, `in_development` |
| `project_type` | Select | Opciók: `client_project`, `personal_project` |
| `subtitle` | String | pl. "Designed and built solo" |
| `thumbnail` | Image (File) | A kártyán megjelenő screenshot |
| `live_url` | String (URL) | Élő oldal linkje (ha van) |
| `case_study_content` | WYSIWYG / Markdown | A részletes case study szövege |
| `sort` | Integer | Megjelenési sorrend a listában |
| `published` | Boolean | Csak a `true` státuszú projektek jelenjenek meg a build-ben |

Állítsd be a `Public` role jogosultságait úgy, hogy a `projects` collection **olvasásra** (Read) nyitott legyen API-kulcs nélkül is — így az Astro build egyszerű, autentikáció nélküli GET kéréssel tudja lekérni az adatokat.

## 4. lépés — Astro integráció

Hozz létre egy segédfüggvényt, ami build időben lekéri a projekteket a Directus API-ból:

```ts
// src/lib/directus.ts
const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "https://cms.martinporkolab.hu";

export interface Project {
  id: string;
  title: string;
  slug: string;
  status: "live" | "in_development";
  project_type: "client_project" | "personal_project";
  subtitle: string;
  thumbnail: string | null;
  live_url: string | null;
  case_study_content: string;
  sort: number;
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(
    `${DIRECTUS_URL}/items/projects?filter[published][_eq]=true&sort=sort`
  );
  if (!res.ok) throw new Error(`Directus fetch failed: ${res.status}`);
  const { data } = await res.json();
  return data;
}

export function thumbnailUrl(fileId: string) {
  return `${DIRECTUS_URL}/assets/${fileId}`;
}
```

Használat egy Astro oldalon/komponensben:

```astro
---
import { getProjects, thumbnailUrl } from "../lib/directus";
const projects = await getProjects();
---
{projects.map((p) => (
  <article>
    <img src={p.thumbnail ? thumbnailUrl(p.thumbnail) : "/placeholder.png"} alt={p.title} />
    <span>{p.status === "live" ? "LIVE" : "IN DEVELOPMENT"}</span>
    <h3>{p.title}</h3>
    <p>{p.subtitle}</p>
  </article>
))}
```

A `.env` fájlba kerüljön: `DIRECTUS_URL=https://cms.martinporkolab.hu`.

## 5. lépés — Automatikus rebuild webhookkal

Mivel az Astro build lokálisan fut a homelabon, a rebuildet egy egyszerű, csak `localhost`-on figyelő kis szerverrel triggerelheted:

```bash
#!/bin/bash
# rebuild.sh
cd /path/to/martinporkolab-site
git pull --ff-only   # ha van külön kód-deploy, ez opcionális
npm run build
# az astro build kimenetét a webszerver (pl. nginx/caddy) már a helyes mappából szolgálja ki
systemctl reload nginx   # vagy a használt webszerver reload parancsa
```

Ezt hívd meg a Directus **Flow** funkciójával (Settings → Flows):

1. Trigger: `Event Hook` → `items.create` és `items.update` a `projects` collection-ön
2. Action: `Webhook / Request URL` → egy kis, csak belső hálózaton elérhető endpoint, ami elindítja a `rebuild.sh`-t (pl. egy Node/Python mikroszolgáltatás, vagy akár egy `webhook` nevű CLI eszköz systemd service-ként)

Így a folyamat: Directusban mentesz → Flow lefut → webhook meghívja a rebuild scriptet → `astro build` lefut → az oldal frissül. Mindez **git commit nélkül**, csak a Directus adatbázisában történik a tényleges tartalomváltozás.

## Eltérések a tervtől

Négy ponton mást csináltam, mint amit ez a tervezet leír. Mindegyiknek oka volt:

1. **A séma kétnyelvű.** A tervezett `subtitle` / `case_study_content` mezők
   egynyelvűek voltak, az oldal viszont EN és HU is. Helyettük nyelvenkénti
   mezők vannak (`role_en`/`role_hu`, `blurb_*`, `story_*`, `note_*`), plusz egy
   `thumbnail_is_logo`, mert a fal máshogy rajzolja a logót és a screenshotot.
   Így a régi i18n szótárból hiánytalanul átkerült minden szöveg.

2. **Egy cím helyett három.** A `DIRECTUS_URL` két dolgot csinált egyszerre:
   ebből olvas a build, és ez kerül a kész HTML képcímeibe. A kettő nem
   ugyanaz — a build a konténerből kéri le, a képeket meg a látogató böngészője.
   Ezért `DIRECTUS_URL` / `DIRECTUS_BUILD_URL` / `PUBLIC_DIRECTUS_URL`. Ez
   bukott ki az első éles újraépítéskor, konkrét hibaként.

3. **A build elhasal, ha a CMS nem elérhető** — nem az utolsó jó állapottal
   épül tovább. Egy csendben kiadott, projektek nélküli oldal rosszabb lenne,
   mint egy megszakadt újraépítés, ami az előző kiadást hagyja élőben.

4. **A case study oldalak megszűntek külön fájlnak.** Volt két, kézzel írt
   oldal (`EdortechPage.astro`, `PredictorPage.astro`) szinte azonos
   szerkezettel. Helyettük egy `CaseStudyPage.astro` és egy `[slug].astro`
   route nyelvenként — így egy CMS-ben felvett új projekt magától kap teljes,
   kétnyelvű esettanulmány-oldalt is, nem csak egy kártyát a falon.

Az `5. lépés` rebuild scriptje sem `npm run build` + nginx reload, hanem
`docker compose build` + konténercsere, mert a deploy ebben a repóban Docker
image-ként megy.

## Ellenőrző lista

- [x] Directus + Postgres konténer felhúzva Docker Compose-szal (`cms/docker-compose.yml`)
- [x] Admin belépés működik `http://localhost:8055`-n
- [ ] Cloudflare Tunnel / Cosmos route hozzáadva (`cms.martinporkolab.hu`) — **a szerveren van hátra**
- [ ] Cloudflare Access beállítva az admin felület védelmére — **a szerveren van hátra**
- [x] `projects` collection létrehozva (kétnyelvű mezőkkel, `cms/setup.mjs`)
- [x] `Public` role read jogosultság a `projects` és a `directus_files` collectionön
- [x] Mind a két meglévő projekt átemelve, képpel együtt
- [x] `src/lib/cms.ts` + a fal, a lista, a főoldali kiemelt panel és a case study oldalak a CMS-ből
- [x] `.env`-ben mind a három cím beállítva
- [x] Rebuild script (`cms/rebuild.sh`) létrehozva és lefuttatva
- [x] Directus Flow beállítva, ami a webhookot triggereli mentéskor
- [x] Végigtesztelve: új projekt felvétele Directusban → megjelent a falon, a listában és saját kétnyelvű case study oldalt kapott, a git repo változatlan
- [x] Végigtesztelve: mentés az adminban → Flow → hook → új image → konténercsere, emberi beavatkozás nélkül
