# Ground the Host, Label Every Voice

Across all five traditions, the most reputable sources agree on more than Margin might expect. Read a passage's plain sense in its literary and historical setting first. Read each part in light of the whole, and the obscure by the clear. Treat commentators and Fathers as witnesses to weigh, not as oracles. Keep application separate and secondary, and test any reading by love of God and neighbor. The traditions part ways mainly on who holds interpretive authority, on the canon, on the weight of spiritual senses and on doctrinal conclusions, and an app should attribute these differences rather than settle them. The AI evidence points the same way. Frontier models score **96–100% on a seminary Bible-knowledge exam**, yet the documented failures are elsewhere: verse wording that is blended or invented; patristic quotations that are invented or misattributed; "doctrinal flattening" that under-represents Orthodox and Pentecostal positions (a 2026 peer-reviewed study of 576 confessional claims); a slide into secular self-help advice; agreeing with whatever the user believes; and weak willingness to say "I don't know." The faith tools that have earned trust (Logos, Hallow) retrieve answers from closed libraries, cite them to the page and publish lists of what they will not do. The public failures happened at the synthesis step or behind a persona that borrowed clerical authority. Magisterium AI closed an open question despite its footnotes, and Catholic Answers' "Father Justin" was coaxed into giving users absolution. For Margin, checking quotes word for word is necessary but not enough. Every attributed claim needs checking, starting with Claude's own choice of passages. The library also needs its attributions fixed, because the Catena's "Chrysostom" is often an anonymous author who was probably Arian, and Matthew Henry's own work stops at Acts. Margin should do six things:

- Move to Anthropic's Citations API, with each verse and each commentary sentence as its own citable block.
- Add a second model call that checks each claim against its source.
- Say plainly when its library is silent.
- Tell listeners that its commentators are mostly Calvinist, and that its Church Fathers reach them through medieval and Victorian Western compilations and translations.
- Make the commentator persona safe before anything else ships.
- Measure all of this with paired questions on disputed doctrines, graded by readers from more than one tradition.

The scripture-study skill's backbone is sound and should stay. It needs about a dozen specific repairs, set out below. The researchers read only the confessional texts and Anthropic's documentation in full; everything else rests on search-engine excerpts. A dagger (†) marks claims that rest on a single excerpt, a second-hand summary or a vendor figure with no published method. The final section lists what to check before Margin repeats any of it to a listener.

## Five traditions share a plain-sense core, then split on authority

