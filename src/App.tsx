import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookA, BookOpen, Bookmark, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Coffee, ExternalLink, FileText, Flame, Globe2, GraduationCap, LayoutGrid, LibraryBig, ListFilter, Loader2, Menu, Moon, RefreshCw, Search, Settings2, Sparkles, Sun, Target, TrendingUp, Upload, X } from 'lucide-react';
import { api, localDay, readLocal, saveLocal } from './api';
import type { Article, Feed, Job, LearningState, LibraryResponse, News, ReadingProgress, SavedWord, Source, Word } from './types';
import { ArticleIllustration, HeroIllustration } from './Illustrations';
import { ImportModal, Modal, SettingsModal } from './SettingsModal';
import { Reader } from './Reader';

const emptyLearning: LearningState = { progress: {}, bookmarks: [], words: [], dailySeconds: {} };
const emptyProgress = (): ReadingProgress => ({ seconds: 0, answers: [-1, -1, -1], submitted: false });
const navigation = [{ id: 'today', title: '今日精读', icon: LayoutGrid }, { id: 'library', title: '文章书架', icon: LibraryBig }, { id: 'vocabulary', title: '我的生词本', icon: BookA }, { id: 'history', title: '学习记录', icon: TrendingUp }];
const categories = ['全部', '环境与自然', '科技与创新', '社会与文化', '经济与商业'];

