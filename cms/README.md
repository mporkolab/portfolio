# Directus CMS

A portfólió projektjei itt élnek, nem a kódban. Új projekt felvétele mentés az
admin felületen — nincs hozzá commit.

## Mi hol van

| Fájl | Mire jó |
| --- | --- |
| `docker-compose.yml` | Directus + Postgres konténer |
| `.env` | titkok és címek (nincs verziókövetve; `.env.example` a minta) |
| `setup.mjs` | a `projects` collection, a publikus olvasás és a Flow felvétele — újrafuttatható |
| `rebuild.sh` | újraépíti és lecseréli a futó oldalt |
| `rebuild-hook.mjs` | a végpont, amit a Directus meghív mentéskor, és ami a `rebuild.sh`-t indítja |

## Indítás nulláról

```bash
cp cms/.env.example cms/.env   # töltsd ki: openssl rand -hex 32 a KEY-hez és a SECRET-hez
docker compose up -d directus-db directus   # a repo gyökeréből
node cms/setup.mjs             # séma + publikus olvasás + a két meglévő projekt
cms/rebuild.sh                 # az oldal megépítése a CMS-ből és elindítása
```

A CMS a gyökér `docker-compose.yml`-be van `include`-olva, így a `portfolio`
compose-projekt része (Docker Desktopban is egy csoport). Ne a `cms/` mappából
indítsd: ott a projekt neve `cms` lenne, és a rögzített konténernevek ütköznének.

Ezután az admin a `http://localhost:8055`-n van, a `.env`-ben megadott
e-mail/jelszó párossal.

A `setup.mjs` csak hozzáad: egy már felállított példányon újrafuttatva nem írja
felül azt, amit közben az adminban szerkesztettél.

## A CMS címe

A CMS-t **csak a build** kéri le, a látogató böngészője soha: a szövegek a
kész HTML-be kerülnek, a képeket pedig a build a `dist/cms-assets/` alá másolja
(`src/lib/cms-assets.ts`). Ezért a CMS maradhat VPN mögött, élesben is elég a
helyi cím. A repo `.env`-jében két sor van, mert a build két helyről futhat:

| Változó (a repo `.env`-jében) | Ki kéri le | Érték |
| --- | --- | --- |
| `DIRECTUS_URL` | a hoszton futó `npm run build` | `http://localhost:8055` |
| `DIRECTUS_BUILD_URL` | a `docker compose build` konténere — onnan a localhost maga a konténer | `http://host.docker.internal:8055` |

Egy kép csak újraépítés után cserélődik az oldalon — mentéskor ezt a hook
elintézi.

Ha a CMS a build közben nem érhető el, a build **szándékosan elhasal**. Egy
csendben kiadott, projektek nélküli oldal rosszabb lenne, mint egy megszakadt
újraépítés, ami az előző kiadást hagyja élőben.

## Mentésre induló újraépítés

A hoszton fusson a hook (systemd service-ként vagy launchd jobként, hogy a gép
újraindulását túlélje):

```bash
REBUILD_TOKEN=<titok> node cms/rebuild-hook.mjs
```

Csak a `127.0.0.1`-en hallgat, és kér egy fejlécben utazó titkot — nem olyan,
amit a tunnel mögé ki kell tenni. Több mentés egymás után egy újraépítést jelent
(15 s-os késleltetés).

Utána a `cms/.env`-be kerül a `REBUILD_HOOK_URL` és ugyanaz a `REBUILD_TOKEN`, és
a `node setup.mjs` felveszi a Directus Flow-t, ami meghívja.

A lánc: mentés az adminban → Flow → hook → `rebuild.sh` → új image → a konténer
lecserélve. A `rebuild.sh` előbb épít, és csak sikeres build után cserél.

## Élesbe (homelab)

1. A repo a szerveren, `cms/.env` kitöltve, a gyökérből `cms/rebuild.sh`.
   Ez előbb a CMS-t indítja el, és csak utána építi az oldalt. A sima
   `docker compose up -d` itt nem jó: az minden image-et megépít, mielőtt bármit
   elindítana, így az oldal buildje egy még le nem futó CMS-ből olvasna.
2. A repo `.env`-jében a két Directus-cím ugyanaz, mint helyben.
3. Az admin felület (`:8055`) csak VPN-ről (Tailscale) legyen elérhető: ne kerüljön
   a reverse proxy mögé, és ne kapjon nyilvános domaint.
