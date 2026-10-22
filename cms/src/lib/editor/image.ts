/**
 * Kép a esettanulmány szövegében: `<figure>` + `<img srcset>` + opcionális
 * `<figcaption>`. A böngészőben futó szerkesztő és a szerveroldali
 * HTML-generálás is ezt használja.
 *
 * Attribútumok: a feltöltéskor kapott `src`, `srcset`, `width`, `height`,
 * `imageId`; a szerkesztőben megadott `alt` (kötelező közzététel előtt),
 * `caption` és `size` ('text' = szövegszélesség, 'full' = teljes szélesség).
 * Az `uploadId` csak feltöltés közben él (helykitöltő), mentésbe nem kerül.
 */
import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

const attrsFromImg = (img: HTMLImageElement) => ({
  src: img.getAttribute('src'),
  alt: img.getAttribute('alt') ?? '',
  srcset: img.getAttribute('srcset'),
  width: Number(img.getAttribute('width')) || null,
  height: Number(img.getAttribute('height')) || null,
  imageId: img.getAttribute('data-image-id'),
});

export const PostImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      srcset: { default: null },
      width: { default: null },
      height: { default: null },
      imageId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-image-id'),
        renderHTML: (a) => (a.imageId ? { 'data-image-id': a.imageId } : {}),
      },
      // A <figure> szintjén jelenik meg, lásd renderHTML.
      caption: { default: '', renderHTML: () => ({}) },
      size: { default: 'text', renderHTML: () => ({}) },
      uploadId: {
        default: null,
        renderHTML: (a) => (a.uploadId ? { 'data-uploading': 'true' } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector('img');
          if (!img) return false;
          return {
            ...attrsFromImg(img),
            caption: (el as HTMLElement).querySelector('figcaption')?.textContent?.trim() ?? '',
            size: (el as HTMLElement).classList.contains('post-image-full') ? 'full' : 'text',
          };
        },
      },
      { tag: 'img[src]', getAttrs: (el) => attrsFromImg(el as HTMLImageElement) },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const size = node.attrs.size === 'full' ? 'full' : 'text';
    const img = [
      'img',
      mergeAttributes(HTMLAttributes, {
        loading: 'lazy',
        decoding: 'async',
        sizes: size === 'full' ? '100vw' : '(min-width: 1024px) 768px, 100vw',
      }),
    ];
    const caption = typeof node.attrs.caption === 'string' ? node.attrs.caption.trim() : '';
    return caption
      ? ['figure', { class: `post-image post-image-${size}` }, img, ['figcaption', {}, caption]]
      : ['figure', { class: `post-image post-image-${size}` }, img];
  },
}).configure({ inline: false });
