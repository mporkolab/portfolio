/**
 * A szövegszerkesztő magyar eszköztára. Minden gomb tooltipet és akadálymentes
 * nevet kap (a billentyűparanccsal együtt), az aktív formázás `aria-pressed`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NodeSelection } from '@tiptap/pm/state';
import { useEditorState, type Editor } from '@tiptap/react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

function ToolButton({ label, onClick, active, disabled, children }: ButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // ne vegye el a fókuszt a szövegtől
      onClick={onClick}
      className={[
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition',
        active ? 'bg-accent/20 text-accent' : 'text-admin-text hover:bg-admin-raised',
        'disabled:cursor-not-allowed disabled:opacity-40',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const Divider = () => <span className="mx-1 h-6 w-px bg-admin-border" aria-hidden="true" />;

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = editor.getAttributes('link') as { href?: string; target?: string | null };
  const [href, setHref] = useState(current.href ?? '');
  const [newTab, setNewTab] = useState(current.target === '_blank');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const apply = () => {
    const value = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!value) {
      chain.unsetLink().run();
    } else {
      // Ha nincs protokoll és nem belső útvonal, https-t feltételezünk.
      const url = /^(https?:|mailto:|tel:|\/|#)/i.test(value) ? value : `https://${value}`;
      chain.setLink({ href: url, target: newTab ? '_blank' : null }).run();
    }
    onClose();
  };

  return (
    <div
      className="absolute top-full right-2 left-2 z-20 mt-1 space-y-3 rounded-lg border border-admin-border bg-admin-raised p-3 shadow-xl sm:right-auto sm:w-80"
      role="dialog"
      aria-label="Link szerkesztése"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          editor.commands.focus();
        }
      }}
    >
      <label className="admin-label" htmlFor="link-href">Cím (URL)</label>
      <input
        id="link-href"
        ref={inputRef}
        className="admin-input"
        value={href}
        placeholder="https://… vagy /hu/contact"
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
        }}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} className="accent-accent" />
        Megnyitás új lapon
      </label>
      <div className="flex justify-between gap-2">
        {current.href ? (
          <button
            type="button"
            className="admin-btn-danger"
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
              onClose();
            }}
          >
            Link eltávolítása
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>Mégse</button>
          <button type="button" className="admin-btn py-2 text-sm" onClick={apply}>Alkalmaz</button>
        </div>
      </div>
    </div>
  );
}


/**
 * A kijelölt kép beállításai: alternatív szöveg (kötelező), képaláírás,
 * méret, törlés. A kép kijelölve marad, amíg a mezőkbe írnak – a
 * `updateAttributes` mindig a kijelölt képre vonatkozik.
 */
