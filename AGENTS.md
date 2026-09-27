## Content

The projects are content, not code: they live in a Directus CMS and the build
reads them over its REST API. `src/lib/cms.ts` is the whole of that seam — do
not add a project by editing a component or the i18n dictionary. `cms/README.md`
covers running the CMS, the three URLs it is reached by, and the rebuild hook.

Their copy is bilingual in the CMS (`*_en` / `*_hu` fields), which is why
`src/i18n/ui.ts` holds only the labels around a project and none of its text.

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