function currentRoute() { return decodeURIComponent(window.location.hash.slice(1) || 'today'); }

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [error, setError] = useState('');
  const [learning, setLearning] = useState<LearningState>(() => readLocal('readworld-learning-v1', emptyLearning));
  const [theme, setTheme] = useState(() => readLocal('readworld-theme', 'light'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [category, setCategory] = useState('全部');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [shelfFilter, setShelfFilter] = useState('all');
  const [contentTab, setContentTab] = useState('reading');
  const [sort, setSort] = useState('recommended');
  const [wordFilter, setWordFilter] = useState('all');
  const [revealWords, setRevealWords] = useState(true);
  const saveTimer = useRef<number | undefined>(undefined);
  const learningRef = useRef(learning);
  learningRef.current = learning;
  const activeArticle = data?.articles.find((article) => route === `read/${article.id}`);
  const today = data?.today || localDay();
  const generating = job?.status === 'running' || starting;

  const loadLibrary = useCallback(async () => {
    const result = await api<LibraryResponse>('/library');
    setData(result); setError('');
    if (result.activeJob) setJob(result.activeJob);
    return result;
  }, []);
  const loadFeed = useCallback(async (refresh = false) => {
    setFeedLoading(true); setFeedError('');
    try { setFeed(await api<Feed>(`/feed${refresh ? '?refresh=true' : ''}`)); }
    catch (caught) { setFeedError((caught as Error).message); }
    finally { setFeedLoading(false); }
  }, []);

  useEffect(() => { void loadLibrary().catch((caught) => setError(caught.message)); }, [loadLibrary]);
  useEffect(() => { void loadFeed(); }, [loadFeed]);
  useEffect(() => {
    const update = () => { setRoute(currentRoute()); setMobileOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveLocal('readworld-theme', theme);
  }, [theme]);
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveLocal('readworld-learning-v1', learning), 300);
    return () => window.clearTimeout(saveTimer.current);
  }, [learning]);
  useEffect(() => {
    const flush = () => saveLocal('readworld-learning-v1', learningRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (!activeArticle) return;
    let lastActivity = Date.now();
    const touch = () => { lastActivity = Date.now(); };
    window.addEventListener('pointermove', touch); window.addEventListener('keydown', touch); window.addEventListener('scroll', touch);
    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() - lastActivity > 120000) return;
      setLearning((previous) => {
        const progress = previous.progress[activeArticle.id] || emptyProgress();
        const day = localDay();
        return { ...previous, progress: { ...previous.progress, [activeArticle.id]: { ...progress, seconds: progress.seconds + 1 } }, dailySeconds: { ...previous.dailySeconds, [day]: (previous.dailySeconds[day] || 0) + 1 } };
      });
    }, 1000);
    return () => { clearInterval(timer); window.removeEventListener('pointermove', touch); window.removeEventListener('keydown', touch); window.removeEventListener('scroll', touch); };
  }, [activeArticle?.id]);
  useEffect(() => {
    if (!job?.id || job.status !== 'running') return;
    let stopped = false;
    let timeout: number;
    let lastCompleted = job.completed;
    let consecutiveErrors = 0;
    const poll = async () => {
      try {
        const next = await api<Job>(`/jobs/${job.id}`);
        if (stopped) return;
        consecutiveErrors = 0; setJob(next);
        if (next.completed !== lastCompleted || next.status !== 'running') { lastCompleted = next.completed; await loadLibrary(); }
        if (next.status !== 'running') {
          setToast(next.status === 'complete' ? `精读准备好了！新增 ${next.articleIds.length} 篇文章。` : next.errors[0]?.message || '部分生成未完成，请重试');
          return;
        }
      } catch (caught) {
        if (stopped) return;
        consecutiveErrors++;
        if (consecutiveErrors >= 3) { setJob((previous) => previous ? { ...previous, status: 'failed' } : previous); setToast((caught as Error).message); return; }
      }
      if (!stopped) timeout = window.setTimeout(poll, 2500);
    };
    timeout = window.setTimeout(poll, 1500);
    return () => { stopped = true; window.clearTimeout(timeout); };
  }, [job?.id, job?.status, loadLibrary]);
  useEffect(() => {
    const refreshDate = window.setInterval(() => { if (localDay() !== today) void loadLibrary().catch(() => {}); }, 60000);
    return () => window.clearInterval(refreshDate);
  }, [today, loadLibrary]);

  function navigate(next: string) {
    if (route === next) { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileOpen(false); }
    else window.location.hash = next;
    setSearch(''); setCategory('全部'); setSourceFilter('all');
  }
  function bookmark(id: string) {
    setLearning((previous) => ({ ...previous, bookmarks: previous.bookmarks.includes(id) ? previous.bookmarks.filter((savedId) => savedId !== id) : [...previous.bookmarks, id] }));
  }
  function toggleWord(word: Word, articleId: string) {
    setLearning((previous) => {
      const existing = previous.words.some((entry) => entry.word.toLowerCase() === word.word.toLowerCase());
      return { ...previous, words: existing ? previous.words.filter((entry) => entry.word.toLowerCase() !== word.word.toLowerCase()) : [{ ...word, articleId, savedAt: new Date().toISOString(), mastered: false }, ...previous.words] };
    });
  }
  function updateProgress(id: string, update: Partial<ReadingProgress>) {
    setLearning((previous) => ({ ...previous, progress: { ...previous.progress, [id]: { ...(previous.progress[id] || emptyProgress()), ...update } } }));
  }
  function completeReading(id: string) {
    const alreadyCompleted = Boolean(learning.progress[id]?.completedAt);
    if (!alreadyCompleted) updateProgress(id, { completedAt: new Date().toISOString() });
    setToast(alreadyCompleted ? '这篇已经读完了，再读一次也会有新收获。' : '又读懂了一点世界。今天的积累，已为你记下。');
    navigate('today');
  }
  async function generate(news?: News) {
    if (!data?.settings.hasApiKey) { setSettingsOpen(true); setToast('先连接你的 AI 服务，就能准备专属精读。'); return; }
    if (generating) { setToast('正在准备文章，请稍等片刻。'); return; }
    setStarting(true);
    try {
      const result = await api<Job>(news ? '/generate' : '/generate-daily', { method: 'POST', body: JSON.stringify(news ? { id: news.id } : {}) });
      setJob(result);
      if (result.status === 'complete') { await loadLibrary(); setToast(result.alreadyExists ? '文章已经在书架中，可以开始阅读。' : '精读准备好了。'); if (news && result.articleIds[0]) navigate(`read/${result.articleIds[0]}`); }
    } catch (caught) { setToast((caught as Error).message); }
    finally { setStarting(false); }
  }
  const stats = useMemo(() => {
    const completed = Object.values(learning.progress).filter((progress) => progress.completedAt);
    const days = new Set(completed.map((progress) => localDay(new Date(progress.completedAt!))));
    let streak = 0;
    const cursor = new Date(`${today}T12:00:00+08:00`);
    if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(localDay(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return { readToday: completed.filter((progress) => localDay(new Date(progress.completedAt!)) === today).length, minutes: Math.floor((learning.dailySeconds[today] || 0) / 60), words: learning.words.length, streak, totalRead: completed.length };
  }, [learning, today]);

  if (!data) return <div className="startup-screen"><div className="logo-symbol"><BookOpen size={26} /></div><h1>阅见</h1><p>{error || '为你打开一扇看世界的窗……'}</p>{error ? <button className="button primary" onClick={() => { setError(''); void loadLibrary().catch((caught) => setError(caught.message)); }}>重新连接</button> : <Loader2 className="spin" size={22} />}</div>;

  const sourceById = (id: string) => data.sources.find((source) => source.id === id)!;
  const dailyIds = data.daily[today] || [];
  const todayArticles = [...data.articles.filter((article) => dailyIds.includes(article.id)), ...data.articles.filter((article) => article.origin === 'demo')].slice(0, 3);
  const sectionName = activeArticle ? '文章精读' : navigation.find((item) => item.id === route)?.title || '今日精读';
  const isLibrary = route === 'library';
  const visibleArticles = (isLibrary ? data.articles : todayArticles).filter((article) => (category === '全部' || article.category === category) && (sourceFilter === 'all' || article.sourceId === sourceFilter) && (!isLibrary || shelfFilter !== 'saved' || learning.bookmarks.includes(article.id)) && (!isLibrary || shelfFilter !== 'unread' || !learning.progress[article.id]?.completedAt) && (!search || `${article.title} ${article.titleEn} ${article.summary}`.toLowerCase().includes(search.toLowerCase()))).sort((first, second) => sort === 'newest' ? new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime() : sort === 'shortest' ? first.wordCount - second.wordCount : 0);
  const visibleNews = (feed?.articles || []).filter((news) => (sourceFilter === 'all' || news.sourceId === sourceFilter) && (!search || `${news.title} ${news.description}`.toLowerCase().includes(search.toLowerCase())));
  const date = new Date(`${today}T12:00:00+08:00`);
  const dateLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' }).format(date);

  return <div className="app-shell">
    {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <button className="brand" onClick={() => navigate('today')} aria-label="阅见首页"><span className="logo-symbol"><BookOpen size={25} strokeWidth={1.8} /></span><span className="brand-wordmark">阅见<small>READ THE WORLD</small></span></button>
      <div className="sidebar-caption">你的每日阅读空间</div>
      <nav className="main-nav" aria-label="主导航">{navigation.map((item) => <button key={item.id} className={(route === item.id || (activeArticle && item.id === 'today')) ? 'active' : ''} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.7} /><span>{item.title}</span>{item.id === 'today' ? <span className="nav-count">3</span> : item.id === 'vocabulary' && learning.words.length > 0 ? <span className="nav-subcount">{learning.words.length}</span> : null}</button>)}</nav>
      <div className="sidebar-note"><div className="note-plant"><span /><span /><span /><span /></div><span className="eyebrow">A LITTLE, EVERY DAY</span><h3>每天 30 分钟，<br />让积累，悄悄发生。</h3><p>不必一下子读懂世界，<br />每天，比昨天多懂一点。</p><div className="note-dots"><span className={stats.readToday > 0 ? 'filled' : ''} /><span className={stats.readToday > 1 ? 'filled' : ''} /><span className={stats.readToday > 2 ? 'filled' : ''} /></div></div>
      <div className="sidebar-bottom"><button className="sidebar-settings" onClick={() => setSettingsOpen(true)}><Settings2 size={18} />AI 与阅读设置<ChevronRight size={15} /></button><div className="user-profile"><div className="avatar">研</div><div><strong>一直在进步的你</strong><span>保持热爱，保持阅读</span></div><span className="online-dot" /></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="打开导航"><Menu size={21} /></button><span>学习空间</span><ChevronRight size={13} /><strong>{sectionName}</strong></div><div className="topbar-actions"><button className={`ai-status ${data.settings.hasApiKey ? 'connected' : ''}`} onClick={() => setSettingsOpen(true)}><span />AI {data.settings.hasApiKey ? '已配置' : '待连接'}<ChevronDown size={13} /></button><span className="topbar-divider" /><button className="icon-button" aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="icon-button" onClick={() => setHelpOpen(true)} aria-label="使用指南"><GraduationCap size={20} /></button><div className="topbar-avatar">S</div></div></header>
    <div className={`main-content ${activeArticle ? 'reading-width' : ''}`}>
      {job?.status === 'running' && <div className="generation-banner" role="status"><Loader2 className="spin" size={18} /><div><strong>精读助教正在备课 <span>{job.completed} / {job.total}</span></strong><p>{job.currentTitle || '正在挑选适合你的近期文章……'}</p></div><span>通常需要 1–3 分钟 / 篇</span></div>}
      {job && ['failed', 'partial'].includes(job.status) && <div className="job-error-banner" role="alert"><div><strong>{job.status === 'partial' ? `已保存 ${job.articleIds.length} 篇，其余生成未完成` : '这次生成未完成'}</strong><p>{job.errors[0]?.message || '请检查网络与 AI 配置后重试'}</p></div><button className="text-button" onClick={() => setJob(null)} aria-label="关闭任务提示"><X size={17} /></button></div>}
      {activeArticle ? <Reader key={activeArticle.id} article={activeArticle} source={sourceById(activeArticle.sourceId)} progress={learning.progress[activeArticle.id] || emptyProgress()} bookmarked={learning.bookmarks.includes(activeArticle.id)} words={learning.words} onBack={() => navigate('today')} onBookmark={() => bookmark(activeArticle.id)} onWord={(word) => toggleWord(word, activeArticle.id)} onProgress={(update) => updateProgress(activeArticle.id, update)} onComplete={() => completeReading(activeArticle.id)} /> : route === 'vocabulary' ? <VocabularyPage words={learning.words} articles={data.articles} filter={wordFilter} setFilter={setWordFilter} reveal={revealWords} setReveal={setRevealWords} search={search} setSearch={setSearch} onOpen={(id) => navigate(`read/${id}`)} onToggleMastered={(word) => setLearning((previous) => ({ ...previous, words: previous.words.map((entry) => entry.word === word ? { ...entry, mastered: !entry.mastered } : entry) }))} onRemove={(word) => setLearning((previous) => ({ ...previous, words: previous.words.filter((entry) => entry.word !== word) }))} /> : route === 'history' ? <HistoryPage articles={data.articles} learning={learning} stats={stats} today={today} onOpen={(id) => navigate(`read/${id}`)} /> : <>
        {!isLibrary && <><div className="welcome-line"><span><span className="greeting-dot" />让阅读，成为日常。</span><span><CalendarDays size={14} />{dateLabel}</span></div>
        <section className="hero"><div className="hero-copy"><span className="hero-eyebrow"><span />HELLO, A WIDER WORLD</span><h1>把世界读懂，<br />把英语<span>读透。</span></h1><p>每天 3 篇英文精读，在字句之间，<br className="hero-break" />积累词汇、训练思考，遇见更大的世界。</p><div className="hero-bottom"><button className="button primary" onClick={() => { if (todayArticles[0]) navigate(`read/${todayArticles[0].id}`); }}>开始今日阅读<ArrowRight size={17} /></button><span><Clock3 size={14} />每天约 30 分钟</span></div></div><HeroIllustration /><span className="hero-side-label">STAY CURIOUS. KEEP READING.</span></section>
        <div className="stats-grid"><StatCard icon={<BookOpen size={19} />} color="blue" title="今日已读" value={stats.readToday} suffix="/ 3 篇" caption={stats.readToday >= 3 ? '今天的目标，达成！' : '每一篇，都是一点进步'}><div className="mini-progress">{[0, 1, 2].map((index) => <i key={index} className={stats.readToday > index ? 'filled' : ''} />)}</div></StatCard><StatCard icon={<Clock3 size={19} />} color="amber" title="今日专注" value={stats.minutes} suffix="分钟" caption="留一点时间，给深度思考"><svg className="mini-line" viewBox="0 0 62 28"><path d="m2 23 10-6 8 3 11-12 9 5 10-9 10 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></StatCard><StatCard icon={<BookA size={19} />} color="green" title="累计词汇" value={stats.words} suffix="个" caption="把遇见，变成自己的"><span className="stat-decoration">Aa</span></StatCard><StatCard icon={<Flame size={19} />} color="purple" title="连续学习" value={stats.streak} suffix="天" caption={stats.streak ? '保持节奏，好事正在发生' : '今天，就是很好的开始'}><div className="mini-bars">{[8, 15, 11, 22, 17, 27].map((height, index) => <i style={{ height }} key={index} />)}</div></StatCard></div></>}
        {isLibrary ? <div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL READING SHELF</span><h1>每一篇，都值得细读。</h1><p>把读过的世界，慢慢变成自己的见识。</p></div><button className="button secondary" onClick={() => data.settings.hasApiKey ? setImportOpen(true) : setSettingsOpen(true)}><Upload size={16} />导入文章</button></div> : null}
        <section className="daily-section"><div className="section-heading"><div><h2>{isLibrary ? '我的文章书架' : '今天，读点不一样的'}<span>{isLibrary ? data.articles.length : 'DAILY PICKS'}</span></h2><p>{isLibrary ? '精读、收藏、回顾，让好内容陪你走得更远。' : '精选全球优质外刊选题，与更大的世界对话。'}</p></div><div className="section-actions"><button className="button quiet" disabled={feedLoading} onClick={() => { setContentTab('news'); void loadFeed(true); }}><RefreshCw size={15} className={feedLoading ? 'spin' : ''} />更新选题</button><button className="button primary small" disabled={generating} onClick={() => void generate()}>{generating ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}AI 生成今日精读</button></div></div>
        <div className="content-navigation"><div className="content-tabs">{isLibrary ? [{ id: 'all', label: '全部文章', count: data.articles.length }, { id: 'saved', label: '我的收藏', count: learning.bookmarks.length }, { id: 'unread', label: '待阅读', count: data.articles.filter((article) => !learning.progress[article.id]?.completedAt).length }].map((item) => <button key={item.id} className={shelfFilter === item.id ? 'active' : ''} onClick={() => setShelfFilter(item.id)}>{item.label}<span>{item.count}</span></button>) : <><button className={contentTab === 'reading' ? 'active' : ''} onClick={() => setContentTab('reading')}>精选精读<span>{String(todayArticles.length).padStart(2, '0')}</span></button><button className={contentTab === 'news' ? 'active' : ''} onClick={() => setContentTab('news')}>近期外刊<span className="live-dot" /></button></>}</div><label className="article-search"><Search size={15} /><input aria-label="搜索文章" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="找一篇想读的文章" />{search && <button className="icon-button" onClick={() => setSearch('')} aria-label="清空搜索"><X size={13} /></button>}</label></div>
        <div className="filter-row"><div className="category-filters">{(contentTab === 'news' && !isLibrary ? ['全部'] : categories).map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item === '全部' ? '全部主题' : item}</button>)}</div><div className="filter-selects"><label><ListFilter size={14} /><select aria-label="按文章来源筛选" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">全部来源</option>{data.sources.map((source) => <option key={source.id} value={source.id}>{source.zh}</option>)}</select></label>{(isLibrary || contentTab === 'reading') && <label><select aria-label="文章排序" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">推荐顺序</option><option value="newest">最新优先</option><option value="shortest">短篇优先</option></select></label>}</div></div>
        {contentTab === 'news' && !isLibrary ? <><div className="news-info"><span><Globe2 size={15} />官方公开 RSS · 最近 14 天 · 已核验来源域名</span><span>{feed?.updatedAt ? `更新于 ${new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }).format(new Date(feed.updatedAt))}` : '正在连接媒体订阅源'}</span></div>{feedLoading && !feed ? <div className="loading-block"><Loader2 className="spin" size={24} /><p>正在翻阅世界的最新一页……</p><small>部分媒体连接可能需要约 20 秒</small></div> : feedError ? <EmptyState icon={<Globe2 size={32} />} title="暂时没能连接外刊选题" text={feedError} action={<button className="button secondary" onClick={() => void loadFeed(true)}>重新连接</button>} /> : visibleNews.length ? <div className="news-list">{visibleNews.map((news) => <NewsCard key={news.id} news={news} source={sourceById(news.sourceId)} busy={generating} onGenerate={() => void generate(news)} />)}</div> : <EmptyState icon={<Globe2 size={32} />} title="暂时没有符合条件的近期选题" text="可以切换来源、更新选题，或导入你可使用的英文正文。" action={<button className="button secondary" onClick={() => data.settings.hasApiKey ? setImportOpen(true) : setSettingsOpen(true)}><Upload size={15} />导入文章</button>} />}{feed && <details className="feed-status"><summary>{feed.statuses.filter((status) => status.ok).length} / 7 家媒体可连接 · 查看订阅源状态</summary><div>{feed.statuses.map((status) => <p key={status.sourceId}><span className={status.ok ? 'status-ok' : 'status-unavailable'} />{sourceById(status.sourceId).zh}<small>{status.ok ? `${status.count} 篇近期选题` : status.message}</small></p>)}</div></details>}</> : <>{visibleArticles.length ? <div className="article-grid">{visibleArticles.map((article) => <ArticleCard key={article.id} article={article} source={sourceById(article.sourceId)} bookmarked={learning.bookmarks.includes(article.id)} completed={Boolean(learning.progress[article.id]?.completedAt)} onOpen={() => navigate(`read/${article.id}`)} onBookmark={() => bookmark(article.id)} />)}</div> : <EmptyState icon={<Search size={30} />} title="还没有符合条件的文章" text="换个主题或搜索词，也许会有新的发现。" action={<button className="button secondary" onClick={() => { setCategory('全部'); setSourceFilter('all'); setSearch(''); setShelfFilter('all'); }}>查看全部文章</button>} />}{!isLibrary && dailyIds.length < 3 && <div className="demo-notice"><span className="tiny-dot" />{dailyIds.length ? `今日已生成 ${dailyIds.length} / 3 篇，其余为` : '先用'}原创教学示例体验精读。连接 AI 后，即可根据近期真实选题生成每日文章。<button onClick={() => setSettingsOpen(true)}>连接 AI<ArrowUpRight size={13} /></button></div>}</>}
        </section>
        {!isLibrary && <div className="reading-philosophy"><div className="philosophy-icon"><Coffee size={23} strokeWidth={1.5} /></div><div><span>不只是读英语，也是读懂世界。</span><p>Read a little. Think a little. Grow a little.</p></div><button className="text-button" onClick={() => setHelpOpen(true)}>找到你的阅读节奏<ArrowUpRight size={15} /></button></div>}
        <div className="sources-strip"><span>灵感来自世界的好文章</span><div>{data.sources.map((source) => <span key={source.id} title={source.zh} className={`publisher-wordmark publisher-${source.id}`}>{source.id === 'csmonitor' ? 'The Monitor' : source.name}</span>)}</div><p>仅使用指定 7 家媒体公开选题 · AI 改写明确标注 · 尊重内容来源</p></div>
      </>}
      <footer className="page-footer"><span>阅见 · 让每一次阅读，都有回响。</span><span>MADE FOR YOUR EVERYDAY PROGRESS</span></footer>
    </div></div>
    {settingsOpen && <SettingsModal settings={data.settings} sources={data.sources} onClose={() => setSettingsOpen(false)} onSave={(settings) => setData((previous) => previous ? { ...previous, settings } : previous)} />}
    {importOpen && <ImportModal sources={data.sources} onClose={() => setImportOpen(false)} onSubmit={async (body) => { if (generating) throw new Error('请等待当前生成任务结束'); const result = await api<Job>('/import', { method: 'POST', body: JSON.stringify(body) }); setJob(result); }} />}
    {helpOpen && <Modal title="一点点，读出大不同" subtitle="你的每日英语精读指南" onClose={() => setHelpOpen(false)}><div className="help-steps"><div><span>01</span><h3>选一篇，慢慢读</h3><p>每天三篇，每篇约 10 分钟。逐句英文后紧跟中文，点击划线词汇即可查义和收藏。</p></div><div><span>02</span><h3>先思考，再看答案</h3><p>每篇附三道四选一题。全部作答并提交后，才能查看正确答案、中文解析与原文定位。</p></div><div><span>03</span><h3>连上 AI，让助教备课</h3><p>设置中填写接口地址、模型与 API Key，可手动生成或开启每日自动生成。本地服务需保持运行。</p></div></div><div className="help-note">近期外刊提供官方公开 RSS 的标题和简述。AI 会围绕选题创作原创学习文章；如需逐句研读媒体原文，请导入你有权使用的英文正文。AI 内容可能出错，重要信息请核对来源。</div><div className="modal-footer"><button className="button primary" onClick={() => setHelpOpen(false)}>知道了，开始阅读<ArrowRight size={16} /></button></div></Modal>}
    {toast && <div className="toast" role="status"><Sparkles size={17} /><span>{toast}</span><button aria-label="关闭提示" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}

