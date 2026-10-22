/**
 * A CMS-nek nincs belépése: aki eléri, az szerkeszthet. Ezért csak VPN-ről
 * (Tailscale) szabad elérhetőnek lennie – ezt a konténer portjának kötése
 * dönti el (docker-compose.yml, CMS_BIND), nem ez a fájl. Ami itt van, az a
 * böngészőn keresztüli visszaélés ellen véd:
 *
 * - Host-ellenőrzés: csak a `CMS_URL`-ben megadott címre (és a localhostra)
 *   érkező kérést szolgáljuk ki. Enélkül egy idegen weboldal DNS rebindinggel
 *   a saját domainjét a CMS IP-címére irányíthatná, és a böngésződből – a
 *   VPN-en belülről – olvashatná és írhatná a CMS-t.
 * - Origin-ellenőrzés minden írási kérésen: egy megnyitott idegen oldal ne
 *   küldhessen a böngésződdel kérést a CMS-nek (CSRF). Az Astro beépített
 *   `checkOrigin`-je csak az űrlap-típusú törzsekre vonatkozik, a JSON-ra nem.
 * - A válaszok nem kerülhetnek gyorsítótárba és keresőbe, és nem keretezhetők be.
 */
import { defineMiddleware } from 'astro:middleware';
import { env } from './lib/env';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** A `CMS_URL`-ben felsorolt címek hosztjai (vesszővel több is megadható). */
const allowedHosts = new Set(
  (env('CMS_URL') ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .flatMap((u) => {
      try {
        return [new URL(u).hostname];
      } catch {
        console.warn(`[cms] a CMS_URL egyik címe nem érvényes URL: ${u}`);
        return [];
      }
    }),
);

const withHeaders = (original: Response) => {
  // Új Response, mert egyes válaszok (pl. Response.redirect) fejlécei nem módosíthatók.
  const response = new Response(original.body, original);
  const h = response.headers;
  // A feltöltött képek fájlneve egyedi és sosem változik: azok maradhatnak a gyorsítótárban.
  if (!h.has('Cache-Control')) h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'same-origin');
  h.set('X-Content-Type-Options', 'nosniff');
  return response;
};

const refuse = (status: number, error: string) =>
  withHeaders(
    new Response(JSON.stringify({ error }), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );

/** Egy `host[:port]` fejléc hosztneve, vagy null, ha nem értelmezhető. */
const hostnameOf = (host: string) => {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
};

export const onRequest = defineMiddleware(async (context, next) => {
  // A böngésző által használt cím, nem a `context.url`: élesben az Astro node
  // adaptere a Host-ot nem veszi át (`security.allowedDomains` nélkül), a
  // `context.url` ott mindig http://localhost:<port>. Azzal a host-ellenőrzés
  // mindig átment, az origin-ellenőrzés pedig localhoston kívül mindig elbukott.
  //
  // Reverse proxy (pl. Cosmos) mögött a Host lehet a proxyé; az eredetit az
  // X-Forwarded-Host hozza. Megbízni benne biztonságos: a címnek így is a
  // CMS_URL-ben kell lennie, és az Origin-nek (amit a böngésző állít, oldal nem
  // hamisíthat) ugyanerre kell mutatnia.
  const headers = context.request.headers;
  const host =
    headers.get('x-forwarded-host')?.split(',')[0].trim() || headers.get('host') || context.url.host;
  const hostname = hostnameOf(host);
  if (!hostname || (!LOCAL_HOSTS.has(hostname) && !allowedHosts.has(hostname))) {
    return refuse(
      421,
      `Ismeretlen cím: ${hostname ?? host}. Ha innen nyitod a CMS-t, add hozzá a CMS_URL-hez (cms/.env).`,
    );
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    // Csak a hoszt (és port) számít: TLS-t végző proxy mögött a böngésző
    // https-t küld, a szerver pedig http-t lát.
    const origin = context.request.headers.get('origin');
    let originHost: string | null = null;
    try {
      originHost = origin ? new URL(origin).host : null;
    } catch {
      originHost = null;
    }
    if (originHost !== host) return refuse(403, 'Érvénytelen eredet.');
  }

  return withHeaders(await next());
});
