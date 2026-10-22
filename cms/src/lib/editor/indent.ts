/**
 * Behúzás (bal margó) bekezdésekre és címsorokra, a Word „Behúzás növelése /
 * csökkentése” gombjaihoz hasonlóan. Szintenként 2em, legfeljebb MAX_INDENT
 * szint. A HTML-ben `data-indent="N"`, a térközt a CSS adja (a CMS-ben
 * cms.css, a portfólión global.css) – nincs inline stílus.
 *
 * Listában a gombok a listaelemet süllyesztik / emelik (alárendelt lista),
 * ahogy a Wordben is.
 */
import { Extension, type CommandProps } from '@tiptap/core';

export const MAX_INDENT = 4;
const TYPES = ['paragraph', 'heading'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /** Behúzás növelése (listában: alárendelt listaelem). */
      indent: () => ReturnType;
      /** Behúzás csökkentése (listában: listaelem kiemelése). */
      outdent: () => ReturnType;
    };
  }
}

/**
 * Wordből beillesztve a behúzás `margin-left: 36pt` alakban jön: nagyjából
 * 36pt (0,5 hüvelyk) = egy szint.
 */
function levelFromStyle(el: HTMLElement): number {
  const m = /^(-?[\d.]+)(pt|px|em|rem|cm|in)$/.exec(el.style.marginLeft.trim());
  if (!m) return 0;
  const pt = Number(m[1]) * ({ pt: 1, px: 0.75, em: 12, rem: 12, cm: 28.35, in: 72 } as const)[m[2] as 'pt'];
  return Math.round(pt / 36);
}

const clamp = (n: number) => Math.max(0, Math.min(MAX_INDENT, Number.isFinite(n) ? Math.round(n) : 0));

export const Indent = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => clamp(el.hasAttribute('data-indent') ? Number(el.getAttribute('data-indent')) : levelFromStyle(el)),
            renderHTML: (a) => (a.indent > 0 ? { 'data-indent': String(clamp(a.indent)) } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    const shift =
      (delta: number) =>
      ({ tr, state, dispatch }: CommandProps) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos, parent) => {
          // Listaelemen belüli bekezdés behúzását a lista szintje adja.
          if (parent?.type.name === 'listItem') return false;
          if (!TYPES.includes(node.type.name)) return true;
          const next = clamp((node.attrs.indent ?? 0) + delta);
          if (next !== node.attrs.indent) {
            // `can()` próbánál nincs dispatch: ilyenkor csak jelezzük, hogy lehetséges.
            if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
          return false;
        });
        return changed;
      };

    return {
      indent:
        () =>
        (props) =>
          props.editor.isActive('listItem') ? props.commands.sinkListItem('listItem') : shift(1)(props),
      outdent:
        () =>
        (props) =>
          props.editor.isActive('listItem') ? props.commands.liftListItem('listItem') : shift(-1)(props),
    };
  },

  addKeyboardShortcuts() {
    // A Google Docs-szal egyező parancsok; a Tab a listákban marad (list-keymap),
    // bekezdésben pedig a fókuszt viszi tovább, hogy billentyűzettel ki lehessen lépni.
    return {
      'Mod-]': () => this.editor.commands.indent(),
      'Mod-[': () => this.editor.commands.outdent(),
    };
  },
});
