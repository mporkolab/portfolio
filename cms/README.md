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
docker compose up -d directus-db directus rebuild-hook   # a repo gyökeréből
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

A lánc: mentés az adminban → Flow → `rebuild-hook` konténer → `rebuild.sh` → új
image → a `portfolio` konténer lecserélve. A `rebuild.sh` előbb épít, és csak
sikeres build után cserél. Több mentés egymás után egy újraépítést jelent (15 s
késleltetés).

A hook a compose projekt része, a CMS-sel együtt indul, nincs mit külön
telepíteni. Portot nem ad ki: csak a Directus éri el, a compose hálózaton
(`http://rebuild-hook:9009/rebuild`), egy fejlécben utazó titokkal. A hoszt
Docker-socketjén keresztül épít.

Beállítás: a `cms/.env`-ben a `REBUILD_HOOK_URL` és a `REBUILD_TOKEN`, utána
`node cms/setup.mjs` felveszi a Flow-t, vagy a meglévőt ezekhez igazítja.

Napló: `docker logs -f portfolio-rebuild-hook`.

Csak a `projects` mentése indít újraépítést; egy képet a fájlkönyvtárban
kicserélve kézzel kell: `cms/rebuild.sh`.

## Élesbe (homelab)

1. Linux hoszton a Docker `root`-ként hozza létre a `cms/data` mappáit, a
   Directus viszont uid 1000 alatt fut, és nem tud írni beléjük — a
   `/server/health` ilyenkor 503-at ad. Az első `docker compose up` után egyszer:
   `sudo chown -R 1000:1000 cms/data/uploads cms/data/extensions`, majd
   `docker compose restart directus`. (A `db` a Postgresé, 70-es uid, azt hagyd.)
2. A repo a szerveren, `cms/.env` kitöltve, a gyökérből `cms/rebuild.sh`.
   Ez előbb a CMS-t indítja el, és csak utána építi az oldalt. A sima
   `docker compose up -d` itt nem jó: az minden image-et megépít, mielőtt bármit
   elindítana, így az oldal buildje egy még le nem futó CMS-ből olvasna.
3. A repo `.env`-jében a két Directus-cím ugyanaz, mint helyben.
4. Az admin felület (`:8055`) csak VPN-ről (Tailscale) legyen elérhető: ne kerüljön
   a reverse proxy mögé, és ne kapjon nyilvános domaint.
