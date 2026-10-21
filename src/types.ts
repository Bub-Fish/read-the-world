export interface Source { id: string; name: string; zh: string; short: string; color: string }
export interface Sentence { en: string; zh: string; paragraph: number }
export interface Word { word: string; phonetic: string; pos: string; meaning: string; example: string }
export interface Question { question: string; type: string; options: string[]; answer: number; explanation: string; evidence: number }
export interface Article {
  id: string; title: string; titleEn: string; summary: string; category: string; difficulty: string;
  sourceId: string; sourceUrl: string; sourceTitle?: string; origin: 'demo' | 'generated' | 'imported';
  publishedAt: string | null; createdAt: string; wordCount: number; minutes: number;
  sentences: Sentence[]; vocabulary: Word[]; questions: Question[];
}
export interface Settings {
  provider: string; baseUrl: string; model: string; hasApiKey: boolean; keyHint: string;
  autoGenerate: boolean; generationHour: number; selectedSources: string[]; jsonMode: boolean; maxTokens: number;
}
export interface Job {
  id?: string; date?: string; status: 'running' | 'complete' | 'partial' | 'failed'; total: number;
  completed: number; articleIds: string[]; errors: { title?: string; message: string }[];
  currentTitle?: string; alreadyExists?: boolean;
}
export interface LibraryResponse { articles: Article[]; sources: Source[]; daily: Record<string, string[]>; settings: Settings; today: string; activeJob: Job | null }
export interface News { id: string; title: string; url: string; sourceId: string; publishedAt: string; description: string }
export interface Feed { articles: News[]; updatedAt: string | null; statuses: { sourceId: string; ok: boolean; count: number; message?: string }[] }
export interface SavedWord extends Word { articleId: string; savedAt: string; mastered: boolean }
export interface ReadingProgress { completedAt?: string; seconds: number; answers: number[]; submitted: boolean; submittedAt?: string }
export interface LearningState { progress: Record<string, ReadingProgress>; bookmarks: string[]; words: SavedWord[]; dailySeconds: Record<string, number> }
