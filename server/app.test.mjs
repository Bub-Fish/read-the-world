import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { demos } from './demo.mjs';

let mockServer;
let serverProcess;
let temporaryDirectory;
let baseUrl;
let mockUrl;
let mockRequests = [];
let mockStatus = 200;
let settings;
let invalidSelection = false;
let blockedSource = null;
let disconnectRequests = 0;

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'readworld-test-'));
  mockServer = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    mockRequests.push(payload);
    if (disconnectRequests > 0) { disconnectRequests--; request.socket.destroy(); return; }
    response.writeHead(mockStatus, { 'Content-Type': 'application/json' });
    let content = payload.max_tokens === 64 ? 'OK' : JSON.stringify(demos[0]);
    if (payload.messages[0].content.includes('考研英语外刊选文编辑')) {
      const pool = JSON.parse(payload.messages[1].content);
      const count = Number(payload.messages[0].content.match(/恰好选择 (\d+) 篇/)[1]);
      content = JSON.stringify({ selections: pool.slice(0, count).map((article, index) => ({ id: invalidSelection && index === 0 ? 'hallucinated-id' : article.id, reason: '论证清晰，适合考研推断与主旨训练' })) });
    } else if (payload.max_tokens !== 64 && blockedSource) {
      const material = JSON.parse(payload.messages[1].content);
      if (material.source === blockedSource) content = '{"incomplete":true}';
    }
    response.end(JSON.stringify(mockStatus === 200 ? { choices: [{ finish_reason: 'stop', message: { content } }] } : { error: 'SENSITIVE-UPSTREAM-DETAIL' }));
  });
  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
  mockUrl = `http://127.0.0.1:${mockServer.address().port}/v1`;
  const portProbe = createServer();
  await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['--import', new URL('./fixtures/publishers.mjs', import.meta.url).href, fileURLToPath(new URL('./index.mjs', import.meta.url))], { env: { ...process.env, PORT: String(port), READWORLD_DATA_DIR: temporaryDirectory, AI_API_KEY: '', NO_PROXY: '*' }, stdio: ['ignore', 'ignore', 'pipe'] });
  let startupErrors = '';
  serverProcess.stderr.on('data', (chunk) => { startupErrors = (startupErrors + chunk).slice(-3000); });
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(`${baseUrl}/api/health`); if (response.ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`Test API failed to start: ${startupErrors}`);
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    const exit = new Promise((resolve) => serverProcess.once('exit', resolve));
    serverProcess.kill();
    await exit;
  }
  if (mockServer) await new Promise((resolve) => mockServer.close(resolve));
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

const request = (route, body, method = 'POST') => fetch(`${baseUrl}/api${route}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
async function waitForJob(id) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const job = await (await fetch(`${baseUrl}/api/jobs/${id}`)).json();
    if (job.status !== 'running') return job;
    await delay(30);
  }
  throw new Error('Test generation did not complete');
}

test('library starts with complete examples, seven sources and no claimed publication date', async () => {
  const response = await fetch(`${baseUrl}/api/library`);
  const payload = await response.json();
  assert.equal(payload.articles.length, 3);
  assert.equal(payload.sources.length, 7);
  assert.equal(payload.articles.every((article) => article.origin === 'demo' && article.publishedAt === null), true);
  assert.equal(payload.settings.hasApiKey, false);
  settings = payload.settings;
});

test('generation without a configured model gives an actionable error', async () => {
  const response = await request('/generate-daily');
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /配置 AI/);
});

test('settings save keeps keys server-side and blocks external origins', async () => {
  const response = await request('/settings', { ...settings, provider: 'custom', baseUrl: mockUrl, model: 'test-model', apiKey: 'TEST-LOCAL-SECRET-1234' }, 'PUT');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.hasApiKey, true);
  assert.equal('apiKey' in payload, false);
  assert.equal(JSON.stringify(payload).includes('TEST-LOCAL-SECRET'), false);
  settings = payload;
  const blocked = await fetch(`${baseUrl}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: 'https://unrelated.example' }, body: JSON.stringify({}) });
  assert.equal(blocked.status, 403);
});

test('connection test calls the configured compatible endpoint', async () => {
  const response = await request('/test');
  assert.equal(response.status, 200);
  assert.equal(mockRequests.at(-1).model, 'test-model');
  assert.equal(mockRequests.at(-1).max_tokens, 64);
});

test('transient connection failures retry without changing provider settings', async () => {
  disconnectRequests = 1;
  const callsBefore = mockRequests.length;
  const response = await request('/test');
  assert.equal(response.status, 200);
  assert.equal(mockRequests.length, callsBefore + 2);
  assert.equal(mockRequests.at(-1).model, 'test-model');
});

