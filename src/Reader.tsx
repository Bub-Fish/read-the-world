import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, CheckCircle2, ChevronRight, Clock3, ExternalLink, Eye, EyeOff, FileText, GraduationCap, Languages, Minus, Plus, RotateCcw, Sparkles, Target, X } from 'lucide-react';
import type { Article, ReadingProgress, SavedWord, Source, Word } from './types';

interface ReaderProps {
  article: Article; source: Source; progress: ReadingProgress; bookmarked: boolean; words: SavedWord[];
  onBack: () => void; onBookmark: () => void; onWord: (word: Word) => void;
  onProgress: (update: Partial<ReadingProgress>) => void; onComplete: () => void;
}

export function Reader({ article, source, progress, bookmarked, words, onBack, onBookmark, onWord, onProgress, onComplete }: ReaderProps) {
  const [tab, setTab] = useState('read');
  const [bilingual, setBilingual] = useState(true);
  const [fontSize, setFontSize] = useState(19);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [highlightedSentence, setHighlightedSentence] = useState<number | null>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  const saved = (word: string) => words.some((entry) => entry.word.toLowerCase() === word.toLowerCase());
  const answered = article.questions.filter((_, index) => progress.answers[index] >= 0).length;
  const score = article.questions.filter((question, index) => progress.answers[index] === question.answer).length;
  const articleWordCount = article.vocabulary.filter((word) => saved(word.word)).length;

  function highlight(text: string) {
    const pattern = article.vocabulary.map((word) => word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const expression = new RegExp(`\\b(${pattern})\\b`, 'gi');
    return text.split(expression).map((part, index) => {
      const word = article.vocabulary.find((entry) => entry.word.toLowerCase() === part.toLowerCase());
      return word ? <button key={index} className={`word-highlight ${saved(word.word) ? 'saved' : ''}`} title={`查看 ${word.word} 的释义`} onClick={() => setSelectedWord(word)}>{part}</button> : part;
    });
  }
  function locate(index: number) {
    setTab('read'); setHighlightedSentence(index);
    window.setTimeout(() => document.getElementById(`sentence-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }
  return <div className="reader-page">
    <div className="reader-topline"><button className="text-button" onClick={onBack}><ArrowLeft size={17} />返回文章列表</button><span>READ CLOSELY. THINK DEEPLY.</span><button className={`button small ${bookmarked ? 'tinted' : 'secondary'}`} onClick={onBookmark}><Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />{bookmarked ? '已收藏' : '收藏文章'}</button></div>
    <div className="reader-layout"><main className="reader-content">
      <header className="article-heading">
        <div className="article-eyebrow"><span className="category-label">{article.category}</span><span className="source-name"><b style={{ backgroundColor: source.color }}>{source.short}</b>{source.name}</span></div>
        <h1>{article.titleEn}</h1><h2>{article.title}</h2>
        <div className="reading-meta"><span><Clock3 size={14} />约 {article.minutes} 分钟</span><span><FileText size={14} />{article.wordCount} 词</span><span><GraduationCap size={15} />{article.difficulty}</span></div>
        <div className="origin-note"><Sparkles size={14} /><span>{article.origin === 'demo' ? '原创教学示例 · 媒体名称仅表示选题方向，非该媒体原文' : article.origin === 'generated' ? 'AI 原创学习改写 · 基于下方新闻选题，非媒体原文或原文摘要' : '用户导入正文 · AI 辅助翻译与出题'}</span><a href={article.sourceUrl} target="_blank" rel="noreferrer">{article.origin === 'demo' ? '媒体主页' : '查看来源'}<ExternalLink size={12} /></a></div>
      </header>
      <div className="reader-tabs" role="tablist" aria-label="学习模式">{[{ id: 'read', text: '逐句精读', number: article.sentences.length }, { id: 'words', text: '核心词汇', number: article.vocabulary.length }, { id: 'quiz', text: '阅读训练', number: 3 }].map((item) => <button role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)}>{item.text}<span>{item.number}</span></button>)}</div>
      {tab === 'read' && <section aria-label="逐句精读正文">
        <div className="reading-controls"><span><span className="tiny-dot" />点击划线词汇，随时收进生词本</span><div><button className="text-button" onClick={() => setBilingual(!bilingual)}>{bilingual ? <Eye size={15} /> : <EyeOff size={15} />}{bilingual ? '双语对照' : '仅看英文'}</button><div className="font-size-controls"><button aria-label="缩小字号" disabled={fontSize <= 16} onClick={() => setFontSize(fontSize - 1)}><Minus size={13} /></button><span>Aa</span><button aria-label="放大字号" disabled={fontSize >= 24} onClick={() => setFontSize(fontSize + 1)}><Plus size={13} /></button></div></div></div>
        <div className="article-prose" style={{ '--reading-size': `${fontSize}px` } as React.CSSProperties}>
          {article.sentences.map((sentence, index) => <div id={`sentence-${index + 1}`} key={index} className={`sentence-pair ${index === 0 || sentence.paragraph !== article.sentences[index - 1].paragraph ? 'paragraph-start' : ''} ${highlightedSentence === index + 1 ? 'sentence-located' : ''}`}><span className="sentence-number">{String(index + 1).padStart(2, '0')}</span><p className="english-sentence">{highlight(sentence.en)}</p>{bilingual && <p className="chinese-sentence">{sentence.zh}</p>}</div>)}
        </div>
        <div className="reading-finish"><span className="finish-symbol"><CheckCheckIcon /></span><h3>读完了，理解才刚刚开始。</h3><p>带着刚才的思考，试试 3 道阅读理解题。</p><div><button className="button secondary" onClick={onComplete}><CheckCircle2 size={17} />{progress.completedAt ? '已完成精读' : '标记为已读'}</button><button className="button primary" onClick={() => setTab('quiz')}>开始阅读训练<ArrowRight size={16} /></button></div></div>
      </section>}
      {tab === 'words' && <section className="reader-vocabulary"><div className="section-inline-heading"><div><h3>让词汇，在语境中留下来</h3><p>本篇精选 {article.vocabulary.length} 个考研常见词汇，已收藏 {articleWordCount} 个</p></div><button className="button secondary small" onClick={() => article.vocabulary.forEach((word) => { if (!saved(word.word)) onWord(word); })}><Plus size={15} />全部收藏</button></div>{article.vocabulary.map((word, index) => <div className="vocabulary-entry" key={word.word}><span className="vocabulary-index">{String(index + 1).padStart(2, '0')}</span><div><div className="word-title"><strong>{word.word}</strong><span>{word.phonetic}</span></div><p><i>{word.pos}</i> {word.meaning}</p><blockquote>{word.example}</blockquote></div><button className={`icon-button ${saved(word.word) ? 'active' : ''}`} onClick={() => onWord(word)} aria-label={`${saved(word.word) ? '移除' : '收藏'} ${word.word}`}>{saved(word.word) ? <Check size={18} /> : <Plus size={18} />}</button></div>)}</section>}
      {tab === 'quiz' && <section className="quiz-section">
        <div className="quiz-intro"><div className="quiz-icon"><Target size={23} /></div><div><h3>{progress.submitted ? '答案背后的思考，同样重要' : '先独立作答，再查看解析'}</h3><p>{progress.submitted ? `本次答对 ${score} / 3 题，点击「定位原文」回顾解题依据。` : '3 道四选一阅读题 · 提交后解锁答案和逐题解析'}</p></div>{progress.submitted && <span className="quiz-score">{score}<small>/ 3</small></span>}</div>
        {article.questions.map((question, questionIndex) => <div className="question-card" key={questionIndex}>
          <div className="question-top"><span>QUESTION 0{questionIndex + 1}</span><span className="question-type">{question.type}</span></div><h4>{question.question}</h4>
          <div className="question-options">{question.options.map((option, optionIndex) => {
            const selected = progress.answers[questionIndex] === optionIndex;
            const correct = progress.submitted && question.answer === optionIndex;
            const wrong = progress.submitted && selected && !correct;
            return <button disabled={progress.submitted} className={`question-option ${selected ? 'chosen' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} key={optionIndex} aria-pressed={selected} onClick={() => { const answers = [...progress.answers]; answers[questionIndex] = optionIndex; onProgress({ answers }); }}><span className="option-letter">{'ABCD'[optionIndex]}</span><span>{option}</span>{correct && <CheckCircle2 size={17} />}{wrong && <X size={17} />}</button>;
          })}</div>
          {progress.submitted && <div className="answer-explanation"><div><strong>正确答案 {'ABCD'[question.answer]}</strong><button className="text-button" onClick={() => locate(question.evidence)}>定位原文<ChevronRight size={14} /></button></div><p>{question.explanation}</p></div>}
        </div>)}
        <div className="quiz-footer">{progress.submitted ? <><button className="button secondary" onClick={() => onProgress({ submitted: false, answers: [-1, -1, -1], submittedAt: undefined })}><RotateCcw size={16} />重新练习</button><button className="button primary" onClick={onComplete}><CheckCircle2 size={16} />{progress.completedAt ? '精读已完成，返回首页' : '完成今日这篇精读'}</button></> : <><span>已完成 {answered} / 3 题</span><button className="button primary" disabled={answered !== 3} onClick={() => onProgress({ submitted: true, submittedAt: new Date().toISOString() })}>提交答案，查看解析<ArrowRight size={16} /></button></>}</div>
      </section>}
    </main>
    <aside className="reader-aside"><div className="reader-roadmap"><span className="eyebrow">YOUR READING JOURNEY</span><h3>每读一篇，都有收获。</h3><button onClick={() => setTab('read')} className={tab === 'read' ? 'current' : ''}><span className="roadmap-step">{progress.completedAt ? <Check size={15} /> : '1'}</span><div><strong>逐句精读</strong><small>{article.sentences.length} 句双语对照</small></div><ChevronRight size={15} /></button><button onClick={() => setTab('words')} className={tab === 'words' ? 'current' : ''}><span className="roadmap-step">2</span><div><strong>积累核心词汇</strong><small>{articleWordCount} / {article.vocabulary.length} 词已收藏</small></div><ChevronRight size={15} /></button><button onClick={() => setTab('quiz')} className={tab === 'quiz' ? 'current' : ''}><span className="roadmap-step">{progress.submitted ? <Check size={15} /> : '3'}</span><div><strong>阅读理解训练</strong><small>{progress.submitted ? `已完成 · 正确 ${score} 题` : '先作答，再看解析'}</small></div><ChevronRight size={15} /></button></div><div className="reading-tip"><Languages size={22} /><h4>读懂逻辑，比读完更重要。</h4><p>留意 however、therefore 等衔接词，试着在心中勾勒作者的论证脉络。</p></div><div className="reading-side-note"><Clock3 size={15} /><span>本篇专注 {Math.floor(progress.seconds / 60)} 分 {progress.seconds % 60} 秒</span></div></aside></div>
    {selectedWord && <div className="word-popover" role="dialog" aria-label="词汇释义"><button className="icon-button popover-close" aria-label="关闭词汇释义" onClick={() => setSelectedWord(null)}><X size={16} /></button><span className="eyebrow">A WORD TO KEEP</span><h3>{selectedWord.word}<span>{selectedWord.phonetic}</span></h3><p><i>{selectedWord.pos}</i> {selectedWord.meaning}</p><p className="word-example">{selectedWord.example}</p><button className={`button small ${saved(selectedWord.word) ? 'secondary' : 'primary'}`} onClick={() => onWord(selectedWord)}>{saved(selectedWord.word) ? <Check size={15} /> : <Plus size={15} />}{saved(selectedWord.word) ? '已收进生词本 · 点击移除' : '收进生词本'}</button></div>}
  </div>;
}

function CheckCheckIcon() { return <CheckCircle2 size={29} strokeWidth={1.5} />; }
