/**
 * Képek feltöltése a szerkesztőből: eszköztár gomb, behúzás (drag & drop),
 * beillesztés vágólapról.
 *
 * Feltöltés közben a kép azonnal megjelenik a helyén (helyi előnézet,
 * `uploadId`-vel megjelölve), és a válasz után cserélődik a végleges,
 * szerveren tárolt változatra. Hiba esetén a helykitöltő eltűnik.
 *
 * Beillesztett HTML-ben (Word, weboldal) érkező képek:
 * - `data:` URI (a Word így adja át a beágyazott képeket) → feltöltjük;
 * - külső URL → eltávolítjuk, és szólunk (a portfólió csak saját
 *   tárhelyről tölthet képet, a szerver amúgy is kiszűrné).
 */
import type { Editor } from '@tiptap/core';
import type { EditorImage } from '../lib/editor/shared';

export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadImage(file: Blob, name = 'kep'): Promise<EditorImage> {
  if (file.size > MAX_BYTES) throw new Error('A kép legfeljebb 10 MB lehet.');
  const form = new FormData();
  form.append('file', file, name);
  let res: Response;
  try {
    res = await fetch('/api/images', { method: 'POST', body: form });
  } catch {
    throw new Error('Nincs kapcsolat a szerverrel – a képet nem sikerült feltölteni.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'A képet nem sikerült feltölteni.');
  return body.image as EditorImage;
}

const isImageFile = (f: File) => /^image\/(jpeg|png|webp|gif|avif)$/.test(f.type);

function findUploadPos(editor: Editor, uploadId: string): number | null {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.type.name === 'image' && node.attrs.uploadId === uploadId) found = pos;
    return true;
  });
  return found;
}

export interface UploadCallbacks {
  onStart: (promise: Promise<unknown>) => void;
  onError: (message: string) => void;
}

/** Egy fájl feltöltése és beszúrása (`pos`-ra, vagy a kurzor helyére). */
export function insertImageFile(editor: Editor, file: Blob, cb: UploadCallbacks, pos?: number, name?: string) {
  const uploadId = crypto.randomUUID();
  const preview = URL.createObjectURL(file);
  const content = { type: 'image', attrs: { src: preview, uploadId, alt: '' } };
  if (pos === undefined) editor.chain().focus().insertContent(content).run();
  else editor.chain().insertContentAt(pos, content).run();

  const p = uploadImage(file, name ?? (file instanceof File ? file.name : 'kep'))
    .then((img) => {
      const at = findUploadPos(editor, uploadId);
      if (at === null) return; // közben kitörölték
      const node = editor.state.doc.nodeAt(at)!;
      editor.view.dispatch(
        editor.state.tr
          .setNodeMarkup(at, undefined, {
            ...node.attrs,
            src: img.src,
            srcset: img.srcset,
            width: img.width,
            height: img.height,
            imageId: img.id,
            uploadId: null,
          })
          .setMeta('addToHistory', false),
      );
    })
    .catch((e: Error) => {
      const at = findUploadPos(editor, uploadId);
      if (at !== null) {
        const node = editor.state.doc.nodeAt(at)!;
        editor.view.dispatch(editor.state.tr.delete(at, at + node.nodeSize).setMeta('addToHistory', false));
      }
      cb.onError(e.message);
    })
    .finally(() => URL.revokeObjectURL(preview));

  cb.onStart(p);
}

/** Fájlok a vágólapról / behúzásból – csak képek. */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  return data ? Array.from(data.files).filter(isImageFile) : [];
}

/**
 * Beillesztés után: a `data:` URI-s képeket feltölti, a külső URL-eseket
 * eltávolítja. Visszaadja, hány külső képet kellett eltávolítani.
 */
export function processPastedImages(editor: Editor, cb: UploadCallbacks): number {
  const foreign: { pos: number; size: number }[] = [];
  const inline: { pos: number; src: string }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image' || node.attrs.uploadId || node.attrs.imageId) return true;
    const src = String(node.attrs.src ?? '');
    if (src.startsWith('/uploads/')) return true;
    if (src.startsWith('data:image/')) inline.push({ pos, src });
    else foreign.push({ pos, size: node.nodeSize });
    return true;
  });

  // `data:` képek: helykitöltővé alakítjuk, majd feltöltjük.
  for (const { pos, src } of inline) {
    const uploadId = crypto.randomUUID();
    const node = editor.state.doc.nodeAt(pos);
    if (!node) continue;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, uploadId }).setMeta('addToHistory', false));
    const p = fetch(src)
      .then((r) => r.blob())
      .then((blob) => uploadImage(blob, 'beillesztett-kep'))
      .then((img) => {
        const at = findUploadPos(editor, uploadId);
        if (at === null) return;
        const n = editor.state.doc.nodeAt(at)!;
        editor.view.dispatch(
          editor.state.tr
            .setNodeMarkup(at, undefined, { ...n.attrs, src: img.src, srcset: img.srcset, width: img.width, height: img.height, imageId: img.id, uploadId: null })
            .setMeta('addToHistory', false),
        );
      })
      .catch((e: Error) => {
        const at = findUploadPos(editor, uploadId);
        if (at !== null) {
          const n = editor.state.doc.nodeAt(at)!;
          editor.view.dispatch(editor.state.tr.delete(at, at + n.nodeSize).setMeta('addToHistory', false));
        }
        cb.onError(e.message);
      });
    cb.onStart(p);
  }

  // Külső képek törlése hátulról előre, hogy a pozíciók ne csússzanak el.
  if (foreign.length) {
    const tr = editor.state.tr;
    for (const { pos, size } of [...foreign].sort((a, b) => b.pos - a.pos)) tr.delete(pos, pos + size);
    editor.view.dispatch(tr.setMeta('addToHistory', false));
  }
  return foreign.length;
}
