import { sources, dayKey } from '../domain.mjs';
import { demos } from '../demo.mjs';

const originalFetch = globalThis.fetch;
globalThis.fetch = async (value, options) => {
  const url = new URL(String(value));
  const source = sources.find((entry) => entry.domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)));
  if (!source) return originalFetch(value, options);
  if (value === source.feed) {
    const link = `https://www.${source.domains[0]}/reading/fixture-article`;
    return new Response(`<rss><channel><item><title>Science and society from ${source.name}</title><link>${link}</link><pubDate>${dayKey()}T00:00:00Z</pubDate><description>Education, research and environmental policy.</description></item></channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml' } });
  }
  return new Response(`<html><head><title>Science and society</title></head><body><article><h1>Science and society</h1>${demos[0].sentences.map((sentence) => `<p>${sentence.en}</p>`).join('')}</article></body></html>`, { headers: { 'Content-Type': 'text/html' } });
};
