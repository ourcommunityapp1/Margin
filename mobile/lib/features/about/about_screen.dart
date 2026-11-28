// About Katekize (src/app/heir/about/page.tsx): what it is, the Scripture and catechism texts, and the credits for every
// photo the app uses (Creative Commons licences require them). Open to anyone, signed in or not.

import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../../data/photos.dart' as today;

class _Credit {
  const _Credit(this.title, this.who, this.license, this.page, [this.place]);
  final String title, who, license, page;
  final String? place;
}

const _wiki = 'https://commons.wikimedia.org/wiki/File:';

const photos = [
  _Credit('Dawn', 'Abrget47j', 'CC BY-SA 3.0', '${_wiki}Hommikune_udu_Kakerdaja_rabas.jpg'),
  _Credit('Day', 'Trougnouf (Benoit Brummer)', 'CC BY 4.0', '${_wiki}Stuor_D%C3%A1ht%C3%A1_lake_along_the_Kungsleden_trail_during_golden_hour_in_Kvikkjokk-Kabla_fj%C3%A4llurskog_(DSCF2557).jpg'),
  _Credit('Dusk', 'Thomas Bresson', 'CC BY 3.0', '${_wiki}Vallee-brouillard.jpg'),
  _Credit('Night', 'Giles Laurent', 'CC BY-SA 4.0', '${_wiki}036_Milky_Way_during_Perseids_seen_from_Oeschinensee_with_water_reflections_Photo_by_Giles_Laurent.jpg'),
];

// The sunrises and night skies in Today's "When you rise" and "When you lie down" circles (data/photos.dart). The Unsplash
// photographers' names are still to be added; those rows have no link yet.
final todayPhotos = [
  for (final p in [...today.dawnPhotos, ...today.duskPhotos]) _Credit(p.alt, p.who, p.license, p.page ?? ''),
];

// The stained-glass windows, cut into panes for each course (round crops, shared under the same licenses).
const windows = [
  _Credit('The Good Shepherd', 'Bjankuloski06', 'CC BY 4.0', '${_wiki}Good_Shepherd_staned-glass_window,_St_Barnabas,_Mt_Eden.jpg', 'St Barnabas Church, Mount Eden, Auckland'),
  _Credit('North rose', 'Zairon', 'CC BY-SA 4.0', '${_wiki}Chartres_Cath%C3%A9drale_Notre-Dame_de_Chartres_Innen_Nordrosette_1.jpg', 'Chartres Cathedral'),
  _Credit('Good Samaritan window', 'Public domain photo', 'Public domain', '${_wiki}Vitrail_Chartres-044_rectifi%C3%A9.JPG', 'Chartres Cathedral'),
  _Credit('Jesus and the Children', 'Nheyob', 'CC0', '${_wiki}Sacred_Heart_Church_(New_Philadelphia,_Ohio)_-_Jesus_and_the_Children,_stained-glass.jpg', 'Sacred Heart Church, New Philadelphia, Ohio'),
  _Credit('The Nativity', 'Nheyob', 'CC0', '${_wiki}Sacred_Heart_Church_(New_Philadelphia,_Ohio)_-_The_Nativity_of_the_Lord,_stained-glass.jpg', 'Sacred Heart Church, New Philadelphia, Ohio'),
  _Credit('The Good Shepherd with a lamb', 'Jules & Jenny', 'CC BY 2.0', '${_wiki}Stained_glass_window,_Christchurch_Blacklands,_Hastings_(15232949385).jpg', 'Christ Church, Blacklands, Hastings'),
  _Credit('Christ praying in Gethsemane', 'ΙΣΧΣΝΙΚΑ-888', 'CC BY-SA 4.0', '${_wiki}Christ_praying_in_the_garden_of_Gethsemane_-_Notre-Dame_Cathedral_Basilica,_Ottawa.JPG', 'Notre-Dame Cathedral Basilica, Ottawa'),
  _Credit('Moses and the burning bush', 'Rolf Kranz', 'CC BY-SA 4.0', '${_wiki}Spay,_Pfarrkirche,_Moses_und_der_brennende_Dornbusch.jpg', 'Parish church, Spay'),
  _Credit('Moses with the tablets', 'Public domain photo', 'Public domain', '${_wiki}Temple_De_Hirsch_Sinai_-_Moses_with_the_Tablets_(stained_glass)_01.jpg', 'Temple De Hirsch Sinai, Seattle'),
  _Credit('Jesus walks on the water', 'NateBergin', 'CC BY 4.0', '${_wiki}08_First_Presbyterian_OKC_(Jesus_Walks_on_Water)_Willet_Studios.png', 'First Presbyterian Church, Oklahoma City (Willet Studios)'),
  _Credit('“Consummatum est”', 'Public domain photo', 'Public domain', '${_wiki}Bytom_Bobrek_church_crucifixion_stained_glass.jpg', 'Church in Bobrek, Bytom (Mayer’sche Hofkunstanstalt)'),
  _Credit('The Lamb of God', 'Nheyob', 'CC BY-SA 3.0', '${_wiki}Saint_Aloysius_Catholic_Church_(Shandon,_Ohio)_-_interior,_stained_glass,_Lamb_of_God_%26_Seven_Seals_detail.jpg', 'Saint Aloysius Church, Shandon, Ohio'),
  _Credit('The empty tomb', 'NateBergin', 'CC BY 4.0', '${_wiki}Eug%C3%A8ne_Oudinot_Stained-Glass_Window,_the_Empty_Tomb,_Trinity_Church,_Boston.png', 'Trinity Church, Boston (Eugène Oudinot)'),
];

