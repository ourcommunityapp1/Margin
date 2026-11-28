// The photographs in Today's "When you rise" (sunrises) and "When you lie down" (night and dusk) circles, with their credits
// (a port of src/heir/photos.ts). Each is a 520 px square crop. A different one shows each day. Credits are on the About
// screen (a test fails if a photo is not credited).
//
// "Unsplash": from Unsplash, whose licence allows free use without credit; the photographers' names are still to be added.
// Wikimedia Commons photos are CC BY-SA 4.0: credit the photographer and share any change the same way.

class Photo {
  const Photo(this.file, this.alt, {this.who = _unsplashWho, this.license = _unsplashLicense, this.page});
  final String file, alt, who, license;
  final String? page;
}

const _unsplashWho = 'Photographer on Unsplash (name to be added)';
const _unsplashLicense = 'Unsplash License';

const dawnPhotos = [
  Photo('assets/photos/dawn/dawn-1.webp', 'Sunrise behind the spires of Edinburgh'),
  Photo('assets/photos/dawn/dawn-2.webp', 'Morning light on a green valley and its village church'),
  Photo('assets/photos/dawn/dawn-3.webp', 'The sun rising over dark hills'),
  Photo('assets/photos/dawn/dawn-4.webp', 'A sailboat on a still lake at pink dawn'),
  Photo('assets/photos/dawn/dawn-5.webp', 'A pink dawn over a lake and the Alps'),
  Photo(
    'assets/photos/dawn/dawn-6.webp',
    'Sunrise over the Ethiopian salt flats',
    who: 'Thomas Fuhrmann',
    license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Sunrise_at_Ethiopia%C2%B4s_salt_flats.jpg',
  ),
  Photo(
    'assets/photos/dawn/dawn-7.webp',
    'Mist over the Mekong at sunrise, Luang Prabang',
    who: 'Basile Morin',
    license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Mountains_clouds_Mekong_and_dwellings_from_Mount_Phou_Si_at_sunrise_in_Luang_Prabang_Laos.jpg',
  ),
];

const duskPhotos = [
  Photo('assets/photos/dusk/dusk-1.webp', 'The river at dusk in Inverness, with a church spire and a lit bridge'),
  Photo('assets/photos/dusk/dusk-2.webp', 'Dusk over layered hills'),
  Photo('assets/photos/dusk/dusk-3.webp', 'The Milky Way over a quiet road'),
  Photo('assets/photos/dusk/dusk-4.webp', 'Northern lights over a snowy fjord'),
  Photo(
    'assets/photos/dusk/dusk-5.webp',
    'Northern lights over Mývatn, Iceland',
    who: 'Giles Laurent',
    license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:039_Northern_lights_over_M%C3%BDvatn_(Iceland)_Photo_by_Giles_Laurent.jpg',
  ),
  Photo(
    'assets/photos/dusk/dusk-6.webp',
    'A purple aurora pillar over Brastad, Sweden',
    who: 'W.carter',
    license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Multicolored_aurora_borealis_pillar_over_Brastad.jpg',
  ),
];

/// The photo for a day: the same all day, a different one tomorrow. [day] is the local date ("2026-11-26"). Same hash as the
/// website (`h = (h * 31 + charCode) >>> 0`), so the phone and the website show the same photo.
Photo photoFor(List<Photo> list, String day, [int salt = 0]) {
  var h = salt;
  for (final c in day.codeUnits) {
    h = (h * 31 + c) & 0xFFFFFFFF;
  }
  return list[h % list.length];
}
