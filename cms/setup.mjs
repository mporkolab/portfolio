/**
 * Brings the Directus instance to the shape the site expects: the `projects`
 * collection, public read access to it, and the projects that used to live in
 * `src/lib/projects.ts` and the i18n dictionary.
 *
 * Idempotent — safe to re-run against an instance that is already set up. It
 * only ever adds; it does not edit projects you have since changed in the
 * admin, so running it again will not undo your own edits.
 *
 *   cd cms && node setup.mjs
 *
 * Reads cms/.env for the URL and the admin credentials.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const env = Object.fromEntries(
  (await readFile(join(HERE, '.env'), 'utf8'))
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_BASE = (process.env.CMS_URL ?? `http://localhost:${env.CMS_PORT ?? 8055}`).replace(/\/$/, '');

let token;

async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`${URL_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
    },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`);
  }
  return json?.data ?? json;
}

async function login() {
  const data = await api('/auth/login', {
    method: 'POST',
    body: { email: env.CMS_ADMIN_EMAIL, password: env.CMS_ADMIN_PASSWORD },
  });
  token = data.access_token;
  console.log(`✔ logged in to ${URL_BASE}`);
}

// ── schema ──────────────────────────────────────────────────────────────────

const str = (field, extra = {}) => ({
  field,
  type: 'string',
  meta: { interface: 'input', ...extra.meta },
  schema: { ...extra.schema },
});
const text = (field, note) => ({
  field,
  type: 'text',
  meta: { interface: 'input-multiline', note },
  schema: {},
});

const FIELDS = [
  str('slug', {
    meta: { note: 'URL segment: /projects/<slug>. Changing it changes the page address.', required: true },
    schema: { is_unique: true, is_nullable: false },
  }),
  str('title', { meta: { required: true }, schema: { is_nullable: false } }),
  {
    field: 'status',
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      required: true,
      options: {
        choices: [
          { text: 'Live', value: 'live' },
          { text: 'In development', value: 'dev' },
        ],
      },
    },
    schema: { default_value: 'dev', is_nullable: false },
  },
  {
    field: 'thumbnail',
    type: 'uuid',
    meta: { interface: 'file-image', special: ['file'], note: 'The screenshot or logo shown on the wall.' },
    schema: {},
  },
  {
    field: 'thumbnail_is_logo',
    type: 'boolean',
    meta: {
      interface: 'boolean',
      note: 'On for a logo: shown whole on the dark housing instead of cropped to fill the frame.',
    },
    schema: { default_value: false },
  },
  str('live_url', { meta: { note: 'Leave empty while there is nothing live to visit.' } }),
  str('stack', { meta: { note: 'e.g. Astro · Three.js · Tailwind CSS' } }),
  str('role_en', { meta: { note: 'e.g. Client project' } }),
  str('role_hu', { meta: { note: 'pl. Ügyfélprojekt' } }),
  text('blurb_en', 'One or two sentences, shown on the card.'),
  text('blurb_hu', 'Egy-két mondat, a kártyán jelenik meg.'),
  text('story_en', 'The case study. One paragraph per line.'),
  text('story_hu', 'Az esettanulmány. Soronként egy bekezdés.'),
  text('note_en', 'Optional caveat printed under the story.'),
  text('note_hu', 'Opcionális megjegyzés a történet alatt.'),
  {
    field: 'sort',
    type: 'integer',
    meta: { interface: 'input', hidden: false, note: 'Order on the wall. The first one is also the featured project.' },
    schema: {},
  },
  {
    field: 'published',
    type: 'boolean',
    meta: { interface: 'boolean', note: 'Only published projects reach the build.' },
    schema: { default_value: true },
  },
];

async function ensureCollection() {
  const existing = await api('/collections').catch(() => []);
  if (existing.some((c) => c.collection === 'projects')) {
    console.log('• collection `projects` already exists');
  } else {
    await api('/collections', {
      method: 'POST',
      body: {
        collection: 'projects',
        meta: {
          icon: 'web',
          note: 'The projects shown on the portfolio. Saving here is what publishes them.',
          display_template: '{{title}}',
          sort_field: 'sort',
        },
        schema: {},
        fields: [
          {
            field: 'id',
            type: 'uuid',
            meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] },
            schema: { is_primary_key: true, length: 36, has_auto_increment: false },
          },
        ],
      },
    });
    console.log('✔ created collection `projects`');
  }

  const have = new Set((await api('/fields/projects')).map((f) => f.field));
  for (const field of FIELDS) {
    if (have.has(field.field)) continue;
    await api('/fields/projects', { method: 'POST', body: field });
    console.log(`✔ field ${field.field}`);
  }
}

async function ensurePublicRead() {
  const policies = await api('/policies?fields=id,name');
  // Directus ships the public policy under a translation key rather than a name.
  const pub = policies.find((p) => p.name === '$t:public_label' || p.name === 'Public');
  if (!pub) throw new Error('no public policy found — set the permission by hand');

  const perms = await api(`/permissions?filter[policy][_eq]=${pub.id}&fields=id,collection,action`);
  for (const collection of ['projects', 'directus_files']) {
    if (perms.some((p) => p.collection === collection && p.action === 'read')) {
      console.log(`• public read on ${collection} already set`);
      continue;
    }
    await api('/permissions', {
      method: 'POST',
      body: {
        policy: pub.id,
        collection,
        action: 'read',
        fields: ['*'],
        permissions: {},
        validation: {},
      },
    });
    console.log(`✔ public read on ${collection}`);
  }
}

// ── content ─────────────────────────────────────────────────────────────────

async function uploadOnce(relPath, title) {
  const found = await api(`/files?filter[title][_eq]=${encodeURIComponent(title)}&fields=id&limit=1`);
  if (found.length) {
    console.log(`• image "${title}" already uploaded`);
    return found[0].id;
  }
  const bytes = await readFile(join(REPO, relPath));
  const form = new FormData();
  form.append('title', title);
  form.append('file', new Blob([bytes], { type: 'image/png' }), relPath.split('/').pop());
  const file = await api('/files', { method: 'POST', body: form, raw: true });
  console.log(`✔ uploaded ${relPath} → ${file.id}`);
  return file.id;
}

/** The two projects as they stood in the code, now content rather than code. */
const SEED = [
  {
    slug: 'edortech',
    title: 'edortech.hu',
    status: 'live',
    sort: 1,
    published: true,
    live_url: 'https://edortech.hu',
    stack: 'Astro · Three.js · Tailwind CSS',
    image: ['src/assets/edortech_landing.png', 'edortech.hu landing'],
    thumbnail_is_logo: false,
    role_en: 'Client project',
    role_hu: 'Ügyfélprojekt',
    blurb_en:
      'An innovative deep-tech company focused on high-energy systems and on developing the battery technologies of the future.',
    blurb_hu:
      'Innovatív deep-tech vállalat, amely nagyenergiájú rendszerekre és a jövő akkumulátortechnológiáinak fejlesztésére összpontosít.',
    story_en: [
      'This site is close to my heart: it was my first big commission, so I tried to deliver the best work I was capable of.',
      'The brief was simple: a modern, clean, fast site, in more than one language.',
      'It also had to account for SEO and GEO optimisation, so that search engines rank the site well and AI can quote from it when people put questions to it.',
      'Choosing the frameworks was easy. Performance came first, alongside the 3D model — which is what Three.js made possible.',
      "I built the design from the company's own core colours, mixed with a glass effect.",
    ].join('\n'),
    story_hu: [
      'A weboldal közel áll a szívemhez, mivel ez volt az első nagy munkám, ezért a legjobb tudásom szerint próbáltam teljesíteni.',
      'A cél egyszerű volt: egy modern, letisztult, gyors weboldal, ami többnyelvű.',
      'Figyelembe kellett venni a SEO- és GEO-optimalizációkat, hogy az oldalt a keresőmotorok előresorolják, és a mesterséges intelligencia is idézni tudjon belőle azokra a kérdésekre, amiket az interneten feltesznek.',
      'A kiválasztott keretrendszerek az Astro, a Three.js és a Tailwind voltak. Ezek kiválasztása egyszerű volt: a teljesítmény volt az elsődleges szempont, a 3D modell alkalmazása mellett — amit a Three.js tett lehetővé.',
      'A dizájntervet a cég alapszíneiből készítettem, üveghatással keverve.',
    ].join('\n'),
    note_en: null,
    note_hu: null,
  },
  {
    slug: 'football-predictor',
    title: 'Football predictor',
    status: 'dev',
    sort: 2,
    published: true,
    live_url: null,
    stack: null,
    image: ['src/assets/fp-clear.png', 'Football predictor logo'],
    thumbnail_is_logo: true,
    role_en: 'Personal project · in development',
    role_hu: 'Saját projekt · fejlesztés alatt',
    blurb_en:
      'A machine-learning project that predicts the events and outcomes of football matches. Still being built — nothing is deployed or publicly usable yet.',
    blurb_hu:
      'Gépi tanulásra épülő projekt, amely futballmérkőzések eseményeit és kimenetelét jelzi előre. Még épül — nincs kiélesítve, és nyilvánosan sem használható.',
    story_en: [
      'The idea came out of my interest in machine learning, and in large part out of the 2026 World Cup.',
      'The first working version was already predicting: trained on 500 matches, on the national sides, from Elo ratings and earlier fixtures.',
      'Since then the front end has had a facelift, and as things stand the database has grown to sixteen thousand matches — the club leagues and the European cups are in there now too.',
    ].join('\n'),
    story_hu: [
      'Ez a projekt alapvetően a gépi tanulás iránti érdeklődésem miatt pattant ki a fejemből, illetve nagy százalékban a 2026-os világbajnokság miatt.',
      'Az első működő verzió akkor már sikeresen tippelt is: 500 meccsen tanítva, a nemzeti válogatottakra, Elo és az előzetes mérkőzések alapján.',
      'Azóta kapott a frontend egy felvarrást, és jelen állás szerint 16 ezer meccsre bővült az adatbázis — megjelentek a klubbajnokságok és az európai kupasorozatok is.',
    ].join('\n'),
    note_en: 'No accuracy figures are published while the model is still in development.',
    note_hu: 'Amíg a modell fejlesztés alatt áll, nem közlünk pontossági számokat.',
  },
];

