/**
 * Projekt-szerkesztő: bal oldalon a szöveg nyelvenként (angol / magyar fül:
 * cím, szerep, rövid leírás, esettanulmány, megjegyzés), jobb oldalon az
 * állandó sáv a nyelvtől független mezőkkel (URL, élő oldal, stack, kiemelés,
 * borítókép, dátum) és a műveletekkel.
 *
 * Mentés:
 * - piszkozatnál automatikusan, 5 mp tétlenség után (és Ctrl/Cmd+S-re);
 * - publikált projektnél NINCS automatikus mentés – a félkész módosítás ne
 *   kerüljön ki az oldalra –, a „Változások közzététele” gomb menti;
 * - új projekt az első mentéskor jön létre, utána az URL a szerkesztő
 *   oldalára vált (`/szerkesztes/:id`).
 * Ütközésfigyelés: a szerver 409-et ad, ha közben egy másik lapon is mentettél.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import EditorToolbar from './EditorToolbar';
import {
  ACCEPTED_IMAGE_TYPES,
  imageFilesFrom,
  insertImageFile,
  processPastedImages,
  uploadImage,
  type UploadCallbacks,
} from './imageUploads';
import { editorExtensions } from '../lib/editor/extensions';
import {
  LANGS,
  LANG_LABEL,
  STATUS_LABEL,
  publicPathPrefix,
  slugSource,
  slugify,
  type EditorCopy,
  type EditorImage,
  type EditorProject,
  type Lang,
  type SavePayload,
} from '../lib/editor/shared';

interface Props {
  initialProject: EditorProject;
  canPreview: boolean;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type CopyFields = Omit<EditorCopy, 'contentJson'>;

const AUTOSAVE_MS = 5000;

const timeFmt = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' });

/** ms → `date` mező értéke (a böngésző helyi idejében). */
function toLocalDate(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromLocalDate(value: string): number | null {
  if (!value) return null;
  const ms = new Date(`${value}T12:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

async function api<T>(url: string, init: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number; field?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: body.error ?? 'Ismeretlen hiba.', field: body.field };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: 'Nincs kapcsolat a CMS-sel (fut a VPN?). A módosításaid itt megmaradtak; próbáld újra.' };
  }
}

const copyFields = ({ contentJson: _drop, ...rest }: EditorCopy): CopyFields => rest;

/**
 * Egy nyelv esettanulmány-szerkesztője. Beillesztéskor és behúzáskor a képeket
 * feltölti; a beillesztett HTML külső képeit eltávolítja.
 */
function useStoryEditor(
  lang: Lang,
  initial: unknown,
  uploadCallbacks: UploadCallbacks,
  markDirty: () => void,
  onNotice: (message: string) => void,
) {
  const editorRef = useRef<Editor | null>(null);
  const pastedRef = useRef(false);
  return useEditor({
    extensions: [
      ...editorExtensions(),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Címsor' : lang === 'hu' ? 'A projekt története magyarul…' : 'The case study in English…',
      }),
    ],
    content: (initial as object | null) ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    editorProps: {
      handlePaste: (_view, event) => {
        const data = event.clipboardData;
        // Ha van HTML (Word, weboldal), azt illesztjük be – a Word a kijelölésről
        // képet is tesz a vágólapra, azt ilyenkor figyelmen kívül hagyjuk.
        if (data?.types.includes('text/html')) {
          pastedRef.current = true;
          return false;
        }
        const files = imageFilesFrom(data);
        if (!files.length || !editorRef.current) return false;
        files.forEach((f) => insertImageFile(editorRef.current!, f, uploadCallbacks));
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !editorRef.current) return false;
        const files = imageFilesFrom(event.dataTransfer);
        if (!files.length) {
          pastedRef.current = true; // behúzott HTML: ugyanúgy kezeljük, mint a beillesztést
          return false;
        }
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        files.forEach((f) => insertImageFile(editorRef.current!, f, uploadCallbacks, pos));
        return true;
      },
      attributes: {
        class: 'admin-prose prose prose-invert max-w-none min-h-[22rem] px-5 py-5 sm:px-8 focus:outline-none',
        'aria-label': lang === 'hu' ? 'Az esettanulmány magyarul' : 'Az esettanulmány angolul',
        lang,
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onUpdate: ({ editor: e }) => {
      markDirty();
      if (pastedRef.current) {
        pastedRef.current = false;
        // A beillesztett HTML képei: data: URI → feltöltés, külső URL → eltávolítás.
        const removed = processPastedImages(e, uploadCallbacks);
        if (removed) {
          onNotice(`${removed} kép külső oldalról származott, ezért nem került be. Mentsd le őket, és töltsd fel a Kép gombbal.`);
        }
      }
    },
  });
}

export default function ProjectEditor({ initialProject, canPreview }: Props) {
  // --- Mezők ---------------------------------------------------------------
  const [tab, setTab] = useState<Lang>('en');
  const [copies, setCopies] = useState<Record<Lang, CopyFields>>({
    en: copyFields(initialProject.copies.en),
    hu: copyFields(initialProject.copies.hu),
  });
  const [slug, setSlug] = useState(initialProject.slug);
  // A slug addig követi a címet, amíg kézzel nem írták át, és sosem volt publikálva.
  const [slugAuto, setSlugAuto] = useState(
    initialProject.id === null ||
      (initialProject.status === 'draft' &&
        (initialProject.slug === slugify(slugSource(initialProject.copies)) || initialProject.slug.startsWith('piszkozat-'))),
  );
  const [slugTaken, setSlugTaken] = useState(false);
  const [publishedAt, setPublishedAt] = useState<number | null>(initialProject.publishedAt);
  const [featured, setFeatured] = useState(initialProject.featured);
  const [liveUrl, setLiveUrl] = useState(initialProject.liveUrl);
  const [stack, setStack] = useState(initialProject.stack);
  const [coverImage, setCoverImage] = useState<EditorImage | null>(initialProject.coverImage);
  const [coverIsLogo, setCoverIsLogo] = useState(initialProject.coverIsLogo);
  const [coverUploading, setCoverUploading] = useState(false);

  // --- Szerverállapot --------------------------------------------------------
  const [id, setId] = useState<number | null>(initialProject.id);
  const [status, setStatus] = useState(initialProject.status);
  const updatedAtRef = useRef<number | null>(initialProject.updatedAt);
  const idRef = useRef(id);
  idRef.current = id;

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const uploadsRef = useRef(new Set<Promise<unknown>>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'publish' | 'unpublish' | 'delete'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Minden módosítás növeli; a mentés végén csak akkor „tiszta”, ha közben nem jött újabb.
  const versionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const savingRef = useRef<Promise<boolean> | null>(null);

  // Minden módosításkor változik, hogy az automatikus mentés időzítője újrainduljon
  // (gépelés közben ne mentsen, csak 5 mp tétlenség után).
  const [editTick, setEditTick] = useState(0);

  const markDirty = useCallback(() => {
    versionRef.current += 1;
    setSaveState('dirty');
    setEditTick((t) => t + 1);
  }, []);

  // A feltöltések követése: mentés előtt megvárjuk őket (különben a helyi
  // előnézet kerülne a mentésbe, amit a szerver kiszűrne).
  const uploadCallbacks: UploadCallbacks = useMemo(
    () => ({
      onStart: (p) => {
        uploadsRef.current.add(p);
        setUploadCount(uploadsRef.current.size);
        void p.finally(() => {
          uploadsRef.current.delete(p);
          setUploadCount(uploadsRef.current.size);
          markDirty();
        });
      },
      onError: (message) => setError(message),
    }),
    [markDirty],
  );

  const editors: Record<Lang, Editor | null> = {
    en: useStoryEditor('en', initialProject.copies.en.contentJson, uploadCallbacks, markDirty, setNotice),
    hu: useStoryEditor('hu', initialProject.copies.hu.contentJson, uploadCallbacks, markDirty, setNotice),
  };
  const editor = editors[tab];

  // --- Mentés ----------------------------------------------------------------
  const buildPayload = (): SavePayload => ({
    slug,
    slugAuto,
    publishedAt,
    featured,
    liveUrl,
    stack,
    coverImageId: coverImage?.id ?? null,
    coverIsLogo,
    copies: {
      en: { ...copies.en, contentJson: editors.en && !editors.en.isEmpty ? editors.en.getJSON() : null },
      hu: { ...copies.hu, contentJson: editors.hu && !editors.hu.isEmpty ? editors.hu.getJSON() : null },
    },
    expectedUpdatedAt: updatedAtRef.current,
  });

  const payloadRef = useRef(buildPayload);
  payloadRef.current = buildPayload;

  const applyServerProject = useCallback((p: EditorProject) => {
    updatedAtRef.current = p.updatedAt;
    setStatus(p.status);
    // Publikált projekt URL-je már nem követheti a címet: eltörné a rá mutató linkeket.
    if (p.status === 'published') setSlugAuto(false);
    setPublishedAt(p.publishedAt);
    setSlug((current) => (current === p.slug ? current : p.slug));
    if (idRef.current === null && p.id !== null) {
      setId(p.id);
      idRef.current = p.id;
      window.history.replaceState(null, '', `/szerkesztes/${p.id}`);
    }
  }, []);

  /** Mentés most. Igazat ad, ha sikerült (vagy nem volt mit menteni). */
  const save = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) {
      // Egy mentés már fut: megvárjuk, és ha közben változott valami, újra mentünk.
      await savingRef.current;
      if (versionRef.current === savedVersionRef.current) return true;
    }
    if (uploadsRef.current.size) {
      setSaveState('saving');
      await Promise.allSettled([...uploadsRef.current]);
    }
    const run = (async () => {
      const version = versionRef.current;
      setSaveState('saving');
      const payload = payloadRef.current();
      const currentId = idRef.current;
      const res = await api<{ project: EditorProject }>(currentId ? `/api/projects/${currentId}` : '/api/projects', {
        method: currentId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(res.error);
        setSaveState('error');
        if (res.field === 'slug') setSlugTaken(true);
        return false;
      }
      applyServerProject(res.data.project);
      savedVersionRef.current = version;
      setError(null);
      setSavedAt(Date.now());
      setSaveState(versionRef.current === version ? 'saved' : 'dirty');
      return true;
    })();
    savingRef.current = run;
    try {
      return await run;
    } finally {
      savingRef.current = null;
    }
  }, [applyServerProject]);

  const isDirty = saveState === 'dirty' || (saveState === 'error' && versionRef.current !== savedVersionRef.current);

  // Automatikus mentés – csak piszkozatnál.
  useEffect(() => {
    if (saveState !== 'dirty' || status !== 'draft' || uploadCount > 0) return;
    const t = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [saveState, status, save, editTick, uploadCount]);

  // Figyelmeztetés mentetlen változásnál az oldal elhagyásakor.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (versionRef.current !== savedVersionRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Ctrl/Cmd+S: mentés.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // --- Mezőkezelők -----------------------------------------------------------
  const update = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    markDirty();
  };

  const setCopy = (lang: Lang, field: keyof CopyFields, value: string) => {
    const next = { ...copies, [lang]: { ...copies[lang], [field]: value } };
    setCopies(next);
    if (field === 'title' && slugAuto && status === 'draft') setSlug(slugify(slugSource(next)));
    markDirty();
  };

  // Kézzel írt slug foglaltságának ellenőrzése, gépelés közben késleltetve.
  useEffect(() => {
    if (slugAuto || !slug) {
      setSlugTaken(false);
      return;
    }
    const t = window.setTimeout(async () => {
      const q = new URLSearchParams({ slug, ...(id ? { id: String(id) } : {}) });
      const res = await api<{ available: boolean }>(`/api/slug-check?${q}`);
      if (res.ok) setSlugTaken(!res.data.available);
    }, 400);
    return () => window.clearTimeout(t);
  }, [slug, slugAuto, id]);

  const onFilesChosen = (files: FileList | null) => {
    if (!files || !editor) return;
    Array.from(files).forEach((f) => insertImageFile(editor, f, uploadCallbacks));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCoverChosen = async (files: FileList | null) => {
    const file = files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!file) return;
    setCoverUploading(true);
    const p = uploadImage(file, file.name);
    uploadsRef.current.add(p);
    try {
      setCoverImage(await p);
      markDirty();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      uploadsRef.current.delete(p);
      setCoverUploading(false);
    }
  };

  // --- Műveletek -------------------------------------------------------------
  const publish = async () => {
    setBusy('publish');
    setProblems([]);
    try {
      if (!(await save())) return;
      const res = await api<{ project: EditorProject }>(`/api/projects/${idRef.current}/publish`, { method: 'POST' });
      if (!res.ok) {
        if (res.status === 422) setProblems(res.error.split(/(?<=\.)\s+/));
        else setError(res.error);
        return;
      }
      applyServerProject(res.data.project);
      setError(null);
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    if (!idRef.current) return;
    setBusy('unpublish');
    try {
      const res = await api<{ project: EditorProject }>(`/api/projects/${idRef.current}/unpublish`, { method: 'POST' });
      if (!res.ok) setError(res.error);
      else applyServerProject(res.data.project);
    } finally {
      setBusy(null);
    }
  };

  /**
   * Előnézet a valódi portfólión, aláírt linkkel. Piszkozatnál előtte mentünk;
   * publikált projektnél a közzétett változatot mutatja – a még nem közzétett
   * módosítások nem látszanak benne.
   */
  const openPreview = async (lang: Lang) => {
    // Az ablakot rögtön, a kattintásra nyitjuk meg (különben a böngésző
    // felugró ablaknak veheti), a címet a mentés után kapja meg.
    const win = window.open('about:blank', '_blank');
    if ((status === 'draft' || idRef.current === null) && !(await save())) {
      win?.close();
      return;
    }
    const res = await api<{ url: string }>(`/api/projects/${idRef.current}/preview?lang=${lang}`);
    if (!res.ok) {
      win?.close();
      setError(res.error);
      return;
    }
    if (win) win.location.href = res.data.url;
    else window.location.href = res.data.url;
  };

  const remove = async () => {
    if (!idRef.current) return;
    setBusy('delete');
    const res = await api(`/api/projects/${idRef.current}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(res.error);
      setBusy(null);
      return;
    }
    savedVersionRef.current = versionRef.current; // ne kérdezzen rá elhagyáskor
    window.location.href = '/';
  };

  // --- Megjelenítés ----------------------------------------------------------
  const started = (lang: Lang) => !!(copies[lang].title.trim() || copies[lang].blurb.trim() || (editors[lang] && !editors[lang]!.isEmpty));
  const c = copies[tab];
  const other: Lang = tab === 'en' ? 'hu' : 'en';

  const statusText = (() => {
    if (uploadCount > 0) return uploadCount === 1 ? 'Kép feltöltése…' : `${uploadCount} kép feltöltése…`;
    if (saveState === 'saving') return 'Mentés…';
    if (saveState === 'error') return 'Nem sikerült menteni';
    if (isDirty) return status === 'draft' ? 'Mentetlen módosítás' : 'Nem közzétett módosítás';
    if (savedAt) return `Mentve ${timeFmt.format(savedAt)}`;
    return id ? 'Minden mentve' : 'Még nincs mentve';
  })();

  const sideLabel = 'mb-2 block text-xs font-semibold tracking-wider text-admin-muted uppercase';

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Bal oldal: szöveg */}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <a href="/" className="text-admin-muted hover:text-accent">← Vissza a listához</a>
          <span
            className={[
              'rounded-full px-2.5 py-1 text-xs',
              saveState === 'error' ? 'bg-admin-danger/15 text-admin-danger' : isDirty ? 'bg-amber-400/10 text-amber-300' : 'text-admin-muted',
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            {statusText}
          </span>
        </div>

        {error && (
          <div className="admin-alert-error flex items-start justify-between gap-3" role="alert">
            <span>{error}</span>
            <button type="button" className="shrink-0 underline" onClick={() => setError(null)}>Bezárás</button>
          </div>
        )}
        {notice && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="status">
            <span>{notice}</span>
            <button type="button" className="shrink-0 underline" onClick={() => setNotice(null)}>Bezárás</button>
          </div>
        )}
        {problems.length > 0 && (
          <div className="admin-alert-error" role="alert">
            <p className="mb-1 font-semibold">A közzétételhez még hiányzik:</p>
            <ul className="list-disc pl-5">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-1 border-b border-admin-border" role="tablist" aria-label="Nyelv">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              onClick={() => setTab(l)}
              className={[
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition',
                tab === l ? 'border-accent text-accent' : 'border-transparent text-admin-muted hover:text-admin-text',
              ].join(' ')}
            >
              {LANG_LABEL[l]}
              <span
                className={['h-1.5 w-1.5 rounded-full', started(l) ? 'bg-accent' : 'bg-admin-border'].join(' ')}
                title={started(l) ? 'Megírva' : 'Még nincs megírva'}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {!started(tab) && started(other) && (
          <p className="text-sm text-admin-muted">
            {tab === 'hu' ? 'Magyar' : 'Angol'} változat nélkül a portfólió mindkét nyelven a {other === 'en' ? 'angol' : 'magyar'} szöveget mutatja.
          </p>
        )}

        <div>
          <label htmlFor="project-title" className="sr-only">Cím</label>
          <textarea
            id="project-title"
            rows={1}
            value={c.title}
            maxLength={300}
            lang={tab}
            placeholder={tab === 'hu' ? 'A projekt neve' : 'Project name'}
            onChange={(e) => setCopy(tab, 'title', e.target.value.replace(/\n/g, ' '))}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-admin-text uppercase placeholder:text-admin-muted/50 focus:ring-0 focus:outline-none sm:text-4xl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <div>
            <label htmlFor="project-role" className="admin-label">Szerep</label>
            <input
              id="project-role"
              className="admin-input"
              value={c.role}
              maxLength={120}
              lang={tab}
              placeholder={tab === 'hu' ? 'pl. Ügyfélprojekt' : 'e.g. Client project'}
              onChange={(e) => setCopy(tab, 'role', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="project-blurb" className="admin-label">Rövid leírás</label>
            <textarea
              id="project-blurb"
              rows={2}
              maxLength={500}
              value={c.blurb}
              lang={tab}
              onChange={(e) => setCopy(tab, 'blurb', e.target.value)}
              className="admin-input"
              aria-describedby="blurb-help"
            />
            <p id="blurb-help" className="mt-1.5 flex justify-between gap-4 text-xs text-admin-muted">
              <span>A kártyán, a főoldalon és a keresőkben jelenik meg. 1–2 mondat.</span>
              <span className={c.blurb.length > 160 ? 'text-amber-300' : ''}>{c.blurb.length}/160</span>
            </p>
          </div>
        </div>

        <div className="admin-card">
          {editor && <EditorToolbar key={tab} editor={editor} onPickImage={() => fileInputRef.current?.click()} />}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => onFilesChosen(e.target.files)}
          />
          {/* Mindkét szerkesztő él, csak az aktív látszik: így a visszavonás-előzmény fülváltáskor is megmarad. */}
          {LANGS.map((l) => (
            <div key={l} hidden={l !== tab}>
              <EditorContent editor={editors[l]} />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="project-note" className="admin-label">Megjegyzés (nem kötelező)</label>
          <input
            id="project-note"
            className="admin-input"
            value={c.note}
            maxLength={500}
            lang={tab}
            placeholder={tab === 'hu' ? 'pl. Pontossági adatok még nincsenek' : 'e.g. No accuracy figures yet'}
            onChange={(e) => setCopy(tab, 'note', e.target.value)}
            aria-describedby="note-help"
          />
          <p id="note-help" className="mt-1.5 text-xs text-admin-muted">
            Kis, szürke, nagybetűs sor az esettanulmány alatt – egy kitétel, amit a projekt magával visz.
          </p>
        </div>
      </div>

      {/* Jobb oldali sáv */}
      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start" aria-label="Beállítások">
        <div className="admin-card space-y-5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-admin-muted uppercase">Állapot</span>
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium',
                status === 'published' ? 'bg-accent/15 text-accent' : 'bg-admin-raised text-admin-muted',
              ].join(' ')}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>

          <div>
            <span className={sideLabel}>Borítókép</span>
            <input
              ref={coverInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void onCoverChosen(e.target.files)}
            />
            {coverImage ? (
              <div className="space-y-2">
                <img
                  src={coverImage.src}
                  srcSet={coverImage.srcset}
                  sizes="320px"
                  width={coverImage.width}
                  height={coverImage.height}
                  alt="A projekt borítóképe"
                  className={['aspect-[4/3] w-full rounded-lg', coverIsLogo ? 'bg-[#111318] object-contain p-4' : 'object-cover'].join(' ')}
                />
                <div className="flex gap-2">
                  <button type="button" className="admin-btn-ghost flex-1" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
                    {coverUploading ? 'Feltöltés…' : 'Csere'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn-danger flex-1"
                    onClick={() => {
                      setCoverImage(null);
                      markDirty();
                    }}
                  >
                    Eltávolítás
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-admin-border px-3 py-5 text-sm text-admin-muted transition hover:border-accent/60 hover:text-accent"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
              >
                {coverUploading ? 'Feltöltés…' : 'Kép feltöltése'}
                <span className="text-xs">JPEG, PNG, WebP, GIF vagy AVIF, max. 10 MB</span>
              </button>
            )}
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={coverIsLogo}
                onChange={(e) => update(setCoverIsLogo)(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                A kép logó
                <span className="block text-xs text-admin-muted">Egészben, a sötét kereten jelenik meg, nem kivágva.</span>
              </span>
            </label>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => update(setFeatured)(e.target.checked)} className="mt-0.5 accent-accent" />
            <span>
              Kiemelt ★
              <span className="block text-xs text-admin-muted">Elöl áll a falon; az első kiemelt a főoldal projektje.</span>
            </span>
          </label>

          <div>
            <label htmlFor="project-live" className={sideLabel}>Élő oldal</label>
            <input
              id="project-live"
              type="url"
              className="admin-input"
              value={liveUrl}
              maxLength={500}
              placeholder="https://…"
              onChange={(e) => update(setLiveUrl)(e.target.value)}
              aria-describedby="live-help"
            />
            <p id="live-help" className="mt-1.5 text-xs text-admin-muted">
              {liveUrl.trim() ? 'A projekt „Élő”, és a lap aljára link kerül.' : 'Üresen a projekt „Fejlesztés alatt”.'}
            </p>
          </div>

          <div>
            <label htmlFor="project-stack" className={sideLabel}>Stack</label>
            <input
              id="project-stack"
              className="admin-input"
              value={stack}
              maxLength={300}
              placeholder="Astro, Three.js, Tailwind"
              onChange={(e) => update(setStack)(e.target.value)}
              aria-describedby="stack-help"
            />
            <p id="stack-help" className="mt-1.5 text-xs text-admin-muted">Vesszővel elválasztva; mindkét nyelven ugyanaz.</p>
          </div>

          <div>
            <label htmlFor="project-slug" className={sideLabel}>URL</label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-admin-border focus-within:border-accent">
              <span className="flex items-center bg-admin-raised px-2 font-mono text-xs text-admin-muted">{publicPathPrefix('en')}</span>
              <input
                id="project-slug"
                className="min-w-0 flex-1 border-0 bg-admin-bg px-2 py-2 font-mono text-xs text-admin-text focus:ring-0 focus:outline-none"
                value={slug}
                maxLength={120}
                onChange={(e) => {
                  setSlugAuto(false);
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  markDirty();
                }}
                onBlur={() => {
                  const clean = slugify(slug);
                  if (clean !== slug) {
                    setSlug(clean);
                    markDirty();
                  }
                }}
                aria-describedby="slug-help"
              />
            </div>
            <p id="slug-help" className={['mt-1.5 text-xs', slugTaken ? 'text-admin-danger' : 'text-admin-muted'].join(' ')}>
              {slugTaken
                ? 'Ez az URL már foglalt. Válassz másikat.'
                : slugAuto
                  ? 'A címből készül (az angolból, ha van). Átírható.'
                  : status === 'published'
                    ? 'Figyelem: a publikált URL módosítása eltöri a rá mutató linkeket.'
                    : 'Kisbetű, szám és kötőjel.'}
            </p>
            {!slugAuto && status === 'draft' && (
              <button
                type="button"
                className="mt-1 text-xs text-admin-muted underline hover:text-accent"
                onClick={() => {
                  setSlugAuto(true);
                  setSlug(slugify(slugSource(copies)));
                  markDirty();
                }}
              >
                Visszaállítás a címből
              </button>
            )}
          </div>

          <div>
            <label htmlFor="project-date" className={sideLabel}>Dátum</label>
            <input
              id="project-date"
              type="date"
              className="admin-input"
              value={toLocalDate(publishedAt)}
              onChange={(e) => update(setPublishedAt)(fromLocalDate(e.target.value))}
              aria-describedby="date-help"
            />
            <p id="date-help" className="mt-1.5 text-xs text-admin-muted">
              {status === 'draft' && !publishedAt
                ? 'A sorrendhez: a frissebb előrébb áll. Üresen a közzététel napja lesz.'
                : 'A sorrendhez: a frissebb előrébb áll.'}
            </p>
          </div>
        </div>

        <div className="admin-card space-y-2 p-5">
          {status === 'draft' ? (
            <>
              <button type="button" className="admin-btn w-full" onClick={() => void publish()} disabled={busy !== null || saveState === 'saving'}>
                {busy === 'publish' ? 'Közzététel…' : 'Közzététel'}
              </button>
              <button type="button" className="admin-btn-ghost w-full" onClick={() => void save()} disabled={busy !== null || saveState === 'saving'}>
                Mentés piszkozatként
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="admin-btn w-full"
                onClick={() => void save()}
                disabled={busy !== null || saveState === 'saving' || !isDirty}
              >
                Változások közzététele
              </button>
              <button type="button" className="admin-btn-ghost w-full" onClick={() => void unpublish()} disabled={busy !== null}>
                {busy === 'unpublish' ? 'Visszavonás…' : 'Közzététel visszavonása'}
              </button>
            </>
          )}

          {canPreview && (
            <div className="grid grid-cols-2 gap-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className="admin-btn-ghost"
                  onClick={() => void openPreview(l)}
                  disabled={busy !== null || (id === null && !slugSource(copies))}
                  title={status === 'published' && isDirty ? 'A közzétett változatot mutatja; a módosításaid még nincsenek közzétéve.' : undefined}
                >
                  Előnézet {l.toUpperCase()} ↗
                </button>
              ))}
            </div>
          )}

          {id !== null && (
            <div className="border-t border-admin-border pt-3">
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-sm">Biztosan törlöd? Ez nem vonható vissza.</p>
                  <div className="flex gap-2">
                    <button type="button" className="admin-btn-danger flex-1" onClick={() => void remove()} disabled={busy !== null}>
                      {busy === 'delete' ? 'Törlés…' : 'Igen, törlöm'}
                    </button>
                    <button type="button" className="admin-btn-ghost flex-1" onClick={() => setConfirmDelete(false)}>Mégse</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="w-full text-sm text-admin-danger hover:underline" onClick={() => setConfirmDelete(true)}>
                  Törlés
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