function StatCard({ icon, title, value, suffix, caption, color, children }: { icon: React.ReactNode; title: string; value: number; suffix: string; caption: string; color: string; children: React.ReactNode }) {
  return <div className={`stat-card stat-${color}`}><div className="stat-title"><span className="stat-icon">{icon}</span>{title}</div><div className="stat-value">{value}<span>{suffix}</span>{children}</div><p>{caption}</p></div>;
}

function ArticleCard({ article, source, bookmarked, completed, onOpen, onBookmark }: { article: Article; source: Source; bookmarked: boolean; completed: boolean; onOpen: () => void; onBookmark: () => void }) {
  return <article className="article-card"><div className="article-art"><ArticleIllustration category={article.category} id={article.id} /><span className="art-category">{article.category}</span><button className={`card-bookmark ${bookmarked ? 'is-saved' : ''}`} aria-label={`${bookmarked ? '取消收藏' : '收藏'}《${article.title}》`} onClick={onBookmark}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button></div><div className="article-card-body"><div className="card-source"><span style={{ backgroundColor: source.color }} className="source-monogram">{source.short}</span><span>{source.name}</span>{article.origin === 'demo' ? <small>原创示例</small> : article.origin === 'generated' ? <small>AI 改写</small> : <small>导入原文</small>}</div><button className="card-title" onClick={onOpen}><h3>{article.title}</h3></button><p className="card-english-title">{article.titleEn}</p><p className="card-summary">{article.summary}</p><div className="card-metadata"><span><Clock3 size={13} />约 {article.minutes} 分钟</span><span>{article.wordCount} 词</span><span className="difficulty"><i /><i /><i className={article.difficulty === '挑战提升' ? 'strong' : 'soft'} />{article.difficulty}</span></div><div className="card-bottom"><div className="card-tags"><span>逐句双语</span><span>{article.vocabulary.length} 个核心词</span><span>3 道题</span></div><button className={`read-link ${completed ? 'read-done' : ''}`} onClick={onOpen}>{completed ? <CheckCircle2 size={15} /> : null}{completed ? '再读一遍' : '开始精读'}<ArrowRight size={15} /></button></div></div></article>;
}