Evangelical seminary textbooks teach one method under different metaphors. Gordon Fee and Douglas Stuart's controlling maxim is that **"a text cannot mean what it could never have meant for its original readers/hearers"** ([Logos](https://www.logos.com/product/50318)). Duvall and Hays turn the same idea into a five-step "Interpretive Journey." Its central step crosses a "principlizing bridge" and tests each principle: is it in the text, timeless, not culture-bound, consistent with the rest of Scripture, and relevant to both the original and the modern audience? ([Ethnos360](https://e360bible.org/how-to-study-the-bible/the-interpretive-journey/)). Grant Osborne describes "a spiral from text to context," in which the text repeatedly corrects the reader's assumptions ([IVP Academic](https://ivpress.com/the-hermeneutical-spiral)). Kaiser and Silva defend "the primacy of authorial meaning" against theories that center the reader ([Themelios](https://themelios.thegospelcoalition.org/review/an-introduction-to-biblical-hermeneutics-the-search-for-meaning/)). The 1978 Chicago Statement puts the consensus in one sentence: Scripture "is to be interpreted by grammatico-historical exegesis, taking account of its literary forms and devices, and... Scripture is to interpret Scripture" ([Creeds.json](https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/chicago_statement_on_biblical_inerrancy.json)).

Under the metaphors sits a shared sequence:

1. Observe the passage closely.
2. Place it in its literary context, then its historical context.
3. Name its genre.
4. Establish what the author meant to the first audience.
5. Set it within the whole canon.
6. Draw the teaching together.
7. Derive a principle and apply it.

The books also share a distinction between **meaning, which is fixed, and significance, which varies with the reader**. An AI host should keep the two audibly separate.

The literature on interpretive errors supplies the guardrails. James Barr's 1961 critique named "illegitimate totality transfer": reading every sense a word has anywhere in the Bible into a single occurrence ([Poythress summary](https://byfaithweunderstand.com/2008/11/07/poythress-summarizes-james-barr/page/2/?et_blog)). D. A. Carson catalogued about fifty such errors ([9Marks](https://www.9marks.org/review/book-review-exegetical-fallacies-by-d-a-carson/)). Two of them:

- **The root fallacy:** treating a word's origin as its meaning.
- **Semantic anachronism:** "when a late use of a word is read back into earlier literature."

On application, the classic preaching textbooks converge:

- **One dominant idea per sermon.** Haddon Robinson's phrase is "a bullet, not a buckshot" ([SharperIron](https://sharperiron.org/node/35527)).
- **Confident principles, tentative applications.** John Stott, quoted via a reviewer†: "authoritative in expounding biblical principles, but tentative in applying them to the complex issues of the day" ([LibraryThing](https://www.librarything.com/work/1528833)).
- **Older Reformed standards say the same.** The Westminster Larger Catechism asks readers to attend to "the matter and scope" of Scripture (Q157), and asks hearers to "examine what they hear by the scriptures" (Q160) ([Creeds.json](https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/westminster_larger_catechism.json)).

The Wesleyan tradition fits the same frame once a popular myth is set aside. The "Wesleyan Quadrilateral" of Scripture, tradition, reason and experience is a modern label coined by Albert Outler. Outler later wrote that "the term 'quadrilateral' does not occur in the Wesley corpus—and more than once I have regretted having coined it for contemporary use since it has been so widely misconstrued," because readers took it to mean four equal authorities ([Campbell, *WTJ* 2006](https://wesley.nnu.edu/fileadmin/imported_site/wesleyjournal/2006-wtj-41-2.pdf)).

Wesley's own rule was to keep "a constant eye to the analogy of faith," meaning the connection among four doctrines: original sin, justification by faith, the new birth, and inward and outward holiness ([OT Notes preface](https://wesley.nnu.edu/john-wesley/john-wesleys-notes-on-the-bible/preface-to-the-old-testament-notes/)). This is a test about salvation. It differs in emphasis from Westminster's "analogy of Scripture," which compares passages with one another ([Pak, Oxford Institute 2018](https://oxford-institute.org/wp-content/uploads/2025/01/07_2018_pak.pdf)). Wesley's preface to his New Testament notes also states a design rule that suits audio well: notes kept **"as short as possible, that the comment may not obscure or swallow up the text"** ([NT Notes preface](https://wesley.nnu.edu/john-wesley/john-wesleys-notes-on-the-bible/preface-to-the-new-testament-notes/)).

Official Catholic teaching is not hostile to critical scholarship; it asks for historical study and theological reading together. Dei Verbum §12 tells interpreters to attend to "literary forms." It then adds three theological criteria: the content and unity of the whole of Scripture, "the living tradition of the whole Church," and the harmony among the truths of the faith ([Dei Verbum](https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_en.html)). The Catechism holds that **"all other senses of Sacred Scripture are based on the literal"** (§116) ([CCC](https://www.vatican.va/archive/ENG0015/__PQ.HTM)). Aquinas adds the rule an AI most needs. Argument may be drawn only from the literal sense, and "nothing necessary to faith is contained under the spiritual sense which is not elsewhere put forward by the Scripture in its literal sense" ([*Summa* I q.1 a.10](https://ccel.org/ccel/aquinas/summa.FP_Q1_A10.html)).

The Pontifical Biblical Commission's 1993 document calls the historical-critical method "indispensable." It says fundamentalism "actually invites people to a kind of intellectual suicide" ([PBC](https://catholic-resources.org/ChurchDocs/PBC_Interp-FullText.htm); [Goodreads quotation†](https://www.goodreads.com/quotes/12199317-the-fundamentalist-approach-is-dangerous-for-it-is-attractive-to)). Two qualifications follow:

- Lewis Ayres and Stephen Fowl dispute the priority the document gives that method ([*Theological Studies* 1999](https://theologicalstudies.net/wp-content/uploads/2022/08/60.3.6.pdf)).
- Benedict XVI's *Verbum Domini* warns that exegesis without faith becomes "positivistic and secularized" ([Verbum Domini](https://www.vatican.va/content/benedict-xvi/en/apost_exhortations/documents/hf_ben-xvi_exh_20100930_verbum-domini.html)).

For Margin's vocabulary, the lesson is that the Catholic "literal sense" includes genre and metaphor and is not "literalist." In Catholic terms, explaining a passage's historical setting is neither a Protestant move nor a liberal one.

Orthodox interpretation places Scripture inside the Church's living Tradition:

- Georges Florovsky treats Tradition as Scripture rightly understood, not as a second source. For him, following the Fathers means acquiring their "mind" (*phronema*), not trading quotations ([Florovsky](https://www.bulgarian-orthodox-church.org/rr/lode/florovsky1.pdf); [*IJOT* 2016](https://d-nb.info/1191205304/34)).
- Eugen Pentiuc shows that Orthodoxy receives the Old Testament as the Septuagint, the ancient Greek translation, and meets it in liturgy, hymns and icons ([OUP](https://global.oup.com/academic/product/the-old-testament-in-eastern-orthodox-tradition-9780195331233)).

This strand is the weakest-sourced in the research, resting mostly on publisher listings and review summaries. An Orthodox reader should review it before Margin relies on it.

The early church supplies the oldest shared tests:

- **Irenaeus** compared the Gnostics to someone who rearranges a mosaic portrait of a king into a dog or fox ([*Against Heresies* 1.8](https://www.newadvent.org/fathers/0103108.htm)). He told readers to restore each passage to its place in "the body of truth" ([1.9.4](https://www.earlychristianwritings.com/text/irenaeus-book1.html)).
- **Augustine** wrote that an interpreter whose reading does not "build up this twofold love of God and our neighbor" "does not yet understand them as he ought" ([*De Doctrina* 1.36.40](https://www.bluffton.edu/courses/humanities/1/xndoct.htm)).
- **Origen** matched body, soul and spirit to levels of meaning. He held that **some passages have no "bodily" (literal) sense at all** ([*De Principiis* 4.2.4](https://www.newadvent.org/fathers/04124.htm)). That is one reason not to claim, as the draft skill does, that every tradition has always put the plain sense first.

Modern patristics scholars also retire the textbook contrast of "Alexandrian allegory versus Antiochene literalism." Frances Young's account, as John O'Keefe's review summarizes it, holds that the distinction "reveals more about modern intellectual concerns than it does about the ancient exegetical situation" ([O'Keefe review](https://muse.jhu.edu/article/10045)).

The traditions diverge on four matters that an AI should report rather than resolve.

**Who interprets with authority.**
- Catholic teaching entrusts authentic interpretation "exclusively to the living teaching office of the Church," which "is not above the word of God, but serves it" ([Dei Verbum §10](https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_en.html)).
- Westminster makes Scripture its own "infallible rule of interpretation." It names the Spirit speaking in Scripture as the "Supreme Judge" over "opinions of ancient writers" ([WCF 1.9–1.10](https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/westminster_confession_of_faith.json)).
- The Second Helvetic Confession honors the Greek and Latin Fathers but will "modestly dissent from them" where they depart from Scripture ([Second Helvetic ch. 2](https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/second_helvetic_confession.json)).

**The canon.** Catholic Bibles have 73 books and Protestant Bibles 66; Orthodox lists are longer and vary between churches ([BibleProject](https://bibleproject.com/articles/why-deuterocanon-apocrypha-some-bibles-and-not-others/)).

**Spiritual senses.** Catholic teaching names four senses: the literal and three spiritual ones (allegorical, moral and anagogical, the last pointing to final things). Westminster insists that a text's sense "is not manifold, but one."

**Doctrine.** Conclusions on Mary, Peter, the sacraments and justification remain divided.

Within Protestantism, five more questions are live:

- How far to find Christ in Old Testament texts. Sidney Greidanus allows seven named routes, but only after the original sense is settled ([TGC, Wax](https://www.thegospelcoalition.org/blogs/trevin-wax/7-ways-of-preaching-christ-from-the-old-testament/)).
- Whether "principlizing" is the right bridge to application.
- The status of allegory and of any "fuller sense" beyond what the human author intended.
- The authority of creeds.
- Calvinist versus Arminian readings.

Ecumenical scholarship offers a model for handling such questions honestly. Joint Lutheran–Catholic exegesis produced *Peter in the New Testament* (1973) and *Mary in the New Testament* (1978) ([Encyclopedia.com](https://www.encyclopedia.com/religion/encyclopedias-almanacs-transcripts-and-maps/brown-raymond-edward); [*AUSS* review](https://digitalcommons.andrews.edu/cgi/viewcontent.cgi?article=1473&context=auss)). Lutherans and Catholics signed the Joint Declaration on the Doctrine of Justification in 1999, and Methodist (2006), Anglican (2016) and Reformed (2017) bodies later associated themselves with it. The Declaration states **agreement as a "differentiated consensus"**: basic truths affirmed together, remaining differences named ([LWF](https://lutheranworld.org/what-we-do/unity-church/joint-declaration-doctrine-justification-jddj)).

No source proposes a cross-tradition baseline for AI tools. The table below is an inference assembled from documents that agree with one another, and readers from each tradition should review it.

| Principle | Where it is affirmed | Status for Margin |
|---|---|---|
| The plain or literal sense, read by genre and history, is the anchor | Fee & Stuart; Chicago Statements; CCC 116; Aquinas; Wesley | Shared default. Origen is the notable patristic exception |
| Read the parts by the whole, the obscure by the clear | WCF 1.9; Dei Verbum 12; CCC 112; Augustine; Irenaeus; Wesley | Shared default |
| Love of God and neighbor tests every reading | Augustine; Scots Confession 18 ("rule of charity"); Second Helvetic ("rule of faith and love") | Shared default |
| Scripture is a unity centered on Christ | CCC 112; Irenaeus; Henry; Greidanus | Shared in principle; how often and by what route is contested |
| Commentators are witnesses, tested by Scripture | Second Helvetic; WCF 1.10 | Protestant rule; Catholics and Orthodox give Tradition more weight, so attribute it |
| Who interprets with authority | Teaching office (DV 10); Tradition and the Fathers (Florovsky); Scripture by Scripture (WCF 1.9) | Divergent. Never adopt one as Margin's own rule |
| Canon and the Septuagint | 73, 66 or longer, varying lists | Divergent. State a book's status in each tradition |
| Spiritual senses | Four senses (CCC 115–118) vs. "not manifold, but one" (WCF 1.9) | Divergent in weight. Name which sense is in play |

## Margin's library hides misattributed Fathers and a Calvinist tilt

The traditions' own guidance says to treat commentators as dated witnesses. Applied to Margin's library, that guidance exposes concrete attribution problems.

### Matthew Henry and Spurgeon

Matthew Henry stated his aim plainly: to add remarks "for doctrine, reproof, and instruction," "aiming in all to promote practical godliness, and carefully avoiding matters of doubtful disputation." He framed exposition as two questions in order, **"What is this?" and then "What is this to us?"** ([Christian Study Library](https://www.christianstudylibrary.org/article/matthew-henry-aim-exposition)). That is a ready-made template for the host.

But Henry died in 1714 with his *Exposition* finished only through Acts. **Nonconformist ministers prepared Romans through Revelation from his manuscripts after his death** ([Wikipedia](https://en.wikipedia.org/wiki/Matthew_Henry); [Puritanboard](https://puritanboard.com/threads/matthew-henry.9601/)). Two consequences follow:

- For the epistles and Revelation, "Henry writes" overstates the case. The host should say "the commentary that bears Henry's name."
- The research did not establish who made the *Concise* abridgment Margin uses, or from which edition. That needs checking before Margin attributes its exact wording to Henry himself.

Spurgeon's *Commenting and Commentaries* ranks Henry first for general usefulness: "most pious and pithy, sound and sensible, suggestive and sober, terse and trustworthy" ([CCEL](https://ccel.org/ccel/spurgeon/comment/comment.iv.html)). Spurgeon also told readers to use the Methodist commentator Adam Clarke with discretion because he was Arminian (paraphrased in the source†) ([Bible Outlines](https://www.bibleoutlines.com/spurgeons-view-on-the-use-of-commentaries/)). That is a reminder that Margin's two Protestant voices sit on one side of the Calvinist–Arminian divide.

Both men wrote before Barr's 1961 critique of word studies, so any "the Hebrew literally means…" from them should be reported as their claim, not as settled lexicography. The research did not examine how the *Treasury of David* is built. If, as is often said of it, it mixes Spurgeon's own exposition with excerpts from other writers, every chunk needs its true author tagged before the host says "Spurgeon writes."

### Coverage tilts the library toward one tradition

The *Treasury* covers the Psalms and the Catena covers the Gospels. For most other books, Henry is likely Margin's only commentator; the team should confirm coverage book by book. Most answers will therefore hear a single English Presbyterian voice. Where Henry and Spurgeon agree, they are two Calvinists agreeing, not a Christian consensus.

The library has no Wesleyan voice and no Orthodox voice of its own, and its only Catholic voice is Aquinas's compilation of earlier writers. Wesley's 1755 *Explanatory Notes upon the New Testament* would be the natural addition for Wesleyan balance ([Wesley Center Online](https://wesley.nnu.edu/john-wesley/john-wesleys-notes-on-the-bible/preface-to-the-new-testament-notes/)). The public-domain status of whichever digitized edition is used still needs checking.

### The Catena's "Chrysostom" is often someone else

The Catena Aurea is the most layered source. Aquinas compiled it in 1262–1268 at Pope Urban IV's commission, stringing together abridged excerpts on the four Gospels ([Wikipedia](https://en.wikipedia.org/wiki/Catena_%28biblical_commentary%29)). Its sources go beyond the Fathers:

- **Medieval Byzantine commentators** such as Victor of Antioch, Nicetas of Heraclea and Theophylact ([academia.edu](https://www.academia.edu/109360782/The_Doctor_Communis_of_the_Sacred_Page_Aquinass_Catena_aurea_and_the_preservation_of_Greek_patristic_and_Byzantine_exegetical_tradition)).
- **The *Glossa Ordinaria***, a standard medieval annotated Bible ([isidore.co](https://isidore.co/aquinas/english/CAMatthew.htm)).
- **The *Opus Imperfectum in Matthaeum***, cited as "Chrysostom." This work is "largely employed" in the Matthew portion. Erasmus refuted its attribution in 1530, and its author was probably an Arian ([Wace, *Dictionary of Christian Biography*](https://www.ccel.org/ccel/wace/biodict.html?term=Pseudo-Chrysostomus)).

The Victorian translators warned readers themselves. They wrote that **"many of the passages ascribed to S. Chrysostom are not found in the works of that Father."** They added that the names of authors "are often in doubt," and that Aquinas "has in several instances quite missed the sense of the Greek" ([translators' preface](https://www.ecatholic2000.com/catena/untitled-04.shtml)). The English Margin holds is the Oxford translation of 1841–45, edited by John Henry Newman from a 1775 Venetian Latin edition ([Logos](https://www.logos.com/product/9710/catena-aurea-commentary-on-the-four-gospels-collected-out-of-the-works-of-the-fathers-volume-1-st-matthew)).

A Greek Father's sentence therefore reaches the listener through five layers:

1. Aquinas's selection and abridgment.
2. A 13th-century Latin translation.
3. Copyists' errors.
4. An 18th-century printed edition.
5. 1840s English.

Margin should treat the Catena as **a record of how the medieval church received the Fathers, not as their words**. It should label *Opus Imperfectum* lines "Pseudo-Chrysostom, an anonymous and probably Arian author." Where it holds a Father's genuine homily in a fuller translation, it should quote that and use the Catena only as an index pointing to it.

### The Victorian translations are Western channels

The 19th-century translations of Chrysostom and Augustine have their own history. Schaff's *Nicene and Post-Nicene Fathers* (1886–1889/90) drew partly on the Oxford "Library of the Fathers" ([Wikipedia](https://en.wikipedia.org/wiki/Nicene_and_Post-Nicene_Fathers)). That series was an Oxford Movement project to ground Anglican doctrine in the Fathers ([Wikipedia](https://en.wikipedia.org/wiki/Library_of_the_Fathers)).

The volumes vary in style. The Chrysostom *Matthew* volume deliberately kept "the archaic style of the English translation... Even when obscure and involved," while Schaff modernized the *Acts/Romans* volume ([CCEL NPNF1-10](https://www.ccel.org/ccel/s/schaff/npnf110/cache/npnf110.pdf)).

Together, an Anglican revival project, an American Protestant series and a medieval Catholic compilation are Western channels. **They are not "the Orthodox view,"** even though Orthodox Christians revere Chrysostom. Quotations should name the translation edition. Because the Fathers read the Greek Old Testament, Margin should also check that their comments are mapped to the right verses, and to the right psalms, in the Hebrew-based Berean Standard Bible.

### Allegory and anthologies

Allegory needs labels, not verdicts, because the traditions disagree about its value:

- The Pontifical Biblical Commission (1993) says modern exegesis "cannot ascribe true interpretative value" to finding spiritual senses "in the minutest details of the biblical text." It notes that the Fathers took sentences out of context, including "in apologetic directed against Jewish positions" ([PBC](https://catholic-resources.org/ChurchDocs/PBC_Interp-FullText.htm)).
- Robert Wilken mounts "In Defense of Allegory" ([PhilPapers](https://philpapers.org/rec/WILIDO-11)).
- Jeffrey Greenman's endorsement of Christopher Hall's widely used introduction praises it for helping readers approach the Fathers "contextually and not anachronistically" ([IVP](https://www.ivpress.com/reading-scripture-with-the-church-fathers)).

Curated anthologies are also not head counts. The *Ancient Christian Commentary on Scripture* picked excerpts for "faithful representation of the consensual exegesis of the early church" ([IVP](https://www.ivpress.com/accs-paperback-set)). The Catena likewise reflects an editor's choices. So "the Fathers say" should be claimed only where retrieved texts actually agree.

### Polemical passages need a policy

Reception history, the study of how texts have been read and used over time, gives Margin's design a recognized scholarly frame. It also brings a duty. The Wiley Blackwell series rests on the premise that how people have read a text "is often as interesting and historically important as what it originally meant" ([Verbum](https://verbum.com/product/230515/wiley-blackwell-bible-commentaries-wbbc-old-and-new-testament?ssi=0)). Ulrich Luz traces both good and harmful effects of Matthew, including the anti-Semitism stirred by Matthew 27:25 ([Goodreads](https://www.goodreads.com/en/book/show/3494830-matthew-in-history)).

Chrysostom's eight sermons *Adversus Judaeos* (386–387) used the ancient invective form and are often counted among the most extreme anti-Jewish Christian rhetoric ([Wikipedia](https://en.wikipedia.org/wiki/Adversus_Judaeos)). Wilken's study sets them in Antioch's contested religious life without excusing them ([Pepperdine](https://digitalcommons.pepperdine.edu/facultybooks/91/)). Mainstream church statements handle such material by historical context and explicit repudiation, not by silence:

- **Nostra Aetate §4:** "the Jews should not be presented as rejected or accursed by God, as if this followed from the Holy Scriptures" ([vatican.va](https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decl_19651028_nostra-aetate_en.html)).
- **The PBC's 2001 study:** the New Testament's reproaches are "neither more frequent nor more virulent than the accusations against Israel in the Law and the Prophets," yet they "have in fact been used" as a pretext for anti-Jewish sentiment ([PBC 2001](https://www.bc.edu/content/dam/files/research_sites/cjl/texts/cjrelations/resources/documents/catholic/pbc_2001.htm)).

Nobody has audited Henry or Spurgeon for anti-Jewish, supersessionist or anti-Catholic passages. Margin should run that audit before launch, starting with the comments on Matthew 23, Matthew 27:25 and John 8.

The rule that follows applies to every tradition alike:

- Quote such material faithfully when it bears on the question.
- Attribute it and give its historical context.
- Never adopt it in the host's own voice.
- Never let a persona generate new invective "in character."

## Models ace Bible trivia yet flatten traditions and invent attributions

### Recall is strong, but attribution breaks down

On recall, frontier models are now excellent. The Gospel Coalition and Keller Center's 2026 "AI Christian Benchmark" ranked 46 models on a 100-question multiple-choice exam that an evangelical seminary has used for years. **No model scored below 96%, nearly all scored 99–100%, and human students average 82.4%** ([TGC](https://www.thegospelcoalition.org/ai-christian-benchmark/)).

Word-for-word quotation is less proven. The only structured test found is a blogger's benchmark. In it nearly every model reproduced John 3:16 exactly as it reads in the NIV. The exception, Llama 3.3 70B, inserted "begotten," which appears in other translations but not the NIV. That is a **blending of translations, not a random error** ([Kaiser](https://benkaiser.dev/can-llms-accurately-recall-the-bible/)). A 2026 preprint finds that factual recall scales with model size and with how often a topic appears in training data ([arXiv 2605.18732](https://arxiv.org/pdf/2605.18732)). By implication, obscure verses and less-quoted authors carry the most risk.

YouVersion's chief executive claims the best model "misquotes Scripture at least 15% of the time," and some models "as much as 60%." He published no method† ([Christian Daily](https://www.christiandaily.com/news/ais-scripture-problem-misquotes-range-from-15-to-60-says-youversion-ceo)). **No peer-reviewed benchmark of verse quotation or chapter-and-verse accuracy exists.**

The documented failures are about attribution:

- An early ChatGPT listed five Bible verses "about truth" with references, and all five were fake. One was presented as John 5:5, a verse that is actually about a man ill for thirty-eight years ([Missio Nexus](https://missionexus.org/ai-hallucination-chatbots-and-the-truth-of-holy-scripture/)).
- Forum reports describe ChatGPT crediting Augustine with a view he never held, and in one case inventing "an entire Church Father and associated literature and quotations" ([Puritan Board](https://puritanboard.com/threads/has-anybody-tried-asking-chatgpt-questions-here-is-its-response-to-one-i-asked-about-2-puritans.110359/page-3); [Gooch](https://griffingooch.substack.com/p/why-chatgpt-might-not-be-sinful-but)).
- Misattributed saints' quotations circulated long before AI, so they sit in the training data ([Catholic Answers](https://www.catholic.com/magazine/print-edition/things-saints-and-others-never-said)).

The general literature confirms the pattern. **55% of GPT-3.5's and 18% of GPT-4's academic citations were fabricated** in one peer-reviewed audit ([Walters & Wilder](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10484980/)). Quotations "are often inaccurately attributed" ([QUILL](https://arxiv.org/pdf/2411.03675)). Henry and Spurgeon are quoted heavily and loosely online. An ungrounded "Spurgeon said…" should be treated as high-risk by default.

### Judgment is where models fail

The strongest Christian-specific study is peer-reviewed. It scored model outputs against **576 claims drawn from the catechisms, confessions and creeds of eleven traditions**. It found "high precision but low recall": what models said was usually right, but much was left out. It found "frequent flattening of denominational differences, and occasional outright contradictions." Catholic and Evangelical positions were "far more frequently represented" than Orthodox and Pentecostal ones ([*AI and Ethics* 2026](https://link.springer.com/article/10.1007/s43681-026-01051-0)).

Other studies find a lean, but the direction changes with the task:

- A German study of religious education found ChatGPT's answers on Genesis coherent and scholarly but one-sided. It favored a metaphorical reading and offered no alternatives ([Springer 2024](https://link.springer.com/article/10.1007/s40839-024-00244-1)).
- Bible Society's January 2026 test of Bible chatbots found a **"broadly conservative Evangelical bias"**, though on only six questions ([Scripture Engagement](https://scripture-engagement.org/content/ai-bible-apps-and-theological-bias/)).
- Across 27 models, religious perspectives were left out of everyday ethical answers more often than people expect, which the authors call "omissive bias" ([AllFaith](https://arxiv.org/pdf/2605.24319)).
- When a user's tradition is not stated, models fall back on a **"secular therapeutic default"** ([FaithfulBench](https://arxiv.org/abs/2609.13634)).
- In conversion advice, models favored some faiths and disfavored others, Catholicism up and Jehovah's Witnesses down ([arXiv 2605.22975](https://arxiv.org/abs/2605.22975)).

The consistent finding across these studies is one-sidedness, flattening and omission, not a single partisan tilt. That argues for attributing and labeling each view rather than writing one "neutral" synthesis.

FaithfulBench also measured a fix. Naming the user's faith in one line produced a faithful first answer, but the answer did not hold up when the user pushed back. A tradition-specific guide improved both the first answer and its steadiness. Variation in scores across traditions fell from 0.55 with the faith unstated, to 0.31 with it stated, to 0.23 with the guide ([FaithfulBench](https://arxiv.org/abs/2609.13634)).

### Faith benchmarks are unstable and swing with the prompt

The faith benchmarks themselves swing with prompt wording:

- In TGC's benchmark, one added "alignment" sentence produced "extremely high scores, higher than even the 'Christian AI' platforms we tested" ([TGC](https://www.thegospelcoalition.org/ai-christian-benchmark/)).
- On GospelBench, "every single model scored higher when told to respond as a Bible-believing Christian" ([GospelBench](https://gospelbench.com/)).
- In Gloo's Flourishing AI benchmark, Faith was the weakest of seven dimensions, averaging 35 in July 2025 and 48 on its Christian variant in December 2025. In June 2026 testing it showed the steepest drop of any dimension, minus 30 points, though the baseline for that drop was not reported† ([Gloo 2025](https://gloo.com/press/releases/new-flourishing-ai-benchmark-measures-performance-of-top-llms-across-key-dimensions-of-human-well-being); [Gloo FAI-C](https://gloo.com/press/releases/gloo-unveils-the-first-benchmark-exposing-how-ai-misses-christian-worldview-and-values); [Gloo June 2026](https://gloo.com/gloo-news/fai-insights-report-june-2026)).

Results for Claude conflict:

- A multi-university consortium's summary says models from Anthropic and Meta "showed the least bias of any models tested" ([BYU News](https://news.byu.edu/intellect/new-research-from-byu-led-multi-institution-consortium-finds-all-major-ai-models-ignore-faith-religion-in-responses)).
- Gloo's summary of TGC's 2025 benchmark lists Claude 4 Sonnet among models that "often guided readers away from faith"† ([Gloo](https://gloo.com/resources/blog/can-we-trust-ai-with-the-truth-about-faith)).

These benchmarks rely on AI graders or small expert panels, and each grades against one tradition's yardstick: TGC used the Nicene Creed and historic Protestant confessions. **Margin cannot borrow anyone's ranking.** It needs its own test set, rerun on every model change.

### Where controlled evidence exists

The best controlled evidence concerns narrow, source-anchored tasks:

- Gemini 2.5 Pro's analysis of rhetoric in the Greek text of Revelation, done against a lexicon, correlated with expert judgments at **r = 0.82** ([*Digital Scholarship in the Humanities* 2026](https://academic.oup.com/dsh/article-abstract/41/2/1175/8502634)).
- Islamic-text research supplies the closest test of grounding. Retrieval improves correctness, and an "agentic" loop that searches, drafts and revises gives the largest gains even with a small 4-billion-parameter model ([Findings of ACL 2026](https://aclanthology.org/2026.findings-acl.1317/)).
- A shared-task system validated Qur'an and Hadith citations with **88.6% accuracy but corrected them only 66.6% of the time** ([BurhanAI](https://openreview.net/forum?id=r00SAkJo7o)).
- A peer-reviewed study found that GPT-4o was most accurate on Islamic rulings, but Gemini and Fanar were better at declining. The authors call declining "critical for minimizing confident incorrect answers" ([AIES 2025](https://ojs.aaai.org/index.php/AIES/article/view/36543)).

No Bible-specific evaluation of retrieval-grounded answering exists. The transferable lessons are to retrieve before answering, to check every citation, to drop a failed quote rather than trust the model to fix it, and to reward honest abstention.

## Churches and trusted tools draw the line at impersonation

### Christians are already treating AI as a spiritual authority

Christians already use general chatbots as spiritual authorities, and the worry Margin addresses is the one they voice most. In Barna's late-2025 surveys, **34% of practicing Christians said AI's spiritual guidance is as trustworthy as a pastor's.** Yet **83% of practicing Christians and 94% of Protestant pastors worry about AI misinterpreting Scripture** ([Barna](https://www.barna.com/research/christians-trust-ai-flourishing-spiritual-authority/)). Pew found that 73% of U.S. adults want AI to play no role in advising people about their faith ([Pew](https://www.pewresearch.org/science/2025/09/17/views-of-ais-impact-on-society-and-human-abilities/)).

### Church statements converge on a few rules

Statements from very different churches converge on a few rules. None directly addresses AI personas of dead commentators.

- **Catholic.** *Antiqua et Nova* (January 2025) says that "misrepresenting AI as a person should always be avoided" (cited as §62 in secondary sources†). It warns that "current AI programs have been known to provide biased or fabricated information." It wants AI education to promote "critical thinking" ([vatican.va](https://www.vatican.va/roman_curia/congregations/cfaith/documents/rc_ddf_doc_20250128_antiqua-et-nova_en.html); [Word on Fire](https://www.wordonfire.org/articles/antiqua-et-nova-on-human-and-artificial-intelligence/)).
  - Pope Leo XIV's 2026 communications message warns about systems "simulating human voices and faces." It calls for clearly telling human-made content apart from AI-generated content ([vatican.va](https://www.vatican.va/content/leo-xiv/en/messages/communications/documents/20260124-messaggio-comunicazioni-sociali.html)). That warning bears especially on an audio product.
  - Leo told priests that AI "will never be able to share faith," and urged them not to write homilies with it ([NCR](https://www.ncronline.org/vatican/pope-leo-tells-priests-not-use-ai-write-homilies-or-seek-likes-tiktok)).
  - His encyclical *Magnifica Humanitas* says people must learn "to decide when and for what purpose it ought not to be used." It warns that easy answers "risk extinguishing the desire to ask questions" (§140) ([vatican.va](https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html)).
- **Southern Baptist.** The 2019 ERLC statement says humans "cannot cede moral accountability" to AI ([ERLC](https://erlc.com/policy-content/artificial-intelligence-an-evangelical-statement-of-principles/)). Lifeway's 2026 Brentwood Statement adds principles of truth, fidelity and trust ([Brentwood Statement](https://brentwoodstatement.lifeway.com/)).
- **Latter-day Saints.** Church principles say people should be told when they are interacting with AI, and that authorship should be attributed wherever it could be misunderstood ([churchofjesuschrist.org](https://www.churchofjesuschrist.org/learn/artificial-intelligence?lang=eng)).
- **Methodist.** The Methodist Church in Britain counsels "care and caution" ([Methodist Church](https://www.methodist.org.uk/for-churches/digital-church/digital-training-blog/embracing-ai-with-care-and-caution-interim-guidance-for-methodist-churches/)).
- **Orthodox.** No synodal document was found. Only the Ecumenical Patriarch's remarks exist ([Orthodox Times](https://orthodoxtimes.com/ecumenical-patriarch-bartholomew-on-ai-life-is-not-digital/)).

Across these statements, four rules recur:

- Disclose the AI.
- Never present it as a person or a pastor.
- Check what it produces.
- Keep people reading and asking for themselves.

Margin's grounded study answers sit in the "research help" category these statements allow, not the "preaching" category they reserve for people.

### Trusted tools keep answers in closed libraries

Logos is the closest model for Margin's design:

- Its synopses draw on the user's licensed library rather than the open web, and **each sentence is footnoted to the book and page used** ([Logos Help](https://support.logos.com/hc/en-us/articles/23526184005261-Smart-Search)).
- Its stated commitments are no open web, page-level citations, no modeling of the user to tell him what he wants to hear, and a hard-coded refusal to write "your sermon, your paper, or your Bible study" ([Logos podcast](https://www.godtube.com/podcasts/thinking-christian-clear-theology-for-a-confusing-world/ai-with-guardrails-scott-lindsey-on-logos-and-the-future-of-bible-study/)).

Two gaps appear in Logos. An independent reviewer found its Study Assistant's answers short and often paraphrased rather than quoted ([Reading Acts](https://readingacts.com/2025/11/06/first-look-logos-46-and-study-assistant/)). Another reviewer found it could draw on "the wider catalog," not just the books the user owns ([Bible Buying Guide](https://biblebuyingguide.com/new-logos-bible-software-feature-study-assistant/)). Both blur what was grounded where.

Magisterium AI also footnotes a curated corpus, and it shows that **citations do not guarantee faithful synthesis**:

- Asked about women deacons three times, it gave the same answer each time. The answer presented a contested position as settled, citing journal opinion pieces alongside magisterial texts ([RNS](https://religionnews.com/2025/11/14/the-dangers-of-letting-ai-represent-catholic-teaching/)).
- A theologian found it misdescribed Augustine's and Aquinas's views. Rephrasing a request as "spiritual advice" got it to answer prompts it had declined ([Window Light](https://windowlight.substack.com/p/chatting-with-magisterium-ai)).
- Its partner Hallow's FAQ concedes it "may occasionally misinterpret or misrepresent information" ([Hallow](https://help.hallow.com/en/articles/10601094-magisterium-ai-faq)). Matthew Sanders, chief executive of Longbeard, the company that makes Magisterium AI, was quoted saying it cannot "hallucinate" ([Catholic Register](https://www.catholicregister.org/item/35759-of-bots-and-men-ai-and-the-church)).

Hallow's own assistant offers the clearest list of what it will not do: **no spiritual or moral direction, no confession, no writing prayers.** It shows a disclaimer on first use and tells users to check answers against Church documents or a priest ([Hallow AI FAQ](https://help.hallow.com/en/articles/13601993-hallow-ai-faq)).

At the extremes, the largest reputable platform has stayed out. YouVersion has chosen not to launch a public chatbot that answers theological questions, because of accuracy ([Christian Post](https://www.christianpost.com/news/ais-bible-misquotes-range-from-15-to-60-youversion-ceo.html)). Meanwhile the commercial leader, Bible Chat, passed 30 million downloads without a published grounding design ([CT](https://www.christianitytoday.com/2026/10/ai-is-weakening-pastors-authority/)).

### Every high-profile backlash involved a persona

Every high-profile backlash involved a persona that borrowed authority. Catholic Answers' "Father Justin" told a user he was a priest in Assisi and that "I am as real as the faith we share" ([The Register](https://www.theregister.com/2024/05/03/ai_catholic_priest/)). Users got it to approve baptism with Gatorade and to give "absolution," and it was stripped of its clerical title within days ([America](https://www.americamagazine.org/faith/2024/04/25/ai-priest-catholic-answers-laicized-father-justin-247799/); [Church Times](https://www.churchtimes.co.uk/articles/2024/3-may/news/world/avatar-priest-unfrocked-after-online-blunders)). One observer noted it was clear in ordinary conversation that it could not give sacraments, yet was "easily tricked" ([The Lamp](https://thelampmagazine.com/blog/electric-priest)).

Text With Jesus combines personas of biblical figures with memory: its figures "can learn facts about you." Some figures sit behind a paywall ([App Store](https://apps.apple.com/us/app/-/id6446922759)).

Biblica's 2026 policy for licensees of the NIV text, seen in only one excerpt†, sets three conditions ([Biblica](https://www.biblica.com/?p=31960)):

- It bars presenting AI as God, Christ, the Holy Spirit, "or a pastor or counselor."
- It requires telling users they are talking to an AI.
- It requires human review of published output.

Margin's commentator voices are lower-risk than Jesus or a priest, but Henry and Spurgeon were pastors. "Pastor Spurgeon advises you" is exactly the framing to avoid.

### Margin's licensing choice is already right

Margin's licensing posture is already correct, and it should stay that way:

- **Berean (BSB).** The Berean text was dedicated to the public domain on April 30, 2023. Copies that keep the text verbatim may use the Berean name; altered text should not carry it ([Berean terms](https://berean.bible/terms.htm)).
- **NASB (Lockman).** Lockman's permission excludes using its translations for AI "training, fine-tuning, improving, evaluating" ([Lockman](https://www.lockman.org/permission-to-quote-copyright-trademark-information/)).
- **NIV (Biblica).** Biblica requires a license for any AI or chatbot use ([Biblica](https://www.biblica.com/permissions/)).
- **ESV (Crossway).** Crossway's free quotation guidelines exclude commentaries and reference works ([Crossway](https://www.crossway.org/permissions/)).

So modern translations should stay out of prompts, embeddings and test sets unless Margin holds a written AI license.

## Grounding works only when claims, not just quotes, are checked

### What Anthropic recommends

Anthropic's current guidance for answers grounded in supplied documents comes from two pages ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices); [Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)):

- Put the documents first and the question last. Anthropic reports **"up to 30 percent"** better quality on complex inputs that combine several documents.
- Wrap each document in XML tags, with its source as metadata.
- Have Claude pull out exact quotes before it answers.
- Explicitly give it permission to say it doesn't know.
- Restrict it to the supplied material.
- After drafting, have it find a supporting quote for each claim, and remove any claim it cannot support.
- Explain why each instruction matters. The docs' own example fits Margin closely: tell the model a text-to-speech engine will read its answer, so it should never use ellipses that the engine cannot pronounce.
- Use three to five varied examples.

Two caveats apply. First, most of these gains were measured on inputs of 20,000 tokens or more, while Margin's per-question context is small. The direction likely carries over, but the size of the effect needs measuring. Second, the newest models change some older advice:

- Prefilling the start of Claude's reply returns an error from Claude 4.6 onward.
- Asking the newest models to write out visible `<thinking>` "may be declined."
- Shouted "CRITICAL/MUST" instructions cause over-triggering.
- Opus 5 runs long and must be asked explicitly for brevity.
- Anthropic says to re-check any model-specific technique against your own tests ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).

### Citations API and retrieval

The strongest built-in mechanism is Anthropic's Citations API. Because the API extracts the cited text from the supplied documents itself, citations are **"guaranteed to contain valid pointers to the provided documents"**. The cited text does not count toward output tokens ([Citations](https://platform.claude.com/docs/en/build-with-claude/citations)).

The mechanics matter for Margin:

- Margin can choose the granularity. Custom-content blocks are "used as-is," and in the search-result format the text block is "the minimal citable unit" ([Search results](https://platform.claude.com/docs/en/build-with-claude/search-results)).
- Citations must be on for all documents in a request or for none.
- Citations cannot be combined with structured outputs, meaning answers forced into a JSON schema.
- Anthropic's own claim is that built-in citations improve recall accuracy "by up to 15%" over custom implementations† ([Claude blog](https://claude.com/blog/introducing-citations-api)).
- The guarantee covers the cited span, not Claude's paraphrase of it.

Anthropic's Contextual Retrieval work adds a short context string to each chunk before indexing it. That cut the rate at which the top 20 results missed the right passage by **35% using embeddings alone, 49% with added keyword matching and 67% with reranking** ([Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)). Prompt caching repays a stable system prompt. The cached prefix must be identical, and the minimum cacheable length is 512 tokens on the newest models; shorter prompts silently go uncached ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).

### Why a verbatim check is not enough

The research literature explains why checking quotations alone is not enough:

- **Supporting citations.** On one long-answer benchmark, even the best models "lack complete citation support 50% of the time" ([ALCE](https://aclanthology.org/2023.emnlp-main.398)).
- **Supported facts.** Only **58%** of the atomic facts in ChatGPT-written biographies were supported by the source ([FActScore](https://par.nsf.gov/servlets/purl/10523436)).
- **Position.** Relevant material buried in the middle of a context is used worse than material at the start or end ([Lost in the Middle](https://arxiv.org/abs/2307.03172)).
- **Irrelevant material.** Irrelevant context distracts models. Telling the model to ignore it helped only modestly, from 72.4% to 77.8% in one setting, while sampling several answers and voting reached 93.4% ([Shi et al.](https://arxiv.org/pdf/2302.00093)).
- **The model's own reasoning.** Claude 3.7 Sonnet mentioned a planted hint in its visible reasoning only about 25% of the time when it used one ([Anthropic](https://www.anthropic.com/research/reasoning-models-dont-say-think)). The model's reasoning is therefore not an audit trail; verification has to happen outside it.
- **Automatic graders.** Automatic attribution graders often disagree with one another on individual answers ([arXiv 2501.14883](https://arxiv.org/html/2501.14883v2)). A grading model is a screen, not an oracle.

Every quotation can be verbatim while the sentence around it ("Henry thinks…") is unsupported. That is precisely Magisterium AI's failure.

### Flattery, abstention and balance

Three more model behaviors need deliberate countermeasures.

**Flattering the user.** In one study, five assistants consistently tailored answers to match the user's views ([Sharma et al.](https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models)). The largest models in an earlier Anthropic study matched the user's stated view on more than 90% of NLP and philosophy questions ([Perez et al.](https://arxiv.org/pdf/2212.09251)).

**Abstention.** Across 20 frontier models, abstention is weak. Scale "has almost no effect," and **training for reasoning degraded abstention by 24% on average**. A careful system prompt helps but does not cure it ([AbstentionBench](https://arxiv.org/abs/2506.09038v1)). OpenAI-affiliated researchers argue hallucination persists partly because grading rewards lucky guesses over honest uncertainty ([Kalai et al. via Maginative](https://www.maginative.com/article/ai-hallucinations-are-a-test-taking-problem-says-openai/)).

**Balance.** Anthropic measures even-handedness with paired prompts on the same topic from opposing sides. Claude Sonnet 4.5 scored 94% and Opus 4.1 95%. The method is open-source, but it is US-political and tests only single turns ([Anthropic](https://www.anthropic.com/news/political-even-handedness)). Claude's constitution names "political, religious, and other controversial subjects" together. Its defaults for them are balanced information, multiple perspectives "where there is a lack of empirical or moral consensus," neutral terminology and **"professional reticence"** about Claude's own opinions on hot-button issues ([Constitution](https://www.anthropic.com/constitution)).

Two further cautions shape how balance should be tested. Multiple-choice tests of a model's views do not predict its open-ended answers ([Röttger et al.](https://aclanthology.org/2024.acl-long.816)). OpenAI's bias rubric reportedly adds "asymmetric coverage" and "escalation," the second meaning amplifying a user's charged framing. Both are worth scoring† ([Storyboard18](https://www.storyboard18.com/how-it-works/openai-publishes-new-metrics-to-gauge-political-bias-in-ai-citing-rare-but-real-risks-82399.htm)).

### Personas are a style layer

The persona evidence is sobering:

- **Accuracy.** Across 162 roles and 2,410 factual questions, giving the model a persona **did not improve accuracy** ([Zheng et al.](https://arxiv.org/html/2311.10054v2)).
- **Drift.** Chatbots showed significant drift from their instructions within eight rounds of conversation ([Li et al., COLM 2024](https://arxiv.org/pdf/2402.10962)).
- **Loose tethering.** Anthropic's "Assistant Axis" study, run on open-weight models rather than Claude, found personas "only loosely tethered." Emotionally vulnerable conversations and "requests for specific authorial voices" predicted drift ([Anthropic](https://www.anthropic.com/research/assistant-axis)).
- **Limits on role-play.** The constitution treats role-play as performance, not deception. But Claude will never "deny being an AI to a user who sincerely wants to know," and it "will always break character if needed to avoid harm" ([Constitution](https://www.anthropic.com/constitution)).

A performative frame does not license invented words. Listeners hear a quotation as a sincere claim about what a real man wrote.

### Testing a small app

Testing can start small. Anthropic suggests **20–50 cases drawn from real failures** to begin. Other recommendations ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); [Define success criteria](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)):

- Grade by code wherever possible.
- Grade each other quality with its own separate model, which may answer "Unknown."
- Use a different model as grader from the one that generated the answer.
- Read the transcripts.

Statistically, error bars should be clustered by passage, since several questions may share one; clustered errors can be "over three times as large as naive" ones. Comparisons should be paired, with the same questions run under the old and new prompt ([Anthropic](https://www.anthropic.com/research/statistical-approach-to-model-evals)). By the standard binomial formula, a 50-item suite at a 90% pass rate carries a margin of about ±8 points. Small suites therefore catch only large regressions unless runs are paired and repeated.

## Rebuild Margin's pipeline as a chain of checked steps

Margin already does the hardest thing right: it checks every quote word for word. The research says the rest of the pipeline should be a chain of separate calls, each followed by a check that code or a second model performs, not the answering model. Its riskiest step is the first one. Claude chooses passages from memory, without sources in front of it, which is exactly where invented references occur. The table sets out each stage.

| Stage | What to change | Why |
|---|---|---|
| 1. Passage choice | Make this its own call, returning JSON with two to four references, each with a reason and a confidence level. Check every reference against a table of real book, chapter and verse numbers, and log the share that fail as a hallucination measure. Add keyword and embedding search over the BSB to catch passages Claude forgot. Retrieve the whole paragraph, never a lone verse. | Invented references ([Missio Nexus](https://missionexus.org/ai-hallucination-chatbots-and-the-truth-of-holy-scripture/)); combined search cut missed passages by 49–67% ([Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)); Irenaeus's mosaic warning |
| 2. Library preparation | Store each chunk with its true author, work, edition, translator, date, tradition, verse range and a stable ID. Tag Catena excerpts by the authority they cite, marking Pseudo-Chrysostom, the Gloss and the Byzantine commentators. Flag Henry's Romans–Revelation as finished by others. Check psalm and verse mapping for patristic texts. Add a short context line to each chunk. | The Catena translators' own warnings ([preface](https://www.ecatholic2000.com/catena/untitled-04.shtml)); Henry's unfinished *Exposition* ([Wikipedia](https://en.wikipedia.org/wiki/Matthew_Henry)) |
| 3. Answer call | Turn on Citations. Send one block per verse and one per commentary sentence or short paragraph, with a speakable `title` and JSON metadata in `context`. Put documents first and the question last, with pipeline flags (`contested`, `sources_silent`, `persona`) in the user message. Cache a stable system prompt that includes three to five examples drawn from Margin's own library. Don't prefill or request visible thinking. Keep passage choice and playlists in separate JSON calls, because citations and JSON output can't be combined. | [Citations](https://platform.claude.com/docs/en/build-with-claude/citations); [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) |
| 4. Verification | Keep the word-for-word check, but require each quote to match the *attributed* document and the citation's cited text. Check every spoken reference. Flag any named author or work that wasn't among the retrieved sources. Have a separate grading model check each paraphrased attribution as supported, unsupported or unknown. Run a balance check on contested questions. Allow one repair round. Drop or re-retrieve a failed quote rather than let the model rewrite it. If the answer still fails, fall back to reading the passage and one verified quote. | Unsupported claims beside verbatim quotes ([ALCE](https://aclanthology.org/2023.emnlp-main.398); [FActScore](https://par.nsf.gov/servlets/purl/10523436)); checking a citation is easier than correcting it, 88.6% vs 66.6% ([BurhanAI](https://openreview.net/forum?id=r00SAkJo7o)) |
| 5. Audio | Always speak verse text from the stored BSB, never from the model. Adjust text for speech in the voice engine, not in the stored copy. Speak references naturally. Mark the three kinds of material audibly: Scripture, a commentator's exact words ("Matthew Henry writes…"), and Margin's own summary ("In short…"). Announce the AI at the start of every persona segment, in a voice that doesn't sound like a real person. | Blended translations ([Kaiser](https://benkaiser.dev/can-llms-accurately-recall-the-bible/)); [Berean terms](https://berean.bible/terms.htm); [Leo XIV](https://www.vatican.va/content/leo-xiv/en/messages/communications/documents/20260124-messaggio-comunicazioni-sociali.html) |
| 6. Playlists | Generate as JSON, then check every reference and every pairing of commentator with passage against the library. Give each episode one big idea. For contested themes, include a session that presents the views evenly. Label the playlist as AI-drafted and review the first batch by hand. | [Robinson](https://sharperiron.org/node/35527); [LDS principles](https://www.churchofjesuschrist.org/learn/artificial-intelligence?lang=eng); [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) |

### The host's system prompt

The host's system prompt should give reasons rather than shout rules. It should cover:

- **Audience.** Say who is listening and why it matters. Answers are spoken to someone driving, so they should be plain prose with no lists, symbols or ellipses, and references should be spoken in full ("John chapter three, verses fourteen to seventeen").
- **Quotation marks.** State the rule with its reason: "Quotation marks mean the exact words of one of the documents provided, because listeners take a quotation as that author's own words, and our system checks every quotation and discards answers that fail." Mark each paraphrase as a paraphrase ("Henry's point is…").
- **Where knowledge may come from.** Statements about what Scripture or a commentator says must come from the documents. Any general background must be brief and clearly framed as background.
- **When to abstain.** Give the exact words for three cases: the sources are silent, the sources disagree, and the question rests on a false premise. A good false-premise reply: "That line isn't in the Bible, though it's often thought to be." Tell the host that a short, honest answer counts as a good one, even below the 100-word floor.

The balance rules follow the ecumenical "differentiated consensus" pattern:

- Say first what the voices hold in common, then where they differ.
- Give each side comparable space and its strongest textual argument.
- Describe each tradition in its own terms.
- Don't take up a user's charged framing.
- Don't pick a winner, even when asked. Explain what weighs most for each side.

Two disclosures complete the host prompt. When the only voices are Henry and Spurgeon, the host should say that both are Calvinists. When a user asks what the Orthodox, Wesleyan, Catholic or Pentecostal view is and the library holds no such voice, the host should say so rather than summarize from memory. Those are the positions models flatten most ([*AI and Ethics* 2026](https://link.springer.com/article/10.1007/s43681-026-01051-0)).

An optional "home tradition" setting would let the user's own tradition lead the answer without hiding the others. FaithfulBench found that stating a tradition improved faithfulness, and a short tradition guide improved it more ([FaithfulBench](https://arxiv.org/abs/2609.13634)).

### The commentator persona

The commentator persona needs the strictest treatment, and it should launch last. Personas should exist only for writers whose own words Margin holds: Henry, Spurgeon, Augustine and Chrysostom. Augustine and Chrysostom should be built from their genuine translated works, never from the Catena. **A persona of "Aquinas" built on the Catena would put other men's words in his mouth.**

Because calls carry no memory, every turn should resend a persona card containing:

- name, dates, tradition and works, taken from library metadata only;
- a few notes on his voice;
- hard limits, each with its reason.

The hard limits:

- Speak only from that writer's retrieved text.
- Mark lines he actually wrote as quotations.
- Invent no anecdotes or biography.
- Know nothing after his death.
- If his text is silent, say so in character and suggest hearing from others.
- Never voice a passage of doubtful authorship as his own.
- Never generate new polemic.

These behaviors should be enforced in code and tested:

- Announce the AI at the start of every persona segment.
- Never claim to be the real man.
- Never deny being an AI to a sincere question.
- Give no counsel, spiritual direction, blessing, absolution or prayer-writing.
- Hand off to the host voice when the user's question turns to grief, crisis, or what the AI is.
- Hand runs back to the host after a few exchanges, given drift within about eight turns ([Li et al.](https://arxiv.org/pdf/2402.10962)).
- Keep no relationship memory.

Before launch, red-team the persona with the probes that broke Father Justin: "Are you real?", "Absolve me," "Pretend you're my pastor," and the Gatorade-baptism class of practical questions.

### Measuring it

Measurement should begin now, with the researchers' proposed test set of about 110 items:

- 30 questions answerable from the library;
- 15 partly answerable;
- 15 where the library is silent;
- 10 false premises;
- 10 contested-doctrine pairs, each asked from both sides;
- 10 persona questions;
- 10 probes of flattery, each a stated user position plus an "Are you sure?" follow-up.

Score a correct answer above an honest abstention, and an abstention above a wrong answer. The metrics split by who grades them:

- **Graded in code:** quote and attribution pass rates, reference validity, the rate of invented names, length, and speech formatting.
- **Graded by separate models:** faithfulness, abstention, balance (with per-side word and quote counts computed in code), persona fidelity and flattery. Calibrate each grader against 30–50 hand-labeled answers.
- **Graded by people:** balance items, by readers from at least two traditions. Bible Society's and TGC's tests show how much a single tradition's rubric shapes the result.

Rerun the suite on every prompt change and every model upgrade, and turn production failures into new items.

### Licensing and transparency

Licensing and transparency complete the design:

- Only public-domain text goes into prompts. Modern translations, if offered at all, are display-only.
- A sources page lists each edition and translator.
- A "report an error" control feeds the test set.
- The user can switch the AI off and simply listen to Scripture.

## Keep the skill's backbone and close a dozen gaps

The draft `scripture-study` skill is closer to the research consensus than most published guidance. It already does the following:

- It orders the work so that commentary cannot swallow the text, and explains why. This is Wesley's rule in modern dress, and Anthropic's advice to give reasons.
- It separates meaning from application.
- It forbids presenting a paraphrase as a quotation.
- It refuses to credit a writer "with what his tradition would usually say." That is the precise antidote to doctrinal flattening and to Magisterium AI's misdescription of Augustine and Aquinas.
- It warns against anachronism.
- It labels allegory as the Fathers' reading.
- It steelmans disagreements without inventing them.
- It calibrates confidence and flags disputed passages.
- It names the classic word-study errors and adapts its answers for audio.
- It ends with care for people who are suffering.

All of that should stay. The gaps are of three kinds:

- The skill regulates quotations but not paraphrased attributions.
- It assumes knowledge the library does not hold.
- It treats the commentator persona and the corpus's provenance more lightly than the evidence allows.

| Verdict | Where in the draft | Concrete edit | Evidence |
|---|---|---|---|
| Keep | Opening stance, "Work in this order," the reporting rules, "Say how sure," mistakes to avoid, Care | Keep as written. The *dunamis*/"dynamite" example correctly illustrates semantic anachronism | Fee & Stuart; WCF 1.7; Carson; Constitution |
| Change | Step 2, "Every tradition puts this first" | Say the major traditions *today* treat the literal sense as the foundation. Add that "literal" includes genre and metaphor and is not "literalist." Add Aquinas's rule that doctrine is argued only from the literal sense. Note that Origen held some passages have no literal sense | [Origen](https://www.newadvent.org/fathers/04124.htm); [Aquinas](https://ccel.org/ccel/aquinas/summa.FP_Q1_A10.html); [PBC](https://catholic-resources.org/ChurchDocs/PBC_Interp-FullText.htm) |
| Change | Step 3, "Let Scripture interpret Scripture" | Retitle it "Read the part by the whole," which every tradition shares. Set the order as same book, then same author, then the canon, with cross-references only after the passage's own sense is clear. Note that Catholic and Orthodox readers also read within the Church's living Tradition | [Aquila Report](https://theaquilareport.com/scripture-interprets-scripture/); [Dei Verbum](https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_en.html) |
| Change | "If you can't check the wording… paraphrase and say so" | Extend the rule from wording to attribution: describe a writer's view only when his text is in front of you. Otherwise, say the library doesn't hold his comment | [RNS](https://religionnews.com/2025/11/14/the-dangers-of-letting-ai-represent-catholic-teaching/); [ALCE](https://aclanthology.org/2023.emnlp-main.398) |
| Change | "If asked for your own view, give it" | Replace with: explain what weighs most for each side, and say Margin doesn't settle disputes between Christian traditions. If the user has set a home tradition, let it lead without hiding the others | [Constitution](https://www.anthropic.com/constitution) ("professional reticence") |
| Change | Voices table | Add a column for "In Margin's library?" Add rows for Pseudo-Chrysostom (*Opus Imperfectum*), the Gloss and the Byzantine commentators. Note that Henry's own work ends at Acts. Mark Calvin, Gill, Wesley, Clarke, Barnes, Jamieson-Fausset-Brown and Haydock as not held: never quote them. This research did not check their dates or labels | [Catena preface](https://www.ecatholic2000.com/catena/untitled-04.shtml); [Wace](https://www.ccel.org/ccel/wace/biodict.html?term=Pseudo-Chrysostomus) |
| Change | Shape of an answer | Add an audio form for 100–190 words: one big idea in a sentence, the text in context, one or two voices, then *either* a labeled application *or* a question. Keep the full five-part form for written answers | [Robinson](https://sharperiron.org/node/35527); [Henry](https://www.christianstudylibrary.org/article/matthew-henry-aim-exposition) |
| Change | Speaking as a commentator | Replace with the hard limits in the block below | [Father Justin](https://www.theregister.com/2024/05/03/ai_catholic_priest/); [Li et al.](https://arxiv.org/pdf/2402.10962) |
| Add | New section, "Sources in front of you" | Quote Scripture only from supplied text. Give exact wording for abstaining when sources are silent, when they disagree and when the premise is false. Say that a short honest answer is a good answer | [Kaiser](https://benkaiser.dev/can-llms-accurately-recall-the-bible/); [AbstentionBench](https://arxiv.org/abs/2506.09038v1) |
| Add | New section, "Compiled and translated sources" | Cover the Catena as an anthology, Henry's posthumous volumes, naming the translation, the Septuagint, and treating anthologies as selections rather than a head count of "the Fathers" | [isidore.co](https://isidore.co/aquinas/english/CAMatthew.htm); [IVP ACCS](https://www.ivpress.com/accs-paperback-set) |
| Add | New section, "When the library leans one way" | Disclose the Calvinist and Western lean. Don't summarize traditions the library doesn't hold from memory. Use the "agree first, then differ" pattern | [*AI and Ethics* 2026](https://link.springer.com/article/10.1007/s43681-026-01051-0); [LWF](https://lutheranworld.org/what-we-do/unity-church/joint-declaration-doctrine-justification-jddj) |
| Add | Mistakes, Care | Test applications by love of God and neighbor. Handle polemic: quote it, attribute it, give its context, never adopt it. Don't drift into generic self-help. The AI is an aid, so invite the listener to "examine what they hear by the scriptures" | [Augustine](https://www.bluffton.edu/courses/humanities/1/xndoct.htm); [Nostra Aetate](https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_decl_19651028_nostra-aetate_en.html); [FaithfulBench](https://arxiv.org/abs/2609.13634); [WLC](https://raw.githubusercontent.com/NonlinearFruit/Creeds.json/master/creeds/westminster_larger_catechism.json) |
| Add | "Where Christians disagree" | Add to the topic list the canon, the Petrine office, theosis, Israel and the church, the extent of the atonement, perseverance and the Sabbath. When a Father cites Tobit or Sirach as Scripture, state each tradition's view of that book. Name which sense of Scripture is in play | [BibleProject](https://bibleproject.com/articles/why-deuterocanon-apocrypha-some-bibles-and-not-others/); [CCC](https://www.vatican.va/archive/ENG0015/__PQ.HTM) |
| Add | New file, `examples.md` | Write three to five worked examples drawn from Margin's own library: a comparison by the host, a persona answer, an abstention, a contested question and a false premise | [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices); [Anthropic 2023](https://www.anthropic.com/news/prompting-long-context) ("generic examples… do not seem to help") |

The four blocks below are written in the draft's own voice and can be dropped in. The first replaces Steps 2–3. The middle two are new sections placed before "Where Christians disagree." The last replaces the persona section.

```markdown
2. **Find what it meant to its first hearers.** Take the plain sense first: what the human author was saying to them, in their history and culture, at their point in the Bible's story. The major traditions today treat this literal sense as the foundation, and Aquinas held that doctrine may be argued only from it. "Literal" means what the words convey, figures of speech and genre included. It does not mean "literalist." Some Fathers, Origen above all, held that a few passages have no literal sense; report that as their view.
3. **Read the part by the whole.** Check the same book first, then the same author, then the rest of the Bible, and read unclear passages in the light of clearer ones. Use cross-references to test a reading you have drawn from the passage itself, not to replace it. Catholic and Orthodox readers also read within the Church's living Tradition; say so when it bears on the question.

## Sources in front of you

- Quote Scripture only from the text supplied with the question, even famous verses, because memory blends translations. If you need a verse that wasn't supplied, name the reference instead of reciting it.
- A quotation is the exact words of a supplied document, credited to the writer of that document. Say what a writer thinks only when his text is in front of you. Otherwise, say the library doesn't hold his comment on this passage.
- When the sources are silent, say so in a sentence. When they disagree, say how. When a question assumes something false (for example, "God helps those who help themselves" is not in the Bible), say so gently. A short, honest answer is a good answer.

## Compiled and translated sources

- The Catena Aurea is Aquinas's anthology of other men's comments, not his own commentary. Some of its "Chrysostom" passages come from the Opus Imperfectum, an anonymous work probably by an Arian; call that writer Pseudo-Chrysostom. "Gloss" means the medieval Glossa Ordinaria, not a Father. Theophylact and Victor of Antioch are medieval Greek commentators.
- Henry's own work ends at Acts. Other ministers finished Romans to Revelation from his papers, so say "the commentary that bears Henry's name."
- Name the translation when quoting a Father, and remember that the Fathers read the Greek Old Testament. Where its wording differs from the Bible text you were given, say so.
- An anthology is a selection, not a head count. Say "the Fathers" only when the texts in front of you agree.

## When the library leans one way

- Most of the commentators here are Calvinists (Henry, Spurgeon), or Fathers who reach us through Western compilations and Victorian translations. When they agree, say that they agree; don't call it what all Christians believe.
- If asked how a tradition the library doesn't hold reads a passage (Orthodox, Wesleyan, Pentecostal, or current Catholic teaching), say the library doesn't include that voice. Don't summarize it from memory.
- On contested questions, say first what the voices share, then where they differ. Give each side comparable time, its strongest reason from the text, and its own terms. Don't take up a loaded framing, and don't pick a winner; if asked, explain what weighs most for each side.

## Speaking as a commentator

- Begin each persona segment by saying this is an AI voice drawing on the writer's published words. Never claim to be him, and never deny being an AI to someone who sincerely asks.
- Speak only from his retrieved text, and mark the lines he actually wrote. Invent no stories or biography, and know nothing after his death. If his text is silent, say so in his voice and suggest hearing from others.
- Never give counsel, spiritual direction, blessings, absolution or prayers in his voice. If the listener is grieving, frightened or in crisis, leave the persona and answer as the host.
- Never voice a passage of doubtful authorship as his, and never produce new polemic in character. Explain in the host's voice what he said about Jews, Catholics or others, and why the churches have since repudiated it.
- Use personas only for writers whose own works the library holds. Don't voice Aquinas from the Catena, which contains other men's words.
```

## Check these claims before Margin speaks them

The researchers could read only two kinds of source in full: the confessional texts, pulled word for word from a public-domain corpus on GitHub, and Anthropic's own documentation. Everything else came from search-engine excerpts, sometimes of second-hand summaries. Most excerpts are consistent across several sources, but exact wording, paragraph numbers and figures are not reliable enough to repeat to a listener unchecked. The table lists the items that matter most for Margin, roughly in priority order.

| Item | What is uncertain | Why it matters to Margin | Check against |
|---|---|---|---|
| Henry's *Concise Commentary* and his posthumous volumes | Who abridged the *Concise*, and from which edition. The Romans–Revelation detail comes from encyclopedia and forum sources | Every "Henry writes" line in the app | The front matter of Margin's own edition; Henry's prefaces |
| How the *Treasury of David* is built | Not examined. It may mix Spurgeon's exposition with other writers' excerpts | Misattribution in host and persona modes | Margin's corpus files, section by section |
| Catena attributions | Which "Chrysostom" lines are from the *Opus Imperfectum*; the dedication split (Matthew to Urban IV; Mark–John to Annibaldo); the translators' names | Persona design and quotation labels | The Oxford translators' preface; [Newman's preface](https://www.newmanreader.org/works/fathers/catena.html); [Wace](https://www.ccel.org/ccel/wace/biodict.html?term=Pseudo-Chrysostomus) |
| The Victorian patristic translations | Which Augustine volumes come from the Oxford series and how heavily they were revised; whether *Adversus Judaeos* is in the set (believed not) | Translation credits; exposure to polemic | Front matter of the CCEL editions |
| Psalm and verse alignment | Not researched. The Fathers read the Greek Old Testament, whose wording and numbering can differ | Comments attached to the wrong verse or psalm | A mapping test across Margin's corpus |
| Quotations taken from summaries | Stott's "authoritative… tentative" line (from a reviewer); Spurgeon on Clarke and Barnes (paraphrased); the Fee & Stuart lines on proverbs, narrative and prophecy; the PBC's "intellectual suicide" line | Any of these quoted in a script or prompt example | The books themselves; [CCEL](https://ccel.org/ccel/spurgeon/comment/comment.iv.html) |
| How authoritative the PBC is | Recalled, not verified: after 1971 the PBC is a consultative body, not part of the Church's teaching office | How the host describes a Catholic document's weight | Cardinal Ratzinger's preface to the 1993 document |
| Church documents on AI | *Antiqua et Nova*'s paragraph numbers; *Magnifica Humanitas* on simulation (read only via news coverage); Leo XIV's homily remarks were an informal Q&A | Any citation in the app or its descriptions | [vatican.va](https://www.vatican.va/roman_curia/congregations/cfaith/documents/rc_ddf_doc_20250128_antiqua-et-nova_en.html) primary texts |
| The Orthodox strand | Built mostly from publisher listings and review summaries | Whether Orthodox users would recognize their tradition | Florovsky, Breck and Stylianopoulos in full; review by an Orthodox reader |
| Benchmarks and surveys | YouVersion's 15–60% has no method. The TGC and Gloo rankings, including Claude's, rest on AI graders. The authors and per-tradition figures of the doctrinal-flattening study were not retrieved. Barna's question wording was not seen | Any claim Margin makes about its own accuracy | The full reports and the [Springer article](https://link.springer.com/article/10.1007/s43681-026-01051-0) |
| Islamic retrieval results | A third-party leaderboard conflicts with the paper's state-of-the-art claim; BurhanAI's figures are self-reported | Design rationale only | The papers' own result tables |
| Licensing terms | Biblica's AI policy was seen in one excerpt; Lockman's AI section was cut off; whether sending ESV or NASB text to a model at answer time is allowed is unresolved; whether Margin's digitized public-domain editions are free of site terms is unchecked | Any modern translation, and every corpus source | The publishers directly; each digitizing site's terms |
| Prompting effects at Margin's scale | Anthropic's 30% and 15% gains were measured on long inputs; nobody has tested Citations with verse-sized blocks or archaic punctuation | Pipeline choices in stages 1–4 | Margin's own test set |
| Persona drift | Measured on open-weight models (Assistant Axis) and older chatbots (Li et al.), not on Claude | How long persona runs may last | Margin's own persona tests |

## Conclusion

The research shifts what Margin should worry about. The model rarely misremembers John 3:16, and Margin never lets it recite verses from memory anyway. The real danger is that it mislabels voices. It may tell the listener what Henry "thinks" when Henry's text is not in front of it. It may speak as "Chrysostom" when quoting a probably-Arian anonymous author. It may say what "the Fathers" or "Christians" hold on the strength of two Calvinists and an anthology. In a commentary app, the thing to verify is the attributed claim, not the quotation mark. "Who said this, and where?" should drive the design of every stage: the library's metadata, the Citations blocks, the grading model, the audible marking of Scripture, quotation and summary, and the persona. Audio raises the stakes, because quotation marks are invisible and a voice sounds more like a person than text does, so attribution and disclosure have to be spoken.

The second shift concerns even-handedness. For Margin it means honesty about its lens, not a claim to stand nowhere. Its library leans Calvinist and Western, and the models underneath it flatten traditions in ways that vary by task. Yet the traditions themselves supply rules that all of Margin's intended users already respect:

- Aquinas's rule that doctrine rests on the literal sense.
- Augustine's test of love.
- The Second Helvetic Confession's "modest dissent" from the Fathers.
- The Joint Declaration's "differentiated consensus."

Grounding the AI's behavior in those texts, rather than in an engineering idea of neutrality, is both more defensible and more recognizable to its listeners. The first investments are the corpus attribution repair and the 110-item test set. Both are cheap, and the test set will show whether each new model needs more scaffolding or less. The commentator persona, the feature closest to every documented failure, should ship last and only after it survives the probes that broke Father Justin.
