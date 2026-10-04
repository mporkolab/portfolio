import type { APIRoute } from 'astro';
import { getProjects, copyFor } from '../lib/projects';
import { links, path, t } from '../i18n/ui';
import { CONTACT_EMAIL } from '../lib/contact';
import { absolute } from '../lib/seo';

/**
 * The site as an answer engine wants it (https://llmstxt.org): who this is,
 * in plain Markdown, and where each thing lives. The photographed rooms are
 * hard to read as a document; this is the same facts without the scenery.
 * Rendered on request, so the project list is the CMS's current one.
 */
export const GET: APIRoute = async () => {
  const en = t('en');
  const url = (page: string, lang: 'en' | 'hu' = 'en') => absolute(path(lang, page));

  let projects: string[] = [];
  try {
    projects = (await getProjects()).map((p) => {
      const { title, role, blurb } = copyFor(p, 'en');
      const facts = [
        role,
        p.status === 'live' ? 'live' : 'in development',
        p.stack && `stack: ${p.stack.split(' · ').join(', ')}`,
        p.live_url && `live site: ${p.live_url}`,
      ].filter(Boolean);
      return `- [${title}](${url(`/projects/${p.slug}`)}): ${blurb ? `${blurb} ` : ''}(${facts.join('; ')})`;
    });
  } catch (err) {
    console.warn(String(err));
  }

  const email = import.meta.env.PUBLIC_CONTACT_EMAIL ? `- Email: ${CONTACT_EMAIL}\n` : '';

  const body = `# Porkoláb Martin

> ${en('meta.home')}

Porkoláb Martin (Martin Porkoláb in English name order) is a computer science student (programtervező informatikus) at the Faculty of Informatics of Eötvös Loránd University (ELTE) in Budapest, Hungary, with a software developer and tester technician qualification earned in secondary school.

Each website is taken from idea to shipped product by one person: concept, visual design, front end and deploy. Languages: Hungarian, English. The whole site is bilingual; the Hungarian version is under ${url('/', 'hu')}.

## Pages

- [Home](${url('/')}): the portfolio's entrance, with the featured project
- [Profile](${url('/about')}): who Porkoláb Martin is, education and background
- [Projects](${url('/projects')}): every project, each with a case study
- [Contact](${url('/contact')}): a contact form for job offers and freelance work

## Projects

${projects.length ? projects.join('\n') : `- See ${url('/projects')}`}

## Contact

${email}- GitHub: ${links.github}
- LinkedIn: ${links.linkedin}
- Contact form: ${url('/contact')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
