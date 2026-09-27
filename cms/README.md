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

A lánc: mentés az adminban → Flow → hook → `rebuild.sh` → új image → a konténer
lecserélve. A `rebuild.sh` előbb épít, és csak sikeres build után cserél. Több
mentés egymás után egy újraépítést jelent (15 s-os késleltetés).

A hook (`rebuild-hook.mjs`) a hoszton fut, és csak ott figyel, ahol a Directus
konténer a hosztot éri el — nyilvánosan sehol. Kér egy fejlécben utazó titkot is.

**A szerveren (Linux), egyszer:**

1. A `cms/.env`-be:
   ```
   REBUILD_HOOK_URL=http://host.docker.internal:9009/rebuild
   REBUILD_TOKEN=<openssl rand -hex 32>
   REBUILD_HOST=172.17.0.1
   ```
   A `172.17.0.1` a docker0 híd címe; ha nálad más, `ip -4 addr show docker0`.
2. `docker compose up -d directus` — hogy a Directus megkapja a
   `host.docker.internal` nevet.
3. `node cms/setup.mjs` — felveszi a Flow-t. Ha a Flow már létezik (mert a
   token korábban is ki volt töltve), a setup nem írja át: az URL-t és a tokent
   az adminban, a Settings → Flows alatt ellenőrizd.
4. A service: `cms/rebuild-hook.service` — a telepítés a fájl tetején van. Ha a
   repo nem a `/mnt/storage/portfolio` alatt van, az útvonalakat igazítsd benne.
5. Próba: ments el egy projektet az adminban, és nézd:
   `journalctl -u portfolio-rebuild-hook -f`.

Ha a hívás nem ér el a hookig, és fut `ufw`, engedd a Docker hálózatokból:
`sudo ufw allow from 172.16.0.0/12 to any port 9009 proto tcp`.

**Macen, Docker Desktoppal** a `REBUILD_HOST` üresen marad (127.0.0.1), és a
hook kézzel indítható: `set -a; . cms/.env; set +a; node cms/rebuild-hook.mjs`.

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
