# CMS

A portfólió projektjei itt élnek, nem a kódban. Új projekt felvétele egy
projekt közzététele a CMS-ben — nincs hozzá commit, build vagy parancs: a
portfólió szervere minden kérésnél a CMS adatbázisából olvas, így ami
publikálva van, az azonnal kint van az oldalon.

A CMS egy kis, önálló Astro app (React + TipTap szerkesztő, SQLite). Az
edortech-web admin felületéből született, de csak az kell belőle, ami egy
emberhez kell: **nincs belépés**. Aki eléri, szerkeszthet — ezért csak
VPN-ről (Tailscale) szabad elérhetőnek lennie, mint korábban a Ghostnak.

## Mi hol van

| Fájl | Mire jó |
| --- | --- |
| `docker-compose.yml` | a `cms` konténer és a `cms-data` volume (a gyökér compose-ba include-olva) |
| `.env` | a cím, a port kötése, az előnézet titka (nincs verziókövetve; `.env.example` a minta) |
| `src/lib/db/schema.ts` | az adatbázis sémája — a portfólió `src/lib/cms.ts`-e ugyanezt olvassa |
| `drizzle/` | a migrációk; induláskor maguktól lefutnak |
| `data/` | fejlesztésben az adatbázis (`cms.db`) és a képek (`uploads/`); nincs verziókövetve. A régi Ghost adatai (`mysql/`, `content/`) is itt vannak, amíg nem törlöd őket. |

## Egy projekt a CMS-ben

| A CMS-ben | Az oldalon |
| --- | --- |
| Cím (nyelvenként) | a projekt neve |
| Szerep (nyelvenként) | a kis nagybetűs sor a cím alatt, pl. `Client project` |
| Rövid leírás (nyelvenként) | a kártyán, a főoldalon és a keresőkben |
| A szöveg (nyelvenként) | az esettanulmány; címsor, lista, idézet, táblázat, kép mehet bele |
| Megjegyzés (nyelvenként) | a szürke sor a történet alatt |
| Borítókép | a kép a falon és az esettanulmányban |
| „A kép logó” | egészben, a sötét kereten jelenik meg, nem kivágva |
| Kiemelt ★ | elöl áll a falon; az első kiemelt a főoldal projektje |
| Élő oldal | a link a lap alján; akinek van, az „Élő”, akinek nincs, az „Fejlesztés alatt” |
| Stack | vesszővel elválasztva, az oldalon `A · B · C` |
| URL | `/projects/<slug>` és `/hu/projects/<slug>` |
| Dátum | a sorrend: a kiemelt elöl, utána a frissebb |

Csak a publikált projektek kerülnek az oldalra. Piszkozatnál a szerkesztő 5
másodperc tétlenség után magától ment; publikált projektnél a „Változások
közzététele” gomb menti, hogy félkész szöveg ne kerüljön ki.

**Két nyelv, egy projekt.** A szerkesztőben angol és magyar fül van. Ahol a
cím üres, az a nyelv nincs megírva, és az oldal mindkét nyelven a másikat
mutatja. Az URL az angol címből készül (ha nincs, a magyarból), amíg át nem
írod vagy nem publikálod.

**Képek.** Gombbal, behúzással vagy beillesztéssel kerülnek a szövegbe; a
borítókép a jobb oldali sávban. Feltöltéskor WebP-be kódolódnak (600/1000/2000
px, kisebb eredetit nem nagyít), az EXIF-adatok (GPS is) elvesznek, és készül
egy JPEG/PNG változat a megosztási előnézethez. Közzététel előtt minden
szövegbeli képnek kell alternatív szöveg.

**Előnézet.** Az „Előnézet EN/HU” gomb a valódi portfólión nyitja meg a
projektet, piszkozatként is: a link egy óráig érvényes aláírást visz, amit a
portfólió szervere ellenőriz; mindenki más 404-et kap. Kell hozzá a
`PORTFOLIO_URL` és a `PREVIEW_SECRET` a `cms/.env`-ben.

## Indítás

```bash
cp cms/.env.example cms/.env   # töltsd ki; a titoknak: openssl rand -hex 32
docker compose up -d --build   # a repo gyökeréből: CMS és az oldal együtt
```

