/**
 * A szövegszerkesztő engedélyezett elemei – a böngészőben futó szerkesztő és a
 * szerveroldali HTML-generálás UGYANEZT a listát használja, így ami a
 * szerkesztőben nem hozható létre, az a mentett HTML-be sem kerülhet be.
 *
 * Word-szerű bekezdésformázás van (igazítás, behúzás, táblázat, elválasztó
 * vonal), de szándékosan nincs betűszín, betűtípus, betűméret, kódblokk: minden
 * esettanulmány a portfólió dizájnjához illeszkedik. Wordből beillesztve a nem
 * engedélyezett formázás egyszerűen elvész, a szöveg megmarad.
 */
import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import { PostImage } from './image';
import { Indent } from './indent';

/**
 * Címsor csak H2 és H3 lehet. Beillesztéskor (Word, weboldal) a H1 H2-vé, a
 * H4–H6 H3-má alakul, hogy a dokumentum szerkezete ne vesszen el.
 */
const PostHeading = Heading.extend({
  parseHTML() {
    return [
      { tag: 'h1', attrs: { level: 2 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
      { tag: 'h4', attrs: { level: 3 } },
      { tag: 'h5', attrs: { level: 3 } },
      { tag: 'h6', attrs: { level: 3 } },
    ];
  },
}).configure({ levels: [2, 3] });

export function editorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      // A H1 az oldal címe; a saját címsor-kiterjesztés lent van.
      heading: false,
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      },
    }),
    PostHeading,
    PostImage,
    // Igazítás: `style="text-align: …"`, a Wordből beillesztett igazítást is megtartja.
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    Indent,
    // Oszlopszélesség-húzás nincs: a publikus oldalon a táblázat a szövegszélességhez igazodik.
    TableKit.configure({ table: { resizable: false } }),
  ];
}
