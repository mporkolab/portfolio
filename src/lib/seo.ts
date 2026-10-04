/**
 * What search engines and answer engines read about the site: absolute
 * addresses, the language pairs, and the structured data (schema.org JSON-LD)
 * that says who the site is about. The words a visitor reads stay in
 * `i18n/ui.ts` and in the CMS; this module only shapes them for machines.
 */

import { links, languages, path, here, t, type Lang } from '../i18n/ui';
import { CONTACT_EMAIL } from './contact';
import { copyFor, type Project } from './cms';

/** The public origin plus base, e.g. https://martinporkolab.hu — no trailing slash. */
const SITE = new URL(import.meta.env.BASE_URL, import.meta.env.SITE).href.replace(/\/$/, '');

/**
 * A site path (as `path()` returns it, base included) → its public URL. Every
 * page is addressed without a trailing slash, the root excepted, so a search
 * engine sees one address per page rather than two.
 */
export function absolute(sitePath: string): string {
  const origin = new URL(import.meta.env.SITE).origin;
  const clean = sitePath.length > 1 ? sitePath.replace(/\/$/, '') : sitePath;
  return new URL(clean, origin).href;
}

/** The same page in each language, keyed by hreflang, from the current pathname. */
export function alternates(pathname: string): Record<Lang, string> {
  const page = here(pathname);
  return Object.fromEntries(languages.map((l) => [l, absolute(path(l, page))])) as Record<Lang, string>;
}

export const ogLocale: Record<Lang, string> = { en: 'en_US', hu: 'hu_HU' };

const PERSON_ID = `${SITE}/#person`;
const WEBSITE_ID = `${SITE}/#website`;

/** Only a real address: the fallback in contact.ts is a placeholder. */
const publicEmail = import.meta.env.PUBLIC_CONTACT_EMAIL ? CONTACT_EMAIL : undefined;

/** Who the whole site is about, as one entity every page points at. */
export function person(lang: Lang, image?: string) {
  const tr = t(lang);
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Porkoláb Martin',
    alternateName: 'Martin Porkoláb',
    givenName: 'Martin',
    familyName: 'Porkoláb',
    jobTitle: tr('meta.role'),
    description: tr('meta.home'),
    url: absolute(path(lang, '/')),
    ...(image && { image }),
    ...(publicEmail && { email: `mailto:${publicEmail}` }),
    address: { '@type': 'PostalAddress', addressLocality: 'Budapest', addressCountry: 'HU' },
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: 'Eötvös Loránd University, Faculty of Informatics',
      alternateName: 'ELTE IK',
      url: 'https://www.inf.elte.hu',
    },
    knowsLanguage: ['hu', 'en'],
    sameAs: [links.github, links.linkedin],
  };
}

export function website(lang: Lang) {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE}/`,
    name: 'Porkoláb Martin',
    alternateName: lang === 'hu' ? 'Porkoláb Martin portfólió' : 'Porkoláb Martin portfolio',
    inLanguage: languages,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
  };
}

export function webPage(opts: {
  url: string;
  title: string;
  description: string;
  lang: Lang;
  type?: string;
  image?: string;
}) {
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.title,
    description: opts.description,
    inLanguage: opts.lang,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    // A profile page is about one person, and says so.
    ...(opts.type === 'ProfilePage' && { mainEntity: { '@id': PERSON_ID } }),
    ...(opts.image && { primaryImageOfPage: opts.image }),
  };
}

/** The trail from the home page; the last crumb is the page itself. */
export function breadcrumbs(crumbs: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
}

/**
 * A case study: the project as a piece of work by the site's person, with the
 * live site it led to and the trail back to the wall.
 */
export function projectSchema(project: Project, lang: Lang, url: string, image?: string) {
  const tr = t(lang);
  const { title, blurb, role } = copyFor(project, lang);
  return [
    {
      '@type': 'CreativeWork',
      '@id': `${url}#project`,
      name: title,
      headline: title,
      description: blurb || undefined,
      url,
      inLanguage: lang,
      genre: role || undefined,
      keywords: project.stack?.split(' · ').join(', ') || undefined,
      creativeWorkStatus: project.status === 'live' ? 'Published' : 'In development',
      ...(image && { image }),
      ...(project.live_url && { sameAs: project.live_url }),
      author: { '@id': PERSON_ID },
      creator: { '@id': PERSON_ID },
      mainEntityOfPage: { '@id': `${url}#webpage` },
    },
    breadcrumbs([
      { name: tr('site.tag'), url: absolute(path(lang, '/')) },
      { name: tr('projects.title'), url: absolute(path(lang, '/projects')) },
      { name: title, url },
    ]),
  ];
}

/**
 * `<script type="application/ld+json">` is raw text to the HTML parser, so a
 * `</script>` inside a CMS-supplied string would end it early.
 */
export function jsonLd(graph: object[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
