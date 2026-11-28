// The photographs in Today's "When you rise" (sunrises) and "When you lie down" (night and dusk) circles, with their credits.
// Each is a square crop (520 px) made from the photographer's original, so a round frame keeps the subject. A different one
// shows each day. Credits appear on the About page (a test fails if a photo is not credited).
//
// "Unsplash": from Unsplash, whose licence allows free use without credit; the photographers' names are still to be added.
// Wikimedia Commons photos are CC BY-SA 4.0: credit the photographer and share any change the same way.

export interface Photo { file: string; alt: string; who: string; license: string; page?: string }

const UNSPLASH = { who: 'Photographer on Unsplash (name to be added)', license: 'Unsplash License' };

export const DAWN: Photo[] = [
  { file: '/heir/dawn/dawn-1.webp', alt: 'Sunrise behind the spires of Edinburgh', ...UNSPLASH },
  { file: '/heir/dawn/dawn-2.webp', alt: 'Morning light on a green valley and its village church', ...UNSPLASH },
  { file: '/heir/dawn/dawn-3.webp', alt: 'The sun rising over dark hills', ...UNSPLASH },
  { file: '/heir/dawn/dawn-4.webp', alt: 'A sailboat on a still lake at pink dawn', ...UNSPLASH },
  { file: '/heir/dawn/dawn-5.webp', alt: 'A pink dawn over a lake and the Alps', ...UNSPLASH },
  { file: '/heir/dawn/dawn-6.webp', alt: 'Sunrise over the Ethiopian salt flats', who: 'Thomas Fuhrmann', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Sunrise_at_Ethiopia%C2%B4s_salt_flats.jpg' },
  { file: '/heir/dawn/dawn-7.webp', alt: 'Mist over the Mekong at sunrise, Luang Prabang', who: 'Basile Morin', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Mountains_clouds_Mekong_and_dwellings_from_Mount_Phou_Si_at_sunrise_in_Luang_Prabang_Laos.jpg' },
];

export const DUSK: Photo[] = [
  { file: '/heir/dusk/dusk-1.webp', alt: 'The river at dusk in Inverness, with a church spire and a lit bridge', ...UNSPLASH },
  { file: '/heir/dusk/dusk-2.webp', alt: 'Dusk over layered hills', ...UNSPLASH },
  { file: '/heir/dusk/dusk-3.webp', alt: 'The Milky Way over a quiet road', ...UNSPLASH },
  { file: '/heir/dusk/dusk-4.webp', alt: 'Northern lights over a snowy fjord', ...UNSPLASH },
  { file: '/heir/dusk/dusk-5.webp', alt: 'Northern lights over Mývatn, Iceland', who: 'Giles Laurent', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:039_Northern_lights_over_M%C3%BDvatn_(Iceland)_Photo_by_Giles_Laurent.jpg' },
  { file: '/heir/dusk/dusk-6.webp', alt: 'A purple aurora pillar over Brastad, Sweden', who: 'W.carter', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Multicolored_aurora_borealis_pillar_over_Brastad.jpg' },
];

/** The photo for a day: the same all day, a different one tomorrow. `day` is the local date ("2026-11-26"). */
export function photoFor(list: Photo[], day: string, salt = 0): Photo {
  let h = salt;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}
