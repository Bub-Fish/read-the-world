export async function api<ResponseType>(path: string, options?: RequestInit): Promise<ResponseType> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  } catch { throw new Error('无法连接本地服务，请确认已运行 npm run dev 或 npm start'); }
  const body = await response.json().catch(() => ({ error: '服务返回了无法识别的响应' }));
  if (!response.ok) throw new Error(body.error || `请求失败（${response.status}）`);
  return body as ResponseType;
}
export const localDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export function readLocal<ValueType>(key: string, fallback: ValueType): ValueType {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
export function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