/// The two typefaces the app carries (the website loads the same two from Google Fonts).
const fonts = [
  _Credit('Inter', 'The Inter Project Authors', 'SIL Open Font License 1.1', 'https://github.com/rsms/inter'),
  _Credit('Source Serif 4', 'Adobe (Frank Grießhammer)', 'SIL Open Font License 1.1', 'https://github.com/adobe-fonts/source-serif'),
];

Future<void> _open(String url) async {
  try {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  } catch (_) {
    // No browser to open it: the link stays readable on screen.
  }
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    Widget body(String text) => Text(text, style: sans(16, color: k.ink, height: 1.5));
    return KPage(
      bare: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/today'))),
        ),
        KCard.column(
          gap: 12,
          children: [
            Semantics(header: true, child: Text('About Katekize', style: serif(30, weight: FontWeight.w500, color: k.ink))),
            body('Katekize helps a family memorize Scripture, catechisms and creeds using recall, spaced review and speaking aloud. Your progress is saved to your account, so it’s kept on every phone you sign in on.'),
            body('The Westminster Shorter and Larger Catechisms (1647), the Apostles’ Creed and the Nicene Creed are in the public domain.'),
          ],
        ),
        KCard.column(
          gap: 10,
          children: [
            Semantics(header: true, child: const KLabel('Scripture')),
            Text.rich(
              TextSpan(children: [
                const TextSpan(
                  text: 'Scripture quotations marked NASB are taken from the NEW AMERICAN STANDARD BIBLE® (NASB®), Copyright © 1960, 1971, 1977, '
                      '1995, 2020 by The Lockman Foundation. Used by permission. All rights reserved. ',
                ),
                WidgetSpan(
                  alignment: PlaceholderAlignment.baseline,
                  baseline: TextBaseline.alphabetic,
                  child: GestureDetector(
                    onTap: () => _open('https://www.lockman.org'),
                    child: Text('lockman.org', style: sans(15, color: k.ink, height: 1.5).copyWith(decoration: TextDecoration.underline)),
                  ),
                ),
              ]),
              style: sans(15, color: k.ink, height: 1.5),
            ),
            Text('NASB text is provided through the YouVersion Platform. Scripture marked KJV is from the King James Version, in the public domain.', style: sans(15, color: k.ink, height: 1.5)),
          ],
        ),
        _Section('Stained-glass windows, from Wikimedia Commons', windows),
        _Section('Background photos (softened), from Wikimedia Commons', photos),
        _Section('Sunrise and night photos on Today', todayPhotos),
        _Section('Typefaces', fonts),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title, this.credits);
  final String title;
  final List<_Credit> credits;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return KCard(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(padding: const EdgeInsets.only(top: 14, bottom: 4), child: Semantics(header: true, child: KLabel(title))),
          for (final (i, c) in credits.indexed)
            Semantics(
              link: true,
              child: InkWell(
                onTap: c.page.isEmpty ? null : () => _open(c.page),
                onLongPress: c.page.isEmpty ? null : () => Clipboard.setData(ClipboardData(text: c.page)),
                child: Container(
                  constraints: const BoxConstraints(minHeight: KSize.rowHeight),
                  decoration: BoxDecoration(border: i == 0 ? null : Border(top: BorderSide(color: k.line))),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text.rich(
                          TextSpan(children: [
                            TextSpan(text: c.title, style: sans(16, weight: FontWeight.w700, color: k.ink)),
                            TextSpan(text: ' · ${c.place == null ? '' : '${c.place} · '}${c.who}'),
                          ]),
                          style: sans(16, color: k.ink, height: 1.4),
                        ),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(width: 96, child: Text(c.license, textAlign: TextAlign.right, style: sans(14, color: k.muted, height: 1.3))),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
