// Who wrote what, in which edition, and how sure the attribution is. Every source the engine
// hands to Claude, and every voice it speaks in, is described from this registry.

export type Tradition = 'scripture' | 'reformed' | 'fathers' | 'medieval' | 'doubtful';

export interface Author {
  name: string;
  years?: string;
  tradition: Tradition;
  // How the host should describe the writer's tradition in one phrase.
  label: string;
  // genuine: the words are the writer's (in translation). doubtful: anonymous or misattributed.
  authorship: 'genuine' | 'doubtful' | 'compiled';
  note?: string;
}

export interface Work {
  title: string;
  edition: string;
  license: string;
  note?: string;
}

export const WORKS: Record<'bsb' | 'mhcc' | 'tdavid' | 'catena' | 'npnf', Work> = {
  bsb: {
    title: 'Berean Standard Bible',
    edition: 'BSB text as distributed in the eBible corpus. About 136 Old Testament verses are missing from this copy.',
    license: 'Public domain (dedicated April 30, 2023). Altered text should not carry the Berean name.',
  },
  mhcc: {
    title: 'Concise Commentary on the Whole Bible',
    edition: 'Abridgment of Henry’s Exposition, from CrossWire’s SWORD module MHCC. The abridger is not identified in this edition.',
    license: 'Public domain.',
    note: 'Henry finished his Exposition through Acts; other Nonconformist ministers completed Romans to Revelation from his notes after his death in 1714.',
  },
  tdavid: {
    title: 'The Treasury of David',
    edition: 'CrossWire SWORD module TDavid; Spurgeon’s own exposition only, without the collected quotations.',
    license: 'Public domain.',
  },
  catena: {
    title: 'Catena Aurea',
    edition: 'Oxford translation (1841–1845), edited by John Henry Newman from a 1775 Latin edition.',
    license: 'Public domain.',
    note: 'An anthology Aquinas compiled in 1262–1268: excerpts selected and abridged by him, Greek writers through medieval Latin. Its translators warned that many passages ascribed to Chrysostom are not in his works.',
  },
  npnf: {
    title: 'Nicene and Post-Nicene Fathers, First Series',
    edition: 'Schaff’s 19th-century translations (1886–1889), via the Historical Christian Faith commentaries database: Augustine’s Expositions on the Psalms, Tractates on John, Homilies on 1 John and Harmony of the Gospels, and Chrysostom’s homilies. The database’s other entries for these writers read as modern translations and are left out.',
    license: 'Public-domain translation. Check the online editions’ own terms before redistributing.',
  },
};

const father = (name: string, years: string, note?: string): Author =>
  ({ name, years, tradition: 'fathers', label: 'Church Father', authorship: 'genuine', note });
const medieval = (name: string, years: string, note?: string): Author =>
  ({ name, years, tradition: 'medieval', label: 'medieval commentator', authorship: 'genuine', note });
const doubtful = (name: string, note: string): Author =>
  ({ name, tradition: 'doubtful', label: 'writer of doubtful identity', authorship: 'doubtful', note });

