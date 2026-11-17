import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpDown, BookMarked, BookOpen, Check } from 'lucide-react';
import { fetchMangaDetail } from '../services/api';
import type {
  ChapterItem,
  MangaDetail,
  MangaSummary,
  ReadingProgress,
} from '../types/manga';
import { filterAndSortChapters } from '../utils/atsu';
import { CoverImage } from './CoverImage';
import { MangaCard } from './MangaCard';

interface SeriesDetailViewProps {
  mangaId: string;
  onBack: () => void;
  onOpenChapter: (
    manga: MangaDetail,
    chapter: ChapterItem,
    allChapters: ChapterItem[]
  ) => void;
  onSelectManga: (id: string) => void;
  onSelectGenre: (genreId: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (manga: MangaSummary) => void;
  progress: ReadingProgress | null;
  readChapterIds: string[];
}

export function SeriesDetailView({
  mangaId,
  onBack,
  onOpenChapter,
  onSelectManga,
  onSelectGenre,
  isBookmarked,
  onToggleBookmark,
  progress,
  readChapterIds,
}: SeriesDetailViewProps) {
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const [scanlatorFilter, setScanlatorFilter] = useState<string>('all');
  const [chapterQuery, setChapterQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAllChapters, setShowAllChapters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setScanlatorFilter('all');
    setChapterQuery('');
    setShowAllChapters(false);

    fetchMangaDetail(mangaId, controller.signal)
      .then((res) => {
        setManga(res.manga);
        setChapters(res.chapters);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load series details');
        setLoading(false);
      });

    return () => controller.abort();
  }, [mangaId, retryTick]);

  const filteredChapters = useMemo(
    () =>
      filterAndSortChapters(chapters, {
        scanlatorId: scanlatorFilter,
        query: chapterQuery,
        sort: sortOrder,
      }),
    [chapters, scanlatorFilter, chapterQuery, sortOrder]
  );

  const firstChapter = useMemo(() => {
    const asc = filterAndSortChapters(chapters, {
      scanlatorId: scanlatorFilter,
      sort: 'asc',
    });
    return asc[0] ?? null;
  }, [chapters, scanlatorFilter]);

  const resumeChapter = useMemo(() => {
    if (!progress) return null;
    return chapters.find((c) => c.id === progress.chapterId) ?? null;
  }, [chapters, progress]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-5 w-32 animate-pulse rounded bg-linen" />
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4 lg:col-span-3">
            <div className="aspect-[3/4] w-full animate-pulse rounded-sm border border-rule bg-linen" />
          </div>
          <div className="space-y-4 md:col-span-8 lg:col-span-9">
            <div className="h-10 w-2/3 animate-pulse rounded bg-linen" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-linen" />
            <div className="h-28 w-full animate-pulse rounded bg-linen" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !manga) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-ink">Unable to open this title</h1>
        <p className="mt-2 text-sm text-ink-muted">{error || 'Series not found on Atsumaru.'}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-linen"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={() => setRetryTick((n) => n + 1)}
            className="rounded-md bg-seal px-4 py-2 text-sm font-medium text-white hover:bg-seal-hover"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const metaItems: string[] = [manga.format];
  if (manga.status) metaItems.push(manga.status);
  if (manga.rating != null) metaItems.push(`★ ${manga.rating.toFixed(1)}`);
  if (manga.viewsLabel !== '—') metaItems.push(`${manga.viewsLabel} views`);
  metaItems.push(`${chapters.length || manga.totalChapterCount} chapters`);

  const relatedList =
    manga.recommendations.length > 0 ? manga.recommendations : manga.similarManga;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        <span>Back to Catalog</span>
      </button>

      {/* Series Header Block */}
      <section className="mt-6 grid grid-cols-1 gap-8 border-b border-rule pb-10 md:grid-cols-12">
        <div className="md:col-span-4 lg:col-span-3">
          <CoverImage
            src={manga.posterUrl}
            alt={manga.title}
            priority
            className="rounded-sm shadow-sm"
          />

