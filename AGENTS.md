## Content

The projects are content, not code: they live in a Ghost CMS, one post per
project, and the server reads them over its Content API on each request
(`output: 'server'`; pages that show no project are prerendered).
`src/lib/cms.ts` is the whole of that seam, including which post field means
what — do not add a project by editing a component or the i18n dictionary.
`cms/README.md` covers running the CMS and the addresses it is reached by.

Their copy is bilingual in the CMS (a second post tagged `#hu`, slug `<slug>-hu`),
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
