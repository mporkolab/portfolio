# Ghost CMS

A portfólió projektjei itt élnek, nem a kódban. Új projekt felvétele egy
bejegyzés publikálása a Ghost adminban — nincs hozzá commit, build vagy
parancs: a portfólió szervere minden kérésnél a Ghostból olvas, így ami
publikálva van, az pár másodpercen belül kint van az oldalon.

## Mi hol van

| Fájl | Mire jó |
| --- | --- |
| `docker-compose.yml` | Ghost + MySQL konténer (a gyökér compose-ba include-olva) |
| `.env` | a jelszavak és az admin címe (nincs verziókövetve; `.env.example` a minta) |
| `data/` | a Ghost adatbázisa és a feltöltött képek (nincs verziókövetve) |

## Egy projekt a Ghostban

Minden projekt egy **bejegyzés (Post)**. Csak a publikált bejegyzések kerülnek
az oldalra; a piszkozat nem.

| Ghostban | Az oldalon |
| --- | --- |
| Cím | a projekt neve |
| Feature image | a kép a falon és az esettanulmányban |
| Excerpt | a rövid leírás a kártyán |
| A bejegyzés szövege | az esettanulmány |
| Egy **callout** kártya a szövegben (`/callout`) | a szürke megjegyzés a történet alatt |
| Az **első** tag | a szerep, pl. `Client project` |
| A többi tag | a stack, pl. `Astro`, `Three.js` |
| Post settings → Meta data → **Canonical URL** | az élő oldal linkje; akinek van, az „Élő”, akinek nincs, az „Fejlesztés alatt” |
| **Feature this post** (csillag) | elöl áll a falon, és ez a főoldal kiemelt projektje |
| `logo` (vagy `#logo`) tag, bármelyik nyelvi posztra | a kép logó: egészben, a sötét kereten jelenik meg, nem kivágva |
| Post URL (slug) | a cím: `/projects/<slug>`, a `-en`/`-hu` végződés nélkül |

A sorrend: a kiemelt elöl, utána a legfrissebb publikálási dátum. Átrendezni a
publikálás dátumával lehet (Post settings → Publish date).

**Két nyelv, két bejegyzés.** Minden projekt két bejegyzés: az egyiken `en`,
a másikon `hu` tag (`#en`/`#hu` is jó; a nyelvi tag sosem számít szerepnek vagy
stacknek). A kettőt a slug köti össze, a `-en`/`-hu` végződés nélkül:
`edortech-en` + `edortech-hu` (vagy `edortech` + `edortech-hu`) →
`/projects/edortech`. Ha a két bejegyzés címe azonos, a Ghost a másodiknak
`edortech-2` slugot ad — ez is összeáll a párjával.
Mindkettőből a saját szövege számít: cím, első tag (szerep), excerpt, szöveg és
callout. A kép, a stack, a link, a `#logo` és a csillag az `#en` bejegyzésből
jön, ami ott hiányzik, az a `#hu`-ból. Ha csak az egyik nyelv van meg, mindkét
nyelvű oldal azt mutatja.

Amelyik bejegyzésen se `#en`, se `#hu` nincs, az nem kerül ki az oldalra.

A szövegbe tett képek is megjelennek (a szerver adja tovább őket, mint a
Feature image-et); a kártyán és a falon viszont mindig a Feature image látszik.

## Indítás

```bash
cp cms/.env.example cms/.env   # töltsd ki; jelszónak: openssl rand -hex 32
docker compose up -d --build   # a repo gyökeréből: Ghost, adatbázis és az oldal együtt
```

Egy teljesen új Ghostnál ezután egyszer, kézzel:

1. `http://localhost:2368/ghost` — a Ghost kéri a tulajdonosi fiókot.
2. Settings → Integrations → **Add custom integration** („Portfolio”), és a
   **Content API key**-t a repo `.env`-jébe: `GHOST_CONTENT_KEY=...`.
3. `docker compose up -d` még egyszer, hogy a portfólió megkapja a kulcsot.
4. A Ghost magától publikál egy „Coming soon” mintabejegyzést — töröld, mert
   minden publikált bejegyzés projekt.

Ezután csak írni kell. A CMS ugyanennek a `portfolio` compose-projektnek a
része (Docker Desktopban is egy csoport); ne a `cms/` mappából indítsd, ott a
projekt neve `cms` lenne, és a rögzített konténernevek ütköznének.

A `:2368` gyökerén a Ghost saját blogoldala is megjelenik — azt nem használjuk,
a portfólió a sajátját rendereli.

## Hogyan éri el az oldal a Ghostot

Csak a portfólió szervere kérdezi a Ghostot, a látogató böngészője soha: a
képeket is a szerver adja tovább a saját `/content/images/` útvonalán. Ezért a
CMS maradhat VPN mögött.

| Ki | Honnan | Beállítás |
| --- | --- | --- |
| a `portfolio` konténer | a compose hálózaton, `http://ghost:2368` | a `docker-compose.yml` adja meg |
| `npm run dev` a hoszton | `http://localhost:2368` | `GHOST_URL` a repo `.env`-jében |
| mindkettő | — | `GHOST_CONTENT_KEY` a repo `.env`-jében |

A projektlistát a szerver 5 másodpercig újrahasznosítja. Ha a Ghost közben
leáll, az utoljára kapott listát adja tovább; ha a konténer indulása óta még
egyszer sem érte el, a projektoldalak hibát adnak. Az „about” és a „contact”
oldal nem függ a Ghosttól.

A képeket a Ghost maga kicsinyíti és alakítja webp-re, a téma képméreteire
(600/1000/2000 px); ezeket a kicsinyített változatokat lemezen tárolja. Ha a
Ghost témáját lecseréled, ezek a méretek eltűnhetnek — maradj az
alapértelmezett témánál.

## Élesbe (homelab)

1. A repo a szerveren. A `cms/.env`-ben a `GHOST_PUBLIC_URL` az a cím,
   ahonnan az admint nyitod (pl. `http://<tailscale-ip>:2368`) — a Ghost erre
   irányít át.
2. A meglévő tartalom átvitele: a helyi `cms/data` mappát másold a szerverre
   (a Ghost és a MySQL leállítva), és a repo `.env`-jébe ugyanaz a
   `GHOST_CONTENT_KEY` kerüljön. Így fiók, projektek, képek és kulcs is megvan.
   Üres Ghosttal kezdve helyette a fenti négy kézi lépés kell.
3. `docker compose up -d --build`. Frissítés (új kód) után ugyanez.
4. Az admin felület (`:2368`) csak VPN-ről (Tailscale) legyen elérhető: ne
   kerüljön a reverse proxy mögé, és ne kapjon nyilvános domaint. A proxy
   célja továbbra is `http://portfolio:80`.