          <div className="mt-4 flex flex-col gap-2.5">
            {resumeChapter ? (
              <button
                type="button"
                onClick={() => onOpenChapter(manga, resumeChapter, chapters)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-seal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-seal-hover"
              >
                <BookOpen className="h-4 w-4" strokeWidth={1.75} />
                <span className="truncate">
                  Continue {resumeChapter.title || `Ch. ${resumeChapter.number}`}
                </span>
              </button>
            ) : firstChapter ? (
              <button
                type="button"
                onClick={() => onOpenChapter(manga, firstChapter, chapters)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-seal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-seal-hover"
              >
                <BookOpen className="h-4 w-4" strokeWidth={1.75} />
                <span>Start Reading ({firstChapter.title || `Ch. ${firstChapter.number}`})</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onToggleBookmark(manga)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                isBookmarked
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule bg-white text-ink hover:bg-linen'
              }`}
            >
              {isBookmarked ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2} />
                  <span>Saved in Library</span>
                </>
              ) : (
                <>
                  <BookMarked className="h-4 w-4" strokeWidth={1.75} />
                  <span>Save to Library</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="md:col-span-8 lg:col-span-9">
          <p className="text-xs font-medium text-ink-muted tabular-nums">
            {metaItems.join(' · ')}
          </p>

          <h1 className="mt-2 font-serif text-3xl font-medium leading-tight text-ink sm:text-4xl">
            {manga.title}
          </h1>

          {manga.englishTitle && manga.englishTitle !== manga.title && (
            <p className="mt-1 text-base text-ink-muted">{manga.englishTitle}</p>
          )}

          {manga.authors.length > 0 && (
            <p className="mt-3 text-sm text-ink">
              <span className="text-ink-muted">By </span>
              <span className="font-medium">{manga.authors.join(', ')}</span>
            </p>
          )}

          {manga.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
              <span className="font-medium text-ink">Genres:</span>
              {manga.genres.map((genre, idx) => (
                <span key={genre.id} className="inline-flex items-center gap-2.5">
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <button
                    type="button"
                    onClick={() => onSelectGenre(genre.id)}
                    className="underline decoration-rule underline-offset-4 transition-colors hover:text-seal hover:decoration-seal"
                  >
                    {genre.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-rule/80 pt-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Synopsis
            </h2>
            {manga.synopsis ? (
              <div className="mt-2.5 max-w-prose space-y-3 text-[15px] leading-relaxed text-ink/90">
                {manga.synopsis.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                No synopsis provided on Atsumaru for this edition.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Chapter Index */}
      <section className="pt-10">
        <div className="flex flex-col gap-4 border-b border-rule pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-medium text-ink">Chapters</h2>
            <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
              {filteredChapters.length} available{' '}
              {filteredChapters.length === 1 ? 'chapter' : 'chapters'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {manga.scanlators.length > 1 && (
              <div>
                <label htmlFor="scanlator-select" className="sr-only">
                  Filter by scanlator group
                </label>
                <select
                  id="scanlator-select"
                  value={scanlatorFilter}
                  onChange={(e) => setScanlatorFilter(e.target.value)}
                  className="h-9 rounded-md border border-rule bg-white px-3 text-xs font-medium text-ink focus:border-ink focus:outline-none"
                >
                  <option value="all">All Scanlators</option>
                  {manga.scanlators.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="chapter-filter-input" className="sr-only">
                Find chapter number
              </label>
              <input
                id="chapter-filter-input"
                type="search"
                value={chapterQuery}
                onChange={(e) => setChapterQuery(e.target.value)}
                placeholder="Jump to chapter..."
                className="h-9 w-44 rounded-md border border-rule bg-white px-3 text-xs text-ink placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule bg-white px-3 text-xs font-medium text-ink transition-colors hover:bg-linen whitespace-nowrap shrink-0"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-ink-muted" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {filteredChapters.length === 0 ? (
          <div className="mt-6 rounded-md border border-rule bg-white p-8 text-center">
            <p className="text-sm text-ink-muted">No chapters match your current filter.</p>
          </div>
        ) : (
          <>
            <ul
              data-testid="chapter-list"
              className="mt-2 divide-y divide-rule border-b border-rule"
            >
              {(showAllChapters || chapterQuery.trim()
                ? filteredChapters
                : filteredChapters.slice(0, 60)
              ).map((ch) => {
                const isRead = readChapterIds.includes(ch.id);
                const scanlatorName = manga.scanlators.find(
                  (s) => s.id === ch.scanlationMangaId
                )?.name;

                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => onOpenChapter(manga, ch, chapters)}
                      className={`flex w-full items-center justify-between gap-4 px-2 py-3.5 text-left transition-colors hover:bg-linen/70 ${
                        isRead ? 'text-ink-muted' : 'text-ink'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm">
                          {ch.title || `Chapter ${ch.number}`}
                        </span>
                        {scanlatorName && (
                          <span className="ml-2.5 text-xs text-ink-muted">
                            · {scanlatorName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-ink-muted tabular-nums shrink-0">
                        {ch.pageCount ? <span>{ch.pageCount} pp</span> : null}
                        {isRead && <span className="font-medium text-indigo-ink">Read</span>}
                        <span className="font-medium text-seal">Read →</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {!showAllChapters && !chapterQuery.trim() && filteredChapters.length > 60 && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllChapters(true)}
                  className="rounded-md border border-rule bg-white px-5 py-2 text-xs font-medium text-ink transition-colors hover:bg-linen tabular-nums"
                >
                  Show all {filteredChapters.length} chapters
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Related Editions */}
      {relatedList.length > 0 && (
        <section className="pt-12">
          <h2 className="font-serif text-2xl font-medium text-ink">Related Titles</h2>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-6">
            {relatedList.slice(0, 6).map((item) => (
              <MangaCard key={item.id} item={item} onSelect={onSelectManga} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
