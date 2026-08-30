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
  return lang === 'en' ? `/${clean.replace(/^\//, '')}` : `/hu/${clean.replace(/^\//, '')}`;
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

    'p.edortech.title': 'edortech.hu',
    'p.edortech.role': 'Client project · designed and built solo',
    'p.edortech.blurb':
      'A bilingual site for Edortech, a European deep-tech company working on next-generation battery anode materials and cell-level testing. Concept, visual design, 3D, front end and deploy — all mine.',
    'p.edortech.stack': 'Astro · Three.js · Tailwind CSS',
    'p.edortech.visit': 'Visit the live site',

    'p.predictor.title': 'Football predictor',
    'p.predictor.role': 'Personal project · in development',
    'p.predictor.blurb':
      'A machine-learning project that predicts the events and outcomes of football matches. Still being built — nothing is deployed or publicly usable yet.',
    'p.predictor.note':
      'No accuracy figures are published while the model is still in development.',

    'about.title': 'Profile',
    'about.eyebrow': 'Gate A1 · Who',
    'card.type': 'Staff access',
    'card.authority': 'Terminal authority',
    'card.holder': 'Holder',
    'card.roleLabel': 'Clearance',
    'card.role': 'Builds end to end',
    'card.photo': 'No photo on file',
    'card.issued': 'Issued',
    'card.issuedValue': 'Budapest',
    'card.stub': 'Return',
    'about.storyTitle': 'End to end',
    'about.lede':
      'I am Porkoláb Martin. I design and build software end to end — from the first concept to the deployed site.',
    'about.body':
      'That means one person carrying a project the whole way: the idea, the interface, the front end, the back end, and the deploy. My most recent client project, edortech.hu, was delivered exactly that way.',
    'about.skillsTitle': 'Skills',
    'about.skills': 'Astro · TypeScript · Tailwind CSS · Three.js · Machine learning',
    'about.langTitle': 'Languages',
    'about.langs': 'Hungarian · English',

    'projects.title': 'Projects',

    'contact.title': 'Contact',
    'contact.direct': 'Or write directly',
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

    'p.edortech.title': 'edortech.hu',
    'p.edortech.role': 'Ügyfélprojekt · egyedül tervezve és fejlesztve',
    'p.edortech.blurb':
      'Kétnyelvű weboldal az Edortech számára, amely egy európai deep-tech cég: új generációs akkumulátor-anódanyagokkal és cellaszintű teszteléssel foglalkozik. Koncepció, vizuális terv, 3D, frontend és deploy — mind az enyém.',
    'p.edortech.stack': 'Astro · Three.js · Tailwind CSS',
    'p.edortech.visit': 'Élő oldal megnyitása',

    'p.predictor.title': 'Football predictor',
    'p.predictor.role': 'Saját projekt · fejlesztés alatt',
    'p.predictor.blurb':
      'Gépi tanulásra épülő projekt, amely futballmérkőzések eseményeit és kimenetelét jelzi előre. Még épül — nincs kiélesítve, és nyilvánosan sem használható.',
    'p.predictor.note':
      'Amíg a modell fejlesztés alatt áll, nem közlünk pontossági számokat.',

    'about.title': 'Rólam',
    'about.eyebrow': 'A1 kapu · Ki vagyok',
    'card.type': 'Személyzeti belépő',
    'card.authority': 'Terminál üzemeltetés',
    'card.holder': 'Kártyabirtokos',
    'card.roleLabel': 'Jogosultság',
    'card.role': 'Végponttól végpontig épít',
    'card.photo': 'Nincs fénykép',
    'card.issued': 'Kiállítva',
    'card.issuedValue': 'Budapest',
    'card.stub': 'Vissza',
    'about.storyTitle': 'Végponttól végpontig',
    'about.lede':
      'Porkoláb Martin vagyok. Szoftvereket tervezek és építek végponttól végpontig — az első koncepciótól az élesített oldalig.',
    'about.body':
      'Ez azt jelenti, hogy egy ember viszi végig a projektet: az ötletet, a felületet, a frontendet, a backendet és a deployt. A legutóbbi ügyfélprojektem, az edortech.hu, pontosan így készült.',
    'about.skillsTitle': 'Készségek',
    'about.skills': 'Astro · TypeScript · Tailwind CSS · Three.js · Gépi tanulás',
    'about.langTitle': 'Nyelvek',
    'about.langs': 'Magyar · Angol',

    'projects.title': 'Projektek',

    'contact.title': 'Kapcsolat',
    'contact.direct': 'Vagy írj közvetlenül',
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