Ezután `http://localhost:2368` (vagy a `CMS_URL`). Nincs fiók, nincs kulcs: az
első indulás létrehozza az üres adatbázist.

A CMS ugyanennek a `portfolio` compose-projektnek a része (Docker Desktopban
is egy csoport); ne a `cms/` mappából indítsd, ott a projekt neve `cms` lenne,
és a rögzített konténernevek ütköznének.

Fejlesztéshez Docker nélkül:

```bash
cd cms && npm install && npm run dev   # http://localhost:2368, adatok: cms/data/
npm run dev                            # a repo gyökeréből: a portfólió, ugyanabból olvas
```

## Hogyan éri el az oldal a CMS-t

Sehogy hálózaton: a két konténer ugyanazt a `cms-data` volume-ot csatolja fel
(`/data/cms.db`, `/data/uploads/`). A CMS ír, a portfólió csak olvas (az
adatbázist read-only nyitja meg), és a képeket a saját `/uploads/` útvonalán
adja tovább. A látogató böngészője így sosem beszél a CMS-sel, ezért az
maradhat VPN mögött.

| Ki | Honnan olvas | Beállítás |
| --- | --- | --- |
| a `portfolio` konténer | `/data` a `cms-data` volume-on | a Dockerfile adja meg |
| `npm run dev` a hoszton | `cms/data/cms.db`, `cms/data/uploads` | `CMS_DATABASE`, `CMS_UPLOADS` (az alapértelmezés jó) |

A volume Docker volume, nem bind mount: a két konténer egyszerre használja az
SQLite-ot (WAL módban), és a macOS-es Docker Desktop megosztott mappáján ennek
a zárolása nem megbízható.

Ha a CMS nem fut, az oldal ugyanúgy működik — csak olvasni kell az adatbázist.
Ha az adatbázis még nincs meg (a CMS még sosem indult), a projektoldalak
503-at adnak; az „about” és a „contact” oldal nem függ tőle.

## Biztonság

Belépés nincs, ezért:

- **A port kötése a védelem.** A `CMS_BIND` az a hoszt-cím, amin a CMS portja
  hallgat: alapból `127.0.0.1`, élesen a gép Tailscale-címe (pl.
  `100.71.44.91`). Soha ne `0.0.0.0` egy internetre nyitott gépen, és ne kerüljön
  a reverse proxy mögé, ne kapjon nyilvános domaint.
- **Host-ellenőrzés.** A CMS csak a `CMS_URL`-ben megadott címre (és a
  localhostra) érkező kérést szolgálja ki, így egy idegen weboldal DNS
  rebindinggel sem éri el a böngésződön keresztül.
- **Origin-ellenőrzés** minden írási kérésen (CSRF ellen).

## Mentés

Az adatbázis és a képek a `portfolio_cms-data` volume-on vannak; ezekért most
mi felelünk.

```bash
docker compose exec cms node scripts/backup.mjs        # → /data/backups/cms-<idő>.db, futás közben is konzisztens
docker run --rm -v portfolio_cms-data:/data -v "$PWD":/out alpine \
  tar czf /out/cms-data.tgz -C /data backups uploads   # a mentés és a képek a hosztra
```

A képek fájlneve egyedi és sosem változik, így azokat elég másolni.
Visszaállítás: a CMS leállítva, a `.db` fájlt `cms.db` néven és az `uploads/`
mappát vissza a volume-ra.

## Élesbe (homelab)

1. A repo a szerveren. A `cms/.env`-ben a `CMS_BIND` a Tailscale-cím, a
   `CMS_URL` az a cím, ahonnan a CMS-t nyitod (pl. `http://100.71.44.91:2368`),
   a `PORTFOLIO_URL` a nyilvános cím, és egy `PREVIEW_SECRET`.
2. `docker compose up -d --build`. Frissítés (új kód) után ugyanez.
3. A proxy célja továbbra is `http://portfolio:80`.

## Átállás a Ghostról

A régi tartalmat kézzel kell átvinni. A Ghost adatai addig a `cms/data/mysql`
és `cms/data/content` mappában maradnak — ha kell, a régi Ghost egy korábbi
commitról újra elindítható, hogy kimásold belőle a szövegeket és a képeket.
Ha minden átkerült, a két mappa törölhető. A régi `/content/images/...`
képcímek megszűntek.
