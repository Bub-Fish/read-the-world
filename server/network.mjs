import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetch as proxyFetch, ProxyAgent } from 'undici';

export function parseWindowsProxy(value, protocol = 'https:') {
  const entries = value.trim().split(';').map((entry) => entry.trim()).filter(Boolean);
  const mapping = Object.fromEntries(entries.filter((entry) => entry.includes('=')).map((entry) => { const separator = entry.indexOf('='); return [entry.slice(0, separator).toLowerCase(), entry.slice(separator + 1)]; }));
  const address = mapping[protocol.replace(':', '')] || mapping.http || entries.find((entry) => !entry.includes('='));
  if (!address) return null;
  try {
    const parsed = new URL(address.includes('://') ? address : `http://${address}`);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}

export function bypassProxy(value, noProxy = '') {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.localhost')) return true;
  return noProxy.split(',').some((rule) => {
    const entry = rule.trim().toLowerCase();
    if (!entry) return false;
    if (entry === '*') return true;
    const [host, port] = entry.split(':');
    if (port && port !== (url.port || (url.protocol === 'https:' ? '443' : '80'))) return false;
    const domain = host.replace(/^\*?\./, '');
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });
}

async function systemProxy() {
  if (process.platform !== 'win32') return null;
  try {
    const { stdout } = await promisify(execFile)('reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], { windowsHide: true, timeout: 3000, maxBuffer: 128000 });
    if (!/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(stdout)) return null;
    const value = stdout.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/i)?.[1];
    return value ? parseWindowsProxy(value) : null;
  } catch { return null; }
}

const inheritedProxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
const proxyUrl = inheritedProxy || await systemProxy();
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;

export function networkFetch(url, options = {}) {
  const proxy = dispatcher && !bypassProxy(String(url), process.env.NO_PROXY || process.env.no_proxy || '');
  return proxy ? proxyFetch(url, { ...options, dispatcher }) : fetch(url, options);
}