async function seed() {
  for (const { image, ...project } of SEED) {
    const found = await api(`/items/projects?filter[slug][_eq]=${project.slug}&fields=id&limit=1`);
    if (found.length) {
      console.log(`• project ${project.slug} already there, left untouched`);
      continue;
    }
    const thumbnail = await uploadOnce(...image);
    await api('/items/projects', { method: 'POST', body: { ...project, thumbnail } });
    console.log(`✔ project ${project.slug}`);
  }
}

// ── rebuild trigger ─────────────────────────────────────────────────────────

/**
 * The Flow that tells the host to rebuild when a project is saved. Only set up
 * when cms/.env says where the trigger lives, because that address is per-host:
 *
 *   REBUILD_HOOK_URL=http://rebuild-hook:9009/rebuild
 *   REBUILD_TOKEN=<the same secret the hook runs with>
 *
 * An existing Flow keeps whatever was edited on it in the admin, except the
 * address and the secret, which are brought in line with cms/.env — those are
 * the two that change when the hook moves.
 */
async function ensureRebuildFlow() {
  if (!env.REBUILD_HOOK_URL || !env.REBUILD_TOKEN) {
    console.log('• no REBUILD_HOOK_URL/REBUILD_TOKEN in cms/.env — skipping the rebuild Flow');
    return;
  }
  const NAME = 'Rebuild the site';
  const options = {
    method: 'POST',
    url: env.REBUILD_HOOK_URL,
    headers: [{ header: 'x-rebuild-token', value: env.REBUILD_TOKEN }],
    body: '{}',
  };
  const flows = await api('/flows?fields=id,name,operation');
  const existing = flows.find((f) => f.name === NAME);
  if (existing) {
    if (existing.operation) {
      await api(`/operations/${existing.operation}`, { method: 'PATCH', body: { options } });
    }
    console.log(`• Flow "${NAME}" already exists → ${env.REBUILD_HOOK_URL}`);
    return;
  }

  const flow = await api('/flows', {
    method: 'POST',
    body: {
      name: NAME,
      icon: 'sync',
      status: 'active',
      trigger: 'event',
      accountability: 'all',
      options: {
        type: 'action',
        scope: ['items.create', 'items.update', 'items.delete'],
        collections: ['projects'],
      },
    },
  });

  const operation = await api('/operations', {
    method: 'POST',
    body: {
      flow: flow.id,
      name: 'Call the rebuild hook',
      key: 'rebuild_request',
      type: 'request',
      position_x: 19,
      position_y: 1,
      options,
    },
  });
  await api(`/flows/${flow.id}`, { method: 'PATCH', body: { operation: operation.id } });
  console.log(`✔ Flow "${NAME}" → ${env.REBUILD_HOOK_URL}`);
}

await login();
await ensureCollection();
await ensurePublicRead();
await seed();
await ensureRebuildFlow();

const published = await api('/items/projects?fields=slug,title,status,sort&sort=sort');
console.log(`\nPublished projects (${published.length}):`);
for (const p of published) console.log(`  ${p.sort}. ${p.title} [${p.status}] /projects/${p.slug}`);