function ImagePanel({ editor, attrs }: { editor: Editor; attrs: Record<string, unknown> }) {
  const set = (patch: Record<string, unknown>) => editor.chain().updateAttributes('image', patch).run();
  const uploading = !!attrs.uploadId;
  const alt = String(attrs.alt ?? '');
  return (
    <div className="space-y-3 border-b border-admin-border bg-admin-raised/60 px-3 py-3" aria-label="Kép beállításai">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider text-admin-muted uppercase">
          {uploading ? 'Kép feltöltése…' : 'Kijelölt kép'}
        </span>
        <div className="flex gap-1">
          {(['text', 'full'] as const).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={attrs.size === size}
              onClick={() => set({ size })}
              className={[
                'rounded-md px-2.5 py-1 text-xs transition',
                attrs.size === size ? 'bg-accent/20 text-accent' : 'text-admin-text hover:bg-admin-raised',
              ].join(' ')}
            >
              {size === 'text' ? 'Szövegszélesség' : 'Teljes szélesség'}
            </button>
          ))}
          <button
            type="button"
            className="rounded-md px-2.5 py-1 text-xs text-admin-danger hover:bg-admin-danger/10"
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            Kép törlése
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="img-alt" className="mb-1 block text-xs font-medium">
            Alternatív szöveg <span className="text-admin-danger">*</span>
          </label>
          <input
            id="img-alt"
            className={['admin-input py-1.5 text-sm', !alt.trim() ? 'border-amber-400/60' : ''].join(' ')}
            value={alt}
            maxLength={300}
            placeholder="Mi látható a képen? (pl. A főoldal mobilon)"
            onChange={(e) => set({ alt: e.target.value })}
            aria-describedby="img-alt-help"
          />
          <p id="img-alt-help" className="mt-1 text-xs text-admin-muted">
            Képernyőolvasóknak és a keresőknek. Közzétételhez kötelező.
          </p>
        </div>
        <div>
          <label htmlFor="img-caption" className="mb-1 block text-xs font-medium">Képaláírás (nem kötelező)</label>
          <input
            id="img-caption"
            className="admin-input py-1.5 text-sm"
            value={String(attrs.caption ?? '')}
            maxLength={300}
            placeholder="A kép alatt jelenik meg"
            onChange={(e) => set({ caption: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/** A táblázat műveletei, amíg a kurzor egy táblázatban áll. */
function TablePanel({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const actions: { label: string; run: () => void; danger?: boolean }[] = [
    { label: 'Sor fölé', run: () => c().addRowBefore().run() },
    { label: 'Sor alá', run: () => c().addRowAfter().run() },
    { label: 'Oszlop balra', run: () => c().addColumnBefore().run() },
    { label: 'Oszlop jobbra', run: () => c().addColumnAfter().run() },
    { label: 'Fejlécsor be/ki', run: () => c().toggleHeaderRow().run() },
    { label: 'Cellák egyesítése / szétválasztása', run: () => c().mergeOrSplit().run() },
    { label: 'Sor törlése', run: () => c().deleteRow().run(), danger: true },
    { label: 'Oszlop törlése', run: () => c().deleteColumn().run(), danger: true },
    { label: 'Táblázat törlése', run: () => c().deleteTable().run(), danger: true },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-admin-border bg-admin-raised/60 px-3 py-2" role="toolbar" aria-label="Táblázat">
      <span className="mr-2 text-xs font-semibold tracking-wider text-admin-muted uppercase">Táblázat</span>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={a.run}
          className={[
            'rounded-md px-2.5 py-1 text-xs transition',
            a.danger ? 'text-admin-danger hover:bg-admin-danger/10' : 'text-admin-text hover:bg-admin-raised',
          ].join(' ')}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function EditorToolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  const [linkOpen, setLinkOpen] = useState(false);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      align: (['center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? 'left',
      canIndent: e.can().indent(),
      canOutdent: e.can().outdent(),
      table: e.isActive('table'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      image:
        e.state.selection instanceof NodeSelection && e.state.selection.node.type.name === 'image'
          ? e.state.selection.node.attrs
          : null,
    }),
  });

  // Ctrl/Cmd+K: link párbeszéd.
  useEffect(() => {
    const dom = editor.view.dom;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLinkOpen(true);
      }
    };
    dom.addEventListener('keydown', onKey);
    return () => dom.removeEventListener('keydown', onKey);
  }, [editor]);

  const c = () => editor.chain().focus();
  const mod = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl';

  return (
    <div className="sticky top-0 z-10 rounded-t-xl bg-admin-panel/95 backdrop-blur">
    <div
      className="relative flex flex-wrap items-center gap-0.5 border-b border-admin-border px-2 py-1.5"
      role="toolbar"
      aria-label="Formázás"
    >
      <ToolButton label={`Félkövér (${mod}+B)`} active={s.bold} onClick={() => c().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton label={`Dőlt (${mod}+I)`} active={s.italic} onClick={() => c().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton label={`Aláhúzott (${mod}+U)`} active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolButton>
      <ToolButton label={`Áthúzott (${mod}+Shift+S)`} active={s.strike} onClick={() => c().toggleStrike().run()}>
        <span className="line-through">S</span>
      </ToolButton>
      <Divider />
      <ToolButton label="Címsor" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <span className="text-xs font-bold">H2</span>
      </ToolButton>
      <ToolButton label="Alcím" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <span className="text-xs font-bold">H3</span>
      </ToolButton>
      <Divider />
      <ToolButton label="Felsorolás" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
      </ToolButton>
      <ToolButton label="Számozott lista" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <Icon d="M10 6h10M10 12h10M10 18h10M4 4h1v4M4 8h2M4 14.5a1 1 0 0 1 2 0c0 1-2 1.5-2 3.5h2" />
      </ToolButton>
      <ToolButton label="Idézet" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Icon d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6" />
      </ToolButton>
      <Divider />
      <ToolButton label={`Balra igazítás (${mod}+Shift+L)`} active={s.align === 'left'} onClick={() => c().setTextAlign('left').run()}>
        <Icon d="M4 6h16M4 10h10M4 14h16M4 18h10" />
      </ToolButton>
      <ToolButton label={`Középre igazítás (${mod}+Shift+E)`} active={s.align === 'center'} onClick={() => c().setTextAlign('center').run()}>
        <Icon d="M4 6h16M7 10h10M4 14h16M7 18h10" />
      </ToolButton>
      <ToolButton label={`Jobbra igazítás (${mod}+Shift+R)`} active={s.align === 'right'} onClick={() => c().setTextAlign('right').run()}>
        <Icon d="M4 6h16M10 10h10M4 14h16M10 18h10" />
      </ToolButton>
      <ToolButton label={`Sorkizárt (${mod}+Shift+J)`} active={s.align === 'justify'} onClick={() => c().setTextAlign('justify').run()}>
        <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </ToolButton>
      <Divider />
      <ToolButton label={`Behúzás csökkentése (${mod}+[)`} disabled={!s.canOutdent} onClick={() => c().outdent().run()}>
        <Icon d="M4 6h16M11 10h9M11 14h9M4 18h16M7 9.5 4.5 12 7 14.5" />
      </ToolButton>
      <ToolButton label={`Behúzás növelése (${mod}+])`} disabled={!s.canIndent} onClick={() => c().indent().run()}>
        <Icon d="M4 6h16M11 10h9M11 14h9M4 18h16M4.5 9.5 7 12l-2.5 2.5" />
      </ToolButton>
      <Divider />
      <ToolButton label={`Link (${mod}+K)`} active={s.link || linkOpen} onClick={() => setLinkOpen((v) => !v)}>
        <Icon d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </ToolButton>
      <ToolButton label="Kép beszúrása (vagy húzza / illessze be a szövegbe)" onClick={onPickImage}>
        <Icon d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01" />
      </ToolButton>
      <ToolButton
        label="Táblázat beszúrása (3 × 3, fejlécsorral)"
        active={s.table}
        disabled={s.table}
        onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Icon d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14" />
      </ToolButton>
      <ToolButton label="Elválasztó vonal" onClick={() => c().setHorizontalRule().run()}>
        <Icon d="M4 12h16M8 7h8M8 17h8" />
      </ToolButton>
      <Divider />
      <ToolButton label="Formázás törlése" onClick={() => c().unsetAllMarks().clearNodes().unsetTextAlign().resetAttributes('paragraph', 'indent').run()}>
        <Icon d="M6 5h12M12 5l-3 14M15 15l5 5M20 15l-5 5" />
      </ToolButton>
      <Divider />
      <ToolButton label={`Visszavonás (${mod}+Z)`} disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Icon d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
      </ToolButton>
      <ToolButton label={`Újra (${mod}+Shift+Z)`} disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Icon d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />
      </ToolButton>
      {/* Az eszköztárhoz igazítva, nem a gombhoz: keskeny kijelzőn se lógjon ki. */}
      {linkOpen && <LinkPopover editor={editor} onClose={() => setLinkOpen(false)} />}
    </div>
    {s.image && <ImagePanel editor={editor} attrs={s.image} />}
    {s.table && !s.image && <TablePanel editor={editor} />}
    </div>
  );
}
