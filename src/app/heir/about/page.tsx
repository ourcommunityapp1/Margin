import { Back } from '../ui/tabs';

const PHOTOS = [
  { when: 'Dawn', who: 'Abrget47j', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hommikune_udu_Kakerdaja_rabas.jpg' },
  { when: 'Day', who: 'Trougnouf (Benoit Brummer)', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Stuor_D%C3%A1ht%C3%A1_lake_along_the_Kungsleden_trail_during_golden_hour_in_Kvikkjokk-Kabla_fj%C3%A4llurskog_(DSCF2557).jpg' },
  { when: 'Dusk', who: 'Thomas Bresson', license: 'CC BY 3.0', page: 'https://commons.wikimedia.org/wiki/File:Vallee-brouillard.jpg' },
  { when: 'Night', who: 'Giles Laurent', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:036_Milky_Way_during_Perseids_seen_from_Oeschinensee_with_water_reflections_Photo_by_Giles_Laurent.jpg' },
];

export default function About() {
  return (
    <main className="hr-page bare">
      <div style={{ marginTop: 8 }}><Back href="/heir" /></div>
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500 }}>About Heir</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>Heir helps a family memorize Scripture, catechisms and creeds using recall, spaced review and speaking aloud. Progress is kept on this phone for now.</p>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>The Westminster Shorter Catechism (1647) and the Apostles’ Creed are in the public domain.</p>
      </section>
      <section className="hr-card" style={{ padding: '6px 22px' }}>
        <h2 className="hr-label" style={{ margin: '14px 0 4px' }}>Background photos (softened), from Wikimedia Commons</h2>
        {PHOTOS.map((p) => (
          <a key={p.when} className="hr-row" href={p.page} target="_blank" rel="noopener noreferrer">
            <span><b>{p.when}</b> · {p.who}</span><span style={{ color: 'var(--muted)', fontSize: 14 }}>{p.license}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
