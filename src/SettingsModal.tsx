import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Eye, EyeOff, Check, Loader2, PlugZap } from 'lucide-react';
import { api } from './api';
import type { Settings, Source } from './types';

const presets = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'glm', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { id: 'custom', name: '自定义 / 本地', baseUrl: 'http://127.0.0.1:11434/v1', model: '' },
];

export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    container.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const elements = container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={container}>
      <div className="modal-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={21} /></button></div>
      {children}
    </div>
  </div>;
}

export function SettingsModal({ settings, sources, onClose, onSave }: { settings: Settings; sources: Source[]; onClose: () => void; onSave: (settings: Settings) => void }) {
  const [draft, setDraft] = useState({ ...settings, apiKey: '' });
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [clearKey, setClearKey] = useState(false);
  const [savedSettings, setSavedSettings] = useState(settings);
  async function save(test: boolean) {
    setBusy(test ? 'test' : 'save'); setMessage(null);
    try {
      const result = await api<Settings>('/settings', { method: 'PUT', body: JSON.stringify({ ...draft, clearKey: clearKey && !draft.apiKey.trim() }) });
      onSave(result); setSavedSettings(result); setDraft({ ...result, apiKey: '' }); setClearKey(false);
      if (test) await api('/test', { method: 'POST' });
      setMessage({ text: test ? '连接成功，模型已准备好。可以开始生成精读了。' : '设置已保存。', ok: true });
    } catch (error) { setMessage({ text: (error as Error).message, ok: false }); }
    finally { setBusy(''); }
  }
  return <Modal title="让 AI 成为你的精读助教" subtitle="连接你自己的模型，自动生成逐句翻译、核心词汇与阅读题。" onClose={onClose}>
    <div className="settings-section-label"><PlugZap size={16} /> 模型连接</div>
    <div className="provider-grid">{presets.map((preset) => <button key={preset.id} className={`provider-option ${draft.provider === preset.id ? 'selected' : ''}`} onClick={() => { setDraft({ ...draft, provider: preset.id, baseUrl: preset.baseUrl, model: preset.model, apiKey: '' }); setClearKey(draft.provider !== preset.id || clearKey); setMessage(null); }}><span>{preset.name}</span>{draft.provider === preset.id && <Check size={14} />}</button>)}</div>
    <label className="field">接口地址 <span>Base URL</span><input type="url" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://your-api.example/v1" /></label>
    <div className="two-fields"><label className="field">模型名称<input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="填写服务商提供的模型 ID" /></label><label className="field">API Key <span>{savedSettings.hasApiKey && !clearKey ? savedSettings.keyHint : '必填；本地可填 local'}</span><div className="input-with-action"><input autoComplete="new-password" type={showKey ? 'text' : 'password'} value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} placeholder={savedSettings.hasApiKey && !clearKey ? '留空保留已保存的 Key' : '输入你的 API Key'} /><button type="button" className="icon-button" aria-label={showKey ? '隐藏 API Key' : '显示 API Key'} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label></div>
    {savedSettings.hasApiKey && <label className="checkbox-line"><input type="checkbox" checked={clearKey} onChange={(event) => setClearKey(event.target.checked)} />清除已保存的 API Key（填写新 Key 时替换）</label>}
    <p className="field-hint">Key 仅保存在本机服务端，不返回浏览器。模型名称以服务商实际可用版本为准，支持兼容 Chat Completions 的接口。</p>
    <div className="settings-divider" />
    <div className="settings-section-label"><Sparkles size={16} /> 每日阅读计划</div>
    <div className="switch-row"><div><strong>每天自动准备 3 篇精读</strong><p>北京时间 <select aria-label="自动生成时间" value={draft.generationHour} onChange={(event) => setDraft({ ...draft, generationHour: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select> 后生成，优先覆盖不同媒体</p></div><button role="switch" aria-checked={draft.autoGenerate} aria-label="每天自动生成" className={`switch ${draft.autoGenerate ? 'on' : ''}`} onClick={() => setDraft({ ...draft, autoGenerate: !draft.autoGenerate })}><span /></button></div>
    <p className="field-hint">自动任务需要本地服务保持运行；错过时间会在下次启动时补做。当天完成三篇后不重复生成，失败后可手动重试。</p>
    <span className="field-title">选题来源 <small>至少选择一家</small></span>
    <div className="source-checkboxes">{sources.map((source) => <label key={source.id}><input type="checkbox" checked={draft.selectedSources.includes(source.id)} onChange={(event) => setDraft({ ...draft, selectedSources: event.target.checked ? [...draft.selectedSources, source.id] : draft.selectedSources.filter((id) => id !== source.id) })} />{source.zh}</label>)}</div>
    <details className="advanced-settings"><summary>高级选项</summary><label className="checkbox-line"><input type="checkbox" checked={draft.jsonMode} onChange={(event) => setDraft({ ...draft, jsonMode: event.target.checked })} />使用 JSON 输出模式（模型不支持时可关闭）</label><label className="field">最大输出 Token<input type="number" min={4000} max={24000} step={1000} value={draft.maxTokens} onChange={(event) => setDraft({ ...draft, maxTokens: Number(event.target.value) })} /></label></details>
    {message && <div className={`inline-message ${message.ok ? 'success' : 'error'}`} role="status">{message.ok && <Check size={16} />}{message.text}</div>}
    <div className="modal-footer"><span className="muted">生成会消耗你的模型额度</span><button className="button secondary" disabled={Boolean(busy) || !draft.selectedSources.length} onClick={() => save(false)}>{busy === 'save' && <Loader2 className="spin" size={16} />}保存设置</button><button className="button primary" disabled={Boolean(busy) || !draft.selectedSources.length || !draft.model.trim()} onClick={() => save(true)}>{busy === 'test' ? <Loader2 className="spin" size={16} /> : <PlugZap size={16} />}保存并测试</button></div>
  </Modal>;
}

export function ImportModal({ sources, onClose, onSubmit }: { sources: Source[]; onClose: () => void; onSubmit: (body: { sourceId: string; title: string; url: string; text: string }) => Promise<void> }) {
  const [form, setForm] = useState({ sourceId: sources[0]?.id || '', title: '', url: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Modal title="导入一篇，读透一篇" subtitle="粘贴你可合法使用的英文正文，AI 将保留原文并生成逐句翻译和练习。" onClose={onClose}>
    <form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit(form); onClose(); } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); } }}>
      <div className="two-fields"><label className="field">文章标题<input required minLength={3} maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="输入英文原文标题" /></label><label className="field">文章来源<select value={form.sourceId} onChange={(event) => setForm({ ...form, sourceId: event.target.value })}>{sources.map((source) => <option key={source.id} value={source.id}>{source.zh}</option>)}</select></label></div>
      <label className="field">原文链接<input type="url" required value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="所选媒体的官方 HTTPS 链接" /></label>
      <label className="field">英文正文<textarea required minLength={300} maxLength={30000} rows={10} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="在这里粘贴英文正文，建议 550–1000 词，适合约 10 分钟精读……" /></label>
      <p className="field-hint">不会自动提取付费全文。你提供的正文会发送给已配置的 AI 服务，请确认你可以使用这些内容。</p>
      {error && <div className="inline-message error" role="alert">{error}</div>}
      <div className="modal-footer"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" disabled={busy} type="submit">{busy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}生成精读</button></div>
    </form>
  </Modal>;
}
