## Content

The projects are content, not code: they live in the CMS in `cms/` (a small
Astro app of its own, VPN-only, no login), which writes an SQLite database and
an uploads folder; this server reads both read-only on each request
(`output: 'server'`; pages that show no project are prerendered).
`src/lib/cms.ts` is the whole of that seam, including which column means
what — do not add a project by editing a component or the i18n dictionary.
`cms/README.md` covers running the CMS and the addresses it is reached by.
The schema lives in `cms/src/lib/db/schema.ts`; a column renamed there has to
be renamed in `src/lib/cms.ts` too.

Their copy is bilingual in the CMS (one project, an English and a Hungarian
text; an empty title means that language is not written and the other shows),
which is why `src/i18n/ui.ts` holds only the labels around a project and none
of its text.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
