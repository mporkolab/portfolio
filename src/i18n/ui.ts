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

    // What a search result or a shared link says about each page.
    'meta.role': 'Computer science student',
    'meta.home':
      'Porkoláb Martin, a computer science student at the Faculty of Informatics of ELTE in Budapest. Websites designed and built end to end, from concept to deploy.',
    'meta.homeHeading': 'Porkoláb Martin — computer science student, portfolio',
    'meta.about':
      'Who Porkoláb Martin is: a student at the Faculty of Informatics of Eötvös Loránd University (ELTE) in Budapest, and a qualified software developer and tester.',
    'meta.projects':
      'Projects by Porkoláb Martin: client work and personal products, each designed and built end to end, with a case study for every one.',
    'meta.contact':
      'Get in touch with Porkoláb Martin about a job or a freelance web project. Send a message, or connect on GitHub and LinkedIn.',
    'nav.back': 'Back to terminal',
    'nav.backShort': 'Terminal',
    'nav.backProjects': 'All projects',
    'nav.project': 'Project',
    // The page shown when something breaks on the server, usually the CMS.
    'error.title': 'Out of service',
    'error.eyebrow': 'Temporary disruption',
    'error.body': 'This page cannot be shown right now. Please try again in a minute.',
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

    // Departures: the labels around the content. The content itself (bio
    // aside) is the CMS's.
    'header.home': 'Porkoláb Martin — home',
    'header.nav': 'Gates',
    'header.terminal': 'Terminal open',
    'lang.label': 'Language',
    'clock.label': 'Local time in Budapest',
    'footer.connecting': 'Connecting flights',
    'crumb.departures': 'Departures',

    'home.departures': 'Departures · BUD',
    'home.tagline':
      'Computer science student at ELTE, Budapest. I design and build websites end to end — from concept to deploy.',
    'home.board': 'Departure board — choose your gate',
    'home.boarding': 'Now boarding — featured project',
    'col.gate': 'Gate',
    'col.flight': 'Flight',
    'col.destination': 'Destination',
    'col.remarks': 'Remarks',
    'col.type': 'Type',
    'col.status': 'Status',
    'row.profile': 'PROFILE',
    'row.profile.remarks': 'WHO I AM',
    'row.profile.status': 'BOARDING',
    'row.projects': 'PROJECTS',
    'row.projects.remarks': '{n} CASE STUDIES',
    'row.projects.status': '{n} LIVE',
    'row.contact': 'CONTACT',
    'row.contact.remarks': 'JOB / FREELANCE',
    'row.contact.status': 'OPEN',
    'row.next': 'NEXT PROJECT',
    'row.next.type': 'Your project?',
    'row.next.status': 'SCHEDULED',
    'flap.live': 'LIVE',
    'flap.dev': 'IN DEV',

    'pass.title': 'Boarding pass',
    'pass.flight': 'Flight',
    'pass.gate': 'Gate',
    'pass.from': 'From',
    'pass.to': 'To',
    'pass.type': 'Type',
    'pass.stack': 'Stack',
    'pass.status': 'Status',
    'pass.site': 'Live site',
    'pass.route': 'Route: Budapest to {code}',

    'projects.crumb': 'Gate A2 · Departures hall',
    'projects.intro':
      'Client work and personal products, each designed and built end to end — with a case study for every one.',
    'projects.board': 'Scheduled departures',
    'projects.passes': 'Boarding passes',

    'case.crumb': 'Flight log',
    'leg.1': 'Check-in',
    'leg.2': 'Takeoff',
    'leg.3': 'Cruise',
    'leg.4': 'Landing',
    'leg.more': 'In flight',
    'next.gate': 'Next gate',
    'next.flight': 'Next flight',

    'about.crumb': 'Gate A1 · Passport control',
    'passport.title': 'Passport · Útlevél',
    'passport.type': 'Type P · HUN · No. PM-0001',
    'passport.surname': 'Surname',
    'passport.given': 'Given names',
    'passport.occupation': 'Occupation',
    'passport.base': 'Base',
    'passport.baseValue': 'ELTE IK · Budapest',
    'passport.qualification': 'Qualification',
    'passport.qualificationValue': 'Software developer & tester technician',
    'passport.authority': 'Authority',
    'passport.authorityValue': 'Terminal authority — staff access',
    'passport.status': 'Status',
    'passport.statusValue': 'Open to work & freelance',
    'passport.statement': 'Holder’s statement',
    'passport.offDuty': 'Off duty',
    'passport.visas': 'Visas & stamps',
    'stamp.1': 'ADMITTED\nELTE IK\nFaculty of Informatics',
    'stamp.2': 'CERTIFIED\nDev & Test\nTechnician',
    'stamp.3': 'FAST TRACK\nQuick learner\nAdapts fast',
    'stamp.4': 'APPROVED\n100%\nGives his very best',

    'contact.crumb': 'Gate A3 · Check-in desk open',
    'contact.intro':
      'Looking for a developer for a job or a freelance web project? Send a message at the desk, or find me on GitHub and LinkedIn.',
    'contact.routes': 'Other routes',
    'contact.localTime': 'Local time',
    'contact.zone': 'Budapest (CET)',
    'ticket.title': 'Check-in',
    'ticket.desk': 'Desk A3',
    'form.name.sub': 'Passenger',
    'form.email.sub': 'For the reply',
    'form.message.sub': 'Purpose of travel',
    'checked.flap': 'CHECKED IN',
    'checked.passenger': 'Passenger',
    'checked.destination': 'Destination',
    'checked.reply': 'Reply',
    'checked.replyValue': 'As soon as possible',
    'checked.again': 'Send another',
  },
  hu: {
    'site.name': 'P. Martin',
    'site.tag': 'Portfólió',

    'meta.role': 'Programtervező informatikus',
    'meta.home':
      'Porkoláb Martin budapesti programtervező informatikus hallgató az ELTE Informatikai Karán. Weboldalak az ötlettől a tervezésen át az élesítésig, egy kézben.',
    'meta.homeHeading': 'Porkoláb Martin — programtervező informatikus portfóliója',
    'meta.about':
      'Porkoláb Martin bemutatkozása: az ELTE Informatikai Karának hallgatója Budapesten, szoftverfejlesztő- és tesztelő technikus.',
    'meta.projects':
      'Porkoláb Martin projektjei: ügyfélmunkák és saját termékek, mindegyik az elejétől a végéig egy kézben, mindegyikhez esettanulmánnyal.',
    'meta.contact':
      'Írj Porkoláb Martinnak állásajánlattal vagy szabadúszó webes projekttel kapcsolatban — üzenetben, GitHubon vagy LinkedInen.',
    'nav.back': 'Vissza a terminálra',
    'nav.backShort': 'Terminál',
    'nav.backProjects': 'Összes projekt',
    'nav.project': 'Projekt',
    'error.title': 'Üzemszünet',
    'error.eyebrow': 'Átmeneti zavar',
    'error.body': 'Ez az oldal most nem jeleníthető meg. Kérlek, próbáld újra egy perc múlva.',
    'wall.prev': 'Előző projektek',
    'wall.next': 'További projektek',

    'gate.profile': 'Profil',
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

    'about.title': 'Profil',
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

    'header.home': 'Porkoláb Martin — főoldal',
    'header.nav': 'Kapuk',
    'header.terminal': 'Terminál nyitva',
    'lang.label': 'Nyelv',
    'clock.label': 'Budapesti helyi idő',
    'footer.connecting': 'Csatlakozások',
    'crumb.departures': 'Indulások',

    'home.departures': 'Indulások · BUD',
    'home.tagline':
      'Programtervező informatikus hallgató az ELTE-n. Weboldalakat tervezek és építek a koncepciótól az élesítésig.',
    'home.board': 'Indulási tábla — válaszd ki a kapudat',
    'home.boarding': 'Beszállás — kiemelt projekt',
    'col.gate': 'Kapu',
    'col.flight': 'Járat',
    'col.destination': 'Úti cél',
    'col.remarks': 'Megjegyzés',
    'col.type': 'Típus',
    'col.status': 'Állapot',
    'row.profile': 'PROFIL',
    'row.profile.remarks': 'KI VAGYOK',
    'row.profile.status': 'BESZÁLLÁS',
    'row.projects': 'PROJEKTEK',
    'row.projects.remarks': '{n} ESETTANULMÁNY',
    'row.projects.status': '{n} ÉLŐ',
    'row.contact': 'KAPCSOLAT',
    'row.contact.remarks': 'MUNKA / MEGBÍZÁS',
    'row.contact.status': 'NYITVA',
    'row.next': 'KÖVETKEZŐ',
    'row.next.type': 'A te projekted?',
    'row.next.status': 'TERVEZETT',
    'flap.live': 'ÉLŐ',
    'flap.dev': 'FEJLESZTÉS',

    'pass.title': 'Beszállókártya',
    'pass.flight': 'Járat',
    'pass.gate': 'Kapu',
    'pass.from': 'Honnan',
    'pass.to': 'Hová',
    'pass.type': 'Típus',
    'pass.stack': 'Stack',
    'pass.status': 'Állapot',
    'pass.site': 'Élő oldal',
    'pass.route': 'Útvonal: Budapest – {code}',

    'projects.crumb': 'A2 kapu · Indulási csarnok',
    'projects.intro':
      'Ügyfélmunkák és saját termékek, mindegyik az elejétől a végéig egy kézben — mindegyikhez esettanulmánnyal.',
    'projects.board': 'Menetrend szerinti indulások',
    'projects.passes': 'Beszállókártyák',

    'case.crumb': 'Repülési napló',
    'leg.1': 'Check-in',
    'leg.2': 'Felszállás',
    'leg.3': 'Utazómagasság',
    'leg.4': 'Leszállás',
    'leg.more': 'Repülés közben',
    'next.gate': 'Következő kapu',
    'next.flight': 'Következő járat',

    'about.crumb': 'A1 kapu · Útlevél-ellenőrzés',
    'passport.title': 'Útlevél · Passport',
    'passport.type': 'P típus · HUN · Sz. PM-0001',
    'passport.surname': 'Vezetéknév',
    'passport.given': 'Utónév',
    'passport.occupation': 'Foglalkozás',
    'passport.base': 'Bázis',
    'passport.baseValue': 'ELTE IK · Budapest',
    'passport.qualification': 'Képesítés',
    'passport.qualificationValue': 'Szoftverfejlesztő- és tesztelő technikus',
    'passport.authority': 'Kiállító hatóság',
    'passport.authorityValue': 'Terminál üzemeltetés — személyzeti belépő',
    'passport.status': 'Státusz',
    'passport.statusValue': 'Nyitott munkára és megbízásra',
    'passport.statement': 'A birtokos nyilatkozata',
    'passport.offDuty': 'Szolgálaton kívül',
    'passport.visas': 'Vízumok és pecsétek',
    'stamp.1': 'FELVÉVE\nELTE IK\nInformatikai Kar',
    'stamp.2': 'OKLEVÉL\nFejlesztő\nés tesztelő technikus',
    'stamp.3': 'GYORSSÁV\nGyors tanuló\nHamar alkalmazkodik',
    'stamp.4': 'JÓVÁHAGYVA\n100%\nMindig a legjobbat',

    'contact.crumb': 'A3 kapu · A check-in pult nyitva',
    'contact.intro':
      'Fejlesztőt keresel állásra vagy szabadúszó webes projektre? Írj a pultnál, vagy keress meg GitHubon és LinkedInen.',
    'contact.routes': 'Más útvonalak',
    'contact.localTime': 'Helyi idő',
    'contact.zone': 'Budapest (CET)',
    'ticket.title': 'Check-in',
    'ticket.desk': 'A3 pult',
    'form.name.sub': 'Utas',
    'form.email.sub': 'A válaszhoz',
    'form.message.sub': 'Az utazás célja',
    'checked.flap': 'BECSEKKOLVA',
    'checked.passenger': 'Utas',
    'checked.destination': 'Úti cél',
    'checked.reply': 'Válasz',
    'checked.replyValue': 'Amint lehet',
    'checked.again': 'Újabb üzenet',
  },
} as const;

export function t(lang: Lang) {
  return (key: keyof (typeof ui)['en']): string => ui[lang][key];
}