export const AUTHORS: Record<string, Author> = {
  bsb: { name: 'Berean Standard Bible', tradition: 'scripture', label: 'Scripture', authorship: 'genuine' },
  henry: { name: 'Matthew Henry', years: '1662–1714', tradition: 'reformed', label: 'English Presbyterian (Puritan)', authorship: 'genuine' },
  spurgeon: { name: 'Charles Spurgeon', years: '1834–1892', tradition: 'reformed', label: 'Reformed Baptist', authorship: 'genuine' },
  augustine: father('Augustine', '354–430', 'Latin Father, bishop of Hippo'),
  chrysostom: father('John Chrysostom', 'c. 347–407', 'Greek Father, archbishop of Constantinople'),
  ambrose: father('Ambrose', 'c. 339–397'),
  jerome: father('Jerome', 'c. 347–420'),
  hilary: father('Hilary of Poitiers', 'c. 310–367'),
  gregory: father('Gregory the Great', 'c. 540–604'),
  origen: father('Origen', 'c. 185–253'),
  cyril: father('Cyril of Alexandria', 'c. 376–444'),
  basil: father('Basil the Great', 'c. 330–379'),
  gregory_naz: father('Gregory of Nazianzus', 'c. 329–390'),
  gregory_nyssa: father('Gregory of Nyssa', 'c. 335–395'),
  athanasius: father('Athanasius', 'c. 296–373'),
  cyprian: father('Cyprian', 'died 258'),
  eusebius: father('Eusebius', 'c. 260–339'),
  titus_bostra: father('Titus of Bostra', 'died c. 378'),
  didymus: father('Didymus the Blind', 'c. 313–398'),
  leo: father('Leo the Great', 'died 461'),
  maximus: father('Maximus', 'uncertain identity'),
  isidore: father('Isidore', 'uncertain identity'),
  severian: father('Severian of Gabala', 'died after 408'),
  chrysologus: father('Peter Chrysologus', 'c. 380–450', 'Latin Father, bishop of Ravenna; not John Chrysostom'),
  damascene: father('John of Damascus', 'c. 675–749'),
  bede: medieval('Bede', 'c. 673–735'),
  alcuin: medieval('Alcuin of York', 'c. 735–804'),
  rabanus: medieval('Rabanus Maurus', 'c. 780–856'),
  haymo: medieval('Haymo', '9th century'),
  remigius: medieval('Remigius', '9th century'),
  theophylact: medieval('Theophylact', 'c. 1050–1108', 'Byzantine archbishop of Ohrid'),
  gloss: { name: 'The Gloss', tradition: 'medieval', label: 'medieval annotated Bible (Glossa Ordinaria)', authorship: 'compiled', note: 'Not a Church Father. Some Catena lines marked "Gloss" are not found in it.' },
  greek_expositor: doubtful('A Greek expositor', 'An unnamed Greek commentator the Catena does not identify.'),
  dionysius: doubtful('Pseudo-Dionysius', 'Writings under the name of Dionysius the Areopagite, written around 500.'),
  pseudo_chrysostom: doubtful('Pseudo-Chrysostom', 'Mostly the Opus Imperfectum on Matthew, an anonymous work probably by an Arian author; in Mark, excerpts via Victor of Antioch.'),
  pseudo_jerome: doubtful('Pseudo-Jerome', 'A work falsely attributed to Jerome.'),
  pseudo_origen: doubtful('Pseudo-Origen', 'A work falsely attributed to Origen.'),
  pseudo_augustine: doubtful('Pseudo-Augustine', 'A work falsely attributed to Augustine.'),
};

export const authorOf = (key: string): Author =>
  AUTHORS[key] ?? { name: key, tradition: 'fathers', label: 'early commentator', authorship: 'genuine' };

// Writers whose own words the library holds in enough depth to voice them in character.
// Aquinas is deliberately absent: the Catena is other men's words.
export const PERSONAS = ['henry', 'spurgeon', 'augustine', 'chrysostom'] as const;
export type PersonaKey = (typeof PERSONAS)[number];
export type Speaker = 'host' | PersonaKey;

export const isPersona = (k: string): k is PersonaKey => (PERSONAS as readonly string[]).includes(k);

// Voices that are widely asked for but are not in the library. The host says so instead of
// summarizing them from memory.
export const ABSENT_VOICES: Record<string, string> = {
  calvin: 'John Calvin', wesley: 'John Wesley', clarke: 'Adam Clarke', barnes: 'Albert Barnes', gill: 'John Gill',
  luther: 'Martin Luther', aquinas: 'Thomas Aquinas (his own commentary)', haydock: 'the Haydock Bible notes',
  orthodox: 'an Orthodox commentator', pentecostal: 'a Pentecostal commentator', catechism: 'the Catholic Catechism',
};