test('import rejects a misleading source domain', async () => {
  const response = await request('/import', { title: 'Test reading', sourceId: 'guardian', url: 'https://www.theguardian.com.attacker.example/a', text: demos[0].sentences.map((sentence) => sentence.en).join(' ') });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /官方域名/);
});

test('import generation saves translated content, three questions and honest provenance', async () => {
  const originalText = demos[0].sentences.map((sentence) => sentence.en).join(' ');
  const response = await request('/import', { title: 'User supplied reading', sourceId: 'guardian', url: 'https://www.theguardian.com/environment/test-reading', text: originalText });
  assert.equal(response.status, 202);
  const started = await response.json();
  let job;
  for (let attempt = 0; attempt < 50; attempt++) {
    job = await (await fetch(`${baseUrl}/api/jobs/${started.id}`)).json();
    if (job.status !== 'running') break;
    await delay(50);
  }
  assert.equal(job.status, 'complete');
  const library = await (await fetch(`${baseUrl}/api/library`)).json();
  const article = library.articles.find((entry) => entry.id === job.articleIds[0]);
  assert.equal(article.origin, 'imported');
  assert.equal(article.questions.length, 3);
  assert.equal(article.publishedAt, null);
  assert.equal(article.sourceTitle, 'User supplied reading');
  assert.equal(article.sentences.map((sentence) => sentence.en).join(' '), originalText);
  assert.equal(library.articles.length, 4);
});

test('upstream failures are explained without leaking upstream body', async () => {
  mockStatus = 401;
  const response = await request('/test');
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.match(text, /API Key 无效/);
  assert.equal(text.includes('SENSITIVE-UPSTREAM-DETAIL'), false);
  mockStatus = 200;
});

test('daily acquisition refuses model-invented articles without saving fabricated results', async () => {
  invalidSelection = true;
  const previous = await (await fetch(`${baseUrl}/api/library`)).json();
  const response = await request('/generate-daily');
  assert.equal(response.status, 202);
  const started = await response.json();
  assert.equal(started.phase, 'fetching');
  const finished = await waitForJob(started.id);
  assert.equal(finished.status, 'failed');
  assert.match(finished.errors[0].message, /无效或重复/);
  const library = await (await fetch(`${baseUrl}/api/library`)).json();
  assert.equal(library.articles.length, previous.articles.length);
  invalidSelection = false;
});

test('daily pipeline uses the configured model, reads public sources and preserves partial successes', async () => {
  blockedSource = 'guardian';
  const response = await request('/generate-daily');
  const started = await response.json();
  const duplicate = await (await request('/generate-daily')).json();
  assert.equal(duplicate.id, started.id);
  const finished = await waitForJob(started.id);
  assert.equal(finished.status, 'partial');
  assert.equal(finished.articleIds.length, 2);
  const library = await (await fetch(`${baseUrl}/api/library`)).json();
  assert.equal(library.daily[library.today].length, 2);
  for (const id of finished.articleIds) {
    const article = library.articles.find((entry) => entry.id === id);
    assert.equal(article.sourceMaterial.status, 'public-text');
    assert.equal(article.sourceMaterial.wordCount, demos[0].wordCount);
    assert.equal('text' in article.sourceMaterial, false);
    assert.ok(article.selectionReason);
    assert.equal(article.model, 'test-model');
  }
  assert.ok(mockRequests.some((payload) => payload.max_tokens === 1800));
  assert.ok(mockRequests.some((payload) => payload.max_tokens !== 64 && payload.messages[1].content.includes('publicSourceText')));
  blockedSource = null;
});

test('retry only fills missing daily slots and completed days do not spend more tokens', async () => {
  const started = await (await request('/generate-daily')).json();
  assert.equal(started.total, 1);
  const finished = await waitForJob(started.id);
  assert.equal(finished.status, 'complete');
  assert.equal(finished.articleIds.length, 1);
  const library = await (await fetch(`${baseUrl}/api/library`)).json();
  assert.equal(library.daily[library.today].length, 3);
  assert.equal(new Set(library.daily[library.today].map((id) => library.articles.find((article) => article.id === id).sourceUrl)).size, 3);
  const callsBefore = mockRequests.length;
  const repeated = await (await request('/generate-daily')).json();
  assert.equal(repeated.alreadyExists, true);
  assert.equal(repeated.articleIds.length, 3);
  assert.equal(mockRequests.length, callsBefore);
});

test('settings support intentional key deletion', async () => {
  const response = await request('/settings', { ...settings, apiKey: '', clearKey: true }, 'PUT');
  assert.equal((await response.json()).hasApiKey, false);
});
