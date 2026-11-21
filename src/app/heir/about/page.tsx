import { Back } from '../ui/tabs';

const PHOTOS = [
  { when: 'Dawn', who: 'Abrget47j', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Hommikune_udu_Kakerdaja_rabas.jpg' },
  { when: 'Day', who: 'Trougnouf (Benoit Brummer)', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Stuor_D%C3%A1ht%C3%A1_lake_along_the_Kungsleden_trail_during_golden_hour_in_Kvikkjokk-Kabla_fj%C3%A4llurskog_(DSCF2557).jpg' },
  { when: 'Dusk', who: 'Thomas Bresson', license: 'CC BY 3.0', page: 'https://commons.wikimedia.org/wiki/File:Vallee-brouillard.jpg' },
  { when: 'Night', who: 'Giles Laurent', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:036_Milky_Way_during_Perseids_seen_from_Oeschinensee_with_water_reflections_Photo_by_Giles_Laurent.jpg' },
];

// The stained-glass windows, cut into panes for each course (round crops, shared under the same licenses).
const WINDOWS = [
  { name: 'The Good Shepherd', place: 'St Barnabas Church, Mount Eden, Auckland', who: 'Bjankuloski06', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Good_Shepherd_staned-glass_window,_St_Barnabas,_Mt_Eden.jpg' },
  { name: 'North rose', place: 'Chartres Cathedral', who: 'Zairon', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Chartres_Cath%C3%A9drale_Notre-Dame_de_Chartres_Innen_Nordrosette_1.jpg' },
  { name: 'Good Samaritan window', place: 'Chartres Cathedral', who: 'Public domain photo', license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-044_rectifi%C3%A9.JPG' },
  { name: 'Jesus and the Children', place: 'Sacred Heart Church, New Philadelphia, Ohio', who: 'Nheyob', license: 'CC0', page: 'https://commons.wikimedia.org/wiki/File:Sacred_Heart_Church_(New_Philadelphia,_Ohio)_-_Jesus_and_the_Children,_stained-glass.jpg' },
  { name: 'The Nativity', place: 'Sacred Heart Church, New Philadelphia, Ohio', who: 'Nheyob', license: 'CC0', page: 'https://commons.wikimedia.org/wiki/File:Sacred_Heart_Church_(New_Philadelphia,_Ohio)_-_The_Nativity_of_the_Lord,_stained-glass.jpg' },
];

// Close-up crops of these photos, shared under the same licenses.
const STONES = [
  { name: 'Amethyst', who: 'Jon Zander (Digon3)', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Amethyst_Quartz_Macro_1.JPG' },
  { name: 'Topaz', who: 'Didier Descouens', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Topaze_Br%C3%A9sil.jpg' },
  { name: 'Carnelian', who: 'Claire Pearcy', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Three_Carnelian_Gemstones.jpg' },
  { name: 'Emerald', who: 'Didier Descouens', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:(Muzo)_Emerald_crystal_in_its_matrix.jpg' },
  { name: 'Sapphire', who: 'W.carter', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Four_man-made_faceted_blue_sapphires_1.jpg' },
  { name: 'Diamond', who: 'Petragems', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Round_Brilliant_Cut_Diamond.jpg' },
];

export default function About() {
  return (
    <main className="hr-page bare">
      <div style={{ marginTop: 8 }}><Back href="/heir" /></div>
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500 }}>About Heir</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>Heir helps a family memorize Scripture, catechisms and creeds using recall, spaced review and speaking aloud. Progress is kept on this phone for now.</p>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>The Westminster Shorter and Larger Catechisms (1647), the Apostles’ Creed and the Nicene Creed are in the public domain.</p>
      </section>
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="hr-label" style={{ margin: 0 }}>Scripture</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
          Scripture quotations marked NASB are taken from the NEW AMERICAN STANDARD BIBLE® (NASB®), Copyright © 1960, 1971, 1977,
          1995, 2020 by The Lockman Foundation. Used by permission. All rights reserved.{' '}
          <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>lockman.org</a>
        </p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>NASB text is provided through the YouVersion Platform. Scripture marked KJV is from the King James Version, in the public domain.</p>
      </section>
      <section className="hr-card" style={{ padding: '6px 22px' }}>
        <h2 className="hr-label" style={{ margin: '14px 0 4px' }}>Stained-glass windows, from Wikimedia Commons</h2>
        {WINDOWS.map((w) => (
          <a key={w.page} className="hr-row" href={w.page} target="_blank" rel="noopener noreferrer">
            <span><b>{w.name}</b> · {w.place} · {w.who}</span><span style={{ color: 'var(--muted)', fontSize: 14 }}>{w.license}</span>
          </a>
        ))}
      </section>
      <section className="hr-card" style={{ padding: '6px 22px' }}>
        <h2 className="hr-label" style={{ margin: '14px 0 4px' }}>Background photos (softened), from Wikimedia Commons</h2>
        {PHOTOS.map((p) => (
          <a key={p.when} className="hr-row" href={p.page} target="_blank" rel="noopener noreferrer">
            <span><b>{p.when}</b> · {p.who}</span><span style={{ color: 'var(--muted)', fontSize: 14 }}>{p.license}</span>
          </a>
        ))}
      </section>
      <section className="hr-card" style={{ padding: '6px 22px' }}>
        <h2 className="hr-label" style={{ margin: '14px 0 4px' }}>Stone photos (close-up crops, same licenses), from Wikimedia Commons</h2>
        {STONES.map((p) => (
          <a key={p.name} className="hr-row" href={p.page} target="_blank" rel="noopener noreferrer">
            <span><b>{p.name}</b> · {p.who}</span><span style={{ color: 'var(--muted)', fontSize: 14 }}>{p.license}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
