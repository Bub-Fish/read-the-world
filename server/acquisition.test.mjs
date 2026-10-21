import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireSourceMaterial, extractPublicArticle, fetchPublisherText, selectWithModel } from './acquisition.mjs';
import { parseWindowsProxy, bypassProxy } from './network.mjs';
import { demos } from './demo.mjs';

const html = `<html><head><title>A public article</title></head><body><article><h1>A public article</h1>${demos[0].sentences.map((sentence) => `<p>${sentence.en}</p>`).join('')}</article></body></html>`;
const seed = { url: 'https://www.theguardian.com/environment/public-article', sourceId: 'guardian', title: 'A public article' };

test('article acquisition extracts public paragraphs without executing page scripts', () => {
  const material = extractPublicArticle(html.replace('</head>', '<script>throw new Error("Do not execute")</script></head>'), seed.url);
  assert.equal(material.status, 'public-text');
  assert.equal(material.wordCount, demos[0].wordCount);
  assert.ok(material.text.includes(demos[0].sentences[0].en));
});

test('subscription metadata causes honest RSS fallback rather than full-text extraction', () => {
  const paywalled = html.replace('</head>', '<script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","isAccessibleForFree":false}]}</script></head>');
  const material = extractPublicArticle(paywalled, seed.url);
  assert.equal(material.status, 'rss-only');
  assert.equal(material.text, '');
  assert.match(material.reason, /订阅/);
});

test('publisher requests block off-domain redirects before making another request', async () => {
  let calls = 0;
  await assert.rejects(fetchPublisherText(seed.url, seed.sourceId, { fetcher: async () => { calls++; return new Response(null, { status: 302, headers: { location: 'https://unrelated.example/private' } }); } }), /官方域名/);
  assert.equal(calls, 1);
});

test('publisher requests follow same-publisher HTTPS redirects', async () => {
  const seen = [];
  const response = await fetchPublisherText(seed.url, seed.sourceId, { fetcher: async (url) => { seen.push(url); return seen.length === 1 ? new Response(null, { status: 301, headers: { location: '/environment/redirected' } }) : new Response(html, { headers: { 'Content-Type': 'text/html' } }); } });
  assert.equal(seen.length, 2);
  assert.equal(response.url, 'https://www.theguardian.com/environment/redirected');
});

test('streaming size limits apply even when content-length is absent', async () => {
  await assert.rejects(fetchPublisherText(seed.url, seed.sourceId, { maxBytes: 10, fetcher: async () => new Response('a'.repeat(20)) }), /大小限制/);
});

test('unavailable pages retain provenance and never claim a successfully fetched body', async () => {
  const material = await acquireSourceMaterial(seed, { fetcher: async () => new Response('Unavailable', { status: 403 }) });
  assert.equal(material.status, 'rss-only');
  assert.equal(material.text, '');
  assert.equal(material.url, seed.url);
  assert.ok(material.retrievedAt);
  assert.match(material.reason, /403/);
});

const candidates = ['guardian', 'nature', 'atlantic'].map((sourceId, index) => ({ id: `item-${index}`, title: `Article ${index}`, sourceId, url: `https://example.org/${index}`, publishedAt: '2026-10-21', description: 'Research, society and learning.' }));

test('the connected model selects only supplied article IDs and gives reasons', async () => {
  let modelInput;
  const selected = await selectWithModel(candidates, { today: '2026-10-21', complete: async (messages) => { modelInput = JSON.parse(messages[1].content); return JSON.stringify({ selections: modelInput.map((article) => ({ id: article.id, reason: '适合分析论证和推断训练' })) }); } });
  assert.equal(selected.length, 3);
  assert.equal(modelInput.length, 3);
  assert.equal(selected[0].url, candidates[0].url);
  assert.ok(selected.every((article) => article.selectionReason));
});

test('model-invented or repeated article IDs fail closed', async () => {
  for (const ids of [['invented', 'item-1', 'item-2'], ['item-0', 'item-0', 'item-2']]) {
    await assert.rejects(selectWithModel(candidates, { today: '2026-10-21', complete: async () => JSON.stringify({ selections: ids.map((id) => ({ id, reason: '测试选择理由' })) }) }), /无效或重复/);
  }
});

test('selection enforces source preferences and recent-article deduplication before calling AI', async () => {
  let called = false;
  await assert.rejects(selectWithModel(candidates, { today: '2026-10-21', count: 3, selectedSources: ['guardian'], complete: async () => { called = true; } }), /不足/);
  await assert.rejects(selectWithModel(candidates, { today: '2026-10-21', count: 3, excludedUrls: [candidates[0].url], complete: async () => { called = true; } }), /不足/);
  assert.equal(called, false);
});

test('Windows proxy detection supports common and protocol-specific proxy formats', () => {
  assert.equal(parseWindowsProxy('127.0.0.1:10809'), 'http://127.0.0.1:10809/');
  assert.equal(parseWindowsProxy('http=127.0.0.1:8080;https=127.0.0.1:8081'), 'http://127.0.0.1:8081/');
  assert.equal(parseWindowsProxy('socks=127.0.0.1:1080'), null);
});

test('local model endpoints bypass the inherited proxy', () => {
  assert.equal(bypassProxy('http://127.0.0.1:11434/v1'), true);
  assert.equal(bypassProxy('http://[::1]:11434/v1'), true);
  assert.equal(bypassProxy('https://api.service.test/v1'), false);
  assert.equal(bypassProxy('https://api.service.test/v1', '.service.test'), true);
  assert.equal(bypassProxy('https://api.service.test/v1', 'unrelated.test'), false);
});
