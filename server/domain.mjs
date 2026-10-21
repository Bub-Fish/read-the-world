import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { decodeHTML } from 'entities';

export const sources = [
  { id: 'economist', name: 'The Economist', zh: '经济学人', short: 'E', color: '#db3333', domains: ['economist.com'], feed: 'https://www.economist.com/the-world-this-week/rss.xml' },
  { id: 'guardian', name: 'The Guardian', zh: '卫报', short: 'g', color: '#183a68', domains: ['theguardian.com'], feed: 'https://www.theguardian.com/world/rss' },
  { id: 'csmonitor', name: 'The Christian Science Monitor', zh: '基督教科学箴言报', short: 'CS', color: '#176b80', domains: ['csmonitor.com'], feed: 'https://rss.csmonitor.com/feeds/all' },
  { id: 'nature', name: 'Nature', zh: '自然', short: 'n', color: '#2c6950', domains: ['nature.com'], feed: 'https://www.nature.com/nature.rss' },
  { id: 'scientificamerican', name: 'Scientific American', zh: '科学美国人', short: 'SA', color: '#28344a', domains: ['scientificamerican.com'], feed: 'https://www.scientificamerican.com/platform/syndication/rss/' },
  { id: 'atlantic', name: 'The Atlantic', zh: '大西洋月刊', short: 'A', color: '#a52d34', domains: ['theatlantic.com'], feed: 'https://www.theatlantic.com/feed/all/' },
  { id: 'nytimes', name: 'The New York Times', zh: '纽约时报', short: 'T', color: '#232323', domains: ['nytimes.com'], feed: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml' },
];

export const dayKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const countWords = (value) => (value.match(/\b[a-zA-Z]+(?:['’-][a-zA-Z]+)*\b/g) || []).length;
export const stripHtml = (value) => decodeHTML(decodeHTML(String(value ?? ''))).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function isSourceUrl(value, sourceId) {
  try {
    const url = new URL(value);
    const source = sources.find((entry) => entry.id === sourceId);
    return Boolean(source && url.protocol === 'https:' && !url.username && !url.password && source.domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)));
  } catch { return false; }
}

export function parseFeed(xml, source, now = new Date()) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('订阅源包含不支持的 XML 声明');
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(xml);
  const rawItems = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? parsed['rdf:RDF']?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const seen = new Set();
  return items.flatMap((item) => {
    const links = Array.isArray(item.link) ? item.link : [item.link];
    const link = links.find((entry) => typeof entry === 'string' || entry?.['@_rel'] === 'alternate') ?? links[0];
    const url = typeof link === 'string' ? link : link?.['@_href'];
    const title = stripHtml(typeof item.title === 'object' ? item.title['#text'] : item.title);
    const published = new Date(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']);
    const age = now.getTime() - published.getTime();
    if (!title || !isSourceUrl(url, source.id) || !Number.isFinite(age) || age < -3600000 || age > 14 * 86400000 || seen.has(url)) return [];
    if (/\b(obituary|football|soccer|horoscope|live updates|liveblog|crossword|corrections|math puzzle)\b/i.test(title)) return [];
    seen.add(url);
    return [{ id: createHash('sha256').update(url).digest('hex').slice(0, 16), title, url, sourceId: source.id, publishedAt: published.toISOString(), description: stripHtml(item.description ?? item.summary ?? '').slice(0, 300) }];
  }).slice(0, 12);
}

const sentenceSchema = z.object({ en: z.string().min(8).max(2000), zh: z.string().min(2).max(2000), paragraph: z.number().int().min(1).max(30) });
export const generatedSchema = z.object({
  title: z.string().min(2).max(100),
  titleEn: z.string().min(5).max(200),
  summary: z.string().min(8).max(200),
  category: z.enum(['环境与自然', '科技与创新', '社会与文化', '经济与商业']),
  difficulty: z.enum(['基础进阶', '考研标准', '挑战提升']),
  sentences: z.array(sentenceSchema).min(8).max(100),
  vocabulary: z.array(z.object({ word: z.string().min(2).max(60), phonetic: z.string().max(120), pos: z.string().max(40), meaning: z.string().min(2).max(160), example: z.string().min(8).max(500) })).min(8).max(15),
  questions: z.array(z.object({ question: z.string().min(8).max(500), type: z.string().min(2).max(40), options: z.array(z.string().min(1).max(400)).length(4), answer: z.number().int().min(0).max(3), explanation: z.string().min(10).max(1800), evidence: z.number().int().min(1) })).length(3),
});

export function validateGenerated(value, imported = false) {
  const article = generatedSchema.parse(value);
  const wordCount = countWords(article.sentences.map((sentence) => sentence.en).join(' '));
  if (!imported && (wordCount < 550 || wordCount > 1000)) throw new Error(`生成文章为 ${wordCount} 词，未达到 550–1000 词的精读要求，请重试`);
  if (article.questions.some((question) => question.evidence > article.sentences.length)) throw new Error('阅读题的原文定位超出文章范围，请重试');
  const body = article.sentences.map((sentence) => sentence.en).join(' ').toLowerCase();
  if (article.vocabulary.some((entry) => !body.includes(entry.word.toLowerCase()))) throw new Error('生成的词汇未全部出现在正文中，请重试');
  return { ...article, wordCount, minutes: Math.max(1, Math.round(wordCount / 70)) };
}

export function parseModelJson(content) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI 未返回有效 JSON，请检查模型是否支持结构化输出');
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { throw new Error('AI 返回的 JSON 不完整，请重试或提高模型输出上限'); }
}

export function assertImportedText(article, originalText) {
  const normalize = (text) => text.replace(/\s+/g, ' ').trim();
  if (normalize(article.sentences.map((sentence) => sentence.en).join(' ')) !== normalize(originalText)) throw new Error('模型改动或遗漏了导入的英文原文，本次结果未保存。请重试或更换模型');
}

export function candidateScore(article) {
  const material = `${article.title} ${article.description || ''}`.toLowerCase();
  const topics = /\b(climate|environment|conservation|education|learning|social|society|technology|artificial intelligence|economic|economy|science|research|energy|culture|work|cities|biodiversity|policy|innovation|carbon|water|review)\b/g;
  const relevant = new Set(material.match(topics) || []).size;
  const unsuitable = /\b(actress|actor|celebrity|puzzle|quiz|horoscope|misdiagnosed|blockbuster|thriller)\b/.test(material) ? 5 : 0;
  return Math.min(relevant, 4) - unsuitable;
}

export function pickDaily(candidates, selectedSources, excludedUrls = [], limit = 3) {
  const ordered = candidates.filter((article) => selectedSources.includes(article.sourceId) && !excludedUrls.includes(article.url)).sort((first, second) => candidateScore(second) - candidateScore(first) || new Date(second.publishedAt) - new Date(first.publishedAt));
  const picked = [];
  const used = new Set();
  for (const article of ordered) {
    if (!used.has(article.sourceId)) { picked.push(article); used.add(article.sourceId); }
    if (picked.length === limit) return picked;
  }
  for (const article of ordered) {
    if (!picked.some((entry) => entry.id === article.id)) picked.push(article);
    if (picked.length === limit) break;
  }
  return picked;
}
