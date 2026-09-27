export const languages = ['en', 'hu'] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = 'en';

export const links = {
  github: 'https://github.com/mporkolab',
  linkedin: 'https://www.linkedin.com/in/martin-porkolab/',
  edortech: 'https://edortech.hu',
} as const;

/** Prefix a root-relative path with the language segment. English lives at the root. */
export function path(lang: Lang, to: string): string {
  const clean = to === '/' ? '' : to;
  // BASE_URL is '/' by default, or '/<prefix>/' when the site is served from a
  // sub-path behind a reverse proxy.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const rest = clean.replace(/^\//, '');
  return lang === 'en' ? `${base}/${rest}` : `${base}/hu/${rest}`;
}

/**
 * The current page as `path()` wants it: no base prefix, no language segment.
 * Feeding a raw `Astro.url.pathname` back into `path()` would double the base.
 */
export function here(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const withoutBase = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return withoutBase.replace(/^\/hu(?=\/|$)/, '') || '/';
}

/** The same page in the other language. */
export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'hu' : 'en';
}

export const ui = {
  en: {
    'site.name': 'P. Martin',
    'site.tag': 'Portfolio',
    'nav.back': 'Back to terminal',
    'nav.backShort': 'Terminal',
    'nav.backProjects': 'All projects',
    'nav.project': 'Project',
    'wall.prev': 'Previous projects',
    'wall.next': 'More projects',

    'gate.profile': 'Profile',
    'gate.profile.sub': 'Who · Experience · Skills',
    'gate.projects': 'Projects',
    'gate.projects.sub': 'Case studies · Live work',
    'gate.contact': 'Contact',
    'gate.contact.sub': 'Get in touch',

    'board.current': 'Current work',
    'board.current.lede': 'The project on the stand right now.',
    'board.featured': 'Featured project',
    'board.status.live': 'Live',
    'board.status.dev': 'In development',
    'board.readCase': 'Read the case study',
    'board.visit': 'Visit the live site',

    'about.title': 'Profile',
    'about.eyebrow': 'Gate A1 · Who',
    'card.type': 'Staff access',
    'card.authority': 'Terminal authority',
    'card.holder': 'Holder',
    'card.roleLabel': 'Clearance',
    'card.photo': 'Porkoláb Martin, portrait',
    'card.issued': 'Issued',
    'card.issuedValue': 'Budapest',
    'card.stub': 'Return',
    'about.lede':
      'I am Porkoláb Martin, a student at the Faculty of Informatics of Eötvös Loránd University.',
    // Paragraphs are split on newlines where this is rendered.
    'about.body':
      'Computers drew me in from a very young age, so this is the field I imagined my future in. I earned my software developer and tester technician qualification back in secondary school.\n' +
      'I strive for perfection and for giving my very best.\n' +
      'I learn quickly and adapt fast to new environments and technologies.\n' +
      'In my free time I play video games, work on hobby projects, do sports, and try to enjoy life.',
    'about.langTitle': 'Languages',
    'about.langs': 'Hungarian · English',

    'projects.title': 'Projects',

    'contact.title': 'Contact',
    'form.name': 'Name',
    'form.email': 'Email',
    'form.message': 'Message',
    'form.send': 'Send message',
    'form.sending': 'Sending…',
    'form.sent': 'Thank you — your message is on its way.',
    'form.error': 'That did not go through. Please write to the address above instead.',
    'form.required': 'Required',

    'footer.gh': 'GitHub',
    'footer.li': 'LinkedIn',
  },
  hu: {
    'site.name': 'P. Martin',
    'site.tag': 'Portfólió',
    'nav.back': 'Vissza a terminálra',
    'nav.backShort': 'Terminál',
    'nav.backProjects': 'Összes projekt',
    'nav.project': 'Projekt',
    'wall.prev': 'Előző projektek',
    'wall.next': 'További projektek',

    'gate.profile': 'Rólam',
    'gate.profile.sub': 'Ki · Tapasztalat · Készségek',
    'gate.projects': 'Projektek',
    'gate.projects.sub': 'Esettanulmányok · Élő munkák',
    'gate.contact': 'Kapcsolat',
    'gate.contact.sub': 'Írj nekem',

    'board.current': 'Aktuális munka',
    'board.current.lede': 'A projekt, amin most dolgozom.',
    'board.featured': 'Kiemelt projekt',
    'board.status.live': 'Élő',
    'board.status.dev': 'Fejlesztés alatt',
    'board.readCase': 'Esettanulmány megnyitása',
    'board.visit': 'Élő oldal megnyitása',

    'about.title': 'Rólam',
    'about.eyebrow': 'A1 kapu · Ki vagyok',
    'card.type': 'Személyzeti belépő',
    'card.authority': 'Terminál üzemeltetés',
    'card.holder': 'Kártyabirtokos',
    'card.roleLabel': 'Jogosultság',
    'card.photo': 'Porkoláb Martin arcképe',
    'card.issued': 'Kiállítva',
    'card.issuedValue': 'Budapest',
    'card.stub': 'Vissza',
    'about.lede':
      'Porkoláb Martin vagyok, az Eötvös Loránd Tudományegyetem Informatikai Karának hallgatója.',
    'about.body':
      'Egészen kicsi korom óta beszippantott a számítógépek világa, ezért ebben a szakmában gondoltam el a jövőm. Már középiskolában megszereztem a szoftverfejlesztő- és tesztelő technikusi minősítésemet.\n' +
      'Próbálok a tökéletességre törekedni, a maximumot nyújtani.\n' +
      'Gyorsan tanulok és adaptálódok új környezetekhez, technológiákhoz.\n' +
      'A szabadidőmben videójátékokkal játszom, hobbiprojekteken dolgozom, sportolok és próbálom élvezni az életet.',
    'about.langTitle': 'Nyelvek',
    'about.langs': 'Magyar · Angol',

    'projects.title': 'Projektek',

    'contact.title': 'Kapcsolat',
    'form.name': 'Név',
    'form.email': 'Email-cím',
    'form.message': 'Üzenet',
    'form.send': 'Üzenet küldése',
    'form.sending': 'Küldés…',
    'form.sent': 'Köszönöm — az üzenet úton van.',
    'form.error': 'Az üzenet nem ment el. Kérlek, írj a fenti címre.',
    'form.required': 'Kötelező',

    'footer.gh': 'GitHub',
    'footer.li': 'LinkedIn',
  },
} as const;

export function t(lang: Lang) {
  return (key: keyof (typeof ui)['en']): string => ui[lang][key];
}
