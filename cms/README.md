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
```

A CMS a gyökér `docker-compose.yml`-be van `include`-olva, így a `portfolio`
compose-projekt része (Docker Desktopban is egy csoport). Ne a `cms/` mappából
indítsd: ott a projekt neve `cms` lenne, és a rögzített konténernevek ütköznének.

Ezután az admin a `http://localhost:8055`-n van, a `.env`-ben megadott
e-mail/jelszó párossal.

A `setup.mjs` csak hozzáad: egy már felállított példányon újrafuttatva nem írja
felül azt, amit közben az adminban szerkesztettél.

## A három cím

Ez az egyetlen pont, ami elsőre becsapós. A CMS címét három helyről kérik le, és
ezek nem ugyanazok:

| Változó (a repo `.env`-jében) | Ki kéri le |
| --- | --- |
| `DIRECTUS_URL` | a hoszton futó `npm run build` |
| `DIRECTUS_BUILD_URL` | a `docker compose build` konténere — a hoszt localhostja onnan nem látszik, ezért `host.docker.internal` |
| `PUBLIC_DIRECTUS_URL` | a **látogató böngészője**: ez kerül a kész HTML képcímeibe |

Élesben mind a három lehet egyszerűen `https://cms.martinporkolab.hu`.

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

1. A repo a szerveren, `cms/.env` kitöltve, a gyökérből `docker compose up -d`.
2. A reverse proxyban (Cosmos Cloud) új szolgáltatás a `cms.martinporkolab.hu`
   subdomainre, a `8055`-ös portra.
3. Az admin felület Cloudflare Access (Zero Trust → Access → Application) mögé,
   csak a saját fiókodra engedve. A `/items/*` és az `/assets/*` viszont
   publikus maradjon, mert azokat a build és a látogató böngészője kéri le.
4. A repo `.env`-jében mind a három cím a nyilvános URL.
