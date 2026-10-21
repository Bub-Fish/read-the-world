import test from 'node:test';
import assert from 'node:assert/strict';
import { sources, dayKey, countWords, isSourceUrl, parseFeed, parseModelJson, validateGenerated, pickDaily, stripHtml, candidateScore, assertImportedText } from './domain.mjs';
import { demos } from './demo.mjs';

test('day boundary uses Asia/Shanghai rather than server timezone', () => {
  assert.equal(dayKey(new Date('2026-10-20T15:59:59Z')), '2026-10-20');
  assert.equal(dayKey(new Date('2026-10-20T16:00:00Z')), '2026-10-21');
});

test('official source validation rejects deceptive hosts, other sources and unsafe protocols', () => {
  assert.equal(isSourceUrl('https://www.theguardian.com/world/a', 'guardian'), true);
  for (const url of ['https://theguardian.com.attacker.test/a', 'https://eviltheguardian.com/a', 'https://nytimes.com/a', 'http://theguardian.com/a', 'https://user:password@theguardian.com/a', 'javascript:alert(1)']) assert.equal(isSourceUrl(url, 'guardian'), false);
});

test('RSS parsing filters stale, future, cross-domain and duplicate articles', () => {
  const items = [
    ['A useful science story', 'https://www.theguardian.com/science/a', '2026-10-20T08:00:00Z'],
    ['Duplicate', 'https://www.theguardian.com/science/a', '2026-10-20T08:00:00Z'],
    ['Old story', 'https://www.theguardian.com/science/b', '2026-09-01T08:00:00Z'],
    ['Future story', 'https://www.theguardian.com/science/c', '2026-11-01T08:00:00Z'],
    ['Unsafe source', 'https://malicious.test/a', '2026-10-20T08:00:00Z'],
  ];
  const xml = `<rss><channel>${items.map(([title, link, pubDate]) => `<item><title>${title}</title><link>${link}</link><pubDate>${pubDate}</pubDate><description><![CDATA[<p>A useful &amp; clear description.</p>]]></description></item>`).join('')}</channel></rss>`;
  const parsed = parseFeed(xml, sources.find((source) => source.id === 'guardian'), new Date('2026-10-21T00:00:00Z'));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].description, 'A useful & clear description.');
  assert.equal(parsed[0].publishedAt, '2026-10-20T08:00:00.000Z');
});

test('Atom and RDF formats preserve official links and timestamps', () => {
  const source = sources.find((entry) => entry.id === 'nature');
  const now = new Date('2026-10-21T00:00:00Z');
  const atom = '<feed><entry><title>A discovery</title><link rel="self" href="https://nature.com/id"/><link rel="alternate" href="https://www.nature.com/articles/example"/><updated>2026-10-20T12:00:00Z</updated><summary>Research</summary></entry></feed>';
  assert.equal(parseFeed(atom, source, now)[0].url, 'https://www.nature.com/articles/example');
  const rdf = '<rdf:RDF><item><title>A discovery</title><link>https://www.nature.com/articles/example</link><dc:date>2026-10-20T12:00:00Z</dc:date></item></rdf:RDF>';
  assert.equal(parseFeed(rdf, source, now).length, 1);
});

test('XML entity declarations are rejected', () => {
  assert.throws(() => parseFeed('<!DOCTYPE rss [<!ENTITY data SYSTEM "file:///secret">]><rss/>', sources[0]), /XML/);
});

test('encoded RSS HTML is decoded before removing tags and named entities', () => {
  assert.equal(stripHtml('&lt;p&gt;Science &amp; technology &amp;ndash; today&amp;rsquo;s news&lt;/p&gt;'), 'Science & technology – today’s news');
});

test('exam-oriented topics rank above celebrity and entertainment coverage', () => {
  assert.ok(candidateScore({ title: 'Climate policy and carbon conservation', description: '' }) > candidateScore({ title: 'An actress discusses a blockbuster thriller', description: '' }));
});

test('imported original text is preserved, including order and wording', () => {
  const original = demos[0].sentences.map((sentence) => sentence.en).join('\n');
  assert.doesNotThrow(() => assertImportedText(demos[0], original));
  const altered = structuredClone(demos[0]); altered.sentences[0].en = 'A different introduction.';
  assert.throws(() => assertImportedText(altered, original), /改动或遗漏/);
});

test('daily selection prioritises distinct publishers and excludes already selected URLs', () => {
  const pool = [{ id: '1', sourceId: 'guardian', url: 'a', publishedAt: '2026-10-21' }, { id: '2', sourceId: 'guardian', url: 'b', publishedAt: '2026-10-20' }, { id: '3', sourceId: 'nature', url: 'c', publishedAt: '2026-10-19' }, { id: '4', sourceId: 'atlantic', url: 'd', publishedAt: '2026-10-18' }];
  assert.deepEqual(pickDaily(pool, ['guardian', 'nature', 'atlantic']).map((entry) => entry.id), ['1', '3', '4']);
  assert.deepEqual(pickDaily(pool, ['guardian'], ['a']).map((entry) => entry.id), ['2']);
});

test('model JSON accepts fenced output and rejects truncated JSON', () => {
  assert.deepEqual(parseModelJson('```json\n{"title":"hello"}\n```'), { title: 'hello' });
  assert.throws(() => parseModelJson('{"title":'), /JSON/);
});

test('all original examples meet reading length and question evidence requirements', () => {
  for (const article of demos) {
    const validated = validateGenerated(article);
    assert.ok(validated.wordCount >= 550 && validated.wordCount <= 1000);
    assert.equal(validated.questions.length, 3);
    assert.ok(validated.minutes >= 8 && validated.minutes <= 14);
    assert.equal(article.publishedAt, null);
    assert.equal(article.origin, 'demo');
  }
});

test('generated article rejects absent vocabulary, invalid question evidence and short content', () => {
  const absentWord = structuredClone(demos[0]); absentWord.vocabulary[0].word = 'nonexistentxyz';
  assert.throws(() => validateGenerated(absentWord), /词汇/);
  const invalidEvidence = structuredClone(demos[0]); invalidEvidence.questions[0].evidence = 100;
  assert.throws(() => validateGenerated(invalidEvidence), /定位/);
  const shortArticle = structuredClone(demos[0]); shortArticle.sentences = shortArticle.sentences.slice(0, 8);
  assert.throws(() => validateGenerated(shortArticle), /精读要求/);
  assert.equal(countWords('A well-known learner’s practice.'), 4);
});