function NewsCard({ news, source, busy, onGenerate }: { news: News; source: Source; busy: boolean; onGenerate: () => void }) {
  return <article className="news-card"><div className="news-source-icon" style={{ color: source.color }}>{source.short}</div><div className="news-card-content"><div className="news-meta"><strong>{source.name}</strong><span>{new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric' }).format(new Date(news.publishedAt))}</span></div><h3><a href={news.url} target="_blank" rel="noreferrer">{news.title}<ExternalLink size={13} /></a></h3>{news.description && <p>{news.description}</p>}<span className="news-adaptation-note">公开标题与简述 · 可据此生成原创学习文章</span></div><button className="button secondary small" disabled={busy} onClick={onGenerate}><Sparkles size={14} />生成精读</button></article>;
}

function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function VocabularyPage({ words, articles, filter, setFilter, reveal, setReveal, search, setSearch, onOpen, onToggleMastered, onRemove }: { words: SavedWord[]; articles: Article[]; filter: string; setFilter: (value: string) => void; reveal: boolean; setReveal: (value: boolean) => void; search: string; setSearch: (value: string) => void; onOpen: (id: string) => void; onToggleMastered: (word: string) => void; onRemove: (word: string) => void }) {
  const [revealed, setRevealed] = useState<string[]>([]);
  const visible = words.filter((word) => (filter === 'all' || (filter === 'mastered' ? word.mastered : !word.mastered)) && `${word.word} ${word.meaning}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="page-heading"><div><span className="eyebrow">WORDS THAT STAY WITH YOU</span><h1>把遇见的词，变成自己的。</h1><p>在语境中记住，在一次次回顾中熟悉。</p></div><div className="word-count-pill"><BookA size={20} /><strong>{words.length}</strong>个词，正在积累</div></div><div className="vocabulary-toolbar"><div className="content-tabs">{[{ id: 'all', label: '全部词汇', count: words.length }, { id: 'learning', label: '学习中', count: words.filter((word) => !word.mastered).length }, { id: 'mastered', label: '已掌握', count: words.filter((word) => word.mastered).length }].map((item) => <button key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}</div><label className="article-search"><Search size={15} /><input aria-label="搜索生词" placeholder="搜索单词或释义" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="button secondary small" onClick={() => { setReveal(!reveal); setRevealed([]); }}>{reveal ? '隐藏释义，自测一下' : '显示全部释义'}</button></div>{visible.length ? <div className="word-card-grid">{visible.map((word) => <article className={`word-card ${word.mastered ? 'mastered' : ''}`} key={word.word}><div className="word-card-heading"><span className="word-status">{word.mastered ? '已掌握' : '学习中'}</span><button className="icon-button" onClick={() => onRemove(word.word)} aria-label={`移除 ${word.word}`}><X size={15} /></button></div><h3>{word.word}</h3><span className="word-phonetic">{word.phonetic}</span>{reveal || revealed.includes(word.word) ? <p className="word-definition"><i>{word.pos}</i> {word.meaning}</p> : <button className="hidden-definition" onClick={() => setRevealed([...revealed, word.word])}>回忆一下，再点击看释义</button>}<p className="word-example">{word.example}</p><button className="word-context" onClick={() => onOpen(word.articleId)}><FileText size={13} /><span>{articles.find((article) => article.id === word.articleId)?.title || '回到原文'}</span><ArrowUpRight size={13} /></button><button className={`button small ${word.mastered ? 'tinted' : 'secondary'}`} onClick={() => onToggleMastered(word.word)}>{word.mastered ? <CheckCircle2 size={15} /> : <Check size={15} />}{word.mastered ? '已掌握 · 再复习' : '这个词，我记住了'}</button></article>)}</div> : <EmptyState icon={<BookA size={36} />} title={words.length ? '这里暂时还没有词汇' : '你的第一颗词汇种子，等你来种下。'} text={words.length ? '切换分类或试试其他搜索词。' : '打开一篇精读，点击正文中的划线词汇，就能把它收进这里。'} action={<button className="button primary" onClick={() => { window.location.hash = 'today'; }}>去读一篇<ArrowRight size={16} /></button>} />}</>;
}

function HistoryPage({ articles, learning, stats, today, onOpen }: { articles: Article[]; learning: LearningState; stats: { totalRead: number; words: number; streak: number }; today: string; onOpen: (id: string) => void }) {
  const completed = articles.filter((article) => learning.progress[article.id]?.completedAt).sort((first, second) => new Date(learning.progress[second.id].completedAt!).getTime() - new Date(learning.progress[first.id].completedAt!).getTime());
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(`${today}T12:00:00+08:00`); date.setDate(date.getDate() - (6 - index)); const day = localDay(date); return { day, label: `${date.getMonth() + 1}.${date.getDate()}`, count: Object.values(learning.progress).filter((progress) => progress.completedAt && localDay(new Date(progress.completedAt)) === day).length }; });
  const maximum = Math.max(3, ...days.map((day) => day.count));
  const totalMinutes = Math.floor(Object.values(learning.dailySeconds).reduce((sum, seconds) => sum + seconds, 0) / 60);
  return <><div className="page-heading"><div><span className="eyebrow">SMALL STEPS ADD UP</span><h1>你走过的每一步，都算数。</h1><p>阅读留下的，不只是记录，还有看世界的方式。</p></div><span className="history-badge"><Flame size={18} />连续学习 {stats.streak} 天</span></div><div className="history-stats"><div><BookOpen size={20} /><strong>{stats.totalRead}<small>篇</small></strong><span>累计完成精读</span></div><div><Clock3 size={20} /><strong>{totalMinutes}<small>分钟</small></strong><span>累计专注时间</span></div><div><BookA size={20} /><strong>{stats.words}<small>个</small></strong><span>累计收藏词汇</span></div></div><section className="activity-panel"><div><h2>这一周，和世界见了几次面？</h2><p>最近 7 天完成的精读文章</p></div><div className="activity-chart">{days.map((day) => <div key={day.day} className={day.day === today ? 'today' : ''}><strong>{day.count}</strong><div className="activity-track"><span style={{ height: `${Math.max(3, day.count / maximum * 100)}%` }} /></div><span>{day.day === today ? '今天' : day.label}</span></div>)}</div></section><div className="section-heading history-title"><div><h2>读过的世界<span>{completed.length}</span></h2><p>值得再看一次的思考，都在这里。</p></div></div>{completed.length ? <div className="history-list">{completed.map((article) => <button key={article.id} onClick={() => onOpen(article.id)}><span className="history-check"><CheckCircle2 size={20} /></span><div><strong>{article.title}</strong><p>{article.titleEn}</p></div><span>{localDay(new Date(learning.progress[article.id].completedAt!))}</span><ChevronRight size={17} /></button>)}</div> : <EmptyState icon={<Target size={33} />} title="今天，写下第一条阅读记录。" text="在精读页点击「标记为已读」或完成训练，就能点亮你的学习记录。" action={<button className="button primary" onClick={() => { window.location.hash = 'today'; }}>开始今日精读<ArrowRight size={16} /></button>} />}</>;
}
