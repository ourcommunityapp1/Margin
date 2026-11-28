// Believable mix-ups: for a word in the texts, words a person might say instead by mistake (a near
// synonym, the word from a similar line, the other half of a familiar pair). Used to make "spot the
// wrong word" and "what comes next" close calls instead of nonsense.

export const SWAPS: Record<string, string[]> = {
  // Shorter and Larger Catechism
  chief: ['main', 'first'], end: ['purpose', 'goal'], glorify: ['praise', 'serve'], enjoy: ['love', 'obey'],
  forever: ['always'], rule: ['guide', 'law'], direct: ['lead', 'teach'], contained: ['found', 'given'],
  principally: ['chiefly', 'mainly'], teach: ['show', 'tell'], believe: ['know', 'trust'], concerning: ['about'],
  duty: ['work', 'law'], requires: ['commands', 'asks'], infinite: ['eternal'], eternal: ['infinite', 'everlasting'],
  unchangeable: ['unchanging'], being: ['nature'], wisdom: ['knowledge'], power: ['might'],
  holiness: ['righteousness'], justice: ['judgment'], goodness: ['mercy'], truth: ['faithfulness'],
  living: ['eternal'], persons: ['beings'], godhead: ['trinity'], substance: ['essence'], equal: ['one'],
  glory: ['majesty'], decrees: ['purposes'], purpose: ['plan'], counsel: ['will'], foreordained: ['ordained', 'predestined'],
  whatsoever: ['everything'], executeth: ['performeth'], creation: ['making'], providence: ['care'],
  highest: ['greatest'], fully: ['truly'], nature: ['conscience'], declare: ['show'], plainly: ['clearly'],
  sufficiently: ['fully'], effectually: ['truly'], reveal: ['show'], manifest: ['prove'], majesty: ['beauty'],
  purity: ['holiness'], consent: ['harmony'], scope: ['aim'], convince: ['convict'], convert: ['turn'],
  comfort: ['strengthen'], persuade: ['convince'], witness: ['testimony'], incomprehensible: ['unsearchable'],
  merciful: ['kind'], gracious: ['loving'], abundant: ['rich'], distinguished: ['known'], properties: ['qualities'],
  proper: ['peculiar'], beget: ['love'], proceed: ['come'], scriptures: ['prophets'], testaments: ['covenants'],
  spirit: ['being'], ghost: ['spirit'], word: ['law'], salvation: ['good'],
  // Creeds
  almighty: ['eternal'], maker: ['creator'], heaven: ['heavens'], earth: ['world'], only: ['one'],
  conceived: ['born'], virgin: ['holy'], suffered: ['died'], crucified: ['killed'], buried: ['laid'],
  descended: ['went'], rose: ['arose'], ascended: ['went'], sitteth: ['sits'], right: ['left'], judge: ['save'],
  quick: ['living'], catholic: ['universal'], communion: ['fellowship'], forgiveness: ['remission'],
  resurrection: ['rising'], everlasting: ['eternal'], visible: ['seen'], invisible: ['unseen'],
  begotten: ['born'], worlds: ['ages'], light: ['life'], incarnate: ['born'], kingdom: ['reign'],
  giver: ['source'], proceeds: ['comes'], worshipped: ['honored'], prophets: ['apostles'], apostolic: ['holy'],
  acknowledge: ['confess'], remission: ['forgiveness'], look: ['wait'], father: ['lord'], lord: ['god'],
};
